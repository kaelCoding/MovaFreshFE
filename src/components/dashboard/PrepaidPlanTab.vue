<template>
  <div>
    <!-- Thẻ Prepaid sang trọng -->
    <div class="prepaid-card">
      <div class="pcard-top">
        <span class="pcard-brand">MOVA FRESH • PREPAID MEAL PLAN</span>
        <span class="pcard-badge">Thành viên TP.HCM</span>
      </div>
      <div class="pcard-mid">
        <small>Giá trị bữa ăn tươi khả dụng</small>
        <div class="pcard-bal num">{{ fmt(store.user.prepaidBalance) }}</div>
      </div>
      <div class="pcard-bot">
        <span>Mã thẻ: <b>MV-8829-{{ store.user.name.split(' ').pop().toUpperCase() }}</b></span>
        <span>Hạn sử dụng: <b>Còn 52 ngày</b></span>
      </div>
    </div>

    <!-- Quy định pháp lý Nghị định 52/2024 -->
    <div class="legal-notice">
      <b>⚖️ Minh bạch quyền lợi theo Nghị định 52/2024/NĐ-CP:</b>
      <p style="margin-top: 4px">
        “Gói Đi Chợ Trả Trước” là hình thức trả trước tiền nguyên liệu thực phẩm định kỳ, giúp tối ưu chi phí vận hành tuyến lạnh Đắk Lắk – TP.HCM và nhận giá trị tặng thêm (lên đến 120.000đ). Giá trị trong gói <b>chỉ dùng để đổi nguyên liệu sơ chế tại MOVA FRESH</b>, không phải ví điện tử và không hỗ trợ rút tiền mặt. Toàn bộ số dư được cam kết bảo lưu giá trị trong vòng 60 ngày.
      </p>
    </div>

    <!-- Mua thêm gói mới -->
    <h3 style="font-size: 17px; font-weight: 800; margin-bottom: 12px">
      Đăng ký thêm Gói Đi Chợ Trả Trước (Nhận thêm giá trị)
    </h3>
    <div class="plan-tiers">
      <div class="tier-card">
        <span class="t-pop">Tặng 50.000đ</span>
        <h4>Gói Gia Đình Nhỏ (1 Triệu)</h4>
        <div class="t-val num">1.000.000đ</div>
        <span class="t-bonus">Nhận giá trị thực nhận: 1.050.000đ</span>
        <p class="muted" style="font-size: 13px">
          Phù hợp vợ chồng trẻ nấu 2-3 tuần. Tự do đổi món, trừ dần theo từng đơn.
        </p>
        <button
          class="btn primary sm"
          style="margin-top: auto"
          @click="openTopup(1000000, 50000)"
        >
          Đăng ký gói 1.000.000đ
        </button>
      </div>

      <div class="tier-card highlight-tier">
        <span class="t-pop green-pop">Tặng 120.000đ</span>
        <h4>Gói Cả Tháng Thảnh Thơi (2 Triệu)</h4>
        <div class="t-val num">2.000.000đ</div>
        <span class="t-bonus orange-bonus">Nhận giá trị thực nhận: 2.120.000đ</span>
        <p class="muted" style="font-size: 13px">
          Tiết kiệm nhiều nhất cho gia đình 4 người. Tặng kèm đá gel giữ nhiệt cao cấp.
        </p>
        <button
          class="btn orange sm"
          style="margin-top: auto"
          @click="openTopup(2000000, 120000)"
        >
          Đăng ký gói 2.000.000đ
        </button>
      </div>
    </div>

    <!-- Lịch sử biến động số dư -->
    <h3 style="font-size: 17px; font-weight: 800; margin: 24px 0 12px">
      Lịch sử biến động giá trị Gói Đi Chợ
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
import { fmt } from '../../shared/utils/formatters';

const store = useMovaStore();

const openTopup = (amount, bonus) => {
  store.openModal('topup', { amount, bonus });
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

.prepaid-card::after {
  content: "";
  position: absolute;
  right: -40px;
  bottom: -40px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgba(255, 255, 255, .06);
  pointer-events: none;
}

.pcard-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.pcard-brand {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: .02em;
}

.pcard-badge {
  background: rgba(255, 255, 255, .2);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
}

.pcard-mid {
  margin: 20px 0 16px;
}

.pcard-mid small {
  font-size: 13px;
  opacity: .85;
  display: block;
}

.pcard-bal {
  font-size: 36px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.pcard-bot {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 12.5px;
  opacity: .9;
}

.legal-notice {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px 18px;
  margin-bottom: 24px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.55;
}

.legal-notice b {
  color: var(--ink);
}

.plan-tiers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.tier-card {
  background: var(--card);
  border: 2px solid var(--line);
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: .15s;
  position: relative;
}

.tier-card:hover {
  border-color: var(--green);
}

.tier-card.highlight-tier {
  border-color: var(--orange);
}

.tier-card .t-pop {
  position: absolute;
  top: -10px;
  right: 14px;
  background: var(--orange);
  color: #fff;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
}

.tier-card .t-pop.green-pop {
  background: var(--green);
}

.tier-card h4 {
  font-size: 17px;
  font-weight: 800;
}

.tier-card .t-val {
  font-size: 24px;
  font-weight: 800;
  color: var(--green);
}

.tier-card .t-bonus {
  background: var(--green-soft);
  color: var(--green-d);
  font-size: 12.5px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 8px;
  display: inline-block;
}

.tier-card .t-bonus.orange-bonus {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

.ledger-table-wrap {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.ledger-table th {
  background: var(--bg);
  text-align: left;
  padding: 12px 14px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
}

.ledger-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--line-2);
}

.ledger-table tr:last-child td {
  border-bottom: 0;
}

@media (max-width: 640px) {
  .plan-tiers {
    grid-template-columns: 1fr;
  }
}
</style>
