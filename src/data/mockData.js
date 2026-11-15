// MÂM CƠM VIỆT 5 THÀNH PHẦN & SUẤT ĂN ĐỘC THÂN HOÀN CHỈNH (V2 SPEC)
// 1. Món Đạm chính (Thịt/Cá sơ chế sạch Đắk Lắk)
// 2. Món Canh ấm bụng
// 3. Món Rau xanh Đà Lạt
// 4. Tinh bột (Gạo ST25 / Gạo lứt / Bún)
// 5. Trái cây tráng miệng nhiệt đới theo mùa

export const DISHES = [
  // ===================================================================
  // A. MÂM CƠM GIA ĐÌNH VIỆT (Dành cho >= 2 người)
  // ===================================================================
  {
    id: 'mam-bo-luclac',
    name: 'Mâm Thăn Bò Lúc Lắc & Canh Chua Lá Giang',
    p: 'bo',
    category: 'viet_family',
    time: 15,
    pricePerPerson: 79000,
    price: 79000, // Tương thích ngược với các component cũ
    save: 5000,
    pop: 10,
    spicy: false,
    lowOil: false,
    components: {
      main: 'Thăn bò Đắk Lắk lúc lắc ớt chuông Đà Lạt (sốt tiêu xanh)',
      soup: 'Canh chua cá bớp lá giang Tây Nguyên ấm bụng',
      veg: 'Cải thìa Đà Lạt xào tỏi giòn ngọt',
      carb: 'Cơm trắng Gạo dẻo ST25 Sóc Trăng',
      dessert: 'Bơ sáp Đắk Lắk mật ong rừng'
    },
    baseGrams: { meat: 160, veg: 140, soup: 160, carb: 120, dessert: 80 },
    tags: ['Mâm 5 thành phần', 'Bán chạy nhất', 'High-Protein'],
    goals: ['balanced', 'muscle'],
    exclusions: ['has_beef'],
    nutrition: { kcal: 540, protein: 42, carb: 48, fat: 18 },
    steps: [
      'Bật nồi nhỏ: Cho gói nguyên liệu Canh chua lá giang vào 500ml nước sôi, đun 5 phút.',
      'Bật chảo: Áp chảo thăn bò Đắk Lắk cùng ớt chuông 3 phút lửa lớn, rưới gói xốt tiêu xanh.',
      'Cùng chảo đó: Xào nhanh cải thìa 2 phút trên lửa lớn với tỏi tươi.',
      'Xới cơm ST25 dẻo thơm và bày bơ sáp tráng miệng. Hoàn tất mâm 5 món trong 15 phút!'
    ]
  },
  {
    id: 'mam-ga-sa',
    name: 'Mâm Gà Đồi Nướng Sả Mật Ong & Canh Cải Bắp',
    p: 'ga',
    category: 'viet_family',
    time: 15,
    pricePerPerson: 68000,
    price: 68000,
    save: 4000,
    pop: 9,
    spicy: false,
    lowOil: true,
    components: {
      main: 'Đùi gà đồi Đắk Lắk rút xương nướng sả mật ong',
      soup: 'Canh súp gà cải thảo nấm hương thơm lừng',
      veg: 'Đậu que xào cà rốt Đà Lạt',
      carb: 'Cơm Gạo dẻo ST25',
      dessert: 'Ổi nữ hoàng giòn ngọt rắc muối tôm'
    },
    baseGrams: { meat: 180, veg: 130, soup: 150, carb: 120, dessert: 90 },
    tags: ['Mâm 5 thành phần', 'Ít dầu mỡ', 'Thanh đạm'],
    goals: ['balanced', 'low_carb', 'easy_digest'],
    exclusions: ['has_chicken'],
    nutrition: { kcal: 480, protein: 39, carb: 44, fat: 16 },
    steps: [
      'Đặt chảo chống dính, áp chảo gà đồi mặt da 6 phút mỗi mặt cho vàng giòn, rưới sốt sả mật ong.',
      'Nấu nhanh canh cải bắp nấm hương trong 4 phút.',
      'Xào đậu que cà rốt 2 phút với một thìa nước dùng.',
      'Dùng nóng cùng cơm dẻo ST25 và ổi nữ hoàng tráng miệng.'
    ]
  },
  {
    id: 'mam-suon-toi',
    name: 'Mâm Sườn Non Heo Thảo Mộc & Canh Bí Đỏ Hạt Sen',
    p: 'suon',
    category: 'viet_family',
    time: 15,
    pricePerPerson: 72000,
    price: 72000,
    save: 4000,
    pop: 9,
    spicy: false,
    lowOil: false,
    components: {
      main: 'Sườn non heo thảo mộc Đắk Lắk rim mắm tỏi tiêu',
      soup: 'Canh bí đỏ bùi ngọt hạt sen tươi hầm thịt bằm',
      veg: 'Cải ngọt Đắk Lắk luộc chấm kho quẹt thơm nức',
      carb: 'Cơm thơm Gạo ST25',
      dessert: 'Dưa lưới ruột cam Tây Nguyên thanh mát'
    },
    baseGrams: { meat: 180, veg: 150, soup: 160, carb: 120, dessert: 90 },
    tags: ['Mâm 5 thành phần', 'Vị đậm đà', 'Gia đình'],
    goals: ['balanced', 'easy_digest'],
    exclusions: ['has_pork'],
    nutrition: { kcal: 520, protein: 36, carb: 52, fat: 20 },
    steps: [
      'Cho sườn non vào chảo rim với tỏi băm và gói nước rim 7 phút đến khi sốt keo bóng.',
      'Đun canh bí đỏ hạt sen 6 phút cho mềm bùi.',
      'Luộc nhanh cải ngọt 3 phút, giữ màu xanh mướt.',
      'Dùng kèm cơm ST25 và dưa lưới ruột cam.'
    ]
  },
  {
    id: 'mam-ca-kho',
    name: 'Mâm Cá Bớp Kho Tộ Nước Dừa & Canh Chua Bông Lau',
    p: 'ca',
    category: 'viet_family',
    time: 15,
    pricePerPerson: 76000,
    price: 76000,
    save: 5000,
    pop: 8,
    spicy: false,
    lowOil: true,
    components: {
      main: 'Cá bớp biển miền Trung kho tộ nước dừa thơm béo',
      soup: 'Canh chua cá bông lau thì là cà chua thanh mát',
      veg: 'Rau muống non Đắk Lắk xào tỏi giòn rụm',
      carb: 'Cơm trắng Gạo dẻo ST25',
      dessert: 'Chanh dây tươi Tây Nguyên pha mật ong'
    },
    baseGrams: { meat: 170, veg: 140, soup: 160, carb: 120, dessert: 80 },
    tags: ['Mâm 5 thành phần', 'Omega-3', 'Thanh mát'],
    goals: ['balanced', 'low_carb', 'easy_digest'],
    exclusions: ['has_seafood'],
    nutrition: { kcal: 460, protein: 41, carb: 42, fat: 15 },
    steps: [
      'Cho cá bớp cùng gói sốt kho nước dừa vào tộ hoặc chảo nhỏ, rim lửa vừa 8 phút.',
      'Đun sôi nước canh chua bông lau thì là 4 phút.',
      'Xào nhanh rau muống tỏi trên lửa lớn 2 phút.',
      'Hoàn tất mâm cơm cá đậm vị quê nhà.'
    ]
  },
  {
    id: 'mam-bo-raucu',
    name: 'Mâm Bắp Bò Áp Chảo Rau Củ & Canh Súp Hạt Sen',
    p: 'bo',
    category: 'viet_family',
    time: 12,
    pricePerPerson: 82000,
    price: 82000,
    save: 5000,
    pop: 8,
    spicy: false,
    lowOil: true,
    components: {
      main: 'Bắp bò Đắk Lắk áp chảo rau củ sốt tiêu đen',
      soup: 'Canh súp bắp ngọt hạt sen tươi Đà Lạt',
      veg: 'Bông cải xanh Đà Lạt xào nấm đông cô',
      carb: 'Gạo lứt huyết rồng dẻo thơm (Low-GI)',
      dessert: 'Bơ sáp Đắk Lắk cắt lát'
    },
    baseGrams: { meat: 170, veg: 160, soup: 150, carb: 110, dessert: 80 },
    tags: ['Mâm 5 thành phần', 'Low-GI', 'Tiểu đường & Gym'],
    goals: ['muscle', 'diabetic', 'low_carb'],
    exclusions: ['has_beef'],
    nutrition: { kcal: 490, protein: 44, carb: 40, fat: 16 },
    steps: [
      'Áp chảo bắp bò thái lát lửa lớn 2.5 phút, trút ra đĩa.',
      'Xào bông cải xanh và nấm 3 phút, đổ bắp bò vào đảo 1 phút cùng sốt tiêu đen.',
      'Hâm nóng canh súp bắp hạt sen 3 phút.',
      'Dùng kèm cơm gạo lứt huyết rồng và bơ sáp.'
    ]
  },
  {
    id: 'mam-chay-nam',
    name: 'Mâm Nấm Đùi Gà Kho Tiêu Xanh & Canh Rong Biển (Thuần Chay)',
    p: 'chay',
    category: 'viet_family',
    time: 12,
    pricePerPerson: 62000,
    price: 62000,
    save: 4000,
    pop: 8,
    spicy: false,
    lowOil: true,
    isVegan: true,
    components: {
      main: 'Nấm đùi gà & Đậu hũ non Đà Lạt kho tiêu xanh Tây Nguyên',
      soup: 'Canh rong biển tươi đậu hũ hạt sen thanh nhiệt',
      veg: 'Cải thìa xào nấm bào ngư sốt dầu hào chay',
      carb: 'Gạo lứt hữu cơ ST25',
      dessert: 'Bơ sáp dầm hạt chia ngọt nhẹ'
    },
    baseGrams: { meat: 0, veg: 240, soup: 160, carb: 120, dessert: 90 },
    tags: ['Mâm 5 thành phần', 'Thuần chay / Rằm', 'Dễ tiêu hóa'],
    goals: ['balanced', 'diabetic', 'easy_digest'],
    exclusions: ['vegan'],
    nutrition: { kcal: 410, protein: 26, carb: 54, fat: 11 },
    steps: [
      'Cho nấm đùi gà và đậu hũ non vào chảo rim với sốt tiêu xanh chay 7 phút.',
      'Nấu nhanh canh rong biển hạt sen đậu hũ 4 phút.',
      'Xào cải thìa và nấm bào ngư 2 phút.',
      'Thanh lọc cơ thể với mâm cơm chay tinh tươm.'
    ]
  },

  // ===================================================================
  // B. MÂM CƠM KẾT HỢP ĐỒ TÂY (FUSION BISTRO - PHỤC VỤ GU VIET_FUSION)
  // ===================================================================
  {
    id: 'mam-steak-bistro',
    name: 'Mâm Steak Thăn Bò Đắk Lắk Sốt Tiêu & Súp Bí Đỏ Bistro',
    p: 'bo',
    category: 'fusion',
    time: 15,
    pricePerPerson: 95000,
    price: 95000,
    save: 6000,
    pop: 9,
    spicy: false,
    lowOil: true,
    isFusion: true,
    components: {
      main: 'Thăn bò Đắk Lắk áp chảo sốt tiêu đen & rượu vang đỏ',
      soup: 'Súp bí đỏ kem sữa hạt sen béo ngậy',
      veg: 'Salad rau mầm Đà Lạt sốt chanh dây mật ong',
      carb: 'Khoai tây nghiền bơ sữa Đắk Lắk mịn mượt',
      dessert: 'Dưa lưới & Dâu tây Đà Lạt tươi'
    },
    baseGrams: { meat: 180, veg: 140, soup: 160, carb: 140, dessert: 80 },
    tags: ['Fusion Bistro', 'Đổi vị cuối tuần', 'High-Protein'],
    goals: ['muscle', 'balanced'],
    exclusions: ['has_beef'],
    nutrition: { kcal: 580, protein: 48, carb: 44, fat: 22 },
    steps: [
      'Áp chảo steak bò Đắk Lắk 2.5 phút mỗi mặt đến độ chín vừa (Medium Rare), rưới sốt tiêu đen.',
      'Hâm nóng súp bí đỏ hạt sen 3 phút.',
      'Trộn salad rau mầm Đà Lạt với sốt chanh dây.',
      'Bày khoai tây nghiền, dĩa steak và thưởng thức chuẩn phong cách Bistro tại nhà.'
    ]
  },
  {
    id: 'mam-ga-bistro',
    name: 'Mâm Ức Gà Áp Chảo Sốt Bơ Tỏi Thảo Mộc & Súp Nấm Đà Lạt',
    p: 'ga',
    category: 'fusion',
    time: 15,
    pricePerPerson: 85000,
    price: 85000,
    save: 5000,
    pop: 8,
    spicy: false,
    lowOil: true,
    isFusion: true,
    components: {
      main: 'Ức gà đồi Đắk Lắk áp chảo thảo mộc sốt bơ tỏi chanh vàng',
      soup: 'Súp kem nấm đông cô tươi Đà Lạt',
      veg: 'Măng tây & Cà rốt baby nướng muối tiêu',
      carb: 'Khoai lang mật nướng dẻo ngọt tự nhiên',
      dessert: 'Bơ sáp dầm sữa chua Hy Lạp'
    },
    baseGrams: { meat: 190, veg: 140, soup: 150, carb: 120, dessert: 90 },
    tags: ['Fusion Bistro', 'Eat Clean', 'Tăng cơ giảm mỡ'],
    goals: ['muscle', 'low_carb', 'easy_digest'],
    exclusions: ['has_chicken'],
    nutrition: { kcal: 510, protein: 46, carb: 42, fat: 15 },
    steps: [
      'Áp chảo ức gà thảo mộc 5 phút mỗi mặt, rưới sốt bơ tỏi chanh thơm ngậy.',
      'Hâm nóng súp kem nấm Đà Lạt 3 phút.',
      'Áp chảo nhanh măng tây và cà rốt baby 3 phút.',
      'Dùng kèm khoai lang mật nướng và tráng miệng bơ sữa chua.'
    ]
  },

  // ===================================================================
  // C. SUẤT ĂN ĐỘC THÂN HOÀN CHỈNH (Dành riêng cho householdSize === 1)
  // Nấu nhanh 1 chảo 10–12 phút, gọn sạch, không phải rửa dọn nhiều
  // ===================================================================
  {
    id: 'suat-don-bo',
    name: 'Suất Độc Thân: Thăn Bò Lúc Lắc & Cơm Lứt Huyết Rồng',
    p: 'bo',
    category: 'solo',
    time: 10,
    pricePerPerson: 79000,
    price: 79000,
    save: 4000,
    pop: 9,
    spicy: false,
    lowOil: true,
    components: {
      main: '180g Thăn bò Đắk Lắk lúc lắc ớt chuông Đà Lạt',
      soup: 'Chén súp rong biển đậu hũ ăn liền',
      veg: 'Salad dưa leo, cà chua bi & cải mầm',
      carb: 'Cơm Gạo lứt huyết rồng dẻo thơm (Low-Carb)',
      dessert: 'Ổi nữ hoàng cắt lát sẵn'
    },
    baseGrams: { meat: 180, veg: 120, soup: 120, carb: 120, dessert: 80 },
    tags: ['Suất 1 người', 'Nấu 1 chảo 10p', 'High-Protein'],
    goals: ['muscle', 'low_carb', 'balanced'],
    exclusions: ['has_beef'],
    nutrition: { kcal: 480, protein: 42, carb: 40, fat: 16 },
    steps: [
      'Bật chảo: Cho 1 thìa dầu mỏng, áp chảo bò và ớt chuông 3 phút lửa lớn, rưới xốt tiêu.',
      'Trút ra đĩa ăn kèm cơm gạo lứt và salad tươi.',
      'Khuấy chén súp rong biển đậu hũ với nước sôi. Xong bữa trong 10 phút!'
    ]
  },
  {
    id: 'suat-don-ga',
    name: 'Suất Độc Thân: Gà Đồi Nướng Sả & Cơm Dẻo ST25',
    p: 'ga',
    category: 'solo',
    time: 12,
    pricePerPerson: 69000,
    price: 69000,
    save: 4000,
    pop: 9,
    spicy: false,
    lowOil: true,
    components: {
      main: '200g Đùi gà đồi rút xương nướng sả mật ong',
      soup: 'Chén canh cải bắp nấm hương ấm bụng',
      veg: 'Rau củ luộc sơ chế sẵn (cà rốt, đậu que)',
      carb: 'Cơm thơm Gạo ST25 Sóc Trăng',
      dessert: 'Bơ sáp Đắk Lắk lát mỏng mật ong'
    },
    baseGrams: { meat: 200, veg: 120, soup: 120, carb: 120, dessert: 80 },
    tags: ['Suất 1 người', 'Nấu 1 chảo 12p', 'Ít dầu mỡ'],
    goals: ['balanced', 'easy_digest', 'low_carb'],
    exclusions: ['has_chicken'],
    nutrition: { kcal: 470, protein: 40, carb: 42, fat: 15 },
    steps: [
      'Áp chảo đùi gà đồi 6 phút đến khi da vàng giòn, rưới xốt sả mật ong 1 phút.',
      'Tận dụng chảo đảo nhanh rau củ trong 2 phút.',
      'Dùng kèm cơm ST25 dẻo thơm và tráng miệng bơ sáp.'
    ]
  },
  {
    id: 'suat-don-chay',
    name: 'Suất Độc Thân: Nấm Đậu Hũ Kho Tiêu & Cơm Lứt Hữu Cơ',
    p: 'chay',
    category: 'solo',
    time: 10,
    pricePerPerson: 62000,
    price: 62000,
    save: 3000,
    pop: 8,
    spicy: false,
    lowOil: true,
    isVegan: true,
    components: {
      main: 'Nấm đùi gà & Đậu hũ non chiên kho tiêu xanh',
      soup: 'Chén canh rong biển hạt sen thanh mát',
      veg: 'Cải thìa xào tỏi nhanh',
      carb: 'Cơm Gạo lứt hữu cơ ST25',
      dessert: 'Trái cây tươi theo mùa'
    },
    baseGrams: { meat: 0, veg: 220, soup: 120, carb: 120, dessert: 80 },
    tags: ['Suất 1 người', 'Thuần chay', 'Thanh lọc cơ thể'],
    goals: ['balanced', 'diabetic', 'easy_digest'],
    exclusions: ['vegan'],
    nutrition: { kcal: 390, protein: 24, carb: 50, fat: 10 },
    steps: [
      'Đảo nấm đùi gà và đậu hũ với sốt kho tiêu xanh trong chảo nhỏ 6 phút.',
      'Xào cải thìa 2 phút.',
      'Dùng nóng cùng cơm gạo lứt dẻo thơm.'
    ]
  }
];

