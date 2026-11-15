# MOVA FRESH – Web-App Khách Hàng (Vue 3 + Vite + Pinia)

> Nền tảng đặt thực đơn nguyên liệu sơ chế sẵn (**Ready-to-Cook - RTC**) từ vùng nguyên liệu **Đắk Lắk & Tây Nguyên**, đóng thùng giữ nhiệt đá gel $-18^\circ\text{C}$ vận chuyển xe lạnh xuyên đêm (22:00 – 05:00) giao thẳng tới tận bếp tại **TP.HCM** trước 10:00 sáng. Chuẩn bữa cơm nhà tươi sạch: **15 phút – 1 chảo**.

---

## 🌟 Tính Năng Chính Của Dự Án

1. **Storefront & Giỏ Hàng Thông Minh:**
   - Cam kết giá neo: *"Chỉ từ 38.000đ / người • Thu hoạch & sơ chế theo đơn, không trữ hàng tồn lâu ngày"*.
   - Khung gỗ 3 món bán chạy tuần này có hiệu ứng khói nóng bốc lên (`.steam`).
   - Hai chế độ mua hàng: **Tự chọn theo món ngon** (Mode A) và **Soạn thực đơn theo ngân sách** (Mode B - tự động giải bài toán tối ưu tổ hợp món ăn vừa túi tiền).
   - Thanh tiến trình 3 mốc ưu đãi: `250k (Đủ đơn tối thiểu MOV)` $\rightarrow$ `400k (Giảm 20k VietQR)` $\rightarrow$ `600k + 4 bữa (Freeship & Tách 2 đợt giao)`.
   - Chọn đợt nhận hàng đầu tiên: `Sáng Chủ Nhật tới` hoặc `Sáng Thứ Tư tới`.
   - Sản phẩm mua thêm đi cùng xe lạnh (Add-ons): Trứng gà đồi, combo rau củ Đà Lạt, bơ sáp Đắk Lắk, chanh dây tươi.
   - Nút gạt quy cách nhà máy: **`Tách riêng gói sốt gia vị`** và **`Giảm 50% lượng tinh bột`**.

2. **User Dashboard (Tài Khoản & Đơn Của Tôi) — 4 Tab:**
   - **Tab 1: Đơn hàng đang chạy & Quản lý lịch giao:**
     - Công tắc mô phỏng thời gian thực: `Trước giờ chốt sổ 20:00` vs `Đã qua giờ chốt 20:00`.
     - Thanh theo dõi hành trình 4 bước từ Đắk Lắk về TP.HCM.
     - Hướng dẫn bảo quản khi nhận thùng hàng: phân loại món cất **Ngăn mát (0–2°C)** và món cất **Ngăn đông (−18°C)**.
     - Thao tác thực tế: Sửa/Thêm món (nạp lại đơn vào giỏ), Hoãn đợt giao (lưu cờ `delayed`), Hủy đơn (hoàn tiền 100% vào Gói Đi Chợ Trả Trước), Báo cáo độ tươi / Hoàn tiền ngay.
   - **Tab 2: Lịch sử đơn hàng & Đánh giá khẩu vị:**
     - 2 đơn mẫu đã giao thành công tuần trước.
     - Nút **`Đặt lại thực đơn này (1 chạm)`** đưa toàn bộ món cũ vào giỏ hàng.
     - Đánh giá nhanh: `👍 Vừa miệng`, `🧂 Hơi mặn`, `💧 Hơi nhạt`. Khi chọn *Hơi mặn*, hệ thống tự động ghi nhận và bật *"Tách riêng gói sốt gia vị"* cho lần đặt sau.
   - **Tab 3: Gói Đi Chợ Trả Trước (Prepaid Meal Plan):**
     - Thẻ thành viên VIP, số dư suất ăn, hạn sử dụng 60 ngày.
     - Tuân thủ minh bạch **Nghị định 52/2024/NĐ-CP** (giá trị bữa ăn chỉ đổi nguyên liệu MOVA, không phải ví điện tử, không rút tiền mặt).
     - Đăng ký / Nạp thêm gói (Gói 1tr nhận 1,05tr; Gói 2tr nhận 2,12tr) kèm mã VietQR và xác nhận cộng số dư ngay.
     - Sổ cái lịch sử biến động số dư chi tiết.
   - **Tab 4: Hồ sơ Gia đình, Sổ địa chỉ & Zalo OA:**
     - Sổ địa chỉ nhận hàng TP.HCM (Thêm, xóa, chọn mặc định).
     - Cài đặt khẩu vị gia đình (số người ăn, dị ứng, quy cách) tự động đồng bộ sang Cửa hàng.
     - Kết nối Zalo OA: Nhắc lịch chốt đơn trước 3 giờ + Khung xem trước tin nhắn Zalo OA trực quan. Nút *"Xác nhận thực đơn tuần này"* điều hướng mượt về Cửa hàng.

