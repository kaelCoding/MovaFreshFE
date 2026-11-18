# 05. TIẾN ĐỘ THỰC HIỆN & LỘ TRÌNH TRIỂN KHAI (PROGRESS & ROADMAP)

> **Bảng theo dõi trạng thái hiện tại, lộ trình các Tracks hành động và kế hoạch kiểm thử thực tế.**
> Mục tiêu tối thượng: **Chính thức bấm nút chạy sản phẩm thật (Launch) vào Tháng 12/2026.**
> Cập nhật: 18/11/2026 (Phiên bản V2.2)

---

## 1. BẢNG TIẾN ĐỘ V2.2 HIỆN TẠI (STATUS DASHBOARD)

| Hạng mục / Jira Task | Trạng thái | Đánh giá & Kết quả đạt được |
|---|---|---|
| **Hạ tầng Web Multi-Page (MPA)** | ✅ **Đã hoàn thành** | Build hoàn chỉnh `index.html` (App Khách) và `ops.html` (App Vận hành) trên Vite 6. |
| **Deploy Netlify CI/CD** | ✅ **Đã hoàn thành** | Đã kết nối repo `github.com/movafresh-vn/movafresh-web` (nhánh `feat/v2-customer-and-ops-apps`) sang `https://movafresh-web.netlify.app`. |
| **Frontend V2 Customer App (`KAN-5`)** | ✅ **Đã hoàn thành** | Phễu Onboarding 4 bước (`/plans`), mâm cơm Á Đông 5 món, linh hoạt đổi món chéo nguyên liệu, modal Chi tiết món (Terroir, size specs, nutrition, 3 bước nấu 15 phút), Video Hook Grand Frais 10s. |
| **FinTech Dòng tiền & Thanh toán (`KAN-6`)** | ✅ **Đã hoàn thành** | Fresh Credit 2 ngăn (`real_vnd` vs `promo_vnd`), voucher HelloFresh 4 tuần (`THEQUATANG`, `MOVA20`, `FREESHIP`), Khung giờ xanh (-15k Freeship), Xác thực SĐT qua OTP (demo mã 1234), Zero COD. |
| **Hệ thống Vận hành 8 Vai trò (`KAN-9`)** | ✅ **Đã hoàn thành** | Đóng gói `/ops.html` đầy đủ cho Quản đốc phân xưởng (`1111`), Bếp phân xưởng (`2222`), Mua hàng (`3333`), NCC (`4001`), Điều phối xe lạnh (`5555`), Kho phụ TP.HCM (`6666`), Shipper (`7777`), Kế toán dòng tiền (`9999`). Bảo mật ẩn PII khách hàng. |
| **Bảng giá thực tế & Kinh tế đơn vị (`KAN-10`)** | ✅ **Đã hoàn thành** | Đồng bộ 3 file Excel của Hiếu: 18 SKU nguyên liệu thô, 8 túi xốt OEM sachet, 21 món ăn Terroir, quy chuẩn đóng thùng cách nhiệt 14k + ship nội thành 25k (phân bổ 6.5k/bữa). Ràng buộc Nguyên liệu + Ship $\le 50\%$, Net Margin ~30%. Bỏ bơ sáp ưu tiên Vải thiều IQF. |
| **Bộ Unit Tests Tự Động (`KAN-11`)** | ✅ **Đã hoàn thành** | 10 test suites Vitest với **256 unit tests** bao phủ 100% logic miền và API mock, đạt **100% test pass**. |

---

## 2. KẾ HOẠCH HÀNH ĐỘNG TIẾP THEO (NEXT ACTIONS BEFORE LAUNCH)

```
                    MỤC TIÊU: LAUNCH THÁNG 12/2026
                                   ▲
   ┌─────────────────┬─────────────┴─────────┬─────────────────┐
   │                 │                       │                 │
Đầu việc 1        Đầu việc 2              Đầu việc 3        Đầu việc 4
Bộ data 200 hộ &   Đồng bộ contract        Kết nối Backend   Áp dụng Branding
10 Personas BOM    sang platform           thật & Payment    Kit từ Designer
(KAN-12)           (api-contract.json)     (VietQR / Thẻ)    (Design System)
```

### 1. Đầu việc 1: Bộ dữ liệu 200 Hộ dân & 10 AI Personas (`KAN-12`)
- **Mục tiêu:** Tạo bộ dữ liệu mẫu chuẩn xác cho 200 hộ gia đình TP.HCM & Đông Nam Bộ.
- **Nội dung:** 10 AI Personas (Gym nam, Nữ văn phòng giảm mỡ, Tiểu đường hạn chế đường, Dạ dày nhạy cảm, Gia đình hạt nhân, Đại gia đình 3 thế hệ, Độc thân bận rộn, Ăn chay bán phần, Mẹ bỉm sữa, Cặp đôi Gen Z Fusion) chạy qua BOM Reverse Aggregator để xuất Phiếu Request Đặt Hàng Test gửi nhà máy Đắk Lắk chạy thử nghiệm dây chuyền.

### 2. Đầu việc 2: Đồng bộ `api-contract.json` sang `movafresh-platform`
- Chuyển giao các định nghĩa API và mô hình dữ liệu đã hoàn thiện từ `docs/contract-changes.md` sang repository `movafresh-platform`, duy trì tính tương thích ngược giữa Tech Lead (Khôi) và AI Lead (Hiếu).

### 3. Đầu việc 3: Kết nối Backend thật & Hạ tầng thanh toán tự động
- Kết nối cổng thanh toán ngân hàng (VietQR động) và cổng thẻ tín dụng tự động trừ tiền trước 72 giờ.
- Kết nối cơ sở dữ liệu thật thay thế cho lớp mock in-memory hiện tại.

### 4. Đầu việc 4: Áp dụng Branding Kit chính thức
- Khi designer bàn giao Design System chính thức (SVG icons, màu sắc chuẩn thương hiệu, hình ảnh chụp thực tế từ xưởng Đắk Lắk và video unbox 15 phút thực tế), thay thế vào vị trí đã chừa sẵn trong code.

---

## 3. CHECKLIST KIỂM THỬ ĐÁNH GIÁ (ACCEPTANCE CRITERIA CHO AGENT)

Trước khi coi một task là hoàn thành, Agent cần tự kiểm tra:
1. Code có vi phạm bất kỳ điều nào trong 8 điều cấm (`AGENTS.md`) không?
2. Có từ ngữ "ví điện tử" hoặc "COD" hoặc "AI" (ở giao diện khách) nào lọt vào không?
3. Các con số tiền tệ có dùng CSS `tabular-nums` và hàm `fmt()` không?
4. Đơn hàng có bị chia nhỏ dưới 4 tuần không?
5. Mâm cơm gia đình có đủ 5 thành phần (Đạm, Rau, Canh, Tinh bột, Trái cây) không?
6. Chạy `npm test` có đạt 256/256 pass không?
7. Chạy `npm run build` có thành công 0 lỗi cho cả `index.html` và `ops.html` không?
