import { BUSINESS } from '../config/business';
import { SKUS, SUPPLIERS } from '../data/catalog';
import { dayKey } from '../utils/time';
import { buildDemandDays, emptyFactory, nextDailyId, sumDays, weekRanges } from './factory';
import {
  PO_OPEN_FOR_RECEIPT, buildConfirmation, canTransition, certStatus, claimsFromReceipt, computeDueAt, evaluateReceiptLine, invoiceTotal, lineTarget,
  poTotal, priceAt, receiptComplete, shortToPreparedKg, supplierForecast, threeWayMatch, validateCert, validateInvoice, validatePayment,
  validatePriceEntry, validateSupplierProfile
} from './procurement';
import { availableQty, defaultExpiry, expiryState, fefoAllocate, nextHubLotCode, wasteCostVnd, countDiffs } from './inventory';
import { buildStatement } from './statement';

/**
 * Các thao tác ghi dữ liệu mua hàng và kho phụ ở mức `db` (P2B). Lớp API (`api.ops.procurement`, `api.ops.hub`, `api.ops.supplierPortal`)
 * chỉ kiểm quyền rồi gọi các hàm này trong `server.write`, nên logic dùng chung và test được không cần giao diện.
 * Mỗi hàm trả `{ ok: true, ... }` hoặc `{ ok: false, code, message }`, giống `opsEvents.js`.
 */

const bad = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const good = (extra = {}) => ({ ok: true, ...extra });

export const emptyProcurement = () => ({
  suppliers: {}, // { [supplierId]: hồ sơ nhà cung cấp }
  priceList: [], // [{ id, sku, priceVnd, effectiveFrom, note, createdAt, by }]
  receipts: [], // phiếu nhập kho phụ
  invoices: [], // hóa đơn nhà cung cấp
  claims: [], // phiếu khiếu nại phần không đạt
  payments: [], // lần trả nhà cung cấp
  stock: [], // lô tồn kho phụ
  stockMoves: [], // nhập, xuất, hủy, kiểm kê
  purchases: [], // bảng kê thu mua nông sản không hóa đơn
  forecasts: [], // dự báo 4 tuần đã gửi nhà cung cấp
  recalls: [], // đợt thu hồi lô
  settings: { statementTemplate: BUSINESS.purchasing.defaultStatementTemplate, customTitle: '', customNote: '' },
  seq: {}
});

/** Lát cắt db.procurement; bộ nhớ cũ chưa có thì tạo rỗng (hạt giống bù do `data/procurementSeed.js`). */
export function ensureProcurement(db) {
  if (!db.procurement) db.procurement = emptyProcurement();
  const p = db.procurement;
  for (const [k, v] of Object.entries(emptyProcurement())) if (p[k] === undefined) p[k] = v;
  return p;
}

const seqId = (proc, prefix) => {
  proc.seq[prefix] = (proc.seq[prefix] || 0) + 1;
  return `${prefix}-${String(proc.seq[prefix]).padStart(5, '0')}`;
};
const dailyId = (list, prefix, atIso) => nextDailyId(prefix, list.map((x) => x.id), atIso);

// ---------------------------------------------------------------------------------------------
// Đọc dùng chung

export const findPo = (db, poId) => db.purchaseOrders.find((p) => p.id === poId) || null;
export const receiptsOfPo = (db, poId) => (db.procurement ? db.procurement.receipts.filter((r) => r.poId === poId) : []);
export const invoiceOfPo = (db, poId) => (db.procurement ? db.procurement.invoices.find((i) => i.poId === poId) || null : null);
export const claimsOfPo = (db, poId) => (db.procurement ? db.procurement.claims.filter((c) => c.poId === poId) : []);

/** Hàm tra giá theo ngày hiệu lực cho `draftPurchaseOrders`. */
export function priceResolver(db) {
  const list = db.procurement ? db.procurement.priceList : [];
  return (skuId, day) => priceAt(list, skuId, day);
}

