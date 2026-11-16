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

      <!-- Step Progress Bar (Hiển thị 3 bước: 1, 2, 3) -->
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
      <!-- BƯỚC 1: QUY MÔ BÀN ĂN & PHONG CÁCH ẨM THỰC (1 CHẠM TỐI ƯU)         -->
      <!-- =================================================================== -->
      <section v-if="currentStep === 1" class="step-content">
        <div class="step-header">
          <div class="step-pill">
            <span>⚡ KHẢO SÁT 30 GIÂY • HELLOFRESH FOCUS GATE</span>
          </div>
          <h3>Quy mô bàn ăn & Phong cách ẩm thực</h3>
          <p class="step-desc">
            AI sẽ tính toán định lượng chính xác theo gram để mâm cơm gia đình vừa vặn, không lãng phí đồ ăn lưu cữu.
          </p>
        </div>

        <div class="size-config-wrap">
          <!-- A. Số người ăn (Stepper 1 - 8) -->
          <div class="config-box">
            <div class="config-header">
              <label class="config-lbl" for="household-size-val">Số người ăn mỗi bữa:</label>
              <span class="config-hint">Chỉnh linh hoạt từ 1 đến 8 người</span>
            </div>
            <div class="stepper-row">
              <button
                type="button"
                class="btn-stepper"
                :disabled="form.householdSize <= 1"
                @click="changeHouseholdSize(-1)"
                aria-label="Giảm 1 người"
              >
                −
              </button>
              <div class="stepper-display">
                <span id="household-size-val" class="stepper-number num">{{ form.householdSize }}</span>
                <span class="stepper-unit">người</span>
              </div>
              <button
                type="button"
                class="btn-stepper"
                :disabled="form.householdSize >= 8"
                @click="changeHouseholdSize(1)"
                aria-label="Tăng 1 người"
              >
                +
              </button>
            </div>

            <!-- Dynamic Segment Label theo chuẩn V2 -->
            <div class="segment-banner" :class="{ solo: form.householdSize === 1, family: form.householdSize >= 2 }">
              <div v-if="form.householdSize === 1" class="segment-info">
                <div class="segment-tag">👤 Chế độ Suất ăn Độc thân hoàn chỉnh</div>
                <p class="segment-desc">
                  1 Hộp suất ăn cá nhân hoàn chỉnh: Đạm tinh gọn + Rau xào/luộc + Tinh bột lành mạnh + Gói xốt riêng. Nhanh - Gọn - Sạch, nấu trong 1 chảo chỉ 10 phút, không cần rửa nhiều.
                </p>
              </div>
              <div v-else class="segment-info">
                <div class="segment-tag">👨‍👩‍👧‍👦 Chế độ Mâm cơm Gia đình Việt 5 thành phần</div>
                <p class="segment-desc">
                  Chuẩn mâm cơm Á Đông trọn vẹn: <b>1 Món Đạm chính</b> + <b>1 Món Canh nóng</b> + <b>1 Món Rau xanh</b> + <b>Tinh bột ST25</b> + <b>Trái cây tráng miệng theo mùa</b>.
                </p>
              </div>
            </div>
          </div>

          <!-- B. Số bữa ăn / tuần (Stepper 3 - 7) -->
          <div class="config-box">
            <div class="config-header">
              <label class="config-lbl" for="meals-week-val">Số bữa nấu tại nhà mỗi tuần:</label>
              <span class="config-hint">Tối ưu cho bữa tối sum vầy</span>
            </div>
            <div class="stepper-row">
              <button
                type="button"
                class="btn-stepper"
                :disabled="form.mealsPerWeek <= 3"
                @click="changeMealsPerWeek(-1)"
                aria-label="Giảm 1 bữa"
              >
                −
              </button>
              <div class="stepper-display">
                <span id="meals-week-val" class="stepper-number num">{{ form.mealsPerWeek }}</span>
                <span class="stepper-unit">bữa / tuần</span>
              </div>
              <button
                type="button"
                class="btn-stepper"
                :disabled="form.mealsPerWeek >= 7"
                @click="changeMealsPerWeek(1)"
                aria-label="Tăng 1 bữa"
              >
                +
              </button>
            </div>
            <div class="config-subnote">
              💡 Khuyên dùng <b>5 bữa/tuần</b> (Thứ 2 đến Thứ 6). Cuối tuần linh hoạt đổi gió hoặc ăn ngoài.
            </div>
          </div>

          <!-- C. Phong cách ẩm thực -->
          <div class="config-box">
            <div class="config-header">
              <label class="config-lbl">Khẩu vị gia đình bạn yêu thích phong cách nào?</label>
            </div>
            <fieldset class="options-fieldset mini-grid">
              <legend class="sr-only">Chọn phong cách ẩm thực</legend>

              <label
                class="choice-card"
                :class="{ active: form.cuisinePreference === 'pure_viet' }"
              >
                <input
                  type="radio"
                  name="cuisine"
                  value="pure_viet"
                  v-model="form.cuisinePreference"
                  class="sr-only"
                />
                <div class="choice-icon">🍲</div>
                <div class="choice-body">
                  <div class="choice-title">
                    <b>Thuần cơm nhà Việt Nam</b>
                    <span class="tag-badge green">Chuẩn vị Á Đông</span>
                  </div>
                  <p class="choice-sub">
                    Thịt ba chỉ ram gừng, gà nướng sả mật ong, cá bớp kho tộ, canh chua cá, rau muống non xào tỏi...
                  </p>
                </div>
                <div class="choice-radio-indicator">
                  <span class="radio-dot"></span>
                </div>
              </label>

              <label
                class="choice-card"
                :class="{ active: form.cuisinePreference === 'viet_fusion' }"
              >
                <input
                  type="radio"
                  name="cuisine"
                  value="viet_fusion"
                  v-model="form.cuisinePreference"
                  class="sr-only"
                />
                <div class="choice-icon">🥩</div>
                <div class="choice-body">
                  <div class="choice-title">
                    <b>Cơm Việt kết hợp 1–2 bữa Đồ Tây</b>
                    <span class="tag-badge orange">Steak / Áp chảo</span>
                  </div>
                  <p class="choice-sub">
                    4-5 bữa cơm quê nhà + 1-2 bữa cuối tuần đổi gió với Steak thăn bò Đắk Lắk xốt tiêu đen phong cách Bistro.
                  </p>
                </div>
                <div class="choice-radio-indicator">
                  <span class="radio-dot"></span>
                </div>
              </label>
            </fieldset>
          </div>
        </div>

        <div class="wizard-footer-nav">
          <div class="skip-wrap-inline">
            <button type="button" class="btn-skip-survey" @click="handleSkip">
              Bỏ qua bước này, xem thực đơn mặc định
            </button>
          </div>
          <button type="button" class="btn-nav next" @click="nextStep">
            <span>Tiếp tục (Bước 2)</span>
            <span class="arrow-icon" aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 2: MỤC TIÊU SỨC KHỎE & KIÊNG CỮ (1 CHẠM TỐI ƯU)                -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 2" class="step-content">
        <div class="step-header">
          <div class="step-pill">
            <span>🥗 BƯỚC 2/3 • CÂN BẰNG CALO & LOẠI TRỪ DỊ ỨNG</span>
          </div>
          <h3>Mục tiêu sức khỏe & Kiêng cữ</h3>
          <p class="step-desc">
            Chọn 1 hoặc nhiều mục tiêu để AI tính toán tỷ lệ Đạm, Xơ và loại bỏ các nguyên liệu không mong muốn:
          </p>
        </div>

        <!-- 1. Mục tiêu sức khỏe -->
        <div class="multiselect-grid">
          <button
            v-for="goal in healthGoalOptions"
            :key="goal.id"
            type="button"
            class="multiselect-card"
            :class="{ active: form.healthGoal.includes(goal.id) }"
            @click="toggleHealthGoal(goal.id)"
            :aria-pressed="form.healthGoal.includes(goal.id)"
          >
            <div class="multi-check" aria-hidden="true">
              {{ form.healthGoal.includes(goal.id) ? '✓' : '' }}
            </div>
            <div class="multi-icon">{{ goal.icon }}</div>
            <div class="multi-body">
              <div class="multi-title">{{ goal.title }}</div>
              <p class="multi-desc">{{ goal.desc }}</p>
            </div>
          </button>
        </div>

        <!-- 2. Kiêng cữ dị ứng -->
        <div class="exclusions-section">
          <div class="config-header" style="margin-top: 18px; margin-bottom: 8px">
            <label class="config-lbl">Nguyên liệu gia đình cần loại trừ hoặc kiêng cữ:</label>
          </div>
          <div class="chips-container">
            <button
              v-for="item in exclusionOptions"
              :key="item.id"
              type="button"
              class="exclusion-chip"
              :class="{
                active: item.id === 'none' ? form.exclusions.length === 0 : form.exclusions.includes(item.id),
                'chip-none': item.id === 'none'
              }"
              @click="toggleExclusion(item.id)"
              :aria-pressed="item.id === 'none' ? form.exclusions.length === 0 : form.exclusions.includes(item.id)"
            >
              <span class="chip-icon">{{ item.icon }}</span>
              <span class="chip-text">{{ item.label }}</span>
              <span v-if="(item.id === 'none' ? form.exclusions.length === 0 : form.exclusions.includes(item.id))" class="chip-mark">✓</span>
            </button>
          </div>
        </div>

        <div class="wizard-footer-nav">
          <button type="button" class="btn-nav back" @click="prevStep">
            ← Quay lại
          </button>
          <button type="button" class="btn-nav next" @click="nextStep">
            <span>Tiếp tục (Bước 3)</span>
            <span class="arrow-icon" aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 3: CỔNG MỞ KHÓA THỰC ĐƠN & QUÀ TẶNG (SOFT GATE CUỐI CÙNG)       -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 3" class="step-content step-touchpoint">
        <!-- Thông báo cá nhân hóa theo lựa chọn vừa bấm -->
        <div class="gate-greeting-box">
          <div class="gate-sparkle-pill">
            <span class="sparkle">✨</span>
            <span>HỒ SƠ DINH DƯỠNG ĐÃ ĐƯỢC TÍNH TOÁN</span>
          </div>
          <h3 class="gate-ready-title">
            {{ form.householdSize === 1
              ? `AI đã chuẩn bị xong thực đơn Suất ăn Độc thân cho 1 người (${form.mealsPerWeek} bữa/tuần)!`
              : `AI đã chuẩn bị xong thực đơn Mâm cơm Việt cho gia đình ${form.householdSize} người (${form.mealsPerWeek} bữa/tuần)!`
            }}
          </h3>
          <p class="gate-ready-subtitle">
            Khẩu vị: <b>{{ form.cuisinePreference === 'pure_viet' ? 'Thuần cơm nhà Việt Nam' : 'Cơm Việt + 1-2 bữa Đồ Tây' }}</b> •
            Mục tiêu: <b>{{ selectedHealthGoalsText }}</b>
            <span v-if="form.exclusions.length"> • Kiêng: <b>{{ selectedExclusionsText }}</b></span>
          </p>
        </div>

        <!-- Staggered Discount Breakdown Card (Chiến lược giữ chân 4 tuần HelloFresh-style) -->
        <div class="staggered-card">
          <div class="staggered-label">Phân bổ Gift Card 900.000đ trải đều 4 tuần:</div>
          <div class="staggered-grid">
            <div class="stagger-col highlight">
              <span class="week-lbl">Tuần 1</span>
              <b class="disc-val num">-300k</b>
              <small class="stagger-note">Trừ ngay hôm nay</small>
            </div>
            <div class="stagger-col">
              <span class="week-lbl">Tuần 2</span>
              <b class="disc-val num">-200k</b>
              <small class="stagger-note">Tạo thói quen</small>
            </div>
            <div class="stagger-col">
              <span class="week-lbl">Tuần 3</span>
              <b class="disc-val num">-200k</b>
              <small class="stagger-note">Dinh dưỡng</small>
            </div>
            <div class="stagger-col">
              <span class="week-lbl">Tuần 4</span>
              <b class="disc-val num">-200k</b>
              <small class="stagger-note">Trọn 1 tháng</small>
            </div>
          </div>
          <div class="viral-bonus-tag">
            🎁 Tặng thêm ngay <b>+20.000đ Fresh Credit</b> vào tài khoản khi mở khóa thực đơn AI
          </div>
        </div>

        <!-- Form nhập 1 thông tin duy nhất: SĐT Zalo hoặc Email -->
        <form class="touchpoint-form" @submit.prevent="handleSubmitGate">
          <div class="field-group">
            <label for="lead-contact-gate" class="field-label">
              Nhập Số điện thoại (Zalo) hoặc Email để nhận quà & mở khóa thực đơn:
            </label>
            <div class="input-with-icon">
              <span class="input-icon" aria-hidden="true">📱</span>
              <input
                id="lead-contact-gate"
                v-model.trim="form.contact"
                type="text"
                class="contact-input"
                :class="{ 'has-error': contactError }"
                placeholder="Nhập SĐT Zalo hoặc Email (VD: 0912 345 678)..."
                autocomplete="tel email"
                required
              />
            </div>
            <span v-if="contactError" class="field-error-msg" role="alert">
              {{ contactError }}
            </span>
            <span v-else class="field-helper">
              🔒 Cam kết bảo mật 100%. MOVA chỉ dùng để lưu thực đơn AI riêng và nhắc lịch giao xe lạnh.
            </span>
          </div>

          <button type="submit" class="btn-touchpoint-cta">
            <span>Mở khóa Thực đơn AI & Nhận Gift Card 900.000đ (+20k Credit)</span>
            <span class="arrow-icon" aria-hidden="true">✨</span>
          </button>

          <div class="gate-sub-links">
            <button type="button" class="btn-skip-survey" @click="handleSkip">
              Bỏ qua bước này, xem thực đơn mặc định
            </button>
            <button type="button" class="btn-nav-back-link" @click="prevStep">
              ← Sửa lại mục tiêu & kiêng cữ
            </button>
          </div>
        </form>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 4: HIỆU ỨNG TỔNG HỢP AI & THƯỞNG VIRAL FRESH CREDIT              -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 4" class="step-content step-complete">
        <!-- 1. Trạng thái Loading AI (1.5 giây) -->
        <div v-if="isAnalyzing" class="ai-loading-box">
          <div class="ai-spinner-halo">
            <div class="spinner-core">🧠</div>
          </div>
          <h3 class="loading-title">AI Nutritionist đang tính toán thực đơn riêng...</h3>
          <p class="loading-subtitle">{{ dynamicLoadingMessage }}</p>
          <div class="ai-loading-steps">
            <div class="loading-step-item" :class="{ done: loadingStep >= 1 }">
              <span class="item-dot"></span> Phân tích thể trạng & quy mô {{ form.householdSize }} người ăn
            </div>
            <div class="loading-step-item" :class="{ done: loadingStep >= 2 }">
              <span class="item-dot"></span> Kết xuất BOM nguyên liệu sạch Đắk Lắk
            </div>
            <div class="loading-step-item" :class="{ done: loadingStep >= 3 }">
              <span class="item-dot"></span> Kích hoạt Gift Card 900k & thưởng +20.000đ Fresh Credit
            </div>
          </div>
        </div>

        <!-- 2. Trạng thái Hoàn tất & Mở khóa Thành công -->
        <div v-else class="ai-success-box">
          <div class="success-celebration-badge">
            <span class="celebrate-emoji">🎉</span>
          </div>

          <h3 class="success-title">
            Thực đơn AI Dành Riêng Cho Gia Đình Bạn Đã Sẵn Sàng!
          </h3>
          <p class="success-subtitle">
            Hệ thống đã tự động cá nhân hóa mâm cơm tuần này dựa trên 100% hồ sơ dinh dưỡng của bạn.
          </p>

          <!-- Viral Credit Reward Box -->
          <div class="reward-highlight-card">
            <div class="reward-card-top">
              <div class="reward-icon-sparkle">🎁</div>
              <div>
                <span class="reward-badge-pill">PHẦN THƯỞNG HOÀN THÀNH PROFILE 100%</span>
                <div class="reward-amount num">+20.000đ Fresh Credit</div>
              </div>
            </div>
            <p class="reward-desc">
              MOVA đã cộng trực tiếp <b>+20.000đ</b> vào tài khoản điểm bữa ăn của bạn. Điểm này sẽ tự động giảm trừ vào kỳ giao đầu tiên!
            </p>
          </div>

          <!-- Tóm tắt hồ sơ vừa tạo -->
          <div class="profile-summary-card">
            <div class="sum-title">Tóm tắt hồ sơ dinh dưỡng AI:</div>
            <div class="sum-grid">
              <div class="sum-item">
                <span class="sum-k">Quy mô:</span>
                <b class="sum-v">{{ form.householdSize }} người ăn • {{ form.mealsPerWeek }} bữa/tuần</b>
              </div>
              <div class="sum-item">
                <span class="sum-k">Ẩm thực:</span>
                <b class="sum-v">{{ form.cuisinePreference === 'pure_viet' ? 'Thuần cơm nhà Việt Nam' : 'Cơm Việt + 1-2 bữa Đồ Tây' }}</b>
              </div>
              <div class="sum-item">
                <span class="sum-k">Mục tiêu:</span>
                <b class="sum-v">{{ selectedHealthGoalsText }}</b>
              </div>
              <div class="sum-item">
                <span class="sum-k">Loại trừ:</span>
                <b class="sum-v">{{ selectedExclusionsText }}</b>
              </div>
            </div>
          </div>

          <!-- Nút CTA xem thực đơn cá nhân hóa -->
          <button type="button" class="btn-view-menu-cta" @click="handleGoToMenu">
            <span>Xem Thực đơn Cá nhân hóa của bạn ngay</span>
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

