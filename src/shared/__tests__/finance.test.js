import { describe, it, expect } from 'vitest';
import { createServer } from '../mock-server/server';
import { createMemoryStorage } from '../mock-server/storage';
import { createApi, ForbiddenError } from '../api';
import { BUSINESS } from '../config/business';
import { DISHES, SKUS } from '../data/catalog';
import { atDay } from '../utils/time';
import { spendCredit } from '../domain/credit';
import { creditEffect, creditTotals, spendBreakdown } from '../domain/financeCredit';
import { expectedReceipts, matchBankTxn } from '../domain/financeBank';
import { agingBucketOf, cashflowForecast, cashPaymentCheck, coverageRatio, payablesAging } from '../domain/financePayables';
import { marginReport, planEinvoices, recognizeRevenue, vatSplit, weekStartOf } from '../domain/financeRevenue';
import { buildJournal, journalCsv, journalTotals } from '../domain/financeJournal';
import { supplierScorecard } from '../domain/scorecard';
import { financeContext } from '../domain/financeOps';
import { aggregateBom } from '../domain/bom';

const START = '2026-11-20T09:00:00+07:00'; // Thứ Sáu
const admin = { role: 'admin' };
const accounting = { role: 'accounting' };
const CREDIT_OK = 'C-0001'; // Fresh Credit, đủ số dư cho cả gói

function setup(cfg = BUSINESS) {
  const server = createServer({ storage: createMemoryStorage(), startAt: START, running: false, cfg });
  return { server, api: createApi(server) };
}

/** Chốt sổ ngày giao đầu tiên rồi trả về các đơn đã khóa. */
function lockFirstDay(server, api) {
  api.demo.jumpTo(admin, 'cutoff');
  return server.read((db) => db.orders.filter((o) => o.status === 'locked'));
}

function deliver(api, orderId) {
  for (const status of ['in_production', 'shipped', 'delivered']) api.ops.setOrderStatus(admin, { orderId, status });
}

const dbOf = (server) => server.read((db) => db);

// ---------------------------------------------------------------------------------------------
describe('Fresh Credit hai ngăn: trừ điểm', () => {
  it('trừ tiền thật trước, khuyến mãi sau (thứ tự cấu hình), và đổi thứ tự thì trừ khuyến mãi trước', () => {
    const bal = { real: 300000, promo: 100000 };
    expect(BUSINESS.credit.spendOrder).toEqual(['real', 'promo']);
    expect(spendCredit(bal, 350000, ['real', 'promo']).used).toEqual({ real: 300000, promo: 50000 });
    expect(spendCredit(bal, 350000, ['promo', 'real']).used).toEqual({ real: 250000, promo: 100000 });
    expect(spendBreakdown(bal, 350000).used).toEqual({ real: 300000, promo: 50000 });
    expect(spendBreakdown(bal, 450000)).toMatchObject({ ok: false, shortVnd: 50000 });
  });

  it('lần trừ D-3 ghi bút đúng hai ngăn và số dư dựng từ sổ luôn bằng số dư của khách', () => {
    const { server, api } = setup();
    const before = dbOf(server);
    expect(creditTotals(before.customers, before.ledger).drift).toEqual([]);
    api.demo.jumpTo(admin, 'charge');
    const db = dbOf(server);
    const spends = db.ledger.filter((l) => l.kind === 'credit_spend');
    expect(spends.length).toBeGreaterThan(0);
    for (const l of spends) {
      expect(l.real + l.promo).toBe(l.amountVnd);
      expect(creditEffect(l)).toEqual({ real: -l.real, promo: -l.promo });
    }
    expect(creditTotals(db.customers, db.ledger).drift).toEqual([]);
  });

  it('khách nạp 1.500.000 nhận 1.650.000: tiền thật vào ngăn real, thưởng nạp 10% vào ngăn promo, đều có bút riêng', () => {
    const { server, api } = setup();
    const was = server.read((db) => ({ ...db.customers.find((c) => c.id === CREDIT_OK).credit }));
    const r = api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' });
    expect(r.data.pay_vnd).toBe(1500000);
    expect(r.data.bonus_vnd).toBe(150000);
    expect(r.data.credit_received_vnd).toBe(1650000);
    const db = dbOf(server);
    const mine = db.ledger.filter((l) => l.customerId === CREDIT_OK);
    expect(mine.find((l) => l.kind === 'topup' && l.amountVnd === 1500000)).toMatchObject({ real: 1500000, promo: 0 });
    expect(mine.find((l) => l.kind === 'topup_bonus' && l.amountVnd === 150000)).toMatchObject({ real: 0, promo: 150000 });
    const now = db.customers.find((c) => c.id === CREDIT_OK).credit;
    expect(now.real).toBe(was.real + 1500000);
    expect(now.promo).toBe(was.promo + 150000);
    expect(creditTotals(db.customers, db.ledger).drift).toEqual([]);
  });
});

describe('Fresh Credit: hoàn khi dừng gói chỉ phần tiền thật', () => {
  it('hoàn đúng phần tiền thật chưa dùng, khuyến mãi bị thu hồi, sổ cân về 0 và tiền mặt giảm đúng số hoàn', () => {
    const { server, api } = setup();
    api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' });
    const covBefore = api.ops.finance.cashflow(accounting);
    const res = api.customer.cancelSubscription({ customer_id: CREDIT_OK, confirm: true });
    expect(res.status).toBe('success');
    const db = dbOf(server);
    const refund = db.ledger.find((l) => l.kind === 'cancel_refund' && l.customerId === CREDIT_OK);
    expect(refund.real).toBe(res.data.refund_vnd);
    expect(refund.promo).toBe(0);
    const forfeit = db.ledger.find((l) => l.kind === 'promo_forfeit' && l.customerId === CREDIT_OK);
    expect(forfeit.promo).toBe(res.data.forfeited_promo_vnd);
    expect(forfeit.real).toBe(0);
    expect(db.customers.find((c) => c.id === CREDIT_OK).credit).toEqual({ real: 0, promo: 0 });
    expect(creditTotals(db.customers, db.ledger).drift).toEqual([]);
    const covAfter = api.ops.finance.cashflow(accounting);
    expect(covBefore.position.cashVnd - covAfter.position.cashVnd).toBe(res.data.refund_vnd);
    // Tuần đã trừ tiền chưa giao được trả về Fresh Credit rồi mới hoàn: phần đó vốn đã nằm trong nợ nên nợ chỉ giảm số dư cũ
    const reversedReal = db.ledger.filter((l) => l.kind === 'order_refund' && l.customerId === CREDIT_OK).reduce((s, l) => s + l.real, 0);
    expect(covBefore.totals.liabilityRealVnd - covAfter.totals.liabilityRealVnd).toBe(res.data.refund_vnd - reversedReal);
  });
});

