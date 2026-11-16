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

export function seedTraceScenario(api, server, opts = {}) {
  const admin = { role: 'admin' };
  const first = api.ops.factory.snapshot(admin, opts.day || null);
  if (!first.day || !first.orders.length) throw fail('NO_PLAN', 'Chưa có ngày nào chốt sổ. Hãy bấm "Tới giờ chốt sổ" trước.');

  // Chọn (ngày, chuyến, mặt hàng) cần nhiều túi nhất trong các ngày đã chốt: ưu tiên thịt bò (mặt hàng thí điểm truy xuất),
  // rồi hàng bắt buộc có lô. Có `opts.day` / `opts.sku` thì theo đó.
  const rank = (t) => (opts.sku ? Number(t.sku === opts.sku) * 4 : 0) + (t.sku.startsWith('NL-BO') ? 2 : 0) + Number(SKUS[t.sku].requiresLot);
  const tally = {};
  const snaps = {};
  for (const dd of opts.day ? [{ day: first.day }] : first.days) {
    const sn = dd.day === first.day ? first : api.ops.factory.snapshot(admin, dd.day);
    snaps[dd.day] = sn;
    for (const o of sn.orders) {
      for (const it of o.items) {
        if (it.type !== 'sku' || it.hub) continue;
        const t = (tally[`${dd.day}|${o.tripId}|${it.key}`] ||= { day: dd.day, tripId: o.tripId, sku: it.key, bags: 0, bagGrams: it.bagGrams });
        t.bags += it.bags;
      }
    }
  }
  const pick = Object.values(tally)
    .filter((t) => !snaps[t.day].factory.batches.some((b) => b.scope === scopeKey(t.day, t.tripId) && b.key === t.sku))
    .sort((a, b) => rank(b) - rank(a) || b.bags - a.bags)[0];
  if (!pick) throw fail('NO_SKU', 'Không còn mặt hàng nào để dựng (đã dựng hết, hoặc ngày chốt sổ không có hàng của xưởng)');
  const { day, tripId, sku, bags, bagGrams } = pick;
  const snap = snaps[day];
  const scope = scopeKey(day, tripId);

  const nowIso = api.ops.summary(admin).now;
  const sources = sourcesForSku(sku);
  const yieldRate = SKUS[sku].yield;
  const tempC = SKUS[sku].temp === 'frozen' ? -19.5 : SKUS[sku].temp === 'chill' ? 2.4 : 22;
  const codeA = nextLotCode(sku, snap.lotCodes, nowIso);
  const codeB = nextLotCode(sku, [...snap.lotCodes, codeA], nowIso);
  // Lô A phủ ba đơn đầu có mặt hàng này (đủ để có đơn ở nhiều nhóm trạng thái), lô B phủ phần còn lại.
  // Chỉ có ba đơn trở xuống thì lô A bớt một túi của đơn thứ ba để hai lô chia chung đơn đó.
  const tripOrders = snap.orders.filter((o) => o.tripId === tripId).sort((a, b) => a.orderId.localeCompare(b.orderId));
  const bagsOf = (o) => (o.items.find((i) => i.key === sku && !i.hub) || { bags: 0 }).bags;
  const withSku = tripOrders.filter((o) => bagsOf(o) > 0);
  const firstK = withSku.slice(0, 3);
  let nA = firstK.reduce((s2, o) => s2 + bagsOf(o), 0);
  if (withSku.length <= 3 && firstK.length && bagsOf(firstK[firstK.length - 1]) > 1) nA -= 1;
  nA = Math.max(1, Math.min(nA, bags - 1));
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

  // Đóng thùng, lên xe và đổi trạng thái đơn xen kẽ: đã giao, đang giao, đang sản xuất, chưa xuất
  // (chỉ các đơn có mặt hàng này; xen kẽ để mỗi lô đều có đơn ở nhiều nhóm trạng thái)
  const lists = withSku;
  const counts = { delivered: 0, shipped: 0, in_production: 0, locked: 0 };
  const CYCLE = ['delivered', 'shipped', 'in_production', 'locked'];
  lists.forEach((l, i) => {
    const status = CYCLE[i % CYCLE.length];
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
