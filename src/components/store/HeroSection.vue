<template>
  <section class="hero" id="hero-section">
    <div class="wrap">
      <!-- CỘT TRÁI: GIÁ TRỊ THƯƠNG HIỆU & QUY TRÌNH TƯƠI 16H TỪ ĐẮK LẮK -->
      <div class="hero-left">
        <span class="kicker">🌿 THỊT TƯƠI NÔNG TRẠI ĐẮK LẮK • XE LẠNH XUYÊN ĐÊM GIAO SÁNG SỚM TP.HCM</span>

        <h1 class="hero-title">
          Thịt tươi Đắk Lắk sơ chế sẵn.<br />
          Giao tận bếp Sài Gòn, 15 phút xong bữa cơm nhà.
        </h1>

        <p class="hero-subtext">
          Thịt tươi Đắk Lắk sơ chế sẵn • Thực đơn AI thiết kế riêng cho từng thành viên, nấu xong trong 15 phút – 1 chảo
        </p>

        <!-- 3 Cam kết cốt lõi chuẩn V2 -->
        <ul class="hero-commitments">
          <li class="commit-item">
            <span class="commit-icon">⏱</span>
            <div class="commit-text">
              <b>Chuẩn 15 phút – 1 chảo</b>
              <span>Sơ chế sạch 100%, 0 dầu mỡ bắn, không cần đi chợ</span>
            </div>
          </li>
          <li class="commit-item">
            <span class="commit-icon">❄️</span>
            <div class="commit-text">
              <b>Chuỗi xe lạnh 16 giờ</b>
              <span>Đóng thùng từ Đắk Lắk, giữ nhiệt độ 0°C – 4°C tận cửa nhà</span>
            </div>
          </li>
          <li class="commit-item">
            <span class="commit-icon">🌿</span>
            <div class="commit-text">
              <b>Gói xốt riêng & Giảm 50% carb</b>
              <span>Định lượng chuẩn thể trạng, gia vị độc quyền tách rời</span>
            </div>
          </li>
        </ul>

        <!-- Trust Stats Bar -->
        <div class="trust-stats-bar">
          <div class="stat-col">
            <span class="stat-val num">16h</span>
            <span class="stat-lbl">Từ trại về bếp HCM</span>
          </div>
          <div class="stat-divider" aria-hidden="true"></div>
          <div class="stat-col">
            <span class="stat-val num">100%</span>
            <span class="stat-lbl">Thịt mát chuẩn ATTP</span>
          </div>
          <div class="stat-divider" aria-hidden="true"></div>
          <div class="stat-col">
            <span class="stat-val num">2 Giờ</span>
            <span class="stat-lbl">Tiết kiệm mỗi ngày</span>
          </div>
        </div>

        <div class="hero-actions-left">
          <button class="btn-scroll-menu" @click="scrollToMenu">
            <span>Khám phá Thực đơn tuần này</span>
            <span class="arrow-down" aria-hidden="true">↓</span>
          </button>
        </div>
      </div>

      <!-- CỘT PHẢI: SPLIT-HERO CARD -->
      <div class="hero-right">
        <!-- 1. Khi chưa hoàn tất hoặc đang xem màn hình chúc mừng Bước 6: Nhúng AiOnboardingWizard -->
        <div v-if="!store.onboardingProfile?.isCompleted || !store.heroWizardDismissed" class="hero-wizard-slot">
          <AiOnboardingWizard />
        </div>

        <!-- 2. Khi đã hoàn thành: Thẻ Tóm tắt Hồ sơ AI & Lịch trừ Gift Card 900.000đ (4 tuần) -->
        <div v-else class="hero-profile-summary-card">
          <div class="summary-card-header">
            <div class="active-badge">
              <span class="sparkle">✨</span>
              <span>HỒ SƠ DINH DƯỠNG AI ĐÃ KÍCH HOẠT</span>
            </div>
            <h2 class="card-title">Thực đơn riêng của gia đình bạn</h2>
            <p class="card-subtitle">
              AI đã tối ưu định lượng dinh dưỡng cho từng thành viên và kích hoạt lịch trừ Gift Card.
            </p>
          </div>

          <!-- Profile Details Grid -->
          <div class="profile-details-grid">
            <div class="detail-cell">
              <span class="cell-label">Quy mô phục vụ:</span>
              <b class="cell-val">{{ store.onboardingProfile.householdSize }} người ăn</b>
              <small class="cell-sub">
                {{ store.onboardingProfile.householdSize === 1 ? 'Chế độ Suất ăn Độc thân' : 'Mâm cơm Gia đình 5 thành phần' }}
              </small>
            </div>

            <div class="detail-cell">
              <span class="cell-label">Tần suất nấu nhà:</span>
              <b class="cell-val">{{ store.onboardingProfile.mealsPerWeek }} bữa / tuần</b>
              <small class="cell-sub">Tối ưu cho bữa tối sum vầy</small>
            </div>

            <div class="detail-cell">
              <span class="cell-label">Khu vực xe lạnh:</span>
              <b class="cell-val">
                {{ store.onboardingProfile.region === 'hcm_inner' ? 'TP.HCM (Nội thành)' : 'Thủ Đức & Đông Nam Bộ' }}
              </b>
              <small class="cell-sub">Giao sáng 06:00 – 08:00</small>
            </div>

            <div class="detail-cell">
              <span class="cell-label">Mục tiêu sức khỏe:</span>
              <b class="cell-val text-truncate">{{ healthGoalLabel }}</b>
              <small class="cell-sub">{{ exclusionLabel }}</small>
            </div>
          </div>

          <!-- Staggered 4-week Gift Card schedule (HelloFresh-style) -->
          <div class="retention-schedule-card">
            <div class="sched-top">
              <span class="sched-title">🎁 Lịch trừ Gift Card 900.000đ (Cam kết 4 tuần):</span>
              <span class="sched-badge green">Đang kích hoạt</span>
            </div>

            <div class="sched-grid">
              <div class="sched-col active">
                <div class="sched-week">Tuần 1</div>
                <div class="sched-amount num">-300k</div>
                <div class="sched-status">Đang áp dụng</div>
              </div>
              <div class="sched-col">
                <div class="sched-week">Tuần 2</div>
                <div class="sched-amount num">-200k</div>
                <div class="sched-status">Kỳ tiếp theo</div>
              </div>
              <div class="sched-col">
                <div class="sched-week">Tuần 3</div>
                <div class="sched-amount num">-200k</div>
                <div class="sched-status">Kỳ tiếp theo</div>
              </div>
              <div class="sched-col">
                <div class="sched-week">Tuần 4</div>
                <div class="sched-amount num">-200k</div>
                <div class="sched-status">Trọn 1 tháng</div>
              </div>
            </div>

            <div class="sched-bonus-line">
              <span>Đã cộng <b>+20.000đ Fresh Credit</b> tân thủ vào số dư điểm bữa ăn của bạn.</span>
            </div>
          </div>

          <!-- CTA Buttons -->
          <div class="summary-actions">
            <button class="btn-hero-edit-profile" @click="store.openOnboarding" aria-label="Sửa hồ sơ AI">
              <span class="edit-icon">✎</span> Sửa hồ sơ AI
            </button>
            <button class="btn-hero-scroll-dishes" @click="scrollToMenu">
              <span>Xem thực đơn riêng tuần này</span>
              <span aria-hidden="true">↓</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';
