// Danh mục mẫu dùng chung cho cả hai app (mã NL-*, XOT-*, HS-* theo docs/factory-requests/README.md).
// Đây là dữ liệu mock có cùng hình dạng với dữ liệu thật sẽ lấy từ backend / ai-engine.

/** nhóm nhiệt: chill (ngăn mát) | frozen (ngăn đông) | ambient (nhiệt độ thường) */
export const SKUS = {
  'NL-BO-01': { id: 'NL-BO-01', name: 'Thịt bò đùi nạc thái mỏng', unit: 'kg', temp: 'chill', yield: 0.95, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 260000, marketPriceVnd: 275000, requiresLot: true },
  'NL-HEO-02': { id: 'NL-HEO-02', name: 'Ba rọi heo thảo mộc', unit: 'kg', temp: 'frozen', yield: 0.97, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 140000, marketPriceVnd: 150000, requiresLot: false },
  'NL-GA-03': { id: 'NL-GA-03', name: 'Ức gà phi lê', unit: 'kg', temp: 'chill', yield: 0.95, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 85000, marketPriceVnd: 92000, requiresLot: false },
  'NL-SUON-04': { id: 'NL-SUON-04', name: 'Sườn non heo cắt khúc', unit: 'kg', temp: 'frozen', yield: 0.85, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 150000, marketPriceVnd: 160000, requiresLot: false },
  'NL-RAU-01': { id: 'NL-RAU-01', name: 'Bông cải xanh baby', unit: 'kg', temp: 'chill', yield: 0.75, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 45000, marketPriceVnd: 52000, requiresLot: false },
  'NL-RAU-02': { id: 'NL-RAU-02', name: 'Cải ngọt Đắk Lắk', unit: 'kg', temp: 'chill', yield: 0.75, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 28000, marketPriceVnd: 32000, requiresLot: false },
  'NL-BI-05': { id: 'NL-BI-05', name: 'Bí đỏ gọt vỏ', unit: 'kg', temp: 'chill', yield: 0.7, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 22000, marketPriceVnd: 26000, requiresLot: false },
  'NL-CACHUA-06': { id: 'NL-CACHUA-06', name: 'Cà chua rửa sạch', unit: 'kg', temp: 'chill', yield: 0.95, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 30000, marketPriceVnd: 34000, requiresLot: false },
  'NL-GAO-01': { id: 'NL-GAO-01', name: 'Gạo ST25 hữu cơ', unit: 'kg', temp: 'ambient', yield: 1, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 38000, marketPriceVnd: 42000, requiresLot: true },
  'NL-BUN-01': { id: 'NL-BUN-01', name: 'Bún gạo khô Tây Nguyên', unit: 'kg', temp: 'ambient', yield: 1, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 45000, marketPriceVnd: 50000, requiresLot: false },
  'NL-KHOAI-01': { id: 'NL-KHOAI-01', name: 'Khoai lang mật', unit: 'kg', temp: 'ambient', yield: 0.9, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 30000, marketPriceVnd: 34000, requiresLot: false },
  'NL-TRAI-01': { id: 'NL-TRAI-01', name: 'Bơ sáp 034', unit: 'kg', temp: 'chill', yield: 0.65, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 70000, marketPriceVnd: 78000, requiresLot: false },
  'NL-TRAI-02': { id: 'NL-TRAI-02', name: 'Chuối tiêu', unit: 'kg', temp: 'ambient', yield: 0.6, taxGroup: 'fresh', supplierId: 'S-FACTORY', priceVnd: 25000, marketPriceVnd: 28000, requiresLot: false },
  'NL-BO-02': { id: 'NL-BO-02', name: 'Thăn bò cắt steak', unit: 'kg', temp: 'chill', yield: 0.95, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 380000, marketPriceVnd: 400000, requiresLot: true },
  'NL-BANHMI-01': { id: 'NL-BANHMI-01', name: 'Bánh mì baguette mini', unit: 'kg', temp: 'ambient', yield: 1, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 40000, marketPriceVnd: 44000, requiresLot: false },
  'NL-MI-01': { id: 'NL-MI-01', name: 'Mì Ý khô', unit: 'kg', temp: 'ambient', yield: 1, taxGroup: 'processed', supplierId: 'S-FACTORY', priceVnd: 48000, marketPriceVnd: 52000, requiresLot: false },
  'HS-CA-01': { id: 'HS-CA-01', name: 'Cá bớp cắt khoanh', unit: 'kg', temp: 'chill', yield: 0.6, taxGroup: 'processed', supplierId: 'S-SEAFOOD', priceVnd: 190000, marketPriceVnd: 205000, requiresLot: false },
  'HS-TOM-02': { id: 'HS-TOM-02', name: 'Tôm sú lột vỏ bỏ chỉ', unit: 'kg', temp: 'frozen', yield: 0.65, taxGroup: 'processed', supplierId: 'S-SEAFOOD', priceVnd: 320000, marketPriceVnd: 340000, requiresLot: false },
  'BB-THUNG-01': { id: 'BB-THUNG-01', name: 'Thùng carton + túi cách nhiệt', unit: 'pcs', temp: 'ambient', yield: 1, taxGroup: 'processed', supplierId: 'S-PACK', priceVnd: 12000, marketPriceVnd: 13500, requiresLot: false }
};

