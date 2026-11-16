# MOVA FRESH — AGENT RUNTIME & SYSTEM DIRECTIVES

> **TÀI LIỆU KHỞI ĐỘNG BẮT BUỘC CHO MỌI AI AGENT TRƯỚC KHI THỰC THI BẤT KỲ TÁC VỤ NÀO.**
> Cập nhật lần cuối: 15/11/2026 | Phiên bản kiến trúc: V2.0

---

## 1. CHỈ THỊ KHỞI ĐỘNG (BOOT SEQUENCE)

Mọi AI Agent (Gemini, Claude, GPT, Cursor, Roo, v.v.) khi được kích hoạt trong repository này **BẮT BUỘC** phải đọc và tải vào ngữ cảnh toàn bộ 6 tài liệu trong thư mục `.agent/` theo đúng thứ tự sau trước khi thực hiện phân tích, đề xuất tính năng hay chỉnh sửa bất kỳ dòng code nào:

1. [`.agent/01_PRODUCT_SOUL_AND_BUSINESS_MODEL.md`](file:///.agent/01_PRODUCT_SOUL_AND_BUSINESS_MODEL.md): Linh hồn sản phẩm, mô hình dòng tiền FinTech 2 đầu, đội ngũ & mốc Launch T12/2026.
2. [`.agent/02_USER_FLOW_AND_UX_SPEC.md`](file:///.agent/02_USER_FLOW_AND_UX_SPEC.md): Đặc tả luồng người dùng V2 (AI Onboarding, Mâm cơm Việt, Subscription 4 tuần, Viral loop).
3. [`.agent/03_OPERATIONS_FACTORY_AND_AGENTS.md`](file:///.agent/03_OPERATIONS_FACTORY_AND_AGENTS.md): Vận hành nhà máy Đắk Lắk, kho phụ TP.HCM, quy cách đóng gói, Dashboard sản xuất & hệ sinh thái AI Agents.
4. [`.agent/04_TECH_ARCHITECTURE_AND_CONVENTIONS.md`](file:///.agent/04_TECH_ARCHITECTURE_AND_CONVENTIONS.md): Hiện trạng kiến trúc Vue 3 + Pinia, quy chuẩn UI/UX, bảng mã màu, typography, cấu trúc code.
5. [`.agent/05_PROGRESS_AND_ROADMAP.md`](file:///.agent/05_PROGRESS_AND_ROADMAP.md): Bảng theo dõi tiến độ V1 $\rightarrow$ V2, kế hoạch 4 Tracks hành động (với trọng tâm Test Order 10 AI Personas tuần này).
6. [`.agent/06_MEETING_DECISIONS_LOG.md`](file:///.agent/06_MEETING_DECISIONS_LOG.md): Biên bản các quyết định chiến lược đã chốt ngày 15/11/2026 của Ban sáng lập (không tranh luận lại). ĐỌC MỤC "ĐÍNH CHÍNH" Ở ĐẦU FILE: mục này thay thế mọi chỗ khác ghi "8 tiếng", thưởng nạp 25–40%, hoặc số thẻ quà tặng cố định.

---

## 2. TUYÊN NGÔN CỐT LÕI (CORE MANTRA)

> ### ⚠️ MOVA FRESH KHÔNG PHẢI LÀ SÀN E-COMMERCE BÁN LẺ THỰC PHẨM!
> **MOVA Fresh là mô hình FINTECH KINH DOANH DÒNG TIỀN (Cash-Flow Business) kết hợp AI MEAL-KIT SUBSCRIPTION.**

- **Nguyên tắc dòng tiền tối thượng:** 
  $$\text{Tiền của khách hàng phải vào trước 100\%} \quad \times \quad \text{Công nợ với nhà máy \& nhà cung cấp trả sau}$$
- Khách hàng trả tiền trước thông qua:
  - **Fresh Credit** (thưởng nạp thường xuyên khoảng 10%; ưu đãi lớn hơn chỉ áp ở chu kỳ đầu và có trần tổng — xem mục Đính chính trong `.agent/06`).
  - Hoặc **Subscription trọn gói 4 tuần** (hoặc cơ chế tự động trừ thẻ tín dụng trước ngày giao **72 tiếng**).
- Nhà máy và nhà cung cấp nguyên liệu nhận thanh toán theo kỳ công nợ đàm phán gối đầu. Mô hình này tạo ra **Dòng tiền vận hành luôn dương (Positive Operating Cash Flow)** và triệt tiêu rủi ro tồn kho nông sản.

---

## 3. DANH SÁCH CẤM TUYỆT ĐỐI (STRICT ANTI-PATTERNS)

Mọi dòng code, UI component, API logic hoặc kịch bản trải nghiệm vi phạm một trong 7 điều cấm sau đây sẽ bị **REJECT NGAY LẬP TỨC**:

| # | Điều cấm | Lý do chiến lược & Quy chuẩn bắt buộc |
|---|---|---|
| ❌ 1 | **CẤM THANH TOÁN KHI NHẬN HÀNG (ZERO COD)** | COD phá hủy dòng tiền, tạo tỷ lệ hủy đơn (boom hàng) và phát sinh hàng hư hỏng hoàn về. 100% đơn hàng phải được thanh toán trước qua Fresh Credit, thẻ tín dụng hoặc chuyển khoản định kỳ. |
| ❌ 2 | **CẤM TƯ DUY SÀN TMĐT VỚI "ĐƠN TỐI THIỂU 250K" & FREESHIP PROGRESS BAR** | Không bao giờ code thanh tiến trình freeship `250k -> 400k -> 600k`. MOVA Fresh bán giải pháp dinh dưỡng theo gói tuần/tháng, phí vận chuyển đã được tối ưu vào cấu trúc gói hoặc điều phối theo cung giờ cố định. |
| ❌ 3 | **CẤM BÁN LẺ TỪNG TUẦN RỜI RẠC** | Bắt buộc khách hàng tham gia Subscription tối thiểu **4 tuần** (1 tháng). Không chấp nhận mô hình "thích thì mua 1 tuần rồi nghỉ". Nếu khách dùng thử, ưu đãi trải nghiệm chỉ áp dụng trong cấu trúc cam kết dài hạn có thể pause/skip. |
| ❌ 4 | **CẤM DÙNG TỪ "VÍ ĐIỆN TỬ"** | Tuân thủ tuyệt đối **Nghị định 52/2024/NĐ-CP** về thanh toán không dùng tiền mặt. Hệ thống không giữ giấy phép ví điện tử trung gian thanh toán. Thuật ngữ duy nhất được phép hiển thị trên UI và code: **Fresh Credit** hoặc **Điểm bữa ăn trả trước**. |
| ❌ 5 | **CẤM ĐỊNH VỊ "GIÁ RẺ" ĐUA XUỐNG ĐÁY VỚI SIÊU THỊ** | MOVA không cạnh tranh giá với Bách Hóa Xanh hay WinMart. Mọi mức giá phải phản ánh giá trị: sơ chế sẵn 100%, định lượng chuẩn xác theo thể trạng, công thức chuẩn ngon, tiết kiệm 2 tiếng đi chợ - nấu nướng mỗi ngày. Biên lợi nhuận gộp (**Gross Margin**) phải luôn được bảo vệ ở mức **20% – 30%**. |
| ❌ 6 | **CẤM HIỂN THỊ HƯỚNG DẪN BẢO QUẢN NGĂN MÁT / ĐÔNG TRÊN WEB** | Không làm rối giao diện người dùng bằng các badge hoặc text hướng dẫn bảo quản phức tạp. Quy trình sản xuất tại nhà máy Đắk Lắk đã chuẩn hóa: dán nhãn sticker màu phân loại Ngăn mát / Ngăn đông trực tiếp lên hộp nguyên liệu. |
| ❌ 7 | **CẤM ĐƯA GIA VỊ BẾP CƠ BẢN VÀO GÓI NGUYÊN LIỆU** | Không đóng gói nước mắm, muối, đường, hạt nêm, dầu ăn thông thường vào meal-kit (gây lãng phí bao bì, rách vỡ, đội chi phí đóng gói). Nhà máy chỉ cung cấp: Thịt, Cá, Rau củ sơ chế, Tinh bột, Trái cây và **Gói xốt công thức độc quyền**. Mọi căn bếp Việt đều có sẵn gia vị cơ bản. |

---

## 4. TÓM TẮT BỘ CHỈ SỐ VẬN HÀNH (NORTH STAR METRICS)

- **Subscription Length:** Tối thiểu 4 tuần.
- **Auto-debit / Charge cutoff:** Trước giờ giao 72 tiếng.
- **Dish customization cutoff:** Giờ chốt sổ nhà máy của chuyến giao (mặc định 08:00 ngày D-2, cấu hình được). Giao diện luôn hiện ngày giờ cụ thể, không ghi "8 tiếng".
- **Target Gross Margin:** 20% – 30%.
- **Target Customer Retention Rate (Month 2+):** $\ge 50\%$.
- **Operating Target:** Tối đa hóa tỷ lệ $\frac{\text{Doanh thu}}{\text{Nhân sự vận hành}}$ bằng AI Agents & quy trình tự động hóa.
- **Mốc Launch Sản Phẩm Thật:** **Tháng 12/2026**.

---

*Mọi thắc mắc kỹ thuật và nghiệp vụ, hãy đối chiếu trực tiếp với các tài liệu chi tiết tại `.agent/`.*
