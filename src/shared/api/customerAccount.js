import { BUSINESS, getZone } from '../config/business';
import { DISHES } from '../data/catalog';
import { SAMPLE_LOTS } from '../data/lots';
import { rng, hash, fmt } from '../utils/formatters';
import { dowOfKey, fmtDay, fmtDeadline } from '../utils/time';
import { findSlot } from '../domain/delivery';
import { mealPriceVnd, swapOptionsFor, applySwaps, westernCountFor } from '../domain/mealPlan';
import { planOrders, findFullSlots } from '../domain/subscription';
import { spendCredit, creditBack, topUp, emptyBalance, totalBalance } from '../domain/credit';
import { topUpBonus } from '../domain/pricing';
import { topupRefFor } from '../domain/financeBank';
import { nextId, notify, runDueJobs } from '../domain/jobs';
import { normalizeContact } from '../domain/leads';
import {
  isOpen, orderPhase, weekPhase, PHASE_LABEL, mealDishes, paidFromOf, planPostponement, buildCancelPlan,
  renewalState, creditAlert, suggestTopUp, creditHistory
} from '../domain/account';
import { referralCodeFor, profileCompleteness, canClaimShare, sharesInLastWeek, maskName } from '../domain/rewards';
import { lotView } from '../domain/trace';

const ok = (data) => ({ status: 'success', data });
const fail = (code, message, extra = {}) => ({ status: 'error', error: { code, message, ...extra } });
const sum = (a) => a.reduce((x, y) => x + y, 0);
const uniq = (a) => [...new Set(a)];
const col = (db, name) => (db[name] = db[name] || []);
const balanceOut = (b) => ({ real_vnd: b.real, promo_vnd: b.promo, total_vnd: totalBalance(b) });

const NOT_FOUND = () => fail('CUSTOMER_NOT_FOUND', 'Không tìm thấy tài khoản');

const THUMBS = ['up', 'down'];
const SALT = ['salty', 'ok', 'bland'];
const SPICE = ['low', 'ok', 'high'];
const MAX_MEMBERS = 8;
/** Phần ăn khách đổi được (trái cây tráng miệng do nhà máy chọn theo mùa). */
const SWAPPABLE_KINDS = ['protein', 'veg', 'soup', 'carb'];

/**
 * Các hàm của tài khoản khách (P1B): các tuần của tôi, đổi món theo hạn chốt sổ, tạm hoãn, dừng gói và hoàn tiền thật,
 * gia hạn có đồng ý, Fresh Credit, thông báo, đánh giá, thưởng, link mời, truy xuất QR.
 * Mọi thay đổi đi qua server.write; hình dạng trả về xem docs/contract-changes.md (mục 3c).
 */
