# Đề xuất thay đổi `api-contract.json`

> Repo web KHÔNG sửa `movafresh-platform/docs/api-contract.json`. Theo `movafresh-platform/AGENTS.md`, mọi thay đổi phải có cả Khôi và Hiếu đồng thuận và giữ tương thích ngược. File này ghi lại những chỗ lớp mock `src/shared/api/` đang khác contract hiện tại hoặc cần thêm, để đưa sang bên platform.

Cập nhật: 19/11/2026 (P0, P1A, P1B, P2A, P2B, P2C, P2D, V2.2.1 Sync)

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

## 3c. Tài khoản khách và truy xuất QR (P1B)

Các hàm nằm ở `src/shared/api/customerAccount.js`, gộp vào `api.customer.*`. Lỗi theo mục 3.1; mã lỗi mới: `CUSTOMER_NOT_FOUND`, `CUTOFF_PASSED`, `INSUFFICIENT_CREDIT` (kèm `short_vnd`), `NO_CHANGE`, `SKIP_LIMIT`, `ALREADY_POSTPONED`, `SUB_INACTIVE`, `CONFIRM_REQUIRED`, `CONSENT_REQUIRED`, `NOT_DUE`, `INVALID_AMOUNT`, `ORDER_NOT_DELIVERED`, `RATING_INVALID`, `ALREADY_CLAIMED`, `WEEKLY_LIMIT`, `LOT_NOT_FOUND`, `LOT_INVALID`.

### Tài khoản và các tuần
- Khách hiện tại: lấy `customer_id` từ kết quả phễu `/plans`, hoặc đăng nhập demo bằng SĐT / email đã đăng ký (`findCustomerByContact`, không mật khẩu). `sampleAccounts()` trả vài khách mẫu của hạt giống.
- `getAccount(customerId)` trả `{ customer, subscription, credit{real_vnd,promo_vnd,total_vnd}, alert, unread_notifications, renewal }`.
- `myWeeks(customerId)` trả `weeks[]`: `week_index`, `status` (`editable` | `charged` | `charge_failed` | `locked` | `in_production` | `shipping` | `delivered` | `postponed` | `cancelled`), `deadline_at` + `deadline_label` (ngày giờ cụ thể), `boxes[]`, `meals[]` (`dishes[]` có `sauce_name`), `amount_vnd`, `discount_vnd`, `charge{state,at,amount_vnd}`, `postponed_to_week`, `moved_from_week`, `skip{allowed,reason}`.
- Trạng thái đơn mới: `postponed` (khách tạm hoãn, tuần được dời), `cancelled` (dừng gói). `skipped_unpaid` (hệ thống tạm hoãn vì chưa trừ được tiền) hiện ra là "Tạm hoãn".

### Đổi món, tạm hoãn, dừng gói, gia hạn
- `mealOptions`, `previewMealChange`, `changeMeal({ customer_id, week_index, meal_index, kind, dish_id })`. Chỉ đổi trước `cutoffAt` của đơn. Tuần ĐÃ trừ tiền (`paid`): chênh lệch trừ / hoàn qua Fresh Credit (`settle.mode` = `charge` | `refund`), hoàn trả ngược về các ngăn đã trừ; thiếu số dư thì `INSUFFICIENT_CREDIT`. Tuần chưa trừ: chỉ đổi số tiền sẽ trừ. Quyết định mặc định: mọi cách trả (thẻ, chuyển khoản) đều cộng/trừ chênh lệch vào Fresh Credit, đúng yêu cầu của prompt. Trái cây tráng miệng không đổi được.
- `previewSkip` / `skipWeek({ customer_id, week_index })`: tuần cũ thành `postponed`, đơn của tuần được nhân bản ở cuối chu kỳ (cùng thứ, cùng khung, cùng thực đơn / giá / ưu đãi; đã trả thì mang theo `paid`). Giới hạn `subscription.maxSkipWeeksPerCycle` mỗi chu kỳ.
- `previewCancel` / `cancelSubscription({ customer_id, confirm: true })`: hủy các đơn chưa chốt sổ, tiền các tuần đã trừ quay về Fresh Credit, rồi CHỈ phần tiền thật được hoàn (`refund_vnd`); khuyến mãi còn lại và thẻ quà tặng của các tuần chưa giao mất (`lost_incentives_vnd`). Sổ ghi `order_refund`, `cancel_refund`, `promo_forfeit`. Đơn đã chốt sổ vẫn giao.
- `renewalOffer` / `renewSubscription({ customer_id, consent: true })`: không tự gia hạn; thiếu `consent` thì `CONSENT_REQUIRED`. Chỉ gia hạn khi còn `subscription.renewPromptAtRemainingWeeks` tuần hoặc ít hơn. Chu kỳ mới không có thẻ quà tặng; gói trả chuyển khoản chuyển sang trừ Fresh Credit.

### Fresh Credit, thông báo
- `creditSummary` trả `{ balance, alert, history[], packs[], min_topup_vnd }`. `alert` có khi đơn trả bằng Fresh Credit mà số dư không đủ cho tuần kế (`shortfall_vnd`, `charge_at`, `suggested_topup`).
- `topUpCredit({ customer_id, pack_id | pay_vnd })`: tiền thật vào ngăn `real`, thưởng nạp (`topUpPacks[].bonusPct`, khoảng 10%) vào ngăn `promo`; chạy lại việc trừ các tuần đang `charge_failed`.
- Thông báo (`db.notifications`) thêm `meta` và các loại: `charge_upcoming` (job mới, trước mốc trừ `timings.notifyBeforeChargeHours`), `low_credit`, `delivery_status` (`meta.status` = `shipped` | `delivered` | `redelivery`, `meta.photoUrl`), `substitution`, `week_postponed`, `plan_cancelled`, `plan_renewed`, `reward`. `notifications(customerId)`, `markNotificationsRead(customerId)`.
- Phía vận hành ghi thông báo qua hàm dùng chung (P2A / P2C gọi): `api.ops.setOrderStatus(ctx, { orderId, status: 'in_production' | 'shipped' | 'delivered' | 'redelivery', photoUrl?, note? })` (xưởng, kho, shipper, điều phối, admin; trạng thái chỉ đi tới) và `api.ops.substituteDish(ctx, { orderId, mealIndex, kind, toDishId, reason?, compensationVnd? })` (xưởng, kho, điều phối, admin; khoản bù mặc định là phần chênh giá, vào ngăn khuyến mãi, ledger `compensation`).

### Đánh giá, thưởng, mời bạn
- `pendingRatings(customerId)`, `rateDish({ customer_id, order_id, dish_id, thumb: 'up'|'down', sauce_salt: 'salty'|'ok'|'bland', spice: 'low'|'ok'|'high' })` lưu vào `db.ratings[]` `{ customerId, orderId, dishId, sauceCode, thumb, sauceSalt, spice }`. Chỉ đơn `delivered`.
- `rewards`, `saveProfile`, `claimShare({ customer_id, kind: 'menu'|'photo'|'qr', ref })`. Mức thưởng ở `incentives.rewards`; chia sẻ tối đa `incentives.maxShareRewardsPerWeek` lần mỗi tuần và mỗi (loại, mã) một lần. Thưởng vào ngăn `promo`. Ảnh món đã nấu được duyệt tự động trong bản demo.
- Link mời `/plans?ref=MOVA-0007` (mã suy ra từ mã khách). `createSubscription` nhận `referral_code`: người mời nhận `rewards.referrer` khi khách mới trả gói đầu; khách mới nhận `rewards.referee` nhưng bị chặn bởi trần ưu đãi chu kỳ đầu (`maxFirstCycleDiscountPct`). Response thêm `referral: { referee_bonus_vnd } | null`. Lưu ở `db.referrals`.

### Lô nguyên liệu / nhãn QR: `db.lots` (xưởng ghi ở P2A, trang `/q/:code` đọc)

Hình dạng theo `ai-engine/traceability-waze/README.md`, thêm vài trường (đề xuất sang platform):

```json
{
  "qr_code": "MOVA-TRACE-BO-202611-0912",
  "kind": "beef | rice",
  "sku": "NL-BO-01",
  "product_name": "Thịt thăn bò ăn cỏ Đắk Lắk",
  "farm_info": { "farm_name": "...", "location": "Krông Năng, Đắk Lắk", "region": "...", "coordinates": "12.9845, 108.2341" },
  "trust_score": 98.5,
  "verifications": { "mova_inspector": { "verified": true, "inspector_name": "...", "antibiotic_test": "NEGATIVE" }, "peer_validations_count": 8, "last_peer_check": "2026-11-14T09:30:00Z" },
  "harvest_or_slaughter_timestamp": "2026-11-14T22:30:00Z",
  "processed_timestamp": "2026-11-15T03:00:00Z",
  "slaughter_and_packing_timestamp": "2026-11-15T03:00:00Z",
  "temperature_log": "Duy trì liên tục 1.5°C - 3.2°C ...",
  "temperature_readings": [{ "point": "Lên xe lạnh tại Đắk Lắk", "at": "2026-11-15T09:00:00Z", "celsius": 2.1 }],
  "dish_ids": ["D-PRT-002"],
  "sample": true
}
```

