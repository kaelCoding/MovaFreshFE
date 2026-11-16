import { PACKAGING_SKU } from '../data/catalog';

/**
 * Thuật toán BOM Reverse Aggregator (bản mock): hàng trăm thực đơn cá nhân hóa của khách
 * quy về một bảng nguyên liệu thô cho nhà máy.
 *
 * order.meals[i] = { dishes: { protein, veg, soup?, carb, dessert? }, proteinFactor? }
 * order.householdSize = số người ăn.
 * Trả về gram nguyên liệu ĐÃ SƠ CHẾ (chưa tính hao hụt), số túi xốt và số thùng.
 */
export function aggregateBom(orders, dishes) {
  const skuGrams = {};
  const sauces = {};
  let boxes = 0;

  for (const order of orders) {
    boxes += 1;
    const people = order.householdSize || 1;
    for (const meal of order.meals) {
      for (const dishId of Object.values(meal.dishes)) {
        const dish = dishes[dishId];
        if (!dish) throw new Error(`Món không có trong danh mục: ${dishId}`);
        const factor = dish.kind === 'protein' ? meal.proteinFactor || 1 : 1;
        for (const { sku, gramsPerPerson } of dish.bom) {
          skuGrams[sku] = (skuGrams[sku] || 0) + gramsPerPerson * people * factor;
        }
        if (dish.sauce) sauces[dish.sauce] = (sauces[dish.sauce] || 0) + 1;
      }
    }
  }

  for (const sku of Object.keys(skuGrams)) skuGrams[sku] = Math.round(skuGrams[sku]);

  return { boxes, skuGrams, sauces, packaging: { [PACKAGING_SKU]: boxes } };
}
