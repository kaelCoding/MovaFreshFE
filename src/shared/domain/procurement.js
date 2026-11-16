import { BUSINESS } from '../config/business';
import { DISHES, SKUS, SUPPLIERS } from '../data/catalog';
import { packingOf } from '../data/packaging';
import { addDays, atDay, dayKey } from '../utils/time';
import { isTempOk } from './factory';

/**
 * Nghiệp vụ mua hàng và nhà cung cấp (P2B), toàn bộ là hàm thuần để test và để lớp API dùng chung.
 * - Hồ sơ nhà cung cấp, giấy chứng nhận và cảnh báo hết hạn.
 * - Bảng giá theo ngày hiệu lực, so với giá thị trường.
 * - Vòng đời PO, đánh giá dòng nhận hàng, đối chiếu 3 chiều PO / phiếu nhập / hóa đơn, công nợ.
 * - Dự báo theo nhà cung cấp, danh mục SKU.
 * Không hàm nào đọc `db`: lớp API lấy dữ liệu rồi truyền vào.
 */

const round1 = (n) => Math.round(n * 10) / 10;
const ceil1 = (n) => Math.ceil(n * 10 - 1e-9) / 10;
const toDayMs = (key) => atDay(key, 0, 0).getTime();
const DAY_MS = 24 * 3600 * 1000;

/** Số ngày từ ngày `fromKey` tới ngày `toKey` (âm nếu `toKey` đã qua). */
export const daysBetween = (fromKey, toKey) => Math.round((toDayMs(toKey) - toDayMs(fromKey)) / DAY_MS);

// ---------------------------------------------------------------------------------------------
// Hồ sơ nhà cung cấp

export const SUPPLIER_KINDS = BUSINESS.suppliers.kinds;

/** Loại nhà cung cấp theo danh mục: factory / seafood / long_haul / last_mile / packaging. */
export const catalogKind = (supplierId) => (SUPPLIERS[supplierId] ? SUPPLIERS[supplierId].type : null);

/**
 * Kiểm tra hồ sơ nhà cung cấp. Trả danh sách lỗi (rỗng là hợp lệ).
 * Nông hộ khai CCCD (12 số, hoặc CMND cũ 9 số); các loại khác khai mã số thuế (10 hoặc 13 số).
 */
export function validateSupplierProfile(p) {
  const errors = [];
  if (!p || typeof p !== 'object') return ['Thiếu hồ sơ'];
  if (!SUPPLIER_KINDS[p.kind]) errors.push('Chọn loại nhà cung cấp');
  if (!String(p.name || '').trim()) errors.push('Thiếu tên nhà cung cấp');
  const digits = (s) => String(s || '').replace(/\s|-/g, '');
  if (p.kind === 'nong_ho') {
    if (!/^(\d{9}|\d{12})$/.test(digits(p.cccd))) errors.push('Nông hộ cần số CCCD 12 số (hoặc CMND 9 số)');
  } else if (!/^(\d{10}|\d{13})$/.test(digits(p.taxId))) {
    errors.push('Mã số thuế phải có 10 hoặc 13 số');
  }
  const b = p.bank || {};
  if (!String(b.bankName || '').trim() || !String(b.accountNo || '').trim() || !String(b.accountName || '').trim()) {
    errors.push('Thiếu tài khoản ngân hàng (ngân hàng, số tài khoản, chủ tài khoản)');
  } else if (!/^\d{6,20}$/.test(digits(b.accountNo))) {
    errors.push('Số tài khoản phải có 6 đến 20 chữ số');
  }
  if (!Number.isInteger(p.termDays) || p.termDays < 0 || p.termDays > 120) errors.push('Kỳ công nợ phải là số ngày từ 0 đến 120');
  const c = p.contact || {};
  if (!String(c.name || '').trim()) errors.push('Thiếu người liên hệ');
  if (!/^0\d{9,10}$/.test(digits(c.phone))) errors.push('Số điện thoại người liên hệ không hợp lệ');
  return errors;
}

/** Giấy chứng nhận: loại, số, ngày hết hạn (YYYY-MM-DD). Trả danh sách lỗi. */
export function validateCert(c) {
  const errors = [];
  if (!c || typeof c !== 'object') return ['Thiếu giấy chứng nhận'];
  if (!BUSINESS.suppliers.certTypes[c.type]) errors.push('Chọn loại giấy chứng nhận');
  if (!String(c.number || '').trim()) errors.push('Thiếu số giấy chứng nhận');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.expiresAt || ''))) errors.push('Ngày hết hạn không hợp lệ (YYYY-MM-DD)');
  return errors;
}

