import { createRouter, createWebHashHistory } from 'vue-router';
import LoginView from './views/LoginView.vue';
import HomeView from './views/HomeView.vue';
import ModuleView from './views/ModuleView.vue';
import DemoView from './views/DemoView.vue';
import { MODULES } from './modules';
import { session } from './session';
import { ROLES } from '../shared/config/roles';

const moduleRoutes = MODULES.filter((m) => m.name !== 'demo').map((m) => ({
  path: m.path,
  name: m.name,
  component: m.name === 'overview' ? HomeView : ModuleView,
  meta: { module: m }
}));

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
