# 04. KIẾN TRÚC KỸ THUẬT & QUY CHUẨN LẬP TRÌNH (TECH SPEC)

> **Tài liệu đặc tả toàn bộ ngăn xếp công nghệ, quy chuẩn mã nguồn, thiết kế giao diện và cấu trúc thư mục hiện hành.**
> Cập nhật: 15/11/2026 | Tech Lead: Nguyễn Công Khôi

---

## 1. TECH STACK HIỆN TẠI

- **Frontend Framework:** **Vue 3** (100% sử dụng **Composition API** với cú pháp `<script setup>`).
- **Build Tool:** **Vite 6** (`@vitejs/plugin-vue`).
- **State Management:** **Pinia 3** (`src/stores/useMovaStore.js`) với cơ chế tự động đồng bộ hóa trạng thái vào `localStorage` (`mova_fresh_v1_state`).
- **Routing:** **Vue Router 4** (`createWebHistory`, các route chính: `/` cho StoreView và `/dashboard` cho DashboardView).
- **Styling:** CSS thuần hiện đại (Modern Vanilla CSS) dựa trên hệ thống biến toàn cục `:root` đặt tại `src/assets/styles/main.css`. Không sử dụng Tailwind hay UI framework nặng nề bên thứ 3 nhằm đảm bảo tốc độ tải trang tức thì (< 1s).
- **Deployment & CI/CD:**
  - Kho lưu trữ: GitHub [`kaelCoding/MovaFreshFE`](https://github.com/kaelCoding/MovaFreshFE) (nhánh `main`).
  - Hosting tự động: **Netlify** liên kết CI/CD với GitHub, tự động build và deploy tại production URL: [https://movafresh.netlify.app](https://movafresh.netlify.app).

---

## 2. HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM) & QUY CHUẨN GIAO DIỆN

Hệ thống giao diện của MOVA Fresh được thiết kế theo trường phái **Warm Light Mode** (ấm cúng, sạch sẽ, mang hơi thở thiên nhiên và mâm cơm gia đình):

### A. Bảng mã màu chủ đạo (CSS Variables)
Định nghĩa tại `src/assets/styles/main.css`:

```css
:root {
  --bg: #FAF9F5;          /* Nền tổng thể: Trắng ngà ấm, không dùng trắng tinh #FFF gây mỏi mắt */
  --card: #FFFFFF;        /* Nền thẻ nội dung */
  --line: #E6E2D6;        /* Đường kẻ viền phân cách */
  --line-2: #EFEBE0;      /* Đường kẻ viền phụ mờ */
  --ink: #1E241D;         /* Màu chữ chính: Đen rêu than đậm, tương phản cao */
  --muted: #626B60;       /* Chữ phụ, mô tả mờ */
  
  /* Màu thương hiệu & Điểm nhấn */
  --green: #146C43;       /* Xanh lá đậm nông sản Tây Nguyên (Primary Action, Brand) */
  --green-d: #0F5534;     /* Xanh lá đậm khi hover button */
  --green-soft: #E4F0E8;  /* Nền xanh nhạt cho badge, tag */
  --orange: #D9531E;      /* Cam gốm / ớt lửa (Accent, CTA nổi bật, Sale tag) */
  --orange-soft: #FCEDE4; /* Nền cam nhạt */
  --orange-ink: #A33C12;  /* Chữ cam đậm */
  
  /* Màu hỗ trợ ẩm thực */
  --wood: #E9D9BF;        /* Màu gỗ tự nhiên */
  --butter: #FBF1D6;      /* Vàng bơ béo ngậy */
  --red: #B3261E;         /* Đỏ cảnh báo, hết hàng, hủy đơn */
  --blue: #1D6FA5;        /* Xanh dương thông tin, trạng thái giao vận */
  --blue-soft: #E5F2FB;   /* Nền xanh dương nhạt */
}
```

### B. Typography & Định dạng số
- **Font chữ chính:** `"Be Vietnam Pro", system-ui, -apple-system, sans-serif`. Được nạp trực tiếp qua Google Fonts tại `index.html`.
- **Hiển thị tiền tệ:** Mọi con số liên quan đến tài chính, tiền tệ, số lượng bữa ăn, phần trăm chiết khấu **BẮT BUỘC** phải có thuộc tính CSS:
  ```css
  font-variant-numeric: tabular-nums;
  ```
  giúp các chữ số có độ rộng bằng nhau tuyệt đối, tránh hiện tượng nhảy layout khi số tăng giảm.
- **Hàm format tiền tệ chuẩn:** Luôn dùng `formatVnd(amount)` trong `src/utils/formatters.js` để hiển thị định dạng `1.500.000 đ`.

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT DIRECTORY TREE)

```
movaFresh/
├── .agent/                             # Toàn bộ tài liệu nghiệp vụ, kiến trúc & roadmap cho AI
│   ├── 01_PRODUCT_SOUL_AND_BUSINESS_MODEL.md
│   ├── 02_USER_FLOW_AND_UX_SPEC.md
│   ├── 03_OPERATIONS_FACTORY_AND_AGENTS.md
│   ├── 04_TECH_ARCHITECTURE_AND_CONVENTIONS.md
│   ├── 05_PROGRESS_AND_ROADMAP.md
│   └── 06_MEETING_DECISIONS_LOG.md
├── AGENTS.md                           # Chỉ thị khởi động & danh sách cấm bắt buộc cho AI
├── index.html                          # Entry HTML nạp Be Vietnam Pro font & favicon
├── netlify.toml                        # Cấu hình Netlify SPA redirect
├── package.json                        # Cấu hình dependencies & script
├── vite.config.js                      # Cấu hình Vite & plugin Vue
└── src/
    ├── main.js                         # Khởi tạo Vue app, Pinia và Vue Router
    ├── App.vue                         # Root component, quản lý Modal layer & Toast layer
    ├── router/
    │   └── index.js                    # Vue Router định nghĩa / và /dashboard
    ├── stores/
    │   └── useMovaStore.js             # Pinia store duy nhất quản lý Cart, Credit, Orders, Schedule
    ├── data/
    │   └── mockData.js                 # Dữ liệu mẫu (món ăn, gói trả trước, danh mục)
    ├── assets/
    │   └── styles/
    │       └── main.css                # CSS design system toàn cục
    ├── utils/
    │   ├── formatters.js               # Hàm formatVnd, formatDate, formatShortDate
    │   └── schedule.js                 # Tiện ích tính toán lịch giao hàng
    ├── views/
    │   ├── StoreView.vue               # Trang chủ giới thiệu sản phẩm & chọn món
    │   └── DashboardView.vue           # Trang quản lý khách hàng, gói trả trước & lịch giao
    └── components/
        ├── common/                     # Component dùng chung toàn app
        │   ├── AppHeader.vue           # Thanh điều hướng trên cùng, hiển thị số dư Fresh Credit
        │   ├── AppFooter.vue           # Chân trang giới thiệu nguồn gốc Đắk Lắk
        │   ├── ToastMessage.vue        # Thông báo Toast góc màn hình
        │   ├── NotificationDrawer.vue  # Drawer thông báo đẩy
        │   ├── FloatingZaloBtn.vue     # Nút liên hệ nhanh Zalo CSKH
        │   ├── MobileCartBar.vue       # Thanh giỏ hàng nổi trên màn hình di động
        │   ├── VietQrSvg.vue           # Component sinh mã QR VietQR động
        │   └── DishPlateSvg.vue        # SVG đồ họa minh họa đĩa thức ăn
        ├── store/                      # Các thành phần giao diện của StoreView
        │   ├── HeroSection.vue         # Hero banner giới thiệu định vị
        │   ├── BudgetPlanner.vue       # Công cụ tính ngân sách & số người ăn
        │   ├── DishCard.vue            # Thẻ hiển thị từng món ăn
        │   ├── BoxInsideSection.vue    # Khám phá thành phần bên trong hộp Meal-kit
        │   ├── AddonsSection.vue       # Món ăn kèm, tráng miệng
        │   ├── JourneySection.vue      # Hành trình từ nông trại Đắk Lắk đến bàn ăn
        │   ├── FaqSection.vue          # Câu hỏi thường gặp
        │   └── StickyCart.vue          # Giỏ hàng ghim bên phải màn hình desktop
        ├── dashboard/                  # Các Tab của trang Dashboard
        │   ├── DashHeader.vue          # Header thông tin người dùng, số dư ví Fresh Credit
        │   ├── ActiveOrderTab.vue      # Đơn hàng đang giao, trạng thái lộ trình xe lạnh
        │   ├── PrepaidPlanTab.vue      # Quản lý gói nạp Fresh Credit và chiết khấu
        │   ├── OrderHistoryTab.vue     # Lịch sử các bữa ăn đã hoàn thành
        │   └── ProfileAddressTab.vue   # Địa chỉ nhận hàng & thiết lập khung giờ giao
        └── modals/                     # Hệ thống hộp thoại tương tác
            ├── DishDetailModal.vue     # Chi tiết món, dinh dưỡng, nguyên liệu
            ├── TopupModal.vue          # Nạp Fresh Credit (chuyển khoản VietQR)
            ├── CheckoutModal.vue       # Thanh toán đơn hàng qua Fresh Credit
            ├── OrderSuccessModal.vue   # Chúc mừng đặt hàng thành công
            ├── AddressModal.vue        # Chỉnh sửa địa chỉ nhận hàng
            ├── RefundModal.vue         # Hỗ trợ yêu cầu đổi trả / khiếu nại
            └── LoginDemoModal.vue      # Giả lập đăng nhập nhanh cho testing
```

---

## 4. QUY ƯỚC LẬP TRÌNH BẮT BUỘC (CODING CONVENTIONS)

1. **Nguyên tắc Vue 3:**
   - 100% sử dụng `<script setup>` với cú pháp Composition API.
   - Luôn sử dụng `ref()`, `computed()`, `watch()` rõ ràng; tránh dùng `reactive()` bừa bãi gây mất tính phản ứng khi destructure.
2. **Quy chuẩn Props & Emits:**
   - Sử dụng `defineProps<{ ... }>()` hoặc `defineProps({ ... })` có định nghĩa kiểu dữ liệu và giá trị mặc định `default`.
   - Sử dụng `defineEmits(['event-name'])` tường minh.
3. **Quy chuẩn Naming:**
   - Component: PascalCase (Ví dụ: `MealPlanSelector.vue`, `CreditCardModal.vue`).
   - Store: `use<Name>Store.js` (Ví dụ: `useMovaStore.js`).
   - CSS Class: Kebab-case ngữ nghĩa theo khối BEM đơn giản (Ví dụ: `.mova-hero`, `.mova-hero__badge`, `.btn-primary`).
4. **Không phụ thuộc thư viện ngoài không cần thiết:**
   - Ưu tiên Vanilla JS/CSS cho animations, modal dialogs, date helpers.
   - Mọi icon dùng SVG inline hoặc SVG component sạch, không cài thư viện icon trọn gói vài MB.
