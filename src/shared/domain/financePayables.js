import { BUSINESS } from '../config/business';
import { addDays, dayKey } from '../utils/time';

const DAY_MS = 24 * 3600 * 1000;

/** Số ngày từ `fromKey` tới `toKey` (dương nếu `toKey` muộn hơn). */
export const daysBetween = (fromKey, toKey) => Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS);

// ---------------------------------------------------------------------------------------------
// Tuổi nợ phải trả theo số ngày QUÁ hạn: chưa đến hạn / 1–7 / 8–15 / 16–30 / >30

export function agingBucketOf(daysOverdue, edges = BUSINESS.finance.agingDays) {
  const [a, b, c] = edges;
  if (daysOverdue <= 0) return 'not_due';
  if (daysOverdue <= a) return 'd1';
  if (daysOverdue <= b) return 'd2';
  if (daysOverdue <= c) return 'd3';
  return 'd4';
}

export function agingLabels(edges = BUSINESS.finance.agingDays) {
  const [a, b, c] = edges;
  return {
    not_due: 'Chưa đến hạn',
    d1: `Quá hạn 1–${a} ngày`,
    d2: `Quá hạn ${a + 1}–${b} ngày`,
    d3: `Quá hạn ${b + 1}–${c} ngày`,
    d4: `Quá hạn trên ${c} ngày`
  };
}

/**
 * Tuổi nợ của các khoản đã đối chiếu mà chưa trả (`status: 'matched'`, có `dueAt` và `payableVnd`). `today` là dayKey.
 * Mỗi dòng nhận thêm `daysOverdue` (âm = còn bao nhiêu ngày) và `bucket`.
 */
export function payablesAging(rows, today, cfg = BUSINESS) {
  const labels = agingLabels(cfg.finance.agingDays);
  const buckets = Object.keys(labels).map((id) => ({ id, label: labels[id], amountVnd: 0, count: 0 }));
  const by = Object.fromEntries(buckets.map((b) => [b.id, b]));
  const items = [];
  for (const r of rows) {
    if (r.status !== 'matched' || !r.dueAt || r.payableVnd == null) continue;
    const dueDay = dayKey(new Date(r.dueAt));
    const daysOverdue = daysBetween(dueDay, today);
    const bucket = agingBucketOf(daysOverdue, cfg.finance.agingDays);
    by[bucket].amountVnd += r.payableVnd;
    by[bucket].count += 1;
    items.push({ ...r, dueDay, daysOverdue, bucket });
  }
  return { buckets, items, totalVnd: buckets.reduce((s, b) => s + b.amountVnd, 0), overdueVnd: buckets.filter((b) => b.id !== 'not_due').reduce((s, b) => s + b.amountVnd, 0) };
}

// ---------------------------------------------------------------------------------------------
// Chi tiền mặt từ ngưỡng: mất quyền khấu trừ VAT đầu vào

export function cashPaymentCheck(amountVnd, method, cfg = BUSINESS) {
  const limit = cfg.alerts.cashPaymentVatLimitVnd;
  if (method === 'cash' && amountVnd >= limit) {
    return {
      ok: false,
      warn: true,
      limitVnd: limit,
      message: `Chi tiền mặt từ ${limit.toLocaleString('vi-VN')}đ trở lên thì hóa đơn đầu vào KHÔNG được khấu trừ VAT. Hãy chuyển khoản.`
    };
  }
  return { ok: true, warn: false, limitVnd: limit, message: '' };
}

// ---------------------------------------------------------------------------------------------
// Đề xuất đợt chi và file chi (mock)

/**
 * Đề xuất đợt chi: các khoản đã đối chiếu, chưa trả, đã quá hạn hoặc đến hạn trong `leadDays` ngày tới, quá hạn lâu nhất trước.
 * Phương thức mặc định là chuyển khoản (tiền mặt từ ngưỡng 5 triệu bị chặn và cảnh báo).
 */