/**
 * Tình trạng một giấy chứng nhận tại thời điểm `now`:
 * expired (đã hết hạn), expiring (còn từ 0 tới `warnDays` ngày), valid.
 */
export function certStatus(cert, now, warnDays = BUSINESS.suppliers.certWarnDays) {
  const daysLeft = daysBetween(dayKey(now), cert.expiresAt);
  const state = daysLeft < 0 ? 'expired' : daysLeft <= warnDays ? 'expiring' : 'valid';
  return { state, daysLeft };
}

/** Mọi giấy chứng nhận đã hết hạn hoặc sắp hết hạn của danh sách hồ sơ, sắp theo số ngày còn lại. */
export function certAlerts(profiles, now, warnDays = BUSINESS.suppliers.certWarnDays) {
  const out = [];
  for (const p of profiles) {
    for (const cert of p.certs || []) {
      const st = certStatus(cert, now, warnDays);
      if (st.state !== 'valid') out.push({ supplierId: p.id, supplierName: p.name, cert, ...st });
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ---------------------------------------------------------------------------------------------
// Bảng giá

/**
 * Giá của một SKU tại ngày `day` (YYYY-MM-DD): bản ghi có ngày hiệu lực muộn nhất mà vẫn <= `day`.
 * Chưa có bản ghi nào thì lấy giá trong danh mục.
 */
export function priceAt(priceList, skuId, day) {
  let best = null;
  for (const e of priceList || []) {
    if (e.sku !== skuId || e.effectiveFrom > day) continue;
    if (!best || e.effectiveFrom > best.effectiveFrom || (e.effectiveFrom === best.effectiveFrom && String(e.id) > String(best.id))) best = e;
  }
  if (best) return best.priceVnd;
  return SKUS[skuId] ? SKUS[skuId].priceVnd : null;
}

/** Lịch sử giá một SKU, mới nhất trước. */
export const priceHistory = (priceList, skuId) =>
  (priceList || [])
    .filter((e) => e.sku === skuId)
    .sort((a, b) => (a.effectiveFrom === b.effectiveFrom ? String(b.id).localeCompare(String(a.id)) : b.effectiveFrom.localeCompare(a.effectiveFrom)));

/** Chênh lệch giá nhà cung cấp so với giá thị trường (mock của pricing agent). diffPct > 0 là cao hơn thị trường. */
export function marketDiff(skuId, priceVnd, cfg = BUSINESS) {
  const sku = SKUS[skuId];
  const marketVnd = sku ? sku.marketPriceVnd : null;
  if (!marketVnd || !priceVnd) return { marketVnd: marketVnd || null, diffVnd: null, diffPct: null, warn: false };
  const diffVnd = priceVnd - marketVnd;
  const diffPct = diffVnd / marketVnd;
  return { marketVnd, diffVnd, diffPct, warn: diffPct > cfg.purchasing.marketDiffWarnPct };
}

/** Kiểm tra một mức giá mới: giá > 0, ngày hợp lệ và không sớm hơn mức giá hiện có gần nhất. Trả danh sách lỗi. */
export function validatePriceEntry(priceList, { sku, priceVnd, effectiveFrom }) {
  const errors = [];
  if (!SKUS[sku]) errors.push('SKU không có trong danh mục');
  if (!Number.isInteger(priceVnd) || priceVnd <= 0) errors.push('Giá phải là số đồng lớn hơn 0');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(effectiveFrom || ''))) errors.push('Ngày hiệu lực không hợp lệ');
  else {
    const last = priceHistory(priceList, sku)[0];
    if (last && effectiveFrom < last.effectiveFrom) errors.push(`Ngày hiệu lực không được sớm hơn mức giá gần nhất (${last.effectiveFrom})`);
  }
  return errors;
}

// ---------------------------------------------------------------------------------------------
// Vòng đời PO

/** Nháp → Đã duyệt → Đã gửi → NCC xác nhận → Nhận một phần / đủ → Có hóa đơn → Đã đối chiếu → (Đến hạn) → Đã trả. */
export const PO_FLOW = ['draft', 'approved', 'sent', 'confirmed', 'received_partial', 'received', 'invoiced', 'matched', 'paid'];

export const PO_STATUS_LABEL = {
  draft: 'Nháp',
  approved: 'Đã duyệt',
  sent: 'Đã gửi',
  confirmed: 'NCC đã xác nhận',
  received_partial: 'Nhận một phần',
  received: 'Nhận đủ',
  invoiced: 'Có hóa đơn',
  matched: 'Đã đối chiếu',
  due: 'Đến hạn trả',
  paid: 'Đã trả'
};

const NEXT = {
  draft: ['approved'],
  approved: ['sent'],
  sent: ['confirmed', 'received_partial', 'received'],
  confirmed: ['received_partial', 'received'],
  received_partial: ['received_partial', 'received', 'invoiced'],
  received: ['invoiced'],
  invoiced: ['matched'],
  matched: ['paid'],
  paid: []
};

export const canTransition = (from, to) => (NEXT[from] || []).includes(to);

/** Trạng thái hiển thị: `matched` mà đã tới ngày hạn trả và chưa trả thì là `due`. */
export function poStage(po, now) {
  if (po.status === 'matched' && po.dueAt && Date.parse(po.dueAt) <= now.getTime()) return 'due';
  return po.status;
}

/** Số lượng PO đang chờ nhà cung cấp xác nhận / giao, v.v. */
export const PO_OPEN_FOR_RECEIPT = ['sent', 'confirmed', 'received_partial'];

/** Số lượng cần giao của một dòng: số nhà cung cấp xác nhận nếu đã xác nhận thiếu, ngược lại là số lượng đặt. */
export function lineTarget(po, line) {
  const c = po.confirmation && po.confirmation.lines && po.confirmation.lines.find((l) => l.sku === line.sku);
  return c ? c.confirmedQty : line.qty;
}

/**
 * Nhà cung cấp xác nhận PO. result 'full' (đủ) hoặc 'short' (thiếu): `lines` = [{ sku, confirmedQty }] (số có thể giao).
 * Với 'short' phải có ít nhất một dòng ít hơn số đặt. Trả { ok, confirmation } hoặc { ok:false, message }.
 */
export function buildConfirmation(po, { result, lines = [], note = '' }, atIso) {
  if (!['full', 'short'].includes(result)) return { ok: false, message: 'Chọn xác nhận đủ hoặc thiếu' };
  const out = [];
  for (const l of po.lines) {
    const given = lines.find((x) => x.sku === l.sku);
    let q = result === 'full' ? l.qty : given ? Number(given.confirmedQty) : l.qty;
    if (!Number.isFinite(q) || q < 0) return { ok: false, message: `Số lượng xác nhận của ${l.name} không hợp lệ` };
    if (q > l.qty + 1e-9) return { ok: false, message: `${l.name}: số xác nhận không được lớn hơn số đặt` };
    out.push({ sku: l.sku, orderedQty: l.qty, confirmedQty: round1(q) });
  }
  const shortLines = out.filter((l) => l.confirmedQty < l.orderedQty - 1e-9);
  if (result === 'short' && !shortLines.length) return { ok: false, message: 'Xác nhận thiếu thì ít nhất một dòng phải ít hơn số đặt' };
  const orderedTotal = out.reduce((s, l) => s + l.orderedQty, 0);
  const shortTotal = shortLines.reduce((s, l) => s + (l.orderedQty - l.confirmedQty), 0);
  return {
    ok: true,
    confirmation: {
      at: atIso,
      result: shortLines.length ? 'short' : 'full',
      lines: out,
      shortLines: shortLines.map((l) => ({ sku: l.sku, shortQty: round1(l.orderedQty - l.confirmedQty) })),
      shortPct: orderedTotal ? shortTotal / orderedTotal : 0,
      note: String(note || '').trim()
    }
  };
}

/**
 * Đặt số xác nhận theo một tỷ lệ thiếu cho mọi dòng (ví dụ thiếu 10% thì mỗi dòng còn 90%).
 * Dùng cho nút "thiếu x%" của nhà cung cấp trên điện thoại.
 */
export function shortByPct(po, pct) {
  return po.lines.map((l) => ({ sku: l.sku, confirmedQty: round1(l.qty * (1 - pct)) }));
}

/** Lượng thiếu của một dòng quy ra kg thành phẩm sơ chế (số PO tính theo nguyên liệu thô, nhân tỷ lệ thu hồi). */
export function shortToPreparedKg(skuId, shortQty) {
  const sku = SKUS[skuId];
  if (!sku || sku.unit !== 'kg') return 0;
  return round1(shortQty * sku.yield);
}

// ---------------------------------------------------------------------------------------------
// Nhận hàng tại kho phụ

export const RECEIPT_REASONS = {
  quality: 'Chất lượng không đạt',
  temp_breach: 'Vượt nhiệt độ',
  damaged: 'Hư hỏng / rách bao bì',
  expired: 'Hạn dùng quá ngắn',
  wrong_item: 'Sai mặt hàng',
  other: 'Lý do khác'
};

/**
 * Đánh giá một dòng nhận hàng: số đạt + không đạt không âm, nhiệt độ phải nằm trong ngưỡng nếu muốn nhận đạt,
 * phần không đạt phải có lý do. Trả { ok, errors[], tempOk, delivered }.
 */
export function evaluateReceiptLine(line, cfg = BUSINESS) {
  const errors = [];
  const sku = SKUS[line.sku];
  if (!sku) return { ok: false, errors: ['SKU không có trong danh mục'], tempOk: null, delivered: 0 };
  const accepted = Number(line.acceptedQty);
  const rejected = Number(line.rejectedQty || 0);
  if (!Number.isFinite(accepted) || accepted < 0) errors.push(`${sku.name}: số lượng đạt không hợp lệ`);
  if (!Number.isFinite(rejected) || rejected < 0) errors.push(`${sku.name}: số lượng không đạt không hợp lệ`);
  let tempOk = null;
  if (sku.temp !== 'ambient') {
    if (typeof line.tempC !== 'number' || Number.isNaN(line.tempC)) errors.push(`${sku.name}: nhập nhiệt độ lúc nhận`);
    else {
      tempOk = isTempOk(line.sku, line.tempC, cfg);
      if (!tempOk && accepted > 0) errors.push(`${sku.name}: nhiệt độ ${line.tempC}°C vượt ngưỡng nên không thể nhận đạt, hãy chuyển hết sang không đạt`);
    }
  }
  if (rejected > 0 && !RECEIPT_REASONS[line.reason]) errors.push(`${sku.name}: chọn lý do không đạt`);
  if (accepted + rejected <= 0) errors.push(`${sku.name}: nhập số lượng đạt hoặc không đạt`);
  return { ok: errors.length === 0, errors, tempOk, delivered: (accepted || 0) + (rejected || 0) };
}

/** Cộng dồn số đạt / không đạt theo SKU của các phiếu nhập của một PO. */
export function receivedBySku(receipts) {
  const out = {};
  for (const r of receipts) {
    for (const l of r.lines) {
      const x = (out[l.sku] ||= { accepted: 0, rejected: 0 });
      x.accepted += l.acceptedQty;
      x.rejected += l.rejectedQty || 0;
    }
  }
  return out;
}

/** PO đã nhận đủ chưa: mỗi dòng đã giao (đạt + không đạt) tới số cần giao (trừ dung sai). */
export function receiptComplete(po, receipts, cfg = BUSINESS) {
  const got = receivedBySku(receipts);
  return po.lines.every((l) => {
    const target = lineTarget(po, l);
    const delivered = (got[l.sku] ? got[l.sku].accepted + got[l.sku].rejected : 0);
    return delivered >= target - Math.max(target * cfg.purchasing.matchTolerance.qtyPct, 1e-9);
  });
}

/** Phiếu khiếu nại cho phần không đạt của một phiếu nhập. Giá lấy từ dòng PO. */
export function claimsFromReceipt(po, receipt) {
  const claims = [];
  for (const l of receipt.lines) {
    if (!(l.rejectedQty > 0)) continue;
    const poLine = po.lines.find((x) => x.sku === l.sku);
    const unit = poLine ? poLine.unitPriceVnd : SKUS[l.sku].priceVnd;
    claims.push({
      supplierId: po.supplierId,
      poId: po.id,
      receiptId: receipt.id,
      sku: l.sku,
      qty: l.rejectedQty,
      unit: SKUS[l.sku].unit,
      reason: l.reason,
      note: l.note || '',
      amountVnd: Math.round(l.rejectedQty * unit),
      photo: l.photo || null,
      tempC: typeof l.tempC === 'number' ? l.tempC : null
    });
  }
  return claims;
}

// ---------------------------------------------------------------------------------------------
// Đối chiếu 3 chiều PO / phiếu nhập / hóa đơn

const ISSUE_LABEL = {
  qty_invoice_over: 'Hóa đơn nhiều hơn hàng đã giao',
  qty_invoice_under: 'Hóa đơn ít hơn hàng đã giao',
  price_diff: 'Đơn giá hóa đơn khác đơn giá PO',
  line_not_in_po: 'Hóa đơn có mặt hàng không có trong PO',
  short_delivery: 'Giao thiếu so với PO',
  over_delivery: 'Giao nhiều hơn PO'
};
export const matchIssueLabel = (type) => ISSUE_LABEL[type] || type;

/**
 * Đối chiếu 3 chiều. Đầu vào: po (dòng `lines` có qty, unitPriceVnd), receipts (phiếu nhập của PO, dòng có acceptedQty, rejectedQty),
 * invoice (dòng `lines` có sku, qty, unitPriceVnd). Hàng "đã giao" = đạt + không đạt, vì nhà cung cấp xuất hóa đơn theo hàng đã giao;
 * phần không đạt được trừ lại qua phiếu khiếu nại.
 *
 * Phát hiện: hóa đơn lệch số lượng so với hàng đã giao (nhiều hơn / ít hơn), đơn giá hóa đơn lệch đơn giá PO,
 * mặt hàng ngoài PO, và (chỉ cảnh báo) giao thiếu / thừa so với PO. `ok` = không có lỗi mức `error`.
 * Số tiền phải trả = giá trị hóa đơn tính trên số lượng không vượt hàng đã giao, trừ phần không đạt.
 */
export function threeWayMatch({ po, receipts = [], invoice, acceptInvoicePrice = false }, cfg = BUSINESS) {
  const tol = cfg.purchasing.matchTolerance;
  const got = receivedBySku(receipts);
  const skus = [];
  for (const l of po.lines) skus.push(l.sku);
  for (const l of invoice ? invoice.lines : []) if (!skus.includes(l.sku)) skus.push(l.sku);
  for (const k of Object.keys(got)) if (!skus.includes(k)) skus.push(k);

  const lines = [];
  const issues = [];
  let poValue = 0;
  let deliveredValue = 0;
  let invoiceValue = 0;
  let claimValue = 0;
  let priceDiffValue = 0;
  let payable = 0;

  for (const sku of skus) {
    const poLine = po.lines.find((l) => l.sku === sku) || null;
    const invLine = invoice ? invoice.lines.find((l) => l.sku === sku) || null : null;
    const r = got[sku] || { accepted: 0, rejected: 0 };
    const name = (poLine && poLine.name) || (SKUS[sku] && SKUS[sku].name) || sku;
    const poQty = poLine ? lineTarget(po, poLine) : 0;
    const orderedQty = poLine ? poLine.qty : 0;
    const poPrice = poLine ? poLine.unitPriceVnd : null;
    const delivered = r.accepted + r.rejected;
    const invQty = invLine ? invLine.qty : 0;
    const invPrice = invLine ? invLine.unitPriceVnd : null;
    const lineIssues = [];
    const push = (type, severity, amountVnd, detail) => {
      const it = { sku, name, type, severity, amountVnd: Math.round(amountVnd), message: `${name}: ${matchIssueLabel(type)}${detail ? ` (${detail})` : ''}` };
      lineIssues.push(it);
      issues.push(it);
    };

    if (!poLine) {
      if (invLine) push('line_not_in_po', 'error', invQty * invPrice, `${invQty} ${SKUS[sku] ? SKUS[sku].unit : ''}`);
    } else {
      const qtyTol = Math.max(poQty * tol.qtyPct, 0);
      if (delivered < poQty - qtyTol - 1e-9) push('short_delivery', 'warn', (poQty - delivered) * poPrice, `PO ${poQty}, giao ${round1(delivered)}`);
      else if (delivered > poQty + qtyTol + 1e-9) push('over_delivery', 'warn', (delivered - poQty) * poPrice, `PO ${poQty}, giao ${round1(delivered)}`);
    }

    if (invLine) {
      const dTol = Math.max(delivered * tol.qtyPct, 0);
      if (invQty > delivered + dTol + 1e-9) push('qty_invoice_over', 'error', (invQty - delivered) * (invPrice || poPrice || 0), `hóa đơn ${invQty}, đã giao ${round1(delivered)}`);
      else if (invQty < delivered - dTol - 1e-9) push('qty_invoice_under', 'error', (delivered - invQty) * (poPrice || invPrice || 0), `hóa đơn ${invQty}, đã giao ${round1(delivered)}`);
      if (poLine && invPrice != null && Math.abs(invPrice - poPrice) > poPrice * tol.pricePct + 1e-9) {
        push('price_diff', 'error', (invPrice - poPrice) * invQty, `PO ${poPrice}đ, hóa đơn ${invPrice}đ`);
      }
    } else if (delivered > 0 && invoice) {
      push('qty_invoice_under', 'error', delivered * (poPrice || 0), `hóa đơn 0, đã giao ${round1(delivered)}`);
    }

    const payPrice = acceptInvoicePrice && invPrice != null ? invPrice : poPrice != null ? poPrice : invPrice || 0;
    const billed = Math.min(invQty, delivered);
    const claimQty = Math.min(r.rejected, billed);
    poValue += poQty * (poPrice || 0);
    deliveredValue += delivered * (poPrice || 0);
    invoiceValue += invQty * (invPrice || 0);
    claimValue += r.rejected * (poPrice || 0);
    if (poLine && invPrice != null) priceDiffValue += (invPrice - poPrice) * invQty;
    payable += billed * payPrice - claimQty * (poPrice != null ? poPrice : payPrice);

    lines.push({
      sku, name, unit: SKUS[sku] ? SKUS[sku].unit : '', orderedQty, poQty, poPrice,
      acceptedQty: round1(r.accepted), rejectedQty: round1(r.rejected), deliveredQty: round1(delivered),
      invoiceQty: invQty, invoicePrice: invPrice,
      issues: lineIssues.map((i) => i.type),
      status: lineIssues.some((i) => i.severity === 'error') ? 'error' : lineIssues.length ? 'warn' : 'ok'
    });
  }

  return {
    ok: !issues.some((i) => i.severity === 'error'),
    hasInvoice: Boolean(invoice),
    lines,
    issues,
    totals: {
      poVnd: Math.round(poValue),
      deliveredVnd: Math.round(deliveredValue),
      invoiceVnd: Math.round(invoiceValue),
      claimVnd: Math.round(claimValue),
      priceDiffVnd: Math.round(priceDiffValue),
      payableVnd: Math.max(0, Math.round(payable))
    }
  };
}

/** Giá trị PO tại số lượng đặt. */
export const poTotal = (lines) => lines.reduce((s, l) => s + l.lineTotalVnd, 0);

// ---------------------------------------------------------------------------------------------
// Hóa đơn, hạn trả, công nợ

/** Kiểm tra một hóa đơn nhà cung cấp gửi lên. Trả danh sách lỗi. */
export function validateInvoice(inv) {
  const errors = [];
  if (!inv || typeof inv !== 'object') return ['Thiếu hóa đơn'];
  if (!String(inv.number || '').trim()) errors.push('Nhập số hóa đơn');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(inv.issuedAt || ''))) errors.push('Ngày hóa đơn không hợp lệ');
  if (!Array.isArray(inv.lines) || !inv.lines.length) errors.push('Hóa đơn cần ít nhất một dòng');
  else {
    for (const l of inv.lines) {
      if (!SKUS[l.sku]) errors.push(`SKU ${l.sku} không có trong danh mục`);
      else if (!(typeof l.qty === 'number' && l.qty > 0)) errors.push(`${SKUS[l.sku].name}: số lượng phải lớn hơn 0`);
      else if (!(Number.isInteger(l.unitPriceVnd) && l.unitPriceVnd > 0)) errors.push(`${SKUS[l.sku].name}: đơn giá không hợp lệ`);
    }
  }
  return errors;
}

