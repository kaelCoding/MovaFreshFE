import { BUSINESS } from '../config/business';
import { SKUS } from '../data/catalog';
import { dayKey } from '../utils/time';
import { vatSplit } from './financeRevenue';
import { cardFee, toCsv } from './financePayables';

/**
 * Xuất bút toán (CSV) cho phần mềm kế toán. MOVA chỉ giữ sổ phụ nghiệp vụ; tài khoản kế toán KHÔNG viết cứng:
 * mỗi dòng bút toán dùng một khóa tài khoản logic (`cash_bank`, `revenue`...) và bảng ánh xạ do kế toán cấu hình
 * (`BUSINESS.finance.accountMap`, sửa ở Cài đặt) đổi khóa thành mã tài khoản của phần mềm.
 *
 * Mỗi chứng từ (voucher) luôn cân Nợ = Có.
 */

export const JOURNAL_GROUPS = {
  topup: 'Nạp / thu tiền',
  revenue: 'Doanh thu',
  cogs: 'Giá vốn',
  promo: 'Khuyến mãi',
  refund: 'Hoàn tiền',
  supplier_invoice: 'Hóa đơn nhà cung cấp',
  payment: 'Chi trả nhà cung cấp',
  statement: 'Thu mua nông sản không hóa đơn (bảng kê)',
  adjustment: 'Điều chỉnh Fresh Credit'
};

const line = (account, dr = 0, cr = 0) => ({ account, dr, cr });

/** Tài khoản đang hiệu lực: cấu hình mặc định, ghi đè bởi mã kế toán nhập ở Cài đặt. */
export function effectiveAccountMap(overrides = {}, cfg = BUSINESS) {
  const out = {};
  for (const [k, v] of Object.entries(cfg.finance.accountMap)) out[k] = { label: v.label, code: String((overrides && overrides[k]) != null ? overrides[k] : v.code || '').trim() };
  return out;
}

/**
 * Dựng các chứng từ từ dữ liệu nghiệp vụ.
 * src = { ledger, revenueRows, costOf(row) -> boxCost, matchedPos: [{ po, matchedAt }], payments, purchases }.
 * Mỗi chứng từ: { id, date, at, group, ref, memo, objectId, lines: [{ account, dr, cr }] }.
 */
export function buildJournal(src, cfg = BUSINESS, treatment = cfg.finance.promoTreatment) {
  const out = [];
  const add = (e) => {
    const lines = e.lines.filter((l) => l.dr || l.cr);
    if (lines.length) out.push({ ...e, date: dayKey(new Date(e.at)), lines });
  };

  // 1) Nạp và thu tiền: Nợ tiền gửi / Có khách hàng trả trước. Thẻ: trừ phí cổng thanh toán.
  for (const l of src.ledger) {
    if (['topup', 'prepaid_cycle'].includes(l.kind) && l.real > 0) {
      add({ at: l.at, group: 'topup', ref: l.id, objectId: l.customerId, memo: `${l.kind === 'topup' ? 'Nạp Fresh Credit' : 'Chuyển khoản trả trọn gói'}${l.ref ? ` ${l.ref}` : ''}`, lines: [line('cash_bank', l.real, 0), line('customer_prepaid', 0, l.real)] });
    } else if (l.kind === 'card_charge' && l.real > 0) {
      const fee = cardFee(l.real, cfg);
      add({ at: l.at, group: 'topup', ref: l.id, objectId: l.customerId, memo: `Trừ thẻ đơn ${l.orderId || ''}`.trim(), lines: [line('cash_bank', l.real - fee, 0), line('card_fee', fee, 0), line('customer_prepaid', 0, l.real)] });
    } else if (l.kind === 'cancel_refund' && l.real > 0) {
      add({ at: l.at, group: 'refund', ref: l.id, objectId: l.customerId, memo: 'Hoàn Fresh Credit tiền thật khi dừng gói', lines: [line('customer_prepaid', l.real, 0), line('cash_bank', 0, l.real)] });
    } else if (l.kind === 'adjustment') {
      // Chỉ phần tiền thật mới đụng tới sổ kế toán; điều chỉnh khuyến mãi chỉ nằm ở sổ phụ.
      const r = l.real || 0;
      if (r > 0) add({ at: l.at, group: 'adjustment', ref: l.id, objectId: l.customerId, memo: `Điều chỉnh Fresh Credit +${r} (${l.note || 'đã duyệt'})`, lines: [line('other_expense', r, 0), line('customer_prepaid', 0, r)] });
      else if (r < 0) add({ at: l.at, group: 'adjustment', ref: l.id, objectId: l.customerId, memo: `Điều chỉnh Fresh Credit ${r} (${l.note || 'đã duyệt'})`, lines: [line('customer_prepaid', -r, 0), line('other_expense', 0, -r)] });
    }
  }

  // 2) Doanh thu, khuyến mãi dùng, giá vốn: chỉ đơn ĐÃ GIAO
  for (const r of src.revenueRows) {
    const at = r.deliveredAt;
    if (r.realVnd > 0) {
      add({ at, group: 'revenue', ref: r.orderId, objectId: r.customerId, memo: `Doanh thu đơn ${r.orderId} (tiền thật đã dùng)`, lines: [line('customer_prepaid', r.realVnd, 0), line('revenue', 0, r.netRevenueVnd), line('vat_output', 0, r.vatVnd)] });
    }
    if (treatment === 'gross' && r.promoVnd > 0) {
      add({ at, group: 'promo', ref: r.orderId, objectId: r.customerId, memo: `Khuyến mãi đã dùng cho đơn ${r.orderId}`, lines: [line('promo_expense', r.promoVnd, 0), line('revenue_promo', 0, r.promoVnd)] });
    }
    const c = src.costOf(r);
    add({
      at, group: 'cogs', ref: r.orderId, objectId: r.customerId, memo: `Giá vốn đơn ${r.orderId}`,
      lines: [line('cogs_materials', c.materialsVnd, 0), line('cogs_logistics', c.logisticsVnd, 0), line('inventory', 0, c.materialsVnd), line('payable_logistics', 0, c.logisticsVnd)]
    });
  }

  // 3) Hóa đơn nhà cung cấp đã đối chiếu 3 chiều: Nợ hàng tồn kho + VAT đầu vào / Có phải trả. Khiếu nại đã trừ trong số phải trả.
  for (const { po, matchedAt } of src.matchedPos) {
    const payable = po.payableVnd || 0;
    if (!(payable > 0)) continue;
    const mix = {};
    for (const l of po.lines) mix[SKUS[l.sku].taxGroup] = (mix[SKUS[l.sku].taxGroup] || 0) + l.lineTotalVnd;
    const vat = vatSplit(payable, mix, cfg);
    add({ at: matchedAt, group: 'supplier_invoice', ref: po.id, objectId: po.supplierId, memo: `Hóa đơn nhà cung cấp, PO ${po.id}`, lines: [line('inventory', vat.netVnd, 0), line('vat_input', vat.vatVnd, 0), line('payable_supplier', 0, payable)] });
  }

  // 4) Chi trả nhà cung cấp
  for (const p of src.payments) {
    add({ at: p.paidAt, group: 'payment', ref: p.id, objectId: p.supplierId, memo: `Trả nhà cung cấp, PO ${p.poId}${p.ref ? ` (${p.ref})` : ''}`, lines: [line('payable_supplier', p.amountVnd, 0), line(p.method === 'cash' ? 'cash_hand' : 'cash_bank', 0, p.amountVnd)] });
  }

  // 5) Bảng kê thu mua nông sản không hóa đơn: không có VAT đầu vào
  for (const p of src.purchases) {
    const total = p.statement.totalVnd;
    add({ at: p.at, group: 'statement', ref: p.id, objectId: null, memo: `Bảng kê thu mua ${p.id}`, lines: [line('inventory', total, 0), line(p.method === 'cash' ? 'cash_hand' : 'cash_bank', 0, total)] });
  }

  out.sort((a, b) => a.at.localeCompare(b.at) || a.group.localeCompare(b.group) || String(a.ref).localeCompare(String(b.ref)));
  const perDay = {};
  for (const e of out) {
    perDay[e.date] = (perDay[e.date] || 0) + 1;
    e.id = `BT-${e.date.replace(/-/g, '')}-${String(perDay[e.date]).padStart(3, '0')}`;
  }
  return out;
}

