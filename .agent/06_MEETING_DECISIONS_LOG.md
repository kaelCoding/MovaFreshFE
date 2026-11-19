# 06. BIÊN BẢN CÁC QUYẾT ĐỊNH CHIẾN LƯỢC (MEETING DECISIONS LOG)

> **Tài liệu lưu trữ các quyết định then chốt đã được thống nhất tuyệt đối bởi Ban sáng lập MOVA Fresh trong các phiên họp chiến lược.**
> **Quy định bất biến:** Mọi AI Agent và thành viên kỹ thuật KHÔNG tranh luận lại các vấn đề đã được đóng dấu quyết định tại đây.

---

## BIÊN BẢN CUỘC HỌP BAN SÁNG LẬP NGÀY 17/11/2026 (PHIÊN HỌP CHIẾN LƯỢC V2.2)

- **Thời gian:** Ngày 17/11/2026
- **Thành phần tham dự:**
  1. **Hà My Trần** — Founder (Chủ trì, định hướng chiến lược trải nghiệm, thương hiệu & FinTech).
  2. **Trung Quốc Phạm** — Co-founder (Vận hành, kho bãi & chuỗi logistics).
  3. **Nguyễn Công Khôi** — Technical Lead (Kiến trúc hệ thống, multi-page app, security).
  4. **Hiếu** — AI & Data Lead (Bảng giá Excel thị trường, BOM & phân tích dữ liệu).

### TỔNG HỢP CÁC QUYẾT ĐỊNH V2.2 (CHỐT NGÀY 17/11/2026)

1. **Thay thế 100% nhãn "AI" bằng "Đầu bếp" (Chef) trên toàn bộ App Khách (`/`, `/plans`, `/account`):**
   - Không dùng từ "AI" trên giao diện người dùng cuối vì tạo cảm giác thức ăn nhân tạo, công nghiệp. Đổi thành: **"Thực đơn do Đầu bếp thiết kế riêng"**, **"Đầu bếp MOVA tuyển chọn"**.
   - *Phân định ranh giới kỹ thuật:* Thư mục code backend bên `movafresh-platform` vẫn giữ tên kỹ thuật là `ai-engine/`, nhưng lớp hiển thị và copywriting khách hàng 100% dùng hình tượng **Đầu bếp**.
2. **Tôn vinh nguồn gốc thổ nhưỡng (Terroir) & Bỏ hoàn toàn Bơ sáp 034:**
   - 100% món ăn phải gắn xuất xứ đặc sản vùng miền rõ ràng (Đắk Lắk, Chư Sê, Buôn Đôn, Đà Lạt, Biển Vũng Tàu, Sóc Trăng...).
   - **Xóa bỏ hoàn toàn Bơ sáp 034** khỏi nhóm tráng miệng: Khách phải tự dùng dao gọt vỏ, xay sinh tố và rửa cối lích kích, đi ngược lại tôn chỉ *"Nấu xong trong 15 phút — Chỉ 1 chảo"*.
   - Nhóm tráng miệng chỉ dùng trái cây ăn liền (Chuối tiêu chín cây Đắk Lắk) hoặc **trái cây cấp đông nhanh IQF** (như *Vải thiều cấp đông nhanh IQF tách hạt — quay lò vi sóng 1 phút tươi 90%*).
3. **Nâng cấp Khảo sát Hồ sơ (`/plans` — Bước 1):**
   - Đăng nhập nhanh 1 chạm bằng Google, Zalo, Facebook để tự động điền contact.
   - Số người ăn (1–10) và số bữa/tuần (3–7) chỉ dùng nút bấm to rõ `− / +`, không bắt nhập tay hay dùng dropdown.
   - Mở rộng 9 nhu cầu sức khỏe và 6 kiêng cữ dị ứng, bổ sung lựa chọn **"Khác (tự nhập)"** với bộ phân tích từ khóa thời gian thực (gõ *"gout"* $\rightarrow$ tag `Ít đạm purin`; *"không hải sản"* $\rightarrow$ tag `Kiêng hải sản`; *"ít dầu"* $\rightarrow$ tag `Thanh đạm`).
   - 3 phong cách ẩm thực rõ ràng: **Thuần Việt**, **Đồ Tây (Pháp, Ý, Mỹ...)**, **Đồ Á (Hàn Quốc, Trung Quốc, Đài Loan...)**.