/**
 * Tồn khả dụng của một SKU để trừ khi lập PO: tồn dùng được trừ phần đã giữ cho các PO chưa nhận xong.
 * Gọi lại sau mỗi PO vừa lập (PO nháp mới đã tính vào phần giữ).
 */
export function stockAvailableFn(db, now) {
  const proc = db.procurement;
  return (skuId) => {
    if (!proc) return 0;
    const reserved = db.purchaseOrders
      .filter((po) => ['draft', 'approved', 'sent', 'confirmed', 'received_partial'].includes(po.status))
      .reduce((s, po) => s + po.lines.filter((l) => l.sku === skuId).reduce((a, l) => a + (l.stockUsedQty || 0), 0), 0);
    return Math.max(0, availableQty(proc.stock, skuId, now) - reserved);
  };
}

function pushHistory(po, status, at, by, note = '') {
  (po.history ||= []).push({ at, status, by, note });
  po.status = status;
}

// ---------------------------------------------------------------------------------------------
// Hồ sơ nhà cung cấp, giấy chứng nhận, bảng giá

export function saveSupplierProfile(db, profile, now) {
  const proc = ensureProcurement(db);
  const errors = validateSupplierProfile(profile);
  if (errors.length) return bad('PROFILE_INVALID', errors.join('; '), { errors });
  const existing = profile.id ? proc.suppliers[profile.id] : null;
  if (profile.id && !existing && !profile.id.startsWith('SUP-')) return bad('SUPPLIER_NOT_FOUND', 'Không tìm thấy nhà cung cấp');
  const id = profile.id || seqId(proc, 'SUP');
  if (!existing && SUPPLIERS[id]) return bad('SUPPLIER_NOT_FOUND', 'Không tìm thấy nhà cung cấp');
  const clean = {
    id,
    kind: profile.kind,
    name: String(profile.name).trim(),
    taxId: profile.kind === 'nong_ho' ? '' : String(profile.taxId).replace(/\s|-/g, ''),
    cccd: profile.kind === 'nong_ho' ? String(profile.cccd).replace(/\s|-/g, '') : '',
    address: String(profile.address || '').trim(),
    bank: { bankName: profile.bank.bankName.trim(), accountNo: String(profile.bank.accountNo).replace(/\s|-/g, ''), accountName: profile.bank.accountName.trim() },
    termDays: profile.termDays,
    contact: { name: profile.contact.name.trim(), phone: String(profile.contact.phone).replace(/\s|-/g, '') },
    portal: existing ? existing.portal : Boolean(SUPPLIERS[id]),
    certs: existing ? existing.certs : [],
    updatedAt: now.toISOString()
  };
  proc.suppliers[id] = clean;
  // Kỳ công nợ của nhà cung cấp có cổng đổi thì PO mới theo kỳ mới (PO đã lập giữ kỳ cũ)
  return good({ supplier: clean, created: !existing });
}

export function addCert(db, { supplierId, cert }, now) {
  const proc = ensureProcurement(db);
  const s = proc.suppliers[supplierId];
  if (!s) return bad('SUPPLIER_NOT_FOUND', 'Không tìm thấy nhà cung cấp');
  const errors = validateCert(cert);
  if (errors.length) return bad('CERT_INVALID', errors.join('; '), { errors });
  const clean = {
    id: seqId(proc, 'CERT'),
    type: cert.type,
    number: String(cert.number).trim(),
    issuer: String(cert.issuer || '').trim(),
    expiresAt: cert.expiresAt,
    addedAt: now.toISOString()
  };
  s.certs.push(clean);
  return good({ cert: clean });
}

export function removeCert(db, { supplierId, certId }) {
  const proc = ensureProcurement(db);
  const s = proc.suppliers[supplierId];
  if (!s) return bad('SUPPLIER_NOT_FOUND', 'Không tìm thấy nhà cung cấp');
  const i = s.certs.findIndex((c) => c.id === certId);
  if (i < 0) return bad('CERT_NOT_FOUND', 'Không tìm thấy giấy chứng nhận');
  s.certs.splice(i, 1);
  return good();
}