export const invoiceTotal = (lines) => Math.round(lines.reduce((s, l) => s + l.qty * l.unitPriceVnd, 0));

/** Hạn trả: ngày hóa đơn (hoặc ngày nhận hàng cuối) cộng kỳ công nợ, hết ngày 17:00. */
export function computeDueAt({ po, invoice, receipts }, cfg = BUSINESS) {
  let base = null;
  if (cfg.purchasing.dueFrom === 'receipt' && receipts && receipts.length) base = dayKey(new Date(receipts[receipts.length - 1].receivedAt));
  else if (invoice) base = invoice.issuedAt;
  else if (receipts && receipts.length) base = dayKey(new Date(receipts[receipts.length - 1].receivedAt));
  if (!base) return null;
  const term = Number.isInteger(po.termDays) ? po.termDays : cfg.payables.defaultTermDays;
  return atDay(addDays(base, term), 17, 0).toISOString();
}

/** Giữ khoản thanh toán bằng tiền mặt dưới trần (mất quyền khấu trừ VAT đầu vào nếu từ trần trở lên). */
export function validatePayment({ amountVnd, method }, cfg = BUSINESS) {
  if (!(Number.isFinite(amountVnd) && amountVnd > 0)) return { ok: false, code: 'INVALID_AMOUNT', message: 'Số tiền không hợp lệ' };
  if (!['bank_transfer', 'cash'].includes(method)) return { ok: false, code: 'METHOD_INVALID', message: 'Chọn chuyển khoản hoặc tiền mặt' };
  if (method === 'cash' && amountVnd >= cfg.alerts.cashPaymentVatLimitVnd) {
    return { ok: false, code: 'CASH_OVER_LIMIT', message: `Chi tiền mặt từ ${cfg.alerts.cashPaymentVatLimitVnd.toLocaleString('vi-VN')}đ trở lên không được khấu trừ VAT đầu vào. Hãy chuyển khoản.` };
  }
  return { ok: true };
}