export function filterJournal(entries, { from = null, to = null, groups = null } = {}) {
  return entries.filter((e) => (!from || e.date >= from) && (!to || e.date <= to) && (!groups || !groups.length || groups.includes(e.group)));
}

export function journalTotals(entries) {
  let dr = 0;
  let cr = 0;
  const unbalanced = [];
  const byGroup = {};
  for (const e of entries) {
    const d = e.lines.reduce((s, l) => s + l.dr, 0);
    const c = e.lines.reduce((s, l) => s + l.cr, 0);
    dr += d;
    cr += c;
    if (d !== c) unbalanced.push(e.id);
    const g = (byGroup[e.group] ||= { group: e.group, label: JOURNAL_GROUPS[e.group] || e.group, count: 0, debitVnd: 0, creditVnd: 0 });
    g.count += 1;
    g.debitVnd += d;
    g.creditVnd += c;
  }
  return { debitVnd: dr, creditVnd: cr, balanced: dr === cr && !unbalanced.length, unbalanced, byGroup: Object.values(byGroup) };
}

/** Khóa tài khoản đang dùng mà kế toán chưa nhập mã. */
export function unmappedAccounts(entries, accountMap) {
  const used = new Set(entries.flatMap((e) => e.lines.map((l) => l.account)));
  return [...used].filter((k) => !accountMap[k] || !accountMap[k].code).sort();
}

/** CSV bút toán: mỗi dòng một bút Nợ hoặc Có. Chưa ánh xạ thì cột mã ghi `?khóa` để kế toán lọc và ánh xạ lại. */
export function journalCsv(entries, accountMap) {
  const header = ['Ngày', 'Số chứng từ', 'Nhóm', 'Diễn giải', 'Mã tài khoản', 'Tên tài khoản', 'Nợ', 'Có', 'Đối tượng', 'Tham chiếu'];
  const rows = [];
  for (const e of entries) {
    for (const l of e.lines) {
      const a = accountMap[l.account] || { code: '', label: l.account };
      rows.push([e.date, e.id, JOURNAL_GROUPS[e.group] || e.group, e.memo, a.code || `?${l.account}`, a.label, l.dr || 0, l.cr || 0, e.objectId || '', e.ref]);
    }
  }
  return toCsv(header, rows);
}

/** Bảng kê thu mua (CSV): một dòng cho mỗi mặt hàng của mỗi bảng kê. */
export function statementsCsv(purchases) {
  const header = ['Số bảng kê', 'Ngày', 'Mẫu', 'Người bán', 'CCCD', 'Địa chỉ', 'STT', 'Tên hàng', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Hình thức trả'];
  const rows = [];
  for (const p of purchases) {
    const s = p.statement;
    for (const it of s.items) rows.push([s.number, dayKey(new Date(s.at)), s.templateLabel, s.seller.name, s.seller.cccd, s.seller.address, it.no, it.name, it.unit, it.qty, it.unitPriceVnd, it.amountVnd, p.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản']);
  }
  return toCsv(header, rows);
}