- Trường thêm so với README: `sku`, `kind`, `region`, `harvest_or_slaughter_timestamp` (ngày giết mổ / thu hoạch) và `processed_timestamp` (ngày sơ chế) vì README gộp thành một mốc, `temperature_readings[]` (nhật ký nhiệt có cấu trúc, để kiểm ngưỡng `temperature.chill`), `dish_ids[]` (món dùng lô này; bỏ trống thì lấy món có nguyên liệu chính là `sku`), `sample` (dữ liệu mẫu, trang hiện chú thích).
- Ghi: `api.ops.saveLot(ctx, lot)` (xưởng, admin), khóa là `qr_code`, kiểm tra bởi `validateLot`. Đọc cho khách: `api.customer.traceLot(code)` (không cần đăng nhập). Bản khách KHÔNG có `inspector_name` và `coordinates`.
- `seed.js` có 3 lô mẫu (`src/shared/data/lots.js`): bò `MOVA-TRACE-BO-202611-0912`, `MOVA-TRACE-BO-202611-0913`, gạo `MOVA-TRACE-GAO-202611-0207`. Bộ nhớ cũ chưa có `db.lots` thì trang đọc dự phòng từ dữ liệu mẫu.
- Công thức 15 phút theo món ở `src/shared/data/recipes.js` (chưa có trong catalog).

## 3d. Kế hoạch và xưởng Đắk Lắk (P2A)

Các hàm nằm ở `src/shared/api/opsFactory.js`, gộp vào `api.ops.*` (kế hoạch `api.ops.planning.*`, xưởng `api.ops.factory.*`). Logic thuần ở `src/shared/domain/factory.js`. Không hàm nào trả tên, SĐT, địa chỉ hay mã khách: đơn chỉ có mã đơn, khu, khung giờ, số túi.

### Quyền

`planning`: điều phối, mua hàng, admin. `factory` (ghi và ảnh chụp): xưởng, admin. `factoryRead` (danh mục, dự kiến): thêm điều phối, mua hàng. Sai vai trò: `FORBIDDEN`.

### Đọc

| Hàm | Trả về |
|---|---|
| `planning.overview(ctx, day?)` | `days[{ day, closed, closedAt, cutoffAt, boxes, skippedUnpaid, atRisk }]`, `detail` của ngày chọn (`source: 'closed' \| 'forecast'`, `counts`, `items[{ key, type, name, temp, bags, bagGrams, kg }]`, `hub[]` hải sản kho phụ), `sheet` (phiếu sản xuất 3 bảng), `weeks[4]`, `weekRows[]` (kg theo tuần, kèm phần đã chốt), `weekSauces[]`, `capacity` (xưởng báo cho từng tuần), `skippedTotal` |
| `factory.catalog(ctx)` | `items` (tên, nhóm nhiệt, `bagGrams`, `shelfDays`, `requiresLot`, `hub`), `sources`, `trips`, `stickers`, `temperature`, `quickAdds`, `photoMaxPx` |
| `factory.snapshot(ctx, day?)` | `day`, `days[]` (ngày đã chốt kèm tóm tắt từng chuyến), `plan`, `trips[]`, `orders[]` (phiếu nhặt từng đơn: `orderId, zoneId, slotId, tripId, status, items[{ key, type, temp, bags, bagGrams, grams, hub }], bagsByTemp, workshopBags`), `lotCodes[]`, `factory` (cả lát cắt `db.factory`) |
| `factory.forecast(ctx)` | 7 ngày tới và tuần sau: `days[]`, `rows[{ key, perDay, nextWeekBags }]`, `nextWeek`, `capacity` |
| `factory.impact(ctx, shortageId)` | `affected[{ orderId, zoneId, slotId, tripId, deliveryDay, grams, hits[{ mealIndex, kind, dishId, dishName, options[{ dishId, name, priceDeltaVnd, compensationVnd }], suggestedDishId }] }]`, `handled[]`, `needGrams`, `coveredGrams`. Kiêng cữ của khách được đọc ở server để lọc món thay, không trả ra ngoài |

### Ghi: một cửa `factory.apply(ctx, op)`

`op = { type, opId, at, ... }`. `opId` do máy xưởng sinh, server khử trùng (gửi lại không áp hai lần); `at` là giờ nghiệp vụ lúc bấm (gửi muộn vẫn đúng giờ). Mã lỗi: `OP_INVALID`, `LOT_CODE_TAKEN`, `LOT_REQUIRED`, `LOT_MISMATCH`, `TEMP_OUT_OF_RANGE`, `BOXES_MISSING` (kèm `missing[]`), `TRIP_DEPARTED`, `ORDER_NOT_FOUND`, `WRONG_TRIP`, `PLAN_NOT_FOUND`.

| `type` | Tham số chính | Ghi chú |
|---|---|---|
| `progress` | `scope` (`day\|tripId`), `key`, `delta` hoặc `set` | số túi / túi xốt đã làm |
| `receipt` | `sku, sourceId, weightKg, tempC, photo, verdict: 'pass' \| 'fail', failReason, lotCode` | tạo mã lô. Đạt thì ghi `db.lots` (qr_code = `lotCode`, `sample:false`, `source_kind`, `weight_kg`, `received_at`, chưa có `mova_inspector.verified`); ngăn mát phải <= 4°C, ngăn đông <= -18°C mới được Đạt; cần 1 ảnh |
| `batch` | `id, key, bags, lotCode, expiresAt, scope` | mẻ túi gán lô. Bò và gạo (`requiresLot`) bắt buộc có lô đạt đúng SKU |
| `printed` | `batchId` | đánh dấu đã in nhãn túi |
| `tick` / `closeBox` / `reopenBox` | `orderId, key, count` | tích từng túi vào thùng. Túi đầu tiên của một đơn đổi đơn `locked` thành `in_production` (qua `applyOrderStatus`) |
| `load` | `scope, orderId, loaded` | thùng lên xe; đúng chuyến mới được |
| `depart` | `scope, tempC, sealNo, confirmMissing, expected` | xuất xe. Thiếu thùng thì `BOXES_MISSING` trừ khi `confirmMissing`; server tự tính lại `expected` |
| `capacity` | `weekStart, key, status: 'ok' \| 'short', shortBags` | xưởng xác nhận năng lực tuần sau |
| `shortage` / `closeShortage` | `id, key, qty, unit: 'bag' \| 'kg', kind: 'short' \| 'damaged', day, photo, note` | báo thiếu / hỏng; hỏng cần ảnh |

`ops.substituteDish` (P1B) mở rộng: nhận thêm `shortageId` (ghi đơn đã báo khách vào báo cáo; hết lượng thiếu thì báo cáo thành `resolved`) và `opId` (khử trùng, không bù Fresh Credit hai lần khi gửi lại).

### `db.factory` (mới, một lát cắt)

`{ progress: { 'day\|tripId': { [key]: n } }, receipts[], batches[], boxes: { orderId: { ticks, startedAt, packedAt } }, loads: { 'day\|tripId': { loaded: { orderId: at }, tempC, sealNo, departedAt, missing[], tempOk } }, shortages[], capacity: { weekStart: { [key]: { status, shortBags, at } } }, opIds[] }`. Bộ nhớ cũ chưa có thì tạo khi ghi lần đầu.

### Cấu hình và dữ liệu mới

- `BUSINESS.factory`: `trips` (Chuyến 1 rời 16:00 chở khung sáng sớm, Chuyến 2 rời 20:00 chở khung trưa và tối, giả định), `defaultBagGrams`, `shelfDaysByTemp`, `quickAdds`, `photoMaxPx`.
- `src/shared/data/packaging.js`: quy cách sơ chế, cỡ túi chuẩn (gram) và hạn dùng theo SKU. `src/shared/data/sources.js`: nguồn nguyên liệu (HTX, nông hộ, lò mổ). Tất cả là số minh họa chờ quản đốc xác nhận.
- Số túi cần làm: mỗi đơn, mỗi SKU làm tròn LÊN theo cỡ túi chuẩn rồi cộng các đơn; túi xốt đếm theo món. Hải sản (`S-SEAFOOD`) do kho phụ ghép nên không tính vào túi của xưởng.
- Mã lô `MOVA-TRACE-<SKU>-<YYYYMM>-<NNNN>` (nối số thứ tự đang có), mã mẻ `B-YYYYMMDD-NNN`, mã báo cáo `SH-YYYYMMDD-NNN` sinh trên máy xưởng để dùng được khi mất mạng; trùng mã thì server báo lỗi và mục đó nằm ở hàng đợi chờ quản đốc xử lý.

### Hàng đợi offline (chỉ phía app vận hành)

`src/shared/domain/offlineQueue.js` (thuần, có test) và `src/ops/queue.js`: mọi thao tác ghi của xưởng lưu vào localStorage `mova_ops_queue_v1` với nhãn "chưa gửi", tự gửi khi có sự kiện `online`. Lỗi mạng giữ lại để gửi sau; lỗi nghiệp vụ đánh dấu "Lỗi" kèm lý do để quản đốc gửi lại hoặc bỏ. Màn hình = ảnh chụp server + các thao tác chưa gửi (cùng hàm `applyFactoryOp`), nên mất mạng vẫn thấy kết quả ngay.

### Đề xuất sang platform

Hai API `GET /api/v2/factory/daily-bom` và `POST /api/v2/factory/mark-batch-completed`, `report-spoilage` của `factory-portal` nên bổ sung: nhận nguyên liệu kèm mã lô, mẻ túi gán lô, xuất xe (nhiệt độ, niêm phong), năng lực tuần sau và khử trùng theo `opId` cho máy khách mất mạng.

## 3e. Mua hàng, kho phụ, truy xuất và thu hồi (P2B)

Hàm nằm ở `src/shared/api/opsProcurement.js`, gộp vào `api.ops.procurement.*` (mua hàng), `api.ops.hub.*` (kho phụ), `api.ops.supplierPortal.*` (cổng nhà cung cấp). Logic thuần ở `domain/procurement.js`, `inventory.js`, `recall.js`, `statement.js`; phần ghi ở `procurementOps.js`, `recallOps.js`. Hằng cấu hình mới ở `BUSINESS.purchasing` (thêm `longLifeShelfDays`, `matchTolerance`, `marketDiffWarnPct`, `dueFrom`, `forecastWeeks`, `statementTemplates`), `BUSINESS.suppliers` (`certWarnDays`, `kinds`, `certTypes`), `BUSINESS.inventory`, `BUSINESS.recall`.

