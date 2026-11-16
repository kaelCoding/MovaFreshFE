// MỌI con số kinh doanh và vận hành nằm ở đây. Không viết cứng trong component.
// Các số đánh dấu (giả định) là số minh họa, chờ founder / anh Trung chốt, và số thật
// phải lấy từ nghiên cứu 200 hộ. Xem prompts/README.md, mục "Việc cần làm trước khi chạy".

const SLOTS = {
  morning: { id: 'early_morning_06_08', label: 'Sáng sớm 06:00 – 08:00', startHour: 6, startMin: 0 },
  noon: { id: 'noon_11_13', label: 'Buổi trưa 11:00 – 13:00', startHour: 11, startMin: 0 },
  evening: { id: 'evening_18_21', label: 'Tối muộn 18:30 – 21:00', startHour: 18, startMin: 30 }
};

const slot = (key, capacityBoxes) => ({ ...SLOTS[key], capacityBoxes });

export const BUSINESS = {
  subscription: {
    minWeeks: 4,
    defaultWeeks: 4,
    // Tạm hoãn tối đa bao nhiêu tuần trong một chu kỳ (giả định)
    maxSkipWeeksPerCycle: 1,
    // Còn từng này tuần (hoặc ít hơn) chưa giao thì app mời khách gia hạn. Gia hạn luôn cần khách đồng ý rõ ràng.
    renewPromptAtRemainingWeeks: 1
  },

  // Đồng hồ vận hành. Mọi mốc tính theo giờ Việt Nam.
  timings: {
    chargeBeforeDeliveryHours: 72, // trừ tiền trước giờ giao 72 tiếng
    remindBeforeDeliveryHours: 24, // báo khách khung giờ giao trước 24 tiếng
    notifyBeforeChargeHours: 24, // báo khách thực đơn tuần sau + số tiền + hạn đổi món trước mốc trừ tiền 24 tiếng
    cutoffDaysBeforeDelivery: 2, // chốt sổ vào D-2 (giả định, chờ chốt với nhà máy)
    cutoffHour: 8,
    cutoffMinute: 0,
    truckDepartHour: 16, // xe lạnh rời Đắk Lắk lúc 16:00 ngày D-1 (giả định)
    hubArrivalHour: 3 // xe tới kho phụ TP.HCM lúc 03:00 ngày D (giả định)
  },

  incentives: {
    // Thẻ quà tặng trải đều theo tuần, học HelloFresh. Số 900k chỉ là ví dụ (giả định).
    giftCardWeeklyVnd: [300000, 200000, 200000, 200000],
    // Thẻ quà tặng tối đa bao nhiêu % giá trị gói 4 tuần (gói nhỏ không được miễn phí trọn tuần 1)
    giftCardMaxPctOfPackage: 0.2,
    // Trần tổng ưu đãi chu kỳ đầu = thẻ quà tặng + thưởng nạp (giả định)
    maxFirstCycleDiscountPct: 0.3,
    // Mã thẻ quà tặng phễu /plans gửi kèm khi đăng ký (bản thật do chiến dịch quảng cáo cấp)
    giftCardCode: 'THEQUATANG',
    // Thưởng nạp thường xuyên khoảng 10% (chị My, 31:36)
    topUpPacks: [
      { id: 'standard', label: 'Gói Tiêu chuẩn', payVnd: 1500000, bonusPct: 0.1 },
      { id: 'family', label: 'Gói Gia đình', payVnd: 2800000, bonusPct: 0.1 },
      { id: 'premium', label: 'Gói Dinh dưỡng', payVnd: 5000000, bonusPct: 0.1 }
    ],
    rewards: {
      profileComplete: 20000,
      share: 20000,
      referrer: 100000,
      referee: 100000
    },
    // Chia sẻ nhận thưởng tối đa bao nhiêu lần mỗi tuần (giả định, chống chia sẻ vòng)
    maxShareRewardsPerWeek: 2,
    // Mức nạp thêm tối thiểu ngoài các gói nạp
    minTopUpVnd: 100000
  },

  // Phễu đăng ký /plans
  plan: {
    householdMin: 1,
    householdMax: 10,
    householdDefault: 2,
    mealsPerWeekMin: 3,
    mealsPerWeekMax: 7,
    mealsPerWeekDefault: 5,
    // Số bữa Tây mỗi tuần khi khách chọn "Việt + 1–2 bữa Tây": từ 5 bữa/tuần trở lên thì 2 bữa
    westernMealsWhenMixed: { base: 1, withMealsAtLeast: 5, extra: 2 },
    // Hệ số khi khách trả lời các câu hỏi giá trị ở bước thực đơn
    upsells: { proteinFactor: 1.3, lowCarbCarbFactor: 0.5, lowCarbVegFactor: 1.5 },
    // Mức chi tiêu đi chợ mỗi tuần (câu tùy chọn): trần mềm cho AI, không hiện như tiêu đề
    groceryBudgetChoicesVnd: [500000, 1000000, 1500000, 2500000]
  },

  credit: {
    // Thứ tự trừ hai ngăn Fresh Credit. Mặc định trừ tiền thật trước (giảm nghĩa vụ hoàn tiền).
    spendOrder: ['real', 'promo']
  },

  // Khu giao: nhóm quận/huyện, ngày giao trong tuần (0 = Chủ Nhật), khung giờ và sức chứa (thùng).
  zones: [
    {
      id: 'Z1', name: 'Quận 1 – Quận 3 – Phú Nhuận',
      districts: ['Quận 1', 'Quận 3', 'Phú Nhuận'],
      deliveryDays: [1, 4],
      slots: [slot('morning', 30), slot('noon', 30), slot('evening', 40)]
    },
    {
      id: 'Z2', name: 'Quận 7 – Nhà Bè',
      districts: ['Quận 7', 'Nhà Bè'],
      deliveryDays: [2, 5],
      slots: [slot('morning', 30), slot('evening', 40)]
    },
    {
      id: 'Z3', name: 'Bình Thạnh',
      districts: ['Bình Thạnh'],
      deliveryDays: [1, 4],
      slots: [slot('morning', 25), slot('noon', 25), slot('evening', 35)]
    },
    {
      id: 'Z4', name: 'Thủ Đức',
      districts: ['Thủ Đức', 'TP. Thủ Đức'],
      deliveryDays: [2, 6],
      slots: [slot('morning', 25), slot('evening', 35)]
    },
    {
      id: 'Z5', name: 'Quận 10 – Tân Bình – Tân Phú',
      districts: ['Quận 10', 'Tân Bình', 'Tân Phú'],
      deliveryDays: [3, 6],
      slots: [slot('morning', 25), slot('noon', 25), slot('evening', 35)]
    },
    {
      id: 'Z6', name: 'Gò Vấp – Quận 12',
      districts: ['Gò Vấp', 'Quận 12'],
      deliveryDays: [3, 0],
      slots: [slot('morning', 20), slot('evening', 30)]
    },
    {
      id: 'Z7', name: 'Dĩ An – Thuận An (Bình Dương)',
      districts: ['Dĩ An', 'Thuận An'],
      province: 'Bình Dương',
      deliveryDays: [2, 5],
      slots: [slot('evening', 20)]
    },
    {
      id: 'Z8', name: 'Biên Hòa (Đồng Nai)',
      districts: ['Biên Hòa'],
      province: 'Đồng Nai',
      deliveryDays: [3, 6],
      slots: [slot('evening', 20)]
    }
  ],

  // Ngưỡng nhiệt độ chuỗi lạnh (°C)
  temperature: {
    chill: { min: 0, max: 4 },
    frozen: { max: -18 }
  },

  // Màu sticker theo nhóm nhiệt (chỉ hiện ở app vận hành, không hiện ở app khách)
  stickers: {
    chill: { color: 'green', label: 'Sticker Xanh (Ngăn mát)' },
    frozen: { color: 'blue', label: 'Sticker Xanh Dương (Ngăn đông)' },
    ambient: { color: null, label: 'Không dán sticker' }
  },

  // Xưởng Đắk Lắk (P2A)
  factory: {
    // Chuyến xe lạnh Đắk Lắk -> TP.HCM (giả định). slotIds: các khung giờ giao được chở trên chuyến này.
    // Chuyến 1 rời 16:00 (đúng timings.truckDepartHour), tới kho phụ 03:00 nên kịp khung sáng sớm.
    // Chuyến 2 rời 20:00 tới khoảng 07:00, chở hàng cho khung trưa và tối.
    trips: [
      { id: 'T1', label: 'Chuyến 1', departHour: 16, departMin: 0, slotIds: [SLOTS.morning.id] },
      { id: 'T2', label: 'Chuyến 2', departHour: 20, departMin: 0, slotIds: [SLOTS.noon.id, SLOTS.evening.id] }
    ],
    // Cỡ túi và hạn dùng mặc định khi SKU chưa khai báo ở data/packaging.js (giả định)
    defaultBagGrams: 250,
    shelfDaysByTemp: { chill: 4, frozen: 30, ambient: 60 },
    // Nút cộng nhanh khi ghi số túi đã làm
    quickAdds: [10, 50],
    // Ảnh chụp ở xưởng được thu nhỏ trước khi lưu (cạnh dài tối đa, px) để nhẹ bộ nhớ trình duyệt
    photoMaxPx: 480
  },

  purchasing: {
    // Dự phòng hao hụt khi tạo PO (giả định)
    wasteBufferPct: 0.05
  },

  payables: {
    defaultTermDays: 15
  },

  // Thuế suất theo nhóm hàng. Kế toán xác nhận, chưa phải số đã duyệt.
  tax: {
    groups: {
      fresh: { label: 'Nông sản tươi', rate: null, confirmed: false },
      processed: { label: 'Hàng sơ chế / đóng gói', rate: 0.08, confirmed: false },
      sauce: { label: 'Xốt', rate: 0.08, confirmed: false },
      service: { label: 'Dịch vụ vận chuyển', rate: 0.08, confirmed: false }
    }
  },

  invoicing: {
    // 'topup' = xuất hóa đơn khi khách nạp; 'delivery' = xuất khi giao hàng. Quy định chưa thống nhất.
    issueOn: 'delivery'
  },

  alerts: {
    minGrossMarginPct: 0.2,
    // Tỷ lệ bao phủ = tiền mặt / nợ Fresh Credit (phần tiền thật)
    minCashCoverageRatio: 1.0,
    // Chi tiền mặt từ 5 triệu trở lên thì mất quyền khấu trừ VAT đầu vào (Luật GTGT 48/2024/QH15)
    cashPaymentVatLimitVnd: 5000000
  },

  // Mỗi khu có thể đổi: tên khung giờ lấy từ SLOTS ở trên.
  slotIds: Object.values(SLOTS).map((s) => s.id)
};

export function getZone(zoneId) {
  return BUSINESS.zones.find((z) => z.id === zoneId) || null;
}

export const DEFAULT_PROVINCE = 'TP. Hồ Chí Minh';
export const zoneProvince = (zone) => (zone && zone.province) || DEFAULT_PROVINCE;

export function findZoneByDistrict(text = '') {
  const t = text.toLowerCase();
  return (
    BUSINESS.zones.find((z) => z.districts.some((d) => t.includes(d.toLowerCase()))) || null
  );
}
