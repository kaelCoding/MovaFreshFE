import { BUSINESS, getZone } from '../config/business';
import { PERSONAS } from '../data/catalog';
import { rng } from '../utils/formatters';
import { planOrders, activateSubscription } from '../domain/subscription';
import { emptyBalance } from '../domain/credit';
import { nextId } from '../domain/jobs';
import { SAMPLE_LOTS } from '../data/lots';
import { emptyFactory } from '../domain/factory';
import { supplementProcurement } from '../data/procurementSeed';

export const DB_VERSION = 1;

const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ'];
const MIDDLES = ['Văn', 'Thị', 'Minh', 'Thanh', 'Ngọc', 'Quốc'];
const GIVENS = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Hải', 'Khoa', 'Lan', 'Linh', 'Nam', 'Phúc', 'Trang'];
const STREETS = ['Lê Lợi', 'Nguyễn Huệ', 'Cách Mạng Tháng Tám', 'Phan Xích Long', 'Nguyễn Thị Thập', 'Hoàng Diệu', 'Lý Thường Kiệt', 'Trường Chinh'];

export const HOUSEHOLD_COUNT = 60;

function householdName(i) {
  const s = i % 8;
  const r = Math.floor(i / 8);
  const md = r % 6;
  const g = (r * 3 + s) % 12;
  return `${SURNAMES[s]} ${MIDDLES[md]} ${GIVENS[g]}`;
}

export function emptyDb(now, running) {
  return {
    version: DB_VERSION,
    clock: { simMs: now.getTime(), realMs: Date.now(), running },
    seq: {},
    firedJobs: {},
    customers: [],
    subscriptions: [],
    orders: [],
    profiles: [],
    mealPlans: [],
    productionPlans: [],
    purchaseOrders: [],
    notifications: [],
    ledger: [],
    leads: [],
    // P1B: lô nguyên liệu (xưởng ghi, trang /q/:code đọc), đánh giá món, lượt chia sẻ nhận thưởng, lượt mời bạn
    lots: JSON.parse(JSON.stringify(SAMPLE_LOTS)),
    ratings: [],
    shares: [],
    referrals: [],
    // P2A: sổ ghi của xưởng Đắk Lắk (tiến độ, lô nhận, mẻ túi, thùng, xe, báo thiếu, năng lực)
    factory: emptyFactory()
  };
}

/**
 * Hạt giống dữ liệu: 10 AI Personas nhân ra 60 hộ trên 8 khu TP.HCM / Đông Nam Bộ,
 * mỗi hộ đã đăng ký một chu kỳ 4 tuần tính từ thời điểm `now`.
 */
export function buildSeed(now, { running = true, cfg = BUSINESS } = {}) {
  const db = emptyDb(now, running);
  const rand = rng(20261115);

  for (let i = 0; i < HOUSEHOLD_COUNT; i++) {
    const persona = PERSONAS[i % PERSONAS.length];
    const zone = i % 2 === 0 ? getZone(persona.zoneId) : cfg.zones[(i * 3 + 2) % cfg.zones.length];
    const slot = zone.slots[i % zone.slots.length];
    const dows = persona.deliveriesPerWeek === 2 ? zone.deliveryDays : [zone.deliveryDays[i % zone.deliveryDays.length]];
    const district = zone.districts[i % zone.districts.length];

    const customer = {
      id: `C-${String(i + 1).padStart(4, '0')}`,
      name: householdName(i),
      phone: `09${String(10000000 + i * 7919).padStart(8, '0')}`,
      email: null,
      address: `${10 + ((i * 7) % 180)} đường ${STREETS[i % STREETS.length]}, ${district}`,
      district,
      zoneId: zone.id,
      personaId: persona.id,
      credit: emptyBalance(),
      cardFailsNext: false
    };
    db.customers.push(customer);

    const profile = {
      id: `prof_${String(i + 1).padStart(6, '0')}`,
      customerId: customer.id,
      householdSize: persona.householdSize,
      goals: persona.goals,
      restrictions: persona.restrictions,
      mealsPerWeek: persona.mealsPerWeek
    };
    db.profiles.push(profile);

    const subscription = {
      id: nextId(db, 'SUB'),
      customerId: customer.id,
      status: 'active',
      weeks: cfg.subscription.defaultWeeks,
      paymentMethod: persona.payment,
      deliveriesPerWeek: persona.deliveriesPerWeek,
      zoneId: zone.id,
      slotId: slot.id,
      createdAt: now.toISOString()
    };
    db.subscriptions.push(subscription);

    const { orders } = planOrders({
      customer, subscriptionId: subscription.id, profile,
      zoneId: zone.id, slotId: slot.id, dows,
      weeks: subscription.weeks, mealsPerWeek: persona.mealsPerWeek,
      voucher: true, paymentMethod: persona.payment, now, rand, cfg
    });

    // Nạp Fresh Credit: một nửa số khách chỉ nạp đủ tuần 1 để tuần 2 trở đi bị trừ lỗi (dùng cho demo).
    if (persona.payment === 'fresh_credit') {
      const total = orders.reduce((s, o) => s + o.amountVnd, 0);
      const week0 = orders.filter((o) => o.weekIndex === 0).reduce((s, o) => s + o.amountVnd, 0);
      customer.credit = { real: i % 4 === 1 ? week0 + 20000 : total + 50000, promo: 20000 };
    }
    // Một khách thẻ bị từ chối ở lần trừ kế tiếp
    if (persona.payment === 'card' && i === 11) customer.cardFailsNext = true;

    const res = activateSubscription(db, { customer, subscription, orders, now, cfg });
    if (!res.ok) throw new Error(`Seed lỗi ở hộ ${customer.id}: ${res.error}`);
  }

  // P2B: hồ sơ nhà cung cấp, bảng giá, tồn kho, PO cũ, bảng kê (bộ nhớ cũ được bù ở server.js, không đổi DB_VERSION)
  supplementProcurement(db, now, cfg);

  return db;
}
