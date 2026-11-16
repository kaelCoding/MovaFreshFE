<template>
  <div class="ops">
    <header v-if="session" class="ops-bar ops-noprint">
      <div class="ops-brand">
        <strong>MOVA Vận hành</strong>
        <span class="ops-role">{{ session.label }}</span>
      </div>
      <div class="ops-clock" :title="'Đồng hồ nghiệp vụ (giả lập)'">
        {{ clockText }}
      </div>
      <button class="ops-btn ops-btn-ghost" @click="logout">Đăng xuất</button>
    </header>

    <nav v-if="session" class="ops-nav ops-noprint" aria-label="Phân hệ">
      <RouterLink v-for="m in menu" :key="m.path" :to="m.path" class="ops-tab">{{ m.title }}</RouterLink>
    </nav>

    <QueueBanner v-if="session" />

    <main class="ops-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { session, ctx, setSession } from './session';
import { modulesFor } from './modules';
import { api } from '../shared/api';
import { fmtDeadline } from '../shared/utils/time';
import QueueBanner from './components/QueueBanner.vue';

const router = useRouter();
const menu = computed(() => (session.value ? modulesFor(session.value.role) : []));

const nowIso = ref(null);
const clockText = computed(() => (nowIso.value ? fmtDeadline(new Date(nowIso.value)) : ''));

function refresh({ tick = true } = {}) {
  if (!ctx.value) return;
  try {
    // Chỉ chạy job theo nhịp 15 giây. Sự kiện `storage` (tab khác vừa ghi) chỉ đọc lại đồng hồ, không ghi,
    // để hai tab không ghi đè nhau liên tục.
    if (tick) api.ops.tick(ctx.value);
    nowIso.value = api.ops.summary(ctx.value).now;
  } catch {
    // phiên hết hạn hoặc dữ liệu bị xóa: bỏ qua, trang tự xử lý ở lần tải sau
  }
}
const onStorage = () => refresh({ tick: false });

let timer = null;
onMounted(() => {
  refresh();
  timer = setInterval(() => refresh(), 15000);
  window.addEventListener('storage', onStorage);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  window.removeEventListener('storage', onStorage);
});

function logout() {
  setSession(null);
  router.push('/login');
}
</script>