export function addPrice(db, { sku, priceVnd, effectiveFrom, note = '', by = '' }, now) {
  const proc = ensureProcurement(db);
  const errors = validatePriceEntry(proc.priceList, { sku, priceVnd, effectiveFrom });
  if (errors.length) return bad('PRICE_INVALID', errors.join('; '), { errors });
  const entry = { id: seqId(proc, 'PRC'), sku, priceVnd, effectiveFrom, note: String(note).trim(), createdAt: now.toISOString(), by };
  proc.priceList.push(entry);
  return good({ entry });
}

// ---------------------------------------------------------------------------------------------
// Vòng đời PO

const mustPo = (db, poId) => {
  const po = findPo(db, poId);
  return po ? { po } : { error: bad('PO_NOT_FOUND', 'Không tìm thấy PO') };
};

export function editPoLine(db, { poId, sku, qty }) {
  const { po, error } = mustPo(db, poId);
  if (error) return error;
  if (po.status !== 'draft') return bad('PO_STATUS_INVALID', 'Chỉ sửa được PO nháp');
  const line = po.lines.find((l) => l.sku === sku);
  if (!line) return bad('LINE_NOT_FOUND', 'Không có dòng này trong PO');
  if (!(typeof qty === 'number' && qty >= 0)) return bad('INVALID_QTY', 'Số lượng không hợp lệ');
  line.qty = Math.round(qty * 10) / 10;
  line.lineTotalVnd = Math.round(line.qty * line.unitPriceVnd);
  po.totalVnd = poTotal(po.lines);
  return good({ po });
}

export function approvePo(db, { poId, by = '' }, now) {
  const { po, error } = mustPo(db, poId);
  if (error) return error;
  if (!canTransition(po.status, 'approved')) return bad('PO_STATUS_INVALID', 'PO này không duyệt được ở trạng thái hiện tại');
  const lines = po.lines.filter((l) => l.qty > 0);
  if (!lines.length) return bad('PO_EMPTY', 'PO không có dòng nào để đặt');
  po.lines = lines;
  po.totalVnd = poTotal(lines);
  po.approvedAt = now.toISOString();
  pushHistory(po, 'approved', po.approvedAt, by, 'Mua hàng duyệt');
  return good({ po });
}

export function sendPo(db, { poId, via = 'link', by = '' }, now) {
  const { po, error } = mustPo(db, poId);
  if (error) return error;
  if (!canTransition(po.status, 'sent')) return bad('PO_STATUS_INVALID', 'PO phải được duyệt trước khi gửi');
  if (!['link', 'print'].includes(via)) return bad('VIA_INVALID', 'Chọn gửi bằng link hoặc in');
  po.sentAt = now.toISOString();
  po.sentVia = via;
  pushHistory(po, 'sent', po.sentAt, by, via === 'print' ? 'In và gửi' : 'Gửi link');
  return good({ po });
}

/**
 * Tạo báo cáo thiếu trong sổ xưởng cho mỗi dòng nhà cung cấp xác nhận thiếu (chỉ hàng tính theo kg).
 * Từ đó cơ chế đề xuất món thay / đơn bị ảnh hưởng của P2A (`shortageImpact`) chạy y hệt.
 */
function shortagesFromConfirmation(db, po, confirmation, now) {
  db.factory = db.factory || emptyFactory();
  const out = [];
  for (const s of confirmation.shortLines) {
    const kg = shortToPreparedKg(s.sku, s.shortQty);
    if (!(kg > 0)) continue;
    const id = nextDailyId('SH', db.factory.shortages.map((x) => x.id), now.toISOString());
    db.factory.shortages.push({
      id, key: s.sku, qty: kg, unit: 'kg', kind: 'short',
      note: `${po.supplierName} xác nhận thiếu ${s.shortQty} ${SKUS[s.sku].unit} (${po.id})`,
      photo: null, day: po.deliveryDay, at: now.toISOString(), status: 'open', handled: [], source: 'po', poId: po.id
    });
    out.push(id);
  }
  return out;
}

