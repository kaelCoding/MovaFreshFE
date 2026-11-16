import { BUSINESS, getZone } from '../config/business';
import { DISHES, SAUCES } from '../data/catalog';
import { dowOfKey, addDays, dayKeySequence } from '../utils/time';
import { totalBalance, creditBack, refundOnCancel } from './credit';
import { cutoffAtFor, chargeAtFor, deliveryStartAt, findSlot, slotUsage } from './delivery';
import { topUpBonus } from './pricing';

/** Đơn còn sửa được: chưa chốt sổ. Sau giờ chốt sổ là khóa, kể cả khi job chốt sổ chưa kịp chạy. */
export const OPEN_STATUSES = ['scheduled', 'paid', 'charge_failed'];
export const isOpen = (o, now) => OPEN_STATUSES.includes(o.status) && now.getTime() < Date.parse(o.cutoffAt);

const sum = (a) => a.reduce((x, y) => x + y, 0);
const uniq = (a) => [...new Set(a)];

// ---------- Trạng thái tuần ----------

export const PHASE_LABEL = {
  editable: 'Có thể đổi món',
  charged: 'Đã trừ tiền',
  charge_failed: 'Chưa trừ được tiền',
  locked: 'Đã khóa',
  in_production: 'Đang sản xuất',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  postponed: 'Tạm hoãn',
  cancelled: 'Đã dừng'
};

// Thứ tự tiến độ: tuần có nhiều thùng thì hiện thùng chậm nhất (sắp tới nhất).
const PHASE_RANK = { charge_failed: 0, editable: 1, charged: 2, locked: 3, in_production: 4, shipping: 5, delivered: 6 };

export function orderPhase(o, now) {
  switch (o.status) {
    case 'scheduled': return now.getTime() < Date.parse(o.cutoffAt) ? 'editable' : 'locked';
    case 'paid': return now.getTime() < Date.parse(o.cutoffAt) ? 'charged' : 'locked';
    case 'charge_failed': return 'charge_failed';
    case 'locked': return 'locked';
    case 'in_production': return 'in_production';
    case 'shipped': return 'shipping';
    case 'delivered': return 'delivered';
    case 'postponed':
    case 'skipped_unpaid': return 'postponed';
    case 'cancelled': return 'cancelled';
    default: return 'locked';
  }
}

export function weekPhase(orders, now) {
  const phases = orders.map((o) => orderPhase(o, now));
  const live = phases.filter((p) => p !== 'postponed' && p !== 'cancelled');
  if (!live.length) return phases.includes('cancelled') && !phases.includes('postponed') ? 'cancelled' : 'postponed';
  return live.reduce((a, b) => (PHASE_RANK[a] <= PHASE_RANK[b] ? a : b));
}

const DISH_ORDER = ['protein', 'veg', 'soup', 'carb', 'dessert'];

export function mealDishes(meal) {
  return DISH_ORDER.filter((k) => meal.dishes[k]).map((kind) => {
    const d = DISHES[meal.dishes[kind]];
    return { kind, dish_id: d.id, name: d.name, sauce_code: d.sauce, sauce_name: d.sauce ? SAUCES[d.sauce].name : null };
  });
}

/** Đơn đã trừ từ ngăn nào: dùng để hoàn đúng ngăn. */
export function paidFromOf(db, order) {
  if (order.paidFrom) return { ...order.paidFrom };
  const entries = db.ledger.filter((l) => l.orderId === order.id && ['credit_spend', 'card_charge'].includes(l.kind));
  if (entries.length) return { real: sum(entries.map((e) => e.real || 0)), promo: sum(entries.map((e) => e.promo || 0)) };
  return { real: order.amountVnd, promo: 0 };
}

// ---------- Tạm hoãn một tuần ----------

/**
 * Dời một tuần sang cuối chu kỳ. Tuần cũ giữ nguyên ngày để khách còn thấy "Tạm hoãn", tuần mới được dựng ở
 * sau ngày giao cuối cùng của gói, cùng thứ, cùng khung giờ, giữ nguyên thực đơn, giá và ưu đãi.
 * Trả { ok, clones[], error }. Không ghi vào db.
 */