### Quyền

| Nhóm | Vai trò |
|---|---|
| `procRead` (đọc mua hàng) | mua hàng, kế toán, admin |
| `procWrite` (duyệt, gửi, giá, hồ sơ, đối chiếu, mua trực tiếp) | mua hàng, admin |
| `payment` (trả nhà cung cấp) | mua hàng, kế toán, admin |
| `settingsWrite` (chọn mẫu bảng kê) | kế toán, admin |
| `hubOps` (nhận hàng, tồn, truy xuất, thu hồi) | kho phụ, mua hàng, admin |
| `recallCompensate` (bù Fresh Credit khi thu hồi) | mua hàng, admin (tiền của MOVA) |
| `supplierPortal` | nhà cung cấp (luôn bị ép về chính mình; mã nhà cung cấp client gửi lên bị bỏ qua), admin xem thử qua `asSupplierId` |
| `substitution` (đã có) | thêm mua hàng, để áp món thay khi nhà cung cấp thiếu hàng |

Nhà cung cấp không nhận: PIN, phần trừ tồn kho (`coveredByStock`, `stockUsedQty`), mã báo cáo thiếu của xưởng, dữ liệu khách, dữ liệu nhà cung cấp khác. `api.ops.listPurchaseOrders` cũng lọc qua `viewPo`. Mã khách không bao giờ ra khỏi API truy xuất / thu hồi; tên, địa chỉ, SĐT người nhận chỉ trả cho kho phụ và admin (`recipientFor`).

### Collection mới `db.procurement` (một lát cắt)

`{ suppliers{}, priceList[], receipts[], invoices[], claims[], payments[], stock[], stockMoves[], purchases[], forecasts[], recalls[], settings, seq }`. Không đổi `DB_VERSION`: bộ nhớ cũ chưa có thì `supplementProcurement` (`data/procurementSeed.js`) bù hạt giống khi mở (`server.js`). Dữ liệu mẫu (MST, CCCD, số tài khoản là số giả): 13 hồ sơ (5 nhà cung cấp có cổng + 3 HTX, 3 nông hộ, 2 lò mổ), giấy chứng nhận (có cái sắp hết hạn, một cái đã hết hạn), bảng giá 3 mức mỗi SKU, 12 lô tồn kho có hạn dùng, 5 PO cũ đủ trạng thái (có hóa đơn lệch giá và số lượng, PO đến hạn, PO đã trả), 1 bảng kê thu mua, dự báo đã gửi. PO cũ có `sample: true`.

- Hồ sơ `suppliers[id]`: `{ id, kind (factory|htx|nong_ho|lo_mo|seafood|long_haul|last_mile|packaging), name, taxId | cccd, address, bank{bankName,accountNo,accountName}, termDays, contact{name,phone}, portal, certs[{id,type (attp|vietgap|haccp|other),number,issuer,expiresAt}] }`. Cảnh báo giấy chứng nhận: `certStatus` cho `expired | expiring (<= 30 ngày) | valid`.
- Bảng giá `priceList[]`: `{ id, sku, priceVnd, effectiveFrom, note, createdAt, by }`; giá tại ngày = mức có `effectiveFrom` muộn nhất không quá ngày hỏi (`priceAt`). `runCutoff` lấy giá theo ngày giao khi lập PO.
- Lô tồn `stock[]`: `{ id, sku, lotCode, qty, qtyIn, unit, receivedAt, expiresAt, tempC, supplierId, receiptId, location ('hub'|'factory'), heldBy (recallId), unitCostVnd }`. `stockMoves[]`: `receive | issue | waste | count` kèm `reason`, `costVnd` (chi phí hao hụt).
- Phiếu nhập `receipts[]` (`PN-YYYYMMDD-NNN`): `{ id, poId, supplierId, receivedAt, receivedBy, photo, note, lines[{ sku, orderedQty, targetQty, acceptedQty, rejectedQty, tempC, reason, lotCode, expiresAt, stockId }] }`. Phần không đạt sinh `claims[]` (`KN-...`): `{ poId, receiptId, sku, qty, reason, amountVnd (= số lượng x đơn giá PO), status 'open'|'acknowledged'|'deducted', reply }`; khi PO được đối chiếu thì thành `deducted` (trừ vào công nợ).
- Hóa đơn `invoices[]`: `{ id, poId, supplierId, number, issuedAt, lines[{sku,qty,unitPriceVnd}], totalVnd, file{name,type,dataUrl}, uploadedAt }`. Danh sách trả về không kèm nội dung tệp (`invoiceFile` tải riêng). Ảnh được thu nhỏ trên máy, PDF tối đa khoảng 700 KB.
- Đợt thu hồi `recalls[]` (`RC-YYYYMMDD-NNN`): `{ id, lotCode, sku, reason, status, held{orderId:at}, notified{}, compensated{orderId:{amountVnd,at}}, stockHeld[], orders[] (danh sách chốt lúc tạo), log[] }`.
- `settings`: `{ statementTemplate, customTitle, customNote }`.

### Trường mới trên collection cũ

- `purchaseOrder`: `status` mở rộng `draft | approved | sent | confirmed | received_partial | received | invoiced | matched | paid` (`due` là trạng thái hiển thị suy ra: `matched` và đã qua `dueAt`). Thêm `createdAt, history[], coveredByStock[], approvedAt, sentAt, sentVia ('link'|'print'), confirmation{ at, result ('full'|'short'), lines[{sku,orderedQty,confirmedQty}], shortLines[], shortPct, note }, shortageIds[], receiptIds[], invoiceId, dueAt, payableVnd, matchedAt, matchNote, paidAt, paidVnd, sample`. Dòng PO thêm `needQty`, `stockUsedQty`.
- `db.factory.shortages[]`: thêm `source: 'po'` và `poId` khi nhà cung cấp xác nhận thiếu (cơ chế `shortageImpact` của P2A chạy y hệt; đề xuất món thay rồi áp bằng `api.ops.substituteDish` kèm `shortageId`).
- `db.orders[]`: `recallHold { recallId, at }`. Đơn bị giữ thì `factory.apply` loại `load` báo `ORDER_ON_HOLD`.
- `db.notifications[]`: loại mới `recall` (`meta.kind` = `notice` | `compensation`, `recallId`, `lotCode`, `group`, `compensationVnd`).
- `db.ledger[]`: khoản bù thu hồi ghi `kind: 'compensation'` (cùng đường ghi với đổi món do thiếu hàng: `creditCompensation` trong `opsEvents.js`).

### Quy tắc chính

- **Đề xuất mua** (`draftPurchaseOrders`): `qty = max(0, nhu cầu x (1 + wasteBufferPct) - tồn khả dụng)`; chỉ trừ tồn với hàng để lâu (hạn dùng từ `longLifeShelfDays`: gạo, bún, mì, bao bì). Tồn khả dụng = tồn còn hạn không bị giữ, trừ phần đã giữ chỗ cho các PO chưa nhận xong. PO không còn dòng nào thì không lập.
- **Đối chiếu 3 chiều** (`threeWayMatch`): hàng "đã giao" = đạt + không đạt. Lỗi: `qty_invoice_over | qty_invoice_under` (hóa đơn lệch hàng đã giao), `price_diff` (đơn giá hóa đơn lệch đơn giá PO), `line_not_in_po`. Cảnh báo: `short_delivery | over_delivery` (so với PO). Dung sai `matchTolerance`. Phải trả = hóa đơn tính trên số lượng không vượt hàng đã giao, trừ phần không đạt; chấp nhận chênh lệch phải ghi lý do. Hạn trả = ngày hóa đơn + kỳ công nợ của PO (`dueFrom` đổi được). Chi tiền mặt từ `alerts.cashPaymentVatLimitVnd` trở lên bị chặn.
- **FEFO** (`fefoAllocate`): lô hết hạn sớm nhất trước, cùng hạn thì lô nhận sớm trước; bỏ lô đã quá hạn, lô đang bị giữ, lô hết hàng.
- **Truy xuất** (`traceLot`): xưởng ghi mẻ túi theo (ngày giao, chuyến) kèm lô và số túi đã tích vào thùng từng đơn, nhưng KHÔNG ghi túi nào của mẻ nào vào thùng nào. Bản mock chia túi của các mẻ cho các đơn cùng chuyến theo thứ tự cố định (`allocateBatches`: mẻ làm trước vào đơn có mã nhỏ trước). Bản thật cần quét mã túi lúc bỏ vào thùng để ghi chính xác; chỉ cần thay hàm này. Danh sách đơn của đợt thu hồi được chốt lúc tạo đợt để không xê dịch khi đổi món.
- **Bảng kê thu mua**: mẫu chọn trong `BUSINESS.purchasing.statementTemplates` qua `settings` (kế toán chọn), mỗi mẫu có `confirmed: false` cho tới khi kế toán xác nhận còn hiệu lực. Chỉ nông sản tươi (`taxGroup: 'fresh'`). Bảng kê đã lập giữ mẫu lúc lập.

### Hàm chính

