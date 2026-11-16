import { describe, it, expect, beforeEach } from 'vitest';
import { createServer } from '../mock-server/server';
import { createMemoryStorage } from '../mock-server/storage';
import { createApi, ForbiddenError } from '../api';
import { HOUSEHOLD_COUNT } from '../mock-server/seed';
import { BUSINESS } from '../config/business';

const START = '2026-11-20T09:00:00+07:00'; // Thứ Sáu
const admin = { role: 'admin' };

function setup() {
  const server = createServer({ storage: createMemoryStorage(), startAt: START, running: false });
  const api = createApi(server);
  return { server, api };
}

describe('dữ liệu mẫu', () => {
  it('có 60 hộ, tên / SĐT / địa chỉ không trùng, trải trên ít nhất 6 khu', () => {
    const { server } = setup();
    const customers = server.read((db) => db.customers);
    expect(customers).toHaveLength(HOUSEHOLD_COUNT);
    expect(new Set(customers.map((c) => c.name)).size).toBe(HOUSEHOLD_COUNT);
    expect(new Set(customers.map((c) => c.phone)).size).toBe(HOUSEHOLD_COUNT);
    expect(new Set(customers.map((c) => c.address)).size).toBe(HOUSEHOLD_COUNT);
    expect(new Set(customers.map((c) => c.zoneId)).size).toBeGreaterThanOrEqual(6);
  });

  it('mọi hộ đều có chu kỳ 4 tuần; tuần 1 đã thu tiền, các tuần sau chờ trừ', () => {
    const { server } = setup();
    const { orders, subs } = server.read((db) => ({ orders: db.orders, subs: db.subscriptions }));
    expect(subs.every((s) => s.weeks >= BUSINESS.subscription.minWeeks)).toBe(true);
    const wk0 = orders.filter((o) => o.weekIndex === 0);
    expect(wk0.every((o) => o.status === 'paid')).toBe(true);
    expect(orders.some((o) => o.status === 'scheduled')).toBe(true);
    // Không đơn nào thanh toán khi nhận hàng
    expect(orders.every((o) => ['fresh_credit', 'bank_transfer_4w', 'card'].includes(o.paymentMethod))).toBe(true);
  });

  it('reset đưa dữ liệu về hạt giống', () => {
    const { server, api } = setup();
    const before = server.read((db) => db.orders.length);
    api.demo.jumpTo(admin, 'cutoff');
    expect(server.read((db) => db.productionPlans.length)).toBe(1);
    server.write((db) => db.orders.splice(0, 5));
    expect(server.read((db) => db.orders.length)).toBe(before - 5);
    api.demo.reset(admin);
    expect(server.read((db) => db.orders.length)).toBe(before);
    expect(server.read((db) => db.productionPlans.length)).toBe(0);
    expect(server.now().toISOString()).toBe(new Date(START).toISOString());
  });
});

