import { BUSINESS, getZone } from '../config/business';
import { atDay, addDays, dayKeySequence, dayKey, HOUR } from '../utils/time';

export const ACTIVE_ORDER_STATUSES = ['scheduled', 'paid', 'charge_failed', 'locked', 'in_production', 'shipped', 'delivered'];

export function findSlot(zone, slotId) {
  return zone.slots.find((s) => s.id === slotId) || null;
}

/** Thời điểm bắt đầu khung giao của một ngày. */
export function deliveryStartAt(dayKeyStr, slot) {
  return atDay(dayKeyStr, slot.startHour, slot.startMin);
}

export function chargeAtFor(dayKeyStr, slot, cfg = BUSINESS) {
  return new Date(deliveryStartAt(dayKeyStr, slot).getTime() - cfg.timings.chargeBeforeDeliveryHours * HOUR);
}

export function remindAtFor(dayKeyStr, slot, cfg = BUSINESS) {
  return new Date(deliveryStartAt(dayKeyStr, slot).getTime() - cfg.timings.remindBeforeDeliveryHours * HOUR);
}

/** Giờ chốt sổ của một ngày giao (khóa đổi món, gom BOM, tạo PO). */
export function cutoffAtFor(dayKeyStr, cfg = BUSINESS) {
  const t = cfg.timings;
  return atDay(addDays(dayKeyStr, -t.cutoffDaysBeforeDelivery), t.cutoffHour, t.cutoffMinute);
}

/** Các ngày giao KẾ TIẾP của một khu mà giờ chốt sổ còn ở tương lai. */
export function upcomingDeliveryDays(zoneId, now, count = 4, cfg = BUSINESS) {
  const zone = getZone(zoneId);
  if (!zone) throw new Error(`Khu giao không tồn tại: ${zoneId}`);
  const start = dayKey(now);
  const all = dayKeySequence(zone.deliveryDays, start, count + 8);
  return all.filter((k) => cutoffAtFor(k, cfg).getTime() > now.getTime()).slice(0, count);
}

export const capacityKey = (zoneId, day, slotId) => `${zoneId}|${day}|${slotId}`;

/**
 * Sức chứa (thùng) của một khung giờ. P2C: điều phối có thể ghi đè trong `db.logistics.capacity` theo (khu, ngày, khung)
 * hoặc theo (khu, '*', khung) cho mọi ngày; không có thì lấy số trong cấu hình (`BUSINESS.zones`).
 */
export function slotCapacity(overrides, zoneId, day, slot) {
  const o = overrides || {};
  const exact = o[capacityKey(zoneId, day, slot.id)];
  if (Number.isFinite(exact)) return exact;
  const any = o[capacityKey(zoneId, '*', slot.id)];
  if (Number.isFinite(any)) return any;
  return slot.capacityBoxes;
}

/** Số thùng đã đặt cho một khu / ngày / khung. */
export function slotUsage(orders, zoneId, dayKeyStr, slotId) {
  return orders.filter(
    (o) =>
      o.zoneId === zoneId &&
      o.deliveryDay === dayKeyStr &&
      o.slotId === slotId &&
      ACTIVE_ORDER_STATUSES.includes(o.status)
  ).length;
}

/** Các khung giao còn chỗ của một khu trong vài ngày tới. */
export function availableSlots(orders, zoneId, now, daysCount = 4, cfg = BUSINESS, overrides = null) {
  const zone = getZone(zoneId);
  const out = [];
  for (const day of upcomingDeliveryDays(zoneId, now, daysCount, cfg)) {
    for (const slot of zone.slots) {
      const used = slotUsage(orders, zoneId, day, slot.id);
      const remaining = slotCapacity(overrides, zoneId, day, slot) - used;
      if (remaining > 0) {
        out.push({
          day,
          slotId: slot.id,
          label: slot.label,
          remaining,
          cutoffAt: cutoffAtFor(day, cfg).toISOString(),
          chargeAt: chargeAtFor(day, slot, cfg).toISOString()
        });
      }
    }
  }
  return out;
}
