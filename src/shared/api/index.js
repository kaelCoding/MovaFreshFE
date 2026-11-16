import { BUSINESS, findZoneByDistrict, getZone } from '../config/business';
import { ROLES } from '../config/roles';
import { DISHES, SKUS, SUPPLIERS, SAUCES } from '../data/catalog';
import { getServer } from '../mock-server/server';
import { rng, hash } from '../utils/formatters';
import { availableSlots, cutoffAtFor } from '../domain/delivery';
import { generateMeals, mealNutrition, mealsPriceVnd } from '../domain/mealPlan';
import { planOrders, activateSubscription, findFullSlots } from '../domain/subscription';
import { giftCardSchedule } from '../domain/pricing';
import { emptyBalance, topUp } from '../domain/credit';
import { nextId } from '../domain/jobs';
import { ForbiddenError, viewOrder, viewSupplier } from './views';

export { ForbiddenError };

const DOW_BY_NAME = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const GOAL_ALIASES = {
  increase_protein: 'high_protein',
  lower_blood_sugar: 'limit_sugar',
  reduce_fat: 'low_carb',
  lose_weight: 'low_carb'
};
const ok = (data) => ({ status: 'success', data });
const fail = (code, message) => ({ status: 'error', error: { code, message } });

const ROLE_CAN = {
  listOrders: ['workshop', 'hub', 'shipper', 'dispatch', 'purchasing', 'accounting', 'admin'],
  productionPlans: ['workshop', 'hub', 'dispatch', 'purchasing', 'accounting', 'admin'],
  purchaseOrders: ['purchasing', 'accounting', 'admin', 'supplier'],
  suppliers: ['purchasing', 'accounting', 'admin', 'supplier'],
  demo: ['admin']
};

function guard(ctx, action) {
  if (!ctx || !ROLE_CAN[action].includes(ctx.role)) throw new ForbiddenError();
}

/**
 * API dùng chung cho app khách và app vận hành. Hình dạng các luồng đã có khớp
 * movafresh-platform/docs/api-contract.json; chỗ khác contract xem docs/contract-changes.md.
 */