4. **Đổi món linh hoạt & Modal Chi tiết món (Trang chủ, `/plans` và `/account`):**
   - Cơ chế đổi món không chỉ gợi ý món cùng nguyên liệu gốc (tránh đổi gà sang gà), mà đưa ra **3–4 gợi ý khác hẳn nguồn đạm** kèm chênh lệch giá hộ gia đình, tích hợp ô tìm kiếm toàn bộ thực đơn nhà máy.
   - Nút **`Chi tiết`** mở modal hiển thị đầy đủ: Ảnh/màu nhóm tươi sống, Huy hiệu vùng miền `terroir_region`, Câu chuyện thổ nhưỡng `terroir_story`, Mẹo ngon `chef_note`, Bảng định lượng tịnh nhân đúng theo số thành viên đang chọn, Quy cách sơ chế `size_detail`, Hướng dẫn bảo quản `storage_guide`, 4 chỉ số dinh dưỡng (Calo, Đạm, Tinh bột, Béo) và 3 bước nấu 15 phút.
5. **Giao hàng Khung giờ xanh (06:00 – 08:00):**
   - Khuyến khích khách nhận hàng sáng sớm né tắc đường bằng badge **`Freeship / Ưu đãi khung giờ xanh -15.000đ`**, giảm trực tiếp 15.000đ vào tổng tiền thanh toán tuần đầu tiên.
   - Huy hiệu khuyên dùng tần suất **1 lần mỗi tuần** để tối ưu chi phí thùng & vận chuyển (39.000đ/lần giao).
6. **Xác thực Số điện thoại bằng OTP tại bước Thanh toán:**
   - Cạnh ô nhập SĐT có nút **`Xác thực SĐT (OTP)`** mở modal xác thực OTP (mô phỏng demo mã `1234`), thành công hiển thị huy hiệu xanh `✓ Đã xác thực OTP`. Bắt buộc xác thực SĐT trước khi bấm thanh toán.
7. **Đổi tiêu đề & Hộp Voucher giảm giá:**
   - Đổi tên phần 3 thành **"3. Thanh toán"** (thay vì "Cách trả trước"), mô tả rõ ràng chu kỳ tự động trừ thẻ trước 72 giờ.
   - Thêm hộp nhập Voucher hỗ trợ các mã: `THEQUATANG` (thẻ quà tặng MOVA Fresh), `MOVA20` (giảm 20.000đ), `FREESHIP` (miễn phí ship 25.000đ) trừ trực tiếp vào số tiền thanh toán hôm nay.
8. **Quy chuẩn pháp lý Checkbox:**
   - Checkbox 1 (Bắt buộc): Đồng ý cho phép MOVA xử lý thông tin cá nhân và địa chỉ phục vụ đơn hàng.
   - Checkbox 2 (Tùy chọn): Đăng ký nhận bản tin công thức nấu ăn Đầu bếp MOVA tặng ngay **+15.000đ Fresh Credit** vào tài khoản.
9. **Kinh tế đơn vị (Unit Economics) từ bảng giá Excel của Hiếu:**
   - **Ràng buộc cốt lõi:** $\text{Tổng chi phí Nguyên liệu} + \text{Vận chuyển} \le 50\%$ giá bán lẻ.
   - Giá vốn trực tiếp (COGS) tối đa: **55%** (nguyên liệu, sơ chế, bao bì thùng cách nhiệt 14.000đ + ship nội thành 25.000đ = 39.000đ / 6 bữa = 6.500đ/bữa).
   - Chi phí vận hành & Marketing (OPEX & MKT): **15%**.
   - **Lợi nhuận ròng mục tiêu (Net Margin): ~30%** (Gross Margin 20% – 30%).

---

## BIÊN BẢN CÁC QUYẾT ĐỊNH TINH CHỈNH V2.2.1 (BỔ SUNG SAU HỌP 17/11/2026)

- **Thời gian:** 19/11/2026
- **Thành phần thống nhất:** Hà My Trần (Founder), Trung Quốc Phạm (Co-founder), Nguyễn Công Khôi (Tech Lead), Hiếu (AI & Data Lead).

