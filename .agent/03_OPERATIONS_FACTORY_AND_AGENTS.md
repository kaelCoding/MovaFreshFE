# 03. VẬN HÀNH NHÀ MÁY, KHO BÃI & HỆ THỐNG AI AGENTS

> **Quy định quy trình sản xuất thực phẩm, đóng gói, điều phối chuỗi cung ứng Đắk Lắk – TP.HCM và các tác tử AI tự động.**
> Phiên bản: V2.0 | Cập nhật: 15/11/2026

---

## 1. THUẬT TOÁN "ĐA DẠNG ĐẦU RA — TỐI GIẢN ĐẦU VÀO" (THE CORE AGGREGATION ALGORITHM)

Thách thức lớn nhất của Meal-Kit cá nhân hóa là: **Làm sao để 1.000 khách hàng nhận 1.000 thực đơn khác nhau mà nhà máy không bị vỡ trận?**

MOVA Fresh giải quyết bằng thuật toán **BOM (Bill of Materials) Reverse Aggregator**:

```
[1,000 Thực đơn Cá nhân hóa của Khách hàng]
  (Bò lúc lắc, Bò xào cần tây, Bò né bông cải, Canh thịt bò cà chua...)
                  │
                  ▼
[Thuật toán BOM Reverse Aggregator]
                  │
                  ▼
[Tập Nguyên Liệu Thô Tối Giản Cho Nhà Máy]
  - Thịt bò nạc đùi thái vuông: 145 kg
  - Thịt bò phi lê thái lát mỏng: 210 kg
  - Bông cải xanh cắt khúc: 180 kg
  - Cần tây sơ chế sạch: 95 kg
  - Cà chua rửa sạch: 120 kg
  - Gói xốt số 3 (Xốt tiêu đen): 620 gói
  - Gói xốt số 7 (Xốt tỏi chua ngọt): 510 gói
```

- **Nguyên lý:** Phía khách hàng nhìn thấy hàng trăm món phong phú. Phía nhà máy Đắk Lắk chỉ nhìn thấy **bảng tổng hợp nguyên liệu thô theo quy cách cắt thái đồng nhất** kèm mã gói xốt tương ứng.

---

## 2. QUY CHUẨN ĐÓNG GÓI & PHÂN BỔ NHÀ MÁY ĐẮK LẮK — KHO PHỤ TP.HCM

### A. Phân định nguồn cung ứng:
1. **Nhà máy sơ chế trung tâm Đắk Lắk:**
   - Đảm nhận toàn bộ: Thịt heo, Gà thả vườn Đắk Lắk, Bò ăn cỏ Tây Nguyên, Rau củ quả xứ lạnh/nhiệt đới, Gạo ST25 / nếp lứt, Khoai lang mật, Trái cây theo mùa.
   - Sơ chế sạch 100%, đóng gói hút chân không (Vacuum packaging) định lượng theo gram.
   - Sản xuất và đóng gói các túi xốt tiêu chuẩn (Sauce pouches).
2. **Kho phụ trung chuyển TP.HCM (Secondary Cold Hub):**
   - Đảm nhận: Cá tươi biển (thu mua cảng Vũng Tàu/Phan Thiết), Tôm, Mực, Hải sản tươi sống (để đảm bảo độ tươi tuyệt đối, tránh rủi ro bảo quản đường dài từ Đắk Lắk).
   - Tiếp nhận xe đông lạnh hàng ngày từ Đắk Lắk $\rightarrow$ Ghép bộ Hải sản $\rightarrow$ Đóng thùng tổng hợp giao cho shipper chặng cuối.

### B. Phạm vi đóng gói hộp Meal-Kit:
- **Thành phần BẮT BUỘC có trong hộp:**
  - [x] Thịt / Cá / Tôm (đóng chân không, nhãn mác rõ ràng).
  - [x] Rau củ rửa sạch, cắt khúc sẵn sàng vào nồi.
  - [x] Tinh bột (túi gạo hút chân không định lượng, bún khô, mì, khoai lang...).
  - [x] Gói xốt công thức chuẩn của đầu bếp MOVA.
  - [x] Trái cây tráng miệng theo mùa.
- **Thành phần TUYỆT ĐỐI KHÔNG ĐÓNG GÓI:**
  - [ ] Nước mắm, Muối ăn, Bột ngọt, Đường, Dầu ăn cơ bản. (Căn bếp của mọi gia đình Việt đều đã có sẵn. Đóng gói các loại này vừa lãng phí bao bì, vừa tăng nguy cơ rách vỡ dung dịch ra hộp).
- **Quy chuẩn dán nhãn phân loại nhiệt độ:**
  - *Không hiển thị hướng dẫn rườm rà trên app.* Nhà máy dán trực tiếp **Sticker màu phân loại**:
    - 🟢 **Sticker Xanh (Ngăn mát 0°C – 4°C):** Rau củ quả, gói xốt, thịt dùng trong ngày.
    - 🔵 **Sticker Xanh Dương (Ngăn đông -18°C):** Thịt cá dự trữ cho các bữa sau trong tuần.
