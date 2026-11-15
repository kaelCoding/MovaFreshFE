<template>
  <div class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox" style="max-width: 460px; padding: 24px">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>
      
      <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 6px">
        Tài khoản MOVA Fresh
      </h3>
      <p class="muted" style="font-size: 13.5px; margin-bottom: 14px">
        Đăng nhập bằng SĐT để quản lý lịch giao và Fresh Credit.
      </p>

      <!-- Nhắc tiếp tục đặt hàng nếu chuyển từ giỏ hàng -->
      <div v-if="store.pendingCheckoutAfterLogin" class="checkout-prompt-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Chọn nhanh tài khoản Demo hoặc nhập SĐT để tiếp tục đặt hàng</span>
      </div>

      <!-- Lựa chọn tài khoản Demo -->
      <div class="demo-select-box">
        <b style="font-size: 13px; color: var(--green); display: block; margin-bottom: 10px">
          ⚡ Chọn nhanh tài khoản trải nghiệm thực tế:
        </b>
        <div style="display: grid; gap: 9px">
          <!-- 1. Demo Khách mới: Anh Minh -->
          <button
            type="button"
            class="btn sm demo-btn demo-btn-new"
            @click="store.loginDemoNew"
          >
            <div class="demo-btn-body">
              <div class="demo-btn-title">
                <b>Demo Khách mới (Tặng 30.000đ đơn đầu)</b>
                <span class="demo-pill orange">Mới</span>
              </div>
              <small class="muted" style="display: block; margin-top: 3px">
                Anh Minh • Số dư 30.000đ • Landmark 4 Vinhomes • Chưa có đơn
              </small>
            </div>
          </button>

          <!-- 2. Demo Khách quen: Chị Lan -->
          <button
            type="button"
            class="btn sm demo-btn demo-btn-lan"
            @click="store.loginDemoLan"
          >
            <div class="demo-btn-body">
              <div class="demo-btn-title">
                <b>Demo Khách quen: Chị Lan (Có sẵn 850.000đ Fresh Credit)</b>
                <span class="demo-pill green">850k</span>
              </div>
              <small class="muted" style="display: block; margin-top: 3px">
                Chị Lan • 850.000đ Fresh Credit • 2 địa chỉ • Đơn đang giao #MV10298
              </small>
            </div>
          </button>
        </div>
      </div>

      <!-- Đăng nhập SĐT tuỳ biến -->
      <form @submit.prevent="handleCustomLogin">
        <label class="blabel" for="loginPhone">Số điện thoại của bạn:</label>
        <div class="money" style="background: #fff; margin-bottom: 12px">
          <input
            id="loginPhone"
            type="tel"
            v-model="phoneInput"
            placeholder="09xx xxx xxx"
            required
          />
        </div>
        <label class="blabel" for="loginOtp">Mã xác thực OTP (4 số):</label>
        <div class="money" style="background: #fff; margin-bottom: 16px">
          <input
            id="loginOtp"
            type="text"
            maxlength="4"
            v-model="otpInput"
            placeholder="Nhập 1234"
            required
          />
        </div>
        <button
          type="submit"
          class="btn primary"
          style="width: 100%; justify-content: center"
        >
          {{ store.pendingCheckoutAfterLogin ? 'Đăng nhập & Tiếp tục thanh toán' : 'Đăng nhập tài khoản' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();

const phoneInput = ref(store.user.phone || '');
const otpInput = ref('1234');

const handleCustomLogin = () => {
  store.loginCustom(phoneInput.value.trim());
};
</script>

<style scoped>
.checkout-prompt-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--orange-soft);
  color: var(--orange-ink);
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 14px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.checkout-prompt-banner svg {
  flex-shrink: 0;
}

.demo-select-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 16px;
}

.demo-btn {
  text-align: left;
  justify-content: flex-start;
  padding: 11px 12px;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  transition: border-color .15s, background .15s;
  width: 100%;
}

.demo-btn:hover {
  border-color: var(--green);
  background: var(--green-soft);
}

.demo-btn-body {
  width: 100%;
}

.demo-btn-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 13.5px;
}

.demo-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}

.demo-pill.orange {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

.demo-pill.green {
  background: var(--green-soft);
  color: var(--green);
}
</style>
