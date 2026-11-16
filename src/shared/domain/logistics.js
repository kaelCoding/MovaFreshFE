import { BUSINESS, getZone } from '../config/business';
import { addDays, atDay, dayKeySequence, dowOfKey } from '../utils/time';
import { slotCapacity, slotUsage, findSlot } from './delivery';

/**
 * Nghiệp vụ logistics thuần (P2C): sức chứa khung giờ, gợi ý gộp ngày, lập tuyến chặng cuối (BẢN MOCK), chuỗi lạnh,
 * thu hồi thùng xốp / túi gel, chi phí mỗi thùng và KPI. Không đụng db, không có tên / SĐT / địa chỉ khách.
 */

export { slotCapacity };

const r0 = (n) => Math.round(n || 0);
const r1 = (n) => Math.round((n || 0) * 10) / 10;

// ---------------------------------------------------------------------------------------------
// Sức chứa khung giờ

/**
 * Bảng sức chứa của một khu: mỗi ngày giao sắp tới, mỗi khung: sức chứa hiệu lực, số đã đặt, còn lại, cảnh báo vượt.
 * `overrides` là db.logistics.capacity. Đơn đã đặt vượt sức chứa (do điều phối hạ sức chứa sau khi khách đặt) hiện `overbooked`.
 */
export function zoneCapacityDays(orders, zone, today, overrides, count = 4) {
  const days = dayKeySequence(zone.deliveryDays, today, count);
  return days.map((day) => {
    const slots = zone.slots.map((slot) => {
      const capacity = slotCapacity(overrides, zone.id, day, slot);
      const used = slotUsage(orders, zone.id, day, slot.id);
      return {
        slotId: slot.id,
        label: slot.label,
        configCapacity: slot.capacityBoxes,
        capacity,
        overridden: capacity !== slot.capacityBoxes,
        used,
        remaining: Math.max(0, capacity - used),
        overbooked: Math.max(0, used - capacity),
        fillPct: capacity > 0 ? Math.min(1, used / capacity) : used > 0 ? 1 : 0
      };
    });
    const used = slots.reduce((s, x) => s + x.used, 0);
    const capacity = slots.reduce((s, x) => s + x.capacity, 0);
    return { day, slots, used, capacity, fillPct: capacity > 0 ? used / capacity : 0 };
  });
}

/**
 * Kiểm tra đổi sức chứa. Hạ xuống dưới số đã đặt thì khách mới không đặt thêm được nhưng đơn đã đặt vẫn phải giao:
 * trả `overbooked` để giao diện cảnh báo, và chỉ cho phép khi `allowBelowUsed`.
 */
export function checkCapacityChange({ capacityBoxes, used, allowBelowUsed = false }) {
  if (!Number.isInteger(capacityBoxes) || capacityBoxes < 0 || capacityBoxes > 500) return { ok: false, code: 'CAPACITY_INVALID', message: 'Sức chứa phải là số nguyên từ 0 đến 500 thùng' };
  const overbooked = Math.max(0, used - capacityBoxes);
  if (overbooked > 0 && !allowBelowUsed) {
    return { ok: false, code: 'CAPACITY_BELOW_USED', message: `Đã có ${used} thùng đặt cho khung này, thấp hơn ${capacityBoxes}. Đơn đã đặt vẫn phải giao; xác nhận nếu vẫn muốn hạ.`, overbooked };
  }
  return { ok: true, overbooked };
}

/**
 * Gợi ý gộp ngày cho khu ít đơn: ngày giao có độ lấp đầy thấp hơn `belowPct`, và toàn bộ đơn của ngày đó chuyển được sang
 * ngày giao khác CỦA CÙNG TUẦN mà không vượt sức chứa từng khung. Trả danh sách gợi ý, ngày ít đơn nhất trước.
 * (Chỉ là gợi ý để điều phối cân nhắc: app chưa tự dời đơn của khách.)
 */
