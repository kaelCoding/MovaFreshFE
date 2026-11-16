import { BUSINESS, getZone } from '../config/business';
import { geocode } from '../data/geo';
import { dayKey, fmtDay } from '../utils/time';
import { fmt } from '../utils/formatters';
import { nextId, notify } from './jobs';
import { applyOrderStatus, creditCompensation } from './opsEvents';
import { capacityKey, findSlot, slotUsage } from './delivery';
import { buildDemandDays, emptyFactory, orderPackList, scopeKey, tripForSlot } from './factory';
import { ensureProcurement, issueStock } from './procurementOps';
import {
  applyRecovery, checkCapacityChange, checkRecovery, computeKpis, costPerBox, evaluateTemp, hubDayCostVnd,
  orderStops, planRoutes, recoveryExpected, redeliveryOptions, routeCostVnd, routeFitsWindow, slotWindow, breachesByPoint
} from './logistics';

/**
 * Thao tác ghi dữ liệu logistics ở mức `db` (P2C): sức chứa, chuyến xe chặng dài, nhận xe ở kho phụ, ghép hải sản,
 * lập tuyến, xuất kho, giao hàng của shipper, ngoại lệ, chuỗi lạnh, chi phí và KPI. Lớp API (`api.ops.logistics`, `hub`,
 * `routes`, `shipper`) chỉ kiểm quyền rồi gọi các hàm này trong `server.write`.
 * Mọi thay đổi trạng thái giao đi qua `applyOrderStatus` (cùng hàm `api.ops.setOrderStatus` dùng) để app khách thấy đúng.
 */

const bad = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const good = (extra = {}) => ({ ok: true, ...extra });

export const LOGISTICS_ERRORS = {
  CAPACITY_INVALID: 'Sức chứa không hợp lệ',
  CAPACITY_BELOW_USED: 'Sức chứa thấp hơn số đã đặt',
  ZONE_NOT_FOUND: 'Không tìm thấy khu giao',
  SLOT_NOT_FOUND: 'Khung giờ không có ở khu này',
  TRIP_INVALID: 'Thông tin chuyến xe không hợp lệ',
  TRIP_NOT_DEPARTED: 'Chuyến xe chưa xuất bến',
  ARRIVAL_CLOSED: 'Đã chốt nhận xe này',
  ARRIVAL_INVALID: 'Thông tin nhận xe không hợp lệ',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn',
  SEAFOOD_INVALID: 'Thao tác ghép hải sản không hợp lệ',
  SEAFOOD_INCOMPLETE: 'Chưa tích đủ túi hải sản',
  BOX_NOT_AT_HUB: 'Thùng chưa về kho phụ',
  ROUTE_NOT_FOUND: 'Không tìm thấy tuyến',
  ROUTE_STATE: 'Tuyến không ở trạng thái cho phép thao tác này',
  NOT_SORTED: 'Còn thùng chưa chia vào tuyến',
  TEMP_REQUIRED: 'Nhập nhiệt độ',
  SHIPPER_NOT_FOUND: 'Không tìm thấy shipper',
  NOT_YOUR_STOP: 'Điểm giao này không thuộc tuyến của bạn',
  STOP_STATE: 'Điểm giao không ở trạng thái cho phép thao tác này',
  PHOTO_REQUIRED: 'Cần 1 ảnh giao hàng',
  REASON_INVALID: 'Chọn lý do không giao được',
  CALL_REQUIRED: 'Cần gọi khách trước khi báo không liên lạc được',
  EXCEPTION_NOT_FOUND: 'Không tìm thấy ngoại lệ',
  RESOLVE_INVALID: 'Cách xử lý không hợp lệ',
  ALERT_NOT_FOUND: 'Không tìm thấy cảnh báo nhiệt độ',
  DECISION_INVALID: 'Quyết định không hợp lệ',
  COST_INVALID: 'Chi phí không hợp lệ'
};

const withMsg = (r) => (r.ok || r.message ? r : { ...r, message: LOGISTICS_ERRORS[r.code] || r.code });

// ---------------------------------------------------------------------------------------------
// Lát cắt db.logistics

export const emptyLogistics = () => ({
  capacity: {}, // { 'Z1|2026-11-23|early_morning_06_08': 20 } ghi đè sức chứa; ngày '*' = mọi ngày
  trips: {}, // { 'day|T1': { carrier, plate, capacityBoxes, plannedDepartAt, costVnd, note } }
  arrivals: {}, // { 'day|T1': { startedAt, closedAt, boxes: { orderId: 'ok' | 'damaged' }, notes, extra[], missing[], tempC, frozenTempC, photo, note } }
  seafood: {}, // { orderId: { ticks: { sku: n }, startedAt, packedAt, lots[], shortKg } }
  routes: [], // tuyến chặng cuối
  deliveries: {}, // { orderId: { routeId, status, attempts[], calls } }
  exceptions: [], // ngoại lệ cần điều phối xử lý
  temps: [], // số đo nhiệt độ ở kho phụ và lúc giao
  coldDecisions: {}, // { readingId: { decision: 'keep' | 'discard', note, by, at } }
  hubCosts: {}, // { day: { laborVnd, rentVnd, iceVnd, otherVnd } }
  assets: {}, // { customerId: { foam, gel } } thùng xốp / túi gel đang ở nhà khách
  recoveries: [] // lần thu hồi
});

export function ensureLogistics(db) {
  if (!db.logistics) db.logistics = emptyLogistics();
  for (const [k, v] of Object.entries(emptyLogistics())) if (db.logistics[k] === undefined) db.logistics[k] = v;
  if (!db.logisticsCosts) db.logisticsCosts = [];
  if (!db.factory) db.factory = emptyFactory();
  return db.logistics;
}

const nowIsoOf = (now) => now.toISOString();
const orderOf = (db, id) => db.orders.find((o) => o.id === id) || null;
const customerOf = (db, order) => db.customers.find((c) => c.id === order.customerId) || null;
const DEAD = ['cancelled', 'postponed', 'skipped_unpaid'];

export const tripScopeOf = (order, cfg = BUSINESS) => scopeKey(order.deliveryDay, tripForSlot(order.slotId, cfg).id);
export const effectiveSlot = (order) => ({
  day: order.redelivery ? order.redelivery.day : order.deliveryDay,
  slotId: order.redelivery ? order.redelivery.slotId : order.slotId
});

/** Phường giả và thứ tự đường / số nhà của một đơn (ở server; điều phối chỉ nhận quận và phường). */
export function geoOf(db, order) {
  const c = customerOf(db, order);
  return geocode(order.recipient.address, c ? c.district : '');
}

// ---------------------------------------------------------------------------------------------
// Sức chứa