export const byId = Object.fromEntries(DISHES.map((d) => [d.id, d]));

export const ADDONS = [
  { id: 'ad-trung', name: 'Vỉ 10 trứng gà đồi Đắk Lắk', unit: 'vỉ 10 quả', price: 38000, icon: '🥚', storage: 'chill' },
  { id: 'ad-rau', name: 'Combo rau củ Đà Lạt sạch thêm', unit: 'túi 500g', price: 35000, icon: '🥦', storage: 'chill' },
  { id: 'ad-bo', name: 'Bơ sáp Đắk Lắk loại 1', unit: 'túi 1kg', price: 55000, icon: '🥑', storage: 'chill' },
  { id: 'ad-chanh', name: 'Chanh dây tươi Tây Nguyên', unit: 'túi 1kg', price: 30000, icon: '🍋', storage: 'chill' }
];

export const addonById = Object.fromEntries(ADDONS.map((a) => [a.id, a]));

export const BG = {
  bo: '#F6E5DA',
  ga: '#FBEFD5',
  heo: '#F8E6DF',
  suon: '#F4E2D6',
  trung: '#FBF3D2',
  canh: '#E8F5E9',
  ca: '#E0F2F1',
  rau: '#EBF4EA',
  chay: '#EBF5EC'
};

export const MAXM = 10;

