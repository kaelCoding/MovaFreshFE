<template>
  <header class="hdr">
    <div class="wrap">
      <router-link to="/" class="logo" aria-label="MOVA FRESH, về đầu trang">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <rect width="40" height="40" rx="11" fill="#146C43"/>
          <path d="M10 27V14l6 8 4-6 4 6 6-8v13" fill="none" stroke="#FAF9F5" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="30" cy="11" r="3.2" fill="#D9531E"/>
        </svg>
        <b>MOVA <span>FRESH</span></b>
      </router-link>

      <!-- Chuyển đổi màn hình chính -->
      <nav class="nav-views" role="tablist" aria-label="Màn hình chính">
        <router-link
          to="/"
          class="nav-tab"
          :class="{ active: route.path === '/' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span class="lbl">Cửa hàng & Thực đơn</span>
        </router-link>
        <router-link
          to="/dashboard"
          class="nav-tab"
          :class="{ active: route.path === '/dashboard' }"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="7" r="4"/>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          </svg>
          <span class="lbl">Tài khoản & Đơn của tôi</span>
          <span v-if="store.activeOrder" class="badge-dot" title="Có đơn đang xử lý"></span>
        </router-link>
      </nav>

      <div class="hdr-r">
        <span class="area">Giao tại TP.HCM</span>

        <!-- Nút Chuông Thông Báo -->
        <button
          class="icon-btn"
          @click="store.notifDrawerOpen = true"
          aria-label="Thông báo thời gian thực"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span v-if="store.unreadNotifsCount > 0" class="badge-num">
            {{ store.unreadNotifsCount }}
          </span>
        </button>

        <!-- Nút Tài khoản & Số dư -->
        <button
          class="user-btn"
          @click="store.openModal('login')"
          aria-label="Thông tin tài khoản"
        >
          <span class="avatar">{{ store.user.name.charAt(0) }}</span>
          <span class="uname">{{ store.user.name }}</span>
          <span class="plan-pill num">{{ Math.round(store.user.prepaidBalance / 1000) }}k</span>
        </button>

        <!-- Nút Giỏ Hàng -->
        <button class="cartbtn" @click="handleCartClick" aria-label="Mở giỏ hàng">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/>
            <path d="M9 8V6a3 3 0 0 1 6 0v2"/>
          </svg>
          <span class="num">{{ cartText }}</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../utils/formatters';

const store = useMovaStore();
const route = useRoute();
const router = useRouter();

const cartText = computed(() => {
  const c = store.calcAll;
  return c.meals ? `${c.meals} bữa, ${fmt(c.total)}` : '0 bữa';
});

const handleCartClick = async () => {
  if (window.matchMedia('(max-width:980px)').matches) {
    store.mobileCartOpen = true;
  } else {
    if (route.path !== '/') {
      await router.push('/');
    }
    setTimeout(() => {
      const el = document.getElementById('thuc-don');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
};
</script>

<style scoped>
.hdr {
  position: sticky;
  top: 0;
  z-index: 25;
  background: rgba(250, 249, 245, .95);
  backdrop-filter: saturate(1.2) blur(8px);
  -webkit-backdrop-filter: saturate(1.2) blur(8px);
  border-bottom: 1px solid var(--line);
}

.hdr .wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 70px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo svg {
  width: 36px;
  height: 36px;
}

.logo b {
  font-weight: 800;
  font-size: 18px;
  letter-spacing: .01em;
  color: var(--green);
}

.logo b span {
  color: var(--orange);
}

.nav-views {
  display: flex;
  background: var(--line-2);
  border-radius: 12px;
  padding: 4px;
  gap: 2px;
  margin-left: 8px;
}

.nav-tab {
  border: 0;
  background: none;
  border-radius: 9px;
  padding: 7px 13px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
  text-decoration: none;
  transition: .15s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-tab.active {
  background: var(--card);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(30, 25, 15, .1);
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--orange);
}

.hdr-r {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.area {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--green);
  background: var(--green-soft);
  border-radius: 999px;
  padding: 5px 10px;
  white-space: nowrap;
}

.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--card);
  display: grid;
  place-items: center;
  color: var(--ink);
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--line-2);
}

.badge-num {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--red);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 2px solid var(--bg);
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 12px;
  padding: 6px 11px;
  font-size: 13px;
  font-weight: 600;
}

.user-btn:hover {
  background: var(--line-2);
}

.user-btn .avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--green-soft);
  color: var(--green);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
}

.user-btn .plan-pill {
  background: var(--orange-soft);
  color: var(--orange-ink);
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
}

.cartbtn {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: var(--green);
  color: #fff;
  border-radius: 12px;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 13.5px;
  white-space: nowrap;
}

.cartbtn:hover {
  background: var(--green-d);
}

.cartbtn svg {
  width: 18px;
  height: 18px;
}

@media (max-width: 980px) {
  .hdr .wrap {
    gap: 8px;
  }
  .nav-tab .lbl {
    display: none;
  }
  .nav-tab {
    padding: 7px 9px;
  }
  .user-btn .plan-pill {
    display: none;
  }
}

@media (max-width: 640px) {
  .area {
    display: none;
  }
  .user-btn .uname {
    display: none;
  }
  .user-btn {
    padding: 6px;
  }
}
</style>