// 3 bước chuẩn HelloFresh Đức:
// Bước 1: Quy mô bàn ăn & Phong cách
// Bước 2: Mục tiêu sức khỏe & Kiêng cữ
// Bước 3: Cổng Mở Khóa Thực Đơn & Nhập SĐT/Email
// Bước 4: AI Analysis & Hoàn tất
const currentStep = ref(1);
const contactError = ref('');
const isAnalyzing = ref(false);
const loadingStep = ref(1);
const dynamicLoadingMessage = ref('AI đang đọc các chỉ số thể trạng...');

const stepTitles = {
  1: 'Quy mô bàn ăn & Phong cách',
  2: 'Mục tiêu sức khỏe & Kiêng cữ',
  3: 'Mở khóa thực đơn AI & Quà tặng'
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

// Health Goal Options
const healthGoalOptions = [
  {
    id: 'balanced',
    icon: '🥗',
    title: 'Cân bằng dinh dưỡng gia đình',
    desc: 'Đầy đủ 4 nhóm chất (đạm, rau, canh, tinh bột), phù hợp mọi thành viên.'
  },
  {
    id: 'muscle',
    icon: '🏋️',
    title: 'Tăng cơ / Tập Gym',
    desc: 'High-Protein: Tăng +35% lượng ức gà, nạc thăn bò, giảm chất béo.'
  },
  {
    id: 'low_carb',
    icon: '⚖️',
    title: 'Giảm mỡ / Giữ dáng',
    desc: 'Low-Carb: Giàu chất xơ rau củ Đắk Lắk, xốt ít ngọt, kiểm soát năng lượng.'
  },
  {
    id: 'diabetic',
    icon: '🩸',
    title: 'Kiểm soát đường huyết (Tiểu đường)',
    desc: 'Chỉ số GI thấp, dùng tinh bột phức hợp (Gạo lứt), không đường tinh luyện.'
  },
  {
    id: 'easy_digest',
    icon: '🌿',
    title: 'Tiêu hóa nhẹ nhàng',
    desc: 'Thanh đạm, canh hầm ấm bụng, tốt cho dạ dày và đại tràng nhạy cảm.'
  }
];

// Exclusion Options
const exclusionOptions = [
  { id: 'no_beef', icon: '🥩', label: 'Không ăn Bò' },
  { id: 'no_pork', icon: '🥓', label: 'Không ăn Heo' },
  { id: 'no_seafood', icon: '🦐', label: 'Không ăn Hải sản' },
  { id: 'no_spicy', icon: '🌶️', label: 'Không ăn cay' },
  { id: 'none', icon: '✨', label: 'Không có (Ăn được mọi món)' }
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
  if (!form.exclusions.length) return 'Không có (Ăn được mọi món)';
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
    // Tự động cuộn mượt xuống thẳng khu vực thực đơn đã tối ưu
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
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(20, 35, 20, 0.08);
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  overflow: hidden;
  transition: all 0.25s ease;
}

.as-modal-backdrop .ai-wizard-card {
  max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(20, 15, 10, 0.25);
}

.wizard-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font-size: 20px;
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

/* Header Progress */
.wizard-progress-header {
  padding: 16px 24px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.step-badge {
  font-weight: 700;
  color: var(--green);
  background: var(--green-soft);
  padding: 3px 8px;
  border-radius: 6px;
}

.step-name {
  font-weight: 600;
  color: var(--muted);
}

.wizard-progress-track {
  height: 6px;
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

/* Step Content Generic */
.step-content {
  padding: 24px 26px;
}

.step-header {
  margin-bottom: 18px;
}

.step-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--green-soft);
  color: var(--green-d);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.step-header h3 {
  font-size: clamp(19px, 2.5vw, 22px);
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 6px;
}

.step-desc {
  font-size: 13.5px;
  color: var(--muted);
  line-height: 1.5;
}

/* =================================================================== */
/* BƯỚC 1: QUY MÔ & PHONG CÁCH                                         */
/* =================================================================== */
.size-config-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 6px;
}

.config-lbl {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
}

.config-hint {
  font-size: 12px;
  color: var(--muted);
}

.stepper-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 8px;
}