// ===================================================================
// CÁC GÓI NẠP FRESH CREDIT CHIẾT KHẤU CAO (V2 FINTECH SPEC)
// ===================================================================
export const FRESH_CREDIT_PACKAGES = [
  {
    id: 'pkg-family-2m',
    name: 'Gói Gia Đình Vui Vẻ',
    val: 2000000, // Giá trị thực nhận hiển thị to nhất
    pay: 1600000, // Số tiền thực trả
    bonus: 400000, // Tặng thẳng
    discountPercent: 20,
    popular: true,
    desc: 'Phù hợp gia đình 3–4 người ăn 2–3 tuần. Tặng thẳng 400.000đ trừ dần vào từng bữa ăn.'
  },
  {
    id: 'pkg-month-4m',
    name: 'Gói Cả Tháng Thảnh Thơi',
    val: 4000000,
    pay: 3000000,
    bonus: 1000000,
    discountPercent: 25,
    highlight: true,
    desc: 'Tiết kiệm cao nhất 25%. Khóa trọn giá nguyên liệu tươi Đắk Lắk suốt cả tháng.'
  },
  {
    id: 'pkg-trial-1m',
    name: 'Gói Trải Nghiệm Tân Thủ',
    val: 1000000,
    pay: 850000,
    bonus: 150000,
    discountPercent: 15,
    desc: 'Trải nghiệm tuần đầu cho người độc thân hoặc cặp đôi trẻ.'
  }
];

