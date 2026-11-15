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

      <!-- Step Progress Bar (Hiển thị từ bước 1 đến bước 5) -->
      <div v-if="currentStep >= 1 && currentStep <= 5" class="wizard-progress-header">
        <div class="progress-info">
          <span class="step-badge">Bước {{ currentStep }} / 5</span>
          <span class="step-name">{{ stepTitles[currentStep] }}</span>
        </div>
        <div class="wizard-progress-track" role="progressbar" :aria-valuenow="currentStep * 20" aria-valuemin="0" aria-valuemax="100">
          <div class="wizard-progress-fill" :style="{ width: (currentStep * 20) + '%' }"></div>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- BƯỚC 0: MÀN HÌNH TOUCHPOINT (ĐIỂM CHẠM ĐẦU TIÊN)                     -->
      <!-- =================================================================== -->
      <section v-if="currentStep === 0" class="step-content step-touchpoint">
        <div class="touchpoint-header">
          <div class="retention-pill">
            <span class="pill-sparkle">✨</span>
            <span>ƯU ĐÃI THÀNH VIÊN MỚI • CAM KẾT 4 TUẦN BỮA ĂN GIA ĐÌNH</span>
          </div>
          <h2 class="touchpoint-title">
            Tặng Gift Card <span class="highlight-val">900.000đ</span>
          </h2>
          <p class="touchpoint-subtitle">
            Trải đều qua 4 tuần đầu tiên khi thiết lập Thực đơn AI riêng cho gia đình bạn
          </p>
        </div>

        <!-- Staggered Discount Breakdown Card (Chiến lược giữ chân 4 tuần HelloFresh-style) -->
        <div class="staggered-card">
          <div class="staggered-label">Phân bổ Gift Card 900k trải đều 4 tuần:</div>
          <div class="staggered-grid">
            <div class="stagger-col highlight">
              <span class="week-lbl">Tuần 1</span>
              <b class="disc-val num">-300k</b>
              <small class="stagger-note">Trải nghiệm</small>
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
            🎁 Tặng thêm ngay <b>+20.000đ Fresh Credit</b> khi hoàn thành 5 câu hỏi khảo sát AI (1 phút)
          </div>
        </div>

        <!-- Form nhập 1 thông tin duy nhất: SĐT hoặc Email -->
        <form class="touchpoint-form" @submit.prevent="handleTouchpointSubmit">
          <div class="field-group">
            <label for="lead-contact" class="field-label">
              Số điện thoại (Zalo) hoặc Email của bạn:
            </label>
            <div class="input-with-icon">
              <span class="input-icon" aria-hidden="true">📱</span>
              <input
                id="lead-contact"
                v-model.trim="form.contact"
                type="text"
                class="contact-input"
                :class="{ 'has-error': contactError }"
                placeholder="Nhập Số điện thoại (Zalo) hoặc Email..."
                autocomplete="tel email"
                required
              />
            </div>
            <span v-if="contactError" class="field-error-msg" role="alert">
              {{ contactError }}
            </span>
            <span v-else class="field-helper">
              Cam kết bảo mật 100%. MOVA chỉ dùng để lưu thực đơn AI riêng và nhắc lịch giao xe lạnh.
            </span>
          </div>

          <button type="submit" class="btn-touchpoint-cta">
            <span>Bắt đầu thiết kế thực đơn (1 phút)</span>
            <span class="arrow-icon" aria-hidden="true">→</span>
          </button>

          <div class="skip-wrap">
            <button type="button" class="btn-skip-survey" @click="handleSkip">
              Bỏ qua khảo sát & Xem thử thực đơn mẫu
            </button>
          </div>
        </form>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 1: KHU VỰC GIAO HÀNG                                           -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 1" class="step-content">
        <div class="step-header">
          <h3>Khu vực giao bữa ăn của gia đình bạn?</h3>
          <p class="step-desc">
            Xe lạnh chuyên dụng Đắk Lắk – TP.HCM bảo đảm nhiệt độ 0°C – 4°C tận cửa nhà bạn.
          </p>
        </div>

        <fieldset class="options-fieldset">
          <legend class="sr-only">Chọn khu vực nhận hàng</legend>

          <label
            class="choice-card"
            :class="{ active: form.region === 'hcm_inner' }"
          >
            <input
              type="radio"
              name="region"
              value="hcm_inner"
              v-model="form.region"
              class="sr-only"
            />
            <div class="choice-icon">🏙️</div>
            <div class="choice-body">
              <div class="choice-title">
                <b>TP.HCM (Nội thành)</b>
                <span class="tag-badge green">🟢 Giao xe lạnh 06:00 – 08:00</span>
              </div>
              <p class="choice-sub">
                Quận 1, 3, 4, 5, 7, 10, Bình Thạnh, Phú Nhuận, Tân Bình, Gò Vấp, Bình Tân...
              </p>
            </div>
            <div class="choice-radio-indicator">
              <span class="radio-dot"></span>
            </div>
          </label>

          <label
            class="choice-card"
            :class="{ active: form.region === 'hcm_suburb' }"
          >
            <input
              type="radio"
              name="region"
              value="hcm_suburb"
              v-model="form.region"
              class="sr-only"
            />
            <div class="choice-icon">🚛</div>
            <div class="choice-body">
              <div class="choice-title">
                <b>TP. Thủ Đức & Vùng lân cận Đông Nam Bộ</b>
                <span class="tag-badge blue">🔵 Tuyến trung chuyển ưu tiên</span>
              </div>
              <p class="choice-sub">
                TP. Thủ Đức, Dĩ An, Thuận An (Bình Dương), TP. Biên Hòa (Đồng Nai)...
              </p>
            </div>
            <div class="choice-radio-indicator">
              <span class="radio-dot"></span>
            </div>
          </label>
        </fieldset>

        <div class="wizard-footer-nav">
          <button type="button" class="btn-nav back" @click="prevStep">
            ← Quay lại
          </button>
          <button type="button" class="btn-nav next" @click="nextStep">
            Tiếp tục →
          </button>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 2: QUY MÔ BÀN ĂN (QUAN TRỌNG: 1-8 NGƯỜI, 3-7 BỮA/TUẦN)        -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 2" class="step-content">
        <div class="step-header">
          <h3>Quy mô bàn ăn & Tần suất nấu cơm nhà</h3>
          <p class="step-desc">
            AI sẽ tính toán định lượng chính xác theo gram để không thừa mứa đồ ăn lưu cữu.
          </p>
        </div>

        <div class="size-config-wrap">
          <!-- A. Số người ăn (Stepper 1 - 8) -->
          <div class="config-box">
            <div class="config-header">
              <label class="config-lbl" for="household-size-val">Số người ăn mỗi bữa:</label>
              <span class="config-hint">Tùy chỉnh linh hoạt từ 1 đến 8 người</span>
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

            <!-- Dynamic Segment Label (Tự động hiển thị theo yêu cầu đặc tả V2) -->
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
        </div>

        <div class="wizard-footer-nav">
          <button type="button" class="btn-nav back" @click="prevStep">
            ← Quay lại
          </button>
          <button type="button" class="btn-nav next" @click="nextStep">
            Tiếp tục →
          </button>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 3: PHONG CÁCH ẨM THỰC                                          -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 3" class="step-content">
        <div class="step-header">
          <h3>Khẩu vị gia đình bạn yêu thích phong cách nào?</h3>
          <p class="step-desc">
            Bếp trưởng MOVA phối xốt độc quyền định lượng chính xác theo phong cách bạn chọn.
          </p>
        </div>

        <fieldset class="options-fieldset">
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
                Mâm cơm quê nhà đậm đà, chuẩn vị ba miền: Thịt ba chỉ ram gừng, gà nướng sả, cá bống kho tộ, canh chua cá bớp, cải ngồng xào tỏi...
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
                <b>Cơm Việt kết hợp 1–2 bữa Đồ Tây (Steak / Áp chảo)</b>
                <span class="tag-badge orange">Đổi gió cuối tuần</span>
              </div>
              <p class="choice-sub">
                4-5 ngày ăn cơm nhà truyền thống + 1-2 bữa cuối tuần thưởng thức Steak thăn bò Đắk Lắk xốt tiêu đen hoặc Áp chảo thảo mộc phong cách Bistro.
              </p>
            </div>
            <div class="choice-radio-indicator">
              <span class="radio-dot"></span>
            </div>
          </label>
        </fieldset>

        <div class="wizard-footer-nav">
          <button type="button" class="btn-nav back" @click="prevStep">
            ← Quay lại
          </button>
          <button type="button" class="btn-nav next" @click="nextStep">
            Tiếp tục →
          </button>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 4: MỤC TIÊU SỨC KHỎE & THỂ TRẠNG                               -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 4" class="step-content">
        <div class="step-header">
          <h3>Mục tiêu sức khỏe & Thể trạng ưu tiên</h3>
          <p class="step-desc">
            Chọn 1 hoặc nhiều mục tiêu để AI tối ưu tỷ lệ Calo, Đạm và Xơ:
          </p>
        </div>

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

        <div class="wizard-footer-nav">
          <button type="button" class="btn-nav back" @click="prevStep">
            ← Quay lại
          </button>
          <button type="button" class="btn-nav next" @click="nextStep">
            Tiếp tục →
          </button>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 5: NGUYÊN LIỆU LOẠI TRỪ / DỊ ỨNG                              -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 5" class="step-content">
        <div class="step-header">
          <h3>Nguyên liệu gia đình cần loại trừ hoặc kiêng cữ</h3>
          <p class="step-desc">
            Bếp trung tâm Đắk Lắk sẽ tự động loại bỏ các món chứa nguyên liệu này khỏi thực đơn của bạn:
          </p>
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

        <div class="exclusion-summary-note">
          <span class="note-icon">🛡️</span>
          <span>
            Khẩu vị an toàn: Bếp sơ chế Đắk Lắk đóng gói hút chân không riêng biệt từng loại thực phẩm, đảm bảo không nhiễm chéo.
          </span>
        </div>

        <div class="wizard-footer-nav">
          <button type="button" class="btn-nav back" @click="prevStep">
            ← Quay lại
          </button>
          <button type="button" class="btn-nav finish" @click="handleFinishWizard">
            Tạo thực đơn AI ngay ✨
          </button>
        </div>
      </section>

      <!-- =================================================================== -->
      <!-- BƯỚC 6: HIỆU ỨNG TỔNG HỢP AI & THƯỞNG VIRAL FRESH CREDIT              -->
      <!-- =================================================================== -->
      <section v-else-if="currentStep === 6" class="step-content step-complete">
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
              <span class="item-dot"></span> Kết xuất BOM nguyên liệu sơ chế sạch Đắk Lắk
            </div>
            <div class="loading-step-item" :class="{ done: loadingStep >= 3 }">
              <span class="item-dot"></span> Thiết lập mâm cơm 5 thành phần & gói xốt chuẩn vị
            </div>
          </div>
        </div>

        <!-- 2. Trạng thái Hoàn tất & Nhận Thưởng Viral Credit -->
        <div v-else class="ai-success-box">
          <div class="success-celebration-badge">
            <span class="celebrate-emoji">🎉</span>
          </div>

          <h3 class="success-title">
            Thực đơn AI Dành Riêng Cho Gia Đình Bạn Đã Sẵn Sàng!
          </h3>
          <p class="success-subtitle">
            Hệ thống đã tự động cá nhân hóa thực đơn mâm cơm tuần này dựa trên 100% hồ sơ của bạn.
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
              MOVA đã cộng trực tiếp <b>+20.000đ</b> vào tài khoản điểm bữa ăn của bạn. Điểm này sẽ tự động giảm trừ vào tuần ăn đầu tiên!
            </p>
          </div>

          <!-- Tóm tắt hồ sơ vừa tạo -->
          <div class="profile-summary-card">
            <div class="sum-title">Tóm tắt hồ sơ dinh dưỡng AI:</div>
            <div class="sum-grid">
              <div class="sum-item">
                <span class="sum-k">Khu vực:</span>
                <b class="sum-v">{{ form.region === 'hcm_inner' ? 'TP.HCM (Nội thành)' : 'TP. Thủ Đức & Đông Nam Bộ' }}</b>
              </div>
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

