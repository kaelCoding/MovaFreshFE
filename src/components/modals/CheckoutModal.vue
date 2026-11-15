<template>
  <div class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox" style="max-width: 600px; padding: 24px">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>
      <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 4px">
        Thông tin nhận hàng tại TP.HCM
      </h3>
      <p class="muted" style="font-size: 13px; margin-bottom: 16px">
        Xe lạnh xuất phát từ Đắk Lắk lúc 22:00, giao tận cửa buổi sáng trước 10:00.
      </p>

      <!-- Chọn nhanh từ sổ địa chỉ -->
      <div v-if="store.user.addresses.length > 0" class="quick-addr-box">
        <span style="font-size: 12.5px; font-weight: 700; display: block; margin-bottom: 6px">
          Chọn nhanh từ sổ địa chỉ:
        </span>
        <div class="addr-chips">
          <button
            v-for="a in store.user.addresses"
            :key="a.id"
            type="button"
            class="chip"
            @click="applyAddress(a)"
          >
            {{ a.label }}
          </button>
        </div>
      </div>

      <form @submit.prevent="submitCheckout" class="checkout-form">
        <div class="form-row">
          <div>
            <label class="blabel" for="ckName">Họ tên người nhận:</label>
            <div class="money" style="background: #fff">
              <input id="ckName" v-model="form.name" required />
            </div>
          </div>
          <div>
            <label class="blabel" for="ckPhone">Số điện thoại:</label>
            <div class="money" style="background: #fff">
              <input id="ckPhone" type="tel" v-model="form.phone" required />
            </div>
          </div>
        </div>

        <div class="form-row split-district">
          <div>
            <label class="blabel" for="ckDistrict">Quận/Huyện TP.HCM:</label>
            <select id="ckDistrict" v-model="form.district" class="select-box">
              <option value="Quận 7">Quận 7</option>
              <option value="Quận 1">Quận 1</option>
              <option value="Quận 3">Quận 3</option>
              <option value="Bình Thạnh">Bình Thạnh</option>
              <option value="Phú Nhuận">Phú Nhuận</option>
              <option value="Tân Bình">Tân Bình</option>
              <option value="TP. Thủ Đức">TP. Thủ Đức</option>
              <option value="Quận 2 (Thủ Đức)">Quận 2 (Thủ Đức)</option>
              <option value="Quận 9 (Thủ Đức)">Quận 9 (Thủ Đức)</option>
              <option value="Quận 4">Quận 4</option>
              <option value="Quận 5">Quận 5</option>
              <option value="Quận 10">Quận 10</option>
            </select>
          </div>
          <div>
            <label class="blabel" for="ckAddress">Địa chỉ chi tiết (số nhà, tòa nhà):</label>
            <div class="money" style="background: #fff">
              <input id="ckAddress" v-model="form.address" required />
            </div>
          </div>
        </div>

        <div class="form-row">
          <div>
            <label class="blabel">Khung giờ nhận hàng tại TP.HCM:</label>
            <select v-model="form.timeSlot" class="select-box">
              <option value="06:30–08:30">06:30 – 08:30 (Ca Sáng sớm — Trước giờ đi làm)</option>
              <option value="08:30–10:00">08:30 – 10:00 (Ca Sáng — Giao lễ tân / tại nhà)</option>
              <option value="17:30–20:00">17:30 – 20:00 (Ca Chiều Tối — Tăng cường đá gel cho khách đi làm về muộn)</option>
            </select>
          </div>
          <div>
            <label class="blabel" for="ckNote">Ghi chú cho shipper:</label>
            <div class="money" style="background: #fff">
              <input id="ckNote" v-model="form.note" placeholder="VD: Gửi lễ tân / Gọi trước" />
            </div>
          </div>
        </div>

        <!-- Hình thức thanh toán -->
        <div class="pay-section">
          <label class="blabel" style="margin-bottom: 8px">Hình thức thanh toán:</label>
          <div class="pays" role="radiogroup" aria-label="Hình thức thanh toán">
            <button
              type="button"
              class="pay"
              :class="{ active: store.pay === 'prepaid' }"
              role="radio"
              :aria-checked="store.pay === 'prepaid'"
              @click="store.setPay('prepaid')"
            >
              <div>
                <b>Trừ vào Fresh Credit</b>
                <small>Số dư khả dụng: {{ fmt(store.user.prepaidBalance) }}</small>
              </div>
              <span class="badge" style="background: var(--green)">Khuyên dùng</span>
            </button>

            <button
              type="button"
              class="pay"
              :class="{ active: store.pay === 'qr' }"
              role="radio"
              :aria-checked="store.pay === 'qr'"
              @click="store.setPay('qr')"
            >
              <div>
                <b>Chuyển khoản VietQR</b>
                <small>{{ c.canQR ? 'Đủ điều kiện: Giảm ngay 20.000đ' : 'Áp dụng khi tiền món ≥ 400.000đ' }}</small>
              </div>
              <span v-if="c.canQR" class="badge">Giảm 20.000đ</span>
            </button>
          </div>
        </div>

        <!-- Tóm tắt thanh toán theo phương thức -->
        <div class="checkout-summary-box">
          <div>
            Tổng tiền đơn hàng:
            <b class="num" style="font-size: 16px; color: var(--green)">{{ fmt(c.total) }}</b>
          </div>
          <div style="margin-top: 4px; color: var(--ink)">
            {{ paymentDescription }}
          </div>
        </div>

        <button
          type="submit"
          class="btn orange"
          style="width: 100%; justify-content: center; padding: 13px; font-size: 16px; margin-top: 6px"
        >
          Hoàn tất đặt hàng
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
  timeSlot: '06:30–08:30',
  note: 'Giao lễ tân nếu chưa xuống kịp'
});

