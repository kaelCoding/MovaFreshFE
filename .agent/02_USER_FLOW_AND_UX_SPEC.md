# 02. ĐẶC TẢ LUỒNG TRẢI NGHIỆM NGƯỜI DÙNG & QUY CHUẨN UX (V2.2.1 SPEC)

> **Tài liệu quy định chi tiết hành trình khách hàng từ điểm chạm đầu tiên tới luồng thanh toán và vòng lặp lan tỏa.**
> Phiên bản: V2.2.1 | Cập nhật: 19/11/2026 (Meeting 17/11 Fine-Tuning & Quy chuẩn Copywriting / Giới thiệu)

---

## 1. TỔNG QUAN HÀNH TRÌNH KHÁCH HÀNG (4 GIAI ĐOẠN)

```
[Điểm chạm Quảng cáo / Mạng xã hội / Trang chủ]
          │ (Video Hook Grand Frais 10s: Unbox sơ chế -> Đảo 1 chảo -> Xong 5 món chuẩn 15 phút)
          ▼
[GIAI ĐOẠN 1: Onboarding 1–2 Phút với Đầu bếp MOVA]
  - Đăng nhập nhanh MXH chuẩn Clerk/Notion: Zalo full-width (#0068FF, badge Khuyên dùng) + Google & Facebook lưới 2 cột
  - Khảo sát nút − / +: Số người ăn (1–10), Số bữa/tuần (3–7)
  - 9 Nhu cầu sức khỏe + 6 Kiêng cữ dị ứng + ô "Khác (tự nhập)" phân tích từ khóa
  - 3 Phong cách ẩm thực chọn nhiều (Thuần Việt, Đồ Tây, Đồ Á) + nút "Chọn tất cả"
  - Ngân sách đi chợ có nút "Khác (nhập mức chi tiêu cụ thể)" với nút − / + và ô tiền VNĐ
          │
          ▼
[GIAI ĐOẠN 2: Xem & Đổi Món "Mâm Cơm Việt" Cùng Đầu Bếp]
  - Tự động sinh thực đơn tuần 1 (Mâm cơm 5 món chuẩn Á Đông)
  - Hiển thị song song đơn giá: ~...đ/suất (1 người) • ...đ/bữa (cả hộ)
  - Đổi món linh hoạt: Gợi ý 3–4 món khác hẳn nguồn đạm + Tìm kiếm thực đơn nhà máy
  - Nút "Chi tiết": Vùng thổ nhưỡng Terroir, Story, Định lượng portion_specs, Dinh dưỡng, 3 bước nấu 15 phút
  - Khách xem và duyệt thực đơn hài lòng rồi mới thanh toán
          │
          ▼
[GIAI ĐOẠN 3: Thanh Toán FinTech & Lên Lịch Giao Hàng]
  - Bắt buộc Subscription tối thiểu 4 tuần
  - Khung giờ xanh (06:00 – 08:00): Tặng ngay -15.000đ Freeship né tắc đường
  - Tần suất 1 lần/tuần có badge khuyên dùng (tối ưu phí thùng 39.000đ/lần)
  - Xác thực SĐT qua mã OTP (demo mã 1234, phone_verified: true)
  - 3 Hình thức: Gói Suất ăn trả trước (Fresh Credit - chiết khấu 10%), Chuyển khoản VietQR 4 tuần, Trừ tiền định kỳ qua Thẻ / Ví đối tác (MoMo, ZaloPay, VNPAY, Thẻ quốc tế - tự trừ trước 72h)
  - Cam kết minh bạch: Hủy liên kết thẻ/ví đối tác 1 chạm bất kỳ lúc nào
  - Hộp nhập Voucher (`THEQUATANG`, `MOVA20`, `FREESHIP` hoặc mã mời `MOVA-XXXX`)
  - Cơ chế mã mời (referral_code): Giảm trực tiếp 100.000đ vào thanh toán đơn đầu tiên
  - Điều khoản giao dịch từ xa & Bảo vệ người tiêu dùng: Dừng gói 1 chạm, cam kết hoàn tiền 7 ngày cho các bữa chưa giao, báo trước 7 ngày làm việc trước khi hết chu kỳ
  - Checkbox pháp lý thông tin cá nhân & Newsletter nhận bản tin (+15.000đ Fresh Credit)
          │
          ▼
[GIAI ĐOẠN 4: Product-Led Growth & Viral Loops]
  - Hoàn thiện profile (+10k/20k), Chia sẻ mâm cơm (+20k), Mời bạn bè (+100k Fresh Credit)
  - Bảng số dư tài khoản Fresh Credit đa năng (tiền thật + promo credit) giải tỏa tâm lý cho khách VietQR/Card
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
   - **Cam kết hook "15 phút":** Giữ nguyên thông điệp hook "15 phút - 1 chảo" trên Landing Page và Video Hero để tối đa hóa tỷ lệ chuyển đổi (tuyệt đối không đổi thành 15–30 phút).
2. **Cụm nút Đăng nhập nhanh MXH chuẩn Shopee / Grab / Notion:**
   - **Hàng 1 (Full-width, `height: 48px`, `border-radius: 12px`):** Nút **`Tiếp tục với Zalo`** nền xanh `#0068FF` (hover `#0056D6`), chữ trắng `font-weight: 600`, icon vector bong bóng chat Zalo màu trắng bên trái, huy hiệu nhỏ `Khuyên dùng` (`rgba(255,255,255,0.2)`) bên phải.
   - **Hàng 2 (Lưới 2 cột cân đối, `gap: 12px`, `height: 48px`):**
     + Cột trái: Nút **`Google`** nền trắng `#FFFFFF`, viền `1px solid #E2E8F0`, logo `G` 4 màu chuẩn vector SVG (`20x20px`) + chữ `Google`.
     + Cột phải: Nút **`Facebook`** nền trắng viền `#E2E8F0`, logo tròn xanh `#1877F2` chữ `f` trắng vector SVG (`20x20px`) + chữ `Facebook`.
   - Hiệu ứng tương tác: Hover nâng nhẹ `translateY(-1px)`, bóng đổ `0 4px 12px rgba(0,0,0,0.07)`, phản hồi nhấn `scale(0.99)`. Khách cũng có thể nhập tay SĐT hoặc Email.
