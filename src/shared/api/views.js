import { ORDER_VIEW } from '../config/roles';

export class ForbiddenError extends Error {
  constructor(message = 'Vai trò này không được xem dữ liệu đó') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = 'FORBIDDEN';
  }
}

export const maskPhone = (p = '') => (p.length > 6 ? `${p.slice(0, 3)}****${p.slice(-3)}` : '***');

/**
 * Lọc một đơn theo vai trò TẠI TẦNG API. Giao diện không bao giờ nhận được trường nó không được xem.
 * Mức: anonymous (mã đơn, khu, khung giờ) < recipient_masked < recipient < finance < full.
 */
export function viewOrder(order, role) {
  const level = ORDER_VIEW[role];
  if (!level) throw new ForbiddenError();

  const base = {
    id: order.id,
    zoneId: order.zoneId,
    slotId: order.slotId,
    deliveryDay: order.deliveryDay,
    deliveryAt: order.deliveryAt,
    cutoffAt: order.cutoffAt,
    status: order.status,
    weekIndex: order.weekIndex,
    mealsCount: order.meals.length,
    boxCount: 1
  };

  switch (level) {
    case 'anonymous':
      return base;
    case 'recipient':
      return { ...base, recipient: { ...order.recipient } };
    case 'recipient_masked':
      return { ...base, recipient: { name: order.recipient.name, phone: maskPhone(order.recipient.phone), address: order.recipient.address } };
    case 'finance':
      return { ...base, customerId: order.customerId, amountVnd: order.amountVnd, listPriceVnd: order.listPriceVnd, discountVnd: order.discountVnd, paymentMethod: order.paymentMethod, paidAt: order.paidAt || null };
    case 'full':
      return { ...order };
    default:
      throw new ForbiddenError();
  }
}

/** Nhà cung cấp chỉ thấy PO của chính mình; không bao giờ thấy PIN. */
export function viewSupplier(supplier) {
  const { pin, ...rest } = supplier;
  return rest;
}

/**
 * Lọc PO theo vai trò TẠI TẦNG API. Nhà cung cấp chỉ nhận PO của chính mình và không thấy phần nội bộ của MOVA:
 * phần trừ tồn kho (cho biết tồn của MOVA), ghi chú nội bộ, mã báo cáo thiếu của xưởng, lịch sử thao tác nội bộ.
 */
export function viewPo(po, role) {
  if (role !== 'supplier') return { ...po };
  const { coveredByStock, shortageIds, internalNote, history, matchNote, matchIssues, acceptedInvoicePrice, ...rest } = po;
  return {
    ...rest,
    lines: po.lines.map(({ sku, name, qty, unit, unitPriceVnd, lineTotalVnd }) => ({ sku, name, qty, unit, unitPriceVnd, lineTotalVnd })),
    history: (history || []).filter((h) => ['sent', 'confirmed', 'received', 'received_partial', 'invoiced', 'matched', 'paid'].includes(h.status)).map((h) => ({ at: h.at, status: h.status }))
  };
}

/** Hóa đơn không kèm nội dung tệp (tệp tải riêng khi cần xem). */
export function viewInvoice(inv) {
  const { file, ...rest } = inv;
  return { ...rest, file: file ? { name: file.name, type: file.type } : null };
}

/** Người nhận của một đơn chỉ hiện cho vai trò được phép thấy (kho phụ, admin). Không bao giờ trả mã khách. */
export function recipientFor(order, role) {
  if (!['hub', 'admin'].includes(role)) return null;
  const r = order.recipient || {};
  return { name: r.name, phone: r.phone, address: r.address };
}
