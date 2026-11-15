<template>
  <div class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox" style="max-width: 620px; padding: 24px">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>

      <div class="modal-hdr">
        <span class="sub-badge">ĐĂNG KÝ GÓI SUBSCRIPTION 4 TUẦN</span>
        <h3 class="modal-title">Thông tin giao hàng & Thanh toán FinTech</h3>
        <p class="muted" style="font-size: 13px; margin: 4px 0 16px">
          Xe lạnh xuất phát từ nông trại Đắk Lắk lúc 22:00, giao tận cửa TP.HCM theo khung giờ bạn chọn.
        </p>
      </div>

      <!-- Chọn nhanh từ sổ địa chỉ -->
      <div v-if="store.user.addresses && store.user.addresses.length > 0" class="quick-addr-box">
        <span style="font-size: 12px; font-weight: 700; color: var(--muted); display: block; margin-bottom: 6px">
          Địa chỉ giao hàng đã lưu:
        </span>
        <div class="addr-chips">
          <button
            v-for="a in store.user.addresses"
            :key="a.id"
            type="button"
            class="chip"
            :class="{ active: form.address === a.detail }"
            @click="applyAddress(a)"
          >
            {{ a.label }}
          </button>
        </div>
      </div>

      <form @submit.prevent="submitCheckout" class="checkout-form">
        <!-- Họ tên & SĐT -->
        <div class="form-row">
          <div>
            <label class="blabel" for="ckName">Họ tên người nhận:</label>
            <div class="money" style="background: #fff">
              <input id="ckName" v-model="form.name" placeholder="VD: Chị Lan" required />
            </div>
          </div>
          <div>
            <label class="blabel" for="ckPhone">Số điện thoại (Zalo):</label>
            <div class="money" style="background: #fff">
              <input id="ckPhone" type="tel" v-model="form.phone" placeholder="VD: 0908 123 456" required />
            </div>
          </div>
        </div>

        <!-- Quận huyện & Địa chỉ -->
        <div class="form-row split-district">
          <div>
            <label class="blabel" for="ckDistrict">Khu vực giao xe lạnh:</label>
            <select id="ckDistrict" v-model="form.district" class="select-box">
              <option value="Quận 1">Quận 1</option>
              <option value="Quận 3">Quận 3</option>
              <option value="Quận 7">Quận 7 (Sunrise City, Phú Mỹ Hưng)</option>
              <option value="Bình Thạnh">Bình Thạnh (Vinhomes Central Park)</option>
              <option value="Phú Nhuận">Phú Nhuận</option>
              <option value="Tân Bình">Tân Bình</option>
              <option value="TP. Thủ Đức">TP. Thủ Đức (Thảo Điền, An Phú)</option>
              <option value="Quận 4">Quận 4</option>
              <option value="Quận 5">Quận 5</option>
              <option value="Quận 10">Quận 10</option>
            </select>
          </div>
          <div>
            <label class="blabel" for="ckAddress">Địa chỉ chi tiết (căn hộ, số nhà):</label>
            <div class="money" style="background: #fff">
              <input id="ckAddress" v-model="form.address" placeholder="VD: Căn hộ A12.04, Sunrise City" required />
            </div>
          </div>
        </div>

        <!-- LỊCH GIAO HÀNG ĐÔ THỊ TRÁNH TẮC ĐƯỜNG -->
        <div class="logistics-sched-box">
          <div class="sched-row">
            <div>
              <label class="blabel">Tần suất giao xe lạnh:</label>
              <div class="segmented-pills">
                <button
                  type="button"
                  class="seg-pill"
                  :class="{ active: form.deliveryFrequency === '1drop' }"
                  @click="form.deliveryFrequency = '1drop'"
                >
                  <b>1 lần / tuần</b>
                  <small>Sáng Chủ Nhật</small>
                </button>
                <button
                  type="button"
                  class="seg-pill"
                  :class="{ active: form.deliveryFrequency === '2drop' }"
                  @click="form.deliveryFrequency = '2drop'"
                >
                  <b>2 lần / tuần</b>
                  <small>Chủ Nhật & Thứ Tư</small>
                </button>
              </div>
            </div>

            <div>
              <label class="blabel">Khung giờ giao tránh kẹt xe:</label>
              <select v-model="form.timeSlot" class="select-box">
                <option value="06:30–08:30">06:30 – 08:30 (Ca Sáng sớm — Trước giờ đi làm)</option>
                <option value="11:30–13:30">11:30 – 13:30 (Ca Buổi trưa — Giao văn phòng/chung cư)</option>
                <option value="18:30–20:30">18:30 – 20:30 (Ca Tối muộn — Khách đã ở nhà)</option>
              </select>
            </div>
          </div>
          <div class="cutoff-notice">
            ⏱ <b>Quy tắc chốt sổ:</b> Tự do đổi món hoặc tạm hoãn trước giờ xe lạnh lăn bánh <b>8 tiếng</b>.
          </div>
        </div>

        <!-- 3 PHƯƠNG THỨC THANH TOÁN FINTECH TRẢ TRƯỚC (100% ZERO COD) -->
        <div class="pay-section">
          <label class="blabel" style="margin-bottom: 8px">
            Phương thức thanh toán trả trước (100% Không dùng tiền mặt):
          </label>
          <div class="pays" role="radiogroup" aria-label="Phương thức thanh toán trả trước">
            <!-- 1. Trừ Fresh Credit -->
            <button
              type="button"
              class="pay-card"
              :class="{ active: store.pay === 'credit' || store.pay === 'prepaid' }"
              role="radio"
              :aria-checked="store.pay === 'credit' || store.pay === 'prepaid'"
              @click="store.setPay('credit')"
            >
              <div class="pay-body">
                <div class="pay-title">
                  <b>1. Trừ vào số dư Fresh Credit</b>
                  <span class="pay-badge green">Khuyên dùng</span>
                </div>
                <small class="pay-sub">
                  Số dư khả dụng: <b class="num">{{ fmt(store.user.prepaidBalance) }}</b> (Đã bao gồm chiết khấu 15–25%)
                </small>
              </div>
              <div class="radio-indicator">
                <span class="dot"></span>
              </div>
            </button>

            <!-- 2. VietQR trọn gói 4 tuần -->
            <button
              type="button"
              class="pay-card"
              :class="{ active: store.pay === 'vietqr_month' || store.pay === 'qr' }"
              role="radio"
              :aria-checked="store.pay === 'vietqr_month' || store.pay === 'qr'"
              @click="store.setPay('vietqr_month')"
            >
              <div class="pay-body">
                <div class="pay-title">
                  <b>2. Chuyển khoản VietQR trọn gói 4 tuần</b>
                  <span class="pay-badge orange">Khóa giá cả tháng</span>
                </div>
                <small class="pay-sub">
                  Thanh toán 1 lần cho cả 4 tuần • Áp dụng trọn vẹn <b>-900.000đ Gift Card</b>.
                </small>
              </div>
              <div class="radio-indicator">
                <span class="dot"></span>
              </div>
            </button>

            <!-- 3. Thẻ tín dụng Recurring -->
            <button
              type="button"
              class="pay-card"
              :class="{ active: store.pay === 'card_recurring' }"
              role="radio"
              :aria-checked="store.pay === 'card_recurring'"
              @click="store.setPay('card_recurring')"
            >
              <div class="pay-body">
                <div class="pay-title">
                  <b>3. Thẻ tín dụng quốc tế (Visa / Mastercard)</b>
                  <span class="pay-badge blue">Auto-Debit 72h</span>
                </div>
                <small class="pay-sub">
                  Thanh toán Tuần 1 hôm nay (đã trừ 300k), các Tuần 2–4 tự động trừ trước <b>72 tiếng</b> mỗi kỳ giao.
                </small>
              </div>
              <div class="radio-indicator">
                <span class="dot"></span>
              </div>
            </button>
          </div>
        </div>

        <!-- Hộp nhắc nạp Fresh Credit nếu số dư chưa đủ -->
        <div v-if="(store.pay === 'credit' || store.pay === 'prepaid') && store.user.prepaidBalance < c.total" class="topup-suggest-box">
          <div class="suggest-top">
            <span>💡 Số dư Fresh Credit ({{ fmt(store.user.prepaidBalance) }}) chưa đủ thanh toán gói:</span>
          </div>
          <div class="suggest-tiers">
            <button
              type="button"
              class="btn-quick-topup"
              @click="handleQuickTopup(2000000, 400000)"
            >
              <span>Nạp <b>1.600.000đ</b> nhận <b>2.000.000đ</b> Fresh Credit (+400k)</span>
              <span class="tag-save">Tiết kiệm 20%</span>
            </button>
            <button
              type="button"
              class="btn-quick-topup highlight"
              @click="handleQuickTopup(3000000, 1000000)"
            >
              <span>Nạp <b>3.000.000đ</b> nhận <b>4.000.000đ</b> Fresh Credit (+1 Triệu)</span>
              <span class="tag-save">Tiết kiệm 25%</span>
            </button>
          </div>
          <small class="legal-note">
            * Điểm bữa ăn trả trước quy đổi nguyên liệu tại MOVA Fresh theo Nghị định 52/2024/NĐ-CP, không phải ví điện tử.
          </small>
        </div>

        <!-- Tóm tắt thanh toán FinTech -->
        <div class="checkout-summary-box">
          <div class="sum-row">
            <span>Giá trị thực đơn 4 tuần ({{ c.totalMeals4Weeks }} bữa):</span>
            <b class="num">{{ fmt(c.gross4Weeks) }}</b>
          </div>
          <div class="sum-row discount">
            <span>Ưu đãi Gift Card:</span>
            <b class="num g">−{{ fmt(store.pay === 'card_recurring' ? c.week1GiftCardDiscount : c.monthGiftCardDiscount) }}</b>
          </div>
          <div class="sum-row total-pay">
            <span>Số tiền thanh toán kỳ này:</span>
            <b class="num pay-val">{{ fmt(c.total) }}</b>
          </div>
          <div class="pay-expl">
            {{ paymentDescription }}
          </div>
        </div>

        <button
          type="submit"
          class="btn orange submit-btn"
        >
          Xác nhận Đăng ký Subscription 4 tuần
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../utils/formatters';

