import { DISHES } from '../data/catalog';
import { fmt } from '../utils/formatters';
import { getZone } from '../config/business';
import { findSlot } from './delivery';
import { mealPriceVnd, swapOptionsFor } from './mealPlan';
import { nextId, notify } from './jobs';
import { validateLot } from './trace';

/**
 * Các việc phía vận hành ghi vào dữ liệu dùng chung mà khách cần thấy. P2A (xưởng) và P2C (giao hàng) gọi qua
 * api.ops.*; hàm ở đây thuần theo `db` để test và để hai app dùng chung một cách ghi.
 */

/** Thứ tự trạng thái của đơn sau khi chốt sổ. */
export const FULFILMENT_FLOW = ['locked', 'in_production', 'shipped', 'delivered'];

export const FULFILMENT_ERRORS = {
  ORDER_NOT_FOUND: 'Không tìm thấy đơn',
  STATUS_INVALID: 'Trạng thái không hợp lệ',
  STATUS_BACKWARD: 'Đơn không đi lùi trạng thái được',
  NOT_LOCKED: 'Đơn chưa chốt sổ nên chưa sản xuất được'
};

const err = (code, message) => ({ ok: false, code, message: message || FULFILMENT_ERRORS[code] || code });

/**
 * Đổi trạng thái đơn sau chốt sổ: in_production | shipped | delivered, hoặc sự kiện 'redelivery' (giao lại, trạng thái giữ nguyên).
 * Giao hàng ghi thông báo cho khách (đang giao, đã giao kèm ảnh, giao lại).
 */
export function applyOrderStatus(db, { orderId, status, photoUrl = null, note = '' }, now) {
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return err('ORDER_NOT_FOUND');
  const nowIso = now.toISOString();

  if (status === 'redelivery') {
    if (!['shipped', 'delivered'].includes(order.status) && order.status !== 'in_production') return err('NOT_LOCKED');
    order.redeliveryRequestedAt = nowIso;
    notify(db, {
      customerId: order.customerId,
      type: 'delivery_status',
      title: 'MOVA sẽ giao lại đơn của bạn',
      body: note || 'Lần giao trước chưa thành công. MOVA sẽ giao lại trong cùng ngày, bạn nhớ có người nhận nhé.',
      at: nowIso,
      meta: { orderId: order.id, weekIndex: order.weekIndex, status: 'redelivery', photoUrl: null }
    });
    return { ok: true, order };
  }

  const to = FULFILMENT_FLOW.indexOf(status);
  if (to < 1) return err('STATUS_INVALID');
  const from = FULFILMENT_FLOW.indexOf(order.status);
  if (from < 0) return err('NOT_LOCKED');
  if (to <= from) return err('STATUS_BACKWARD');

  order.status = status;
  order[`${status === 'in_production' ? 'inProduction' : status}At`] = nowIso;
  if (status === 'delivered' && photoUrl) order.deliveryPhotoUrl = photoUrl;

  if (status === 'shipped' || status === 'delivered') {
    const zone = getZone(order.zoneId);
    const slot = zone && findSlot(zone, order.slotId);
    notify(db, {
      customerId: order.customerId,
      type: 'delivery_status',
      title: status === 'shipped' ? 'Đơn của bạn đang trên đường giao' : 'MOVA đã giao hàng cho bạn',
      body:
        status === 'shipped'
          ? `Khung giờ ${slot ? slot.label : 'đã hẹn'}. Shipper sẽ gọi trước khi tới.`
          : 'Bạn bóc thùng và cho các túi vào ngăn mát hoặc ngăn đông theo màu sticker nhé. Bạn thấy món nào ngon, bấm đánh giá để bếp chỉnh vị.',
      at: nowIso,
      meta: { orderId: order.id, weekIndex: order.weekIndex, status, photoUrl: status === 'delivered' ? photoUrl : null }
    });
  }
  return { ok: true, order };
}

/**
 * Nhà máy thiếu hàng nên thay một món: đổi món trong đơn, cộng khoản bù vào Fresh Credit (ngăn khuyến mãi,
 * vì đây là thiện chí của MOVA chứ không phải tiền khách nạp) và báo khách.
 * Khoản bù mặc định = phần giá món bị thay mà khách đã trả vượt món mới (không âm).
 */
export function applySubstitution(db, { orderId, mealIndex, kind, toDishId, reason = '', compensationVnd = null }, now) {
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return err('ORDER_NOT_FOUND');
  if (['delivered', 'cancelled', 'postponed', 'skipped_unpaid'].includes(order.status)) return err('STATUS_INVALID', 'Đơn này không thay món được nữa');
  const i = order.meals.findIndex((m) => m.index === mealIndex);
  if (i < 0) return err('MEAL_NOT_FOUND', 'Không tìm thấy bữa ăn trong đơn');
  const meal = order.meals[i];
  const fromId = meal.dishes[kind];
  if (!fromId || !DISHES[toDishId] || DISHES[toDishId].kind !== kind) return err('DISH_NOT_ALLOWED', 'Món thay thế không hợp lệ');
  const next = { ...meal, dishes: { ...meal.dishes, [kind]: toDishId } };
  if (!swapOptionsFor(meal, kind, []).some((d) => d.id === toDishId)) return err('DISH_NOT_ALLOWED', 'Món thay thế không hợp lệ');

  const before = mealPriceVnd(meal, order.householdSize);
  const after = mealPriceVnd(next, order.householdSize);
  const comp = compensationVnd == null ? Math.max(0, before - after) : Math.max(0, Math.round(Number(compensationVnd) || 0));
  order.meals[i] = next;

  const customer = db.customers.find((c) => c.id === order.customerId);
  const nowIso = now.toISOString();
  if (customer && comp > 0) {
    customer.credit = { ...customer.credit, promo: customer.credit.promo + comp };
    db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, orderId: order.id, kind: 'compensation', amountVnd: comp, real: 0, promo: comp, at: nowIso });
  }
  notify(db, {
    customerId: order.customerId,
    type: 'substitution',
    title: 'MOVA đổi một món trong đơn của bạn',
    body:
      `${DISHES[fromId].name} đổi thành ${DISHES[toDishId].name}${reason ? ` (${reason})` : ''}.` +
      (comp > 0 ? ` MOVA bù ${fmt(comp)} vào Fresh Credit.` : ' Giá trị bữa ăn không đổi.'),
    at: nowIso,
    meta: { orderId: order.id, weekIndex: order.weekIndex, fromDishId: fromId, toDishId, compensationVnd: comp, reason }
  });
  return { ok: true, order, compensationVnd: comp };
}

/** Ghi hoặc cập nhật một lô nguyên liệu (nhãn QR). Khóa là qr_code. */
export function upsertLot(db, lot) {
  const errors = validateLot(lot);
  if (errors.length) return { ok: false, code: 'LOT_INVALID', message: errors.join('; ') };
  db.lots = db.lots || [];
  const clean = { ...lot, farm_info: { ...lot.farm_info }, sample: Boolean(lot.sample) };
  const i = db.lots.findIndex((l) => l.qr_code === clean.qr_code);
  if (i >= 0) db.lots[i] = clean;
  else db.lots.push(clean);
  return { ok: true, lot: clean, created: i < 0 };
}