export const PACKAGING_SKU = 'BB-THUNG-01';

/** Gói xốt. Nhà máy tự chiết rót nên không có PO riêng, chỉ có số túi trong phiếu sản xuất. */
export const SAUCES = {
  'XOT-01': { id: 'XOT-01', name: 'Xốt Kho Tàu Củ Sen', grams: 80, shelfLifeDays: 14 },
  'XOT-02': { id: 'XOT-02', name: 'Xốt Tiêu Đen Tây Nguyên', grams: 60, shelfLifeDays: 21 },
  'XOT-03': { id: 'XOT-03', name: 'Xốt Canh Chua Nam Bộ', grams: 90, shelfLifeDays: 14 },
  'XOT-04': { id: 'XOT-04', name: 'Xốt Xào Tỏi Gừng', grams: 50, shelfLifeDays: 30 },
  'XOT-05': { id: 'XOT-05', name: 'Xốt Kho Tộ', grams: 70, shelfLifeDays: 14 },
  'XOT-06': { id: 'XOT-06', name: 'Xốt Kem Nấm Bơ Tỏi', grams: 80, shelfLifeDays: 14 },
  'XOT-07': { id: 'XOT-07', name: 'Xốt Rượu Vang Đỏ', grams: 60, shelfLifeDays: 21 },
  'XOT-08': { id: 'XOT-08', name: 'Xốt BBQ Khói', grams: 70, shelfLifeDays: 21 }
};

export const SUPPLIERS = {
  'S-FACTORY': { id: 'S-FACTORY', name: 'Nhà máy sơ chế MOVA Đắk Lắk', type: 'factory', termDays: 30, pin: '4001', contact: 'Quản đốc nhà máy' },
  'S-SEAFOOD': { id: 'S-SEAFOOD', name: 'Đầu mối hải sản Vũng Tàu', type: 'seafood', termDays: 15, pin: '4002', contact: 'Chủ đầu mối' },
  'S-TRUCK': { id: 'S-TRUCK', name: 'Nhà xe lạnh Tây Nguyên – Sài Gòn', type: 'long_haul', termDays: 15, pin: '4003', contact: 'Điều độ xe' },
  'S-LASTMILE': { id: 'S-LASTMILE', name: 'Đội giao hàng chặng cuối', type: 'last_mile', termDays: 7, pin: '4004', contact: 'Trưởng đội' },
  'S-PACK': { id: 'S-PACK', name: 'Xưởng bao bì cách nhiệt', type: 'packaging', termDays: 30, pin: '4005', contact: 'Kinh doanh' }
};

