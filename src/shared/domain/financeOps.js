import { BUSINESS } from '../config/business';
import { hash } from '../utils/formatters';
import { paidFromOf } from './account';
import { nextId } from './jobs';
import { balancesFromLedger, validateAdjustment } from './financeCredit';
import { expectedReceipts, matchBankTxn, simulateTxn } from './financeBank';
import { boxCost, buildCostEnv, marginRows, planEinvoices, recognizeRevenue } from './financeRevenue';
import { effectiveAccountMap } from './financeJournal';
import { dayCost } from './logisticsOps';
import { ensureProcurement } from './procurementOps';

/**
 * Phần GHI và dựng ngữ cảnh của Tài chính (P2D). Sổ Fresh Credit vẫn là `db.ledger` (đã có từ P0 đến P2C, mỗi nơi phát sinh tự ghi bút);
 * lát cắt `db.finance` chỉ giữ phần của kế toán: giao dịch ngân hàng, hóa đơn điện tử, yêu cầu điều chỉnh, cài đặt.
 */

const bad = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const good = (extra = {}) => ({ ok: true, ...extra });

export const emptyFinance = () => ({
  bankTxns: [], // giao dịch ngân hàng (webhook mock) đã nhận
  einvoices: [], // hóa đơn điện tử đã xuất (lớp tích hợp mock)
  adjustments: [], // yêu cầu điều chỉnh Fresh Credit (cần admin duyệt)
  settings: { accountMap: {}, openingCashVnd: null, issueOn: null },
  seq: {}
});

/** Lát cắt `db.finance`; bộ nhớ cũ chưa có thì tạo rỗng. */
export function ensureFinance(db) {
  if (!db.finance) db.finance = emptyFinance();
  const f = db.finance;
  for (const [k, v] of Object.entries(emptyFinance())) if (f[k] === undefined) f[k] = v;
  return f;
}

const fid = (fin, prefix) => {
  fin.seq[prefix] = (fin.seq[prefix] || 0) + 1;
  return `${prefix}-${String(fin.seq[prefix]).padStart(5, '0')}`;
};

/** Cài đặt đang hiệu lực: giá trị kế toán đã nhập ghi đè cấu hình mặc định. */
export function financeSettings(db, cfg = BUSINESS) {
  const s = (db.finance && db.finance.settings) || {};
  return {
    openingCashVnd: s.openingCashVnd != null ? s.openingCashVnd : cfg.finance.openingCashVnd,
    issueOn: s.issueOn || cfg.invoicing.issueOn,
    promoTreatment: cfg.finance.promoTreatment,
    accountOverrides: s.accountMap || {},
    accountMap: effectiveAccountMap(s.accountMap || {}, cfg)
  };
}

export function saveFinanceSettings(db, { openingCashVnd, issueOn, accountMap }, cfg = BUSINESS) {
  const fin = ensureFinance(db);
  if (openingCashVnd !== undefined) {
    if (!Number.isInteger(openingCashVnd) || openingCashVnd < 0 || openingCashVnd > 100000000000) return bad('SETTINGS_INVALID', 'Số dư đầu kỳ phải là số nguyên từ 0 đồng');
    fin.settings.openingCashVnd = openingCashVnd;
  }
  if (issueOn !== undefined) {
    if (!['topup', 'delivery'].includes(issueOn)) return bad('SETTINGS_INVALID', 'Thời điểm xuất hóa đơn là khi nạp hoặc khi giao');
    const current = financeSettings(db, cfg).issueOn;
    if (issueOn !== current && fin.einvoices.length) return bad('ISSUE_ON_LOCKED', 'Đã có hóa đơn xuất ra nên không đổi thời điểm xuất được, tránh xuất hóa đơn hai lần cho cùng một khoản tiền');
    fin.settings.issueOn = issueOn;
  }
  if (accountMap !== undefined) {
    const next = {};
    for (const [k, code] of Object.entries(accountMap || {})) {
      if (!cfg.finance.accountMap[k]) return bad('SETTINGS_INVALID', `Khóa tài khoản không có trong cấu hình: ${k}`);
      const c = String(code || '').trim();
      if (c.length > 30) return bad('SETTINGS_INVALID', 'Mã tài khoản tối đa 30 ký tự');
      if (c) next[k] = c;
    }
    fin.settings.accountMap = next;
  }
  return good({ settings: financeSettings(db, cfg) });
}

