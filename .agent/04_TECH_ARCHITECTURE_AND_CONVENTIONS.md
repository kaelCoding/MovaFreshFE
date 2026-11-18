# 04. KIẾN TRÚC KỸ THUẬT & QUY CHUẨN LẬP TRÌNH (TECH SPEC)

> **Tài liệu đặc tả toàn bộ ngăn xếp công nghệ, kiến trúc Multi-Page App, quy chuẩn mã nguồn, kiểm thử và cấu trúc thư mục dự án.**
> Phiên bản: V2.2 | Cập nhật: 18/11/2026 | Tech Lead: Nguyễn Công Khôi
> Repository: `github.com/movafresh-vn/movafresh-web` | Branch: `feat/v2-customer-and-ops-apps`
> Production URL: `https://movafresh-web.netlify.app`

---

## 1. TECH STACK V2.2 HIỆN TẠI

- **Kiến trúc ứng dụng:** **Multi-Page Application (MPA)** đóng gói 2 app riêng biệt trong cùng 1 repository:
  1. **App Khách hàng (`index.html`):** Sử dụng `vue-router` chế độ HTML5 History (`createWebHistory`), gồm Landing Page (`/`), Phễu onboarding khảo sát & đăng ký gói (`/plans`), Bảng điều khiển tài khoản & thực đơn (`/account`), và Cổng tra cứu nguồn gốc nông sản theo lô (`/q/:code`).
  2. **App Vận hành (`ops.html`):** Ứng dụng nội bộ cho 8 vai trò phân quyền qua mã PIN, sử dụng hash router (`#/factory`, `#/workshop`, `#/procurement`, `#/supplier`, `#/logistics`, `#/hub`, `#/shipper`, `#/finance`).
