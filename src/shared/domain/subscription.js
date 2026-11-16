import { BUSINESS, getZone } from '../config/business';
import { dayKey, dayKeySequence } from '../utils/time';
import { cutoffAtFor, chargeAtFor, deliveryStartAt, findSlot, slotCapacity, slotUsage } from './delivery';
import { generateMeals, mealsPriceVnd } from './mealPlan';
import { giftCardSchedule } from './pricing';
import { applyUpsells } from './upsells';
import { spendCredit } from './credit';
import { nextId } from './jobs';

/**
 * Dựng các đơn giao của một chu kỳ (thuần túy, chưa ghi vào db).
 * Mỗi lần giao là một đơn (một thùng). Gói `weeks` tuần x `dows.length` lần/tuần.
 * Thẻ quà tặng (voucher) áp vào thùng đầu tiên của mỗi tuần.
 * - upsells: câu trả lời giá trị của khách (đạm, ít tinh bột, bữa Tây) áp cho cả các tuần sau tuần 1.
 * - lockWeeklyPrice: giá các tuần sau bằng giá tuần 1 (đúng với giá khách đã thấy khi đăng ký), dù AI đổi món.
 * - startAfterDay / weekOffset: dựng chu kỳ GIA HẠN, chỉ lấy các ngày giao sau ngày đó, số tuần đánh tiếp từ weekOffset.
 */
export function planOrders({
  customer, subscriptionId, profile, zoneId, slotId, dows, weeks, mealsPerWeek,
  week1Meals = null, voucher = false, upsells = null, lockWeeklyPrice = false, startAfterDay = null, weekOffset = 0,
  paymentMethod, now, rand, cfg = BUSINESS
}) {
  const zone = getZone(zoneId);
  const slot = findSlot(zone, slotId);
  if (!slot) throw new Error(`Khung giờ không có ở khu ${zoneId}: ${slotId}`);
  const perWeek = dows.length;

  // Các ngày giao còn kịp chốt sổ, theo thứ tự thời gian
  const candidates = dayKeySequence(dows, startAfterDay && startAfterDay > dayKey(now) ? startAfterDay : dayKey(now), weeks * perWeek + 10).filter(
    (k) => cutoffAtFor(k, cfg).getTime() > now.getTime() && (!startAfterDay || k > startAfterDay)
  );
  const days = candidates.slice(0, weeks * perWeek);
  if (days.length < weeks * perWeek) throw new Error('Không đủ ngày giao cho chu kỳ');

  const drafts = [];
  const mealsByWeek = [];
  for (let w = 0; w < weeks; w++) {
    let meals;
    if (w === 0 && week1Meals) {
      meals = week1Meals;
    } else {
      meals = generateMeals({
        householdSize: profile.householdSize, goals: profile.goals, restrictions: profile.restrictions,
        mealsCount: mealsPerWeek, rand, westernCount: profile.westernCount || 0, weeklyBudgetVnd: profile.weeklyBudgetVnd || null
      });
      if (upsells) meals = applyUpsells(meals, upsells, { householdSize: profile.householdSize, restrictions: profile.restrictions, rand, cfg });
    }
    mealsByWeek.push(meals);
  }

  let listTotal = 0;
  days.forEach((day, i) => {
    const w = Math.floor(i / perWeek);
    const j = i % perWeek;
    const meals = mealsByWeek[w];
    const per = Math.ceil(meals.length / perWeek);
    const boxMeals = meals.slice(j * per, (j + 1) * per);
    const listPriceVnd = lockWeeklyPrice && w > 0 ? drafts[j].listPriceVnd : mealsPriceVnd(boxMeals, profile.householdSize);
    listTotal += listPriceVnd;
    drafts.push({
      subscriptionId,
      customerId: customer.id,
      householdSize: profile.householdSize,
      zoneId,
      slotId,
      deliveryDay: day,
      deliveryAt: deliveryStartAt(day, slot).toISOString(),
      chargeAt: chargeAtFor(day, slot, cfg).toISOString(),
      cutoffAt: cutoffAtFor(day, cfg).toISOString(),
      weekIndex: weekOffset + w,
      boxIndex: j,
      meals: boxMeals,
      listPriceVnd,
      discountVnd: 0,
      paymentMethod,
      status: 'scheduled',
      recipient: { name: customer.name, phone: customer.phone, address: customer.address }
    });
  });

  // Thẻ quà tặng theo tuần, tính theo quy mô gói và bị chặn ở trần
  if (voucher) {
    const schedule = giftCardSchedule(listTotal, cfg);
    for (const d of drafts) {
      if (d.boxIndex === 0) d.discountVnd = Math.min(schedule[d.weekIndex - weekOffset] || 0, d.listPriceVnd);
    }
  }
  for (const d of drafts) d.amountVnd = d.listPriceVnd - d.discountVnd;
  return { orders: drafts, listTotalVnd: listTotal };
}