---

## 🛠️ 5 Lỗi Đã Được Vá Triệt Để Trong Bản Vue 3

1. **CSS `.okhead` cho Modal Đặt hàng thành công:** Đã bổ sung đầy đủ style với nền xanh rừng (`#146C43`), chữ trắng và nút đóng `×` màu trắng nổi bật, bo góc mượt mà.
2. **Sửa nút "Xác nhận thực đơn tuần này" (Zalo OA - Tab 4):** Sử dụng `router.push('/')` kết hợp `scrollIntoView({ behavior: 'smooth' })` cuộn chính xác xuống khu vực `#thuc-don`.
3. **Cập nhật trạng thái thực tế khi bấm "⏳ Hoãn đợt giao này":** Kích hoạt action `delayActiveOrder()`, cập nhật cờ `delayed = true`, đổi nhãn trạng thái sang *"Đã hoãn sang chuyến xe tuần kế tiếp — Bảo lưu 100% giá trị"*, đồng thời đẩy thông báo vào `notifications`.
4. **Khóa trần ngân sách cho cả sản phẩm mua thêm (Add-ons) khi ở Mode B:** Trong `tryChangeAddon()`, nếu khách ở Mode B và việc thêm addon làm tổng thanh toán vượt quá `budget`, hệ thống sẽ chặn lại và báo `toast()` cảnh báo số tiền vượt.
5. **Đồng bộ sạch dữ liệu khi chuyển sang "Demo Khách mới: Anh Minh":** Thiết lập địa chỉ tại *Căn hộ Landmark 4, Vinhomes Central Park, Bình Thạnh*, đặt `activeOrder = null`, và reset `ledger` chỉ gồm 1 dòng `+30.000đ Quà tặng thành viên mới`.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
mova-fresh-web/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions tự động build & deploy lên GitHub Pages
├── public/
│   ├── favicon.svg                 # Icon logo MOVA Fresh
│   └── 404.html                    # Fallback redirect cho Single Page App trên GitHub Pages
├── netlify.toml                    # Cấu hình redirect SPA chuẩn cho Netlify
├── src/
│   ├── assets/
│   │   └── styles/
│   │       └── main.css            # Toàn bộ CSS Variables (Warm Light Mode), reset, layout & responsive
│   ├── data/
│   │   └── mockData.js             # Dữ liệu DISHES (12 món), ADDONS (4 món), BG colors & DEFAULT_STATE
│   ├── utils/
│   │   ├── formatters.js           # Các hàm fmt(), pad(), rng(), hash()
│   │   └── schedule.js             # Logic tính lịch giao Chủ Nhật / Thứ Tư & đếm ngược 20:00
│   ├── stores/
│   │   └── useMovaStore.js         # Pinia Store quản lý state tập trung + persist localStorage
│   ├── router/
│   │   └── index.js                # Vue Router dùng createWebHistory() với smooth scroll
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppHeader.vue       # Sticky Header, chuyển đổi Store/Dashboard, Chuông thông báo, User & Giỏ hàng
│   │   │   ├── AppFooter.vue       # Footer thông tin MOVA Fresh TP.HCM & Nghị định 52/2024
│   │   │   ├── DishPlateSvg.vue    # Component vẽ SVG đĩa thức ăn động từ hàm plate() + hiệu ứng khói .steam
│   │   │   ├── VietQrSvg.vue       # Component vẽ SVG mã VietQR động từ hàm qrSVG()
│   │   │   ├── NotificationDrawer.vue # Ngăn kéo thông báo thời gian thực bên phải
│   │   │   ├── MobileCartBar.vue   # Thanh giỏ hàng nổi ở đáy màn hình trên Mobile
│   │   │   ├── FloatingZaloBtn.vue # Nút nổi Chat Zalo hỗ trợ góc dưới
│   │   │   └── ToastMessage.vue    # Thông báo Toast toàn cục
│   │   ├── store/
│   │   │   ├── HeroSection.vue     # Banner mở đầu + Giá neo 38k + Bảng gỗ 3 món bán chạy
│   │   │   ├── JourneySection.vue  # Hành trình tươi 16 giờ (4 bước từ Đắk Lắk về TP.HCM)
│   │   │   ├── BudgetPlanner.vue   # Bộ điều khiển Chế độ Ngân sách (Slider, Input, Quick chips, Số người)
│   │   │   ├── DishCard.vue        # Thẻ món ăn trong lưới thực đơn
│   │   │   ├── AddonsSection.vue   # Khu vực "Mua thêm đi cùng chuyến xe lạnh"
│   │   │   ├── StickyCart.vue      # Giỏ hàng cố định: Tiến trình 3 mốc (250k/400k/600k), chọn đợt giao, tách sốt/tinh bột
│   │   │   ├── BoxInsideSection.vue# Giải phẫu 4 thành phần bên trong hộp MOVA
│   │   │   └── FaqSection.vue      # Các câu hỏi thường gặp (Accordion)
│   │   ├── dashboard/
│   │   │   ├── DashHeader.vue      # Thông tin tài khoản, số dư Gói Đi Chợ, thống kê nhanh
│   │   │   ├── ActiveOrderTab.vue  # Tab 1: Công tắc Trước/Sau 20:00, Tracker 4 bước, Phân loại Mát/Đông, Sửa/Hoãn/Hủy/Báo bù
│   │   │   ├── OrderHistoryTab.vue # Tab 2: Lịch sử đơn, Đặt lại 1 chạm, Đánh giá vị (Vừa/Mặn/Nhạt -> tự bật tách sốt)
│   │   │   ├── PrepaidPlanTab.vue  # Tab 3: Thẻ Prepaid, Pháp lý NĐ 52/2024, Nạp gói 1tr/2tr, Sổ cái biến động số dư
│   │   │   └── ProfileAddressTab.vue # Tab 4: Sổ địa chỉ TP.HCM, Khẩu vị mặc định đồng bộ sang Store, Zalo OA Preview & Reset Demo
│   │   └── modals/
│   │       ├── DishDetailModal.vue # Chi tiết nguyên liệu theo số suất & 3 bước nấu 15 phút
│   │       ├── LoginDemoModal.vue  # Đăng nhập SĐT/OTP + 2 nút chuyển nhanh Demo Chị Lan / Anh Minh
│   │       ├── CheckoutModal.vue   # Form địa chỉ TP.HCM, khung giờ sáng, tính tự động số dư Gói trả trước & phần bù VietQR
│   │       ├── OrderSuccessModal.vue # Xác nhận mã đơn, lịch giao & mã VietQR
│   │       ├── RefundModal.vue     # Báo cáo sự cố độ tươi + giả lập đính kèm ảnh + hoàn tiền tự động
│   │       ├── TopupModal.vue      # Quét VietQR nạp Gói Đi Chợ Trả Trước
│   │       └── AddressModal.vue    # Thêm mới địa chỉ nhận hàng TP.HCM
│   ├── views/
│   │   ├── StoreView.vue           # Trang chủ Cửa hàng & Thực đơn (Route: /)
│   │   └── DashboardView.vue       # Trang Quản lý Tài khoản & Đơn hàng (Route: /dashboard)
│   ├── App.vue                     # Layout gốc kết nối Header, RouterView, Footer, Modals & Toast
│   └── main.js                     # Khởi tạo Vue App, Pinia & Router
├── index.html                      # Nạp Google Font Be Vietnam Pro & mount #app
├── vite.config.js                  # Cấu hình base: './' để tương thích hoàn toàn với GitHub Pages & Netlify
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Cài Đặt & Chạy Thử Tại Local