// Step state: 0 (Touchpoint) -> 1 (Region) -> 2 (Size) -> 3 (Cuisine) -> 4 (Health) -> 5 (Exclusions) -> 6 (Complete/AI loader)
const currentStep = ref(0);
const contactError = ref('');
const isAnalyzing = ref(false);
const loadingStep = ref(1);
const dynamicLoadingMessage = ref('AI đang đọc các chỉ số thể trạng...');

const stepTitles = {
  1: 'Khu vực nhận hàng',
  2: 'Quy mô bàn ăn',
  3: 'Phong cách ẩm thực',
  4: 'Mục tiêu sức khỏe',
  5: 'Dị ứng & Kiêng cữ'
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
    title: 'Giảm mỡ / Kiểm soát cân nặng',
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
    // If opening explicitly in modal to edit existing profile, jump to step 1
    if (props.asModal && store.onboardingProfile.isCompleted) {
      currentStep.value = 1;
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

// Handlers
const handleTouchpointSubmit = () => {
  contactError.value = '';
  const val = form.contact.trim();
  if (!val) {
    contactError.value = 'Vui lòng nhập Số điện thoại hoặc Email để tiếp tục.';
    return;
  }
  // Simple check for phone or email format
  const isEmail = val.includes('@') && val.includes('.');
  const isPhone = /^[0-9+\s().-]{8,15}$/.test(val);
  if (!isEmail && !isPhone) {
    contactError.value = 'Vui lòng nhập Số điện thoại (9–11 chữ số) hoặc Email hợp lệ.';
    return;
  }
  currentStep.value = 1;
};

const handleSkip = () => {
  store.skipOnboarding();
  emit('close');
};

const handleClose = () => {
  if (currentStep.value === 6) {
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

const nextStep = () => {
  if (currentStep.value < 5) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
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

const handleFinishWizard = () => {
  currentStep.value = 6;
  isAnalyzing.value = true;
  loadingStep.value = 1;
  dynamicLoadingMessage.value = `AI Nutritionist đang tính toán tỷ lệ Calo & Đạm cho ${form.householdSize} người ăn...`;

  // Ngay tại khoảnh khắc hoàn tất Bước 5: Lập tức đặt onboardingProfile.isCompleted = true, isLoggedIn = true, nhận +20k Fresh Credit
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
  }, 1500);
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
  padding: 18px 24px 12px;
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
  padding: 26px 28px;
}

.step-header {
  margin-bottom: 20px;
}

.step-header h3 {
  font-size: clamp(19px, 2.5vw, 22px);
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 6px;
}

.step-desc {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.5;
}

/* =================================================================== */
/* BƯỚC 0: TOUCHPOINT                                                  */
/* =================================================================== */
.step-touchpoint {
  padding: 32px 30px;
}

.touchpoint-header {
  text-align: center;
  margin-bottom: 20px;
}

.retention-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--orange-soft);
  color: var(--orange-ink);
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}

.touchpoint-title {
  font-size: clamp(22px, 3.2vw, 28px);
  font-weight: 800;
  line-height: 1.25;
  color: var(--ink);
  margin-bottom: 8px;
}

.highlight-val {
  color: var(--orange);
  font-variant-numeric: tabular-nums;
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-color: rgba(217, 83, 30, 0.35);
}

.touchpoint-subtitle {
  font-size: 14.5px;
  color: var(--muted);
  max-width: 50ch;
  margin: 0 auto;
  line-height: 1.5;
}

/* Staggered card */
.staggered-card {
  background: var(--bg);
  border: 1.5px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 22px;
}

.staggered-label {
  font-size: 12px;
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
  border-color: var(--orange);
  box-shadow: 0 0 0 3px rgba(217, 83, 30, 0.15);
}

.contact-input.has-error {
  border-color: var(--red);
}

.field-error-msg {
  font-size: 12.5px;
  color: var(--red);
  font-weight: 600;
}

.field-helper {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}

.btn-touchpoint-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--orange);
  color: #fff;
  border: 0;
  border-radius: 14px;
  padding: 14px 20px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(217, 83, 30, 0.3);
  transition: all 0.15s ease;
}

