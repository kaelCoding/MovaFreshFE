<template>
  <div>
    <!-- Simulation Switcher -->
    <div class="sim-bar">
      <div class="s-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>Mô phỏng mốc thời gian thực tế:</span>
      </div>
      <div class="sim-toggles">
        <button
          :class="{ active: !store.cutoffPassed }"
          @click="store.setCutoffPassed(false)"
        >
          Trước giờ chốt sổ 20:00 (Sửa/Hoãn/Hủy)
        </button>
        <button
          :class="{ active: store.cutoffPassed }"
          @click="store.setCutoffPassed(true)"
        >
          Đã qua 20:00 (Đắk Lắk đang sơ chế - Khóa sửa)
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!ord" class="order-box empty-box">
      <div style="font-size: 36px; margin-bottom: 8px">🧺</div>
      <h3>Hiện bạn không có đơn hàng nào đang chạy</h3>
      <p class="muted" style="font-size: 14px; margin-top: 4px">
        Hãy chuyển sang Cửa hàng để chọn thực đơn tươi ngon cho tuần này.
      </p>
      <router-link to="/" class="btn primary sm" style="margin-top: 16px">
        Đặt món tuần này ngay
      </router-link>
    </div>

    <!-- Active order card -->
    <div v-else class="order-box">
      <div class="order-top">
        <div>
          <div class="title-row">
            <h3>Đơn hàng #{{ ord.id }}</h3>
            <span
              class="order-status-tag"
              :class="{ locked: store.cutoffPassed, delayed: ord.delayed }"
            >
              {{ statusLabel }}
            </span>
          </div>
          <p class="muted" style="font-size: 13px; margin-top: 4px">
            Tạo lúc: {{ ord.createdAt }} • Khung giờ nhận: <b>{{ ord.deliveryTimeSlot }}</b>
          </p>
          <div v-if="ord.delayed" class="delay-banner">
            ⚠️ {{ ord.delayNotice || 'Đã hoãn sang chuyến xe tuần kế tiếp — Bảo lưu 100% giá trị' }}
          </div>
        </div>

        <div class="price-col">
          <span class="muted" style="font-size: 12.5px">Tổng thanh toán:</span>
          <div class="num total-pr">{{ fmt(ord.total) }}</div>
          <small class="muted" style="font-size: 12px">
            {{ ord.payMethod === 'prepaid' ? 'Trừ vào Fresh Credit' : 'Đã quét VietQR' }}
          </small>
        </div>
      </div>

      <!-- Tracker 4 bước -->
      <div class="tracker">
        <ol class="t-steps">
          <li class="t-step done">
            <div class="t-icon">✓</div>
            <div><b>1. Chốt đơn</b><small>Trước 20:00</small></div>
          </li>
          <li class="t-step" :class="{ current: store.cutoffPassed && !ord.delayed }">
            <div class="t-icon">{{ store.cutoffPassed ? '⚙' : '2' }}</div>
            <div><b>2. Đắk Lắk sơ chế</b><small>Ướp thảo mộc nền</small></div>
          </li>
          <li class="t-step">
            <div class="t-icon">❄️</div>
            <div><b>3. Xe lạnh xuyên đêm</b><small>22:00 – 05:00</small></div>
          </li>
          <li class="t-step">
            <div class="t-icon">🛵</div>
            <div><b>4. Giao tận bếp</b><small>Trước 10:00 sáng</small></div>
          </li>
        </ol>
      </div>

      <!-- Thông tin nhận hàng & đóng gói -->
      <div class="info-block">
        <div>📍 <b>Địa chỉ nhận hàng:</b> {{ ord.address }} ({{ ord.receiver }})</div>
        <div>
          📦 <b>Quy cách đơn:</b>
          {{ ord.isSplit ? 'Tách làm 2 đợt giao (Chủ Nhật & Thứ Tư)' : 'Giao gộp 1 đợt duy nhất' }}
          {{ ord.sauce ? ' • Tách riêng gói sốt' : '' }}
          {{ ord.carb ? ' • Giảm 50% tinh bột' : '' }}
        </div>
        <div v-if="ord.note">📝 <b>Ghi chú shipper:</b> {{ ord.note }}</div>
      </div>

      <!-- Các nút thao tác thực tế -->
      <div class="order-acts">
        <template v-if="!store.cutoffPassed">
          <button class="btn primary sm" @click="handleEditOrder">
            ✏️ Sửa món / Thêm món
          </button>
          <button class="btn sm" @click="handleDelayOrder">
            ⏳ Hoãn đợt giao này
          </button>
          <button class="btn sm cancel-btn" @click="handleCancelOrder">
            ✕ Hủy đơn (Hoàn tiền vào Gói)
          </button>
        </template>
        <span v-else class="muted" style="font-size: 13px; align-self: center">
          🔒 Đơn hàng đã khóa chỉnh sửa vì nhà máy Đắk Lắk đang cắt thịt theo đơn.
        </span>

        <button class="btn sm report-btn" @click="store.openModal('refund')">
          🛡️ Báo cáo độ tươi / Hoàn tiền
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../utils/formatters';

