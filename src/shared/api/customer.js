import { BUSINESS, findZoneByDistrict, getZone, zoneProvince } from '../config/business';
import { DISHES, SAUCES } from '../data/catalog';
import { rng, hash } from '../utils/formatters';
import { dayKey, dayKeySequence, fmtDay, DOW_LABELS } from '../utils/time';
import { availableSlots, cutoffAtFor } from '../domain/delivery';
import {
  generateMeals, mealNutrition, mealPriceVnd, mealsPriceVnd, westernCountFor,
  swapOptionsFor, applySwaps, carbOptionsFor, DEFAULT_CARB
} from '../domain/mealPlan';
import { applyUpsells, questionsFor, upsellDelta } from '../domain/upsells';
import { planOrders, activateSubscription, findFullSlots } from '../domain/subscription';
import { giftCardSchedule } from '../domain/pricing';
import { quotePackage, exactFreshCreditOffer, freshCreditOffer, largerFreshCreditPacks } from '../domain/planQuote';
import { emptyBalance, topUp } from '../domain/credit';
import { nextId } from '../domain/jobs';
import { normalizeContact, contactKey } from '../domain/leads';
import { applyReferral } from '../domain/rewards';
import { createAccountApi } from './customerAccount';

const DOW_BY_NAME = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const NAME_BY_DOW = Object.fromEntries(Object.entries(DOW_BY_NAME).map(([k, v]) => [v, k]));
const GOAL_ALIASES = {
  increase_protein: 'high_protein',
  lower_blood_sugar: 'limit_sugar',
  reduce_fat: 'low_carb',
  lose_weight: 'low_carb'
};
// Người cần lưu ý trong nhà → mục tiêu / kiêng cho AI xếp món. Không hứa chữa bệnh: chỉ "ít tinh bột", "hạn chế đường".
const NEED_TO_GOALS = {
  gym: [],
  weight_loss: ['low_carb'],
  limit_sugar: ['limit_sugar'],
  elderly: ['gentle_digestion'],
  young_child: [],
  sensitive_stomach: ['gentle_digestion']
};
const NEED_TO_RESTRICTIONS = { young_child: ['no_spicy'], sensitive_stomach: ['no_spicy'] };
const WEEKDAY_NAMES = DOW_LABELS;

const ok = (data) => ({ status: 'success', data });
const fail = (code, message, extra = {}) => ({ status: 'error', error: { code, message, ...extra } });
const sum = (a) => a.reduce((x, y) => x + y, 0);
const uniq = (a) => [...new Set(a)];

/** Mã đối soát chuyển khoản: cố định theo hồ sơ, để kế toán khớp tiền với gói. */
export const paymentRefFor = (profileId) => `MOVA${String(profileId).replace(/^prof_/, '').toUpperCase().slice(0, 6)}`;

function profileGoalsFor(a) {
  const needs = (a.household_needs || []).filter((n) => n in NEED_TO_GOALS);
  const goals = uniq([...(a.health_goals || []).map((g) => GOAL_ALIASES[g] || g), ...needs.flatMap((n) => NEED_TO_GOALS[n])]);
  const restrictions = uniq([
    ...(a.allergies_and_restrictions || []).filter((r) => r.startsWith('no_')),
    ...needs.flatMap((n) => NEED_TO_RESTRICTIONS[n] || [])
  ]);
  return { needs, goals, restrictions };
}

/**
 * Lớp API cho app khách. Hình dạng các luồng onboarding / generate-meal-plan / create-or-renew khớp
 * movafresh-platform/docs/api-contract.json; phần thêm cho phễu /plans ghi ở docs/contract-changes.md.
 */
