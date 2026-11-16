import { DISHES, SKUS } from '../data/catalog';
import { addDays, dayKey } from '../utils/time';
import { cutoffAtFor } from '../domain/delivery';
import { applyOrderStatus, upsertLot } from '../domain/opsEvents';
import {
  applyFactoryOp, buildDemandDays, buildProductionSheet, emptyFactory, factoryCatalog, itemInfo, scopeKey, shortageImpact,
  sortedItems, sumDays, tripDepartAt, tripForSlot, weekRanges
} from '../domain/factory';

const r1 = (n) => Math.round(n * 10) / 10;
const toError = (res) => {
  const e = new Error(res.message || res.code);
  e.code = res.code;
  if (res.missing) e.missing = res.missing;
  return e;
};

const lotKindOf = (sku) => (sku.startsWith('NL-BO') ? 'beef' : sku.startsWith('NL-GAO') ? 'rice' : null);

/**
 * API phía vận hành cho kế hoạch và xưởng (P2A). Không hàm nào trả tên, SĐT, địa chỉ hay mã khách:
 * dữ liệu đơn chỉ gồm mã đơn, khu, khung giờ và số túi cần nhặt.
 * Mọi thao tác ghi đi qua `factory.apply` (một cửa) để hàng đợi offline gửi lại an toàn nhờ opId.
 */
