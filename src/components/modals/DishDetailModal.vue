<template>
  <div v-if="dish" class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox" style="max-width: 620px">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>
      
      <div class="mhead">
        <div class="pic" :style="{ background: BG[dish.p] || '#FAF0E4' }">
          <DishPlateSvg :dish="dish" :uid="'m' + dish.id" :size="160" />
        </div>
        <div class="mhead-info">
          <div class="meal-kind-badge">
            {{ isSolo ? '👤 Suất ăn Độc thân hoàn chỉnh' : '👨‍👩‍👧‍👦 Mâm cơm Gia đình Việt 5 thành phần' }}
          </div>
          <h3>{{ dish.name }}</h3>
          <p class="muted" style="margin-top: 4px; font-size: 13px">
            ⏱ Nấu trong 15 phút – 1 chảo. Nguyên liệu nông trại Đắk Lắk & Đà Lạt tươi 16 giờ.
          </p>
          <div class="tags" style="margin-top: 8px">
            <span
              v-for="t in dish.tags"
              :key="t"
              class="tag"
            >
              {{ t }}
            </span>
          </div>
        </div>
      </div>

      <div class="mpart">
        <!-- Bảng 5 Thành phần trong hộp -->
        <div class="box-components-card">
          <h4>📦 Bên trong hộp nguyên liệu (Phục vụ {{ servings }} người ăn):</h4>
          <ul class="components-detail-list">
            <li class="comp-detail-item">
              <span class="icon">🥩</span>
              <div class="info">
                <b>Món Đạm chính:</b> {{ dish.components?.main }}
                <small class="origin-tag">Nông trại Đắk Lắk • {{ scaledMeatGrams }}g thịt sơ chế sạch</small>
              </div>
            </li>
            <li class="comp-detail-item">
              <span class="icon">🥣</span>
              <div class="info">
                <b>Món Canh ấm bụng:</b> {{ dish.components?.soup }}
                <small class="origin-tag">Rau củ & gói cốt hầm thảo mộc cô đặc • {{ scaledSoupGrams }}g</small>
              </div>
            </li>
            <li class="comp-detail-item">
              <span class="icon">🥬</span>
              <div class="info">
                <b>Món Rau xanh:</b> {{ dish.components?.veg }}
                <small class="origin-tag">Canh tác sạch Đà Lạt • {{ scaledVegGrams }}g</small>
              </div>
            </li>
            <li class="comp-detail-item">
              <span class="icon">🍚</span>
              <div class="info">
                <b>Tinh bột lành mạnh:</b> {{ store.upsellLowCarb ? 'Gạo lứt huyết rồng hữu cơ (Low-Carb)' : dish.components?.carb }}
                <small class="origin-tag">{{ store.upsellLowCarb ? 'Giảm 50% carb' : 'Định lượng chuẩn thể trạng' }} • {{ scaledCarbGrams }}g</small>
              </div>
            </li>
            <li class="comp-detail-item">
              <span class="icon">🥑</span>
              <div class="info">
                <b>Trái cây tráng miệng:</b> {{ dish.components?.dessert }}
                <small class="origin-tag">Trái cây Tây Nguyên theo mùa • {{ scaledDessertGrams }}g</small>
              </div>
            </li>
          </ul>
        </div>

        <!-- Dinh dưỡng ước tính -->
        <div v-if="dish.nutrition" class="nutrition-card">
          <div class="nt-header">
            <h4>Chỉ số dinh dưỡng ước tính / bữa ({{ servings }} người ăn)</h4>
            <span v-if="store.upsellProtein" class="nt-pill green">Đã tăng 30% Đạm</span>
            <span v-if="store.upsellLowCarb" class="nt-pill orange">Đã giảm 50% Tinh bột</span>
          </div>
          <div class="nt-grid">
            <div class="nt-item">
              <span class="nt-label">Năng lượng</span>
              <b class="nt-value num">{{ totalNutrition.kcal }} <small>kcal</small></b>
            </div>
            <div class="nt-item">
              <span class="nt-label">Chất đạm</span>
              <b class="nt-value num">{{ totalNutrition.protein }} <small>g</small></b>
            </div>
            <div class="nt-item">
              <span class="nt-label">Tinh bột</span>
              <b class="nt-value num">{{ totalNutrition.carb }} <small>g</small></b>
            </div>
            <div class="nt-item">
              <span class="nt-label">Chất béo</span>
              <b class="nt-value num">{{ totalNutrition.fat }} <small>g</small></b>
            </div>
          </div>
        </div>

        <!-- Hướng dẫn nấu 15 phút -->
        <div class="cook-steps-box">
          <h4>⏱ Cách nấu 15 phút – 1 chảo / nồi:</h4>
          <ol class="cook">
            <li v-for="(step, sIdx) in dish.steps" :key="sIdx">
              {{ step }}
            </li>
          </ol>
        </div>

        <!-- Footer Actions -->
        <div class="mact">
          <div class="modal-price">
            <span class="lbl">Giá mâm cơm:</span>
            <b class="num">{{ fmt(currentMealPrice) }}</b>
          </div>
          <button
            v-if="isInCart"
            class="btn sm"
            @click="handleSwap"
          >
            Đổi món khác
          </button>
          <button
            v-else
            class="btn primary sm"
            @click="handleAdd"
          >
            + Thêm vào thực đơn tuần
          </button>
          <button class="btn ghost sm" @click="store.closeModal">Đóng</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import DishPlateSvg from '../common/DishPlateSvg.vue';
