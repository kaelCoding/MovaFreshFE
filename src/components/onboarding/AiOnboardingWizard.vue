<template>
  <div :class="['ai-wizard-container', { 'as-modal-backdrop': asModal }]" @click.self="handleBackdropClick">
    <div class="ai-wizard-card" role="region" aria-label="Khảo sát dinh dưỡng AI MOVA Fresh">
      <!-- Close button if in modal mode -->
      <button
        v-if="asModal"
        class="wizard-close-btn"
        @click="handleClose"
        aria-label="Đóng khảo sát"
      >
        ×
      </button>

      <!-- Step Progress Bar (3 bước) -->
      <div v-if="currentStep >= 1 && currentStep <= 3" class="wizard-progress-header">
        <div class="progress-info">
          <span class="step-badge">Bước {{ currentStep }} / 3</span>
          <span class="step-name">{{ stepTitles[currentStep] }}</span>
        </div>
        <div class="wizard-progress-track" role="progressbar" :aria-valuenow="(currentStep / 3) * 100" aria-valuemin="0" aria-valuemax="100">
          <div class="wizard-progress-fill" :style="{ width: ((currentStep / 3) * 100) + '%' }"></div>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- BƯỚC 1: QUY MÔ BÀN ĂN & PHONG CÁCH ẨM THỰC (LƯỚI 2 CỘT SIÊU GỌN)   -->
      <!-- =================================================================== -->
      <section v-if="currentStep === 1" class="step-content step-compact">
        <div class="step-header-compact">
          <div class="step-pill-compact">⚡ BƯỚC 1/3 • THIẾT LẬP NHU CẦU 30S</div>
          <h3 class="step-title-compact">Quy mô bàn ăn &amp; Phong cách ẩm thực</h3>
        </div>

        <!-- 2 Ô Stepper song song 2 cột -->
        <div class="steppers-grid-2col">
          <!-- Cột 1: Số người ăn -->
          <div class="stepper-col-card">
            <div class="stepper-card-lbl">Số người ăn / bữa</div>
            <div class="stepper-controls">
              <button
                type="button"
                class="btn-step"
                :disabled="form.householdSize <= 1"
                @click="changeHouseholdSize(-1)"
                aria-label="Giảm 1 người"
              >−</button>
              <div class="stepper-text">
                <span class="num val">{{ form.householdSize }}</span>
                <span class="unit">người</span>
              </div>
              <button
                type="button"
                class="btn-step"
                :disabled="form.householdSize >= 8"
                @click="changeHouseholdSize(1)"
                aria-label="Tăng 1 người"
              >+</button>
            </div>
          </div>

          <!-- Cột 2: Số bữa / tuần -->
          <div class="stepper-col-card">
            <div class="stepper-card-lbl">Số bữa nấu / tuần</div>
            <div class="stepper-controls">
              <button
                type="button"
                class="btn-step"
                :disabled="form.mealsPerWeek <= 3"
                @click="changeMealsPerWeek(-1)"
                aria-label="Giảm 1 bữa"
              >−</button>
              <div class="stepper-text">
                <span class="num val">{{ form.mealsPerWeek }}</span>
                <span class="unit">bữa</span>
              </div>
              <button
                type="button"
                class="btn-step"
                :disabled="form.mealsPerWeek >= 7"
                @click="changeMealsPerWeek(1)"
                aria-label="Tăng 1 bữa"
              >+</button>
            </div>
          </div>
        </div>

        <!-- Dải thông báo chế độ suất ăn 1-2 dòng -->
        <div class="segment-banner-compact" :class="{ solo: form.householdSize === 1, family: form.householdSize >= 2 }">
          <span class="seg-icon">{{ form.householdSize === 1 ? '👤' : '👨‍👩‍👧‍👦' }}</span>
          <span class="seg-text">
            <template v-if="form.householdSize === 1">
              <b>Chế độ Suất ăn Độc thân 1 chảo:</b> Đạm tinh gọn + Rau xào + Cơm ST25 + Xốt riêng, nấu 10 phút.
            </template>
            <template v-else>
              <b>Chế độ Mâm cơm Gia đình Việt 5 thành phần:</b> Đạm chính + Canh + Rau + Cơm ST25 + Trái cây.
            </template>
          </span>
        </div>

        <!-- Phong cách ẩm thực: 1 nhãn duy nhất & 2 thẻ vuông vức 1fr 1fr -->
        <div class="cuisine-section-compact">
          <div class="section-sublabel">Phong cách ẩm thực</div>
          <div class="cuisine-grid-2col">
            <div
              class="cuisine-card-box"
              :class="{ active: form.cuisinePreference === 'pure_viet' }"
              @click="form.cuisinePreference = 'pure_viet'"
              role="button"
              tabindex="0"
            >
              <div class="corner-check" v-if="form.cuisinePreference === 'pure_viet'">✓</div>
              <div class="c-head">
                <span class="c-icon">🍲</span>
                <b>Thuần cơm nhà Việt</b>
              </div>
              <p class="c-desc">Kho, xào, canh chua chuẩn vị quê hương</p>
            </div>

            <div
              class="cuisine-card-box"
              :class="{ active: form.cuisinePreference === 'viet_fusion' }"
              @click="form.cuisinePreference = 'viet_fusion'"
              role="button"
              tabindex="0"
            >
              <div class="corner-check" v-if="form.cuisinePreference === 'viet_fusion'">✓</div>
              <div class="c-head">
                <span class="c-icon">🥩</span>
                <b>Cơm Việt + 1–2 bữa Đồ Tây</b>
              </div>
              <p class="c-desc">Cơm nhà + 1-2 bữa Steak thăn bò Bistro</p>
            </div>
          </div>
        </div>

        <!-- Footer điều hướng gọn gàng -->
        <div class="wizard-footer-compact">
          <button type="button" class="btn-skip-link" @click="handleSkip">
            Bỏ qua bước này, xem thực đơn mặc định
          </button>
          <button type="button" class="btn-next-compact" @click="nextStep">
            <span>Tiếp tục (Bước 2)</span>
            <span class="arrow-icon" aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 2: MỤC TIÊU SỨC KHỎE & KIÊNG CỮ (LƯỚI 2 CỘT CHIP GỌN)         -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 2" class="step-content step-compact">
        <div class="step-header-compact">
          <div class="step-pill-compact">🥗 BƯỚC 2/3 • CÂN BẰNG CALO &amp; DỊ ỨNG</div>
          <h3 class="step-title-compact">Mục tiêu sức khỏe &amp; Kiêng cữ</h3>
        </div>

        <!-- 5 Mục tiêu sức khỏe: lưới 2 cột gọn gàng -->
        <div class="goals-grid-compact">
          <button
            v-for="goal in healthGoalOptions"
            :key="goal.id"
            type="button"
            class="goal-card-box"
            :class="{ active: form.healthGoal.includes(goal.id), 'full-width': goal.id === 'easy_digest' }"
            @click="toggleHealthGoal(goal.id)"
            :aria-pressed="form.healthGoal.includes(goal.id)"
          >
            <span class="goal-check-indicator">{{ form.healthGoal.includes(goal.id) ? '✓' : '' }}</span>
            <span class="goal-emoji">{{ goal.icon }}</span>
            <div class="goal-info">
              <b>{{ goal.title }}</b>
              <small>{{ goal.descShort }}</small>
            </div>
          </button>
        </div>

        <!-- Kiêng cữ dị ứng dạng chip ngang nhỏ gọn phía dưới -->
        <div class="exclusions-wrap-compact">
          <div class="section-sublabel">Nguyên liệu kiêng cữ / Dị ứng:</div>
          <div class="chips-row-compact">
            <button
              v-for="item in exclusionOptions"
              :key="item.id"
              type="button"
              class="chip-tag"
              :class="{
                active: item.id === 'none' ? form.exclusions.length === 0 : form.exclusions.includes(item.id),
                'chip-none': item.id === 'none'
              }"
              @click="toggleExclusion(item.id)"
              :aria-pressed="item.id === 'none' ? form.exclusions.length === 0 : form.exclusions.includes(item.id)"
            >
              <span>{{ item.icon }} {{ item.label }}</span>
              <span v-if="(item.id === 'none' ? form.exclusions.length === 0 : form.exclusions.includes(item.id))" class="chip-tick">✓</span>
            </button>
          </div>
        </div>

        <!-- Footer điều hướng gọn gàng -->
        <div class="wizard-footer-compact">
          <button type="button" class="btn-back-compact" @click="prevStep">
            ← Quay lại
          </button>
          <button type="button" class="btn-next-compact" @click="nextStep">
            <span>Tiếp tục (Bước 3)</span>
            <span class="arrow-icon" aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 3: CỔNG MỞ KHÓA THỰC ĐƠN & GIFT CARD 900K (THANH NGANG MỎNG)   -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 3" class="step-content step-compact">
        <div class="step-header-compact">
          <div class="step-pill-compact">🎁 BƯỚC 3/3 • MỞ KHÓA THỰC ĐƠN</div>
          <h3 class="step-title-compact">
            {{ form.householdSize === 1
              ? `Thực đơn Suất ăn 1 người (${form.mealsPerWeek} bữa/tuần) đã sẵn sàng!`
              : `Thực đơn Mâm cơm ${form.householdSize} người (${form.mealsPerWeek} bữa/tuần) đã sẵn sàng!`
            }}
          </h3>
          <p class="step-sub-oneline">
            Khẩu vị: <b>{{ form.cuisinePreference === 'pure_viet' ? 'Thuần cơm Việt' : 'Cơm Việt + Đồ Tây' }}</b> •
            Mục tiêu: <b>{{ selectedHealthGoalsText }}</b>
          </p>
        </div>

        <!-- Thanh ngang mỏng 4 ô phân bổ Gift Card 900k -->
        <div class="staggered-strip-slim">
          <div class="stagger-cell highlight">
            <span class="cell-w">Tuần 1</span>
            <b class="cell-v num">-300k</b>
          </div>
          <div class="stagger-cell">
            <span class="cell-w">Tuần 2</span>
            <b class="cell-v num">-200k</b>
          </div>
          <div class="stagger-cell">
            <span class="cell-w">Tuần 3</span>
            <b class="cell-v num">-200k</b>
          </div>
          <div class="stagger-cell">
            <span class="cell-w">Tuần 4</span>
            <b class="cell-v num">-200k</b>
          </div>
          <div class="stagger-gift-badge">
            🎁 Tặng <b>900k</b> Gift Card + <b>20k</b> Credit
          </div>
        </div>

        <!-- Form nhập 1 thông tin duy nhất + nút CTA chính -->
        <form class="gate-form-compact" @submit.prevent="handleSubmitGate">
          <div class="input-with-icon-compact">
            <span class="input-icon-sm">📱</span>
            <input
              id="lead-contact-gate"
              v-model.trim="form.contact"
              type="text"
              class="contact-input-compact"
              :class="{ 'has-error': contactError }"
              placeholder="Nhập Số điện thoại (Zalo) hoặc Email..."
              autocomplete="tel email"
              required
            />
          </div>
          <span v-if="contactError" class="field-error-msg-sm">{{ contactError }}</span>

          <button type="submit" class="btn-gate-cta-compact">
            <span>Mở khóa Thực đơn AI &amp; Nhận +20k Credit</span>
            <span class="arrow-icon">→</span>
          </button>

          <div class="gate-sub-links-compact">
            <button type="button" class="btn-skip-link" @click="handleSkip">
              Bỏ qua bước này, xem thực đơn mặc định
            </button>
            <button type="button" class="btn-back-link" @click="prevStep">
              ← Sửa lại mục tiêu
            </button>
          </div>
        </form>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 4: AI LOADING & COMPLETE CELEBRATION                           -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 4" class="step-content step-compact">
        <!-- 1. Trạng thái Loading AI (1.5 giây) -->
        <div v-if="isAnalyzing" class="ai-loading-box-compact">
          <div class="ai-spinner-halo-sm">
            <div class="spinner-core-sm">🧠</div>
          </div>
          <h4 class="loading-title-sm">AI Nutritionist đang tính toán thực đơn riêng...</h4>
          <p class="loading-subtitle-sm">{{ dynamicLoadingMessage }}</p>
        </div>

        <!-- 2. Trạng thái Hoàn tất & Mở khóa Thành công -->
        <div v-else class="ai-success-box-compact">
          <div class="success-celebration-badge-sm">
            <span class="celebrate-emoji">🎉</span>
          </div>

          <h3 class="success-title-sm">
            Thực đơn AI Dành Riêng Cho Gia Đình Bạn Đã Sẵn Sàng!
          </h3>
          <p class="success-subtitle-sm">
            Hệ thống đã tự động cá nhân hóa mâm cơm tuần này dựa trên 100% hồ sơ dinh dưỡng của bạn.
          </p>

          <div class="reward-highlight-strip-sm">
            <span class="r-gift">🎁</span>
            <div>
              <b>Đã cộng +20.000đ Fresh Credit vào tài khoản</b>
              <small>Tự động giảm trừ trực tiếp vào kỳ giao đầu tiên của bạn</small>
            </div>
          </div>

          <button type="button" class="btn-view-menu-cta-compact" @click="handleGoToMenu">
            <span>Xem Thực đơn Cá nhân hóa ngay</span>
            <span class="arrow-icon" aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';