export function confirmPo(db, { poId, result, lines = [], note = '', by = '' }, now) {
  const { po, error } = mustPo(db, poId);
  if (error) return error;
  if (po.status !== 'sent') return bad('PO_STATUS_INVALID', 'PO này không ở trạng thái chờ xác nhận');
  const built = buildConfirmation(po, { result, lines, note }, now.toISOString());
  if (!built.ok) return bad('CONFIRM_INVALID', built.message);
  po.confirmation = built.confirmation;
  po.shortageIds = built.confirmation.result === 'short' ? shortagesFromConfirmation(db, po, built.confirmation, now) : [];
  pushHistory(po, 'confirmed', built.confirmation.at, by, built.confirmation.result === 'short' ? `Xác nhận thiếu ${Math.round(built.confirmation.shortPct * 100)}%` : 'Xác nhận đủ');
  return good({ po, shortageIds: po.shortageIds });
}

// ---------------------------------------------------------------------------------------------
// Nhận hàng tại kho phụ → phiếu nhập, lô tồn, khiếu nại

export function receivePo(db, { poId, lines, photo = '', note = '', by = '' }, now) {
  const { po, error } = mustPo(db, poId);
  if (error) return error;
  if (!PO_OPEN_FOR_RECEIPT.includes(po.status)) return bad('PO_STATUS_INVALID', 'PO này chưa gửi hoặc đã nhận xong, không nhận thêm được');
  if (!Array.isArray(lines) || !lines.length) return bad('RECEIPT_INVALID', 'Nhập ít nhất một dòng hàng nhận');
  const proc = ensureProcurement(db);
  const nowIso = now.toISOString();
  const clean = [];
  const errors = [];

  for (const l of lines) {
    const poLine = po.lines.find((x) => x.sku === l.sku);
    if (!poLine) {
      errors.push(`${l.sku} không có trong PO`);
      continue;
    }
    const accepted = Number(l.acceptedQty || 0);
    const rejected = Number(l.rejectedQty || 0);
    if (!(accepted + rejected > 0)) continue; // dòng bỏ trống: chưa giao
    const ev = evaluateReceiptLine({ sku: l.sku, acceptedQty: accepted, rejectedQty: rejected, tempC: l.tempC, reason: l.reason });
    if (!ev.ok) {
      errors.push(...ev.errors);
      continue;
    }
    const sku = SKUS[l.sku];
    let lotCode = String(l.lotCode || '').trim();
    if (accepted > 0 && sku.requiresLot) {
      const lot = (db.lots || []).find((x) => x.qr_code === lotCode);
      if (!lotCode || !lot) errors.push(`${sku.name}: bắt buộc nhập mã lô truy xuất đã có (MOVA-TRACE-...)`);
      else if (lot.sku !== l.sku) errors.push(`${sku.name}: mã lô ${lotCode} là lô của nguyên liệu khác`);
    }
    let expiresAt = l.expiresAt || defaultExpiry(l.sku, nowIso);
    if (typeof expiresAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) expiresAt = new Date(`${expiresAt}T23:59:00+07:00`).toISOString();
    if (accepted > 0 && !(Date.parse(expiresAt) > now.getTime())) errors.push(`${sku.name}: hạn dùng đã qua nên không nhận đạt được`);
    clean.push({
      sku: l.sku, name: sku.name, unit: sku.unit, orderedQty: poLine.qty, targetQty: lineTarget(po, poLine),
      acceptedQty: accepted, rejectedQty: rejected, tempC: typeof l.tempC === 'number' ? l.tempC : null, tempOk: ev.tempOk,
      reason: rejected > 0 ? l.reason : '', note: String(l.note || '').trim(), lotCode, expiresAt
    });
  }
  if (!clean.length && !errors.length) errors.push('Nhập số lượng đạt hoặc không đạt cho ít nhất một dòng');
  if (clean.some((l) => l.rejectedQty > 0) && !String(photo || '').trim()) errors.push('Có hàng không đạt thì cần chụp ít nhất 1 ảnh làm bằng chứng');
  if (errors.length) return bad('RECEIPT_INVALID', errors.join('; '), { errors });

  const receipt = {
    id: dailyId(proc.receipts, 'PN', nowIso),
    poId: po.id,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    receivedAt: nowIso,
    receivedBy: by,
    photo: photo || null,
    note: String(note || '').trim(),
    lines: clean
  };
  for (const l of receipt.lines) {
    if (l.acceptedQty > 0) {
      const code = l.lotCode || nextHubLotCode(l.sku, proc.stock.map((s) => s.lotCode), nowIso);
      l.lotCode = code;
      const poLine = po.lines.find((x) => x.sku === l.sku);
      const stockId = seqId(proc, 'STK');
      proc.stock.push({
        id: stockId, sku: l.sku, lotCode: code, qty: l.acceptedQty, qtyIn: l.acceptedQty, unit: l.unit, receivedAt: nowIso, expiresAt: l.expiresAt,
        tempC: l.tempC, supplierId: po.supplierId, receiptId: receipt.id, location: 'hub', heldBy: null, unitCostVnd: poLine.unitPriceVnd
      });
      l.stockId = stockId;
      proc.stockMoves.push({ id: seqId(proc, 'MV'), at: nowIso, kind: 'receive', stockId, sku: l.sku, lotCode: code, qty: l.acceptedQty, ref: receipt.id, by });
    }
  }
  proc.receipts.push(receipt);

  // dailyId đọc proc.claims nên đẩy từng phiếu một để số thứ tự tăng
  const claims = [];
  for (const c of claimsFromReceipt(po, receipt)) {
    const rec = { ...c, id: dailyId(proc.claims, 'KN', nowIso), status: 'open', createdAt: nowIso, createdBy: by, reply: '' };
    proc.claims.push(rec);
    claims.push(rec);
  }
  po.receiptIds = [...(po.receiptIds || []), receipt.id];
  const all = receiptsOfPo(db, po.id);
  const complete = receiptComplete(po, all);
  pushHistory(po, complete ? 'received' : 'received_partial', nowIso, by, claims.length ? `Nhận hàng, có ${claims.length} khiếu nại` : 'Nhận hàng');
  return good({ receipt, claims, po, complete });
}