export function setCapacity(db, { zoneId, day, slotId, capacityBoxes, allowBelowUsed = false }) {
  const L = ensureLogistics(db);
  const zone = getZone(zoneId);
  if (!zone) return withMsg(bad('ZONE_NOT_FOUND'));
  const slot = findSlot(zone, slotId);
  if (!slot) return withMsg(bad('SLOT_NOT_FOUND'));
  const key = capacityKey(zoneId, day || '*', slotId);
  if (capacityBoxes == null) {
    // Bỏ ghi đè của một ngày mà đang có ghi đè "mọi ngày" thì ngày đó đặt rõ về số mặc định (không xóa luôn ghi đè mọi ngày)
    if (day && day !== '*' && Number.isFinite(L.capacity[capacityKey(zoneId, '*', slotId)])) L.capacity[key] = slot.capacityBoxes;
    else delete L.capacity[key];
    return good({ key, capacityBoxes: slot.capacityBoxes, reset: true, overbooked: 0 });
  }
  // Một ngày: số đã đặt của ngày đó. Mọi ngày ('*'): số đã đặt nhiều nhất trong các ngày đang có đơn
  const days = day && day !== '*' ? [day] : [...new Set(db.orders.filter((o) => o.zoneId === zoneId && o.slotId === slotId).map((o) => o.deliveryDay))];
  const used = Math.max(0, ...days.map((d) => slotUsage(db.orders, zoneId, d, slotId)));
  const chk = checkCapacityChange({ capacityBoxes: Number(capacityBoxes), used, allowBelowUsed });
  if (!chk.ok) return withMsg(chk);
  L.capacity[key] = Number(capacityBoxes);
  return good({ key, capacityBoxes: Number(capacityBoxes), used, overbooked: chk.overbooked });
}

// ---------------------------------------------------------------------------------------------
// Chuyến xe chặng dài

export function saveTrip(db, input, cfg = BUSINESS, now = new Date()) {
  const L = ensureLogistics(db);
  const trip = cfg.factory.trips.find((t) => t.id === input.tripId);
  if (!trip || !/^\d{4}-\d{2}-\d{2}$/.test(String(input.day || ''))) return withMsg(bad('TRIP_INVALID', 'Chọn ngày giao và chuyến xe'));
  const carrier = String(input.carrier || '').trim();
  const plate = String(input.plate || '').trim().toUpperCase();
  const capacityBoxes = Number(input.capacityBoxes);
  const costVnd = Number(input.costVnd);
  if (!carrier) return withMsg(bad('TRIP_INVALID', 'Nhập nhà xe'));
  if (plate.length < 5) return withMsg(bad('TRIP_INVALID', 'Nhập biển số xe'));
  if (!Number.isInteger(capacityBoxes) || capacityBoxes <= 0) return withMsg(bad('TRIP_INVALID', 'Sức chứa xe phải là số thùng lớn hơn 0'));
  if (!(costVnd >= 0) || !Number.isFinite(costVnd)) return withMsg(bad('COST_INVALID', 'Chi phí chuyến phải là số không âm'));
  const scope = scopeKey(input.day, trip.id);
  const prev = L.trips[scope];
  L.trips[scope] = {
    scope, day: input.day, tripId: trip.id, carrier, plate, capacityBoxes, costVnd: Math.round(costVnd),
    plannedDepartAt: input.plannedDepartAt || null, note: String(input.note || '').trim(),
    createdAt: prev ? prev.createdAt : nowIsoOf(now), updatedAt: nowIsoOf(now)
  };
  refreshCosts(db, input.day, cfg, now);
  return good({ trip: L.trips[scope] });
}

export function saveHubCost(db, { day, laborVnd, rentVnd, iceVnd, otherVnd }, cfg = BUSINESS, now = new Date()) {
  const L = ensureLogistics(db);
  const vals = [laborVnd, rentVnd, iceVnd, otherVnd].map((v) => Number(v || 0));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) || vals.some((v) => !Number.isFinite(v) || v < 0)) return withMsg(bad('COST_INVALID', 'Chi phí kho phụ phải là số không âm'));
  L.hubCosts[day] = { laborVnd: vals[0], rentVnd: vals[1], iceVnd: vals[2], otherVnd: vals[3] };
  refreshCosts(db, day, cfg, now);
  return good({ hub: L.hubCosts[day] });
}

// ---------------------------------------------------------------------------------------------
// Số đo nhiệt độ

export function addReading(db, { point, ref, cls = 'chill', tempC, at, by = '', orderId = null }) {
  const L = ensureLogistics(db);
  const r = { id: nextId(db, 'TMP'), point, ref, cls, tempC, at, by, orderId };
  L.temps.push(r);
  return r;
}

/** Số đo ở 4 mốc: xuất xưởng (từ lúc xuất xe ở P2A) cộng các số đo kho phụ và lúc giao ghi ở đây. */
export function allReadings(db) {
  const L = ensureLogistics(db);
  const out = [];
  for (const [scope, l] of Object.entries(db.factory.loads || {})) {
    if (l.departedAt && typeof l.tempC === 'number') out.push({ id: `FD|${scope}`, point: 'factory_depart', ref: scope, cls: 'chill', tempC: l.tempC, at: l.departedAt, by: 'workshop', orderId: null });
  }
  return [...out, ...L.temps];
}

/** Các đơn bị ảnh hưởng bởi một số đo (cả chuyến xe, cả tuyến, hoặc một thùng). */
export function readingOrders(db, r) {
  const L = ensureLogistics(db);
  if (r.orderId) return [r.orderId];
  if (r.point === 'factory_depart' || r.point === 'hub_receive') {
    const l = db.factory.loads[r.ref];
    const arr = L.arrivals[r.ref];
    const ids = Object.keys((l && l.loaded) || {});
    return arr && arr.closedAt ? ids.filter((id) => arr.boxes[id]) : ids;
  }
  if (r.point === 'hub_dispatch') {
    const route = L.routes.find((x) => x.id === r.ref);
    return route ? route.stops.map((s) => s.orderId) : [];
  }
  return [];
}

export function decideCold(db, { id, decision, note = '', by = '' }, now) {
  const L = ensureLogistics(db);
  if (!['keep', 'discard'].includes(decision)) return withMsg(bad('DECISION_INVALID', 'Chọn giữ hoặc hủy'));
  const r = allReadings(db).find((x) => x.id === id);
  if (!r || evaluateTemp(r.cls, r.tempC).ok) return withMsg(bad('ALERT_NOT_FOUND'));
  if (L.coldDecisions[id]) return withMsg(bad('DECISION_INVALID', 'Cảnh báo này đã có quyết định'));
  L.coldDecisions[id] = { decision, note: String(note).trim(), by, at: nowIsoOf(now) };
  const exceptions = [];
  if (decision === 'discard') {
    for (const orderId of readingOrders(db, r)) {
      const o = orderOf(db, orderId);
      if (!o || ['delivered', ...DEAD].includes(o.status)) continue;
      const ex = createException(db, { orderId, kind: 'cold_discard', reason: `QC hủy hàng do vượt nhiệt độ (${r.tempC}°C)`, source: id }, now);
      if (ex) exceptions.push(ex.id);
    }
  }
  return good({ decision: L.coldDecisions[id], exceptions });
}