// ---------------------------------------------------------------------------------------------
// Sổ Fresh Credit: dựng bút lịch sử cho dữ liệu cũ

/**
 * Bù bút cho dữ liệu cũ / hạt giống mà số dư Fresh Credit có từ trước nhưng chưa có bút nạp (hạt giống đặt số dư thẳng).
 * Với mỗi khách, phần số dư thực lớn hơn số dư dựng từ sổ được ghi thành bút `topup` (tiền thật) và `topup_bonus` (khuyến mãi)
 * có cờ `backfill: true`, đặt trước bút đầu tiên của khách. Chạy một lần (đánh dấu `finance.backfilledAt`), không đổi DB_VERSION.
 */
export function supplementFinance(db, now) {
  const fin = ensureFinance(db);
  if (fin.backfilledAt) return false;
  const bal = balancesFromLedger(db.ledger);
  fin.backfillDrift = [];
  for (const c of db.customers) {
    const derived = bal[c.id] || { real: 0, promo: 0 };
    const mine = db.ledger.filter((l) => l.customerId === c.id).map((l) => l.at).sort();
    const sub = db.subscriptions.find((s) => s.customerId === c.id);
    const first = mine[0] || (sub && sub.createdAt) || now.toISOString();
    const at = new Date(Date.parse(first) - 1000).toISOString();
    const dReal = (c.credit.real || 0) - derived.real;
    const dPromo = (c.credit.promo || 0) - derived.promo;
    if (dReal > 0) db.ledger.push({ id: nextId(db, 'LED'), customerId: c.id, kind: 'topup', amountVnd: dReal, real: dReal, promo: 0, at, backfill: true, note: 'Số dư tiền thật có từ trước (dựng lại bút đầu kỳ)' });
    if (dPromo > 0) db.ledger.push({ id: nextId(db, 'LED'), customerId: c.id, kind: 'topup_bonus', amountVnd: dPromo, real: 0, promo: dPromo, at, backfill: true, note: 'Số dư khuyến mãi có từ trước (dựng lại bút đầu kỳ)' });
    if (dReal < 0 || dPromo < 0) fin.backfillDrift.push({ customerId: c.id, real: dReal, promo: dPromo });
  }
  fin.backfilledAt = now.toISOString();
  return true;
}

// ---------------------------------------------------------------------------------------------
// Đối soát ngân hàng (webhook mock)

/** Nhận một giao dịch ngân hàng. `txnId` là mã giao dịch của ngân hàng: gửi lại cùng mã không tạo giao dịch thứ hai. */
export function receiveBankTxn(db, { txnId, amountVnd, content, at, accountNo }, now) {
  const fin = ensureFinance(db);
  if (!(Number.isInteger(amountVnd) && amountVnd > 0)) return bad('TXN_INVALID', 'Số tiền giao dịch phải là số nguyên dương');
  if (txnId && fin.bankTxns.some((t) => t.txnId === txnId)) return good({ txn: fin.bankTxns.find((t) => t.txnId === txnId), duplicate: true });
  const taken = new Set(fin.bankTxns.filter((t) => t.status === 'matched' && t.ledgerId).map((t) => t.ledgerId));
  const m = matchBankTxn({ amountVnd, content }, expectedReceipts(db.ledger), taken);
  const id = fid(fin, 'BNK');
  const txn = {
    id,
    txnId: txnId || `FT${now.getTime()}${id.slice(-5)}`,
    amountVnd,
    content: String(content || ''),
    accountNo: accountNo || '',
    at: at || now.toISOString(),
    receivedAt: now.toISOString(),
    status: m.status,
    ledgerId: m.status === 'matched' ? m.ledgerId : null,
    suggestedLedgerId: m.status === 'amount_diff' ? m.ledgerId : null,
    reason: m.reason,
    matchedBy: m.status === 'matched' ? 'auto' : null
  };
  fin.bankTxns.push(txn);
  return good({ txn, duplicate: false });
}