| Hàm | Ghi chú |
|---|---|
| `procurement.suppliers / saveSupplier / addCert / removeCert` | hồ sơ và giấy chứng nhận, cảnh báo 30 ngày |
| `procurement.skuCatalog / prices / addPrice / forecast / sendForecast` | danh mục SKU, bảng giá theo ngày hiệu lực + giá thị trường (mock pricing agent), dự báo 4 tuần |
| `procurement.listPos / getPo / editLine / approvePo / sendPo / submitInvoice / matchPo / payPo / payables` | vòng đời PO, đối chiếu, công nợ và tuổi nợ |
| `procurement.directPurchases / previewStatement / recordDirectPurchase / settings / saveSettings` | mua trực tiếp, bảng kê, mẫu |
| `hub.receivable / receive / receipts` | nhận hàng đối chiếu PO |
| `hub.stock / fefoPlan / issue / waste / count` | tồn theo lô, FEFO, xuất hủy, kiểm kê, hao hụt tháng |
| `hub.traceLots / trace` | truy xuất từ mã QR / lô / mẻ |
| `hub.recalls / createRecall / recall / holdOrders / notifyCustomers / compensate / wasteHeldStock / closeRecall` | thu hồi lô |
| `supplierPortal.overview / confirmPo / submitInvoice / replyClaim / updateContact / addCert` | cổng nhà cung cấp |
| `demo.seedTrace(ctx, { day?, sku? })` | dựng lô, mẻ, thùng, đơn đủ ba trạng thái để thử thu hồi (chỉ admin) |

Mã lỗi mới: `PO_NOT_FOUND`, `PO_STATUS_INVALID`, `PO_EMPTY`, `CONFIRM_INVALID`, `RECEIPT_INVALID`, `INVOICE_INVALID`, `DUPLICATE_INVOICE`, `FILE_TOO_LARGE`, `MATCH_DIFF`, `NOTE_REQUIRED`, `CASH_OVER_LIMIT`, `STOCK_SHORT`, `PROFILE_INVALID`, `CERT_INVALID`, `PRICE_INVALID`, `STATEMENT_INVALID`, `TEMPLATE_INVALID`, `RECALL_EXISTS`, `RECALL_CLOSED`, `RECALL_NOT_FOUND`, `LOT_NOT_FOUND`, `ORDER_ON_HOLD`, `SUPPLIER_REQUIRED`, `NOT_FOUND`.

### Màn hình (hash router của app vận hành)

`/mua-hang` (Đơn mua; con: `nha-cung-cap`, `sku`, `bang-gia`, `du-bao`, `cong-no`, `mua-truc-tiep`, `cai-dat`), `/kho` (Nhận hàng; con: `ton-kho`, `truy-xuat`, `thu-hoi`), `/nha-cung-cap` (cổng, ưu tiên điện thoại). Kế toán thêm vào `/mua-hang` (xem PO, công nợ, cài đặt). Mua hàng thêm vào `/kho`. P2C thêm tab Ghép hải sản / Nhận xe / Chia tuyến vào `HubLayout.vue`.

### Đề xuất sang platform

Bổ sung vào `cashflow-ledger` sổ công nợ nhà cung cấp theo PO (đã giao, hóa đơn, đến hạn, đã trả, khấu trừ khiếu nại) và vào `traceability-waze` ghi chính xác túi nào vào thùng nào (quét mã túi) để thu hồi lô không phải suy luận.

## 3f. Logistics, kho phụ và giao hàng chặng cuối (P2C)

Hàm nằm ở `src/shared/api/opsLogistics.js`, gộp vào `api.ops.logistics.*` (điều phối), `api.ops.routes.*` (lập tuyến), `api.ops.hub.*` (thêm vào nhóm kho phụ của P2B) và `api.ops.shipper.*` (app giao hàng). Logic thuần ở `domain/logistics.js` (sức chứa, lập tuyến, chuỗi lạnh, thu hồi thùng xốp, chi phí, KPI), phần ghi ở `domain/logisticsOps.js`. Mọi thay đổi trạng thái giao đi qua `applyOrderStatus` (cùng hàm mà `api.ops.setOrderStatus` gọi) nên app khách thấy đúng thông báo.

### Quyền

| Nhóm | Vai trò |
|---|---|
| `dispatchOps` (sức chứa, chuyến xe, ngoại lệ, chi phí, KPI) | điều phối, admin |
| `routePlan` (xem bảng tuyến, lập tuyến, chuyển điểm) | điều phối, kho phụ, admin |
| `hubFlow` (nhận xe, ghép hải sản, chia thùng, xuất kho, phiếu tuyến) | kho phụ, admin |
| `hubFlowRead` (xem bảng nhận xe, ghép hải sản) | thêm điều phối |
| `coldChain` (xem và QC giữ / hủy) | kho phụ, điều phối, admin |
| `costRead` (`logistics.publishedCosts`) | điều phối, kế toán, admin |
| `shipperApp` (xem) / `shipperWrite` (giao, báo thất bại, gọi) | shipper (ép về chính mình), điều phối xem thử qua `asShipperId`; admin thao tác thay |

Lọc dữ liệu: điều phối chỉ thấy mã đơn, khu, quận, phường (không tên, SĐT, địa chỉ, số nhà, mã khách, tiền). Kho phụ và admin thấy tên, địa chỉ, SĐT người nhận để in phiếu tuyến (`recipientFor`). Shipper chỉ thấy điểm giao trong tuyến của mình: tên, địa chỉ, SĐT che một phần (`090****321`); không có tiền, mã khách. Gọi khách đi qua `shipper.callCustomer` (tổng đài ẩn số, mock): SĐT thật không rời server.

### Đăng nhập shipper

`BUSINESS.logistics.shippers`: `{ id, name, pin, capacityBoxes }`. Mỗi shipper một PIN: `3333` (PIN cũ, nay là SH-01), `3334`, `3335`, `3336`. `api.auth.login` trả thêm `shipperId`; `ctx = { role, supplierId, shipperId }`. `ROLES.shipper.pin` đặt `null` (PIN theo từng shipper, giống nhà cung cấp).

### Sức chứa khung giờ: `db.logistics.capacity`

`{ "Z1|2026-11-23|early_morning_06_08": 20, "Z1|*|noon_11_13": 25 }`: ghi đè sức chứa (thùng) theo (khu, ngày, khung) hoặc mọi ngày (`*`); không có thì lấy `BUSINESS.zones[].slots[].capacityBoxes`. `slotCapacity(overrides, zoneId, day, slot)` trong `domain/delivery.js`; `availableSlots`, `findFullSlots` (đăng ký, gia hạn) và `planPostponement` (tạm hoãn) đều đọc nó nên app khách và việc chặn đặt vượt sức chứa dùng cùng một con số.

- `logistics.capacityBoard(ctx)` → `zones[{ zoneId, name, deliveryDays, days[{ day, slots[{ slotId, label, configCapacity, capacity, overridden, used, remaining, overbooked, fillPct }], used, capacity, fillPct }] }]`, `suggestions[]` (gợi ý gộp ngày: `{ zoneId, fromDay, toDay, moveBoxes, beforePerDay, afterPerDay }`), `overbookedTotal`.
- `logistics.setCapacity(ctx, { zoneId, day?|'*', slotId, capacityBoxes | null, allowBelowUsed? })`. `null` bỏ ghi đè. Hạ thấp hơn số đã đặt: `CAPACITY_BELOW_USED` trừ khi `allowBelowUsed`; đơn đã đặt vẫn giao, khách mới không đặt thêm được, bảng hiện `overbooked`. Mã lỗi `CAPACITY_INVALID` (số nguyên 0–500).
- `BUSINESS.logistics.mergeSuggestBelowFillPct`: ngưỡng gợi ý gộp ngày. `BUSINESS.zones[].slots[]` có thêm `endHour`, `endMin`, `short` (để tính đúng giờ).

### `db.logistics` (một lát cắt; bộ nhớ cũ chưa có thì `ensureLogistics` tạo khi ghi)

`{ capacity, trips, arrivals, seafood, routes[], deliveries, exceptions[], temps[], coldDecisions, hubCosts, assets, recoveries[] }` và collection riêng `db.logisticsCosts[]`.

- `trips["day|T1"] = { carrier, plate, capacityBoxes, costVnd, plannedDepartAt, note }` (điều phối lập; xuất bến, nhiệt độ, niêm phong vẫn ở `db.factory.loads` của P2A). `logistics.trips(ctx, day)` gộp lại: số thùng, bảng kê, nhiệt độ các mốc, trạng thái `unplanned | planned | loading | departed | arrived`. Mặc định: `BUSINESS.logistics.truck` (120 thùng, 4.500.000 đ / chuyến).
- `arrivals["day|T1"] = { startedAt, closedAt, boxes: { orderId: "ok" | "damaged" }, extra[], missing[], tempC, frozenTempC, photo, note }`. Bảng kê = các thùng `db.factory.loads[scope].loaded`. `hub.scanArrival({ scope, code, state: "ok" | "damaged" | "clear" })` (mã không có trong bảng kê vào `extra` = thừa); `hub.closeArrival({ scope, tempC, frozenTempC?, photo?, note? })` ghi số đo mốc "nhận kho phụ", tạo ngoại lệ cho thùng thiếu / hỏng; cần ảnh nếu có thiếu, thừa, hỏng hoặc nhiệt độ vượt ngưỡng.
- `seafood[orderId] = { ticks: { sku: n }, packedAt, lots[{ sku, lotCode, qty }], shortKg }`: `hub.tickSeafood`, `hub.closeSeafood` (tích đủ túi mới chốt, trừ `db.procurement.stock` theo FEFO bằng `issueStock`, thiếu tồn thì ghi `shortKg`). Chỉ làm được khi thùng đã về kho phụ.
- `routes[] = { id "RT-YYYYMMDD-S|T|M-NN", day, slotId, shipperId, capacityBoxes, boxes, estMinutes, fitsWindow, status "planned" | "dispatched" | "done", dispatchedAt, dispatchTempC, sorted: { orderId: { at, location } }, mock: true, stops[{ orderId, seq, zoneId, district, ward, wardIndex, street, no }] }`. `routes.plan(ctx, { day, slotId, shipperIds? })` lập (thay các tuyến chưa xuất kho của khung), `routes.moveStop`, `hub.sortBox` (chia thùng vào tuyến, ghi kệ lạnh), `hub.dispatchRoute({ routeId, tempC, frozenTempC? })` (cần chia đủ thùng; đơn sang `shipped` qua `applyOrderStatus`), `hub.routeSheet(routeId)` (phiếu tuyến có người nhận).
- `deliveries[orderId] = { routeId, status "planned" | "pending" | "delivered" | "failed" | "unrouted" | "closed", attempts[{ at, outcome, routeId, reason?, tempC? }], calls, recovered? }`.
- `exceptions[] = { id "EX-NNNNN", orderId, kind "missing_box" | "damaged_box" | "delivery_failed" | "cold_discard", reason, status "open" | "held" | "resolved", resolution? }`. `logistics.resolveException({ id, kind: "redeliver" | "hold_cold" | "compensate", day?, slotId? })`.
- `temps[] = { id, point "hub_receive" | "hub_dispatch" | "delivery", ref, cls "chill" | "frozen", tempC, at, orderId? }`. Mốc `factory_depart` lấy từ `db.factory.loads[*].tempC`. `evaluateTemp`: mát 0–4°C (cả quá cao lẫn quá thấp), đông ≤ −18°C (`BUSINESS.temperature`). `logistics.coldChain` trả 4 mốc, `alerts[]` (kèm `decision`) và `readings[]`; `logistics.decideCold({ id, decision: "keep" | "discard", note })`: hủy thì mỗi đơn bị ảnh hưởng thành một ngoại lệ `cold_discard`.
- `assets[customerId] = { foam, gel }`: thùng xốp / túi gel đang ở nhà khách. `BUSINESS.logistics.recovery = { enabled, foamBoxesPerBox, gelPacksPerBox }`. Mỗi lần giao, shipper nhập số thu về (không vượt số khách đang giữ, `RECOVERY_EXCEEDS`), rồi cộng bộ vừa để lại. `kpis` có tỷ lệ thu hồi.