.btn-touchpoint-cta:hover {
  background: #bf4314;
  transform: translateY(-1px);
}

.arrow-icon {
  font-size: 18px;
  transition: transform 0.15s ease;
}

.btn-touchpoint-cta:hover .arrow-icon {
  transform: translateX(3px);
}

.skip-wrap {
  text-align: center;
  margin-top: 4px;
}

.btn-skip-survey {
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.15s ease;
}

.btn-skip-survey:hover {
  color: var(--ink);
}

/* =================================================================== */
/* BƯỚC 1 & 3: CARDS & OPTIONS                                         */
/* =================================================================== */
.options-fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}

.choice-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.choice-card:hover {
  border-color: var(--green);
  background: var(--bg);
}

.choice-card.active {
  border-color: var(--green);
  background: var(--green-soft);
  box-shadow: 0 2px 8px rgba(20, 108, 67, 0.12);
}

.choice-icon {
  font-size: 26px;
  flex-shrink: 0;
  margin-top: 2px;
}

.choice-body {
  flex: 1;
}

.choice-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 15px;
  color: var(--ink);
  margin-bottom: 4px;
}

.tag-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
}

.tag-badge.green {
  background: #D7EEDB;
  color: var(--green-d);
}

.tag-badge.blue {
  background: var(--blue-soft);
  color: var(--blue);
}

