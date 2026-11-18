# 02. ĐẶC TẢ LUỒNG TRẢI NGHIỆM NGƯỜI DÙNG & QUY CHUẨN UX (V2.2 SPEC)

> **Tài liệu quy định chi tiết hành trình khách hàng từ điểm chạm đầu tiên tới luồng thanh toán và vòng lặp lan tỏa.**
> Phiên bản: V2.2 | Cập nhật: 18/11/2026 (Meeting 17/11 Chị My & Bảng giá thực tế)

---

## 1. TỔNG QUAN HÀNH TRÌNH KHÁCH HÀNG (4 GIAI ĐOẠN)

```
[Điểm chạm Quảng cáo / Mạng xã hội / Trang chủ]
          │ (Video Hook Grand Frais 10s: Unbox sơ chế -> Đảo 1 chảo -> Xong 5 món)
          ▼
[GIAI ĐOẠN 1: Onboarding 1–2 Phút với Đầu bếp MOVA]
  - Đăng nhập nhanh 1 chạm: Google, Zalo, Facebook (hoặc nhập SĐT/Email)
  - Khảo sát nút − / +: Số người ăn (1–10), Số bữa/tuần (3–7)
  - 9 Nhu cầu sức khỏe + 6 Kiêng cữ dị ứng + ô "Khác (tự nhập)" phân tích từ khóa
  - 3 Phong cách ẩm thực: Thuần Việt, Đồ Tây, Đồ Á
          │
          ▼
[GIAI ĐOẠN 2: Xem & Đổi Món "Mâm Cơm Việt" Cùng Đầu Bếp]
  - Tự động sinh thực đơn tuần 1 (Mâm cơm 5 món chuẩn Á Đông)
  - Đổi món linh hoạt: Gợi ý 3–4 món khác hẳn nguồn đạm + Tìm kiếm thực đơn nhà máy
  - Nút "Chi tiết": Vùng thổ nhưỡng Terroir, Story, Định lượng theo số người, Dinh dưỡng, 3 bước nấu 15 phút
  - Khách xem và duyệt thực đơn hài lòng rồi mới thanh toán
          │
          ▼
[GIAI ĐOẠN 3: Thanh Toán FinTech & Lên Lịch Giao Hàng]
  - Bắt buộc Subscription tối thiểu 4 tuần
  - Khung giờ xanh (06:00 – 08:00): Tặng ngay -15.000đ Freeship né tắc đường
  - Tần suất 1 lần/tuần có badge khuyên dùng (tối ưu phí thùng 39.000đ/lần)
  - Xác thực SĐT qua mã OTP (demo mã 1234)
  - 3 Hình thức: Nạp Fresh Credit (~10% thưởng), Chuyển khoản VietQR 4 tuần, Thẻ tín dụng (tự trừ trước 72h)
  - Hộp nhập Voucher (`THEQUATANG`, `MOVA20`, `FREESHIP`)
  - Checkbox pháp lý thông tin cá nhân & Newsletter nhận bản tin (+15.000đ Fresh Credit)
          │
          ▼
[GIAI ĐOẠN 4: Product-Led Growth & Viral Loops]
  - Hoàn thiện profile (+10k/20k), Chia sẻ mâm cơm (+20k), Mời bạn bè (+100k Fresh Credit)
```

---

## 2. CHI TIẾT CÁC GIAI ĐOẠN TRẢI NGHIỆM

### GIAI ĐOẠN 1: TOUCHPOINT & KHẢO SÁT HỒ SƠ (1–2 PHÚT)

Mục tiêu: **Rào cản gia nhập thấp nhất có thể (Frictionless Entry)**, chuyển đổi traffic từ mạng xã hội thành lead định danh chỉ trong vài giây.

1. **Khung Video Hook 10 giây (học tập Grand Frais):**
   - Đặt ngay tại đầu trang chủ (`MealKitVideoHook.vue`), tự động phát cận cảnh nguyên liệu tươi sống Đắk Lắk và chuyển động nấu thật:
     + `00:00 Mở hộp Đắk Lắk sơ chế sạch`
     + `00:05 Đảo 1 chảo & rưới túi xốt`
     + `00:15 Xong mâm cơm 5 món`
2. **Đăng nhập nhanh 1 chạm:**
   - Hỗ trợ nút đăng nhập qua **Google**, **Zalo**, **Facebook** giúp điền tự động thông tin liên hệ và chuyển thẳng vào khảo sát. Khách cũng có thể nhập tay SĐT hoặc Email.