// ---------------------------------------------------------------------------------------------
// Ngoại lệ

export function createException(db, { orderId, kind, reason, source = '' }, now) {
  const L = ensureLogistics(db);
  const order = orderOf(db, orderId);
  if (!order) return null;
  const dup = L.exceptions.find((e) => e.orderId === orderId && e.kind === kind && e.status !== 'resolved');
  if (dup) return dup;
  const ex = { id: nextId(db, 'EX'), orderId, kind, reason, source, zoneId: order.zoneId, slotId: order.slotId, day: order.deliveryDay, status: 'open', createdAt: nowIsoOf(now), resolution: null };
  L.exceptions.push(ex);
  return ex;
}

const setIssue = (order, kind, label, detail, now) => {
  order.deliveryIssue = { kind, label, detail, at: nowIsoOf(now) };
};

/**
 * Điều phối xử lý ngoại lệ: giao lại khung sau, giữ lạnh ở kho phụ, hoặc bù Fresh Credit.
 * Mọi cách đều báo sang app khách (thông báo + `order.deliveryIssue` mà trang tuần của khách đọc).
 */
export function resolveException(db, { id, kind, day = null, slotId = null, amountVnd = null, note = '', by = '', allowAmount = false }, now, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const ex = L.exceptions.find((e) => e.id === id);
  if (!ex) return withMsg(bad('EXCEPTION_NOT_FOUND'));
  if (ex.status === 'resolved') return withMsg(bad('RESOLVE_INVALID', 'Ngoại lệ này đã xử lý xong'));
  const order = orderOf(db, ex.orderId);
  if (!order) return withMsg(bad('ORDER_NOT_FOUND'));
  if (!['redeliver', 'hold_cold', 'compensate'].includes(kind)) return withMsg(bad('RESOLVE_INVALID', 'Chọn giao lại, giữ lạnh hoặc bù Fresh Credit'));
  if (ex.status === 'held' && kind === 'hold_cold') return withMsg(bad('RESOLVE_INVALID', 'Đơn đã được giữ lạnh'));
  const nowIso = nowIsoOf(now);
  const detail = { kind, at: nowIso, by, note: String(note).trim() };
  const zone = getZone(order.zoneId);
  const rec = db.logistics.deliveries[order.id] || (db.logistics.deliveries[order.id] = { routeId: null, status: 'unrouted', attempts: [], calls: 0 });

  if (kind === 'redeliver') {
    const options = redeliveryOptions({ zoneId: order.zoneId, day: order.deliveryDay, slotId: order.slotId }, dayKey(now), cfg);
    const pick = day && slotId ? { day, slotId } : options[0];
    const slot = pick && zone && findSlot(zone, pick.slotId);
    if (!pick || !slot || pick.day < dayKey(now)) return withMsg(bad('RESOLVE_INVALID', 'Chọn ngày và khung giờ giao lại hợp lệ'));
    order.redelivery = { day: pick.day, slotId: pick.slotId, atHub: true, at: nowIso };
    rec.status = 'unrouted';
    rec.routeId = null;
    const when = `${slot.label}, ${fmtDay(pick.day)}`;
    // Cùng hàm với api.ops.setOrderStatus: ghi thông báo "giao lại" cho khách
    const st = applyOrderStatus(db, { orderId: order.id, status: 'redelivery', note: `Lần giao trước chưa thành công. MOVA sẽ giao lại vào ${when}. Bạn nhớ có người nhận nhé.` }, now);
    if (!st.ok) {
      notify(db, {
        customerId: order.customerId, type: 'delivery_status', title: 'MOVA sẽ giao lại đơn của bạn',
        body: `MOVA sẽ giao lại vào ${when}. Bạn nhớ có người nhận nhé.`, at: nowIso, meta: { orderId: order.id, weekIndex: order.weekIndex, status: 'redelivery', photoUrl: null }
      });
    }
    setIssue(order, 'redelivery', `Giao lại: ${when}`, 'MOVA sẽ giao lại đơn của bạn, bạn nhớ có người nhận nhé.', now);
    detail.day = pick.day;
    detail.slotId = pick.slotId;
    ex.status = 'resolved';
  } else if (kind === 'hold_cold') {
    const until = new Date(now.getTime() + cfg.logistics.holdColdMaxHours * 3600 * 1000).toISOString();
    order.holdCold = { at: nowIso, until };
    rec.status = 'unrouted';
    rec.routeId = null;
    notify(db, {
      customerId: order.customerId, type: 'delivery_status', title: 'MOVA đang giữ lạnh đơn của bạn',
      body: `Đơn của bạn đang được giữ trong kho lạnh của MOVA (tối đa ${cfg.logistics.holdColdMaxHours} giờ). MOVA sẽ liên hệ để hẹn lại giờ giao.`,
      at: nowIso, meta: { orderId: order.id, weekIndex: order.weekIndex, status: 'held', photoUrl: null }
    });
    setIssue(order, 'held', 'MOVA đang giữ lạnh đơn của bạn', `Giữ trong kho lạnh tối đa ${cfg.logistics.holdColdMaxHours} giờ, MOVA sẽ liên hệ hẹn lại giờ giao.`, now);
    detail.until = until;
    ex.status = 'held';
    ex.heldUntil = until;
  } else {
    const base = Math.round((order.amountVnd || 0) * cfg.logistics.failedCompensationPct);
    const amount = allowAmount && amountVnd != null ? Math.round(Number(amountVnd)) : base;
    if (!(amount > 0) || amount > (order.amountVnd || 0)) return withMsg(bad('RESOLVE_INVALID', 'Khoản bù phải lớn hơn 0 và không vượt giá trị đơn'));
    creditCompensation(db, order, amount, nowIso);
    notify(db, {
      customerId: order.customerId, type: 'delivery_status', title: 'MOVA bù Fresh Credit cho đơn chưa giao được',
      body: `Rất tiếc MOVA chưa giao được đơn này. MOVA đã bù ${fmt(amount)} vào Fresh Credit của bạn.`,
      at: nowIso, meta: { orderId: order.id, weekIndex: order.weekIndex, status: 'compensated', compensationVnd: amount, photoUrl: null }
    });
    setIssue(order, 'compensated', `MOVA đã bù ${fmt(amount)} vào Fresh Credit`, 'Đơn này chưa giao được nên MOVA bù cho bạn.', now);
    order.holdCold = null;
    rec.status = 'closed';
    detail.compensationVnd = amount;
    ex.status = 'resolved';
  }
  ex.resolution = detail;
  if (ex.status === 'resolved') ex.resolvedAt = nowIso;
  return good({ exception: ex, compensationVnd: detail.compensationVnd || 0 });
}