.btn-stepper {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1.5px solid var(--line);
  background: var(--card);
  color: var(--ink);
  font-size: 22px;
  font-weight: 700;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-stepper:hover:not(:disabled) {
  background: var(--line-2);
  border-color: var(--green);
  color: var(--green-d);
}

.btn-stepper:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.stepper-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 110px;
  justify-content: center;
}

.stepper-number {
  font-size: 32px;
  font-weight: 900;
  color: var(--green-d);
  line-height: 1;
}

.stepper-unit {
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
}

/* Dynamic Segment Banner */
.segment-banner {
  border-radius: 12px;
  padding: 10px 14px;
  margin-top: 8px;
  transition: all 0.2s ease;
}

.segment-banner.solo {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
}

.segment-banner.family {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
}

.segment-tag {
  font-size: 12.5px;
  font-weight: 800;
  margin-bottom: 4px;
}

.segment-banner.solo .segment-tag {
  color: #1D4ED8;
}

.segment-banner.family .segment-tag {
  color: #15803D;
}

.segment-desc {
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink);
  margin: 0;
}

.config-subnote {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  margin-top: 4px;
}

/* Choice card */
.options-fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.options-fieldset.mini-grid {
  gap: 8px;
}

.choice-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.choice-card:hover {
  border-color: var(--line-2);
}

