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
</style>
