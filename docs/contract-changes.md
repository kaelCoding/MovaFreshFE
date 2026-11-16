# Đề xuất thay đổi `api-contract.json`

> Repo web KHÔNG sửa `movafresh-platform/docs/api-contract.json`. Theo `movafresh-platform/AGENTS.md`, mọi thay đổi phải có cả Khôi và Hiếu đồng thuận và giữ tương thích ngược. File này ghi lại những chỗ lớp mock `src/shared/api/` đang khác contract hiện tại hoặc cần thêm, để đưa sang bên platform.

Cập nhật: 16/11/2026 (P0, P1A, P1B, P2A)

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

## 4. Câu hỏi mở cho Khôi và Hiếu

1. Giờ chốt sổ mặc định 08:00 ngày D-2 có khớp lịch xe lạnh Đắk Lắk → TP.HCM không?
2. `bom_raw_summary` trong contract đang dùng khóa kiểu `pork_belly_g`; mock dùng mã SKU (`NL-HEO-02`) để khớp `factory-requests`. Chọn một kiểu.
3. Thuật toán gom BOM thật nằm ở `ai-engine/bom-aggregator`. Mock chỉ nhân gram theo số người và đếm túi xốt.
4. Tạm hoãn một tuần: dời tuần đó xuống cuối chu kỳ (các tuần sau giữ ngày) hay đẩy cả lịch lên một tuần? Mock đang chọn dời xuống cuối.
5. Chênh lệch khi đổi món sau mốc trừ tiền của khách trả thẻ: cộng/trừ Fresh Credit (mock) hay trừ / hoàn thẳng vào thẻ?
6. Chuyến xe lạnh: một chuyến (16:00) hay hai chuyến (16:00 và 20:00)? Mock chia theo khung giờ giao (sáng sớm đi chuyến 1, trưa và tối đi chuyến 2).
7. Cỡ túi chuẩn của xưởng theo từng SKU (mock: `src/shared/data/packaging.js`) cần quản đốc xác nhận, kèm hạn dùng từng loại.