/**
 * Một dòng công nợ cho mỗi PO đã có hàng nhận: đã giao, đã nhận hóa đơn, ngày đến hạn, đã trả, khấu trừ khiếu nại.
 * `receiptsByPo`: { poId: receipts[] }, `invoicesByPo`: { poId: invoice }, `claimsByPo`: { poId: claims[] }.
 */
export function payableRows({ pos, receiptsByPo, invoicesByPo, claimsByPo, now }, cfg = BUSINESS) {
  const rows = [];
  for (const po of pos) {
    const receipts = receiptsByPo[po.id] || [];
    if (!receipts.length && !['invoiced', 'matched', 'paid'].includes(po.status)) continue;
    const invoice = invoicesByPo[po.id] || null;
    const claims = claimsByPo[po.id] || [];
    const deliveredVnd = Math.round(
      receipts.reduce((s, r) => s + r.lines.reduce((a, l) => {
        const pl = po.lines.find((x) => x.sku === l.sku);
        return a + (l.acceptedQty + (l.rejectedQty || 0)) * (pl ? pl.unitPriceVnd : SKUS[l.sku].priceVnd);
      }, 0), 0)
    );
    const claimVnd = claims.reduce((s, c) => s + c.amountVnd, 0);
    const stage = poStage(po, now);
    const dueAt = po.dueAt || null;
    const today = dayKey(now);
    rows.push({
      poId: po.id,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      deliveryDay: po.deliveryDay,
      status: po.status,
      stage,
      deliveredVnd,
      claimVnd,
      invoiceNumber: invoice ? invoice.number : null,
      invoiceVnd: invoice ? invoice.totalVnd : null,
      invoiceAt: invoice ? invoice.issuedAt : null,
      payableVnd: po.payableVnd != null ? po.payableVnd : null,
      dueAt,
      daysToDue: dueAt ? daysBetween(today, dayKey(new Date(dueAt))) : null,
      paidAt: po.paidAt || null,
      paidVnd: po.paidVnd != null ? po.paidVnd : null
    });
  }
  return rows.sort((a, b) => (a.dueAt || '9').localeCompare(b.dueAt || '9') || a.poId.localeCompare(b.poId));
}