import AiOnboardingWizard from '../onboarding/AiOnboardingWizard.vue';

const store = useMovaStore();

const scrollToMenu = () => {
  const el = document.getElementById('thuc-don');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

const goalMap = {
  balanced: 'Cân bằng dinh dưỡng',
  muscle: 'Tăng cơ / High-Protein',
  low_carb: 'Giảm mỡ / Low-Carb',
  diabetic: 'Kiểm soát đường huyết',
  easy_digest: 'Tiêu hóa nhẹ nhàng'
};

const healthGoalLabel = computed(() => {
  const g = store.onboardingProfile?.healthGoal;
  if (!g || !g.length) return 'Cân bằng dinh dưỡng';
  return g.map((id) => goalMap[id] || id).join(', ');
});

const exclusionLabel = computed(() => {
  const ex = store.onboardingProfile?.exclusions;
  if (!ex || !ex.length) return 'Không kiêng cữ';
  const exMap = {
    no_beef: 'Không bò',
    no_pork: 'Không heo',
    no_seafood: 'Không hải sản',
    no_spicy: 'Không cay'
  };
  return 'Kiêng: ' + ex.map((id) => exMap[id] || id).join(', ');
});
</script>

<style scoped>
.hero {
  padding: 36px 0 44px;
  background: linear-gradient(180deg, rgba(20, 108, 67, 0.04) 0%, transparent 100%);
}

.hero .wrap {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
  gap: 36px;
  align-items: start;
}

/* CỘT TRÁI */
.hero-left {
  display: flex;
  flex-direction: column;
}

.kicker {
  display: inline-block;
  align-self: flex-start;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--orange-ink);
  background: var(--orange-soft);
  border-radius: 999px;
  padding: 5px 12px;
  margin-bottom: 14px;
  letter-spacing: 0.03em;
}

