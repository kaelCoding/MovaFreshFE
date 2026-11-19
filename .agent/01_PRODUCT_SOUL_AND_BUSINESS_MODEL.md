# 01. LINH HỒN SẢN PHẨM & MÔ HÌNH KINH DOANH DÒNG TIỀN (FINTECH MEAL-KIT)

> **Tài liệu nền tảng xác định bản chất kinh doanh, cơ chế dòng tiền và cấu trúc vận hành của MOVA Fresh.**
> Cập nhật: 18/11/2026 (Đồng bộ V2.2 & Bảng giá thực tế) | Ban sáng lập MOVA Fresh

---

## 1. ĐỊNH VỊ SẢN PHẨM (PRODUCT POSITIONING)

**MOVA Fresh** là nền tảng **Meal-Kit Subscription do Đầu bếp tuyển chọn** ứng dụng cơ chế quản trị dòng tiền **FinTech**, kết nối trực tiếp vùng nông sản trù phú Đắk Lắk / Tây Nguyên cùng kho phụ trung chuyển TP.HCM đến từng căn bếp của các hộ gia đình tại **TP. Hồ Chí Minh và vùng kinh tế trọng điểm Đông Nam Bộ**.

### Giá trị cốt lõi giải quyết cho khách hàng:
1. **Tiết kiệm 1.5 – 2 tiếng mỗi ngày:** Xóa bỏ hoàn toàn gánh nặng suy nghĩ *"Hôm nay ăn gì?"*, đi chợ, rửa rau, nhặt củ, chặt thịt, thái cá. Mọi nguyên liệu đều được sơ chế sạch sẽ 100%, đóng gói chân không chuẩn an toàn thực phẩm. Nấu nhanh: **15 phút – 1 chảo**.
2. **Thực đơn do Đầu bếp MOVA thiết kế riêng:** Tuyển chọn theo số người ăn, khẩu vị và thể trạng gia đình (tăng cơ, giảm mỡ, ít tinh bột / hạn chế đường, dạ dày nhạy cảm; không hứa chữa bệnh). *Copywriting hướng tới khách hàng luôn dùng hình tượng "Đầu bếp MOVA"; tên kỹ thuật backend bên platform vẫn là `ai-engine/`.*
3. **Chuẩn vị Mâm cơm Á Đông & Tôn vinh thổ nhưỡng (Terroir):** 100% món ăn gắn với nguồn nguyên liệu bản địa rõ nguồn gốc (Ba rọi thảo mộc Đắk Lắk, Bò lúc lắc Chư Sê, Cá bớp Vũng Tàu, Gạo ST25 Sóc Trăng, Vải thiều IQF...). Gói xốt độc quyền định lượng chính xác từng gram giúp nấu nhanh không cần nêm nếm phức tạp.

---

## 2. BẢN CHẤT KINH DOANH: MÔ HÌNH DÒNG TIỀN FINTECH 2 ĐẦU

Điểm khác biệt sống còn giữa MOVA Fresh và các chuỗi bán lẻ thực phẩm truyền thống là **không đốt vốn lưu động (Working Capital) vào hàng tồn kho**. MOVA vận hành như một cỗ máy FinTech điều phối dòng tiền:

```
[Khách hàng Trả Tiền Trước 100%]
   ├── Mua Gói Suất ăn trả trước (Fresh Credit - ưu đãi chiết khấu ~10%)
   ├── Chuyển khoản VietQR trọn gói 4 tuần
   └── Trừ tiền định kỳ qua Thẻ / Ví đối tác (Auto-debit trước 72 giờ, Hủy 1 chạm)
              │
              ▼
   [MOVA FRESH - DÒNG TIỀN VẬN HÀNH LUÔN DƯƠNG]
              │
              ▼ (Công nợ gối đầu: Net 15 - 30 ngày)
[Nhà máy Đắk Lắk & Nhà cung cấp nguyên liệu]
```

### Chi tiết 2 đầu dòng tiền:

