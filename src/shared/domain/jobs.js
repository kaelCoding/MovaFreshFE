import { BUSINESS, getZone } from '../config/business';
import { DISHES } from '../data/catalog';
import { spendCredit } from './credit';
import { aggregateBom } from './bom';
import { draftPurchaseOrders } from './purchasing';
import { cutoffAtFor, findSlot, remindAtFor } from './delivery';
import { fmtDeadline } from '../utils/time';

export function nextId(db, prefix) {
  db.seq[prefix] = (db.seq[prefix] || 0) + 1;
  return `${prefix}-${String(db.seq[prefix]).padStart(5, '0')}`;
}

export function notify(db, { customerId, type, title, body, at }) {
  db.notifications.push({ id: nextId(db, 'NTF'), customerId, type, title, body, createdAt: at, read: false });
}

function markPaid(db, order, nowIso, used, kind) {
  order.status = 'paid';
  order.paidAt = nowIso;
  db.ledger.push({
    id: nextId(db, 'LED'),
    customerId: order.customerId,
    orderId: order.id,
    kind,
    amountVnd: order.amountVnd,
    real: used.real,
    promo: used.promo,
    at: nowIso
  });
}

function markFailed(db, order, nowIso, reason) {
  order.status = 'charge_failed';
  order.chargeFailedAt = nowIso;
  order.failReason = reason;
  if (!order.failNotified) {
    order.failNotified = true;
    notify(db, {
      customerId: order.customerId,
      type: 'payment_failed',
      title: 'Chưa trừ được tiền cho tuần giao tiếp theo',
      body: `${reason}. Bạn cập nhật trước ${fmtDeadline(cutoffAtFor(order.deliveryDay))} để giữ suất giao.`,
      at: nowIso
    });
  }
}

/** Trừ tiền một đơn. Trả true nếu thành công. */
export function chargeOrder(db, order, now, cfg = BUSINESS) {
  const customer = db.customers.find((c) => c.id === order.customerId);
  const nowIso = now.toISOString();

  if (order.paymentMethod === 'card') {
    if (customer.cardFailsNext) {
      markFailed(db, order, nowIso, 'Thẻ bị từ chối');
      return false;
    }
    markPaid(db, order, nowIso, { real: order.amountVnd, promo: 0 }, 'card_charge');
    return true;
  }

  if (order.paymentMethod === 'fresh_credit') {
    const r = spendCredit(customer.credit, order.amountVnd, cfg.credit.spendOrder);
    if (!r.ok) {
      markFailed(db, order, nowIso, 'Số dư Fresh Credit không đủ');
      return false;
    }
    customer.credit = r.balance;
    markPaid(db, order, nowIso, r.used, 'credit_spend');
    return true;
  }

  // bank_transfer_4w đã trả trọn gói từ lúc đăng ký, không có bước trừ tiền theo tuần.
  return order.status === 'paid';
}

/** Chốt sổ một ngày giao: khóa đơn, gom BOM, lập PO nháp. */
export function runCutoff(db, day, now, cfg = BUSINESS) {
  const nowIso = now.toISOString();
  const dayOrders = db.orders.filter((o) => o.deliveryDay === day);

  for (const o of dayOrders) {
    if (o.status === 'paid') {
      o.status = 'locked';
      o.lockedAt = nowIso;
    } else if (o.status === 'charge_failed' || o.status === 'scheduled') {
      // Tới giờ chốt vẫn chưa trả được thì tạm hoãn tuần này, không sản xuất.
      o.status = 'skipped_unpaid';
      notify(db, {
        customerId: o.customerId,
        type: 'week_skipped',
        title: 'Tuần giao này đã được tạm hoãn',
        body: 'Chưa trừ được tiền trước giờ chốt sổ nên MOVA chưa sản xuất đơn này. Ưu đãi của các tuần sau vẫn còn.',
        at: nowIso
      });
    }
  }

  const locked = dayOrders.filter((o) => o.status === 'locked');
  const bom = aggregateBom(locked, DISHES);
  const plan = {
    id: `PLAN-${day}`,
    day,
    closedAt: nowIso,
    orderIds: locked.map((o) => o.id),
    skippedOrderIds: dayOrders.filter((o) => o.status === 'skipped_unpaid').map((o) => o.id),
    bom,
    status: 'closed'
  };
  db.productionPlans.push(plan);
  db.purchaseOrders.push(...draftPurchaseOrders(bom, day, cfg));
  return plan;
}

/**
 * Chạy mọi job đã tới hạn tại thời điểm `now`. Mỗi mốc chạy đúng một lần:
 * - charge: mỗi đơn có cờ trạng thái nên chỉ chuyển 'scheduled' -> 'paid' | 'charge_failed' một lần;
 * - cutoff: mỗi ngày giao có khóa `cutoff:<day>` trong firedJobs;
 * - remind: mỗi đơn có cờ remindedAt.
 */
export function runDueJobs(db, now, cfg = BUSINESS) {
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const fired = [];

  // 1) Trừ tiền D-3 (72h trước giờ giao)
  for (const o of db.orders) {
    if (o.status === 'scheduled' && nowMs >= Date.parse(o.chargeAt)) {
      const ok = chargeOrder(db, o, now, cfg);
      fired.push({ job: 'charge', ref: o.id, ok });
    }
  }

  // 1b) Thử lại các đơn trừ lỗi cho tới giờ chốt sổ
  for (const o of db.orders) {
    if (o.status === 'charge_failed' && nowMs < Date.parse(o.cutoffAt)) {
      if (chargeOrder(db, o, now, cfg)) fired.push({ job: 'charge_retry', ref: o.id, ok: true });
    }
  }

  // 2) Chốt sổ D-2
  const days = [...new Set(db.orders.map((o) => o.deliveryDay))].sort();
  for (const day of days) {
    const key = `cutoff:${day}`;
    if (db.firedJobs[key]) continue;
    if (nowMs >= cutoffAtFor(day, cfg).getTime()) {
      runCutoff(db, day, now, cfg);
      db.firedJobs[key] = nowIso;
      fired.push({ job: 'cutoff', ref: day });
    }
  }

  // 3) Báo khách khung giờ giao trước 24h
  for (const o of db.orders) {
    if (o.remindedAt || !['paid', 'locked'].includes(o.status)) continue;
    const zone = getZone(o.zoneId);
    const slot = findSlot(zone, o.slotId);
    if (nowMs >= remindAtFor(o.deliveryDay, slot, cfg).getTime() && nowMs < Date.parse(o.deliveryAt)) {
      o.remindedAt = nowIso;
      notify(db, {
        customerId: o.customerId,
        type: 'delivery_reminder',
        title: 'Ngày mai MOVA giao hàng cho bạn',
        body: `Khung giờ ${slot.label}. Bạn nhớ có người nhận nhé.`,
        at: nowIso
      });
      fired.push({ job: 'remind', ref: o.id });
    }
  }

  return fired;
}