// ---------------------------------------------------------------------------------------------
// Nhận xe ở kho phụ

/** Bảng kê thùng của một chuyến: các thùng đã lên xe lúc xuất bến. */
export function manifestOf(db, scope) {
  const l = db.factory.loads[scope];
  return l ? Object.keys(l.loaded || {}).sort() : [];
}

const blankArrival = (now) => ({ startedAt: nowIsoOf(now), closedAt: null, boxes: {}, extra: [], tempC: null, frozenTempC: null, photo: '', note: '', missing: [] });

/** Quét / tích một thùng nhận về. state: 'ok' | 'damaged' | 'clear'. Mã không có trong bảng kê thì ghi vào "thừa". */
export function scanArrival(db, { scope, code, state = 'ok' }, now) {
  const L = ensureLogistics(db);
  const load = db.factory.loads[scope];
  if (!load || !load.departedAt) return withMsg(bad('TRIP_NOT_DEPARTED'));
  const arr = (L.arrivals[scope] ||= blankArrival(now));
  if (arr.closedAt) return withMsg(bad('ARRIVAL_CLOSED'));
  const id = String(code || '').trim().toUpperCase().replace(/^MOVA-BOX[:/]/, '');
  if (!id) return withMsg(bad('ARRIVAL_INVALID', 'Nhập hoặc quét mã thùng'));
  if (!['ok', 'damaged', 'clear'].includes(state)) return withMsg(bad('ARRIVAL_INVALID'));
  if (!manifestOf(db, scope).includes(id)) {
    if (state === 'clear') {
      arr.extra = arr.extra.filter((x) => x !== id);
      return good({ result: 'extra_removed', code: id });
    }
    if (!arr.extra.includes(id)) arr.extra.push(id);
    return good({ result: 'extra', code: id });
  }
  if (state === 'clear') delete arr.boxes[id];
  else arr.boxes[id] = state;
  return good({ result: state, code: id });
}

/**
 * Chốt nhận xe: so bảng kê với số thùng đã tích. Thiếu → ngoại lệ "thùng thiếu"; hỏng → ngoại lệ "thùng hỏng"; thừa ghi nhận.
 * Ghi số đo nhiệt độ mốc "nhận tại kho phụ". Cần ảnh nếu có thiếu / thừa / hỏng hoặc nhiệt độ vượt ngưỡng.
 */
export function closeArrival(db, { scope, tempC, frozenTempC = null, photo = '', note = '', by = '' }, now, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const load = db.factory.loads[scope];
  if (!load || !load.departedAt) return withMsg(bad('TRIP_NOT_DEPARTED'));
  const arr = (L.arrivals[scope] ||= blankArrival(now));
  if (arr.closedAt) return withMsg(bad('ARRIVAL_CLOSED'));
  const t = Number(tempC);
  if (tempC === '' || tempC == null || !Number.isFinite(t)) return withMsg(bad('TEMP_REQUIRED', 'Nhập nhiệt độ thùng xe lúc nhận'));
  let ft = null;
  if (frozenTempC !== '' && frozenTempC != null) {
    ft = Number(frozenTempC);
    if (!Number.isFinite(ft)) return withMsg(bad('ARRIVAL_INVALID', 'Nhiệt độ ngăn đông không hợp lệ'));
  }
  const manifest = manifestOf(db, scope);
  const missing = manifest.filter((id) => !arr.boxes[id]);
  const damaged = manifest.filter((id) => arr.boxes[id] === 'damaged');
  const tempBad = !evaluateTemp('chill', t, cfg).ok || (ft != null && !evaluateTemp('frozen', ft, cfg).ok);
  if ((missing.length || damaged.length || arr.extra.length || tempBad) && !String(photo || '').trim()) {
    return withMsg(bad('ARRIVAL_INVALID', 'Có thùng thiếu, thừa, hỏng hoặc nhiệt độ vượt ngưỡng: cần 1 ảnh làm bằng chứng'));
  }
  const nowIso = nowIsoOf(now);
  arr.closedAt = nowIso;
  arr.tempC = t;
  arr.frozenTempC = ft;
  arr.photo = String(photo || '');
  arr.note = String(note || '').trim();
  arr.missing = missing;
  arr.by = by;
  addReading(db, { point: 'hub_receive', ref: scope, cls: 'chill', tempC: t, at: nowIso, by });
  if (ft != null) addReading(db, { point: 'hub_receive', ref: scope, cls: 'frozen', tempC: ft, at: nowIso, by });
  const exceptions = [];
  for (const id of missing) {
    const ex = createException(db, { orderId: id, kind: 'missing_box', reason: 'Thùng có trong bảng kê nhưng không về tới kho phụ', source: scope }, now);
    if (ex) exceptions.push(ex.id);
  }
  for (const id of damaged) {
    const ex = createException(db, { orderId: id, kind: 'damaged_box', reason: 'Thùng về tới kho phụ bị hỏng', source: scope }, now);
    if (ex) exceptions.push(ex.id);
  }
  const day = scope.split('|')[0];
  refreshCosts(db, day, cfg, now);
  return good({ arrival: arr, missing, damaged, extra: arr.extra, exceptions, tempBad });
}

/** Thùng của đơn đã về kho phụ và dùng được chưa. */
export function boxAtHub(db, order, cfg = BUSINESS) {
  if (order.redelivery && order.redelivery.atHub) return true;
  const arr = ensureLogistics(db).arrivals[tripScopeOf(order, cfg)];
  return Boolean(arr && arr.closedAt && arr.boxes[order.id] === 'ok');
}

/** Trạng thái thùng ở kho phụ: ok | damaged | missing | waiting (xe chưa nhận xong). */
export function arrivalStateOf(db, order, cfg = BUSINESS) {
  const arr = ensureLogistics(db).arrivals[tripScopeOf(order, cfg)];
  if (!arr || !arr.closedAt) return 'waiting';
  return arr.boxes[order.id] || 'missing';
}

// ---------------------------------------------------------------------------------------------
// Ghép hải sản

/** Đơn của một ngày giao còn sản xuất được (theo kế hoạch đã chốt). */
export function planOrders(db, day) {
  const plan = db.productionPlans.find((p) => p.day === day);
  if (!plan) return [];
  const byId = new Map(db.orders.map((o) => [o.id, o]));
  return plan.orderIds.map((id) => byId.get(id)).filter((o) => o && !DEAD.includes(o.status));
}

export const seafoodItems = (order, cfg = BUSINESS) => orderPackList(order, cfg).items.filter((i) => i.hub);

