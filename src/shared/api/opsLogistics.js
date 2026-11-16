import { getZone } from '../config/business';
import { DISHES } from '../data/catalog';
import { addDays, dayKey, atDay } from '../utils/time';
import { ForbiddenError, maskPhone, recipientFor } from './views';
import { buildDemandDays, orderPackList, scopeKey, tripDepartAt } from '../domain/factory';
import {
  TEMP_CLASS_LABEL, TEMP_POINTS, TEMP_POINT_ORDER, ROUTE_ENGINE_NOTE, coldAlerts, evaluateTemp, mapsSearchUrl, recoveryExpected, redeliveryOptions,
  slotWindow, suggestDayMerges, zoneCapacityDays, routeFitsWindow
} from '../domain/logistics';
import {
  allReadings, arrivalStateOf, boxAtHub, closeArrival, closeSeafood, dayCost, decideCold, deliverStop, dispatchRoute, effectiveSlot, eligibleStops,
  ensureLogistics, failStop, kpiOf, manifestOf, moveStop, planOrders, planRoutesFor, readingOrders, refreshCosts, resolveException, saveHubCost, saveTrip,
  scanArrival, seafoodItems, seafoodReady, setCapacity, shipperById, slotOf, sortBox, tickSeafood, tripScopeOf, callCustomer, geoOf
} from '../domain/logisticsOps';

const toError = (res) => {
  const e = new Error(res.message || res.code);
  e.code = res.code;
  if (res.unsorted) e.unsorted = res.unsorted;
  return e;
};
const must = (res) => {
  if (!res.ok) throw toError(res);
  return res;
};

/**
 * API logistics (P2C): `api.ops.logistics` (điều phối), `api.ops.routes` (lập tuyến), `api.ops.hub` (phần kho phụ thêm vào P2B)
 * và `api.ops.shipper` (app giao hàng). Mọi hàm kiểm quyền ở `guard`, mọi thao tác ghi đi qua `server.write`.
 *
 * Lọc dữ liệu theo vai trò ở tầng API:
 * - Điều phối / admin xem điểm giao theo mã đơn, khu, quận, phường; KHÔNG có tên, SĐT, địa chỉ, mã khách, tiền.
 * - Kho phụ (và admin) có tên, địa chỉ, SĐT người nhận để in phiếu tuyến.
 * - Shipper chỉ có điểm giao của chính mình: tên, địa chỉ, SĐT che một phần; không có tiền, mã khách.
 */