.choice-card.active {
  border-color: var(--green);
  background: #F4FAF6;
  box-shadow: 0 4px 14px rgba(20, 108, 67, 0.08);
}

.choice-icon {
  font-size: 24px;
  flex-shrink: 0;
  line-height: 1;
}

.choice-body {
  flex: 1;
  min-width: 0;
}

.choice-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.choice-title b {
  font-size: 13.5px;
  color: var(--ink);
}

.tag-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
}

.tag-badge.green {
  background: var(--green-soft);
  color: var(--green-d);
}

.tag-badge.orange {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

.choice-sub {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
  margin: 0;
}

.choice-radio-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--line);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.choice-card.active .choice-radio-indicator {
  border-color: var(--green);
}

.radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.15s ease;
}

.choice-card.active .radio-dot {
  background: var(--green);
}

/* =================================================================== */
/* BƯỚC 2: MỤC TIÊU SỨC KHỎE & KIÊNG CỮ                                 */
/* =================================================================== */
.multiselect-grid {
  display: grid;
  gap: 10px;
}

.multiselect-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  font-family: inherit;
  color: inherit;
}

.multiselect-card:hover {
  border-color: var(--line-2);
}

.multiselect-card.active {
  border-color: var(--green);
  background: #F4FAF6;
}

.multi-check {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1.5px solid var(--line);
  background: var(--card);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  margin-top: 2px;
}

