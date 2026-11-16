<template>
  <section class="proc">
    <nav class="ops-subnav ops-noprint" aria-label="Kho phụ TP.HCM">
      <RouterLink v-for="t in tabs" :key="t.to" :to="t.to" class="ops-subtab" exact-active-class="active" :data-tab="t.key">{{ t.title }}</RouterLink>
      <RouterLink v-if="canBuy" to="/mua-hang" class="ops-subtab" data-tab="mua-hang">← Mua hàng</RouterLink>
    </nav>
    <section v-if="!tabs.length" class="ops-card">
      <h1>Kho phụ TP.HCM</h1>
      <p class="ops-muted">Nhận xe lạnh, ghép hải sản, chia khung giờ / tuyến và xuất kho là phần của P2C. Vai trò của bạn chưa có màn nào ở P2B.</p>
    </section>
    <RouterView v-else />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { session } from '../../session';

// Nhận hàng, tồn kho, truy xuất & thu hồi (P2B). P2C thêm tab Ghép hải sản / Nhận xe / Chia tuyến vào danh sách này.
const ALL = [
  { key: 'receive', to: '/kho', title: 'Nhận hàng', roles: ['hub', 'purchasing', 'admin'] },
  { key: 'stock', to: '/kho/ton-kho', title: 'Tồn kho', roles: ['hub', 'purchasing', 'admin'] },
  { key: 'trace', to: '/kho/truy-xuat', title: 'Truy xuất', roles: ['hub', 'purchasing', 'admin'] },
  { key: 'recall', to: '/kho/thu-hoi', title: 'Thu hồi lô', roles: ['hub', 'purchasing', 'admin'] }
];

const tabs = computed(() => ALL.filter((t) => t.roles.includes(session.value.role)));
const canBuy = computed(() => ['purchasing', 'admin'].includes(session.value.role));
</script>
