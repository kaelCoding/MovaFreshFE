<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="login-title" @click.self="store.closeModal">
    <div class="mbox box">
      <button class="mclose" type="button" @click="store.closeModal" aria-label="Đóng">×</button>
      <h2 id="login-title" class="pl-h2">Tài khoản MOVA Fresh</h2>

      <template v-if="store.isLoggedIn">
        <p class="pl-lead">Bạn đang vào tài khoản <b>{{ store.userName }}</b>.</p>
        <div class="stack">
          <router-link to="/account" class="pl-btn primary" @click="store.closeModal">Xem gói của tôi</router-link>
          <button class="pl-btn" type="button" @click="logout">Đổi sang tài khoản khác</button>
        </div>
      </template>

      <template v-else>
        <p class="pl-lead">Nhập số điện thoại hoặc email bạn đã dùng khi đăng ký gói. Bản demo không cần mật khẩu.</p>

        <!-- Nút tiếp tục nhanh MXH chuẩn Shopee / Grab / Notion -->
        <div class="social-fast-actions">
          <button type="button" class="social-btn zalo-primary" @click="quickSocialLogin('Zalo')">
            <div class="social-btn-content">
              <svg class="social-icon zalo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="5" fill="#FFFFFF"/>
                <text x="12" y="15.8" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="900" fill="#0068FF" letter-spacing="-0.3px">Zalo</text>
              </svg>
              <span class="btn-text">Tiếp tục với Zalo</span>
            </div>
            <span class="rec-badge">Khuyên dùng</span>
          </button>
          <div class="social-grid">
            <button type="button" class="social-btn google-btn" @click="quickSocialLogin('Google')">
              <svg class="social-icon" width="20" height="20" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/>
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
              </svg>
              <span class="btn-text">Google</span>
            </button>
            <button type="button" class="social-btn facebook-btn" @click="quickSocialLogin('Facebook')">
              <svg class="social-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#1877F2"/>
                <path d="M16 12.3h-2.5v7.7h-3.2v-7.7H8.5V9.6h1.8V7.5c0-2.3 1.4-3.5 3.5-3.5 1 0 1.9.1 2.2.1v2.5h-1.5c-1.1 0-1.3.5-1.3 1.3v1.7H16l-.4 2.7z" fill="#FFFFFF"/>
              </svg>
              <span class="btn-text">Facebook</span>
            </button>
          </div>
        </div>

        <div class="divider">
          <span>Hoặc đăng nhập bằng số điện thoại / email</span>
        </div>

        <form class="stack" @submit.prevent="submit">
          <label class="pl-label" for="login-contact">Số điện thoại hoặc email</label>
          <input id="login-contact" v-model="contact" class="pl-input" inputmode="email" autocomplete="username" placeholder="0908 123 456" />
          <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
          <button class="pl-btn primary" type="submit">Vào tài khoản</button>
        </form>

        <div v-if="samples.length" class="samples">
          <h3>Hoặc xem thử một tài khoản mẫu</h3>
          <button v-for="s in samples" :key="s.customer_id" type="button" class="pl-chip big sample" @click="store.loginAs(s.customer_id)">
            <b>{{ s.name }}</b>
            <small>{{ s.hint }}</small>
          </button>
        </div>
        <router-link to="/plans" class="pl-btn ghost" @click="store.closeModal">Chưa có gói? Thiết kế thực đơn</router-link>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../shared/api';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const contact = ref('');
const error = ref('');
const samples = api.customer.sampleAccounts();

function submit() {
  error.value = store.loginWithContact(contact.value);
}

function quickSocialLogin(provider) {
  if (samples.length) {
    store.loginAs(samples[0].customer_id);
    store.closeModal();
  } else {
    submit();
  }
}

function logout() {
  store.logout();
}
</script>

<style scoped>
.box { max-width: 480px; padding: 26px 22px; }
.stack { display: grid; gap: 12px; margin-top: 8px; }
.samples { margin-top: 20px; display: grid; gap: 10px; }
.samples h3 { font-size: 16px; font-weight: 700; color: var(--muted); }
.sample { width: 100%; }

.social-fast-actions {
  display: grid;
  gap: 12px;
  margin: 16px 0 14px;
}
.social-btn {
  height: 48px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease;
  user-select: none;
}
.social-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
}
.social-btn:active {
  transform: scale(0.99);
}

.social-btn.zalo-primary {
  width: 100%;
  background: #0068FF;
  border: none;
  color: #FFFFFF;
  padding: 0 16px;
  position: relative;
  justify-content: space-between;
}
.social-btn.zalo-primary:hover {
  background: #0056D6;
  box-shadow: 0 4px 14px rgba(0, 104, 255, 0.35);
}
.social-btn-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.rec-badge {
  background: rgba(255, 255, 255, 0.22);
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.social-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  height: 48px;
}
.social-btn.google-btn,
.social-btn.facebook-btn {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  color: #1E293B;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
  padding: 0 16px;
}
.social-btn.google-btn:hover,
.social-btn.facebook-btn:hover {
  background: #F8FAFC;
  border-color: #CBD5E1;
}

.social-icon {
  flex-shrink: 0;
  display: block;
}
.btn-text {
  font-size: 15px;
  font-weight: 600;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 14px 0 16px;
  color: var(--muted);
  font-size: 13px;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--line);
}
.divider span {
  padding: 0 10px;
}
</style>