/** Báo cáo tuổi nợ theo số ngày tới hạn (README cashflow-ledger: kỳ 7 / 15 / 30 ngày). Chỉ tính khoản đã đối chiếu mà chưa trả. */
export function agingBuckets(rows) {
  const buckets = [
    { id: 'overdue', label: 'Đã quá hạn', amountVnd: 0, count: 0 },
    { id: 'd7', label: 'Trong 7 ngày', amountVnd: 0, count: 0 },
    { id: 'd15', label: '8 – 15 ngày', amountVnd: 0, count: 0 },
    { id: 'd30', label: '16 – 30 ngày', amountVnd: 0, count: 0 },
    { id: 'later', label: 'Hơn 30 ngày', amountVnd: 0, count: 0 }
  ];
  const by = Object.fromEntries(buckets.map((b) => [b.id, b]));
  for (const r of rows) {
    if (r.status !== 'matched' || r.daysToDue == null) continue;
    const id = r.daysToDue < 0 ? 'overdue' : r.daysToDue <= 7 ? 'd7' : r.daysToDue <= 15 ? 'd15' : r.daysToDue <= 30 ? 'd30' : 'later';
    by[id].amountVnd += r.payableVnd || 0;
    by[id].count += 1;
  }
  return buckets;
}

// ---------------------------------------------------------------------------------------------
// Dự báo theo nhà cung cấp, danh mục SKU