### CÁC QUYẾT ĐỊNH BỔ SUNG V2.2.1

1. **Quy chuẩn Copywriting & Hook thương hiệu:**
   - **Cấm tuyệt đối tên đối thủ "HelloFresh"** xuất hiện trên giao diện khách hàng, copywriting, thông báo hay marketing (thay thế bằng `MOVA Fresh`, `Gói 4 tuần của bạn`, `Thẻ quà tặng MOVA Fresh`).
   - Chuẩn hóa tên gói xốt: Khai tử hoàn toàn cụm từ "Gói xốt công thức", đổi thành **`Gói xốt MOVA đặc biệt`** (hoặc `Gói xốt đặc biệt đi kèm`).
   - **Bảo vệ Hook 15 phút:** Giữ nguyên cam kết hook **"15 phút"** (Mâm cơm 5 món chuẩn ngon trong 15 phút — 1 chảo) trên Landing Page và Video Hero để tối đa hóa tỷ lệ chuyển đổi, tuyệt đối không nới lỏng thành 15–30 phút.
2. **Quy tắc Hiển thị Giá & Khuyến mãi Giới thiệu:**
   - **Hiển thị giá song song theo suất và bữa:** Tại bước chọn thực đơn (`StepMenu.vue`, `PriceBlock.vue`) và thanh toán (`StepCheckout.vue`), luôn hiển thị song song đơn giá chính theo bữa và đơn giá quy đổi theo suất: **`~...đ/suất • ...đ/bữa`** (1 người ăn = 1 suất, nhân theo số thành viên hộ) giúp khách hàng thấy rõ mức giá hợp lý và tính kinh tế của giải pháp.
   - **Cơ chế Mời bạn bè (Referral Dual-Benefit 100.000đ):**
     + Người được mời: Được **khấu trừ trực tiếp `100.000đ`** vào đơn đầu tiên khi đăng ký qua link mời hoặc nhập mã `MOVA-XXXX` (áp dụng cho cả 3 phương thức thanh toán: `fresh_credit`, `bank_transfer_4w`, `card`, đảm bảo tuân thủ trần ưu đãi chu kỳ đầu $\le 30\%$).
     + Người giới thiệu: Nhận ngay **`+100.000đ` vào ngăn `promo` của tài khoản Fresh Credit** ngay sau khi đơn đầu tiên của người được mời thanh toán thành công.
     + **Bảng tài khoản Fresh Credit đa năng:** Hiển thị số dư tiền thật + tiền khuyến mãi ngay trên đầu tab Mời bạn bè, kèm ghi chú giải thích rõ: Dù chọn thanh toán định kỳ bằng VietQR hay Thẻ tín dụng, tài khoản Fresh Credit vẫn luôn hoạt động để tích lũy thưởng và tự động khấu trừ giảm tiền cho các chu kỳ tiếp theo hoặc khi đổi món.
3. **Bổ sung các trường mới trong Onboarding & Metadata món ăn:**
   - **Khảo sát khẩu vị đa chọn (`cuisine_preferences[]`):** Hỗ trợ chọn nhiều trong 3 nhóm (`Thuần Việt`, `Đồ Tây`, `Đồ Á`), thêm nút nhanh "Chọn tất cả (Đa dạng Việt – Á – Tây)" và cho phép tiếp tục khi không chọn gì (mặc định đa dạng cả 3).
   - **Ngân sách đi chợ (`weekly_grocery_budget_vnd`):** Thêm lựa chọn "Khác (tự nhập mức chi tiêu cụ thể)" với nút `− / +` bước nhảy 100.000đ và ô nhập VNĐ tùy chỉnh (200.000đ – 20.000.000đ), chỉ làm trần mềm cho Đầu bếp MOVA gợi ý món.
   - **Xác thực OTP SĐT (`phone_verified`):** Bắt buộc xác thực OTP tại bước giao hàng/thanh toán.
   - **Đăng ký nhận bản tin (`newsletter_opt_in`):** Checkbox tùy chọn nhận bản tin công thức nấu ăn Đầu bếp MOVA tặng ngay `+15.000đ` promo credit.
   - **Metadata món ăn đầy đủ:** `terroir_region`, `terroir_story`, `chef_note`, `portion_specs`, `nutrition_per_serving`, `cooking_steps`.

