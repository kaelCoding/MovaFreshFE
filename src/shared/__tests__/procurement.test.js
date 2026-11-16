import { describe, it, expect } from 'vitest';
import { createServer, STORAGE_KEY } from '../mock-server/server';
import { createMemoryStorage } from '../mock-server/storage';
import { createApi } from '../api';
import { BUSINESS } from '../config/business';
import { SKUS } from '../data/catalog';
import { draftPurchaseOrders } from '../domain/purchasing';
import {
  agingBuckets, buildConfirmation, canTransition, certAlerts, certStatus, evaluateReceiptLine, marketDiff, poStage, priceAt, receiptComplete,
  shortByPct, shortToPreparedKg, skuCatalog, supplierForecast, threeWayMatch, validateInvoice, validatePayment, validatePriceEntry, validateSupplierProfile
} from '../domain/procurement';
import { countDiffs, expiryState, fefoAllocate, nextHubLotCode, stockBySku, wasteSummary } from '../domain/inventory';
import { allocateBatches } from '../domain/recall';
import { buildStatement, vndInWords } from '../domain/statement';

const START = '2026-11-20T09:00:00+07:00'; // Thứ Sáu
const admin = { role: 'admin' };
const purchasing = { role: 'purchasing' };
const hub = { role: 'hub' };
const supA = { role: 'supplier', supplierId: 'S-FACTORY' };
const supB = { role: 'supplier', supplierId: 'S-SEAFOOD' };

function setup() {
  const storage = createMemoryStorage();
  const server = createServer({ storage, startAt: START, running: false });
  return { server, storage, api: createApi(server) };
}

/** Chốt sổ ngày giao đầu tiên: tạo kế hoạch và PO nháp. */
function closeFirstDay(api) {
  api.demo.jumpTo(admin, 'cutoff');
  return api.ops.listProductionPlans(admin)[0];
}

const draftOf = (api, supplierId) =>
  api.ops.procurement.listPos(purchasing).find((p) => p.supplierId === supplierId && p.status === 'draft' && !p.sample);