3. **Phễu khảo sát Đầu bếp (5–6 bước tương tác nhanh):**
   - **Khu vực sinh sống:** Danh sách quận/huyện TP.HCM trong vùng phục vụ (nếu ngoài khu vực $\rightarrow$ mời tham gia danh sách chờ Waitlist).
   - **Số người ăn trong nhà:** Dùng bộ nút tăng giảm `−` / `+` to rõ (từ 1 đến 10 người), không bắt nhập tay.
   - **Số bữa nấu tại nhà/tuần:** Dùng bộ nút tăng giảm `−` / `+` (từ 3 đến 7 bữa/tuần).
   - **9 Nhu cầu sức khỏe:** Cân bằng dinh dưỡng, Tăng cơ / Tập Gym, Giảm mỡ / Giữ dáng, Kiểm soát đường huyết (Tiểu đường), Tiêu hóa nhẹ nhàng, Người lớn tuổi, Trẻ nhỏ, Bệnh Gout (Ít đạm purin), Thích ăn nhiều thịt + **`Khác (tự nhập)`** (tự động phân tích từ khóa và gắn tag).
   - **Kiêng cữ / Dị ứng:** Tiêu đề chuẩn hóa thành *"Nhà bạn có kiêng cữ hay dị ứng thực phẩm nào không?"*, gồm 6 nhóm kiêng cơ bản (Không ăn Bò, Không ăn Heo, Không ăn Hải sản, Không ăn cay, Không Gluten, Không Lactose) + **`Khác (tự nhập)`**, kèm chú thích an toàn: *"Đầu bếp MOVA loại trừ hoàn toàn các nguyên liệu này khỏi thực đơn của bạn."*
   - **3 Phong cách ẩm thực chọn nhiều (`cuisine_preferences[]`):**
     1. **`Thuần Việt`** (Cơm nhà truyền thống 3 miền)
     2. **`Đồ Tây (Pháp, Ý, Mỹ...)`** (Steak, áp chảo, xốt Âu)
     3. **`Đồ Á (Hàn Quốc, Trung Quốc, Đài Loan...)`** (Món Á phong vị hiện đại)
     + Bổ sung nút **`Chọn tất cả (Đa dạng Việt – Á – Tây)`**. Nếu khách không chọn gì vẫn bấm được *"Tiếp tục"* (hệ thống mặc định chọn đa dạng cả 3 phong cách).
   - **Ngân sách đi chợ hàng tuần (`weekly_grocery_budget_vnd`):** 4 mốc định sẵn (Đến 500k, 1.000k, 1.500k, 2.500k) + tùy chọn **`Khác (nhập mức chi tiêu cụ thể)`** mở bộ điều chỉnh nút `−` / `+` (bước 100k) và ô nhập VNĐ tùy chỉnh (200.000đ – 20.000.000đ). Giá trị chỉ dùng làm trần mềm cho Đầu bếp MOVA gợi ý món.