3. **Phễu khảo sát Đầu bếp (5–6 bước tương tác nhanh):**
   - **Khu vực sinh sống:** Danh sách quận/huyện TP.HCM trong vùng phục vụ (nếu ngoài khu vực $\rightarrow$ mời tham gia danh sách chờ Waitlist).
   - **Số người ăn trong nhà:** Dùng bộ nút tăng giảm `−` / `+` to rõ (từ 1 đến 10 người), không bắt nhập tay.
   - **Số bữa nấu tại nhà/tuần:** Dùng bộ nút tăng giảm `−` / `+` (từ 3 đến 7 bữa/tuần).
   - **9 Nhu cầu sức khỏe:** Cân bằng dinh dưỡng, Tăng cơ / Tập Gym, Giảm mỡ / Giữ dáng, Kiểm soát đường huyết (Tiểu đường), Tiêu hóa nhẹ nhàng, Người lớn tuổi, Trẻ nhỏ, Bệnh Gout (Ít đạm purin), Thích ăn nhiều thịt + **`Khác (tự nhập)`** (tự động phân tích từ khóa và gắn tag).
   - **6 Kiêng cữ / Dị ứng:** Không ăn Bò, Không ăn Heo, Không ăn Hải sản, Không ăn cay, Không Gluten, Không Lactose (sữa) + **`Khác (tự nhập)`**.
   - **3 Phong cách ẩm thực chuẩn xác:**
     1. **`Thuần Việt`** (Cơm nhà truyền thống 3 miền)
     2. **`Đồ Tây (Pháp, Ý, Mỹ...)`** (Steak, áp chảo, xốt Âu)
     3. **`Đồ Á (Hàn Quốc, Trung Quốc, Đài Loan...)`** (Món Á phong vị hiện đại)

---

### GIAI ĐOẠN 2: THỰC ĐƠN DO ĐẦU BẾP TUYỂN CHỌN & ĐỔI MÓN LINH HOẠT

Khác biệt cốt lõi: **Không hiển thị danh sách hàng chục món lẻ như sàn TMĐT để khách tự bối rối.** Đầu bếp MOVA tự động xếp một thực đơn tuần 1 hoàn chỉnh đã tối ưu hóa cho thể trạng gia đình:

#### 1. Cấu trúc thực đơn theo quy mô hộ gia đình:
- **Trường hợp 1 người (Độc thân):**
  - Cấu trúc: 1 Khay suất ăn hoàn chỉnh cá nhân (Đạm tinh gọn + Rau xào/luộc + Cơm/Tinh bột + Xốt). Nhanh - Gọn - Sạch, nấu trong 1 chảo trong 10 phút.
- **Trường hợp Cặp đôi & Gia đình ($\ge 2$ người) — Chuẩn "Mâm Cơm Á Đông":**
  - Đủ 5 cấu phần:
    1. **Món Đạm chính:** Ba rọi heo thảo mộc Đắk Lắk kho củ sen, Thăn bò lúc lắc tiêu đen Chư Sê, Gà đồi nướng sả mật ong, Sườn non rim mắm tỏi, Cá bớp Vũng Tàu kho tộ, Tôm sú rim cay nhẹ...
    2. **Món Rau xanh:** Bông cải xanh baby Đà Lạt xốt dầu hào nấm, Cải ngọt hữu cơ Đắk Lắk xào tỏi...
    3. **Món Canh ấm bụng:** Canh sườn non hầm bí đỏ, Canh chua Nam Bộ, Canh cải ngọt thịt bằm...
    4. **Tinh bột lành mạnh:** Gạo ST25 hữu cơ Sóc Trăng, Bún gạo khô Tây Nguyên, Khoai lang mật nướng Krông Búk, Bánh mì baguette mini bơ tỏi, Mì Ý xốt cà chua tươi Đà Lạt...
    5. **Tráng miệng:** Chuối tiêu chín cây Đắk Lắk, **Vải thiều cấp đông nhanh IQF tách hạt (quay lò vi sóng 1 phút tươi 90%)**. *Tuyệt đối không dùng Bơ sáp 034 do khâu sơ chế lích kích.*

