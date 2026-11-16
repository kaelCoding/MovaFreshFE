import { createRouter, createWebHashHistory } from 'vue-router';
import LoginView from './views/LoginView.vue';
import HomeView from './views/HomeView.vue';
import ModuleView from './views/ModuleView.vue';
import DemoView from './views/DemoView.vue';
import PlanView from './views/PlanView.vue';
import WorkshopLayout from './views/workshop/WorkshopLayout.vue';
import { MODULES } from './modules';
import { session } from './session';
import { ROLES } from '../shared/config/roles';

// Màn thật đã làm: tổng quan (tạm), kế hoạch (P2A), xưởng (P2A). Các phân hệ còn lại là trang xem trước dữ liệu cho P2B-P2D.
const COMPONENTS = { overview: HomeView, plan: PlanView };

const workshopChildren = [
  { path: '', name: 'workshop', component: () => import('./views/workshop/TodayView.vue') },
  { path: '7-ngay', name: 'workshop-week', component: () => import('./views/workshop/WeekView.vue') },
  { path: 'nhan-nguyen-lieu', name: 'workshop-receive', component: () => import('./views/workshop/ReceiveView.vue') },
  { path: 'dong-goi', name: 'workshop-pack', component: () => import('./views/workshop/PackView.vue') },
  { path: 'xuat-xe', name: 'workshop-load', component: () => import('./views/workshop/LoadView.vue') },
  { path: 'bao-thieu', name: 'workshop-shortage', component: () => import('./views/workshop/ShortageView.vue') }
];

const moduleRoutes = MODULES.filter((m) => m.name !== 'demo').map((m) =>
  m.name === 'workshop'
    ? { path: m.path, component: WorkshopLayout, meta: { module: m }, children: workshopChildren }
    : { path: m.path, name: m.name, component: COMPONENTS[m.name] || ModuleView, meta: { module: m } }
);

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/demo', name: 'demo', component: DemoView, meta: { module: MODULES.find((m) => m.name === 'demo') } },
  ...moduleRoutes,
  { path: '/', redirect: () => (session.value ? ROLES[session.value.role].home : '/login') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

// App vận hành dùng hash history để không cần cấu hình lại redirect của Netlify.
const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to) => {
  if (to.name === 'login') return session.value ? '/' : true;
  if (!session.value) return '/login';
  const mod = to.meta.module;
  if (mod && !mod.roles.includes(session.value.role)) return '/';
  return true;
});

export default router;