---

### GIAI ĐOẠN 2: THỰC ĐƠN DO ĐẦU BẾP TUYỂN CHỌN & ĐỔI MÓN LINH HOẠT

Khác biệt cốt lõi: **Không hiển thị danh sách hàng chục món lẻ như sàn TMĐT để khách tự bối rối.** Đầu bếp MOVA tự động xếp một thực đơn tuần 1 hoàn chỉnh đã tối ưu hóa cho thể trạng gia đình:

#### 1. Cấu trúc thực đơn theo quy mô hộ gia đình & Hiển thị đơn giá song song:
- **Trường hợp 1 người (Độc thân):**
  - Cấu trúc: 1 Khay suất ăn hoàn chỉnh cá nhân (Đạm tinh gọn + Rau xào/luộc + Cơm/Tinh bột + Xốt). Nhanh - Gọn - Sạch, nấu trong 1 chảo trong 10 phút.
- **Trường hợp Cặp đôi & Gia đình ($\ge 2$ người) — Chuẩn "Mâm Cơm Á Đông":**
  - Đủ 5 cấu phần:
    1. **Món Đạm chính:** Ba rọi heo thảo mộc Đắk Lắk kho củ sen, Thăn bò lúc lắc tiêu đen Chư Sê, Gà đồi nướng sả mật ong, Sườn non rim mắm tỏi, Cá bớp Vũng Tàu kho tộ, Tôm sú rim cay nhẹ...
    2. **Món Rau xanh:** Bông cải xanh baby Đà Lạt xốt dầu hào nấm, Cải ngọt hữu cơ Đắk Lắk xào tỏi...
    3. **Món Canh ấm bụng:** Canh sườn non hầm bí đỏ, Canh chua Nam Bộ, Canh cải ngọt thịt bằm...
    4. **Tinh bột lành mạnh:** Gạo ST25 hữu cơ Sóc Trăng, Bún gạo khô Tây Nguyên, Khoai lang mật nướng Krông Búk, Bánh mì baguette mini bơ tỏi, Mì Ý xốt cà chua tươi Đà Lạt...
    5. **Tráng miệng:** Chuối tiêu chín cây Đắk Lắk, **Vải thiều cấp đông nhanh IQF tách hạt (quay lò vi sóng 1 phút tươi 90%)**. *Tuyệt đối không dùng Bơ sáp 034 do khâu sơ chế lích kích.*