### Trường mới trên collection cũ

- `db.orders[]`: `deliveryIssue { kind "failed" | "redelivery" | "held" | "compensated", label, detail, at }`, `redelivery { day, slotId, atHub, at }` (lịch giao lại; đơn vẫn giữ `deliveryDay` gốc), `holdCold { at, until }`. Giao thành công thì xóa các trường này.
- `db.notifications[]` (loại `delivery_status`) thêm `meta.status`: `failed` (kèm `meta.reason`), `held`, `compensated` (kèm `meta.compensationVnd`), ngoài `shipped | delivered | redelivery` đã có. App khách đã thêm nhãn cho các trạng thái này.
- `api.customer.myWeeks`: mỗi `boxes[]` thêm `phase_label`, `delivery_issue { kind, label, detail, at } | null`, `redelivery { day, label, slot_label } | null`. Trang tuần của khách hiện trạng thái từng thùng (khi tuần có nhiều thùng) và khung báo vấn đề giao hàng.
- `db.ledger[]`: bù không giao được ghi `kind: "compensation"` (cùng `creditCompensation` với đổi món và thu hồi lô).

### Chi phí đẩy sang Tài chính (P2D đọc): `db.logisticsCosts[]`

Mỗi ngày giao một bản ghi, cập nhật mỗi khi lập chuyến, nhập chi phí kho phụ, lập tuyến, nhận xe, xuất kho, giao hay báo thất bại; đọc qua `logistics.publishedCosts(ctx)` (điều phối, kế toán, admin):

```json
{
  "id": "LC-2026-11-20", "day": "2026-11-20", "boxes": 19, "totalVnd": 12370000, "perBoxVnd": 651053,
  "parts": { "longHaulVnd": 9000000, "hubVnd": 2150000, "lastMileVnd": 1220000 },
  "perBox": { "longHaulVnd": 473684, "hubVnd": 113158, "lastMileVnd": 64211 },
  "trips": [{ "scope": "2026-11-20|T1", "tripId": "T1", "boxes": 6, "costVnd": 4500000, "perBoxVnd": 750000, "estimated": true }],
  "hub": { "laborVnd": 1200000, "rentVnd": 600000, "iceVnd": 350000, "otherVnd": 0, "totalVnd": 2150000, "estimated": true },
  "routes": [{ "routeId": "RT-20261120-M-01", "stops": 12, "failedAttempts": 0, "costVnd": 300000, "perStopVnd": 25000, "status": "dispatched" }],
  "status": "open | final", "updatedAt": "...", "source": "logistics"
}
```

`perBoxVnd = round((xe chặng dài + kho phụ + chặng cuối) / boxes)`. Xe: giá chuyến điều phối nhập, chưa nhập thì `BUSINESS.logistics.truck.costPerTripVnd` (`estimated: true`). Kho phụ: `hubCosts[day]` hoặc `BUSINESS.logistics.hubDailyCostVnd`. Chặng cuối: `routeBaseVnd + perStopVnd x điểm + perFailedAttemptVnd x lần giao hụt` mỗi tuyến. Mọi số tiền là giả định chờ anh Trung chốt. `status: "final"` khi mọi tuyến của ngày đã xong.

### KPI: `logistics.kpis(ctx, { from?, to? })`

`onTimePct` (giao trong khung giờ), `failPct` (lần hụt / lần thử), `stopsPerHour` (điểm giao / giờ / tuyến, tối thiểu `kpi.minRouteMinutes` phút để không bị thổi phồng), `stopsPerRoute`, `boxesPerTruck`, `costPerBoxVnd`, `tempBreaches`, `recoveryPct`. Chưa có dữ liệu thì `null`, không báo 0%.

### Lập tuyến là BẢN MOCK

`planRoutes` gom theo khu → quận → phường → đường → số nhà, dùng ít shipper nhất đủ chở và chia cân bằng theo sức chở (`BUSINESS.logistics.shippers[].capacityBoxes`), không bao giờ vượt sức chở. Đơn hàng chưa có phường / tọa độ nên `data/geo.js` cho ra phường GIẢ ổn định từ địa chỉ chữ. Giao diện ghi rõ "Bản mock"; sau thay bằng engine tối ưu tuyến của Hiếu hoặc dịch vụ bản đồ (đổi `planRoutes` và `geocode`).

### Cấu hình mới: `BUSINESS.logistics`

`shippers`, `truck`, `hubDailyCostVnd`, `lastMile`, `minutesPerStop`, `travelMinutes`, `dispatchLeadMinutes`, `deliveryTempRequired`, `unreachableMinCalls`, `failReasons`, `holdColdMaxHours`, `failedCompensationPct`, `recovery`, `mergeSuggestBelowFillPct`, `demoHubJump`, `kpi`.

### Mã lỗi mới

`CAPACITY_INVALID`, `CAPACITY_BELOW_USED`, `ZONE_NOT_FOUND`, `SLOT_NOT_FOUND`, `TRIP_INVALID`, `COST_INVALID`, `TRIP_NOT_DEPARTED`, `ARRIVAL_CLOSED`, `ARRIVAL_INVALID`, `SEAFOOD_INVALID`, `SEAFOOD_INCOMPLETE`, `BOX_NOT_AT_HUB`, `ROUTE_NOT_FOUND`, `ROUTE_STATE`, `NOT_SORTED`, `TEMP_REQUIRED`, `NOT_YOUR_STOP`, `STOP_STATE`, `PHOTO_REQUIRED`, `REASON_INVALID`, `CALL_REQUIRED`, `RECOVERY_INVALID`, `RECOVERY_EXCEEDS`, `EXCEPTION_NOT_FOUND`, `RESOLVE_INVALID`, `ALERT_NOT_FOUND`, `DECISION_INVALID`, `SHIPPER_NOT_FOUND`.

### Màn hình và bảng demo

`/logistics` (điều phối, admin): Khu & sức chứa, Chuyến xe (`chuyen-xe`), Lập tuyến (`lap-tuyen`), Giao hàng & ngoại lệ (`giao-hang`), Chuỗi lạnh (`chuoi-lanh`), Chi phí & KPI (`chi-phi-kpi`). `/kho` thêm Nhận xe (`nhan-xe`), Ghép hải sản (`ghep-hai-san`), Chia khung/tuyến (`chia-tuyen`, điều phối cũng vào được, không PII), Xuất kho (`xuat-kho`). `/giao-hang`: app shipper ưu tiên 375px. Bảng demo thêm `demo.jumpTo(ctx, "hub")` (nút "Tới D 02:00") và `demo.seedTrips(ctx)` (đóng thùng, lên xe, xuất bến cả hai chuyến của ngày chốt sổ).

### Đề xuất sang platform

`orders-logistics` nên có: sức chứa khung giờ ghi đè theo ngày, bảng kê thùng đối chiếu ở kho phụ (thiếu / thừa / hỏng), ghép hải sản theo lô, tuyến giao theo shipper, nhật ký nhiệt độ 4 mốc kèm quyết định QC, thu hồi thùng xốp / túi gel, chi phí logistics mỗi thùng cho `cashflow-ledger` (hình dạng `db.logisticsCosts` ở trên), và webhook `DELIVERED` kèm ảnh. Điểm cần Hiếu / Khôi chọn: engine tối ưu tuyến thật (thay bản mock), nguồn phường / tọa độ.

## 3g. Tài chính, kế toán, giám sát nhà cung cấp, tổng quan founder (P2D)

Hàm nằm ở `src/shared/api/opsFinance.js`, gộp vào `api.ops.finance.*` (kế toán), `api.ops.monitoring.*` (thẻ điểm nhà cung cấp) và `api.ops.overview.*` (tổng quan founder). Logic thuần ở `domain/financeCredit.js` (sổ Fresh Credit), `financeRevenue.js` (giá vốn, VAT, doanh thu, margin, hóa đơn), `financePayables.js` (tuổi nợ, đợt chi, tiền mặt, bao phủ, dòng tiền), `financeBank.js` (đối soát), `financeJournal.js` (bút toán và CSV), `scorecard.js`; phần ghi và dựng ngữ cảnh ở `financeOps.js`.

