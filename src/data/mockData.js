// Dữ liệu demo tạm cho màn tài khoản cũ (/account). P1B viết lại màn này theo gói đăng ký và dữ liệu dùng chung.

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
    pref: { ppl: 4, sauce: false, carb: false, f: [] },
    zaloRemind: true
  },
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
      { id: 'bo-luclac', qty: 4, name: 'Thăn bò Đắk Lắk lúc lắc tiêu xanh', price: 79000, save: 5000 },
      { id: 'ga-sa', qty: 4, name: 'Gà đồi nướng sả mật ong', price: 52000, save: 4000 },
      { id: 'suon-toi', qty: 4, name: 'Sườn non heo rim mắm tỏi', price: 58000, save: 4000 },
      { id: 'bo-raucu', qty: 4, name: 'Bò xào rau củ Đà Lạt', price: 69000, save: 5000 }
    ],
    addons: [{ id: 'ad-trung', qty: 1, name: 'Vỉ 10 trứng gà đồi Đắk Lắk', price: 38000 }],
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
    { date: '01/11 14:20', desc: 'Đăng ký Gói Đi Chợ 1.000.000đ (Tặng 50.000đ)', amount: 1050000, bal: 1050000 },
    { date: '01/11 15:00', desc: 'Thanh toán đơn hàng #MV08405', amount: -618000, bal: 432000 },
    { date: '06/11 09:30', desc: 'Đăng ký Gói Đi Chợ 1.000.000đ (Tặng 50.000đ)', amount: 1050000, bal: 1482000 },
    { date: '08/11 19:40', desc: 'Thanh toán đơn hàng #MV08912', amount: -745000, bal: 737000 },
    { date: '10/11 11:15', desc: 'Bảo hành bữa ăn #MV08912 (Rau dập xe lạnh)', amount: 113000, bal: 850000 }
  ],
  notifications: [
    { id: 'n1', time: '10:00 hôm nay', title: 'Đơn #MV10298 đã chuyển nhà máy Đắk Lắk', desc: 'Đơn của bạn đã được ghi nhận vào lịch sơ chế đêm nay.', unread: true },
    { id: 'n2', time: 'Hôm qua 19:30', title: 'Zalo OA: Nhắc lịch chốt đơn trước 20:00', desc: 'Xe lạnh chuẩn bị đóng chuyến đêm về TP.HCM.', unread: false },
    { id: 'n3', time: '10/11 11:15', title: 'Đã hoàn 113.000đ vào Gói Đi Chợ', desc: 'Hoàn tiền bảo đảm độ tươi cho sự cố rau dập đơn #MV08912.', unread: false }
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
    pref: { ppl: 4, sauce: false, carb: false, f: [] },
    zaloRemind: true
  },
  activeOrder: null,
  historyOrders: [],
  ledger: [
    {
      date: 'Hôm nay',
      desc: 'Quà tặng thành viên mới MOVA Fresh',
      amount: 30000,
      bal: 30000
    }
  ],
  notifications: [
    {
      id: 'notif-welcome',
      time: 'Vừa xong',
      title: 'Chào mừng Anh Minh đến với MOVA Fresh',
      desc: 'MOVA tặng bạn 30.000đ vào Gói Đi Chợ cho đơn đầu tiên.',
      unread: true
    }
  ]
};

export const DEFAULT_STATE = () => ({
  cutoffPassed: false, // false: trước giờ chốt sổ, true: đã qua giờ chốt sổ (mô phỏng cho màn Đơn của tôi cũ)

  user: {
    isLoggedIn: false,
    name: 'Khách hàng',
    phone: '',
    prepaidBalance: 0,
    addresses: [],
    pref: { ppl: 4, sauce: false, carb: false, f: [] },
    zaloRemind: true
  },

  activeOrder: null,
  historyOrders: [],
  ledger: [],
  notifications: [
    {
      id: 'notif-init',
      time: 'Hôm nay',
      title: 'Chào mừng bạn đến với MOVA Fresh',
      desc: 'Nguyên liệu sơ chế sẵn từ Đắk Lắk, đóng thùng xe lạnh giao tận cửa TP.HCM.',
      unread: true
    }
  ]
});
