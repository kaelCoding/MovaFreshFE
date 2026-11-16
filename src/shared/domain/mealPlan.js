import { DISHES } from '../data/catalog';

const BLOCKING_TAG = { no_beef: 'beef', no_pork: 'pork', no_seafood: 'seafood', no_spicy: 'spicy' };

function allowedDishes(kind, restrictions) {
  const blocked = new Set(restrictions.map((r) => BLOCKING_TAG[r]).filter(Boolean));
  return Object.values(DISHES).filter(
    (d) => d.kind === kind && !d.tags.some((t) => blocked.has(t))
  );
}

/**
 * Sinh thực đơn của một tuần cho một hồ sơ (bản mock, ai-engine thật sẽ thay).
 * - 1 người: món đạm + rau + tinh bột (suất nấu 1 chảo).
 * - Từ 2 người: mâm cơm Việt đủ 5 phần: đạm + rau + canh + tinh bột + tráng miệng.
 * - Muốn ít tinh bột → khoai lang thay cơm. Muốn nhiều đạm → tăng khẩu phần đạm 30%.
 * `rand` là hàm trả số trong [0,1) để kết quả lặp lại được.
 */
export function generateMeals({ householdSize, goals = [], restrictions = [], mealsCount, rand }) {
  const pick = (kind) => {
    const pool = allowedDishes(kind, restrictions);
    if (!pool.length) return null;
    return pool[Math.floor(rand() * pool.length)];
  };
  const lowCarb = goals.includes('low_carb') || goals.includes('limit_sugar');
  const highProtein = goals.includes('high_protein');
  const family = householdSize >= 2;

  const meals = [];
  for (let i = 0; i < mealsCount; i++) {
    const dishes = {};
    dishes.protein = pick('protein').id;
    dishes.veg = pick('veg').id;
    dishes.carb = lowCarb ? 'D-CRB-003' : pick('carb').id;
    if (family) {
      dishes.soup = pick('soup').id;
      dishes.dessert = pick('dessert').id;
    }
    meals.push({ index: i + 1, dishes, proteinFactor: highProtein ? 1.3 : 1 });
  }
  return meals;
}

/** Giá một bữa cho cả hộ. */
export function mealPriceVnd(meal, householdSize) {
  let total = 0;
  for (const dishId of Object.values(meal.dishes)) {
    const d = DISHES[dishId];
    const factor = d.kind === 'protein' ? meal.proteinFactor || 1 : 1;
    total += d.pricePerPersonVnd * householdSize * factor;
  }
  return Math.round(total / 1000) * 1000;
}

export const mealsPriceVnd = (meals, householdSize) =>
  meals.reduce((sum, m) => sum + mealPriceVnd(m, householdSize), 0);

/** Dinh dưỡng một bữa cho cả hộ. */
export function mealNutrition(meal, householdSize) {
  const sum = { kcal: 0, protein: 0, carb: 0, fat: 0 };
  for (const dishId of Object.values(meal.dishes)) {
    const d = DISHES[dishId];
    const factor = d.kind === 'protein' ? meal.proteinFactor || 1 : 1;
    for (const k of Object.keys(sum)) sum[k] += d.nutrition[k] * householdSize * factor;
  }
  for (const k of Object.keys(sum)) sum[k] = Math.round(sum[k]);
  return sum;
}