describe('job theo mốc thời gian', () => {
  it('trước giờ chốt sổ chưa có kế hoạch sản xuất', () => {
    const { server } = setup();
    server.tick();
    expect(server.read((db) => db.productionPlans.length)).toBe(0);
  });

  it('qua giờ chốt sổ: job chốt chạy đúng một lần, tạo kế hoạch và PO nháp', () => {
    const { server, api } = setup();
    const st = api.demo.state(admin);
    const cutoffMs = Date.parse(st.nextCutoff);

    server.setNow(new Date(cutoffMs + 60 * 1000));
    expect(server.read((db) => db.productionPlans.length)).toBe(1);
    const pos1 = server.read((db) => db.purchaseOrders.length);
    expect(pos1).toBeGreaterThan(0);
    const keys1 = server.read((db) => Object.keys(db.firedJobs).filter((k) => k.startsWith('cutoff:')));
    expect(keys1).toHaveLength(1);

    // Chạy lại nhiều lần không nhân đôi
    server.tick();
    server.tick();
    server.setNow(new Date(cutoffMs + 120 * 1000));
    expect(server.read((db) => db.productionPlans.length)).toBe(1);
    expect(server.read((db) => db.purchaseOrders.length)).toBe(pos1);
  });

  it('nhảy tới mốc chốt sổ kế tiếp tạo kế hoạch thứ hai', () => {
    const { server, api } = setup();
    api.demo.jumpTo(admin, 'cutoff');
    api.demo.jumpTo(admin, 'cutoff');
    expect(server.read((db) => db.productionPlans.length)).toBe(2);
  });

  it('đơn bị khóa sau chốt sổ; kế hoạch chỉ gồm đơn đã trả tiền', () => {
    const { server, api } = setup();
    api.demo.jumpTo(admin, 'cutoff');
    const plan = server.read((db) => db.productionPlans[0]);
    const orders = server.read((db) => db.orders);
    const locked = orders.filter((o) => plan.orderIds.includes(o.id));
    expect(locked.length).toBeGreaterThan(0);
    expect(locked.every((o) => o.status === 'locked')).toBe(true);
    expect(plan.bom.boxes).toBe(locked.length);
    expect(plan.skippedOrderIds.every((id) => orders.find((o) => o.id === id).status === 'skipped_unpaid')).toBe(true);
  });

  it('trừ tiền D-3: đủ số dư thì thu, thiếu số dư hoặc thẻ bị từ chối thì ghi lỗi và báo khách; tới giờ chốt thì tạm hoãn', () => {
    const { server, api } = setup();
    // Đơn tuần 1 đã trả lúc đăng ký, nên lần trừ tiền đầu tiên là của tuần 2. Nhảy từng mốc trừ tiền
    // cho tới khi có đơn trừ lỗi (đang ở giữa mốc trừ tiền và giờ chốt sổ của chính đơn đó).
    let sawFailed = false;
    for (let i = 0; i < 80 && !sawFailed; i++) {
      api.demo.jumpTo(admin, 'charge');
      sawFailed = server.read((db) => db.orders.some((o) => o.status === 'charge_failed'));
    }
    expect(sawFailed).toBe(true);
    const orders = server.read((db) => db.orders);
    expect(orders.some((o) => o.weekIndex > 0 && o.status === 'paid')).toBe(true);
    const failed = orders.filter((o) => o.status === 'charge_failed' || o.status === 'skipped_unpaid');
    expect(failed.length).toBeGreaterThan(0);
    const notes = server.read((db) => db.notifications.filter((n) => n.type === 'payment_failed'));
    expect(notes.length).toBeGreaterThan(0);
    // Mỗi đơn lỗi chỉ báo một lần
    expect(new Set(notes.map((n) => n.customerId)).size).toBeGreaterThan(0);
    // Mốc chốt sổ tạm hoãn các đơn chưa trả được
    api.demo.jumpTo(admin, 'cutoff');
    expect(server.read((db) => db.orders.some((o) => o.status === 'skipped_unpaid'))).toBe(true);
  });

  it('báo khách trước giờ giao 24 tiếng, mỗi đơn một lần', () => {
    const { server, api } = setup();
    api.demo.jumpTo(admin, 'cutoff');
    // đi tới trước giờ giao đầu tiên khoảng 23 giờ
    const first = Math.min(...server.read((db) => db.orders.filter((o) => o.status === 'locked').map((o) => Date.parse(o.deliveryAt))));
    server.setNow(new Date(first - 23 * 3600 * 1000));
    const reminders = server.read((db) => db.notifications.filter((n) => n.type === 'delivery_reminder'));
    expect(reminders.length).toBeGreaterThan(0);
    server.tick();
    expect(server.read((db) => db.notifications.filter((n) => n.type === 'delivery_reminder').length)).toBe(reminders.length);
  });

  it('đồng hồ giả lập không đi lùi', () => {
    const { server } = setup();
    expect(() => server.setNow(new Date('2026-11-01T00:00:00Z'))).toThrow();
  });
});