// ---------------------------------------------------------------------------------------------
// Hóa đơn, đối chiếu, trả tiền

export function submitInvoice(db, { poId, number, issuedAt, lines, file = null, by = '', supplierId = null }, now) {
  const { po, error } = mustPo(db, poId);
  if (error) return error;
  if (supplierId && po.supplierId !== supplierId) return bad('PO_NOT_FOUND', 'Không tìm thấy PO');
  if (!canTransition(po.status, 'invoiced')) return bad('PO_STATUS_INVALID', 'Chỉ gửi hóa đơn khi hàng đã được nhận');
  const proc = ensureProcurement(db);
  const inv = {
    number: String(number || '').trim(),
    issuedAt,
    lines: (lines || po.lines.map((l) => ({ sku: l.sku, qty: l.qty, unitPriceVnd: l.unitPriceVnd }))).map((l) => ({ sku: l.sku, qty: Number(l.qty), unitPriceVnd: Number(l.unitPriceVnd) }))
  };
  const errors = validateInvoice(inv);
  if (errors.length) return bad('INVOICE_INVALID', errors.join('; '), { errors });
  if (proc.invoices.some((i) => i.supplierId === po.supplierId && i.number === inv.number)) return bad('DUPLICATE_INVOICE', 'Số hóa đơn này đã được gửi');
  if (file && (!file.dataUrl || String(file.dataUrl).length > 1_500_000)) return bad('FILE_TOO_LARGE', 'Tệp hóa đơn quá lớn (tối đa khoảng 1 MB)');
  const record = {
    id: seqId(proc, 'INV'),
    poId: po.id,
    supplierId: po.supplierId,
    number: inv.number,
    issuedAt: inv.issuedAt,
    lines: inv.lines,
    totalVnd: invoiceTotal(inv.lines),
    file: file ? { name: String(file.name || 'hoa-don'), type: String(file.type || ''), dataUrl: file.dataUrl } : null,
    uploadedAt: now.toISOString(),
    uploadedBy: by
  };
  proc.invoices.push(record);
  po.invoiceId = record.id;
  po.dueAt = computeDueAt({ po, invoice: record, receipts: receiptsOfPo(db, po.id) });
  pushHistory(po, 'invoiced', record.uploadedAt, by, `Hóa đơn ${record.number}`);
  return good({ invoice: record, po });
}