/**
 * Món. kind: protein | veg | soup | carb | dessert.
 * western: món Tây, chỉ dùng cho bữa Tây (không nằm trong mâm cơm Việt).
 * carbAlt: các món tinh bột khác hợp với món này (mặc định luôn là cơm).
 * bom: gram nguyên liệu đã sơ chế cho MỖI NGƯỜI. sauce: mã xốt (1 túi cho mỗi món mỗi hộ).
 * tags: dùng cho lọc kiêng cữ (beef, pork, seafood, spicy).
 */
const dish = (id, kind, name, o) => ({ id, kind, name, tags: [], sauce: null, prepMinutes: 15, ...o });

export const DISHES = {
  'D-PRT-001': dish('D-PRT-001', 'protein', 'Ba rọi heo thảo mộc kho củ sen', { bom: [{ sku: 'NL-HEO-02', gramsPerPerson: 120 }], sauce: 'XOT-01', tags: ['pork'], pricePerPersonVnd: 42000, nutrition: { kcal: 460, protein: 26, carb: 12, fat: 34 } }),
  'D-PRT-002': dish('D-PRT-002', 'protein', 'Thăn bò lúc lắc tiêu đen', { carbAlt: ['D-CRB-004'], bom: [{ sku: 'NL-BO-01', gramsPerPerson: 100 }], sauce: 'XOT-02', tags: ['beef'], pricePerPersonVnd: 55000, nutrition: { kcal: 420, protein: 34, carb: 18, fat: 24 } }),
  'D-PRT-003': dish('D-PRT-003', 'protein', 'Gà nướng thảo mộc xả mật ong', { carbAlt: ['D-CRB-003'], bom: [{ sku: 'NL-GA-03', gramsPerPerson: 120 }], sauce: 'XOT-04', pricePerPersonVnd: 38000, nutrition: { kcal: 380, protein: 32, carb: 14, fat: 22 } }),
  'D-PRT-004': dish('D-PRT-004', 'protein', 'Sườn non heo rim mắm tỏi', { bom: [{ sku: 'NL-SUON-04', gramsPerPerson: 130 }], sauce: 'XOT-01', tags: ['pork'], pricePerPersonVnd: 45000, nutrition: { kcal: 490, protein: 30, carb: 16, fat: 34 } }),
  'D-PRT-005': dish('D-PRT-005', 'protein', 'Cá bớp kho tộ', { carbAlt: ['D-CRB-002'], bom: [{ sku: 'HS-CA-01', gramsPerPerson: 120 }], sauce: 'XOT-05', tags: ['seafood'], pricePerPersonVnd: 52000, nutrition: { kcal: 340, protein: 30, carb: 10, fat: 18 } }),
  'D-PRT-006': dish('D-PRT-006', 'protein', 'Tôm sú rim cay nhẹ', { bom: [{ sku: 'HS-TOM-02', gramsPerPerson: 100 }], sauce: 'XOT-04', tags: ['seafood', 'spicy'], pricePerPersonVnd: 60000, nutrition: { kcal: 280, protein: 28, carb: 8, fat: 14 } }),
  'D-WST-001': dish('D-WST-001', 'protein', 'Bò thăn áp chảo xốt rượu vang đỏ', { western: true, carbAlt: ['D-CRB-003', 'D-CRB-005'], bom: [{ sku: 'NL-BO-02', gramsPerPerson: 130 }], sauce: 'XOT-07', tags: ['beef'], prepMinutes: 12, pricePerPersonVnd: 78000, nutrition: { kcal: 480, protein: 38, carb: 8, fat: 32 } }),
  'D-WST-002': dish('D-WST-002', 'protein', 'Gà áp chảo xốt kem nấm bơ tỏi', { western: true, carbAlt: ['D-CRB-005', 'D-CRB-004'], bom: [{ sku: 'NL-GA-03', gramsPerPerson: 140 }], sauce: 'XOT-06', prepMinutes: 12, pricePerPersonVnd: 52000, nutrition: { kcal: 430, protein: 36, carb: 10, fat: 26 } }),
  'D-WST-003': dish('D-WST-003', 'protein', 'Sườn heo nướng xốt BBQ khói', { western: true, carbAlt: ['D-CRB-003', 'D-CRB-004'], bom: [{ sku: 'NL-SUON-04', gramsPerPerson: 150 }], sauce: 'XOT-08', tags: ['pork'], prepMinutes: 15, pricePerPersonVnd: 58000, nutrition: { kcal: 520, protein: 32, carb: 18, fat: 36 } }),

  'D-VEG-001': dish('D-VEG-001', 'veg', 'Bông cải xanh sốt dầu hào nấm', { bom: [{ sku: 'NL-RAU-01', gramsPerPerson: 90 }], sauce: 'XOT-04', prepMinutes: 7, pricePerPersonVnd: 12000, nutrition: { kcal: 90, protein: 5, carb: 10, fat: 4 } }),
  'D-VEG-002': dish('D-VEG-002', 'veg', 'Cải ngọt xào tỏi', { bom: [{ sku: 'NL-RAU-02', gramsPerPerson: 100 }], sauce: 'XOT-04', prepMinutes: 5, pricePerPersonVnd: 9000, nutrition: { kcal: 70, protein: 3, carb: 7, fat: 3 } }),

  'D-SUP-001': dish('D-SUP-001', 'soup', 'Canh sườn non bí đỏ', { bom: [{ sku: 'NL-BI-05', gramsPerPerson: 100 }, { sku: 'NL-SUON-04', gramsPerPerson: 50 }], tags: ['pork'], prepMinutes: 15, pricePerPersonVnd: 18000, nutrition: { kcal: 150, protein: 10, carb: 12, fat: 7 } }),
  'D-SUP-002': dish('D-SUP-002', 'soup', 'Canh chua cà chua', { carbAlt: ['D-CRB-002'], bom: [{ sku: 'NL-CACHUA-06', gramsPerPerson: 120 }], sauce: 'XOT-03', prepMinutes: 10, pricePerPersonVnd: 11000, nutrition: { kcal: 60, protein: 2, carb: 11, fat: 1 } }),
  'D-SUP-003': dish('D-SUP-003', 'soup', 'Canh cải ngọt nấu thịt bằm', { bom: [{ sku: 'NL-RAU-02', gramsPerPerson: 80 }, { sku: 'NL-GA-03', gramsPerPerson: 30 }], prepMinutes: 10, pricePerPersonVnd: 12000, nutrition: { kcal: 80, protein: 8, carb: 4, fat: 3 } }),

  'D-CRB-001': dish('D-CRB-001', 'carb', 'Gạo thơm dẻo ST25', { bom: [{ sku: 'NL-GAO-01', gramsPerPerson: 80 }], prepMinutes: 0, pricePerPersonVnd: 8000, nutrition: { kcal: 280, protein: 6, carb: 62, fat: 1 } }),
  'D-CRB-002': dish('D-CRB-002', 'carb', 'Bún gạo khô Tây Nguyên', { bom: [{ sku: 'NL-BUN-01', gramsPerPerson: 70 }], prepMinutes: 5, pricePerPersonVnd: 8000, nutrition: { kcal: 250, protein: 4, carb: 56, fat: 1 } }),
  'D-CRB-003': dish('D-CRB-003', 'carb', 'Khoai lang mật nướng', { bom: [{ sku: 'NL-KHOAI-01', gramsPerPerson: 150 }], prepMinutes: 0, pricePerPersonVnd: 9000, lowCarb: true, nutrition: { kcal: 180, protein: 3, carb: 41, fat: 0 } }),
  'D-CRB-004': dish('D-CRB-004', 'carb', 'Bánh mì nướng bơ tỏi', { bom: [{ sku: 'NL-BANHMI-01', gramsPerPerson: 60 }], prepMinutes: 3, pricePerPersonVnd: 9000, nutrition: { kcal: 230, protein: 7, carb: 40, fat: 5 } }),
  'D-CRB-005': dish('D-CRB-005', 'carb', 'Mì Ý xốt cà', { bom: [{ sku: 'NL-MI-01', gramsPerPerson: 80 }], prepMinutes: 8, pricePerPersonVnd: 10000, nutrition: { kcal: 280, protein: 10, carb: 56, fat: 2 } }),

  'D-DST-001': dish('D-DST-001', 'dessert', 'Bơ sáp 034 Tây Nguyên', { bom: [{ sku: 'NL-TRAI-01', gramsPerPerson: 150 }], prepMinutes: 0, pricePerPersonVnd: 14000, nutrition: { kcal: 240, protein: 3, carb: 13, fat: 22 } }),
  'D-DST-002': dish('D-DST-002', 'dessert', 'Chuối tiêu chín cây', { bom: [{ sku: 'NL-TRAI-02', gramsPerPerson: 120 }], prepMinutes: 0, pricePerPersonVnd: 8000, nutrition: { kcal: 105, protein: 1, carb: 27, fat: 0 } })
};

