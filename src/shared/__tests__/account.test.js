import { describe, it, expect } from 'vitest';
import { createServer } from '../mock-server/server';
import { createMemoryStorage } from '../mock-server/storage';
import { createApi, ForbiddenError } from '../api';
import { BUSINESS } from '../config/business';
import { DISHES } from '../data/catalog';
import { totalBalance, creditBack, spendCredit, refundOnCancel } from '../domain/credit';
import { referralCodeFor, customerIdFromReferralCode, profileCompleteness, canClaimShare } from '../domain/rewards';
import { weekPhase, suggestTopUp } from '../domain/account';
import { lotView, validateLot } from '../domain/trace';
import { SAMPLE_LOTS } from '../data/lots';

const START = '2026-11-20T09:00:00+07:00'; // Thứ Sáu
const admin = { role: 'admin' };

function setup() {
  const storage = createMemoryStorage();
  const server = createServer({ storage, startAt: START, running: false });
  return { server, storage, api: createApi(server) };
}

const orderOf = (server, id) => server.read((db) => db.orders.filter((o) => o.customerId === id));
const credit = (server, id) => server.read((db) => ({ ...db.customers.find((c) => c.id === id).credit }));

/** Khách trả bằng Fresh Credit, một lần giao mỗi tuần, đủ số dư cho cả gói (C-0001, persona P1). */
const CREDIT_OK = 'C-0001';
/** Khách Fresh Credit nạp vừa đủ tuần 1 nên các tuần sau thiếu tiền (C-0018). */
const CREDIT_LOW = 'C-0018';

function firstOpenMeal(week) {
  const m = week.meals.find((x) => x.editable);
  return m;
}

/** Tìm một món đạm đắt hơn món hiện tại trong lựa chọn đổi. */
function pricierOption(api, customerId, weekIndex, meal, kind = 'protein') {
  const res = api.customer.mealOptions({ customer_id: customerId, week_index: weekIndex, meal_index: meal.meal_index, kind });
  const opts = res.data.options.filter((o) => !o.current);
  return { dearer: opts.filter((o) => o.price_delta_vnd > 0).sort((a, b) => b.price_delta_vnd - a.price_delta_vnd)[0], cheaper: opts.filter((o) => o.price_delta_vnd < 0).sort((a, b) => a.price_delta_vnd - b.price_delta_vnd)[0] };
}

describe('Fresh Credit hai ngăn: hoàn lại', () => {
  it('creditBack trả ngược về các ngăn đã trừ, khuyến mãi trước (ngược thứ tự trừ)', () => {
    const spent = spendCredit({ real: 100, promo: 50 }, 120);
    expect(spent.used).toEqual({ real: 100, promo: 20 });
    const back = creditBack(spent.balance, 30, spent.used);
    expect(back.back).toEqual({ real: 10, promo: 20 });
    expect(back.balance).toEqual({ real: 10, promo: 50 });
  });

  it('refundOnCancel chỉ hoàn tiền thật', () => {
    expect(refundOnCancel({ real: 300000, promo: 80000 })).toMatchObject({ refundVnd: 300000, forfeitedPromoVnd: 80000 });
  });
});

