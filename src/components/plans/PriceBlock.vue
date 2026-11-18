<template>
  <section class="pb" aria-label="Giá trị gói 4 tuần">
    <p class="pb-label">GÓI {{ quote.weeks }} TUẦN CỦA BẠN</p>
    <div class="pb-price-main">
      <p class="pb-value num">{{ fmt(quote.package_value_vnd) }}</p>
      <span class="pb-avg-meal num">(~{{ fmt(Math.round(quote.per_meal_list_vnd / (householdSize || 1))) }}/suất • {{ fmt(quote.per_meal_list_vnd) }}/bữa)</span>
    </div>

    <div class="pb-week1-box">
      <span class="badge-deal">Ưu đãi tuần đầu tiên</span>
      <p class="pb-week1">
        <span class="strike num">{{ fmt(quote.weekly[0]?.list_vnd) }} ({{ mealRate(quote.weekly[0]?.list_vnd) }})</span>
        <span class="arrow">→</span>
        <b class="highlight num">{{ fmt(quote.week1_pay_vnd) }} <small>({{ mealRate(quote.week1_pay_vnd) }})</small></b>
      </p>
    </div>

    <ol class="pb-weeks">
      <li v-for="w in quote.weekly" :key="w.week_index">
        <span class="wk">Tuần {{ w.week_index + 1 }}</span>
        <div class="week-prices num">
          <span v-if="w.gift_vnd" class="strike small">{{ fmt(w.list_vnd) }}</span>
          <b class="pay">{{ fmt(w.pay_vnd) }}</b>
          <span class="per-meal">({{ mealRate(w.pay_vnd) }})</span>
        </div>
        <span v-if="w.gift_vnd" class="num sub">Thẻ quà tặng MOVA Fresh −{{ fmt(w.gift_vnd) }}</span>
      </li>
    </ol>

    <div class="pb-meal">
      <span class="meal-tag">Giá mỗi bữa ăn</span>
      <p>
        Gốc <s class="num">{{ fmt(quote.per_meal_list_vnd) }}</s> → Bạn chỉ trả
        <b class="num text-green">{{ fmt(quote.per_meal_pay_vnd) }}</b>
        <span class="serving-rate"> (~{{ fmt(Math.round(quote.per_meal_pay_vnd / (householdSize || 1))) }}/suất)</span>
        <span class="muted"> (đã gồm sơ chế sạch 100%, định lượng chuẩn & gói xốt MOVA đặc biệt)</span>
      </p>
    </div>

    <p class="pb-fc">
      Nạp Fresh Credit nhận <b class="num">{{ fmt(quote.fresh_credit.credit_received_vnd) }}</b>,
      chỉ trả <b class="num">{{ fmt(quote.fresh_credit.pay_vnd) }}</b>
    </p>
  </section>
</template>

<script setup>
import { fmt } from '../../shared/utils/formatters';

const props = defineProps({
  quote: { type: Object, required: true },
  householdSize: { type: Number, default: 2 }
});

const mealsCount = props.quote.meals_per_week || 5;

function mealRate(vnd) {
  if (!vnd) return '';
  const perMeal = Math.round(vnd / mealsCount);
  const perServing = Math.round(perMeal / (props.householdSize || 1));
  return `~${fmt(perServing)}/suất (${fmt(perMeal)}/bữa)`;
}
</script>

<style scoped>
.pb { background: var(--card); border: 1.5px solid var(--green); border-radius: 18px; padding: 18px; display: grid; gap: 10px; }
.pb-label { font-size: 15px; font-weight: 700; color: var(--green-d); text-transform: uppercase; letter-spacing: .03em; margin: 0; }
.pb-price-main { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.pb-value { font-size: clamp(32px, 6vw, 40px); font-weight: 800; line-height: 1.05; letter-spacing: -.02em; margin: 0; }
.pb-avg-meal { font-size: 15px; color: var(--muted); font-weight: 600; }

.pb-week1-box {
  background: var(--orange-soft);
  border: 1px solid #F1C7B1;
  border-radius: 12px;
  padding: 10px 14px;
  display: grid;
  gap: 4px;
}
.badge-deal {
  font-size: 11px;
  font-weight: 800;
  color: var(--orange-ink);
  text-transform: uppercase;
}
.pb-week1 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.strike { text-decoration: line-through; color: var(--muted); }
.strike.small { font-size: 13px; margin-right: 6px; }
.arrow { color: var(--muted); font-weight: bold; }
.highlight { font-size: 19px; color: var(--orange-ink); }
.highlight small { font-size: 14px; font-weight: 600; }

.pb-weeks { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 6px; }
.pb-weeks li { display: grid; grid-template-columns: 1fr auto; column-gap: 8px; font-size: 14px; padding: 7px 0; border-top: 1px solid var(--line-2); }
.pb-weeks .wk { font-weight: 700; }
.week-prices { display: flex; align-items: baseline; gap: 4px; justify-content: flex-end; }
.week-prices .pay { font-size: 15px; }
.week-prices .per-meal { font-size: 13px; color: var(--muted); }
.pb-weeks .sub { grid-column: 1 / -1; color: var(--green-d); font-size: 13px; font-weight: 600; }

.pb-meal { font-size: 14px; border-top: 1px solid var(--line-2); padding-top: 8px; display: grid; gap: 4px; }
.meal-tag { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
.pb-meal p { margin: 0; line-height: 1.4; }
.text-green { color: var(--green-d); font-size: 16px; }

.pb-fc { font-size: 14px; border-top: 1px solid var(--line-2); padding-top: 8px; margin: 0; color: var(--green-d); }
</style>
