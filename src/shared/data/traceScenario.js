import { SKUS } from './catalog';
import { sourcesForSku } from './sources';
import { expiryOf, nextDailyId, nextLotCode, scopeKey } from '../domain/factory';
import { ensureProcurement } from '../domain/procurementOps';

/**
 * Dựng tình huống truy xuất mẫu cho bảng demo (chỉ admin): trên ngày đã chốt sổ, nhận hai lô nguyên liệu của cùng một mặt hàng
 * (ưu tiên bò, gạo vì bắt buộc có lô), làm hai mẻ túi gán hai lô, đóng thùng / lên xe một phần, và đẩy đơn sang đủ ba trạng thái
 * (đã giao, đang giao, đang sản xuất / chưa xuất) để thử thu hồi lô. Mọi việc đi qua đúng các hàm ghi thật của app vận hành.
 */
const PHOTO = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

const fail = (code, message) => {
  const e = new Error(message);
  e.code = code;
  return e;
};

export function seedTraceScenario(api, server) {
  const admin = { role: 'admin' };
  const snap = api.ops.factory.snapshot(admin);
  if (!snap.day || !snap.orders.length) throw fail('NO_PLAN', 'Chưa có ngày nào chốt sổ. Hãy bấm "Tới giờ chốt sổ" trước.');
  const { day } = snap;

  // Chọn chuyến và mặt hàng cần nhiều túi nhất (ưu tiên hàng bắt buộc có lô)
  const tally = {};
  for (const o of snap.orders) {
    for (const it of o.items) {
      if (it.type !== 'sku' || it.hub) continue;
      const t = (tally[`${o.tripId}|${it.key}`] ||= { tripId: o.tripId, sku: it.key, bags: 0, bagGrams: it.bagGrams });
      t.bags += it.bags;
    }
  }
  const pick = Object.values(tally).sort((a, b) => (SKUS[b.sku].requiresLot - SKUS[a.sku].requiresLot) || b.bags - a.bags)[0];
  if (!pick) throw fail('NO_SKU', 'Ngày chốt sổ này không có mặt hàng nào của xưởng');
  const { tripId, sku, bags, bagGrams } = pick;
  const scope = scopeKey(day, tripId);
  if (snap.factory.batches.some((b) => b.scope === scope && b.key === sku)) throw fail('TRACE_EXISTS', 'Đã dựng dữ liệu truy xuất cho ngày này rồi');

  const nowIso = api.ops.summary(admin).now;
  const sources = sourcesForSku(sku);
  const yieldRate = SKUS[sku].yield;
  const tempC = SKUS[sku].temp === 'frozen' ? -19.5 : SKUS[sku].temp === 'chill' ? 2.4 : 22;
  const codeA = nextLotCode(sku, snap.lotCodes, nowIso);
  const codeB = nextLotCode(sku, [...snap.lotCodes, codeA], nowIso);
  const nA = Math.max(1, Math.ceil(bags * 0.6));
  const nB = Math.max(1, bags - nA);
  const rawKg = (n) => Math.ceil(((n * bagGrams) / 1000 / yieldRate) * 1.15) + 2;
  let op = 0;
  const apply = (o) => api.ops.factory.apply(admin, { ...o, opId: `seed-trace-${scope}-${(op += 1)}` });

  [[codeA, nA, sources[0]], [codeB, nB, sources[1] || sources[0]]].forEach(([code, n, src]) => {
    apply({ type: 'receipt', sku, sourceId: src.id, weightKg: rawKg(n), tempC, photo: PHOTO, verdict: 'pass', lotCode: code });
  });
  const batchIds = snap.factory.batches.map((b) => b.id);
  const idA = nextDailyId('B', batchIds, nowIso);
  const idB = nextDailyId('B', [...batchIds, idA], nowIso);
  apply({ type: 'batch', id: idA, key: sku, bags: nA, lotCode: codeA, scope, expiresAt: expiryOf(sku, nowIso) });
  apply({ type: 'batch', id: idB, key: sku, bags: nB, lotCode: codeB, scope, expiresAt: expiryOf(sku, nowIso) });

  // Đóng thùng, lên xe và đổi trạng thái đơn của chuyến: 1/4 đã giao, 1/4 đang giao, 1/4 đang sản xuất, còn lại chưa xuất
  const lists = snap.orders.filter((o) => o.tripId === tripId).sort((a, b) => a.orderId.localeCompare(b.orderId));
  const quarter = Math.max(1, Math.floor(lists.length / 4));
  const counts = { delivered: 0, shipped: 0, in_production: 0, locked: 0 };
  lists.forEach((l, i) => {
    const status = i < quarter ? 'delivered' : i < quarter * 2 ? 'shipped' : i < quarter * 3 ? 'in_production' : 'locked';
    if (status !== 'locked') {
      for (const it of l.items) if (!it.hub) apply({ type: 'tick', orderId: l.orderId, key: it.key, count: it.bags });
      apply({ type: 'closeBox', orderId: l.orderId });
      if (status === 'delivered' || status === 'shipped') apply({ type: 'load', scope, orderId: l.orderId, loaded: true });
      // Túi đầu tiên vào thùng đã đưa đơn sang 'đang sản xuất'; chỉ cần đẩy tiếp khi đã lên xe
      if (status === 'delivered' || status === 'shipped') api.ops.setOrderStatus(admin, { orderId: l.orderId, status });
    }
    counts[status] += 1;
  });

  // Phần chưa dùng của hai lô còn nằm ở kho phụ TP.HCM
  server.write((db) => {
    const proc = ensureProcurement(db);
    const left = (n) => Math.max(5, Math.round(rawKg(n) * 0.25));
    [[codeA, nA], [codeB, nB]].forEach(([code, n], i) => {
      const id = `STK-T${String(proc.stock.length + i + 1).padStart(4, '0')}`;
      const qty = left(n);
      proc.stock.push({
        id, sku, lotCode: code, qty, qtyIn: qty, unit: SKUS[sku].unit, receivedAt: nowIso, expiresAt: expiryOf(sku, nowIso), tempC,
        supplierId: SKUS[sku].supplierId, receiptId: null, location: 'hub', heldBy: null, unitCostVnd: SKUS[sku].priceVnd
      });
      proc.stockMoves.push({ id: `MV-T${String(proc.stockMoves.length + 1).padStart(4, '0')}`, at: nowIso, kind: 'receive', stockId: id, sku, lotCode: code, qty, ref: 'seed-trace', by: 'demo' });
    });
  });

  return { day, tripId, sku, skuName: SKUS[sku].name, lotCodes: [codeA, codeB], batches: [idA, idB], orders: lists.length, counts };
}