onMounted(() => {
  const def = store.user.addresses.find((a) => a.isDefault) || store.user.addresses[0];
  if (def) {
    form.name = def.name;
    form.phone = def.phone;
    form.district = def.district;
    form.address = def.detail;
  }
});

const applyAddress = (a) => {
  form.name = a.name;
  form.phone = a.phone;
  form.district = a.district;
  form.address = a.detail;
  store.toast(`Đã áp dụng địa chỉ: ${a.label}`);
};

const paymentDescription = computed(() => {
  const bal = store.user.prepaidBalance;
  if (store.pay === 'prepaid') {
    if (bal >= c.value.total) {
      return `Trừ trực tiếp ${fmt(c.value.total)} vào Fresh Credit (Số dư còn lại sau đặt: ${fmt(bal - c.value.total)}).`;
    }
    const diff = c.value.total - bal;
    return `Trừ hết ${fmt(bal)} từ Fresh Credit. Còn thiếu ${fmt(diff)} sẽ thanh toán thêm qua mã VietQR khi xác nhận.`;
  }
  return `Thanh toán ${fmt(c.value.total)} qua VietQR chuyển khoản nhanh${c.value.qrDiscount ? ' (đã giảm 20.000đ ưu đãi)' : ''}.`;
});

const submitCheckout = () => {
  if (!form.name || !form.phone || !form.address) {
    store.toast('Vui lòng điền đầy đủ tên, số điện thoại và địa chỉ nhận hàng.');
    return;
  }
  store.checkout({ ...form });
};
</script>

<style scoped>
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
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.split-district {
  grid-template-columns: 1.2fr 1.8fr;
}

.select-box {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: #fff;
  font-size: 14px;
  outline: none;
}

.checkout-summary-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  margin-top: 6px;
  font-size: 13.5px;
  line-height: 1.5;
}

.pay-section {
  margin-top: 4px;
  margin-bottom: 6px;
}

.pays {
  display: grid;
  gap: 8px;
  margin-top: 6px;
}

.pay {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff;
  text-align: left;
  font-size: 13.5px;
  font-weight: 600;
  transition: .15s;
  cursor: pointer;
}

.pay:hover {
  border-color: var(--green);
}

.pay.active {
  border-color: var(--green);
  background: var(--green-soft);
}

.pay small {
  display: block;
  font-weight: 400;
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.pay .badge {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--orange);
  border-radius: 999px;
  padding: 3px 8px;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .form-row, .split-district {
    grid-template-columns: 1fr;
  }
}
</style>
