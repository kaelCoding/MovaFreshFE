<template>
  <section class="pb" aria-label="Giá trị gói 4 tuần">
    <p class="pb-label">Gói {{ quote.weeks }} tuần trị giá</p>
    <p class="pb-value num">{{ fmt(quote.package_value_vnd) }}</p>
    <p class="pb-week1">
      Đăng ký hôm nay, tuần 1 chỉ trả
      <b class="num">{{ fmt(quote.week1_pay_vnd) }}</b>
    </p>

    <ol class="pb-weeks">
      <li v-for="w in quote.weekly" :key="w.week_index">
        <span class="wk">Tuần {{ w.week_index + 1 }}</span>
        <b class="num pay">trả {{ fmt(w.pay_vnd) }}</b>
        <span class="num sub">trị giá {{ fmt(w.list_vnd) }}{{ w.gift_vnd ? `, thẻ quà tặng −${fmt(w.gift_vnd)}` : '' }}</span>
      </li>
    </ol>

    <p class="pb-meal">
      Mỗi bữa trị giá <b class="num">{{ fmt(quote.per_meal_list_vnd) }}</b>, bạn trả
      <b class="num">{{ fmt(quote.per_meal_pay_vnd) }}</b>
      <span class="muted"> (đã gồm sơ chế sẵn, định lượng đủ nhà bạn và xốt công thức)</span>
    </p>
    <p class="pb-fc">
      Nạp Fresh Credit một lần cho cả {{ quote.weeks }} tuần: nhận
      <b class="num">{{ fmt(quote.fresh_credit.credit_received_vnd) }}</b>, chỉ trả
      <b class="num">{{ fmt(quote.fresh_credit.pay_vnd) }}</b>
    </p>
  </section>
</template>

<script setup>
import { fmt } from '../../shared/utils/formatters';

defineProps({ quote: { type: Object, required: true } });
</script>

<style scoped>
.pb { background: var(--card); border: 1.5px solid var(--green); border-radius: 18px; padding: 18px 18px 16px; display: grid; gap: 8px; }
.pb-label { font-size: 16px; font-weight: 700; color: var(--green-d); }
.pb-value { font-size: clamp(34px, 7vw, 44px); font-weight: 800; line-height: 1.05; letter-spacing: -.02em; }
.pb-week1 { font-size: 16px; }
.pb-week1 b { font-size: 18px; color: var(--orange-ink); }
.pb-weeks { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 6px; }
.pb-weeks li { display: grid; grid-template-columns: 1fr auto; column-gap: 8px; font-size: 15px; padding: 7px 0; border-top: 1px solid var(--line-2); }
.pb-weeks .wk { font-weight: 700; }
.pb-weeks .pay { font-size: 16px; text-align: right; }
.pb-weeks .sub { grid-column: 1 / -1; color: var(--muted); font-size: 14px; }
.pb-meal, .pb-fc { font-size: 15px; border-top: 1px solid var(--line-2); padding-top: 8px; }
.pb-fc { color: var(--green-d); }
</style>