const props = defineProps({
  asModal: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'complete']);

const store = useMovaStore();

const currentStep = ref(1);
const contactError = ref('');
const isAnalyzing = ref(false);
const loadingStep = ref(1);
const dynamicLoadingMessage = ref('AI đang đọc các chỉ số thể trạng...');

const stepTitles = {
  1: 'Quy mô & Phong cách',
  2: 'Mục tiêu & Kiêng cữ',
  3: 'Mở khóa thực đơn & Quà tặng'
};

// Form state matching schema POST /api/v2/onboarding/profile
const form = reactive({
  contact: '',
  region: 'hcm_inner',
  householdSize: 2,
  mealsPerWeek: 5,
  cuisinePreference: 'pure_viet',
  healthGoal: ['balanced'],
  exclusions: [],
  isCompleted: false
});

// Health Goal Options (concise descShort for 2-column layout)
const healthGoalOptions = [
  {
    id: 'balanced',
    icon: '🥗',
    title: 'Cân bằng dinh dưỡng',
    descShort: 'Đủ 4 nhóm chất chuẩn mâm cơm nhà'
  },
  {
    id: 'muscle',
    icon: '🏋️',
    title: 'Tăng cơ / Tập Gym',
    descShort: 'High-Protein: +35% đạm nạc'
  },
  {
    id: 'low_carb',
    icon: '⚖️',
    title: 'Giảm mỡ / Giữ dáng',
    descShort: 'Low-Carb: Giàu xơ, xốt ít ngọt'
  },
  {
    id: 'diabetic',
    icon: '🩸',
    title: 'Kiểm soát đường huyết',
    descShort: 'Low-GI: Dùng Gạo lứt ST25'
  },
  {
    id: 'easy_digest',
    icon: '🌿',
    title: 'Tiêu hóa nhẹ nhàng',
    descShort: 'Thanh đạm, canh hầm ấm bụng'
  }
];

