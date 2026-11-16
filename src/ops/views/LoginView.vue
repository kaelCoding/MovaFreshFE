<template>
  <section class="ops-card ops-login">
    <h1>Đăng nhập vận hành</h1>
    <p class="ops-muted">Nhập mã PIN theo vai trò. Bản demo: mã PIN hiển thị bên dưới. Bản thật sẽ đặt sau đăng nhập.</p>

    <form @submit.prevent="submit">
      <label for="pin">Mã PIN</label>
      <input id="pin" v-model="pin" class="ops-input" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="••••" />
      <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
      <button class="ops-btn ops-btn-primary" type="submit">Vào</button>
    </form>

    <details class="ops-demo-pins">
      <summary>PIN demo theo vai trò</summary>
      <ul>
        <li v-for="p in pins" :key="p.pin"><strong>{{ p.pin }}</strong> · {{ p.label }}</li>
      </ul>
    </details>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../shared/api';
import { ROLES } from '../../shared/config/roles';
import { SUPPLIERS } from '../../shared/data/catalog';
import { BUSINESS } from '../../shared/config/business';
import { setSession } from '../session';

const router = useRouter();
const pin = ref('');
const error = ref('');

const pins = [
  ...Object.values(ROLES).filter((r) => r.pin).map((r) => ({ pin: r.pin, label: r.label })),
  ...BUSINESS.logistics.shippers.map((s) => ({ pin: s.pin, label: `Shipper · ${s.name}` })),
  ...Object.values(SUPPLIERS).map((s) => ({ pin: s.pin, label: `Nhà cung cấp · ${s.name}` }))
];

function submit() {
  const s = api.auth.login(pin.value.trim());
  if (!s) {
    error.value = 'Mã PIN không đúng.';
    return;
  }
  error.value = '';
  setSession(s);
  router.push(s.home);
}
</script>