.tag-badge.orange {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

.choice-sub {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
  margin: 0;
}

.choice-radio-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--line);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 4px;
  transition: all 0.15s ease;
}

.choice-card.active .choice-radio-indicator {
  border-color: var(--green);
}

.radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.15s ease;
}

.choice-card.active .radio-dot {
  background: var(--green);
}

/* =================================================================== */
/* BƯỚC 2: STEPPER & SEGMENTS                                          */
/* =================================================================== */
.size-config-wrap {
  display: grid;
  gap: 16px;
}

.config-box {
  background: var(--bg);
  border: 1.5px solid var(--line);
  border-radius: 16px;
  padding: 16px 18px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.config-lbl {
  font-size: 14.5px;
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
  margin: 6px 0 14px;
}

.btn-stepper {
  width: 44px;
  height: 44px;
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
  user-select: none;
}

.btn-stepper:hover:not(:disabled) {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green);
}

.btn-stepper:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.stepper-display {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 120px;
  justify-content: center;
}

.stepper-number {
  font-size: 32px;
  font-weight: 800;
  color: var(--green);
  font-variant-numeric: tabular-nums;
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
  padding: 12px 14px;
  transition: all 0.2s ease;
}

.segment-banner.solo {
  background: #FCF4EB;
  border: 1px solid #F5D3BC;
}