// Exclusion Options
const exclusionOptions = [
  { id: 'no_beef', icon: '🥩', label: 'Không ăn Bò' },
  { id: 'no_pork', icon: '🥓', label: 'Không ăn Heo' },
  { id: 'no_seafood', icon: '🦐', label: 'Không ăn Hải sản' },
  { id: 'no_spicy', icon: '🌶️', label: 'Không ăn cay' },
  { id: 'none', icon: '✨', label: 'Không có' }
];

// Pre-fill form from existing store profile if available
onMounted(() => {
  if (store.onboardingProfile) {
    if (store.onboardingProfile.contact) form.contact = store.onboardingProfile.contact;
    if (store.onboardingProfile.region) form.region = store.onboardingProfile.region;
    if (store.onboardingProfile.householdSize) form.householdSize = store.onboardingProfile.householdSize;
    if (store.onboardingProfile.mealsPerWeek) form.mealsPerWeek = store.onboardingProfile.mealsPerWeek;
    if (store.onboardingProfile.cuisinePreference) form.cuisinePreference = store.onboardingProfile.cuisinePreference;
    if (store.onboardingProfile.healthGoal && store.onboardingProfile.healthGoal.length) {
      form.healthGoal = [...store.onboardingProfile.healthGoal];
    }
    if (store.onboardingProfile.exclusions) {
      form.exclusions = [...store.onboardingProfile.exclusions];
    }
  }
});