### A. Đầu vào (Thu tiền của Khách hàng trước 100%)
- **Gói Suất ăn trả trước (Fresh Credit):**
  - Khách hàng mua theo gói suất ăn cố định (Gói 4 tuần / Gói 13 tuần, hiển thị rõ số bữa & suất ăn quy đổi) nhận ưu đãi chiết khấu khoảng 10% điểm bữa ăn tặng kèm. Ưu đãi chu kỳ đầu có trần tổng `maxFirstCycleDiscountPct`.
  - Tắt hoàn toàn tính năng nạp số tiền lẻ tự do (`minTopUpVnd`) trên giao diện người dùng để tuyệt đối tuân thủ Nghị định 52/2024/NĐ-CP (tránh bản chất ví điện tử tự phát).
  - Hạch toán kế toán theo Thông tư 99/2025/TT-BTC: Nợ 112 / Có 131. Khi giao hàng từng lần: Nợ 131 / Có 511, Có 33311.
- **Mô hình Subscription 4 tuần:**
  - Bắt buộc chu kỳ đăng ký tối thiểu **4 tuần** (triệt tiêu tình trạng mua 1 tuần rồi nghỉ).
  - Cơ chế tự động trừ tiền qua thẻ tín dụng / ví đối tác trước giờ giao hàng **72 tiếng** (Auto-debit cutoff) kèm cam kết minh bạch hủy 1 chạm bất kỳ lúc nào.
  - Đảm bảo đơn hàng đã thanh toán đầy đủ trước khi lệnh sản xuất được chuyển giao về xưởng.

### B. Đầu ra (Thanh toán cho Nhà máy & Đối tác cung ứng sau)
- Đàm phán chính sách công nợ trả chậm (**Net 15 hoặc Net 30 ngày**) với nhà máy Đắk Lắk, nhà xe lạnh, đầu mối hải sản Vũng Tàu và xưởng bao bì.
- MOVA cầm tiền mặt của người tiêu dùng trước 15–30 ngày so với hạn phải thanh toán tiền hàng cho nhà cung ứng.
- **Kết quả:** Vốn lưu động luôn dương, không chịu áp lực tồn kho nông sản hư hao hay lãi vay dự trữ hàng.

---

## 2.1. BẢNG PHÂN LOẠI PHÁP LÝ ĐỎ / VÀNG / XANH & KIẾN TRÚC DÒNG TIỀN 4 TẦNG (MEETING 19/11/2026)

### 1. Bảng phân loại Pháp lý Đỏ / Vàng / Xanh:

| Nhóm | Phân loại & Ràng buộc | Căn cứ pháp lý | Giải pháp & Quy chuẩn tại MOVA Fresh |
|---|---|---|---|
| 🔴 **ĐỎ** (Cấm tuyệt đối) | **Cấm ví điện tử tự phát** | **Nghị định 52/2024/NĐ-CP** (Thanh toán không dùng tiền mặt) | MOVA không giữ giấy phép ví trung gian thanh toán. Xóa bỏ hoàn toàn chữ "Ví" trên UI khách; cấm nạp/rút/chuyển tiền tự do. |
| 🔴 **ĐỎ** (Cấm tuyệt đối) | **Cấm huy động vốn & Trả lãi trên số dư chờ** | **Luật Các TCTD 32/2024/QH15** (Tổ chức tín dụng) | Cấm ghi "lãi", cấm "thưởng nạp kiểu ngân quỹ". Chỉ ghi: *"Ưu đãi chiết khấu khi mua Gói Suất ăn trả trước"*. Tắt ô nhập nạp tiền lẻ tự do. |
| 🔴 **ĐỎ** (Cấm tuyệt đối) | **Cấm bẫy gia hạn âm thầm & Giữ cọc không cho rút** | **Luật BVQLNTD 19/2023/QH15** (Bảo vệ người tiêu dùng) | Cấm âm thầm auto-renew gói lớn. Thông báo trước **7 ngày làm việc** trước khi hết gói. Cam kết **dừng gói 1 chạm** và **hoàn tiền trong 7 ngày làm việc** cho các bữa chưa giao. |
| 🟡 **VÀNG** (Điều kiện) | **Lập hóa đơn GTGT từng lần giao hàng** | **Nghị định 254/2026/NĐ-CP** Điều 9 khoản 1, 3 | Suất ăn là hàng hóa thực phẩm giao định kỳ, xuất hóa đơn điện tử cho từng lần giao hàng thực tế. Cấu hình hệ thống `invoicing.issueOn = 'delivery'`. |
| 🟡 **VÀNG** (Điều kiện) | **Tài khoản trả trước đóng kín nội bộ** | **Nghị định 52/2024/NĐ-CP** | Điểm Fresh Credit chỉ được dùng để đổi bữa ăn tại MOVA Fresh, không chuyển nhượng sang tài khoản khác. |
| 🟢 **XANH** (Chuẩn hóa) | **Gói Suất ăn trả trước (Pre-paid meal voucher)** | **Thông tư 99/2025/TT-BTC** (Chế độ kế toán DN 2026) | Hạch toán khách trả trước: Nợ 112 / Có 131; Giao từng lần: Nợ 131 / Có 511, Có 33311. Tiền nhàn rỗi là vốn lưu động hợp pháp. |
| 🟢 **XANH** (Chuẩn hóa) | **Phí hội viên năm MOVA Club (Membership)** | **Thông tư 99/2025/TT-BTC** | Hạch toán doanh thu chưa thực hiện: Nợ 112 / Có 3387; phân bổ hàng tháng vào 511. |
| 🟢 **XANH** (Chuẩn hóa) | **Trừ tiền định kỳ qua cổng thẻ / ví đối tác** | **Nghị định 52/2024/NĐ-CP** | Tận dụng hạ tầng ví đối tác đã cấp phép (MoMo, ZaloPay, VNPAY, Cổng thẻ quốc tế) kèm cam kết khách hủy 1 chạm bất kỳ lúc nào. |

### 2. Kiến trúc dòng tiền 4 tầng (4-Layer Cash Flow Architecture):

- **Tầng `D` — Nền tảng bắt buộc (Foundational Mandatory):**
  + Trừ tiền thẻ định kỳ hoặc ủy nhiệm thu ví đối tác (MoMo, ZaloPay, VNPAY) trước giờ giao 72 tiếng.
  + Đây là tầng có **Zero rủi ro pháp lý theo NĐ 52/2024**, đáp ứng khách hàng muốn trải nghiệm linh hoạt nhưng vẫn đảm bảo nguyên tắc tiền vào trước khi nhà máy xẻ thịt thái rau.
- **Tầng `A` — Dòng tiền trả trước (Pre-paid Meal Float):**
  + Bán Gói Suất ăn trả trước 4 tuần hoặc 13 tuần cố định (hạch toán TK 131), tặng ưu đãi chiết khấu suất ăn.
  + Cam kết hoàn tiền 100% tiền thật các bữa chưa giao trong vòng **7 ngày làm việc** khi dừng gói giữa chừng.
- **Tầng `C` — Đường ống thu hộ (Collection Pipelines):**
  + VietQR tĩnh và động kết nối trực tiếp với cổng thanh toán đối tác, tiền về thẳng tài khoản ngân hàng Vietcombank của Công ty MOVA Fresh.
- **Tầng `B` — Giá trị gia tăng tùy chọn (Optional Addons):**
  + Thẻ hội viên VIP năm (MOVA Club - TK 3387 phân bổ đều 12 tháng), thẻ quà tặng sinh nhật, voucher B2B cho doanh nghiệp chăm lo đời sống nhân viên.

---

## 3. CHIẾN LƯỢC RETENTION ĐỘT PHÁ (> 50%) — MÔ HÌNH HELLOFRESH VOUCHER TRẢ GÓP

Để đạt tỷ lệ giữ chân khách hàng từ tháng thứ 2 trở đi **Retention $\ge 50\%$**, MOVA Fresh áp dụng bài học kinh điển từ HelloFresh:

### Cơ chế Gift Card / Voucher trải đều theo tuần (Staggered Discount)
Thay vì giảm giá sâu 1 lần 50% ở tuần đầu tiên (khiến khách hủy gói ngay sau tuần đầu), MOVA phân bổ ưu đãi đều qua 4 tuần:
- Ví dụ: Thẻ quà tặng HelloFresh `THEQUATANG` trải đều qua 4 tuần (Tuần 1: -300k, Tuần 2: -200k, Tuần 3: -200k, Tuần 4: -200k) với trần tối đa 20% giá trị gói.
- **Quy tắc:** Nếu khách hàng ngưng subscription giữa chừng trước 4 tuần, phần voucher của các tuần còn lại sẽ tự động vô hiệu lực.

---

## 4. BẢO VỆ BIÊN LỢI NHUẬN & UNIT ECONOMICS CHUẨN V2.2

MOVA Fresh **tuyệt đối không tham gia cuộc đua giá rẻ** với chợ truyền thống hay chuỗi bách hóa. Mức giá phản ánh giá trị tiết kiệm 2 tiếng mỗi ngày, sơ chế sạch sẽ 100%, định lượng chuẩn xác và bảo vệ sức khỏe:

- **Ràng buộc cốt lõi:**
  $$\text{Tổng chi phí Nguyên liệu} + \text{Vận chuyển} \le 50\% \text{ giá bán lẻ}$$
- **Hệ số giá vốn trực tiếp (COGS) tối đa:** **55%** (gồm nguyên liệu tươi thô, tỷ lệ hao hụt sau sơ chế yield, túi xốt OEM sachet và bao bì thùng cách nhiệt).
- **Định mức đóng gói & Giao hàng nội thành (lấp đầy chuẩn 6 bữa/lần giao):**
  + Bộ thùng cách nhiệt (`BB-THUNG-01`): `14.000đ / hộp` (Carton 3 lớp 5.500đ + Túi xốp bạc 3.200đ + Đá gel 5.300đ).
  + Vận chuyển chặng cuối nội thành TP.HCM (`lastMile`): `25.000đ / lần giao`.
  + Phí hộp + ship phân bổ: $(14.000 + 25.000) / 6 = \mathbf{6.500đ / \text{bữa}}$ (tỷ trọng: Đạm 50%, Rau 15%, Canh 15%, Tinh bột 10%, Tráng miệng 10%).
- **Chi phí vận hành & Marketing (OPEX & MKT):** **15%**.
- **Biên lợi nhuận gộp (Gross Margin):** **20% – 30%**.
- **Lợi nhuận ròng mục tiêu (Target Net Margin):** **~30%**.

---

## 5. ĐỘI NGŨ SÁNG LẬP & TÔN CHỈ VẬN HÀNH TINH GỌN

MOVA Fresh hướng đến việc tối đa hóa chỉ số:
$$\text{Hiệu quả vận hành} = \frac{\text{Doanh thu}}{\text{Quy mô nhân sự}}$$

Tất cả các khâu từ định giá, dự báo nhu cầu nguyên liệu, điều phối xe lạnh, đối soát công nợ đều được tự động hóa. Đội ngũ nòng cốt:

| Nhân sự | Vai trò | Trách nhiệm chính |
|---|---|---|
| **Hà My Trần** | **Founder** | Định hướng chiến lược, mô hình FinTech dòng tiền, quan hệ đối tác quốc tế & gọi vốn. |
| **Trung Quốc Phạm** | **Co-founder** | Điều phối chuỗi cung ứng Đắk Lắk – TP.HCM, kho bãi, pháp lý thanh toán & CSKH. |
| **Nguyễn Công Khôi** | **Technical Lead** | Kiến trúc sư phần mềm, phát triển Multi-Page App (`index.html` & `ops.html`), bảo mật, API & Sổ cái. |
| **Hiếu** | **AI & Data Lead** | Phát triển thuật toán BOM Aggregator, bảng giá thị trường, dự báo nhu cầu & mô hình truy xuất nguồn gốc Waze-style. |

### Cột mốc chiến lược (Launch Target):
- **Tháng 12/2026:** Chính thức bấm nút vận hành thương mại toàn bộ hệ thống (Launch) phục vụ thị trường TP.HCM và các tỉnh Đông Nam Bộ.