.multiselect-card.active .multi-check {
  background: var(--green);
  border-color: var(--green);
}

.multi-icon {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
}

.multi-body {
  flex: 1;
  min-width: 0;
}

.multi-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 2px;
}

.multi-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
  margin: 0;
}

/* Exclusions chips */
.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.exclusion-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  background: var(--card);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.exclusion-chip:hover {
  border-color: var(--line-2);
}

.exclusion-chip.active {
  border-color: var(--orange);
  background: var(--orange-soft);
  color: var(--orange-ink);
  font-weight: 700;
}

.exclusion-chip.chip-none.active {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green-d);
}

.chip-mark {
  font-size: 11px;
}

/* =================================================================== */
/* BƯỚC 3: CỔNG MỞ KHÓA THỰC ĐƠN & QUÀ TẶNG                             */
/* =================================================================== */
.gate-greeting-box {
  background: linear-gradient(135deg, #F0FDF4 0%, #E8F5E9 100%);
  border: 1.5px solid #BBF7D0;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 18px;
  text-align: center;
}

.gate-sparkle-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #DCFCE7;
  color: #15803D;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 3px 9px;
  border-radius: 999px;
  margin-bottom: 6px;
}

.gate-ready-title {
  font-size: clamp(17px, 2.2vw, 20px);
  font-weight: 800;
  color: #14532D;
  line-height: 1.35;
  margin-bottom: 6px;
}