**Nguyên tắc.** MOVA không tự viết phần mềm kế toán: chỉ giữ sổ phụ nghiệp vụ và XUẤT bút toán (CSV) qua bảng ánh xạ tài khoản do kế toán cấu hình (`BUSINESS.finance.accountMap`, sửa ở Cài đặt; không có số tài khoản nào viết cứng, chưa ánh xạ thì cột mã ghi `?khóa`). Mọi con số tài chính là giả định chờ kế toán xác nhận.

### Quyền

| Nhóm | Vai trò |
|---|---|
| `financeRead`, `financeWrite` (sổ, đối soát, doanh thu, margin, công nợ, đợt chi, dòng tiền, bút toán, cài đặt) | kế toán, admin |
| `adjustRequest` (đề nghị điều chỉnh Fresh Credit) | kế toán |
| `adjustApprove` (duyệt / từ chối) | admin. Người đề nghị không tự duyệt |
| `scorecard` (thẻ điểm nhà cung cấp, màn Giám sát) | mua hàng, admin |
| `overview` (tổng quan founder) | admin |

Dữ liệu trả ra chỉ có MÃ khách (`C-0007`), không có tên, số điện thoại, địa chỉ. Xưởng, kho phụ, shipper, điều phối, nhà cung cấp không đọc được gì ở nhóm này (`FORBIDDEN`); mua hàng không đọc tài chính, chỉ đọc thẻ điểm.

### Sổ Fresh Credit: không thêm collection, dùng `db.ledger[]`

Mỗi bút `{ id, customerId, orderId?, kind, amountVnd, real, promo, ref?, at, note?, backfill?, approvedBy? }`. `real` / `promo` là phần mỗi ngăn bị ảnh hưởng; dấu do `kind` quyết định (`CREDIT_KINDS` trong `financeCredit.js`):

| Nhóm | `kind` | Ảnh hưởng số dư |
|---|---|---|
| Nạp (tiền thật) | `topup` | + real |
| Thưởng nạp | `topup_bonus` | + promo |
| Thưởng hồ sơ / chia sẻ / giới thiệu | `reward_profile`, `reward_share`, `reward_referrer`, `reward_referee` | + promo |
| Trừ cho tuần | `credit_spend`, `swap_charge` | - real / - promo theo `credit.spendOrder` |
| Bù sự cố | `compensation` | + promo |
| Hoàn | `swap_refund`, `order_refund` (+ cả hai ngăn), `cancel_refund` (- real, là tiền trả khách), `promo_forfeit` (- promo, thu hồi) | |
| Điều chỉnh | `adjustment` | `real` / `promo` CÓ DẤU, kèm `approvedBy`, `note` (lý do) |
| Thu trực tiếp cho đơn (không qua số dư) | `card_charge`, `prepaid_cycle` | không đổi số dư |

- **Bút lịch sử (backfill).** Hạt giống cũ đặt số dư Fresh Credit thẳng (không có bút nạp). `supplementFinance` (chạy khi dựng hạt giống và khi mở bộ nhớ cũ chưa có `db.finance.backfilledAt`, không đổi `DB_VERSION`) ghi bút `topup` / `topup_bonus` có `backfill: true` đặt trước bút đầu tiên của khách, để sổ dựng từ bút luôn bằng `customer.credit` (`creditTotals(...).drift` rỗng). `createSubscription` với `starting_credit` (chỉ có trong mock) cũng ghi bút tại chỗ.
- **Mã đối soát nạp** (`topupRefFor`): `NAP` + số của mã khách (`C-0007` thành `NAP0007`), ghi ở `ledger[].ref` của `topup`; app khách hiện đúng mã này trong nội dung chuyển khoản (trước đây hiện "NAP <số điện thoại>" nên không khớp được). Mã gói đăng ký vẫn là `MOVA...` (`subscription.paymentRef`).
- `finance.creditSummary(ctx)` trả `{ liabilityRealVnd (nợ Fresh Credit = tiền thật chưa dùng), promoOutstandingVnd (khuyến mãi còn treo), totalVnd, drift[], groups[] (7 nhóm), customers[], spendOrder, pendingAdjustments }`.
- `finance.creditLedger(ctx, { customerId?, group?, limit? })` trả `{ rows[], balance, total }`; có `customerId` thì mỗi dòng kèm `balanceAfter` (số dư chạy sau bút).
- **Điều chỉnh**: `finance.requestAdjustment(ctx, { customerId, bucket: 'real' | 'promo', deltaVnd (có dấu), reason })` tạo `db.finance.adjustments[]` trạng thái `pending`, KHÔNG đổi số dư; `finance.decideAdjustment(ctx, { id, approve, note? })` (admin) duyệt thì mới đổi số dư và ghi bút `adjustment`. Mã lỗi: `ADJUST_INVALID`, `ADJUST_NOT_FOUND`, `ADJUST_STATE`, `SELF_APPROVE`.

### Collection mới `db.finance` (một lát cắt)

`{ bankTxns[], einvoices[], adjustments[], settings { accountMap { khóa: mã }, openingCashVnd, issueOn }, seq, backfilledAt, backfillDrift[] }`.

### Thu tiền và đối soát

- **Webhook ngân hàng (mock).** `finance.bankWebhook(ctx, { txnId?, amountVnd, content, at?, accountNo? })` là hình dạng ngân hàng sẽ gọi vào; `finance.mockBankTransfer(ctx, { ledgerId?, scenario: 'exact' | 'wrong_content' | 'wrong_amount', amountVnd?, content? })` mô phỏng tiền về cho một khoản đang chờ (không truyền `ledgerId` là giao dịch lạ). Cũng có nút ở Bảng demo và ở màn Thu tiền & đối soát. `txnId` trùng thì trả giao dịch cũ (`duplicate: true`).
- **Quy tắc tự khớp** (`matchBankTxn`): chuẩn hóa nội dung (chữ hoa, bỏ ký tự không phải chữ hoặc số) rồi tìm mã đối soát của một khoản đang chờ tiền về (bút `topup` hoặc `prepaid_cycle` có `ref`, không phải `backfill`). Khớp mã và đúng số tiền: `matched` (`matchedBy: 'auto'`). Khớp mã lệch số tiền: `amount_diff` (kèm `suggestedLedgerId`). Không thấy mã hoặc mã đã khớp rồi: `unmatched`. Hai loại sau vào HÀNG CHỜ KHỚP TAY.
- `bankTxns[i] = { id 'BNK-nnnnn', txnId, amountVnd, content, accountNo, at, receivedAt, status, ledgerId, suggestedLedgerId, reason, matchedBy ('auto' | 'manual'), note?, diffVnd? }`.
- `finance.manualMatch(ctx, { bankId, ledgerId, acceptDiff?, note? })`: lệch số tiền thì phải `acceptDiff` rồi ghi lý do (`AMOUNT_DIFF`, `NOTE_REQUIRED`). `finance.ignoreBankTxn(ctx, { bankId, note })` (không phải tiền của MOVA, cần lý do). Mã lỗi khác: `TXN_INVALID`, `TXN_NOT_FOUND`, `TXN_STATE`, `LEDGER_NOT_FOUND`, `ALREADY_MATCHED`.
- `finance.reconciliation(ctx)` trả `{ bank, receipts[] (khoản chờ / đã nhận), waiting[], txns[], queue[], totals, cards { success[], failed[], totals }, card }`. Thẻ: mỗi lần trừ thành công có `feeVnd`, `netVnd`, `settleAt` (ngày tiền về); lần thất bại lấy từ đơn thẻ có `chargeFailedAt` kèm lý do.
- Cấu hình: `BUSINESS.finance.bank` (tài khoản nhận, số giả), `BUSINESS.finance.card { feePct, feeFixedVnd, settleDays }` (giả định, chờ cổng thanh toán xác nhận).

### Doanh thu, VAT, hóa đơn điện tử

- **Doanh thu CHỈ ghi khi đơn đã giao** (`status: 'delivered'`, mốc `deliveredAt`), bằng GIÁ TRỊ TIỀN THẬT đã dùng của đơn (`paidFromOf`: phần `real` của các bút `credit_spend`; đơn trả thẻ hoặc chuyển khoản trọn gói coi toàn bộ là tiền thật). Phần KHUYẾN MÃI đã dùng không phải doanh thu tiền mặt. Cách xử lý đặt ở `BUSINESS.finance.promoTreatment`: `'net'` (mặc định) doanh thu chỉ phần tiền thật, khuyến mãi dùng là chi phí kéo khách ở báo cáo và không có bút toán; `'gross'` doanh thu ghi cả khuyến mãi nhưng TÁCH thành bút toán riêng (Nợ chi phí khuyến mãi / Có doanh thu từ khuyến mãi). Tiền đã thu cho các tuần chưa giao là nợ khách (`customer_prepaid`), không phải doanh thu.
- **VAT** (`vatSplit`): giá bán và giá mua coi như đã gồm VAT; tách theo nhóm hàng của nguyên liệu trong đơn (`BUSINESS.tax.groups`, mọi mức vẫn ghi "chưa xác nhận"; `rate: null` coi như 0 và đánh dấu `unconfirmed`). Chưa tính VAT cho phần khuyến mãi ở chế độ `'gross'`: kế toán quyết định.
- `finance.revenue(ctx, { from?, to? })` trả `{ rows[], totals, days[], deferred (thu trước chưa giao), treatment, vatUnconfirmed }`.
- **Hóa đơn điện tử (mock)**, lớp tích hợp `issueDueInvoices`; thời điểm xuất là CẤU HÌNH (`BUSINESS.invoicing.issueOn`, đổi được ở Cài đặt cho tới khi có hóa đơn đầu tiên, sau đó khóa để không xuất trùng): `'delivery'` mỗi đơn đã giao một hóa đơn theo tiền thật đã dùng (xuất ngay khi giao, hoặc ở job định kỳ); `'topup'` mỗi lần nhận tiền (`topup`, `prepaid_cycle`, `card_charge`, không tính bút `backfill`) một hóa đơn, thuế suất theo `finance.topupInvoiceVatRate` (null: chưa tách VAT). `einvoices[i] = { id, number 'C26MFR-nnnnnnn', series, sourceKind ('order' | 'ledger'), sourceId, customerId, mode, eventAt, issuedAt, totalVnd, vatVnd, netVnd, vatUnconfirmed, description, status, provider: 'mock-einvoice', lookupCode }`. Hàm: `finance.invoices(ctx)`, `finance.issueInvoices(ctx)`.