/** Đối chiếu 3 chiều của một PO (đọc, không ghi). */
export function poMatchView(db, poId, { acceptInvoicePrice = false } = {}) {
  const { po, error } = mustPo(db, poId);
  if (error) return error;
  return good({ po, match: threeWayMatch({ po, receipts: receiptsOfPo(db, po.id), invoice: invoiceOfPo(db, po.id), acceptInvoicePrice }) });
}

export function matchPo(db, { poId, acceptDiff = false, acceptInvoicePrice = false, note = '', by = '' }, now) {
  const { po, error } = mustPo(db, poId);
  if (error) return error;
  if (po.status !== 'invoiced') return bad('PO_STATUS_INVALID', 'PO chưa có hóa đơn để đối chiếu');
  const match = threeWayMatch({ po, receipts: receiptsOfPo(db, po.id), invoice: invoiceOfPo(db, po.id), acceptInvoicePrice });
  if (!match.ok && !acceptDiff) return bad('MATCH_DIFF', `Còn ${match.issues.filter((i) => i.severity === 'error').length} chênh lệch giữa PO, phiếu nhập và hóa đơn`, { match });
  if (!match.ok && !String(note).trim()) return bad('NOTE_REQUIRED', 'Chấp nhận chênh lệch thì phải ghi lý do', { match });
  const nowIso = now.toISOString();
  po.payableVnd = match.totals.payableVnd;
  po.matchedAt = nowIso;
  po.matchNote = String(note || '').trim();
  po.matchIssues = match.issues.filter((i) => i.severity === 'error').length;
  po.acceptedInvoicePrice = Boolean(acceptInvoicePrice);
  for (const c of claimsOfPo(db, po.id)) {
    if (c.status === 'open' || c.status === 'acknowledged') {
      c.status = 'deducted';
      c.deductedAt = nowIso;
    }
  }
  pushHistory(po, 'matched', nowIso, by, match.ok ? 'Đối chiếu khớp' : `Chấp nhận chênh lệch: ${po.matchNote}`);
  return good({ po, match });
}

export function payPo(db, { poId, method = 'bank_transfer', ref = '', by = '' }, now) {
  const { po, error } = mustPo(db, poId);
  if (error) return error;
  if (po.status !== 'matched') return bad('PO_STATUS_INVALID', 'Chỉ trả khi PO đã đối chiếu');
  const proc = ensureProcurement(db);
  const amountVnd = po.payableVnd;
  const check = validatePayment({ amountVnd, method });
  if (!check.ok) return bad(check.code, check.message);
  const payment = { id: seqId(proc, 'PAY'), poId: po.id, supplierId: po.supplierId, amountVnd, method, ref: String(ref || '').trim(), paidAt: now.toISOString(), paidBy: by };
  proc.payments.push(payment);
  po.paidAt = payment.paidAt;
  po.paidVnd = amountVnd;
  pushHistory(po, 'paid', payment.paidAt, by, `Trả ${method === 'cash' ? 'tiền mặt' : 'chuyển khoản'}`);
  return good({ po, payment });
}

/** Nhà cung cấp trả lời một phiếu khiếu nại của chính mình. */
export function replyClaim(db, { claimId, supplierId, reply }) {
  const proc = ensureProcurement(db);
  const c = proc.claims.find((x) => x.id === claimId && x.supplierId === supplierId);
  if (!c) return bad('CLAIM_NOT_FOUND', 'Không tìm thấy khiếu nại');
  if (!String(reply || '').trim()) return bad('REPLY_REQUIRED', 'Nhập nội dung phản hồi');
  c.reply = String(reply).trim();
  if (c.status === 'open') c.status = 'acknowledged';
  return good({ claim: c });
}