describe('các tuần của tôi', () => {
  it('khách Fresh Credit thấy 4 tuần: thực đơn, trạng thái, hạn đổi món, số tiền và thời điểm trừ', () => {
    const { api } = setup();
    const res = api.customer.myWeeks(CREDIT_OK);
    expect(res.status).toBe('success');
    const { weeks, subscription } = res.data;
    expect(subscription.payment_method).toBe('fresh_credit');
    expect(weeks).toHaveLength(4);
    const w0 = weeks[0];
    expect(w0.status).toBe('charged');
    expect(w0.status_label).toBe('Đã trừ tiền');
    expect(w0.charge.state).toBe('paid');
    expect(w0.charge.amount_vnd).toBeGreaterThan(0);
    expect(w0.deadline_label).toMatch(/^\d{2}:\d{2} .+ \d{2}\/\d{2}$/); // ngày giờ cụ thể, không "8 tiếng"
    expect(w0.deadline_label).not.toMatch(/tiếng/);
    expect(w0.meals.length).toBeGreaterThanOrEqual(3);
    expect(w0.meals[0].dishes.length).toBeGreaterThanOrEqual(2);
    expect(weeks[1].status).toBe('editable');
    expect(weeks[1].charge.state).toBe('scheduled');
    expect(weeks[0].discount_vnd).toBeGreaterThan(0);
  });

  it('khách chưa có đơn vẫn lấy được tài khoản; mã khách sai thì lỗi', () => {
    const { api } = setup();
    expect(api.customer.myWeeks('C-9999').error.code).toBe('CUSTOMER_NOT_FOUND');
    expect(api.customer.findCustomerByContact('0987000111').error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('đăng nhập demo bằng SĐT đã đăng ký; có tài khoản mẫu để xem thử', () => {
    const { api, server } = setup();
    const phone = server.read((db) => db.customers.find((c) => c.id === CREDIT_OK).phone);
    expect(api.customer.findCustomerByContact(phone).data.customer_id).toBe(CREDIT_OK);
    const samples = api.customer.sampleAccounts();
    expect(samples.length).toBeGreaterThanOrEqual(3);
    expect(samples.some((s) => s.hint.includes('cảnh báo'))).toBe(true);
  });

  it('weekPhase lấy tiến độ chậm nhất khi tuần có nhiều thùng', () => {
    const now = new Date(START);
    const mk = (status) => ({ status, cutoffAt: '2026-12-30T00:00:00Z' });
    expect(weekPhase([mk('delivered'), mk('locked')], now)).toBe('locked');
    expect(weekPhase([mk('postponed'), mk('postponed')], now)).toBe('postponed');
  });
});

describe('đổi món trước hạn chốt sổ', () => {
  it('tuần đã trừ tiền: đổi sang món đắt hơn thì thấy chênh lệch trước, rồi trừ vào Fresh Credit', () => {
    const { api, server } = setup();
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[0];
    const meal = firstOpenMeal(w);
    const { dearer } = pricierOption(api, CREDIT_OK, 0, meal);
    expect(dearer).toBeTruthy();
    const req = { customer_id: CREDIT_OK, week_index: 0, meal_index: meal.meal_index, kind: 'protein', dish_id: dearer.dish_id };

    const before = totalBalance(credit(server, CREDIT_OK));
    const preview = api.customer.previewMealChange(req).data;
    expect(preview.paid).toBe(true);
    expect(preview.settle.mode).toBe('charge');
    expect(preview.settle.amount_vnd).toBe(preview.delta_vnd);
    expect(preview.delta_vnd).toBeGreaterThan(0);
    expect(preview.settle.balance_after_vnd).toBe(before - preview.delta_vnd);
    // Xem trước không ghi gì
    expect(totalBalance(credit(server, CREDIT_OK))).toBe(before);

    const done = api.customer.changeMeal(req);
    expect(done.status).toBe('success');
    expect(totalBalance(credit(server, CREDIT_OK))).toBe(before - preview.delta_vnd);
    const wk = api.customer.myWeeks(CREDIT_OK).data.weeks[0];
    expect(wk.amount_vnd).toBe(w.amount_vnd + preview.delta_vnd);
    expect(wk.meals.find((m) => m.meal_index === meal.meal_index).dishes[0].dish_id).toBe(dearer.dish_id);
    const hist = api.customer.creditSummary(CREDIT_OK).data.history;
    expect(hist[0]).toMatchObject({ kind: 'swap_charge', amount_vnd: -preview.delta_vnd });
  });

  it('đổi sang món rẻ hơn thì hoàn chênh lệch về Fresh Credit', () => {
    const { api, server } = setup();
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[0];
    const meal = firstOpenMeal(w);
    const { cheaper } = pricierOption(api, CREDIT_OK, 0, meal);
    expect(cheaper).toBeTruthy();
    const before = totalBalance(credit(server, CREDIT_OK));
    const res = api.customer.changeMeal({ customer_id: CREDIT_OK, week_index: 0, meal_index: meal.meal_index, kind: 'protein', dish_id: cheaper.dish_id });
    expect(res.data.settle.mode).toBe('refund');
    expect(totalBalance(credit(server, CREDIT_OK))).toBe(before - cheaper.price_delta_vnd);
  });

  it('tuần chưa trừ tiền: chỉ đổi số tiền sẽ trừ, không đụng Fresh Credit', () => {
    const { api, server } = setup();
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[1];
    const meal = firstOpenMeal(w);
    const { dearer } = pricierOption(api, CREDIT_OK, 1, meal);
    const before = totalBalance(credit(server, CREDIT_OK));
    const res = api.customer.changeMeal({ customer_id: CREDIT_OK, week_index: 1, meal_index: meal.meal_index, kind: 'protein', dish_id: dearer.dish_id });
    expect(res.data.settle.mode).toBe('none');
    expect(totalBalance(credit(server, CREDIT_OK))).toBe(before);
    expect(api.customer.myWeeks(CREDIT_OK).data.weeks[1].amount_vnd).toBeGreaterThan(w.amount_vnd);
  });

  it('không đủ Fresh Credit cho phần chênh lệch thì không đổi', () => {
    const { api, server } = setup();
    server.write((db) => {
      db.customers.find((c) => c.id === CREDIT_OK).credit = { real: 0, promo: 0 };
    });
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[0];
    const meal = firstOpenMeal(w);
    const { dearer } = pricierOption(api, CREDIT_OK, 0, meal);
    const res = api.customer.changeMeal({ customer_id: CREDIT_OK, week_index: 0, meal_index: meal.meal_index, kind: 'protein', dish_id: dearer.dish_id });
    expect(res.error.code).toBe('INSUFFICIENT_CREDIT');
    expect(res.error.short_vnd).toBeGreaterThan(0);
    expect(api.customer.myWeeks(CREDIT_OK).data.weeks[0].amount_vnd).toBe(w.amount_vnd);
  });

  it('sau giờ chốt sổ không đổi món được, thông báo kèm ngày giờ cụ thể', () => {
    const { api, server } = setup();
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[0];
    const meal = firstOpenMeal(w);
    const { dearer } = pricierOption(api, CREDIT_OK, 0, meal);
    server.setNow(new Date(w.deadline_at).getTime() + 60000);
    const res = api.customer.changeMeal({ customer_id: CREDIT_OK, week_index: 0, meal_index: meal.meal_index, kind: 'protein', dish_id: dearer.dish_id });
    expect(res.error.code).toBe('CUTOFF_PASSED');
    expect(res.error.message).toContain(w.deadline_label);
    expect(api.customer.myWeeks(CREDIT_OK).data.weeks[0].status).toBe('locked');
  });

  it('món không hợp lệ bị từ chối', () => {
    const { api } = setup();
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[1];
    const meal = firstOpenMeal(w);
    const res = api.customer.changeMeal({ customer_id: CREDIT_OK, week_index: 1, meal_index: meal.meal_index, kind: 'protein', dish_id: 'D-VEG-001' });
    expect(res.error.code).toBe('DISH_NOT_ALLOWED');
  });
});

describe('tạm hoãn một tuần', () => {
  it('tuần 2 bị tạm hoãn, thực đơn dời xuống cuối, giữ ưu đãi; hết lượt thì từ chối', () => {
    const { api, server } = setup();
    const before = api.customer.myWeeks(CREDIT_OK).data.weeks;
    const w2 = before[1];
    const preview = api.customer.previewSkip({ customer_id: CREDIT_OK, week_index: w2.week_index });
    expect(preview.status).toBe('success');
    expect(preview.data.new_week_index).toBe(4);

    const res = api.customer.skipWeek({ customer_id: CREDIT_OK, week_index: w2.week_index });
    expect(res.status).toBe('success');
    const after = api.customer.myWeeks(CREDIT_OK).data.weeks;
    expect(after).toHaveLength(5);
    const skipped = after.find((w) => w.week_index === w2.week_index);
    expect(skipped.status).toBe('postponed');
    expect(skipped.postponed_to_week).toBe(4);
    const moved = after.find((w) => w.week_index === 4);
    expect(moved.moved_from_week).toBe(w2.week_index);
    expect(moved.amount_vnd).toBe(w2.amount_vnd);
    expect(moved.discount_vnd).toBe(w2.discount_vnd);
    expect(moved.boxes[0].delivery_date > after[3].boxes[0].delivery_date).toBe(true);
    expect(moved.meals.map((m) => m.dishes[0].dish_id)).toEqual(w2.meals.map((m) => m.dishes[0].dish_id));
    // Tuần 3 và 4 giữ nguyên ngày
    expect(after.find((w) => w.week_index === 2).boxes[0].delivery_date).toBe(before[2].boxes[0].delivery_date);

    const again = api.customer.skipWeek({ customer_id: CREDIT_OK, week_index: before[2].week_index });
    expect(again.error.code).toBe('SKIP_LIMIT');
    // Tuần đã tạm hoãn không tính vào sức chứa
    const noted = server.read((db) => db.notifications.filter((n) => n.customerId === CREDIT_OK && n.type === 'week_postponed'));
    expect(noted).toHaveLength(1);
  });

  it('tuần đã trừ tiền khi tạm hoãn: tiền đi theo thực đơn sang tuần mới, không trừ lần hai', () => {
    const { api, server } = setup();
    const before = totalBalance(credit(server, CREDIT_OK));
    const res = api.customer.skipWeek({ customer_id: CREDIT_OK, week_index: 0 });
    expect(res.status).toBe('success');
    expect(totalBalance(credit(server, CREDIT_OK))).toBe(before);
    const moved = api.customer.myWeeks(CREDIT_OK).data.weeks.find((w) => w.week_index === 4);
    expect(moved.charge.state).toBe('paid');
  });

  it('sau giờ chốt sổ không tạm hoãn được', () => {
    const { api, server } = setup();
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[0];
    server.setNow(new Date(w.deadline_at).getTime() + 60000);
    expect(api.customer.skipWeek({ customer_id: CREDIT_OK, week_index: 0 }).error.code).toBe('CUTOFF_PASSED');
  });
});

describe('dừng gói và hoàn tiền thật', () => {
  it('xem trước: số ưu đãi sẽ mất và số tiền hoàn chỉ gồm phần tiền thật', () => {
    const { api, server } = setup();
    const c = credit(server, CREDIT_OK);
    const wk = api.customer.myWeeks(CREDIT_OK).data.weeks;
    const paidWeek = wk[0].amount_vnd;
    const p = api.customer.previewCancel(CREDIT_OK).data;
    // Tuần 1 đã trừ được quay về Fresh Credit, rồi chỉ phần tiền thật được hoàn
    expect(p.forfeited_promo_vnd + p.refund_vnd).toBe(totalBalance(c) + paidWeek);
    expect(p.refund_vnd).toBeGreaterThan(0);
    expect(p.gift_lost_vnd).toBe(wk.reduce((s, w) => s + w.discount_vnd, 0));
    expect(p.lost_incentives_vnd).toBe(p.forfeited_promo_vnd + p.gift_lost_vnd);
    expect(p.skip_instead).toBeTruthy();
    // Xem trước không ghi gì
    expect(credit(server, CREDIT_OK)).toEqual(c);
  });

  it('dừng gói: cần xác nhận, hoàn tiền thật, thu hồi khuyến mãi, hủy các tuần chưa chốt', () => {
    const { api, server } = setup();
    expect(api.customer.cancelSubscription({ customer_id: CREDIT_OK }).error.code).toBe('CONFIRM_REQUIRED');
    const preview = api.customer.previewCancel(CREDIT_OK).data;
    const res = api.customer.cancelSubscription({ customer_id: CREDIT_OK, confirm: true });
    expect(res.status).toBe('success');
    expect(res.data.refund_vnd).toBe(preview.refund_vnd);
    expect(res.data.forfeited_promo_vnd).toBe(preview.forfeited_promo_vnd);
    expect(credit(server, CREDIT_OK)).toEqual({ real: 0, promo: 0 });
    expect(orderOf(server, CREDIT_OK).every((o) => o.status === 'cancelled')).toBe(true);
    expect(api.customer.getAccount(CREDIT_OK).data.subscription.status).toBe('cancelled');
    const kinds = server.read((db) => db.ledger.filter((l) => l.customerId === CREDIT_OK).map((l) => l.kind));
    expect(kinds).toContain('cancel_refund');
    expect(kinds).toContain('promo_forfeit');
    expect(api.customer.previewCancel(CREDIT_OK).error.code).toBe('SUB_INACTIVE');
  });

  it('tuần đã chốt sổ giữ nguyên khi dừng gói', () => {
    const { api, server } = setup();
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[0];
    server.setNow(new Date(w.deadline_at).getTime() + 60000);
    const res = api.customer.cancelSubscription({ customer_id: CREDIT_OK, confirm: true });
    expect(res.status).toBe('success');
    const statuses = orderOf(server, CREDIT_OK).map((o) => o.status);
    expect(statuses).toContain('locked');
    expect(statuses).toContain('cancelled');
  });

  it('khách trả chuyển khoản trọn gói: tuần chưa chốt hoàn về tiền thật', () => {
    const { api, server } = setup();
    const bank = server.read((db) => db.subscriptions.find((s) => s.paymentMethod === 'bank_transfer_4w').customerId);
    const p = api.customer.previewCancel(bank).data;
    const open = orderOf(server, bank).reduce((s, o) => s + o.amountVnd, 0);
    expect(p.refund_vnd).toBe(open);
    expect(p.forfeited_promo_vnd).toBe(0);
  });
});

describe('gia hạn cần khách đồng ý', () => {
  function nearEnd(api, server) {
    // Qua 3 tuần giao: còn 1 tuần chưa giao thì app mời gia hạn
    const orders = orderOf(server, CREDIT_OK).sort((a, b) => a.weekIndex - b.weekIndex);
    server.write((db) => {
      for (const o of db.orders.filter((x) => x.customerId === CREDIT_OK && x.weekIndex < 3)) o.status = 'delivered';
    });
    return orders;
  }

  it('còn nhiều tuần thì chưa cần gia hạn; không có consent thì từ chối', () => {
    const { api } = setup();
    expect(api.customer.myWeeks(CREDIT_OK).data.renewal.due).toBe(false);
    expect(api.customer.renewSubscription({ customer_id: CREDIT_OK, consent: true }).error.code).toBe('NOT_DUE');
    expect(api.customer.renewSubscription({ customer_id: CREDIT_OK }).error.code).toBe('CONSENT_REQUIRED');
  });

  it('sắp hết gói: có đề nghị, chỉ gia hạn sau khi khách đồng ý, không tự gia hạn', () => {
    const { api, server } = setup();
    nearEnd(api, server);
    const my = api.customer.myWeeks(CREDIT_OK).data;
    expect(my.renewal.due).toBe(true);
    const offer = api.customer.renewalOffer(CREDIT_OK).data;
    expect(offer.weeks).toHaveLength(4);
    expect(offer.weeks[0].delivery_date > my.weeks[3].boxes[0].delivery_date).toBe(true);
    expect(orderOf(server, CREDIT_OK)).toHaveLength(4); // xem đề nghị không tạo đơn

    expect(api.customer.renewSubscription({ customer_id: CREDIT_OK, consent: false }).error.code).toBe('CONSENT_REQUIRED');
    expect(orderOf(server, CREDIT_OK)).toHaveLength(4);

    const res = api.customer.renewSubscription({ customer_id: CREDIT_OK, consent: true });
    expect(res.status).toBe('success');
    const orders = orderOf(server, CREDIT_OK);
    expect(orders).toHaveLength(8);
    expect(orders.filter((o) => o.weekIndex >= 4).every((o) => o.status === 'scheduled' && o.discountVnd === 0)).toBe(true);
    expect(api.customer.myWeeks(CREDIT_OK).data.renewal.due).toBe(false);
  });
});

describe('Fresh Credit: cảnh báo, nạp thêm, lịch sử', () => {
  it('số dư không đủ cho tuần kế thì có cảnh báo kèm gợi ý nạp', () => {
    const { api } = setup();
    const a = api.customer.creditSummary(CREDIT_LOW).data;
    expect(a.alert).toBeTruthy();
    expect(a.alert.shortfall_vnd).toBeGreaterThan(0);
    expect(a.alert.charge_label).toMatch(/^\d{2}:\d{2}/);
    expect(a.alert.suggested_topup.credit_received_vnd).toBeGreaterThanOrEqual(a.alert.shortfall_vnd);
    expect(api.customer.getAccount(CREDIT_LOW).data.alert).toBeTruthy();
    expect(api.customer.creditSummary(CREDIT_OK).data.alert).toBeNull();
  });

  it('nạp thêm: tiền thật vào ngăn thật, thưởng nạp 10% vào ngăn khuyến mãi, hết cảnh báo', () => {
    const { api, server } = setup();
    const before = credit(server, CREDIT_LOW);
    const need = api.customer.creditSummary(CREDIT_LOW).data.alert.suggested_topup;
    const res = api.customer.topUpCredit({ customer_id: CREDIT_LOW, pay_vnd: need.pay_vnd });
    expect(res.status).toBe('success');
    expect(res.data.bonus_vnd).toBeGreaterThan(0);
    const after = credit(server, CREDIT_LOW);
    expect(after.real).toBe(before.real + need.pay_vnd);
    expect(after.promo).toBe(before.promo + res.data.bonus_vnd);
    expect(api.customer.creditSummary(CREDIT_LOW).data.alert).toBeNull();
    expect(api.customer.creditSummary(CREDIT_LOW).data.history[0].kind).toBe('topup_bonus');
  });

  it('số tiền nạp ngoài khoảng cho phép bị từ chối', () => {
    const { api } = setup();
    expect(api.customer.topUpCredit({ customer_id: CREDIT_OK, pay_vnd: 5000 }).error.code).toBe('INVALID_AMOUNT');
    expect(api.customer.topUpCredit({ customer_id: CREDIT_OK, pack_id: 'standard' }).status).toBe('success');
  });

  it('suggestTopUp ra mức nhỏ nhất đủ nhận', () => {
    const s = suggestTopUp(500000);
    expect(s.creditReceivedVnd).toBeGreaterThanOrEqual(500000);
    expect(s.payVnd - 10000 + Math.round((s.payVnd - 10000) * 0.1)).toBeLessThan(500000);
  });
});

describe('thông báo', () => {
  it('trước mốc trừ tiền 24h: báo thực đơn tuần, số tiền, hạn đổi món; chạy đúng một lần', () => {
    const { api, server } = setup();
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[1];
    server.setNow(new Date(w.charge.at).getTime() - 20 * 3600 * 1000);
    const list = () => api.customer.notifications(CREDIT_OK).filter((n) => n.type === 'charge_upcoming');
    expect(list()).toHaveLength(1);
    expect(list()[0].title).toContain('Tuần 2');
    expect(list()[0].body).toContain('Đổi món trước');
    expect(list()[0].meta.amountVnd).toBe(w.amount_vnd);
    server.tick();
    expect(list()).toHaveLength(1);
  });

  it('Fresh Credit không đủ thì có thêm cảnh báo low_credit', () => {
    const { api, server } = setup();
    const w = api.customer.myWeeks(CREDIT_LOW).data.weeks[1];
    server.setNow(new Date(w.charge.at).getTime() - 20 * 3600 * 1000);
    expect(api.customer.notifications(CREDIT_LOW).some((n) => n.type === 'low_credit')).toBe(true);
    expect(api.customer.notifications(CREDIT_OK).some((n) => n.type === 'low_credit')).toBe(false);
  });

  it('đánh dấu đã đọc', () => {
    const { api, server } = setup();
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[1];
    server.setNow(new Date(w.charge.at).getTime() - 20 * 3600 * 1000);
    expect(api.customer.getAccount(CREDIT_OK).data.unread_notifications).toBeGreaterThan(0);
    api.customer.markNotificationsRead(CREDIT_OK);
    expect(api.customer.getAccount(CREDIT_OK).data.unread_notifications).toBe(0);
  });
});

describe('trạng thái giao từ app vận hành và thay món do thiếu hàng', () => {
  function lockedOrder(api, server) {
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[0];
    server.setNow(new Date(w.deadline_at).getTime() + 60000);
    return orderOf(server, CREDIT_OK).find((o) => o.weekIndex === 0);
  }

  it('đi tuần tự sản xuất, đang giao, đã giao kèm ảnh; khách nhận thông báo', () => {
    const { api, server } = setup();
    const o = lockedOrder(api, server);
    expect(o.status).toBe('locked');
    const shipper = { role: 'shipper' };
    expect(() => api.ops.setOrderStatus({ role: 'accounting' }, { orderId: o.id, status: 'shipped' })).toThrow(ForbiddenError);
    api.ops.setOrderStatus({ role: 'workshop' }, { orderId: o.id, status: 'in_production' });
    api.ops.setOrderStatus(shipper, { orderId: o.id, status: 'shipped' });
    api.ops.setOrderStatus(shipper, { orderId: o.id, status: 'delivered', photoUrl: 'data:image/svg+xml,x' });
    expect(() => api.ops.setOrderStatus(shipper, { orderId: o.id, status: 'shipped' })).toThrow(/lùi/);
    const notes = api.customer.notifications(CREDIT_OK).filter((n) => n.type === 'delivery_status');
    expect(notes.map((n) => n.meta.status).sort()).toEqual(['delivered', 'shipped']);
    expect(notes.find((n) => n.meta.status === 'delivered').meta.photoUrl).toContain('svg');
    expect(api.customer.myWeeks(CREDIT_OK).data.weeks[0].status).toBe('delivered');
  });

  it('giao lại ghi thông báo mà không đổi trạng thái', () => {
    const { api, server } = setup();
    const o = lockedOrder(api, server);
    api.ops.setOrderStatus({ role: 'hub' }, { orderId: o.id, status: 'in_production' });
    api.ops.setOrderStatus({ role: 'hub' }, { orderId: o.id, status: 'shipped' });
    api.ops.setOrderStatus({ role: 'shipper' }, { orderId: o.id, status: 'redelivery', note: 'Không có người nhận, giao lại lúc 20:00' });
    expect(server.read((db) => db.orders.find((x) => x.id === o.id).status)).toBe('shipped');
    expect(api.customer.notifications(CREDIT_OK).some((n) => n.meta && n.meta.status === 'redelivery')).toBe(true);
  });

  it('thay món do thiếu hàng: bù vào ngăn khuyến mãi và báo khách', () => {
    const { api, server } = setup();
    const o = orderOf(server, CREDIT_OK).find((x) => x.weekIndex === 1);
    const meal = o.meals.find((m) => DISHES[m.dishes.protein].pricePerPersonVnd > 20000);
    const cheap = Object.values(DISHES).find((d) => d.kind === 'protein' && !d.western && d.pricePerPersonVnd < DISHES[meal.dishes.protein].pricePerPersonVnd);
    const before = credit(server, CREDIT_OK);
    const res = api.ops.substituteDish({ role: 'workshop' }, { orderId: o.id, mealIndex: meal.index, kind: 'protein', toDishId: cheap.id, reason: 'nhà máy thiếu hàng' });
    expect(res.compensationVnd).toBeGreaterThan(0);
    expect(credit(server, CREDIT_OK).promo).toBe(before.promo + res.compensationVnd);
    const n = api.customer.notifications(CREDIT_OK).find((x) => x.type === 'substitution');
    expect(n.body).toContain(DISHES[cheap.id].name);
    expect(n.body).toContain('bù');
    expect(() => api.ops.substituteDish({ role: 'shipper' }, { orderId: o.id, mealIndex: meal.index, kind: 'protein', toDishId: cheap.id })).toThrow(ForbiddenError);
  });
});

describe('đánh giá món và xốt', () => {
  function delivered(api, server) {
    const w = api.customer.myWeeks(CREDIT_OK).data.weeks[0];
    server.setNow(new Date(w.deadline_at).getTime() + 60000);
    const o = orderOf(server, CREDIT_OK).find((x) => x.weekIndex === 0);
    api.ops.setOrderStatus({ role: 'admin' }, { orderId: o.id, status: 'in_production' });
    api.ops.setOrderStatus({ role: 'admin' }, { orderId: o.id, status: 'shipped' });
    api.ops.setOrderStatus({ role: 'admin' }, { orderId: o.id, status: 'delivered' });
    return o;
  }

  it('chỉ đánh giá được đơn đã giao; lưu thích / vị xốt / độ cay kèm mã xốt và còn sau khi dựng lại API', () => {
    const { api, server, storage } = setup();
    const o0 = orderOf(server, CREDIT_OK)[0];
    expect(api.customer.rateDish({ customer_id: CREDIT_OK, order_id: o0.id, dish_id: Object.values(o0.meals[0].dishes)[0], thumb: 'up' }).error.code).toBe('ORDER_NOT_DELIVERED');

    const o = delivered(api, server);
    const pending = api.customer.pendingRatings(CREDIT_OK).data;
    expect(pending).toHaveLength(1);
    const dish = pending[0].dishes.find((d) => d.sauce_code);
    expect(dish.rating).toBeNull();

    expect(api.customer.rateDish({ customer_id: CREDIT_OK, order_id: o.id, dish_id: dish.dish_id, thumb: 'down' }).status).toBe('success');
    const r = api.customer.rateDish({ customer_id: CREDIT_OK, order_id: o.id, dish_id: dish.dish_id, sauce_salt: 'salty', spice: 'low' });
    expect(r.data).toMatchObject({ thumb: 'down', sauce_salt: 'salty', spice: 'low', sauce_code: dish.sauce_code });

    // "Tải lại trang": API mới trên cùng nơi lưu vẫn thấy đánh giá
    const api2 = createApi(createServer({ storage, startAt: START, running: false }));
    const again = api2.customer.pendingRatings(CREDIT_OK).data[0].dishes.find((d) => d.dish_id === dish.dish_id);
    expect(again.rating).toEqual({ thumb: 'down', sauce_salt: 'salty', spice: 'low' });
  });

  it('giá trị đánh giá không hợp lệ bị từ chối', () => {
    const { api, server } = setup();
    const o = delivered(api, server);
    const dish = Object.values(o.meals[0].dishes)[0];
    expect(api.customer.rateDish({ customer_id: CREDIT_OK, order_id: o.id, dish_id: dish, thumb: 'meh' }).error.code).toBe('RATING_INVALID');
    expect(api.customer.rateDish({ customer_id: CREDIT_OK, order_id: o.id, dish_id: 'D-VEG-002x', thumb: 'up' }).error.code).toBe('DISH_NOT_IN_ORDER');
  });
});

describe('thưởng và link mời', () => {
  it('mã mời suy ra từ mã khách và ngược lại', () => {
    expect(referralCodeFor('C-0007')).toBe('MOVA-0007');
    expect(customerIdFromReferralCode('mova-0007')).toBe('C-0007');
    expect(customerIdFromReferralCode('abc')).toBeNull();
  });

  it('hoàn thiện hồ sơ: thưởng một lần vào ngăn khuyến mãi theo mức cấu hình', () => {
    const { api, server } = setup();
    const partial = api.customer.saveProfile({ customer_id: CREDIT_OK, email: 'khach@example.com' });
    expect(partial.data.reward_vnd).toBe(0);
    expect(partial.data.customer.profile.missing.length).toBe(1);
    const before = credit(server, CREDIT_OK);
    const done = api.customer.saveProfile({ customer_id: CREDIT_OK, members: [{ name: 'Minh', relation: 'Bản thân', note: 'Không ăn cay' }] });
    expect(done.data.reward_vnd).toBe(BUSINESS.incentives.rewards.profileComplete);
    expect(credit(server, CREDIT_OK).promo).toBe(before.promo + BUSINESS.incentives.rewards.profileComplete);
    const again = api.customer.saveProfile({ customer_id: CREDIT_OK, address: '12 Lê Lợi, Bình Thạnh' });
    expect(again.data.reward_vnd).toBe(0);
    expect(profileCompleteness({ name: 'a', phone: '1', email: 'e', address: 'x', members: [] }).complete).toBe(false);
  });

  it('số điện thoại / email sai bị từ chối', () => {
    const { api } = setup();
    expect(api.customer.saveProfile({ customer_id: CREDIT_OK, phone: '12' }).error.code).toBe('INVALID_CONTACT');
    expect(api.customer.saveProfile({ customer_id: CREDIT_OK, email: 'sai' }).error.code).toBe('INVALID_CONTACT');
  });

  it('chia sẻ: mỗi nội dung một lần, tối đa số lần mỗi tuần theo cấu hình', () => {
    const { api, server } = setup();
    const before = credit(server, CREDIT_OK).promo;
    const a = api.customer.claimShare({ customer_id: CREDIT_OK, kind: 'menu', ref: 'week-0' });
    expect(a.data.reward_vnd).toBe(BUSINESS.incentives.rewards.share);
    expect(api.customer.claimShare({ customer_id: CREDIT_OK, kind: 'menu', ref: 'week-0' }).error.code).toBe('ALREADY_CLAIMED');
    api.customer.claimShare({ customer_id: CREDIT_OK, kind: 'photo', ref: 'MOVA-TRACE-BO-202611-0912', photo_name: 'mam-com.jpg' });
    expect(api.customer.claimShare({ customer_id: CREDIT_OK, kind: 'menu', ref: 'week-1' }).error.code).toBe('WEEKLY_LIMIT');
    expect(credit(server, CREDIT_OK).promo).toBe(before + 2 * BUSINESS.incentives.rewards.share);
    // Hết một tuần thì chia sẻ tiếp được
    server.setNow(new Date(START).getTime() + 8 * 24 * 3600 * 1000);
    expect(api.customer.claimShare({ customer_id: CREDIT_OK, kind: 'menu', ref: 'week-1' }).status).toBe('success');
    expect(canClaimShare([], { customerId: 'x', kind: 'menu', ref: 'a' }, new Date()).ok).toBe(true);
  });

  it('mời bạn: người mời nhận thưởng khi bạn trả gói đầu tiên; khách mới nhận thưởng trong trần ưu đãi', () => {
    const { api, server } = setup();
    const code = api.customer.rewards(CREDIT_OK).data.referral_code;
    const referrerBefore = credit(server, CREDIT_OK).promo;

    const lead = api.customer.captureLead({ contact: '0987654321' });
    const profile = api.customer.onboardingProfile({
      user_contact: { phone_or_email: '0987654321' }, lead_id: lead.data.lead_id,
      survey_answers: { living_area: 'Quận 7, TP. Hồ Chí Minh', household_size: 2, household_needs: [], cuisine: 'viet', allergies_and_restrictions: [], weekly_home_meals_count: 4 }
    });
    const plan = api.customer.generateMealPlan({ profile_id: profile.data.profile_id, week_number: 1 });
    const res = api.customer.createSubscription({
      profile_id: profile.data.profile_id, plan_id: plan.data.plan_id, duration_weeks: 4, payment_method: 'bank_transfer_4w', voucher_code: BUSINESS.incentives.giftCardCode,
      referral_code: code,
      schedule: { delivery_frequency: 'once_a_week', preferred_days: ['tuesday'], preferred_time_slot: 'evening_18_21', shipping_address: { street: '12 Nguyễn Văn Linh', district: 'Quận 7', city: 'TP. Hồ Chí Minh', receiver_name: 'Chị Lan', receiver_phone: '0987654321' } }
    });
    expect(res.status).toBe('success');
    expect(credit(server, CREDIT_OK).promo).toBe(referrerBefore + BUSINESS.incentives.rewards.referrer);
    const rw = api.customer.rewards(CREDIT_OK).data.rewards.referral;
    expect(rw.invited).toHaveLength(1);
    expect(rw.invited[0].name).not.toContain('Chị Lan');
    // Khách mới nhận thưởng, không vượt trần ưu đãi chu kỳ đầu
    const gift = res.data.voucher_discount_applied_week1_vnd + res.data.voucher_future_credits_locked_vnd;
    const bonus = res.data.referral ? res.data.referral.referee_bonus_vnd : 0;
    expect(gift + bonus).toBeLessThanOrEqual(Math.floor(res.data.package_value_vnd * BUSINESS.incentives.maxFirstCycleDiscountPct));
    // Mã mời chỉ tính một lần cho mỗi khách, không tự mời mình
    const second = server.read((db) => db.referrals.length);
    expect(second).toBe(1);
  });
});

describe('truy xuất QR', () => {
  it('mã mẫu của bò và gạo mở được không cần đăng nhập, đủ công thức, nguồn gốc, nhật ký nhiệt', () => {
    const { api } = setup();
    const beef = api.customer.traceLot('MOVA-TRACE-BO-202611-0912');
    expect(beef.status).toBe('success');
    const v = beef.data;
    expect(v.farm.name).toContain('Krông Năng');
    expect(v.peer_validations_count).toBe(8);
    expect(v.inspector).toEqual({ verified: true, antibiotic_test: 'NEGATIVE' });
    expect(v.harvest_or_slaughter_at).toBeTruthy();
    expect(v.processed_at).toBeTruthy();
    expect(v.temperature.within_limit).toBe(true);
    expect(v.recipes.length).toBeGreaterThan(0);
    expect(v.recipes[0].steps.length).toBeGreaterThan(1);
    expect(v.recipes[0].minutes).toBeLessThanOrEqual(15);
    // Không lộ tên cán bộ và tọa độ
    expect(JSON.stringify(v)).not.toContain('Trần Văn B');
    expect(JSON.stringify(v)).not.toContain('12.9845');

    const rice = api.customer.traceLot('mova-trace-gao-202611-0207').data;
    expect(rice.temperature.needs_cold_chain).toBe(false);
    expect(rice.recipes[0].dish_id).toBe('D-CRB-001');
  });

  it('mã không có thì lỗi rõ ràng', () => {
    const { api } = setup();
    expect(api.customer.traceLot('MOVA-TRACE-XX').error.code).toBe('LOT_NOT_FOUND');
  });

  it('xưởng ghi lô mới vào db.lots, trang đọc ra được; vai trò khác không ghi được', () => {
    const { api, server } = setup();
    const lot = { ...SAMPLE_LOTS[0], qr_code: 'MOVA-TRACE-BO-202611-0999', product_name: 'Bò thử nghiệm', sample: false };
    expect(() => api.ops.saveLot({ role: 'shipper' }, lot)).toThrow(ForbiddenError);
    api.ops.saveLot({ role: 'workshop' }, lot);
    expect(server.read((db) => db.lots.some((l) => l.qr_code === lot.qr_code))).toBe(true);
    const v = api.customer.traceLot(lot.qr_code).data;
    expect(v.product_name).toBe('Bò thử nghiệm');
    expect(v.sample).toBe(false);
    expect(() => api.ops.saveLot({ role: 'workshop' }, { ...lot, qr_code: 'sai' })).toThrow(/QR/);
  });

  it('nhiệt độ vượt ngưỡng thì không báo đạt', () => {
    const lot = { ...SAMPLE_LOTS[0], temperature_readings: [{ point: 'Giữa hành trình', at: '2026-11-15T15:00:00Z', celsius: 9 }] };
    expect(lotView(lot).temperature.within_limit).toBe(false);
    expect(validateLot(lot)).toEqual([]);
  });
});

describe('lọc theo vai trò vẫn đúng với dữ liệu mới', () => {
  it('xưởng không thấy tên, SĐT, địa chỉ, mã khách của đơn bị tạm hoãn hay đơn nhân bản', () => {
    const { api, server } = setup();
    api.customer.skipWeek({ customer_id: CREDIT_OK, week_index: 0 });
    const list = api.ops.listOrders({ role: 'workshop' });
    const json = JSON.stringify(list);
    const c = server.read((db) => db.customers.find((x) => x.id === CREDIT_OK));
    expect(json).not.toContain(c.name);
    expect(json).not.toContain(c.phone);
    expect(json).not.toContain(CREDIT_OK);
  });
});