export function createLogisticsApi(server, cfg, guard) {
  const L = cfg.logistics;
  const slotLabelOf = (slotId) => (slotOf(slotId) || {}).label || slotId;
  const shipperName = (id) => (shipperById(id, cfg) || {}).name || id;
  const zoneName = (id) => (getZone(id) || {}).name || id;

  // ---------- Dựng dữ liệu cho màn hình (hàm đọc, dùng chung nhiều API) ----------

  /** Ngày giao có đơn, từ hôm kia trở đi. */
  function dayList(db, now, { closedOnly = false, back = 2 } = {}) {
    const today = dayKey(now);
    const plans = new Set(db.productionPlans.map((p) => p.day));
    return [...new Set(db.orders.map((o) => o.deliveryDay))]
      .filter((d) => d >= addDays(today, -back) && (!closedOnly || plans.has(d)))
      .sort();
  }

  const tripStatus = (rec, load, arrival) => {
    if (arrival && arrival.closedAt) return 'arrived';
    if (load && load.departedAt) return 'departed';
    if (load && Object.keys(load.loaded).length) return 'loading';
    return rec ? 'planned' : 'unplanned';
  };

  function tripsView(db, now, day) {
    const Lg = ensureLogistics(db);
    const demand = buildDemandDays(db, cfg);
    const d = demand.find((x) => x.day === day);
    const readings = allReadings(db);
    return cfg.factory.trips.map((t) => {
      const scope = scopeKey(day, t.id);
      const lists = d ? d.lists.filter((l) => l.tripId === t.id) : [];
      const rec = Lg.trips[scope] || null;
      const load = db.factory.loads[scope] || null;
      const arr = Lg.arrivals[scope] || null;
      const capacity = rec ? rec.capacityBoxes : L.truck.capacityBoxes;
      const cost = dayCost(db, day, cfg).trips.find((x) => x.tripId === t.id);
      const pts = (point) => readings.filter((r) => r.point === point && r.ref === scope).map((r) => ({ id: r.id, cls: r.cls, tempC: r.tempC, at: r.at, ok: evaluateTemp(r.cls, r.tempC, cfg).ok }));
      const manifest = lists.map((l) => ({
        orderId: l.orderId, zoneId: l.zoneId, slotId: l.slotId, bags: l.workshopBags,
        loadedAt: load ? load.loaded[l.orderId] || null : null,
        arrival: arr ? (arr.closedAt ? arr.boxes[l.orderId] || 'missing' : arr.boxes[l.orderId] || null) : null
      }));
      return {
        scope, tripId: t.id, label: t.label, defaultDepartAt: tripDepartAt(day, t).toISOString(),
        boxes: lists.length, capacity, overCapacity: Math.max(0, lists.length - capacity),
        record: rec ? { ...rec } : null,
        status: tripStatus(rec, load, arr),
        loaded: load ? Object.keys(load.loaded).length : 0,
        depart: load && load.departedAt ? { at: load.departedAt, tempC: load.tempC, sealNo: load.sealNo, tempOk: evaluateTemp('chill', load.tempC, cfg).ok, missing: [...(load.missing || [])] } : null,
        arrival: arr && arr.closedAt ? { closedAt: arr.closedAt, tempC: arr.tempC, frozenTempC: arr.frozenTempC, missing: arr.missing, damaged: Object.keys(arr.boxes).filter((k) => arr.boxes[k] === 'damaged'), extra: [...arr.extra] } : null,
        points: { factory_depart: pts('factory_depart'), hub_receive: pts('hub_receive') },
        costVnd: cost ? cost.costVnd : (rec ? rec.costVnd : L.truck.costPerTripVnd),
        costEstimated: !rec,
        perBoxVnd: cost ? cost.perBoxVnd : 0,
        manifest
      };
    });
  }

  function exceptionRow(db, ex, now) {
    const o = db.orders.find((x) => x.id === ex.orderId);
    const eff = o ? effectiveSlot(o) : { day: ex.day, slotId: ex.slotId };
    const g = o ? geoOf(db, o) : { district: '', ward: '' };
    const options = o ? redeliveryOptions({ zoneId: o.zoneId, day: o.deliveryDay, slotId: o.slotId }, dayKey(now), cfg) : [];
    return {
      id: ex.id, orderId: ex.orderId, kind: ex.kind, reason: ex.reason, status: ex.status, createdAt: ex.createdAt,
      zoneId: ex.zoneId, zoneName: zoneName(ex.zoneId), day: ex.day, slotId: ex.slotId, slotLabel: slotLabelOf(ex.slotId),
      district: g.district, ward: g.ward, heldUntil: ex.heldUntil || null, holdExpired: Boolean(ex.heldUntil && Date.parse(ex.heldUntil) < now.getTime()),
      resolution: ex.resolution ? { kind: ex.resolution.kind, at: ex.resolution.at, day: ex.resolution.day || null, slotId: ex.resolution.slotId || null, compensationVnd: ex.resolution.compensationVnd || null } : null,
      redeliveryOptions: options.map((p) => ({ ...p, value: `${p.day}|${p.slotId}` })),
      currentSlot: eff
    };
  }

  const stopStatusOf = (db, route, orderId) => {
    const rec = ensureLogistics(db).deliveries[orderId];
    return rec && rec.routeId === route.id ? rec.status : (rec && rec.attempts.some((a) => a.routeId === route.id && a.outcome === 'delivered') ? 'delivered' : 'moved');
  };

  /** Bảng lập tuyến / chia tuyến của một ngày: theo từng khung giờ. Người nhận chỉ trả cho kho phụ và admin. */
  function routesBoard(db, now, day, role) {
    const Lg = ensureLogistics(db);
    const days = dayList(db, now, { closedOnly: true });
    const today = dayKey(now);
    const sel = day && days.includes(day) ? day : days.find((d) => d >= today && Lg.routes.some((r) => r.day === d)) || days.find((d) => d >= today) || days[days.length - 1] || null;
    const withPii = ['hub', 'admin'].includes(role);
    const slotIds = new Set();
    const orders = sel ? planOrders(db, sel) : [];
    for (const o of orders) slotIds.add(effectiveSlot(o).slotId);
    for (const o of db.orders) { const e = effectiveSlot(o); if (e.day === sel) slotIds.add(e.slotId); }
    for (const r of Lg.routes.filter((x) => x.day === sel)) slotIds.add(r.slotId);
    const slots = [...slotIds]
      .map((slotId) => slotOf(slotId))
      .filter(Boolean)
      .sort((a, b) => a.startHour * 60 + a.startMin - (b.startHour * 60 + b.startMin))
      .map((slot) => {
        const w = sel ? slotWindow(sel, slot) : null;
        const routes = Lg.routes.filter((r) => r.day === sel && r.slotId === slot.id).map((r) => ({
          id: r.id, shipperId: r.shipperId, shipperName: shipperName(r.shipperId), capacityBoxes: r.capacityBoxes, boxes: r.boxes, estMinutes: r.estMinutes, fitsWindow: r.fitsWindow,
          status: r.status, dispatchedAt: r.dispatchedAt, dispatchTempC: r.dispatchTempC, mock: r.mock,
          sortedCount: Object.keys(r.sorted).length,
          stops: r.stops.map((s) => {
            const o = db.orders.find((x) => x.id === s.orderId);
            const rec = Lg.deliveries[s.orderId];
            return {
              seq: s.seq, orderId: s.orderId, zoneId: s.zoneId, zoneName: zoneName(s.zoneId), district: s.district, ward: s.ward,
              sorted: r.sorted[s.orderId] || null, status: stopStatusOf(db, r, s.orderId), calls: rec ? rec.calls || 0 : 0,
              recipient: withPii && o ? recipientFor(o, role) : null
            };
          })
        }));
        const eligible = sel ? eligibleStops(db, sel, slot.id, cfg).length : 0;
        // Đơn của khung này chưa lên tuyến được và lý do
        const waiting = [];
        for (const o of db.orders) {
          const e = effectiveSlot(o);
          if (e.day !== sel || e.slotId !== slot.id || !['locked', 'in_production', 'shipped'].includes(o.status)) continue;
          const rec = Lg.deliveries[o.id];
          if (rec && rec.status !== 'unrouted') continue;
          let reason = null;
          if (Lg.exceptions.some((x) => x.orderId === o.id && x.status !== 'resolved')) reason = 'exception';
          else if (!boxAtHub(db, o, cfg)) reason = arrivalStateOf(db, o, cfg) === 'waiting' ? 'waiting_truck' : 'box_missing';
          else if (!seafoodReady(db, o, cfg)) reason = 'seafood';
          if (reason) waiting.push({ orderId: o.id, reason });
        }
        return {
          slotId: slot.id, label: slot.label, startAt: w ? w.start.toISOString() : null, endAt: w ? w.end.toISOString() : null,
          dispatchBy: w ? new Date(w.start.getTime() - L.dispatchLeadMinutes * 60000).toISOString() : null,
          eligible, waiting, routes, totalBoxes: routes.reduce((s, r) => s + r.boxes, 0),
          busyShippers: routes.filter((r) => ['planned', 'dispatched'].includes(r.status)).map((r) => r.shipperId)
        };
      });
    return {
      now: now.toISOString(), today, days, day: sel, slots, engine: ROUTE_ENGINE_NOTE,
      shippers: L.shippers.map((s) => ({ id: s.id, name: s.name, capacityBoxes: s.capacityBoxes })),
      canSeeRecipient: withPii
    };
  }

  // ---------- API ----------
  return {
    logistics: {
      config(ctx) {
        guard(ctx, 'logisticsView');
        return {
          shippers: L.shippers.map((s) => ({ id: s.id, name: s.name, capacityBoxes: s.capacityBoxes })), failReasons: { ...L.failReasons },
          temperature: cfg.temperature, points: TEMP_POINTS, truck: { ...L.truck }, hubDailyCostVnd: { ...L.hubDailyCostVnd }, lastMile: { ...L.lastMile },
          recovery: { ...L.recovery }, holdColdMaxHours: L.holdColdMaxHours, mergeSuggestBelowFillPct: L.mergeSuggestBelowFillPct, routeEngineNote: ROUTE_ENGINE_NOTE
        };
      },

      /** Khu giao & sức chứa: mỗi khu, mỗi ngày giao sắp tới, mỗi khung (sức chứa hiệu lực, đã đặt, còn lại, cảnh báo vượt) và gợi ý gộp ngày. */
      capacityBoard(ctx, { weeks = 2 } = {}) {
        guard(ctx, 'dispatchOps');
        return server.read((db, now) => {
          const today = dayKey(now);
          const overrides = ensureLogistics(db).capacity;
          const zones = cfg.zones.map((z) => {
            const days = zoneCapacityDays(db.orders, z, today, overrides, z.deliveryDays.length * weeks);
            return { zoneId: z.id, name: z.name, districts: [...z.districts], province: z.province || null, deliveryDays: [...z.deliveryDays], days };
          });
          return { now: now.toISOString(), today, zones, suggestions: suggestDayMerges(zones, L.mergeSuggestBelowFillPct), belowPct: L.mergeSuggestBelowFillPct, overbookedTotal: zones.reduce((s, z) => s + z.days.reduce((a, d) => a + d.slots.reduce((b, x) => b + x.overbooked, 0), 0), 0) };
        });
      },

      /**
       * Đặt sức chứa (thùng) của một khung. `day` bỏ trống hoặc '*' = mọi ngày giao; `capacityBoxes: null` = bỏ ghi đè, về số trong cấu hình.
       * Hạ thấp hơn số đã đặt bị chặn (`CAPACITY_BELOW_USED`) trừ khi `allowBelowUsed`; đơn đã đặt vẫn giao, app khách chỉ ngừng nhận thêm.
       */
      setCapacity(ctx, input) {
        guard(ctx, 'dispatchOps');
        return server.write((db) => {
          const r = must(setCapacity(db, input));
          return { key: r.key, capacityBoxes: r.capacityBoxes, used: r.used || 0, overbooked: r.overbooked || 0, reset: Boolean(r.reset) };
        });
      },

      /** Chuyến chặng dài của một ngày giao: nhà xe, biển số, sức chứa, bảng kê thùng, nhiệt độ các mốc, niêm phong, chi phí, trạng thái. */
      trips(ctx, day = null) {
        guard(ctx, 'dispatchOps');
        return server.read((db, now) => {
          const days = dayList(db, now);
          const today = dayKey(now);
          const sel = day && days.includes(day) ? day : days.find((d) => d >= today) || days[days.length - 1] || null;
          return {
            now: now.toISOString(), days, day: sel, trips: sel ? tripsView(db, now, sel) : [],
            carriers: [{ id: L.truck.carrierSupplierId, name: 'Nhà xe lạnh Tây Nguyên – Sài Gòn' }],
            defaults: { capacityBoxes: L.truck.capacityBoxes, costVnd: L.truck.costPerTripVnd }
          };
        });
      },

      saveTrip(ctx, input) {
        guard(ctx, 'dispatchOps');
        return server.write((db, now) => must(saveTrip(db, input, cfg, now)).trip);
      },

      /** Ngoại lệ giao hàng: thùng thiếu / hỏng ở kho phụ, giao không thành công, hàng bị hủy. Không có thông tin khách. */
      exceptions(ctx) {
        guard(ctx, 'dispatchOps');
        return server.read((db, now) => {
          const Lg = ensureLogistics(db);
          const rows = Lg.exceptions.map((e) => exceptionRow(db, e, now));
          return {
            now: now.toISOString(),
            open: rows.filter((r) => r.status === 'open'),
            held: rows.filter((r) => r.status === 'held'),
            resolved: rows.filter((r) => r.status === 'resolved').slice(-20).reverse(),
            holdColdMaxHours: L.holdColdMaxHours, compensationPct: L.failedCompensationPct
          };
        });
      },

      /** Xử lý ngoại lệ: redeliver (giao lại khung sau), hold_cold (giữ lạnh ở kho phụ), compensate (bù Fresh Credit). */
      resolveException(ctx, input) {
        guard(ctx, 'dispatchOps');
        return server.write((db, now) => {
          const r = must(resolveException(db, { ...input, by: ctx.role, allowAmount: ctx.role === 'admin' }, now, cfg));
          const ex = r.exception;
          return { id: ex.id, status: ex.status, resolution: ex.resolution, compensationVnd: r.compensationVnd };
        });
      },

      /** Chuỗi lạnh: số đo ở 4 mốc, cảnh báo vượt ngưỡng và quyết định giữ / hủy của QC. */
      coldChain(ctx, { day = null } = {}) {
        guard(ctx, 'coldChain');
        return server.read((db, now) => {
          const Lg = ensureLogistics(db);
          const all = allReadings(db);
          const dayOf = (r) => (['factory_depart', 'hub_receive'].includes(r.point) ? String(r.ref).split('|')[0] : r.point === 'hub_dispatch' ? ((Lg.routes.find((x) => x.id === r.ref) || {}).day || dayKey(new Date(r.at))) : dayKey(new Date(r.at)));
          const days = [...new Set(all.map(dayOf))].sort();
          const sel = day && days.includes(day) ? day : days[days.length - 1] || null;
          const mine = all.filter((r) => dayOf(r) === sel);
          const rows = mine
            .map((r) => {
              const ev = evaluateTemp(r.cls, r.tempC, cfg);
              return { id: r.id, point: r.point, pointLabel: TEMP_POINTS[r.point], ref: r.ref, cls: r.cls, clsLabel: TEMP_CLASS_LABEL[r.cls], tempC: r.tempC, at: r.at, ok: ev.ok, status: ev.status, limit: ev.limit, orderId: r.orderId };
            })
            .sort((a, b) => TEMP_POINT_ORDER.indexOf(a.point) - TEMP_POINT_ORDER.indexOf(b.point) || a.at.localeCompare(b.at));
          const alerts = coldAlerts(mine, Lg.coldDecisions, cfg).map((a) => {
            const r = mine.find((x) => x.id === a.id);
            return { ...a, pointLabel: TEMP_POINTS[a.point], clsLabel: TEMP_CLASS_LABEL[a.cls], orders: readingOrders(db, r).length };
          });
          const openAlerts = alerts.filter((a) => !a.decision).length;
          const allAlerts = coldAlerts(all, Lg.coldDecisions, cfg);
          return {
            now: now.toISOString(), days, day: sel, points: TEMP_POINT_ORDER.map((p) => ({ point: p, label: TEMP_POINTS[p] })), temperature: cfg.temperature,
            readings: rows, alerts, openAlerts, openAlertsAll: allAlerts.filter((a) => !a.decision).length
          };
        });
      },

      /** QC quyết định giữ hoặc hủy hàng khi vượt ngưỡng. Hủy thì mỗi đơn bị ảnh hưởng thành một ngoại lệ chờ điều phối. */
      decideCold(ctx, { id, decision, note = '' }) {
        guard(ctx, 'coldChain');
        return server.write((db, now) => {
          const r = must(decideCold(db, { id, decision, note, by: ctx.role }, now));
          return { decision: r.decision, exceptions: r.exceptions };
        });
      },

      /** Chi phí logistics: chi phí mỗi thùng theo ngày (xe chặng dài + kho phụ + chặng cuối), chi tiết theo chuyến, theo tuyến / điểm giao. */
      costs(ctx, day = null) {
        guard(ctx, 'dispatchOps');
        return server.read((db, now) => {
          ensureLogistics(db);
          const days = dayList(db, now, { back: 14 });
          const today = dayKey(now);
          const sel = day && days.includes(day) ? day : days.find((d) => d >= today) || days[days.length - 1] || null;
          return {
            now: now.toISOString(), days, day: sel, detail: sel ? dayCost(db, sel, cfg) : null,
            published: db.logisticsCosts.map((c) => ({ day: c.day, boxes: c.boxes, totalVnd: c.totalVnd, perBoxVnd: c.perBoxVnd, status: c.status, updatedAt: c.updatedAt })),
            defaults: { truck: { ...L.truck }, hub: { ...L.hubDailyCostVnd }, lastMile: { ...L.lastMile } }
          };
        });
      },

      saveHubCost(ctx, input) {
        guard(ctx, 'dispatchOps');
        return server.write((db, now) => {
          must(saveHubCost(db, input, cfg, now));
          return refreshCosts(db, input.day, cfg, now);
        });
      },

      /** Bản ghi chi phí đã đẩy cho Tài chính (P2D đọc `db.logisticsCosts`). */
      publishedCosts(ctx) {
        guard(ctx, 'costRead');
        return server.read((db) => (db.logisticsCosts || []).map((c) => ({ ...c })));
      },

      kpis(ctx, range = {}) {
        guard(ctx, 'dispatchOps');
        return server.read((db, now) => ({ now: now.toISOString(), range: { from: range.from || null, to: range.to || null }, ...kpiOf(db, range, cfg) }));
      }
    },

    routes: {
      board(ctx, day = null) {
        guard(ctx, 'routePlan');
        return server.read((db, now) => routesBoard(db, now, day, ctx.role));
      },

      /** Lập tuyến (bản mock) cho một khung giờ: gom theo khu → phường, không vượt sức chở shipper. */
      plan(ctx, { day, slotId, shipperIds = null }) {
        guard(ctx, 'routePlan');
        return server.write((db, now) => {
          const r = must(planRoutesFor(db, { day, slotId, shipperIds }, now, cfg));
          return { routes: r.routes.map((x) => ({ id: x.id, shipperId: x.shipperId, boxes: x.boxes, capacityBoxes: x.capacityBoxes, estMinutes: x.estMinutes, fitsWindow: x.fitsWindow })), unassigned: r.unassigned, totalBoxes: r.totalBoxes, engine: r.engine };
        });
      },

      moveStop(ctx, input) {
        guard(ctx, 'routePlan');
        return server.write((db, now) => must(moveStop(db, input, now, cfg)));
      }
    },

    // Phần kho phụ (P2C). Gộp vào `api.ops.hub` cùng các hàm của P2B.
    hub: {
      /** Nhận xe: các chuyến đã xuất bến và bảng kê thùng, tiến độ tích nhận (thiếu / thừa / hỏng). */
      arrivals(ctx, day = null) {
        guard(ctx, 'hubFlowRead');
        return server.read((db, now) => {
          const Lg = ensureLogistics(db);
          const departedDays = [...new Set(Object.entries(db.factory.loads).filter(([, l]) => l.departedAt).map(([s]) => s.split('|')[0]))].sort();
          const pending = departedDays.find((d) => cfg.factory.trips.some((t) => { const sc = scopeKey(d, t.id); return db.factory.loads[sc] && db.factory.loads[sc].departedAt && !(Lg.arrivals[sc] && Lg.arrivals[sc].closedAt); }));
          const sel = day && departedDays.includes(day) ? day : pending || departedDays[departedDays.length - 1] || null;
          const trips = sel ? cfg.factory.trips.filter((t) => db.factory.loads[scopeKey(sel, t.id)] && db.factory.loads[scopeKey(sel, t.id)].departedAt).map((t) => {
            const scope = scopeKey(sel, t.id);
            const load = db.factory.loads[scope];
            const arr = Lg.arrivals[scope] || null;
            const rec = Lg.trips[scope] || null;
            const manifest = manifestOf(db, scope).map((orderId) => {
              const o = db.orders.find((x) => x.id === orderId);
              return { orderId, zoneId: o ? o.zoneId : null, zoneName: o ? zoneName(o.zoneId) : '', slotId: o ? o.slotId : null, slotLabel: o ? slotLabelOf(o.slotId) : '', state: arr ? arr.boxes[orderId] || null : null, seafood: o ? seafoodItems(o, cfg).length > 0 : false };
            });
            return {
              scope, tripId: t.id, label: t.label, departedAt: load.departedAt, tempC: load.tempC, sealNo: load.sealNo, tempOk: evaluateTemp('chill', load.tempC, cfg).ok,
              expectedMissing: [...(load.missing || [])], carrier: rec ? { carrier: rec.carrier, plate: rec.plate } : null, manifest,
              extra: arr ? [...arr.extra] : [], closed: Boolean(arr && arr.closedAt),
              result: arr && arr.closedAt ? { closedAt: arr.closedAt, tempC: arr.tempC, frozenTempC: arr.frozenTempC, missing: arr.missing, photo: Boolean(arr.photo), note: arr.note } : null
            };
          }) : [];
          return { now: now.toISOString(), days: departedDays, day: sel, trips, temperature: cfg.temperature };
        });
      },

      scanArrival(ctx, input) {
        guard(ctx, 'hubFlow');
        return server.write((db, now) => {
          const r = must(scanArrival(db, input, now));
          return { result: r.result, code: r.code };
        });
      },

      closeArrival(ctx, input) {
        guard(ctx, 'hubFlow');
        return server.write((db, now) => {
          const r = must(closeArrival(db, { ...input, by: ctx.role }, now, cfg));
          return { missing: r.missing, damaged: r.damaged, extra: r.extra, exceptions: r.exceptions, tempBad: r.tempBad };
        });
      },

      /** Ghép hải sản: các đơn có hải sản của ngày giao, thùng đã về kho phụ chưa, đã tích bao nhiêu túi. */
      seafood(ctx, day = null) {
        guard(ctx, 'hubFlowRead');
        return server.read((db, now) => {
          const Lg = ensureLogistics(db);
          const days = dayList(db, now, { closedOnly: true });
          const today = dayKey(now);
          const hasSeafood = (d) => planOrders(db, d).some((o) => seafoodItems(o, cfg).length);
          const sel = day && days.includes(day) ? day : days.find((d) => d >= today && hasSeafood(d)) || days.find((d) => d >= today) || days[days.length - 1] || null;
          const orders = (sel ? planOrders(db, sel) : [])
            .filter((o) => seafoodItems(o, cfg).length)
            .map((o) => {
              const rec = Lg.seafood[o.id] || { ticks: {}, packedAt: null, lots: [], shortKg: 0 };
              const items = seafoodItems(o, cfg).map((i) => ({ key: i.key, name: i.name, temp: i.temp, bags: i.bags, bagGrams: i.bagGrams, kg: Math.round(i.grams) / 1000, done: rec.ticks[i.key] || 0 }));
              const arrival = arrivalStateOf(db, o, cfg);
              return {
                orderId: o.id, zoneId: o.zoneId, zoneName: zoneName(o.zoneId), slotId: o.slotId, slotLabel: slotLabelOf(o.slotId), arrival,
                atHub: boxAtHub(db, o, cfg), items, packed: Boolean(rec.packedAt), packedAt: rec.packedAt, lots: rec.lots, shortKg: rec.shortKg,
                complete: items.every((i) => i.done >= i.bags)
              };
            })
            .sort((a, b) => a.slotLabel.localeCompare(b.slotLabel) || a.orderId.localeCompare(b.orderId));
          return { now: now.toISOString(), days, day: sel, orders, packed: orders.filter((o) => o.packed).length };
        });
      },

      tickSeafood(ctx, input) {
        guard(ctx, 'hubFlow');
        return server.write((db, now) => must(tickSeafood(db, input, now, cfg)).ticks);
      },

      closeSeafood(ctx, input) {
        guard(ctx, 'hubFlow');
        return server.write((db, now) => {
          const r = must(closeSeafood(db, { ...input, by: ctx.role }, now, cfg));
          return { lots: r.lots || [], shortKg: r.shortKg || 0 };
        });
      },

      /** Chia thùng vào tuyến và cất kho lạnh (ghi vị trí kệ). */
      sortBox(ctx, input) {
        guard(ctx, 'hubFlow');
        return server.write((db, now) => must(sortBox(db, input, now)).sorted);
      },

      /** Xuất kho theo khung giờ: ghi nhiệt độ, tuyến sang đang giao, đơn sang `shipped` (khách thấy đang giao). */
      dispatchRoute(ctx, input) {
        guard(ctx, 'hubFlow');
        return server.write((db, now) => {
          const r = must(dispatchRoute(db, { ...input, by: ctx.role }, now, cfg));
          return { routeId: r.route.id, status: r.route.status, breaches: r.breaches };
        });
      },

      /** Phiếu tuyến để in: người nhận (tên, địa chỉ, SĐT) và số túi mỗi thùng. Chỉ kho phụ và admin. */
      routeSheet(ctx, routeId) {
        guard(ctx, 'hubFlow');
        return server.read((db, now) => {
          const Lg = ensureLogistics(db);
          const r = Lg.routes.find((x) => x.id === routeId);
          if (!r) throw toError({ code: 'ROUTE_NOT_FOUND', message: 'Không tìm thấy tuyến' });
          const slot = slotOf(r.slotId);
          return {
            id: r.id, day: r.day, slotLabel: slot ? slot.label : r.slotId, shipperName: shipperName(r.shipperId), boxes: r.boxes, estMinutes: r.estMinutes, mock: r.mock, engine: ROUTE_ENGINE_NOTE,
            printedAt: now.toISOString(),
            stops: r.stops.map((s) => {
              const o = db.orders.find((x) => x.id === s.orderId);
              const list = o ? orderPackList(o, cfg) : null;
              return {
                seq: s.seq, orderId: s.orderId, ward: s.ward, district: s.district, location: (r.sorted[s.orderId] || {}).location || '',
                recipient: o ? recipientFor(o, ctx.role) : null, bagsByTemp: list ? list.bagsByTemp : null, seafood: o ? seafoodItems(o, cfg).length > 0 : false
              };
            })
          };
        });
      }
    },

    shipper: {
      /**
       * Việc của một shipper trong ngày: tuyến đã xuất kho và các điểm giao theo thứ tự. Shipper chỉ thấy tuyến của mình; điều phối / admin xem
       * thử một shipper qua `asShipperId`. SĐT luôn che một phần; không có tiền, mã khách.
       */
      board(ctx, { asShipperId = null, day = null } = {}) {
        guard(ctx, 'shipperApp');
        const id = ctx.role === 'shipper' ? ctx.shipperId : asShipperId;
        const list = L.shippers.map((s) => ({ id: s.id, name: s.name }));
        if (ctx.role === 'shipper' && !shipperById(id, cfg)) throw new ForbiddenError();
        if (!id) return { shippers: list, shipper: null, routes: [] };
        const me = shipperById(id, cfg);
        if (!me) throw toError({ code: 'SHIPPER_NOT_FOUND', message: 'Không tìm thấy shipper' });
        return server.read((db, now) => {
          const Lg = ensureLogistics(db);
          const mine = Lg.routes.filter((r) => r.shipperId === id && ['dispatched', 'done'].includes(r.status));
          const days = [...new Set(mine.map((r) => r.day))].sort();
          const today = dayKey(now);
          const sel = day && days.includes(day) ? day : days.includes(today) ? today : days.filter((d) => d >= today)[0] || days[days.length - 1] || null;
          const routes = mine.filter((r) => r.day === sel).map((r) => {
            const slot = slotOf(r.slotId);
            const w = slotWindow(r.day, slot);
            const stops = r.stops.map((s) => {
              const o = db.orders.find((x) => x.id === s.orderId);
              const rec = Lg.deliveries[s.orderId] || { status: 'pending', calls: 0, attempts: [] };
              const mineAttempt = rec.attempts.filter((a) => a.routeId === r.id).pop();
              const status = rec.routeId === r.id ? rec.status : mineAttempt ? (mineAttempt.outcome === 'delivered' ? 'delivered' : 'failed') : 'moved';
              const cust = db.customers.find((c) => c.id === o.customerId);
              const exp = recoveryExpected((cust && Lg.assets[cust.id]) || null, cfg);
              return {
                seq: s.seq, orderId: o.id, status, name: o.recipient.name, address: o.recipient.address, phoneMasked: maskPhone(o.recipient.phone), mapsUrl: mapsSearchUrl(o.recipient.address),
                ward: s.ward, calls: rec.calls || 0,
                failReason: status === 'failed' && mineAttempt ? mineAttempt.reason : null,
                recoverExpected: exp.foam || exp.gel ? exp : null,
                recovered: rec.recovered && rec.routeId === r.id ? { foam: rec.recovered.foam, gel: rec.recovered.gel } : null,
                photoDone: o.status === 'delivered'
              };
            });
            return {
              id: r.id, slotId: r.slotId, slotLabel: slot.label, startAt: w.start.toISOString(), endAt: w.end.toISOString(), status: r.status, boxes: r.boxes, estMinutes: r.estMinutes, stops,
              done: stops.filter((x) => x.status === 'delivered').length, failed: stops.filter((x) => x.status === 'failed').length
            };
          }).sort((a, b) => a.startAt.localeCompare(b.startAt));
          return {
            now: now.toISOString(), shippers: ctx.role === 'shipper' ? [] : list, shipper: { id: me.id, name: me.name, capacityBoxes: me.capacityBoxes }, days, day: sel, routes,
            failReasons: { ...L.failReasons }, recoveryEnabled: L.recovery.enabled, deliveryTempRequired: L.deliveryTempRequired, unreachableMinCalls: L.unreachableMinCalls
          };
        });
      },

      /** Gọi khách qua tổng đài ẩn số (mock): ghi một lượt gọi, SĐT thật không trả về app. */
      callCustomer(ctx, { orderId, asShipperId = null }) {
        guard(ctx, 'shipperWrite');
        const id = ctx.role === 'shipper' ? ctx.shipperId : asShipperId;
        return server.write((db, now) => {
          const r = must(callCustomer(db, { orderId, shipperId: id }, now));
          return { calls: r.calls, via: 'masked-proxy', mock: true };
        });
      },

      /** Đã giao: ảnh bắt buộc, nhiệt độ lúc giao (tùy chọn), số thùng xốp / túi gel thu về. Đơn sang `delivered` và khách nhận thông báo kèm ảnh. */
      deliver(ctx, { orderId, photo, tempC = null, recovered = null, asShipperId = null }) {
        guard(ctx, 'shipperWrite');
        const id = ctx.role === 'shipper' ? ctx.shipperId : asShipperId;
        return server.write((db, now) => must(deliverStop(db, { orderId, shipperId: id, photo, tempC, recovered }, now, cfg)));
      },

      /** Không giao được: reason = unreachable | wrong_address | customer_reschedule. Mở ngoại lệ cho điều phối và báo khách. */
      fail(ctx, { orderId, reason, note = '', asShipperId = null }) {
        guard(ctx, 'shipperWrite');
        const id = ctx.role === 'shipper' ? ctx.shipperId : asShipperId;
        return server.write((db, now) => must(failStop(db, { orderId, shipperId: id, reason, note }, now, cfg)));
      }
    }
  };
}