const store = useMovaStore();
const c = computed(() => store.calcAll);

const form = reactive({
  name: store.user.name,
  phone: store.user.phone,
  district: 'Quận 7',
  address: '',
  deliveryFrequency: '2drop',
  timeSlot: '06:30–08:30',
  note: 'Giao lễ tân nếu chưa xuống kịp'
});

onMounted(() => {
  const def = store.user.addresses && (store.user.addresses.find((a) => a.isDefault) || store.user.addresses[0]);
  if (def) {
    form.name = def.name || store.user.name;
    form.phone = def.phone || store.user.phone;
    form.district = def.district || 'Quận 7';
    form.address = def.detail || '';
  }
});

const applyAddress = (a) => {
  form.name = a.name;
  form.phone = a.phone;
  form.district = a.district;
  form.address = a.detail;
  store.toast(`Đã áp dụng địa chỉ: ${a.label}`);
};

const handleQuickTopup = (amount, bonus) => {
  store.pendingTopup = { amount, bonus };
  store.openModal('topup');
};

const paymentDescription = computed(() => {
  const bal = store.user.prepaidBalance;
  if (store.pay === 'credit' || store.pay === 'prepaid') {
    if (bal >= c.value.total) {
      return `Trừ trực tiếp ${fmt(c.value.total)} vào Fresh Credit (Số dư còn lại: ${fmt(bal - c.value.total)}).`;
    }
    const diff = c.value.total - bal;
    return `Trừ hết ${fmt(bal)} Fresh Credit. Còn thiếu ${fmt(diff)} sẽ thanh toán quét mã VietQR.`;
  }
  if (store.pay === 'card_recurring') {
    return `Thanh toán ${fmt(c.value.week1Payable)} cho Tuần 1 hôm nay (đã trừ 300k Gift Card). Các tuần tiếp theo tự động trừ trước 72h.`;
  }
  return `Thanh toán trọn gói 4 tuần ${fmt(c.value.monthPayable)} qua chuyển khoản VietQR (đã trừ toàn bộ 900k Gift Card).`;
});