export function suggestDayMerges(boards, belowPct = BUSINESS.logistics.mergeSuggestBelowFillPct) {
  const out = [];
  for (const zone of boards) {
    for (const from of zone.days) {
      if (from.used === 0 || from.fillPct >= belowPct) continue;
      const week = (d) => addDays(d, -((dowOfKey(d) + 6) % 7));
      const targets = zone.days.filter((t) => t.day !== from.day && week(t.day) === week(from.day));
      for (const to of targets) {
        const fits = from.slots.every((fs) => {
          if (fs.used === 0) return true;
          const ts = to.slots.find((x) => x.slotId === fs.slotId);
          return Boolean(ts) && ts.used + fs.used <= ts.capacity;
        });
        if (!fits) continue;
        const merged = to.used + from.used;
        out.push({
          zoneId: zone.zoneId, zoneName: zone.name, fromDay: from.day, toDay: to.day, moveBoxes: from.used,
          beforePerDay: r1((from.used + to.used) / 2), afterPerDay: merged,
          fromFillPct: from.fillPct, toFillPctAfter: to.capacity > 0 ? merged / to.capacity : 0
        });
        break;
      }
    }
  }
  return out.sort((a, b) => a.moveBoxes - b.moveBoxes);
}

// ---------------------------------------------------------------------------------------------
// Khung giờ

/** Thời điểm bắt đầu / kết thúc khung giao của một ngày. */
export function slotWindow(day, slot) {
  const start = atDay(day, slot.startHour, slot.startMin);
  const end = slot.endHour != null ? atDay(day, slot.endHour, slot.endMin || 0) : new Date(start.getTime() + 2 * 3600 * 1000);
  return { start, end };
}

/** Các khung giờ muộn hơn `slotId` trong cùng khu (để giao lại khung sau). */
export function laterSlots(zone, slotId) {
  const i = zone.slots.findIndex((s) => s.id === slotId);
  return i < 0 ? [] : zone.slots.slice(i + 1);
}

/**
 * Lựa chọn giao lại cho đơn giao không thành công: các khung muộn hơn trong cùng ngày (nếu còn), rồi ngày giao kế tiếp của khu
 * từ khung đầu tiên. Không kiểm sức chứa (đơn đã đặt chỗ từ trước, điều phối quyết định).
 */
