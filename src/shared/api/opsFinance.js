import { SKUS, SUPPLIERS } from '../data/catalog';
import { getZone } from '../config/business';
import { addDays, dayKey } from '../utils/time';
import { ForbiddenError } from './views';
import { paidFromOf } from '../domain/account';
import { CREDIT_GROUPS, CREDIT_KINDS, creditTotals, groupTotals, ledgerRow, runningRows } from '../domain/financeCredit';
import { BANK_STATUS_LABEL, cardRows } from '../domain/financeBank';
import { PLAN_LABEL, marginReport, planEinvoices, revenueTotals, weekStartOf } from '../domain/financeRevenue';
import { JOURNAL_GROUPS, buildJournal, filterJournal, journalCsv, journalTotals, statementsCsv, unmappedAccounts } from '../domain/financeJournal';
import {
  cashPaymentCheck, cashPosition, cashflowForecast, coverageRatio, payFileCsv, payablesAging, proposePayRun
} from '../domain/financePayables';
import {
  decideAdjustment, ensureFinance, financeContext, financeSettings, ignoreBankTxn, issueDueInvoices, journalSource, manualMatch, receiptsView,
  receiveBankTxn, renewalForecast, requestAdjustment, saveFinanceSettings, simulateBankTransfer
} from '../domain/financeOps';
import { ensureProcurement, payPo } from '../domain/procurementOps';
import { payableRows, threeWayMatch } from '../domain/procurement';
import { supplierScorecard } from '../domain/scorecard';
import { wasteSummary } from '../domain/inventory';
import { kpiOf } from '../domain/logisticsOps';

const toError = (res) => {
  const e = new Error(res.message || res.code);
  e.code = res.code;
  if (res.errors) e.errors = res.errors;
  if (res.diffVnd != null) e.diffVnd = res.diffVnd;
  return e;
};
const must = (res) => {
  if (!res.ok) throw toError(res);
  return res;
};

const inRange = (day, from, to) => (!from || day >= from) && (!to || day <= to);
const group = (list, key) => list.reduce((m, x) => ((m[x[key]] ||= []).push(x), m), {});

/**
 * API Tài chính & kế toán (P2D): `api.ops.finance.*`, `api.ops.monitoring.*` (giám sát nhà cung cấp), `api.ops.overview.*` (tổng quan founder).
 * Mọi dữ liệu trả ra chỉ có MÃ khách (không tên, SĐT, địa chỉ). Quyền: xem / ghi tài chính là kế toán và admin; điều chỉnh Fresh Credit do kế toán
 * đề nghị và admin duyệt; thẻ điểm nhà cung cấp cho mua hàng và admin; tổng quan chỉ admin.
 */
