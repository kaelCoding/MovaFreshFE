<template>
  <div class="store-view">
    <!-- 1. Hero Section -->
    <HeroSection />

    <!-- 2. Journey 16h Section -->
    <JourneySection />

    <!-- 3. Menu & Cart Section -->
    <section class="menu" id="thuc-don">
      <div class="wrap">
        <div class="sec-h">
          <h2>Thực đơn tuần này</h2>
          <p>Tự chọn món ngon, hoặc để MOVA tự động xếp chuẩn ngân sách. Mọi món nấu trong 15 phút với 1 chảo.</p>
        </div>

        <div class="layout">
          <div>
            <!-- Mode switcher -->
            <div class="modes" role="tablist" aria-label="Cách mua">
              <button
                role="tab"
                :aria-selected="store.mode === 'A'"
                @click="store.setMode('A')"
              >
                Tự chọn theo món ngon
                <small>Thêm, bớt món theo sở thích</small>
              </button>
              <button
                role="tab"
                :aria-selected="store.mode === 'B'"
                @click="store.setMode('B')"
              >
                Soạn thực đơn theo ngân sách
                <small>Hệ thống xếp vừa số tiền bạn có</small>
              </button>
            </div>

            <!-- Box ngân sách -->
            <BudgetPlanner v-if="store.mode === 'B'" />

            <!-- Bộ lọc khẩu vị -->
            <div class="filters">
              <span class="lbl">Khẩu vị:</span>
              <button
                class="chip no"
                :class="{ active: store.f.includes('noBo') }"
                @click="store.toggleFilter('noBo')"
              >
                Không ăn Bò
              </button>
              <button
                class="chip no"
                :class="{ active: store.f.includes('noHeo') }"
                @click="store.toggleFilter('noHeo')"
              >
                Không ăn Heo
              </button>
              <button
                class="chip no"
                :class="{ active: store.f.includes('noCay') }"
                @click="store.toggleFilter('noCay')"
              >
                Không cay
              </button>
              <button
                class="chip"
                :class="{ active: store.f.includes('lowOil') }"
                @click="store.toggleFilter('lowOil')"
              >
                Ít dầu mỡ
              </button>
            </div>

            <!-- Lưới món ăn -->
            <div class="grid">
              <DishCard
                v-for="d in DISHES"
                :key="d.id"
                :dish="d"
              />
              <div v-if="visibleDishesCount === 0" class="empty-grid">
                Không có món nào khớp mọi bộ lọc. Hãy bỏ bớt một bộ lọc khẩu vị.
              </div>
            </div>

            <!-- Mua thêm đi cùng chuyến xe -->
            <AddonsSection />
          </div>

          <!-- Sticky Cart -->
          <StickyCart />
        </div>
      </div>
    </section>

    <!-- 4. Bên trong hộp MOVA -->
    <BoxInsideSection />

    <!-- 5. Hỏi đáp thường gặp -->
    <FaqSection />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import HeroSection from '../components/store/HeroSection.vue';
import JourneySection from '../components/store/JourneySection.vue';
import BudgetPlanner from '../components/store/BudgetPlanner.vue';
import DishCard from '../components/store/DishCard.vue';
import AddonsSection from '../components/store/AddonsSection.vue';
import StickyCart from '../components/store/StickyCart.vue';
import BoxInsideSection from '../components/store/BoxInsideSection.vue';
import FaqSection from '../components/store/FaqSection.vue';
import { DISHES } from '../data/mockData';
import { useMovaStore } from '../stores/useMovaStore';

const store = useMovaStore();

const visibleDishesCount = computed(() => {
  return DISHES.filter((d) => store.allowed(d)).length;
});
</script>

<style scoped>
.menu {
  padding: 40px 0;
}

.sec-h {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.sec-h h2 {
  font-size: clamp(22px, 2.8vw, 30px);
  font-weight: 800;
}

.sec-h p {
  color: var(--muted);
  max-width: 56ch;
  font-size: 14.5px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: var(--line-2);
  border-radius: 14px;
  padding: 5px;
}

.modes button {
  border: 0;
  background: none;
  border-radius: 10px;
  padding: 10px 12px;
  font-weight: 600;
  font-size: 14px;
  color: var(--muted);
  text-align: left;
  transition: .15s;
}

.modes button small {
  display: block;
  font-weight: 400;
  font-size: 12px;
}

.modes button[aria-selected="true"] {
  background: var(--card);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(60, 40, 10, .12);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 14px;
  align-items: center;
}

.filters .lbl {
  font-size: 13.5px;
  font-weight: 600;
  margin-right: 4px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.empty-grid {
  grid-column: 1 / -1;
  padding: 24px;
  border: 1.5px dashed var(--line);
  border-radius: 16px;
  text-align: center;
  color: var(--muted);
}

@media (max-width: 980px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