export function redeliveryOptions({ zoneId, day, slotId }, nowDay, cfg = BUSINESS) {
  const zone = getZone(zoneId);
  if (!zone) return [];
  const out = laterSlots(zone, slotId).map((s) => ({ day, slotId: s.id, label: s.label, sameDay: true }));
  const next = dayKeySequence(zone.deliveryDays, addDays(day > nowDay ? day : nowDay, 1), 1)[0];
  if (next) {
    const first = zone.slots[0];
    out.push({ day: next, slotId: first.id, label: first.label, sameDay: false });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Lập tuyến chặng cuối: BẢN MOCK

export const ROUTE_ENGINE_NOTE = 'Bản mock: gom theo khu → phường → xếp thứ tự theo đường và số nhà. Sau này thay bằng engine tối ưu tuyến của Hiếu / dịch vụ bản đồ.';

/** Khóa sắp xếp: khu (theo thứ tự cấu hình) → quận → phường → đường → số nhà. */
export function stopSortKey(stop, cfg = BUSINESS) {
  const zi = cfg.zones.findIndex((z) => z.id === stop.zoneId);
  const zone = cfg.zones[zi];
  const di = zone ? Math.max(0, zone.districts.indexOf(stop.district)) : 0;
  return [zi < 0 ? 99 : zi, di, stop.wardIndex || 0, stop.street || '', stop.no || 0, stop.orderId];
}

function compareKeys(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (typeof a[i] === 'number' && typeof b[i] === 'number') return a[i] - b[i];
    return String(a[i]).localeCompare(String(b[i]), 'vi');
  }
  return 0;
}

/** Sắp điểm giao: khu → quận → phường → đường → số nhà. */
export function orderStops(stops, cfg = BUSINESS) {
  return [...stops].sort((a, b) => compareKeys(stopSortKey(a, cfg), stopSortKey(b, cfg)));
}

/** Ước tính phút của một tuyến đã xếp thứ tự (bản mock): thời gian tại điểm + di chuyển giữa hai điểm liên tiếp. */
export function estimateRouteMinutes(stops, cfg = BUSINESS) {
  const L = cfg.logistics;
  let total = 0;
  stops.forEach((s, i) => {
    total += L.minutesPerStop;
    if (i === 0) return;
    const p = stops[i - 1];
    if (p.zoneId !== s.zoneId) total += L.travelMinutes.otherZone;
    else if (p.district !== s.district || p.ward !== s.ward) total += L.travelMinutes.otherWard;
    else total += L.travelMinutes.sameWard;
  });
  return total;
}

/**
 * Lập tuyến cho MỘT khung giờ của MỘT ngày giao.
 * - stops: [{ orderId, zoneId, district, ward, wardIndex, street, no, boxes? }]
 * - shippers: [{ id, capacityBoxes }]
 * Thuật toán (mock): sắp điểm theo khu → quận → phường → đường → số nhà; dùng ít shipper nhất đủ chở hết (ưu tiên sức chở lớn);
 * chia dãy điểm đã sắp thành các đoạn liền nhau theo tỷ lệ sức chở để các tuyến cân bằng, và KHÔNG BAO GIỜ vượt sức chở
 * của shipper. Điểm không còn chỗ thì nằm ở `unassigned`.
 */
export function planRoutes({ stops, shippers }, cfg = BUSINESS) {
  const ordered = orderStops(stops.map((s) => ({ boxes: 1, ...s })), cfg);
  const total = ordered.reduce((s, x) => s + x.boxes, 0);
  const pool = [...shippers].filter((s) => s.capacityBoxes > 0).sort((a, b) => b.capacityBoxes - a.capacityBoxes || String(a.id).localeCompare(String(b.id)));
  const chosen = [];
  let cap = 0;
  for (const s of pool) {
    if (cap >= total) break;
    chosen.push(s);
    cap += s.capacityBoxes;
  }
  const routes = chosen.map((s) => ({ shipperId: s.id, capacityBoxes: s.capacityBoxes, stops: [], boxes: 0 }));
  const unassigned = [];
  if (!routes.length) {
    return { routes: [], unassigned: ordered.map((s) => ({ ...s, reason: 'NO_SHIPPER' })), totalBoxes: total, engine: ROUTE_ENGINE_NOTE };
  }
  const capSum = routes.reduce((s, r) => s + r.capacityBoxes, 0);
  routes.forEach((r) => { r.target = Math.min(r.capacityBoxes, Math.ceil((total * r.capacityBoxes) / capSum)); });

  let ri = 0;
  for (const s of ordered) {
    // Sang tuyến kế khi đủ chỉ tiêu cân bằng hoặc không còn chỗ (không bao giờ vượt sức chở)
    while (ri < routes.length && (routes[ri].boxes + s.boxes > routes[ri].capacityBoxes || (routes[ri].boxes >= routes[ri].target && ri < routes.length - 1))) ri += 1;
    if (ri >= routes.length) {
      unassigned.push({ ...s, reason: 'NO_CAPACITY' });
      continue;
    }
    routes[ri].stops.push(s);
    routes[ri].boxes += s.boxes;
  }
  const out = routes
    .filter((r) => r.stops.length)
    .map((r, i) => ({
      shipperId: r.shipperId, capacityBoxes: r.capacityBoxes, boxes: r.boxes, stops: r.stops.map((s, k) => ({ ...s, seq: k + 1 })),
      estMinutes: estimateRouteMinutes(r.stops, cfg), index: i + 1
    }));
  return { routes: out, unassigned, totalBoxes: total, engine: ROUTE_ENGINE_NOTE };
}

/** Một tuyến có nằm gọn trong khung giờ không (giờ xuất kho dự kiến là đầu khung). */
export function routeFitsWindow(estMinutes, day, slot) {
  const w = slotWindow(day, slot);
  return estMinutes * 60 * 1000 <= w.end.getTime() - w.start.getTime();
}

/** Link tìm địa chỉ trên Google Maps (không cần API key). */
export function mapsSearchUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
}

// ---------------------------------------------------------------------------------------------
// Chuỗi lạnh

export const TEMP_POINTS = {
  factory_depart: 'Xuất xưởng Đắk Lắk',
  hub_receive: 'Nhận tại kho phụ',
  hub_dispatch: 'Xuất kho phụ',
  delivery: 'Lúc giao'
};
export const TEMP_POINT_ORDER = ['factory_depart', 'hub_receive', 'hub_dispatch', 'delivery'];
export const TEMP_CLASS_LABEL = { chill: 'Ngăn mát', frozen: 'Ngăn đông' };