const submitCheckout = () => {
  if (!form.name || !form.phone || !form.address) {
    store.toast('Vui lòng điền đầy đủ tên, số điện thoại và địa chỉ nhận hàng.');
    return;
  }
  store.setDeliveryFrequency(form.deliveryFrequency);
  store.setDeliveryTimeSlot(form.timeSlot);
  store.checkout({ ...form });
};
</script>

<style scoped>
.modal-hdr {
  margin-bottom: 12px;
}

.sub-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: var(--orange-ink);
  background: var(--orange-soft);
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

.modal-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
}

.quick-addr-box {
  margin-bottom: 14px;
}

.addr-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.checkout-form {
  display: grid;
  gap: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.select-box {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #fff;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--ink);
}

/* Lịch giao đô thị */
.logistics-sched-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
}

.sched-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.segmented-pills {
  display: flex;
  gap: 6px;
}

.seg-pill {
  flex: 1;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  padding: 7px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.15s ease;
  font-family: inherit;
}

.seg-pill b {
  font-size: 12px;
  color: var(--ink);
}

.seg-pill small {
  font-size: 10px;
  color: var(--muted);
}

.seg-pill.active {
  border-color: var(--green);
  background: var(--green-soft);
}

.seg-pill.active b {
  color: var(--green-d);
}