### Giá vốn và margin

- **Giá vốn mỗi thùng** (`boxCost`) = SKU x giá PO (dòng PO của ngày giao, không có thì bảng giá theo ngày hiệu lực; số lượng mua = gram sơ chế / tỷ lệ thu hồi x (1 + dự phòng hao hụt của mua hàng)) + bao bì + túi xốt (`BUSINESS.finance.sauceCostPerPackVnd`, giả định; prompt chưa nêu xốt nhưng xưởng tự chiết rót nên có chi phí) + chi phí logistics phân bổ (`db.logisticsCosts[day].perBoxVnd` do P2C đẩy sang; chưa có bản ghi thì ước tính bằng `dayCost` và đánh dấu `estimated`).
- `finance.margins(ctx, { from?, to? })` trả margin theo thùng, tuần (thứ Hai), loại gói (`solo` 1 người / `family` từ 2 người), khu; mỗi nhóm kèm `marginPct`, `productMarginPct` (trước logistics), `alert` khi dưới `alerts.minGrossMarginPct`. **Chu kỳ đầu tách riêng** như chi phí kéo khách (`firstCycle { acquisitionCostVnd = thẻ quà tặng + khuyến mãi đã dùng, ... }`) và không vào cảnh báo của các tuần thường. `finance.boxCost(ctx, orderId)` trả chi tiết từng SKU.

### Công nợ, đợt chi, dòng tiền, bao phủ

- **Tuổi nợ phải trả** (`payablesAging`) theo số ngày QUÁ hạn: chưa đến hạn / 1–7 / 8–15 / 16–30 / trên 30 (mốc `BUSINESS.finance.agingDays`). Khác `procurement.payables` của P2B (tính theo số ngày TỚI hạn); hàm P2B giữ nguyên và được dùng lại để dựng dòng công nợ (`payableRows`) và đối chiếu (`threeWayMatch`).
- `finance.payables(ctx)` trả `{ rows[], aging { buckets[], items[], totalVnd, overdueVnd }, payRun (đề xuất đợt chi: quá hạn hoặc đến hạn trong `finance.payRun.leadDays` ngày), waitingMatch[], claims[], totals, cashLimitVnd }`. `finance.payRunFile(ctx, { poIds? })` trả CSV file chi (MOCK, mỗi khoản một dòng chuyển khoản: ngân hàng, số tài khoản, người thụ hưởng, số tiền, nội dung). `finance.executePayRun(ctx, { poIds, method: 'bank_transfer' | 'cash' })` ghi chi từng khoản qua `payPo` của P2B.
- **Chi tiền mặt từ `alerts.cashPaymentVatLimitVnd` (5 triệu) trở lên**: giao diện cảnh báo mất quyền khấu trừ VAT đầu vào, `executePayRun` chặn khoản đó (`CASH_OVER_LIMIT`), giống `payPo` của P2B.
- `finance.cashflow(ctx)` trả vị thế tiền (`position`: số dư đầu kỳ + nạp + chuyển khoản trọn gói + thẻ về đã trừ phí cổng - hoàn - trả nhà cung cấp - bảng kê), nợ Fresh Credit, `coverage { ratio = tiền mặt / nợ Fresh Credit phần tiền thật, alert khi dưới alerts.minCashCoverageRatio, shortfallVnd }`, và dự báo `horizonDays` ngày (`forecast.days[]`): tiền vào (lần trừ thẻ theo lịch; gia hạn dự kiến = bình quân chu kỳ x `finance.cashflow.renewalRate`), tiền ra (công nợ đã đối chiếu theo hạn, PO chưa đối chiếu theo hạn ước tính, chi phí logistics chưa trả sau `logisticsTermDays`). Fresh Credit và chuyển khoản trọn gói đã thu tiền nên không có tiền vào mới. Tuỳ chọn `finance.coverage.includePrepaidOrders` cộng cả tiền các đơn đã thu trước chưa giao vào nghĩa vụ.
- Cấu hình: `BUSINESS.finance.openingCashVnd` (số dư đầu kỳ, kế toán sửa ở Cài đặt, mặc định 0).

### Xuất bút toán

`buildJournal` dựng chứng từ từ nghiệp vụ, mỗi chứng từ cân Nợ = Có (có test). Nhóm: `topup` (Nợ tiền gửi / Có khách hàng trả trước; thẻ có thêm Nợ phí cổng), `revenue` (Nợ khách hàng trả trước / Có doanh thu + VAT đầu ra, khi giao), `promo` (chỉ ở chế độ `gross`), `cogs` (Nợ giá vốn nguyên liệu + logistics / Có hàng tồn kho + phải trả logistics, khi giao), `refund` (hoàn tiền thật khi dừng gói), `supplier_invoice` (hóa đơn nhà cung cấp đã đối chiếu: Nợ hàng tồn kho + VAT đầu vào / Có phải trả nhà cung cấp, sau khi trừ khiếu nại), `payment` (trả nhà cung cấp), `statement` (bảng kê thu mua nông sản không hóa đơn, không VAT), `adjustment` (điều chỉnh tiền thật đã duyệt). Khóa tài khoản logic: `cash_bank`, `cash_hand`, `customer_prepaid`, `revenue`, `revenue_promo`, `vat_output`, `vat_input`, `cogs_materials`, `cogs_logistics`, `inventory`, `payable_supplier`, `payable_logistics`, `promo_expense`, `card_fee`, `other_expense`.

Hàm: `finance.journal(ctx, { from?, to?, groups? })` (xem), `finance.journalCsv(ctx, ...)` (CSV có BOM UTF-8; cột: ngày, số chứng từ, nhóm, diễn giải, mã TK, tên TK, Nợ, Có, đối tượng, tham chiếu), `finance.statementsCsv(ctx)` (bảng kê thu mua), `finance.settings(ctx)` / `finance.saveSettings(ctx, { openingCashVnd?, issueOn?, accountMap? })`. Mã lỗi: `SETTINGS_INVALID`, `ISSUE_ON_LOCKED`. Chi phí logistics chưa có luồng thanh toán nên chỉ có `payable_logistics` tăng (tạm tính), chưa có bút chi trả.

### Thẻ điểm nhà cung cấp (giám sát)

`monitoring.scorecard(ctx, { from?, to? })` (mua hàng, admin) trả mỗi nhà cung cấp: `onTimeRate` (phiếu nhập đầu tiên không muộn hơn ngày giao PO; PO quá ngày giao mà chưa có hàng là trễ), `fillRate` (hàng đã giao / hàng đã đặt), `qcRate` (đạt / đã giao), `weightDiffPct` (có dấu), `tempBreaches / tempLines` (ngoài `BUSINESS.temperature`), `claimCount`, `claimVnd`, `marketDiffPct` (so giá thị trường mock, chỉ để xem), `score` 0–100 (trọng số `BUSINESS.finance.scorecard.weights`, chỉ các chỉ số có dữ liệu; chưa có dữ liệu thì `null` chứ không báo 0), `warn` khi dưới `scorecard.warnBelow`, `issues[]`.

### Tổng quan founder

`overview.founder(ctx)` (admin) trả `cash { inVnd, outVnd, netVnd, cashVnd }` (tuần T2–CN hiện tại), `liability`, `coverage`, `margin` (tuần hiện tại, chưa có thì tuần gần nhất có đơn giao; chu kỳ đầu ở `firstCycle`), `retention { renewed, cancelled, lapsed, pct }` (gia hạn / các gói đã kết thúc chu kỳ hoặc dừng; chưa có gói nào kết thúc thì `null`), `onTime` (KPI của P2C), `waste` (hao hụt tháng so với giá trị hàng nhận), `payables`, `alerts[]`.

### Màn hình

`/tai-chinh` (kế toán, admin; tab con `thu-tien`, `doanh-thu`, `gia-von`, `cong-no`, `dong-tien`, `xuat-but-toan`, `cai-dat`), `/giam-sat` (admin, mua hàng), `/tong-quan` (admin). Bảng demo thêm hai nút tiền về ngân hàng (mock).

### Đề xuất sang platform

`cashflow-ledger` nên có: các loại bút Fresh Credit ở bảng trên (kể cả `adjustment` có người duyệt), phân loại tiền thật / khuyến mãi, webhook đối soát VietQR theo mã trong nội dung chuyển khoản (quy tắc khớp ở trên), và ghi nhận doanh thu khi `DELIVERED` theo phần tiền thật. Điểm cần kế toán chọn: chế độ hạch toán khuyến mãi (`net` hay `gross`), thời điểm xuất hóa đơn (`topup` hay `delivery`), thuế suất từng nhóm, mã tài khoản theo TT 99/2025.

## 4. Bổ sung trường Contract V2.2.1 sang Platform (Phễu `/plans` & Metadata món ăn)

Cập nhật ngày 19/11/2026 sau buổi họp chiến lược và tinh chỉnh trải nghiệm khách hàng:

### 4.1 Trường mới trong phễu Onboarding & Đăng ký gói (`/plans`)