- **Quy chuẩn túi xốt:** Toàn bộ gọi là **`Gói xốt MOVA đặc biệt`** (hoặc `Gói xốt đặc biệt đi kèm`), tuyệt đối không dùng từ "Gói xốt công thức".
- **Quy tắc hiển thị giá song song:** Luôn hiển thị song song đơn giá chính theo bữa và đơn giá quy đổi theo suất: **`~...đ/suất • ...đ/bữa`** (1 người ăn = 1 suất, nhân theo số thành viên hộ gia đình) trên thẻ món, thanh chọn món và khối tóm tắt giá.

#### 2. Cơ chế Đổi món linh hoạt & Modal Chi tiết món:
- Khi khách bấm **`Đổi`**, hệ thống đưa ra **3–4 gợi ý khác hẳn nguồn đạm** (bò $\leftrightarrow$ gà $\leftrightarrow$ heo $\leftrightarrow$ cá/tôm) kèm chênh lệch giá hộ gia đình, đồng thời có thanh tìm kiếm trong toàn bộ thực đơn nhà máy.
- Bấm **`Chi tiết`** mở modal hiển thị minh bạch 100% metadata:
  + Huy hiệu vùng miền `terroir_region` (Đắk Lắk, Chư Sê • Gia Lai, Đà Lạt, Biển Vũng Tàu, Sóc Trăng...).
  + Câu chuyện thổ nhưỡng 2–3 câu giàu cảm xúc `terroir_story`.
  + Mẹo nấu ngon từ Đầu bếp MOVA `chef_note`.
  + Bảng định lượng tịnh nhân đúng theo số thành viên đang chọn (`net_weight_grams * size`).
  + Quy cách sơ chế `size_detail` & Hướng dẫn bảo quản `storage_guide`.
  + 4 chỉ số dinh dưỡng 1 khẩu phần `nutrition_per_serving` (Calo, Đạm, Tinh bột, Béo).
  + 3 bước nấu nhanh trong 15 phút — 1 chảo `cooking_steps`.

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
- **Xác thực SĐT (OTP):** Bắt buộc bấm xác thực OTP (mô phỏng demo mã `1234`, `phone_verified: true`) để đảm bảo shipper liên hệ chính xác khi giao hàng.
- **Tiêu đề phần 3:** Chuẩn hóa thành **"3. Thanh toán"**.
- **3 Hình thức thanh toán trả trước (Zero COD):**
  1. **Gói Suất ăn trả trước — Fresh Credit (Khuyên dùng):** Mua theo Gói 4 tuần hoặc 13 tuần cố định (hiển thị rõ số bữa & suất ăn quy đổi), nhận ưu đãi chiết khấu khoảng 10% điểm bữa ăn tặng kèm. Tắt tính năng nạp số tiền lẻ tùy ý (`minTopUpVnd`) trên giao diện người dùng để đảm bảo tuân thủ NĐ 52/2024.
  2. **Chuyển khoản VietQR:** Thanh toán trọn gói cho cả 4 tuần qua mã QR động (khớp tự động theo mã đối soát).
  3. **Trừ tiền định kỳ qua Thẻ / Ví đối tác (MoMo, ZaloPay, VNPAY, Cổng thẻ):** Tự động trừ tiền trước giờ giao **72 tiếng** (Auto-debit cutoff). Hiển thị minh bạch lịch trừ tiền từng tuần kèm cam kết nổi bật: *"Bạn có thể hủy liên kết thẻ/ví đối tác bất kỳ lúc nào chỉ với 1 chạm"*.
- **Điều khoản giao dịch từ xa & Bảo vệ người tiêu dùng (Luật BVQLNTD 19/2023):**
  + Khối thông tin xếp gọn/mở rộng giải thích minh bạch: Dừng gói 1 chạm bất kỳ lúc nào; **Cam kết hoàn tiền trong 7 ngày làm việc** cho các bữa ăn chưa giao theo đúng giá trị tiền thật đã thanh toán (tất toán lại ưu đãi chu kỳ dài hạn nếu dừng trước hạn); Thông báo trước **7 ngày làm việc** trước khi hết chu kỳ gói (tuyệt đối không âm thầm tự động gia hạn gói lớn).
  + Hóa đơn GTGT điện tử được xuất tại mỗi lần giao hàng theo đúng quy định tại Điều 9 Nghị định 254/2026/NĐ-CP.