export function createCustomerApi(server, cfg = BUSINESS) {
  // ---------- Thực đơn ----------
  function mealsOf(profile, plan) {
    const mealsCount = profile.mealsPerWeek;
    const base = generateMeals({
      householdSize: profile.householdSize,
      goals: profile.goals,
      restrictions: profile.restrictions,
      mealsCount,
      rand: rng(hash(`${profile.id}-${plan.weekNumber}`)),
      westernCount: westernCountFor(profile.cuisine, mealsCount, cfg),
      weeklyBudgetVnd: profile.weeklyBudgetVnd || null
    });
    const ctx = {
      householdSize: profile.householdSize,
      restrictions: profile.restrictions,
      rand: () => 0,
      cfg
    };
    const withUpsells = (answers) => applyUpsells(base, answers, { ...ctx, rand: rng(hash(`${plan.id}-west`)) });
    const swaps = plan.swaps || {};
    const post = (meals) => applySwaps(meals, swaps, profile.restrictions);
    return { base, meals: post(withUpsells(plan.upsells || {})), post, ctx };
  }

  function dishOut(id, size) {
    if (!id) return undefined;
    const d = DISHES[id];
    const grams = Math.round(d.bom.reduce((s, b) => s + b.gramsPerPerson, 0) * size);
    return {
      dish_id: id, name: d.name, portion_grams: grams, sauce_code: d.sauce, prep_time_minutes: d.prepMinutes,
      sauce_name: d.sauce ? SAUCES[d.sauce].name : null
    };
  }

  function quoteOut(q) {
    return {
      weeks: q.weeks,
      package_value_vnd: q.packageValueVnd,
      week_value_vnd: q.weekValueVnd,
      gift_schedule_vnd: q.giftSchedule,
      gift_total_vnd: q.giftTotalVnd,
      weekly: q.weekly.map((w) => ({ week_index: w.weekIndex, list_vnd: w.listVnd, gift_vnd: w.giftVnd, pay_vnd: w.payVnd })),
      week1_pay_vnd: q.week1PayVnd,
      pay_all_upfront_vnd: q.payAllUpfrontVnd,
      per_meal_list_vnd: q.perMealListVnd,
      per_meal_pay_vnd: q.perMealPayVnd,
      fresh_credit: freshOut(q.freshCredit),
      first_cycle_discount_pct: q.firstCycleDiscountPct,
      max_first_cycle_discount_pct: cfg.incentives.maxFirstCycleDiscountPct
    };
  }
  const freshOut = (o) => ({
    pay_vnd: o.payVnd,
    bonus_vnd: o.bonusVnd,
    bonus_uncapped_vnd: o.bonusUncappedVnd,
    credit_received_vnd: o.creditReceivedVnd,
    capped: o.capped,
    cap_vnd: o.capVnd,
    first_cycle_discount_vnd: o.firstCycleDiscountVnd
  });

  function planView(profile, plan) {
    const size = profile.householdSize;
    const { base, meals, post, ctx } = mealsOf(profile, plan);
    const answers = plan.upsells || {};
    const weekValue = mealsPriceVnd(meals, size);
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const bomRaw = {};
    const sauces = new Set();
    let riceGrams = 0;
    const outMeals = meals.map((m, i) => {
      for (const id of Object.values(m.dishes)) {
        const d = DISHES[id];
        const f = (d.kind === 'protein' ? m.proteinFactor : d.kind === 'carb' ? m.carbFactor : d.kind === 'veg' ? m.vegFactor : 1) || 1;
        for (const b of d.bom) bomRaw[b.sku] = (bomRaw[b.sku] || 0) + b.gramsPerPerson * size * f;
        if (d.sauce) sauces.add(d.sauce);
        if (id === DEFAULT_CARB) riceGrams += d.bom[0].gramsPerPerson * size * f;
      }
      const n = mealNutrition(m, size);
      const protein = DISHES[m.dishes.protein];
      return {
        meal_index: m.index,
        day_label: m.western ? 'Cuối tuần' : days[i % 7],
        theme: size === 1 ? 'Suất ăn nấu 1 chảo' : m.western ? 'Bữa Tây' : 'Mâm cơm Việt 5 phần',
        western: Boolean(m.western),
        meal_structure: {
          protein_dish: dishOut(m.dishes.protein, size),
          soup_dish: dishOut(m.dishes.soup, size),
          veggie_dish: dishOut(m.dishes.veg, size),
          carb_dish: dishOut(m.dishes.carb, size),
          dessert: dishOut(m.dishes.dessert, size)
        },
        highlight_sauce: protein.sauce ? { code: protein.sauce, name: SAUCES[protein.sauce].name } : null,
        carb_choices: carbOptionsFor(m).map((id) => ({ dish_id: id, name: DISHES[id].name })),
        nutrition_summary: { calories_total: n.kcal, protein_g: n.protein, carbs_g: n.carb, fat_g: n.fat },
        price_vnd: mealPriceVnd(m, size)
      };
    });

    const questions = questionsFor(profile).map((q) => {
      const d = upsellDelta(base, answers, q.id, { ...ctx, post, makeRand: () => rng(hash(`${plan.id}-west`)) });
      return {
        id: q.id,
        question: q.question,
        note: q.note,
        answer: q.id in answers ? Boolean(answers[q.id]) : null,
        delta_per_meal_vnd: d.perMealVnd,
        delta_week_vnd: d.weekDeltaVnd,
        affected_meals: d.affectedMeals
      };
    });

    const fruits = uniq(meals.map((m) => m.dishes.dessert).filter(Boolean).map((id) => DISHES[id].name));
    return {
      plan_id: plan.id,
      profile_id: profile.id,
      household_size: size,
      week_number: plan.weekNumber,
      meals_per_week: meals.length,
      meals: outMeals,
      bom_raw_summary: { ...Object.fromEntries(Object.entries(bomRaw).map(([k, v]) => [k, Math.round(v)])), sauce_packets: [...sauces] },
      week_value_vnd: weekValue,
      // Gạo và trái cây tính theo tuần
      weekly_staples: { rice_grams: Math.round(riceGrams), fruits },
      value_questions: questions,
      quote: quoteOut(quotePackage({ weekValueVnd: weekValue, mealsPerWeek: meals.length }, cfg))
    };
  }

  function loadPlan(db, planId) {
    const plan = db.mealPlans.find((p) => p.id === planId);
    if (!plan) return {};
    const profile = db.profiles.find((p) => p.id === plan.profileId);
    return { plan, profile };
  }

  function savePlanMeals(profile, plan, now) {
    plan.meals = mealsOf(profile, plan).meals;
    plan.updatedAt = now.toISOString();
  }

  // ---------- Lịch giao ----------
  function candidateDays(zone, dows, now, weeks, perWeek) {
    return dayKeySequence(dows, dayKey(now), weeks * perWeek + 10)
      .filter((k) => cutoffAtFor(k, cfg).getTime() > now.getTime())
      .slice(0, weeks * perWeek);
  }

  function parseSchedule(zone, schedule = {}) {
    const dows = (schedule.preferred_days || []).map((d) => DOW_BY_NAME[String(d).toLowerCase()]);
    const perWeek = schedule.delivery_frequency === 'twice_a_week' ? 2 : 1;
    if (!dows.length || dows.length !== perWeek || dows.some((d) => !zone.deliveryDays.includes(d))) {
      return { error: fail('DAY_NOT_AVAILABLE', 'Khu của bạn không giao vào các ngày đã chọn') };
    }
    const slot = zone.slots.find((s) => s.id === schedule.preferred_time_slot);
    if (!slot) return { error: fail('SLOT_NOT_AVAILABLE', 'Khu của bạn không có khung giờ đã chọn') };
    return { dows, perWeek, slot };
  }

  /** Dựng đơn của cả chu kỳ mà không ghi gì vào db (dùng chung cho xem trước và đăng ký thật). */
  function draftSubscription(db, now, req, customer) {
    const weeks = req.duration_weeks || cfg.subscription.defaultWeeks;
    if (weeks < cfg.subscription.minWeeks) {
      return { error: fail('MIN_4_WEEKS', `Gói tối thiểu ${cfg.subscription.minWeeks} tuần`) };
    }
    const { plan, profile } = loadPlan(db, req.plan_id);
    if (!profile || !plan || (req.profile_id && req.profile_id !== profile.id)) {
      return { error: fail('PLAN_NOT_FOUND', 'Không tìm thấy hồ sơ hoặc thực đơn') };
    }
    const addr = req.schedule?.shipping_address || {};
    const zone = findZoneByDistrict(`${addr.district || ''} ${addr.city || ''}`) || getZone(profile.zoneId);
    if (!zone) return { error: fail('OUT_OF_ZONE', 'MOVA chưa giao tới khu vực này') };
    const sched = parseSchedule(zone, req.schedule);
    if (sched.error) return { error: sched.error };

    const method = ['fresh_credit', 'bank_transfer_4w', 'card'].includes(req.payment_method) ? req.payment_method : null;
    if (!method) return { error: fail('PAYMENT_METHOD_INVALID', 'Chỉ hỗ trợ trả trước: Fresh Credit, chuyển khoản 4 tuần, thẻ') };

    const { orders, listTotalVnd } = planOrders({
      customer, subscriptionId: null,
      profile: {
        householdSize: profile.householdSize, goals: profile.goals, restrictions: profile.restrictions,
        westernCount: westernCountFor(profile.cuisine, profile.mealsPerWeek, cfg), weeklyBudgetVnd: profile.weeklyBudgetVnd || null
      },
      zoneId: zone.id, slotId: sched.slot.id, dows: sched.dows, weeks,
      mealsPerWeek: profile.mealsPerWeek, week1Meals: plan.meals,
      upsells: plan.upsells || null, lockWeeklyPrice: true,
      voucher: Boolean(req.voucher_code), paymentMethod: method, now,
      rand: rng(hash(`${plan.id}-${db.subscriptions.length}`)), cfg
    });
    return { plan, profile, zone, sched, method, weeks, orders, listTotalVnd, addr };
  }

  function cycleWeeksOut(orders) {
    const byWeek = new Map();
    for (const o of orders) {
      const w = byWeek.get(o.weekIndex) || { week_index: o.weekIndex, deliveries: 0, delivery_date: o.deliveryDay, charge_at: o.chargeAt, cutoff_at: o.cutoffAt, amount_vnd: 0, discount_vnd: 0, list_price_vnd: 0, status: o.status };
      w.deliveries += 1;
      w.amount_vnd += o.amountVnd;
      w.discount_vnd += o.discountVnd;
      w.list_price_vnd += o.listPriceVnd;
      byWeek.set(o.weekIndex, w);
    }
    return [...byWeek.values()].sort((a, b) => a.week_index - b.week_index);
  }

  const deliveriesOut = (orders) =>
    orders.map((o) => ({
      week_index: o.weekIndex, box_index: o.boxIndex, delivery_date: o.deliveryDay, delivery_at: o.deliveryAt,
      charge_at: o.chargeAt, cutoff_at: o.cutoffAt, list_price_vnd: o.listPriceVnd, discount_vnd: o.discountVnd, amount_vnd: o.amountVnd
    }));

  function touchLead(db, now, contact, patch) {
    if (!contact) return null;
    db.leads = db.leads || [];
    const key = contactKey(contact);
    const lead = db.leads.find((l) => contactKey(l.contact) === key);
    if (lead) Object.assign(lead, patch, { updatedAt: now.toISOString() });
    return lead || null;
  }

  return {
    // ---------- Lead và khu vực ----------
    /** Khu vực MOVA đang giao (để hiện danh sách quận/huyện, không viết cứng trong giao diện). */
    serviceAreas() {
      return cfg.zones.map((z) => ({ zone_id: z.id, name: z.name, districts: [...z.districts], province: zoneProvince(z), delivery_days: [...z.deliveryDays] }));
    },

    /** Khách gõ tên quận/huyện tự do: có nằm trong vùng phục vụ không. */
    checkArea(text) {
      const zone = findZoneByDistrict(text || '');
      return { served: Boolean(zone), zone_id: zone ? zone.id : null, zone_name: zone ? zone.name : null };
    },

    /** Lưu lead NGAY khi khách nhập SĐT / email, trước mọi câu hỏi. Cùng liên hệ thì dùng lại lead cũ. */
    captureLead(req = {}) {
      const contact = normalizeContact(req.contact);
      if (!contact) return fail('INVALID_CONTACT', 'Hãy nhập số điện thoại (Zalo) hoặc email hợp lệ');
      return server.write((db, now) => {
        db.leads = db.leads || [];
        const key = contactKey(contact);
        const found = db.leads.find((l) => contactKey(l.contact) === key);
        if (found) {
          found.updatedAt = now.toISOString();
          return ok({ lead_id: found.id, contact_type: contact.type, returning: true });
        }
        const lead = {
          id: nextId(db, 'LEAD'), contact, kind: 'lead', status: 'new', source: req.source || 'plans',
          district: null, profileId: null, customerId: null,
          createdAt: now.toISOString(), updatedAt: now.toISOString()
        };
        db.leads.push(lead);
        return ok({ lead_id: lead.id, contact_type: contact.type, returning: false });
      });
    },

    /** Khu chưa phục vụ: giữ khách trong danh sách chờ để báo khi MOVA tới. */
    joinWaitlist(req = {}) {
      return server.write((db, now) => {
        db.leads = db.leads || [];
        let lead = db.leads.find((l) => l.id === req.lead_id);
        if (!lead) {
          const contact = normalizeContact(req.contact);
          if (!contact) return fail('INVALID_CONTACT', 'Hãy nhập số điện thoại (Zalo) hoặc email hợp lệ');
          lead = db.leads.find((l) => contactKey(l.contact) === contactKey(contact));
          if (!lead) {
            lead = {
              id: nextId(db, 'LEAD'), contact, kind: 'lead', status: 'new', source: req.source || 'plans',
              district: null, profileId: null, customerId: null, createdAt: now.toISOString(), updatedAt: now.toISOString()
            };
            db.leads.push(lead);
          }
        }
        lead.status = 'waitlist';
        lead.waitlistDistrict = String(req.district || '').trim();
        lead.updatedAt = now.toISOString();
        const position = db.leads.filter((l) => l.status === 'waitlist').length;
        return ok({ lead_id: lead.id, status: 'waitlist', district: lead.waitlistDistrict, position });
      });
    },

    // ---------- Hồ sơ và thực đơn ----------
    /** POST /api/v2/onboarding/profile */
    onboardingProfile(req) {
      return server.write((db, now) => {
        const a = req.survey_answers || {};
        const contact = normalizeContact(req.user_contact?.phone_or_email);
        const zone = findZoneByDistrict(a.living_area);
        if (!zone) {
          touchLead(db, now, contact, { district: a.living_area || null, status: 'out_of_zone' });
          return fail('OUT_OF_ZONE', 'MOVA chưa giao tới khu vực này');
        }
        const size = Math.max(cfg.plan.householdMin, Math.min(cfg.plan.householdMax, Number(a.household_size) || cfg.plan.householdMin));
        const { needs, goals, restrictions } = profileGoalsFor(a);
        const meals = Number(a.weekly_home_meals_count) || cfg.plan.mealsPerWeekDefault;
        const mealsPerWeek = Math.max(cfg.plan.mealsPerWeekMin, Math.min(cfg.plan.mealsPerWeekMax, meals));
        const budget = Number(a.weekly_grocery_budget_vnd) > 0 ? Number(a.weekly_grocery_budget_vnd) : null;

        const profile = {
          id: `prof_${hash(`${req.user_contact?.phone_or_email}${db.profiles.length}`).toString(16).replace('-', '').slice(0, 8)}`,
          contact: req.user_contact || {},
          leadId: req.lead_id || null,
          zoneId: zone.id,
          livingArea: a.living_area,
          householdSize: size,
          needs,
          goals,
          restrictions,
          cuisine: a.cuisine === 'viet_western' ? 'viet_western' : 'viet',
          mealsPerWeek,
          weeklyBudgetVnd: budget,
          createdAt: now.toISOString()
        };
        db.profiles.push(profile);
        touchLead(db, now, contact, { status: 'profiled', district: a.living_area, profileId: profile.id });

        const tier = goals.includes('high_protein') ? (goals.includes('limit_sugar') || goals.includes('low_carb') ? 'Low_Carb_High_Protein' : 'High_Protein') : goals.includes('limit_sugar') || goals.includes('low_carb') ? 'Low_Carb' : 'Balanced';
        const sampleMeals = generateMeals({
          householdSize: size, goals, restrictions, mealsCount: profile.mealsPerWeek, rand: rng(hash(profile.id)),
          westernCount: westernCountFor(profile.cuisine, profile.mealsPerWeek, cfg), weeklyBudgetVnd: budget
        });
        return ok({
          profile_id: profile.id,
          household_type: size === 1 ? 'single' : 'family',
          dietary_tier: tier,
          recommended_caloric_target_per_meal: goals.includes('low_carb') ? 550 : goals.includes('high_protein') ? 700 : 650,
          suggested_package: size === 1 ? 'solo_4_weeks' : 'family_care_4_weeks',
          estimated_weekly_budget_vnd: mealsPriceVnd(sampleMeals, size),
          initial_credit_bonus_earned_vnd: cfg.incentives.rewards.profileComplete,
          zone_id: zone.id
        });
      });
    },

    /** POST /api/v2/ai/generate-meal-plan */
    generateMealPlan(req) {
      return server.write((db, now) => {
        const profile = db.profiles.find((p) => p.id === req.profile_id);
        if (!profile) return fail('PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ');
        const extraProtein = (req.custom_upsell_additions || []).some((x) => x.startsWith('extra_') && x.includes('protein'));
        const weekNumber = req.week_number || 1;
        const planId = `plan_w${weekNumber}_${profile.id.slice(5)}`;
        const plan = {
          id: planId, profileId: profile.id, weekNumber, meals: [], upsells: extraProtein ? { more_protein: true } : {}, swaps: {},
          createdAt: now.toISOString()
        };
        savePlanMeals(profile, plan, now);
        const existing = db.mealPlans.findIndex((p) => p.id === planId);
        if (existing >= 0) db.mealPlans[existing] = plan;
        else db.mealPlans.push(plan);
        return ok(planView(profile, plan));
      });
    },

    /** Lấy lại thực đơn đã lưu (tải lại trang, bấm quay lại). */
    getPlan(planId) {
      return server.read((db) => {
        const { plan, profile } = loadPlan(db, planId);
        if (!plan) return fail('PLAN_NOT_FOUND', 'Không tìm thấy thực đơn');
        return ok(planView(profile, plan));
      });
    },

    /**
     * Chỉnh thực đơn trước khi đăng ký: đổi số người, trả lời câu hỏi giá trị, đổi món.
     * req = { plan_id, household_size?, upsells?: { id: true|false|null }, swap?: { meal_index, kind, dish_id } }
     */
    configurePlan(req = {}) {
      return server.write((db, now) => {
        const { plan, profile } = loadPlan(db, req.plan_id);
        if (!plan) return fail('PLAN_NOT_FOUND', 'Không tìm thấy thực đơn');
        if (req.household_size != null) {
          const size = Number(req.household_size);
          if (!Number.isInteger(size) || size < cfg.plan.householdMin || size > cfg.plan.householdMax) {
            return fail('HOUSEHOLD_SIZE_INVALID', `Số người ăn từ ${cfg.plan.householdMin} đến ${cfg.plan.householdMax}`);
          }
          profile.householdSize = size;
        }
        if (req.upsells) {
          plan.upsells = { ...(plan.upsells || {}) };
          for (const [id, v] of Object.entries(req.upsells)) {
            if (!['more_protein', 'low_carb_veg', 'western_meal'].includes(id)) return fail('UPSELL_INVALID', 'Câu hỏi không tồn tại');
            if (v === null || v === undefined) delete plan.upsells[id];
            else plan.upsells[id] = Boolean(v);
          }
        }
        if (req.swap) {
          const { meal_index: idx, kind, dish_id: dishId } = req.swap;
          const meal = mealsOf(profile, plan).meals.find((m) => m.index === idx);
          if (!meal) return fail('MEAL_NOT_FOUND', 'Không tìm thấy bữa ăn');
          if (!swapOptionsFor(meal, kind, profile.restrictions).some((d) => d.id === dishId)) {
            return fail('DISH_NOT_ALLOWED', 'Món này không đổi được cho bữa này');
          }
          plan.swaps = { ...(plan.swaps || {}), [idx]: { ...((plan.swaps || {})[idx] || {}), [kind]: dishId } };
        }
        savePlanMeals(profile, plan, now);
        return ok(planView(profile, plan));
      });
    },

    /** Các món khách đổi được cho một phần của một bữa, kèm chênh lệch giá của cả hộ. */
    swapOptions(req = {}) {
      return server.read((db) => {
        const { plan, profile } = loadPlan(db, req.plan_id);
        if (!plan) return fail('PLAN_NOT_FOUND', 'Không tìm thấy thực đơn');
        const meal = mealsOf(profile, plan).meals.find((m) => m.index === req.meal_index);
        if (!meal || !meal.dishes[req.kind]) return fail('MEAL_NOT_FOUND', 'Không tìm thấy phần ăn này');
        const size = profile.householdSize;
        const current = mealPriceVnd(meal, size);
        const options = swapOptionsFor(meal, req.kind, profile.restrictions).map((d) => {
          const alt = { ...meal, dishes: { ...meal.dishes, [req.kind]: d.id } };
          return {
            dish_id: d.id,
            name: d.name,
            sauce_name: d.sauce ? SAUCES[d.sauce].name : null,
            prep_time_minutes: d.prepMinutes,
            price_delta_vnd: mealPriceVnd(alt, size) - current,
            current: d.id === meal.dishes[req.kind]
          };
        });
        return ok({ meal_index: meal.index, kind: req.kind, options });
      });
    },

    // ---------- Giao hàng ----------
    /** Các khung giao còn chỗ của một khu (app khách chỉ hiện khung còn sức chứa). */
    availableSlots(zoneId, days = 4) {
      return server.read((db, now) => availableSlots(db.orders, zoneId, now, days, cfg));
    },

    /**
     * Lựa chọn lịch giao cho một hồ sơ: ngày trong tuần và khung giờ mà MỌI lần giao của chu kỳ còn chỗ.
     * Khung đã đầy ở bất kỳ ngày nào của chu kỳ thì không có trong kết quả.
     */
    deliveryOptions(req = {}) {
      return server.read((db, now) => {
        const profile = db.profiles.find((p) => p.id === req.profile_id);
        const zone = profile && getZone(profile.zoneId);
        if (!zone) return fail('PROFILE_NOT_FOUND', 'Không tìm thấy hồ sơ');
        const perWeek = req.deliveries_per_week === 2 ? 2 : 1;
        const weeks = cfg.subscription.defaultWeeks;
        const sets = perWeek === 2 ? (zone.deliveryDays.length >= 2 ? [zone.deliveryDays.slice(0, 2)] : []) : zone.deliveryDays.map((d) => [d]);
        const options = [];
        for (const dows of sets) {
          const days = candidateDays(zone, dows, now, weeks, perWeek);
          if (days.length < weeks * perWeek) continue;
          const slots = zone.slots
            .filter((slot) => findFullSlots(db, days.map((day) => ({ zoneId: zone.id, deliveryDay: day, slotId: slot.id })), cfg).length === 0)
            .map((slot) => ({ slot_id: slot.id, label: slot.label }));
          if (!slots.length) continue;
          options.push({
            preferred_days: dows.map((d) => NAME_BY_DOW[d]),
            day_labels: dows.map((d) => WEEKDAY_NAMES[d]),
            first_delivery_date: days[0],
            first_delivery_label: fmtDay(days[0]),
            first_dish_change_deadline: cutoffAtFor(days[0], cfg).toISOString(),
            slots
          });
        }
        return ok({
          zone_id: zone.id,
          zone_name: zone.name,
          province: zoneProvince(zone),
          districts: [...zone.districts],
          lead_time_notice_hours: cfg.timings.remindBeforeDeliveryHours,
          options
        });
      });
    },

    /**
     * Xem trước lịch giao, lịch trừ tiền và số tiền cho từng cách trả trước, không ghi gì.
     * Cùng hình dạng yêu cầu với createSubscription (bỏ qua thông tin người nhận).
     */
    previewSubscription(req) {
      return server.read((db, now) => {
        const customer = { id: 'C-PREVIEW', name: '', phone: '', address: '' };
        const d = draftSubscription(db, now, { ...req, payment_method: req.payment_method || 'bank_transfer_4w', voucher_code: req.voucher_code ?? cfg.incentives.giftCardCode }, customer);
        if (d.error) return d.error;
        const fullSlots = findFullSlots(db, d.orders, cfg);
        const gift = d.orders.reduce((s, o) => s + o.discountVnd, 0);
        const exact = exactFreshCreditOffer({ packageValueVnd: d.listTotalVnd, giftTotalVnd: gift }, cfg);
        const totalAfterGift = d.listTotalVnd - gift;
        const week1 = d.orders.filter((o) => o.weekIndex === 0);
        return ok({
          payment_ref: paymentRefFor(d.profile.id),
          zone_id: d.zone.id,
          slot: d.sched.slot.label,
          weeks: d.weeks,
          package_value_vnd: d.listTotalVnd,
          gift_total_vnd: gift,
          slot_full: fullSlots.length > 0,
          deliveries: deliveriesOut(d.orders),
          cycle_weeks: cycleWeeksOut(d.orders),
          first_delivery_date: d.orders[0].deliveryDay,
          first_dish_change_deadline: d.orders[0].cutoffAt,
          bank_transfer_4w: { pay_vnd: totalAfterGift },
          card: {
            charge_now_vnd: sum(week1.map((o) => o.amountVnd)),
            charges: d.orders.map((o) => ({ week_index: o.weekIndex, amount_vnd: o.amountVnd, charge_at: o.chargeAt, now: o.weekIndex === 0 }))
          },
          fresh_credit: {
            ...freshOut(exact),
            packs: largerFreshCreditPacks({ packageValueVnd: d.listTotalVnd, giftTotalVnd: gift, minPayVnd: exact.payVnd }, cfg).map((p) => ({ pack_id: p.id, label: p.label, ...freshOut(p) }))
          }
        });
      });
    },

    /** POST /api/v2/subscription/create-or-renew */
    createSubscription(req) {
      return server.write((db, now) => {
        if ((req.duration_weeks || 0) < cfg.subscription.minWeeks) {
          return fail('MIN_4_WEEKS', `Gói tối thiểu ${cfg.subscription.minWeeks} tuần`);
        }
        const { profile: prof0 } = loadPlan(db, req.plan_id);
        const addr0 = req.schedule?.shipping_address || {};
        const contact = prof0 ? normalizeContact(prof0.contact?.phone_or_email) : null;
        const customer = {
          id: `C-${String(db.customers.length + 1).padStart(4, '0')}`,
          name: addr0.receiver_name || 'Khách MOVA',
          phone: addr0.receiver_phone || (contact?.type === 'phone' ? contact.value : ''),
          email: contact?.type === 'email' ? contact.value : null,
          address: [addr0.street, addr0.district, addr0.city].filter(Boolean).join(', '),
          district: addr0.district || '',
          zoneId: null,
          personaId: null,
          credit: req.starting_credit ? topUp(emptyBalance(), req.starting_credit.real || 0, req.starting_credit.promo || 0) : emptyBalance(),
          cardFailsNext: false
        };
        const d = draftSubscription(db, now, req, customer);
        if (d.error) return d.error;
        const { profile, zone, sched, method, weeks, orders, listTotalVnd } = d;
        customer.zoneId = zone.id;
        const paymentRef = paymentRefFor(profile.id);

        if (findFullSlots(db, orders, cfg).length) {
          return fail('SLOT_FULL', 'Khung giờ bạn chọn đã đầy, vui lòng chọn khung khác');
        }

        // Nạp Fresh Credit (mô phỏng: tiền đã về). Thưởng nạp bị chặn bởi trần ưu đãi chu kỳ đầu.
        let topupPlan = null;
        if (method === 'fresh_credit' && req.topup_pay_vnd) {
          const gift = orders.reduce((s, o) => s + o.discountVnd, 0);
          const exact = exactFreshCreditOffer({ packageValueVnd: listTotalVnd, giftTotalVnd: gift }, cfg);
          const payVnd = Number(req.topup_pay_vnd);
          if (!(payVnd >= exact.payVnd)) {
            return fail('TOPUP_TOO_LOW', 'Số tiền nạp chưa đủ trả cho cả 4 tuần', { required_vnd: exact.payVnd });
          }
          topupPlan = payVnd === exact.payVnd ? exact : freshCreditOffer({ packageValueVnd: listTotalVnd, giftTotalVnd: gift, payVnd }, cfg);
        }

        // Từ đây mới ghi vào db
        const subscription = {
          id: nextId(db, 'SUB'), customerId: customer.id, status: 'active', weeks,
          paymentMethod: method, deliveriesPerWeek: sched.perWeek, zoneId: zone.id, slotId: sched.slot.id,
          paymentRef, profileId: profile.id, planId: req.plan_id, createdAt: now.toISOString()
        };
        for (const o of orders) o.subscriptionId = subscription.id;

        let topupInfo = null;
        if (topupPlan) {
          customer.credit = topUp(customer.credit, topupPlan.payVnd, topupPlan.bonusVnd);
          const at = now.toISOString();
          db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind: 'topup', amountVnd: topupPlan.payVnd, real: topupPlan.payVnd, promo: 0, ref: paymentRef, at });
          if (topupPlan.bonusVnd > 0) db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind: 'topup_bonus', amountVnd: topupPlan.bonusVnd, real: 0, promo: topupPlan.bonusVnd, ref: paymentRef, at });
          topupInfo = freshOut(topupPlan);
        }

        db.customers.push(customer);
        db.subscriptions.push(subscription);
        const res = activateSubscription(db, { customer, subscription, orders, now, cfg });
        if (!res.ok) {
          db.customers.pop();
          db.subscriptions.pop();
          db.ledger = db.ledger.filter((l) => l.customerId !== customer.id);
          return fail(res.error, 'Số dư Fresh Credit chưa đủ cho tuần đầu tiên');
        }

        touchLead(db, now, contact, { status: 'converted', customerId: customer.id, profileId: profile.id });

        // Mã mời: người mời nhận thưởng khi khách mới trả gói đầu tiên; khách mới nhận thưởng trong trần ưu đãi chu kỳ đầu
        const giftTotal = res.orders.reduce((s, o) => s + o.discountVnd, 0);
        const referral = req.referral_code
          ? applyReferral(db, now, { referee: customer, code: req.referral_code, packageValueVnd: listTotalVnd, discountSoFarVnd: giftTotal + (topupPlan ? topupPlan.bonusVnd : 0) }, cfg)
          : { applied: false };
        const first = res.orders[0];
        const last = res.orders[res.orders.length - 1];
        const gift = req.voucher_code ? giftCardSchedule(listTotalVnd, cfg) : [0, 0, 0, 0];
        return ok({
          subscription_id: subscription.id,
          customer_id: customer.id,
          status: 'active',
          payment_ref: paymentRef,
          payment_method: method,
          cycle_start_date: first.deliveryDay,
          cycle_end_date: last.deliveryDay,
          package_value_vnd: listTotalVnd,
          total_order_amount_vnd: res.orders.reduce((s, o) => s + o.amountVnd, 0),
          paid_now_vnd: topupInfo ? topupInfo.pay_vnd : res.chargedNowVnd,
          voucher_discount_applied_week1_vnd: gift[0] || 0,
          voucher_future_credits_locked_vnd: gift.slice(1).reduce((a, b) => a + b, 0),
          charged_from_fresh_credit_vnd: method === 'fresh_credit' ? res.chargedNowVnd : 0,
          fresh_credit_balance_remaining_vnd: customer.credit.real + customer.credit.promo,
          topup: topupInfo,
          referral: referral.applied ? { referee_bonus_vnd: referral.refereeBonusVnd } : null,
          auto_debit_cutoff_hours: cfg.timings.chargeBeforeDeliveryHours,
          // Khác contract cũ: không còn "dish_customization_cutoff_hours" (xem docs/contract-changes.md)
          dish_customization_cutoff_at: first.cutoffAt,
          next_delivery: {
            date: first.deliveryDay,
            slot: sched.slot.label,
            dish_change_deadline: first.cutoffAt
          },
          deliveries: deliveriesOut(res.orders),
          cycle_weeks: cycleWeeksOut(res.orders)
        });
      });
    },

    listNotifications(customerId) {
      return server.read((db) => db.notifications.filter((n) => n.customerId === customerId).reverse());
    },

    // ---------- Tài khoản khách (P1B): các tuần của tôi, đổi món, tạm hoãn, dừng gói, Fresh Credit, thưởng, QR ----------
    ...createAccountApi(server, cfg)
  };
}