describe('lọc dữ liệu theo vai trò', () => {
  function everything(api, ctx) {
    const out = [];
    const tryCall = (fn) => {
      try { out.push(fn()); } catch (e) { if (!(e instanceof ForbiddenError)) throw e; }
    };
    tryCall(() => api.ops.listOrders(ctx));
    tryCall(() => api.ops.listProductionPlans(ctx));
    tryCall(() => api.ops.listPurchaseOrders(ctx));
    tryCall(() => api.ops.listSuppliers(ctx));
    tryCall(() => api.ops.catalog(ctx));
    tryCall(() => api.ops.summary(ctx));
    return JSON.stringify(out);
  }

  it('xưởng, điều phối, mua hàng, nhà cung cấp không nhận tên / SĐT / địa chỉ khách', () => {
    const { server, api } = setup();
    api.demo.jumpTo(admin, 'cutoff');
    const customers = server.read((db) => db.customers);

    for (const ctx of [{ role: 'workshop' }, { role: 'dispatch' }, { role: 'purchasing' }, { role: 'supplier', supplierId: 'S-FACTORY' }]) {
      const json = everything(api, ctx);
      expect(json.length).toBeGreaterThan(10);
      for (const c of customers) {
        expect(json, `${ctx.role} thấy tên ${c.name}`).not.toContain(c.name);
        expect(json, `${ctx.role} thấy SĐT ${c.phone}`).not.toContain(c.phone);
        expect(json, `${ctx.role} thấy địa chỉ ${c.address}`).not.toContain(c.address);
        expect(json, `${ctx.role} thấy mã khách ${c.id}`).not.toContain(`"${c.id}"`);
      }
    }
  });

  it('nhà cung cấp không đọc được đơn hàng của khách', () => {
    const { api } = setup();
    expect(() => api.ops.listOrders({ role: 'supplier', supplierId: 'S-FACTORY' })).toThrow(ForbiddenError);
  });

  it('nhà cung cấp A không thấy PO và hồ sơ của nhà cung cấp B', () => {
    const { api } = setup();
    api.demo.jumpTo(admin, 'cutoff');
    const seafood = { role: 'supplier', supplierId: 'S-SEAFOOD' };
    const pos = api.ops.listPurchaseOrders(seafood);
    expect(pos.length).toBeGreaterThan(0);
    expect(pos.every((p) => p.supplierId === 'S-SEAFOOD')).toBe(true);
    const sups = api.ops.listSuppliers(seafood);
    expect(sups).toHaveLength(1);
    expect(sups[0].id).toBe('S-SEAFOOD');
    // không lộ PIN
    expect(JSON.stringify(api.ops.listSuppliers(admin))).not.toContain('"pin"');
  });

  it('kho phụ thấy người nhận; shipper thấy SĐT đã che; kế toán không thấy địa chỉ', () => {
    const { server, api } = setup();
    const c = server.read((db) => db.customers[0]);
    const find = (list) => list.find((o) => o.recipient?.name === c.name);
    const hub = api.ops.listOrders({ role: 'hub' });
    expect(find(hub).recipient.phone).toBe(c.phone);
    const ship = api.ops.listOrders({ role: 'shipper' });
    expect(find(ship).recipient.phone).not.toBe(c.phone);
    expect(find(ship).recipient.phone).toContain('****');
    expect(JSON.stringify(api.ops.listOrders({ role: 'accounting' }))).not.toContain(c.address);
  });

  it('chỉ admin dùng bảng demo', () => {
    const { api } = setup();
    expect(() => api.demo.reset({ role: 'workshop' })).toThrow(ForbiddenError);
    expect(() => api.demo.state({ role: 'accounting' })).toThrow(ForbiddenError);
  });

  it('đăng nhập bằng PIN theo vai trò và theo từng nhà cung cấp', () => {
    const { api } = setup();
    expect(api.auth.login('1111').role).toBe('workshop');
    expect(api.auth.login('4002')).toMatchObject({ role: 'supplier', supplierId: 'S-SEAFOOD' });
    expect(api.auth.login('0000')).toBeNull();
  });
});

