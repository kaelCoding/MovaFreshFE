import { BUSINESS } from '../config/business';
import { emptyBalance, totalBalance } from './credit';

/**
 * Sổ Fresh Credit (sổ phụ nghiệp vụ, KHÔNG phải sổ kế toán). Mỗi bút trong `db.ledger` thay đổi số dư hai ngăn:
 * tiền thật (real, khách đã nạp, hoàn được khi dừng gói) và khuyến mãi (promo, không hoàn).
 *
 * `real` / `promo` trên bút là phần mỗi ngăn bị ảnh hưởng (số dương); dấu do loại bút quyết định,
 * riêng `adjustment` lưu số có dấu vì kế toán có thể cộng hoặc trừ.
 */

/** sign: +1 cộng vào Fresh Credit, -1 trừ khỏi Fresh Credit, 0 không đụng tới Fresh Credit (thu tiền trực tiếp cho đơn). */
export const CREDIT_KINDS = {
  topup: { label: 'Nạp Fresh Credit (tiền thật)', group: 'topup', sign: 1 },
  topup_bonus: { label: 'Thưởng nạp', group: 'topup_bonus', sign: 1 },
  reward_profile: { label: 'Thưởng hoàn thiện hồ sơ', group: 'reward', sign: 1 },
  reward_share: { label: 'Thưởng chia sẻ', group: 'reward', sign: 1 },
  reward_referrer: { label: 'Thưởng giới thiệu (người mời)', group: 'reward', sign: 1 },
  reward_referee: { label: 'Thưởng giới thiệu (bạn mới)', group: 'reward', sign: 1 },
  credit_spend: { label: 'Trừ cho tuần giao', group: 'spend', sign: -1 },
  swap_charge: { label: 'Trừ thêm do đổi món', group: 'spend', sign: -1 },
  swap_refund: { label: 'Hoàn do đổi món', group: 'refund', sign: 1 },
  compensation: { label: 'Bù sự cố', group: 'compensation', sign: 1 },
  order_refund: { label: 'Tuần bị dừng, tiền về Fresh Credit', group: 'refund', sign: 1 },
  cancel_refund: { label: 'Hoàn tiền thật khi dừng gói', group: 'refund', sign: -1 },
  promo_forfeit: { label: 'Thu hồi khuyến mãi khi dừng gói', group: 'refund', sign: -1 },
  adjustment: { label: 'Điều chỉnh (đã duyệt)', group: 'adjustment', sign: 0, signed: true },
  // Thu tiền trực tiếp cho đơn (thẻ, chuyển khoản trọn gói): không qua số dư Fresh Credit
  card_charge: { label: 'Trừ thẻ cho tuần giao', group: 'direct', sign: 0, direct: true },
  prepaid_cycle: { label: 'Chuyển khoản trả trọn gói', group: 'direct', sign: 0, direct: true }
};

export const CREDIT_GROUPS = [
  { id: 'topup', label: 'Nạp (tiền thật)' },
  { id: 'topup_bonus', label: 'Thưởng nạp' },
  { id: 'reward', label: 'Thưởng hồ sơ / chia sẻ / giới thiệu' },
  { id: 'spend', label: 'Trừ cho tuần' },
  { id: 'compensation', label: 'Bù sự cố' },
  { id: 'refund', label: 'Hoàn' },
  { id: 'adjustment', label: 'Điều chỉnh' }
];

/** Tác động của một bút lên hai ngăn: { real, promo } có dấu. Bút thu tiền trực tiếp không đổi số dư. */
export function creditEffect(l) {
  const k = CREDIT_KINDS[l.kind];
  if (!k || (!k.sign && !k.signed)) return { real: 0, promo: 0 };
  if (k.signed) return { real: l.real || 0, promo: l.promo || 0 };
  return { real: k.sign * (l.real || 0), promo: k.sign * (l.promo || 0) };
}

/** Số dư hai ngăn dựng lại từ sổ, theo từng khách. */
export function balancesFromLedger(ledger) {
  const out = {};
  for (const l of ledger) {
    const e = creditEffect(l);
    if (!e.real && !e.promo) continue;
    const b = (out[l.customerId] ||= emptyBalance());
    b.real += e.real;
    b.promo += e.promo;
  }
  return out;
}

/**
 * Tổng hợp sổ: nợ Fresh Credit (phần tiền thật chưa dùng), khuyến mãi còn treo, và độ lệch giữa sổ với số dư thực của khách.
 * Lệch khác 0 nghĩa là có chỗ đổi số dư mà không ghi bút: cần soi.
 */
