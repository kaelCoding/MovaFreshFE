<template>
  <div>
    <!-- Thẻ Prepaid sang trọng -->
    <div class="prepaid-card">
      <div class="pcard-top">
        <span class="pcard-brand">MOVA FRESH • PREPAID MEAL PLAN</span>
        <span class="pcard-badge">Thành viên TP.HCM</span>
      </div>
      <div class="pcard-mid">
        <small>Giá trị điểm bữa ăn tươi khả dụng</small>
        <div class="pcard-bal num">{{ fmt(store.user.prepaidBalance) }}</div>
      </div>
      <div class="pcard-bot">
        <span>Mã tài khoản: <b>MV-8829-{{ (store.user.name || 'GUEST').split(' ').pop().toUpperCase() }}</b></span>
        <span>Hạn bảo lưu: <b>Cam kết bảo lưu 100%</b></span>
      </div>
    </div>

    <!-- Quy định pháp lý Nghị định 52/2024 -->
    <div class="legal-notice">
      <b>⚖️ Minh bạch quyền lợi theo Nghị định 52/2024/NĐ-CP:</b>
      <p style="margin-top: 4px">
        “Fresh Credit” là hình thức trả trước tiền nguyên liệu bữa ăn định kỳ, giúp tối ưu chi phí vận hành chuỗi lạnh Đắk Lắk – TP.HCM và nhận giá trị chiết khấu trực tiếp (lên đến 25%). Giá trị trong tài khoản <b>chỉ dùng để đổi nguyên liệu sơ chế tại MOVA FRESH</b>, không phải ví điện tử và không hỗ trợ rút tiền mặt. Toàn bộ số dư được cam kết bảo lưu giá trị không thời hạn.
      </p>
    </div>

    <!-- Mua thêm gói mới -->
    <h3 style="font-size: 17px; font-weight: 800; margin-bottom: 12px">
      Nạp thêm Fresh Credit (Chiết khấu cao 15–25%)
    </h3>
    <div class="plan-tiers">
      <!-- 1. Gói Gia Đình 2M -->
      <div class="tier-card highlight-tier">
        <span class="t-pop orange-pop">Tặng thẳng 400.000đ</span>
        <h4>Gói Gia Đình Vui Vẻ</h4>
        <div class="t-val num">2.000.000đ</div>
        <span class="t-bonus orange-bonus">Nạp hôm nay chỉ trả: <b>1.600.000đ</b> (Tiết kiệm 20%)</span>
        <p class="muted" style="font-size: 13px">
          Phù hợp gia đình 3–4 người ăn 2–3 tuần. Tự do đổi món, trừ dần theo từng bữa ăn.
        </p>
        <button
          class="btn orange sm"
          style="margin-top: auto"
          @click="openTopup(1600000, 400000)"
        >
          Đăng ký gói 2.000.000đ (Trả 1.6M)
        </button>
      </div>

      <!-- 2. Gói Cả Tháng 4M -->
      <div class="tier-card special-tier">
        <span class="t-pop green-pop">Tặng thẳng 1.000.000đ</span>
        <h4>Gói Cả Tháng Thảnh Thơi</h4>
        <div class="t-val num">4.000.000đ</div>
        <span class="t-bonus green-bonus">Nạp hôm nay chỉ trả: <b>3.000.000đ</b> (Tiết kiệm 25%)</span>
        <p class="muted" style="font-size: 13px">
          Tiết kiệm nhiều nhất cho đại gia đình. Khóa trọn giá nguyên liệu tươi suốt cả tháng.
        </p>
        <button
          class="btn primary sm"
          style="margin-top: auto"
          @click="openTopup(3000000, 1000000)"
        >
          Đăng ký gói 4.000.000đ (Trả 3M)
        </button>
      </div>

      <!-- 3. Gói Trải Nghiệm 1M -->
      <div class="tier-card">
        <span class="t-pop">Tặng 150.000đ</span>
        <h4>Gói Trải Nghiệm Tân Thủ</h4>
        <div class="t-val num">1.000.000đ</div>
        <span class="t-bonus">Nạp hôm nay chỉ trả: <b>850.000đ</b> (Tiết kiệm 15%)</span>
        <p class="muted" style="font-size: 13px">
          Phù hợp người độc thân hoặc cặp đôi nấu thử tuần đầu tiên.
        </p>
        <button
          class="btn sm"
          style="margin-top: auto"
          @click="openTopup(850000, 150000)"
        >
          Đăng ký gói 1.000.000đ (Trả 850k)
        </button>
      </div>
    </div>

    <!-- Cụm tính năng Viral Referral Engine -->
    <div style="margin: 28px 0">
      <ViralReferralCard />
    </div>

    <!-- Lịch sử biến động số dư -->
    <h3 style="font-size: 17px; font-weight: 800; margin: 24px 0 12px">
      Lịch sử biến động Fresh Credit
    </h3>
    <div class="ledger-table-wrap">
      <table class="ledger-table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Mô tả biến động</th>
            <th style="text-align: right">Biến động</th>
            <th style="text-align: right">Số dư còn lại</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in store.ledger" :key="idx">
            <td>{{ row.date }}</td>
            <td>{{ row.desc }}</td>
            <td
              style="text-align: right; font-weight: 700"
              :style="{ color: row.amount > 0 ? 'var(--green)' : 'var(--orange-ink)' }"
            >
              {{ row.amount > 0 ? '+' : '' }}{{ fmt(row.amount) }}
            </td>
            <td style="text-align: right" class="num">{{ fmt(row.bal) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../utils/formatters';
import ViralReferralCard from '../shared/ViralReferralCard.vue';

const store = useMovaStore();

const openTopup = (amount, bonus) => {
  store.pendingTopup = { amount, bonus };
  store.openModal('topup');
};
</script>

<style scoped>
.prepaid-card {
  background: linear-gradient(135deg, #0E482D, #146C43 65%, #228B58);
  color: #fff;
  border-radius: 24px;
  padding: 26px;
  box-shadow: 0 12px 30px rgba(14, 72, 45, .25);
  position: relative;
  overflow: hidden;
  margin-bottom: 24px;
}

.pcard-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.pcard-brand {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  opacity: .85;
}

.pcard-badge {
  background: rgba(255, 255, 255, .15);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
}

.pcard-mid small {
  font-size: 12px;
  opacity: .75;
  display: block;
  margin-bottom: 4px;
}

.pcard-bal {
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 800;
  letter-spacing: -.02em;
}

.pcard-bot {
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
  font-size: 12px;
  opacity: .85;
}

.legal-notice {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 24px;
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.5;
}

.plan-tiers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.tier-card {
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all .2s ease;
}

.tier-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .06);
}

.tier-card.highlight-tier {
  border-color: var(--orange);
  background: linear-gradient(180deg, #FCEDE4 0%, #fff 40%);
}

.tier-card.special-tier {
  border-color: var(--green);
  background: linear-gradient(180deg, #E8F5E9 0%, #fff 40%);
}

.t-pop {
  align-self: flex-start;
  font-size: 10.5px;
  font-weight: 700;
  background: var(--line-2);
  color: var(--muted);
  padding: 3px 8px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.t-pop.orange-pop {
  background: var(--orange);
  color: #fff;
}

.t-pop.green-pop {
  background: var(--green);
  color: #fff;
}

.tier-card h4 {
  font-size: 15px;
  font-weight: 800;
  margin: 0 0 6px;
}

.t-val {
  font-size: 24px;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 4px;
}

.t-bonus {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 10px;
  display: block;
}

.t-bonus b {
  color: var(--ink);
}

.t-bonus.orange-bonus b {
  color: var(--orange-ink);
}

.t-bonus.green-bonus b {
  color: var(--green-d);
}

.ledger-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 16px;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.ledger-table th, .ledger-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
}

.ledger-table th {
  background: var(--bg);
  font-weight: 700;
  color: var(--muted);
}

@media (max-width: 900px) {
  .plan-tiers {
    grid-template-columns: 1fr;
  }
}
</style>