- **Quy chuẩn Copywriting & Cấm tên đối thủ:** Tuyệt đối không hiển thị tên `HelloFresh` trên giao diện người dùng. Dùng **`MOVA Fresh`**, **`Gói 4 tuần của bạn`**, **`Thẻ quà tặng MOVA Fresh`**.
- **Hộp Voucher & Mã giới thiệu:**
  + `THEQUATANG`: Thẻ quà tặng MOVA Fresh trải đều 4 tuần.
  + `MOVA20`: Giảm ngay 20.000đ cho đơn đầu tiên.
  + `FREESHIP`: Miễn phí giao hàng chặng cuối (giảm 25.000đ).
  + `MOVA-XXXX` (Mã mời bạn bè): **Khấu trừ trực tiếp 100.000đ** vào tổng tiền thanh toán hôm nay cho mọi phương thức (VietQR, Thẻ, Fresh Credit).
- **2 Checkbox chuẩn pháp lý:**
  + [x] Bắt buộc: Đồng ý với Điều khoản giao dịch từ xa, chính sách hoàn tiền 7 ngày và quy chế bảo vệ người tiêu dùng của MOVA Fresh.
  + [ ] Tùy chọn: Đăng ký nhận bản tin công thức nấu ăn Đầu bếp MOVA qua Email (`newsletter_opt_in`) $\rightarrow$ Tặng ngay **+15.000đ Fresh Credit**.

---

### GIAI ĐOẠN 4: PRODUCT-LED GROWTH (PLG) & VIRAL LOOPS

1. **Bảng số dư tài khoản Fresh Credit đa năng (RewardsTab.vue):**
   - Đặt trên cùng tab Mời bạn bè, hiển thị trực quan:
     + **Tiền mua gói trả trước:** Hoàn lại 100% cho các bữa chưa giao khi dừng gói (trong 7 ngày làm việc).
     + **Điểm ưu đãi bữa ăn tặng kèm:** Tích lũy ưu đãi mời bạn (100k), bản tin (15k), chia sẻ (20k).
   - **Chú thích giải tỏa tâm lý:** Dù chọn thanh toán định kỳ bằng **VietQR** hay **Thẻ tín dụng / Ví đối tác (MoMo, ZaloPay, VNPAY)**, tài khoản **Fresh Credit** vẫn luôn hoạt động để tích lũy điểm ưu đãi và tự động khấu trừ làm giảm số tiền khi đổi món hoặc gia hạn chu kỳ tiếp theo.
2. **Hoàn thiện hồ sơ:** Nhận `+10.000đ – +20.000đ Fresh Credit` khi cập nhật đầy đủ chỉ số khẩu vị các thành viên.
3. **Cook & Share:** Đăng ảnh mâm cơm đã nấu kèm hashtag `#MovaFresh #ComNha15Phut` $\rightarrow$ Nhận `+20.000đ Fresh Credit`.
4. **Mời bạn bè (Referral Dual-Benefit 100k):**
   - **Người được mời:** Khấu trừ trực tiếp **`100.000đ`** vào đơn đầu tiên khi đăng ký qua link mời hoặc nhập mã `MOVA-XXXX` (áp dụng cho cả 3 phương thức thanh toán, tuân thủ trần ưu đãi chu kỳ đầu).
   - **Người giới thiệu:** Nhận ngay **`+100.000đ` vào ngăn `promo` tài khoản Fresh Credit** ngay sau khi đơn đầu tiên của bạn bè thanh toán thành công.