---

---

## BIÊN BẢN PHÁP LÝ & KẾ TOÁN XANH NGÀY 19/11/2026 (LEGAL COMPLIANCE & GREEN ACCOUNTING SYNC)

- **Thời gian:** 19/11/2026
- **Thành phần thống nhất:** Hà My Trần (Founder), Trung Quốc Phạm (Co-founder), Nguyễn Công Khôi (Tech Lead), Hiếu (AI & Data Lead).

### CÁC QUYẾT ĐỊNH PHÁP LÝ & HẠCH TOÁN KẾ TOÁN CHỐT NGÀY 19/11/2026

1. **Bảng phân loại Pháp lý Đỏ / Vàng / Xanh:**
   - **ĐỎ (Cấm tuyệt đối):**
     + Cấm Ví điện tử tự phát (NĐ 52/2024/NĐ-CP): Không giữ giấy phép ví trung gian thanh toán, xóa bỏ hoàn toàn chữ "Ví" trên UI khách; cấm nạp/rút/chuyển tiền tự do như ví điện tử.
     + Cấm Huy động vốn & Trả lãi trên số dư chờ (Luật Các TCTD 32/2024/QH15): Cấm dùng từ "lãi", cấm "thưởng nạp kiểu ngân quỹ"; chỉ dùng *"Ưu đãi chiết khấu khi mua Gói Suất ăn trả trước"*. Tắt hoàn toàn ô nhập nạp tiền lẻ tự do minTopUpVnd trên UI.
     + Cấm Bẫy tự động gia hạn âm thầm & Giữ cọc không cho rút (Luật BVQLNTD 19/2023/QH15): Cấm âm thầm auto-renew gói lớn, cấm phạt mất trắng tiền thật khi dừng gói.
   - **VÀNG (Tuân thủ có điều kiện):**
     + Hóa đơn GTGT từng lần giao hàng (NĐ 254/2026 Điều 9 khoản 1, 3): Bữa ăn là hàng hóa thực phẩm giao định kỳ, xuất hóa đơn điện tử cho từng lần giao hàng thực tế. Cấu hình hệ thống `invoicing.issueOn = 'delivery'`.
     + Tài khoản trả trước đóng kín nội bộ: Điểm Fresh Credit chỉ được dùng để đổi bữa ăn tại MOVA Fresh, không chuyển nhượng sang tài khoản khác.
   - **XANH (Khuyến khích & Chuẩn hóa):**
     + Gói Suất ăn trả trước (Pre-paid meal package): Hạch toán Nợ 112 / Có 131; khi giao hàng hạch toán Nợ 131 / Có 511, Có 33311 (Thông tư 99/2025/TT-BTC).
     + Phí thành viên hội viên MOVA Club năm: Hạch toán Nợ 112 / Có 3387, 33311; phân bổ hàng tháng vào 511.
     + Trừ tiền định kỳ qua liên kết thẻ/ví đối tác (MoMo, ZaloPay, VNPAY, Cổng thẻ): Tiền trừ trước giờ giao 72h, khách có quyền HỦY 1 CHẠM bất kỳ lúc nào.
     + Cam kết hoàn tiền trong 7 ngày làm việc: Hoàn trả 100% tiền thật các bữa chưa giao về tài khoản nguồn. Báo trước 7 ngày làm việc trước khi hết chu kỳ gói.

2. **Kiến trúc dòng tiền 4 tầng (4-Layer Cash Flow Architecture):**
   - **Tầng `D` — Nền tảng bắt buộc (Foundational Mandatory):** Trừ thẻ định kỳ trước giờ giao 72h / Liên kết ví đối tác (MoMo, ZaloPay, VNPAY) — Zero rủi ro pháp lý theo NĐ 52/2024.
   - **Tầng `A` — Dòng tiền trả trước (Pre-paid Meal Float):** Gói suất ăn trả trước 4 tuần / 13 tuần, hạch toán TK 131, ưu đãi chiết khấu tặng bữa, hoàn tiền bữa chưa giao trong 7 ngày.
   - **Tầng `C` — Đường ống thu hộ (Collection Pipelines):** VietQR tĩnh / động qua ngân hàng/cổng thanh toán, tiền chuyển thẳng vào tài khoản ngân hàng của MOVA Fresh.
   - **Tầng `B` — Giá trị gia tăng tùy chọn (Optional Addons):** Phí hội viên MOVA Club năm (TK 3387), quà tặng doanh nghiệp B2B.

