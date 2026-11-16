# Đề xuất thay đổi `api-contract.json`

> Repo web KHÔNG sửa `movafresh-platform/docs/api-contract.json`. Theo `movafresh-platform/AGENTS.md`, mọi thay đổi phải có cả Khôi và Hiếu đồng thuận và giữ tương thích ngược. File này ghi lại những chỗ lớp mock `src/shared/api/` đang khác contract hiện tại hoặc cần thêm, để đưa sang bên platform.

Cập nhật: 16/11/2026 (P0, P1A)

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

## 3b. Phễu `/plans` (P1A)

Các hàm dưới đây nằm ở `src/shared/api/customer.js` (`api.customer.*`). Mọi tên trường theo snake_case như contract.

### Lead và danh sách chờ

| Hàm | Gửi | Trả về |
|---|---|---|
| `captureLead({ contact, source? })` | `contact`: số điện thoại (Zalo) hoặc email, chuẩn hóa về `0xxxxxxxxx` / chữ thường | `{ lead_id, contact_type, returning }`. Lỗi `INVALID_CONTACT`. Cùng liên hệ thì dùng lại lead cũ |
| `joinWaitlist({ lead_id? , contact?, district })` | quận/huyện ngoài vùng | `{ lead_id, status: 'waitlist', district, position }` |
| `checkArea(text)` | tên quận/huyện khách gõ | `{ served, zone_id, zone_name }` |
| `serviceAreas()` | | `[{ zone_id, name, districts[], province, delivery_days[] }]` |

Lead lưu trong `db.leads`: `{ id: 'LEAD-00001', contact: { type, value }, kind, status: 'new' \| 'profiled' \| 'out_of_zone' \| 'waitlist' \| 'converted', source, district, waitlistDistrict, profileId, customerId, createdAt, updatedAt }`. Chưa vai trò vận hành nào đọc được lead (có số điện thoại / email).

### Hồ sơ (`onboardingProfile`)

Thêm vào `survey_answers`: `household_needs[]` (xem 3.3), `cuisine` (`viet` \| `viet_western`), `weekly_grocery_budget_vnd` (trần mềm cho AI, mặc định không đặt). Thêm vào request: `lead_id`. Response thêm `zone_id`.

Cách mock đọc `household_needs`: `weight_loss` → mục tiêu `low_carb`; `limit_sugar` → `limit_sugar`; `elderly`, `sensitive_stomach` → `gentle_digestion`; `young_child`, `sensitive_stomach` → tự thêm kiêng `no_spicy`; `gym` chỉ ghi nhận (đạm tăng khi khách trả lời câu hỏi giá trị). Số người ăn 1–10, số bữa 3–7 (`business.js` mục `plan`).

### Thực đơn và câu hỏi giá trị

- `generateMealPlan` trả thêm `week_value_vnd`, `weekly_staples { rice_grams, fruits[] }` (gạo và trái cây tính theo tuần), `value_questions[]`, `quote`. Mỗi `meals[i]` thêm `western`, `highlight_sauce { code, name }`, `carb_choices[]`; mỗi món thêm `sauce_name`.
- `getPlan(plan_id)`: lấy lại thực đơn đã lưu (tải lại trang).
- `configurePlan({ plan_id, household_size?, upsells?, swap? })`:
  - `household_size`: đổi số người, thực đơn dựng lại (1 người: suất 1 chảo; từ 2 người: mâm 5 phần). Lỗi `HOUSEHOLD_SIZE_INVALID`.
  - `upsells: { more_protein?, low_carb_veg?, western_meal? }` (`true` / `false` / `null` để bỏ trả lời).
  - `swap: { meal_index, kind: 'protein' \| 'veg' \| 'soup' \| 'carb', dish_id }`. Lỗi `DISH_NOT_ALLOWED`, `MEAL_NOT_FOUND`.
- `swapOptions({ plan_id, meal_index, kind })` → `[{ dish_id, name, sauce_name, price_delta_vnd, current }]`. Tinh bột luôn có cơm; bún / mì Ý / bánh mì / khoai chỉ hiện nếu hợp với một món trong bữa (`carbAlt` trong catalog).
- `value_questions[i]`: `{ id, question, note, answer: true \| false \| null, delta_per_meal_vnd, delta_week_vnd, affected_meals }`. Chênh lệch tính theo giá khóa cho cả hộ.