/** Kế toán khớp tay một giao dịch trong hàng chờ với một khoản đang chờ tiền về. Lệch số tiền thì phải xác nhận và ghi lý do. */
export function manualMatch(db, { bankId, ledgerId, acceptDiff = false, note = '', by = '' }, now) {
  const fin = ensureFinance(db);
  const txn = fin.bankTxns.find((t) => t.id === bankId);
  if (!txn) return bad('TXN_NOT_FOUND', 'Không tìm thấy giao dịch');
  if (!['unmatched', 'amount_diff'].includes(txn.status)) return bad('TXN_STATE', 'Giao dịch này đã được xử lý');
  const exp = expectedReceipts(db.ledger).find((e) => e.ledgerId === ledgerId);
  if (!exp) return bad('LEDGER_NOT_FOUND', 'Không tìm thấy khoản đang chờ tiền về');
  if (fin.bankTxns.some((t) => t.status === 'matched' && t.ledgerId === ledgerId)) return bad('ALREADY_MATCHED', 'Khoản này đã có giao dịch khớp');
  if (exp.amountVnd !== txn.amountVnd) {
    if (!acceptDiff) return bad('AMOUNT_DIFF', `Số tiền lệch ${(txn.amountVnd - exp.amountVnd).toLocaleString('vi-VN')}đ. Xác nhận nếu vẫn muốn khớp.`, { diffVnd: txn.amountVnd - exp.amountVnd });
    if (!String(note).trim()) return bad('NOTE_REQUIRED', 'Khớp khi lệch số tiền thì phải ghi lý do');
  }
  txn.status = 'matched';
  txn.ledgerId = ledgerId;
  txn.matchedBy = 'manual';
  txn.matchedAt = now.toISOString();
  txn.matchedByRole = by;
  txn.note = String(note || '').trim();
  txn.diffVnd = txn.amountVnd - exp.amountVnd;
  return good({ txn });
}

export function ignoreBankTxn(db, { bankId, note = '', by = '' }, now) {
  const fin = ensureFinance(db);
  const txn = fin.bankTxns.find((t) => t.id === bankId);
  if (!txn) return bad('TXN_NOT_FOUND', 'Không tìm thấy giao dịch');
  if (!['unmatched', 'amount_diff'].includes(txn.status)) return bad('TXN_STATE', 'Giao dịch này đã được xử lý');
  if (!String(note).trim()) return bad('NOTE_REQUIRED', 'Loại giao dịch thì phải ghi lý do');
  txn.status = 'ignored';
  txn.note = String(note).trim();
  txn.matchedByRole = by;
  txn.matchedAt = now.toISOString();
  return good({ txn });
}

/** Mô phỏng tiền về cho một khoản đang chờ (hoặc giao dịch lạ khi không truyền `ledgerId`). */
export function simulateBankTransfer(db, { ledgerId = null, scenario = 'exact', amountVnd = null, content = null }, now) {
  const exp = ledgerId ? expectedReceipts(db.ledger).find((e) => e.ledgerId === ledgerId) : null;
  if (ledgerId && !exp) return bad('LEDGER_NOT_FOUND', 'Không tìm thấy khoản đang chờ tiền về');
  let t;
  if (exp) t = simulateTxn(exp, scenario);
  else t = { amountVnd: amountVnd || 300000, content: content || 'CHUYEN TIEN KHONG RO NOI DUNG' };
  return receiveBankTxn(db, { amountVnd: amountVnd || t.amountVnd, content: content != null ? content : t.content, accountNo: BUSINESS.finance.bank.accountNo }, now);
}

