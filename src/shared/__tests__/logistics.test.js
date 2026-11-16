import { describe, it, expect } from 'vitest';
import { createServer } from '../mock-server/server';
import { createMemoryStorage } from '../mock-server/storage';
import { createApi, ForbiddenError } from '../api';
import { BUSINESS, getZone } from '../config/business';
import { geocode } from '../data/geo';
import { availableSlots, slotCapacity, slotUsage } from '../domain/delivery';
import { scopeKey } from '../domain/factory';
import {
  applyRecovery, breachesByPoint, checkCapacityChange, checkRecovery, coldAlerts, computeKpis, costPerBox, evaluateTemp, mapsSearchUrl, orderStops,
  planRoutes, recoveryExpected, redeliveryOptions, routeCostVnd, routeFitsWindow, suggestDayMerges, zoneCapacityDays
} from '../domain/logistics';

const START = '2026-11-20T09:00:00+07:00'; // Thứ Sáu
const admin = { role: 'admin' };
const hub = { role: 'hub' };
const dispatch = { role: 'dispatch' };
const workshop = { role: 'workshop' };
const accounting = { role: 'accounting' };
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const shipperCtx = (id = 'SH-01') => ({ role: 'shipper', shipperId: id });

function setup() {
  const server = createServer({ storage: createMemoryStorage(), startAt: START, running: false });
  return { server, api: createApi(server) };
}

/** Chốt sổ, dựng chuyến xe mẫu (xuất bến cả hai chuyến) và trả về ngày giao. */
function readyDay(api) {
  api.demo.jumpTo(admin, 'cutoff');
  const seeded = api.demo.seedTrips(admin);
  return seeded.day;
}

/** Nhận đủ cả hai chuyến của ngày `day` (tích hết thùng). */
function receiveAll(api, day, { skip = [] } = {}) {
  const board = api.ops.hub.arrivals(hub, day);
  for (const t of board.trips) {
    if (t.closed) continue;
    for (const m of t.manifest) if (!skip.includes(m.orderId)) api.ops.hub.scanArrival(hub, { scope: t.scope, code: m.orderId });
    api.ops.hub.closeArrival(hub, { scope: t.scope, tempC: 2.8, photo: PHOTO });
  }
}

/** Ghép hải sản cho mọi đơn có hải sản của ngày. */
function packAllSeafood(api, day) {
  const board = api.ops.hub.seafood(hub, day);
  for (const o of board.orders) {
    if (!o.atHub || o.packed) continue;
    for (const it of o.items) api.ops.hub.tickSeafood(hub, { orderId: o.orderId, key: it.key, count: it.bags });
    api.ops.hub.closeSeafood(hub, { orderId: o.orderId });
  }
}