// ---------------------------------------------------------------------------------------------
describe('đối chiếu 3 chiều PO / phiếu nhập / hóa đơn', () => {
  const po = {
    id: 'PO-T', supplierId: 'S-FACTORY', status: 'invoiced',
    lines: [
      { sku: 'NL-HEO-02', name: 'Ba rọi', qty: 100, unit: 'kg', unitPriceVnd: 140000 },
      { sku: 'NL-GA-03', name: 'Ức gà', qty: 50, unit: 'kg', unitPriceVnd: 85000 }
    ]
  };
  const receipts = [{ lines: [{ sku: 'NL-HEO-02', acceptedQty: 100, rejectedQty: 0 }, { sku: 'NL-GA-03', acceptedQty: 46, rejectedQty: 4 }] }];

  it('hóa đơn khớp: không có lỗi, phải trả = hóa đơn trừ phần không đạt', () => {
    const inv = { lines: [{ sku: 'NL-HEO-02', qty: 100, unitPriceVnd: 140000 }, { sku: 'NL-GA-03', qty: 50, unitPriceVnd: 85000 }] };
    const m = threeWayMatch({ po, receipts, invoice: inv });
    expect(m.ok).toBe(true);
    expect(m.issues).toEqual([]);
    expect(m.totals.invoiceVnd).toBe(100 * 140000 + 50 * 85000);
    expect(m.totals.claimVnd).toBe(4 * 85000);
    expect(m.totals.payableVnd).toBe(100 * 140000 + 46 * 85000);
  });

  it('phát hiện chênh số lượng (hóa đơn nhiều hơn hàng đã giao)', () => {
    const inv = { lines: [{ sku: 'NL-HEO-02', qty: 108, unitPriceVnd: 140000 }, { sku: 'NL-GA-03', qty: 50, unitPriceVnd: 85000 }] };
    const m = threeWayMatch({ po, receipts, invoice: inv });
    expect(m.ok).toBe(false);
    const q = m.issues.find((i) => i.type === 'qty_invoice_over');
    expect(q.sku).toBe('NL-HEO-02');
    expect(q.amountVnd).toBe(8 * 140000);
    // chỉ trả phần đã giao
    expect(m.totals.payableVnd).toBe(100 * 140000 + 46 * 85000);
  });

  it('phát hiện hóa đơn ít hơn hàng đã giao', () => {
    const inv = { lines: [{ sku: 'NL-HEO-02', qty: 90, unitPriceVnd: 140000 }, { sku: 'NL-GA-03', qty: 50, unitPriceVnd: 85000 }] };
    const m = threeWayMatch({ po, receipts, invoice: inv });
    expect(m.issues.some((i) => i.type === 'qty_invoice_under' && i.sku === 'NL-HEO-02')).toBe(true);
  });

  it('phát hiện chênh giá và tính tiền chênh', () => {
    const inv = { lines: [{ sku: 'NL-HEO-02', qty: 100, unitPriceVnd: 145000 }, { sku: 'NL-GA-03', qty: 50, unitPriceVnd: 85000 }] };
    const m = threeWayMatch({ po, receipts, invoice: inv });
    expect(m.ok).toBe(false);
    const p = m.issues.find((i) => i.type === 'price_diff');
    expect(p.sku).toBe('NL-HEO-02');
    expect(p.amountVnd).toBe(5000 * 100);
    expect(m.totals.priceDiffVnd).toBe(500000);
    // trả theo đơn giá PO, trừ khi chấp nhận giá hóa đơn
    expect(m.totals.payableVnd).toBe(100 * 140000 + 46 * 85000);
    const accepted = threeWayMatch({ po, receipts, invoice: inv, acceptInvoicePrice: true });
    expect(accepted.totals.payableVnd).toBe(100 * 145000 + 46 * 85000);
  });

  it('cả số lượng lẫn giá cùng lệch, mặt hàng ngoài PO, giao thiếu so với PO', () => {
    const inv = {
      lines: [
        { sku: 'NL-HEO-02', qty: 110, unitPriceVnd: 150000 },
        { sku: 'NL-GA-03', qty: 50, unitPriceVnd: 85000 },
        { sku: 'NL-BO-01', qty: 5, unitPriceVnd: 260000 }
      ]
    };
    const m = threeWayMatch({ po, receipts, invoice: inv });
    const types = m.issues.map((i) => i.type);
    expect(types).toContain('qty_invoice_over');
    expect(types).toContain('price_diff');
    expect(types).toContain('line_not_in_po');
    expect(m.ok).toBe(false);

    const shortReceipts = [{ lines: [{ sku: 'NL-HEO-02', acceptedQty: 80, rejectedQty: 0 }, { sku: 'NL-GA-03', acceptedQty: 50, rejectedQty: 0 }] }];
    const m2 = threeWayMatch({ po, receipts: shortReceipts, invoice: { lines: [{ sku: 'NL-HEO-02', qty: 80, unitPriceVnd: 140000 }, { sku: 'NL-GA-03', qty: 50, unitPriceVnd: 85000 }] } });
    expect(m2.ok).toBe(true); // giao thiếu chỉ cảnh báo, hóa đơn khớp hàng đã giao
    expect(m2.issues.find((i) => i.type === 'short_delivery').severity).toBe('warn');
  });

  it('dung sai số lượng cấu hình được: lệch nhỏ hơn dung sai thì không báo', () => {
    const inv = { lines: [{ sku: 'NL-HEO-02', qty: 100.5, unitPriceVnd: 140000 }, { sku: 'NL-GA-03', qty: 50, unitPriceVnd: 85000 }] };
    expect(threeWayMatch({ po, receipts, invoice: inv }).ok).toBe(true);
    const strict = { ...BUSINESS, purchasing: { ...BUSINESS.purchasing, matchTolerance: { qtyPct: 0, pricePct: 0 } } };
    expect(threeWayMatch({ po, receipts, invoice: inv }, strict).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
describe('FEFO và tồn kho', () => {
  const now = new Date('2026-11-20T09:00:00+07:00');
  const iso = (days) => new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();
  const lot = (id, sku, qty, expireDays, receivedDays, extra = {}) => ({ id, sku, lotCode: `L-${id}`, qty, qtyIn: qty, unit: 'kg', receivedAt: iso(receivedDays), expiresAt: iso(expireDays), heldBy: null, ...extra });

  it('xuất lô hết hạn trước, kể cả lô nhận sau', () => {
    const lots = [lot('A', 'HS-CA-01', 10, 5, -1), lot('B', 'HS-CA-01', 10, 2, -3), lot('C', 'HS-CA-01', 10, 9, -1)];
    const plan = fefoAllocate(lots, { sku: 'HS-CA-01', qty: 14 }, now);
    expect(plan.ok).toBe(true);
    expect(plan.allocations.map((a) => [a.stockId, a.qty])).toEqual([['B', 10], ['A', 4]]);
    expect(plan.shortfall).toBe(0);
  });

  it('cùng hạn thì lô nhận sớm hơn trước', () => {
    const lots = [lot('A', 'HS-CA-01', 10, 3, -1), lot('B', 'HS-CA-01', 10, 3, -4)];
    expect(fefoAllocate(lots, { sku: 'HS-CA-01', qty: 5 }, now).allocations[0].stockId).toBe('B');
  });

  it('bỏ qua lô đã hết hạn, lô đang bị giữ và SKU khác; thiếu hàng thì báo phần thiếu', () => {
    const lots = [
      lot('X', 'HS-CA-01', 10, -1, -5), // hết hạn
      lot('H', 'HS-CA-01', 10, 1, -2, { heldBy: 'RC-1' }), // bị giữ
      lot('Y', 'HS-TOM-02', 10, 1, -2),
      lot('OK', 'HS-CA-01', 6, 4, -1)
    ];
    const plan = fefoAllocate(lots, { sku: 'HS-CA-01', qty: 10 }, now);
    expect(plan.allocations.map((a) => a.stockId)).toEqual(['OK']);
    expect(plan.ok).toBe(false);
    expect(plan.shortfall).toBe(4);
  });

  it('tình trạng hạn dùng, tổng theo SKU và kiểm kê', () => {
    const lots = [lot('A', 'HS-CA-01', 10, 1, -1), lot('B', 'HS-CA-01', 5, 6, -1), lot('C', 'HS-CA-01', 3, -1, -5), lot('D', 'HS-CA-01', 2, 4, -1, { heldBy: 'RC-1' })];
    expect(expiryState(lots[0], now)).toBe('expiring');
    expect(expiryState(lots[1], now)).toBe('ok');
    expect(expiryState(lots[2], now)).toBe('expired');
    const s = stockBySku(lots, now)[0];
    expect(s).toMatchObject({ total: 20, available: 15, expiring: 10, expired: 3, held: 2 });
    expect(countDiffs(lots, { A: 8, B: 5, Z: 1 })).toEqual([{ stockId: 'A', sku: 'HS-CA-01', lotCode: 'L-A', systemQty: 10, countedQty: 8, diff: -2 }]);
    expect(nextHubLotCode('HS-CA-01', ['HUB-HS-CA-01-20261120-01'], now.toISOString())).toBe('HUB-HS-CA-01-20261120-02');
  });

  it('chi phí hao hụt theo lý do trong tháng', () => {
    const moves = [
      { kind: 'waste', reason: 'expired', costVnd: 100000, at: '2026-11-05T00:00:00Z' },
      { kind: 'waste', reason: 'expired', costVnd: 50000, at: '2026-11-06T00:00:00Z' },
      { kind: 'count', reason: 'count', costVnd: 30000, at: '2026-11-07T00:00:00Z' },
      { kind: 'waste', reason: 'spoiled', costVnd: 999, at: '2026-10-07T00:00:00Z' }
    ];
    const r = wasteSummary(moves, '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z');
    expect(r.totalVnd).toBe(180000);
    expect(r.rows[0]).toMatchObject({ reason: 'expired', costVnd: 150000, count: 2 });
  });

  it('kho phụ xuất FEFO qua API, trừ đúng lô và chặn xuất quá tồn', () => {
    const { api } = setup();
    const before = api.ops.hub.stock(hub);
    const cheLots = before.lots.filter((l) => l.sku === 'HS-CA-01' && l.state !== 'expired');
    expect(cheLots[0].fefoRank).toBe(1);
    const first = cheLots[0];
    const plan = api.ops.hub.fefoPlan(hub, { sku: 'HS-CA-01', qty: first.qty + 3 });
    expect(plan.allocations[0].stockId).toBe(first.id);
    expect(plan.allocations).toHaveLength(2);
    api.ops.hub.issue(hub, { sku: 'HS-CA-01', qty: first.qty + 3 });
    const after = api.ops.hub.stock(hub);
    expect(after.lots.find((l) => l.id === first.id)).toBeUndefined(); // hết lô đầu
    expect(() => api.ops.hub.issue(hub, { sku: 'HS-CA-01', qty: 9999 })).toThrow(/Kho chỉ còn/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('nhà cung cấp, giấy chứng nhận, bảng giá', () => {
  it('cảnh báo giấy chứng nhận trước 30 ngày và khi đã hết hạn', () => {
    const now = new Date('2026-11-20T09:00:00+07:00');
    expect(certStatus({ expiresAt: '2026-12-20' }, now)).toEqual({ state: 'expiring', daysLeft: 30 });
    expect(certStatus({ expiresAt: '2026-12-21' }, now).state).toBe('valid');
    expect(certStatus({ expiresAt: '2026-11-20' }, now)).toEqual({ state: 'expiring', daysLeft: 0 });
    expect(certStatus({ expiresAt: '2026-11-19' }, now)).toEqual({ state: 'expired', daysLeft: -1 });
    const alerts = certAlerts([{ id: 'S', name: 'S', certs: [{ expiresAt: '2027-03-01' }, { expiresAt: '2026-12-01' }, { expiresAt: '2026-11-01' }] }], now);
    expect(alerts.map((a) => a.state)).toEqual(['expired', 'expiring']);
  });

  it('hạt giống có giấy sắp hết hạn và đã hết hạn để thấy cảnh báo', () => {
    const { api } = setup();
    const res = api.ops.procurement.suppliers(purchasing);
    expect(res.suppliers.length).toBeGreaterThanOrEqual(13);
    expect(res.alerts.some((a) => a.state === 'expired')).toBe(true);
    expect(res.alerts.some((a) => a.state === 'expiring')).toBe(true);
    expect(res.suppliers.every((s) => !('pin' in s))).toBe(true);
    const kinds = new Set(res.suppliers.map((s) => s.kind));
    for (const k of ['factory', 'htx', 'nong_ho', 'lo_mo', 'seafood', 'long_haul', 'last_mile', 'packaging']) expect(kinds.has(k)).toBe(true);
  });

  it('kiểm tra hồ sơ: MST hoặc CCCD (nông hộ), tài khoản, kỳ công nợ, người liên hệ', () => {
    const ok = { kind: 'htx', name: 'HTX A', taxId: '6001234567', bank: { bankName: 'Agribank', accountNo: '123456789', accountName: 'HTX A' }, termDays: 15, contact: { name: 'Bà B', phone: '0912345678' } };
    expect(validateSupplierProfile(ok)).toEqual([]);
    expect(validateSupplierProfile({ ...ok, taxId: '123' })[0]).toMatch(/mã số thuế/i);
    expect(validateSupplierProfile({ ...ok, kind: 'nong_ho', cccd: '' })[0]).toMatch(/CCCD/);
    expect(validateSupplierProfile({ ...ok, kind: 'nong_ho', taxId: '', cccd: '066085012345' })).toEqual([]);
    expect(validateSupplierProfile({ ...ok, bank: { bankName: '', accountNo: '', accountName: '' } })[0]).toMatch(/ngân hàng/);
    expect(validateSupplierProfile({ ...ok, termDays: -1 })[0]).toMatch(/Kỳ công nợ/);
    expect(validateSupplierProfile({ ...ok, contact: { name: '', phone: 'abc' } })).toHaveLength(2);
    expect(validateSupplierProfile({ ...ok, kind: 'xyz' })[0]).toMatch(/loại/);
  });

  it('giá theo ngày hiệu lực: lấy mức mới nhất không muộn hơn ngày hỏi, lịch sử và chênh lệch thị trường', () => {
    const list = [
      { id: 'P1', sku: 'NL-BO-01', priceVnd: 240000, effectiveFrom: '2026-09-01' },
      { id: 'P2', sku: 'NL-BO-01', priceVnd: 260000, effectiveFrom: '2026-11-10' },
      { id: 'P3', sku: 'NL-BO-01', priceVnd: 280000, effectiveFrom: '2026-12-01' },
      { id: 'P4', sku: 'NL-GA-03', priceVnd: 1, effectiveFrom: '2026-01-01' }
    ];
    expect(priceAt(list, 'NL-BO-01', '2026-08-31')).toBe(SKUS['NL-BO-01'].priceVnd); // chưa có mức nào: giá danh mục
    expect(priceAt(list, 'NL-BO-01', '2026-09-01')).toBe(240000);
    expect(priceAt(list, 'NL-BO-01', '2026-11-30')).toBe(260000);
    expect(priceAt(list, 'NL-BO-01', '2026-12-01')).toBe(280000);
    expect(validatePriceEntry(list, { sku: 'NL-BO-01', priceVnd: 1000, effectiveFrom: '2026-10-01' })[0]).toMatch(/sớm hơn/);
    expect(validatePriceEntry(list, { sku: 'NL-BO-01', priceVnd: 0, effectiveFrom: '2026-12-05' })[0]).toMatch(/Giá/);
    const d = marketDiff('NL-BO-01', 300000);
    expect(d.marketVnd).toBe(SKUS['NL-BO-01'].marketPriceVnd);
    expect(d.diffPct).toBeGreaterThan(0);
    expect(d.warn).toBe(true);
    expect(marketDiff('NL-BO-01', 260000).warn).toBe(false);
  });

  it('PO chốt sổ lấy đơn giá theo bảng giá có hiệu lực tại ngày giao', () => {
    const { api } = setup();
    const today = api.ops.procurement.prices(purchasing).today;
    const day = '2026-11-23';
    expect(day > today).toBe(true);
    api.ops.procurement.addPrice(purchasing, { sku: 'NL-BO-01', priceVnd: 300000, effectiveFrom: day, note: 'Tăng giá mùa cao điểm' });
    api.ops.procurement.addPrice(purchasing, { sku: 'NL-BO-01', priceVnd: 310000, effectiveFrom: '2026-12-15' });
    const plan = closeFirstDay(api);
    const po = api.ops.procurement.listPos(purchasing).find((p) => p.deliveryDay === plan.day && p.supplierId === 'S-FACTORY');
    const line = po.lines.find((l) => l.sku === 'NL-BO-01');
    const expected = plan.day >= day ? 300000 : SKUS['NL-BO-01'].priceVnd;
    if (line) expect(line.unitPriceVnd).toBe(expected);
    // bảng giá hiện hành hôm nay vẫn là giá cũ
    const row = api.ops.procurement.prices(purchasing).rows.find((r) => r.sku === 'NL-BO-01');
    expect(row.priceVnd).toBe(SKUS['NL-BO-01'].priceVnd);
    expect(row.upcoming.length).toBe(2);
    expect(row.history.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------------------------
describe('đề xuất mua: trừ tồn hàng để lâu, dự phòng hao hụt', () => {
  const bom = { boxes: 50, skuGrams: { 'NL-GAO-01': 100000, 'NL-BO-01': 20000 }, sauces: {}, packaging: { 'BB-THUNG-01': 50 } };

  it('hàng để lâu (gạo, bao bì) trừ tồn khả dụng, hàng tươi vẫn mua đủ', () => {
    const none = draftPurchaseOrders(bom, '2026-11-24');
    const gao0 = none.flatMap((p) => p.lines).find((l) => l.sku === 'NL-GAO-01');
    expect(gao0.qty).toBe(105); // 100 kg * (1 + 5% dự phòng)
    const withStock = draftPurchaseOrders(bom, '2026-11-24', BUSINESS, { availableStock: (sku) => ({ 'NL-GAO-01': 60, 'BB-THUNG-01': 80, 'NL-BO-01': 999 }[sku] || 0) });
    const lines = withStock.flatMap((p) => p.lines);
    expect(lines.find((l) => l.sku === 'NL-GAO-01')).toMatchObject({ qty: 45, needQty: 105, stockUsedQty: 60 });
    expect(lines.find((l) => l.sku === 'BB-THUNG-01')).toBeUndefined(); // tồn đủ nên không đặt
    const po = withStock.find((p) => p.supplierId === 'S-PACK');
    expect(po).toBeUndefined();
    expect(lines.find((l) => l.sku === 'NL-BO-01').stockUsedQty).toBe(0); // bò là hàng tươi
    const beef = none.flatMap((p) => p.lines).find((l) => l.sku === 'NL-BO-01');
    expect(beef.qty).toBe(22.2); // 20 kg / 0,95 * 1,05 = 22,1 làm tròn lên 0,1
  });

  it('dự phòng hao hụt lấy từ cấu hình', () => {
    const cfg = { ...BUSINESS, purchasing: { ...BUSINESS.purchasing, wasteBufferPct: 0.1 } };
    const line = draftPurchaseOrders(bom, '2026-11-24', cfg).flatMap((p) => p.lines).find((l) => l.sku === 'NL-GAO-01');
    expect(line.qty).toBe(110);
  });

  it('chốt sổ trừ tồn khả dụng của gạo trong kho và giữ chỗ cho PO chưa nhận', () => {
    const { api } = setup();
    const plan = closeFirstDay(api);
    const po = api.ops.procurement.listPos(purchasing).find((p) => p.deliveryDay === plan.day && p.supplierId === 'S-FACTORY');
    const gao = po.lines.find((l) => l.sku === 'NL-GAO-01');
    const stockGao = 300; // hạt giống có 300 kg gạo
    const used = gao ? gao.stockUsedQty : (po.coveredByStock.find((c) => c.sku === 'NL-GAO-01') || { qty: 0 }).qty;
    expect(used).toBeGreaterThan(0);
    const need = (plan.bom.skuGrams['NL-GAO-01'] / 1000) * 1.05;
    // mua + lấy từ tồn = nhu cầu (có dự phòng), và không lấy quá tồn
    expect(used + (gao ? gao.qty : 0)).toBeGreaterThanOrEqual(Math.min(need, stockGao) - 0.2);
    expect(used).toBeLessThanOrEqual(stockGao);
  });
});

// ---------------------------------------------------------------------------------------------
describe('vòng đời PO', () => {
  it('thứ tự trạng thái chỉ đi tới và PO đã đối chiếu quá hạn thì thành "đến hạn"', () => {
    expect(canTransition('draft', 'approved')).toBe(true);
    expect(canTransition('draft', 'sent')).toBe(false);
    expect(canTransition('approved', 'sent')).toBe(true);
    expect(canTransition('sent', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'received')).toBe(true);
    expect(canTransition('received', 'invoiced')).toBe(true);
    expect(canTransition('invoiced', 'matched')).toBe(true);
    expect(canTransition('matched', 'paid')).toBe(true);
    expect(canTransition('paid', 'matched')).toBe(false);
    expect(canTransition('invoiced', 'paid')).toBe(false);
    const po = { status: 'matched', dueAt: '2026-11-20T10:00:00.000Z' };
    expect(poStage(po, new Date('2026-11-20T09:00:00Z'))).toBe('matched');
    expect(poStage(po, new Date('2026-11-20T11:00:00Z'))).toBe('due');
    expect(poStage({ ...po, status: 'paid' }, new Date('2026-12-01T00:00:00Z'))).toBe('paid');
  });

  it('xác nhận thiếu: phải có dòng ít hơn số đặt, không vượt số đặt; thiếu 10% quy ra kg thành phẩm', () => {
    const po = { lines: [{ sku: 'NL-BO-01', name: 'Bò', qty: 100, unit: 'kg' }, { sku: 'NL-GA-03', name: 'Gà', qty: 50, unit: 'kg' }] };
    expect(buildConfirmation(po, { result: 'short', lines: [{ sku: 'NL-BO-01', confirmedQty: 100 }] }, 'x').ok).toBe(false);
    expect(buildConfirmation(po, { result: 'short', lines: [{ sku: 'NL-BO-01', confirmedQty: 120 }] }, 'x').ok).toBe(false);
    const r = buildConfirmation(po, { result: 'short', lines: shortByPct(po, 0.1) }, 'x');
    expect(r.ok).toBe(true);
    expect(r.confirmation.result).toBe('short');
    expect(r.confirmation.shortLines).toEqual([{ sku: 'NL-BO-01', shortQty: 10 }, { sku: 'NL-GA-03', shortQty: 5 }]);
    expect(r.confirmation.shortPct).toBeCloseTo(0.1, 5);
    expect(shortToPreparedKg('NL-BO-01', 10)).toBe(9.5); // 10 kg thô * tỷ lệ thu hồi 0,95
    expect(buildConfirmation(po, { result: 'full' }, 'x').confirmation.result).toBe('full');
  });

  it('chốt sổ → PO nháp → duyệt → gửi → nhà cung cấp xác nhận thiếu 10% → đề xuất món thay cho đơn bị ảnh hưởng', () => {
    const { api } = setup();
    closeFirstDay(api);
    const draft = draftOf(api, 'S-FACTORY');
    expect(draft.status).toBe('draft');
    expect(() => api.ops.procurement.sendPo(purchasing, { poId: draft.id, via: 'link' })).toThrow(/duyệt/);
    api.ops.procurement.approvePo(purchasing, draft.id);
    api.ops.procurement.sendPo(purchasing, { poId: draft.id, via: 'link' });

    // Nhà cung cấp thấy PO cần xác nhận và xác nhận thiếu 10%
    const ov = api.ops.supplierPortal.overview(supA);
    const mine = ov.pos.find((p) => p.id === draft.id);
    expect(mine.canConfirm).toBe(true);
    api.ops.supplierPortal.confirmPo(supA, { poId: draft.id, shortPct: 0.1, note: 'Lô bò về trễ' });

    const detail = api.ops.procurement.getPo(purchasing, draft.id);
    expect(detail.po.status).toBe('confirmed');
    expect(detail.po.shortPct).toBeCloseTo(0.1, 1);
    expect(detail.impacts.length).toBeGreaterThan(0);
    const affected = detail.impacts.flatMap((i) => i.affected);
    expect(affected.length).toBeGreaterThan(0);
    // Đề xuất không chứa thông tin khách
    expect(JSON.stringify(detail.impacts)).not.toMatch(/"(phone|address|customerId|recipient)"/);
    const withSuggestion = affected.find((a) => a.hits.some((h) => h.suggestedDishId));
    expect(withSuggestion).toBeTruthy();

    // Áp món thay đề xuất cho một đơn bị ảnh hưởng (mua hàng có quyền), ghi vào báo cáo thiếu
    const imp = detail.impacts.find((i) => i.affected.some((a) => a.hits.some((h) => h.suggestedDishId)));
    const a = imp.affected.find((x) => x.hits.some((h) => h.suggestedDishId));
    const hit = a.hits.find((h) => h.suggestedDishId);
    const res = api.ops.substituteDish(purchasing, { orderId: a.orderId, mealIndex: hit.mealIndex, kind: hit.kind, toDishId: hit.suggestedDishId, shortageId: imp.shortageId, reason: 'NCC thiếu hàng' });
    expect(res.orderId).toBe(a.orderId);
    const again = api.ops.procurement.getPo(purchasing, draft.id).impacts.find((i) => i.shortageId === imp.shortageId);
    expect(again.handled.some((h) => h.orderId === a.orderId)).toBe(true);
    // Xưởng cũng thấy báo cáo thiếu này trong sổ của mình
    expect(api.ops.factory.snapshot({ role: 'workshop' }).factory.shortages.some((s) => s.source === 'po' && s.poId === draft.id)).toBe(true);
  });

  it('nhận hàng: nhiệt độ vượt ngưỡng không nhận đạt, phần không đạt cần lý do và ảnh, tạo phiếu nhập + lô tồn + khiếu nại', () => {
    const { api } = setup();
    closeFirstDay(api);
    const draft = draftOf(api, 'S-SEAFOOD');
    expect(() => api.ops.hub.receive(hub, { poId: draft.id, lines: [{ sku: draft.lines[0].sku, acceptedQty: 1, tempC: 2 }] })).toThrow(/PO này chưa gửi/);
    api.ops.procurement.approvePo(purchasing, draft.id);
    api.ops.procurement.sendPo(purchasing, { poId: draft.id, via: 'print' });
    api.ops.supplierPortal.confirmPo(supB, { poId: draft.id, result: 'full' });
    const okTemp = (sku) => (SKUS[sku].temp === 'frozen' ? -20 : 2);
    const badTemp = (sku) => (SKUS[sku].temp === 'frozen' ? -5 : 9);
    const [l0, l1] = draft.lines;
    const rej = 0.1;
    const photo = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

    const attempt = (line, p = '') => () => api.ops.hub.receive(hub, { poId: draft.id, photo: p, lines: [line] });
    expect(attempt({ sku: l0.sku, acceptedQty: l0.qty, tempC: badTemp(l0.sku) })).toThrow(/vượt ngưỡng/);
    expect(attempt({ sku: l0.sku, acceptedQty: l0.qty - rej, rejectedQty: rej, tempC: okTemp(l0.sku) })).toThrow(/lý do/);
    expect(attempt({ sku: l0.sku, acceptedQty: l0.qty - rej, rejectedQty: rej, reason: 'quality', tempC: okTemp(l0.sku) })).toThrow(/ảnh/);
    // nhận đủ dòng đầu: tạo phiếu nhập và lô tồn có hạn dùng
    api.ops.hub.receive(hub, { poId: draft.id, lines: [{ sku: l0.sku, acceptedQty: l0.qty, tempC: okTemp(l0.sku) }] });
    const d = api.ops.procurement.getPo(purchasing, draft.id);
    expect(d.po.status).toBe('received_partial');
    expect(d.receipts).toHaveLength(1);
    expect(d.lines.find((l) => l.sku === l0.sku).accepted).toBe(l0.qty);
    const lot = api.ops.hub.stock(hub).lots.find((l) => l.receiptId === d.receipts[0].id && l.sku === l0.sku);
    expect(lot.lotCode).toMatch(/^HUB-/);
    expect(Date.parse(lot.expiresAt)).toBeGreaterThan(Date.parse(lot.receivedAt));

    // nhận dòng còn lại, có hàng không đạt kèm ảnh: nhận đủ và sinh phiếu khiếu nại trừ vào công nợ
    const claimBefore = api.ops.procurement.payables(purchasing).totals.claimOpenVnd;
    const r = api.ops.hub.receive(hub, {
      poId: draft.id, photo,
      lines: [{ sku: l1.sku, acceptedQty: l1.qty - rej, rejectedQty: rej, reason: 'damaged', tempC: okTemp(l1.sku), note: 'Rách bao bì' }]
    });
    expect(r.status).toBe('received');
    expect(r.claims).toHaveLength(1);
    expect(r.claims[0].amountVnd).toBe(Math.round(rej * l1.unitPriceVnd));
    expect(r.claims[0].status).toBe('open');
    expect(api.ops.supplierPortal.overview(supB).claims).toHaveLength(1);
    expect(api.ops.procurement.payables(purchasing).totals.claimOpenVnd - claimBefore).toBe(r.claims[0].amountVnd);
  });

  it('hóa đơn → đối chiếu (chặn khi lệch) → trả tiền; tiền mặt từ 5 triệu bị chặn', () => {
    const { api } = setup();
    const list = api.ops.procurement.listPos(purchasing);
    const invoiced = list.find((p) => p.status === 'invoiced' && p.supplierId === 'S-FACTORY');
    expect(invoiced).toBeTruthy();
    const d = api.ops.procurement.getPo(purchasing, invoiced.id);
    expect(d.match.ok).toBe(false);
    const types = d.match.issues.map((i) => i.type);
    expect(types).toContain('price_diff');
    expect(types).toContain('qty_invoice_over');
    expect(() => api.ops.procurement.matchPo(purchasing, { poId: invoiced.id })).toThrow(/chênh lệch/);
    expect(() => api.ops.procurement.matchPo(purchasing, { poId: invoiced.id, acceptDiff: true })).toThrow(/lý do/);
    const res = api.ops.procurement.matchPo(purchasing, { poId: invoiced.id, acceptDiff: true, note: 'Đã thống nhất với NCC giữ giá PO, trả theo hàng đã giao' });
    expect(res.po.status).toBe('matched');
    expect(res.po.payableVnd).toBeLessThan(d.match.totals.invoiceVnd);
    expect(res.po.payableVnd).toBe(d.match.totals.payableVnd);
    // khiếu nại phần không đạt đã trừ vào công nợ
    expect(api.ops.procurement.payables(purchasing).claims.filter((c) => c.poId === invoiced.id).every((c) => c.status === 'deducted')).toBe(true);
    expect(() => api.ops.procurement.payPo(purchasing, { poId: invoiced.id, method: 'cash' })).toThrow(/chuyển khoản/);
    const pay = api.ops.procurement.payPo(accountingCtx(), { poId: invoiced.id, method: 'bank_transfer', ref: 'UNC-1' });
    expect(pay.po.status).toBe('paid');
    expect(() => api.ops.procurement.payPo(purchasing, { poId: invoiced.id, method: 'bank_transfer' })).toThrow(/đã đối chiếu/);
  });

  it('công nợ: đến hạn ngày nào, đã trả, tuổi nợ; PO đã đối chiếu quá hạn hiện là "đến hạn"', () => {
    const { api } = setup();
    const pay = api.ops.procurement.payables(purchasing);
    const due = pay.rows.find((r) => r.stage === 'due');
    expect(due).toBeTruthy();
    expect(due.daysToDue).toBeLessThan(0);
    const paid = pay.rows.find((r) => r.status === 'paid');
    expect(paid.paidAt).toBeTruthy();
    const open = pay.rows.find((r) => r.status === 'matched' && r.daysToDue > 0);
    expect(open.dueAt).toBeTruthy();
    expect(pay.aging.find((b) => b.id === 'overdue').count).toBeGreaterThanOrEqual(1);
    expect(pay.totals.openVnd).toBeGreaterThan(0);
    expect(agingBuckets([{ status: 'matched', daysToDue: 3, payableVnd: 10 }, { status: 'matched', daysToDue: 20, payableVnd: 5 }, { status: 'paid', daysToDue: 1, payableVnd: 99 }]).map((b) => b.amountVnd)).toEqual([0, 10, 0, 5, 0]);
  });

  it('kiểm tra hóa đơn và thanh toán', () => {
    expect(validateInvoice({ number: '', issuedAt: 'x', lines: [] }).length).toBe(3);
    expect(validateInvoice({ number: '1', issuedAt: '2026-11-01', lines: [{ sku: 'NL-GA-03', qty: 2, unitPriceVnd: 85000 }] })).toEqual([]);
    expect(validatePayment({ amountVnd: 4999999, method: 'cash' }).ok).toBe(true);
    expect(validatePayment({ amountVnd: 5000000, method: 'cash' })).toMatchObject({ ok: false, code: 'CASH_OVER_LIMIT' });
    expect(validatePayment({ amountVnd: 5000000, method: 'bank_transfer' }).ok).toBe(true);
    expect(validatePayment({ amountVnd: 0, method: 'bank_transfer' }).ok).toBe(false);
  });

  it('đánh giá dòng nhận hàng và nhận đủ', () => {
    expect(evaluateReceiptLine({ sku: 'NL-BO-01', acceptedQty: 5, tempC: 3 }).ok).toBe(true);
    expect(evaluateReceiptLine({ sku: 'NL-BO-01', acceptedQty: 5, tempC: 6 }).ok).toBe(false);
    expect(evaluateReceiptLine({ sku: 'NL-BO-01', acceptedQty: 0, rejectedQty: 5, reason: 'temp_breach', tempC: 6 }).ok).toBe(true);
    expect(evaluateReceiptLine({ sku: 'HS-TOM-02', acceptedQty: 5, tempC: -10 }).ok).toBe(false);
    expect(evaluateReceiptLine({ sku: 'NL-GAO-01', acceptedQty: 5 }).ok).toBe(true); // hàng khô không cần nhiệt độ
    expect(evaluateReceiptLine({ sku: 'NL-GAO-01', acceptedQty: 0 }).ok).toBe(false);
    const po = { lines: [{ sku: 'NL-GAO-01', qty: 100 }], confirmation: { lines: [{ sku: 'NL-GAO-01', confirmedQty: 90 }] } };
    expect(receiptComplete(po, [{ lines: [{ sku: 'NL-GAO-01', acceptedQty: 85, rejectedQty: 5 }] }])).toBe(true);
    expect(receiptComplete(po, [{ lines: [{ sku: 'NL-GAO-01', acceptedQty: 60, rejectedQty: 0 }] }])).toBe(false);
  });
});

const accountingCtx = () => ({ role: 'accounting' });

// ---------------------------------------------------------------------------------------------
describe('thu hồi lô', () => {
  /** Dựng ngày chốt sổ + hai lô cùng mặt hàng, rồi tính độc lập đơn nào chứa lô nào. */
  function scenario() {
    const ctxs = setup();
    const { api } = ctxs;
    closeFirstDay(api);
    for (let i = 0; i < 4; i++) api.demo.jumpTo(admin, 'cutoff'); // chốt thêm vài ngày để có ngày nhiều đơn bò
    // Chọn ngày đã chốt có nhiều túi thịt bò nhất
    const beefBags = (day) =>
      api.ops.factory.snapshot(admin, day).orders.reduce((s, o) => s + (o.items.find((i) => i.key === 'NL-BO-01' && !i.hub)?.bags || 0), 0);
    const day = api.ops.listProductionPlans(admin).map((p) => p.day).sort((a, b) => beefBags(b) - beefBags(a))[0];
    const seeded = api.demo.seedTrace(admin, { day, sku: 'NL-BO-01' });
    expect(seeded.sku).toBe('NL-BO-01'); // thu hồi một lô thịt bò
    const snap = api.ops.factory.snapshot(admin, seeded.day);
    const [codeA, codeB] = seeded.lotCodes;
    const batches = snap.factory.batches.filter((b) => b.key === seeded.sku);
    const nA = batches.find((b) => b.lotCode === codeA).bags;
    const lists = snap.orders
      .filter((o) => o.tripId === seeded.tripId)
      .sort((a, b) => a.orderId.localeCompare(b.orderId))
      .map((o) => ({ orderId: o.orderId, bags: o.items.find((i) => i.key === seeded.sku && !i.hub)?.bags || 0 }))
      .filter((o) => o.bags > 0);
    // Tính tay: túi thứ 1..nA là lô A, các túi sau là lô B
    const expectedA = [];
    const expectedB = [];
    let pos = 0;
    for (const o of lists) {
      if (pos < nA) expectedA.push(o.orderId);
      if (pos + o.bags > nA) expectedB.push(o.orderId);
      pos += o.bags;
    }
    return { ...ctxs, seeded, codeA, codeB, lists, expectedA, expectedB, nA };
  }

  it('chia túi theo thứ tự cố định: mỗi đơn nhận đủ số túi của mình, không đơn nào bị bỏ hay lặp', () => {
    const batches = [
      { id: 'B1', key: 'NL-BO-01', bags: 5, lotCode: 'L1', scope: 'd|T1', producedAt: '2026-11-20T01:00:00Z', type: 'sku' },
      { id: 'B2', key: 'NL-BO-01', bags: 4, lotCode: 'L2', scope: 'd|T1', producedAt: '2026-11-20T02:00:00Z', type: 'sku' },
      { id: 'B3', key: 'NL-BO-01', bags: 9, lotCode: 'L3', scope: 'd|T2', producedAt: '2026-11-20T02:00:00Z', type: 'sku' }
    ];
    const mk = (id, tripId, bags) => ({ orderId: id, deliveryDay: 'd', tripId, items: [{ key: 'NL-BO-01', bags, hub: false }] });
    const lists = [mk('O3', 'T1', 3), mk('O1', 'T1', 2), mk('O2', 'T1', 4), mk('O9', 'T2', 5), { orderId: 'O5', deliveryDay: 'd', tripId: 'T1', items: [{ key: 'NL-GA-03', bags: 2, hub: false }] }];
    const a = allocateBatches({ batches, lists });
    expect(a.O1).toEqual([{ batchId: 'B1', lotCode: 'L1', key: 'NL-BO-01', bags: 2 }]);
    expect(a.O2).toEqual([{ batchId: 'B1', lotCode: 'L1', key: 'NL-BO-01', bags: 3 }, { batchId: 'B2', lotCode: 'L2', key: 'NL-BO-01', bags: 1 }]);
    expect(a.O3).toEqual([{ batchId: 'B2', lotCode: 'L2', key: 'NL-BO-01', bags: 3 }]);
    expect(a.O9).toEqual([{ batchId: 'B3', lotCode: 'L3', key: 'NL-BO-01', bags: 5 }]);
    expect(a.O5).toBeUndefined(); // đơn không có bò thì không thuộc lô nào
  });

  it('thu hồi 1 lô liệt kê đúng và đủ các đơn chứa lô đó (hai lô cùng mặt hàng, cùng chuyến)', () => {
    const { api, seeded, codeA, codeB, expectedA, expectedB, lists } = scenario();
    const tA = api.ops.hub.trace(hub, codeA);
    const tB = api.ops.hub.trace(hub, codeB);
    expect(tA.orders.map((o) => o.orderId).sort()).toEqual([...expectedA].sort());
    expect(tB.orders.map((o) => o.orderId).sort()).toEqual([...expectedB].sort());
    expect(tA.orders.length).toBeGreaterThan(1);
    expect(tB.orders.length).toBeGreaterThan(0);
    expect(lists.length).toBeGreaterThanOrEqual(4); // đủ nhiều đơn có bò để phân biệt hai lô
    // Hợp của hai lô = mọi đơn của chuyến có mặt hàng đó; không đơn nào ngoài chuyến / không có mặt hàng
    const union = new Set([...tA.orders, ...tB.orders].map((o) => o.orderId));
    expect([...union].sort()).toEqual(lists.map((o) => o.orderId).sort());
    // Mã mẻ và đường dẫn QR cũng dẫn tới đúng lô
    expect(api.ops.hub.trace(hub, tA.batches[0].id).lotCode).toBe(codeA);
    expect(api.ops.hub.trace(hub, `https://mova.vn/q/${codeA}`).lotCode).toBe(codeA);
    expect(() => api.ops.hub.trace(hub, 'MOVA-TRACE-KHONG-CO')).toThrow(/Không tìm thấy/);
    // Nguồn, ngày giết mổ / thu hoạch, xác nhận chéo
    expect(tA.source.name).toBeTruthy();
    expect(tA.source).toHaveProperty('peerValidations');
    expect(tA.sku).toBe(seeded.sku);
    // Đủ ba nhóm trạng thái
    const g = tA.counts;
    expect(g.total).toBe(tA.orders.length);
    expect(g.not_shipped + g.in_transit + g.delivered).toBe(g.total);
    expect(tA.counts.delivered + tB.counts.delivered).toBeGreaterThan(0);
    expect(tA.counts.in_transit + tB.counts.in_transit).toBeGreaterThan(0);
    expect(tA.counts.not_shipped + tB.counts.not_shipped).toBeGreaterThan(0);
    // Mỗi đơn kê đúng số túi của lô
    expect(tA.bagsInOrders).toBe(tA.bagsMade);
  });

  it('truy xuất theo vai trò: kho phụ thấy người nhận, mua hàng thì không; không lộ mã khách', () => {
    const { api, codeA } = scenario();
    const forHub = api.ops.hub.trace(hub, codeA);
    const forBuyer = api.ops.hub.trace(purchasing, codeA);
    expect(forHub.orders[0].recipient.name).toBeTruthy();
    expect(forBuyer.orders[0].recipient).toBeNull();
    expect(JSON.stringify(forHub)).not.toMatch(/customerId|"C-0/);
    expect(JSON.stringify(forBuyer)).not.toMatch(/customerId|"C-0|"phone"|"address"/);
    expect(() => api.ops.hub.trace({ role: 'workshop' }, codeA)).toThrow(/không được/);
    expect(() => api.ops.hub.trace(supA, codeA)).toThrow(/không được/);
  });

  it('đợt thu hồi: giữ hàng chặn lên xe, báo khách, bù Fresh Credit (chỉ mua hàng), báo cáo, đóng đợt', () => {
    const { api, server, codeA } = scenario();
    const before = api.ops.hub.trace(hub, codeA);
    const rc = api.ops.hub.createRecall(hub, { lotCode: codeA, reason: 'Nghi tồn dư kháng sinh vượt ngưỡng' });
    expect(rc.status).toBe('open');
    expect(() => api.ops.hub.createRecall(hub, { lotCode: codeA, reason: 'lần nữa' })).toThrow(/đang có đợt thu hồi/);
    expect(() => api.ops.hub.createRecall(hub, { lotCode: codeA, reason: '' })).toThrow();
    // Tồn kho phụ của lô bị giữ ngay: FEFO không còn xuất lô này
    const stock = api.ops.hub.stock(hub);
    expect(stock.lots.filter((l) => l.lotCode === codeA).every((l) => l.state === 'held')).toBe(true);
    expect(fefoAllocate(server.read((db) => db.procurement.stock), { sku: before.sku, qty: 1000 }, new Date()).allocations.every((a) => a.lotCode !== codeA)).toBe(true);

    // Giữ hàng các đơn chưa xuất: không lên xe được
    const held = api.ops.hub.holdOrders(hub, { recallId: rc.id });
    expect(held.held).toBe(before.counts.not_shipped);
    const detail = api.ops.hub.recall(hub, rc.id);
    expect(detail.groups.find((g) => g.id === 'not_shipped').held).toBe(before.counts.not_shipped);
    const heldOrder = detail.orders.find((o) => o.group === 'not_shipped');
    expect(heldOrder.suggestions.length).toBeGreaterThan(0); // món thay đề xuất cho đơn chưa xuất
    const scope = `${heldOrder.deliveryDay}|${heldOrder.tripId}`;
    expect(() => api.ops.factory.apply({ role: 'workshop' }, { type: 'load', opId: 'x1', scope, orderId: heldOrder.orderId, loaded: true })).toThrow(/đang bị giữ/);

    // Báo khách: mỗi đơn một lần, khách nhận thông báo
    const n1 = api.ops.hub.notifyCustomers(hub, { recallId: rc.id });
    expect(n1.notified).toBe(before.counts.total);
    expect(api.ops.hub.notifyCustomers(hub, { recallId: rc.id }).notified).toBe(0);
    const cust = server.read((db) => db.orders.find((o) => o.id === heldOrder.orderId).customerId);
    const notes = server.read((db) => db.notifications.filter((n) => n.customerId === cust && n.type === 'recall'));
    expect(notes).toHaveLength(1);
    expect(notes[0].meta).toMatchObject({ recallId: rc.id, lotCode: codeA, group: 'not_shipped' });

    // Bù Fresh Credit: kho phụ không được, mua hàng được; chỉ đơn đang giao / đã giao
    expect(() => api.ops.hub.compensate(hub, { recallId: rc.id })).toThrow(/không được/);
    const deliveredOrder = detail.orders.find((o) => o.group === 'delivered');
    const customerId = server.read((db) => db.orders.find((o) => o.id === deliveredOrder.orderId).customerId);
    const creditBefore = server.read((db) => db.customers.find((c) => c.id === customerId).credit.promo);
    const comp = api.ops.hub.compensate(purchasing, { recallId: rc.id });
    expect(comp.compensated).toBe(before.counts.in_transit + before.counts.delivered);
    expect(comp.totalVnd).toBeGreaterThan(0);
    const creditAfter = server.read((db) => db.customers.find((c) => c.id === customerId).credit.promo);
    expect(creditAfter).toBeGreaterThan(creditBefore);
    expect(server.read((db) => db.ledger.some((l) => l.kind === 'compensation' && l.customerId === customerId && l.orderId === deliveredOrder.orderId))).toBe(true);
    expect(api.ops.hub.compensate(purchasing, { recallId: rc.id }).compensated).toBe(0); // không bù hai lần

    // Hủy tồn đang giữ → chi phí hao hụt "thu hồi lô"
    const w = api.ops.hub.wasteHeldStock(hub, { recallId: rc.id });
    expect(w.lots).toBeGreaterThan(0);
    expect(w.costVnd).toBeGreaterThan(0);
    const final = api.ops.hub.recall(purchasing, rc.id);
    expect(final.totals).toMatchObject({ orders: before.counts.total, notified: before.counts.total, compensated: comp.compensated });
    expect(final.totals.costVnd).toBe(comp.totalVnd + w.costVnd);
    expect(final.recall.log.map((l) => l.action)).toEqual(['create', 'hold', 'notify', 'compensate', 'waste']);

    // Đóng đợt: bỏ giữ đơn
    api.ops.hub.closeRecall(hub, { recallId: rc.id, note: 'Đã xử lý xong' });
    expect(server.read((db) => db.orders.some((o) => o.recallHold))).toBe(false);
    expect(() => api.ops.hub.notifyCustomers(hub, { recallId: rc.id })).toThrow(/đã đóng/);
    expect(api.ops.hub.recalls(hub)[0]).toMatchObject({ id: rc.id, status: 'closed' });
  });

  it('thay món cho đơn chưa xuất kho trong đợt thu hồi dùng cơ chế sẵn có', () => {
    const { api, codeA, codeB } = scenario();
    // Lấy lô có đơn chưa xuất kho (đang sản xuất hoặc đã chốt) và món thay đề xuất
    let rc = null;
    let o = null;
    for (const code of [codeA, codeB]) {
      const r = api.ops.hub.createRecall(hub, { lotCode: code, reason: 'Nghi nhiễm khuẩn' });
      const found = api.ops.hub.recall(hub, r.id).orders.find((x) => x.group === 'not_shipped' && x.suggestions.some((h) => h.suggestedDishId));
      if (found) {
        rc = r;
        o = found;
        break;
      }
      api.ops.hub.closeRecall(hub, { recallId: r.id });
    }
    expect(o).toBeTruthy();
    const hit = o.suggestions.find((h) => h.suggestedDishId);
    api.ops.substituteDish(hub, { orderId: o.orderId, mealIndex: hit.mealIndex, kind: hit.kind, toDishId: hit.suggestedDishId, reason: `Thu hồi lô ${rc.lotCode}` });
    const detail = api.ops.hub.recall(hub, rc.id);
    const after = detail.orders.find((x) => x.orderId === o.orderId);
    // Đơn đã đổi món vẫn nằm trong danh sách chốt của đợt, nhưng hết món có nguyên liệu của lô và hết đề xuất
    expect(after).toBeTruthy();
    expect(after.dishes).toEqual([]);
    expect(after.suggestions.find((h) => h.mealIndex === hit.mealIndex && h.kind === hit.kind)).toBeUndefined();
    expect(detail.orders.length).toBe(detail.recall.orders.length); // phép chia túi của các đơn khác không bị xê dịch
    expect(detail.totals.orders).toBe(detail.recall.orders.length);
  });
});

// ---------------------------------------------------------------------------------------------
describe('nhà cung cấp A không đọc được dữ liệu nhà cung cấp B', () => {
  function ready() {
    const s = setup();
    closeFirstDay(s.api);
    for (const sid of ['S-FACTORY', 'S-SEAFOOD', 'S-PACK']) {
      const d = draftOf(s.api, sid);
      if (!d) continue;
      s.api.ops.procurement.approvePo(purchasing, d.id);
      s.api.ops.procurement.sendPo(purchasing, { poId: d.id, via: 'link' });
    }
    return s;
  }

  it('PO, hồ sơ, công nợ, khiếu nại, dự báo, lịch giao chỉ của chính mình, không PIN, không dữ liệu khách', () => {
    const { api, server } = ready();
    const ovA = api.ops.supplierPortal.overview(supA);
    const ovB = api.ops.supplierPortal.overview(supB);
    expect(ovA.pos.length).toBeGreaterThan(0);
    expect(ovA.pos.every((p) => p.supplierId === 'S-FACTORY')).toBe(true);
    expect(ovB.pos.every((p) => p.supplierId === 'S-SEAFOOD')).toBe(true);
    expect(ovA.profile.id).toBe('S-FACTORY');
    expect(ovA.payables.every((r) => ovA.pos.some((p) => p.id === r.poId))).toBe(true);
    expect(ovB.claims.every((c) => c.supplierId === 'S-SEAFOOD')).toBe(true);
    expect(ovA.claims.every((c) => c.supplierId === 'S-FACTORY')).toBe(true);
    // Truyền mã nhà cung cấp khác cũng không đổi được người xem
    expect(api.ops.supplierPortal.overview(supA, { asSupplierId: 'S-SEAFOOD' }).supplier.id).toBe('S-FACTORY');

    const text = JSON.stringify(ovA);
    expect(text).not.toContain('S-SEAFOOD');
    expect(text).not.toContain('Đầu mối hải sản');
    for (const pin of ['4001', '4002', '4003', '4004', '4005']) expect(text).not.toContain(`"${pin}"`);
    expect(text).not.toContain('"pin"');
    expect(text).not.toContain('stockUsedQty');
    expect(text).not.toContain('coveredByStock');
    // không có tên, SĐT, địa chỉ, mã khách
    const names = server.read((db) => db.customers.slice(0, 20).map((c) => c.name));
    for (const n of names) expect(text).not.toContain(n);
    const phones = server.read((db) => db.customers.slice(0, 20).map((c) => c.phone));
    for (const p of phones) expect(text).not.toContain(p);
    const addresses = server.read((db) => db.customers.slice(0, 20).map((c) => c.address));
    for (const a of addresses) expect(text).not.toContain(a);
    expect(text).not.toMatch(/"(customerId|recipient)"/);

    // Danh sách PO / nhà cung cấp cũ cũng lọc
    expect(api.ops.listPurchaseOrders(supA).every((p) => p.supplierId === 'S-FACTORY')).toBe(true);
    expect(JSON.stringify(api.ops.listPurchaseOrders(supA))).not.toContain('coveredByStock');
    expect(api.ops.listSuppliers(supA).map((s) => s.id)).toEqual(['S-FACTORY']);
  });

  it('không xác nhận / gửi hóa đơn / trả lời khiếu nại thay cho nhà cung cấp khác', () => {
    const { api } = ready();
    const poB = api.ops.supplierPortal.overview(supB).pos.find((p) => p.status === 'sent');
    expect(poB).toBeTruthy();
    expect(() => api.ops.supplierPortal.confirmPo(supA, { poId: poB.id, result: 'full' })).toThrow(/Không tìm thấy PO/);
    expect(() => api.ops.supplierPortal.submitInvoice(supA, { poId: poB.id, number: 'X', issuedAt: '2026-11-20' })).toThrow(/Không tìm thấy PO/);
    const claimB = api.ops.procurement.payables(purchasing).claims.find((c) => c.supplierId === 'S-SEAFOOD');
    if (claimB) expect(() => api.ops.supplierPortal.replyClaim(supA, { claimId: claimB.id, reply: 'x' })).toThrow(/Không tìm thấy khiếu nại/);
    expect(api.ops.supplierPortal.overview(supB).pos.find((p) => p.id === poB.id).status).toBe('sent');
  });

  it('nhà cung cấp không vào được màn của mua hàng, kho phụ; vai trò khác không vào cổng', () => {
    const { api } = ready();
    for (const call of [
      () => api.ops.procurement.suppliers(supA),
      () => api.ops.procurement.listPos(supA),
      () => api.ops.procurement.payables(supA),
      () => api.ops.procurement.prices(supA),
      () => api.ops.procurement.forecast(supA),
      () => api.ops.hub.stock(supA),
      () => api.ops.hub.recalls(supA),
      () => api.ops.supplierPortal.overview({ role: 'workshop' }),
      () => api.ops.supplierPortal.overview(purchasing),
      () => api.ops.procurement.saveSettings(purchasing, { statementTemplate: 'internal' }),
      () => api.ops.procurement.approvePo(hub, 'x')
    ]) expect(call).toThrow(/không được/);
    // admin xem thử một nhà cung cấp được chọn
    expect(api.ops.supplierPortal.overview(admin, { asSupplierId: 'S-PACK' }).supplier.id).toBe('S-PACK');
    expect(() => api.ops.supplierPortal.overview(admin)).toThrow(/Chọn nhà cung cấp/);
  });

  it('nhà cung cấp gửi hóa đơn kèm tệp cho PO đã nhận; không gửi hóa đơn trùng số', () => {
    const { api } = ready();
    const sup = supB;
    const po0 = api.ops.supplierPortal.overview(sup).pos.find((p) => p.status === 'sent');
    const id = po0.id;
    expect(() => api.ops.supplierPortal.submitInvoice(sup, { poId: id, number: 'HD-1', issuedAt: '2026-11-21' })).toThrow(/hàng đã được nhận/);
    api.ops.supplierPortal.confirmPo(sup, { poId: id, result: 'full' });
    const po = api.ops.procurement.getPo(purchasing, id);
    api.ops.hub.receive(hub, { poId: id, lines: po.lines.map((l) => ({ sku: l.sku, acceptedQty: l.qty, tempC: SKUS[l.sku].temp === 'frozen' ? -20 : 2 })) });
    const file = { name: 'hd.png', type: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' };
    const inv = api.ops.supplierPortal.submitInvoice(sup, { poId: id, number: 'HD-NEW-1', issuedAt: '2026-11-21', file });
    expect(inv.file).toEqual({ name: 'hd.png', type: 'image/png' }); // danh sách không mang nội dung tệp
    expect(api.ops.procurement.invoiceFile(purchasing, inv.id).dataUrl).toBe(file.dataUrl);
    const after = api.ops.procurement.getPo(purchasing, id);
    expect(after.po.status).toBe('invoiced');
    expect(after.match.ok).toBe(true);
    const m = api.ops.procurement.matchPo(purchasing, { poId: id });
    expect(m.po.status).toBe('matched');
    expect(m.po.dueAt).toBeTruthy();
    const row = api.ops.supplierPortal.overview(sup).payables.find((r) => r.poId === id);
    expect(row).toMatchObject({ invoiceNumber: 'HD-NEW-1', status: 'matched' });
    expect(row.dueAt).toBe(m.po.dueAt);
    expect(row.daysToDue).toBe(15); // kỳ công nợ của đầu mối hải sản
    expect(() => api.ops.supplierPortal.submitInvoice(sup, { poId: id, number: 'HD-NEW-1', issuedAt: '2026-11-21' })).toThrow();
  });
});

// ---------------------------------------------------------------------------------------------
describe('dự báo, danh mục SKU', () => {
  it('dự báo 4 tuần theo nhà cung cấp, đã gửi thì nhà cung cấp thấy bản đã gửi', () => {
    const { api } = setup();
    const f = api.ops.procurement.forecast(purchasing);
    expect(f.weeks).toHaveLength(4);
    const fac = f.suppliers.find((s) => s.supplierId === 'S-FACTORY');
    expect(fac.rows.length).toBeGreaterThan(0);
    expect(fac.rows.every((r) => r.qty.length === 4)).toBe(true);
    expect(f.suppliers.find((s) => s.supplierId === 'S-TRUCK').boxes.length).toBe(4);
    const ov = api.ops.supplierPortal.overview(supA);
    expect(ov.forecast.rows.length).toBe(fac.rows.length);
    expect(ov.forecast.note).toMatch(/không bắt buộc/);
    const wk = supplierForecast([{ start: 'a', end: 'b', skuGrams: { 'NL-GAO-01': 10000 }, boxes: 7 }], 'S-FACTORY');
    expect(wk.rows[0].qty[0]).toBe(10.5);
  });

  it('danh mục SKU: quy cách, nhóm nhiệt, hạn dùng, nhóm thuế, tỷ lệ thu hồi, món dùng SKU', () => {
    const rows = skuCatalog();
    const beef = rows.find((r) => r.id === 'NL-BO-01');
    expect(beef).toMatchObject({ temp: 'chill', yield: 0.95, taxGroup: 'processed', requiresLot: true });
    expect(beef.shelfDays).toBeGreaterThan(0);
    expect(beef.spec).toMatch(/túi 250g/);
    expect(beef.dishes.map((d) => d.id)).toContain('D-PRT-002');
    expect(rows.length).toBe(Object.keys(SKUS).length);
    expect(rows.find((r) => r.id === 'BB-THUNG-01').spec).toBe('Cái');
  });
});

// ---------------------------------------------------------------------------------------------
describe('bảng kê thu mua nông sản không hóa đơn', () => {
  const seller = { name: 'Trần Thị Khoai', cccd: '066087054321', address: 'Xã Pơng Drang, Krông Búk, Đắk Lắk', phone: '0912345602' };
  const items = [{ sku: 'NL-KHOAI-01', qty: 80, unitPriceVnd: 24000 }, { sku: 'NL-BI-05', qty: 35.5, unitPriceVnd: 16000 }];

  it('số tiền bằng chữ', () => {
    expect(vndInWords(0)).toBe('Không đồng');
    expect(vndInWords(1250000)).toBe('Một triệu hai trăm năm mươi nghìn đồng');
    expect(vndInWords(1005000)).toBe('Một triệu không trăm linh năm nghìn đồng');
    expect(vndInWords(2488000)).toBe('Hai triệu bốn trăm tám mươi tám nghìn đồng');
    expect(vndInWords(21000)).toBe('Hai mươi mốt nghìn đồng');
    expect(vndInWords(15500)).toBe('Mười lăm nghìn năm trăm đồng');
    expect(vndInWords(1000000000)).toBe('Một tỷ đồng');
    expect(vndInWords(105)).toBe('Một trăm linh năm đồng');
  });

  it('lập bảng kê: tổng tiền, bằng chữ, chữ ký; chỉ nông sản tươi; kiểm tra người bán', () => {
    const r = buildStatement({ number: 'BK-1', at: '2026-11-20T00:00:00Z', seller, items, method: 'bank_transfer', templateId: 'internal' });
    expect(r.ok).toBe(true);
    expect(r.statement.totalVnd).toBe(80 * 24000 + Math.round(35.5 * 16000));
    expect(r.statement.totalWords).toBe(vndInWords(r.statement.totalVnd));
    expect(r.statement.items[0]).toMatchObject({ no: 1, name: SKUS['NL-KHOAI-01'].name, unit: 'kg', amountVnd: 1920000 });
    expect(r.statement.signatures).toHaveLength(3);
    expect(buildStatement({ number: 'x', at: 'x', seller, items: [{ sku: 'NL-BO-01', qty: 1, unitPriceVnd: 1000 }], method: 'cash', templateId: 'internal' }).errors[0]).toMatch(/không phải nông sản tươi/);
    expect(buildStatement({ number: 'x', at: 'x', seller: { ...seller, cccd: '123' }, items, method: 'cash', templateId: 'internal' }).errors[0]).toMatch(/CCCD/);
    expect(buildStatement({ number: 'x', at: 'x', seller, items: [], method: 'cash', templateId: 'internal' }).ok).toBe(false);
  });

  it('mẫu do kế toán chọn trong cài đặt, không viết cứng: đổi cài đặt thì bảng kê mới theo mẫu mới', () => {
    const { api } = setup();
    const s0 = api.ops.procurement.settings(purchasing);
    expect(s0.canEdit).toBe(false);
    expect(s0.templates.length).toBeGreaterThanOrEqual(3);
    expect(s0.templates.every((t) => t.confirmed === false)).toBe(true); // chưa mẫu nào được kế toán xác nhận
    expect(() => api.ops.procurement.saveSettings(purchasing, { statementTemplate: 'internal' })).toThrow(/không được/);
    expect(() => api.ops.procurement.saveSettings(accountingCtx(), { statementTemplate: 'khong-co' })).toThrow(/không có trong cấu hình/);
    const a = api.ops.procurement.recordDirectPurchase(purchasing, { seller, items, method: 'bank_transfer', intoStock: false });
    expect(a.statement.templateId).toBe(BUSINESS.purchasing.defaultStatementTemplate);
    api.ops.procurement.saveSettings(accountingCtx(), { statementTemplate: 'custom', customTitle: 'BẢNG KÊ MUA HÀNG NÔNG SẢN', customNote: 'Theo quy định kế toán chọn' });
    const b = api.ops.procurement.recordDirectPurchase(purchasing, { seller, items, method: 'bank_transfer', intoStock: false });
    expect(b.statement.templateId).toBe('custom');
    expect(b.statement.title).toBe('BẢNG KÊ MUA HÀNG NÔNG SẢN');
    expect(b.statement.legalNote).toBe('Theo quy định kế toán chọn');
    expect(a.statement.title).toBe(BUSINESS.purchasing.statementTemplates.internal.title); // bản cũ giữ nguyên mẫu lúc lập
    expect(b.id).not.toBe(a.id);
    // thêm mẫu mới chỉ là thêm cấu hình
    const cfg2 = { ...BUSINESS, purchasing: { ...BUSINESS.purchasing, statementTemplates: { ...BUSINESS.purchasing.statementTemplates, moi: { label: 'Mẫu mới', title: 'TIÊU ĐỀ MỚI', legalNote: 'n', confirmed: true } } } };
    const c = buildStatement({ number: 'x', at: 'x', seller, items, method: 'bank_transfer', templateId: 'moi' }, cfg2);
    expect(c.statement).toMatchObject({ title: 'TIÊU ĐỀ MỚI', templateConfirmed: true });
  });

  it('nhập kho thành lô tồn; tiền mặt từ 5 triệu bị chặn', () => {
    const { api } = setup();
    const before = api.ops.hub.stock(hub).lots.filter((l) => l.sku === 'NL-KHOAI-01').reduce((s, l) => s + l.qty, 0);
    const p = api.ops.procurement.recordDirectPurchase(purchasing, { seller, items: [{ sku: 'NL-KHOAI-01', qty: 10, unitPriceVnd: 24000 }], method: 'cash', intoStock: true });
    expect(p.stockIds).toHaveLength(1);
    const after = api.ops.hub.stock(hub).lots.filter((l) => l.sku === 'NL-KHOAI-01').reduce((s, l) => s + l.qty, 0);
    expect(after).toBe(before + 10);
    expect(() => api.ops.procurement.recordDirectPurchase(purchasing, { seller, items: [{ sku: 'NL-KHOAI-01', qty: 300, unitPriceVnd: 24000 }], method: 'cash' })).toThrow(/chuyển khoản/);
    expect(() => api.ops.procurement.previewStatement(purchasing, { seller: { ...seller, name: '' }, items, method: 'cash' })).toThrow(/họ tên/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('bộ nhớ demo cũ chưa có dữ liệu mua hàng được bù hạt giống', () => {
  it('không đổi dữ liệu đã có, chỉ thêm db.procurement', () => {
    const { server, storage } = setup();
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) || JSON.stringify(server.read((db) => db)));
    const ordersBefore = raw.orders.length;
    const poBefore = raw.purchaseOrders.filter((p) => !p.sample).length;
    delete raw.procurement;
    raw.purchaseOrders = raw.purchaseOrders.filter((p) => !p.sample);
    const storage2 = createMemoryStorage();
    storage2.setItem(STORAGE_KEY, JSON.stringify(raw));
    const server2 = createServer({ storage: storage2, startAt: START, running: false });
    const api2 = createApi(server2);
    expect(api2.ops.procurement.suppliers(purchasing).suppliers.length).toBeGreaterThanOrEqual(13);
    expect(server2.read((db) => db.orders.length)).toBe(ordersBefore);
    expect(server2.read((db) => db.purchaseOrders.filter((p) => !p.sample).length)).toBe(poBefore);
    expect(api2.ops.hub.stock(hub).lots.length).toBeGreaterThan(5);
  });
});

describe('cấu hình mới nằm trong business.js', () => {
  it('có các hằng cho PO, hồ sơ, kho, thu hồi', () => {
    expect(BUSINESS.purchasing.longLifeShelfDays).toBe(60);
    expect(BUSINESS.purchasing.matchTolerance).toBeDefined();
    expect(BUSINESS.suppliers.certWarnDays).toBe(30);
    expect(BUSINESS.inventory.expiryWarnDays).toBeGreaterThan(0);
    expect(BUSINESS.recall.groups.not_shipped).toContain('locked');
    expect(Object.keys(BUSINESS.purchasing.statementTemplates).length).toBeGreaterThanOrEqual(3);
  });
});
