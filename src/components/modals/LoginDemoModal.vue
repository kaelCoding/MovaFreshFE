<template>
  <div class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox" style="max-width: 440px; padding: 24px">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>
      <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 6px">
        Tài khoản MOVA Fresh
      </h3>
      <p class="muted" style="font-size: 13.5px; margin-bottom: 18px">
        Đăng nhập bằng SĐT để quản lý lịch giao và Gói Đi Chợ Trả Trước.
      </p>

      <div class="demo-select-box">
        <b style="font-size: 13px; color: var(--green)">
          ⚡ Chọn nhanh tài khoản để trải nghiệm Demo:
        </b>
        <div style="display: grid; gap: 8px; margin-top: 10px">
          <button
            class="btn sm demo-btn"
            @click="store.loginDemoLan"
          >
            <div>
              <b>Demo Khách cũ: Chị Lan</b>
              <small class="muted" style="display: block">
                Có sẵn 850.000đ Gói Đi Chợ & 2 địa chỉ TP.HCM
              </small>
            </div>
          </button>

          <!-- BUG 5 FIX: Demo Khách mới: Anh Minh -->
          <button
            class="btn sm demo-btn"
            @click="store.loginDemoNew"
          >
            <div>
              <b>Demo Khách mới: Anh Minh</b>
              <small class="muted" style="display: block">
                Căn hộ Landmark 4 Vinhomes • Tặng 30.000đ thành viên mới
              </small>
            </div>
          </button>
        </div>
      </div>

      <form @submit.prevent="handleCustomLogin">
        <label class="blabel" for="loginPhone">Số điện thoại:</label>
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
          Đăng nhập tài khoản
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();

const phoneInput = ref(store.user.phone || '0908 123 456');
const otpInput = ref('1234');

const handleCustomLogin = () => {
  store.loginCustom(phoneInput.value.trim());
};
</script>

<style scoped>
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
  padding: 10px 12px;
}
</style>
