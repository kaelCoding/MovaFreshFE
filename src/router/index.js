import { createRouter, createWebHistory } from 'vue-router';
import StoreView from '../views/StoreView.vue';
import DashboardView from '../views/DashboardView.vue';

const routes = [
  {
    path: '/',
    name: 'store',
    component: StoreView
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView
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
