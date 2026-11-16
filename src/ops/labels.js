import { PO_STATUS_LABEL } from '../shared/domain/procurement';

export { PO_STATUS_LABEL };

/** Màu nhãn trạng thái PO (ops-pill-*). */
export const stagePill = (stage) =>
  ({ draft: '', approved: 'ops-pill-warn', sent: 'ops-pill-warn', confirmed: 'ops-pill-ok', received_partial: 'ops-pill-warn', received: 'ops-pill-ok', invoiced: 'ops-pill-warn', matched: 'ops-pill-ok', due: 'ops-pill-bad', paid: 'ops-pill-ok' }[stage] || '');

export const CERT_PILL = { valid: 'ops-pill-ok', expiring: 'ops-pill-warn', expired: 'ops-pill-bad' };
export const CERT_LABEL = { valid: 'Còn hạn', expiring: 'Sắp hết hạn', expired: 'Đã hết hạn' };

export const STOCK_PILL = { ok: 'ops-pill-ok', expiring: 'ops-pill-warn', expired: 'ops-pill-bad', held: 'ops-pill-bad' };
export const STOCK_LABEL = { ok: 'Còn hạn', expiring: 'Sắp hết hạn', expired: 'Đã quá hạn', held: 'Đang giữ (thu hồi)' };

export const TEMP_NAME = { chill: 'Ngăn mát', frozen: 'Ngăn đông', ambient: 'Thường' };

export const CLAIM_LABEL = { open: 'Mới', acknowledged: 'NCC đã phản hồi', deducted: 'Đã trừ công nợ' };

/** "21/11/2026" từ YYYY-MM-DD hoặc ISO. */
export function dmy(v) {
  if (!v) return '';
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export const cleanDay = (iso) => (iso ? String(iso).slice(0, 10) : '');
