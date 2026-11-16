<template>
  <div class="viral-card-wrapper" :class="{ 'in-modal': asModal }">
    <div class="viral-card">
      <!-- Modal Close Button if used in Modal -->
      <button
        v-if="asModal"
        class="viral-close-btn"
        @click="$emit('close')"
        aria-label="Đóng bảng giới thiệu"
      >
        ×
      </button>

      <!-- Header & Intro -->
      <div class="viral-header">
        <div class="viral-pill">
          <span class="sparkle">✨</span>
          <span>CHƯƠNG TRÌNH ĐỐI TÁC GIA ĐÌNH • VIRAL REFERRAL ENGINE</span>
        </div>
        <h3 class="viral-title">
          Lan tỏa Mâm cơm tươi, nhận đến <span class="num text-highlight">+140.000đ</span> Fresh Credit
        </h3>
        <p class="viral-desc">
          Mỗi chia sẻ là một gia đình bạn bè bớt 2 tiếng đi chợ - nấu nướng mỗi ngày và cùng thưởng thức thịt tươi sạch sơ chế chuẩn 16 giờ từ Đắk Lắk.
        </p>
      </div>

      <!-- Referral Code & Share Link Box -->
      <div class="referral-box">
        <div class="ref-left">
          <span class="ref-label">MÃ GIỚI THIỆU CÁ NHÂN CỦA BẠN:</span>
          <div class="ref-code-display num">{{ referralCode }}</div>
          <span class="ref-link-hint">Link mời: {{ shareUrl }}</span>
        </div>
        <div class="ref-right">
          <button
            type="button"
            class="btn-copy-ref"
            :class="{ copied: isCopied }"
            @click="handleCopyLink"
          >
            <span>{{ isCopied ? 'Đã sao chép! ✓' : 'Sao chép link mời' }}</span>
          </button>
        </div>
      </div>

      <!-- 3 Viral Tasks -->
      <div class="tasks-container">
        <div class="tasks-heading">
          <b>3 Nhiệm vụ nhận Fresh Credit trực tiếp vào tài khoản:</b>
        </div>

        <div class="tasks-grid">
          <!-- Nhiệm vụ 1: Hoàn thành Profile AI -->
          <div class="task-card" :class="{ completed: store.onboardingProfile?.isCompleted }">
            <div class="task-icon">📋</div>
            <div class="task-body">
              <div class="task-title-row">
                <b>1. Hoàn thành 100% Hồ sơ dinh dưỡng AI</b>
                <span class="task-reward num">+20.000đ</span>
              </div>
              <p class="task-sub">
                Thiết lập số người ăn, khẩu vị và kiêng cữ để AI tính định lượng chuẩn xác và kích hoạt Gift Card 900k.
              </p>
            </div>
            <div class="task-action">
              <span v-if="store.onboardingProfile?.isCompleted" class="badge-done">
                Đã nhận ✓
              </span>
              <button
                v-else
                type="button"
                class="btn-task-act primary"
                @click="handleStartOnboarding"
              >
                Làm ngay (+20k)
              </button>
            </div>
          </div>

          <!-- Nhiệm vụ 2: Chia sẻ thực đơn tuần -->
          <div class="task-card" :class="{ completed: store.viralShareClaimed }">
            <div class="task-icon">📲</div>
            <div class="task-body">
              <div class="task-title-row">
                <b>2. Chia sẻ Thực đơn tuần lên Facebook / Zalo</b>
                <span class="task-reward num">+20.000đ</span>
              </div>
              <p class="task-sub">
                Gợi ý mâm cơm 5 thành phần ngon miệng chuẩn vị quê nhà cho bạn bè và đồng nghiệp.
              </p>
            </div>
            <div class="task-action">
              <span v-if="store.viralShareClaimed" class="badge-done">
                Đã chia sẻ ✓
              </span>
              <button
                v-else
                type="button"
                class="btn-task-act orange"
                @click="handleShareMenu"
              >
                Chia sẻ ngay (+20k)
              </button>
            </div>
          </div>

          <!-- Nhiệm vụ 3: Giới thiệu gia đình tham gia gói 4 tuần -->
          <div class="task-card special-card">
            <div class="task-icon">👨‍👩‍👧‍👦</div>
            <div class="task-body">
              <div class="task-title-row">
                <b>3. Giới thiệu 1 gia đình tham gia gói 4 tuần</b>
                <span class="task-reward num highlight">+100.000đ</span>
              </div>
              <p class="task-sub">
                Tặng cả hai: Bạn nhận <b>+100.000đ</b>, bạn bè cũng nhận <b>+100.000đ Fresh Credit</b> ngay khi kích hoạt Subscription 4 tuần đầu tiên.
              </p>
              <div class="referred-stat">
                🎉 Đã giới thiệu thành công: <b>{{ store.viralFriendsReferred || 0 }} gia đình</b>
                <span v-if="(store.viralFriendsReferred || 0) > 0" class="referred-credit num">
                  (Đã nhận +{{ fmt((store.viralFriendsReferred || 0) * 100000) }})
                </span>
              </div>
            </div>
            <div class="task-action">
              <button
                type="button"
                class="btn-task-act simulate-btn"
                @click="handleSimulateReferral"
                title="Bấm để mô phỏng bạn bè dùng mã của bạn đăng ký thành công"
              >
                Giả lập bạn bè đăng ký (+100k)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Chân trang tuân thủ pháp lý -->
      <div class="viral-footer-note">
        <span>⚖️ <b>Quy chế điểm Fresh Credit:</b> Điểm bữa ăn được bảo lưu 100% không thời hạn, tự động giảm trừ vào các kỳ giao nguyên liệu định kỳ theo Nghị định 52/2024/NĐ-CP.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../utils/formatters';

