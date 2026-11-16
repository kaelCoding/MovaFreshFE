import { BUSINESS } from '../config/business';
import { SKUS, SUPPLIERS } from '../data/catalog';
import { dayKey } from '../utils/time';
import { evaluateTemp } from './logistics';
import { marketDiff } from './procurement';

const r1 = (n) => Math.round(n * 10) / 10;
const clamp01 = (n) => Math.max(0, Math.min(1, n));

/** Chỉ PO đã gửi nhà cung cấp trở đi mới có gì để chấm. */
const SCORED_STATUS = ['sent', 'confirmed', 'received_partial', 'received', 'invoiced', 'matched', 'paid'];

/**
 * Thẻ điểm nhà cung cấp (giám sát) trong khoảng ngày giao [from, to].
 * - giao đúng hạn: có phiếu nhập đầu tiên không muộn hơn ngày giao của PO (PO quá ngày giao mà chưa có phiếu nhập là trễ);
 * - tỷ lệ đáp ứng PO: hàng đã giao (đạt + không đạt) / hàng đã đặt, mỗi dòng tối đa 100%;
 * - tỷ lệ đạt QC: hàng đạt / hàng đã giao;
 * - chênh khối lượng: (đã giao - đã đặt) / đã đặt, có dấu (âm là giao thiếu);
 * - vượt nhiệt: số dòng nhận hàng có nhiệt độ ngoài ngưỡng của nhóm hàng / số dòng có đo nhiệt;
 * - khiếu nại: số phiếu và giá trị so với giá trị đã giao;
 * - chênh giá so với thị trường (mock pricing agent): bình quân theo giá trị, dương là đắt hơn thị trường. Chỉ để xem, không vào điểm.
 * Điểm tổng 0–100 = bình quân có trọng số (`finance.scorecard.weights`) của các chỉ số có dữ liệu.
 */
export function supplierScorecard({ pos, receipts, claims, now }, { from = null, to = null } = {}, cfg = BUSINESS) {
  const today = dayKey(now);
  const sc = cfg.finance.scorecard;
  const rows = [];
  for (const sup of Object.values(SUPPLIERS)) {
    const mine = pos.filter((p) => p.supplierId === sup.id && SCORED_STATUS.includes(p.status) && (!from || p.deliveryDay >= from) && (!to || p.deliveryDay <= to));
    let relevant = 0;
    let onTime = 0;
    let ordered = 0;
    let delivered = 0;
    let accepted = 0;
    let rejected = 0;
    let tempLines = 0;
    let tempBreaches = 0;
    let deliveredValue = 0;
    let priceDiffNum = 0;
    let priceDiffDen = 0;
    const issues = [];
    for (const po of mine) {
      const recs = receipts.filter((r) => r.poId === po.id).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
      const pastDue = po.deliveryDay < today;
      if (recs.length || pastDue) {
        relevant += 1;
        const first = recs[0];
        if (first && dayKey(new Date(first.receivedAt)) <= po.deliveryDay) onTime += 1;
        else issues.push({ poId: po.id, type: 'late', note: first ? `Giao ngày ${dayKey(new Date(first.receivedAt))}, hạn ${po.deliveryDay}` : `Quá hạn ${po.deliveryDay} chưa có hàng` });
      }
      for (const l of po.lines) {
        const got = { a: 0, r: 0 };
        for (const rec of recs) for (const rl of rec.lines) if (rl.sku === l.sku) { got.a += rl.acceptedQty || 0; got.r += rl.rejectedQty || 0; }
        const del = got.a + got.r;
        if (recs.length || pastDue) {
          ordered += l.qty;
          delivered += Math.min(del, l.qty * 1.5);
          accepted += got.a;
          rejected += got.r;
          deliveredValue += del * l.unitPriceVnd;
        }
        const md = marketDiff(l.sku, l.unitPriceVnd, cfg);
        if (md.marketVnd) {
          priceDiffNum += (l.unitPriceVnd - md.marketVnd) * l.qty;
          priceDiffDen += md.marketVnd * l.qty;
        }
      }
      for (const rec of recs) {
        for (const rl of rec.lines) {
          if (typeof rl.tempC !== 'number' || !SKUS[rl.sku]) continue;
          const cls = SKUS[rl.sku].temp;
          if (cls === 'ambient') continue;
          tempLines += 1;
          if (!evaluateTemp(cls, rl.tempC, cfg).ok) {
            tempBreaches += 1;
            issues.push({ poId: po.id, type: 'temp', note: `${SKUS[rl.sku].name} ${rl.tempC}°C` });
          }
        }
      }
    }
    const myClaims = claims.filter((c) => c.supplierId === sup.id && mine.some((p) => p.id === c.poId));
    const claimVnd = myClaims.reduce((s, c) => s + c.amountVnd, 0);
    const got = accepted + rejected;
    const m = {
      onTimeRate: relevant ? onTime / relevant : null,
      fillRate: ordered ? Math.min(1, delivered / ordered) : null,
      qcRate: got ? accepted / got : null,
      weightDiffPct: ordered ? (got - ordered) / ordered : null,
      tempBreachRate: tempLines ? tempBreaches / tempLines : null,
      claimRate: deliveredValue ? claimVnd / deliveredValue : null
    };
    const parts = {
      onTime: m.onTimeRate,
      fill: m.fillRate,
      qc: m.qcRate,
      weight: m.weightDiffPct == null ? null : clamp01(1 - Math.max(0, Math.abs(m.weightDiffPct) - sc.weightTolerancePct) / (sc.weightTolerancePct * 3)),
      temp: m.tempBreachRate == null ? null : 1 - m.tempBreachRate,
      claims: m.claimRate == null ? null : clamp01(1 - m.claimRate * 10)
    };
    let wsum = 0;
    let acc = 0;
    for (const [k, v] of Object.entries(parts)) {
      if (v == null) continue;
      wsum += sc.weights[k];
      acc += sc.weights[k] * v;
    }
    const score = wsum > 0 ? r1((acc / wsum) * 100) : null;
    rows.push({
      supplierId: sup.id,
      name: sup.name,
      poCount: mine.length,
      scoredPoCount: relevant,
      ...m,
      tempBreaches,
      tempLines,
      claimCount: myClaims.length,
      claimVnd,
      deliveredVnd: Math.round(deliveredValue),
      marketDiffPct: priceDiffDen ? priceDiffNum / priceDiffDen : null,
      parts,
      score,
      warn: score != null && score < sc.warnBelow,
      issues
    });
  }
  return rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name));
}