- **Lộ trình mở rộng dòng xốt:**
  - 6 tháng đầu: Chỉ tập trung 8–10 vị xốt chuẩn quốc dân (Kho quẹt, Sốt tiêu đen, Sốt chua ngọt, Sốt nướng mắc khén, Sốt cà chua thì là...).
  - Sau 6 tháng: Triển khai thử nghiệm các dòng xốt chuyên sâu (Không đường / Low GI, Không mì chính MSG, Thuần chay hữu cơ).

---

## 3. DASHBOARD NHÀ MÁY (ULTRA-MINIMALIST FACTORY UI)

Công nhân và quản đốc phân xưởng không cần biết thông tin cá nhân khách hàng. Giao diện bảng điều khiển nhà máy được thiết kế tối giản đến cực hạn:

- **Bộ lọc duy nhất:** `Hôm nay` / `Ngày mai` / `Tuần này`.
- **Cột 1 — Tổng sản lượng nguyên liệu cần chuẩn bị:**
  - Thịt heo nạc dăm xay: `120 kg`
  - Ức gà phi lê: `85 kg`
  - Cải thìa baby: `140 kg`
  - Bí đỏ gọt vỏ: `90 kg`
- **Cột 2 — Tổng số gói xốt cần đóng:**
  - Mã X01 (Kho tàu): `350 túi`
  - Mã X04 (Xào tỏi): `420 túi`
- **Cột 3 — Tổng số thùng cần xuất bến theo khung giờ:**
  - Xe lạnh Chuyến 1 (18:00 về TP.HCM): `650 thùng`
  - Xe lạnh Chuyến 2 (22:00 về TP.HCM): `400 thùng`

---

## 4. HỆ THỐNG TRUY XUẤT NGUỒN GỐC KIỂU "WAZE" (CỘNG ĐỒNG XÁC NHẬN CHÉO)

Thay vì chi hàng triệu USD cho hệ thống Blockchain cồng kềnh khó áp dụng thực tế, MOVA Fresh áp dụng mô hình xác thực phân tán giống như ứng dụng giao thông **Waze**:

### Thí điểm trước cho 2 nông sản chủ lực: THỊT BÒ & GẠO ST25
1. **Lớp 1 — Giám sát độc lập của MOVA:** Cán bộ nguồn hàng cắm chốt tại trại bò và cánh đồng lúa, định kỳ quét mã lô hàng, kiểm tra xét nghiệm tồn dư kháng sinh, thuốc trừ sâu.
2. **Lớp 2 — Cơ chế nông dân / trang trại lân cận xác nhận chéo (Peer Validation):**
   - Các hộ nông dân trong cùng hợp tác xã có app xác nhận: *"Hôm nay đàn bò của trại A ăn cỏ tự nhiên tại đồng cỏ X"*, *"Ruộng lúa B thu hoạch đúng quy chuẩn hữu cơ"*.
   - Người xác nhận nhận điểm thưởng Fresh Credit hoặc phụ cấp nông nghiệp.
   - Nếu phát hiện gian lận, cả cụm hợp tác xã bị phạt uy tín thương mại. Khách hàng quét mã QR trên hộp cơm có thể thấy hình ảnh nhật ký nông hộ được 3 bên xác nhận.

---

## 5. HỆ SINH THÁI AI AGENTS TỰ ĐỘNG HÓA

Nhằm giữ đội ngũ tinh gọn và biên lợi nhuận cao, MOVA vận hành 2 tác tử AI chuyên trách:

### A. Pricing Agent (Tác tử định giá thông minh)
- **Cơ chế hoạt động:** Chạy định kỳ vào 00:00 Chủ Nhật hàng tuần.
- **Nhiệm vụ:**
  - Web scraping tự động giá niêm yết các mặt hàng thịt heo, bò, gà, rau củ tại các chuỗi bán lẻ lớn (WinMart, Bách Hóa Xanh, Co.opmart).
  - So sánh giá vốn đầu vào từ nhà máy Đắk Lắk.
  - Tự động điều chỉnh bảng giá điểm bữa ăn / gợi ý gói Fresh Credit để **đảm bảo biên lợi nhuận gộp Gross Margin luôn nằm trong dải 20% – 30%**, đồng thời không để mức giá bị lệch quá xa so với cảm quan chi tiêu của khách hàng.

### B. Marketing Agent (Tác tử sản xuất nội dung tự động)
- **Nhiệm vụ:** Thay thế cho việc đốt tiền ngân sách chạy ads thô sơ.
- **Quy trình:**
  - Tự động lấy danh sách 10 món ăn nổi bật trong tuần từ bếp trưởng.
  - Sinh kịch bản video TikTok 15 giây, bài viết Facebook *"Cơm nhà chuẩn vị chỉ 15 phút"*, email newsletter gợi ý thực đơn cho từng phân khúc khách hàng (Gym, Tiểu đường, Gia đình có con nhỏ).
  - Tự động lên lịch đăng bài và phản hồi các câu hỏi thường gặp của khách hàng về thời gian giao và công thức nấu.
