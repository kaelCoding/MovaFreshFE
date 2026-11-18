# MOVA FRESH — Web-App Khách Hàng & Vận Hành (Vue 3 + Vite + Pinia)

> Nền tảng đặt thực đơn nguyên liệu sơ chế sẵn (**Ready-to-Cook - RTC**) do **Đầu bếp MOVA tuyển chọn**, kết nối trực tiếp nông sản trù phú từ vùng nguyên liệu **Đắk Lắk & Tây Nguyên** cùng kho phụ trung chuyển TP.HCM. Nguyên liệu sơ chế sạch 100%, đóng thùng cách nhiệt đá gel vận chuyển xe lạnh xuyên đêm giao thẳng tới tận bếp tại **TP. Hồ Chí Minh** và vùng Đông Nam Bộ. Chuẩn bữa cơm nhà tươi ngon: **15 phút – 1 chảo**.
>
> 🌐 **Production URL:** [https://movafresh-web.netlify.app](https://movafresh-web.netlify.app)  
> 📦 **Repository chính thức:** `github.com/movafresh-vn/movafresh-web`  
> 🌿 **Nhánh phát triển V2:** `feat/v2-customer-and-ops-apps`

---

## 🌟 Tính Năng Cốt Lõi V2.2

### 1. Web App Khách Hàng (`index.html`)
- **Trang chủ & Video Hook 10 giây (Grand Frais Style):** Khung video tỷ lệ 16:9 / 4:3 cận cảnh nguyên liệu tươi sống chuyển động thật với 3 nhịp: `00:00 Mở hộp Đắk Lắk` $\rightarrow$ `00:05 Đảo 1 chảo & rưới xốt` $\rightarrow$ `00:15 Xong mâm cơm 5 món`.
- **Đăng nhập nhanh 1 chạm:** Tích hợp Google, Zalo, Facebook điền tự động thông tin liên hệ.
- **Phễu khảo sát Đầu bếp (`/plans`):** Nút tăng/giảm `−` / `+` cho số người ăn (1–10) và số bữa/tuần (3–7); 9 nhu cầu thể trạng + 6 kiêng cữ dị ứng kèm ô *"Khác (tự nhập)"* có bộ phân tích từ khóa thời gian thực; 3 phong cách ẩm thực (Thuần Việt, Đồ Tây, Đồ Á).
- **Thực đơn Mâm cơm Á Đông 5 món:** Đạm chính + Canh nóng + Rau xanh + Tinh bột lành mạnh + Trái cây tráng miệng theo mùa (Chuối tiêu chín cây, Vải thiều cấp đông nhanh IQF tách hạt).
- **Đổi món linh hoạt & Modal Chi tiết món:**
  - Gợi ý đổi 3–4 món khác biệt nguồn đạm kèm thanh tìm kiếm thực đơn nhà máy.
  - Modal Chi tiết: Ảnh/màu nhóm tươi sống, Huy hiệu vùng miền `terroir_region`, Câu chuyện thổ nhưỡng `terroir_story`, Mẹo ngon `chef_note`, Bảng định lượng nhân theo số người ăn, Quy cách sơ chế, Hướng dẫn bảo quản, 4 chỉ số dinh dưỡng (Calo, Đạm, Tinh bột, Béo), 3 bước nấu 15 phút.
- **Thanh toán FinTech & Giao hàng:**
  - Khung giờ xanh (06:00 – 08:00): Tặng ngay -15.000đ Freeship né kẹt xe.
  - Tần suất 1 lần/tuần (Badge khuyên dùng tối ưu phí thùng 39.000đ/hộp).
  - Xác thực SĐT qua OTP (demo mã 1234) tích hợp vào validation.
  - 3 Hình thức trả trước (Zero COD): Nạp Fresh Credit (~10% thưởng nạp, Nghị định 52/2024), Chuyển khoản VietQR 4 tuần, Liên kết thẻ tín dụng (tự trừ trước 72 giờ).
  - Hộp nhập Voucher (`THEQUATANG`, `MOVA20`, `FREESHIP`).
  - Checkbox pháp lý thông tin cá nhân & Newsletter nhận bản tin (+15.000đ Fresh Credit).
- **Dashboard Quản lý Tài khoản (`/account`):** Đổi món trước giờ chốt sổ nhà máy (08:00 ngày D-2), tạm hoãn (Skip), quản lý số dư Fresh Credit 2 ngăn (`real_vnd` vs `promo_vnd`), Cook & Share, Mời bạn bè nhận thưởng.

---

### 2. Web App Vận Hành 8 Vai Trò (`ops.html`)
Ứng dụng Single Page độc lập qua hash router phục vụ 8 nhóm tác nhân, ẩn thông tin PII khách hàng:
- **`1111` — Quản đốc phân xưởng (Factory Manager):** Kế hoạch sản xuất tuần, phiếu chế bản in ấn (Printable Work Order), cân đối BOM nguyên liệu thô theo mốc chốt sổ `08:00 D-2`.
- **`2222` — Bếp phân xưởng (Factory Workshop):** Kế hoạch hôm nay, 7 ngày, đóng gói, xuất xe lạnh Đắk Lắk $\rightarrow$ TP.HCM, Offline Queue lưu trữ khi mất mạng.
- **`3333–3336` — Mua hàng & Kho (Procurement):** Đơn mua hàng (PO), đối soát 3-way match, kho FEFO, thu hồi lô hàng sự cố (Lot Recall).
- **`4001–4005` — Cổng Nhà cung cấp (Supplier Portal):** Dành cho 5 nhà cung ứng (`S-FACTORY`, `S-SEAFOOD`, `S-TRUCK`, `S-LASTMILE`, `S-PACK`).
- **`5555` — Điều phối vận hành & Xe lạnh (Logistics):** Quản lý công suất tuyến, giám sát cảm biến chuỗi lạnh Cold Chain, tính chi phí logistics theo thùng và KPI đúng giờ.
- **`6666` — Kho phụ trung chuyển TP.HCM (Secondary Hub):** Nhận xe lạnh Đắk Lắk, ghép hải sản tươi Vũng Tàu, chia tuyến giao, in nhãn thùng.
- **`7777` — Shipper chặng cuối (Delivery):** Giao diện mobile tối giản, danh sách điểm dừng, SĐT che một phần, 1 chạm xác nhận Đã giao / Thất bại.
- **`9999` — Kế toán & Quản trị dòng tiền (Finance & Accounting):** Sổ cái Fresh Credit 2 ngăn, đối soát ngân hàng VietQR, xuất hóa đơn VAT, biên lợi nhuận, công nợ NCC, dự báo dòng tiền 13 tuần, export CSV chuẩn MISA / Fast.

---

## 📊 Ràng Buộc Kinh Tế Đơn Vị (Unit Economics V2.2)

- **Ràng buộc cốt lõi:**
  $$\text{Tổng chi phí Nguyên liệu} + \text{Vận chuyển} \le 50\% \text{ giá bán lẻ}$$
- **Giá vốn trực tiếp (COGS) tối đa:** **55%** (gồm nguyên liệu thô, tỷ lệ hao hụt yield, túi xốt OEM sachet và bao bì thùng cách nhiệt).
- **Định mức đóng gói & Giao hàng nội thành (6 bữa/lần giao):**
  + Bộ thùng cách nhiệt (`BB-THUNG-01`): `14.000đ / hộp` (Carton 3 lớp + Xốp bạc + Đá gel).
  + Vận chuyển chặng cuối nội thành TP.HCM: `25.000đ / lần giao`.
  + Phí hộp + ship phân bổ: $(14.000 + 25.000) / 6 = \mathbf{6.500đ / \text{bữa}}$.
- **Chi phí vận hành & Marketing (OPEX & MKT):** **15%**.
- **Biên lợi nhuận gộp (Gross Margin):** **20% – 30%**.
- **Lợi nhuận ròng mục tiêu (Net Margin):** **~30%**.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
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

---

## 🚀 Hướng Dẫn Cài Đặt & Phát Triển

### Yêu cầu môi trường
- **Node.js:** $\ge 18.0.0$
- **NPM:** $\ge 9.0.0$

### Lệnh thực thi
```bash
# 1. Cài đặt thư viện dependencies
npm install

# 2. Khởi chạy máy chủ phát triển (Dev server)
npm run dev
# -> App Khách hàng: http://localhost:5173/
# -> App Vận hành:   http://localhost:5173/ops.html

# 3. Chạy toàn bộ 256 unit tests tự động
npm test

# 4. Build đóng gói production cho cả 2 ứng dụng
npm run build
# -> Kết xuất thư mục dist/ chứa cả index.html và ops.html
```

---

## 🚢 Triển Khai (Deployment trên Netlify)

1. Repository được cấu hình CI/CD tự động trên **Netlify**:
   - Nhánh kích hoạt: `feat/v2-customer-and-ops-apps` (và `main` khi hợp nhất).
   - Lệnh build: `npm run build`.
   - Thư mục publish: `dist`.
2. Biến môi trường:
   - `VITE_SHOW_DEMO_PINS`: Đặt là `true` nếu muốn hiển thị thanh chọn nhanh mã PIN demo ở trang `/ops.html` trên môi trường staging; để trống hoặc `false` trên production.
