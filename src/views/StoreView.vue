<template>
  <div class="store-view">
    <!-- 1. Hero Section (Split-Hero 2 cột: Brand & Cold-chain bên trái, Wizard/Summary Card bên phải) -->
    <HeroSection />

    <!-- 2. Journey 16h Section -->
    <JourneySection />

    <!-- 3. Menu & Cart Section -->
    <section class="menu" id="thuc-don">
      <div class="wrap">
        <!-- Dải thông tin hồ sơ AI đã kích hoạt -->
        <div v-if="store.onboardingProfile?.isCompleted" class="ai-profile-strip-store">
          <div class="strip-left">
            <span class="ai-spark-badge">✨ THỰC ĐƠN ĐƯỢC AI CÁ NHÂN HÓA</span>
            <div class="strip-desc">
              Phục vụ: <b>{{ store.onboardingProfile.householdSize }} người ăn</b> •
              <b>{{ store.onboardingProfile.mealsPerWeek }} bữa/tuần</b> •
              Mục tiêu: <b>{{ goalLabel }}</b>
            </div>
          </div>
          <button class="btn-edit-profile-strip" @click="store.openOnboarding" aria-label="Sửa hồ sơ AI">
            Sửa hồ sơ AI ✎
          </button>
        </div>

        <!-- Dải mời khảo sát nếu chưa hoàn tất Hồ sơ AI -->
        <div v-else class="ai-skip-banner-store">
          <div class="skip-banner-text">
            💡 Bạn đang xem thực đơn mẫu. Thiết lập <b>Hồ sơ AI (1 phút)</b> để nhận <b>Gift Card 900.000đ</b> & cộng ngay <b>+20.000đ Fresh Credit</b>!
          </div>
          <button class="btn-start-onboarding-banner" @click="store.openOnboarding">
            Bắt đầu khảo sát AI →
          </button>
        </div>

        <div class="sec-h">
          <h2>{{ store.onboardingProfile?.householdSize === 1 ? 'Suất ăn Độc thân hoàn chỉnh' : 'Mâm cơm Gia đình Việt 5 thành phần' }}</h2>
          <p>
            {{ store.onboardingProfile?.householdSize === 1
              ? 'Chuẩn bữa ăn cá nhân nhanh gọn: Đạm + Canh + Rau + Tinh bột ST25 + Trái cây. Nấu 1 chảo chỉ 10–12 phút.'
              : 'Đầy đủ 5 thành phần Á Đông: 1 Đạm chính + 1 Canh nóng + 1 Rau xanh + Cơm ST25 + Trái cây tráng miệng theo mùa.'
            }}
          </p>
        </div>

        <div class="layout">
          <div>
            <!-- Bảng Nâng Cấp Dinh Dưỡng & Khẩu Vị (Value-Based Upsell Toggles V2) -->
            <ValueUpsellBar />

            <!-- Bộ lọc khẩu vị & Công tắc Dinh dưỡng -->
            <div class="filters-bar">
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
                <button
                  class="chip vegan-chip"
                  :class="{ active: store.f.includes('chay') }"
                  @click="store.toggleFilter('chay')"
                >
                  🌱 Thuần chay / Rằm
                </button>
                <button
                  type="button"
                  class="chip ai-reorder-chip"
                  @click="store.autoFillMenu"
                  title="Tự động xếp lại mâm cơm theo hồ sơ AI"
                >
                  ✨ AI Tự động xếp thực đơn
                </button>
              </div>

              <!-- Công tắc Hiện chỉ số dinh dưỡng -->
              <label class="nutrition-toggle" title="Bật/Tắt hiển thị Calo, Đạm, Tinh bột trên thẻ món">
                <input
                  type="checkbox"
                  :checked="store.showNutrition"
                  @change="store.toggleShowNutrition"
                />
                <span class="nt-lbl">🔥 Hiện chỉ số dinh dưỡng (Calo/Đạm)</span>
              </label>
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
import ValueUpsellBar from '../components/store/ValueUpsellBar.vue';
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

const goalLabel = computed(() => {
  const p = store.onboardingProfile;
  if (!p || !p.healthGoal || !p.healthGoal.length) return 'Cân bằng dinh dưỡng gia đình';
  const goalMap = {
    balanced: 'Cân bằng dinh dưỡng gia đình',
    muscle: 'Tăng cơ / Tập Gym',
    low_carb: 'Giảm mỡ / Kiểm soát cân nặng',
    diabetic: 'Kiểm soát đường huyết',
    easy_digest: 'Tiêu hóa nhẹ nhàng'
  };
  return p.healthGoal.map((g) => goalMap[g] || g).join(', ');
});
</script>

<style scoped>
.onboarding-banner-wrap {
  padding: 30px 0 10px;
  background: linear-gradient(180deg, var(--bg) 0%, rgba(228, 240, 232, 0.3) 100%);
}

.ai-profile-strip-store {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--green-soft);
  border: 1.5px solid var(--green);
  border-radius: 14px;
  padding: 12px 18px;
  margin-bottom: 24px;
}

.ai-spark-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: var(--green);
  letter-spacing: 0.04em;
  margin-bottom: 3px;
}

.strip-desc {
  font-size: 13.5px;
  color: var(--ink);
}

.strip-desc b {
  color: var(--green-d);
}

.btn-edit-profile-strip {
  border: 0;
  background: var(--green);
  color: #fff;
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-edit-profile-strip:hover {
  background: var(--green-d);
}

.ai-skip-banner-store {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--orange-soft);
  border: 1.5px dashed var(--orange);
  border-radius: 14px;
  padding: 12px 18px;
  margin-bottom: 24px;
}

.skip-banner-text {
  font-size: 13.5px;
  color: var(--ink);
  line-height: 1.45;
}

.skip-banner-text b {
  color: var(--orange-ink);
}

.btn-start-onboarding-banner {
  border: 0;
  background: var(--orange);
  color: #fff;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-start-onboarding-banner:hover {
  background: #bf4314;
}

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

.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin: 16px 0 14px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.filters .lbl {
  font-size: 13.5px;
  font-weight: 600;
  margin-right: 4px;
}

.chip.vegan-chip {
  background: #F0FDF4;
  border-color: #BBF7D0;
  color: #166534;
}

.chip.ai-reorder-chip {
  background: var(--green-soft);
  border-color: var(--green);
  color: var(--green);
  font-weight: 700;
}

.chip.ai-reorder-chip:hover {
  background: var(--green);
  color: #fff;
}

.chip.vegan-chip.active {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.nutrition-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: all .15s ease;
}

.nutrition-toggle:hover {
  border-color: var(--orange);
  background: var(--orange-soft);
}

.nutrition-toggle input {
  accent-color: var(--orange);
  cursor: pointer;
  margin: 0;
}

.nutrition-toggle .nt-lbl {
  color: var(--ink);
  white-space: nowrap;
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