export function createOpsFactoryApi(server, cfg, guard) {
  const trips = cfg.factory.trips;

  const tripsSummary = (demandDay, f) =>
    trips.map((t) => {
      const lists = demandDay.lists.filter((l) => l.tripId === t.id);
      const load = f.loads[scopeKey(demandDay.day, t.id)] || null;
      const packed = lists.filter((l) => f.boxes[l.orderId] && f.boxes[l.orderId].packedAt).length;
      return {
        id: t.id,
        label: t.label,
        departAt: tripDepartAt(demandDay.day, t).toISOString(),
        boxes: lists.length,
        packed,
        loaded: load ? Object.keys(load.loaded).filter((id) => lists.some((l) => l.orderId === id)).length : 0,
        departedAt: load ? load.departedAt : null
      };
    });

  return {
    /** Số liệu cho màn Kế hoạch & chốt sổ: ngày giao, nhu cầu đã chốt / dự kiến, phiếu sản xuất, năng lực xưởng báo. */
    planning: {
      overview(ctx, day = null) {
        guard(ctx, 'planning');
        return server.read((db, now) => {
          const f = db.factory || emptyFactory();
          const today = dayKey(now);
          const demand = buildDemandDays(db, cfg);
          const days = demand.map((d) => {
            const orders = db.orders.filter((o) => o.deliveryDay === d.day);
            const risk = orders.filter((o) => o.status === 'charge_failed').length;
            return {
              day: d.day,
              closed: d.closed,
              closedAt: d.plan ? d.plan.closedAt : null,
              cutoffAt: d.cutoffAt,
              boxes: d.totals.boxes,
              skippedUnpaid: d.plan ? d.plan.skippedOrderIds.length : 0,
              atRisk: d.closed ? 0 : risk
            };
          });
          const sel = day && days.some((d) => d.day === day) ? day : (days.find((d) => d.day >= today) || days[days.length - 1] || {}).day || null;
          const cur = demand.find((d) => d.day === sel) || null;

          let detail = null;
          let sheet = null;
          if (cur) {
            const orders = db.orders.filter((o) => o.deliveryDay === cur.day);
            const count = (st) => orders.filter((o) => o.status === st).length;
            const items = sortedItems(cur.totals.items).map((t) => {
              const info = itemInfo(t.key);
              return { key: t.key, type: t.type, name: t.name, temp: t.temp, bagGrams: t.bagGrams, bags: t.bags, kg: r1((cur.bom.skuGrams[t.key] != null ? cur.bom.skuGrams[t.key] : t.grams) / 1000), prep: info.prep };
            });
            detail = {
              day: cur.day,
              closed: cur.closed,
              source: cur.closed ? 'closed' : 'forecast',
              closedAt: cur.plan ? cur.plan.closedAt : null,
              cutoffAt: cur.cutoffAt,
              boxes: cur.totals.boxes,
              counts: {
                locked: orders.filter((o) => ['locked', 'in_production', 'shipped', 'delivered'].includes(o.status)).length,
                skippedUnpaid: count('skipped_unpaid'),
                chargeFailed: count('charge_failed'),
                awaitingCharge: count('scheduled'),
                paid: count('paid')
              },
              items,
              hub: sortedItems(cur.totals.hub).map((t) => ({ key: t.key, name: t.name, kg: r1(t.grams / 1000) }))
            };
            const bagsBySku = {};
            for (const t of Object.values(cur.totals.items)) if (t.type === 'sku') bagsBySku[t.key] = t.bags;
            sheet = buildProductionSheet({
              day: cur.day,
              bom: cur.bom,
              bagsBySku,
              boxes: cur.totals.boxes,
              closedAt: cur.plan ? cur.plan.closedAt : null,
              status: cur.closed ? 'closed' : 'preview',
              skipped: cur.plan ? cur.plan.skippedOrderIds.length : 0
            });
          }

          const ranges = weekRanges(today, 4);
          const sums = ranges.map((r) => ({ ...r, ...sumDays(demand, r.start, r.end) }));
          const keys = new Set();
          for (const s of sums) for (const k of Object.keys(s.skuGrams)) keys.add(k);
          const weekRows = [...keys].sort().map((key) => {
            const info = itemInfo(key);
            return {
              key,
              name: info.name,
              temp: info.temp,
              hub: info.hub,
              kg: sums.map((s) => r1((s.skuGrams[key] || 0) / 1000)),
              closedKg: sums.map((s) => r1((s.closedGrams[key] || 0) / 1000))
            };
          });
          const sauceKeys = new Set();
          for (const s of sums) for (const k of Object.keys(s.sauces)) sauceKeys.add(k);
          const weekSauces = [...sauceKeys].sort().map((key) => ({ key, name: itemInfo(key).name, bags: sums.map((s) => s.sauces[key] || 0) }));
          const capacity = {};
          for (const r of ranges) capacity[r.start] = f.capacity[r.start] || {};

          return {
            now: now.toISOString(),
            today,
            days,
            day: sel,
            detail,
            sheet,
            weeks: sums.map((s) => ({ start: s.start, end: s.end, boxes: s.boxes, closedBoxes: s.closedBoxes })),
            weekRows,
            weekSauces,
            capacity,
            skippedTotal: days.reduce((a, d) => a + d.skippedUnpaid, 0)
          };
        });
      }
    },

    factory: {
      /** Danh mục xưởng đếm (tên, nhóm nhiệt, cỡ túi, hạn dùng), nguồn nguyên liệu, chuyến xe, màu sticker. Tĩnh. */
      catalog(ctx) {
        guard(ctx, 'factoryRead');
        return factoryCatalog(cfg);
      },

      /**
       * Ảnh chụp dữ liệu của xưởng cho một ngày giao đã chốt: phiếu nhặt từng đơn (không có thông tin khách)
       * và toàn bộ lát cắt db.factory (tiến độ, lô nhận, mẻ túi, thùng, xe, báo thiếu).
       */
      snapshot(ctx, day = null) {
        guard(ctx, 'factory');
        return server.read((db, now) => {
          const f = db.factory || emptyFactory();
          const closed = buildDemandDays(db, cfg, { closedOnly: true });
          const days = closed.map((d) => ({ day: d.day, closedAt: d.plan.closedAt, boxes: d.totals.boxes, trips: tripsSummary(d, f) }));
          const pending = days.find((d) => d.day >= dayKey(now) && d.trips.some((t) => t.boxes > 0 && !t.departedAt));
          const sel = day && days.some((d) => d.day === day) ? day : (pending || days[days.length - 1] || {}).day || null;
          const cur = closed.find((d) => d.day === sel) || null;
          return {
            now: now.toISOString(),
            day: sel,
            days,
            plan: cur ? { id: cur.plan.id, day: cur.day, closedAt: cur.plan.closedAt, skippedUnpaid: cur.plan.skippedOrderIds.length } : null,
            orders: cur ? cur.lists : [],
            trips: cur ? tripsSummary(cur, f) : [],
            lotCodes: [...new Set([...(db.lots || []).map((l) => l.qr_code), ...f.receipts.map((r) => r.lotCode)])],
            factory: f
          };
        });
      },

      /** Nhu cầu dự kiến theo mặt hàng cho 7 ngày tới và cho tuần sau (kèm năng lực xưởng đã xác nhận). */
      forecast(ctx) {
        guard(ctx, 'factoryRead');
        return server.read((db, now) => {
          const f = db.factory || emptyFactory();
          const today = dayKey(now);
          const demand = buildDemandDays(db, cfg);
          const byDay = new Map(demand.map((d) => [d.day, d]));
          const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
          const nextWeek = weekRanges(today, 2)[1];
          const nextDays = Array.from({ length: 7 }, (_, i) => addDays(nextWeek.start, i));
          const rows = {};
          const row = (t) =>
            (rows[t.key] ||= { key: t.key, type: t.type, name: t.name, temp: t.temp, bagGrams: t.bagGrams, perDay: {}, nextWeekBags: 0 });
          for (const d of demand) {
            const inWeek = days.includes(d.day);
            const inNext = nextDays.includes(d.day);
            if (!inWeek && !inNext) continue;
            for (const t of Object.values(d.totals.items)) {
              const r = row(t);
              if (inWeek) r.perDay[d.day] = (r.perDay[d.day] || 0) + t.bags;
              if (inNext) r.nextWeekBags += t.bags;
            }
          }
          return {
            now: now.toISOString(),
            today,
            days: days.map((day) => {
              const d = byDay.get(day);
              return { day, closed: d ? d.closed : false, boxes: d ? d.totals.boxes : 0, cutoffAt: d ? d.cutoffAt : cutoffAtFor(day, cfg).toISOString() };
            }),
            nextWeek,
            nextWeekBoxes: nextDays.reduce((s, k) => s + (byDay.get(k) ? byDay.get(k).totals.boxes : 0), 0),
            rows: sortedItems(rows),
            capacity: f.capacity[nextWeek.start] || {}
          };
        });
      },

      /**
       * Ghi một thao tác của xưởng (một cửa, khử trùng theo opId). op.type:
       * progress | receipt | batch | printed | tick | closeBox | reopenBox | load | depart | capacity | shortage | closeShortage.
       * Ném Error có `code` nếu không hợp lệ (máy xưởng giữ mục đó là "lỗi" trong hàng đợi để quản đốc xem).
       */
      apply(ctx, op) {
        guard(ctx, 'factory');
        return server.write((db, now) => {
          db.factory = db.factory || emptyFactory();
          const f = db.factory;
          const nowIso = now.toISOString();
          const full = { ...op, at: op.at || nowIso };
          const orderOf = (id) => db.orders.find((o) => o.id === id) || null;
          const planOrderIds = (day) => {
            const p = db.productionPlans.find((x) => x.day === day);
            return p ? p.orderIds : [];
          };
          const notFound = () => toError({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn trong kế hoạch đã chốt' });

          if (full.type === 'receipt' && (db.lots || []).some((l) => l.qr_code === full.lotCode)) throw toError({ code: 'LOT_CODE_TAKEN', message: 'Mã lô này đã có' });
          if (['tick', 'closeBox', 'reopenBox', 'load'].includes(full.type)) {
            const o = orderOf(full.orderId);
            if (!o || !planOrderIds(o.deliveryDay).includes(o.id)) throw notFound();
            if (full.type === 'load' && full.scope !== scopeKey(o.deliveryDay, tripForSlot(o.slotId, cfg).id)) throw toError({ code: 'WRONG_TRIP', message: 'Thùng này không đi chuyến xe này' });
          }
          if (full.type === 'shortage' && !db.productionPlans.some((p) => p.day === full.day)) throw toError({ code: 'PLAN_NOT_FOUND', message: 'Ngày giao này chưa chốt sổ' });
          if (full.type === 'depart') {
            const [day, tripId] = String(full.scope).split('|');
            full.expected = planOrderIds(day)
              .map(orderOf)
              .filter((o) => o && !['cancelled', 'postponed', 'skipped_unpaid'].includes(o.status) && tripForSlot(o.slotId, cfg).id === tripId)
              .map((o) => o.id);
          }

          const startedBefore = Boolean(f.boxes[full.orderId] && f.boxes[full.orderId].startedAt);
          const res = applyFactoryOp(f, full, cfg);
          if (!res.ok) throw toError(res);
          if (res.duplicate) return { ok: true, duplicate: true };

          // Việc kéo theo ở dữ liệu dùng chung
          if (full.type === 'receipt' && full.verdict === 'pass') {
            const r = f.receipts.find((x) => x.lotCode === full.lotCode);
            const sku = SKUS[r.sku];
            const lot = {
              qr_code: r.lotCode,
              kind: lotKindOf(r.sku),
              sku: r.sku,
              product_name: sku.name,
              sample: false,
              farm_info: { farm_name: r.sourceName, location: r.location, region: r.region, coordinates: null },
              trust_score: null,
              verifications: { mova_inspector: { verified: false, inspector_name: null, antibiotic_test: null }, peer_validations_count: 0, last_peer_check: null },
              harvest_or_slaughter_timestamp: null,
              processed_timestamp: r.at,
              slaughter_and_packing_timestamp: r.at,
              temperature_log: `Nhận tại xưởng Đắk Lắk lúc ${r.tempC}°C`,
              temperature_readings: [{ point: 'Nhận nguyên liệu tại xưởng Đắk Lắk', at: r.at, celsius: r.tempC }],
              source_kind: r.sourceKind,
              weight_kg: r.weightKg,
              received_at: r.at
            };
            const lr = upsertLot(db, lot);
            if (!lr.ok) throw toError(lr);
          }
          if (full.type === 'tick' && !startedBefore) {
            // Túi đầu tiên vào thùng: báo khách "đang sản xuất" (đơn chỉ đi tới, lỗi trạng thái bị bỏ qua)
            const o = orderOf(full.orderId);
            if (o && o.status === 'locked') applyOrderStatus(db, { orderId: o.id, status: 'in_production' }, now);
          }
          return { ok: true, duplicate: false };
        });
      },

      /** Đơn bị ảnh hưởng và món thay đề xuất của một báo cáo thiếu / hỏng (không có thông tin khách). */
      impact(ctx, shortageId) {
        guard(ctx, 'factory');
        return server.read((db) => {
          const s = (db.factory ? db.factory.shortages : []).find((x) => x.id === shortageId);
          if (!s) {
            const e = new Error('Báo cáo chưa được gửi lên hệ thống');
            e.code = 'SHORTAGE_NOT_FOUND';
            throw e;
          }
          const out = shortageImpact(db, s, cfg);
          return {
            ...out,
            handled: s.handled.map((h) => ({ ...h, fromDishName: DISHES[h.fromDishId] ? DISHES[h.fromDishId].name : h.fromDishId, toDishName: DISHES[h.toDishId] ? DISHES[h.toDishId].name : h.toDishId }))
          };
        });
      },
    }
  };
}
