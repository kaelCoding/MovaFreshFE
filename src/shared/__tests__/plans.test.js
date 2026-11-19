import { describe, it, expect } from 'vitest';
import { createServer } from '../mock-server/server';
import { createMemoryStorage } from '../mock-server/storage';
import { createApi } from '../api';
import { BUSINESS } from '../config/business';
import { normalizeContact } from '../domain/leads';
import { giftCardSchedule, capFirstCycleIncentives } from '../domain/pricing';
import { quotePackage, exactFreshCreditOffer, freshCreditOffer } from '../domain/planQuote';
import { DISHES } from '../data/catalog';

const START = '2026-11-20T09:00:00+07:00'; // Thứ Sáu

function setup() {
  const server = createServer({ storage: createMemoryStorage(), startAt: START, running: false });
  return { server, api: createApi(server) };
}

const survey = (over = {}) => ({
  user_contact: { phone_or_email: '0987654321' },
  survey_answers: {
    living_area: 'Quận 7, TP. Hồ Chí Minh',
    household_size: 4,
    household_needs: ['gym', 'elderly'],
    cuisine: 'viet',
    allergies_and_restrictions: ['no_spicy'],
    weekly_home_meals_count: 5,
    ...over
  }
});

function start(api, over = {}) {
  const lead = api.customer.captureLead({ contact: '0987 654 321' });
  const profile = api.customer.onboardingProfile({ ...survey(over), lead_id: lead.data.lead_id });
  const plan = api.customer.generateMealPlan({ profile_id: profile.data.profile_id, week_number: 1 });
  return { lead, profile, plan };
}

const schedule = (over = {}) => ({
  delivery_frequency: 'once_a_week',
  preferred_days: ['tuesday'],
  preferred_time_slot: 'evening_18_21',
  shipping_address: { street: '12 Nguyễn Văn Linh', district: 'Quận 7', city: 'TP. Hồ Chí Minh', receiver_name: 'Chị Lan', receiver_phone: '0987654321' },
  ...over
});

const subReq = (profile, plan, over = {}) => ({
  profile_id: profile.data.profile_id,
  plan_id: plan.data.plan_id,
  duration_weeks: 4,
  payment_method: 'bank_transfer_4w',
  schedule: schedule(),
  voucher_code: BUSINESS.incentives.giftCardCode,
  ...over
});

describe('lead và danh sách chờ', () => {
  it('chuẩn hóa số điện thoại và email, bỏ giá trị sai', () => {
    expect(normalizeContact('0987 654.321')).toEqual({ type: 'phone', value: '0987654321' });
    expect(normalizeContact('+84 987 654 321')).toEqual({ type: 'phone', value: '0987654321' });
    expect(normalizeContact('An@Mail.com')).toEqual({ type: 'email', value: 'an@mail.com' });
    expect(normalizeContact('12345')).toBeNull();
    expect(normalizeContact('khong-phai-email@')).toBeNull();
  });

  it('lưu lead ngay khi nhập liên hệ, trùng liên hệ thì dùng lại lead cũ', () => {
    const { server, api } = setup();
    const a = api.customer.captureLead({ contact: '0987654321' });
    const b = api.customer.captureLead({ contact: '+84987654321' });
    expect(a.status).toBe('success');
    expect(b.data.lead_id).toBe(a.data.lead_id);
    expect(b.data.returning).toBe(true);
    expect(server.read((db) => db.leads)).toHaveLength(1);
    expect(api.customer.captureLead({ contact: 'abc' }).error.code).toBe('INVALID_CONTACT');
  });

  it('quận ngoài vùng: hồ sơ bị từ chối, vào danh sách chờ với tên quận', () => {
    const { server, api } = setup();
    const lead = api.customer.captureLead({ contact: 'an@mail.com' });
    expect(api.customer.checkArea('Cần Thơ').served).toBe(false);
    expect(api.customer.checkArea('Quận 7').served).toBe(true);
    const profile = api.customer.onboardingProfile({ ...survey({ living_area: 'Cần Thơ' }), user_contact: { phone_or_email: 'an@mail.com' }, lead_id: lead.data.lead_id });
    expect(profile.error.code).toBe('OUT_OF_ZONE');
    const w = api.customer.joinWaitlist({ lead_id: lead.data.lead_id, district: 'Cần Thơ' });
    expect(w.status).toBe('success');
    const saved = server.read((db) => db.leads[0]);
    expect(saved.status).toBe('waitlist');
    expect(saved.waitlistDistrict).toBe('Cần Thơ');
  });
});