// Computed labels for summary
const selectedHealthGoalsText = computed(() => {
  if (!form.healthGoal.length) return 'Cân bằng dinh dưỡng';
  return form.healthGoal
    .map((gId) => {
      const found = healthGoalOptions.find((o) => o.id === gId);
      return found ? found.title : gId;
    })
    .join(', ');
});

const selectedExclusionsText = computed(() => {
  if (!form.exclusions.length) return 'Không có';
  return form.exclusions
    .map((exId) => {
      const found = exclusionOptions.find((o) => o.id === exId);
      return found ? found.label : exId;
    })
    .join(', ');
});

// Step Navigation
const nextStep = () => {
  if (currentStep.value < 3) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const changeHouseholdSize = (delta) => {
  const next = form.householdSize + delta;
  if (next >= 1 && next <= 8) {
    form.householdSize = next;
  }
};

const changeMealsPerWeek = (delta) => {
  const next = form.mealsPerWeek + delta;
  if (next >= 3 && next <= 7) {
    form.mealsPerWeek = next;
  }
};

const toggleHealthGoal = (goalId) => {
  const idx = form.healthGoal.indexOf(goalId);
  if (idx > -1) {
    if (form.healthGoal.length > 1) {
      form.healthGoal.splice(idx, 1);
    }
  } else {
    form.healthGoal.push(goalId);
  }
};

const toggleExclusion = (exId) => {
  if (exId === 'none') {
    form.exclusions = [];
    return;
  }
  const idx = form.exclusions.indexOf(exId);
  if (idx > -1) {
    form.exclusions.splice(idx, 1);
  } else {
    form.exclusions.push(exId);
  }
};

// Gate Submit (Bước 3)
const handleSubmitGate = () => {
  contactError.value = '';
  const val = form.contact.trim();
  if (!val) {
    contactError.value = 'Vui lòng nhập Số điện thoại hoặc Email để mở khóa thực đơn.';
    return;
  }
  const isEmail = val.includes('@') && val.includes('.');
  const isPhone = /^[0-9+\s().-]{8,15}$/.test(val);
  if (!isEmail && !isPhone) {
    contactError.value = 'Vui lòng nhập Số điện thoại (9–11 chữ số) hoặc Email hợp lệ.';
    return;
  }

  currentStep.value = 4;
  isAnalyzing.value = true;
  loadingStep.value = 1;
  dynamicLoadingMessage.value = `AI Nutritionist đang tính toán tỷ lệ Calo & Đạm cho ${form.householdSize} người ăn...`;

  // Ngay tại khoảnh khắc hoàn tất Bước 3:
  // Lập tức đặt onboardingProfile.isCompleted = true, isLoggedIn = true, nhận +20k Fresh Credit & gỡ kính mờ
  store.saveOnboardingProfile({ ...form }, true);

  setTimeout(() => {
    loadingStep.value = 2;
    dynamicLoadingMessage.value = 'Đang trích xuất BOM nguyên liệu sạch từ nhà máy Đắk Lắk...';
  }, 500);

  setTimeout(() => {
    loadingStep.value = 3;
    dynamicLoadingMessage.value = 'Đang hoàn tất mâm cơm cá nhân hóa & cộng điểm Fresh Credit...';
  }, 1000);

  setTimeout(() => {
    isAnalyzing.value = false;
    setTimeout(() => {
      const el = document.getElementById('thuc-don');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  }, 1500);
};

const handleSkip = () => {
  store.skipOnboarding();
  emit('close');
};

const handleClose = () => {
  if (currentStep.value === 4) {
    store.dismissHeroWizard();
  }
  emit('close');
  if (store.activeModal === 'onboarding') {
    store.closeModal();
  }
};

const handleBackdropClick = () => {
  if (props.asModal) {
    handleClose();
  }
};

const handleGoToMenu = () => {
  store.dismissHeroWizard();
  emit('complete');
  if (props.asModal) {
    store.closeModal();
  }
  setTimeout(() => {
    const el = document.getElementById('thuc-don');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
};
</script>

<style scoped>
.ai-wizard-container {
  width: 100%;
  height: 100%;
}

/* Modal backdrop if asModal = true */
.ai-wizard-container.as-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(30, 25, 15, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 16px;
  overflow-y: auto;
}

.ai-wizard-card {
  position: relative;
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 6px 24px rgba(20, 35, 20, 0.07);
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  overflow: hidden;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
}

.as-modal-backdrop .ai-wizard-card {
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(20, 15, 10, 0.25);
}

.wizard-close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font-size: 18px;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.15s ease;
}

.wizard-close-btn:hover {
  background: var(--line-2);
  color: var(--red);
}

/* Header Progress (Gọn gàng ~38px) */
.wizard-progress-header {
  padding: 10px 18px 8px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 12px;
}

.step-badge {
  font-weight: 700;
  color: var(--green);
  background: var(--green-soft);
  padding: 2px 7px;
  border-radius: 5px;
}

.step-name {
  font-weight: 600;
  color: var(--muted);
  font-size: 11.5px;
}

.wizard-progress-track {
  height: 4px;
  background: var(--line);
  border-radius: 999px;
  overflow: hidden;
}

.wizard-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--green), var(--orange));
  border-radius: 999px;
  transition: width 0.3s ease;
}

/* Step Content Compact */
.step-content.step-compact {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.step-header-compact {
  margin-bottom: 2px;
}

.step-pill-compact {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--green-soft);
  color: var(--green-d);
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.4px;
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 4px;
}

.step-title-compact {
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
  line-height: 1.25;
  margin: 0;
}

.step-sub-oneline {
  font-size: 12px;
  color: var(--muted);
  margin: 3px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-sub-oneline b {
  color: var(--ink);
}

/* =================================================================== */
/* BƯỚC 1: LƯỚI 2 CỘT CHO STEPPERS & PHONG CÁCH                        */
/* =================================================================== */
.steppers-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stepper-col-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stepper-card-lbl {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--muted);
}

.stepper-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-step {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink);
  font-size: 18px;
  font-weight: 700;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-step:hover:not(:disabled) {
  background: var(--line-2);
  border-color: var(--green);
  color: var(--green-d);
}

.btn-step:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.stepper-text {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stepper-text .val {
  font-size: 24px;
  font-weight: 900;
  color: var(--green-d);
  line-height: 1;
}

.stepper-text .unit {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

/* Segment Banner 1-2 dòng gọn */
.segment-banner-compact {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 11.5px;
  line-height: 1.35;
}

.segment-banner-compact.solo {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  color: #1E40AF;
}

.segment-banner-compact.family {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  color: #166534;
}

.seg-icon {
  font-size: 14px;
  line-height: 1.2;
}

.seg-text b {
  font-weight: 700;
}

/* Cuisine Section */
.section-sublabel {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 6px;
}

.cuisine-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cuisine-card-box {
  position: relative;
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cuisine-card-box:hover {
  border-color: var(--line-2);
}

.cuisine-card-box.active {
  border-color: var(--green);
  background: #F4FAF6;
  box-shadow: 0 2px 10px rgba(20, 108, 67, 0.08);
}

.corner-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  display: grid;
  place-items: center;
}

.c-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.c-head b {
  font-size: 12.5px;
  color: var(--ink);
}

.c-icon {
  font-size: 16px;
}

.c-desc {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
  margin: 0;
}

/* =================================================================== */
/* BƯỚC 2: MỤC TIÊU SỨC KHỎE 2 CỘT & CHIPS KIÊNG CỮ                     */
/* =================================================================== */
.goals-grid-compact {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
}

.goal-card-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  font-family: inherit;
  color: inherit;
}

.goal-card-box:hover {
  border-color: var(--line-2);
}

.goal-card-box.active {
  border-color: var(--green);
  background: #F4FAF6;
}

.goal-card-box.full-width {
  grid-column: 1 / -1;
}

.goal-check-indicator {
  width: 15px;
  height: 15px;
  border-radius: 4px;
  border: 1.5px solid var(--line);
  background: var(--card);
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 900;
  color: #fff;
  flex-shrink: 0;
}

.goal-card-box.active .goal-check-indicator {
  background: var(--green);
  border-color: var(--green);
}

.goal-emoji {
  font-size: 17px;
  line-height: 1;
  flex-shrink: 0;
}

.goal-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.goal-info b {
  font-size: 12px;
  color: var(--ink);
  line-height: 1.25;
}

.goal-info small {
  font-size: 10.5px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Exclusions Chips */
.exclusions-wrap-compact {
  margin-top: 2px;
}

.chips-row-compact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--card);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.chip-tag:hover {
  border-color: var(--line-2);
}

.chip-tag.active {
  border-color: var(--orange);
  background: var(--orange-soft);
  color: var(--orange-ink);
  font-weight: 700;
}

.chip-tag.chip-none.active {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-d);
}

.chip-tick {
  font-size: 10px;
}

/* =================================================================== */
/* BƯỚC 3: CỔNG MỞ KHÓA THANH NGANG MỎNG                              */
/* =================================================================== */
.staggered-strip-slim {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 10px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.stagger-cell {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 5px 4px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stagger-cell.highlight {
  border-color: var(--orange);
  background: var(--orange-soft);
}

.cell-w {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
}

.stagger-cell.highlight .cell-w {
  color: var(--orange-ink);
  font-weight: 700;
}

.cell-v {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--green);
}

.stagger-cell.highlight .cell-v {
  color: var(--orange);
}

.stagger-gift-badge {
  grid-column: 1 / -1;
  background: #EFFBF3;
  border: 1px dashed var(--green);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--green-d);
  text-align: center;
  margin-top: 2px;
}

/* Form nhập contact gọn */
.gate-form-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}

