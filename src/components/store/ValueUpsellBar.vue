<template>
  <div class="upsell-container" aria-label="Bảng nâng cấp dinh dưỡng và quy mô bàn ăn">
    <!-- Hàng trên: Bộ tinh chỉnh Quy mô & Tần suất nấu cơm nhà -->
    <div class="stepper-config-row">
      <div class="config-col">
        <div class="config-top-lbl">
          <span class="icon">👥</span>
          <b>Quy mô bàn ăn:</b>
        </div>
        <div class="stepper-pill">
          <button
            type="button"
            class="btn-step"
            :disabled="store.onboardingProfile?.householdSize <= 1"
            @click="store.setHouseholdSize((store.onboardingProfile?.householdSize || 2) - 1)"
            aria-label="Giảm 1 người"
          >
            −
          </button>
          <span class="step-val num">{{ store.onboardingProfile?.householdSize || 2 }} người</span>
          <button
            type="button"
            class="btn-step"
            :disabled="store.onboardingProfile?.householdSize >= 8"
            @click="store.setHouseholdSize((store.onboardingProfile?.householdSize || 2) + 1)"
            aria-label="Tăng 1 người"
          >
            +
          </button>
        </div>
      </div>

      <div class="config-col">
        <div class="config-top-lbl">
          <span class="icon">📅</span>
          <b>Số bữa nấu / tuần:</b>
        </div>
        <div class="stepper-pill">
          <button
            type="button"
            class="btn-step"
            :disabled="store.onboardingProfile?.mealsPerWeek <= 3"
            @click="store.setMealsPerWeek((store.onboardingProfile?.mealsPerWeek || 5) - 1)"
            aria-label="Giảm 1 bữa"
          >
            −
          </button>
          <span class="step-val num">{{ store.onboardingProfile?.mealsPerWeek || 5 }} bữa/tuần</span>
          <button
            type="button"
            class="btn-step"
            :disabled="store.onboardingProfile?.mealsPerWeek >= 7"
            @click="store.setMealsPerWeek((store.onboardingProfile?.mealsPerWeek || 5) + 1)"
            aria-label="Tăng 1 bữa"
          >
            +
          </button>
        </div>
      </div>

      <!-- Chế độ mâm cơm tương ứng -->
      <div class="mode-summary-pill" :class="{ solo: isSolo, family: !isSolo }">
        <span class="dot"></span>
        <span>{{ isSolo ? 'Chế độ Suất ăn Độc thân (1 chảo 10p)' : 'Chế độ Mâm cơm Gia đình 5 thành phần' }}</span>
      </div>
    </div>

    <!-- Hàng dưới: 3 Tùy chọn Nâng cấp Giá trị Sức khỏe (Value-Based Upsells) -->
    <div class="upsell-toggles-grid">
      <!-- 1. Protein+ -->
      <label class="upsell-toggle-card" :class="{ active: store.upsellProtein }">
        <input
          type="checkbox"
          :checked="store.upsellProtein"
          @change="store.toggleUpsellProtein"
          class="sr-only"
        />
        <div class="toggle-icon">🥩</div>
        <div class="toggle-body">
          <div class="toggle-title">
            <b>Tăng +30% lượng Đạm (Protein+)</b>
            <span class="pill-tag orange">+35k/bữa</span>
          </div>
          <p class="toggle-desc">Tăng nạc thăn bò, ức gà đồi Đắk Lắk cho người tập Gym & thể thao.</p>
        </div>
        <div class="toggle-check-dot">
          <span v-if="store.upsellProtein">✓</span>
        </div>
      </label>

      <!-- 2. Giảm 50% Tinh bột / Gạo lứt -->
      <label class="upsell-toggle-card" :class="{ active: store.upsellLowCarb }">
        <input
          type="checkbox"
          :checked="store.upsellLowCarb"
          @change="store.toggleUpsellLowCarb"
          class="sr-only"
        />
        <div class="toggle-icon">🍚</div>
        <div class="toggle-body">
          <div class="toggle-title">
            <b>Giảm 50% Tinh bột / Gạo lứt & Khoai</b>
            <span class="pill-tag green">Eat Clean</span>
          </div>
          <p class="toggle-desc">Đổi sang Gạo lứt huyết rồng & Khoai lang mật, bữa tối nhẹ bụng.</p>
        </div>
        <div class="toggle-check-dot">
          <span v-if="store.upsellLowCarb">✓</span>
        </div>
      </label>

      <!-- 3. Thêm 2 bữa Đồ Tây Bistro -->
      <label class="upsell-toggle-card" :class="{ active: store.upsellWestern }">
        <input
          type="checkbox"
          :checked="store.upsellWestern"
          @change="store.toggleUpsellWestern"
          class="sr-only"
        />
        <div class="toggle-icon">🍷</div>
        <div class="toggle-body">
          <div class="toggle-title">
            <b>Thêm 2 bữa Đồ Tây (Steak Bistro)</b>
            <span class="pill-tag blue">Đổi vị</span>
          </div>
          <p class="toggle-desc">Steak thăn bò áp chảo xốt tiêu, súp bí đỏ, salad Đà Lạt cuối tuần.</p>
        </div>
        <div class="toggle-check-dot">
          <span v-if="store.upsellWestern">✓</span>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();

const isSolo = computed(() => {
  return (store.onboardingProfile?.householdSize || store.n || 2) === 1;
});
</script>

<style scoped>
.upsell-container {
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 18px;
  padding: 16px 18px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}

.stepper-config-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 14px;
}

.config-col {
  display: flex;
  align-items: center;
  gap: 10px;
}

.config-top-lbl {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--ink);
}

.config-top-lbl .icon {
  font-size: 15px;
}

.stepper-pill {
  display: inline-flex;
  align-items: center;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 3px 6px;
  gap: 8px;
}

.btn-step {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 0;
  background: var(--card);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  color: var(--ink);
  font-weight: 800;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
}

.btn-step:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.step-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--green-d);
  min-width: 60px;
  text-align: center;
}

.mode-summary-pill {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
}

.mode-summary-pill.family {
  background: var(--green-soft);
  color: var(--green);
}

.mode-summary-pill.solo {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

.mode-summary-pill .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

/* Upsell Toggles Grid */
.upsell-toggles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.upsell-toggle-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--bg);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.upsell-toggle-card:hover {
  border-color: var(--green);
  background: #fff;
}

.upsell-toggle-card.active {
  background: #fff;
  border-color: var(--green);
  box-shadow: 0 4px 12px rgba(20, 108, 67, 0.12);
}

.toggle-icon {
  font-size: 22px;
  flex-shrink: 0;
  line-height: 1.2;
}

.toggle-body {
  flex: 1;
  min-width: 0;
}

.toggle-title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.toggle-title b {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.3;
}

.pill-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
}

.pill-tag.orange {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

.pill-tag.green {
  background: var(--green-soft);
  color: var(--green);
}

.pill-tag.blue {
  background: #E8F0FE;
  color: #1A73E8;
}

.toggle-desc {
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.35;
  margin: 0;
}

.toggle-check-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: #fff;
  transition: all 0.15s ease;
}

.upsell-toggle-card.active .toggle-check-dot {
  background: var(--green);
  border-color: var(--green);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 900px) {
  .upsell-toggles-grid {
    grid-template-columns: 1fr;
  }
  .mode-summary-pill {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
}
</style>