export function tickSeafood(db, { orderId, key, count }, now, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const order = orderOf(db, orderId);
  if (!order) return withMsg(bad('ORDER_NOT_FOUND'));
  const item = seafoodItems(order, cfg).find((i) => i.key === key);
  if (!item || !Number.isInteger(count) || count < 0 || count > item.bags) return withMsg(bad('SEAFOOD_INVALID', 'Số túi hải sản không hợp lệ'));
  if (!boxAtHub(db, order, cfg)) return withMsg(bad('BOX_NOT_AT_HUB', 'Thùng của đơn này chưa về kho phụ (nhận xe trước)'));
  const rec = (L.seafood[orderId] ||= { ticks: {}, startedAt: nowIsoOf(now), packedAt: null, lots: [], shortKg: 0 });
  if (rec.packedAt) return withMsg(bad('SEAFOOD_INVALID', 'Thùng đã ghép xong'));
  rec.ticks[key] = count;
  return good({ ticks: rec.ticks });
}

/** Chốt ghép hải sản của một thùng: cần tích đủ túi; trừ tồn kho phụ theo FEFO và ghi lô đã dùng. */
export function closeSeafood(db, { orderId, by = '' }, now, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const order = orderOf(db, orderId);
  if (!order) return withMsg(bad('ORDER_NOT_FOUND'));
  const items = seafoodItems(order, cfg);
  const rec = (L.seafood[orderId] ||= { ticks: {}, startedAt: nowIsoOf(now), packedAt: null, lots: [], shortKg: 0 });
  if (!items.length) return withMsg(bad('SEAFOOD_INVALID', 'Đơn này không có hải sản'));
  if (rec.packedAt) return good({ record: rec, duplicate: true });
  if (!boxAtHub(db, order, cfg)) return withMsg(bad('BOX_NOT_AT_HUB'));
  const missing = items.filter((i) => (rec.ticks[i.key] || 0) < i.bags);
  if (missing.length) return withMsg(bad('SEAFOOD_INCOMPLETE', `Còn thiếu túi: ${missing.map((m) => m.name).join(', ')}`));
  ensureProcurement(db);
  const lots = [];
  let shortKg = 0;
  for (const it of items) {
    const kg = Math.round((it.grams / 1000) * 100) / 100;
    let res = issueStock(db, { sku: it.key, qty: kg, reason: 'order', ref: orderId, by }, now);
    if (!res.ok && res.code === 'STOCK_SHORT') {
      const have = Math.max(0, Math.round((kg - (res.shortfall || kg)) * 100) / 100);
      shortKg += res.shortfall || kg;
      res = have > 0 ? issueStock(db, { sku: it.key, qty: have, reason: 'order', ref: orderId, by }, now) : { ok: true, allocations: [] };
    }
    if (res.ok) for (const a of res.allocations || []) lots.push({ sku: it.key, lotCode: a.lotCode, qty: a.qty });
  }
  rec.packedAt = nowIsoOf(now);
  rec.by = by;
  rec.lots = lots;
  rec.shortKg = Math.round(shortKg * 100) / 100;
  return good({ record: rec, lots, shortKg: rec.shortKg });
}

/** Đơn cần hải sản nhưng chưa ghép xong thì chưa chia tuyến / xuất kho được. */
export function seafoodReady(db, order, cfg = BUSINESS) {
  if (!seafoodItems(order, cfg).length) return true;
  const rec = ensureLogistics(db).seafood[order.id];
  return Boolean(rec && rec.packedAt);
}

// ---------------------------------------------------------------------------------------------
// Điểm giao và lập tuyến

const ROUTE_LIVE = ['planned', 'dispatched'];

/** Điểm giao đủ điều kiện lên tuyến của một khung giờ: thùng đã ở kho phụ, ghép hải sản xong, chưa có tuyến, không vướng ngoại lệ. */
export function eligibleStops(db, day, slotId, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const openEx = new Set(L.exceptions.filter((e) => e.status !== 'resolved').map((e) => e.orderId));
  const out = [];
  for (const o of db.orders) {
    if (!['locked', 'in_production', 'shipped'].includes(o.status)) continue;
    const eff = effectiveSlot(o);
    if (eff.day !== day || eff.slotId !== slotId) continue;
    const rec = L.deliveries[o.id];
    if (rec && !['unrouted'].includes(rec.status)) continue;
    if (openEx.has(o.id)) continue;
    if (!boxAtHub(db, o, cfg) || !seafoodReady(db, o, cfg)) continue;
    const g = geoOf(db, o);
    out.push({ orderId: o.id, zoneId: o.zoneId, district: g.district, ward: g.ward, wardIndex: g.wardIndex, street: g.street, no: g.no, boxes: 1 });
  }
  return out;
}

const slotShort = (slotId) => ({ early_morning_06_08: 'S', noon_11_13: 'T', evening_18_21: 'M' }[slotId] || 'X');
export const routeId = (db, day, slotId) => {
  const L = ensureLogistics(db);
  const base = `RT-${day.replace(/-/g, '')}-${slotShort(slotId)}-`;
  const n = L.routes.filter((r) => r.id.startsWith(base)).length + 1;
  return `${base}${String(n).padStart(2, '0')}`;
};

/** Slot cấu hình theo khu của một đơn trong tuyến (dùng khung giờ ở khu đầu tiên có khung đó). */
export function slotOf(slotId) {
  for (const z of BUSINESS.zones) {
    const s = findSlot(z, slotId);
    if (s) return s;
  }
  return null;
}

export function shipperById(id, cfg = BUSINESS) {
  return cfg.logistics.shippers.find((s) => s.id === id) || null;
}

/**
 * Lập tuyến (bản mock) cho một khung giờ của một ngày giao. Tuyến đã xuất kho giữ nguyên; tuyến mới lập (`planned`) được
 * thay bằng kết quả mới. Mỗi shipper chỉ chạy một tuyến trong một khung giờ, tổng thùng không vượt sức chở của shipper.
 */