const props = defineProps({
  asModal: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const store = useMovaStore();

const isCopied = ref(false);

const referralCode = computed(() => {
  return store.user?.referralCode || 'MOVA-2026';
});

const shareUrl = computed(() => {
  return `https://movafresh.vn/?ref=${referralCode.value}`;
});

const handleCopyLink = async () => {
  const text = shareUrl.value;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch (e) {
    console.warn('Clipboard write failed:', e);
  }
  isCopied.value = true;
  store.toast(`🎉 Đã sao chép link mời bạn bè: ${text}`);
  setTimeout(() => {
    isCopied.value = false;
  }, 2500);
};

const handleStartOnboarding = () => {
  if (props.asModal) {
    emit('close');
  }
  store.openOnboarding();
};

const handleShareMenu = async () => {
  const shareMessage = `🍽️ Thực đơn Mâm cơm Việt tuần này của gia đình mình từ MOVA Fresh: Thịt tươi Đắk Lắk sơ chế sạch 100%, nấu 15 phút - 1 chảo. Nhập mã ${referralCode.value} để nhận ngay Gift Card 900.000đ & +20k Credit tại: ${shareUrl.value}`;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareMessage);
    }
  } catch (e) {
    console.warn('Clipboard write failed:', e);
  }
  store.claimViralShare();
};

const handleSimulateReferral = () => {
  store.simulateFriendReferral();
};
</script>

<style scoped>
.viral-card-wrapper {
  width: 100%;
}

.viral-card-wrapper.in-modal {
  padding: 0;
}

.viral-card {
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 20px;
  padding: 24px 28px;
  position: relative;
  box-shadow: 0 8px 30px rgba(20, 35, 20, 0.06);
}

.in-modal .viral-card {
  border: none;
  box-shadow: none;
  padding: 28px 32px;
}

.viral-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--card);
  font-size: 22px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
  z-index: 5;
}

.viral-close-btn:hover {
  background: var(--bg);
  color: var(--ink);
  border-color: var(--line-2);
}

.viral-header {
  margin-bottom: 20px;
}

