# 03. VẬN HÀNH NHÀ MÁY, KHO BÃI & HỆ THỐNG VẬN HÀNH `/ops.html`

> **Quy định quy trình sản xuất thực phẩm, đóng gói, điều phối chuỗi cung ứng Đắk Lắk – TP.HCM, phân quyền 8 vai trò vận hành và các tác tử AI tự động.**
> Phiên bản: V2.2 | Cập nhật: 18/11/2026 (Đồng bộ toàn diện Hạ tầng & Vận hành)

---

## 1. THUẬT TOÁN "ĐA DẠNG ĐẦU RA — TỐI GIẢN ĐẦU VÀO" (THE CORE AGGREGATION ALGORITHM)

Thách thức lớn nhất của Meal-Kit cá nhân hóa là: **Làm sao để 1.000 khách hàng nhận 1.000 thực đơn khác nhau mà nhà máy không bị vỡ trận?**

MOVA Fresh giải quyết bằng thuật toán **BOM (Bill of Materials) Reverse Aggregator**:

```
[1,000 Thực đơn Cá nhân hóa của Khách hàng]
  (Bò lúc lắc, Bò áp chảo xốt vang, Gà nướng sả mật ong, Canh bí đỏ sườn non...)
                  │
                  ▼
[Thuật toán BOM Reverse Aggregator]
                  │
                  ▼
[Tập Nguyên Liệu Thô Tối Giản Cho Nhà Máy]
  - Thịt bò đùi nạc thái mỏng (NL-BO-01, yield 0.95): 145 kg
  - Thăn bò cắt steak (NL-BO-02, yield 0.95): 85 kg
  - Ba rọi heo thảo mộc (NL-HEO-02, yield 0.97): 160 kg
  - Sườn non heo cắt khúc (NL-SUON-04, yield 0.85): 110 kg
  - Ức gà phi lê (NL-GA-03, yield 0.95): 95 kg
  - Bông cải xanh baby (NL-RAU-01, yield 0.75): 120 kg
  - Cải ngọt Đắk Lắk (NL-RAU-02, yield 0.75): 140 kg
  - Gói xốt OEM sachet: XOT-01 (Kho tàu), XOT-02 (Tiêu đen), XOT-04 (Tỏi gừng)...
```

- **Nguyên lý:** Phía khách hàng nhìn thấy hàng trăm món phong phú. Phía nhà máy Đắk Lắk chỉ nhìn thấy **bảng tổng hợp nguyên liệu thô theo quy cách cắt thái đồng nhất** kèm mã gói xốt tương ứng.

---

## 2. QUY CHUẨN ĐÓNG GÓI & PHÂN BỔ NHÀ MÁY ĐẮK LẮK — KHO PHỤ TP.HCM

### A. Phân định nguồn cung ứng:
1. **Nhà máy sơ chế trung tâm Đắk Lắk:**
   - Đảm nhận toàn bộ: Thịt heo thảo mộc, Gà đồi Đắk Lắk, Bò ăn cỏ Tây Nguyên, Rau củ quả xứ lạnh/nhiệt đới, Gạo ST25, Khoai lang mật, Trái cây tráng miệng (Chuối tiêu chín cây, Vải thiều IQF).
   - Sơ chế sạch 100%, đóng gói hút chân không (Vacuum packaging) định lượng theo gram.
   - Chiết rót và đóng gói các túi xốt tiêu chuẩn (Sauce sachets: XOT-01 đến XOT-08).
2. **Kho phụ trung chuyển TP.HCM (Secondary Cold Hub):**
   - Đảm nhận: Cá tươi biển (Cá bớp cắt khoanh Vũng Tàu), Tôm sú bóc nõn rút chỉ (để đảm bảo độ tươi tuyệt đối, tránh rủi ro bảo quản đường dài từ Đắk Lắk).
   - Tiếp nhận xe đông lạnh hàng ngày từ Đắk Lắk $\rightarrow$ Ghép bộ Hải sản $\rightarrow$ Đóng thùng tổng hợp giao cho shipper chặng cuối.

### B. Phạm vi đóng gói hộp Meal-Kit:
- **Thành phần BẮT BUỘC có trong hộp:**
  - [x] Thịt / Cá / Tôm (đóng chân không, nhãn mác rõ ràng).
  - [x] Rau củ rửa sạch, cắt khúc sẵn sàng vào nồi.
  - [x] Tinh bột (túi gạo ST25 hút chân không, bún gạo khô, mì Ý, khoai lang mật...).
  - [x] Gói xốt công thức độc quyền của Đầu bếp MOVA.
  - [x] Trái cây tráng miệng (Chuối tiêu chín cây hoặc Vải thiều cấp đông IQF). *Tuyệt đối không dùng Bơ sáp 034*.
- **Thành phần TUYỆT ĐỐI KHÔNG ĐÓNG GÓI:**
  - [ ] Nước mắm, Muối ăn, Bột ngọt, Đường, Dầu ăn cơ bản. (Căn bếp của mọi gia đình Việt đều đã có sẵn. Đóng gói các loại này vừa lãng phí bao bì, vừa tăng nguy cơ rách vỡ dung dịch ra hộp).
- **Quy chuẩn dán nhãn phân loại nhiệt độ:**
  - *Không hiển thị hướng dẫn rườm rà trên app khách.* Nhà máy dán trực tiếp **Sticker màu phân loại**:
    - 🟢 **Sticker Xanh (Ngăn mát 0°C – 4°C):** Rau củ quả, gói xốt, thịt dùng trong ngày.
    - 🔵 **Sticker Xanh Dương (Ngăn đông -18°C):** Thịt cá dự trữ cho các bữa sau trong tuần, Vải thiều IQF.