export function planRoutesFor(db, { day, slotId, shipperIds = null }, now, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day || ''))) return withMsg(bad('ROUTE_STATE', 'Chọn ngày giao'));
  const slot = slotOf(slotId);
  if (!slot) return withMsg(bad('SLOT_NOT_FOUND'));
  // Bỏ các tuyến đã lập mà chưa xuất kho
  for (const r of L.routes.filter((x) => x.day === day && x.slotId === slotId && x.status === 'planned')) {
    for (const s of r.stops) {
      const rec = L.deliveries[s.orderId];
      if (rec && rec.routeId === r.id && rec.status === 'planned') {
        rec.status = 'unrouted';
        rec.routeId = null;
      }
    }
    r.status = 'cancelled';
  }
  L.routes = L.routes.filter((r) => r.status !== 'cancelled');
  const busy = new Set(L.routes.filter((r) => r.day === day && r.slotId === slotId && ROUTE_LIVE.includes(r.status)).map((r) => r.shipperId));
  const shippers = cfg.logistics.shippers.filter((s) => (!shipperIds || shipperIds.includes(s.id)) && !busy.has(s.id));
  const stops = eligibleStops(db, day, slotId, cfg);
  const plan = planRoutes({ stops, shippers }, cfg);
  const created = [];
  for (const pr of plan.routes) {
    const id = routeId(db, day, slotId);
    const route = {
      id, day, slotId, shipperId: pr.shipperId, capacityBoxes: pr.capacityBoxes, boxes: pr.boxes, estMinutes: pr.estMinutes,
      fitsWindow: routeFitsWindow(pr.estMinutes, day, slot), status: 'planned', createdAt: nowIsoOf(now), dispatchedAt: null, dispatchTempC: null,
      sorted: {}, mock: true,
      stops: pr.stops.map((s) => ({ orderId: s.orderId, seq: s.seq, zoneId: s.zoneId, district: s.district, ward: s.ward, wardIndex: s.wardIndex, street: s.street, no: s.no }))
    };
    L.routes.push(route);
    for (const s of route.stops) {
      const rec = (L.deliveries[s.orderId] ||= { routeId: null, status: 'unrouted', attempts: [], calls: 0 });
      rec.routeId = id;
      rec.status = 'planned';
    }
    created.push(route);
  }
  refreshCosts(db, day, cfg, now);
  return good({ routes: created, unassigned: plan.unassigned.map((s) => ({ orderId: s.orderId, reason: s.reason })), totalBoxes: plan.totalBoxes, engine: plan.engine });
}

/** Chuyển một điểm giao sang tuyến khác (cùng ngày, cùng khung, chưa xuất kho) nếu còn chỗ. */
export function moveStop(db, { orderId, toRouteId }, now, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const from = L.routes.find((r) => r.status === 'planned' && r.stops.some((s) => s.orderId === orderId));
  const to = L.routes.find((r) => r.id === toRouteId);
  if (!from || !to) return withMsg(bad('ROUTE_NOT_FOUND'));
  if (to.status !== 'planned' || from.day !== to.day || from.slotId !== to.slotId) return withMsg(bad('ROUTE_STATE', 'Chỉ chuyển giữa các tuyến chưa xuất kho của cùng khung giờ'));
  if (from.id === to.id) return good({});
  if (to.boxes + 1 > to.capacityBoxes) return withMsg(bad('ROUTE_STATE', `Tuyến ${to.id} đã đủ ${to.capacityBoxes} thùng (sức chở của shipper)`));
  const stop = from.stops.find((s) => s.orderId === orderId);
  from.stops = from.stops.filter((s) => s.orderId !== orderId);
  to.stops.push(stop);
  for (const r of [from, to]) {
    r.stops = orderStops(r.stops, cfg).map((s, i) => ({ ...s, seq: i + 1 }));
    r.boxes = r.stops.length;
  }
  const rec = L.deliveries[orderId];
  if (rec) rec.routeId = to.id;
  delete from.sorted[orderId];
  L.routes = L.routes.filter((r) => r.stops.length > 0);
  return good({ from: from.id, to: to.id });
}

/** Chia thùng vào tuyến và cất kho lạnh: ghi vị trí kệ. `location` rỗng thì bỏ tích. */
export function sortBox(db, { routeId: rid, orderId, location = '', clear = false }, now) {
  const L = ensureLogistics(db);
  const route = L.routes.find((r) => r.id === rid);
  if (!route || !route.stops.some((s) => s.orderId === orderId)) return withMsg(bad('ROUTE_NOT_FOUND'));
  if (route.status !== 'planned') return withMsg(bad('ROUTE_STATE', 'Tuyến đã xuất kho'));
  if (clear) delete route.sorted[orderId];
  else route.sorted[orderId] = { at: nowIsoOf(now), location: String(location || '').trim() };
  return good({ sorted: route.sorted });
}

/**
 * Xuất kho theo khung giờ: ghi nhiệt độ mốc "xuất kho phụ", đơn sang `shipped` (cùng hàm setOrderStatus, khách thấy "đang giao"),
 * shipper nhận tuyến. Cần chia đủ thùng vào tuyến. Nhiệt độ vượt ngưỡng vẫn xuất được nhưng thành cảnh báo cho QC.
 */
export function dispatchRoute(db, { routeId: rid, tempC, frozenTempC = null, by = '' }, now, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const route = L.routes.find((r) => r.id === rid);
  if (!route) return withMsg(bad('ROUTE_NOT_FOUND'));
  if (route.status !== 'planned') return withMsg(bad('ROUTE_STATE', 'Tuyến này đã xuất kho'));
  const t = Number(tempC);
  if (tempC === '' || tempC == null || !Number.isFinite(t)) return withMsg(bad('TEMP_REQUIRED', 'Nhập nhiệt độ lúc xuất kho'));
  const unsorted = route.stops.filter((s) => !route.sorted[s.orderId]).map((s) => s.orderId);
  if (unsorted.length) return withMsg(bad('NOT_SORTED', `Còn ${unsorted.length} thùng chưa chia vào tuyến`, { unsorted }));
  let ft = null;
  if (frozenTempC !== '' && frozenTempC != null) {
    ft = Number(frozenTempC);
    if (!Number.isFinite(ft)) return withMsg(bad('TEMP_REQUIRED', 'Nhiệt độ ngăn đông không hợp lệ'));
  }
  const nowIso = nowIsoOf(now);
  route.status = 'dispatched';
  route.dispatchedAt = nowIso;
  route.dispatchTempC = t;
  const readings = [addReading(db, { point: 'hub_dispatch', ref: route.id, cls: 'chill', tempC: t, at: nowIso, by })];
  if (ft != null) readings.push(addReading(db, { point: 'hub_dispatch', ref: route.id, cls: 'frozen', tempC: ft, at: nowIso, by }));
  const slot = slotOf(route.slotId);
  for (const s of route.stops) {
    const order = orderOf(db, s.orderId);
    const rec = (L.deliveries[s.orderId] ||= { routeId: route.id, status: 'planned', attempts: [], calls: 0 });
    rec.routeId = route.id;
    rec.status = 'pending';
    rec.calls = 0;
    if (!order) continue;
    const r = applyOrderStatus(db, { orderId: order.id, status: 'shipped' }, now);
    if (!r.ok && order.status === 'shipped') {
      // Giao lại: đơn đã ở trạng thái "đang giao", vẫn báo khách tuyến mới đã xuất kho
      notify(db, {
        customerId: order.customerId, type: 'delivery_status', title: 'Đơn của bạn đang trên đường giao',
        body: `Khung giờ ${slot ? slot.label : 'đã hẹn'}. Shipper sẽ gọi trước khi tới.`, at: nowIso,
        meta: { orderId: order.id, weekIndex: order.weekIndex, status: 'shipped', photoUrl: null }
      });
    }
    order.deliveryIssue = null;
    order.holdCold = null;
  }
  refreshCosts(db, route.day, cfg, now);
  const breaches = readings.filter((r) => !evaluateTemp(r.cls, r.tempC, cfg).ok);
  return good({ route, breaches: breaches.map((b) => b.id), readings });
}