.viral-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--green-soft);
  color: var(--green-d);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.viral-title {
  font-size: clamp(19px, 2.2vw, 24px);
  font-weight: 800;
  line-height: 1.3;
  color: var(--ink);
  margin-bottom: 6px;
}

.text-highlight {
  color: var(--green);
}

.viral-desc {
  font-size: 13.5px;
  color: var(--muted);
  line-height: 1.5;
  max-width: 72ch;
}

/* Referral code box */
.referral-box {
  background: linear-gradient(135deg, #F3F8F4 0%, #EBF4EE 100%);
  border: 1.5px solid #C4DEC9;
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.ref-left {
  display: grid;
  gap: 2px;
}

.ref-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--green-d);
}

.ref-code-display {
  font-size: 24px;
  font-weight: 900;
  color: var(--green);
  letter-spacing: 1.5px;
}

.ref-link-hint {
  font-size: 12px;
  color: var(--muted);
  font-family: monospace;
}

.btn-copy-ref {
  border: 0;
  background: var(--green);
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(20, 108, 67, 0.2);
}

.btn-copy-ref:hover {
  background: var(--green-d);
  transform: translateY(-1px);
}

.btn-copy-ref.copied {
  background: #237A4B;
}

/* Tasks */
.tasks-container {
  margin-bottom: 18px;
}

.tasks-heading {
  font-size: 14.5px;
  margin-bottom: 12px;
  color: var(--ink);
}

.tasks-grid {
  display: grid;
  gap: 12px;
}

.task-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 18px;
  transition: all 0.2s ease;
}

.task-card:hover {
  border-color: var(--line-2);
}

.task-card.completed {
  background: #F8FAF8;
  border-color: #D2E4D6;
}

.task-card.special-card {
  background: #FFF9F3;
  border-color: #F7D7BC;
}

.task-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  background: var(--card);
  border-radius: 12px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
}

.task-body {
  flex: 1;
  min-width: 0;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 3px;
  flex-wrap: wrap;
}

.task-title-row b {
  font-size: 14px;
  color: var(--ink);
}

.task-reward {
  font-size: 12.5px;
  font-weight: 800;
  color: var(--green);
  background: var(--green-soft);
  padding: 2px 8px;
  border-radius: 999px;
}

.task-reward.highlight {
  color: var(--orange-ink);
  background: var(--orange-soft);
}

.task-sub {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.4;
  margin: 0;
}

.referred-stat {
  font-size: 12px;
  color: var(--orange-ink);
  margin-top: 5px;
}

.referred-credit {
  font-weight: 700;
  color: var(--green);
  margin-left: 4px;
}

.task-action {
  flex-shrink: 0;
}

.badge-done {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--green-d);
  background: var(--green-soft);
  border: 1px solid #C4DEC9;
  padding: 6px 12px;
  border-radius: 10px;
}

.btn-task-act {
  border: 0;
  font-size: 12.5px;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-task-act.primary {
  background: var(--green);
  color: #fff;
}

.btn-task-act.primary:hover {
  background: var(--green-d);
}

.btn-task-act.orange {
  background: var(--orange);
  color: #fff;
}

.btn-task-act.orange:hover {
  background: #bf4314;
}

.btn-task-act.simulate-btn {
  background: var(--card);
  border: 1.5px dashed var(--orange);
  color: var(--orange-ink);
  font-weight: 700;
}

.btn-task-act.simulate-btn:hover {
  background: var(--orange-soft);
  border-color: var(--orange);
}

.viral-footer-note {
  border-top: 1px solid var(--line);
  padding-top: 12px;
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.45;
}

@media (max-width: 680px) {
  .viral-card {
    padding: 18px 16px;
  }
  .task-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .task-action {
    width: 100%;
    margin-top: 6px;
  }
  .task-action button,
  .task-action .badge-done {
    width: 100%;
    justify-content: center;
    text-align: center;
  }
  .referral-box {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-copy-ref {
    width: 100%;
  }
}
</style>