/** Mã khung giờ của hợp đồng API → khung giờ nội bộ. */
export const SLOT_ALIASES = {
  early_morning_06_08: 'early_morning_06_08',
  noon_11_13: 'noon_11_13',
  evening_18_21: 'evening_18_21'
};

/** 10 AI Personas theo .agent/05 — nền để nhân ra các hộ mẫu. */
export const PERSONAS = [
  { id: 'P1', label: 'Dân gym nam', householdSize: 1, goals: ['high_protein', 'low_carb'], restrictions: [], mealsPerWeek: 6, deliveriesPerWeek: 1, payment: 'fresh_credit', zoneId: 'Z3' },
  { id: 'P2', label: 'Nữ văn phòng giảm mỡ', householdSize: 1, goals: ['low_carb'], restrictions: ['no_beef'], mealsPerWeek: 5, deliveriesPerWeek: 1, payment: 'card', zoneId: 'Z1' },
  { id: 'P3', label: 'Cần hạn chế đường', householdSize: 2, goals: ['limit_sugar', 'low_carb'], restrictions: [], mealsPerWeek: 5, deliveriesPerWeek: 1, payment: 'bank_transfer_4w', zoneId: 'Z5' },
  { id: 'P4', label: 'Dạ dày nhạy cảm', householdSize: 1, goals: ['gentle_digestion'], restrictions: ['no_spicy'], mealsPerWeek: 4, deliveriesPerWeek: 1, payment: 'card', zoneId: 'Z2' },
  { id: 'P5', label: 'Gia đình trẻ có con nhỏ', householdSize: 3, goals: ['balanced'], restrictions: ['no_spicy'], mealsPerWeek: 5, deliveriesPerWeek: 2, payment: 'fresh_credit', zoneId: 'Z2' },
  { id: 'P6', label: 'Đại gia đình ba thế hệ', householdSize: 6, goals: ['balanced'], restrictions: [], mealsPerWeek: 6, deliveriesPerWeek: 2, payment: 'bank_transfer_4w', zoneId: 'Z4' },
  { id: 'P7', label: 'Chuyên gia bận rộn độc thân', householdSize: 1, goals: ['balanced'], restrictions: [], mealsPerWeek: 4, deliveriesPerWeek: 1, payment: 'card', zoneId: 'Z1' },
  { id: 'P8', label: 'Ăn chay bán phần', householdSize: 2, goals: ['balanced'], restrictions: ['no_beef', 'no_pork'], mealsPerWeek: 4, deliveriesPerWeek: 1, payment: 'fresh_credit', zoneId: 'Z6' },
  { id: 'P9', label: 'Mẹ bỉm sữa sau sinh', householdSize: 2, goals: ['high_protein', 'gentle_digestion'], restrictions: ['no_spicy'], mealsPerWeek: 6, deliveriesPerWeek: 2, payment: 'bank_transfer_4w', zoneId: 'Z7' },
  { id: 'P10', label: 'Cặp đôi Gen Z mê Fusion', householdSize: 2, goals: ['balanced'], restrictions: [], mealsPerWeek: 5, deliveriesPerWeek: 1, payment: 'card', zoneId: 'Z8' }
];
