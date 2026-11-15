<template>
  <nav class="m-bottom-nav" aria-label="Thanh điều hướng di động">
    <!-- Tab 1: Cửa hàng -->
    <button
      type="button"
      class="tab-item"
      :class="{ active: isStoreActive && !store.mobileCartOpen }"
      @click="goToStore"
    >
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span class="tab-label">Cửa hàng</span>
    </button>

    <!-- Tab 2: Giỏ hàng -->
    <button
      type="button"
      class="tab-item cart-tab"
      :class="{ active: store.mobileCartOpen, has_items: c.meals > 0 }"
      @click="openMobileCart"
    >
      <div class="icon-wrap">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <span v-if="c.meals > 0" class="cart-badge">{{ c.meals }}</span>
      </div>
      <span class="tab-label">
        {{ c.meals ? `Giỏ hàng (${c.meals})` : 'Giỏ hàng' }}
      </span>
    </button>

    <!-- Tab 3: Đơn của tôi -->
    <button
      type="button"
      class="tab-item"
      :class="{ active: isDashboardActive && !store.mobileCartOpen }"
      @click="goToDashboard"
    >
      <div class="icon-wrap">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M7 15h10M7 9h10"/>
        </svg>
        <span v-if="store.activeOrder" class="dot-badge"></span>
      </div>
      <span class="tab-label">Đơn của tôi</span>
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';

const route = useRoute();
const router = useRouter();
const store = useMovaStore();

const c = computed(() => store.calcAll);
const isStoreActive = computed(() => route.path === '/');
const isDashboardActive = computed(() => route.path === '/dashboard');

const goToStore = () => {
  store.mobileCartOpen = false;
  if (route.path !== '/') {
    router.push('/');
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const openMobileCart = async () => {
  if (route.path !== '/') {
    await router.push('/');
  }
  store.mobileCartOpen = !store.mobileCartOpen;
};

const goToDashboard = () => {
  store.mobileCartOpen = false;
  if (route.path !== '/dashboard') {
    router.push('/dashboard');
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
</script>

<style scoped>
.m-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .m-bottom-nav {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 60px;
    z-index: 38;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-top: 1px solid var(--line);
    align-items: center;
    justify-content: space-around;
    padding: 0 8px;
    box-shadow: 0 -4px 18px rgba(30, 25, 15, 0.08);
  }

  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    height: 100%;
    background: none;
    border: 0;
    color: var(--muted);
    cursor: pointer;
    padding: 4px 0;
    gap: 3px;
    transition: color 0.15s ease, transform 0.1s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .tab-item:active {
    transform: scale(0.96);
  }

  .tab-item.active {
    color: var(--green);
    font-weight: 700;
  }

  .tab-item.active .tab-icon {
    stroke-width: 2.3;
  }

  .tab-icon {
    width: 20px;
    height: 20px;
    transition: stroke-width 0.15s;
  }

  .tab-label {
    font-size: 11.5px;
    line-height: 1.1;
    letter-spacing: -0.1px;
    white-space: nowrap;
  }

  .icon-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .cart-badge {
    position: absolute;
    top: -5px;
    right: -10px;
    background: var(--orange);
    color: #fff;
    font-size: 10.5px;
    font-weight: 800;
    min-width: 17px;
    height: 17px;
    line-height: 17px;
    border-radius: 999px;
    padding: 0 4px;
    text-align: center;
  }

  .dot-badge {
    position: absolute;
    top: -2px;
    right: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--orange);
    box-shadow: 0 0 0 2px #fff;
  }
}
</style>
