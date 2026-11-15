# 02. ĐẶC TẢ LUỒNG TRẢI NGHIỆM NGƯỜI DÙNG & QUY CHUẨN UX (V2 SPEC)

> **Tài liệu quy định chi tiết hành trình khách hàng từ điểm chạm đầu tiên tới luồng thanh toán và vòng lặp lan tỏa.**
> Phiên bản: V2.0 | Cập nhật: 15/11/2026

---

## 1. TỔNG QUAN HÀNH TRÌNH KHÁCH HÀNG (4 GIAI ĐOẠN)

```
[Điểm chạm Quảng cáo / Mạng xã hội]
          │ (Nhận Voucher mồi 90k - 1 Triệu / Quà tặng)
          ▼
[GIAI ĐOẠN 1: AI Onboarding Siêu Tốc (1-2 Phút)]
  - Nhập 1 thông tin duy nhất: Email HOẶC Số điện thoại
  - 5-6 câu hỏi trắc nghiệm thể trạng, số người ăn, khẩu vị
          │
          ▼
[GIAI ĐOẠN 2: Cá Nhân Hóa Theo "Mâm Cơm Việt"]
  - Tự động sinh thực đơn riêng biệt (1 người vs Mâm cơm gia đình)
  - Đơn vị đo: Số "Bữa ăn" (không bán lẻ từng món rời rạc)
  - Upsell kích thích nhu cầu: Tăng đạm, Đồ Tây, Giảm béo (AOV 2 - 3 Triệu)
          │
          ▼
[GIAI ĐOẠN 3: Thanh Toán FinTech & Lên Lịch Giao]
  - Bắt buộc Subscription tối thiểu 4 tuần
  - Fresh Credit: Hiển thị giá trị nhận > Tiền bỏ ra
  - Chọn 1-2 ngày giao cố định trong tuần theo khung giờ tránh kẹt xe
          │
          ▼
[GIAI ĐOẠN 4: Product-Led Growth & Viral Loops]
  - Hoàn thiện profile (+10k/20k), Chia sẻ món ăn (+20k), Mời bạn bè (+50k - 100k)
```

---

## 2. CHI TIẾT CÁC GIAI ĐOẠN TRẢI NGHIỆM

### GIAI ĐOẠN 1: TOUCHPOINT & AI ONBOARDING (1–2 PHÚT)

Mục tiêu: **Rào cản gia nhập thấp nhất có thể (Frictionless Entry)**, chuyển đổi traffic từ mạng xã hội thành lead định danh chỉ trong vài giây.

1. **Điểm chạm mồi (Lead Magnet):**
   - Quảng cáo Facebook, TikTok, Instagram hoặc Email giới thiệu: *"Nhận ngay Gift Card 900.000đ bữa ăn gia đình"*, *"Tặng chảo chống dính vân đá cho gói thành viên mới"*, hoặc *"Khảo sát 60 giây nhận 2 bữa ăn miễn phí"*.
   - Khách nhấp vào Landing Page $\rightarrow$ **Chỉ yêu cầu nhập DUY NHẤT 1 thông tin: Số điện thoại HOẶC Email**. Không bắt nhập mật khẩu, không bắt điền họ tên ngay lúc này.