describe('thực đơn tuần 1', () => {
  it('người cần lưu ý: trẻ nhỏ tự kiêng cay; muốn giảm cân thành mục tiêu ít tinh bột', () => {
    const { server, api } = setup();
    const { profile } = start(api, { household_needs: ['young_child', 'weight_loss'], allergies_and_restrictions: [] });
    const p = server.read((db) => db.profiles.find((x) => x.id === profile.data.profile_id));
    expect(p.restrictions).toContain('no_spicy');
    expect(p.goals).toContain('low_carb');
  });

  it('1 người là suất nấu 1 chảo (không canh); từ 2 người là mâm 5 phần; tinh bột mặc định là cơm', () => {
    const { api } = setup();
    const { plan } = start(api, { household_size: 1, household_needs: [] });
    expect(plan.data.meals[0].meal_structure.soup_dish).toBeUndefined();
    expect(plan.data.meals[0].theme).toBe('Suất ăn nấu 1 chảo');
    expect(plan.data.meals.every((m) => m.meal_structure.carb_dish.dish_id === 'D-CRB-001')).toBe(true);

    const two = api.customer.configurePlan({ plan_id: plan.data.plan_id, household_size: 2 });
    const m = two.data.meals[0].meal_structure;
    expect(two.data.household_size).toBe(2);
    expect(m.protein_dish && m.soup_dish && m.veggie_dish && m.carb_dish && m.dessert).toBeTruthy();
    expect(two.data.week_value_vnd).toBeGreaterThan(plan.data.week_value_vnd);
    expect(api.customer.configurePlan({ plan_id: plan.data.plan_id, household_size: 11 }).error.code).toBe('HOUSEHOLD_SIZE_INVALID');
  });

  it('câu hỏi giá trị: trả lời "có" cập nhật thực đơn và giá, hiện chênh lệch theo bữa', () => {
    const { api } = setup();
    const { plan } = start(api);
    const id = plan.data.plan_id;
    const q = (res, qid) => res.data.value_questions.find((x) => x.id === qid);
    const before = plan.data.week_value_vnd;
    expect(q(plan, 'more_protein').answer).toBeNull();
    expect(q(plan, 'more_protein').delta_per_meal_vnd).toBeGreaterThan(0);

    const protein = api.customer.configurePlan({ plan_id: id, upsells: { more_protein: true } });
    expect(protein.data.week_value_vnd - before).toBe(q(plan, 'more_protein').delta_week_vnd);
    expect(q(protein, 'more_protein').answer).toBe(true);
    expect(protein.data.meals).toHaveLength(plan.data.meals.length);

    const west = api.customer.configurePlan({ plan_id: id, upsells: { western_meal: true } });
    expect(west.data.meals).toHaveLength(plan.data.meals.length + 1);
    const last = west.data.meals[west.data.meals.length - 1];
    expect(last.western).toBe(true);
    expect(DISHES[last.meal_structure.protein_dish.dish_id].western).toBe(true);
    // Giá bữa Tây thêm vào = chênh lệch của cả tuần so với trước khi thêm
    expect(west.data.week_value_vnd - protein.data.week_value_vnd).toBe(last.price_vnd);

    const off = api.customer.configurePlan({ plan_id: id, upsells: { more_protein: false, western_meal: false } });
    expect(off.data.week_value_vnd).toBe(before);
  });

  it('người kiêng bò/heo/hải sản: bữa Tây và món đổi không có món bị kiêng', () => {
    const { api } = setup();
    const { plan } = start(api, { allergies_and_restrictions: ['no_beef', 'no_pork', 'no_seafood'] });
    const west = api.customer.configurePlan({ plan_id: plan.data.plan_id, upsells: { western_meal: true } });
    const last = west.data.meals[west.data.meals.length - 1];
    expect(last.meal_structure.protein_dish.dish_id).toBe('D-WST-002'); // gà là món Tây duy nhất không bò/heo
    const opts = api.customer.swapOptions({ plan_id: plan.data.plan_id, meal_index: 1, kind: 'protein' });
    for (const o of opts.data.options) {
      expect(DISHES[o.dish_id].tags.some((t) => ['beef', 'pork', 'seafood'].includes(t))).toBe(false);
    }
  });

  it('đổi món đạm / rau / canh; tinh bột chỉ đổi được sang món hợp với bữa', () => {
    const { api } = setup();
    const { plan } = start(api, { allergies_and_restrictions: [] });
    const id = plan.data.plan_id;
    const opts = api.customer.swapOptions({ plan_id: id, meal_index: 1, kind: 'protein' }).data.options;
    const target = opts.find((o) => !o.current);
    const swapped = api.customer.configurePlan({ plan_id: id, swap: { meal_index: 1, kind: 'protein', dish_id: target.dish_id } });
    expect(swapped.data.meals[0].meal_structure.protein_dish.dish_id).toBe(target.dish_id);
    expect(swapped.data.meals[1].meal_structure.protein_dish.dish_id).toBe(plan.data.meals[1].meal_structure.protein_dish.dish_id);

    // Món sai loại bị từ chối
    expect(api.customer.configurePlan({ plan_id: id, swap: { meal_index: 1, kind: 'veg', dish_id: 'D-PRT-001' } }).error.code).toBe('DISH_NOT_ALLOWED');

    // Tinh bột: cơm luôn có; món khác chỉ hiện nếu hợp với một món trong bữa
    const carbOpts = api.customer.swapOptions({ plan_id: id, meal_index: 1, kind: 'carb' }).data.options.map((o) => o.dish_id);
    expect(carbOpts[0]).toBe('D-CRB-001');
    const meal = swapped.data.meals[0].meal_structure;
    const allowedAlt = new Set(['D-PRT', 'D-VEG', 'D-SUP'].flatMap(() => []));
    for (const dish of [meal.protein_dish, meal.veggie_dish, meal.soup_dish]) {
      for (const alt of DISHES[dish.dish_id].carbAlt || []) allowedAlt.add(alt);
    }
    for (const c of carbOpts.filter((x) => x !== 'D-CRB-001')) expect(allowedAlt.has(c)).toBe(true);
    const notAllowed = ['D-CRB-002', 'D-CRB-003', 'D-CRB-004', 'D-CRB-005'].find((c) => !carbOpts.includes(c));
    const bad = api.customer.configurePlan({ plan_id: id, swap: { meal_index: 1, kind: 'carb', dish_id: notAllowed } });
    expect(bad.error.code).toBe('DISH_NOT_ALLOWED');
  });

  it('áp dụng được trái cây do Bếp trưởng chọn và cập nhật giá theo catalog frontend', () => {
    const { api } = setup();
    const { plan } = start(api, { household_size: 2 });
    const id = plan.data.plan_id;
    const meal = plan.data.meals[0];
    const options = api.customer.swapOptions({ plan_id: id, meal_index: meal.meal_index, kind: 'dessert' });
    const target = options.data.options.find((option) => !option.current);

    expect(target).toBeDefined();
    const updated = api.customer.configurePlan({
      plan_id: id,
      swap: { meal_index: meal.meal_index, kind: 'dessert', dish_id: target.dish_id }
    });

    expect(updated.status).toBe('success');
    expect(updated.data.meals[0].meal_structure.dessert.dish_id).toBe(target.dish_id);
    expect(updated.data.week_value_vnd).not.toBe(plan.data.week_value_vnd);
  });

  it('cho phép áp dụng rau và trái cây trong bữa Tây do Bếp trưởng chọn', () => {
    const { api } = setup();
    const { plan } = start(api, { household_size: 2 });
    const id = plan.data.plan_id;
    const westernPlan = api.customer.configurePlan({ plan_id: id, upsells: { western_meal: true } });
    const meal = westernPlan.data.meals.find((item) => item.western);

    expect(api.customer.swapOptions({ plan_id: id, meal_index: meal.meal_index, kind: 'veg' }).data.options.length).toBeGreaterThan(0);
    expect(api.customer.swapOptions({ plan_id: id, meal_index: meal.meal_index, kind: 'dessert' }).data.options.length).toBeGreaterThan(0);
  });

  it('áp dụng menu Bếp trưởng theo catalog frontend, kể cả bữa Tây, và tính lại giá', () => {
    const { api } = setup();
    const { plan } = start(api, { household_size: 2 });
    const id = plan.data.plan_id;
    const meals = plan.data.meals.map((meal) => ({
      meal_index: meal.meal_index,
      western: false,
      dishes: {
        protein: meal.meal_structure.protein_dish.dish_id,
        soup: meal.meal_structure.soup_dish.dish_id,
        veg: meal.meal_structure.veggie_dish.dish_id,
        carb: meal.meal_structure.carb_dish.dish_id,
        dessert: meal.meal_structure.dessert.dish_id
      }
    }));
    meals[0].western = true;
    meals[0].dishes.protein = 'D-WST-002';

    const applied = api.customer.applyChefMenu({ plan_id: id, meals });

    expect(applied.status).toBe('success');
    expect(applied.data.meals[0].western).toBe(true);
    expect(applied.data.meals[0].meal_structure.protein_dish.dish_id).toBe('D-WST-002');
    expect(applied.data.week_value_vnd).not.toBe(plan.data.week_value_vnd);
  });

  it('tạo lại thực đơn MOVA gợi ý sẽ bỏ lựa chọn Bếp trưởng trước đó', () => {
    const { api } = setup();
    const { profile, plan } = start(api, { household_size: 2 });
    const aiMeals = plan.data.meals.map((meal) => ({
      meal_index: meal.meal_index,
      western: true,
      dishes: {
        protein: 'D-WST-002',
        soup: meal.meal_structure.soup_dish.dish_id,
        veg: meal.meal_structure.veggie_dish.dish_id,
        carb: meal.meal_structure.carb_dish.dish_id,
        dessert: meal.meal_structure.dessert.dish_id
      }
    }));
    expect(api.customer.applyChefMenu({ plan_id: plan.data.plan_id, meals: aiMeals }).status).toBe('success');

    const suggested = api.customer.generateMealPlan({ profile_id: profile.data.profile_id, week_number: 1 });

    expect(suggested.status).toBe('success');
    expect(suggested.data.meals[0].meal_structure.protein_dish.dish_id)
      .toBe(plan.data.meals[0].meal_structure.protein_dish.dish_id);
  });

  it('chi tiêu đi chợ chỉ là trần mềm: thực đơn rẻ hơn nhưng vẫn đủ bữa', () => {
    const { api } = setup();
    const free = start(api, { household_size: 2 }).plan;
    const capped = start(api, { household_size: 2, weekly_grocery_budget_vnd: 300000 }).plan;
    expect(capped.data.meals).toHaveLength(free.data.meals.length);
    expect(capped.data.week_value_vnd).toBeLessThanOrEqual(free.data.week_value_vnd);
  });

  it('chi tiêu đi chợ tùy chọn (Khác): nhận số tiền tùy chỉnh 1.800.000đ và 3.000.000đ làm trần mềm', () => {
    const { api } = setup();
    const customBudget1 = start(api, { household_size: 2, weekly_grocery_budget_vnd: 1800000 });
    expect(customBudget1.plan.status).toBe('success');
    expect(customBudget1.plan.data.meals).toHaveLength(5);

    const customBudget2 = start(api, { household_size: 4, weekly_grocery_budget_vnd: 3000000 });
    expect(customBudget2.plan.status).toBe('success');
    expect(customBudget2.plan.data.meals).toHaveLength(5);
  });
});