.hero-title {
  font-size: clamp(26px, 3.8vw, 42px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.025em;
  color: var(--ink);
  margin: 0 0 14px;
}

.hero-subtext {
  font-size: 15.5px;
  color: var(--muted);
  line-height: 1.55;
  margin: 0 0 20px;
}

.hero-commitments {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
}

.commit-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.commit-icon {
  font-size: 22px;
  flex-shrink: 0;
  line-height: 1.2;
}

.commit-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.commit-text b {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.commit-text span {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.4;
}

/* Trust Stats Bar */
.trust-stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 18px;
  margin-bottom: 22px;
}

.stat-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-val {
  font-size: 20px;
  font-weight: 800;
  color: var(--green);
}

.stat-lbl {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: var(--line);
}

.hero-actions-left {
  display: flex;
  gap: 12px;
}

.btn-scroll-menu {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--card);
  border: 1.5px solid var(--green);
  color: var(--green);
  font-size: 14.5px;
  font-weight: 700;
  font-family: inherit;
  padding: 11px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-scroll-menu:hover {
  background: var(--green-soft);
  transform: translateY(-1px);
}

.arrow-down {
  font-size: 16px;
  transition: transform 0.15s ease;
}

.btn-scroll-menu:hover .arrow-down {
  transform: translateY(2px);
}

/* CỘT PHẢI */
.hero-right {
  display: flex;
  flex-direction: column;
}

.hero-wizard-slot {
  width: 100%;
}

/* Summary Card when Profile Completed */
.hero-profile-summary-card {
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.06);
}

.summary-card-header {
  margin-bottom: 18px;
}

.active-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--green-soft);
  color: var(--green);
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.03em;
  margin-bottom: 8px;
}

.sparkle {
  font-size: 13px;
}

.card-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 6px;
}

.card-subtitle {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
  margin: 0;
}

.profile-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 18px;
}

.detail-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cell-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
}

.cell-val {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
}

.cell-sub {
  font-size: 11.5px;
  color: var(--muted);
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Retention Schedule Card */
.retention-schedule-card {
  background: linear-gradient(135deg, #FCEDE4 0%, #FAF0E4 100%);
  border: 1.5px solid var(--orange);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 18px;
}

.sched-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.sched-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--orange-ink);
}

.sched-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--green);
  color: #fff;
}

.sched-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  text-align: center;
}

.sched-col {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(217, 83, 30, 0.2);
  border-radius: 10px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sched-col.active {
  background: #fff;
  border-color: var(--orange);
  box-shadow: 0 2px 8px rgba(217, 83, 30, 0.15);
}

.sched-week {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
}

.sched-amount {
  font-size: 14px;
  font-weight: 800;
  color: var(--orange);
}

.sched-status {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--orange-ink);
}

.sched-bonus-line {
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--ink);
  line-height: 1.4;
  border-top: 1px dashed rgba(217, 83, 30, 0.3);
  padding-top: 8px;
}

.summary-actions {
  display: flex;
  gap: 10px;
}

.btn-hero-edit-profile {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--bg);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13.5px;
  font-weight: 700;
  font-family: inherit;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-hero-edit-profile:hover {
  background: var(--line-2);
  border-color: var(--ink);
}

.btn-hero-scroll-dishes {
  flex: 1.3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--green);
  border: 0;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13.5px;
  font-weight: 700;
  font-family: inherit;
  color: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(20, 108, 67, 0.25);
}

.btn-hero-scroll-dishes:hover {
  background: var(--green-d);
  transform: translateY(-1px);
}

/* RESPONSIVE */
@media (max-width: 980px) {
  .hero .wrap {
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
  }
}

@media (max-width: 520px) {
  .hero {
    padding: 24px 0 32px;
  }
  .trust-stats-bar {
    padding: 12px 10px;
  }
  .stat-val {
    font-size: 18px;
  }
  .profile-details-grid {
    grid-template-columns: 1fr;
  }
  .sched-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .summary-actions {
    flex-direction: column;
  }
}
</style>