3. **Cấu hình hệ thống & Trải nghiệm người dùng:**
   - Điền sẵn bộ mã tài khoản kế toán chuẩn Thông tư 99/2025 vào `BUSINESS.finance.accountMap`: `cash_bank: '112'`, `cash_hand: '111'`, `customer_prepaid: '131'`, `revenue: '511'`, `vat_output: '33311'`, `membership_deferred: '3387'`.
   - Tại trang `/account`: Đưa nút **"Dừng gói 1 chạm"** và **"Hủy liên kết thẻ/ví đối tác"** ra vị trí nổi bật, dễ thấy, không giấu sâu trong cài đặt. Modal dừng gói hiển thị minh bạch bảng tính: số bữa chưa nhận, số tiền hoàn lại thực tế và cam kết hoàn tiền trong 7 ngày làm việc.
   - Tại màn hình `/plans` (`StepCheckout.vue`): Hiển thị khối **"Điều khoản giao dịch từ xa & Chính sách đổi trả"** (Luật BVQLNTD) và cam kết hủy liên kết thẻ/ví 1 chạm bất kỳ lúc nào.

---

## BIÊN BẢN CUỘC HỌP BAN SÁNG LẬP NGÀY 15/11/2026 (PHIÊN HỌP KHỞI ĐỘNG V2)

- **Thời gian:** 13:09, ngày 15/11/2026, kéo dài khoảng 62 phút (theo bản ghi Fireflies).
- **Thành phần tham dự:** Hà My Trần (Founder), Trung Quốc Phạm (Co-founder), Nguyễn Công Khôi (Tech Lead), Hiếu (AI & Data Lead).

### CÁC QUYẾT ĐỊNH ĐÃ THỐNG NHẤT TỪ 15/11/2026 (LƯU TRỮ LỊCH SỬ)

1. **Bản chất mô hình là FinTech dòng tiền:** Bác bỏ hoàn toàn tư duy sàn bán lẻ TMĐT. Tiền khách hàng vào trước 100%, trả nhà máy và NCC sau theo công nợ gối đầu 15–30 ngày. Vốn lưu động luôn dương.
2. **Khai tử hoàn toàn COD (Zero COD):** 100% thanh toán trước qua Fresh Credit, thẻ tín dụng hoặc chuyển khoản định kỳ.
3. **Tuân thủ Nghị định 52/2024/NĐ-CP:** Không bao giờ dùng từ "ví điện tử". Chỉ dùng thuật ngữ **Fresh Credit** hoặc **Điểm bữa ăn trả trước**.
4. **Subscription tối thiểu 4 tuần:** Không bán lẻ từng tuần rời rạc. Áp dụng cơ chế voucher trải đều theo tuần (mô hình chuẩn MOVA Fresh) để đạt Retention $\ge 50\%$.
5. **Cấu trúc mâm cơm Á Đông:** Bữa ăn gia đình gồm 5 cấu phần: Đạm + Rau + Canh + Tinh bột + Trái cây.
6. **Loại bỏ gia vị bếp cơ bản & Dán sticker nhiệt độ:** Không đóng gói mắm, muối, đường, dầu ăn. Nhà máy dán trực tiếp Sticker Xanh (Mát) và Xanh Dương (Đông) lên khay nguyên liệu, không hiển thị rối trên web.
7. **Hạn đổi món:** Khóa đổi món lúc **giờ chốt sổ nhà máy của chuyến giao (mặc định 08:00 sáng ngày D-2)**. Giao diện luôn hiện ngày giờ cụ thể, không ghi "8 tiếng trước giờ giao".
8. **Mốc Launch Sản Phẩm Thật:** **Tháng 12/2026**.