/**
 * Kích hoạt đăng ký: ghi đơn vào db và thu tiền theo cách trả trước.
 * - bank_transfer_4w: trả trọn 4 tuần, mọi đơn 'paid' ngay.
 * - fresh_credit / card: thu ngay đơn tuần 1, các tuần sau 'scheduled' và bị trừ ở D-3.
 */
export function activateSubscription(db, { customer, subscription, orders, now, cfg = BUSINESS }) {
  const nowIso = now.toISOString();
  const created = orders.map((o) => ({ ...o, id: nextId(db, 'ORD') }));

  const payFromCredit = (order) => {
    const r = spendCredit(customer.credit, order.amountVnd, cfg.credit.spendOrder);
    if (!r.ok) return false;
    customer.credit = r.balance;
    order.status = 'paid';
    order.paidAt = nowIso;
    db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, orderId: order.id, kind: 'credit_spend', amountVnd: order.amountVnd, real: r.used.real, promo: r.used.promo, at: nowIso });
    return true;
  };

  let chargedNowVnd = 0;
  if (subscription.paymentMethod === 'bank_transfer_4w') {
    const total = created.reduce((s, o) => s + o.amountVnd, 0);
    for (const o of created) { o.status = 'paid'; o.paidAt = nowIso; }
    db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind: 'prepaid_cycle', amountVnd: total, real: total, promo: 0, ref: subscription.paymentRef || null, at: nowIso });
    chargedNowVnd = total;
  } else {
    for (const o of created.filter((x) => x.weekIndex === 0)) {
      if (subscription.paymentMethod === 'fresh_credit') {
        if (!payFromCredit(o)) return { ok: false, error: 'INSUFFICIENT_CREDIT' };
      } else {
        o.status = 'paid';
        o.paidAt = nowIso;
        db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, orderId: o.id, kind: 'card_charge', amountVnd: o.amountVnd, real: o.amountVnd, promo: 0, at: nowIso });
      }
      chargedNowVnd += o.amountVnd;
    }
  }

  db.orders.push(...created);
  return { ok: true, orders: created, chargedNowVnd };
}

/** Kiểm tra sức chứa trước khi tạo đơn: trả danh sách các điểm đã đầy. */
export function findFullSlots(db, drafts, cfg = BUSINESS) {
  const planned = {};
  const full = [];
  for (const d of drafts) {
    const zone = getZone(d.zoneId);
    const slot = findSlot(zone, d.slotId);
    const k = `${d.zoneId}|${d.deliveryDay}|${d.slotId}`;
    planned[k] = (planned[k] || 0) + 1;
    if (slotUsage(db.orders, d.zoneId, d.deliveryDay, d.slotId) + planned[k] > slotCapacity(db.logistics && db.logistics.capacity, d.zoneId, d.deliveryDay, slot)) {
      full.push({ day: d.deliveryDay, slotId: d.slotId });
    }
  }
  return full;
}

