<template>
  <section class="samples" id="mam-com-mau">
    <div class="wrap">
      <div class="sec-h">
        <h2>Vài mâm cơm mẫu</h2>
        <p>Chỉ để bạn hình dung. Thực đơn thật của nhà bạn do AI xếp theo câu trả lời của bạn.</p>
      </div>
      <div class="grid">
        <div v-for="s in samples" :key="s.title" class="sample">
          <p class="tag">{{ s.title }}</p>
          <MealCard :meal="s.meal" :show-price="false" />
        </div>
      </div>
      <p class="more"><router-link to="/plans" class="pl-btn">Xem thực đơn riêng của nhà tôi</router-link></p>
    </div>
  </section>
</template>

<script setup>
import MealCard from '../plans/MealCard.vue';
import { DISHES, SAUCES } from '../../shared/data/catalog';
import { generateMeals, carbOptionsFor } from '../../shared/domain/mealPlan';
import { rng } from '../../shared/utils/formatters';

// Mâm mẫu chỉ để xem: dựng bằng cùng bộ xếp món mock, hạt giống cố định để mỗi lần mở trang giống nhau.
const dishView = (id) => (id ? { dish_id: id, name: DISHES[id].name } : undefined);

function build(title, opts, seed, theme) {
  const m = generateMeals({ mealsCount: 1, rand: rng(seed), ...opts })[0];
  const protein = DISHES[m.dishes.protein];
  return {
    title,
    meal: {
      meal_index: 1,
      day_label: 'Mâm mẫu',
      theme,
      western: false,
      meal_structure: {
        protein_dish: dishView(m.dishes.protein),
        veggie_dish: dishView(m.dishes.veg),
        soup_dish: dishView(m.dishes.soup),
        carb_dish: dishView(m.dishes.carb),
        dessert: dishView(m.dishes.dessert)
      },
      carb_choices: carbOptionsFor(m).map((id) => dishView(id)),
      highlight_sauce: protein.sauce ? { name: SAUCES[protein.sauce].name } : null
    }
  };
}

const samples = [
  build('Cho 1 người', { householdSize: 1 }, 11, 'Suất ăn nấu 1 chảo'),
  build('Cho cặp đôi', { householdSize: 2 }, 23, 'Mâm cơm Việt 5 phần'),
  build('Cho gia đình, ít tinh bột', { householdSize: 4, goals: ['low_carb'] }, 37, 'Mâm cơm Việt 5 phần')
];
</script>

<style scoped>
.samples { padding: 40px 0 8px; }
.sec-h { margin-bottom: 18px; }
.sec-h h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 800; }
.sec-h p { color: var(--muted); font-size: 16px; margin-top: 4px; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
.tag { font-size: 16px; font-weight: 800; margin-bottom: 8px; }
.more { margin-top: 20px; }
@media (max-width: 980px) { .grid { grid-template-columns: minmax(0, 1fr); } }
</style>