export function proposePayRun(rows, today, cfg = BUSINESS, leadDays = cfg.finance.payRun.leadDays) {
  const aging = payablesAging(rows, today, cfg);
  const items = aging.items
    .filter((r) => r.daysOverdue >= -leadDays)
    .map((r) => ({
      poId: r.poId, supplierId: r.supplierId, supplierName: r.supplierName, amountVnd: r.payableVnd, dueDay: r.dueDay,
      daysOverdue: r.daysOverdue, bucket: r.bucket, invoiceNumber: r.invoiceNumber, claimVnd: r.claimVnd || 0, method: 'bank_transfer'
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue || a.poId.localeCompare(b.poId));
  return { items, totalVnd: items.reduce((s, i) => s + i.amountVnd, 0), leadDays, today };
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (header, rows) => `﻿${[header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;

/** File chi (mock) gửi ngân hàng: mỗi khoản một dòng chuyển khoản. `bankOf(supplierId)` = { bankName, accountNo, accountName }. */
export function payFileCsv(items, bankOf, { batchId = 'DOT-CHI', today = '' } = {}) {
  const header = ['STT', 'Mã PO', 'Nhà cung cấp', 'Ngân hàng', 'Số tài khoản', 'Tên thụ hưởng', 'Số tiền', 'Nội dung chuyển khoản'];
  const rows = items.map((i, n) => {
    const b = bankOf(i.supplierId) || {};
    return [n + 1, i.poId, i.supplierName, b.bankName || '', b.accountNo || '', b.accountName || '', i.amountVnd, `MOVA TT ${i.invoiceNumber || i.poId} ${today}`.trim()];
  });
  rows.push(['', '', '', '', '', 'TỔNG', items.reduce((s, i) => s + i.amountVnd, 0), batchId]);
  return toCsv(header, rows);
}

// ---------------------------------------------------------------------------------------------
// Tiền mặt hiện có và tỷ lệ bao phủ

/**
 * Vị thế tiền tại `now`: số dư đầu kỳ + tiền vào (nạp, chuyển khoản trọn gói, trừ thẻ trừ phí cổng) - tiền ra (hoàn tiền thật,
 * trả nhà cung cấp, mua nông sản trực tiếp). Tiền thẻ chỉ về sau `card.settleDays` ngày; phần chưa về tính là "đang về".
 */
export function cashPosition({ ledger, payments, purchases, openingVnd }, now, cfg = BUSINESS) {
  const f = cfg.finance;
  let inVnd = 0;
  let inTransitVnd = 0;
  let feesVnd = 0;
  for (const l of ledger) {
    if (['topup', 'prepaid_cycle'].includes(l.kind)) inVnd += l.real || 0;
    else if (l.kind === 'card_charge') {
      const fee = cardFee(l.real || 0, cfg);
      feesVnd += fee;
      const net = (l.real || 0) - fee;
      if (Date.parse(l.at) + f.card.settleDays * DAY_MS <= now.getTime()) inVnd += net;
      else inTransitVnd += net;
    }
  }
  const refundVnd = ledger.filter((l) => l.kind === 'cancel_refund').reduce((s, l) => s + (l.real || 0), 0);
  const supplierPaidVnd = payments.reduce((s, p) => s + p.amountVnd, 0);
  const directVnd = purchases.reduce((s, p) => s + (p.statement ? p.statement.totalVnd : 0), 0);
  const outVnd = refundVnd + supplierPaidVnd + directVnd;
  return { openingVnd, inVnd, inTransitVnd, feesVnd, refundVnd, supplierPaidVnd, directVnd, outVnd, cashVnd: openingVnd + inVnd - outVnd };
}

export const cardFee = (amountVnd, cfg = BUSINESS) => Math.round(amountVnd * cfg.finance.card.feePct + cfg.finance.card.feeFixedVnd);

/**
 * Tỷ lệ bao phủ = tiền mặt / nợ Fresh Credit (phần tiền thật chưa dùng). Dưới `alerts.minCashCoverageRatio` thì cảnh báo.
 * `prepaidOrdersVnd` (tiền thật của các đơn đã thu trước chưa giao) chỉ cộng vào nghĩa vụ khi `finance.coverage.includePrepaidOrders`.
 */
export function coverageRatio({ cashVnd, liabilityRealVnd, prepaidOrdersVnd = 0 }, cfg = BUSINESS) {
  const liabilityVnd = liabilityRealVnd + (cfg.finance.coverage.includePrepaidOrders ? prepaidOrdersVnd : 0);
  const min = cfg.alerts.minCashCoverageRatio;
  if (liabilityVnd <= 0) return { ratio: null, liabilityVnd, minRatio: min, alert: cashVnd < 0, shortfallVnd: Math.max(0, -cashVnd) };
  const ratio = cashVnd / liabilityVnd;
  return { ratio, liabilityVnd, minRatio: min, alert: ratio < min, shortfallVnd: Math.max(0, Math.ceil(min * liabilityVnd - cashVnd)) };
}

// ---------------------------------------------------------------------------------------------
// Dòng tiền 30 ngày

/**
 * Dự báo dòng tiền `horizonDays` ngày kể từ hôm nay (`today` là dayKey).
 * Vào: lần trừ thẻ theo lịch (`cardCharges: [{ day, amountVnd }]`) và gia hạn dự kiến (`renewals: [{ day, amountVnd }]`, đã nhân tỷ lệ gia hạn).
 * Ra: công nợ đã đối chiếu theo hạn (quá hạn tính vào hôm nay), PO chưa đối chiếu theo hạn ước tính (`estimatedOut`),
 * chi phí logistics chưa trả (`logisticsOut`). Fresh Credit và chuyển khoản trọn gói đã thu tiền nên không có tiền vào mới.
 */
export function cashflowForecast({ today, startCashVnd, cardCharges = [], renewals = [], payablesOut = [], estimatedOut = [], logisticsOut = [] }, horizonDays = BUSINESS.finance.cashflow.horizonDays) {
  const days = [];
  const index = {};
  for (let i = 0; i < horizonDays; i++) {
    const day = addDays(today, i);
    index[day] = { day, cardVnd: 0, renewalVnd: 0, payablesVnd: 0, estimatedVnd: 0, logisticsVnd: 0 };
    days.push(index[day]);
  }
  const put = (list, day, field, amount) => {
    const d = day < today ? today : day;
    if (index[d]) index[d][field] += amount;
  };
  for (const x of cardCharges) put(cardCharges, x.day, 'cardVnd', x.amountVnd);
  for (const x of renewals) put(renewals, x.day, 'renewalVnd', x.amountVnd);
  for (const x of payablesOut) put(payablesOut, x.day, 'payablesVnd', x.amountVnd);
  for (const x of estimatedOut) put(estimatedOut, x.day, 'estimatedVnd', x.amountVnd);
  for (const x of logisticsOut) put(logisticsOut, x.day, 'logisticsVnd', x.amountVnd);
  let cash = startCashVnd;
  let low = null;
  for (const d of days) {
    d.inVnd = d.cardVnd + d.renewalVnd;
    d.outVnd = d.payablesVnd + d.estimatedVnd + d.logisticsVnd;
    d.netVnd = d.inVnd - d.outVnd;
    cash += d.netVnd;
    d.cashEndVnd = cash;
    if (!low || cash < low.cashEndVnd) low = { day: d.day, cashEndVnd: cash };
  }
  const sum = (f) => days.reduce((s, d) => s + d[f], 0);
  return {
    days,
    startCashVnd,
    endCashVnd: cash,
    totalInVnd: sum('inVnd'),
    totalOutVnd: sum('outVnd'),
    cardVnd: sum('cardVnd'),
    renewalVnd: sum('renewalVnd'),
    payablesVnd: sum('payablesVnd'),
    estimatedVnd: sum('estimatedVnd'),
    logisticsVnd: sum('logisticsVnd'),
    lowest: low
  };
}
