<template>
  <div v-if="dish" class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>
      <div class="mhead">
        <div class="pic" :style="{ background: BG[dish.p] }">
          <DishPlateSvg :dish="dish" :uid="'m' + dish.id" />
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
import { fmt } from '../../utils/formatters';
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