.input-with-icon-compact {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon-sm {
  position: absolute;
  left: 12px;
  font-size: 15px;
  pointer-events: none;
}

.contact-input-compact {
  width: 100%;
  padding: 10px 12px 10px 38px;
  font-size: 14px;
  font-family: inherit;
  border: 1.5px solid var(--line);
  border-radius: 11px;
  background: var(--card);
  color: var(--ink);
  transition: all 0.15s ease;
}

.contact-input-compact:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(20, 108, 67, 0.12);
}

.contact-input-compact.has-error {
  border-color: var(--red);
  background: #FFF5F5;
}

.field-error-msg-sm {
  font-size: 11.5px;
  color: var(--red);
  font-weight: 600;
}

.btn-gate-cta-compact {
  border: 0;
  background: linear-gradient(135deg, var(--green) 0%, #0F5233 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 18px rgba(20, 108, 67, 0.25);
  transition: all 0.15s ease;
}

.btn-gate-cta-compact:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(20, 108, 67, 0.32);
}

.gate-sub-links-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  gap: 8px;
  margin-top: 2px;
}

.btn-back-link {
  border: 0;
  background: none;
  font-size: 11.5px;
  color: var(--muted);
  cursor: pointer;
  padding: 2px 4px;
}

.btn-back-link:hover {
  color: var(--ink);
}

