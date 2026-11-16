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