// ===================================================================
// DỮ LIỆU DEMO PERSONAS
// ===================================================================
export const DEMO_LAN_DATA = {
  user: {
    isLoggedIn: true,
    name: 'Chị Lan',
    phone: '0908 123 456',
    prepaidBalance: 850000,
    addresses: [
      {
        id: 'addr-1',
        label: 'Nhà riêng (Sunrise City)',
        name: 'Chị Lan',
        phone: '0908 123 456',
        district: 'Quận 7',
        detail: 'Căn hộ A12.04, Sunrise City, Nguyễn Hữu Thọ, P. Tân Hưng',
        isDefault: true
      },
      {
        id: 'addr-2',
        label: 'Công ty (Bitexco Q1)',
        name: 'Chị Lan',
        phone: '0908 123 456',
        district: 'Quận 1',
        detail: 'Tầng 8, Tòa nhà Bitexco, 2 Hải Triều, P. Bến Nghé',
        isDefault: false
      }
    ],
    pref: { ppl: 4, budget: 1200000, sauce: false, carb: false, f: [] },
    zaloRemind: true
  },
  onboardingProfile: {
    contact: '0908 123 456',
    region: 'hcm_inner',
    householdSize: 4,
    mealsPerWeek: 5,
    cuisinePreference: 'pure_viet',
    healthGoal: ['balanced'],
    exclusions: [],
    isCompleted: true
  },
  profileRewardClaimed: true,
  onboardingSkipped: false,
  activeOrder: {
    id: 'MV10298',
    createdAt: 'Hôm nay lúc 09:15',
    status: 'preparing',
    delayed: false,
    delayNotice: '',
    firstDrop: 'sun',
    deliveryTimeSlot: '06:30–08:30',
    address: 'Căn hộ A12.04, Sunrise City, Nguyễn Hữu Thọ, P. Tân Hưng, Quận 7',
    receiver: 'Chị Lan - 0908 123 456',
    note: 'Giao lễ tân nếu chưa xuống kịp',
    sauce: true,
    carb: false,
    items: [
      { id: 'mam-bo-luclac', qty: 1, name: 'Mâm Thăn Bò Lúc Lắc & Canh Chua Lá Giang', price: 79000, save: 5000 },
      { id: 'mam-ga-sa', qty: 1, name: 'Mâm Gà Đồi Nướng Sả Mật Ong & Canh Cải Bắp', price: 68000, save: 4000 },
      { id: 'mam-suon-toi', qty: 1, name: 'Mâm Sườn Non Heo Thảo Mộc & Canh Bí Đỏ', price: 72000, save: 4000 },
      { id: 'mam-ca-kho', qty: 1, name: 'Mâm Cá Bớp Kho Tộ Nước Dừa & Canh Chua', price: 76000, save: 5000 }
    ],
    addons: [{ id: 'ad-trung', qty: 1, name: 'Vỉ 10 trứng gà đồi Đắk Lắk', price: 38000 }],
    payMethod: 'prepaid',
    subTotal: 1218000,
    saveBatch: 72000,
    netFood: 1146000,
    shipFee: 0,
    qrDiscount: 0,
    total: 1146000,
    isSplit: true
  },
  historyOrders: [
    {
      id: 'MV08912',
      date: 'Chủ Nhật tuần trước (08/11)',
      total: 1145000,
      meals: 4,
      items: [
        { id: 'mam-bo-luclac', name: 'Mâm Thăn Bò Lúc Lắc & Canh Chua', qty: 1, rate: 'good' },
        { id: 'mam-ga-sa', name: 'Mâm Gà Đồi Nướng Sả Mật Ong', qty: 1, rate: null },
        { id: 'mam-suon-toi', name: 'Mâm Sườn Non Heo Rim Mắm Tỏi', qty: 1, rate: 'good' }
      ],
      addons: [{ id: 'ad-trung', name: 'Vỉ 10 trứng gà đồi Đắk Lắk', qty: 1 }]
    }
  ],
  ledger: [
    { date: '01/11 14:20', desc: 'Nạp Gói Gia Đình 2.000.000đ (Chỉ trả 1.600.000đ)', amount: 2000000, bal: 2000000 },
    { date: '01/11 15:00', desc: 'Thanh toán Subscription Tuần 1 #MV08405', amount: -618000, bal: 1382000 },
    { date: '08/11 19:40', desc: 'Thanh toán Subscription Tuần 2 #MV08912', amount: -745000, bal: 637000 },
    { date: '10/11 11:15', desc: 'Bảo hành chất lượng bữa ăn #MV08912', amount: 213000, bal: 850000 }
  ],
  notifications: [
    { id: 'n1', time: '10:00 hôm nay', title: 'Đơn #MV10298 đã chuyển nhà máy Đắk Lắk', desc: 'Đơn mâm cơm 4 người đã vào lịch sơ chế đêm nay.', unread: true },
    { id: 'n2', time: 'Hôm qua 19:30', title: 'Nhắc lịch đổi món trước 20:00', desc: 'Bạn còn 30 phút để đổi món cho chuyến xe lạnh sáng mai.', unread: false }
  ]
};