export function planPostponement(db, weekOrders, subOrders, now, cfg = BUSINESS) {
  const liveAll = subOrders.filter((o) => !['postponed', 'cancelled', 'skipped_unpaid'].includes(o.status));
  const lastDay = liveAll.reduce((m, o) => (o.deliveryDay > m ? o.deliveryDay : m), '0000-00-00');
  const newWeekIndex = Math.max(...subOrders.map((o) => o.weekIndex)) + 1;
  const sorted = [...weekOrders].sort((a, b) => a.boxIndex - b.boxIndex);
  const zone = getZone(sorted[0].zoneId);
  const slot = findSlot(zone, sorted[0].slotId);
  const clones = [];
  let cursor = lastDay;
  for (const o of sorted) {
    // Mỗi thùng: ngày kế tiếp sau mốc hiện tại có cùng thứ trong tuần; hết chỗ thì thử tuần sau, tối đa 4 lần.
    const candidates = dayKeySequence([dowOfKey(o.deliveryDay)], addDays(cursor, 1), 4);
    const day = candidates.find((k) => {
      const planned = clones.filter((c) => c.deliveryDay === k && c.slotId === o.slotId).length;
      return slotUsage(db.orders, o.zoneId, k, o.slotId) + planned < slot.capacityBoxes;
    });
    if (!day) return { ok: false, error: 'SLOT_FULL' };
    cursor = day;
    clones.push({
      ...o,
      id: null,
      weekIndex: newWeekIndex,
      deliveryDay: day,
      deliveryAt: deliveryStartAt(day, slot).toISOString(),
      chargeAt: chargeAtFor(day, slot, cfg).toISOString(),
      cutoffAt: cutoffAtFor(day, cfg).toISOString(),
      movedFromOrderId: o.id,
      movedFromWeek: o.weekIndex,
      chargeNoticeAt: null,
      remindedAt: null
    });
  }
  return { ok: true, clones, newWeekIndex };
}

// ---------- Dừng gói ----------

/**
 * Tính trước việc dừng gói: các đơn chưa chốt sổ bị hủy, tiền các tuần đã trừ quay về Fresh Credit,
 * rồi CHỈ phần tiền thật được hoàn (refundOnCancel). Khuyến mãi còn lại và thẻ quà tặng của các tuần chưa giao mất.
 */
export function buildCancelPlan(db, customer, subOrders, now, cfg = BUSINESS) {
  const open = subOrders.filter((o) => isOpen(o, now));
  let balance = { ...customer.credit };
  const reversals = [];
  for (const o of open.filter((x) => x.status === 'paid')) {
    const r = creditBack(balance, o.amountVnd, paidFromOf(db, o), cfg.credit.spendOrder);
    balance = r.balance;
    reversals.push({ order: o, amountVnd: o.amountVnd, back: r.back });
  }
  const refund = refundOnCancel(balance);
  const giftLostVnd = sum(open.map((o) => o.discountVnd || 0));
  return {
    openOrders: open,
    reversals,
    reversedVnd: sum(reversals.map((r) => r.amountVnd)),
    refundVnd: refund.refundVnd,
    forfeitedPromoVnd: refund.forfeitedPromoVnd,
    giftLostVnd,
    lostIncentivesVnd: refund.forfeitedPromoVnd + giftLostVnd,
    weeksCancelled: uniq(open.map((o) => o.weekIndex)).length,
    keptOrders: subOrders.filter((o) => !isOpen(o, now) && ['locked', 'in_production', 'shipped', 'paid', 'scheduled', 'charge_failed'].includes(o.status))
  };
}

// ---------- Gia hạn ----------

const LIVE_STATUSES = ['scheduled', 'paid', 'charge_failed', 'locked', 'in_production', 'shipped'];

export function renewalState(sub, subOrders, cfg = BUSINESS) {
  const remaining = uniq(subOrders.filter((o) => LIVE_STATUSES.includes(o.status)).map((o) => o.weekIndex)).length;
  const due = sub.status === 'active' && remaining <= cfg.subscription.renewPromptAtRemainingWeeks;
  return { remainingWeeks: remaining, due };
}