2. **Phễu khảo sát AI (Interactive Survey 5–6 câu hỏi):**
   - **Câu 1 — Khu vực sinh sống:** TP.HCM (Quận 1, 3, 7, Bình Thạnh, TP. Thủ Đức...) hoặc các tỉnh Đông Nam Bộ lân cận (Bình Dương, Đồng Nai).
   - **Câu 2 — Số người ăn trong gia đình:** Sử dụng bộ nút tăng giảm linh hoạt `[-] [Số người] [+]` (1, 2, 3, 4, 5, 6+ người). *Tuyệt đối không dùng dropdown cứng ngắc.*
   - **Câu 3 — Phong cách ẩm thực:** Món thuần Việt truyền thống, Món kết hợp Á-Âu, Cơm nhà thanh đạm, hay Đổi vị cuối tuần phong cách Bistro Tây.
   - **Câu 4 — Mục tiêu sức khỏe & Thể trạng:** Tăng cơ / High Protein (gym/thể thao), Giảm mỡ / Low Carb, Kiểm soát đường huyết (tiểu đường / tiền tiểu đường), Ăn nhẹ dễ tiêu (dạ dày / hệ tiêu hóa nhạy cảm), Cân bằng dinh dưỡng gia đình có trẻ nhỏ và người lớn tuổi.
   - **Câu 5 — Dị ứng & Thực phẩm kiêng cữ:** Không ăn cay, kiêng hải sản, không ăn thịt bò, ăn chay bán phần (Flexitarian).
   - **Câu 6 — Số bữa nấu tại nhà dự kiến mỗi tuần:** 3 bữa, 4 bữa, 5 bữa, hay 6 bữa/tuần.

---

### GIAI ĐOẠN 2: CÁ NHÂN HÓA THỰC ĐƠN THEO "MÂM CƠM VIỆT"

Khác biệt cốt lõi: **Không hiển thị danh sách hàng chục món lẻ như sàn ShopeeFood/GrabFood để khách tự mò mẫm.** Hệ thống tự động kết xuất ra một thực đơn đề xuất hoàn chỉnh đã tối ưu hóa cho profile của khách:

#### 1. Cấu trúc thực đơn theo quy mô hộ gia đình:
- **Trường hợp 1 người (Độc thân / Sống một mình):**
  - Cấu trúc: 1 Hộp suất ăn hoàn chỉnh cá nhân (Đạm tinh gọn + Rau xào/luộc + Cơm/Tinh bột + Xốt số 1 người). Nhanh - Gọn - Sạch, nấu trong 1 chảo/nồi trong 10 phút.
- **Trường hợp Cặp đôi & Gia đình ($\ge 2$ người) — Chuẩn "Mâm Cơm Á Đông":**
  - Người Việt không ăn từng món đĩa đơn độc. Một mâm cơm tiêu chuẩn bắt buộc gồm đủ 5 cấu phần:
    1. **Món Đạm chính:** Thịt kho tàu củ sen, Cá bống kho tộ, Gà nướng thảo mộc Đắk Lắk, Ba chỉ bò áp chảo xốt tiêu đen...
    2. **Món Rau xanh:** Rau muống xào tỏi, Bông cải xanh sốt nấm, Đậu que xào thịt băm...
    3. **Món Canh ấm bụng:** Canh chua cá bớp, Canh sườn hầm củ quả, Canh cải ngọt tôm băm, Canh bí đỏ bắp bò...
    4. **Tinh bột lành mạnh:** Gạo thơm dẻo ST25, Gạo lứt huyết rồng, Bún gạo khô Tây Nguyên, Khoai lang mật nướng...
    5. **Tráng miệng:** Trái cây nhiệt đới theo mùa (Bơ sáp Đắk Lắk, ổi nữ hoàng, dưa lưới...).

#### 2. Đơn vị tính và công cụ kích thích ngân sách (Upsell Engine):
- Đơn vị tính là **"Bữa ăn" (Meal)**, không bán lẻ từng lạng thịt hay mớ rau.
- Công cụ Budget Planner không chỉ hiển thị giá tiền, mà liên tục đưa ra các gợi ý giá trị gia tăng để đẩy giá trị đơn hàng trung bình (AOV) từ 1.200.000đ lên **2.000.000đ – 3.000.000đ/tháng**:
  - *"Bạn tập gym? Bấm thêm 30.000đ/bữa để tăng +35% lượng ức gà / nạc bò thăn."*
  - *"Đổi gió cuối tuần? Thêm 1 bữa Steak Thăn Bò Úc xốt rượu vang chỉ +65.000đ."*
  - *"Bổ sung món Canh Thảo Dược Đông Trùng cho bố mẹ? Thêm 45.000đ."*

