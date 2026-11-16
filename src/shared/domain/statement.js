import { BUSINESS } from '../config/business';
import { SKUS } from '../data/catalog';

/**
 * Bảng kê thu mua nông sản trực tiếp từ người bán không có hóa đơn (P2B).
 * Mẫu bảng kê do kế toán chọn trong cài đặt (BUSINESS.purchasing.statementTemplates), không viết cứng ở đây:
 * hàm chỉ ghép dữ liệu người bán, hàng hóa, số tiền với tiêu đề và ghi chú của mẫu được chọn.
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** Đọc một số từ 0 tới 999 bằng chữ. `full` = có đọc cả hàng trăm khi hàng trăm bằng 0 (vì đứng sau một nhóm lớn hơn). */
function readTriple(n, full) {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts = [];
  if (h > 0 || full) parts.push(`${DIGITS[h]} trăm`);
  if (t > 1) {
    parts.push(`${DIGITS[t]} mươi`);
    if (u === 1) parts.push('mốt');
    else if (u === 4) parts.push('tư');
    else if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (t === 1) {
    parts.push('mười');
    if (u === 5) parts.push('lăm');
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (u > 0) {
    if (h > 0 || full) parts.push('linh');
    parts.push(DIGITS[u]);
  }
  return parts.join(' ');
}

/** Số tiền bằng chữ: 1250000 → "Một triệu hai trăm năm mươi nghìn đồng". */
export function vndInWords(amount) {
  let n = Math.round(Number(amount) || 0);
  if (n === 0) return 'Không đồng';
  const negative = n < 0;
  n = Math.abs(n);
  const units = ['', ' nghìn', ' triệu', ' tỷ'];
  const groups = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const out = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    // Chỉ nhóm cao nhất đọc "không trăm" bị bỏ; các nhóm thấp hơn đứng sau nhóm lớn thì đọc đủ ("một triệu không trăm linh năm")
    const full = i < groups.length - 1;
    out.push(readTriple(g, full) + units[i]);
  }
  const text = `${negative ? 'Âm ' : ''}${out.join(' ')} đồng`.replace(/\s+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Dựng bảng kê. seller = { name, cccd, address, phone? }, items = [{ sku?, name?, unit?, qty, unitPriceVnd }].
 * Chỉ hàng nông sản tươi chưa qua chế biến (nhóm thuế `fresh`) mới được mua theo cách này.
 * Trả { ok, statement } hoặc { ok: false, errors[] }.
 */
export function buildStatement({ number, at, seller, items, method, templateId, settings = {} }, cfg = BUSINESS) {
  const errors = [];
  const templates = cfg.purchasing.statementTemplates;
  const tpl = templates[templateId] || templates[cfg.purchasing.defaultStatementTemplate];
  if (!seller || !String(seller.name || '').trim()) errors.push('Nhập họ tên người bán');
  const cccd = String((seller && seller.cccd) || '').replace(/\s|-/g, '');
  if (!/^(\d{9}|\d{12})$/.test(cccd)) errors.push('Số CCCD người bán phải có 12 số (hoặc CMND 9 số)');
  if (!seller || !String(seller.address || '').trim()) errors.push('Nhập địa chỉ người bán');
  if (!Array.isArray(items) || !items.length) errors.push('Nhập ít nhất một mặt hàng');

  const lines = [];
  for (const [i, it] of (items || []).entries()) {
    const sku = it.sku ? SKUS[it.sku] : null;
    if (it.sku && !sku) {
      errors.push(`Dòng ${i + 1}: SKU không có trong danh mục`);
      continue;
    }
    if (sku && sku.taxGroup !== 'fresh') {
      errors.push(`Dòng ${i + 1}: ${sku.name} không phải nông sản tươi chưa qua chế biến nên không mua theo bảng kê`);
      continue;
    }
    const name = String(it.name || (sku && sku.name) || '').trim();
    const qty = Number(it.qty);
    const price = Number(it.unitPriceVnd);
    if (!name) errors.push(`Dòng ${i + 1}: nhập tên hàng`);
    else if (!(qty > 0)) errors.push(`Dòng ${i + 1}: số lượng phải lớn hơn 0`);
    else if (!(Number.isInteger(price) && price > 0)) errors.push(`Dòng ${i + 1}: đơn giá phải là số đồng lớn hơn 0`);
    else lines.push({ no: lines.length + 1, sku: it.sku || null, name, unit: it.unit || (sku && sku.unit) || 'kg', qty, unitPriceVnd: price, amountVnd: Math.round(qty * price) });
  }
  if (errors.length) return { ok: false, errors };

  const totalVnd = lines.reduce((s, l) => s + l.amountVnd, 0);
  const custom = tpl.editable;
  const statement = {
    number,
    at,
    templateId: templates[templateId] ? templateId : cfg.purchasing.defaultStatementTemplate,
    templateLabel: tpl.label,
    templateConfirmed: Boolean(tpl.confirmed),
    title: (custom && settings.customTitle) || tpl.title,
    legalNote: (custom && settings.customNote) || tpl.legalNote || '',
    seller: { name: seller.name.trim(), cccd, address: seller.address.trim(), phone: String(seller.phone || '').trim() },
    items: lines,
    totalVnd,
    totalWords: vndInWords(totalVnd),
    method,
    signatures: ['Người lập bảng kê', 'Người bán (ký, ghi rõ họ tên)', 'Kế toán / Thủ trưởng đơn vị']
  };
  return { ok: true, statement };
}
