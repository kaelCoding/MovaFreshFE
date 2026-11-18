<template>
  <div v-if="plan" class="menu">
    <header class="m-head">
      <h1 class="pl-h1">Thực đơn tuần 1 của bạn</h1>
      <p class="pl-lead">
        Đầu bếp MOVA đã tuyển chọn {{ plan.meals_per_week }} bữa cho {{ plan.household_size }} người. Bạn xem và đổi món trước, hài lòng rồi mới trả tiền.
      </p>
    </header>

    <div class="m-grid">
      <section class="pl-card people" style="grid-area: people">
        <div class="people-in">
          <div>
            <b class="p-t">Số người ăn</b>
            <p class="pl-note">
              {{ plan.household_size === 1 ? 'Suất nấu 1 chảo, 10–15 phút.' : 'Mâm cơm Việt: đạm, rau, canh, tinh bột, trái cây.' }}
            </p>
          </div>
          <PeopleStepper :model-value="plan.household_size" @update:model-value="(v) => store.configure({ household_size: v })" />
        </div>
      </section>

      <aside class="side" style="grid-area: side">
        <PriceBlock :quote="plan.quote" :household-size="plan.household_size" />
        <ValueQuestions :questions="plan.value_questions" @answer="(id, v) => store.answerUpsell(id, v)" />
      </aside>

      <section class="meals" style="grid-area: meals" aria-label="Các bữa trong tuần 1">
        <MealCard
          v-for="m in plan.meals"
          :key="m.meal_index"
          :meal="m"
          :plan-id="plan.plan_id"
          :household-size="plan.household_size"
          editable
          @swap="(i, kind, id) => store.swap(i, kind, id)"
        />
        <p v-if="staples" class="staples">
          <b>Gạo và trái cây tính theo tuần:</b>
          {{ staples }}
        </p>
        <p v-if="store.error" class="pl-error" role="alert">{{ store.error }}</p>
      </section>
    </div>

    <div class="cta">
      <div class="cta-sum">
        <small>Gói {{ plan.quote.weeks }} tuần trị giá {{ fmt(plan.quote.package_value_vnd) }}</small>
        <b class="num">
          ~{{ fmt(Math.round(plan.quote.per_meal_list_vnd / (plan.household_size || 1))) }}
          <span class="pl-unit">/ suất</span>
          <span class="pl-sub-unit"> ({{ fmt(plan.quote.per_meal_list_vnd) }}/bữa)</span>
        </b>
      </div>
      <button class="pl-btn primary" type="button" @click="$emit('next')">Tiếp tục: giao hàng và thanh toán</button>
    </div>
  </div>
  <div v-else class="pl-card">Đang dựng thực đơn của bạn...</div>
</template>

<script setup>
import { computed } from 'vue';
import MealCard from './MealCard.vue';
import PriceBlock from './PriceBlock.vue';
import ValueQuestions from './ValueQuestions.vue';
import PeopleStepper from './PeopleStepper.vue';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { fmt } from '../../shared/utils/formatters';

defineEmits(['next']);
const store = usePlanFlowStore();
const plan = computed(() => store.plan);

const staples = computed(() => {
  const s = plan.value && plan.value.weekly_staples;
  if (!s) return '';
  const rice = s.rice_grams ? `khoảng ${(s.rice_grams / 1000).toFixed(1).replace('.', ',')} kg gạo ST25 cho cả tuần` : '';
  const fruit = s.fruits.length ? `trái cây theo tuần: ${s.fruits.join(', ')}` : '';
  return [rice, fruit].filter(Boolean).join('; ') + '.';
});
</script>

<style scoped>
.m-head { margin-bottom: 14px; }
.m-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  grid-template-areas: 'people side' 'meals side';
  grid-template-rows: auto 1fr;
  gap: 16px;
  align-items: start;
}
.people-in { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.p-t { font-size: 17px; }
.side { display: grid; gap: 14px; position: sticky; top: 84px; }
.meals { display: grid; gap: 12px; }
.staples { font-size: 15px; background: var(--green-soft); color: var(--green-d); border-radius: 12px; padding: 10px 14px; }
.cta {
  position: sticky; bottom: 0; z-index: 10; margin: 18px -20px 0; padding: 12px 20px;
  background: rgba(250, 249, 245, .96); border-top: 1px solid var(--line);
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
}
.cta-sum { display: grid; line-height: 1.15; }
.cta-sum small { font-size: 14px; color: var(--muted); }
.cta-sum b { font-size: 22px; }
.pl-unit { font-size: 15px; font-weight: 500; color: var(--muted); }

@media (max-width: 900px) {
  .m-grid { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'people' 'side' 'meals'; }
  .side { position: static; }
}
@media (max-width: 560px) {
  .cta { margin-left: -16px; margin-right: -16px; padding: 10px 16px; }
  .cta .pl-btn { flex: 1; padding: 12px 10px; font-size: 16px; }
  .cta-sum b { font-size: 19px; }
}
</style>
