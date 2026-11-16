<template>
  <article class="meal" :class="{ west: meal.western }">
    <header class="meal-h">
      <div>
        <b class="meal-t">Bữa {{ meal.meal_index }} <span class="muted">· {{ meal.day_label }}</span></b>
        <span class="pl-pill" :class="{ orange: meal.western }">{{ meal.theme }}</span>
      </div>
      <span v-if="showPrice" class="meal-price num">{{ fmt(meal.price_vnd) }}</span>
    </header>

    <ul class="parts">
      <li v-for="p in parts" :key="p.kind" class="part">
        <div class="part-row">
          <span class="kind">{{ p.label }}</span>
          <span class="dish">
            {{ p.dish.name }}
            <small v-if="p.note" class="muted">{{ p.note }}</small>
          </span>
          <button
            v-if="editable && p.swappable"
            type="button"
            class="swap-btn"
            :aria-expanded="open === p.kind"
            @click="toggle(p.kind)"
          >{{ open === p.kind ? 'Đóng' : 'Đổi' }}</button>
        </div>

        <ul v-if="open === p.kind" class="opts" :aria-label="'Món có thể đổi: ' + p.label">
          <li v-for="o in options" :key="o.dish_id">
            <button type="button" class="opt" :class="{ cur: o.current }" :disabled="o.current" @click="choose(p.kind, o.dish_id)">
              <span>{{ o.name }}<small v-if="o.sauce_name" class="muted"> · {{ o.sauce_name }}</small></span>
              <span class="num delta">{{ o.current ? 'Đang chọn' : deltaText(o.price_delta_vnd) }}</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>

    <footer v-if="meal.highlight_sauce" class="sauce">
      Điểm nhấn: <b>{{ meal.highlight_sauce.name }}</b>
    </footer>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';

const props = defineProps({
  meal: { type: Object, required: true },
  planId: { type: String, default: '' },
  editable: { type: Boolean, default: false },
  showPrice: { type: Boolean, default: true }
});
const emit = defineEmits(['swap']);

const open = ref('');
const options = ref([]);

const RICE = 'D-CRB-001';

const parts = computed(() => {
  const s = props.meal.meal_structure;
  const list = [];
  if (s.protein_dish) list.push({ kind: 'protein', label: 'Đạm', dish: s.protein_dish, swappable: true });
  if (s.veggie_dish) list.push({ kind: 'veg', label: 'Rau', dish: s.veggie_dish, swappable: true });
  if (s.soup_dish) list.push({ kind: 'soup', label: 'Canh', dish: s.soup_dish, swappable: true });
  if (s.carb_dish) {
    const rice = s.carb_dish.dish_id === RICE;
    list.push({
      kind: 'carb', label: 'Tinh bột', dish: s.carb_dish,
      swappable: props.meal.carb_choices.length > 1,
      note: rice ? '· gạo tính theo tuần' : ''
    });
  }
  if (s.dessert) list.push({ kind: 'dessert', label: 'Trái cây', dish: s.dessert, swappable: false, note: '· tính theo tuần' });
  return list;
});

function toggle(kind) {
  if (open.value === kind) {
    open.value = '';
    return;
  }
  const res = api.customer.swapOptions({ plan_id: props.planId, meal_index: props.meal.meal_index, kind });
  options.value = res.status === 'success' ? res.data.options : [];
  open.value = kind;
}

function choose(kind, dishId) {
  open.value = '';
  emit('swap', props.meal.meal_index, kind, dishId);
}

function deltaText(v) {
  if (!v) return 'Giá như nhau';
  return `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`;
}
</script>

<style scoped>
.meal { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; display: grid; gap: 10px; }
.meal.west { background: #FFFBF6; border-color: #F1C7B1; }
.meal-h { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.meal-h > div { display: grid; gap: 6px; justify-items: start; }
.meal-t { font-size: 17px; }
.meal-price { font-size: 16px; font-weight: 700; white-space: nowrap; }
.parts { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.part-row { display: grid; grid-template-columns: 84px 1fr auto; gap: 10px; align-items: center; min-height: 44px; }
.kind { font-size: 14px; font-weight: 700; color: var(--green-d); }
.dish { font-size: 16px; line-height: 1.35; }
.dish small { display: block; font-size: 14px; }
.swap-btn { min-width: 64px; min-height: 44px; border: 1.5px solid var(--green); background: var(--card); color: var(--green-d); border-radius: 12px; font-size: 16px; font-weight: 700; }
.swap-btn:hover { background: var(--green-soft); }
.opts { list-style: none; margin: 4px 0 8px; padding: 8px; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; display: grid; gap: 6px; }
.opt { width: 100%; min-height: 48px; display: flex; justify-content: space-between; align-items: center; gap: 10px; text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; font-size: 16px; }
.opt:hover:not(:disabled) { border-color: var(--green); background: var(--green-soft); }
.opt.cur { background: var(--green-soft); border-color: var(--green); font-weight: 600; }
.delta { font-size: 15px; font-weight: 700; white-space: nowrap; }
.sauce { font-size: 15px; background: var(--orange-soft); color: var(--orange-ink); border-radius: 10px; padding: 8px 12px; }
@media (max-width: 480px) {
  .part-row { grid-template-columns: 72px 1fr auto; gap: 8px; }
}
</style>