describe('giá trị gói và trần ưu đãi chu kỳ đầu', () => {
  it('báo giá: thẻ quà tặng theo quy mô gói, trả tuần 1 = giá trị tuần 1 trừ thẻ tuần 1', () => {
    const q = quotePackage({ weekValueVnd: 500000, mealsPerWeek: 5 });
    expect(q.packageValueVnd).toBe(2000000);
    expect(q.giftSchedule).toEqual(giftCardSchedule(2000000));
    expect(q.giftTotalVnd).toBeLessThanOrEqual(2000000 * BUSINESS.incentives.giftCardMaxPctOfPackage + 4000);
    expect(q.week1PayVnd).toBe(500000 - q.giftSchedule[0]);
    expect(q.weekly).toHaveLength(4);
    expect(q.perMealListVnd).toBe(100000);
  });

  it('nạp Fresh Credit vừa đủ: nhận đúng phần còn lại sau thẻ quà tặng, trả ít hơn nhận', () => {
    const q = quotePackage({ weekValueVnd: 700000, mealsPerWeek: 5 });
    const f = q.freshCredit;
    expect(f.creditReceivedVnd).toBe(q.packageValueVnd - q.giftTotalVnd);
    expect(f.payVnd).toBe(f.creditReceivedVnd - f.bonusVnd);
    expect(f.payVnd).toBeLessThan(f.creditReceivedVnd);
    expect(f.capped).toBe(false);
    expect(q.firstCycleDiscountPct).toBeLessThanOrEqual(BUSINESS.incentives.maxFirstCycleDiscountPct);
  });

  it('thưởng nạp 25% + thẻ quà tặng lớn: tổng ưu đãi chu kỳ đầu bị chặn ở trần, giảm thưởng nạp trước', () => {
    const cfg = { ...BUSINESS, incentives: { ...BUSINESS.incentives, giftCardMaxPctOfPackage: 0.28 } };
    const V = 4000000;
    const gift = giftCardSchedule(V, cfg).reduce((a, b) => a + b, 0);
    const exact = exactFreshCreditOffer({ packageValueVnd: V, giftTotalVnd: gift, bonusPct: 0.25 }, cfg);
    const cap = Math.floor(V * cfg.incentives.maxFirstCycleDiscountPct);
    expect(exact.capped).toBe(true);
    expect(gift + exact.bonusVnd).toBeLessThanOrEqual(cap);
    expect(exact.bonusVnd).toBeLessThan(exact.bonusUncappedVnd);
    expect(exact.creditReceivedVnd).toBe(V - gift);
    expect(exact.payVnd).toBe(V - gift - exact.bonusVnd);
    // Giá cuối khách trả không thấp hơn (1 - trần) x giá trị gói
    expect(exact.payVnd).toBeGreaterThanOrEqual(V - cap);
    // Nạp lớn hơn cũng không vượt trần
    const big = freshCreditOffer({ packageValueVnd: V, giftTotalVnd: gift, payVnd: 5000000, bonusPct: 0.25 }, cfg);
    expect(gift + big.bonusVnd).toBeLessThanOrEqual(cap);
    const direct = capFirstCycleIncentives({ packageValueVnd: V, giftCardTotal: gift, topUpBonusVnd: 5000000 * 0.25 }, cfg);
    expect(direct.totalDiscountVnd).toBeLessThanOrEqual(direct.capVnd);
  });

  it('cấu hình thật: thẻ quà tặng tối đa thấp hơn trần ưu đãi chu kỳ đầu, nạp 10% không bị chặn', () => {
    expect(BUSINESS.incentives.giftCardMaxPctOfPackage).toBeLessThan(BUSINESS.incentives.maxFirstCycleDiscountPct);
    for (const week of [200000, 500000, 1000000, 2000000]) {
      const q = quotePackage({ weekValueVnd: week, mealsPerWeek: 5 });
      expect(q.freshCredit.capped).toBe(false);
      expect(q.giftTotalVnd + q.freshCredit.bonusVnd).toBeLessThanOrEqual(Math.floor(q.packageValueVnd * BUSINESS.incentives.maxFirstCycleDiscountPct));
    }
  });
});