- **Frontend Framework:** **Vue 3** (100% sử dụng **Composition API** với cú pháp `<script setup>`).
- **Build Tool:** **Vite 6** (`@vitejs/plugin-vue`) với cấu hình `rollupOptions.input` đa cổng vào (`main` & `ops`).
- **State Management:** **Pinia** kết hợp lưu trữ cục bộ `localStorage` & phát đồng bộ realtime qua `BroadcastChannel`.
- **Test Runner:** **Vitest** với 10 suites kiểm thử tự động, **256 unit tests** bao phủ 100% logic miền và API mock (`npm test`).
- **Styling:** CSS thuần hiện đại (Modern Vanilla CSS) dựa trên hệ thống biến toàn cục `:root` đặt tại `src/assets/styles/main.css` và `src/ops/styles/ops.css`.
- **Deployment & CI/CD:**
  - Repo GitHub: [`github.com/movafresh-vn/movafresh-web`](https://github.com/movafresh-vn/movafresh-web).
  - Nhánh phát triển V2 chính thức: **`feat/v2-customer-and-ops-apps`**.
  - Hosting: **Netlify** liên kết CI/CD với nhánh `feat/v2-customer-and-ops-apps`, production URL: [https://movafresh-web.netlify.app](https://movafresh-web.netlify.app).
  - Biến môi trường: `VITE_SHOW_DEMO_PINS` cho `/ops.html` (mặc định ẩn danh sách mã PIN demo trên production).

---

## 2. HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM) & QUY CHUẨN GIAO DIỆN

Hệ thống giao diện của MOVA Fresh được thiết kế theo trường phái **Warm Light Mode** (ấm cúng, sạch sẽ, mang hơi thở thiên nhiên và mâm cơm gia đình):

### A. Bảng mã màu chủ đạo (CSS Variables)
Định nghĩa tại `src/assets/styles/main.css`:

```css
:root {
  --bg: #FAF9F5;          /* Nền tổng thể: Trắng ngà ấm */
  --card: #FFFFFF;        /* Nền thẻ nội dung */
  --line: #E6E2D6;        /* Đường kẻ viền phân cách */
  --ink: #1E241D;         /* Màu chữ chính: Đen rêu than đậm */
  --muted: #626B60;       /* Chữ phụ, mô tả */
  
  /* Màu thương hiệu & Điểm nhấn */
  --green: #146C43;       /* Xanh lá đậm nông sản Tây Nguyên (Primary Action, Brand) */
  --green-d: #0F5534;     /* Xanh lá đậm khi hover button */
  --green-soft: #E4F0E8;  /* Nền xanh nhạt cho badge, tag */
  --orange: #D9531E;      /* Cam gốm / ớt lửa (Accent, CTA nổi bật) */
  --orange-soft: #FCEDE4; /* Nền cam nhạt */
  --orange-ink: #A33C12;  /* Chữ cam đậm */
  
  /* Màu hỗ trợ ẩm thực */
  --wood: #E9D9BF;        /* Màu gỗ tự nhiên */
  --butter: #FBF1D6;      /* Vàng bơ béo ngậy */
  --red: #B3261E;         /* Đỏ cảnh báo */
  --blue: #1D6FA5;        /* Xanh dương thông tin vận chuyển */
}
```

### B. Typography & Định dạng số
- **Font chữ chính:** `"Be Vietnam Pro", system-ui, -apple-system, sans-serif`. Nạp trực tiếp qua Google Fonts tại `index.html` và `ops.html`.
- **Hiển thị tiền tệ:** Mọi con số liên quan đến tài chính, tiền tệ, số lượng bữa ăn **BẮT BUỘC** có:
  ```css
  font-variant-numeric: tabular-nums;
  ```
- **Hàm format tiền tệ chuẩn:** Luôn dùng `fmt(amount)` trong `src/shared/utils/formatters.js` để hiển thị `1.500.000 đ`.

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN THỰC TẾ (PROJECT DIRECTORY TREE)

```
movafresh-web/
├── .agent/                             # Toàn bộ tài liệu nghiệp vụ, kiến trúc & roadmap cho AI
│   ├── 01_PRODUCT_SOUL_AND_BUSINESS_MODEL.md
│   ├── 02_USER_FLOW_AND_UX_SPEC.md
│   ├── 03_OPERATIONS_FACTORY_AND_AGENTS.md
│   ├── 04_TECH_ARCHITECTURE_AND_CONVENTIONS.md
│   ├── 05_PROGRESS_AND_ROADMAP.md
│   └── 06_MEETING_DECISIONS_LOG.md
├── AGENTS.md                           # Chỉ thị khởi động & danh sách cấm bắt buộc cho AI
├── index.html                          # Entry HTML cho Web Khách Hàng
├── ops.html                            # Entry HTML cho Web Vận Hành 8 Vai Trò
├── netlify.toml                        # Cấu hình Netlify redirects (/ops -> /ops.html, /* -> /index.html)
├── package.json                        # Cấu hình dependencies & test scripts
├── vite.config.js                      # Cấu hình Vite build multi-input & Vitest
└── src/
    ├── main.js                         # Entry point App Khách Hàng (Vue Router + Pinia)
    ├── App.vue                         # Root component Web Khách
    ├── router/                         # Vue Router cho Web Khách (/, /plans, /account, /q/:code)
    ├── stores/                         # Pinia stores: usePlanFlowStore, useMovaStore
    ├── views/                          # Các View màn hình chính: HomeView, PlansView, DashboardView, QrTraceView
    ├── components/
    │   ├── common/                     # AppHeader, AppFooter, VietQrSvg, NotificationDrawer...
    │   ├── store/                      # HeroSection, MealKitVideoHook, SampleMeals, HowItWorks...
    │   ├── plans/                      # StepAbout, StepMenu, StepCheckout, StepDone, MealCard, PriceBlock...
    │   └── dashboard/                  # ActiveOrderTab, MealChangeSheet, ProfileTab, RewardsTab...
    ├── ops/                            # Ứng dụng Vận hành 8 vai trò (/ops.html)
    │   ├── main.js                     # Entry point Ops
    │   ├── OpsApp.vue                  # Root layout Ops, chuyển đổi vai trò qua PIN
    │   ├── views/                      # Màn hình: TodayView, PoView, LoadView, FinanceView, ShipperView...
    │   └── styles/ops.css              # Theme CSS chuyên biệt cho bảng vận hành
    └── shared/                         # Thư mục dùng chung (Single Source of Truth)
        ├── config/
        │   └── business.js             # Cấu hình Unit Economics, timings, limits, zones
        ├── data/
        │   ├── catalog.js              # 18 SKU thô, 8 túi xốt, 21 món Terroir & 10 AI Personas
        │   ├── packaging.js            # Quy cách bao bì thùng cách nhiệt & khay hút chân không
        │   ├── recipes.js              # 21 công thức 3 bước 15 phút (chuẩn Grand Frais)
        │   └── sources.js              # Bản đồ nông trại đối tác Đắk Lắk & Vũng Tàu
        ├── domain/                     # Logic nghiệp vụ thuần túy (Subscription, Credit, Logistics, Finance)
        ├── api/                        # Client API & Mock handlers (customer, factory, logistics, finance...)
        ├── mock-server/                # In-memory Database mô phỏng Backend thực tế
        └── __tests__/                  # 10 test suites Vitest với 256 unit tests
```