// ---------------------------------------------------------------------------------------------
// Dự báo gửi nhà cung cấp

/** Cộng nhu cầu `weeks` tuần tới (đã chốt + dự kiến) thành các tổng tuần dùng cho `supplierForecast`. */
export function weekSumsFor(db, now, cfg = BUSINESS, weeks = cfg.purchasing.forecastWeeks) {
  const demand = buildDemandDays(db, cfg);
  return weekRanges(dayKey(now), weeks).map((r) => ({ ...r, ...sumDays(demand, r.start, r.end) }));
}

export function forecastRows(db, now, cfg = BUSINESS) {
  const sums = weekSumsFor(db, now, cfg);
  return Object.keys(SUPPLIERS).map((id) => ({ ...supplierForecast(sums, id, cfg), supplierName: SUPPLIERS[id].name }));
}

export function sendForecast(db, { by = '' }, now) {
  const proc = ensureProcurement(db);
  const nowIso = now.toISOString();
  const rows = forecastRows(db, now);
  const sent = [];
  for (const f of rows) {
    if (!f.rows.length && !f.boxes.some((b) => b > 0)) continue;
    const rec = { id: seqId(proc, 'FC'), supplierId: f.supplierId, createdAt: nowIso, sentBy: by, weeks: f.weeks, boxes: f.boxes, rows: f.rows };
    proc.forecasts.push(rec);
    sent.push(rec.id);
  }
  return good({ sent });
}

/** Dự báo mới nhất đã gửi cho một nhà cung cấp. */
export const latestForecast = (db, supplierId) => {
  const list = db.procurement ? db.procurement.forecasts.filter((f) => f.supplierId === supplierId) : [];
  return list.length ? list[list.length - 1] : null;
};

// ---------------------------------------------------------------------------------------------
// Tồn kho: xuất FEFO, xuất hủy, kiểm kê

export function issueStock(db, { sku, qty, reason = 'order', ref = '', by = '' }, now) {
  const proc = ensureProcurement(db);
  if (!SKUS[sku]) return bad('SKU_NOT_FOUND', 'SKU không có trong danh mục');
  const q = Number(qty);
  if (!(q > 0)) return bad('INVALID_QTY', 'Số lượng xuất phải lớn hơn 0');
  const plan = fefoAllocate(proc.stock, { sku, qty: q }, now);
  if (!plan.ok) return bad('STOCK_SHORT', `Kho chỉ còn ${Math.round((q - plan.shortfall) * 100) / 100} ${SKUS[sku].unit} dùng được (không tính lô hết hạn hoặc đang bị giữ)`, { shortfall: plan.shortfall, allocations: plan.allocations });
  const nowIso = now.toISOString();
  for (const a of plan.allocations) {
    const lot = proc.stock.find((s) => s.id === a.stockId);
    lot.qty = Math.round((lot.qty - a.qty) * 100) / 100;
    proc.stockMoves.push({ id: seqId(proc, 'MV'), at: nowIso, kind: 'issue', stockId: lot.id, sku, lotCode: lot.lotCode, qty: a.qty, reason, ref, by });
  }
  return good({ allocations: plan.allocations });
}

export function wasteStock(db, { stockId, qty, reason, note = '', by = '' }, now) {
  const proc = ensureProcurement(db);
  const lot = proc.stock.find((s) => s.id === stockId);
  if (!lot) return bad('LOT_NOT_FOUND', 'Không tìm thấy lô tồn');
  if (!BUSINESS.inventory.wasteReasons[reason]) return bad('REASON_REQUIRED', 'Chọn lý do xuất hủy');
  const q = Number(qty);
  if (!(q > 0) || q > lot.qty + 1e-9) return bad('INVALID_QTY', `Số lượng hủy phải từ 0 tới ${lot.qty} ${lot.unit}`);
  lot.qty = Math.round((lot.qty - q) * 100) / 100;
  const costVnd = wasteCostVnd(lot.sku, q, lot.unitCostVnd);
  const move = { id: seqId(proc, 'MV'), at: now.toISOString(), kind: 'waste', stockId, sku: lot.sku, lotCode: lot.lotCode, qty: q, reason, note: String(note).trim(), costVnd, by };
  proc.stockMoves.push(move);
  return good({ move });
}