.segment-banner.family {
  background: var(--green-soft);
  border: 1px solid #C4E2CF;
}

.segment-tag {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
}

.segment-banner.solo .segment-tag {
  color: var(--orange-ink);
}

.segment-banner.family .segment-tag {
  color: var(--green-d);
}

.segment-desc {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink);
  margin: 0;
}

.config-subnote {
  font-size: 12.5px;
  color: var(--muted);
  text-align: center;
  margin-top: 6px;
}

/* =================================================================== */
/* BƯỚC 4: MULTISELECT GOALS                                           */
/* =================================================================== */
.multiselect-grid {
  display: grid;
  gap: 10px;
}

.multiselect-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  width: 100%;
}

.multiselect-card:hover {
  border-color: var(--green);
  background: var(--bg);
}

.multiselect-card.active {
  border-color: var(--green);
  background: var(--green-soft);
}

.multi-check {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1.5px solid var(--line);
  background: var(--card);
  color: var(--green);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 13px;
  flex-shrink: 0;
  margin-top: 2px;
}

.multiselect-card.active .multi-check {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}

.multi-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

.multi-body {
  flex: 1;
}

.multi-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 2px;
}

.multi-desc {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.4;
  margin: 0;
}

/* =================================================================== */
/* BƯỚC 5: EXCLUSION CHIPS                                             */
/* =================================================================== */
.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.exclusion-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1.5px solid var(--line);
  background: var(--card);
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s ease;
}

.exclusion-chip:hover {
  border-color: var(--orange);
  background: var(--orange-soft);
}

.exclusion-chip.active {
  background: var(--orange);
  border-color: var(--orange);
  color: #fff;
}

.exclusion-chip.chip-none.active {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.chip-mark {
  font-weight: 800;
}

.exclusion-summary-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.45;
}

/* =================================================================== */
/* BƯỚC 6: AI LOADING & COMPLETE SCREEN                                */
/* =================================================================== */
.step-complete {
  text-align: center;
  padding: 36px 28px;
}

.ai-loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.ai-spinner-halo {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--green-soft), var(--orange-soft));
  display: grid;
  place-items: center;
  position: relative;
  animation: pulseHalo 1.8s ease-in-out infinite alternate;
}