const store = useMovaStore();
const router = useRouter();

const ord = computed(() => store.activeOrder);

const statusLabel = computed(() => {
  if (ord.value && ord.value.delayed) {
    return 'Đã hoãn sang tuần tới';
  }
  return store.cutoffPassed
    ? 'Đã qua giờ chốt 20:00 (Đắk Lắk đang sơ chế)'
    : 'Trước giờ chốt sổ 20:00 (Cho phép sửa/hoãn/hủy)';
});

const handleEditOrder = () => {
  if (!ord.value) return;
  const newCart = {};
  ord.value.items.forEach((it) => {
    newCart[it.id] = it.qty;
  });
  const newAddons = {};
  if (ord.value.addons) {
    ord.value.addons.forEach((a) => {
      newAddons[a.id] = a.qty;
    });
  }
  store.cartA = newCart;
  store.addonsA = newAddons;
  store.mode = 'A';
  store.sauce = ord.value.sauce;
  store.carb = ord.value.carb;
  store.toast('Đã nạp lại đơn vào giỏ hàng để bạn chỉnh sửa.');
  router.push('/');
};

// BUG 3 FIX: Kích hoạt delayActiveOrder()
const handleDelayOrder = () => {
  if (confirm('Bạn có chắc muốn hoãn đợt giao này sang chuyến xe tuần tiếp theo?')) {
    store.delayActiveOrder();
  }
};

const handleCancelOrder = () => {
  if (confirm('Bạn muốn hủy đơn hàng này? Toàn bộ số tiền sẽ được hoàn 100% vào Fresh Credit.')) {
    store.cancelActiveOrder();
  }
};
</script>

<style scoped>
.sim-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--butter);
  border: 1px solid #E4D09A;
  border-radius: 14px;
  padding: 12px 16px;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.s-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 700;
  color: #6C4E0B;
}

.sim-toggles {
  display: flex;
  gap: 6px;
}

.sim-toggles button {
  border: 1px solid #D0B876;
  background: rgba(255, 255, 255, .8);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: #5D4208;
  transition: .15s;
}

.sim-toggles button.active {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.order-box {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 22px;
  margin-bottom: 20px;
}

.empty-box {
  text-align: center;
  padding: 40px 20px;
}

.order-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--line);
  padding-bottom: 14px;
  margin-bottom: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.title-row h3 {
  font-size: 18px;
  font-weight: 800;
}

.order-status-tag {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  background: var(--green-soft);
  color: var(--green-d);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.order-status-tag.locked {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

.order-status-tag.delayed {
  background: #FEE8D6;
  color: #9C3806;
}

.delay-banner {
  background: #FFF3CD;
  color: #856404;
  border: 1px solid #FFEEBA;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12.5px;
  font-weight: 600;
  margin-top: 8px;
}

.price-col {
  text-align: right;
}

.total-pr {
  font-size: 20px;
  font-weight: 800;
  color: var(--green);
}

/* Tracker 4 bước */
.tracker {
  margin: 20px 0 24px;
  position: relative;
}

.t-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
}

.t-steps::before {
  content: "";
  position: absolute;
  left: 20px;
  right: 20px;
  top: 18px;
  height: 3px;
  background: var(--line-2);
  z-index: 0;
}

.t-step {
  position: relative;
  z-index: 1;
  text-align: center;
}

.t-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--card);
  border: 2px solid var(--line);
  display: grid;
  place-items: center;
  margin: 0 auto 8px;
  font-weight: 700;
  font-size: 13px;
  color: var(--muted);
}

.t-step.done .t-icon {
  background: var(--green);
  border-color: var(--green);
  color: #fff;
}

.t-step.current .t-icon {
  background: var(--orange);
  border-color: var(--orange);
  color: #fff;
  box-shadow: 0 0 0 4px var(--orange-soft);
}

.t-step b {
  display: block;
  font-size: 13px;
  line-height: 1.2;
}

.t-step small {
  display: block;
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 2px;
}

.info-block {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 13.5px;
  display: grid;
  gap: 6px;
}

.order-acts {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 18px;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}

.cancel-btn {
  color: var(--red);
  border-color: #F5C2C0;
}

.report-btn {
  margin-left: auto;
  border-color: var(--orange);
  color: var(--orange-ink);
}

@media (max-width: 680px) {
  .t-steps {
    grid-template-columns: 1fr;
    gap: 14px;
    text-align: left;
  }
  .t-steps::before {
    display: none;
  }
  .t-step {
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
  }
  .t-icon {
    margin: 0;
  }
}
</style>