// ---------------------------------------------------------------------------------------------
describe('doanh thu chỉ ghi khi đơn đã giao, theo phần tiền thật đã dùng', () => {
  it('hàm thuần: đơn chưa giao, đã hủy, đang giao không có dòng doanh thu', () => {
    const mk = (id, status, extra = {}) => ({ id, customerId: 'C-1', status, deliveredAt: status === 'delivered' ? '2026-11-23T12:00:00.000Z' : undefined, amountVnd: 400000, listPriceVnd: 450000, discountVnd: 50000, weekIndex: 0, householdSize: 2, zoneId: 'Z1', deliveryDay: '2026-11-23', paymentMethod: 'fresh_credit', ...extra });
    const orders = ['paid', 'locked', 'in_production', 'shipped', 'cancelled', 'postponed', 'skipped_unpaid', 'delivered'].map((s) => mk(`O-${s}`, s));
    const rows = recognizeRevenue({ orders, fundingOf: () => ({ real: 300000, promo: 100000 }), mixOf: () => ({ processed: 1 }) });
    expect(rows.map((r) => r.orderId)).toEqual(['O-delivered']);
    expect(rows[0]).toMatchObject({ realVnd: 300000, promoVnd: 100000, firstCycle: true });
    // net: chỉ tiền thật; gross: cộng cả phần khuyến mãi vào doanh thu tính margin
    expect(rows[0].netRevenueVnd + rows[0].vatVnd).toBe(300000);
    expect(rows[0].marginRevenueVnd).toBe(rows[0].netRevenueVnd);
    const gross = recognizeRevenue({ orders, fundingOf: () => ({ real: 300000, promo: 100000 }), mixOf: () => ({ processed: 1 }) }, BUSINESS, 'gross');
    expect(gross[0].marginRevenueVnd).toBe(gross[0].netRevenueVnd + 100000);
  });

  it('qua API: trước khi giao không có doanh thu; giao xong có đúng một dòng, bằng phần tiền thật đã dùng', () => {
    const { server, api } = setup();
    const locked = lockFirstDay(server, api);
    expect(locked.length).toBeGreaterThan(0);
    expect(api.ops.finance.revenue(accounting).rows).toHaveLength(0);
    expect(api.ops.finance.revenue(accounting).deferred.realVnd).toBeGreaterThan(0);

    // Đặt một đơn đã trả bằng 100.000đ tiền thật + phần còn lại là khuyến mãi
    const target = locked[0];
    server.write((db) => {
      const o = db.orders.find((x) => x.id === target.id);
      o.paidFrom = { real: 100000, promo: o.amountVnd - 100000 };
    });
    deliver(api, target.id);
    const rev = api.ops.finance.revenue(accounting);
    expect(rev.rows).toHaveLength(1);
    expect(rev.rows[0]).toMatchObject({ orderId: target.id, realVnd: 100000, promoVnd: target.amountVnd - 100000 });
    expect(rev.totals.realVnd).toBe(100000);
    expect(rev.rows[0].netRevenueVnd + rev.rows[0].vatVnd).toBe(100000);
  });

  it('tách VAT khỏi số tiền đã gồm VAT theo nhóm hàng và đánh dấu chưa xác nhận; thuế suất null coi như 0', () => {
    const cfg = { ...BUSINESS, tax: { groups: { processed: { rate: 0.08, confirmed: true }, fresh: { rate: null, confirmed: false } } } };
    const r = vatSplit(1080000, { processed: 1 }, cfg);
    expect(r).toMatchObject({ vatVnd: 80000, netVnd: 1000000, unconfirmed: false });
    const mixed = vatSplit(1000000, { processed: 1, fresh: 1 }, cfg);
    expect(mixed.vatVnd).toBe(Math.round(500000 - 500000 / 1.08));
    expect(mixed.unconfirmed).toBe(true);
    expect(vatSplit(500000, { fresh: 1 }, cfg).vatVnd).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
describe('tuổi nợ phải trả: chưa đến hạn / 1–7 / 8–15 / 16–30 / >30 ngày quá hạn', () => {
  const TODAY = '2026-11-20';
  const due = (day) => atDay(day, 17, 0).toISOString();
  const row = (poId, day, amount) => ({ poId, supplierId: 'S-FACTORY', supplierName: 'X', status: 'matched', dueAt: due(day), payableVnd: amount, invoiceNumber: `HD-${poId}`, claimVnd: 0 });

  it('ranh giới từng nhóm', () => {
    const edges = [[1, 'd1'], [7, 'd1'], [8, 'd2'], [15, 'd2'], [16, 'd3'], [30, 'd3'], [31, 'd4'], [0, 'not_due'], [-5, 'not_due']];
    for (const [days, bucket] of edges) expect(agingBucketOf(days)).toBe(bucket);
  });

  it('tổng hợp theo nhóm; chỉ tính khoản đã đối chiếu mà chưa trả', () => {
    const rows = [
      row('A', '2026-11-25', 100), row('B', '2026-11-20', 200), row('C', '2026-11-19', 300), row('D', '2026-11-13', 400),
      row('E', '2026-11-12', 500), row('F', '2026-11-05', 600), row('G', '2026-11-04', 700), row('H', '2026-10-21', 800), row('I', '2026-10-20', 900),
      { ...row('J', '2026-10-01', 5000), status: 'paid' }, { ...row('K', '2026-10-01', 6000), status: 'invoiced' }
    ];
    const a = payablesAging(rows, TODAY);
    const by = Object.fromEntries(a.buckets.map((b) => [b.id, b]));
    expect(by.not_due).toMatchObject({ amountVnd: 300, count: 2 });
    expect(by.d1).toMatchObject({ amountVnd: 700, count: 2 });
    expect(by.d2).toMatchObject({ amountVnd: 1100, count: 2 });
    expect(by.d3).toMatchObject({ amountVnd: 1500, count: 2 });
    expect(by.d4).toMatchObject({ amountVnd: 900, count: 1 });
    expect(a.totalVnd).toBe(4500);
    expect(a.overdueVnd).toBe(4200);
    expect(a.buckets.map((b) => b.label)).toEqual(['Chưa đến hạn', 'Quá hạn 1–7 ngày', 'Quá hạn 8–15 ngày', 'Quá hạn 16–30 ngày', 'Quá hạn trên 30 ngày']);
  });

  it('qua API trên dữ liệu mẫu: PO đã đối chiếu quá hạn vào đúng nhóm; đề xuất đợt chi lấy khoản quá hạn / sắp đến hạn', () => {
    const { api } = setup();
    const p = api.ops.finance.payables(accounting);
    const overdue = p.aging.items.filter((i) => i.daysOverdue > 0);
    expect(overdue.length).toBeGreaterThan(0);
    for (const i of p.aging.items) expect(i.bucket).toBe(agingBucketOf(i.daysOverdue));
    expect(p.payRun.items.every((i) => i.daysOverdue >= -BUSINESS.finance.payRun.leadDays)).toBe(true);
    expect(p.payRun.items.map((i) => i.poId)).toEqual(overdue.filter((i) => i.daysOverdue >= 0).map((i) => i.poId).concat(p.payRun.items.filter((i) => i.daysOverdue < 0).map((i) => i.poId)));
  });

  it('chi tiền mặt từ ngưỡng 5 triệu bị cảnh báo và chặn; chuyển khoản thì qua; file chi (mock) có đủ dòng', () => {
    const limit = BUSINESS.alerts.cashPaymentVatLimitVnd;
    expect(cashPaymentCheck(limit - 1, 'cash')).toMatchObject({ ok: true, warn: false });
    expect(cashPaymentCheck(limit, 'cash')).toMatchObject({ ok: false, warn: true });
    expect(cashPaymentCheck(limit * 3, 'bank_transfer').ok).toBe(true);

    const { api, server } = setup();
    const run = api.ops.finance.payables(accounting).payRun;
    const big = run.items.find((i) => i.amountVnd >= limit);
    expect(big).toBeTruthy();
    const file = api.ops.finance.payRunFile(accounting, { poIds: [big.poId] });
    expect(file.csv).toContain(big.poId);
    expect(file.count).toBe(1);
    const cash = api.ops.finance.executePayRun(accounting, { poIds: [big.poId], method: 'cash' });
    expect(cash.paid).toBe(0);
    expect(cash.results[0]).toMatchObject({ ok: false, code: 'CASH_OVER_LIMIT' });
    expect(cash.results[0].message).toMatch(/VAT/);
    const bank = api.ops.finance.executePayRun(accounting, { poIds: [big.poId], method: 'bank_transfer' });
    expect(bank.paid).toBe(1);
    expect(server.read((db) => db.purchaseOrders.find((p) => p.id === big.poId).status)).toBe('paid');
    expect(api.ops.finance.payables(accounting).payRun.items.some((i) => i.poId === big.poId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
describe('CSV bút toán cân Nợ = Có', () => {
  const parse = (csv) => csv.replace(/^﻿/, '').trim().split(/\r\n/).slice(1).map((l) => {
    const cells = [];
    let cur = '';
    let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { cells.push(cur); cur = ''; } else cur += ch;
    }
    cells.push(cur);
    return cells;
  });

  function busyDay(cfg) {
    const { server, api } = setup(cfg);
    api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' });
    const locked = lockFirstDay(server, api);
    server.write((db) => {
      const o = db.orders.find((x) => x.id === locked[0].id);
      o.paidFrom = { real: Math.round(o.amountVnd * 0.6), promo: o.amountVnd - Math.round(o.amountVnd * 0.6) };
    });
    for (const o of locked.slice(0, 5)) deliver(api, o.id);
    api.customer.cancelSubscription({ customer_id: 'C-0005', confirm: true });
    const p = api.ops.finance.payables(accounting).payRun.items[0];
    if (p) api.ops.finance.executePayRun(accounting, { poIds: [p.poId], method: 'bank_transfer' });
    return { server, api };
  }

  it('mọi chứng từ cân và tổng Nợ = tổng Có (net); CSV cộng lại cũng cân', () => {
    const { api } = busyDay(BUSINESS);
    const j = api.ops.finance.journal(accounting);
    expect(j.entries.length).toBeGreaterThan(10);
    expect(j.totals.balanced).toBe(true);
    expect(j.totals.debitVnd).toBe(j.totals.creditVnd);
    expect(j.totals.unbalanced).toEqual([]);
    const groups = new Set(j.entries.map((e) => e.group));
    for (const g of ['topup', 'revenue', 'cogs', 'refund', 'supplier_invoice', 'payment', 'statement']) expect(groups.has(g)).toBe(true);
    expect(groups.has('promo')).toBe(false); // net: khuyến mãi dùng không hạch toán doanh thu

    const file = api.ops.finance.journalCsv(accounting);
    const rows = parse(file.csv);
    const dr = rows.reduce((s, r) => s + Number(r[6]), 0);
    const cr = rows.reduce((s, r) => s + Number(r[7]), 0);
    expect(dr).toBe(cr);
    expect(dr).toBe(j.totals.debitVnd);
    // mỗi chứng từ cân trong CSV
    const per = {};
    for (const r of rows) { per[r[1]] = (per[r[1]] || 0) + Number(r[6]) - Number(r[7]); }
    expect(Object.values(per).every((v) => v === 0)).toBe(true);
    // Chưa ánh xạ tài khoản: cột mã ghi ?khóa, không có số tài khoản viết cứng
    expect(file.unmapped).toContain('revenue');
    expect(rows.some((r) => r[4] === '?revenue')).toBe(true);
  });

  it('gộp theo ngày / nhóm bút toán; cách xử lý khuyến mãi "gross" tách một bút toán riêng và vẫn cân', () => {
    const cfg = { ...BUSINESS, finance: { ...BUSINESS.finance, promoTreatment: 'gross' } };
    const { api, server } = busyDay(cfg);
    const j = api.ops.finance.journal(accounting);
    expect(j.totals.balanced).toBe(true);
    const promo = j.entries.filter((e) => e.group === 'promo');
    expect(promo.length).toBeGreaterThan(0);
    for (const e of promo) expect(e.lines.map((l) => l.account).sort()).toEqual(['promo_expense', 'revenue_promo']);
    const day = j.entries.find((e) => e.group === 'revenue').date;
    const one = api.ops.finance.journal(accounting, { from: day, to: day, groups: ['revenue'] });
    expect(one.entries.every((e) => e.date === day && e.group === 'revenue')).toBe(true);
    expect(one.totals.balanced).toBe(true);
    // Mã tài khoản kế toán nhập thì CSV dùng mã đó
    api.ops.finance.saveSettings(accounting, { accountMap: { revenue: '5111', cash_bank: '1121' } });
    const csv = api.ops.finance.journalCsv(accounting, { groups: ['revenue'] }).csv;
    expect(csv).toContain('5111');
    expect(server.read((db) => db.finance.settings.accountMap.revenue)).toBe('5111');
  });

  it('hàm thuần journalCsv / journalTotals giữ nguyên số cân', () => {
    const entries = [{ id: 'BT-1', date: '2026-11-20', at: '2026-11-20T00:00:00Z', group: 'topup', ref: 'X', memo: 'a, "b"', objectId: 'C-1', lines: [{ account: 'cash_bank', dr: 10, cr: 0 }, { account: 'customer_prepaid', dr: 0, cr: 10 }] }];
    expect(journalTotals(entries).balanced).toBe(true);
    expect(journalTotals([{ ...entries[0], lines: [{ account: 'cash_bank', dr: 10, cr: 0 }] }]).balanced).toBe(false);
    expect(journalCsv(entries, { cash_bank: { label: 'Ngân hàng', code: '' }, customer_prepaid: { label: 'KH', code: '99' } })).toContain('"a, ""b"""');
  });
});

// ---------------------------------------------------------------------------------------------
describe('đối soát VietQR: tự khớp theo mã trong nội dung chuyển khoản', () => {
  const ledger = [
    { id: 'LED-1', customerId: 'C-1', kind: 'topup', real: 1500000, amountVnd: 1500000, ref: 'NAP00001', at: '2026-11-20T01:00:00Z' },
    { id: 'LED-2', customerId: 'C-2', kind: 'prepaid_cycle', real: 2000000, amountVnd: 2000000, ref: 'MOVA3F2A9C', at: '2026-11-20T02:00:00Z' },
    { id: 'LED-3', customerId: 'C-3', kind: 'topup', real: 999, amountVnd: 999, at: '2026-11-20T03:00:00Z' },
    { id: 'LED-4', customerId: 'C-4', kind: 'topup', real: 777, amountVnd: 777, ref: 'NAP00009', backfill: true, at: '2026-11-20T03:00:00Z' }
  ];

  it('chỉ các bút nạp / trả trọn gói có mã đối soát mới chờ tiền về', () => {
    expect(expectedReceipts(ledger).map((e) => e.ledgerId)).toEqual(['LED-1', 'LED-2']);
  });

  it('khớp mã dù ngân hàng bỏ dấu cách và viết hoa thường; lệch số tiền và không có mã vào hàng chờ', () => {
    const exp = expectedReceipts(ledger);
    expect(matchBankTxn({ amountVnd: 1500000, content: 'nap00001 chuyen tien' }, exp)).toMatchObject({ status: 'matched', ledgerId: 'LED-1' });
    expect(matchBankTxn({ amountVnd: 2000000, content: 'MOVA 3F2A9C Nguyen Van A' }, exp)).toMatchObject({ status: 'matched', ledgerId: 'LED-2' });
    expect(matchBankTxn({ amountVnd: 1400000, content: 'NAP00001' }, exp)).toMatchObject({ status: 'amount_diff', ledgerId: 'LED-1' });
    expect(matchBankTxn({ amountVnd: 1500000, content: 'tien an uong' }, exp)).toMatchObject({ status: 'unmatched', ledgerId: null });
    expect(matchBankTxn({ amountVnd: 1500000, content: 'NAP00001' }, exp, new Set(['LED-1']))).toMatchObject({ status: 'unmatched' });
  });

  it('webhook mock: khớp tự động, hàng chờ khớp tay, khớp tay (lệch tiền cần lý do), gửi lại cùng mã giao dịch không tạo trùng', () => {
    const { api, server } = setup();
    api.customer.topUpCredit({ customer_id: 'C-0001', pack_id: 'standard' });
    api.customer.topUpCredit({ customer_id: 'C-0002', pack_id: 'family' });
    api.customer.topUpCredit({ customer_id: 'C-0003', pack_id: 'premium' });
    let rec = api.ops.finance.reconciliation(accounting);
    expect(rec.waiting).toHaveLength(3);
    const [a, b, c] = rec.waiting.slice().sort((x, y) => x.amountVnd - y.amountVnd);

    const t1 = api.ops.finance.mockBankTransfer(accounting, { ledgerId: a.ledgerId, scenario: 'exact' });
    expect(t1).toMatchObject({ status: 'matched', matchedBy: 'auto', ledgerId: a.ledgerId });
    const t2 = api.ops.finance.mockBankTransfer(accounting, { ledgerId: b.ledgerId, scenario: 'wrong_content' });
    expect(t2).toMatchObject({ status: 'unmatched', ledgerId: null });
    const t3 = api.ops.finance.mockBankTransfer(accounting, { ledgerId: c.ledgerId, scenario: 'wrong_amount' });
    expect(t3.status).toBe('amount_diff');
    expect(t3.suggestedLedgerId).toBe(c.ledgerId);

    rec = api.ops.finance.reconciliation(accounting);
    expect(rec.totals).toMatchObject({ received: 1, autoMatched: 1, queue: 2 });
    expect(rec.queue.map((q) => q.status).sort()).toEqual(['amount_diff', 'unmatched']);
    expect(rec.waiting.map((w) => w.ledgerId).sort()).toEqual([b.ledgerId, c.ledgerId].sort());

    // Khớp tay giao dịch không có mã
    const m2 = api.ops.finance.manualMatch(accounting, { bankId: t2.id, ledgerId: b.ledgerId });
    expect(m2).toMatchObject({ status: 'matched', matchedBy: 'manual' });
    // Lệch số tiền: phải xác nhận rồi ghi lý do
    expect(() => api.ops.finance.manualMatch(accounting, { bankId: t3.id, ledgerId: c.ledgerId })).toThrow(/lệch/);
    expect(() => api.ops.finance.manualMatch(accounting, { bankId: t3.id, ledgerId: c.ledgerId, acceptDiff: true })).toThrow(/lý do/);
    const m3 = api.ops.finance.manualMatch(accounting, { bankId: t3.id, ledgerId: c.ledgerId, acceptDiff: true, note: 'Khách chuyển thiếu, bù sau' });
    expect(m3.diffVnd).toBe(-50000);
    expect(api.ops.finance.reconciliation(accounting).totals).toMatchObject({ queue: 0, waitingVnd: 0 });

    // Gửi lại cùng mã giao dịch ngân hàng: không tạo giao dịch thứ hai
    const w1 = api.ops.finance.bankWebhook(accounting, { txnId: 'FT-1', amountVnd: 123000, content: 'khong ro' });
    const w2 = api.ops.finance.bankWebhook(accounting, { txnId: 'FT-1', amountVnd: 123000, content: 'khong ro' });
    expect(w2.duplicate).toBe(true);
    expect(server.read((db) => db.finance.bankTxns.filter((t) => t.txnId === 'FT-1'))).toHaveLength(1);
    expect(w1.txn.status).toBe('unmatched');
    expect(api.ops.finance.ignoreBankTxn(accounting, { bankId: w1.txn.id, note: 'Tiền của đối tác khác' }).status).toBe('ignored');
  });

  it('thẻ: lần trừ thành công kèm phí cổng và ngày tiền về, lần thất bại có lý do', () => {
    const { api } = setup();
    api.demo.setNow(admin, new Date(Date.parse(START) + 26 * 86400000));
    const { cards } = api.ops.finance.reconciliation(accounting);
    expect(cards.success.length).toBeGreaterThan(0);
    for (const s of cards.success) {
      expect(s.feeVnd).toBe(Math.round(s.amountVnd * BUSINESS.finance.card.feePct + BUSINESS.finance.card.feeFixedVnd));
      expect(s.netVnd).toBe(s.amountVnd - s.feeVnd);
      expect(Date.parse(s.settleAt) - Date.parse(s.at)).toBe(BUSINESS.finance.card.settleDays * 86400000);
    }
    expect(cards.failed.length).toBeGreaterThan(0); // hạt giống có một khách thẻ bị từ chối
    expect(cards.failed[0].reason).toBe('Thẻ bị từ chối');
  });
});

// ---------------------------------------------------------------------------------------------
describe('giá vốn và margin', () => {
  it('giá vốn một thùng = SKU x giá PO + bao bì + xốt + logistics phân bổ', () => {
    const { server, api } = setup();
    const locked = lockFirstDay(server, api);
    const target = locked[0];
    deliver(api, target.id);
    const day = target.deliveryDay;
    const db = dbOf(server);
    const fc = financeContext(db, BUSINESS);
    const c = fc.costOf({ orderId: target.id });
    // Tự tính lại độc lập
    const bom = aggregateBom([db.orders.find((o) => o.id === target.id)], DISHES);
    let sku = 0;
    // Hàng để lâu đã trừ tồn kho nên có thể không có dòng PO: khi đó lấy giá bảng giá hiện hành (= giá danh mục trong dữ liệu mẫu)
    const poPrice = (id) => {
      const po = db.purchaseOrders.find((p) => p.deliveryDay === day && p.lines.some((l) => l.sku === id));
      return po ? po.lines.find((l) => l.sku === id).unitPriceVnd : SKUS[id].priceVnd;
    };
    for (const [id, grams] of Object.entries(bom.skuGrams)) {
      const price = poPrice(id);
      sku += (grams / 1000 / SKUS[id].yield) * (1 + BUSINESS.purchasing.wasteBufferPct) * price;
    }
    expect(c.skuVnd).toBe(Math.round(sku));
    expect(c.packagingVnd).toBe(poPrice('BB-THUNG-01'));
    let expectedSauce = 0;
    if (typeof BUSINESS.finance.sauceCostPerPackVnd === 'object' && BUSINESS.finance.sauceCostPerPackVnd !== null) {
      for (const [sCode, count] of Object.entries(bom.sauces)) {
        expectedSauce += count * (BUSINESS.finance.sauceCostPerPackVnd[sCode] || 4500);
      }
    } else {
      expectedSauce = c.saucePacks * BUSINESS.finance.sauceCostPerPackVnd;
    }
    expect(c.sauceVnd).toBe(expectedSauce);
    const lc = db.logisticsCosts.find((x) => x.day === day);
    expect(c.logisticsVnd).toBe(lc ? lc.perBoxVnd : c.logisticsVnd);
    expect(c.totalVnd).toBe(c.skuVnd + c.packagingVnd + c.sauceVnd + c.logisticsVnd);
    const detail = api.ops.finance.boxCost(accounting, target.id);
    expect(detail.cost.totalVnd).toBe(c.totalVnd);
  });

  it('chu kỳ đầu tách riêng như chi phí kéo khách; không vào cảnh báo margin của các tuần sau', () => {
    const { server, api } = setup();
    const locked = lockFirstDay(server, api);
    for (const o of locked.slice(0, 3)) deliver(api, o.id);
    const m = api.ops.finance.margins(accounting);
    expect(m.boxes).toHaveLength(3);
    expect(m.boxes.every((b) => b.firstCycle)).toBe(true);
    expect(m.weeks).toHaveLength(0);
    expect(m.firstCycle.boxes).toBe(3);
    expect(m.firstCycle.acquisitionCostVnd).toBe(m.firstCycle.giftVnd + m.firstCycle.promoUsedVnd);
    expect(m.alerts).toEqual([]);
  });

  it('margin theo tuần / loại gói / khu và cảnh báo dưới ngưỡng', () => {
    const mk = (orderId, deliveryDay, zoneId, planType, rev, cogs, firstCycle = false) => ({
      orderId, deliveryDay, zoneId, planType, firstCycle, marginRevenueVnd: rev, cogsVnd: cogs, marginVnd: rev - cogs, marginPct: (rev - cogs) / rev, giftVnd: 0, promoVnd: 0,
      cost: { materialsVnd: cogs - 20000, logisticsVnd: 20000, logisticsEstimated: false }
    });
    const rows = [
      mk('A', '2026-11-23', 'Z1', 'solo', 100000, 60000), // 40%
      mk('B', '2026-11-24', 'Z1', 'family', 100000, 90000), // 10% -> cảnh báo
      mk('C', '2026-11-30', 'Z2', 'family', 200000, 120000), // 40%
      mk('D', '2026-11-30', 'Z2', 'solo', 100000, 150000, true) // chu kỳ đầu, âm
    ];
    const r = marginReport(rows, BUSINESS, (id) => `Khu ${id}`);
    expect(weekStartOf('2026-11-24')).toBe('2026-11-23');
    expect(r.weeks.map((w) => [w.key, w.boxes, Math.round(w.marginPct * 100)])).toEqual([['2026-11-23', 2, 25], ['2026-11-30', 1, 40]]);
    expect(r.plans.find((p) => p.key === 'family')).toMatchObject({ boxes: 2, revenueVnd: 300000, marginVnd: 90000 });
    expect(r.zones.map((z) => [z.label, Math.round(z.marginPct * 100)])).toEqual([['Khu Z1', 25], ['Khu Z2', 40]]);
    expect(r.weeks[0].alert).toBe(false);
    expect(r.boxes.find((b) => b.orderId === 'B').alert).toBe(true);
    expect(r.boxes.find((b) => b.orderId === 'D').alert).toBe(false); // chu kỳ đầu không cảnh báo
    expect(r.firstCycle).toMatchObject({ boxes: 1, marginVnd: -50000 });
    expect(r.steady.boxes).toBe(3);
    // Không đủ biên: gói gia đình 30% vẫn qua, nhưng thêm một thùng lỗ thì cảnh báo cả nhóm
    const worse = marginReport([...rows, mk('E', '2026-11-30', 'Z2', 'family', 100000, 140000)], BUSINESS);
    expect(worse.alerts.some((a) => a.type === 'plan' && a.key === 'family')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('dòng tiền 30 ngày và tỷ lệ bao phủ', () => {
  it('dòng tiền: vào theo lịch trừ thẻ và gia hạn, ra theo hạn công nợ; khoản quá hạn tính vào hôm nay', () => {
    const f = cashflowForecast({
      today: '2026-11-20',
      startCashVnd: 1000,
      cardCharges: [{ day: '2026-11-22', amountVnd: 500 }, { day: '2026-12-25', amountVnd: 99999 }],
      renewals: [{ day: '2026-11-25', amountVnd: 300 }],
      payablesOut: [{ day: '2026-11-10', amountVnd: 400 }, { day: '2026-11-22', amountVnd: 200 }],
      estimatedOut: [{ day: '2026-11-30', amountVnd: 150 }],
      logisticsOut: [{ day: '2026-12-01', amountVnd: 100 }]
    }, 30);
    expect(f.days).toHaveLength(30);
    expect(f.days[0].day).toBe('2026-11-20');
    expect(f.days[0].payablesVnd).toBe(400); // quá hạn tính vào hôm nay
    expect(f.days[2]).toMatchObject({ day: '2026-11-22', cardVnd: 500, payablesVnd: 200 });
    expect(f.totalInVnd).toBe(800); // khoản thẻ ngày 25/12 nằm ngoài 30 ngày
    expect(f.totalOutVnd).toBe(850);
    expect(f.endCashVnd).toBe(1000 + 800 - 850);
    expect(f.lowest.day).toBe('2026-11-20');
    expect(f.lowest.cashEndVnd).toBe(600);
  });

  it('tỷ lệ bao phủ = tiền mặt / nợ Fresh Credit tiền thật; dưới ngưỡng thì cảnh báo', () => {
    expect(coverageRatio({ cashVnd: 5000000, liabilityRealVnd: 4000000 })).toMatchObject({ ratio: 1.25, alert: false, shortfallVnd: 0 });
    expect(coverageRatio({ cashVnd: 3000000, liabilityRealVnd: 4000000 })).toMatchObject({ ratio: 0.75, alert: true, shortfallVnd: 1000000 });
    expect(coverageRatio({ cashVnd: 0, liabilityRealVnd: 0 })).toMatchObject({ ratio: null, alert: false });
    expect(coverageRatio({ cashVnd: 5, liabilityRealVnd: 10 }, { ...BUSINESS, alerts: { ...BUSINESS.alerts, minCashCoverageRatio: 0.5 } }).alert).toBe(false);
    // Tuỳ chọn cộng tiền đơn đã thu trước chưa giao vào nghĩa vụ
    const strict = { ...BUSINESS, finance: { ...BUSINESS.finance, coverage: { includePrepaidOrders: true } } };
    expect(coverageRatio({ cashVnd: 5000000, liabilityRealVnd: 4000000, prepaidOrdersVnd: 2000000 }, strict)).toMatchObject({ ratio: 5 / 6, alert: true });
  });

  it('đi tay: nạp -> giao tuần 1 -> dừng gói -> hoàn: nợ Fresh Credit, tiền mặt và tỷ lệ bao phủ cập nhật từng bước', () => {
    const { server, api } = setup();
    const cust = (id) => server.read((db) => ({ ...db.customers.find((c) => c.id === id).credit }));
    const snap = () => api.ops.finance.cashflow(accounting);
    const s0 = snap();

    // 1) Khách nạp 1.500.000 nhận 1.650.000
    const top = api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' });
    expect(top.data.credit_received_vnd).toBe(1650000);
    const s1 = snap();
    expect(s1.totals.liabilityRealVnd - s0.totals.liabilityRealVnd).toBe(1500000);
    expect(s1.totals.promoOutstandingVnd - s0.totals.promoOutstandingVnd).toBe(150000);
    expect(s1.position.cashVnd - s0.position.cashVnd).toBe(1500000);

    // 2) Giao tuần 1: doanh thu theo phần tiền thật; nợ Fresh Credit không đổi (đã trừ từ lúc thu tiền tuần)
    const locked = lockFirstDay(server, api);
    const wk1 = locked.find((o) => o.customerId === CREDIT_OK);
    expect(wk1).toBeTruthy();
    const fundedReal = server.read((db) => db.ledger.filter((l) => l.orderId === wk1.id && l.kind === 'credit_spend').reduce((s, l) => s + l.real, 0));
    const fundedPromo = server.read((db) => db.ledger.filter((l) => l.orderId === wk1.id && l.kind === 'credit_spend').reduce((s, l) => s + l.promo, 0));
    expect(api.ops.finance.revenue(accounting).rows.filter((r) => r.customerId === CREDIT_OK)).toHaveLength(0);
    deliver(api, wk1.id);
    const row = api.ops.finance.revenue(accounting).rows.find((r) => r.orderId === wk1.id);
    expect(row.realVnd).toBe(fundedReal);
    expect(row.promoVnd).toBe(fundedPromo);
    expect(row.realVnd + row.promoVnd).toBe(wk1.amountVnd);

    // 3) Khách dừng gói: hoàn đúng phần tiền thật chưa dùng
    const realBefore = cust(CREDIT_OK).real;
    const s2 = snap();
    const cancel = api.customer.cancelSubscription({ customer_id: CREDIT_OK, confirm: true });
    expect(cancel.status).toBe('success');
    expect(cancel.data.refund_vnd).toBeGreaterThan(0);
    expect(cancel.data.refund_vnd).toBeLessThanOrEqual(realBefore + 5000000);
    const s3 = snap();
    expect(s2.totals.liabilityRealVnd - s3.totals.liabilityRealVnd).toBe(cancel.data.refund_vnd);
    expect(s2.position.cashVnd - s3.position.cashVnd).toBe(cancel.data.refund_vnd);
    expect(s3.coverage.ratio).not.toBe(s2.coverage.ratio);
    // Dòng tiền ra không âm vì hoàn; nợ phải khớp: sổ = số dư thực
    const db = dbOf(server);
    expect(creditTotals(db.customers, db.ledger).drift).toEqual([]);
    expect(api.ops.finance.journal(accounting).totals.balanced).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('hóa đơn điện tử: thời điểm xuất theo cấu hình', () => {
  it('hàm thuần: "delivery" lập hóa đơn cho đơn đã giao theo tiền thật; "topup" lập cho từng lần nhận tiền; không lập trùng', () => {
    const revenueRows = [{ orderId: 'O-1', customerId: 'C-1', deliveredAt: '2026-11-23T12:00:00Z', deliveryDay: '2026-11-23', realVnd: 300000, vatVnd: 22000, netRevenueVnd: 278000, vatUnconfirmed: true }];
    const ledger = [
      { id: 'LED-1', customerId: 'C-1', kind: 'topup', real: 1500000, amountVnd: 1500000, at: '2026-11-20T01:00:00Z' },
      { id: 'LED-2', customerId: 'C-1', kind: 'topup_bonus', real: 0, promo: 150000, amountVnd: 150000, at: '2026-11-20T01:00:00Z' },
      { id: 'LED-3', customerId: 'C-2', kind: 'card_charge', real: 400000, amountVnd: 400000, at: '2026-11-21T01:00:00Z' },
      { id: 'LED-4', customerId: 'C-3', kind: 'topup', real: 50000, amountVnd: 50000, backfill: true, at: '2026-11-19T01:00:00Z' }
    ];
    const d = planEinvoices({ revenueRows, ledger, existing: [] }, 'delivery');
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ sourceKind: 'order', sourceId: 'O-1', totalVnd: 300000, vatVnd: 22000 });
    const t = planEinvoices({ revenueRows, ledger, existing: [] }, 'topup');
    expect(t.map((x) => [x.sourceId, x.totalVnd])).toEqual([['LED-1', 1500000], ['LED-3', 400000]]);
    expect(planEinvoices({ revenueRows, ledger, existing: [{ sourceKind: 'ledger', sourceId: 'LED-1' }] }, 'topup').map((x) => x.sourceId)).toEqual(['LED-3']);
    expect(planEinvoices({ revenueRows, ledger, existing: [{ sourceKind: 'order', sourceId: 'O-1' }] }, 'delivery')).toHaveLength(0);
  });

  it('qua API, mặc định "delivery": nạp tiền chưa có hóa đơn, giao xong mới có đúng một hóa đơn; không đổi cách xuất sau khi đã có hóa đơn', () => {
    const { server, api } = setup();
    api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' });
    api.ops.tick(admin);
    expect(api.ops.finance.invoices(accounting)).toMatchObject({ issueOn: 'delivery', list: [], locked: false });
    const locked = lockFirstDay(server, api);
    deliver(api, locked[0].id);
    deliver(api, locked[1].id);
    const inv = api.ops.finance.invoices(accounting);
    expect(inv.list).toHaveLength(2);
    expect(inv.pending).toBe(0);
    expect(inv.locked).toBe(true);
    const mine = inv.list.find((i) => i.sourceId === locked[0].id);
    expect(mine.status).toBe('issued');
    expect(mine.number).toMatch(/^C26MFR-\d{7}$/);
    const rev = api.ops.finance.revenue(accounting).rows.find((r) => r.orderId === locked[0].id);
    expect(mine.totalVnd).toBe(rev.realVnd);
    api.ops.tick(admin);
    expect(api.ops.finance.invoices(accounting).list).toHaveLength(2); // chạy lại không xuất trùng
    expect(() => api.ops.finance.saveSettings(accounting, { issueOn: 'topup' })).toThrow(/hóa đơn/);
  });

  it('cấu hình "topup": xuất hóa đơn ngay khi có tiền nạp, không xuất theo đơn đã giao', () => {
    const cfg = { ...BUSINESS, invoicing: { issueOn: 'topup' } };
    const { server, api } = setup(cfg);
    api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' });
    api.ops.tick(admin);
    const inv = api.ops.finance.invoices(accounting);
    expect(inv.issueOn).toBe('topup');
    const one = inv.list.find((i) => i.sourceKind === 'ledger' && i.totalVnd === 1500000);
    expect(one).toBeTruthy();
    const before = inv.list.length;
    const locked = lockFirstDay(server, api);
    deliver(api, locked[0].id);
    expect(api.ops.finance.invoices(accounting).list.filter((i) => i.sourceKind === 'order')).toHaveLength(0);
    expect(api.ops.finance.invoices(accounting).list.length).toBeGreaterThanOrEqual(before);
  });
});

// ---------------------------------------------------------------------------------------------
describe('thẻ điểm nhà cung cấp', () => {
  const NOW = new Date('2026-11-20T09:00:00+07:00');
  const po = (id, supplierId, day, lines, status = 'received') => ({ id, supplierId, deliveryDay: day, status, lines: lines.map(([sku, qty, price]) => ({ sku, qty, unitPriceVnd: price })) });
  const rec = (poId, at, lines) => ({ poId, receivedAt: at, lines: lines.map(([sku, accepted, rejected = 0, tempC = null]) => ({ sku, acceptedQty: accepted, rejectedQty: rejected, tempC })) });

  it('tính đúng giờ, đáp ứng, QC, chênh khối lượng, vượt nhiệt, khiếu nại, chênh giá thị trường', () => {
    const pos = [
      po('P1', 'S-FACTORY', '2026-11-10', [['NL-GA-03', 100, 85000]]),
      po('P2', 'S-FACTORY', '2026-11-12', [['NL-GA-03', 100, 85000]]),
      po('P3', 'S-FACTORY', '2026-11-14', [['NL-HEO-02', 50, 140000]], 'confirmed') // quá hạn, chưa có hàng: trễ
    ];
    const receipts = [
      rec('P1', '2026-11-10T04:00:00+07:00', [['NL-GA-03', 90, 10, 3]]), // đúng hạn, đáp ứng 100%, QC 90%
      rec('P2', '2026-11-13T04:00:00+07:00', [['NL-GA-03', 80, 0, 6]]) // trễ 1 ngày, giao thiếu, vượt nhiệt (6 > 4)
    ];
    const claims = [{ id: 'KN-1', poId: 'P1', supplierId: 'S-FACTORY', amountVnd: 850000 }];
    const rows = supplierScorecard({ pos, receipts, claims, now: NOW }, {});
    const f = rows.find((r) => r.supplierId === 'S-FACTORY');
    expect(f.poCount).toBe(3);
    expect(f.onTimeRate).toBeCloseTo(1 / 3, 5);
    expect(f.fillRate).toBeCloseTo((100 + 80) / (100 + 100 + 50), 5);
    expect(f.qcRate).toBeCloseTo(170 / 180, 5);
    expect(f.weightDiffPct).toBeCloseTo((180 - 250) / 250, 5);
    expect(f.tempBreaches).toBe(1);
    expect(f.tempBreachRate).toBeCloseTo(1 / 2, 5);
    expect(f.claimCount).toBe(1);
    expect(f.claimVnd).toBe(850000);
    expect(f.marketDiffPct).toBeLessThan(0); // giá PO thấp hơn giá thị trường mock
    expect(f.score).toBeGreaterThan(0);
    expect(f.score).toBeLessThan(100);
    expect(f.warn).toBe(true);
    // Nhà cung cấp chưa có PO nào: không có điểm, không bị báo 0
    const none = rows.find((r) => r.supplierId === 'S-PACK');
    expect(none.score).toBeNull();
    expect(none.onTimeRate).toBeNull();
  });

  it('nhà cung cấp giao đủ, đúng hạn, đạt nhiệt thì được điểm cao nhất', () => {
    const rows = supplierScorecard({
      pos: [po('P1', 'S-SEAFOOD', '2026-11-10', [['HS-CA-01', 40, 190000]])],
      receipts: [rec('P1', '2026-11-10T04:00:00+07:00', [['HS-CA-01', 40, 0, 2]])],
      claims: [],
      now: NOW
    }, {});
    const s = rows.find((r) => r.supplierId === 'S-SEAFOOD');
    expect(s.score).toBe(100);
    expect(s.warn).toBe(false);
    expect(rows[0].supplierId).toBe('S-SEAFOOD');
  });

  it('qua API: mua hàng và admin xem được, kế toán thì không; dữ liệu mẫu có điểm', () => {
    const { api } = setup();
    expect(api.ops.monitoring.scorecard({ role: 'purchasing' }).rows.length).toBeGreaterThan(0);
    const fac = api.ops.monitoring.scorecard(admin).rows.find((r) => r.supplierId === 'S-FACTORY');
    expect(fac.qcRate).toBeLessThan(1); // PO mẫu có 6 kg gà không đạt
    expect(fac.claimCount).toBeGreaterThan(0);
    expect(() => api.ops.monitoring.scorecard(accounting)).toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------------------------
describe('quyền và lọc dữ liệu theo vai trò', () => {
  it('xưởng, kho phụ, shipper, điều phối, nhà cung cấp, mua hàng không đọc được dữ liệu tài chính', () => {
    const { api } = setup();
    const calls = [
      (c) => api.ops.finance.creditSummary(c), (c) => api.ops.finance.reconciliation(c), (c) => api.ops.finance.revenue(c), (c) => api.ops.finance.margins(c),
      (c) => api.ops.finance.payables(c), (c) => api.ops.finance.cashflow(c), (c) => api.ops.finance.journal(c), (c) => api.ops.finance.journalCsv(c),
      (c) => api.ops.finance.mockBankTransfer(c, {}), (c) => api.ops.finance.settings(c)
    ];
    for (const role of ['workshop', 'hub', 'shipper', 'dispatch', 'supplier', 'purchasing']) {
      for (const call of calls) expect(() => call({ role, supplierId: 'S-FACTORY', shipperId: 'SH-01' })).toThrow(ForbiddenError);
    }
    expect(() => api.ops.overview.founder(accounting)).toThrow(ForbiddenError);
    expect(() => api.ops.overview.founder({ role: 'purchasing' })).toThrow(ForbiddenError);
    expect(api.ops.overview.founder(admin).today).toBeTruthy();
  });

  it('kế toán thấy tiền và mã khách, KHÔNG thấy tên, số điện thoại hay địa chỉ', () => {
    const { api, server } = setup();
    const locked = lockFirstDay(server, api);
    deliver(api, locked[0].id);
    api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' });
    api.ops.tick(admin);
    const dump = JSON.stringify([
      api.ops.finance.creditSummary(accounting), api.ops.finance.creditLedger(accounting), api.ops.finance.creditLedger(accounting, { customerId: CREDIT_OK }),
      api.ops.finance.reconciliation(accounting), api.ops.finance.revenue(accounting), api.ops.finance.invoices(accounting), api.ops.finance.margins(accounting),
      api.ops.finance.cashflow(accounting), api.ops.finance.journal(accounting), api.ops.finance.adjustments(accounting)
    ]);
    expect(dump).toContain(CREDIT_OK);
    const customers = server.read((db) => db.customers);
    for (const c of customers.slice(0, 20)) {
      expect(dump).not.toContain(c.name);
      expect(dump).not.toContain(c.phone);
      expect(dump).not.toContain(c.address);
    }
    expect(dump).not.toMatch(/"address"|"recipient"|"phone"/);
  });

  it('điều chỉnh Fresh Credit phải có người duyệt: kế toán đề nghị, admin duyệt, kế toán không tự duyệt', () => {
    const { api, server } = setup();
    const bal = () => server.read((db) => ({ ...db.customers.find((c) => c.id === CREDIT_OK).credit }));
    const before = bal();
    expect(() => api.ops.finance.requestAdjustment(accounting, { customerId: CREDIT_OK, bucket: 'promo', deltaVnd: 50000, reason: '' })).toThrow(/lý do/);
    const adj = api.ops.finance.requestAdjustment(accounting, { customerId: CREDIT_OK, bucket: 'promo', deltaVnd: 50000, reason: 'Bù do giao trễ ngày 18/11' });
    expect(adj.status).toBe('pending');
    expect(bal()).toEqual(before); // chưa duyệt thì chưa đổi số dư
    expect(() => api.ops.finance.decideAdjustment(accounting, { id: adj.id, approve: true })).toThrow(ForbiddenError);
    expect(() => api.ops.finance.requestAdjustment(admin, { customerId: CREDIT_OK, bucket: 'promo', deltaVnd: 1000, reason: 'x' })).toThrow(ForbiddenError);
    const done = api.ops.finance.decideAdjustment(admin, { id: adj.id, approve: true, note: 'OK' });
    expect(done).toMatchObject({ status: 'approved', decidedBy: 'admin' });
    expect(bal().promo).toBe(before.promo + 50000);
    const entry = server.read((db) => db.ledger.find((l) => l.id === done.ledgerId));
    expect(entry).toMatchObject({ kind: 'adjustment', promo: 50000, real: 0, approvedBy: 'admin' });
    expect(api.ops.finance.creditLedger(accounting, { customerId: CREDIT_OK }).rows[0].kind).toBe('adjustment');
    // Trừ quá số dư bị chặn; từ chối không đổi số dư
    expect(() => api.ops.finance.requestAdjustment(accounting, { customerId: CREDIT_OK, bucket: 'promo', deltaVnd: -999999999, reason: 'x' })).toThrow();
    const rej = api.ops.finance.requestAdjustment(accounting, { customerId: CREDIT_OK, bucket: 'real', deltaVnd: -10000, reason: 'Nhập nhầm' });
    expect(api.ops.finance.decideAdjustment(admin, { id: rej.id, approve: false }).status).toBe('rejected');
    expect(bal().real).toBe(before.real);
    const db = dbOf(server);
    expect(creditTotals(db.customers, db.ledger).drift).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('sổ Fresh Credit đủ loại bút và bút lịch sử', () => {
  it('hạt giống: mọi số dư khách đều có bút đầu kỳ (backfill) nên sổ = số dư thực', () => {
    const { server } = setup();
    const db = dbOf(server);
    expect(db.finance.backfilledAt).toBeTruthy();
    const back = db.ledger.filter((l) => l.backfill);
    expect(back.length).toBeGreaterThan(0);
    expect(back.every((l) => ['topup', 'topup_bonus'].includes(l.kind))).toBe(true);
    const t = creditTotals(db.customers, db.ledger);
    expect(t.drift).toEqual([]);
    expect(t.liabilityRealVnd).toBe(db.customers.reduce((s, c) => s + c.credit.real, 0));
  });

  it('bộ nhớ cũ (chưa có lát cắt tài chính): mở lên tự dựng bút đầu kỳ, chạy lại không dựng trùng', () => {
    const storage = createMemoryStorage();
    const server = createServer({ storage, startAt: START, running: false });
    server.write((db) => {
      db.ledger = db.ledger.filter((l) => !l.backfill);
      delete db.finance;
    });
    const raw = JSON.parse(storage.getItem('mova_shared_db_v1'));
    expect(raw.finance).toBeUndefined();
    const reopened = createServer({ storage, startAt: START, running: false });
    const n = reopened.read((db) => db.ledger.filter((l) => l.backfill).length);
    expect(n).toBeGreaterThan(0);
    expect(reopened.read((db) => creditTotals(db.customers, db.ledger).drift)).toEqual([]);
    expect(reopened.read((db) => db.ledger.filter((l) => l.backfill).length)).toBe(n);
  });

  it('sổ có đủ nhóm: nạp, thưởng nạp, thưởng hồ sơ / chia sẻ / giới thiệu, trừ cho tuần, bù sự cố, hoàn, điều chỉnh', () => {
    const { api, server } = setup();
    api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' });
    api.customer.claimShare({ customer_id: CREDIT_OK, kind: 'menu', ref: 'menu-1' });
    api.demo.jumpTo(admin, 'charge');
    const locked = lockFirstDay(server, api);
    const o = locked.find((x) => x.customerId === 'C-0002') || locked[0];
    const meal = o.meals[0];
    const dish = Object.values(DISHES).find((d) => d.kind === 'protein' && d.id !== meal.dishes.protein && !d.western);
    api.ops.substituteDish({ role: 'workshop' }, { orderId: o.id, mealIndex: meal.index, kind: 'protein', toDishId: dish.id, compensationVnd: 20000 });
    api.customer.cancelSubscription({ customer_id: 'C-0005', confirm: true });
    const adj = api.ops.finance.requestAdjustment(accounting, { customerId: CREDIT_OK, bucket: 'real', deltaVnd: 10000, reason: 'Khách nạp thiếu' });
    api.ops.finance.decideAdjustment(admin, { id: adj.id, approve: true });
    const groups = Object.fromEntries(api.ops.finance.creditSummary(accounting).groups.map((g) => [g.id, g]));
    for (const id of ['topup', 'topup_bonus', 'reward', 'spend', 'compensation', 'refund', 'adjustment']) expect(groups[id].count).toBeGreaterThan(0);
    expect(groups.topup.realVnd).toBeGreaterThan(0);
    expect(groups.topup_bonus.promoVnd).toBeGreaterThan(0);
    expect(groups.spend.realVnd + groups.spend.promoVnd).toBeLessThan(0);
    expect(groups.compensation.promoVnd).toBe(20000);
    const db = dbOf(server);
    expect(creditTotals(db.customers, db.ledger).drift).toEqual([]);
    const s = api.ops.finance.creditSummary(accounting);
    expect(s.spendOrder).toEqual(BUSINESS.credit.spendOrder);
    expect(s.liabilityRealVnd).toBe(db.customers.reduce((x, c) => x + c.credit.real, 0));
  });
});

describe('tổng quan founder', () => {
  it('tiền vào / ra tuần, nợ Fresh Credit, tỷ lệ bao phủ, margin, giữ chân, đúng giờ, hao hụt', () => {
    const { server, api } = setup();
    api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' });
    const locked = lockFirstDay(server, api);
    deliver(api, locked[0].id);
    const o = api.ops.overview.founder(admin);
    expect(o.cash.inVnd).toBeGreaterThanOrEqual(1500000);
    expect(o.liability.realVnd).toBe(server.read((db) => db.customers.reduce((s, c) => s + c.credit.real, 0)));
    expect(o.coverage).toHaveProperty('ratio');
    expect(o.retention).toHaveProperty('pct');
    expect(o.onTime).toHaveProperty('pct');
    expect(o.waste).toHaveProperty('costVnd');
    expect(Array.isArray(o.alerts)).toBe(true);
    expect(o.week.from <= o.today && o.today <= o.week.to).toBe(true);
  });
});
