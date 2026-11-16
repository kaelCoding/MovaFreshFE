# Đề xuất thay đổi `api-contract.json`

> Repo web KHÔNG sửa `movafresh-platform/docs/api-contract.json`. Theo `movafresh-platform/AGENTS.md`, mọi thay đổi phải có cả Khôi và Hiếu đồng thuận và giữ tương thích ngược. File này ghi lại những chỗ lớp mock `src/shared/api/` đang khác contract hiện tại hoặc cần thêm, để đưa sang bên platform.

Cập nhật: 16/11/2026 (P0)

## 1. Đã khớp contract (không cần đổi)

- `POST /api/v2/onboarding/profile` → `onboardingProfile(req)`. Các trường request/response giữ nguyên.
- `POST /api/v2/ai/generate-meal-plan` → `generateMealPlan(req)`. `meal_structure` gồm `protein_dish`, `soup_dish`, `veggie_dish`, `carb_dish`, `dessert`.
- `POST /api/v2/subscription/create-or-renew` → `createSubscription(req)`.

## 2. Khác contract hiện tại — cần sửa bên platform

| Trường | Contract hiện tại | Mock đang làm | Lý do |
|---|---|---|---|
| `subscription.dish_customization_cutoff_hours` | `8` | Bỏ trường này | "8 giờ" trong cuộc họp 15/11 là giờ chốt sổ của nhà máy (39:51–40:32), không phải 8 tiếng trước giờ giao |
| `subscription.dish_customization_cutoff_at` | chưa có | ISO 8601, giờ chốt sổ của đơn giao đầu tiên | Giao diện phải hiện ngày giờ cụ thể |
| `next_delivery.dish_change_deadline` | có | Giữ, nay = giờ chốt sổ thật (`cutoffAt`) | Trước đây ví dụ `2026-11-22T22:00:00Z` không có căn cứ |
| `payment_method` | `fresh_credit` (ví dụ) | Chỉ nhận `fresh_credit`, `bank_transfer_4w`, `card`. Giá trị khác (kể cả COD) → lỗi `PAYMENT_METHOD_INVALID` | Zero COD |
| `duration_weeks` | `4` (ví dụ) | `< 4` → lỗi `MIN_4_WEEKS` | Gói tối thiểu 4 tuần |
| `preferred_time_slot` | `early_morning_06_08` (ví dụ) | Chỉ nhận mã khung giờ có ở khu của khách (`early_morning_06_08`, `noon_11_13`, `evening_18_21`) | Khung giờ và sức chứa lấy từ cấu hình vận hành |
| `preferred_days` | `["monday","thursday"]` (ví dụ) | Chỉ nhận ngày có trong cấu hình của khu giao | Ngày giao theo khu (mật độ tuyến) |

## 3. Trường / luồng mới đề xuất

### 3.1 Mã lỗi chuẩn

Response lỗi: `{ "status": "error", "error": { "code": "...", "message": "..." } }`.

Mã đang dùng: `OUT_OF_ZONE`, `PROFILE_NOT_FOUND`, `PLAN_NOT_FOUND`, `MIN_4_WEEKS`, `PAYMENT_METHOD_INVALID`, `DAY_NOT_AVAILABLE`, `SLOT_NOT_AVAILABLE`, `SLOT_FULL`, `INSUFFICIENT_CREDIT`.

### 3.2 Khung giờ còn chỗ — `GET /api/v2/delivery/available-slots?zone=Z1&days=4`

Trả về các khung còn sức chứa: `{ day, slot_id, label, remaining, cutoff_at, charge_at }`. App khách chỉ hiện khung còn chỗ.

### 3.3 Hồ sơ onboarding

- `survey_answers.household_needs[]` (chọn nhiều): `gym`, `weight_loss`, `limit_sugar`, `elderly`, `young_child`, `sensitive_stomach`. Thay cho việc chỉ có `health_goals` toàn hộ.
- `survey_answers.weekly_grocery_budget_vnd` (tùy chọn): chỉ làm trần mềm cho AI, không hiển thị như tiêu đề "theo ngân sách".
- `user_contact` được lưu ngay khi khách nhập, trước các câu hỏi, để còn lead nếu bỏ dở.

### 3.4 Thực đơn

- `custom_upsell_additions[]`: mock hiểu mọi giá trị bắt đầu bằng `extra_` và chứa `protein` là tăng khẩu phần đạm 30%.
- Mỗi `meals[i]` có thêm `price_vnd` (giá bữa cho cả hộ).

### 3.5 Subscription

- `starting_credit: { real, promo }` — CHỈ dùng trong mock để thử luồng Fresh Credit. Bản thật lấy từ sổ Fresh Credit của khách.
- Response thêm `cycle_weeks[]` với mỗi tuần: `week_index`, `delivery_date`, `status`, `charge_at`, `cutoff_at`, `amount_vnd`, `discount_vnd`.
- `POST /api/v2/subscription/skip-week` và `POST /api/v2/subscription/cancel` (cancel trả `refund_vnd` = phần Fresh Credit TIỀN THẬT chưa dùng; phần khuyến mãi bị thu hồi).

### 3.6 Fresh Credit hai ngăn

`balance: { real_vnd, promo_vnd }`. Ngăn `real` là tiền khách đã nạp (hoàn được khi dừng gói); ngăn `promo` là thưởng nạp, thưởng giới thiệu... (không hoàn). Thứ tự trừ cấu hình trong `src/shared/config/business.js` (`credit.spendOrder`).

### 3.7 Phía vận hành (cho `backend/factory-portal` và `orders-logistics`)

Dữ liệu trả về phải lọc theo vai trò ở tầng API:

| Vai trò | Thấy | Không thấy |
|---|---|---|
| Xưởng | mã đơn, khu, khung giờ, số bữa, SKU | tên, SĐT, địa chỉ, tiền |
| Kho phụ | thêm tên + địa chỉ + SĐT người nhận | tiền |
| Shipper | tên, địa chỉ, SĐT che một phần (`090****321`) | tiền |
| Nhà cung cấp | PO và công nợ của chính mình | mọi dữ liệu khách và nhà cung cấp khác |

Các tài nguyên mock đang dùng (hình dạng để Khôi tham khảo): `productionPlan { id, day, closedAt, orderIds[], skippedOrderIds[], bom { boxes, skuGrams, sauces, packaging } }` và `purchaseOrder { id, supplierId, deliveryDay, termDays, status, lines[], totalVnd }`.

## 4. Câu hỏi mở cho Khôi và Hiếu

1. Giờ chốt sổ mặc định 08:00 ngày D-2 có khớp lịch xe lạnh Đắk Lắk → TP.HCM không?
2. `bom_raw_summary` trong contract đang dùng khóa kiểu `pork_belly_g`; mock dùng mã SKU (`NL-HEO-02`) để khớp `factory-requests`. Chọn một kiểu.
3. Thuật toán gom BOM thật nằm ở `ai-engine/bom-aggregator`. Mock chỉ nhân gram theo số người và đếm túi xốt.
