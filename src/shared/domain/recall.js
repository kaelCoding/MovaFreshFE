import { BUSINESS } from '../config/business';
import { DISHES, SKUS } from '../data/catalog';
import { buildDemandDays, emptyFactory, orderPackList, scopeKey } from './factory';
import { dishFactor } from './mealPlan';

/**
 * Truy xuất ngược và thu hồi lô (P2B). Đi theo chuỗi:
 *   mã QR / mã lô → nguồn (HTX, nông hộ, lò mổ) → mẻ sơ chế → túi → thùng (một đơn một thùng) → đơn → khách.
 *
 * Xưởng ghi mẻ túi gán lô theo (ngày giao, chuyến) và mặt hàng, và ghi số túi đã tích vào thùng của từng đơn, nhưng KHÔNG ghi
 * túi nào của mẻ nào vào thùng nào. Vì vậy `allocateBatches` chia túi của các mẻ cho các đơn của cùng chuyến theo thứ tự cố định
 * (mẻ làm trước vào các đơn có mã nhỏ trước). Đây là quy ước truy xuất của bản mock; bản thật quét mã túi lúc bỏ vào thùng
 * sẽ ghi chính xác túi nào vào thùng nào và chỉ cần thay hàm này.
 * Mọi hàm ở đây chỉ đọc `db`, không ghi.
 */

/** Tên nhóm theo trạng thái đơn khi thu hồi. */
export const RECALL_GROUP_LABEL = { not_shipped: 'Chưa xuất kho', in_transit: 'Đang giao', delivered: 'Đã giao' };

export function recallGroupOf(status, cfg = BUSINESS) {
  for (const [group, statuses] of Object.entries(cfg.recall.groups)) if (statuses.includes(status)) return group;
  return null;
}

/**
 * Chia túi của các mẻ cho các đơn. batches: mẻ có `scope` ('day|tripId'), `key`, `bags`, `lotCode`, `producedAt`, `id`.
 * lists: phiếu nhặt từng đơn (`orderPackList`). Trả { [orderId]: [{ batchId, lotCode, key, bags }] }.
 * Mẻ không có `scope` không chia được nên bỏ qua (xưởng luôn ghi scope khi đóng gói).
 */
export function allocateBatches({ batches, lists }) {
  const out = {};
  const byScope = {};
  for (const l of lists) (byScope[scopeKey(l.deliveryDay, l.tripId)] ||= []).push(l);
  const keys = new Set();
  for (const b of batches) if (b.scope && b.type !== 'sauce') keys.add(`${b.scope}\u0000${b.key}`);

  for (const sk of keys) {
    const [scope, key] = sk.split('\u0000');
    const supply = batches
      .filter((b) => b.scope === scope && b.key === key && b.type !== 'sauce')
      .sort((a, b) => Date.parse(a.producedAt) - Date.parse(b.producedAt) || String(a.id).localeCompare(String(b.id)))
      .map((b) => ({ ...b, left: b.bags }));
    const orders = (byScope[scope] || []).slice().sort((a, b) => a.orderId.localeCompare(b.orderId));
    let bi = 0;
    for (const o of orders) {
      const item = o.items.find((it) => it.key === key && !it.hub);
      if (!item) continue;
      let need = item.bags;
      while (need > 0 && bi < supply.length) {
        const b = supply[bi];
        const take = Math.min(need, b.left);
        if (take > 0) {
          (out[o.orderId] ||= []).push({ batchId: b.id, lotCode: b.lotCode, key, bags: take });
          b.left -= take;
          need -= take;
        }
        if (b.left <= 0) bi += 1;
      }
    }
  }
  return out;
}