.gate-ready-subtitle {
  font-size: 13px;
  color: #166534;
  line-height: 1.45;
  margin: 0;
}

/* Staggered card */
.staggered-card {
  background: var(--bg);
  border: 1.5px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
}

.staggered-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 10px;
}

.staggered-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.stagger-col {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stagger-col.highlight {
  border-color: var(--orange);
  background: var(--orange-soft);
}

.week-lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.stagger-col.highlight .week-lbl {
  color: var(--orange-ink);
  font-weight: 700;
}

.disc-val {
  font-size: 15px;
  font-weight: 800;
  color: var(--green);
  font-variant-numeric: tabular-nums;
}

.stagger-col.highlight .disc-val {
  color: var(--orange);
}

.stagger-note {
  font-size: 10px;
  color: var(--muted);
}

.viral-bonus-tag {
  background: #EFFBF3;
  border: 1px dashed var(--green);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--green-d);
  text-align: center;
}

/* Form input */
.touchpoint-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 16px;
  pointer-events: none;
}

.contact-input {
  width: 100%;
  padding: 13px 14px 13px 42px;
  font-size: 15px;
  font-family: inherit;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  color: var(--ink);
  transition: all 0.15s ease;
}

.contact-input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(20, 108, 67, 0.12);
}

.contact-input.has-error {
  border-color: var(--red);
  background: #FFF5F5;
}