// ---------- Fresh Credit ----------

/** Cảnh báo nếu số dư không đủ cho tuần kế tiếp chưa bị trừ (chỉ gói trả bằng Fresh Credit). */
export function creditAlert(customer, subOrders, now) {
  const pending = subOrders.filter(
    (o) => o.paymentMethod === 'fresh_credit' && ['scheduled', 'charge_failed'].includes(o.status) && now.getTime() < Date.parse(o.cutoffAt)
  );
  if (!pending.length) return null;
  const nextWeek = pending.reduce((a, b) => (Date.parse(a.chargeAt) <= Date.parse(b.chargeAt) ? a : b)).weekIndex;
  const weekOrders = pending.filter((o) => o.weekIndex === nextWeek);
  const amount = sum(weekOrders.map((o) => o.amountVnd));
  const balance = totalBalance(customer.credit);
  if (balance >= amount) return null;
  const chargeAt = weekOrders.reduce((a, b) => (Date.parse(a.chargeAt) <= Date.parse(b.chargeAt) ? a : b)).chargeAt;
  return {
    week_index: nextWeek,
    amount_vnd: amount,
    balance_vnd: balance,
    shortfall_vnd: amount - balance,
    charge_at: chargeAt,
    cutoff_at: weekOrders[0].cutoffAt,
    failed: weekOrders.some((o) => o.status === 'charge_failed')
  };
}

/** Mức nạp nhỏ nhất (bội của 10.000đ) để nhận đủ `needVnd` Fresh Credit, kể cả thưởng nạp. */
export function suggestTopUp(needVnd, cfg = BUSINESS) {
  const pct = cfg.incentives.topUpPacks[0].bonusPct;
  for (let pay = Math.max(cfg.incentives.minTopUpVnd, 10000); pay < 100000000; pay += 10000) {
    const bonus = topUpBonus(pay, pct);
    if (pay + bonus >= needVnd) return { payVnd: pay, bonusVnd: bonus, creditReceivedVnd: pay + bonus };
  }
  return null;
}

const HISTORY_KINDS = {
  topup: { label: 'Nạp Fresh Credit', sign: 1 },
  topup_bonus: { label: 'Thưởng nạp', sign: 1 },
  credit_spend: { label: 'Trừ tiền tuần giao', sign: -1 },
  swap_charge: { label: 'Chênh lệch đổi món (trừ thêm)', sign: -1 },
  swap_refund: { label: 'Chênh lệch đổi món (hoàn lại)', sign: 1 },
  order_refund: { label: 'Tuần bị dừng, tiền quay về Fresh Credit', sign: 1 },
  cancel_refund: { label: 'Hoàn tiền thật khi dừng gói', sign: -1 },
  promo_forfeit: { label: 'Khuyến mãi bị thu hồi khi dừng gói', sign: -1 },
  reward_profile: { label: 'Thưởng hoàn thiện hồ sơ', sign: 1 },
  reward_share: { label: 'Thưởng chia sẻ', sign: 1 },
  reward_referrer: { label: 'Thưởng mời bạn', sign: 1 },
  reward_referee: { label: 'Thưởng bạn mới đăng ký', sign: 1 },
  compensation: { label: 'MOVA bù khi đổi món do thiếu hàng', sign: 1 }
};

/** Lịch sử Fresh Credit của khách, mới nhất trước. Chỉ gồm các khoản làm đổi số dư Fresh Credit. */
export function creditHistory(db, customerId) {
  return db.ledger
    .filter((l) => l.customerId === customerId && HISTORY_KINDS[l.kind])
    .map((l) => {
      const k = HISTORY_KINDS[l.kind];
      const order = l.orderId ? db.orders.find((o) => o.id === l.orderId) : null;
      return {
        id: l.id,
        kind: l.kind,
        label: k.label + (order && ['credit_spend', 'swap_charge', 'swap_refund', 'compensation'].includes(l.kind) ? ` (tuần ${order.weekIndex + 1})` : ''),
        amount_vnd: k.sign * l.amountVnd,
        real_vnd: k.sign * (l.real || 0),
        promo_vnd: k.sign * (l.promo || 0),
        at: l.at
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
}
