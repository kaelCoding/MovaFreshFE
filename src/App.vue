<template>
  <div id="mova-app">
    <!-- Header dính đỉnh -->
    <AppHeader />

    <!-- Nội dung theo View (StoreView hoặc DashboardView) -->
    <main id="top">
      <router-view />
    </main>

    <!-- Footer thông tin -->
    <AppFooter />

    <!-- Ngăn kéo thông báo bên phải -->
    <NotificationDrawer />

    <!-- Thanh giỏ hàng nổi đáy màn hình trên Mobile -->
    <MobileCartBar />

    <!-- Nút nổi chat Zalo hỗ trợ -->
    <FloatingZaloBtn />

    <!-- Thông báo Toast toàn cục -->
    <ToastMessage />

    <!-- Tất cả các Modal -->
    <DishDetailModal v-if="store.activeModal === 'dish'" />
    <LoginDemoModal v-if="store.activeModal === 'login'" />
    <CheckoutModal v-if="store.activeModal === 'checkout'" />
    <OrderSuccessModal v-if="store.activeModal === 'success'" />
    <RefundModal v-if="store.activeModal === 'refund'" />
    <TopupModal v-if="store.activeModal === 'topup'" />
    <AddressModal v-if="store.activeModal === 'address'" />
    <ReferralModal v-if="store.activeModal === 'referral'" />
    <AiOnboardingWizard v-if="store.activeModal === 'onboarding'" as-modal @close="store.closeModal" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import AppHeader from './components/common/AppHeader.vue';
import AppFooter from './components/common/AppFooter.vue';
import NotificationDrawer from './components/common/NotificationDrawer.vue';
import MobileCartBar from './components/common/MobileCartBar.vue';
import FloatingZaloBtn from './components/common/FloatingZaloBtn.vue';
import ToastMessage from './components/common/ToastMessage.vue';

// Modals
import DishDetailModal from './components/modals/DishDetailModal.vue';
import LoginDemoModal from './components/modals/LoginDemoModal.vue';
import CheckoutModal from './components/modals/CheckoutModal.vue';
import OrderSuccessModal from './components/modals/OrderSuccessModal.vue';
import RefundModal from './components/modals/RefundModal.vue';
import TopupModal from './components/modals/TopupModal.vue';
import AddressModal from './components/modals/AddressModal.vue';
import ReferralModal from './components/modals/ReferralModal.vue';
import AiOnboardingWizard from './components/onboarding/AiOnboardingWizard.vue';

import { useMovaStore } from './stores/useMovaStore';

const store = useMovaStore();

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    if (store.activeModal) {
      store.closeModal();
    }
    if (store.notifDrawerOpen) {
      store.notifDrawerOpen = false;
    }
    if (store.mobileCartOpen) {
      store.mobileCartOpen = false;
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

<style>
/* Layout spacing for mobile floating bar */
@media (max-width: 980px) {
  body {
    padding-bottom: 70px;
  }
}
</style>