// ---------------------------------------------------------------------------------------------
describe('sức chứa khung giờ', () => {
  const zone = getZone('Z7');
  const slot = zone.slots[0];

  it('ưu tiên ghi đè theo (khu, ngày, khung), rồi mọi ngày, rồi cấu hình', () => {
    const o = { 'Z7|2026-11-24|evening_18_21': 5, 'Z7|*|evening_18_21': 9 };
    expect(slotCapacity(o, 'Z7', '2026-11-24', slot)).toBe(5);
    expect(slotCapacity(o, 'Z7', '2026-11-27', slot)).toBe(9);
    expect(slotCapacity({}, 'Z7', '2026-11-27', slot)).toBe(slot.capacityBoxes);
    expect(slotCapacity(null, 'Z7', '2026-11-27', slot)).toBe(slot.capacityBoxes);
    expect(slotCapacity({ 'Z7|*|evening_18_21': 0 }, 'Z7', '2026-11-27', slot)).toBe(0);
  });

  it('hạ sức chứa dưới số đã đặt bị chặn trừ khi xác nhận, và báo số thùng vượt', () => {
    expect(checkCapacityChange({ capacityBoxes: 10, used: 4 })).toEqual({ ok: true, overbooked: 0 });
    const r = checkCapacityChange({ capacityBoxes: 3, used: 7 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('CAPACITY_BELOW_USED');
    expect(r.overbooked).toBe(4);
    expect(checkCapacityChange({ capacityBoxes: 3, used: 7, allowBelowUsed: true })).toEqual({ ok: true, overbooked: 4 });
    expect(checkCapacityChange({ capacityBoxes: -1, used: 0 }).code).toBe('CAPACITY_INVALID');
    expect(checkCapacityChange({ capacityBoxes: 1.5, used: 0 }).code).toBe('CAPACITY_INVALID');
    expect(checkCapacityChange({ capacityBoxes: 501, used: 0 }).code).toBe('CAPACITY_INVALID');
  });

  it('availableSlots (app khách) dùng sức chứa ghi đè: còn chỗ thì hiện, hết chỗ thì ẩn', () => {
    const { server, api } = setup();
    const now = server.now();
    const day = availableSlots([], 'Z7', now, 1)[0].day;
    expect(availableSlots([], 'Z7', now, 1).find((s) => s.day === day).remaining).toBe(20);
    const ov = { [`Z7|${day}|evening_18_21`]: 0 };
    expect(availableSlots([], 'Z7', now, 1, BUSINESS, ov).filter((s) => s.day === day)).toHaveLength(0);
    // Qua API: điều phối đặt sức chứa 0, app khách không còn thấy khung đó
    const used = server.read((db) => slotUsage(db.orders, 'Z7', day, 'evening_18_21'));
    const r = api.ops.logistics.setCapacity(dispatch, { zoneId: 'Z7', day, slotId: 'evening_18_21', capacityBoxes: 0, allowBelowUsed: true });
    expect(r.capacityBoxes).toBe(0);
    expect(r.overbooked).toBe(used);
    expect(api.customer.availableSlots('Z7', 1).filter((s) => s.day === day)).toHaveLength(0);
    // Bỏ ghi đè thì khung hiện lại với số trong cấu hình
    api.ops.logistics.setCapacity(dispatch, { zoneId: 'Z7', day, slotId: 'evening_18_21', capacityBoxes: null });
    expect(api.customer.availableSlots('Z7', 1).filter((s) => s.day === day && s.slotId === 'evening_18_21')[0].remaining).toBe(20 - used);
  });

  it('không đặt được vượt sức chứa: sức chứa ghi đè nhỏ hơn thì đơn mới báo SLOT_FULL', () => {
    const { server, api } = setup();
    const survey = {
      survey_answers: { household_size: 2, meals_per_week: 3, health_goals: [], dietary_restrictions: [], location: 'Dĩ An, Bình Dương' }
    };
    void survey;
    // Dùng hạt giống: một khung của Z1 đã có đơn; đặt sức chứa bằng đúng số đã đặt thì khung không còn chỗ
    const row = server.read((db) => {
      const o = db.orders.find((x) => x.zoneId === 'Z1' && x.status !== 'cancelled');
      return { day: o.deliveryDay, slotId: o.slotId, used: slotUsage(db.orders, 'Z1', o.deliveryDay, o.slotId) };
    });
    const r = api.ops.logistics.setCapacity(dispatch, { zoneId: 'Z1', day: row.day, slotId: row.slotId, capacityBoxes: row.used });
    expect(r.overbooked).toBe(0);
    const cap = api.ops.logistics.capacityBoard(dispatch).zones.find((z) => z.zoneId === 'Z1');
    const cell = cap.days.find((d) => d.day === row.day).slots.find((s) => s.slotId === row.slotId);
    expect(cell.remaining).toBe(0);
    expect(cell.overridden).toBe(true);
    expect(api.customer.availableSlots('Z1', 6).some((s) => s.day === row.day && s.slotId === row.slotId)).toBe(false);
    // Server từ chối đặt thêm (findFullSlots đọc sức chứa ghi đè)
    const full = server.read((db) => db.logistics.capacity);
    expect(Object.values(full)).toContain(row.used);
  });

  it('đăng ký qua phễu không vượt sức chứa ghi đè: đủ chỗ thì được, hết chỗ thì SLOT_FULL và đơn đã đặt không bị đụng', () => {
    const { server, api } = setup();
    const survey = {
      user_contact: { phone_or_email: '0987654321', preferred_channel: 'zalo' },
      survey_answers: { living_area: 'Dĩ An, Bình Dương', household_size: 3, cuisine_preferences: ['vietnamese_traditional'], health_goals: ['increase_protein'], allergies_and_restrictions: ['no_spicy'], weekly_home_meals_count: 5 }
    };
    const profile = api.customer.onboardingProfile(survey);
    const plan = api.customer.generateMealPlan({ profile_id: profile.data.profile_id, week_number: 1, delivery_cycle: 1 });
    const req = {
      profile_id: profile.data.profile_id, plan_id: plan.data.plan_id, duration_weeks: 4, payment_method: 'bank_transfer_4w', auto_debit_enabled: false,
      schedule: { delivery_frequency: 'once_a_week', preferred_days: ['tuesday'], preferred_time_slot: 'evening_18_21', shipping_address: { street: '1 Đường ĐT743', district: 'Dĩ An', city: 'Bình Dương', receiver_name: 'Khách', receiver_phone: '0900000001' } },
      voucher_code: 'HELLO900K'
    };
    const days = () => server.read((db) => [...new Set(db.orders.filter((o) => o.zoneId === 'Z7' && o.slotId === 'evening_18_21').map((o) => o.deliveryDay))].sort());
    // Mỗi lần đăng ký thêm một thùng vào khung tối thứ Ba của Z7 (4 tuần). Ghi đè sức chứa mọi ngày = số đã đặt nhiều nhất + 3.
    const base = Math.max(0, ...days().map((d) => server.read((db) => slotUsage(db.orders, 'Z7', d, 'evening_18_21'))));
    const cap = base + 3;
    api.ops.logistics.setCapacity(dispatch, { zoneId: 'Z7', slotId: 'evening_18_21', capacityBoxes: cap });
    let ok = 0;
    let full = null;
    for (let i = 0; i < 8; i++) {
      const res = api.customer.createSubscription(req);
      if (res.status === 'error') { full = res.error.code; break; }
      ok += 1;
    }
    expect(full).toBe('SLOT_FULL');
    expect(ok).toBe(3);
    const used = server.read((db) => {
      const firstDay = [...new Set(db.orders.filter((o) => o.zoneId === 'Z7' && o.slotId === 'evening_18_21').map((o) => o.deliveryDay))].sort()[0];
      return slotUsage(db.orders, 'Z7', firstDay, 'evening_18_21');
    });
    expect(used).toBeLessThanOrEqual(cap);
    // Mọi khung, mọi ngày: số thùng đã đặt không vượt sức chứa ghi đè
    for (const d of days()) expect(server.read((db) => slotUsage(db.orders, 'Z7', d, 'evening_18_21'))).toBeLessThanOrEqual(cap);
    // Nâng sức chứa thì đặt tiếp được
    api.ops.logistics.setCapacity(dispatch, { zoneId: 'Z7', slotId: 'evening_18_21', capacityBoxes: cap + 2 });
    expect(api.customer.createSubscription(req).status).toBe('success');
  });

  it('hạ dưới số đã đặt: API chặn, xác nhận thì cho và cảnh báo vượt', () => {
    const { server, api } = setup();
    const row = server.read((db) => {
      const o = db.orders.find((x) => x.zoneId === 'Z1');
      return { day: o.deliveryDay, slotId: o.slotId, used: slotUsage(db.orders, 'Z1', o.deliveryDay, o.slotId) };
    });
    expect(row.used).toBeGreaterThan(1);
    expect(() => api.ops.logistics.setCapacity(dispatch, { zoneId: 'Z1', day: row.day, slotId: row.slotId, capacityBoxes: 1 })).toThrow(/Đơn đã đặt vẫn phải giao/);
    const r = api.ops.logistics.setCapacity(dispatch, { zoneId: 'Z1', day: row.day, slotId: row.slotId, capacityBoxes: 1, allowBelowUsed: true });
    expect(r.overbooked).toBe(row.used - 1);
    const board = api.ops.logistics.capacityBoard(dispatch);
    expect(board.overbookedTotal).toBe(row.used - 1);
    const z = board.zones.find((x) => x.zoneId === 'Z1');
    expect(z.days.find((d) => d.day === row.day).slots.find((s) => s.slotId === row.slotId).overbooked).toBe(row.used - 1);
    // Các đơn đã đặt không bị hủy
    expect(server.read((db) => slotUsage(db.orders, 'Z1', row.day, row.slotId))).toBe(row.used);
  });

  it('gợi ý gộp ngày cho khu ít đơn khi vừa sức chứa cùng tuần', () => {
    const mk = (day, slots) => ({ day, slots, used: slots.reduce((s, x) => s + x.used, 0), capacity: slots.reduce((s, x) => s + x.capacity, 0), fillPct: slots.reduce((s, x) => s + x.used, 0) / slots.reduce((s, x) => s + x.capacity, 0) });
    const cell = (used, capacity) => ({ slotId: 'm', used, capacity });
    const boards = [
      { zoneId: 'Z9', name: 'Khu thử', days: [mk('2026-11-23', [cell(2, 30)]), mk('2026-11-26', [cell(20, 30)]), mk('2026-11-30', [cell(25, 30)])] },
      { zoneId: 'Z8', name: 'Khu đầy', days: [mk('2026-11-23', [cell(20, 30)]), mk('2026-11-26', [cell(20, 30)])] }
    ];
    const s = suggestDayMerges(boards, 0.35);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ zoneId: 'Z9', fromDay: '2026-11-23', toDay: '2026-11-26', moveBoxes: 2 });
    // Không gợi ý khi dồn vào sẽ vượt sức chứa
    boards[0].days[1] = mk('2026-11-26', [cell(29, 30)]);
    expect(suggestDayMerges(boards, 0.35)).toHaveLength(0);
  });

  it('bảng sức chứa tính còn lại, vượt và độ lấp đầy', () => {
    const orders = [];
    for (let i = 0; i < 5; i++) orders.push({ zoneId: 'Z7', deliveryDay: '2026-11-24', slotId: 'evening_18_21', status: 'paid' });
    const days = zoneCapacityDays(orders, getZone('Z7'), '2026-11-20', { 'Z7|2026-11-24|evening_18_21': 3 }, 2);
    const cell = days.find((d) => d.day === '2026-11-24').slots[0];
    expect(cell).toMatchObject({ capacity: 3, configCapacity: 20, used: 5, remaining: 0, overbooked: 2, overridden: true });
    expect(cell.fillPct).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('lập tuyến chặng cuối (bản mock)', () => {
  const zones = BUSINESS.zones;
  const mkStops = (n, zoneId = 'Z1') => {
    const z = zones.find((x) => x.id === zoneId);
    return Array.from({ length: n }, (_, i) => {
      const district = z.districts[i % z.districts.length];
      const g = geocode(`${10 + i * 7} đường Lê Lợi, ${district}`, district);
      return { orderId: `ORD-${String(i + 1).padStart(5, '0')}`, zoneId, district, ward: g.ward, wardIndex: g.wardIndex, street: g.street, no: g.no };
    });
  };
  const SH = [
    { id: 'SH-01', capacityBoxes: 15 }, { id: 'SH-02', capacityBoxes: 15 }, { id: 'SH-03', capacityBoxes: 12 }, { id: 'SH-04', capacityBoxes: 12 }
  ];

  it('không bao giờ vượt sức chở của shipper, mọi điểm giao được xếp đúng một lần', () => {
    for (const n of [0, 1, 5, 12, 15, 16, 27, 30, 40, 54, 55, 60]) {
      const stops = mkStops(n);
      const r = planRoutes({ stops, shippers: SH });
      for (const route of r.routes) {
        expect(route.boxes).toBeLessThanOrEqual(route.capacityBoxes);
        expect(route.stops.reduce((s, x) => s + x.boxes, 0)).toBe(route.boxes);
      }
      const assigned = r.routes.flatMap((x) => x.stops.map((s) => s.orderId));
      expect(new Set(assigned).size).toBe(assigned.length);
      expect(assigned.length + r.unassigned.length).toBe(n);
      // Tổng sức chở 54 thùng: dư thì vào unassigned
      expect(r.unassigned.length).toBe(Math.max(0, n - 54));
    }
  });

  it('dùng ít shipper nhất và chia cân bằng (16 đơn: 2 tuyến 8 + 8, không phải 15 + 1)', () => {
    const r16 = planRoutes({ stops: mkStops(16), shippers: SH });
    expect(r16.routes.map((x) => x.boxes)).toEqual([8, 8]);
    const r15 = planRoutes({ stops: mkStops(15), shippers: SH });
    expect(r15.routes).toHaveLength(1);
    expect(r15.routes[0].boxes).toBe(15);
    const r3 = planRoutes({ stops: mkStops(3), shippers: SH });
    expect(r3.routes).toHaveLength(1);
  });

  it('sức chở của từng shipper được tôn trọng khi sức chở khác nhau', () => {
    const r = planRoutes({ stops: mkStops(20), shippers: [{ id: 'A', capacityBoxes: 5 }, { id: 'B', capacityBoxes: 12 }, { id: 'C', capacityBoxes: 4 }] });
    for (const route of r.routes) expect(route.boxes).toBeLessThanOrEqual(route.capacityBoxes);
    expect(r.routes.reduce((s, x) => s + x.boxes, 0) + r.unassigned.length).toBe(20);
    expect(r.unassigned.length).toBe(0); // 5 + 12 + 4 = 21 đủ chở 20
    const small = planRoutes({ stops: mkStops(9), shippers: [{ id: 'A', capacityBoxes: 4 }] });
    expect(small.routes[0].boxes).toBe(4);
    expect(small.unassigned).toHaveLength(5);
    expect(small.unassigned[0].reason).toBe('NO_CAPACITY');
    expect(planRoutes({ stops: mkStops(2), shippers: [] }).unassigned[0].reason).toBe('NO_SHIPPER');
  });

  it('gom theo khu → phường → đường → số nhà: thứ tự điểm không đi lòng vòng', () => {
    const stops = [...mkStops(6, 'Z3'), ...mkStops(6, 'Z1')].map((s, i) => ({ ...s, orderId: `X${i}` }));
    const ordered = orderStops(stops);
    const zi = (s) => zones.findIndex((z) => z.id === s.zoneId);
    for (let i = 1; i < ordered.length; i++) expect(zi(ordered[i])).toBeGreaterThanOrEqual(zi(ordered[i - 1]));
    // Trong một khu, phường chỉ đổi khi sang phường khác (không quay lại phường cũ)
    const z1 = ordered.filter((s) => s.zoneId === 'Z1');
    const seen = [];
    for (const s of z1) {
      const k = `${s.district}|${s.ward}`;
      if (!seen.length || seen[seen.length - 1] !== k) {
        expect(seen).not.toContain(k);
        seen.push(k);
      }
    }
    // Kết quả lập tuyến giữ đúng thứ tự đó
    const r = planRoutes({ stops, shippers: SH });
    expect(r.routes.flatMap((x) => x.stops.map((s) => s.orderId))).toEqual(ordered.map((s) => s.orderId));
    expect(r.engine).toMatch(/mock/i);
  });

  it('phường giả ổn định: cùng đường, cùng dãy số nhà thì cùng phường', () => {
    const a = geocode('12 đường Lê Lợi, Quận 1', 'Quận 1');
    const b = geocode('15 đường Lê Lợi, Quận 1', 'Quận 1');
    expect(a.ward).toBe(b.ward);
    expect(geocode('12 đường Lê Lợi, Quận 1').district).toBe('Quận 1');
    expect(geocode('12 đường Lê Lợi, Quận 1', 'Quận 1')).toEqual(a);
  });

  it('khung giờ: tuyến dài hơn khung thì báo không vừa', () => {
    const slot = getZone('Z1').slots[0]; // 06:00 - 08:00 = 120 phút
    expect(routeFitsWindow(100, '2026-11-24', slot)).toBe(true);
    expect(routeFitsWindow(121, '2026-11-24', slot)).toBe(false);
  });

  it('giao lại: các khung muộn hơn cùng ngày rồi ngày giao kế tiếp', () => {
    const o = redeliveryOptions({ zoneId: 'Z1', day: '2026-11-23', slotId: 'early_morning_06_08' }, '2026-11-23');
    expect(o.map((x) => `${x.day}|${x.slotId}`)).toEqual(['2026-11-23|noon_11_13', '2026-11-23|evening_18_21', '2026-11-26|early_morning_06_08']);
    const last = redeliveryOptions({ zoneId: 'Z1', day: '2026-11-23', slotId: 'evening_18_21' }, '2026-11-23');
    expect(last).toHaveLength(1);
    expect(last[0].sameDay).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
describe('chuỗi lạnh', () => {
  it('ngưỡng ngăn mát 0–4°C (kể cả đúng ngưỡng) và ngăn đông ≤ −18°C', () => {
    expect(evaluateTemp('chill', 0).ok).toBe(true);
    expect(evaluateTemp('chill', 4).ok).toBe(true);
    expect(evaluateTemp('chill', 2.3).ok).toBe(true);
    expect(evaluateTemp('chill', 4.1)).toMatchObject({ ok: false, status: 'high' });
    expect(evaluateTemp('chill', -0.5)).toMatchObject({ ok: false, status: 'low' });
    expect(evaluateTemp('frozen', -18).ok).toBe(true);
    expect(evaluateTemp('frozen', -22).ok).toBe(true);
    expect(evaluateTemp('frozen', -17.9)).toMatchObject({ ok: false, status: 'high' });
    expect(evaluateTemp('chill', NaN).ok).toBe(false);
    expect(evaluateTemp('chill', '3').ok).toBe(false);
  });

  it('cảnh báo chỉ cho số đo vượt ngưỡng và mang quyết định của QC', () => {
    const readings = [
      { id: 'a', point: 'factory_depart', ref: 's', cls: 'chill', tempC: 2, at: 't' },
      { id: 'b', point: 'hub_receive', ref: 's', cls: 'chill', tempC: 6, at: 't' },
      { id: 'c', point: 'hub_dispatch', ref: 'r', cls: 'frozen', tempC: -10, at: 't' },
      { id: 'd', point: 'delivery', ref: 'o', cls: 'chill', tempC: 3.9, at: 't' }
    ];
    const al = coldAlerts(readings, { b: { decision: 'keep' } });
    expect(al.map((x) => x.id)).toEqual(['b', 'c']);
    expect(al[0].decision.decision).toBe('keep');
    expect(al[1].decision).toBeNull();
    const by = breachesByPoint(readings);
    expect(by).toMatchObject({ total: 2, hub_receive: 1, hub_dispatch: 1, factory_depart: 0, delivery: 0 });
  });
});

// ---------------------------------------------------------------------------------------------
describe('chi phí mỗi thùng và KPI', () => {
  it('chi phí logistics mỗi thùng = (xe chặng dài + kho phụ + chặng cuối) / số thùng', () => {
    const c = costPerBox({ longHaulVnd: 9000000, hubVnd: 2150000, lastMileVnd: 850000, boxes: 120 });
    expect(c.totalVnd).toBe(12000000);
    expect(c.perBoxVnd).toBe(100000);
    expect(c.perBox).toEqual({ longHaulVnd: 75000, hubVnd: 17917, lastMileVnd: 7083 });
    expect(c.parts).toEqual({ longHaulVnd: 9000000, hubVnd: 2150000, lastMileVnd: 850000 });
    // Làm tròn tới đồng; không có thùng thì không chia
    expect(costPerBox({ longHaulVnd: 100, hubVnd: 0, lastMileVnd: 0, boxes: 3 }).perBoxVnd).toBe(33);
    expect(costPerBox({ longHaulVnd: 1000, boxes: 0 }).perBoxVnd).toBe(0);
  });

  it('chi phí một tuyến: khoản tuyến + từng điểm + từng lần giao hụt', () => {
    const m = BUSINESS.logistics.lastMile;
    expect(routeCostVnd({ stops: 10, failedAttempts: 0 })).toBe(m.routeBaseVnd + 10 * m.perStopVnd);
    expect(routeCostVnd({ stops: 10, failedAttempts: 2 })).toBe(m.routeBaseVnd + 10 * m.perStopVnd + 2 * m.perFailedAttemptVnd);
  });

  it('KPI: đúng giờ %, giao thất bại %, điểm giao / giờ, thùng / xe, chi phí / thùng, vượt nhiệt', () => {
    const end = '2026-11-24T01:00:00.000Z'; // 08:00 giờ Việt Nam
    const k = computeKpis({
      stops: [
        { status: 'delivered', deliveredAt: '2026-11-24T00:30:00.000Z', windowEnd: end, failedAttempts: 0 },
        { status: 'delivered', deliveredAt: '2026-11-24T00:50:00.000Z', windowEnd: end, failedAttempts: 0 },
        { status: 'delivered', deliveredAt: '2026-11-24T01:20:00.000Z', windowEnd: end, failedAttempts: 0 },
        { status: 'delivered', deliveredAt: '2026-11-24T00:10:00.000Z', windowEnd: end, failedAttempts: 1 },
        { status: 'failed', deliveredAt: null, windowEnd: end, failedAttempts: 1 }
      ],
      routes: [{ stops: 8, boxes: 10, startAt: '2026-11-23T23:00:00.000Z', endAt: '2026-11-24T01:00:00.000Z' }],
      trips: [{ boxes: 60 }, { boxes: 40 }],
      costs: [{ totalVnd: 6000000, boxes: 60 }, { totalVnd: 4000000, boxes: 40 }],
      breaches: 3
    });
    expect(k.onTimePct).toBe(0.75);
    expect(k.failPct).toBeCloseTo(2 / 6);
    expect(k.stopsPerHour).toBe(4);
    expect(k.stopsPerRoute).toBe(10);
    expect(k.boxesPerTruck).toBe(50);
    expect(k.costPerBoxVnd).toBe(100000);
    expect(k.tempBreaches).toBe(3);
    // Chưa có dữ liệu thì để trống chứ không báo 0%
    const empty = computeKpis({});
    expect(empty.onTimePct).toBeNull();
    expect(empty.failPct).toBeNull();
    expect(empty.costPerBoxVnd).toBeNull();
  });

  it('điểm giao / giờ không bị thổi phồng khi tuyến quá ngắn (tối thiểu 15 phút)', () => {
    const k = computeKpis({ routes: [{ stops: 3, boxes: 3, startAt: '2026-11-24T00:00:00.000Z', endAt: '2026-11-24T00:00:05.000Z' }] });
    expect(k.stopsPerHour).toBe(12);
  });
});

describe('thu hồi thùng xốp và túi gel', () => {
  it('đếm số đang ở nhà khách, kiểm số thu về và cập nhật sau mỗi lần giao', () => {
    const rec = BUSINESS.logistics.recovery;
    expect(recoveryExpected(null)).toEqual({ foam: 0, gel: 0 });
    const first = applyRecovery(null, { foam: 0, gel: 0 });
    expect(first).toEqual({ foam: rec.foamBoxesPerBox, gel: rec.gelPacksPerBox });
    expect(recoveryExpected(first)).toEqual(first);
    expect(checkRecovery({ foam: 1, gel: 2 }, first)).toEqual({ ok: true, foam: 1, gel: 2 });
    expect(checkRecovery({ foam: 2, gel: 0 }, first).code).toBe('RECOVERY_EXCEEDS');
    expect(checkRecovery({ foam: -1, gel: 0 }, first).code).toBe('RECOVERY_INVALID');
    expect(checkRecovery({ foam: 0.5, gel: 0 }, first).code).toBe('RECOVERY_INVALID');
    // Giao lần hai, thu đủ: vẫn còn đúng bộ của lần hai
    expect(applyRecovery(first, { foam: 1, gel: 2 })).toEqual(first);
    // Không thu: tích lũy
    expect(applyRecovery(first, { foam: 0, gel: 0 })).toEqual({ foam: 2, gel: 4 });
    // Tắt trong cấu hình thì không đếm
    const off = { ...BUSINESS, logistics: { ...BUSINESS.logistics, recovery: { ...rec, enabled: false } } };
    expect(recoveryExpected(first, off)).toEqual({ foam: 0, gel: 0 });
    expect(applyRecovery(first, { foam: 0, gel: 0 }, off)).toEqual({ foam: 0, gel: 0 });
    expect(checkRecovery({ foam: 5, gel: 5 }, { foam: 0, gel: 0 }, off).ok).toBe(true);
  });

  it('link Google Maps tìm theo địa chỉ, không cần API key', () => {
    const url = mapsSearchUrl('12 đường Lê Lợi, Quận 1');
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=12%20%C4%91%C6%B0%E1%BB%9Dng%20L%C3%AA%20L%E1%BB%A3i%2C%20Qu%E1%BA%ADn%201');
    expect(url).not.toMatch(/key=/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('luồng kho phụ → tuyến → shipper (API)', () => {
  it('nhận xe thiếu 1 thùng: cảnh báo, tạo ngoại lệ, thùng đó không lên tuyến', () => {
    const { server, api } = setup();
    const day = readyDay(api);
    const before = api.ops.hub.arrivals(hub, day);
    expect(before.trips.length).toBe(2);
    const t = before.trips.find((x) => x.manifest.length > 1);
    const missingId = t.manifest[0].orderId;
    for (const m of t.manifest) if (m.orderId !== missingId) api.ops.hub.scanArrival(hub, { scope: t.scope, code: m.orderId });
    // Thiếu thùng thì cần ảnh
    expect(() => api.ops.hub.closeArrival(hub, { scope: t.scope, tempC: 2.5 })).toThrow(/cần 1 ảnh/);
    const res = api.ops.hub.closeArrival(hub, { scope: t.scope, tempC: 2.5, photo: PHOTO });
    expect(res.missing).toEqual([missingId]);
    expect(res.exceptions).toHaveLength(1);
    const ex = api.ops.logistics.exceptions(dispatch);
    expect(ex.open.find((e) => e.orderId === missingId)).toMatchObject({ kind: 'missing_box', status: 'open' });
    // Sau khi chốt thì không tích thêm được
    expect(() => api.ops.hub.scanArrival(hub, { scope: t.scope, code: missingId })).toThrow(/Đã chốt nhận xe/);
    receiveAll(api, day);
    packAllSeafood(api, day);
    const stops = server.read((db) => db.logistics.arrivals[t.scope]);
    expect(stops.missing).toEqual([missingId]);
    const board = api.ops.routes.board(hub, day);
    const slotOfOrder = server.read((db) => db.orders.find((o) => o.id === missingId).slotId);
    const slot = board.slots.find((s) => s.slotId === slotOfOrder);
    expect(slot.waiting.find((w) => w.orderId === missingId)).toMatchObject({ reason: 'exception' });
    const plan = api.ops.routes.plan(hub, { day, slotId: slotOfOrder });
    const routed = api.ops.routes.board(hub, day).slots.find((s) => s.slotId === slotOfOrder).routes.flatMap((r) => r.stops.map((s) => s.orderId));
    expect(routed).not.toContain(missingId);
    expect(plan.routes.length).toBeGreaterThan(0);
  });

  it('thừa và hỏng được ghi nhận; mã lạ vào danh sách thừa', () => {
    const { api } = setup();
    const day = readyDay(api);
    const t = api.ops.hub.arrivals(hub, day).trips[0];
    expect(api.ops.hub.scanArrival(hub, { scope: t.scope, code: 'ORD-99999' }).result).toBe('extra');
    api.ops.hub.scanArrival(hub, { scope: t.scope, code: t.manifest[0].orderId, state: 'damaged' });
    for (const m of t.manifest.slice(1)) api.ops.hub.scanArrival(hub, { scope: t.scope, code: m.orderId });
    const r = api.ops.hub.closeArrival(hub, { scope: t.scope, tempC: 3, photo: PHOTO });
    expect(r.extra).toEqual(['ORD-99999']);
    expect(r.damaged).toEqual([t.manifest[0].orderId]);
    expect(r.missing).toEqual([]);
    const ex = api.ops.logistics.exceptions(dispatch);
    expect(ex.open.some((e) => e.kind === 'damaged_box' && e.orderId === t.manifest[0].orderId)).toBe(true);
  });

  it('nhiệt độ nhận vượt ngưỡng sinh cảnh báo, QC giữ hoặc hủy; hủy thì mỗi đơn thành ngoại lệ', () => {
    const { api } = setup();
    const day = readyDay(api);
    const t = api.ops.hub.arrivals(hub, day).trips[0];
    for (const m of t.manifest) api.ops.hub.scanArrival(hub, { scope: t.scope, code: m.orderId });
    expect(() => api.ops.hub.closeArrival(hub, { scope: t.scope, tempC: 7.5 })).toThrow(/ảnh/);
    api.ops.hub.closeArrival(hub, { scope: t.scope, tempC: 7.5, photo: PHOTO });
    const cc = api.ops.logistics.coldChain(dispatch, { day });
    const alert = cc.alerts.find((a) => a.point === 'hub_receive');
    expect(alert).toMatchObject({ tempC: 7.5, status: 'high', decision: null });
    expect(alert.orders).toBe(t.manifest.length);
    expect(cc.openAlerts).toBeGreaterThan(0);
    // Xuất xưởng bình thường (2.5°C) không có cảnh báo
    expect(cc.alerts.some((a) => a.point === 'factory_depart')).toBe(false);
    const dec = api.ops.logistics.decideCold(hub, { id: alert.id, decision: 'discard', note: 'Mùi lạ' });
    expect(dec.exceptions).toHaveLength(t.manifest.length);
    expect(() => api.ops.logistics.decideCold(hub, { id: alert.id, decision: 'keep' })).toThrow(/đã có quyết định/);
    const after = api.ops.logistics.coldChain(dispatch, { day });
    expect(after.alerts.find((a) => a.id === alert.id).decision.decision).toBe('discard');
    expect(api.ops.logistics.exceptions(dispatch).open.filter((e) => e.kind === 'cold_discard')).toHaveLength(t.manifest.length);
    // Xưởng không quyết định được
    expect(() => api.ops.logistics.decideCold(workshop, { id: alert.id, decision: 'keep' })).toThrow(ForbiddenError);
  });

  it('ghép hải sản: tích đủ túi mới chốt, trừ tồn kho phụ theo FEFO và ghi lô', () => {
    const { server, api } = setup();
    const day = readyDay(api);
    const board0 = api.ops.hub.seafood(hub, day);
    expect(board0.orders.length).toBeGreaterThan(0);
    const o = board0.orders[0];
    expect(o.atHub).toBe(false);
    expect(() => api.ops.hub.tickSeafood(hub, { orderId: o.orderId, key: o.items[0].key, count: 1 })).toThrow(/chưa về kho phụ/);
    receiveAll(api, day);
    const o1 = api.ops.hub.seafood(hub, day).orders.find((x) => x.orderId === o.orderId);
    expect(o1.atHub).toBe(true);
    expect(() => api.ops.hub.closeSeafood(hub, { orderId: o.orderId })).toThrow(/Còn thiếu túi/);
    const stockBefore = server.read((db) => db.procurement.stock.filter((s) => s.sku === o.items[0].key).reduce((s, l) => s + l.qty, 0));
    for (const it of o1.items) api.ops.hub.tickSeafood(hub, { orderId: o.orderId, key: it.key, count: it.bags });
    const r = api.ops.hub.closeSeafood(hub, { orderId: o.orderId });
    expect(r.lots.length).toBeGreaterThan(0);
    expect(r.shortKg).toBe(0);
    const stockAfter = server.read((db) => db.procurement.stock.filter((s) => s.sku === o.items[0].key).reduce((s, l) => s + l.qty, 0));
    expect(stockAfter).toBeLessThan(stockBefore);
    const done = api.ops.hub.seafood(hub, day).orders.find((x) => x.orderId === o.orderId);
    expect(done.packed).toBe(true);
    // Chốt lại không trừ kho lần hai
    api.ops.hub.closeSeafood(hub, { orderId: o.orderId });
    expect(server.read((db) => db.procurement.stock.filter((s) => s.sku === o.items[0].key).reduce((s, l) => s + l.qty, 0))).toBe(stockAfter);
    // Thùng có hải sản chưa ghép thì chưa lên tuyến
    const other = api.ops.hub.seafood(hub, day).orders.find((x) => !x.packed);
    if (other) {
      const slot = api.ops.routes.board(hub, day).slots.find((s) => s.slotId === other.slotId);
      expect(slot.waiting.some((w) => w.orderId === other.orderId && w.reason === 'seafood')).toBe(true);
    }
  });

  it('quyền: điều phối và xưởng không thấy PII; kho phụ thấy người nhận để in phiếu tuyến', () => {
    const { server, api } = setup();
    const day = readyDay(api);
    receiveAll(api, day);
    packAllSeafood(api, day);
    const slotId = api.ops.routes.board(hub, day).slots.find((s) => s.eligible > 0).slotId;
    api.ops.routes.plan(dispatch, { day, slotId });
    const forDispatch = api.ops.routes.board(dispatch, day);
    const text = JSON.stringify(forDispatch);
    expect(forDispatch.canSeeRecipient).toBe(false);
    const pii = server.read((db) => db.customers.flatMap((c) => [c.name, c.phone, c.address]));
    for (const v of pii) expect(text).not.toContain(v);
    expect(text).not.toMatch(/"phone"|"address"|customerId|amountVnd|"street"|"no":/);
    const forHub = api.ops.routes.board(hub, day);
    const stop = forHub.slots.flatMap((s) => s.routes).flatMap((r) => r.stops)[0];
    expect(stop.recipient.phone).toMatch(/^09\d{8}$/);
    expect(stop.recipient.name).toBeTruthy();
    expect(stop.recipient.address).toBeTruthy();
    expect(() => api.ops.routes.board(workshop, day)).toThrow(ForbiddenError);
    expect(() => api.ops.hub.arrivals(workshop, day)).toThrow(ForbiddenError);
    expect(() => api.ops.hub.dispatchRoute(dispatch, { routeId: 'x', tempC: 2 })).toThrow(ForbiddenError);
    expect(() => api.ops.hub.routeSheet(dispatch, forHub.slots[0].routes[0].id)).toThrow(ForbiddenError);
    const sheet = api.ops.hub.routeSheet(hub, forHub.slots[0].routes[0].id);
    expect(sheet.stops[0].recipient.address).toBeTruthy();
    expect(sheet.engine).toMatch(/mock/i);
    expect(() => api.ops.logistics.setCapacity(hub, { zoneId: 'Z1', day, slotId, capacityBoxes: 5 })).toThrow(ForbiddenError);
    expect(() => api.ops.logistics.capacityBoard(accounting)).toThrow(ForbiddenError);
  });

  /** Đưa một ngày tới lúc đã xuất kho một tuyến; trả về { day, slotId, route, api, server }. */
  function dispatched() {
    const ctxs = setup();
    const { api } = ctxs;
    const day = readyDay(api);
    receiveAll(api, day);
    packAllSeafood(api, day);
    const board = api.ops.routes.board(hub, day);
    const slot = board.slots.filter((s) => s.eligible > 0).sort((a, b) => b.eligible - a.eligible)[0];
    api.ops.routes.plan(hub, { day, slotId: slot.slotId });
    const route = api.ops.routes.board(hub, day).slots.find((s) => s.slotId === slot.slotId).routes[0];
    return { ...ctxs, day, slot, route };
  }

  it('xuất kho cần chia đủ thùng và nhiệt độ; đơn sang đang giao và khách được báo', () => {
    const { server, api, route } = dispatched();
    expect(() => api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 2.5 })).toThrow(/chưa chia vào tuyến/);
    for (const s of route.stops) api.ops.hub.sortBox(hub, { routeId: route.id, orderId: s.orderId, location: 'K-A1' });
    expect(() => api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: '' })).toThrow(/Nhập nhiệt độ/);
    const orderId = route.stops[0].orderId;
    const customerId = server.read((db) => db.orders.find((o) => o.id === orderId).customerId);
    const notifBefore = server.read((db) => db.notifications.filter((n) => n.customerId === customerId).length);
    const r = api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 2.1, frozenTempC: -20 });
    expect(r.status).toBe('dispatched');
    expect(r.breaches).toEqual([]);
    expect(server.read((db) => route.stops.every((s) => db.orders.find((o) => o.id === s.orderId).status === 'shipped'))).toBe(true);
    const n = server.read((db) => db.notifications.filter((x) => x.customerId === customerId && x.type === 'delivery_status').pop());
    expect(n.meta.status).toBe('shipped');
    expect(server.read((db) => db.notifications.filter((x) => x.customerId === customerId).length)).toBe(notifBefore + 1);
    expect(() => api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 2 })).toThrow(/đã xuất kho/);
    // Mốc xuất kho phụ có trong chuỗi lạnh
    const cc = api.ops.logistics.coldChain(dispatch, { day: route.stops.length ? api.ops.routes.board(hub).day : null });
    expect(cc.readings.some((x) => x.point === 'hub_dispatch' && x.cls === 'frozen' && x.tempC === -20)).toBe(true);
  });

  it('shipper: chỉ thấy điểm của mình, SĐT che một phần, không có tiền / mã khách', () => {
    const { api, route, day } = dispatched();
    for (const s of route.stops) api.ops.hub.sortBox(hub, { routeId: route.id, orderId: s.orderId, location: 'K-A1' });
    api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 2.1 });
    const mine = shipperCtx(route.shipperId);
    const b = api.ops.shipper.board(mine, { day });
    expect(b.routes).toHaveLength(1);
    const st = b.routes[0].stops[0];
    expect(st.phoneMasked).toMatch(/^\d{3}\*{4}\d{3}$/);
    expect(JSON.stringify(b)).not.toMatch(/customerId|amountVnd|listPrice|"phone"|paymentMethod|credit/);
    expect(st.mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    expect(st.name).toBeTruthy();
    expect(st.address).toBeTruthy();
    // Shipper khác không thấy tuyến này và không thao tác được trên điểm này
    const other = shipperCtx(route.shipperId === 'SH-04' ? 'SH-03' : 'SH-04');
    expect(api.ops.shipper.board(other, { day }).routes).toHaveLength(0);
    expect(() => api.ops.shipper.deliver(other, { orderId: st.orderId, photo: PHOTO })).toThrow(/không thuộc tuyến/);
    // Vai trò khác không dùng app shipper
    expect(() => api.ops.shipper.board(hub, {})).toThrow(ForbiddenError);
    expect(() => api.ops.shipper.deliver(dispatch, { orderId: st.orderId, photo: PHOTO })).toThrow(ForbiddenError);
    // Điều phối xem thử được, vẫn che SĐT
    const view = api.ops.shipper.board(dispatch, { asShipperId: route.shipperId, day });
    expect(view.routes[0].stops[0].phoneMasked).toMatch(/\*{4}/);
  });

  it('giao 1 điểm và báo thất bại 1 điểm: app khách thấy đúng trạng thái và thông báo', () => {
    const { server, api, route, day } = dispatched();
    for (const s of route.stops) api.ops.hub.sortBox(hub, { routeId: route.id, orderId: s.orderId, location: 'K-A1' });
    api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 2.1 });
    const me = shipperCtx(route.shipperId);
    const [s1, s2] = route.stops;
    expect(() => api.ops.shipper.deliver(me, { orderId: s1.orderId, photo: '' })).toThrow(/ảnh/);
    const d = api.ops.shipper.deliver(me, { orderId: s1.orderId, photo: PHOTO, tempC: 3.2 });
    expect(d.status).toBe('delivered');
    const o1 = server.read((db) => db.orders.find((o) => o.id === s1.orderId));
    expect(o1.status).toBe('delivered');
    expect(o1.deliveryPhotoUrl).toBe(PHOTO);
    const n1 = server.read((db) => db.notifications.filter((n) => n.customerId === o1.customerId && n.meta && n.meta.status === 'delivered'));
    expect(n1).toHaveLength(1);
    expect(n1[0].meta.photoUrl).toBe(PHOTO);
    // Khách thấy qua API khách
    const weeks1 = api.customer.myWeeks(o1.customerId);
    const box1 = weeks1.data.weeks.flatMap((w) => w.boxes).find((b) => b.order_id === s1.orderId);
    expect(box1.phase).toBe('delivered');
    expect(box1.photo_url).toBe(PHOTO);

    // Thất bại: không liên lạc được cần đã gọi khách
    expect(() => api.ops.shipper.fail(me, { orderId: s2.orderId, reason: 'unreachable' })).toThrow(/gọi khách/);
    expect(() => api.ops.shipper.fail(me, { orderId: s2.orderId, reason: 'bogus' })).toThrow(/lý do/);
    const call = api.ops.shipper.callCustomer(me, { orderId: s2.orderId });
    expect(call).toMatchObject({ calls: 1, via: 'masked-proxy' });
    expect(JSON.stringify(call)).not.toMatch(/09\d{8}/);
    const f = api.ops.shipper.fail(me, { orderId: s2.orderId, reason: 'unreachable', note: 'Gọi 2 lần không bắt máy' });
    expect(f.status).toBe('failed');
    expect(f.exceptionId).toBeTruthy();
    const o2 = server.read((db) => db.orders.find((o) => o.id === s2.orderId));
    expect(o2.status).toBe('shipped'); // chưa giao được thì vẫn "đang giao" cho tới khi điều phối xử lý
    const n2 = server.read((db) => db.notifications.filter((n) => n.customerId === o2.customerId && n.meta && n.meta.status === 'failed'));
    expect(n2).toHaveLength(1);
    expect(n2[0].meta.reason).toBe('unreachable');
    const box2 = api.customer.myWeeks(o2.customerId).data.weeks.flatMap((w) => w.boxes).find((b) => b.order_id === s2.orderId);
    expect(box2.delivery_issue.kind).toBe('failed');
    expect(box2.delivery_issue.label).toMatch(/Chưa giao được/);
    // Không xử lý lại điểm đã xong
    expect(() => api.ops.shipper.deliver(me, { orderId: s2.orderId, photo: PHOTO })).toThrow(/đã xử lý/);
    expect(() => api.ops.shipper.fail(me, { orderId: s1.orderId, reason: 'wrong_address' })).toThrow(/đã xử lý/);
    // Điều phối thấy ngoại lệ mở
    const ex = api.ops.logistics.exceptions(dispatch).open.find((e) => e.orderId === s2.orderId);
    expect(ex.kind).toBe('delivery_failed');
    expect(JSON.stringify(ex)).not.toMatch(/customerId|"phone"|"address"|amountVnd/);
    void day;
  });

  it('điều phối xử lý: giao lại khung sau, giữ lạnh, bù Fresh Credit; mỗi cách báo sang app khách', () => {
    const { server, api, route } = dispatched();
    for (const s of route.stops) api.ops.hub.sortBox(hub, { routeId: route.id, orderId: s.orderId, location: 'K-A1' });
    api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 2.1 });
    const me = shipperCtx(route.shipperId);
    const ids = route.stops.slice(0, 3).map((s) => s.orderId);
    for (const id of ids) api.ops.shipper.fail(me, { orderId: id, reason: 'customer_reschedule' });
    const open = api.ops.logistics.exceptions(dispatch).open;
    const exOf = (id) => open.find((e) => e.orderId === id);
    const custOf = (id) => server.read((db) => db.orders.find((o) => o.id === id).customerId);

    // 1) giao lại khung sau
    const r1 = api.ops.logistics.resolveException(dispatch, { id: exOf(ids[0]).id, kind: 'redeliver', ...pickOption(exOf(ids[0])) });
    expect(r1.status).toBe('resolved');
    const o1 = server.read((db) => db.orders.find((o) => o.id === ids[0]));
    expect(o1.redelivery).toMatchObject({ atHub: true });
    const nRe = server.read((db) => db.notifications.filter((n) => n.customerId === o1.customerId && n.meta && n.meta.status === 'redelivery'));
    expect(nRe).toHaveLength(1);
    expect(nRe[0].body).toMatch(/giao lại vào/);
    const box = api.customer.myWeeks(o1.customerId).data.weeks.flatMap((w) => w.boxes).find((b) => b.order_id === ids[0]);
    expect(box.delivery_issue.kind).toBe('redelivery');
    expect(box.redelivery.slot_label).toBeTruthy();
    expect(() => api.ops.logistics.resolveException(dispatch, { id: exOf(ids[0]).id, kind: 'compensate' })).toThrow(/đã xử lý/);

    // 2) giữ lạnh ở kho phụ
    const r2 = api.ops.logistics.resolveException(dispatch, { id: exOf(ids[1]).id, kind: 'hold_cold' });
    expect(r2.status).toBe('held');
    expect(server.read((db) => db.notifications.some((n) => n.customerId === custOf(ids[1]) && n.meta && n.meta.status === 'held'))).toBe(true);
    const held = api.ops.logistics.exceptions(dispatch).held.find((e) => e.orderId === ids[1]);
    expect(held.heldUntil).toBeTruthy();

    // 3) bù Fresh Credit: cộng vào ngăn khuyến mãi, ghi sổ, báo khách
    const credBefore = server.read((db) => db.customers.find((c) => c.id === custOf(ids[2])).credit.promo);
    const amountVnd = server.read((db) => db.orders.find((o) => o.id === ids[2]).amountVnd);
    const r3 = api.ops.logistics.resolveException(dispatch, { id: exOf(ids[2]).id, kind: 'compensate', amountVnd: 1 });
    expect(r3.compensationVnd).toBe(Math.round(amountVnd * BUSINESS.logistics.failedCompensationPct)); // điều phối không tự nhập số tiền
    expect(server.read((db) => db.customers.find((c) => c.id === custOf(ids[2])).credit.promo)).toBe(credBefore + r3.compensationVnd);
    expect(server.read((db) => db.ledger.some((l) => l.orderId === ids[2] && l.kind === 'compensation'))).toBe(true);
    expect(server.read((db) => db.notifications.some((n) => n.customerId === custOf(ids[2]) && n.meta && n.meta.status === 'compensated'))).toBe(true);
    expect(() => api.ops.logistics.resolveException(dispatch, { id: exOf(ids[0]).id, kind: 'nope' })).toThrow();

    // Giữ lạnh rồi giao lại sau: ngoại lệ đóng, đơn lên lại tuyến khung khác được
    const again = api.ops.logistics.resolveException(dispatch, { id: held.id, kind: 'redeliver', ...pickOption(held) });
    expect(again.status).toBe('resolved');
  });

  function pickOption(ex) {
    const o = ex.redeliveryOptions[0];
    return { day: o.day, slotId: o.slotId };
  }

  it('giao lại lên tuyến mới rồi giao được; thu hồi thùng xốp / túi gel ở lần giao sau', () => {
    const { server, api, route, day } = dispatched();
    for (const s of route.stops) api.ops.hub.sortBox(hub, { routeId: route.id, orderId: s.orderId, location: 'K-A1' });
    api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 2.1 });
    const me = shipperCtx(route.shipperId);
    const [a, b] = route.stops;
    // Lần giao đầu của khách A: để lại 1 thùng xốp + 2 túi gel
    const firstDeliver = api.ops.shipper.deliver(me, { orderId: a.orderId, photo: PHOTO });
    expect(firstDeliver.recovered).toEqual({ foam: 0, gel: 0, expectedFoam: 0, expectedGel: 0 });
    const custA = server.read((db) => db.orders.find((o) => o.id === a.orderId).customerId);
    expect(server.read((db) => db.logistics.assets[custA])).toEqual({ foam: 1, gel: 2 });
    // B không giao được, điều phối cho giao lại khung sau, tuyến mới xuất kho, shipper giao
    api.ops.shipper.fail(me, { orderId: b.orderId, reason: 'wrong_address' });
    const ex = api.ops.logistics.exceptions(dispatch).open.find((e) => e.orderId === b.orderId);
    const opt = ex.redeliveryOptions[0];
    api.ops.logistics.resolveException(dispatch, { id: ex.id, kind: 'redeliver', day: opt.day, slotId: opt.slotId });
    const planned = api.ops.routes.plan(hub, { day: opt.day, slotId: opt.slotId });
    expect(planned.routes.length).toBeGreaterThan(0);
    const board = api.ops.routes.board(hub, opt.day);
    // Ngày đó chưa nhận xe (nếu khác ngày) thì bảng tuyến theo ngày của lịch giao lại
    const rr = board.slots.find((s) => s.slotId === opt.slotId).routes.find((r) => r.stops.some((s) => s.orderId === b.orderId));
    expect(rr).toBeTruthy();
    for (const s of rr.stops) api.ops.hub.sortBox(hub, { routeId: rr.id, orderId: s.orderId, location: 'K-B2' });
    api.ops.hub.dispatchRoute(hub, { routeId: rr.id, tempC: 3 });
    const shipper2 = shipperCtx(rr.shipperId);
    const del = api.ops.shipper.deliver(shipper2, { orderId: b.orderId, photo: PHOTO });
    expect(del.status).toBe('delivered');
    expect(server.read((db) => db.orders.find((o) => o.id === b.orderId).status)).toBe('delivered');
    void day;
  });

  it('thu hồi thùng xốp / túi gel: số thu không vượt số khách đang giữ; tắt trong cấu hình thì không đếm', () => {
    const { server, api, route } = dispatched();
    for (const s of route.stops) api.ops.hub.sortBox(hub, { routeId: route.id, orderId: s.orderId, location: 'K-A1' });
    api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 2.1 });
    const me = shipperCtx(route.shipperId);
    const a = route.stops[0];
    expect(() => api.ops.shipper.deliver(me, { orderId: a.orderId, photo: PHOTO, recovered: { foam: 1, gel: 0 } })).toThrow(/đang giữ 0 thùng xốp/);
    // Khách A đã có sẵn 1 thùng xốp + 2 túi gel từ lần giao trước
    const custA = server.read((db) => db.orders.find((o) => o.id === a.orderId).customerId);
    server.write((db) => { db.logistics.assets[custA] = { foam: 1, gel: 2 }; });
    const view = api.ops.shipper.board(me, {}).routes[0].stops.find((s) => s.orderId === a.orderId);
    expect(view.recoverExpected).toEqual({ foam: 1, gel: 2 });
    const r = api.ops.shipper.deliver(me, { orderId: a.orderId, photo: PHOTO, recovered: { foam: 1, gel: 1 } });
    expect(r.recovered).toMatchObject({ foam: 1, gel: 1, expectedFoam: 1, expectedGel: 2 });
    // Còn 1 túi gel chưa thu + bộ mới vừa để lại
    expect(server.read((db) => db.logistics.assets[custA])).toEqual({ foam: 1, gel: 3 });
    const k = api.ops.logistics.kpis(dispatch);
    expect(k.recovery.backFoam).toBe(1);
    expect(k.recovery.backGel).toBe(1);
  });

  it('chi phí mỗi thùng đẩy vào db.logisticsCosts và khớp tổng các phần', () => {
    const { server, api, day, route } = dispatched();
    api.ops.logistics.saveTrip(dispatch, { day, tripId: 'T1', carrier: 'Nhà xe lạnh Tây Nguyên – Sài Gòn', plate: '47C-123.45', capacityBoxes: 100, costVnd: 5000000 });
    api.ops.logistics.saveHubCost(dispatch, { day, laborVnd: 1000000, rentVnd: 500000, iceVnd: 200000, otherVnd: 100000 });
    for (const s of route.stops) api.ops.hub.sortBox(hub, { routeId: route.id, orderId: s.orderId, location: 'K-A1' });
    api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 2.1 });
    const c = api.ops.logistics.publishedCosts(accounting).find((x) => x.day === day);
    expect(c).toBeTruthy();
    expect(c.boxes).toBeGreaterThan(0);
    expect(c.totalVnd).toBe(c.parts.longHaulVnd + c.parts.hubVnd + c.parts.lastMileVnd);
    expect(c.perBoxVnd).toBe(Math.round(c.totalVnd / c.boxes));
    expect(c.parts.hubVnd).toBe(1800000);
    expect(c.trips.find((t) => t.tripId === 'T1').costVnd).toBe(5000000);
    expect(c.trips.find((t) => t.tripId === 'T1').estimated).toBe(false);
    const m = BUSINESS.logistics.lastMile;
    expect(c.parts.lastMileVnd).toBe(m.routeBaseVnd + m.perStopVnd * route.stops.length);
    expect(c.status).toBe('open');
    expect(server.read((db) => db.logisticsCosts.filter((x) => x.day === day))).toHaveLength(1);
    // Điều phối đọc chi tiết theo chuyến / tuyến / điểm giao
    const detail = api.ops.logistics.costs(dispatch, day).detail;
    expect(detail.routes[0].perStopVnd).toBe(Math.round(detail.routes[0].costVnd / route.stops.length));
    // Kế toán đọc được chi phí đã đẩy, xưởng thì không
    expect(() => api.ops.logistics.publishedCosts(workshop)).toThrow(ForbiddenError);
    expect(() => api.ops.logistics.saveTrip(hub, { day, tripId: 'T1' })).toThrow(ForbiddenError);
    expect(() => api.ops.logistics.saveTrip(dispatch, { day, tripId: 'T1', carrier: '', plate: 'x', capacityBoxes: 10, costVnd: 1 })).toThrow(/nhà xe/);
  });

  it('đăng nhập shipper: PIN 3333 vẫn vào được, mỗi shipper một PIN, PIN cũ khác không hỏng', () => {
    const { api } = setup();
    expect(api.auth.login('3333')).toMatchObject({ role: 'shipper', shipperId: 'SH-01' });
    expect(api.auth.login('3334')).toMatchObject({ role: 'shipper', shipperId: 'SH-02' });
    expect(api.auth.login('1111').role).toBe('workshop');
    expect(api.auth.login('2222').role).toBe('hub');
    expect(api.auth.login('5555').role).toBe('dispatch');
    expect(api.auth.login('9999').role).toBe('admin');
    expect(api.auth.login('4001')).toMatchObject({ role: 'supplier', supplierId: 'S-FACTORY' });
    expect(api.auth.login('0000')).toBeNull();
  });

  it('KPI tổng hợp sau khi giao: đúng giờ, thất bại, thùng / xe, vượt nhiệt', () => {
    const { api, route } = dispatched();
    for (const s of route.stops) api.ops.hub.sortBox(hub, { routeId: route.id, orderId: s.orderId, location: 'K-A1' });
    api.ops.hub.dispatchRoute(hub, { routeId: route.id, tempC: 6 }); // vượt nhiệt
    const me = shipperCtx(route.shipperId);
    const [a, b] = route.stops;
    api.ops.shipper.deliver(me, { orderId: a.orderId, photo: PHOTO });
    api.ops.shipper.fail(me, { orderId: b.orderId, reason: 'wrong_address' });
    const k = api.ops.logistics.kpis(dispatch);
    expect(k.deliveredStops).toBe(1);
    expect(k.failedAttempts).toBe(1);
    expect(k.failPct).toBe(0.5);
    expect(k.tempBreaches).toBe(1);
    expect(k.boxesPerTruck).toBeGreaterThan(0);
    expect(k.costPerBoxVnd).toBeGreaterThan(0);
    expect(k.stopsPerRoute).toBe(route.stops.length);
    expect(() => api.ops.logistics.kpis(workshop)).toThrow(ForbiddenError);
  });

  it('chuyến chặng dài: nhà xe, biển số, sức chứa, bảng kê thùng, trạng thái', () => {
    const { api } = setup();
    const day = readyDay(api);
    const before = api.ops.logistics.trips(dispatch, day);
    const t1 = before.trips.find((t) => t.tripId === 'T1');
    expect(t1.status).toBe('departed');
    expect(t1.manifest.length).toBe(t1.boxes);
    expect(t1.depart.tempC).toBe(2.5);
    expect(t1.depart.sealNo).toMatch(/^SEAL-/);
    expect(t1.costEstimated).toBe(true);
    api.ops.logistics.saveTrip(dispatch, { day, tripId: 'T1', carrier: 'Nhà xe lạnh Tây Nguyên – Sài Gòn', plate: '47c-123.45', capacityBoxes: 3, costVnd: 4000000 });
    const after = api.ops.logistics.trips(dispatch, day).trips.find((t) => t.tripId === 'T1');
    expect(after.record.plate).toBe('47C-123.45');
    expect(after.costEstimated).toBe(false);
    expect(after.overCapacity).toBe(Math.max(0, after.boxes - 3));
    receiveAll(api, day);
    expect(api.ops.logistics.trips(dispatch, day).trips.find((t) => t.tripId === 'T1').status).toBe('arrived');
    expect(scopeKey(day, 'T1')).toBe(after.scope);
  });

  it('bộ nhớ cũ chưa có db.logistics vẫn chạy: các hàm đọc không lỗi', () => {
    const { server, api } = setup();
    server.write((db) => { delete db.logistics; delete db.logisticsCosts; });
    expect(api.ops.logistics.capacityBoard(dispatch).zones.length).toBe(BUSINESS.zones.length);
    expect(api.customer.availableSlots('Z1', 2).length).toBeGreaterThan(0);
    expect(api.ops.logistics.exceptions(dispatch).open).toEqual([]);
  });
});
