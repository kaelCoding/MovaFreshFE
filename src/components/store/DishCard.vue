<template>
  <article
    v-show="isAllowed"
    class="dish-card"
    :class="{ in: qtyInCart > 0, featured: isAiRecommended }"
  >
    <!-- Top Visual & Badges -->
    <div class="card-visual" :style="{ background: BG[dish.p] || '#FAF0E4' }">
      <!-- Top Badges Row (Wrapped safely so AI tag never overlaps cooking time) -->
      <div class="card-badges-row">
        <!-- AI Recommendation Badge -->
        <div v-if="isAiRecommended" class="ai-match-badge">
          <span class="sparkle">✨</span>
          <span>AI Đề xuất cho bạn</span>
        </div>

        <div class="top-meta-badges">
          <span class="badge-time">⏱ {{ dish.time }} phút • 1 chảo</span>
          <span v-if="dish.isFusion" class="badge-fusion">🍷 Bistro Đồ Tây</span>
        </div>
      </div>

      <div class="plate-center">
        <DishPlateSvg :dish="dish" :uid="'c' + dish.id" :size="140" />
      </div>
    </div>

    <!-- Body Information -->
    <div class="card-body">
      <h3 class="meal-title">{{ dish.name }}</h3>

      <!-- 5 Thành phần Mâm cơm Á Đông (hoặc Suất 1 người) -->
      <div class="components-box" v-if="dish.components">
        <div class="comp-row">
          <span class="comp-icon" title="Món Đạm chính">🥩</span>
          <span class="comp-text"><b>Đạm chính:</b> {{ dish.components.main }}</span>
        </div>
        <div class="comp-row">
          <span class="comp-icon" title="Món Canh nóng">🥣</span>
          <span class="comp-text"><b>Canh:</b> {{ dish.components.soup }}</span>
        </div>
        <div class="comp-row">
          <span class="comp-icon" title="Rau xanh">🥬</span>
          <span class="comp-text"><b>Rau xanh:</b> {{ dish.components.veg }}</span>
        </div>
        <div class="comp-row">
          <span class="comp-icon" title="Tinh bột">🍚</span>
          <span class="comp-text">
            <b>Tinh bột:</b> {{ store.upsellLowCarb ? 'Gạo lứt huyết rồng / Khoai lang' : dish.components.carb }}
          </span>
        </div>
        <div class="comp-row">
          <span class="comp-icon" title="Tráng miệng">🥑</span>
          <span class="comp-text"><b>Tráng miệng:</b> {{ dish.components.dessert }}</span>
        </div>
      </div>

      <!-- Chỉ số dinh dưỡng khi bật toggle -->
      <div v-if="store.showNutrition && dish.nutrition" class="nutrition-badge">
        <span>🔥 {{ scaledNutrition.kcal }} kcal</span>
        <span class="sep">•</span>
        <span>🥩 {{ scaledNutrition.protein }}g Đạm</span>
        <span class="sep">•</span>
        <span>🍚 {{ scaledNutrition.carb }}g Carb</span>
      </div>

      <!-- Link xem chi tiết -->
      <div class="links-row">
        <button class="btn-detail-link" @click="store.openModal('dish', dish.id)">
          Xem 5 thành phần & Cách nấu →
        </button>
      </div>

      <!-- Footer & Stepper -->
      <div class="card-footer">
        <div class="price-wrap">
          <div class="price num">{{ fmt(mealPrice) }}</div>
          <small class="portion-label">
            / bữa ({{ householdSize === 1 ? '1 suất cá nhân' : `Mâm ${householdSize} người ăn` }})
          </small>
        </div>

        <div v-if="qtyInCart > 0" class="stepper-act">
          <button @click="handleDec" aria-label="Bớt 1 bữa">−</button>
          <span class="num">{{ qtyInCart }} bữa</span>
          <button @click="handleInc" aria-label="Thêm 1 bữa">+</button>
        </div>

        <button
          v-else
          class="btn-add-meal"
          @click="handleAdd"
        >
          + Thêm vào tuần
        </button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import DishPlateSvg from '../common/DishPlateSvg.vue';