- **Quy chuẩn Thùng cách nhiệt & Vận chuyển chặng cuối:**
  - Bộ thùng cách nhiệt (`BB-THUNG-01`): `14.000đ / hộp` (Carton 3 lớp 5.500đ + Túi xốp bạc 3.200đ + Đá gel 5.300đ).
  - Phí giao hàng chặng cuối (`lastMile`): `25.000đ / lần giao`.
  - Phí hộp + ship phân bổ: $(14.000 + 25.000) / 6 = \mathbf{6.500đ / \text{bữa}}$.

---

## 3. HỆ THỐNG VẬN HÀNH `/ops.html` — PHÂN QUYỀN 8 VAI TRÒ & BẢO MẬT PII

Ứng dụng vận hành được đóng gói thành một Single Page độc lập tại **`/ops.html`** với hash router, phục vụ 8 nhóm tác nhân chuyên trách. Mặc định ẩn danh sách mã PIN demo khi chạy production (chỉ bật khi `VITE_SHOW_DEMO_PINS=true` hoặc chạy dev):

| Mã PIN | Nhóm vai trò | Phạm vi chức năng & Bảo mật dữ liệu |
|---|---|---|
| **`1111`** | **Quản đốc phân xưởng (Factory Manager)** | Xem kế hoạch sản xuất tuần, in phiếu chế bản in ấn (Printable Work Order), cân đối định mức BOM nguyên liệu thô theo ngày chốt sổ `08:00 D-2`. |
| **`2222`** | **Bếp phân xưởng (Factory Workshop)** | Màn hình thao tác tại chỗ: Kế hoạch hôm nay, 7 ngày tới, trạm sơ chế/đóng gói, đóng thùng, xuất xe lạnh Đắk Lắk $\rightarrow$ TP.HCM. Tích hợp Offline Queue lưu trữ khi mất mạng. |
| **`3333–3336`** | **Mua hàng & Kho (Procurement)** | Quản lý Đơn mua hàng (PO), đối soát 3 chiều (3-way match: PO - GRN - Hóa đơn), quản lý kho theo nguyên tắc FEFO, xử lý thu hồi lô hàng sự cố (Lot Recall). Không hiển thị mã khách hàng cá nhân. |
| **`4001–4005`** | **Cổng Nhà cung cấp (Supplier Portal)** | Dành cho 5 nhà cung ứng chính (`S-FACTORY`, `S-SEAFOOD`, `S-TRUCK`, `S-LASTMILE`, `S-PACK`): Xem đơn đặt hàng, xác nhận giao hàng, đối soát công nợ gối đầu. |
| **`5555`** | **Điều phối vận hành & Xe lạnh (Logistics)** | Quản lý công suất tuyến (Capacity overrides), hành trình xe lạnh xuyên đêm, kiểm soát chuỗi lạnh (Cold chain sensor: nhiệt độ thùng $-18^\circ\text{C}$ / $0–4^\circ\text{C}$), ghi nhận KPI giao đúng giờ và chi phí logistics theo thùng. |
| **`6666`** | **Kho phụ trung chuyển TP.HCM (Secondary Hub)** | Tiếp nhận xe lạnh từ Đắk Lắk, ghép hải sản tươi Vũng Tàu, phân loại đơn theo tuyến phường/quận, in phiếu giao hàng. Được phép thấy tên & SĐT người nhận để in nhãn. |
| **`7777`** | **Shipper chặng cuối (Delivery)** | Giao diện mobile tối giản: Danh sách điểm dừng theo tuyến, SĐT che một phần (`0987***321`), không thấy thông tin tiền bạc hay mã khách hàng. Thao tác 1 chạm: Đã giao / Báo giao thất bại. |
| **`9999`** | **Kế toán & Quản trị dòng tiền (Finance & Accounting)** | Sổ cái Fresh Credit 2 ngăn (`real_vnd` vs `promo_vnd`), đối soát ngân hàng VietQR, xuất hóa đơn VAT, báo cáo biên lợi nhuận gộp, lịch thanh toán công nợ nhà cung cấp, dự báo dòng tiền 13 tuần, export file CSV hạch toán chuẩn MISA / Fast. |

---

## 4. HỆ THỐNG TRUY XUẤT NGUỒN GỐC KIỂU "WAZE" (CỘNG ĐỒNG XÁC NHẬN CHÉO)

Thay vì chi phí đắt đỏ cho Blockchain xa vời, MOVA Fresh triển khai mô hình xác thực phân tán:

### Thí điểm cho: THỊT BÒ ĂN CỎ TÂY NGUYÊN & GẠO HỮU CƠ ST25
1. **Lớp 1 — Giám sát của cán bộ MOVA:** Quét mã lô hàng, kiểm tra mẫu tồn dư thuốc BVTV / kháng sinh.
2. **Lớp 2 — Xác nhận chéo cộng đồng (Peer Validation):**
   - Nông dân các hộ lân cận trong cùng hợp tác xã quét xác nhận nhật ký canh tác thực tế.
   - Nhận điểm thưởng Fresh Credit khi đóng góp dữ liệu trung thực.
   - Người tiêu dùng quét mã QR trên hộp cơm xem hình ảnh nhật ký nông hộ được 3 bên xác nhận.

---

## 5. HỆ SINH THÁI AI AGENTS TỰ ĐỘNG HÓA

- **Pricing Agent:** Tự động đối chiếu giá thị trường, giá vốn đầu vào từ nhà máy Đắk Lắk, cân chỉnh đề xuất giá để bảo vệ **Gross Margin 20% – 30%** và Net Margin ~30%.
- **Marketing Agent:** Tự động tạo kịch bản video nấu 15 phút, hình ảnh mâm cơm theo mùa và bản tin công thức nấu ăn gửi khách hàng.