export function countStock(db, { counted, reason = 'count', by = '' }, now) {
  const proc = ensureProcurement(db);
  if (!BUSINESS.inventory.countReasons[reason]) return bad('REASON_REQUIRED', 'Chọn lý do kiểm kê');
  const diffs = countDiffs(proc.stock, counted || {});
  const moves = [];
  for (const d of diffs) {
    const lot = proc.stock.find((s) => s.id === d.stockId);
    lot.qty = d.countedQty;
    const loss = d.diff < 0 ? wasteCostVnd(lot.sku, -d.diff, lot.unitCostVnd) : 0;
    const m = { id: seqId(proc, 'MV'), at: now.toISOString(), kind: 'count', stockId: lot.id, sku: lot.sku, lotCode: lot.lotCode, qty: d.diff, reason, costVnd: loss, by };
    proc.stockMoves.push(m);
    moves.push(m);
  }
  return good({ diffs, moves });
}

export const stockStateOf = (lot, now) => (lot.heldBy ? 'held' : expiryState(lot, now));

// ---------------------------------------------------------------------------------------------
// Mua nông sản trực tiếp → bảng kê thu mua

export function settingsOf(db) {
  return ensureProcurement(db).settings;
}

export function saveSettings(db, { statementTemplate, customTitle, customNote }) {
  const proc = ensureProcurement(db);
  if (!BUSINESS.purchasing.statementTemplates[statementTemplate]) return bad('TEMPLATE_INVALID', 'Mẫu bảng kê không có trong cấu hình');
  proc.settings = {
    statementTemplate,
    customTitle: String(customTitle || '').trim(),
    customNote: String(customNote || '').trim()
  };
  return good({ settings: proc.settings });
}

export function recordDirectPurchase(db, { seller, items, method = 'bank_transfer', intoStock = true, location = 'hub', by = '' }, now) {
  const proc = ensureProcurement(db);
  const nowIso = now.toISOString();
  const number = dailyId(proc.purchases, 'BK', nowIso);
  const built = buildStatement({ number, at: nowIso, seller, items, method, templateId: proc.settings.statementTemplate, settings: proc.settings });
  if (!built.ok) return bad('STATEMENT_INVALID', built.errors.join('; '), { errors: built.errors });
  const check = validatePayment({ amountVnd: built.statement.totalVnd, method });
  if (!check.ok) return bad(check.code, check.message);
  const record = { id: number, at: nowIso, by, method, location, statement: built.statement, stockIds: [] };
  if (intoStock) {
    for (const it of built.statement.items) {
      if (!it.sku) continue;
      const stockId = seqId(proc, 'STK');
      const code = nextHubLotCode(it.sku, proc.stock.map((s) => s.lotCode), nowIso);
      proc.stock.push({
        id: stockId, sku: it.sku, lotCode: code, qty: it.qty, qtyIn: it.qty, unit: it.unit, receivedAt: nowIso, expiresAt: defaultExpiry(it.sku, nowIso),
        tempC: null, supplierId: null, receiptId: number, location: location === 'factory' ? 'factory' : 'hub', heldBy: null, unitCostVnd: it.unitPriceVnd
      });
      record.stockIds.push(stockId);
      proc.stockMoves.push({ id: seqId(proc, 'MV'), at: nowIso, kind: 'receive', stockId, sku: it.sku, lotCode: code, qty: it.qty, ref: number, by });
    }
  }
  proc.purchases.push(record);
  return good({ purchase: record });
}

/** Giấy chứng nhận đã hết hạn của nhà cung cấp: không nên đặt thêm. */
export function expiredCertsOf(profile, now) {
  return (profile.certs || []).filter((c) => certStatus(c, now).state === 'expired');
}