import { BG } from '../../data/mockData';
import { fmt } from '../../utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const props = defineProps({
  dish: {
    type: Object,
    required: true
  }
});

const store = useMovaStore();

const isAllowed = computed(() => store.allowed(props.dish));

const householdSize = computed(() => {
  return store.onboardingProfile?.householdSize || store.n || 2;
});

const isAiRecommended = computed(() => {
  const profileGoals = store.onboardingProfile?.healthGoal || [];
  if (!profileGoals.length) return false;
  return props.dish.goals && props.dish.goals.some((g) => profileGoals.includes(g));
});

const qtyInCart = computed(() => {
  return store.cart[props.dish.id] || 0;
});

// Tính giá mâm cơm theo quy mô số người ăn
const mealPrice = computed(() => {
  const base = props.dish.pricePerPerson || props.dish.price || 75000;
  let total = householdSize.value === 1 ? base : base * householdSize.value;
  if (store.upsellProtein) {
    total += householdSize.value === 1 ? 25000 : 35000;
  }
  return total;
});

const scaledNutrition = computed(() => {
  const n = props.dish.nutrition;
  if (!n) return { kcal: 0, protein: 0, carb: 0, fat: 0 };
  const mult = householdSize.value;
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
  if (store.tryChangeDish(props.dish.id, 1)) {
    store.toast(`Đã thêm ${props.dish.name} vào thực đơn tuần`);
  }
};

const handleInc = () => {
  if (store.tryChangeDish(props.dish.id, qtyInCart.value + 1)) {
    store.toast(`${props.dish.name}: ${qtyInCart.value} bữa/tuần`);
  }
};

const handleDec = () => {
  store.tryChangeDish(props.dish.id, qtyInCart.value - 1);
  if (qtyInCart.value > 0) {
    store.toast(`${props.dish.name}: ${qtyInCart.value} bữa/tuần`);
  } else {
    store.toast(`Đã bỏ ${props.dish.name} khỏi thực đơn`);
  }
};
</script>

<style scoped>
.dish-card {
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  position: relative;
}

.dish-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  border-color: var(--line-2);
}

.dish-card.in {
  border-color: var(--green);
  box-shadow: 0 8px 24px rgba(20, 108, 67, 0.12);
}

.dish-card.featured {
  border-color: rgba(20, 108, 67, 0.4);
}

.card-visual {
  height: 180px;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.plate-center {
  transform: translateY(6px);
}

.card-badges-row {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 6px;
  z-index: 2;
  pointer-events: none;
}

.ai-match-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--green);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(20, 108, 67, 0.25);
  pointer-events: auto;
}

.top-meta-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
  pointer-events: auto;
}

.badge-time {
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

.badge-fusion {
  background: var(--orange-soft);
  color: var(--orange-ink);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
}

.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.meal-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 10px;
  line-height: 1.35;
}

/* 5 Thành phần */
.components-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 5px;
  margin-bottom: 12px;
}

.comp-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 12.5px;
  line-height: 1.4;
}

.comp-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.comp-text {
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comp-text b {
  color: var(--ink);
  font-weight: 600;
}

/* Dinh dưỡng */
.nutrition-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--orange-ink);
  background: var(--orange-soft);
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 12px;
}

.nutrition-badge .sep {
  opacity: 0.4;
}

.links-row {
  margin-bottom: 14px;
}

.btn-detail-link {
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--green);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: color 0.15s ease;
}

.btn-detail-link:hover {
  color: var(--green-d);
  text-decoration: underline;
}

.card-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.price-wrap {
  display: flex;
  flex-direction: column;
}

.price {
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
}

.portion-label {
  font-size: 11px;
  color: var(--muted);
}

.btn-add-meal {
  background: var(--green);
  color: #fff;
  border: 0;
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-add-meal:hover {
  background: var(--green-d);
  transform: translateY(-1px);
}

.stepper-act {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--green-soft);
  border: 1px solid var(--green);
  border-radius: 10px;
  padding: 4px 8px;
}

.stepper-act button {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 0;
  background: var(--green);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.stepper-act span {
  font-size: 13px;
  font-weight: 700;
  color: var(--green-d);
}
</style>