.cutoff-notice {
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}

/* 3 Phương thức thanh toán */
.pay-section {
  display: grid;
  gap: 6px;
}

.pays {
  display: grid;
  gap: 8px;
}

.pay-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  font-family: inherit;
}

.pay-card:hover {
  border-color: var(--green);
}

.pay-card.active {
  border-color: var(--green);
  background: #F7FAF8;
  box-shadow: 0 2px 8px rgba(20, 108, 67, 0.1);
}

.pay-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pay-title b {
  font-size: 13.5px;
  color: var(--ink);
}

.pay-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
}

.pay-badge.green {
  background: var(--green-soft);
  color: var(--green);
}

.pay-badge.orange {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

.pay-badge.blue {
  background: #E8F0FE;
  color: #1A73E8;
}

.pay-sub {
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 2px;
  display: block;
}

.radio-indicator {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.pay-card.active .radio-indicator {
  border-color: var(--green);
}

.pay-card.active .radio-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
}

/* Gợi ý nạp Fresh Credit */
.topup-suggest-box {
  background: #FCEDE4;
  border: 1px solid var(--orange);
  border-radius: 12px;
  padding: 10px 14px;
}

.suggest-top {
  font-size: 12px;
  color: var(--orange-ink);
  font-weight: 600;
  margin-bottom: 6px;
}

.suggest-tiers {
  display: grid;
  gap: 6px;
}

.btn-quick-topup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid rgba(217, 83, 30, 0.3);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.btn-quick-topup:hover {
  border-color: var(--orange);
  background: #FAF0E4;
}

.tag-save {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--orange);
}

.legal-note {
  display: block;
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 6px;
}

/* Tóm tắt thanh toán */
.checkout-summary-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 16px;
}

.sum-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 4px;
}

.sum-row.discount {
  color: var(--green);
}

.sum-row.total-pay {
  border-top: 1px solid var(--line);
  padding-top: 8px;
  margin-top: 6px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.pay-val {
  font-size: 20px;
  color: var(--green);
}

.pay-expl {
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.4;
}

.submit-btn {
  width: 100%;
  justify-content: center;
  padding: 14px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
}

@media (max-width: 580px) {
  .form-row, .sched-row {
    grid-template-columns: 1fr;
  }
}
</style>
