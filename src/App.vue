<template>
  <div id="mova-app">
    <!-- Thanh ưu đãi thẻ quà tặng (trang chủ) -->
    <PromoBar v-if="route.path === '/'" />

    <!-- Header dính đỉnh -->
    <AppHeader />

    <!-- Nội dung theo View -->
    <main id="top">
      <router-view />
    </main>

    <!-- Footer thông tin -->
    <AppFooter />

    <!-- Ngăn kéo thông báo bên phải -->
    <NotificationDrawer />

    <!-- Nút nổi chat Zalo hỗ trợ -->
    <FloatingZaloBtn />

    <!-- Thông báo Toast toàn cục -->
    <ToastMessage />

    <!-- Các modal của phần tài khoản -->
    <LoginDemoModal v-if="store.activeModal === 'login'" />
    <RefundModal v-if="store.activeModal === 'refund'" />
    <TopupModal v-if="store.activeModal === 'topup'" />
    <AddressModal v-if="store.activeModal === 'address'" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import PromoBar from './components/common/PromoBar.vue';
import AppHeader from './components/common/AppHeader.vue';
import AppFooter from './components/common/AppFooter.vue';
import NotificationDrawer from './components/common/NotificationDrawer.vue';
import FloatingZaloBtn from './components/common/FloatingZaloBtn.vue';
import ToastMessage from './components/common/ToastMessage.vue';

// Modals
import LoginDemoModal from './components/modals/LoginDemoModal.vue';
import RefundModal from './components/modals/RefundModal.vue';
import TopupModal from './components/modals/TopupModal.vue';
import AddressModal from './components/modals/AddressModal.vue';

import { useMovaStore } from './stores/useMovaStore';

const store = useMovaStore();
const route = useRoute();

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    if (store.activeModal) {
      store.closeModal();
    }
    if (store.notifDrawerOpen) {
      store.notifDrawerOpen = false;
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>