export function createAccountApi(server, cfg = BUSINESS) {
  // ---------- Truy cập dữ liệu ----------
  const customerOf = (db, id) => db.customers.find((c) => c.id === id) || null;
  const subOf = (db, customerId) => {
    const subs = db.subscriptions.filter((s) => s.customerId === customerId);
    return subs.find((s) => s.status === 'active') || subs[subs.length - 1] || null;
  };
  const ordersOf = (db, sub) => (sub ? db.orders.filter((o) => o.subscriptionId === sub.id) : []);
  const profileOf = (db, customer, sub) =>
    (sub && db.profiles.find((p) => p.id === sub.profileId)) || db.profiles.find((p) => p.customerId === customer.id) || null;

  const planningProfile = (p) => ({
    householdSize: p.householdSize,
    goals: p.goals || [],
    restrictions: p.restrictions || [],
    westernCount: p.cuisine ? westernCountFor(p.cuisine, p.mealsPerWeek, cfg) : 0,
    weeklyBudgetVnd: p.weeklyBudgetVnd || null
  });

  function customerView(db, c) {
    const sub = subOf(db, c.id);
    const zone = getZone(c.zoneId);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address,
      district: c.district,
      zone_id: c.zoneId,
      zone_name: zone ? zone.name : '',
      members: (c.members || []).map((m) => ({ ...m })),
      referral_code: referralCodeFor(c.id),
      has_subscription: Boolean(sub),
      profile: profileCompleteness(c),
      profile_reward_claimed: Boolean(c.rewardsGranted && c.rewardsGranted.profile)
    };
  }

  function subscriptionView(db, sub, orders) {
    if (!sub) return null;
    const zone = getZone(sub.zoneId);
    const slot = zone && findSlot(zone, sub.slotId);
    return {
      id: sub.id,
      status: sub.status,
      weeks: sub.weeks,
      payment_method: sub.paymentMethod,
      deliveries_per_week: sub.deliveriesPerWeek,
      zone_id: sub.zoneId,
      zone_name: zone ? zone.name : '',
      slot_label: slot ? slot.label : '',
      skips_used: sub.skipsUsed || 0,
      skips_max: cfg.subscription.maxSkipWeeksPerCycle,
      created_at: sub.createdAt,
      cancelled_at: sub.cancelledAt || null,
      first_delivery_date: orders.length ? orders.map((o) => o.deliveryDay).sort()[0] : null
    };
  }

  // ---------- Dựng các tuần ----------
  function skipRule(sub, weekOrders, now) {
    const live = weekOrders.filter((o) => !['postponed', 'cancelled', 'skipped_unpaid'].includes(o.status));
    if (!sub || sub.status !== 'active') return { allowed: false, code: 'SUB_INACTIVE', reason: 'Gói đã dừng' };
    if (!live.length) return { allowed: false, code: 'ALREADY_POSTPONED', reason: 'Tuần này đã tạm hoãn' };
    if ((sub.skipsUsed || 0) >= cfg.subscription.maxSkipWeeksPerCycle) {
      return { allowed: false, code: 'SKIP_LIMIT', reason: `Mỗi chu kỳ tạm hoãn tối đa ${cfg.subscription.maxSkipWeeksPerCycle} tuần và bạn đã dùng hết lượt` };
    }
    const closed = live.find((o) => !isOpen(o, now));
    if (closed) {
      return { allowed: false, code: 'CUTOFF_PASSED', reason: `Đã qua giờ chốt sổ ${fmtDeadline(new Date(closed.cutoffAt))}, tuần này không tạm hoãn được nữa` };
    }
    return { allowed: true, code: null, reason: '' };
  }

  function weekView(sub, weekIndex, weekOrders, now) {
    const sorted = [...weekOrders].sort((a, b) => a.boxIndex - b.boxIndex);
    const phase = weekPhase(sorted, now);
    const live = sorted.filter((o) => !['postponed', 'cancelled', 'skipped_unpaid'].includes(o.status));
    const open = sorted.filter((o) => isOpen(o, now));
    const zone = getZone(sorted[0].zoneId);
    const slot = zone && findSlot(zone, sorted[0].slotId);
    const deadlineOrder = (open.length ? open : sorted).reduce((a, b) => (Date.parse(a.cutoffAt) <= Date.parse(b.cutoffAt) ? a : b));

    const paid = live.filter((o) => ['paid', 'locked', 'in_production', 'shipped', 'delivered'].includes(o.status));
    const scheduled = live.filter((o) => o.status === 'scheduled');
    const failed = live.filter((o) => o.status === 'charge_failed');
    let charge;
    if (!live.length) charge = { state: 'none', at: null, amount_vnd: 0, reason: '' };
    else if (failed.length) {
      charge = { state: 'failed', at: failed[0].chargeFailedAt || failed[0].chargeAt, amount_vnd: sum(failed.map((o) => o.amountVnd)), reason: failed[0].failReason || 'Chưa trừ được tiền' };
    } else if (scheduled.length) {
      charge = { state: 'scheduled', at: scheduled.reduce((a, b) => (Date.parse(a.chargeAt) <= Date.parse(b.chargeAt) ? a : b)).chargeAt, amount_vnd: sum(scheduled.map((o) => o.amountVnd)), reason: '' };
    } else {
      const bank = paid.every((o) => o.paymentMethod === 'bank_transfer_4w');
      charge = { state: bank ? 'prepaid' : 'paid', at: paid.reduce((a, b) => (Date.parse(a.paidAt) >= Date.parse(b.paidAt) ? a : b)).paidAt, amount_vnd: sum(paid.map((o) => o.amountVnd)), reason: '' };
    }

    const meals = [];
    for (const o of sorted) {
      for (const m of o.meals) {
        meals.push({
          order_id: o.id,
          box_index: o.boxIndex,
          meal_index: m.index,
          western: Boolean(m.western),
          dishes: mealDishes(m),
          price_vnd: mealPriceVnd(m, o.householdSize),
          editable: isOpen(o, now)
        });
      }
    }
    const rule = skipRule(sub, sorted, now);
    const postponedTo = sorted.find((o) => o.postponedToWeek != null);
    return {
      week_index: weekIndex,
      number: weekIndex + 1,
      status: phase,
      status_label: PHASE_LABEL[phase],
      editable: open.length > 0,
      deadline_at: deadlineOrder.cutoffAt,
      deadline_label: fmtDeadline(new Date(deadlineOrder.cutoffAt)),
      boxes: sorted.map((o) => ({
        order_id: o.id,
        box_index: o.boxIndex,
        status: o.status,
        phase: orderPhase(o, now),
        phase_label: PHASE_LABEL[orderPhase(o, now)],
        delivery_date: o.deliveryDay,
        delivery_label: fmtDay(o.deliveryDay),
        delivery_at: o.deliveryAt,
        slot_label: slot ? slot.label : '',
        editable: isOpen(o, now),
        deadline_at: o.cutoffAt,
        deadline_label: fmtDeadline(new Date(o.cutoffAt)),
        photo_url: o.deliveryPhotoUrl || null,
        // P2C: vấn đề giao hàng do vận hành ghi (chưa giao được, giao lại khung sau, giữ lạnh, đã bù Fresh Credit)
        delivery_issue: o.deliveryIssue ? { kind: o.deliveryIssue.kind, label: o.deliveryIssue.label, detail: o.deliveryIssue.detail, at: o.deliveryIssue.at } : null,
        redelivery: o.redelivery ? { day: o.redelivery.day, label: fmtDay(o.redelivery.day), slot_label: (findSlot(getZone(o.zoneId), o.redelivery.slotId) || {}).label || '' } : null
      })),
      meals,
      list_vnd: sum(live.map((o) => o.listPriceVnd)),
      discount_vnd: sum(live.map((o) => o.discountVnd)),
      amount_vnd: sum(live.map((o) => o.amountVnd)),
      charge,
      postponed_to_week: postponedTo ? postponedTo.postponedToWeek : null,
      moved_from_week: sorted[0].movedFromWeek != null ? sorted[0].movedFromWeek : null,
      skip: { allowed: rule.allowed, code: rule.code, reason: rule.reason }
    };
  }

  function weeksOf(sub, orders, now) {
    const byWeek = new Map();
    for (const o of orders) {
      if (!byWeek.has(o.weekIndex)) byWeek.set(o.weekIndex, []);
      byWeek.get(o.weekIndex).push(o);
    }
    return [...byWeek.entries()]
      .map(([idx, list]) => weekView(sub, idx, list, now))
      .sort((a, b) => a.boxes[0].delivery_date.localeCompare(b.boxes[0].delivery_date) || a.week_index - b.week_index);
  }

  function alertOut(a, cust) {
    if (!a) return null;
    const need = suggestTopUp(a.shortfall_vnd, cfg);
    return {
      ...a,
      charge_label: fmtDeadline(new Date(a.charge_at)),
      suggested_topup: need ? { pay_vnd: need.payVnd, bonus_vnd: need.bonusVnd, credit_received_vnd: need.creditReceivedVnd } : null,
      customer_id: cust.id
    };
  }

  // ---------- Đổi món ----------
  function computeChange(db, now, req) {
    const customer = customerOf(db, req.customer_id);
    if (!customer) return { error: NOT_FOUND() };
    const sub = subOf(db, customer.id);
    const orders = ordersOf(db, sub);
    const order = orders.find((o) => o.weekIndex === req.week_index && o.meals.some((m) => m.index === req.meal_index));
    if (!order) return { error: fail('MEAL_NOT_FOUND', 'Không tìm thấy bữa ăn này') };
    if (!isOpen(order, now)) {
      return { error: fail('CUTOFF_PASSED', `Đã qua giờ chốt sổ ${fmtDeadline(new Date(order.cutoffAt))}, tuần này không đổi món được nữa`) };
    }
    const mi = order.meals.findIndex((m) => m.index === req.meal_index);
    const meal = order.meals[mi];
    const profile = profileOf(db, customer, sub);
    const restrictions = (profile && profile.restrictions) || [];
    if (!meal.dishes[req.kind]) return { error: fail('MEAL_NOT_FOUND', 'Bữa này không có phần ăn đó') };
    if (meal.dishes[req.kind] === req.dish_id) return { error: fail('NO_CHANGE', 'Đây là món đang chọn') };
    if (!swapOptionsFor(meal, req.kind, restrictions).some((d) => d.id === req.dish_id)) {
      return { error: fail('DISH_NOT_ALLOWED', 'Món này không đổi được cho bữa này') };
    }
    const next = applySwaps([meal], { [meal.index]: { [req.kind]: req.dish_id } }, restrictions)[0];
    if (next.dishes[req.kind] !== req.dish_id) return { error: fail('DISH_NOT_ALLOWED', 'Phần này không đổi món được') };
    const size = order.householdSize;
    const priceDelta = mealPriceVnd(next, size) - mealPriceVnd(meal, size);
    const newList = order.listPriceVnd + priceDelta;
    const newAmount = Math.max(0, newList - order.discountVnd);
    const delta = newAmount - order.amountVnd;
    const balance = totalBalance(customer.credit);

    let settle;
    if (order.status === 'paid' && delta !== 0) {
      const mode = delta > 0 ? 'charge' : 'refund';
      settle = { mode, amount_vnd: Math.abs(delta), balance_before_vnd: balance, balance_after_vnd: balance - delta, enough: mode === 'refund' || balance >= delta, short_vnd: Math.max(0, delta - balance) };
    } else {
      settle = { mode: 'none', amount_vnd: 0, balance_before_vnd: balance, balance_after_vnd: balance, enough: true, short_vnd: 0 };
    }
    return {
      customer, sub, order, mi, meal, next, newList, newAmount, delta, settle,
      out: {
        week_index: req.week_index,
        meal_index: req.meal_index,
        kind: req.kind,
        from: mealDishes({ dishes: { [req.kind]: meal.dishes[req.kind] } })[0],
        to: mealDishes({ dishes: { [req.kind]: next.dishes[req.kind] } })[0],
        carb_reset: req.kind !== 'carb' && next.dishes.carb !== meal.dishes.carb ? mealDishes({ dishes: { carb: next.dishes.carb } })[0] : null,
        order_status: order.status,
        paid: order.status === 'paid',
        old_amount_vnd: order.amountVnd,
        new_amount_vnd: newAmount,
        delta_vnd: delta,
        deadline_at: order.cutoffAt,
        deadline_label: fmtDeadline(new Date(order.cutoffAt)),
        charge_at: order.chargeAt,
        charge_label: fmtDeadline(new Date(order.chargeAt)),
        settle
      }
    };
  }

  // ---------- Đồng ý gia hạn ----------
  function renewalDrafts(db, now, customer, sub, orders) {
    const live = orders.filter((o) => ['scheduled', 'paid', 'charge_failed', 'locked', 'in_production', 'shipped', 'delivered'].includes(o.status));
    if (!live.length) return { error: fail('NOTHING_TO_RENEW', 'Không có chu kỳ nào để gia hạn') };
    const lastWeek = Math.max(...live.map((o) => o.weekIndex));
    const lastBoxes = live.filter((o) => o.weekIndex === lastWeek).sort((a, b) => a.boxIndex - b.boxIndex);
    const dows = lastBoxes.map((o) => dowOfKey(o.deliveryDay));
    const lastDay = live.reduce((m, o) => (o.deliveryDay > m ? o.deliveryDay : m), '0000-00-00');
    const weekOffset = Math.max(...orders.map((o) => o.weekIndex)) + 1;
    const profile = profileOf(db, customer, sub);
    if (!profile) return { error: fail('PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ ăn uống') };
    const method = sub.paymentMethod === 'bank_transfer_4w' ? 'fresh_credit' : sub.paymentMethod;
    const weeks = cfg.subscription.defaultWeeks;
    let planned;
    try {
      planned = planOrders({
        customer, subscriptionId: sub.id, profile: planningProfile(profile), zoneId: sub.zoneId, slotId: sub.slotId, dows,
        weeks, mealsPerWeek: profile.mealsPerWeek, startAfterDay: lastDay, weekOffset, paymentMethod: method, now,
        rand: rng(hash(`${sub.id}-renew-${weekOffset}`)), cfg
      });
    } catch {
      return { error: fail('NO_DELIVERY_DAYS', 'Chưa dựng được lịch giao cho chu kỳ mới') };
    }
    return { drafts: planned.orders, totalVnd: planned.listTotalVnd, method, weekOffset };
  }

  // ---------- API ----------
  return {
    /** Chạy các job đã tới hạn (trừ tiền, chốt sổ, nhắc, báo trước mốc trừ). Giao diện gọi khi mở trang và định kỳ. */
    tick() {
      return server.tick().length;
    },

    // ----- Tài khoản và đăng nhập demo -----
    findCustomer(customerId) {
      return server.read((db) => {
        const c = customerOf(db, customerId);
        return c ? ok(customerView(db, c)) : NOT_FOUND();
      });
    },

    /** Đăng nhập demo bằng SĐT hoặc email đã dùng khi đăng ký (không mật khẩu). */
    findCustomerByContact(text) {
      const contact = normalizeContact(text);
      if (!contact) return fail('INVALID_CONTACT', 'Hãy nhập số điện thoại hoặc email hợp lệ');
      return server.read((db) => {
        const c = db.customers.find((x) => (contact.type === 'phone' ? x.phone === contact.value : (x.email || '').toLowerCase() === contact.value));
        return c ? ok({ customer_id: c.id, name: c.name }) : fail('CUSTOMER_NOT_FOUND', 'Chưa có tài khoản dùng số này. Bạn đăng ký gói ở trang Thiết kế thực đơn nhé.');
      });
    },

    /** Vài tài khoản mẫu có sẵn trong dữ liệu hạt giống để xem thử các trạng thái khác nhau. */
    sampleAccounts() {
      return server.read((db) => {
        const picks = [];
        const used = new Set();
        const tag = (c, sub, hint) => {
          if (!c || used.has(c.id)) return;
          used.add(c.id);
          picks.push({ customer_id: c.id, name: c.name, phone: c.phone, hint, payment_method: sub.paymentMethod });
        };
        const subs = db.subscriptions.filter((s) => s.status === 'active');
        const unpaid = (c) => sum(db.orders.filter((o) => o.customerId === c.id && o.status === 'scheduled').map((o) => o.amountVnd));
        const cust = (s) => customerOf(db, s.customerId);
        const credit = subs.filter((s) => s.paymentMethod === 'fresh_credit');
        const low = credit.find((s) => totalBalance(cust(s).credit) < unpaid(cust(s)));
        const enough = credit.find((s) => totalBalance(cust(s).credit) >= unpaid(cust(s)));
        const card = subs.find((s) => s.paymentMethod === 'card' && s.customerId !== 'C-0012');
        const bank2 = subs.find((s) => s.paymentMethod === 'bank_transfer_4w' && s.deliveriesPerWeek === 2);
        if (low) tag(cust(low), low, 'Fresh Credit gần hết, sẽ thấy cảnh báo nạp thêm');
        if (enough) tag(cust(enough), enough, 'Trả bằng Fresh Credit, số dư đủ cho cả gói');
        if (card) tag(cust(card), card, 'Thẻ tự trừ trước giờ giao 72 tiếng');
        if (bank2) tag(cust(bank2), bank2, 'Chuyển khoản trọn gói, giao 2 lần mỗi tuần');
        return picks;
      });
    },

    /** Tổng quan nhẹ cho đầu trang và chuông thông báo. */
    getAccount(customerId) {
      return server.read((db, now) => {
        const customer = customerOf(db, customerId);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customerId);
        const orders = ordersOf(db, sub);
        const ren = sub ? renewalState(sub, orders, cfg) : null;
        return ok({
          customer: customerView(db, customer),
          subscription: subscriptionView(db, sub, orders),
          credit: balanceOut(customer.credit),
          alert: alertOut(creditAlert(customer, orders, now), customer),
          unread_notifications: db.notifications.filter((n) => n.customerId === customerId && !n.read).length,
          renewal: ren ? { due: ren.due, remaining_weeks: ren.remainingWeeks } : null
        });
      });
    },

    /** Các tuần của tôi: thực đơn, trạng thái, hạn đổi món, số tiền và thời điểm trừ, ưu đãi. */
    myWeeks(customerId) {
      return server.read((db, now) => {
        const customer = customerOf(db, customerId);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customerId);
        if (!sub) return ok({ subscription: null, weeks: [], renewal: null, now: now.toISOString() });
        const orders = ordersOf(db, sub);
        const ren = renewalState(sub, orders, cfg);
        return ok({
          subscription: subscriptionView(db, sub, orders),
          weeks: weeksOf(sub, orders, now),
          renewal: { due: ren.due, remaining_weeks: ren.remainingWeeks, weeks: cfg.subscription.defaultWeeks },
          now: now.toISOString()
        });
      });
    },

    /** Các món đổi được cho một phần của một bữa, kèm chênh lệch giá cho cả hộ. */
    mealOptions(req = {}) {
      return server.read((db, now) => {
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customer.id);
        const order = ordersOf(db, sub).find((o) => o.weekIndex === req.week_index && o.meals.some((m) => m.index === req.meal_index));
        if (!order) return fail('MEAL_NOT_FOUND', 'Không tìm thấy bữa ăn này');
        const meal = order.meals.find((m) => m.index === req.meal_index);
        if (!meal.dishes[req.kind]) return fail('MEAL_NOT_FOUND', 'Bữa này không có phần ăn đó');
        if (!SWAPPABLE_KINDS.includes(req.kind)) return fail('DISH_NOT_ALLOWED', 'Phần này không đổi món được');
        const profile = profileOf(db, customer, sub);
        const restrictions = (profile && profile.restrictions) || [];
        const size = order.householdSize;
        const current = mealPriceVnd(meal, size);
        const options = swapOptionsFor(meal, req.kind, restrictions).map((d) => {
          const alt = applySwaps([meal], { [meal.index]: { [req.kind]: d.id } }, restrictions)[0];
          return {
            dish_id: d.id,
            name: d.name,
            sauce_name: mealDishes({ dishes: { [req.kind]: d.id } })[0].sauce_name,
            prep_time_minutes: d.prepMinutes,
            price_delta_vnd: mealPriceVnd(alt, size) - current,
            current: d.id === meal.dishes[req.kind]
          };
        });
        return ok({ editable: isOpen(order, now), deadline_label: fmtDeadline(new Date(order.cutoffAt)), options });
      });
    },

    /** Xem trước một lần đổi món: chênh lệch và cách cộng/trừ Fresh Credit (nếu tuần đã bị trừ tiền). Không ghi gì. */
    previewMealChange(req = {}) {
      return server.read((db, now) => {
        const r = computeChange(db, now, req);
        return r.error || ok(r.out);
      });
    },

    /** Đổi món. Tuần đã trừ tiền thì phần chênh lệch cộng/trừ vào Fresh Credit; không đủ số dư thì không đổi. */
    changeMeal(req = {}) {
      return server.write((db, now) => {
        const r = computeChange(db, now, req);
        if (r.error) return r.error;
        const { customer, order, mi, next, newList, newAmount, delta, settle } = r;
        const nowIso = now.toISOString();
        if (settle.mode === 'charge' && !settle.enough) {
          return fail('INSUFFICIENT_CREDIT', `Fresh Credit còn thiếu ${fmt(settle.short_vnd)} để trả phần chênh lệch`, { short_vnd: settle.short_vnd, required_vnd: settle.amount_vnd });
        }
        if (settle.mode === 'charge') {
          const used = spendCredit(customer.credit, delta, cfg.credit.spendOrder);
          customer.credit = used.balance;
          const pf = paidFromOf(db, order);
          order.paidFrom = { real: pf.real + used.used.real, promo: pf.promo + used.used.promo };
          db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, orderId: order.id, kind: 'swap_charge', amountVnd: delta, real: used.used.real, promo: used.used.promo, at: nowIso });
        } else if (settle.mode === 'refund') {
          const pf = paidFromOf(db, order);
          const back = creditBack(customer.credit, -delta, pf, cfg.credit.spendOrder);
          customer.credit = back.balance;
          order.paidFrom = { real: Math.max(0, pf.real - back.back.real), promo: Math.max(0, pf.promo - back.back.promo) };
          db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, orderId: order.id, kind: 'swap_refund', amountVnd: -delta, real: back.back.real, promo: back.back.promo, at: nowIso });
        }
        order.meals[mi] = next;
        order.listPriceVnd = newList;
        order.amountVnd = newAmount;
        order.updatedAt = nowIso;
        return ok({ ...r.out, balance: balanceOut(customer.credit) });
      });
    },

    // ----- Tạm hoãn -----
    previewSkip(req = {}) {
      return server.read((db, now) => {
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customer.id);
        const orders = ordersOf(db, sub);
        const weekOrders = orders.filter((o) => o.weekIndex === req.week_index);
        if (!weekOrders.length) return fail('WEEK_NOT_FOUND', 'Không tìm thấy tuần này');
        const rule = skipRule(sub, weekOrders, now);
        if (!rule.allowed) return fail(rule.code, rule.reason);
        const plan = planPostponement(db, weekOrders, orders, now, cfg);
        if (!plan.ok) return fail('SLOT_FULL', 'Khung giờ ở tuần cuối đã đầy, MOVA chưa dời được. Bạn thử lại sau nhé.');
        return ok({
          week_index: req.week_index,
          new_week_index: plan.newWeekIndex,
          new_deliveries: plan.clones.map((c) => ({ delivery_date: c.deliveryDay, delivery_label: fmtDay(c.deliveryDay), cutoff_label: fmtDeadline(new Date(c.cutoffAt)), charge_label: fmtDeadline(new Date(c.chargeAt)) })),
          keeps_discount_vnd: sum(weekOrders.map((o) => o.discountVnd)),
          skips_left: cfg.subscription.maxSkipWeeksPerCycle - (sub.skipsUsed || 0) - 1
        });
      });
    },

    /** Tạm hoãn 1 tuần: tuần này dời xuống cuối chu kỳ, giữ thực đơn, giá và ưu đãi. */
    skipWeek(req = {}) {
      return server.write((db, now) => {
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customer.id);
        const orders = ordersOf(db, sub);
        const weekOrders = orders.filter((o) => o.weekIndex === req.week_index);
        if (!weekOrders.length) return fail('WEEK_NOT_FOUND', 'Không tìm thấy tuần này');
        const rule = skipRule(sub, weekOrders, now);
        if (!rule.allowed) return fail(rule.code, rule.reason);
        const plan = planPostponement(db, weekOrders, orders, now, cfg);
        if (!plan.ok) return fail('SLOT_FULL', 'Khung giờ ở tuần cuối đã đầy, MOVA chưa dời được. Bạn thử lại sau nhé.');
        const nowIso = now.toISOString();

        const created = plan.clones.map((c) => {
          const src = db.orders.find((o) => o.id === c.movedFromOrderId);
          const clone = { ...c, id: nextId(db, 'ORD'), meals: JSON.parse(JSON.stringify(src.meals)) };
          if (src.status === 'paid') clone.paidFrom = paidFromOf(db, src);
          else clone.status = 'scheduled';
          delete clone.chargeFailedAt;
          delete clone.failReason;
          delete clone.failNotified;
          return clone;
        });
        for (const o of weekOrders) {
          o.status = 'postponed';
          o.postponedAt = nowIso;
          o.postponedToWeek = plan.newWeekIndex;
        }
        db.orders.push(...created);
        sub.skipsUsed = (sub.skipsUsed || 0) + 1;
        notify(db, {
          customerId: customer.id,
          type: 'week_postponed',
          title: `Đã tạm hoãn tuần ${req.week_index + 1}`,
          body: `Thực đơn tuần này dời sang tuần ${plan.newWeekIndex + 1}, giao ${created.map((c) => fmtDay(c.deliveryDay)).join(' và ')}. Ưu đãi của tuần được giữ nguyên.`,
          at: nowIso,
          meta: { weekIndex: req.week_index, newWeekIndex: plan.newWeekIndex }
        });
        return ok({
          week_index: req.week_index,
          new_week_index: plan.newWeekIndex,
          new_deliveries: created.map((c) => ({ delivery_date: c.deliveryDay, delivery_label: fmtDay(c.deliveryDay) })),
          skips_left: cfg.subscription.maxSkipWeeksPerCycle - sub.skipsUsed
        });
      });
    },

    // ----- Dừng gói -----
    /** Xem trước khi dừng gói: ưu đãi sẽ mất và số tiền hoàn (chỉ phần Fresh Credit tiền thật). Không ghi gì. */
    previewCancel(customerId) {
      return server.read((db, now) => {
        const customer = customerOf(db, customerId);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customerId);
        if (!sub || sub.status !== 'active') return fail('SUB_INACTIVE', 'Bạn chưa có gói đang chạy');
        const orders = ordersOf(db, sub);
        const plan = buildCancelPlan(db, customer, orders, now, cfg);
        const skipWeek = weeksOf(sub, orders, now).find((w) => w.skip.allowed);
        const mealsPerWeek = sub.mealsPerWeek || 5;
        return ok({
          weeks_cancelled: plan.weeksCancelled,
          undelivered_meals: plan.weeksCancelled * mealsPerWeek,
          refund_vnd: plan.refundVnd,
          reversed_vnd: plan.reversedVnd,
          forfeited_promo_vnd: plan.forfeitedPromoVnd,
          gift_lost_vnd: plan.giftLostVnd,
          lost_incentives_vnd: plan.lostIncentivesVnd,
          balance_before: balanceOut(customer.credit),
          kept_orders: plan.keptOrders.length,
          refund_days_commitment: 7,
          skip_instead: skipWeek ? { week_index: skipWeek.week_index, number: skipWeek.number, deadline_label: skipWeek.deadline_label } : null
        });
      });
    },

    /** Dừng gói. Chỉ hoàn phần Fresh Credit tiền thật; khuyến mãi bị thu hồi. Cần confirm: true. */
    cancelSubscription(req = {}) {
      return server.write((db, now) => {
        if (req.confirm !== true) return fail('CONFIRM_REQUIRED', 'Cần xác nhận dừng gói');
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customer.id);
        if (!sub || sub.status !== 'active') return fail('SUB_INACTIVE', 'Bạn chưa có gói đang chạy');
        const orders = ordersOf(db, sub);
        const plan = buildCancelPlan(db, customer, orders, now, cfg);
        const nowIso = now.toISOString();

        let balance = { ...customer.credit };
        for (const r of plan.reversals) {
          balance = { real: balance.real + r.back.real, promo: balance.promo + r.back.promo };
          db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, orderId: r.order.id, kind: 'order_refund', amountVnd: r.amountVnd, real: r.back.real, promo: r.back.promo, at: nowIso });
        }
        for (const o of plan.openOrders) {
          o.status = 'cancelled';
          o.cancelledAt = nowIso;
        }
        if (plan.refundVnd > 0) db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind: 'cancel_refund', amountVnd: plan.refundVnd, real: plan.refundVnd, promo: 0, at: nowIso });
        if (plan.forfeitedPromoVnd > 0) db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind: 'promo_forfeit', amountVnd: plan.forfeitedPromoVnd, real: 0, promo: plan.forfeitedPromoVnd, at: nowIso });
        customer.credit = emptyBalance();
        sub.status = 'cancelled';
        sub.cancelledAt = nowIso;
        sub.refundedVnd = plan.refundVnd;
        notify(db, {
          customerId: customer.id,
          type: 'plan_cancelled',
          title: 'MOVA đã dừng gói của bạn',
          body: plan.refundVnd > 0 ? `MOVA hoàn ${fmt(plan.refundVnd)} (phần Fresh Credit tiền thật chưa dùng) về cách bạn đã trả.` : 'Không còn Fresh Credit tiền thật chưa dùng để hoàn.',
          at: nowIso,
          meta: { refundVnd: plan.refundVnd, forfeitedPromoVnd: plan.forfeitedPromoVnd }
        });
        return ok({ refund_vnd: plan.refundVnd, forfeited_promo_vnd: plan.forfeitedPromoVnd, gift_lost_vnd: plan.giftLostVnd, weeks_cancelled: plan.weeksCancelled, kept_orders: plan.keptOrders.length, refund_days_commitment: 7 });
      });
    },

    /** Hủy liên kết thẻ / ví đối tác (1 chạm bảo vệ người tiêu dùng - Luật BVQLNTD). */
    unlinkCard(req = {}) {
      return server.write((db, now) => {
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customer.id);
        if (!sub) return fail('SUB_INACTIVE', 'Bạn chưa có gói đang chạy');
        sub.paymentMethod = 'fresh_credit';
        sub.cardUnlinkedAt = now.toISOString();
        const orders = ordersOf(db, sub);
        for (const o of orders) {
          if (o.status === 'scheduled' && o.paymentMethod === 'card') {
            o.paymentMethod = 'fresh_credit';
          }
        }
        notify(db, {
          customerId: customer.id,
          type: 'card_unlinked',
          title: 'Đã hủy liên kết thẻ/ví đối tác',
          body: 'Bạn đã hủy liên kết thẻ/ví thành công. MOVA sẽ không tự động trừ tiền các tuần tiếp theo.',
          at: now.toISOString()
        });
        return ok({ unlinked: true });
      });
    },

    // ----- Gia hạn (cần khách đồng ý rõ ràng) -----
    renewalOffer(customerId) {
      return server.read((db, now) => {
        const customer = customerOf(db, customerId);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customerId);
        if (!sub || sub.status !== 'active') return fail('SUB_INACTIVE', 'Bạn chưa có gói đang chạy');
        const orders = ordersOf(db, sub);
        const st = renewalState(sub, orders, cfg);
        const d = renewalDrafts(db, now, customer, sub, orders);
        if (d.error) return d.error;
        const byWeek = new Map();
        for (const o of d.drafts) {
          const w = byWeek.get(o.weekIndex) || { week_index: o.weekIndex, number: o.weekIndex + 1, amount_vnd: 0, delivery_date: o.deliveryDay, delivery_label: fmtDay(o.deliveryDay), charge_label: fmtDeadline(new Date(o.chargeAt)), deadline_label: fmtDeadline(new Date(o.cutoffAt)) };
          w.amount_vnd += o.amountVnd;
          byWeek.set(o.weekIndex, w);
        }
        return ok({
          due: st.due,
          remaining_weeks: st.remainingWeeks,
          weeks: [...byWeek.values()],
          total_vnd: sum(d.drafts.map((o) => o.amountVnd)),
          payment_method: d.method,
          switched_from_bank: sub.paymentMethod === 'bank_transfer_4w',
          needs_credit: d.method === 'fresh_credit',
          balance: balanceOut(customer.credit)
        });
      });
    },

    /** Gia hạn thêm một chu kỳ. KHÔNG tự gia hạn: cần consent: true từ khách. */
    renewSubscription(req = {}) {
      return server.write((db, now) => {
        if (req.consent !== true) return fail('CONSENT_REQUIRED', 'Cần bạn đồng ý rõ ràng trước khi gia hạn');
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customer.id);
        if (!sub || sub.status !== 'active') return fail('SUB_INACTIVE', 'Bạn chưa có gói đang chạy');
        const orders = ordersOf(db, sub);
        if (!renewalState(sub, orders, cfg).due) return fail('NOT_DUE', 'Gói còn nhiều tuần chưa giao, chưa cần gia hạn');
        const d = renewalDrafts(db, now, customer, sub, orders);
        if (d.error) return d.error;
        if (findFullSlots(db, d.drafts, cfg).length) return fail('SLOT_FULL', 'Khung giờ giao của bạn đã đầy ở chu kỳ mới. MOVA sẽ liên hệ để xếp lại.');
        const created = d.drafts.map((o) => ({ ...o, id: nextId(db, 'ORD') }));
        db.orders.push(...created);
        sub.weeks += cfg.subscription.defaultWeeks;
        sub.skipsUsed = 0;
        sub.renewals = [...(sub.renewals || []), { at: now.toISOString(), consent: true, weeks: cfg.subscription.defaultWeeks, paymentMethod: d.method }];
        notify(db, {
          customerId: customer.id,
          type: 'plan_renewed',
          title: `Đã gia hạn thêm ${cfg.subscription.defaultWeeks} tuần`,
          body: `Giao từ ${fmtDay(created[0].deliveryDay)}. MOVA trừ tiền từng tuần trước giờ giao ${cfg.timings.chargeBeforeDeliveryHours} tiếng.`,
          at: now.toISOString(),
          meta: { weeks: cfg.subscription.defaultWeeks }
        });
        return ok({ weeks_added: cfg.subscription.defaultWeeks, first_delivery_date: created[0].deliveryDay, payment_method: d.method, total_vnd: sum(created.map((o) => o.amountVnd)) });
      });
    },

    // ----- Fresh Credit -----
    creditSummary(customerId) {
      return server.read((db, now) => {
        const customer = customerOf(db, customerId);
        if (!customer) return NOT_FOUND();
        const sub = subOf(db, customerId);
        const orders = ordersOf(db, sub);
        return ok({
          balance: balanceOut(customer.credit),
          alert: alertOut(creditAlert(customer, orders, now), customer),
          history: creditHistory(db, customerId),
          packs: cfg.incentives.topUpPacks.map((p) => {
            const bonus = topUpBonus(p.payVnd, p.bonusPct);
            return { pack_id: p.id, label: p.label, pay_vnd: p.payVnd, bonus_vnd: bonus, credit_received_vnd: p.payVnd + bonus, bonus_pct: p.bonusPct };
          }),
          min_topup_vnd: cfg.incentives.minTopUpVnd,
          bonus_pct: cfg.incentives.topUpPacks[0].bonusPct
        });
      });
    },

    /** Nạp thêm Fresh Credit (mô phỏng: tiền đã về). Thưởng nạp thường xuyên vào ngăn khuyến mãi. */
    topUpCredit(req = {}) {
      return server.write((db, now) => {
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const pack = req.pack_id ? cfg.incentives.topUpPacks.find((p) => p.id === req.pack_id) : null;
        const pay = pack ? pack.payVnd : Math.round(Number(req.pay_vnd) || 0);
        if (!(pay >= cfg.incentives.minTopUpVnd) || pay > 50000000) {
          return fail('INVALID_AMOUNT', `Số tiền nạp từ ${fmt(cfg.incentives.minTopUpVnd)} đến ${fmt(50000000)}`);
        }
        const pct = pack ? pack.bonusPct : cfg.incentives.topUpPacks[0].bonusPct;
        const bonus = topUpBonus(pay, pct);
        const nowIso = now.toISOString();
        const ref = topupRefFor(customer.id);
        customer.credit = topUp(customer.credit, pay, bonus);
        db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind: 'topup', amountVnd: pay, real: pay, promo: 0, ref, at: nowIso });
        if (bonus > 0) db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind: 'topup_bonus', amountVnd: bonus, real: 0, promo: bonus, ref, at: nowIso });
        // Có tuần đang chờ trừ lại mà trước đó thiếu tiền thì trừ luôn
        const retried = runDueJobs(db, now, cfg).filter((j) => j.job === 'charge_retry' && j.ok).length;
        return ok({ pay_vnd: pay, bonus_vnd: bonus, credit_received_vnd: pay + bonus, ref, balance: balanceOut(customer.credit), weeks_charged: retried });
      });
    },

    // ----- Thông báo -----
    notifications(customerId) {
      return server.read((db) =>
        db.notifications
          .filter((n) => n.customerId === customerId)
          .slice()
          .reverse()
          .map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, created_at: n.createdAt, read: n.read, meta: n.meta || null }))
      );
    },

    markNotificationsRead(customerId) {
      return server.write((db) => {
        let n = 0;
        for (const x of db.notifications) if (x.customerId === customerId && !x.read) { x.read = true; n += 1; }
        return n;
      });
    },

    // ----- Đánh giá món / xốt -----
    /** Các lần giao gần nhất (đã giao) và đánh giá hiện có của từng món. */
    pendingRatings(customerId) {
      return server.read((db) => {
        const customer = customerOf(db, customerId);
        if (!customer) return NOT_FOUND();
        const ratings = col(db, 'ratings').filter((r) => r.customerId === customerId);
        const delivered = db.orders
          .filter((o) => o.customerId === customerId && o.status === 'delivered')
          .sort((a, b) => (b.deliveredAt || b.deliveryAt).localeCompare(a.deliveredAt || a.deliveryAt))
          .slice(0, 2);
        return ok(
          delivered.map((o) => {
            const ids = uniq(o.meals.flatMap((m) => Object.values(m.dishes)));
            const dishes = ids.map((id) => {
              const d = DISHES[id];
              const r = ratings.find((x) => x.orderId === o.id && x.dishId === id);
              return {
                dish_id: id,
                name: d.name,
                kind: d.kind,
                sauce_code: d.sauce,
                sauce_name: mealDishes({ dishes: { [d.kind]: id } })[0].sauce_name,
                rating: r ? { thumb: r.thumb || null, sauce_salt: r.sauceSalt || null, spice: r.spice || null } : null
              };
            });
            return { order_id: o.id, week_index: o.weekIndex, delivered_at: o.deliveredAt || o.deliveryAt, delivery_label: fmtDay(o.deliveryDay), dishes };
          })
        );
      });
    },

    /** Đánh giá một món: 1 chạm thích / không thích, kèm vị xốt và độ cay. Lưu kèm mã xốt. Gọi nhiều lần thì gộp. */
    rateDish(req = {}) {
      return server.write((db, now) => {
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const order = db.orders.find((o) => o.id === req.order_id && o.customerId === customer.id);
        if (!order || order.status !== 'delivered') return fail('ORDER_NOT_DELIVERED', 'Chỉ đánh giá được món của đơn đã giao');
        if (!order.meals.some((m) => Object.values(m.dishes).includes(req.dish_id))) return fail('DISH_NOT_IN_ORDER', 'Món này không có trong đơn');
        if (req.thumb != null && !THUMBS.includes(req.thumb)) return fail('RATING_INVALID', 'Đánh giá không hợp lệ');
        if (req.sauce_salt != null && !SALT.includes(req.sauce_salt)) return fail('RATING_INVALID', 'Đánh giá vị xốt không hợp lệ');
        if (req.spice != null && !SPICE.includes(req.spice)) return fail('RATING_INVALID', 'Đánh giá độ cay không hợp lệ');
        const list = col(db, 'ratings');
        let r = list.find((x) => x.customerId === customer.id && x.orderId === order.id && x.dishId === req.dish_id);
        if (!r) {
          r = { id: nextId(db, 'RAT'), customerId: customer.id, orderId: order.id, dishId: req.dish_id, sauceCode: DISHES[req.dish_id].sauce, thumb: null, sauceSalt: null, spice: null, createdAt: now.toISOString() };
          list.push(r);
        }
        if (req.thumb !== undefined) r.thumb = req.thumb;
        if (req.sauce_salt !== undefined) r.sauceSalt = req.sauce_salt;
        if (req.spice !== undefined) r.spice = req.spice;
        r.updatedAt = now.toISOString();
        return ok({ order_id: r.orderId, dish_id: r.dishId, sauce_code: r.sauceCode, thumb: r.thumb, sauce_salt: r.sauceSalt, spice: r.spice });
      });
    },

    // ----- Thưởng và link mời -----
    rewards(customerId) {
      return server.read((db, now) => {
        const customer = customerOf(db, customerId);
        if (!customer) return NOT_FOUND();
        const rw = cfg.incentives.rewards;
        const shares = col(db, 'shares').filter((s) => s.customerId === customerId);
        const invited = col(db, 'referrals')
          .filter((r) => r.referrerId === customerId)
          .map((r) => ({ id: r.id, name: maskName((customerOf(db, r.refereeId) || {}).name), reward_vnd: r.referrerRewardVnd, at: r.at }));
        const completeness = profileCompleteness(customer);
        return ok({
          referral_code: referralCodeFor(customerId),
          invite_path: `/plans?ref=${referralCodeFor(customerId)}`,
          rewards: {
            profile: { reward_vnd: rw.profileComplete, claimed: Boolean(customer.rewardsGranted && customer.rewardsGranted.profile), progress: { done: completeness.done, total: completeness.total, missing: completeness.missing } },
            share: { reward_vnd: rw.share, used_this_week: sharesInLastWeek(shares, customerId, now), max_per_week: cfg.incentives.maxShareRewardsPerWeek, total_shares: shares.length },
            referral: { referrer_vnd: rw.referrer, referee_vnd: rw.referee, invited, total_vnd: sum(invited.map((i) => i.reward_vnd)) }
          },
          promo_balance_vnd: customer.credit.promo
        });
      });
    },

    /** Lưu hồ sơ thành viên. Đủ hồ sơ lần đầu thì cộng thưởng vào ngăn khuyến mãi. */
    saveProfile(req = {}) {
      return server.write((db, now) => {
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const name = String(req.name ?? customer.name).trim();
        const phoneRaw = String(req.phone ?? customer.phone).trim();
        const emailRaw = String(req.email ?? customer.email ?? '').trim();
        const phone = phoneRaw ? normalizeContact(phoneRaw) : null;
        if (phoneRaw && (!phone || phone.type !== 'phone')) return fail('INVALID_CONTACT', 'Số điện thoại chưa đúng');
        const email = emailRaw ? normalizeContact(emailRaw) : null;
        if (emailRaw && (!email || email.type !== 'email')) return fail('INVALID_CONTACT', 'Email chưa đúng');
        const members = (req.members ?? customer.members ?? [])
          .slice(0, MAX_MEMBERS)
          .map((m) => ({ name: String(m.name || '').trim(), relation: String(m.relation || '').trim(), note: String(m.note || '').trim() }))
          .filter((m) => m.name || m.note || m.relation);

        customer.name = name;
        customer.phone = phone ? phone.value : '';
        customer.email = email ? email.value : null;
        customer.address = String(req.address ?? customer.address).trim();
        customer.members = members;
        for (const o of db.orders) {
          if (o.customerId === customer.id && isOpen(o, now)) o.recipient = { name: customer.name, phone: customer.phone, address: customer.address };
        }

        let rewardVnd = 0;
        const completeness = profileCompleteness(customer);
        customer.rewardsGranted = customer.rewardsGranted || {};
        if (completeness.complete && !customer.rewardsGranted.profile) {
          rewardVnd = cfg.incentives.rewards.profileComplete;
          customer.rewardsGranted.profile = now.toISOString();
          customer.credit = { ...customer.credit, promo: customer.credit.promo + rewardVnd };
          db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind: 'reward_profile', amountVnd: rewardVnd, real: 0, promo: rewardVnd, at: now.toISOString() });
          notify(db, { customerId: customer.id, type: 'reward', title: 'Cảm ơn bạn đã hoàn thiện hồ sơ', body: `MOVA cộng ${fmt(rewardVnd)} vào Fresh Credit.`, at: now.toISOString(), meta: { kind: 'profile', amountVnd: rewardVnd } });
        }
        return ok({ customer: customerView(db, customer), reward_vnd: rewardVnd });
      });
    },

    /**
     * Chia sẻ thực đơn hoặc ảnh món đã nấu để nhận thưởng. kind: 'menu' | 'photo' | 'qr'; ref: mã tuần hoặc mã QR đã chia sẻ.
     * Mỗi (loại, mã) một lần và tối đa maxShareRewardsPerWeek lần mỗi tuần. Ảnh được duyệt tự động trong bản demo.
     */
    claimShare(req = {}) {
      return server.write((db, now) => {
        const customer = customerOf(db, req.customer_id);
        if (!customer) return NOT_FOUND();
        const kind = ['photo', 'qr'].includes(req.kind) ? req.kind : 'menu';
        const ref = String(req.ref || '').trim();
        if (!ref) return fail('REF_REQUIRED', 'Thiếu nội dung chia sẻ');
        const shares = col(db, 'shares');
        const check = canClaimShare(shares, { customerId: customer.id, kind, ref }, now, cfg);
        if (!check.ok) {
          return fail(check.code, check.code === 'ALREADY_CLAIMED' ? 'Bạn đã nhận thưởng cho nội dung này rồi' : `Tuần này bạn đã nhận thưởng chia sẻ ${cfg.incentives.maxShareRewardsPerWeek} lần`);
        }
        const amount = cfg.incentives.rewards.share;
        const nowIso = now.toISOString();
        shares.push({ id: nextId(db, 'SHR'), customerId: customer.id, kind, ref, photoName: req.photo_name || null, at: nowIso });
        customer.credit = { ...customer.credit, promo: customer.credit.promo + amount };
        db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind: 'reward_share', amountVnd: amount, real: 0, promo: amount, at: nowIso });
        return ok({ reward_vnd: amount, used_this_week: sharesInLastWeek(shares, customer.id, now), max_per_week: cfg.incentives.maxShareRewardsPerWeek, balance: balanceOut(customer.credit) });
      });
    },

    // ----- Truy xuất QR (không cần đăng nhập) -----
    traceLot(code) {
      const key = String(code || '').trim().toUpperCase();
      return server.read((db) => {
        // Lô do xưởng ghi (db.lots) ưu tiên; dữ liệu mẫu làm dự phòng cho bộ nhớ cũ chưa có db.lots.
        const lot = (db.lots || []).find((l) => l.qr_code.toUpperCase() === key) || SAMPLE_LOTS.find((l) => l.qr_code.toUpperCase() === key);
        return lot ? ok(lotView(lot, cfg)) : fail('LOT_NOT_FOUND', 'Không tìm thấy mã QR này');
      });
    },

    /** Mã QR mẫu (để hiện gợi ý trên trang truy xuất khi gõ sai mã). */
    sampleLotCodes() {
      return server.read((db) => ((db.lots && db.lots.length ? db.lots : SAMPLE_LOTS).map((l) => ({ qr_code: l.qr_code, product_name: l.product_name }))));
    }
  };
}