| Endpoint / Hàm | Trường | Kiểu dữ liệu | Mô tả & Ý nghĩa nghiệp vụ |
|---|---|---|---|
| `POST /api/v2/onboarding/profile` | `survey_answers.cuisine_preferences[]` | `string[]` | Danh sách phong cách ẩm thực được chọn (hỗ trợ đa chọn): `['viet', 'western', 'asian']`. Khách có thể chọn 1, 2 hoặc cả 3 nhóm (kèm nút "Chọn tất cả"). Nếu mảng rỗng, mặc định đa dạng cả 3. |
| `POST /api/v2/onboarding/profile` | `survey_answers.weekly_grocery_budget_vnd` | `number \| null` | Mức chi tiêu đi chợ hàng tuần của gia đình. Ngoài 4 mốc sẵn có (500k, 1M, 1.5M, 2.5M), bổ sung tùy chọn "Khác" cho phép nhập số tùy chỉnh (200.000đ – 20.000.000đ). Giá trị này chỉ đóng vai trò trần mềm cho Đầu bếp MOVA gợi ý món, không hiển thị như tiêu đề "theo ngân sách". |
| `POST /api/v2/subscription/create-or-renew` | `phone_verified` | `boolean` | Trạng thái xác thực số điện thoại qua OTP (mô phỏng demo mã `1234`) tại bước giao hàng/thanh toán. Bắt buộc `true` để kích hoạt đơn. |
| `POST /api/v2/subscription/create-or-renew` | `voucher_code` | `string \| null` | Mã ưu đãi voucher nhập tại bước thanh toán: `THEQUATANG` (thẻ quà tặng MOVA Fresh trải đều 4 tuần), `MOVA20` (-20.000đ), `FREESHIP` (-25.000đ chặng cuối). |
| `POST /api/v2/subscription/create-or-renew` | `referral_code` | `string \| null` | Mã giới thiệu từ bạn bè (định dạng `MOVA-XXXX`). Khi có mã này: người được mời được **khấu trừ trực tiếp 100.000đ** vào số tiền phải thanh toán đợt đầu (áp dụng trên cả 3 phương thức `fresh_credit`, `bank_transfer_4w`, `card`, tuân thủ trần ưu đãi chu kỳ đầu $\le 30\%$); người giới thiệu được hệ thống cộng ngay **`+100.000đ` vào ngăn `promo` của ví Fresh Credit** ngay sau khi đơn đầu tiên thanh toán thành công. |
| `POST /api/v2/subscription/create-or-renew` | `newsletter_opt_in` | `boolean` | Checkbox tùy chọn đồng ý nhận bản tin công thức nấu ăn Đầu bếp MOVA qua email. Khi `true`, hệ thống tự động thưởng ngay **+15.000đ Fresh Credit** (vào ngăn `promo`, ghi nhận bút toán `reward` trên sổ cái). |

### 4.2 Quy tắc hiển thị đơn giá quy đổi (Pricing Presentation)
- **Hiển thị song song đơn giá theo `bữa` và `suất`:**
  - Tại bước duyệt thực đơn (`StepMenu.vue`, `PriceBlock.vue`) và bước thanh toán (`StepCheckout.vue`), giao diện luôn hiển thị song song đơn giá theo bữa ăn gia đình và đơn giá quy đổi theo suất ăn 1 người:
    $$\text{Đơn giá / suất} = \frac{\text{Đơn giá / bữa}}{\text{Số người ăn}}$$
  - Định dạng hiển thị chuẩn: **`~...đ/suất • ...đ/bữa`**. Giúp khách hàng nhận thức rõ giá trị tiết kiệm và tính kinh tế so với tự đi chợ nấu nướng hoặc ăn ngoài.

### 4.3 Metadata ẩm thực chi tiết của món ăn (`catalog.js` & `recipes.js`)

Để phục vụ modal chi tiết món và tối ưu hóa tính minh bạch (lấy cảm hứng từ Grand Frais và Pizza 4P's), mỗi món ăn trong catalog và công thức nấu đều được bổ sung các trường dữ liệu chuyên sâu:

| Trường | Kiểu dữ liệu | Ví dụ / Quy cách | Mô tả |
|---|---|---|---|
| `terroir_region` | `string` | `"Đắk Lắk"`, `"Chư Sê • Gia Lai"`, `"Đà Lạt"`, `"Biển Vũng Tàu"`, `"Sóc Trăng"` | Huy hiệu vùng thổ nhưỡng / nguyên liệu đặc sản ngắn gọn, hiển thị ngay trên thẻ món. |
| `terroir_story` | `string` | *"Heo thả đồi Ea Kar ăn cám bắp và thảo mộc Tây Nguyên, thịt săn chắc ngọt tự nhiên kết hợp củ sen tươi hồ Lắk giòn bùi."* | Câu chuyện vùng miền 2–3 câu giàu cảm xúc về khí hậu, thổ nhưỡng và nghệ thuật phối xốt bản địa. |
| `chef_note` | `string` | *"Đảo thịt xém cạnh trước khi đổ xốt vào rim lửa nhỏ 8 phút để xốt ngấm sâu và lên màu cánh gián óng ả."* | Mẹo nấu ngon chuẩn vị từ Đầu bếp MOVA (tuyệt đối không dùng từ "AI"). |
| `portion_specs` | `object` | `{ net_weight_grams: 110, size_detail: "Ba rọi heo cắt con chì 2x3cm hút chân không" }` | Định lượng chuẩn cho 1 người ăn (tự động nhân theo số lượng thành viên hộ gia đình trên UI), quy cách kích cỡ sơ chế chi tiết. |
| `nutrition_per_serving` | `object` | `{ calories: 420, protein_g: 28, carbs_g: 12, fat_g: 18 }` | Bảng 4 chỉ số dinh dưỡng chuẩn xác trên 1 khẩu phần ăn. |
| `cooking_steps` | `string[]` | `["Bước 1: Cho ba rọi vào chảo nóng áp chảo 3 phút...", "Bước 2: Cho củ sen và rưới trọn gói xốt...", "Bước 3: Rim nhỏ lửa 8 phút..."]` | 3 bước nấu nhanh gọn 1 chảo hoàn tất trong 15 phút. |

## 5. Câu hỏi mở cho Khôi và Hiếu

1. Giờ chốt sổ mặc định 08:00 ngày D-2 có khớp lịch xe lạnh Đắk Lắk → TP.HCM không?
2. `bom_raw_summary` trong contract đang dùng khóa kiểu `pork_belly_g`; mock dùng mã SKU (`NL-HEO-02`) để khớp `factory-requests`. Chọn một kiểu.
3. Thuật toán gom BOM thật nằm ở `ai-engine/bom-aggregator`. Mock chỉ nhân gram theo số người và đếm túi xốt.
4. Tạm hoãn một tuần: dời tuần đó xuống cuối chu kỳ (các tuần sau giữ ngày) hay đẩy cả lịch lên một tuần? Mock đang chọn dời xuống cuối.
5. Chênh lệch khi đổi món sau mốc trừ tiền của khách trả thẻ: cộng/trừ Fresh Credit (mock) hay trừ / hoàn thẳng vào thẻ?
6. Chuyến xe lạnh: một chuyến (16:00) hay hai chuyến (16:00 và 20:00)? Mock chia theo khung giờ giao (sáng sớm đi chuyến 1, trưa và tối đi chuyến 2).
7. Cỡ túi chuẩn của xưởng theo từng SKU (mock: `src/shared/data/packaging.js`) cần quản đốc xác nhận, kèm hạn dùng từng loại.
8. Mẫu bảng kê thu mua nông sản không hóa đơn nào còn hiệu lực? Mock chỉ có mẫu nội bộ, Mẫu 01/TNDN (chưa xác nhận) và mẫu kế toán tự soạn; kế toán chọn ở Cài đặt.
9. Hạn trả nhà cung cấp tính từ ngày hóa đơn (mock) hay ngày nhận hàng? Đổi bằng BUSINESS.purchasing.dueFrom.
10. Quét mã túi lúc bỏ vào thùng có đưa vào quy trình xưởng không? Nếu có thì thu hồi chính xác từng thùng thay vì chia túi theo thứ tự.
11. Sức chở shipper (mock: 12–15 thùng / chuyến) và chi phí logistics (xe 4,5 triệu / chuyến, kho phụ 2,15 triệu / ngày, chặng cuối 120.000 + 15.000 / điểm) là số giả định; anh Trung cần chốt.
12. Điểm giao thất bại có cần gọi khách trước khi báo "không liên lạc được" không (mock: ít nhất 1 lần gọi), và giữ lạnh ở kho phụ tối đa bao lâu (mock: 24 giờ)?
13. Bù Fresh Credit khi không giao được: bao nhiêu % giá trị đơn (mock: 100%, vào ngăn khuyến mãi)?
14. Thùng xốp / túi gel: thu ở lần giao sau, mỗi thùng giao kèm 1 thùng xốp + 2 túi gel (mock), bật / tắt ở `BUSINESS.logistics.recovery.enabled`.
15. Tỷ lệ bao phủ: mẫu số có nên cộng cả tiền các tuần đã thu trước chưa giao (thẻ, chuyển khoản trọn gói) không? Mock: không, đổi bằng BUSINESS.finance.coverage.includePrepaidOrders.
16. Khuyến mãi đã dùng khi giao hàng hạch toán net (không là doanh thu) hay gross (doanh thu khuyến mãi tách riêng kèm chi phí khuyến mãi)? Đổi bằng BUSINESS.finance.promoTreatment.
17. Hóa đơn xuất khi nạp hay khi giao (BUSINESS.invoicing.issueOn), thuế suất từng nhóm hàng và VAT của khoản nạp (finance.topupInvoiceVatRate) cần kế toán xác nhận.
