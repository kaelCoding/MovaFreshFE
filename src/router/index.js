import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import DashboardView from '../views/DashboardView.vue';
import PlansView from '../views/PlansView.vue';
import QrTraceView from '../views/QrTraceView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/plans',
    name: 'plans',
    component: PlansView
  },
  {
    path: '/account',
    name: 'account',
    component: DashboardView
  },
  {
    path: '/dashboard',
    redirect: '/account'
  },
  {
    // Trang mở khi quét QR trên hộp. Không cần đăng nhập.
    path: '/q/:code',
    name: 'trace',
    component: QrTraceView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      };
    }
    return { top: 0, behavior: 'smooth' };
  }
});

export default router;
