export const DISHES = [
  {
    id: 'bo-luclac',
    name: 'Thăn bò Đắk Lắk lúc lắc tiêu xanh',
    p: 'bo',
    meat: [150, 'g thăn bò Đắk Lắk'],
    veg: [120, 'g ớt chuông, hành tây Đà Lạt'],
    time: 15,
    price: 79000,
    save: 5000,
    pop: 10,
    spicy: false,
    lowOil: false,
    storage: 'chill',
    tags: ['Ít đường'],
    nutrition: { kcal: 420, protein: 34, carb: 18, fat: 24 },
    steps: [
      'Phi thơm túi tỏi băm với 1 thìa dầu, lửa lớn.',
      'Cho bò vào áp chảo 2 phút mỗi mặt, thêm ớt chuông và hành tây đảo 2 phút.',
      'Rưới gói sốt tiêu xanh, đảo 30 giây rồi tắt bếp.'
    ]
  },
  {
    id: 'ga-sa',
    name: 'Gà đồi nướng sả mật ong',
    p: 'ga',
    meat: [180, 'g đùi gà đồi rút xương'],
    veg: [100, 'g dưa leo, cà chua'],
    time: 15,
    price: 52000,
    save: 4000,
    pop: 9,
    spicy: false,
    lowOil: true,
    storage: 'chill',
    tags: ['Ít dầu mỡ'],
    nutrition: { kcal: 380, protein: 32, carb: 14, fat: 22 },
    steps: [
      'Đặt chảo chống dính, cho gà mặt da xuống, không cần dầu.',
      'Áp chảo lửa vừa 6 phút mỗi mặt đến khi da vàng giòn.',
      'Thêm gói sốt sả mật ong, rim 1 phút cho bóng rồi cắt miếng.'
    ]
  },
  {
    id: 'heo-gung',
    name: 'Ba chỉ heo thảo mộc ram gừng',
    p: 'heo',
    meat: [150, 'g ba chỉ heo thảo mộc'],
    veg: [120, 'g cải ngọt Đắk Lắk'],
    time: 15,
    price: 49000,
    save: 4000,
    pop: 9,
    spicy: false,
    lowOil: false,
    storage: 'freeze',
    tags: ['Vị đậm đà'],
    nutrition: { kcal: 460, protein: 26, carb: 12, fat: 34 },
    steps: [
      'Cho ba chỉ vào chảo nóng, để thịt tự ra mỡ trong 5 phút.',
      'Thêm túi gừng, hành tím băm, đảo thơm rồi đổ gói nước ram, rim 5 phút.',
      'Đẩy thịt sang một bên, xào nhanh cải ngọt 2 phút trong cùng chảo.'
    ]
  },
  {
    id: 'bo-lalot',
    name: 'Bò cuốn lá lốt áp chảo',
    p: 'bo',
    meat: [140, 'g bò xay Đắk Lắk đã cuốn sẵn'],
    veg: [80, 'g rau sống, dưa leo'],
    time: 15,
    price: 65000,
    save: 0,
    pop: 7,
    spicy: false,
    lowOil: true,
    storage: 'chill',
    tags: ['Ít dầu mỡ'],
    nutrition: { kcal: 350, protein: 28, carb: 10, fat: 22 },
    steps: [
      'Quét một lớp dầu mỏng lên chảo chống dính.',
      'Xếp các cuốn bò, áp chảo lửa vừa 8 phút, lật đều tay.',
      'Pha gói mắm nêm đóng rời, ăn kèm rau sống.'
    ]
  },
  {
    id: 'suon-toi',
    name: 'Sườn non heo rim mắm tỏi',
    p: 'suon',
    meat: [200, 'g sườn non heo thảo mộc'],
    veg: [100, 'g dưa leo, cà chua'],
    time: 15,
    price: 58000,
    save: 4000,
    pop: 8,
    spicy: false,
    lowOil: false,
    storage: 'freeze',
    tags: ['Vị đậm đà'],
    nutrition: { kcal: 490, protein: 30, carb: 16, fat: 34 },
    steps: [
      'Chiên sườn với ít dầu 6 phút đến khi vàng các mặt.',
      'Thêm túi tỏi băm, đảo thơm, đổ gói mắm rim và 3 thìa nước.',
      'Rim lửa nhỏ 5 phút đến khi nước sệt bám đều sườn.'
    ]
  },
  {
    id: 'ga-saot',
    name: 'Gà đồi xào sả ớt',
    p: 'ga',
    meat: [170, 'g đùi gà đồi cắt miếng'],
    veg: [80, 'g sả, ớt, hành tây'],
    time: 12,
    price: 48000,
    save: 0,
    pop: 7,
    spicy: true,
    lowOil: false,
    storage: 'chill',
    tags: ['Cay nhẹ'],
    nutrition: { kcal: 340, protein: 31, carb: 12, fat: 18 },
    steps: [
      'Phi thơm túi sả ớt băm với 1 thìa dầu.',
      'Cho gà vào xào lửa lớn 7 phút đến khi săn.',
      'Thêm hành tây và gói sốt, đảo 2 phút.'
    ]
  },
  {
    id: 'trung-nam',
    name: 'Trứng gà đồi chưng nấm đông cô',
    p: 'trung',
    meat: [2, ' quả trứng gà đồi'],
    veg: [50, 'g nấm đông cô, hành lá'],
    time: 12,
    price: 38000,
    save: 0,
    pop: 6,
    spicy: false,
    lowOil: true,
    storage: 'chill',
    tags: ['Vị thanh nhẹ', 'Ít dầu mỡ'],
    nutrition: { kcal: 220, protein: 16, carb: 8, fat: 14 },
    steps: [
      'Đánh tan trứng với gói nước dùng nấm và 3 thìa nước.',
      'Cho nấm vào bát, đổ trứng lên, đặt bát vào chảo có nước sôi, đậy nắp.',
      'Hấp lửa nhỏ 10 phút, rắc hành lá.'
    ]
  },
  {
    id: 'bo-raucu',
    name: 'Bò xào rau củ Đà Lạt',
    p: 'bo',
    meat: [130, 'g thăn vai bò Đắk Lắk'],
    veg: [180, 'g súp lơ, cà rốt, đậu Hà Lan'],
    time: 12,
    price: 69000,
    save: 5000,
    pop: 8,
    spicy: false,
    lowOil: true,
    storage: 'chill',
    tags: ['Ít dầu mỡ', 'Vị thanh nhẹ'],
    nutrition: { kcal: 310, protein: 29, carb: 20, fat: 13 },
    steps: [
      'Xào rau củ với 3 thìa nước 3 phút cho chín tới, trút ra.',
      'Áp chảo bò lửa lớn 2 phút.',
      'Cho rau củ vào lại, thêm gói sốt, đảo 1 phút.'
    ]
  },
  {
    id: 'heo-cai',
    name: 'Heo nạc vai xào cải ngồng',
    p: 'heo',
    meat: [130, 'g nạc vai heo thảo mộc'],
    veg: [200, 'g cải ngồng Đà Lạt'],
    time: 12,
    price: 45000,
    save: 3000,
    pop: 6,
    spicy: false,
    lowOil: true,
    storage: 'freeze',
    tags: ['Ít dầu mỡ'],
    nutrition: { kcal: 320, protein: 27, carb: 14, fat: 17 },
    steps: [
      'Phi tỏi với ít dầu, cho thịt vào xào 4 phút.',
      'Thêm cải ngồng và 2 thìa nước, đảo lửa lớn 3 phút.',
      'Nêm gói sốt, đảo đều rồi tắt bếp.'
    ]
  },
  {
    id: 'ga-xe',
    name: 'Gà luộc xé trộn bắp cải rau răm',
    p: 'ga',
    meat: [160, 'g ức gà đồi'],
    veg: [150, 'g bắp cải tím, rau răm'],
    time: 15,
    price: 44000,
    save: 3000,
    pop: 6,
    spicy: false,
    lowOil: true,
    storage: 'chill',
    tags: ['Ít dầu mỡ', 'Ít đường'],
    nutrition: { kcal: 260, protein: 36, carb: 9, fat: 8 },
    steps: [
      'Luộc ức gà trong chảo nước có gừng 12 phút, để nguội.',
      'Xé nhỏ gà, trộn với bắp cải và rau răm.',
      'Rưới gói nước trộn chanh tỏi.'
    ]
  },
  {
    id: 'bo-tieu',
    name: 'Bắp bò áp chảo sốt tiêu đen',
    p: 'bo',
    meat: [150, 'g bắp bò Đắk Lắk thái lát'],
    veg: [120, 'g khoai tây, đậu que'],
    time: 15,
    price: 72000,
    save: 0,
    pop: 7,
    spicy: true,
    lowOil: false,
    storage: 'chill',
    tags: ['Cay nhẹ'],
    nutrition: { kcal: 390, protein: 33, carb: 26, fat: 17 },
    steps: [
      'Áp chảo khoai tây và đậu que 6 phút, trút ra.',
      'Áp chảo bò lửa lớn 2 phút.',
      'Đổ gói sốt tiêu đen, cho rau củ vào đảo 1 phút.'
    ]
  },
  {
    id: 'heo-dua',
    name: 'Thịt heo rim nước dừa',
    p: 'heo',
    meat: [150, 'g nạc dăm heo thảo mộc'],
    veg: [1, ' quả trứng gà đồi luộc, dưa chua'],
    time: 15,
    price: 47000,
    save: 3000,
    pop: 7,
    spicy: false,
    lowOil: false,
    storage: 'freeze',
    tags: ['Vị đậm đà'],
    nutrition: { kcal: 470, protein: 32, carb: 18, fat: 30 },
    steps: [
      'Đảo thịt với túi hành tỏi đến khi săn, 4 phút.',
      'Đổ gói nước dừa và nước màu, rim lửa vừa 8 phút.',
      'Thêm trứng luộc, rim thêm 2 phút.'
    ]
  },
  // MÓN MỚI: Món Canh, Món Rau & Món Thuần Chay
  {
    id: 'canh-gala-giang',
    name: 'Canh chua gà lá giang Tây Nguyên',
    p: 'canh',
    meat: [150, 'g gà đồi Đắk Lắk chặt miếng'],
    veg: [100, 'g lá giang tươi Tây Nguyên, ớt sừng, ngò'],
    time: 12,
    price: 42000,
    save: 3000,
    pop: 8,
    spicy: false,
    lowOil: true,
    storage: 'chill',
    tags: ['Canh truyền thống', 'Vị thanh nhẹ'],
    nutrition: { kcal: 280, protein: 26, carb: 14, fat: 12 },
    steps: [
      'Đun sôi 600ml nước trong nồi, cho thịt gà và gói cốt canh thảo mộc vào nấu 7 phút.',
      'Vò nhẹ lá giang cho vào nồi, đun thêm 3 phút để vị chua thanh tự nhiên tiết ra.',
      'Rắc ớt sừng cắt lát và rau ngò tươi, tắt bếp dùng nóng.'
    ]
  },
  {
    id: 'canh-bido-thitbam',
    name: 'Canh bí đỏ hạt sen hầm thịt bằm Đắk Lắk',
    p: 'canh',
    meat: [100, 'g nạc heo thảo mộc bằm sẵn'],
    veg: [180, 'g bí đỏ Đắk Lắk gọt sẵn, hạt sen tươi'],
    time: 15,
    price: 38000,
    save: 3000,
    pop: 7,
    spicy: false,
    lowOil: true,
    storage: 'chill',
    tags: ['Canh bổ dưỡng', 'Ít dầu mỡ'],
    nutrition: { kcal: 295, protein: 22, carb: 32, fat: 9 },
    steps: [
      'Đun sôi 600ml nước, cho thịt bằm và gói cốt hầm xương vào khuấy đều 3 phút.',
      'Thêm hạt sen và bí đỏ vào hầm lửa vừa 10 phút đến khi bí chín bùi mềm.',
      'Nêm gói hành ngò băm tươi, khuấy đều rồi tắt bếp.'
    ]
  },
  {
    id: 'cai-thia-namdongco',
    name: 'Cải thìa Đà Lạt xào nấm đông cô sốt dầu hào',
    p: 'rau',
    meat: [0, 'g (Thuần thực vật)'],
    veg: [220, 'g cải thìa Đà Lạt, nấm đông cô tươi'],
    time: 10,
    price: 35000,
    save: 2000,
    pop: 8,
    spicy: false,
    lowOil: true,
    storage: 'chill',
    tags: ['Món rau', 'Thuần chay / Rằm - Mùng 1', 'Ít dầu mỡ'],
    isVegan: true,
    nutrition: { kcal: 185, protein: 8, carb: 24, fat: 6 },
    steps: [
      'Chần sơ cải thìa trong nước sôi 1 phút rồi vớt ra để giữ độ giòn ngọt.',
      'Áp chảo nấm đông cô với túi tỏi băm trên chảo nóng trong 3 phút.',
      'Cho cải thìa vào lại cùng gói sốt dầu hào chay, đảo nhanh 1 phút trên lửa lớn.'
    ]
  },
  {
    id: 'nam-duiga-kho',
    name: 'Nấm đùi gà kho tiêu xanh & Đậu hũ non Đà Lạt',
    p: 'chay',
    meat: [0, 'g (Thuần thực vật)'],
    veg: [200, 'g nấm đùi gà, đậu hũ non chiên, tiêu xanh'],
    time: 12,
    price: 44000,
    save: 4000,
    pop: 8,
    spicy: false,
    lowOil: true,
    storage: 'chill',
    tags: ['Thuần chay / Rằm - Mùng 1', 'Ít dầu mỡ'],
    isVegan: true,
    nutrition: { kcal: 260, protein: 16, carb: 28, fat: 10 },
    steps: [
      'Xếp nấm đùi gà và đậu hũ non chiên sẵn vào chảo hoặc nồi nhỏ.',
      'Rưới gói sốt kho tiêu xanh thảo mộc và 4 thìa nước lọc.',
      'Đun lửa nhỏ liu riu 8 phút cho sốt ngấm keo bóng bám đều nấm và đậu hũ.'
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
  rau: '#EBF4EA',
  chay: '#EBF5EC'
};

export const MAXM = 10;

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
      { id: 'bo-luclac', qty: 4, name: 'Thăn bò Đắk Lắk lúc lắc tiêu xanh', price: 79000, save: 5000, storage: 'chill' },
      { id: 'ga-sa', qty: 4, name: 'Gà đồi nướng sả mật ong', price: 52000, save: 4000, storage: 'chill' },
      { id: 'suon-toi', qty: 4, name: 'Sườn non heo rim mắm tỏi', price: 58000, save: 4000, storage: 'freeze' },
      { id: 'bo-raucu', qty: 4, name: 'Bò xào rau củ Đà Lạt', price: 69000, save: 5000, storage: 'chill' }
    ],
    addons: [{ id: 'ad-trung', qty: 1, name: 'Vỉ 10 trứng gà đồi Đắk Lắk', price: 38000, storage: 'chill' }],
    payMethod: 'prepaid',
    subTotal: 1070000,
    saveBatch: 72000,
    netFood: 998000,
    shipFee: 0,
    qrDiscount: 0,
    total: 998000,
    isSplit: true
  },
  historyOrders: [
    {
      id: 'MV08912',
      date: 'Chủ Nhật tuần trước (08/11)',
      total: 745000,
      meals: 4,
      items: [
        { id: 'bo-luclac', name: 'Thăn bò Đắk Lắk lúc lắc tiêu xanh', qty: 4, rate: 'good' },
        { id: 'heo-gung', name: 'Ba chỉ heo thảo mộc ram gừng', qty: 4, rate: 'salty' },
        { id: 'ga-sa', name: 'Gà đồi nướng sả mật ong', qty: 4, rate: null },
        { id: 'trung-nam', name: 'Trứng gà đồi chưng nấm đông cô', qty: 4, rate: null }
      ],
      addons: [{ id: 'ad-trung', name: 'Vỉ 10 trứng gà đồi Đắk Lắk', qty: 1 }]
    },
    {
      id: 'MV08405',
      date: 'Thứ Tư 2 tuần trước (01/11)',
      total: 618000,
      meals: 3,
      items: [
        { id: 'suon-toi', name: 'Sườn non heo rim mắm tỏi', qty: 4, rate: 'good' },
        { id: 'bo-lalot', name: 'Bò cuốn lá lốt áp chảo', qty: 4, rate: 'good' },
        { id: 'ga-xe', name: 'Gà luộc xé trộn bắp cải rau răm', qty: 4, rate: null }
      ],
      addons: [{ id: 'ad-rau', name: 'Combo rau củ Đà Lạt sạch thêm', qty: 1 }]
    }
  ],
  ledger: [
    { date: '01/11 14:20', desc: 'Đăng ký Fresh Credit 1.000.000đ (Tặng 50.000đ)', amount: 1050000, bal: 1050000 },
    { date: '01/11 15:00', desc: 'Thanh toán đơn hàng #MV08405', amount: -618000, bal: 432000 },
    { date: '06/11 09:30', desc: 'Đăng ký Fresh Credit 1.000.000đ (Tặng 50.000đ)', amount: 1050000, bal: 1482000 },
    { date: '08/11 19:40', desc: 'Thanh toán đơn hàng #MV08912', amount: -745000, bal: 737000 },
    { date: '10/11 11:15', desc: 'Bảo hành bữa ăn #MV08912 (Rau dập xe lạnh)', amount: 113000, bal: 850000 }
  ],
  notifications: [
    { id: 'n1', time: '10:00 hôm nay', title: 'Đơn #MV10298 đã chuyển nhà máy Đắk Lắk', desc: 'Đơn của bạn đã được ghi nhận vào lịch sơ chế đêm nay.', unread: true },
    { id: 'n2', time: 'Hôm qua 19:30', title: 'Zalo OA: Nhắc lịch chốt đơn trước 20:00', desc: 'Xe lạnh chuẩn bị đóng chuyến đêm về TP.HCM.', unread: false },
    { id: 'n3', time: '10/11 11:15', title: 'Đã hoàn 113.000đ vào Fresh Credit', desc: 'Hoàn tiền bảo đảm độ tươi cho sự cố rau dập đơn #MV08912.', unread: false }
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
    pref: { ppl: 1, budget: 1200000, sauce: false, carb: false, f: [] },
    zaloRemind: true
  },
  onboardingProfile: {
    contact: '0912 999 888',
    region: 'hcm_inner',
    householdSize: 1,
    mealsPerWeek: 5,
    cuisinePreference: 'viet_fusion',
    healthGoal: ['muscle'],
    exclusions: ['no_spicy'],
    isCompleted: true
  },
  profileRewardClaimed: true,
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
  pay: 'qr', // 'qr' | 'prepaid'
  sauce: false,
  carb: false,
  firstDrop: 'sun', // 'sun' | 'wed'
  msg: null,
  showNutrition: false,

  cutoffPassed: false, // false: trước 20h, true: đã qua 20h

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
      desc: 'Nguyên liệu tươi sơ chế sẵn Đắk Lắk đóng thùng xe lạnh giao tận cửa TP.HCM.',
      unread: true
    }
  ]
});
