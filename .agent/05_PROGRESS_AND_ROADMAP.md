# 05. TIẾN ĐỘ THỰC HIỆN & LỘ TRÌNH TRIỂN KHAI (PROGRESS & ROADMAP)

> **Bảng theo dõi trạng thái hiện tại, lộ trình 4 Tracks hành động và kế hoạch kiểm thử thực tế.**
> Mục tiêu tối thượng: **Chính thức bấm nút chạy sản phẩm thật (Launch) vào Tháng 12/2026.**
> Cập nhật: 15/11/2026

---

## 1. TRẠNG THÁI HIỆN TẠI (V1 STATUS)

| Hạng mục | Trạng thái | Đánh giá & Nhiệm vụ tiếp theo |
|---|---|---|
| **Hạ tầng Web Vue 3 + Vite** | ✅ **Đã hoàn thành** | Chạy mượt mà, build siêu nhanh, setup Pinia và Router hoàn chỉnh. |
| **Deploy Netlify CI/CD** | ✅ **Đã hoàn thành** | Đã kết nối repo `kaelCoding/MovaFreshFE` sang `movafresh.netlify.app`. |
| **Storefront Prototype** | ⚠️ **Cần Refactor (V1)** | Bản V1 hiện tại đang mang tư duy sàn TMĐT bán lẻ (chọn từng món, giỏ hàng lẻ, badge ngăn mát/đông trên thẻ món, thanh freeship 250k–600k). Cần chuyển dịch hoàn toàn sang V2. |
| **Dashboard Prototype** | ⚠️ **Cần Cập nhật (V1)** | Đã có giao diện nạp tiền và lịch sử, nhưng cần chuẩn hóa tên gọi Fresh Credit (bỏ chữ "ví điện tử"), bổ sung cơ chế quản lý Subscription 4 tuần. |

---

## 2. LỘ TRÌNH TRIỂN KHAI 4 TRACKS HƯỚNG TỚI LAUNCH T12/2026

```
                    MỤC TIÊU: LAUNCH THÁNG 12/2026
                                   ▲
  ┌─────────────────┬──────────────┴───────┬─────────────────┐
  │                 │                      │                 │
Track 1           Track 2                Track 3           Track 4
Nghiên cứu        Frontend V2            Backend & Ops     AI Agents &
200 Hộ dân &      Refactor               Dòng tiền 2 đầu   Growth Loops
10 AI Personas    Mâm cơm Việt           Nhà máy Đắk Lắk   Pricing & Content
(Tuần này)
```

---

### TRACK 1: NGHIÊN CỨU 200 HỘ DÂN & CHẾ BẢN 10 KHÁCH HÀNG AI (ƯU TIÊN TUẦN NÀY 🔥)

- **Mục tiêu:** Tạo ra một bộ dữ liệu giả lập chuẩn xác về nhu cầu ăn uống của 200 hộ gia đình điển hình tại TP.HCM và vùng Đông Nam Bộ.
- **Nhiệm vụ cụ thể tuần này:**
  1. Phân tích nhân khẩu học, thu nhập, thói quen ăn uống, bệnh lý phổ biến của cư dân đô thị miền Nam.
  2. Xây dựng **10 Khách hàng AI mẫu (AI Personas)** với hồ sơ cá nhân hóa sâu sắc:
     - *Persona 1:* Dân Gym/Fitness nam (Tập trung High Protein, ức gà, bò áp chảo, giảm tinh bột nhanh).
     - *Persona 2:* Nữ văn phòng giảm mỡ / Eat Clean (Low Carb, ưu tiên rau củ quả Đắk Lắk, cá hấp thảo mộc).
     - *Persona 3:* Bệnh nhân tiểu đường type 2 / Tiền tiểu đường (Hạn chế đường và tinh bột, ưu tiên gạo lứt, món ít đường tinh luyện; không hứa chữa bệnh).
     - *Persona 4:* Người bị trào ngược dạ dày / Tiêu hóa kém (Món canh thanh đạm, hấp luộc, xốt không ớt cay).
     - *Persona 5:* Gia đình hạt nhân trẻ (Vợ chồng + 1 con nhỏ 4 tuổi, cần mâm cơm nhanh 15 phút đủ canh rau thịt cá).
     - *Persona 6:* Đại gia đình tam đại đồng đường (Ông bà thích món truyền thống mềm nhừ, con cháu thích thịt bò bít tết).
     - *Persona 7:* Chuyên gia bận rộn độc thân (Cần hộp bữa ăn 1 người, nấu trong 1 chảo không cần dọn rửa nhiều).
     - *Persona 8:* Người ăn chay bán phần (Flexitarian - 3 ngày ăn chay rau nấm, 4 ngày ăn cá trứng).
     - *Persona 9:* Mẹ bỉm sữa sau sinh (Cần bổ sung dinh dưỡng hồi phục, nhiều canh hầm, đạm sạch không kháng sinh).
     - *Persona 10:* Cặp đôi Gen Z mê ẩm thực Fusion Á-Âu (Thích đổi vị xốt mới mẻ, thẩm mỹ đẹp để chụp ảnh mạng xã hội).
  3. **Xuất Bảng Request Đặt Hàng Test (Test Order Master Sheet):**
     - Đưa 10 hồ sơ AI này chạy qua thuật toán BOM Aggregator để tính ra tổng số kg thịt, cá, rau, gạo và số gói xốt cụ thể.
     - Xuất file gửi đối tác nhà máy Đắk Lắk chạy thử nghiệm dây chuyền sơ chế đóng gói.