// ---------------------------------------------------------------------------------------------
// Shipper

const STOP_LIVE = ['pending'];

function stopRecord(db, orderId) {
  return ensureLogistics(db).deliveries[orderId] || null;
}

/** Tuyến của shipper có chứa điểm giao này và đã xuất kho. */
function routeOfStop(db, shipperId, orderId) {
  return ensureLogistics(db).routes.find((r) => r.shipperId === shipperId && r.status === 'dispatched' && r.stops.some((s) => s.orderId === orderId)) || null;
}

function routeDoneCheck(db, route) {
  const L = ensureLogistics(db);
  const left = route.stops.filter((s) => (L.deliveries[s.orderId] || {}).status === 'pending').length;
  if (!left) route.status = 'done';
  return route.status === 'done';
}

/** Shipper bấm gọi khách. SĐT thật không rời server: giao diện chỉ nhận số che và việc gọi đi qua tổng đài ẩn số (mock). */
export function callCustomer(db, { orderId, shipperId }, now) {
  const route = routeOfStop(db, shipperId, orderId);
  const rec = stopRecord(db, orderId);
  if (!route || !rec) return withMsg(bad('NOT_YOUR_STOP'));
  if (!STOP_LIVE.includes(rec.status)) return withMsg(bad('STOP_STATE'));
  rec.calls = (rec.calls || 0) + 1;
  rec.lastCallAt = nowIsoOf(now);
  return good({ calls: rec.calls });
}

export function deliverStop(db, { orderId, shipperId, photo = '', tempC = null, recovered = null }, now, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const route = routeOfStop(db, shipperId, orderId);
  const rec = stopRecord(db, orderId);
  const order = orderOf(db, orderId);
  if (!route || !rec || !order) return withMsg(bad('NOT_YOUR_STOP'));
  if (!STOP_LIVE.includes(rec.status)) return withMsg(bad('STOP_STATE', 'Điểm giao này đã xử lý rồi'));
  if (!String(photo || '').trim()) return withMsg(bad('PHOTO_REQUIRED'));
  let t = null;
  if (tempC !== '' && tempC != null) {
    t = Number(tempC);
    if (!Number.isFinite(t)) return withMsg(bad('TEMP_REQUIRED', 'Nhiệt độ không hợp lệ'));
  } else if (cfg.logistics.deliveryTempRequired) {
    return withMsg(bad('TEMP_REQUIRED', 'Nhập nhiệt độ lúc giao'));
  }
  const customer = customerOf(db, order);
  const assets = (customer && L.assets[customer.id]) || { foam: 0, gel: 0 };
  const expected = recoveryExpected(assets, cfg);
  const chk = checkRecovery(recovered || { foam: 0, gel: 0 }, expected, cfg);
  if (!chk.ok) return withMsg(chk);

  const nowIso = nowIsoOf(now);
  const st = applyOrderStatus(db, { orderId, status: 'delivered', photoUrl: photo }, now);
  if (!st.ok) return withMsg(bad(st.code, st.message));
  order.deliveryIssue = null;
  order.redelivery = null;
  rec.status = 'delivered';
  rec.deliveredAt = nowIso;
  rec.attempts.push({ at: nowIso, outcome: 'delivered', routeId: route.id, by: shipperId, tempC: t });
  if (t != null) addReading(db, { point: 'delivery', ref: orderId, cls: 'chill', tempC: t, at: nowIso, by: shipperId, orderId });
  if (customer && cfg.logistics.recovery.enabled) {
    L.assets[customer.id] = applyRecovery(assets, chk, cfg);
    if (chk.foam || chk.gel) L.recoveries.push({ orderId, at: nowIso, foam: chk.foam, gel: chk.gel, by: shipperId });
    rec.recovered = { foam: chk.foam, gel: chk.gel, expectedFoam: expected.foam, expectedGel: expected.gel };
  }
  routeDoneCheck(db, route);
  refreshCosts(db, route.day, cfg, now);
  return good({ orderId, status: 'delivered', routeDone: route.status === 'done', recovered: rec.recovered || null });
}

const REASON_TEXT = {
  unreachable: 'Shipper chưa liên lạc được với bạn',
  wrong_address: 'Địa chỉ giao chưa đúng hoặc shipper không tìm thấy',
  customer_reschedule: 'Bạn đã hẹn giao lại'
};

/** Không giao được: ghi lý do, báo khách, mở ngoại lệ để điều phối chọn giao lại / giữ lạnh / bù Fresh Credit. */
export function failStop(db, { orderId, shipperId, reason, note = '' }, now, cfg = BUSINESS) {
  const route = routeOfStop(db, shipperId, orderId);
  const rec = stopRecord(db, orderId);
  const order = orderOf(db, orderId);
  if (!route || !rec || !order) return withMsg(bad('NOT_YOUR_STOP'));
  if (!STOP_LIVE.includes(rec.status)) return withMsg(bad('STOP_STATE', 'Điểm giao này đã xử lý rồi'));
  if (!cfg.logistics.failReasons[reason]) return withMsg(bad('REASON_INVALID'));
  if (reason === 'unreachable' && (rec.calls || 0) < cfg.logistics.unreachableMinCalls) return withMsg(bad('CALL_REQUIRED', `Hãy gọi khách ít nhất ${cfg.logistics.unreachableMinCalls} lần trước khi báo không liên lạc được`));
  const nowIso = nowIsoOf(now);
  rec.status = 'failed';
  rec.attempts.push({ at: nowIso, outcome: 'failed', routeId: route.id, reason, note: String(note).trim(), by: shipperId, calls: rec.calls || 0 });
  notify(db, {
    customerId: order.customerId, type: 'delivery_status', title: 'Đơn của bạn chưa giao được',
    body: `${REASON_TEXT[reason]}. MOVA sẽ liên hệ để sắp xếp giao lại hoặc bù cho bạn.`, at: nowIso,
    meta: { orderId: order.id, weekIndex: order.weekIndex, status: 'failed', reason, photoUrl: null }
  });
  setIssue(order, 'failed', `Chưa giao được: ${REASON_TEXT[reason]}`, 'MOVA sẽ liên hệ để sắp xếp giao lại hoặc bù cho bạn.', now);
  const ex = createException(db, { orderId, kind: 'delivery_failed', reason: cfg.logistics.failReasons[reason] + (note ? ` · ${String(note).trim()}` : ''), source: route.id }, now);
  routeDoneCheck(db, route);
  refreshCosts(db, route.day, cfg, now);
  return good({ orderId, status: 'failed', exceptionId: ex ? ex.id : null, routeDone: route.status === 'done' });
}