```bash
# 1. Cài đặt các thư viện cần thiết
npm install

# 2. Chạy môi trường Development (HMR cực nhanh)
npm run dev

# 3. Build mã nguồn ra thư mục dist/
npm run build

# 4. Preview bản build trước khi deploy
npm run preview
```

---

## 🚢 Hướng Dẫn Đẩy Code Lên GitHub & Tự Động Deploy

### Bước 1: Khởi tạo Git và Push lên GitHub
Mở terminal tại thư mục dự án và chạy các lệnh:

```bash
git init
git add .
git commit -m "feat: refactor MOVA Fresh MVP to Vue 3 + Vite + Pinia architecture"
git branch -M main
git remote add origin git@github.com:kaelCoding/MovaFreshFE.git
git push -u origin main
```

*(Nếu dùng HTTPS thay vì SSH: `git remote add origin https://github.com/kaelCoding/MovaFreshFE.git`)*

### Bước 2: Kích hoạt GitHub Pages (Tự động qua GitHub Actions)
1. Vào repository trên GitHub: `https://github.com/kaelCoding/MovaFreshFE`.
2. Vào **Settings** $\rightarrow$ **Pages** (cột bên trái).
3. Tại mục **Build and deployment** $\rightarrow$ **Source**, chọn **GitHub Actions**.
4. GitHub Actions workflow `.github/workflows/deploy.yml` đã được thiết lập sẵn sẽ tự động kích hoạt, build và deploy lên đường dẫn:
   `https://kaelcoding.github.io/MovaFreshFE/`

### Bước 3: Deploy Lên Netlify (Tùy chọn)
- File `netlify.toml` đã được tạo sẵn ở thư mục gốc.
- Bạn chỉ cần liên kết repo `kaelCoding/MovaFreshFE` trên Netlify Dashboard, Netlify sẽ tự động nhận diện cấu hình build `npm run build` và thư mục `dist` với rewrite SPA chuẩn đẹp (`/`, `/dashboard`).