/**
 * Kiểm một số đo nhiệt độ theo ngưỡng `BUSINESS.temperature`: mát 0–4°C, đông ≤ −18°C.
 * Trả { ok, status: 'ok' | 'high' | 'low', limit }. `low` chỉ có ở ngăn mát (dưới 0°C làm đóng băng rau).
 */
export function evaluateTemp(cls, tempC, cfg = BUSINESS) {
  const t = cfg.temperature;
  if (typeof tempC !== 'number' || Number.isNaN(tempC)) return { ok: false, status: 'invalid', limit: '' };
  if (cls === 'frozen') {
    const ok = tempC <= t.frozen.max;
    return { ok, status: ok ? 'ok' : 'high', limit: `≤ ${t.frozen.max}°C` };
  }
  const limit = `${t.chill.min}–${t.chill.max}°C`;
  if (tempC > t.chill.max) return { ok: false, status: 'high', limit };
  if (tempC < t.chill.min) return { ok: false, status: 'low', limit };
  return { ok: true, status: 'ok', limit };
}

/**
 * Cảnh báo chuỗi lạnh từ danh sách số đo: mỗi số đo vượt ngưỡng là một cảnh báo; quyết định của QC (giữ / hủy)
 * nằm ở `decisions[readingId]`.
 */
export function coldAlerts(readings, decisions = {}, cfg = BUSINESS) {
  return readings
    .map((r) => ({ reading: r, eval: evaluateTemp(r.cls, r.tempC, cfg) }))
    .filter((x) => !x.eval.ok)
    .map((x) => ({
      id: x.reading.id, point: x.reading.point, cls: x.reading.cls, tempC: x.reading.tempC, at: x.reading.at, ref: x.reading.ref,
      status: x.eval.status, limit: x.eval.limit, decision: decisions[x.reading.id] || null
    }));
}