export function createFinanceApi(server, cfg, guard) {
  const today = (now) => dayKey(now);

  /** Dòng công nợ phải trả: dùng lại hàm của P2B. */
  const payRows = (db, now) => {
    const proc = ensureProcurement(db);
    return payableRows(
      { pos: db.purchaseOrders, receiptsByPo: group(proc.receipts, 'poId'), invoicesByPo: Object.fromEntries(proc.invoices.map((i) => [i.poId, i])), claimsByPo: group(proc.claims, 'poId'), now },
      cfg
    );
  };

  const prepaidOrdersVnd = (db) =>
    db.orders.filter((o) => ['paid', 'locked', 'in_production', 'shipped'].includes(o.status)).reduce((s, o) => s + Math.min(o.amountVnd, paidFromOf(db, o).real), 0);

  const position = (db, now, settings) => {
    const proc = ensureProcurement(db);
    return cashPosition({ ledger: db.ledger, payments: proc.payments, purchases: proc.purchases, openingVnd: settings.openingCashVnd }, now, cfg);
  };

  const coverage = (db, now, settings) => {
    const pos = position(db, now, settings);
    const totals = creditTotals(db.customers, db.ledger);
    return { position: pos, totals, coverage: coverageRatio({ cashVnd: pos.cashVnd, liabilityRealVnd: totals.liabilityRealVnd, prepaidOrdersVnd: prepaidOrdersVnd(db) }, cfg), prepaidOrdersVnd: prepaidOrdersVnd(db) };
  };

  const weekRange = (day) => {
    const from = weekStartOf(day);
    return { from, to: addDays(from, 6) };
  };

  const bankView = (db) => {
    const fin = ensureFinance(db);
    const led = Object.fromEntries(db.ledger.map((l) => [l.id, l]));
    return fin.bankTxns
      .slice()
      .reverse()
      .map((t) => {
        const l = t.ledgerId ? led[t.ledgerId] : null;
        const s = t.suggestedLedgerId ? led[t.suggestedLedgerId] : null;
        return {
          ...t,
          statusLabel: BANK_STATUS_LABEL[t.status],
          customerId: l ? l.customerId : null,
          ledgerRef: l ? l.ref : null,
          suggestion: s && !l ? { ledgerId: s.id, customerId: s.customerId, ref: s.ref, amountVnd: s.real || s.amountVnd } : null
        };
      });
  };

  return {
    finance: {
      // =========================================================================================
      // 1. SỔ FRESH CREDIT
      /** Nợ Fresh Credit (tiền thật chưa dùng), khuyến mãi còn treo, tổng từng nhóm bút và số dư theo khách. */
      creditSummary(ctx) {
        guard(ctx, 'financeRead');
        return server.read((db) => {
          const totals = creditTotals(db.customers, db.ledger);
          const perCustomer = db.customers
            .map((c) => ({ customerId: c.id, realVnd: c.credit.real, promoVnd: c.credit.promo, totalVnd: c.credit.real + c.credit.promo, entries: db.ledger.filter((l) => l.customerId === c.id).length }))
            .filter((c) => c.totalVnd > 0 || c.entries > 0)
            .sort((a, b) => b.realVnd - a.realVnd || a.customerId.localeCompare(b.customerId));
          return {
            ...totals,
            groups: groupTotals(db.ledger),
            spendOrder: cfg.credit.spendOrder,
            customers: perCustomer,
            kinds: Object.fromEntries(Object.entries(CREDIT_KINDS).map(([k, v]) => [k, v.label])),
            groupList: CREDIT_GROUPS,
            pendingAdjustments: ensureFinance(db).adjustments.filter((a) => a.status === 'pending').length
          };
        });
      },

      /** Sổ từng bút. Có `customerId` thì kèm số dư chạy sau mỗi bút. Mới nhất trước. */
      creditLedger(ctx, { customerId = null, group: grp = null, limit = 300 } = {}) {
        guard(ctx, 'financeRead');
        return server.read((db) => {
          let rows;
          if (customerId) rows = runningRows(db.ledger, customerId).reverse();
          else rows = db.ledger.slice().sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)).map((l) => ledgerRow(l));
          if (grp) rows = rows.filter((r) => r.group === grp);
          const customer = customerId ? db.customers.find((c) => c.id === customerId) : null;
          return {
            customerId,
            balance: customer ? { real: customer.credit.real, promo: customer.credit.promo } : null,
            total: rows.length,
            rows: rows.slice(0, limit)
          };
        });
      },

      adjustments(ctx) {
        guard(ctx, 'financeRead');
        return server.read((db) => ({ list: ensureFinance(db).adjustments.slice().reverse(), canRequest: ctx.role === 'accounting', canApprove: ctx.role === 'admin' }));
      },
      /** Kế toán đề nghị điều chỉnh. Chưa đổi số dư cho tới khi admin duyệt. */
      requestAdjustment(ctx, input) {
        guard(ctx, 'adjustRequest');
        return server.write((db, now) => must(requestAdjustment(db, { ...input, by: ctx.role }, now)).adjustment);
      },
      decideAdjustment(ctx, input) {
        guard(ctx, 'adjustApprove');
        return server.write((db, now) => must(decideAdjustment(db, { ...input, by: ctx.role }, now)).adjustment);
      },

      // =========================================================================================
      // 2. THU TIỀN VÀ ĐỐI SOÁT
      reconciliation(ctx) {
        guard(ctx, 'financeRead');
        return server.read((db, now) => {
          const receipts = receiptsView(db);
          const txns = bankView(db);
          const queue = txns.filter((t) => ['unmatched', 'amount_diff'].includes(t.status));
          const waiting = receipts.filter((r) => r.state === 'waiting');
          return {
            bank: cfg.finance.bank,
            receipts,
            txns,
            queue,
            waiting,
            totals: {
              expected: receipts.length,
              received: receipts.length - waiting.length,
              waitingVnd: waiting.reduce((s, r) => s + r.amountVnd, 0),
              autoMatched: txns.filter((t) => t.matchedBy === 'auto').length,
              manualMatched: txns.filter((t) => t.matchedBy === 'manual').length,
              queue: queue.length
            },
            cards: cardRows({ ledger: db.ledger, orders: db.orders }, now, cfg),
            card: cfg.finance.card
          };
        });
      },
      /** MOCK webhook ngân hàng: tiền về với nội dung chuyển khoản. Không truyền `ledgerId` thì là giao dịch lạ. scenario: exact | wrong_content | wrong_amount. */
      mockBankTransfer(ctx, input = {}) {
        guard(ctx, 'financeWrite');
        return server.write((db, now) => must(simulateBankTransfer(db, input, now)).txn);
      },
      /** Webhook với dữ liệu tự do (bản thật: ngân hàng gọi vào). */
      bankWebhook(ctx, txn) {
        guard(ctx, 'financeWrite');
        return server.write((db, now) => {
          const r = must(receiveBankTxn(db, txn || {}, now));
          return { txn: r.txn, duplicate: r.duplicate };
        });
      },
      manualMatch(ctx, input) {
        guard(ctx, 'financeWrite');
        return server.write((db, now) => must(manualMatch(db, { ...input, by: ctx.role }, now)).txn);
      },
      ignoreBankTxn(ctx, input) {
        guard(ctx, 'financeWrite');
        return server.write((db, now) => must(ignoreBankTxn(db, { ...input, by: ctx.role }, now)).txn);
      },

      // =========================================================================================
      // 3. DOANH THU VÀ HÓA ĐƠN
      revenue(ctx, { from = null, to = null } = {}) {
        guard(ctx, 'financeRead');
        return server.read((db, now) => {
          const fc = financeContext(db, cfg);
          const rows = fc.revenueRows.filter((r) => inRange(r.day, from, to));
          const byDay = {};
          for (const r of rows) {
            const d = (byDay[r.day] ||= { day: r.day, orders: 0, realVnd: 0, promoVnd: 0, vatVnd: 0, netRevenueVnd: 0 });
            d.orders += 1;
            d.realVnd += r.realVnd;
            d.promoVnd += r.promoVnd;
            d.vatVnd += r.vatVnd;
            d.netRevenueVnd += r.netRevenueVnd;
          }
          const notDelivered = db.orders.filter((o) => ['paid', 'locked', 'in_production', 'shipped'].includes(o.status));
          return {
            today: today(now),
            treatment: fc.settings.promoTreatment,
            rows,
            totals: revenueTotals(rows),
            days: Object.values(byDay).sort((a, b) => b.day.localeCompare(a.day)),
            deferred: {
              orders: notDelivered.length,
              realVnd: notDelivered.reduce((s, o) => s + Math.min(o.amountVnd, paidFromOf(db, o).real), 0),
              note: 'Đã thu tiền nhưng chưa giao nên CHƯA phải doanh thu.'
            },
            vatNote: 'Thuế suất theo nhóm hàng trong cấu hình, mọi mức đang ghi "chưa xác nhận": kế toán xác nhận trước khi dùng cho kê khai.',
            vatUnconfirmed: rows.some((r) => r.vatUnconfirmed)
          };
        });
      },

      invoices(ctx) {
        guard(ctx, 'financeRead');
        return server.read((db) => {
          const fin = ensureFinance(db);
          const fc = financeContext(db, cfg);
          const pending = planEinvoices({ revenueRows: fc.revenueRows, ledger: db.ledger, existing: fin.einvoices }, fc.settings.issueOn, cfg);
          return {
            issueOn: fc.settings.issueOn,
            locked: fin.einvoices.length > 0,
            provider: 'Lớp tích hợp hóa đơn điện tử (mock)',
            list: fin.einvoices.slice().reverse(),
            pending: pending.length,
            totalVnd: fin.einvoices.reduce((s, i) => s + i.totalVnd, 0)
          };
        });
      },
      /** Xuất ngay các hóa đơn còn thiếu (job định kỳ cũng làm việc này). */
      issueInvoices(ctx) {
        guard(ctx, 'financeWrite');
        return server.write((db, now) => issueDueInvoices(db, now, cfg).length);
      },

      // =========================================================================================
      // 4. GIÁ VỐN VÀ MARGIN
      margins(ctx, { from = null, to = null } = {}) {
        guard(ctx, 'financeRead');
        return server.read((db) => {
          const fc = financeContext(db, cfg);
          const rows = fc.margins.filter((r) => inRange(r.day, from, to));
          const report = marginReport(rows, cfg, (id) => (getZone(id) ? getZone(id).name : id));
          return { ...report, minPct: cfg.alerts.minGrossMarginPct, planLabels: PLAN_LABEL, treatment: fc.settings.promoTreatment };
        });
      },
      /** Chi tiết giá vốn của một thùng: từng SKU x giá PO + bao bì + xốt + logistics. */
      boxCost(ctx, orderId) {
        guard(ctx, 'financeRead');
        return server.read((db) => {
          const fc = financeContext(db, cfg);
          const o = fc.orderById.get(orderId);
          if (!o) throw toError({ code: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn' });
          const c = fc.costOf({ orderId });
          const row = fc.margins.find((r) => r.orderId === orderId) || null;
          return { orderId, deliveryDay: o.deliveryDay, status: o.status, cost: c, revenueVnd: row ? row.marginRevenueVnd : null, marginVnd: row ? row.marginVnd : null };
        });
      },

      // =========================================================================================
      // 5. CÔNG NỢ PHẢI TRẢ
      payables(ctx) {
        guard(ctx, 'financeRead');
        return server.read((db, now) => {
          const proc = ensureProcurement(db);
          const rows = payRows(db, now);
          const day = today(now);
          const aging = payablesAging(rows, day, cfg);
          const run = proposePayRun(rows, day, cfg);
          const waiting = rows
            .filter((r) => r.status === 'invoiced')
            .map((r) => {
              const po = db.purchaseOrders.find((p) => p.id === r.poId);
              const inv = proc.invoices.find((i) => i.poId === r.poId);
              const m = inv ? threeWayMatch({ po, receipts: proc.receipts.filter((x) => x.poId === po.id), invoice: inv, acceptInvoicePrice: Boolean(po.acceptedInvoicePrice) }, cfg) : null;
              return { poId: r.poId, supplierName: r.supplierName, invoiceNumber: r.invoiceNumber, invoiceVnd: r.invoiceVnd, issues: m ? m.issues.filter((i) => i.severity === 'error').length : 0, matchOk: m ? m.ok : null };
            });
          const claims = proc.claims.map((c) => ({ ...c, supplierName: SUPPLIERS[c.supplierId] ? SUPPLIERS[c.supplierId].name : c.supplierId, skuName: SKUS[c.sku].name }));
          return {
            today: day,
            rows: rows.map((r) => ({ ...r, cashCheck: cashPaymentCheck(r.payableVnd || 0, 'cash', cfg).warn })),
            aging,
            payRun: { ...run, items: run.items.map((i) => ({ ...i, cashCheck: cashPaymentCheck(i.amountVnd, 'cash', cfg) })) },
            waitingMatch: waiting,
            claims,
            totals: {
              openVnd: aging.totalVnd,
              overdueVnd: aging.overdueVnd,
              waitingMatchVnd: waiting.reduce((s, w) => s + (w.invoiceVnd || 0), 0),
              claimOpenVnd: proc.claims.filter((c) => ['open', 'acknowledged'].includes(c.status)).reduce((s, c) => s + c.amountVnd, 0),
              claimDeductedVnd: proc.claims.filter((c) => c.status === 'deducted').reduce((s, c) => s + c.amountVnd, 0)
            },
            cashLimitVnd: cfg.alerts.cashPaymentVatLimitVnd
          };
        });
      },
      /** File chi (mock) cho đợt chi: CSV danh sách chuyển khoản. Không truyền `poIds` thì lấy cả đề xuất. */
      payRunFile(ctx, { poIds = null } = {}) {
        guard(ctx, 'financeRead');
        return server.read((db, now) => {
          const proc = ensureProcurement(db);
          const day = today(now);
          const run = proposePayRun(payRows(db, now), day, cfg);
          const items = run.items.filter((i) => !poIds || poIds.includes(i.poId));
          const csv = payFileCsv(items, (id) => (proc.suppliers[id] ? proc.suppliers[id].bank : null), { batchId: `DOT-CHI-${day}`, today: day });
          return { filename: `file-chi-${day}.csv`, csv, count: items.length, totalVnd: items.reduce((s, i) => s + i.amountVnd, 0), mock: true };
        });
      },
      /** Chi cả đợt: mỗi khoản đi qua `payPo` của P2B. Tiền mặt từ ngưỡng 5 triệu bị chặn kèm cảnh báo mất khấu trừ VAT. */
      executePayRun(ctx, { poIds, method = 'bank_transfer', ref = '' }) {
        guard(ctx, 'financeWrite');
        return server.write((db, now) => {
          const results = [];
          for (const poId of poIds || []) {
            const po = db.purchaseOrders.find((p) => p.id === poId);
            const amount = po ? po.payableVnd || 0 : 0;
            const check = cashPaymentCheck(amount, method, cfg);
            if (!check.ok) {
              results.push({ poId, ok: false, code: 'CASH_OVER_LIMIT', message: check.message });
              continue;
            }
            const r = payPo(db, { poId, method, ref: ref || `DOT-CHI-${today(now)}`, by: ctx.role }, now);
            results.push(r.ok ? { poId, ok: true, amountVnd: r.payment.amountVnd, paymentId: r.payment.id } : { poId, ok: false, code: r.code, message: r.message });
          }
          return { results, paid: results.filter((r) => r.ok).length, totalVnd: results.filter((r) => r.ok).reduce((s, r) => s + r.amountVnd, 0) };
        });
      },

      // =========================================================================================
      // 6. DÒNG TIỀN 30 NGÀY VÀ TỶ LỆ BAO PHỦ
      cashflow(ctx) {
        guard(ctx, 'financeRead');
        return server.read((db, now) => {
          const settings = financeSettings(db, cfg);
          const day = today(now);
          const cov = coverage(db, now, settings);
          const rows = payRows(db, now);
          const matched = rows.filter((r) => r.status === 'matched' && r.dueAt && r.payableVnd != null);
          const open = db.purchaseOrders.filter((po) => !['paid', 'matched'].includes(po.status));
          const term = (po) => (Number.isInteger(po.termDays) ? po.termDays : cfg.payables.defaultTermDays);
          const forecast = cashflowForecast({
            today: day,
            startCashVnd: cov.position.cashVnd,
            cardCharges: db.orders.filter((o) => o.status === 'scheduled' && o.paymentMethod === 'card').map((o) => ({ day: dayKey(new Date(o.chargeAt)), amountVnd: o.amountVnd })),
            renewals: renewalForecast(db, day, cfg),
            payablesOut: matched.map((r) => ({ day: dayKey(new Date(r.dueAt)), amountVnd: r.payableVnd })),
            estimatedOut: open.map((po) => ({ day: addDays(po.deliveryDay, term(po)), amountVnd: po.payableVnd != null ? po.payableVnd : po.totalVnd })),
            logisticsOut: (db.logisticsCosts || []).map((c) => ({ day: addDays(c.day, cfg.finance.cashflow.logisticsTermDays), amountVnd: c.totalVnd }))
          }, cfg.finance.cashflow.horizonDays);
          return {
            today: day,
            horizonDays: cfg.finance.cashflow.horizonDays,
            renewalRate: cfg.finance.cashflow.renewalRate,
            ...cov,
            forecast,
            alerts: [
              ...(cov.coverage.alert ? [{ type: 'coverage', message: `Tỷ lệ bao phủ ${cov.coverage.ratio == null ? '—' : cov.coverage.ratio.toFixed(2)} thấp hơn ngưỡng ${cfg.alerts.minCashCoverageRatio}` }] : []),
              ...(forecast.lowest && forecast.lowest.cashEndVnd < 0 ? [{ type: 'negative_cash', message: `Tiền dự kiến âm vào ${forecast.lowest.day}` }] : [])
            ]
          };
        });
      },

      // =========================================================================================
      // 7. XUẤT BÚT TOÁN
      journal(ctx, { from = null, to = null, groups = null } = {}) {
        guard(ctx, 'financeRead');
        return server.read((db) => {
          const fc = financeContext(db, cfg);
          const all = buildJournal(journalSource(db, fc), cfg, fc.settings.promoTreatment);
          const entries = filterJournal(all, { from, to, groups });
          return {
            entries: entries.map((e) => ({ ...e, groupLabel: JOURNAL_GROUPS[e.group] })),
            totals: journalTotals(entries),
            unmapped: unmappedAccounts(entries, fc.settings.accountMap),
            accountMap: fc.settings.accountMap,
            groupList: Object.entries(JOURNAL_GROUPS).map(([id, label]) => ({ id, label })),
            treatment: fc.settings.promoTreatment
          };
        });
      },
      journalCsv(ctx, { from = null, to = null, groups = null } = {}) {
        guard(ctx, 'financeRead');
        return server.read((db) => {
          const fc = financeContext(db, cfg);
          const entries = filterJournal(buildJournal(journalSource(db, fc), cfg, fc.settings.promoTreatment), { from, to, groups });
          const totals = journalTotals(entries);
          return {
            filename: `but-toan-${from || 'dau'}-${to || 'nay'}.csv`,
            csv: journalCsv(entries, fc.settings.accountMap),
            count: entries.length,
            totals,
            unmapped: unmappedAccounts(entries, fc.settings.accountMap)
          };
        });
      },
      statementsCsv(ctx) {
        guard(ctx, 'financeRead');
        return server.read((db) => {
          const purchases = ensureProcurement(db).purchases;
          return { filename: 'bang-ke-thu-mua.csv', csv: statementsCsv(purchases), count: purchases.length };
        });
      },

      // =========================================================================================
      // CÀI ĐẶT
      settings(ctx) {
        guard(ctx, 'financeRead');
        return server.read((db) => {
          const s = financeSettings(db, cfg);
          const fin = ensureFinance(db);
          return {
            openingCashVnd: s.openingCashVnd,
            issueOn: s.issueOn,
            issueOnLocked: fin.einvoices.length > 0,
            promoTreatment: s.promoTreatment,
            accountMap: Object.entries(s.accountMap).map(([key, v]) => ({ key, label: v.label, code: v.code })),
            taxGroups: Object.entries(cfg.tax.groups).map(([id, g]) => ({ id, ...g })),
            canEdit: ['accounting', 'admin'].includes(ctx.role)
          };
        });
      },
      saveSettings(ctx, input) {
        guard(ctx, 'financeWrite');
        return server.write((db) => must(saveFinanceSettings(db, input, cfg)).settings);
      }
    },

    // =========================================================================================
    // 8. GIÁM SÁT NHÀ CUNG CẤP
    monitoring: {
      scorecard(ctx, { from = null, to = null } = {}) {
        guard(ctx, 'scorecard');
        return server.read((db, now) => {
          const proc = ensureProcurement(db);
          const rows = supplierScorecard({ pos: db.purchaseOrders, receipts: proc.receipts, claims: proc.claims, now }, { from, to }, cfg);
          return { today: today(now), weights: cfg.finance.scorecard.weights, warnBelow: cfg.finance.scorecard.warnBelow, rows };
        });
      }
    },

    // =========================================================================================
    // 9. TỔNG QUAN FOUNDER
    overview: {
      founder(ctx) {
        guard(ctx, 'overview');
        return server.read((db, now) => {
          const settings = financeSettings(db, cfg);
          const proc = ensureProcurement(db);
          const day = today(now);
          const wk = weekRange(day);
          const cov = coverage(db, now, settings);
          const fc = financeContext(db, cfg);

          // Tiền vào / ra của tuần này
          const inWeek = (iso) => inRange(dayKey(new Date(iso)), wk.from, wk.to);
          const cashIn = db.ledger.filter((l) => ['topup', 'prepaid_cycle', 'card_charge'].includes(l.kind) && inWeek(l.at)).reduce((s, l) => s + (l.real || 0), 0);
          const cashOut =
            db.ledger.filter((l) => l.kind === 'cancel_refund' && inWeek(l.at)).reduce((s, l) => s + (l.real || 0), 0) +
            proc.payments.filter((p) => inWeek(p.paidAt)).reduce((s, p) => s + p.amountVnd, 0) +
            proc.purchases.filter((p) => inWeek(p.at)).reduce((s, p) => s + p.statement.totalVnd, 0);

          // Margin tuần này; chưa có đơn nào giao trong tuần thì lấy tuần gần nhất có dữ liệu
          const steady = fc.margins.filter((r) => !r.firstCycle);
          const weekKeys = [...new Set(steady.map((r) => weekStartOf(r.deliveryDay)))].sort();
          const shownWeek = weekKeys.includes(wk.from) ? wk.from : weekKeys[weekKeys.length - 1] || null;
          const wr = shownWeek ? marginReport(steady.filter((r) => weekStartOf(r.deliveryDay) === shownWeek), cfg).steady : null;
          const firstCycle = marginReport(fc.margins, cfg).firstCycle;

          // Giữ chân: gói đã hết chu kỳ đầu mà gia hạn / tổng số gói đã hết chu kỳ hoặc đã dừng
          const live = ['scheduled', 'paid', 'charge_failed', 'locked', 'in_production', 'shipped'];
          let renewed = 0;
          let cancelled = 0;
          let lapsed = 0;
          for (const s of db.subscriptions) {
            const mine = db.orders.filter((o) => o.subscriptionId === s.id);
            const hasLive = mine.some((o) => live.includes(o.status));
            if ((s.renewals || []).length) renewed += 1;
            else if (s.status === 'cancelled') cancelled += 1;
            else if (!hasLive && mine.length) lapsed += 1;
          }
          const decided = renewed + cancelled + lapsed;

          const kpi = kpiOf(db, {}, cfg);
          const monthFrom = `${day.slice(0, 7)}-01`;
          const nextMonth = addDays(`${day.slice(0, 7)}-28`, 4);
          const monthTo = `${nextMonth.slice(0, 7)}-01`;
          const waste = wasteSummary(proc.stockMoves, new Date(`${monthFrom}T00:00:00+07:00`).toISOString(), new Date(`${monthTo}T00:00:00+07:00`).toISOString());
          const receivedMonth = db.purchaseOrders.filter((po) => po.deliveryDay >= monthFrom && po.deliveryDay < monthTo && ['received', 'received_partial', 'invoiced', 'matched', 'paid'].includes(po.status)).reduce((s, po) => s + po.totalVnd, 0);

          const payRowsNow = payRows(db, now);
          const aging = payablesAging(payRowsNow, day, cfg);
          const score = supplierScorecard({ pos: db.purchaseOrders, receipts: proc.receipts, claims: proc.claims, now }, {}, cfg);
          const fin = ensureFinance(db);
          const queue = fin.bankTxns.filter((t) => ['unmatched', 'amount_diff'].includes(t.status)).length;
          const pendingAdj = fin.adjustments.filter((a) => a.status === 'pending').length;

          const alerts = [];
          if (cov.coverage.alert) alerts.push({ id: 'coverage', text: 'Tỷ lệ bao phủ dưới ngưỡng', href: '/tai-chinh/dong-tien' });
          if (wr && wr.marginPct != null && wr.marginPct < cfg.alerts.minGrossMarginPct) alerts.push({ id: 'margin', text: `Margin tuần dưới ${Math.round(cfg.alerts.minGrossMarginPct * 100)}%`, href: '/tai-chinh/gia-von' });
          if (aging.overdueVnd > 0) alerts.push({ id: 'overdue', text: 'Có công nợ nhà cung cấp quá hạn', href: '/tai-chinh/cong-no' });
          if (queue) alerts.push({ id: 'bank', text: `${queue} giao dịch ngân hàng chờ khớp tay`, href: '/tai-chinh/thu-tien' });
          if (pendingAdj) alerts.push({ id: 'adjust', text: `${pendingAdj} yêu cầu điều chỉnh Fresh Credit chờ duyệt`, href: '/tai-chinh' });
          const weak = score.filter((s) => s.warn);
          if (weak.length) alerts.push({ id: 'supplier', text: `${weak.length} nhà cung cấp điểm dưới ${cfg.finance.scorecard.warnBelow}`, href: '/giam-sat' });

          return {
            today: day,
            week: wk,
            cash: { inVnd: cashIn, outVnd: cashOut, netVnd: cashIn - cashOut, cashVnd: cov.position.cashVnd },
            liability: { realVnd: cov.totals.liabilityRealVnd, promoVnd: cov.totals.promoOutstandingVnd },
            coverage: cov.coverage,
            margin: wr ? { weekStart: shownWeek, isThisWeek: shownWeek === wk.from, ...wr, minPct: cfg.alerts.minGrossMarginPct } : null,
            firstCycle,
            retention: { renewed, cancelled, lapsed, decided, pct: decided ? renewed / decided : null, target: 0.5, activeSubs: db.subscriptions.filter((s) => s.status === 'active').length, totalSubs: db.subscriptions.length },
            onTime: { pct: kpi.onTimePct, delivered: kpi.deliveredStops, failPct: kpi.failPct },
            waste: { month: monthFrom.slice(0, 7), costVnd: waste.totalVnd, receivedVnd: receivedMonth, pct: receivedMonth > 0 ? waste.totalVnd / receivedMonth : null },
            payables: { openVnd: aging.totalVnd, overdueVnd: aging.overdueVnd },
            alerts
          };
        });
      }
    }
  };
}

export { ForbiddenError };