### Giá và ưu đãi chu kỳ đầu

`quote` (cũng có trong `generateMealPlan` / `configurePlan`): `package_value_vnd` (= giá trị tuần 1 x 4), `gift_schedule_vnd[]`, `gift_total_vnd`, `weekly[{ week_index, list_vnd, gift_vnd, pay_vnd }]`, `week1_pay_vnd`, `pay_all_upfront_vnd`, `per_meal_list_vnd`, `per_meal_pay_vnd`, `fresh_credit { pay_vnd, bonus_vnd, bonus_uncapped_vnd, credit_received_vnd, capped, cap_vnd, first_cycle_discount_vnd }`, `first_cycle_discount_pct`, `max_first_cycle_discount_pct`.

Quy tắc: thẻ quà tặng + thưởng nạp không vượt `maxFirstCycleDiscountPct` x giá trị gói; vượt thì giảm THƯỞNG NẠP (thẻ quà tặng giữ nguyên). Nạp "vừa đủ" nhận đúng (giá trị gói − thẻ quà tặng) Fresh Credit, trả = nhận − thưởng nạp.

### Giao hàng và đăng ký

- `deliveryOptions({ profile_id, deliveries_per_week })` → `{ zone_id, zone_name, province, districts[], lead_time_notice_hours: 24, options[{ preferred_days[], day_labels[], first_delivery_date, first_delivery_label, first_dish_change_deadline, slots[{ slot_id, label }] }] }`. Chỉ trả khung mà MỌI lần giao của chu kỳ còn sức chứa.
- `previewSubscription(req)`: cùng hình dạng request với `createSubscription` (thiếu người nhận cũng được), không ghi gì. Trả `payment_ref`, `package_value_vnd`, `gift_total_vnd`, `deliveries[]`, `cycle_weeks[]`, `bank_transfer_4w { pay_vnd }`, `card { charge_now_vnd, charges[{ week_index, amount_vnd, charge_at, now }] }`, `fresh_credit { ...như quote, packs[] }`, `slot_full`.
- `createSubscription` thêm: `topup_pay_vnd` (khi `payment_method = fresh_credit`: số tiền khách nạp, nhỏ hơn mức vừa đủ → `TOPUP_TOO_LOW`; thưởng nạp vào ngăn `promo`), `voucher_code` (mock chỉ cần có mã; phễu gửi `incentives.giftCardCode`). Response thêm `customer_id`, `payment_ref`, `payment_method`, `package_value_vnd`, `paid_now_vnd`, `topup`, `deliveries[]`, `cycle_weeks[]`.
- **Giá khóa theo tuần 1**: các tuần 2–4 AI vẫn đổi món nhưng giá mỗi thùng bằng giá tuần 1 (đúng với số khách đã thấy khi đăng ký).
- `payment_ref` (mã đối soát chuyển khoản, dạng `MOVA3F2A9C`) cố định theo hồ sơ; có trong `subscription.paymentRef` và `ledger[].ref` (`topup`, `topup_bonus`, `prepaid_cycle`).
- Khu giao thêm `province` (mặc định "TP. Hồ Chí Minh") để dựng địa chỉ.
- Mã lỗi mới: `INVALID_CONTACT`, `HOUSEHOLD_SIZE_INVALID`, `UPSELL_INVALID`, `MEAL_NOT_FOUND`, `DISH_NOT_ALLOWED`, `TOPUP_TOO_LOW`.
- Danh mục thêm 3 món Tây (`western: true`, chỉ dùng cho bữa Tây), 2 món tinh bột (bánh mì nướng bơ tỏi, mì Ý xốt cà), SKU `NL-BO-02`, `NL-BANHMI-01`, `NL-MI-01`, xốt `XOT-06..08`.

## 4. Câu hỏi mở cho Khôi và Hiếu

1. Giờ chốt sổ mặc định 08:00 ngày D-2 có khớp lịch xe lạnh Đắk Lắk → TP.HCM không?
2. `bom_raw_summary` trong contract đang dùng khóa kiểu `pork_belly_g`; mock dùng mã SKU (`NL-HEO-02`) để khớp `factory-requests`. Chọn một kiểu.
3. Thuật toán gom BOM thật nằm ở `ai-engine/bom-aggregator`. Mock chỉ nhân gram theo số người và đếm túi xốt.