---

### TRACK 2: FRONTEND V2 REFACTOR (TÁI CẤU TRÚC GIAO DIỆN)

- **Gỡ bỏ triệt để các Anti-Patterns của V1:**
  - Xóa bỏ thanh tiến trình freeship `250k -> 400k -> 600k`.
  - Xóa bỏ huy hiệu (badge) "Bảo quản ngăn mát / đông" trên thẻ món (chuyển sang nhãn sticker vật lý tại nhà máy).
  - Xóa bỏ từ ngữ "Ví điện tử" trong code và UI (thay bằng "Fresh Credit" / "Điểm bữa ăn").
  - Xóa bỏ phương thức thanh toán COD khi nhận hàng.
- **Xây dựng các Module mới theo chuẩn V2:**
  - [ ] Module `AiOnboardingModal.vue`: Phễu khảo sát 5–6 câu hỏi nhanh.
  - [ ] Module `VietnameseFamilyMealBuilder.vue`: Gợi ý mâm cơm 5 món tự động (Đạm + Canh + Rau + Tinh bột + Trái cây).
  - [ ] Module `SubscriptionPlanSelector.vue`: Chọn gói 4 tuần, thiết lập 1–2 ngày giao cố định và khung giờ tránh kẹt xe.
  - [ ] Module `FreshCreditTopup.vue`: Bảng nạp thẻ nhận giá trị thặng dư (Nạp 1.5M nhận 1.65M; thưởng nạp cấu hình được).

---

### TRACK 3: BACKEND, OPS & DÒNG TIỀN 2 ĐẦU

- [ ] Thiết kế kiến trúc Sổ cái Dòng tiền (Two-sided Cash Flow Ledger): Ghi nhận tiền nạp Fresh Credit của khách hàng và thời hạn công nợ gối đầu (Net-15/30) của nhà máy.
- [ ] Xây dựng cơ chế Auto-debit tự động kích hoạt trừ thẻ/credit trước lịch giao 72 tiếng.
- [ ] Xây dựng giao diện `FactoryDashboardView.vue` siêu tối giản cho quản đốc nhà máy Đắk Lắk (chỉ hiển thị tổng kg nguyên liệu và số lượng gói xốt cần chuẩn bị).
- [ ] Triển khai Module Truy xuất nguồn gốc kiểu Waze (Waze-style Peer Traceability) cho Thịt bò và Gạo ST25.

---

### TRACK 4: HỆ SINH THÁI AI AGENTS & VIRAL LOOPS

- [ ] Tích hợp cơ chế thưởng Fresh Credit tự động khi hoàn thiện profile (`+10k`), chia sẻ công thức lên MXH (`+20k`) và giới thiệu bạn bè (`+100k`).
- [ ] Xây dựng kịch bản cho **Pricing Agent**: Định kỳ cào dữ liệu giá siêu thị bán lẻ để cân chỉnh giá bán đảm bảo Gross Margin 20% – 30%.
- [ ] Xây dựng kịch bản cho **Marketing Agent**: Tự động sinh nội dung video và bài viết thực đơn theo tuần.

---

## 3. CHECKLIST KIỂM THỬ ĐÁNH GIÁ (ACCEPTANCE CRITERIA CHO AGENT)

Trước khi coi một task là hoàn thành, Agent cần tự kiểm tra:
1. Code có vi phạm bất kỳ điều nào trong 7 điều cấm (`AGENTS.md`) không?
2. Có từ ngữ "ví điện tử" hoặc "COD" nào lọt vào UI/Code không?
3. Các con số tiền tệ có dùng CSS `tabular-nums` và hàm `formatVnd()` không?
4. Đơn hàng có bị chia nhỏ dưới 4 tuần không?
5. Mâm cơm gia đình có đủ 5 thành phần (Đạm, Rau, Canh, Tinh bột, Tráng miệng) không?