.field-error-msg {
  font-size: 12px;
  color: var(--red);
  font-weight: 600;
}

.field-helper {
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.4;
}

.btn-touchpoint-cta {
  border: 0;
  background: linear-gradient(135deg, var(--green) 0%, #0F5233 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  padding: 15px 20px;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(20, 108, 67, 0.28);
  transition: all 0.2s ease;
  line-height: 1.3;
}

.btn-touchpoint-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(20, 108, 67, 0.35);
}

.gate-sub-links {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.btn-nav-back-link {
  border: 0;
  background: none;
  font-size: 12.5px;
  color: var(--muted);
  cursor: pointer;
  text-decoration: underline;
  padding: 4px 6px;
  transition: color 0.15s ease;
}

.btn-nav-back-link:hover {
  color: var(--ink);
}

/* =================================================================== */
/* BƯỚC 4: AI LOADING & COMPLETE CELEBRATION                           */
/* =================================================================== */
.step-complete {
  padding: 36px 30px;
}

.ai-loading-box {
  text-align: center;
  padding: 20px 10px;
}

.ai-spinner-halo {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  margin: 0 auto 18px;
  position: relative;
  display: grid;
  place-items: center;
  background: conic-gradient(from 0deg, transparent 0%, var(--green) 70%, var(--orange) 100%);
  animation: spinHalo 1.2s linear infinite;
}

.spinner-core {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--card);
  display: grid;
  place-items: center;
  font-size: 28px;
}