#### 2. Cơ chế Đổi món linh hoạt & Modal Chi tiết món:
- Khi khách bấm **`Đổi`**, hệ thống đưa ra **3–4 gợi ý khác hẳn nguồn đạm** (bò $\leftrightarrow$ gà $\leftrightarrow$ heo $\leftrightarrow$ cá/tôm) kèm chênh lệch giá hộ gia đình, đồng thời có thanh tìm kiếm trong toàn bộ thực đơn nhà máy.
- Bấm **`Chi tiết`** mở modal hiển thị minh bạch:
  + Huy hiệu vùng miền `terroir_region` & câu chuyện thổ nhưỡng 2–3 câu `terroir_story`.
  + Mẹo nấu ngon từ Đầu bếp MOVA `chef_note`.
  + Bảng định lượng tịnh nhân đúng theo số thành viên đang chọn (`net_weight_grams * size`).
  + Quy cách sơ chế `size_detail` & Hướng dẫn bảo quản `storage_guide`.
  + 4 chỉ số dinh dưỡng 1 khẩu phần (Calo, Đạm, Tinh bột, Béo).
  + 3 bước nấu nhanh trong 15 phút — 1 chảo.

---

### GIAI ĐOẠN 3: THANH TOÁN FINTECH & LỊCH GIAO HÀNG ĐỊNH KỲ

#### 1. Quy tắc giao hàng & Khung giờ xanh:
- **Tần suất giao:** **1 lần/tuần** (có badge *"Khuyên dùng - tối ưu phí thùng & ship 39.000đ/lần"*) hoặc **2 lần/tuần**.
- **Khung giờ giao hàng:**
  - **Sáng sớm (06:00 – 08:00) — Khung giờ xanh:** Gắn badge **`Freeship / Ưu đãi khung giờ xanh -15.000đ`**, giảm trực tiếp 15.000đ vào tổng thanh toán đợt đầu.
  - Buổi trưa (11:00 – 13:00)
  - Buổi tối (18:00 – 21:00)
- **Hạn chốt đổi món (Customization Cutoff):**
  - Mặc định **08:00 sáng ngày D-2** (giờ chốt sổ của nhà máy Đắk Lắk).
  - Giao diện luôn hiển thị ngày giờ cụ thể (Ví dụ: *"Đổi món trước 08:00 thứ Sáu 27/11"*). **Tuyệt đối không ghi "8 tiếng trước giờ giao"**.

#### 2. Xác thực Số điện thoại & Thanh toán:
- **Xác thực SĐT (OTP):** Bắt buộc bấm xác thực OTP (mô phỏng demo mã `1234`) để đảm bảo shipper liên hệ chính xác khi giao hàng.
- **Tiêu đề phần 3:** Chuẩn hóa thành **"3. Thanh toán"**.
- **3 Hình thức thanh toán:**
  1. **Nạp Fresh Credit (Khuyên dùng):** Nạp gói trả trước kèm thưởng nạp ~10% (Gói Tiêu chuẩn, Gia đình, Dinh dưỡng hoặc Gói đủ 4 tuần).
  2. **Chuyển khoản VietQR:** Thanh toán trọn gói cho cả 4 tuần qua mã QR động.
  3. **Liên kết thẻ tín dụng:** Tự động trừ tiền trước giờ giao **72 tiếng** (Auto-debit cutoff).
- **Hộp Voucher:** Nhập mã giảm giá:
  + `THEQUATANG`: Thẻ quà tặng HelloFresh trải đều 4 tuần.
  + `MOVA20`: Giảm ngay 20.000đ cho đơn đầu tiên.
  + `FREESHIP`: Miễn phí giao hàng chặng cuối (giảm 25.000đ).
- **2 Checkbox chuẩn pháp lý:**
  + [x] Bắt buộc: Đồng ý cho MOVA Fresh sử dụng thông tin liên hệ và địa chỉ để xử lý đơn hàng.
  + [ ] Tùy chọn: Đăng ký nhận bản tin công thức nấu ăn Đầu bếp MOVA qua Email $\rightarrow$ Tặng ngay **+15.000đ Fresh Credit**.

---

### GIAI ĐOẠN 4: PRODUCT-LED GROWTH (PLG) & VIRAL LOOPS

1. **Hoàn thiện hồ sơ:** Nhận `+10.000đ – +20.000đ Fresh Credit` khi cập nhật đầy đủ chỉ số khẩu vị các thành viên.
2. **Cook & Share:** Đăng ảnh mâm cơm đã nấu kèm hashtag `#MovaFresh #ComNha15Phut` $\rightarrow$ Nhận `+20.000đ Fresh Credit`.
3. **Mời bạn bè (Referral Dual-Benefit):**
   - Người giới thiệu: Nhận `+100.000đ Fresh Credit` khi bạn bè thanh toán chu kỳ đầu.
   - Người được giới thiệu: Nhận ưu đãi giảm giá theo thẻ quà tặng chào mừng.