/** Trạng thái đối soát của từng khoản đang chờ tiền về. */
export function receiptsView(db) {
  const fin = ensureFinance(db);
  return expectedReceipts(db.ledger)
    .map((e) => {
      const txn = fin.bankTxns.find((t) => t.status === 'matched' && t.ledgerId === e.ledgerId);
      return { ...e, state: txn ? 'received' : 'waiting', bankId: txn ? txn.id : null, matchedBy: txn ? txn.matchedBy : null, diffVnd: txn ? txn.diffVnd || 0 : null };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------------------------------------
// Điều chỉnh Fresh Credit: kế toán đề nghị, admin duyệt

export function requestAdjustment(db, { customerId, bucket, deltaVnd, reason, by = 'accounting' }, now) {
  const fin = ensureFinance(db);
  const customer = db.customers.find((c) => c.id === customerId);
  const errors = validateAdjustment({ customerId, bucket, deltaVnd, reason }, customer);
  if (errors.length) return bad('ADJUST_INVALID', errors.join('; '), { errors });
  const adj = { id: fid(fin, 'ADJ'), customerId, bucket, deltaVnd, reason: String(reason).trim(), status: 'pending', requestedBy: by, requestedAt: now.toISOString() };
  fin.adjustments.push(adj);
  return good({ adjustment: adj });
}

/** Admin duyệt hoặc từ chối. Duyệt thì mới đổi số dư và ghi bút `adjustment`; không ai tự duyệt yêu cầu của mình. */
export function decideAdjustment(db, { id, approve, note = '', by = 'admin' }, now) {
  const fin = ensureFinance(db);
  const adj = fin.adjustments.find((a) => a.id === id);
  if (!adj) return bad('ADJUST_NOT_FOUND', 'Không tìm thấy yêu cầu điều chỉnh');
  if (adj.status !== 'pending') return bad('ADJUST_STATE', 'Yêu cầu này đã được xử lý');
  if (adj.requestedBy === by) return bad('SELF_APPROVE', 'Người đề nghị không được tự duyệt');
  const nowIso = now.toISOString();
  if (!approve) {
    Object.assign(adj, { status: 'rejected', decidedBy: by, decidedAt: nowIso, decisionNote: String(note).trim() });
    return good({ adjustment: adj });
  }
  const customer = db.customers.find((c) => c.id === adj.customerId);
  const errors = validateAdjustment(adj, customer);
  if (errors.length) return bad('ADJUST_INVALID', errors.join('; '), { errors });
  customer.credit = { ...customer.credit, [adj.bucket]: customer.credit[adj.bucket] + adj.deltaVnd };
  const entry = {
    id: nextId(db, 'LED'), customerId: customer.id, kind: 'adjustment', amountVnd: Math.abs(adj.deltaVnd),
    real: adj.bucket === 'real' ? adj.deltaVnd : 0, promo: adj.bucket === 'promo' ? adj.deltaVnd : 0, at: nowIso,
    note: adj.reason, approvedBy: by, adjustmentId: adj.id
  };
  db.ledger.push(entry);
  Object.assign(adj, { status: 'approved', decidedBy: by, decidedAt: nowIso, decisionNote: String(note).trim(), ledgerId: entry.id });
  return good({ adjustment: adj, entry });
}

// ---------------------------------------------------------------------------------------------
// Ngữ cảnh tính toán từ db (đọc)

/** Dựng một lần mọi thứ các báo cáo cần: môi trường giá vốn, doanh thu đã ghi nhận, margin, bút toán. Chỉ đọc. */
export function financeContext(db, cfg = BUSINESS) {
  const settings = financeSettings(db, cfg);
  const dayCache = {};
  const env = buildCostEnv(db, cfg, {
    fallbackDayCost: (day) => {
      if (!(day in dayCache)) {
        try {
          dayCache[day] = dayCost(db, day, cfg);
        } catch {
          dayCache[day] = null;
        }
      }
      return dayCache[day];
    }
  });
  const costCache = new Map();
  const orderById = new Map(db.orders.map((o) => [o.id, o]));
  const costOfOrder = (order) => {
    if (!costCache.has(order.id)) costCache.set(order.id, boxCost(order, env));
    return costCache.get(order.id);
  };
  const revenueRows = recognizeRevenue(
    { orders: db.orders, fundingOf: (o) => paidFromOf(db, o), mixOf: (o) => costOfOrder(o).byTaxGroup },
    cfg,
    settings.promoTreatment
  );
  const costOf = (row) => costOfOrder(orderById.get(row.orderId));
  const margins = marginRows(revenueRows, costOf);
  return { settings, env, revenueRows, margins, costOf, orderById };
}

/** Nguồn dữ liệu cho `buildJournal`. */
export function journalSource(db, ctx) {
  const proc = ensureProcurement(db);
  return {
    ledger: db.ledger,
    revenueRows: ctx.revenueRows,
    costOf: ctx.costOf,
    matchedPos: db.purchaseOrders.filter((po) => po.matchedAt && po.payableVnd != null).map((po) => ({ po, matchedAt: po.matchedAt })),
    payments: proc.payments,
    purchases: proc.purchases
  };
}

// ---------------------------------------------------------------------------------------------
// Hóa đơn điện tử (lớp tích hợp mock)

const lookupCodeOf = (id) => Math.abs(hash(`mova-einvoice-${id}`)).toString(36).toUpperCase().padStart(8, '0').slice(0, 8);

/**
 * Xuất các hóa đơn còn thiếu theo thời điểm xuất đang cấu hình (`invoicing.issueOn`, đổi ở Cài đặt khi chưa có hóa đơn nào).
 * Idempotent: chạy lại không xuất trùng. Gọi từ job định kỳ và khi đơn chuyển sang đã giao.
 */
export function issueDueInvoices(db, now, cfg = BUSINESS) {
  if (!db.finance) return [];
  const fin = ensureFinance(db);
  const settings = financeSettings(db, cfg);
  const ctx = financeContext(db, cfg);
  const drafts = planEinvoices({ revenueRows: ctx.revenueRows, ledger: db.ledger, existing: fin.einvoices }, settings.issueOn, cfg);
  const issued = [];
  for (const d of drafts) {
    const id = fid(fin, 'INV');
    const inv = {
      id,
      number: `C26MFR-${String(fin.seq.INV).padStart(7, '0')}`,
      series: 'C26MFR',
      ...d,
      issuedAt: now.toISOString(),
      status: 'issued',
      provider: 'mock-einvoice',
      lookupCode: lookupCodeOf(id)
    };
    fin.einvoices.push(inv);
    issued.push(inv);
  }
  return issued;
}

/** Dự kiến tiền vào từ gia hạn: gói sắp hết chu kỳ, nhân tỷ lệ gia hạn. */
export function renewalForecast(db, today, cfg = BUSINESS) {
  const out = [];
  const live = ['scheduled', 'paid', 'charge_failed', 'locked', 'in_production', 'shipped'];
  for (const sub of db.subscriptions) {
    if (sub.status !== 'active') continue;
    const orders = db.orders.filter((o) => o.subscriptionId === sub.id && live.includes(o.status));
    const weeks = [...new Set(orders.map((o) => o.weekIndex))];
    if (!orders.length || weeks.length > cfg.subscription.renewPromptAtRemainingWeeks) continue;
    const last = orders.reduce((m, o) => (o.deliveryDay > m ? o.deliveryDay : m), '0000-00-00');
    const all = db.orders.filter((o) => o.subscriptionId === sub.id && !['cancelled', 'postponed', 'skipped_unpaid'].includes(o.status));
    const perCycle = all.reduce((s, o) => s + o.amountVnd, 0) / Math.max(1, new Set(all.map((o) => o.weekIndex)).size) * cfg.subscription.defaultWeeks;
    out.push({ subscriptionId: sub.id, customerId: sub.customerId, day: last < today ? today : last, amountVnd: Math.round(perCycle * cfg.finance.cashflow.renewalRate) });
  }
  return out;
}