@keyframes spinHalo {
  to {
    transform: rotate(360deg);
  }
}

.loading-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 6px;
}

.loading-subtitle {
  font-size: 13.5px;
  color: var(--green-d);
  font-weight: 600;
  margin-bottom: 20px;
}

.ai-loading-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
  margin: 0 auto;
  text-align: left;
}

.loading-step-item {
  font-size: 12.5px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s ease;
}

.loading-step-item.done {
  color: var(--ink);
  font-weight: 600;
}

.item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--line);
  flex-shrink: 0;
}

.loading-step-item.done .item-dot {
  background: var(--green);
}

/* Success box */
.ai-success-box {
  text-align: center;
}

.success-celebration-badge {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #EFFBF3;
  border: 2px solid #C4DEC9;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  font-size: 28px;
}

.success-title {
  font-size: clamp(20px, 2.8vw, 24px);
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 6px;
}

.success-subtitle {
  font-size: 14px;
  color: var(--muted);
  max-width: 52ch;
  margin: 0 auto 20px;
  line-height: 1.5;
}

.reward-highlight-card {
  background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
  border: 1.5px solid #86EFAC;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
  text-align: left;
}

.reward-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.reward-icon-sparkle {
  font-size: 28px;
}

.reward-badge-pill {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #166534;
}

.reward-amount {
  font-size: 22px;
  font-weight: 900;
  color: #15803D;
  line-height: 1.2;
}

.reward-desc {
  font-size: 12.5px;
  color: #14532D;
  line-height: 1.45;
  margin: 0;
}

.profile-summary-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 18px;
  margin-bottom: 22px;
  text-align: left;
}

.sum-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.sum-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
}

.sum-item {
  font-size: 12.5px;
  display: flex;
  flex-direction: column;
}

.sum-k {
  color: var(--muted);
  font-size: 11px;
}

.sum-v {
  color: var(--ink);
  font-weight: 600;
}

.btn-view-menu-cta {
  width: 100%;
  border: 0;
  background: var(--green);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  padding: 15px 24px;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(20, 108, 67, 0.25);
  transition: all 0.2s ease;
}

.btn-view-menu-cta:hover {
  background: var(--green-d);
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(20, 108, 67, 0.35);
}

/* Navigation footer */
.wizard-footer-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
  flex-wrap: wrap;
}

.btn-nav {
  border: 0;
  font-size: 13.5px;
  font-weight: 700;
  padding: 10px 18px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-nav.back {
  background: var(--bg);
  border: 1px solid var(--line);
  color: var(--muted);
}

.btn-nav.back:hover {
  background: var(--line-2);
  color: var(--ink);
}

.btn-nav.next {
  background: var(--green);
  color: #fff;
  margin-left: auto;
  box-shadow: 0 4px 12px rgba(20, 108, 67, 0.15);
}

.btn-nav.next:hover {
  background: var(--green-d);
  transform: translateY(-1px);
}

.btn-skip-survey {
  border: 0;
  background: none;
  font-size: 12.5px;
  color: var(--muted);
  text-decoration: underline;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.15s ease;
}

.btn-skip-survey:hover {
  color: var(--ink);
}

@media (max-width: 600px) {
  .step-content {
    padding: 18px 16px;
  }
  .staggered-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .sum-grid {
    grid-template-columns: 1fr;
  }
  .gate-sub-links {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