// ---------------------------------------------------------------------------------------------
// Chi phí và KPI

/** Số thùng và chuyến xe của một ngày giao, theo kế hoạch / đơn đang sống. */
function dayBoxesByTrip(db, day, cfg) {
  const d = buildDemandDays(db, cfg).find((x) => x.day === day);
  const byTrip = {};
  if (!d) return byTrip;
  for (const l of d.lists) byTrip[l.tripId] = (byTrip[l.tripId] || 0) + 1;
  return byTrip;
}

/**
 * Chi phí logistics của một ngày giao: xe chặng dài (theo chuyến, giá đã nhập hoặc mặc định), kho phụ (theo ngày), chặng cuối
 * (theo tuyến và điểm giao) và chi phí mỗi thùng. Hàm đọc, không ghi.
 */
export function dayCost(db, day, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const byTrip = dayBoxesByTrip(db, day, cfg);
  const boxes = Object.values(byTrip).reduce((s, n) => s + n, 0);
  const tripRows = cfg.factory.trips
    .filter((t) => byTrip[t.id] > 0)
    .map((t) => {
      const scope = scopeKey(day, t.id);
      const rec = L.trips[scope];
      const costVnd = rec ? rec.costVnd : cfg.logistics.truck.costPerTripVnd;
      return { scope, tripId: t.id, label: t.label, boxes: byTrip[t.id], costVnd, perBoxVnd: Math.round(costVnd / byTrip[t.id]), estimated: !rec };
    });
  const hubRec = L.hubCosts[day];
  const hubParts = hubRec || cfg.logistics.hubDailyCostVnd;
  const hubVnd = boxes > 0 ? hubDayCostVnd(hubParts) : 0;
  const routeRows = L.routes
    .filter((r) => r.day === day && ROUTE_LIVE.concat(['done']).includes(r.status))
    .map((r) => {
      const failed = r.stops.reduce((s, x) => s + (((L.deliveries[x.orderId] || {}).attempts || []).filter((a) => a.outcome === 'failed' && a.routeId === r.id).length), 0);
      const costVnd = routeCostVnd({ stops: r.stops.length, failedAttempts: failed }, cfg);
      return { routeId: r.id, slotId: r.slotId, shipperId: r.shipperId, stops: r.stops.length, failedAttempts: failed, costVnd, perStopVnd: r.stops.length ? Math.round(costVnd / r.stops.length) : 0, status: r.status };
    });
  const lastMileVnd = routeRows.reduce((s, r) => s + r.costVnd, 0);
  const longHaulVnd = tripRows.reduce((s, t) => s + t.costVnd, 0);
  const calc = costPerBox({ longHaulVnd, hubVnd, lastMileVnd, boxes });
  const open = routeRows.some((r) => r.status !== 'done') || !routeRows.length;
  return {
    id: `LC-${day}`, day, ...calc, trips: tripRows, hub: { ...hubParts, totalVnd: hubVnd, estimated: !hubRec }, routes: routeRows,
    status: open ? 'open' : 'final'
  };
}

/** Ghi chi phí của ngày vào `db.logisticsCosts` (chỗ P2D / Tài chính đọc). */
export function refreshCosts(db, day, cfg = BUSINESS, now = new Date()) {
  ensureLogistics(db);
  if (!day) return null;
  const c = dayCost(db, day, cfg);
  const rec = { ...c, updatedAt: nowIsoOf(now), source: 'logistics' };
  const i = db.logisticsCosts.findIndex((x) => x.day === day);
  if (i >= 0) db.logisticsCosts[i] = rec;
  else db.logisticsCosts.push(rec);
  db.logisticsCosts.sort((a, b) => a.day.localeCompare(b.day));
  return rec;
}

/** KPI trong khoảng ngày giao [from, to] (bỏ trống = tất cả). */
export function kpiOf(db, { from = null, to = null } = {}, cfg = BUSINESS) {
  const L = ensureLogistics(db);
  const inRange = (day) => (!from || day >= from) && (!to || day <= to);
  const stops = [];
  const routes = [];
  for (const r of L.routes) {
    if (!inRange(r.day) || !['dispatched', 'done'].includes(r.status)) continue;
    const slot = slotOf(r.slotId);
    const win = slot ? slotWindow(r.day, slot) : null;
    let last = null;
    let delivered = 0;
    for (const s of r.stops) {
      const mine = ((L.deliveries[s.orderId] || {}).attempts || []).filter((a) => a.routeId === r.id);
      const done = mine.find((a) => a.outcome === 'delivered');
      const failed = mine.filter((a) => a.outcome === 'failed').length;
      const lastAt = mine.length ? mine[mine.length - 1].at : null;
      if (lastAt && (!last || lastAt > last)) last = lastAt;
      if (done) delivered += 1;
      stops.push({ status: done ? 'delivered' : failed ? 'failed' : 'pending', deliveredAt: done ? done.at : null, windowStart: win ? win.start.toISOString() : null, windowEnd: win ? win.end.toISOString() : null, failedAttempts: failed });
    }
    routes.push({ stops: delivered, boxes: r.stops.length, startAt: r.dispatchedAt, endAt: last });
  }
  const trips = [];
  for (const [scope, l] of Object.entries(db.factory.loads || {})) {
    if (!l.departedAt || !inRange(scope.split('|')[0])) continue;
    trips.push({ boxes: Object.keys(l.loaded || {}).length });
  }
  const readings = allReadings(db).filter((r) => inRange(r.point === 'factory_depart' || r.point === 'hub_receive' ? String(r.ref).split('|')[0] : dayKey(new Date(r.at))));
  const costs = db.logisticsCosts.filter((c) => inRange(c.day));
  const outFoam = stops.filter((s) => s.status === 'delivered').length * cfg.logistics.recovery.foamBoxesPerBox;
  const backFoam = L.recoveries.reduce((s, x) => s + x.foam, 0);
  const kpi = computeKpis({ stops, routes, trips, costs, breaches: breachesByPoint(readings, cfg).total, recovery: cfg.logistics.recovery.enabled ? { out: outFoam, back: backFoam } : null }, cfg);
  return { ...kpi, routes: routes.length, trips: trips.length, boxesDelivered: kpi.deliveredStops, recovery: { enabled: cfg.logistics.recovery.enabled, outFoam, backFoam, backGel: L.recoveries.reduce((s, x) => s + x.gel, 0) } };
}
