<template>
  <div v-if="dish" class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>
      <div class="mhead">
        <div class="pic" :style="{ background: BG[dish.p] }">
          <DishPlateSvg :dish="dish" :uid="'m' + dish.id" :size="180" />
        </div>
        <div>
          <h3>{{ dish.name }}</h3>
          <p class="muted" style="margin-top: 6px; font-size: 13.5px">
            ⏱ {{ dish.time }} phút, 1 chảo. {{ fmt(dish.price) }}/suất
            <span v-if="dish.save > 0">, tiết kiệm {{ fmt(dish.save * servings) }} khi nấu mẻ</span>.
          </p>
          <div class="tags" style="margin-top: 10px">
            <span
              v-for="t in dish.tags"
              :key="t"
              class="tag"
              :class="{ spicy: t === 'Cay nhẹ' }"
            >
              {{ t }}
            </span>
          </div>
        </div>
      </div>

      <div class="mpart">
        <!-- Bảng Thành phần dinh dưỡng ước tính / 1 suất -->
        <div v-if="dish.nutrition" class="nutrition-card">
          <div class="nt-header">
            <h4>Thành phần dinh dưỡng ước tính / 1 suất</h4>
            <span v-if="store.carb" class="carb-pill">Đang giảm 50% tinh bột</span>
          </div>
          <div class="nt-grid">
            <div class="nt-item">
              <span class="nt-label">Năng lượng</span>
              <b class="nt-value num">{{ adjustedNutrition.kcal }} <small>kcal</small></b>
            </div>
            <div class="nt-item">
              <span class="nt-label">Chất đạm</span>
              <b class="nt-value num">{{ adjustedNutrition.protein }} <small>g</small></b>
            </div>
            <div class="nt-item">
              <span class="nt-label">Tinh bột</span>
              <b class="nt-value num">
                {{ adjustedNutrition.carb }} <small>g</small>
                <span v-if="store.carb" class="cut-tag">−50%</span>
              </b>
            </div>
            <div class="nt-item">
              <span class="nt-label">Chất béo</span>
              <b class="nt-value num">{{ adjustedNutrition.fat }} <small>g</small></b>
            </div>
          </div>
          <p v-if="store.carb" class="nt-subnote">
            💡 Tùy chọn <b>Giảm 50% lượng tinh bột</b> đang bật: giảm {{ dish.nutrition.carb - adjustedNutrition.carb }}g tinh bột, giảm {{ (dish.nutrition.carb - adjustedNutrition.carb) * 4 }} kcal cho bữa tối nhẹ bụng.
          </p>
        </div>

        <h4>Trong hộp cho {{ servings }} suất</h4>
        <ul class="ing">
          <li>
            <span>Thịt sơ chế, ướp thảo mộc</span>
            <b class="num">{{ scale(dish.meat) }}</b>
          </li>
          <li>
            <span>Rau củ Đà Lạt</span>
            <b class="num">{{ scale(dish.veg) }}</b>
          </li>
          <li>
            <span>Túi gia vị tươi trong ngày (hành, tỏi, sả, ớt)</span>
            <b>1 túi</b>
          </li>
          <li>
            <span>Gói sốt đóng rời</span>
            <b>{{ store.sauce ? servings + ' gói nhỏ' : '1 gói' }}</b>
          </li>
          <li>
            <span>Tinh bột (gạo/bún)</span>
            <b class="num">{{ nf.format((store.carb ? 60 : 120) * servings) }}g</b>
          </li>
        </ul>

        <h4>Cách nấu 15 phút – 1 chảo</h4>
        <ol class="cook">
          <li v-for="(step, sIdx) in dish.steps" :key="sIdx">
            {{ step }}
          </li>
        </ol>

        <div class="mact">
          <button
            v-if="isInCart"
            class="btn"
            @click="handleSwap"
          >
            Đổi món khác
          </button>
          <button
            v-else
            class="btn primary"
            @click="handleAdd"
          >
            + Thêm {{ servings }} suất
          </button>
          <button class="btn ghost" @click="store.closeModal">Đóng</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import DishPlateSvg from '../common/DishPlateSvg.vue';
import { byId, BG } from '../../data/mockData';
import { fmt } from '../../shared/utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const nf = new Intl.NumberFormat('vi-VN');

const dish = computed(() => {
  return byId[store.selectedDishId] || null;
});

const isInCart = computed(() => {
  return dish.value && (store.cart[dish.value.id] || 0) > 0;
});

const servings = computed(() => {
  if (!dish.value) return 2;
  return store.cart[dish.value.id] || (store.mode === 'B' ? store.n : 2);
});

const adjustedNutrition = computed(() => {
  if (!dish.value || !dish.value.nutrition) {
    return { kcal: 0, protein: 0, carb: 0, fat: 0 };
  }
  const raw = dish.value.nutrition;
  if (store.carb) {
    const adjCarb = Math.round(raw.carb * 0.5);
    const carbCut = raw.carb - adjCarb;
    const adjKcal = raw.kcal - carbCut * 4;
    return {
      kcal: adjKcal,
      protein: raw.protein,
      carb: adjCarb,
      fat: raw.fat
    };
  }
  return raw;
});

const scale = ([v, u]) => {
  if (u.startsWith('g')) return `${nf.format(v * servings.value)}${u}`;
  return `${v * servings.value}${u}`;
};

const handleAdd = () => {
  if (store.tryChangeDish(dish.value.id, servings.value)) {
    store.toast(`Đã thêm ${dish.value.name}, ${servings.value} suất`);
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
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 18px;
  padding: 22px;
}

.mhead .pic {
  border-radius: 16px;
  display: grid;
  place-items: center;
  height: 200px;
}

.mhead h3 {
  font-size: 20px;
  font-weight: 800;
  padding-right: 36px;
}

.mpart {
  padding: 0 22px 22px;
}

.nutrition-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 14px;
}

.nt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.nt-header h4 {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
}

.carb-pill {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--orange);
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.nt-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.nt-item {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  text-align: center;
}

.nt-label {
  display: block;
  font-size: 11.5px;
  color: var(--muted);
  margin-bottom: 4px;
}

.nt-value {
  font-size: 15px;
  color: var(--ink);
}

.nt-value small {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--muted);
}

.cut-tag {
  font-size: 10.5px;
  color: var(--orange);
  margin-left: 2px;
}

.nt-subnote {
  font-size: 12px;
  color: var(--orange-ink);
  background: var(--orange-soft);
  border-radius: 8px;
  padding: 6px 10px;
  margin-top: 10px;
  line-height: 1.4;
}

.mpart h4 {
  font-size: 14.5px;
  margin: 14px 0 6px;
}

.ing {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 5px;
  font-size: 13.5px;
}

.ing li {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed var(--line-2);
  padding-bottom: 5px;
}

.cook {
  padding-left: 18px;
  margin: 0;
  display: grid;
  gap: 6px;
  font-size: 13.5px;
}

.mact {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

@media (max-width: 600px) {
  .mhead {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