@keyframes pulseHalo {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(20, 108, 67, 0.2); }
  100% { transform: scale(1.08); box-shadow: 0 0 0 16px rgba(20, 108, 67, 0); }
}

.spinner-core {
  font-size: 36px;
  animation: spinBrain 3s linear infinite;
}

@keyframes spinBrain {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(10deg); }
  75% { transform: rotate(-10deg); }
  100% { transform: rotate(0deg); }
}

.loading-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--ink);
}

.loading-subtitle {
  font-size: 14px;
  color: var(--orange-ink);
  font-weight: 600;
}

.ai-loading-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  max-width: 400px;
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 13px;
  color: var(--muted);
}

.loading-step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.loading-step-item.done {
  opacity: 1;
  color: var(--green);
  font-weight: 600;
}

.item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

/* Success View */
.ai-success-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.success-celebration-badge {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--green-soft);
  display: grid;
  place-items: center;
  margin-bottom: -4px;
}

.celebrate-emoji {
  font-size: 34px;
}

.success-title {
  font-size: clamp(20px, 3vw, 24px);
  font-weight: 800;
  color: var(--ink);
  max-width: 24ch;
  line-height: 1.3;
}

.success-subtitle {
  font-size: 14px;
  color: var(--muted);
  max-width: 50ch;
  line-height: 1.5;
  margin: 0;
}

/* Reward highlight card */
.reward-highlight-card {
  width: 100%;
  background: linear-gradient(135deg, #FCEDE4 0%, #FAF0E4 100%);
  border: 1.5px solid var(--orange);
  border-radius: 16px;
  padding: 16px 20px;
  text-align: left;
}

.reward-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.reward-icon-sparkle {
  font-size: 32px;
}

.reward-badge-pill {
  font-size: 11px;
  font-weight: 700;
  color: var(--orange-ink);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.reward-amount {
  font-size: 22px;
  font-weight: 800;
  color: var(--orange);
  font-variant-numeric: tabular-nums;
}

.reward-desc {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.45;
  margin: 0;
}

/* Profile summary card */
.profile-summary-card {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  text-align: left;
}

.sum-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 8px;
}

.sum-grid {
  display: grid;
  gap: 6px;
}

.sum-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
}

.sum-k {
  color: var(--muted);
  width: 76px;
  flex-shrink: 0;
}

.sum-v {
  color: var(--ink);
}

.btn-view-menu-cta {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--green);
  color: #fff;
  border: 0;
  border-radius: 14px;
  padding: 15px 20px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(20, 108, 67, 0.3);
  transition: all 0.15s ease;
  margin-top: 4px;
}

.btn-view-menu-cta:hover {
  background: var(--green-d);
  transform: translateY(-1px);
}

/* =================================================================== */
/* NAVIGATION BUTTONS                                                  */
/* =================================================================== */
.wizard-footer-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.btn-nav {
  border-radius: 12px;
  padding: 11px 20px;
  font-size: 14.5px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-nav.back {
  background: var(--bg);
  border: 1px solid var(--line);
  color: var(--ink);
}

.btn-nav.back:hover {
  background: var(--line-2);
}

.btn-nav.next {
  background: var(--green);
  border: 0;
  color: #fff;
  margin-left: auto;
}

.btn-nav.next:hover {
  background: var(--green-d);
}

.btn-nav.finish {
  background: var(--orange);
  border: 0;
  color: #fff;
  margin-left: auto;
  box-shadow: 0 2px 10px rgba(217, 83, 30, 0.25);
}

.btn-nav.finish:hover {
  background: #be4414;
}

/* Screen reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Mobile responsive down to 390px */
@media (max-width: 640px) {
  .step-content {
    padding: 20px 18px;
  }
  .step-touchpoint {
    padding: 22px 16px;
  }
  .staggered-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .choice-card {
    padding: 14px;
    gap: 10px;
  }
  .choice-icon {
    font-size: 22px;
  }
  .choice-title {
    font-size: 14px;
  }
  .stepper-row {
    gap: 12px;
  }
  .btn-stepper {
    width: 38px;
    height: 38px;
  }
  .stepper-number {
    font-size: 26px;
  }
  .sum-item {
    flex-direction: column;
    gap: 2px;
  }
  .sum-k {
    width: auto;
    font-size: 12px;
  }
}
</style>