export function creditTotals(customers, ledger) {
  const bal = balancesFromLedger(ledger);
  let real = 0;
  let promo = 0;
  let realLedger = 0;
  let promoLedger = 0;
  const drift = [];
  for (const c of customers) {
    const cr = c.credit || emptyBalance();
    const lb = bal[c.id] || emptyBalance();
    real += cr.real;
    promo += cr.promo;
    realLedger += lb.real;
    promoLedger += lb.promo;
    if (cr.real !== lb.real || cr.promo !== lb.promo) drift.push({ customerId: c.id, ledger: lb, actual: { real: cr.real, promo: cr.promo } });
  }
  return { liabilityRealVnd: real, promoOutstandingVnd: promo, ledgerRealVnd: realLedger, ledgerPromoVnd: promoLedger, totalVnd: real + promo, drift };
}

/** Tổng từng nhóm bút (nạp, thưởng, trừ, hoàn...) theo phần tiền thật / khuyến mãi, có dấu theo tác động lên số dư. */
export function groupTotals(ledger) {
  const rows = Object.fromEntries(CREDIT_GROUPS.map((g) => [g.id, { ...g, count: 0, realVnd: 0, promoVnd: 0 }]));
  for (const l of ledger) {
    const k = CREDIT_KINDS[l.kind];
    if (!k || !rows[k.group]) continue;
    const e = creditEffect(l);
    const r = rows[k.group];
    r.count += 1;
    r.realVnd += e.real;
    r.promoVnd += e.promo;
  }
  return Object.values(rows);
}

/** Một dòng sổ để hiện cho kế toán: có mã khách, không có tên hay địa chỉ. */
export function ledgerRow(l, runningBalance = null) {
  const k = CREDIT_KINDS[l.kind] || { label: l.kind, group: 'other', sign: 0 };
  const e = creditEffect(l);
  return {
    id: l.id,
    at: l.at,
    customerId: l.customerId,
    orderId: l.orderId || null,
    kind: l.kind,
    group: k.group,
    label: k.label,
    direct: Boolean(k.direct),
    amountVnd: l.amountVnd,
    realVnd: e.real,
    promoVnd: e.promo,
    ref: l.ref || null,
    note: l.note || null,
    backfill: Boolean(l.backfill),
    approvedBy: l.approvedBy || null,
    balanceAfter: runningBalance
  };
}

/** Số dư chạy theo từng bút của một khách (cũ -> mới). */
export function runningRows(ledger, customerId) {
  const mine = ledger.filter((l) => l.customerId === customerId).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const bal = emptyBalance();
  return mine.map((l) => {
    const e = creditEffect(l);
    bal.real += e.real;
    bal.promo += e.promo;
    return ledgerRow(l, { real: bal.real, promo: bal.promo, total: totalBalance(bal) });
  });
}

/** Phần mỗi ngăn bị trừ khi trừ `amount` theo thứ tự cấu hình (dùng để kiểm tra và để giải thích trên giao diện). */
export function spendBreakdown(balance, amount, spendOrder = BUSINESS.credit.spendOrder) {
  const left = { ...balance };
  const used = { real: 0, promo: 0 };
  let need = amount;
  for (const bucket of spendOrder) {
    const take = Math.min(left[bucket] || 0, need);
    used[bucket] += take;
    left[bucket] -= take;
    need -= take;
  }
  return { ok: need === 0, used, balance: left, shortVnd: need };
}

/** Kiểm tra một yêu cầu điều chỉnh Fresh Credit. Trả danh sách lỗi. */
export function validateAdjustment({ customerId, bucket, deltaVnd, reason }, customer) {
  const errors = [];
  if (!customerId || !customer) errors.push('Không tìm thấy khách');
  if (!['real', 'promo'].includes(bucket)) errors.push('Chọn ngăn tiền thật hoặc khuyến mãi');
  if (!Number.isInteger(deltaVnd) || deltaVnd === 0) errors.push('Số tiền điều chỉnh phải là số nguyên khác 0');
  else if (Math.abs(deltaVnd) > 50000000) errors.push('Số tiền điều chỉnh tối đa 50.000.000đ');
  if (!String(reason || '').trim()) errors.push('Cần ghi lý do điều chỉnh');
  if (customer && bucket && Number.isInteger(deltaVnd) && deltaVnd < 0 && (customer.credit[bucket] || 0) + deltaVnd < 0) errors.push('Số dư ngăn này không đủ để trừ');
  return errors;
}
