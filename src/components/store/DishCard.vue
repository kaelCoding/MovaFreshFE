<template>
  <article
    v-show="isAllowed"
    class="dish"
    :class="{ in: qtyInCart > 0 }"
  >
    <div class="dimg" :style="{ background: BG[dish.p] }">
      <span class="t">⏱ {{ dish.time }} phút</span>
      <span v-if="batchSave > 0" class="sv">Tiết kiệm {{ fmt(batchSave) }}</span>
      <DishPlateSvg :dish="dish" :uid="'c' + dish.id" :size="150" />
    </div>

    <div class="dbody">
      <h3>{{ dish.name }}</h3>
      <div class="w">{{ dish.meat[0] }}{{ dish.meat[1] }}, {{ dish.veg[0] }}{{ dish.veg[1] }}</div>

      <div class="tags">
        <span
          v-for="t in dish.tags"
          :key="t"
          class="tag"
          :class="{ spicy: t === 'Cay nhẹ' }"
        >
          {{ t }}
        </span>
      </div>

      <!-- Dòng badge chỉ số dinh dưỡng khi bật toggle -->
      <div v-if="store.showNutrition && dish.nutrition" class="nutrition-badge">
        <span>🔥 {{ dish.nutrition.kcal }} kcal</span>
        <span class="sep">•</span>
        <span>🥩 {{ dish.nutrition.protein }}g Đạm</span>
        <span class="sep">•</span>
        <span>🍚 {{ dish.nutrition.carb }}g Carb</span>
      </div>

      <div class="links">
        <button class="lnk" @click="store.openModal('dish', dish.id)">
          Chi tiết & Cách nấu
        </button>
        <button
          v-if="qtyInCart > 0"
          class="lnk"
          @click="store.swapDish(dish.id)"
        >
          Đổi món khác
        </button>
      </div>

      <div class="dfoot">
        <div class="price num">
          {{ fmt(dish.price) }} <small>/ suất</small>
        </div>

        <div v-if="qtyInCart > 0" class="stepper">
          <button @click="handleDec" aria-label="Bớt 1 suất">−</button>
          <b class="num">{{ qtyInCart }} suất</b>
          <button @click="handleInc" aria-label="Thêm 1 suất">+</button>
        </div>
        <button
          v-else
          class="btn sm primary"
          @click="handleAdd"
        >
          + Thêm {{ defaultServings }} suất
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

const qtyInCart = computed(() => {
  return store.cart[props.dish.id] || 0;
});

const defaultServings = computed(() => {
  return store.mode === 'B' ? store.n : 2;
});

const batchSave = computed(() => {
  const q = qtyInCart.value || defaultServings.value;
  return props.dish.save * q;
});

const handleAdd = () => {
  if (store.tryChangeDish(props.dish.id, defaultServings.value)) {
    store.toast(`Đã thêm ${props.dish.name}, ${defaultServings.value} suất`);
  }
};

const handleInc = () => {
  if (store.tryChangeDish(props.dish.id, qtyInCart.value + 1)) {
    store.toast(`${props.dish.name}: ${qtyInCart.value} suất`);
  }
};

const handleDec = () => {
  store.tryChangeDish(props.dish.id, qtyInCart.value - 1);
  if (qtyInCart.value > 0) {
    store.toast(`${props.dish.name}: ${qtyInCart.value} suất`);
  } else {
    store.toast(`Đã bỏ ${props.dish.name}`);
  }
};
</script>

<style scoped>
.dish {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: .15s;
}

.dish.in {
  border-color: var(--green);
  box-shadow: 0 0 0 1.5px var(--green);
}

.dimg {
  position: relative;
  height: 172px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dimg .t {
  position: absolute;
  left: 12px;
  top: 12px;
  background: rgba(255, 255, 255, .94);
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
  z-index: 2;
}

.dimg .sv {
  position: absolute;
  right: 12px;
  top: 12px;
  background: var(--orange);
  color: #fff;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
  z-index: 2;
}

.dbody {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.dbody h3 {
  font-size: 16.5px;
  font-weight: 700;
  line-height: 1.3;
}

.dbody .w {
  font-size: 13px;
  color: var(--muted);
}

.nutrition-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink);
  margin-top: 2px;
  margin-bottom: 2px;
  width: fit-content;
}

.nutrition-badge .sep {
  color: var(--muted);
  opacity: .5;
}

.links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.lnk {
  border: 0;
  background: none;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--green);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dfoot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 10px;
}

.price {
  font-weight: 800;
  font-size: 17.5px;
}

.price small {
  font-weight: 500;
  font-size: 12.5px;
  color: var(--muted);
}
</style>