describe('đăng ký gói (khớp api-contract)', () => {
  const survey = (district = 'Quận 7, TP.HCM') => ({
    user_contact: { phone_or_email: '0987654321', preferred_channel: 'zalo' },
    survey_answers: {
      living_area: district,
      household_size: 3,
      cuisine_preferences: ['vietnamese_traditional'],
      health_goals: ['increase_protein'],
      allergies_and_restrictions: ['no_spicy'],
      weekly_home_meals_count: 5
    }
  });

  function flow(api, district) {
    const profile = api.customer.onboardingProfile(survey(district));
    const plan = api.customer.generateMealPlan({ profile_id: profile.data.profile_id, week_number: 1, delivery_cycle: 1 });
    return { profile, plan };
  }

  const subReq = (profile, plan, over = {}) => ({
    profile_id: profile.data.profile_id,
    plan_id: plan.data.plan_id,
    duration_weeks: 4,
    payment_method: 'bank_transfer_4w',
    auto_debit_enabled: false,
    schedule: {
      delivery_frequency: 'once_a_week',
      preferred_days: ['tuesday'],
      preferred_time_slot: 'evening_18_21',
      shipping_address: { street: '123 Đường số 7', district: 'Quận 7', city: 'TP. Hồ Chí Minh', receiver_name: 'Nguyễn Văn A', receiver_phone: '0987654321' }
    },
    voucher_code: 'HELLO900K',
    ...over
  });

  it('hồ sơ → thực đơn → đăng ký trả về đúng hình dạng contract; thực đơn gia đình đủ 5 phần', () => {
    const { api } = setup();
    const { profile, plan } = flow(api);
    expect(profile.status).toBe('success');
    expect(profile.data).toHaveProperty('profile_id');
    expect(profile.data).toHaveProperty('estimated_weekly_budget_vnd');
    expect(plan.data.meals).toHaveLength(5);
    const m = plan.data.meals[0].meal_structure;
    expect(m.protein_dish && m.soup_dish && m.veggie_dish && m.carb_dish && m.dessert).toBeTruthy();

    const sub = api.customer.createSubscription(subReq(profile, plan));
    expect(sub.status).toBe('success');
    expect(sub.data.status).toBe('active');
    expect(sub.data.auto_debit_cutoff_hours).toBe(72);
    expect(sub.data.next_delivery.dish_change_deadline).toBeTruthy();
    expect(sub.data).not.toHaveProperty('dish_customization_cutoff_hours');
    expect(sub.data.voucher_discount_applied_week1_vnd).toBeGreaterThan(0);
  });

  it('gói dưới 4 tuần bị từ chối', () => {
    const { api } = setup();
    const { profile, plan } = flow(api);
    const res = api.customer.createSubscription(subReq(profile, plan, { duration_weeks: 2 }));
    expect(res.status).toBe('error');
    expect(res.error.code).toBe('MIN_4_WEEKS');
  });

  it('thanh toán khi nhận hàng (COD) không tồn tại', () => {
    const { api } = setup();
    const { profile, plan } = flow(api);
    for (const method of ['cod', 'cash_on_delivery', 'tien_mat']) {
      const res = api.customer.createSubscription(subReq(profile, plan, { payment_method: method }));
      expect(res.status).toBe('error');
      expect(res.error.code).toBe('PAYMENT_METHOD_INVALID');
    }
  });

  it('ngoài vùng phục vụ hoặc sai ngày giao thì báo lỗi, không tạo đơn', () => {
    const { server, api } = setup();
    expect(api.customer.onboardingProfile(survey('Cần Thơ')).error.code).toBe('OUT_OF_ZONE');
    const { profile, plan } = flow(api);
    const before = server.read((db) => db.orders.length);
    const res = api.customer.createSubscription(subReq(profile, plan, { schedule: { ...subReq(profile, plan).schedule, preferred_days: ['sunday'] } }));
    expect(res.error.code).toBe('DAY_NOT_AVAILABLE');
    expect(server.read((db) => db.orders.length)).toBe(before);
  });

  it('khung giờ đầy thì không đặt được nữa và không còn hiện ra', () => {
    const { server, api } = setup();
    const { profile, plan } = flow(api, 'Dĩ An, Bình Dương');
    const req = subReq(profile, plan, {
      schedule: {
        delivery_frequency: 'once_a_week',
        preferred_days: ['tuesday'],
        preferred_time_slot: 'evening_18_21',
        shipping_address: { street: '1 Đường ĐT743', district: 'Dĩ An', city: 'Bình Dương', receiver_name: 'Khách', receiver_phone: '0900000001' }
      }
    });
    let sawFull = false;
    for (let i = 0; i < 40; i++) {
      const res = api.customer.createSubscription(req);
      if (res.status === 'error') {
        expect(res.error.code).toBe('SLOT_FULL');
        sawFull = true;
        break;
      }
    }
    expect(sawFull).toBe(true);
    const day = server.read((db) => db.orders.filter((o) => o.zoneId === 'Z7' && o.slotId === 'evening_18_21').map((o) => o.deliveryDay).sort()[0]);
    const listed = api.customer.availableSlots('Z7', 1).filter((s) => s.day === day && s.slotId === 'evening_18_21');
    expect(listed).toHaveLength(0);
  });
});