export function createApi(server = getServer()) {
  const cfg = server.cfg || BUSINESS;

  return {
    // ---------- Đăng nhập app vận hành (PIN demo) ----------
    auth: {
      login(pin) {
        for (const [role, def] of Object.entries(ROLES)) {
          if (def.pin && def.pin === String(pin)) return { role, label: def.label, home: def.home, supplierId: null };
        }
        const sup = Object.values(SUPPLIERS).find((s) => s.pin === String(pin));
        if (sup) return { role: 'supplier', label: `${ROLES.supplier.label}: ${sup.name}`, home: ROLES.supplier.home, supplierId: sup.id };
        return null;
      }
    },

    // ---------- App khách (khớp api-contract.json) ----------
    customer: {
      /** POST /api/v2/onboarding/profile */
      onboardingProfile(req) {
        return server.write((db, now) => {
          const a = req.survey_answers || {};
          const zone = findZoneByDistrict(a.living_area);
          if (!zone) return fail('OUT_OF_ZONE', 'MOVA chưa giao tới khu vực này');
          const size = Math.max(1, Math.min(10, Number(a.household_size) || 1));
          const goals = (a.health_goals || []).map((g) => GOAL_ALIASES[g] || g);
          const restrictions = (a.allergies_and_restrictions || []).filter((r) => r.startsWith('no_'));
          const meals = Number(a.weekly_home_meals_count) || 5;

          const profile = {
            id: `prof_${hash(`${req.user_contact?.phone_or_email}${db.profiles.length}`).toString(16).replace('-', '').slice(0, 8)}`,
            contact: req.user_contact || {},
            zoneId: zone.id,
            livingArea: a.living_area,
            householdSize: size,
            goals,
            restrictions,
            mealsPerWeek: Math.max(3, Math.min(7, meals)),
            createdAt: now.toISOString()
          };
          db.profiles.push(profile);

          const tier = goals.includes('high_protein') ? (goals.includes('limit_sugar') || goals.includes('low_carb') ? 'Low_Carb_High_Protein' : 'High_Protein') : goals.includes('limit_sugar') || goals.includes('low_carb') ? 'Low_Carb' : 'Balanced';
          const sampleMeals = generateMeals({ householdSize: size, goals, restrictions, mealsCount: profile.mealsPerWeek, rand: rng(hash(profile.id)) });
          return ok({
            profile_id: profile.id,
            household_type: size === 1 ? 'single' : 'family',
            dietary_tier: tier,
            recommended_caloric_target_per_meal: goals.includes('low_carb') ? 550 : goals.includes('high_protein') ? 700 : 650,
            suggested_package: size === 1 ? 'solo_4_weeks' : 'family_care_4_weeks',
            estimated_weekly_budget_vnd: mealsPriceVnd(sampleMeals, size),
            initial_credit_bonus_earned_vnd: cfg.incentives.rewards.profileComplete
          });
        });
      },

      /** POST /api/v2/ai/generate-meal-plan */
      generateMealPlan(req) {
        return server.write((db, now) => {
          const profile = db.profiles.find((p) => p.id === req.profile_id);
          if (!profile) return fail('PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ');
          const extraProtein = (req.custom_upsell_additions || []).some((x) => x.startsWith('extra_') && x.includes('protein'));
          const rand = rng(hash(`${profile.id}-${req.week_number || 1}`));
          const meals = generateMeals({
            householdSize: profile.householdSize,
            goals: extraProtein ? [...new Set([...profile.goals, 'high_protein'])] : profile.goals,
            restrictions: profile.restrictions,
            mealsCount: profile.mealsPerWeek,
            rand
          });
          const planId = `plan_w${req.week_number || 1}_${profile.id.slice(5)}`;
          const existing = db.mealPlans.find((p) => p.id === planId);
          const stored = { id: planId, profileId: profile.id, weekNumber: req.week_number || 1, meals, createdAt: now.toISOString() };
          if (existing) Object.assign(existing, stored);
          else db.mealPlans.push(stored);

          const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
          const dishOut = (id) => {
            if (!id) return undefined;
            const d = DISHES[id];
            const grams = Math.round(d.bom.reduce((s, b) => s + b.gramsPerPerson, 0) * profile.householdSize);
            return { dish_id: id, name: d.name, portion_grams: grams, sauce_code: d.sauce, prep_time_minutes: d.prepMinutes };
          };
          const bomRaw = {};
          const sauces = new Set();
          const outMeals = meals.map((m, i) => {
            for (const id of Object.values(m.dishes)) {
              for (const b of DISHES[id].bom) bomRaw[b.sku] = (bomRaw[b.sku] || 0) + b.gramsPerPerson * profile.householdSize * (DISHES[id].kind === 'protein' ? m.proteinFactor : 1);
              if (DISHES[id].sauce) sauces.add(DISHES[id].sauce);
            }
            const n = mealNutrition(m, profile.householdSize);
            return {
              meal_index: i + 1,
              day_label: days[i % 7],
              theme: profile.householdSize === 1 ? 'Suất ăn nấu 1 chảo' : 'Mâm cơm Việt 5 phần',
              meal_structure: {
                protein_dish: dishOut(m.dishes.protein),
                soup_dish: dishOut(m.dishes.soup),
                veggie_dish: dishOut(m.dishes.veg),
                carb_dish: dishOut(m.dishes.carb),
                dessert: dishOut(m.dishes.dessert)
              },
              nutrition_summary: { calories_total: n.kcal, protein_g: n.protein, carbs_g: n.carb, fat_g: n.fat },
              price_vnd: mealsPriceVnd([m], profile.householdSize)
            };
          });
          return ok({
            plan_id: planId,
            household_size: profile.householdSize,
            meals_per_week: meals.length,
            meals: outMeals,
            bom_raw_summary: { ...Object.fromEntries(Object.entries(bomRaw).map(([k, v]) => [k, Math.round(v)])), sauce_packets: [...sauces] }
          });
        });
      },

      /** Các khung giao còn chỗ của một khu (app khách chỉ hiện khung còn sức chứa). */
      availableSlots(zoneId, days = 4) {
        return server.read((db, now) => availableSlots(db.orders, zoneId, now, days, cfg));
      },

      /** POST /api/v2/subscription/create-or-renew */
      createSubscription(req) {
        return server.write((db, now) => {
          if ((req.duration_weeks || 0) < cfg.subscription.minWeeks) {
            return fail('MIN_4_WEEKS', `Gói tối thiểu ${cfg.subscription.minWeeks} tuần`);
          }
          const profile = db.profiles.find((p) => p.id === req.profile_id);
          const plan = db.mealPlans.find((p) => p.id === req.plan_id);
          if (!profile || !plan) return fail('PLAN_NOT_FOUND', 'Không tìm thấy hồ sơ hoặc thực đơn');

          const addr = req.schedule?.shipping_address || {};
          const zone = findZoneByDistrict(`${addr.district || ''} ${addr.city || ''}`) || getZone(profile.zoneId);
          if (!zone) return fail('OUT_OF_ZONE', 'MOVA chưa giao tới khu vực này');

          const dows = (req.schedule?.preferred_days || []).map((d) => DOW_BY_NAME[String(d).toLowerCase()]);
          const perWeek = req.schedule?.delivery_frequency === 'twice_a_week' ? 2 : 1;
          if (!dows.length || dows.length !== perWeek || dows.some((d) => !zone.deliveryDays.includes(d))) {
            return fail('DAY_NOT_AVAILABLE', 'Khu của bạn không giao vào các ngày đã chọn');
          }
          const slot = zone.slots.find((s) => s.id === req.schedule?.preferred_time_slot);
          if (!slot) return fail('SLOT_NOT_AVAILABLE', 'Khu của bạn không có khung giờ đã chọn');

          const method = ['fresh_credit', 'bank_transfer_4w', 'card'].includes(req.payment_method) ? req.payment_method : null;
          if (!method) return fail('PAYMENT_METHOD_INVALID', 'Chỉ hỗ trợ trả trước: Fresh Credit, chuyển khoản 4 tuần, thẻ');

          const customer = {
            id: `C-${String(db.customers.length + 1).padStart(4, '0')}`,
            name: addr.receiver_name || 'Khách MOVA',
            phone: addr.receiver_phone || '',
            email: null,
            address: [addr.street, addr.district, addr.city].filter(Boolean).join(', '),
            district: addr.district || '',
            zoneId: zone.id,
            personaId: null,
            credit: req.starting_credit ? topUp(emptyBalance(), req.starting_credit.real || 0, req.starting_credit.promo || 0) : emptyBalance(),
            cardFailsNext: false
          };
          const subscription = {
            id: nextId(db, 'SUB'), customerId: customer.id, status: 'active', weeks: req.duration_weeks,
            paymentMethod: method, deliveriesPerWeek: perWeek, zoneId: zone.id, slotId: slot.id, createdAt: now.toISOString()
          };

          const { orders, listTotalVnd } = planOrders({
            customer, subscriptionId: subscription.id,
            profile: { householdSize: profile.householdSize, goals: profile.goals, restrictions: profile.restrictions },
            zoneId: zone.id, slotId: slot.id, dows, weeks: req.duration_weeks,
            mealsPerWeek: profile.mealsPerWeek, week1Meals: plan.meals,
            voucher: Boolean(req.voucher_code), paymentMethod: method, now,
            rand: rng(hash(subscription.id)), cfg
          });

          const full = findFullSlots(db, orders, cfg);
          if (full.length) return fail('SLOT_FULL', 'Khung giờ bạn chọn đã đầy, vui lòng chọn khung khác');

          db.customers.push(customer);
          db.subscriptions.push(subscription);
          const res = activateSubscription(db, { customer, subscription, orders, now, cfg });
          if (!res.ok) {
            db.customers.pop();
            db.subscriptions.pop();
            return fail(res.error, 'Số dư Fresh Credit chưa đủ cho tuần đầu tiên');
          }

          const first = res.orders[0];
          const last = res.orders[res.orders.length - 1];
          const gift = req.voucher_code ? giftCardSchedule(listTotalVnd, cfg) : [0, 0, 0, 0];
          return ok({
            subscription_id: subscription.id,
            status: 'active',
            cycle_start_date: first.deliveryDay,
            cycle_end_date: last.deliveryDay,
            total_order_amount_vnd: res.orders.reduce((s, o) => s + o.amountVnd, 0),
            voucher_discount_applied_week1_vnd: gift[0] || 0,
            voucher_future_credits_locked_vnd: gift.slice(1).reduce((a, b) => a + b, 0),
            charged_from_fresh_credit_vnd: method === 'fresh_credit' ? res.chargedNowVnd : 0,
            fresh_credit_balance_remaining_vnd: customer.credit.real + customer.credit.promo,
            auto_debit_cutoff_hours: cfg.timings.chargeBeforeDeliveryHours,
            // Khác contract cũ: không còn "dish_customization_cutoff_hours" (xem docs/contract-changes.md)
            dish_customization_cutoff_at: first.cutoffAt,
            next_delivery: {
              date: first.deliveryDay,
              slot: slot.label,
              dish_change_deadline: first.cutoffAt
            }
          });
        });
      },

      listNotifications(customerId) {
        return server.read((db) => db.notifications.filter((n) => n.customerId === customerId).reverse());
      }
    },

    // ---------- App vận hành (đã lọc theo vai trò) ----------
    ops: {
      /** Chạy các job đã tới hạn (trừ tiền, chốt sổ, nhắc khách). Mọi vai trò đã đăng nhập đều gọi được. */
      tick(ctx) {
        if (!ctx) throw new ForbiddenError();
        return server.tick();
      },

      listOrders(ctx, { day = null, status = null } = {}) {
        guard(ctx, 'listOrders');
        return server.read((db) =>
          db.orders
            .filter((o) => (!day || o.deliveryDay === day) && (!status || o.status === status))
            .map((o) => viewOrder(o, ctx.role))
        );
      },

      listProductionPlans(ctx) {
        guard(ctx, 'productionPlans');
        return server.read((db) => [...db.productionPlans]);
      },

      getProductionPlan(ctx, day) {
        guard(ctx, 'productionPlans');
        return server.read((db) => db.productionPlans.find((p) => p.day === day) || null);
      },

      listPurchaseOrders(ctx) {
        guard(ctx, 'purchaseOrders');
        return server.read((db) =>
          db.purchaseOrders.filter((po) => ctx.role !== 'supplier' || po.supplierId === ctx.supplierId)
        );
      },

      listSuppliers(ctx) {
        guard(ctx, 'suppliers');
        return server.read(() =>
          Object.values(SUPPLIERS)
            .filter((s) => ctx.role !== 'supplier' || s.id === ctx.supplierId)
            .map(viewSupplier)
        );
      },

      catalog(ctx) {
        if (!ctx) throw new ForbiddenError();
        return { skus: SKUS, sauces: SAUCES };
      },

      /** Tóm tắt nhanh cho màn hình chính theo vai trò. */
      summary(ctx) {
        if (!ctx) throw new ForbiddenError();
        return server.read((db, now) => {
          const out = { now: now.toISOString() };
          if (ROLE_CAN.listOrders.includes(ctx.role)) {
            const byStatus = {};
            for (const o of db.orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
            out.ordersByStatus = byStatus;
            out.ordersTotal = db.orders.length;
          }
          if (ROLE_CAN.productionPlans.includes(ctx.role)) {
            out.closedPlans = db.productionPlans.length;
          }
          if (ROLE_CAN.purchaseOrders.includes(ctx.role)) {
            out.purchaseOrders = db.purchaseOrders.filter((po) => ctx.role !== 'supplier' || po.supplierId === ctx.supplierId).length;
          }
          return out;
        });
      }
    },

    // ---------- Bảng demo (chỉ admin) ----------
    demo: {
      state(ctx) {
        guard(ctx, 'demo');
        return server.read((db, now) => {
          const scheduled = db.orders.filter((o) => o.status === 'scheduled');
          const days = [...new Set(db.orders.map((o) => o.deliveryDay))].sort();
          return {
            now: now.toISOString(),
            running: db.clock.running,
            counts: Object.fromEntries(
              ['scheduled', 'paid', 'charge_failed', 'locked', 'skipped_unpaid'].map((s) => [s, db.orders.filter((o) => o.status === s).length])
            ),
            nextCharge: scheduled.map((o) => o.chargeAt).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            nextCutoff: days.filter((d) => !db.firedJobs[`cutoff:${d}`]).map((d) => cutoffAtFor(d, cfg).toISOString()).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            nextDelivery: db.orders.map((o) => o.deliveryAt).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            firedCutoffs: Object.keys(db.firedJobs).filter((k) => k.startsWith('cutoff:')),
            plans: db.productionPlans.length,
            purchaseOrders: db.purchaseOrders.length
          };
        });
      },

      setNow(ctx, iso) {
        guard(ctx, 'demo');
        return server.setNow(iso);
      },

      /** kind: 'charge' | 'cutoff' | 'delivery' — nhảy tới ngay sau mốc kế tiếp. */
      jumpTo(ctx, kind) {
        guard(ctx, 'demo');
        const st = this.state(ctx);
        const target = { charge: st.nextCharge, cutoff: st.nextCutoff, delivery: st.nextDelivery }[kind];
        if (!target) return [];
        return server.setNow(new Date(Date.parse(target) + 60 * 1000));
      },

      tick(ctx) {
        guard(ctx, 'demo');
        return server.tick();
      },

      reset(ctx) {
        guard(ctx, 'demo');
        server.reset();
      }
    }
  };
}

export const api = createApi();
