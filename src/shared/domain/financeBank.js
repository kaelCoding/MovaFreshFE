import { BUSINESS } from '../config/business';
import { cardFee } from './financePayables';

const DAY_MS = 24 * 3600 * 1000;

/** Mã đối soát của các lần nạp Fresh Credit: cố định theo khách (C-0007 thành NAP0007), khách ghi vào nội dung chuyển khoản. */
export const topupRefFor = (customerId) => `NAP${String(customerId).replace(/\D/g, '')}`;

/** Chuẩn hóa nội dung chuyển khoản để tìm mã: ngân hàng hay bỏ dấu cách và ký tự lạ. */
export const normalizeContent = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Các khoản MOVA đang chờ tiền về: bút nạp / chuyển khoản trọn gói có mã đối soát (`ref`). Bút dựng lại từ hạt giống không có. */
export function expectedReceipts(ledger) {
  return ledger
    .filter((l) => ['topup', 'prepaid_cycle'].includes(l.kind) && l.ref && !l.backfill)
    .map((l) => ({ ledgerId: l.id, customerId: l.customerId, ref: l.ref, amountVnd: l.real || l.amountVnd, at: l.at, kind: l.kind }));
}

/**
 * Tự khớp một giao dịch ngân hàng (webhook) với khoản đang chờ theo MÃ trong nội dung chuyển khoản.
 * - khớp mã và đúng số tiền: `matched` (tự động);
 * - khớp mã nhưng lệch số tiền: `amount_diff` (vào hàng chờ khớp tay, kèm khoản gợi ý);
 * - không thấy mã nào (hoặc mã đã được khớp bởi giao dịch khác): `unmatched` (hàng chờ khớp tay).
 * `takenLedgerIds`: các bút đã có giao dịch khớp.
 */
export function matchBankTxn(txn, expected, takenLedgerIds = new Set()) {
  const text = normalizeContent(txn.content);
  const free = expected.filter((e) => !takenLedgerIds.has(e.ledgerId));
  const hits = free.filter((e) => text.includes(normalizeContent(e.ref)));
  if (!hits.length) {
    const taken = expected.some((e) => takenLedgerIds.has(e.ledgerId) && text.includes(normalizeContent(e.ref)));
    return { status: 'unmatched', ledgerId: null, reason: taken ? 'Mã đối soát này đã có giao dịch khớp trước đó' : 'Nội dung chuyển khoản không có mã đối soát nào của MOVA' };
  }
  const exact = hits.find((e) => e.amountVnd === txn.amountVnd);
  if (exact) return { status: 'matched', ledgerId: exact.ledgerId, reason: '' };
  const h = hits[0];
  return { status: 'amount_diff', ledgerId: h.ledgerId, reason: `Số tiền lệch: nhận ${txn.amountVnd.toLocaleString('vi-VN')}đ, chờ ${h.amountVnd.toLocaleString('vi-VN')}đ` };
}

export const BANK_STATUS_LABEL = { matched: 'Đã khớp', amount_diff: 'Lệch số tiền', unmatched: 'Không khớp', ignored: 'Đã loại (không phải của MOVA)' };

/** Mô phỏng nội dung và số tiền một giao dịch về từ khoản đang chờ. scenario: exact | wrong_content | wrong_amount */
export function simulateTxn(expected, scenario = 'exact') {
  if (scenario === 'wrong_content') return { amountVnd: expected.amountVnd, content: 'CHUYEN TIEN AN UONG' };
  if (scenario === 'wrong_amount') return { amountVnd: Math.max(1000, expected.amountVnd - 50000), content: `${expected.ref} thanh toan` };
  return { amountVnd: expected.amountVnd, content: `${expected.ref} thanh toan` };
}

/**
 * Thu tiền qua thẻ: lần trừ thành công (kèm phí cổng và ngày tiền về) và lần thất bại.
 * Thất bại lấy từ đơn thẻ có `chargeFailedAt`: còn `charge_failed` là chưa trừ lại được, đã trả thì là đã trừ lại thành công.
 */
export function cardRows({ ledger, orders }, now, cfg = BUSINESS) {
  const success = ledger
    .filter((l) => l.kind === 'card_charge')
    .map((l) => {
      const fee = cardFee(l.real || 0, cfg);
      const settleAt = new Date(Date.parse(l.at) + cfg.finance.card.settleDays * DAY_MS).toISOString();
      return { ledgerId: l.id, orderId: l.orderId, customerId: l.customerId, at: l.at, amountVnd: l.real || 0, feeVnd: fee, netVnd: (l.real || 0) - fee, settleAt, settled: Date.parse(settleAt) <= now.getTime() };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
  const failed = orders
    .filter((o) => o.paymentMethod === 'card' && o.chargeFailedAt)
    .map((o) => ({ orderId: o.id, customerId: o.customerId, at: o.chargeFailedAt, amountVnd: o.amountVnd, reason: o.failReason || 'Thẻ bị từ chối', open: o.status === 'charge_failed' || o.status === 'skipped_unpaid' }))
    .sort((a, b) => b.at.localeCompare(a.at));
  return {
    success,
    failed,
    totals: {
      successCount: success.length,
      failedCount: failed.length,
      grossVnd: success.reduce((s, r) => s + r.amountVnd, 0),
      feeVnd: success.reduce((s, r) => s + r.feeVnd, 0),
      netVnd: success.reduce((s, r) => s + r.netVnd, 0),
      inTransitVnd: success.filter((r) => !r.settled).reduce((s, r) => s + r.netVnd, 0)
    }
  };
}