/** Từ ô nhập (mã lô, mã mẻ hoặc đường dẫn QR trang /q/:code) tìm ra mã lô. Trả { lotCode, via } hoặc null. */
export function resolveLotCode(db, input) {
  let t = String(input || '').trim();
  if (!t) return null;
  const m = t.match(/\/q\/([^/?#\s]+)/);
  if (m) t = decodeURIComponent(m[1]);
  t = t.toUpperCase();
  const f = db.factory || emptyFactory();
  const lotCodes = new Set([...(db.lots || []).map((l) => l.qr_code), ...f.receipts.map((r) => r.lotCode), ...(db.procurement ? db.procurement.stock.map((s) => s.lotCode) : [])]);
  for (const c of lotCodes) if (c && c.toUpperCase() === t) return { lotCode: c, via: m ? 'url' : 'lot' };
  const b = f.batches.find((x) => x.id.toUpperCase() === t);
  if (b && b.lotCode) return { lotCode: b.lotCode, via: 'batch' };
  return null;
}

/** Phiếu nhặt của mọi đơn đã chốt sổ (đơn còn hiệu lực). */
export function closedLists(db, cfg = BUSINESS) {
  return buildDemandDays(db, cfg, { closedOnly: true }).flatMap((d) => d.lists);
}

/** Một dòng "đơn chứa lô": thông tin đơn, nhóm trạng thái, số túi của lô, tình trạng thùng. `l` là phiếu nhặt của đơn. */
function orderRow(db, l, order, parts, cfg) {
  const f = db.factory || emptyFactory();
  const box = f.boxes[l.orderId] || null;
  const load = f.loads[scopeKey(l.deliveryDay, l.tripId)] || null;
  return {
    orderId: l.orderId,
    customerId: order.customerId,
    zoneId: l.zoneId,
    slotId: l.slotId,
    tripId: l.tripId,
    deliveryDay: l.deliveryDay,
    deliveryAt: l.deliveryAt,
    status: order.status,
    group: recallGroupOf(order.status, cfg),
    bags: parts.reduce((s, p) => s + p.bags, 0),
    batchIds: [...new Set(parts.map((p) => p.batchId))],
    box: { packedAt: box ? box.packedAt : null, loadedAt: load && load.loaded ? load.loaded[l.orderId] || null : null, departedAt: load ? load.departedAt : null },
    held: Boolean(order.recallHold)
  };
}

/** Dựng lại dòng của một đơn đã ghi trong danh sách chốt của đợt thu hồi (đơn đã đổi món nên không còn nằm trong phép chia túi). */
export function frozenOrderRow(db, entry, cfg = BUSINESS) {
  const order = db.orders.find((o) => o.id === entry.orderId);
  if (!order) return null;
  return { ...orderRow(db, orderPackList(order, cfg), order, [{ bags: entry.bags, batchId: null }], cfg), batchIds: entry.batchIds || [] };
}

/**
 * Chuỗi truy xuất của một lô. Trả null nếu không có lô nào mang mã này.
 * `orders` là các đơn có túi của lô (thùng của đơn chứa lô), kèm nhóm trạng thái và tình trạng thùng.
 */
export function traceLot(db, lotCode, cfg = BUSINESS) {
  const f = db.factory || emptyFactory();
  const lot = (db.lots || []).find((l) => l.qr_code === lotCode) || null;
  const receipt = f.receipts.find((r) => r.lotCode === lotCode) || null;
  const batches = f.batches.filter((b) => b.lotCode === lotCode);
  const stock = db.procurement ? db.procurement.stock.filter((s) => s.lotCode === lotCode) : [];
  if (!lot && !receipt && !batches.length && !stock.length) return null;

  const skuId = (lot && lot.sku) || (receipt && receipt.sku) || (batches[0] && batches[0].key) || (stock[0] && stock[0].sku);
  const lists = closedLists(db, cfg);
  const alloc = allocateBatches({ batches: f.batches, lists });
  const byOrder = new Map(db.orders.map((o) => [o.id, o]));

  const orders = [];
  for (const l of lists) {
    const parts = (alloc[l.orderId] || []).filter((a) => a.lotCode === lotCode);
    if (parts.length) orders.push(orderRow(db, l, byOrder.get(l.orderId), parts, cfg));
  }
  orders.sort((a, b) => a.deliveryDay.localeCompare(b.deliveryDay) || a.orderId.localeCompare(b.orderId));

  const bagsMade = batches.reduce((s, b) => s + b.bags, 0);
  const bagGrams = batches[0] ? batches[0].bagGrams : 0;
  return {
    lotCode,
    sku: skuId,
    skuName: SKUS[skuId] ? SKUS[skuId].name : skuId,
    lot,
    receipt,
    source: lot
      ? {
          name: lot.farm_info.farm_name,
          location: lot.farm_info.location,
          region: lot.farm_info.region || lot.farm_info.location,
          kind: lot.source_kind || null,
          harvestAt: lot.harvest_or_slaughter_timestamp || null,
          processedAt: lot.processed_timestamp || lot.slaughter_and_packing_timestamp || null,
          peerValidations: (lot.verifications && lot.verifications.peer_validations_count) || 0,
          lastPeerCheck: (lot.verifications && lot.verifications.last_peer_check) || null,
          inspectorVerified: Boolean(lot.verifications && lot.verifications.mova_inspector && lot.verifications.mova_inspector.verified),
          trustScore: lot.trust_score,
          sample: Boolean(lot.sample)
        }
      : null,
    batches: batches.map((b) => ({ id: b.id, key: b.key, bags: b.bags, bagGrams: b.bagGrams, producedAt: b.producedAt, expiresAt: b.expiresAt, scope: b.scope, labelsPrintedAt: b.labelsPrintedAt })),
    bagsMade,
    kgMade: Math.round((bagsMade * bagGrams) / 100) / 10,
    bagsInOrders: orders.reduce((s, o) => s + o.bags, 0),
    stock: stock.map((s) => ({ id: s.id, qty: s.qty, qtyIn: s.qtyIn, unit: s.unit, expiresAt: s.expiresAt, heldBy: s.heldBy, location: s.location })),
    orders,
    counts: {
      not_shipped: orders.filter((o) => o.group === 'not_shipped').length,
      in_transit: orders.filter((o) => o.group === 'in_transit').length,
      delivered: orders.filter((o) => o.group === 'delivered').length,
      total: orders.length
    }
  };
}

/** Các lô để chọn khi thu hồi: lô có mẻ, tồn kho hoặc đơn, kèm số đơn ảnh hưởng. */
export function listTraceLots(db, cfg = BUSINESS) {
  const f = db.factory || emptyFactory();
  const codes = new Set();
  for (const b of f.batches) if (b.lotCode) codes.add(b.lotCode);
  for (const r of f.receipts) if (r.verdict === 'pass') codes.add(r.lotCode);
  for (const l of db.lots || []) codes.add(l.qr_code);
  if (db.procurement) for (const s of db.procurement.stock) if (/^MOVA-TRACE-/.test(s.lotCode)) codes.add(s.lotCode);
  const lists = closedLists(db, cfg);
  const alloc = allocateBatches({ batches: f.batches, lists });
  const ordersByLot = {};
  for (const [orderId, parts] of Object.entries(alloc)) for (const p of parts) if (p.lotCode) (ordersByLot[p.lotCode] ||= new Set()).add(orderId);
  return [...codes].sort().map((code) => {
    const lot = (db.lots || []).find((l) => l.qr_code === code);
    const batches = f.batches.filter((b) => b.lotCode === code);
    const sku = (lot && lot.sku) || (batches[0] && batches[0].key) || null;
    return {
      lotCode: code,
      sku,
      skuName: sku && SKUS[sku] ? SKUS[sku].name : '',
      sourceName: lot ? lot.farm_info.farm_name : '',
      sample: Boolean(lot && lot.sample),
      batches: batches.length,
      bags: batches.reduce((s, b) => s + b.bags, 0),
      orders: ordersByLot[code] ? ordersByLot[code].size : 0,
      recalled: Boolean(db.procurement && db.procurement.recalls.some((r) => r.lotCode === code))
    };
  });
}

/** Giá trị các món trong đơn có nguyên liệu `skuId` (khoản bù mặc định khi thu hồi), làm tròn nghìn đồng. */
export function affectedDishValueVnd(order, skuId, cfg = BUSINESS) {
  let total = 0;
  for (const meal of order.meals) {
    for (const dishId of Object.values(meal.dishes)) {
      const d = DISHES[dishId];
      if (d && d.bom.some((b) => b.sku === skuId)) total += d.pricePerPersonVnd * order.householdSize * dishFactor(meal, d);
    }
  }
  return Math.round((total * cfg.recall.compensationFactor) / 1000) * 1000;
}

/** Tên các món trong đơn dùng nguyên liệu `skuId`, để ghi vào thông báo cho khách. */
export function affectedDishNames(order, skuId) {
  const names = [];
  for (const meal of order.meals) {
    for (const dishId of Object.values(meal.dishes)) {
      const d = DISHES[dishId];
      if (d && d.bom.some((b) => b.sku === skuId) && !names.includes(d.name)) names.push(d.name);
    }
  }
  return names;
}