/** Đếm số lần vượt nhiệt và theo mốc. */
export function breachesByPoint(readings, cfg = BUSINESS) {
  const out = { total: 0 };
  for (const p of TEMP_POINT_ORDER) out[p] = 0;
  for (const r of readings) {
    if (evaluateTemp(r.cls, r.tempC, cfg).ok) continue;
    out.total += 1;
    out[r.point] = (out[r.point] || 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Thu hồi thùng xốp / túi gel

/** Số thùng xốp / túi gel đã giao cho khách mà chưa thu về. `assets` = { foam, gel } đang ở nhà khách. */
export function recoveryExpected(assets, cfg = BUSINESS) {
  const rec = cfg.logistics.recovery;
  if (!rec.enabled) return { foam: 0, gel: 0 };
  return { foam: Math.max(0, (assets && assets.foam) || 0), gel: Math.max(0, (assets && assets.gel) || 0) };
}

/** Kiểm số thu về nhập vào: không âm, không vượt số đang ở nhà khách. */
export function checkRecovery(input, expected, cfg = BUSINESS) {
  if (!cfg.logistics.recovery.enabled) return { ok: true, foam: 0, gel: 0 };
  const foam = input && input.foam != null ? Number(input.foam) : 0;
  const gel = input && input.gel != null ? Number(input.gel) : 0;
  if (!Number.isInteger(foam) || !Number.isInteger(gel) || foam < 0 || gel < 0) return { ok: false, code: 'RECOVERY_INVALID', message: 'Số thùng xốp và túi gel thu về phải là số nguyên không âm' };
  if (foam > expected.foam || gel > expected.gel) return { ok: false, code: 'RECOVERY_EXCEEDS', message: `Khách chỉ đang giữ ${expected.foam} thùng xốp và ${expected.gel} túi gel` };
  return { ok: true, foam, gel };
}

/** Sau một lần giao thành công: trừ số đã thu, cộng số vừa để lại (thùng giao lần này). */
export function applyRecovery(assets, recovered, cfg = BUSINESS) {
  const rec = cfg.logistics.recovery;
  const cur = assets || { foam: 0, gel: 0 };
  if (!rec.enabled) return { foam: 0, gel: 0 };
  return { foam: cur.foam - recovered.foam + rec.foamBoxesPerBox, gel: cur.gel - recovered.gel + rec.gelPacksPerBox };
}

// ---------------------------------------------------------------------------------------------
// Chi phí

/** Chi phí một tuyến chặng cuối: khoản cố định của tuyến + mỗi điểm giao + mỗi lần giao hụt. */
export function routeCostVnd({ stops, failedAttempts = 0 }, cfg = BUSINESS) {
  const m = cfg.logistics.lastMile;
  return r0(m.routeBaseVnd + m.perStopVnd * stops + m.perFailedAttemptVnd * failedAttempts);
}

export const hubDayCostVnd = (c) => r0((c.laborVnd || 0) + (c.rentVnd || 0) + (c.iceVnd || 0) + (c.otherVnd || 0));

/**
 * Chi phí logistics mỗi thùng của một ngày giao = (xe chặng dài + kho phụ + chặng cuối) / số thùng.
 * Trả cả ba phần để tài chính phân bổ. boxes = 0 thì chi phí mỗi thùng = 0 (chưa chia được).
 */
export function costPerBox({ longHaulVnd = 0, hubVnd = 0, lastMileVnd = 0, boxes = 0 }) {
  const totalVnd = r0(longHaulVnd + hubVnd + lastMileVnd);
  const div = boxes > 0 ? boxes : 0;
  const per = (v) => (div ? r0(v / div) : 0);
  return {
    boxes, totalVnd, perBoxVnd: per(totalVnd),
    parts: { longHaulVnd: r0(longHaulVnd), hubVnd: r0(hubVnd), lastMileVnd: r0(lastMileVnd) },
    perBox: { longHaulVnd: per(longHaulVnd), hubVnd: per(hubVnd), lastMileVnd: per(lastMileVnd) }
  };
}

// ---------------------------------------------------------------------------------------------
// KPI

/**
 * KPI logistics từ dữ liệu đã dựng sẵn (hàm thuần).
 * - stops: [{ status: 'delivered' | 'failed' | 'pending', deliveredAt, windowStart, windowEnd, failedAttempts }]
 * - routes: [{ stops (số điểm đã giao), startAt, endAt }]
 * - trips: [{ boxes }] chuyến chặng dài đã xuất bến
 * - costs: [{ totalVnd, boxes }] (mỗi ngày một bản ghi)
 * - breaches: số lần vượt nhiệt
 */
export function computeKpis({ stops = [], routes = [], trips = [], costs = [], breaches = 0, recovery = null }, cfg = BUSINESS) {
  const grace = cfg.logistics.kpi.onTimeGraceMinutes * 60 * 1000;
  const delivered = stops.filter((s) => s.status === 'delivered');
  const failedAttempts = stops.reduce((s, x) => s + (x.failedAttempts || 0), 0);
  const onTime = delivered.filter((s) => {
    if (!s.deliveredAt || !s.windowEnd) return true;
    return Date.parse(s.deliveredAt) <= Date.parse(s.windowEnd) + grace;
  }).length;
  const attempts = delivered.length + failedAttempts;

  const minMs = cfg.logistics.kpi.minRouteMinutes * 60 * 1000;
  const perRoute = routes
    .filter((r) => r.stops > 0 && r.startAt && r.endAt)
    .map((r) => (r.stops / (Math.max(Date.parse(r.endAt) - Date.parse(r.startAt), minMs) / 3600000)));
  const costBoxes = costs.reduce((s, c) => s + (c.boxes || 0), 0);
  const costTotal = costs.reduce((s, c) => s + (c.totalVnd || 0), 0);
  const stopsPerRoute = routes.length ? routes.reduce((s, r) => s + (r.boxes != null ? r.boxes : r.stops), 0) / routes.length : 0;

  return {
    deliveredStops: delivered.length,
    failedAttempts,
    onTimePct: delivered.length ? onTime / delivered.length : null,
    failPct: attempts ? failedAttempts / attempts : null,
    stopsPerHour: perRoute.length ? r1(perRoute.reduce((a, b) => a + b, 0) / perRoute.length) : null,
    stopsPerRoute: routes.length ? r1(stopsPerRoute) : null,
    boxesPerTruck: trips.length ? r1(trips.reduce((s, t) => s + t.boxes, 0) / trips.length) : null,
    costPerBoxVnd: costBoxes ? r0(costTotal / costBoxes) : null,
    tempBreaches: breaches,
    recoveryPct: recovery && recovery.out > 0 ? recovery.back / recovery.out : null
  };
}

export { findSlot };