/* =================================================================== */
/* BƯỚC 4: AI LOADING & COMPLETE (COMPACT)                              */
/* =================================================================== */
.ai-loading-box-compact {
  text-align: center;
  padding: 30px 10px;
}

.ai-spinner-halo-sm {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin: 0 auto 12px;
  display: grid;
  place-items: center;
  background: conic-gradient(from 0deg, transparent 0%, var(--green) 70%, var(--orange) 100%);
  animation: spinHalo 1.2s linear infinite;
}

.spinner-core-sm {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--card);
  display: grid;
  place-items: center;
  font-size: 20px;
}

@keyframes spinHalo {
  to {
    transform: rotate(360deg);
  }
}

.loading-title-sm {
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 4px;
}

.loading-subtitle-sm {
  font-size: 12.5px;
  color: var(--green-d);
  font-weight: 600;
  margin: 0;
}

.ai-success-box-compact {
  text-align: center;
  padding: 10px 4px;
}

.success-celebration-badge-sm {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #EFFBF3;
  border: 1.5px solid #C4DEC9;
  display: grid;
  place-items: center;
  margin: 0 auto 8px;
  font-size: 22px;
}

.success-title-sm {
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 4px;
}

.success-subtitle-sm {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
  margin: 0 0 10px;
}

.reward-highlight-strip-sm {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #F0FDF4;
  border: 1px solid #86EFAC;
  border-radius: 10px;
  padding: 8px 12px;
  text-align: left;
  margin-bottom: 14px;
}

