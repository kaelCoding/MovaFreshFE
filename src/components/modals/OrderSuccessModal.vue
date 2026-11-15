<template>
  <div v-if="orderInfo" class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox" style="max-width: 580px; overflow: hidden">
      <!-- BUG 1 FIX: Header xanh rừng rực rỡ với nút x màu trắng rõ ràng -->
      <div class="okhead">
        <button class="mclose ok-close" @click="store.closeModal" aria-label="Đóng">×</button>
        <h3 id="okTitle">Đã nhận đơn hàng #{{ orderInfo.code }}</h3>
        <p>{{ orderInfo.calc.meals }} bữa, {{ orderInfo.calc.serv }} suất. Xe lạnh khởi hành từ Đắk Lắk lúc 22:00.</p>
      </div>

      <div style="padding: 22px">
        <h4 style="font-size: 15px; margin-bottom: 8px">Lịch nhận hàng tại TP.HCM:</h4>
        <ul class="drop-schedule-list">
          <li class="drop-item drop-1">
            <b>Đợt 1: Sáng {{ dLbl(drop1Date) }}</b> • Trước 10:00 ({{ orderInfo.timeSlot }})
          </li>
          <li v-if="orderInfo.calc.isSplit" class="drop-item drop-2">
            <b>Đợt 2: Sáng {{ dLbl(drop2Date) }}</b> • Trước 10:00 ({{ orderInfo.timeSlot }})
          </li>
        </ul>

        <!-- VietQR Box nếu cần thanh toán -->
        <div v-if="needsQr" class="qr-pay-box">
          <b>Mã VietQR thanh toán {{ fmt(qrAmount) }}</b>
          <div class="qr-render-area">
            <VietQrSvg :seed="qrAmount" />
          </div>
          <p class="muted" style="font-size: 12px">
            Nội dung chuyển khoản: <b>{{ orderInfo.code }}</b>
          </p>
        </div>

        <div v-else-if="store.pay === 'prepaid'" class="prepaid-success-note">
          ✓ Đã trừ đủ <b>{{ fmt(orderInfo.calc.total) }}</b> vào Gói Đi Chợ Trả Trước. Bạn không cần thanh toán thêm gì khi nhận hàng.
        </div>

        <div v-else class="cod-success-note">
          Thanh toán tiền mặt <b>{{ fmt(orderInfo.calc.total) }}</b> cho shipper khi nhận đợt hàng đầu tiên.
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end">
          <button class="btn primary" @click="goToDashboard">
            Xem đơn hàng trong Tài khoản của tôi →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import VietQrSvg from '../common/VietQrSvg.vue';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../utils/formatters';
import { schedule, dLbl } from '../../utils/schedule';

const store = useMovaStore();
const router = useRouter();

const orderInfo = computed(() => store.lastPlacedOrder);

const dates = computed(() => schedule());
const drop1Date = computed(() => {
  if (!orderInfo.value) return dates.value.sun;
  return orderInfo.value.firstDrop === 'sun' ? dates.value.sun : dates.value.wed;
});
const drop2Date = computed(() => {
  if (!orderInfo.value) return dates.value.wed;
  return orderInfo.value.firstDrop === 'sun' ? dates.value.wed : dates.value.sun;
});

const needsQr = computed(() => {
  if (!orderInfo.value) return false;
  return store.pay === 'qr' || orderInfo.value.needQrDiff > 0;
});

const qrAmount = computed(() => {
  if (!orderInfo.value) return 0;
  return store.pay === 'qr' ? orderInfo.value.calc.total : orderInfo.value.needQrDiff;
});

const goToDashboard = () => {
  store.closeModal();
  router.push('/dashboard');
};
</script>

<style scoped>
/* BUG 1 FIX: Style chuẩn cho .okhead */
.okhead {
  background: var(--green);
  color: #fff;
  padding: 22px 24px;
  border-radius: 22px 22px 0 0;
  position: relative;
}

.okhead h3 {
  font-size: 20px;
  font-weight: 800;
}

.okhead p {
  opacity: .9;
  margin-top: 4px;
  font-size: 13.5px;
}

.ok-close {
  background: rgba(255, 255, 255, .25);
  color: #fff;
}

.ok-close:hover {
  background: rgba(255, 255, 255, .4);
}

.drop-schedule-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
  font-size: 14px;
}

.drop-item {
  padding-left: 10px;
}

.drop-item.drop-1 {
  border-left: 3px solid var(--green);
}

.drop-item.drop-2 {
  border-left: 3px solid var(--orange);
}

.qr-pay-box {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  text-align: center;
  margin-top: 14px;
}

.qr-render-area {
  width: 160px;
  height: 160px;
  margin: 8px auto;
  background: #fff;
}

.prepaid-success-note {
  background: var(--green-soft);
  color: var(--green-d);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  margin-top: 14px;
}

.cod-success-note {
  background: var(--orange-soft);
  color: var(--orange-ink);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  margin-top: 14px;
}
</style>