describe('đăng ký từ phễu /plans', () => {
  it('xem trước khớp đúng với đơn thật và không ghi gì vào dữ liệu', () => {
    const { server, api } = setup();
    const { profile, plan } = start(api);
    const before = server.read((db) => ({ o: db.orders.length, c: db.customers.length }));
    const pv = api.customer.previewSubscription(subReq(profile, plan, { payment_method: 'card' }));
    expect(pv.status).toBe('success');
    expect(server.read((db) => ({ o: db.orders.length, c: db.customers.length }))).toEqual(before);
    expect(pv.data.payment_ref).toMatch(/^MOVA/);
    expect(pv.data.deliveries).toHaveLength(4);

    const res = api.customer.createSubscription(subReq(profile, plan, { payment_method: 'card' }));
    expect(res.status).toBe('success');
    expect(res.data.total_order_amount_vnd).toBe(pv.data.package_value_vnd - pv.data.gift_total_vnd);
    expect(res.data.paid_now_vnd).toBe(pv.data.card.charge_now_vnd);
    expect(res.data.deliveries.map((d) => d.amount_vnd)).toEqual(pv.data.deliveries.map((d) => d.amount_vnd));
    expect(res.data.deliveries.map((d) => d.charge_at)).toEqual(pv.data.card.charges.map((c) => c.charge_at));
    // Tuần 2–4 trừ trước giờ giao 72 tiếng
    const second = res.data.deliveries[1];
    expect(Date.parse(second.delivery_at) - Date.parse(second.charge_at)).toBe(72 * 3600 * 1000);
  });

  it('giá khóa theo tuần 1: các tuần sau bằng nhau dù AI đổi món', () => {
    const { api } = setup();
    const { profile, plan } = start(api);
    const res = api.customer.createSubscription(subReq(profile, plan));
    const lists = res.data.cycle_weeks.map((w) => w.list_price_vnd);
    expect(new Set(lists).size).toBe(1);
    expect(res.data.package_value_vnd).toBe(plan.data.week_value_vnd * 4);
    const discount = res.data.cycle_weeks.reduce((s, w) => s + w.discount_vnd, 0);
    expect(discount).toBeLessThanOrEqual(res.data.package_value_vnd * BUSINESS.incentives.giftCardMaxPctOfPackage + 4000);
  });

  it('nạp Fresh Credit: thưởng nạp vào ngăn khuyến mãi, tuần 1 trừ ngay, tổng ưu đãi không vượt trần', () => {
    const { server, api } = setup();
    const { profile, plan } = start(api);
    const pv = api.customer.previewSubscription(subReq(profile, plan, { payment_method: 'fresh_credit' }));
    const f = pv.data.fresh_credit;
    const res = api.customer.createSubscription(subReq(profile, plan, { payment_method: 'fresh_credit', topup_pay_vnd: f.pay_vnd }));
    expect(res.status).toBe('success');
    expect(res.data.topup.pay_vnd).toBe(f.pay_vnd);
    expect(res.data.paid_now_vnd).toBe(f.pay_vnd);
    const cust = server.read((db) => db.customers.find((c) => c.id === res.data.customer_id));
    const orders = server.read((db) => db.orders.filter((o) => o.customerId === res.data.customer_id));
    expect(orders.filter((o) => o.status === 'paid')).toHaveLength(1);
    // Nhận đúng bằng giá phải trả sau thẻ quà tặng: số dư còn lại + tuần 1 đã trừ = Fresh Credit nhận
    expect(f.credit_received_vnd).toBe(res.data.total_order_amount_vnd);
    expect(cust.credit.real + cust.credit.promo + orders.find((o) => o.status === 'paid').amountVnd).toBe(f.credit_received_vnd);
    expect(cust.credit.promo + 0).toBeLessThanOrEqual(f.bonus_vnd);
    const totalDiscount = f.bonus_vnd + pv.data.gift_total_vnd;
    expect(totalDiscount).toBeLessThanOrEqual(pv.data.package_value_vnd * BUSINESS.incentives.maxFirstCycleDiscountPct);
    const ledger = server.read((db) => db.ledger.filter((l) => l.customerId === cust.id));
    expect(ledger.find((l) => l.kind === 'topup').ref).toBe(res.data.payment_ref);

    // Nạp thiếu thì từ chối và không tạo gì
    const before = server.read((db) => db.customers.length);
    const low = api.customer.createSubscription(subReq(profile, plan, { payment_method: 'fresh_credit', topup_pay_vnd: f.pay_vnd - 1000 }));
    expect(low.error.code).toBe('TOPUP_TOO_LOW');
    expect(server.read((db) => db.customers.length)).toBe(before);
  });

  it('chuyển khoản một lần cho 4 tuần: mọi đơn đã trả, sổ ghi mã đối soát', () => {
    const { server, api } = setup();
    const { profile, plan } = start(api);
    const res = api.customer.createSubscription(subReq(profile, plan));
    expect(res.data.paid_now_vnd).toBe(res.data.total_order_amount_vnd);
    const orders = server.read((db) => db.orders.filter((o) => o.customerId === res.data.customer_id));
    expect(orders.every((o) => o.status === 'paid')).toBe(true);
    const led = server.read((db) => db.ledger.find((l) => l.kind === 'prepaid_cycle' && l.customerId === res.data.customer_id));
    expect(led.ref).toBe(res.data.payment_ref);
  });

  it('đơn vừa đặt xuất hiện trong dữ liệu dùng chung cho app vận hành, lọc theo vai trò', () => {
    const { api } = setup();
    const { profile, plan } = start(api);
    const res = api.customer.createSubscription(subReq(profile, plan));
    expect(res.data.deliveries).toHaveLength(4);
    const mine = api.ops.listOrders({ role: 'admin' }).filter((o) => o.recipient?.name === 'Chị Lan');
    expect(mine).toHaveLength(4);
    expect(mine[0].meals.length).toBeGreaterThan(0);
    // Xưởng thấy đơn nhưng không thấy người nhận
    const workshop = api.ops.listOrders({ role: 'workshop' }, { day: mine[0].deliveryDay }).find((o) => o.id === mine[0].id);
    expect(workshop).toBeTruthy();
    expect(JSON.stringify(workshop)).not.toContain('Chị Lan');
    expect(JSON.stringify(workshop)).not.toContain('0987654321');
    const hub = api.ops.listOrders({ role: 'hub' }).find((o) => o.id === mine[0].id);
    expect(hub.recipient.name).toBe('Chị Lan');
  });

  it('khung giờ đã đầy không còn trong lựa chọn giao hàng', () => {
    const { api } = setup();
    const { profile, plan } = start(api, { living_area: 'Dĩ An, Bình Dương', household_needs: [] });
    const dz = { street: '1 Đường ĐT743', district: 'Dĩ An', city: 'Bình Dương', receiver_name: 'Khách', receiver_phone: '0900000001' };
    const opts = () => api.customer.deliveryOptions({ profile_id: profile.data.profile_id, deliveries_per_week: 1 }).data.options;
    const tuesday = () => opts().find((o) => o.preferred_days[0] === 'tuesday');
    expect(tuesday().slots.map((s) => s.slot_id)).toContain('evening_18_21');
    let full = false;
    for (let i = 0; i < 40 && !full; i++) {
      const r = api.customer.createSubscription(subReq(profile, plan, { schedule: schedule({ shipping_address: dz }) }));
      if (r.status === 'error') full = r.error.code === 'SLOT_FULL';
    }
    expect(full).toBe(true);
    expect(tuesday()).toBeUndefined(); // khu này chỉ có khung tối: hết chỗ thì cả ngày thứ Ba biến mất
    expect(opts().some((o) => o.preferred_days[0] === 'friday')).toBe(true);
  });

  it('2 lần mỗi tuần: ngày giao là cả hai ngày của khu, báo trước 24 giờ', () => {
    const { api } = setup();
    const { profile } = start(api);
    const o = api.customer.deliveryOptions({ profile_id: profile.data.profile_id, deliveries_per_week: 2 }).data;
    expect(o.options).toHaveLength(1);
    expect(o.options[0].preferred_days).toEqual(['tuesday', 'friday']);
    expect(o.lead_time_notice_hours).toBe(24);
  });
});