.r-gift {
  font-size: 20px;
  flex-shrink: 0;
}

.reward-highlight-strip-sm b {
  display: block;
  font-size: 12px;
  color: #15803D;
}

.reward-highlight-strip-sm small {
  font-size: 10.5px;
  color: #166534;
}

.btn-view-menu-cta-compact {
  width: 100%;
  border: 0;
  background: var(--green);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  padding: 12px 18px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 16px rgba(20, 108, 67, 0.22);
  transition: all 0.15s ease;
}

.btn-view-menu-cta-compact:hover {
  background: var(--green-d);
  transform: translateY(-1px);
}

/* =================================================================== */
/* FOOTER ĐIỀU HƯỚNG GỌN GÀNG                                         */
/* =================================================================== */
.wizard-footer-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.btn-next-compact {
  border: 0;
  background: var(--green);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  box-shadow: 0 2px 8px rgba(20, 108, 67, 0.18);
  transition: all 0.15s ease;
}

.btn-next-compact:hover {
  background: var(--green-d);
  transform: translateY(-1px);
}

.btn-back-compact {
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-back-compact:hover {
  background: var(--line-2);
  color: var(--ink);
}

.btn-skip-link {
  border: 0;
  background: none;
  font-size: 11.5px;
  color: var(--muted);
  text-decoration: underline;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.15s ease;
}

.btn-skip-link:hover {
  color: var(--ink);
}

/* =================================================================== */
/* RESPONSIVE MOBILE (390PX)                                          */
/* =================================================================== */
@media (max-width: 600px) {
  .step-content.step-compact {
    padding: 14px 14px;
    gap: 8px;
  }
  .steppers-grid-2col {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .cuisine-grid-2col {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .goals-grid-compact {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .staggered-strip-slim {
    grid-template-columns: repeat(2, 1fr);
  }
  .gate-sub-links-compact {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
