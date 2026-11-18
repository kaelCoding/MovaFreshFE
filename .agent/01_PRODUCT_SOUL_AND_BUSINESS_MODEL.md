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
   ├── Nạp trước gói Fresh Credit (thưởng nạp ~10%)
   └── Subscription 4 tuần (Auto-debit trước 72 giờ)
              │
              ▼
   [MOVA FRESH - DÒNG TIỀN VẬN HÀNH LUÔN DƯƠNG]
              │
              ▼ (Công nợ gối đầu: Net 15 - 30 ngày)
[Nhà máy Đắk Lắk & Nhà cung cấp nguyên liệu]
```

### Chi tiết 2 đầu dòng tiền:

### A. Đầu vào (Thu tiền của Khách hàng trước 100%)
- **Gói nạp Fresh Credit trả trước:**
  - Khách nạp tiền để nhận điểm bữa ăn kèm thưởng nạp thường xuyên khoảng 10%. Ưu đãi lớn hơn chỉ áp ở chu kỳ đầu, có trần tổng `maxFirstCycleDiscountPct`.
  - Thu tiền mặt ngay lập tức, khách hàng tự nguyện tích lũy điểm bữa ăn vào hệ sinh thái MOVA.
- **Mô hình Subscription 4 tuần:**
  - Bắt buộc chu kỳ đăng ký tối thiểu **4 tuần** (triệt tiêu tình trạng mua 1 tuần rồi nghỉ).
  - Cơ chế tự động trừ tiền qua thẻ tín dụng hoặc cấn trừ Fresh Credit trước giờ giao hàng **72 tiếng** (Auto-debit cutoff).
  - Đảm bảo đơn hàng đã thanh toán đầy đủ trước khi lệnh sản xuất được chuyển giao về xưởng.

### B. Đầu ra (Thanh toán cho Nhà máy & Đối tác cung ứng sau)
- Đàm phán chính sách công nợ trả chậm (**Net 15 hoặc Net 30 ngày**) với nhà máy Đắk Lắk, nhà xe lạnh, đầu mối hải sản Vũng Tàu và xưởng bao bì.
- MOVA cầm tiền mặt của người tiêu dùng trước 15–30 ngày so với hạn phải thanh toán tiền hàng cho nhà cung ứng.
- **Kết quả:** Vốn lưu động luôn dương, không chịu áp lực tồn kho nông sản hư hao hay lãi vay dự trữ hàng.

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
