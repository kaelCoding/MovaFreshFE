import { createRouter, createWebHashHistory } from 'vue-router';
import LoginView from './views/LoginView.vue';
import HomeView from './views/HomeView.vue';
import ModuleView from './views/ModuleView.vue';
import DemoView from './views/DemoView.vue';
import PlanView from './views/PlanView.vue';
import WorkshopLayout from './views/workshop/WorkshopLayout.vue';
import PurchasingLayout from './views/purchasing/PurchasingLayout.vue';
import HubLayout from './views/hub/HubLayout.vue';
import SupplierPortalView from './views/supplier/SupplierPortalView.vue';
import { MODULES } from './modules';
import { session } from './session';
import { ROLES } from '../shared/config/roles';

// Màn thật đã làm: tổng quan (tạm), kế hoạch (P2A), xưởng (P2A). Các phân hệ còn lại là trang xem trước dữ liệu cho P2B-P2D.
const COMPONENTS = { overview: HomeView, plan: PlanView, supplier: SupplierPortalView };

const workshopChildren = [
  { path: '', name: 'workshop', component: () => import('./views/workshop/TodayView.vue') },
  { path: '7-ngay', name: 'workshop-week', component: () => import('./views/workshop/WeekView.vue') },
  { path: 'nhan-nguyen-lieu', name: 'workshop-receive', component: () => import('./views/workshop/ReceiveView.vue') },
  { path: 'dong-goi', name: 'workshop-pack', component: () => import('./views/workshop/PackView.vue') },
  { path: 'xuat-xe', name: 'workshop-load', component: () => import('./views/workshop/LoadView.vue') },
  { path: 'bao-thieu', name: 'workshop-shortage', component: () => import('./views/workshop/ShortageView.vue') }
];

// P2B: mua hàng (đơn mua, nhà cung cấp, SKU, bảng giá, dự báo, công nợ, mua trực tiếp, cài đặt) và kho phụ (nhận hàng, tồn kho, truy xuất, thu hồi)
const purchasingChildren = [
  { path: '', name: 'purchasing', component: () => import('./views/purchasing/PoView.vue') },
  { path: 'nha-cung-cap', name: 'purchasing-suppliers', component: () => import('./views/purchasing/SuppliersView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'sku', name: 'purchasing-sku', component: () => import('./views/purchasing/SkuView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'bang-gia', name: 'purchasing-prices', component: () => import('./views/purchasing/PricesView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'du-bao', name: 'purchasing-forecast', component: () => import('./views/purchasing/ForecastView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'cong-no', name: 'purchasing-payables', component: () => import('./views/purchasing/PayablesView.vue') },
  { path: 'mua-truc-tiep', name: 'purchasing-direct', component: () => import('./views/purchasing/DirectBuyView.vue'), meta: { roles: ['purchasing', 'admin'] } },
  { path: 'cai-dat', name: 'purchasing-settings', component: () => import('./views/purchasing/SettingsView.vue') }
];

const hubChildren = [
  { path: '', name: 'hub', component: () => import('./views/hub/ReceiveGoodsView.vue') },
  { path: 'ton-kho', name: 'hub-stock', component: () => import('./views/hub/StockView.vue') },
  { path: 'truy-xuat', name: 'hub-trace', component: () => import('./views/hub/TraceView.vue') },
  { path: 'thu-hoi', name: 'hub-recall', component: () => import('./views/hub/RecallView.vue') }
];

const LAYOUTS = { workshop: [WorkshopLayout, workshopChildren], purchasing: [PurchasingLayout, purchasingChildren], hub: [HubLayout, hubChildren] };

const moduleRoutes = MODULES.filter((m) => m.name !== 'demo').map((m) =>
  LAYOUTS[m.name]
    ? { path: m.path, component: LAYOUTS[m.name][0], meta: { module: m }, children: LAYOUTS[m.name][1] }
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
  // Màn con có thể hẹp quyền hơn phân hệ (ví dụ kế toán chỉ xem PO, công nợ, cài đặt)
  const sub = to.matched.map((r) => r.meta && r.meta.roles).filter(Boolean).pop();
  if (sub && !sub.includes(session.value.role)) return '/';
  return true;
});

export default router;
