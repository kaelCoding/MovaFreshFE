<template>
  <header class="hdr">
    <div class="wrap">
      <!-- Logo + Nhãn TP.HCM tích hợp gọn -->
      <router-link to="/" class="logo" aria-label="MOVA FRESH, về đầu trang">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <rect width="40" height="40" rx="11" fill="#146C43"/>
          <path d="M10 27V14l6 8 4-6 4 6 6-8v13" fill="none" stroke="#FAF9F5" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="30" cy="11" r="3.2" fill="#D9531E"/>
        </svg>
        <div class="logo-text">
          <b>MOVA <span>FRESH</span></b>
          <span class="city-tag">TP.HCM</span>
        </div>
      </router-link>

      <!-- Ở giữa: Segmented Tabs (Desktop) -->
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
          <span class="lbl">Cửa hàng</span>
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
          <span class="lbl">Đơn của tôi</span>
          <span v-if="store.activeOrder" class="badge-dot" title="Có đơn đang xử lý"></span>
        </router-link>
      </nav>

      <!-- Bên phải: cụm Hồ sơ AI & Tiện ích -->
      <div class="hdr-r">
        <!-- 0. Hồ sơ AI tóm tắt & nút Sửa hồ sơ AI -->
        <div v-if="store.onboardingProfile?.isCompleted" class="ai-profile-strip">
          <span class="ai-summary-text">{{ aiProfileText }}</span>
          <button class="btn-edit-ai" @click="store.openOnboarding" aria-label="Sửa hồ sơ AI">
            Sửa hồ sơ AI
          </button>
        </div>
        <button
          v-else
          class="btn-setup-ai"
          @click="store.openOnboarding"
          aria-label="Thiết lập hồ sơ AI nhận 20k Fresh Credit"
        >
          <span class="pill-spark">✨</span>
          <span>Thiết lập Hồ sơ AI (+20k)</span>
        </button>

        <!-- 1. Nút Chuông Thông Báo -->
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

        <!-- 2. Nút Tài khoản -->
        <button
          v-if="!(store.user?.isLoggedIn || store.currentUser?.isLoggedIn)"
          class="btn sm primary login-hdr-btn"
          @click="store.openModal('login')"
        >
          Đăng nhập
        </button>

        <button
          v-else
          class="user-btn"
          @click="store.openModal('login')"
          aria-label="Thông tin tài khoản"
        >
          <span class="avatar">{{ userAvatar }}</span>
          <span class="uname-line">{{ userLineText }}</span>
        </button>

        <!-- 3. Nút Giỏ Hàng (Ẩn trên mobile vì đã có Bottom Nav) -->
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

// Tóm tắt hồ sơ AI: "4 người • 5 bữa/tuần • Giảm mỡ"
const aiProfileText = computed(() => {
  const p = store.onboardingProfile;
  if (!p) return 'Hồ sơ AI';
  const size = p.householdSize ? `${p.householdSize} người` : '2 người';
  const meals = p.mealsPerWeek ? `${p.mealsPerWeek} bữa/tuần` : '5 bữa/tuần';

  const goalMap = {
    balanced: 'Cân bằng',
    muscle: 'Tăng cơ',
    low_carb: 'Giảm mỡ',
    diabetic: 'Tiểu đường',
    easy_digest: 'Dễ tiêu'
  };

  const firstGoal = (p.healthGoal && p.healthGoal[0]) ? (goalMap[p.healthGoal[0]] || 'Cân bằng') : 'Cân bằng';
  return `${size} • ${meals} • ${firstGoal}`;
});

const userAvatar = computed(() => {
  return (store.user.name || 'U').charAt(0);
});

// Hiển thị gọn 1 dòng duy nhất: "Chị Lan • 850k" hoặc "Anh Minh • 30k"
const userLineText = computed(() => {
  const rawName = store.user.name.replace(/\(.*?\)/g, '').trim();
  const balK = Math.round(store.user.prepaidBalance / 1000) + 'k';
  return `${rawName} • ${balK}`;
});

// Giỏ hàng hiển thị 1 dòng nowrap: "0 bữa" hoặc "2 bữa • 307k"
const cartText = computed(() => {
  const c = store.calcAll;
  if (!c.meals) return '0 bữa';
  return `${c.meals} bữa • ${fmt(c.total)}`;
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
  justify-content: space-between;
  gap: 12px;
  height: 68px;
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

.logo-text {
  display: flex;
  align-items: center;
  gap: 6px;
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

.city-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--green);
  background: var(--green-soft);
  padding: 2px 6px;
  border-radius: 6px;
  white-space: nowrap;
}

/* Nav segmented tabs */
.nav-views {
  display: flex;
  background: var(--line-2);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  flex-shrink: 0;
}

.nav-tab {
  border: 0;
  background: none;
  border-radius: 9px;
  padding: 7px 14px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
  text-decoration: none;
  transition: .15s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
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
  flex-shrink: 0;
}

/* Header right */
.hdr-r {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.icon-btn {
  position: relative;
  width: 38px;
  height: 38px;
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
  width: 17px;
  height: 17px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 2px solid var(--bg);
}

.login-hdr-btn {
  padding: 7px 14px;
  font-size: 13px;
  white-space: nowrap;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 12px;
  padding: 6px 11px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.user-btn:hover {
  background: var(--line-2);
}

.user-btn .avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--green-soft);
  color: var(--green);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 11.5px;
  flex-shrink: 0;
}

.uname-line {
  white-space: nowrap;
  font-size: 13px;
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
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}

/* AI Profile Pill in Header */
.ai-profile-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 5px 10px;
  font-size: 12.5px;
  white-space: nowrap;
}

.ai-summary-text {
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.btn-edit-ai {
  border: 0;
  background: var(--green-soft);
  color: var(--green);
  font-weight: 700;
  font-size: 11.5px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-edit-ai:hover {
  background: var(--green);
  color: #fff;
}

.btn-setup-ai {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--orange-soft);
  border: 1.5px solid var(--orange);
  color: var(--orange-ink);
  font-weight: 700;
  font-size: 12.5px;
  padding: 6px 11px;
  border-radius: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-setup-ai:hover {
  background: var(--orange);
  color: #fff;
}

.pill-spark {
  font-size: 13px;
}

/* Mobile responsive (<= 768px): clean App style */
@media (max-width: 768px) {
  .hdr .wrap {
    height: 60px;
    padding: 0 14px;
  }
  .nav-views {
    display: none;
  }
  .cartbtn {
    display: none;
  }
  .city-tag {
    display: none;
  }
  .ai-summary-text {
    display: none;
  }
  .ai-profile-strip {
    padding: 4px 6px;
  }
  .btn-edit-ai {
    font-size: 11px;
    padding: 3px 6px;
  }
  .btn-setup-ai {
    font-size: 11px;
    padding: 5px 8px;
  }
}
</style>