/** Số lượng đặt hàng tương ứng với gram thành phẩm (nguyên liệu thô = thành phẩm / tỷ lệ thu hồi, cộng dự phòng hao hụt). */
export function purchaseQtyForGrams(skuId, grams, cfg = BUSINESS) {
  const sku = SKUS[skuId];
  if (sku.unit === 'pcs') return Math.ceil(grams);
  return ceil1((grams / 1000 / sku.yield) * (1 + cfg.purchasing.wasteBufferPct));
}

/**
 * Dự báo `weeks` tuần cho một nhà cung cấp (không ràng buộc). `weekSums` = [{ start, end, skuGrams, boxes }] đã cộng từ nhu cầu.
 * Nhà cung cấp có hàng (SKU) thì ra từng dòng SKU; nhà xe / đội giao thì chỉ ra số thùng mỗi tuần.
 */
export function supplierForecast(weekSums, supplierId, cfg = BUSINESS) {
  const skuIds = Object.values(SKUS).filter((s) => s.supplierId === supplierId).map((s) => s.id);
  const rows = skuIds
    .filter((id) => id !== 'BB-THUNG-01')
    .map((id) => ({
      sku: id,
      name: SKUS[id].name,
      unit: SKUS[id].unit,
      qty: weekSums.map((w) => (w.skuGrams[id] ? purchaseQtyForGrams(id, w.skuGrams[id], cfg) : 0))
    }))
    .filter((r) => r.qty.some((q) => q > 0));
  if (skuIds.includes('BB-THUNG-01')) {
    rows.push({ sku: 'BB-THUNG-01', name: SKUS['BB-THUNG-01'].name, unit: 'pcs', qty: weekSums.map((w) => w.boxes) });
  }
  return {
    supplierId,
    weeks: weekSums.map((w) => ({ start: w.start, end: w.end })),
    boxes: weekSums.map((w) => w.boxes),
    rows
  };
}