export const DEMO_MINH_DATA = {
  user: {
    isLoggedIn: true,
    name: 'Anh Minh',
    phone: '0912 999 888',
    prepaidBalance: 30000,
    addresses: [
      {
        id: 'addr-minh-1',
        label: 'Căn hộ (Vinhomes Central Park)',
        name: 'Anh Minh',
        phone: '0912 999 888',
        district: 'Bình Thạnh',
        detail: 'Căn hộ Landmark 4, Vinhomes Central Park, 208 Nguyễn Hữu Cảnh',
        isDefault: true
      }
    ],
    pref: { ppl: 2, budget: 1200000, sauce: false, carb: false, f: [] },
    zaloRemind: true
  },
  onboardingProfile: {
    contact: '',
    region: 'hcm_inner',
    householdSize: 2,
    mealsPerWeek: 5,
    cuisinePreference: 'pure_viet',
    healthGoal: ['balanced'],
    exclusions: [],
    isCompleted: false
  },
  profileRewardClaimed: false,
  onboardingSkipped: false,
  activeOrder: null,
  historyOrders: [],
  ledger: [
    {
      date: 'Hôm nay',
      desc: 'Quà tặng tân thủ Fresh Credit',
      amount: 30000,
      bal: 30000
    }
  ],
  notifications: [
    {
      id: 'notif-welcome',
      time: 'Vừa xong',
      title: 'Chào mừng Anh Minh đến với MOVA Fresh',
      desc: 'MOVA tặng bạn 30.000đ vào Fresh Credit cho đơn đầu tiên.',
      unread: true
    }
  ]
};