import { byId, BG } from '../../data/mockData';
import { fmt } from '../../utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();

const dish = computed(() => {
  return byId[store.selectedDishId] || null;
});

const isSolo = computed(() => {
  return dish.value?.category === 'solo' || servings.value === 1;
});

const servings = computed(() => {
  return store.onboardingProfile?.householdSize || store.n || 2;
});

const isInCart = computed(() => {
  return dish.value && (store.cart[dish.value.id] || 0) > 0;
});

const scaledMeatGrams = computed(() => {
  const base = dish.value?.baseGrams?.meat || 160;
  let total = base * servings.value;
  if (store.upsellProtein) total = Math.round(total * 1.3);
  return total;
});

const scaledSoupGrams = computed(() => {
  const base = dish.value?.baseGrams?.soup || 150;
  return base * servings.value;
});

const scaledVegGrams = computed(() => {
  const base = dish.value?.baseGrams?.veg || 140;
  return base * servings.value;
});

const scaledCarbGrams = computed(() => {
  const base = dish.value?.baseGrams?.carb || 120;
  let total = base * servings.value;
  if (store.upsellLowCarb) total = Math.round(total * 0.5);
  return total;
});

const scaledDessertGrams = computed(() => {
  const base = dish.value?.baseGrams?.dessert || 80;
  return base * servings.value;
});

const currentMealPrice = computed(() => {
  if (!dish.value) return 0;
  const base = dish.value.pricePerPerson || dish.value.price || 75000;
  let total = servings.value === 1 ? base : base * servings.value;
  if (store.upsellProtein) {
    total += servings.value === 1 ? 25000 : 35000;
  }
  return total;
});

const totalNutrition = computed(() => {
  const n = dish.value?.nutrition;
  if (!n) return { kcal: 0, protein: 0, carb: 0, fat: 0 };
  const mult = servings.value;
  let p = n.protein;
  let c = n.carb;
  if (store.upsellProtein) p = Math.round(p * 1.3);
  if (store.upsellLowCarb) c = Math.round(c * 0.5);
  return {
    kcal: n.kcal * mult,
    protein: p * mult,
    carb: c * mult,
    fat: n.fat * mult
  };
});

const handleAdd = () => {
  if (store.tryChangeDish(dish.value.id, 1)) {
    store.toast(`Đã thêm ${dish.value.name} vào thực đơn tuần`);
    store.closeModal();
  }
};

const handleSwap = () => {
  store.closeModal();
  store.swapDish(dish.value.id);
};
</script>

<style scoped>
.mhead {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
  padding: 22px;
}

.mhead .pic {
  border-radius: 16px;
  display: grid;
  place-items: center;
  height: 180px;
}

.mhead-info h3 {
  font-size: 19px;
  font-weight: 800;
  line-height: 1.3;
  margin: 6px 0;
}

.meal-kind-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--green);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.mpart {
  padding: 0 22px 22px;
}

.box-components-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.box-components-card h4 {
  font-size: 13.5px;
  font-weight: 700;
  margin: 0 0 10px;
  color: var(--ink);
}

.components-detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.comp-detail-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
}

.comp-detail-item .icon {
  font-size: 16px;
  flex-shrink: 0;
}

.comp-detail-item .info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.comp-detail-item .info b {
  color: var(--ink);
}

.origin-tag {
  font-size: 11.5px;
  color: var(--muted);
}

/* Nutrition card */
.nutrition-card {
  background: #FFFBF8;
  border: 1px solid #F2DEC8;
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 16px;
}

.nt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.nt-header h4 {
  font-size: 12.5px;
  font-weight: 700;
  margin: 0;
  color: var(--ink);
}

.nt-pill {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
}

.nt-pill.green {
  background: var(--green-soft);
  color: var(--green);
}

.nt-pill.orange {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

.nt-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: center;
}

.nt-item {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 4px;
}

.nt-label {
  font-size: 10.5px;
  color: var(--muted);
  display: block;
}

.nt-value {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--ink);
}

.cook-steps-box {
  margin-bottom: 18px;
}

.cook-steps-box h4 {
  font-size: 13.5px;
  font-weight: 700;
  margin: 0 0 8px;
}

.cook {
  padding-left: 20px;
  margin: 0;
  font-size: 13px;
  color: var(--ink);
  line-height: 1.5;
  display: grid;
  gap: 6px;
}

.mact {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.modal-price {
  display: flex;
  flex-direction: column;
  margin-right: auto;
}

.modal-price .lbl {
  font-size: 11px;
  color: var(--muted);
}

.modal-price b {
  font-size: 18px;
  color: var(--green);
}

@media (max-width: 580px) {
  .mhead {
    grid-template-columns: 1fr;
  }
  .mhead .pic {
    height: 140px;
  }
  .mact {
    flex-wrap: wrap;
  }
}
</style>