/** Danh mục SKU: mã, tên, quy cách, nhóm nhiệt, hạn dùng, nhóm thuế, tỷ lệ thu hồi sơ chế, các món dùng SKU. */
export function skuCatalog(cfg = BUSINESS) {
  return Object.values(SKUS).map((s) => {
    const p = packingOf(s.id);
    const tax = cfg.tax.groups[s.taxGroup];
    return {
      id: s.id,
      name: s.name,
      unit: s.unit,
      spec: s.unit === 'pcs' ? 'Cái' : p.prep ? `${p.prep} · túi ${p.bagGrams}g` : `Túi ${p.bagGrams}g`,
      bagGrams: p.bagGrams,
      temp: s.temp,
      shelfDays: p.shelfDays,
      taxGroup: s.taxGroup,
      taxLabel: tax ? tax.label : s.taxGroup,
      taxRate: tax ? tax.rate : null,
      taxConfirmed: tax ? tax.confirmed : false,
      yield: s.yield,
      supplierId: s.supplierId,
      supplierName: SUPPLIERS[s.supplierId] ? SUPPLIERS[s.supplierId].name : s.supplierId,
      requiresLot: Boolean(s.requiresLot),
      priceVnd: s.priceVnd,
      marketPriceVnd: s.marketPriceVnd,
      dishes: Object.values(DISHES).filter((d) => d.bom.some((b) => b.sku === s.id)).map((d) => ({ id: d.id, name: d.name }))
    };
  });
}