export const DEFAULT_STATE = () => ({
  mode: 'A', // 'A' | 'B'
  cartA: {},
  cartB: {},
  addonsA: {},
  addonsB: {},
  budget: 1200000,
  n: 2,
  f: [],
  pay: 'credit', // 'credit' (Fresh Credit) | 'vietqr_month' (VietQR 4 tuần) | 'card_recurring' (Thẻ tín dụng)
  sauce: false,
  carb: false,
  firstDrop: 'sun', // 'sun' | 'wed'
  msg: null,
  showNutrition: false,
  cutoffPassed: false,

  // Upsell Toggles (Bảng Nâng Cấp Dinh Dưỡng & Khẩu Vị V2)
  upsellProtein: false, // Tăng 30% Đạm (Protein+) (+35k/bữa)
  upsellLowCarb: false, // Giảm 50% Tinh bột / Đổi Gạo lứt & Khoai lang
  upsellWestern: false, // Thêm 2 bữa Đồ Tây (Steak / Bistro Áp chảo)

  // Delivery Preferences
  deliveryFrequency: '2drop', // '1drop' (Chủ Nhật) | '2drop' (Chủ Nhật & Thứ Tư)
  deliveryTimeSlot: '06:30–08:30', // '06:30–08:30' | '11:30–13:30' | '18:30–20:30'

  heroWizardDismissed: false,

  user: {
    isLoggedIn: false,
    name: 'Khách hàng',
    phone: '',
    prepaidBalance: 0,
    addresses: [],
    pref: { ppl: 2, budget: 1200000, sauce: false, carb: false, f: [] },
    zaloRemind: true
  },
  onboardingProfile: {
    contact: '',
    region: 'hcm_inner',
    householdSize: 2,
    mealsPerWeek: 5,
    cuisinePreference: 'pure_viet',
    healthGoal: ['balanced'],
    exclusions: [],
    isCompleted: false
  },
  profileRewardClaimed: false,
  onboardingSkipped: false,

  activeOrder: null,
  historyOrders: [],
  ledger: [],
  notifications: [
    {
      id: 'notif-init',
      time: 'Hôm nay',
      title: 'Chào mừng bạn đến với MOVA Fresh',
      desc: 'Mâm cơm gia đình 5 thành phần tươi sạch từ Đắk Lắk giao tận bếp TP.HCM.',
      unread: true
    }
  ]
});