---

### GIAI ĐOẠN 3: THANH TOÁN FINTECH & LỊCH GIAO HÀNG ĐỊNH KỲ

#### 1. Quy tắc thanh toán:
- **Chu kỳ cam kết:** Bắt buộc tối thiểu **4 tuần** (1 chu kỳ gói tháng).
- **Thanh toán Fresh Credit trả trước:**
  - Thiết kế bảng nạp nhấn mạnh giá trị thực nhận (Perceived Value):
    - *Gói Tiêu chuẩn:* Nạp **1.500.000đ** $\rightarrow$ Nhận tài khoản ăn **2.000.000đ Fresh Credit** (Tiết kiệm 25%).
    - *Gói Gia đình Vui vẻ:* Nạp **2.800.000đ** $\rightarrow$ Nhận tài khoản ăn **3.800.000đ Fresh Credit**.
    - *Gói Premium Dinh dưỡng:* Nạp **5.000.000đ** $\rightarrow$ Nhận tài khoản ăn **7.000.000đ Fresh Credit**.
- **Auto-debit thẻ tín dụng / Gói trả sau (Post-paid Credit line qua ngân hàng đối tác):**
  - Hệ thống tự động trừ tiền trước giờ giao hàng **72 tiếng**. Nếu giao dịch thất bại, gửi thông báo cảnh báo trước 48 tiếng để khách cập nhật thẻ.

#### 2. Lịch giao hàng tối ưu vận hành:
- Khách được chọn: **1 lần/tuần** (giao toàn bộ cho tuần) hoặc **2 lần/tuần** (chia làm 2 đợt để rau củ luôn tươi mới nhất).
- Ngày giao cố định: Thứ 2 & Thứ 5, hoặc Thứ 3 & Thứ 6, hoặc Chủ Nhật cuối tuần.
- **Khung giờ giao hàng né tắc đường:**
  - Sáng sớm (06:00 – 08:00): Giao trước khi khách đi làm, đặt trong túi cách nhiệt.
  - Buổi trưa (11:00 – 13:00): Giao tận văn phòng hoặc chung cư.
  - Tối muộn (18:30 – 21:00): Khách đã có mặt ở nhà tiếp nhận.
- **Quy tắc đổi món (Cutoff Rules):**
  - Tự động gửi thông báo gợi ý thực đơn tuần tới trước 24 tiếng.
  - Khách được quyền đổi món hoặc tạm hoãn (Skip) tuần trước giờ giao hàng **8 tiếng** (giờ chốt đơn nhà máy đóng thùng).

---

### GIAI ĐOẠN 4: PRODUCT-LED GROWTH (PLG) & VIRAL LOOPS

Tận dụng cơ chế Fresh Credit để biến khách hàng thành đại sứ thương hiệu:
1. **Hoàn thiện hồ sơ:** Tặng ngay `+10.000đ – +20.000đ Fresh Credit` khi cập nhật đầy đủ chỉ số sức khỏe, sở thích chi tiết của các thành viên gia đình.
2. **Cook & Share:** Khách chụp ảnh mâm cơm đã nấu bằng gói MOVA Fresh kèm công thức và đăng tải lên Facebook/TikTok/Instagram với hashtag `#MovaFresh #ComNha15Phut` $\rightarrow$ Tự động cộng `+20.000đ Fresh Credit` vào tài khoản sau khi AI duyệt ảnh.
3. **Mời bạn bè (Referral Dual-Benefit):**
   - Người giới thiệu: Nhận ngay `+100.000đ Fresh Credit` khi bạn bè nạp gói đầu tiên.
   - Người được giới thiệu: Nhận ngay `Voucher 200.000đ` trừ trực tiếp vào đơn đầu tiên.
