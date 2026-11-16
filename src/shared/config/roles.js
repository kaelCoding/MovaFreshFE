// Vai trò của app vận hành. PIN chỉ để demo, bản thật phải đặt sau đăng nhập.

export const ROLES = {
  workshop: { label: 'Xưởng Đắk Lắk', pin: '1111', home: '/xuong' },
  hub: { label: 'Kho phụ TP.HCM', pin: '2222', home: '/kho' },
  shipper: { label: 'Shipper', pin: null, home: '/giao-hang' }, // PIN theo từng shipper (BUSINESS.logistics.shippers); 3333 vẫn vào được
  supplier: { label: 'Nhà cung cấp', pin: null, home: '/nha-cung-cap' }, // PIN theo từng nhà cung cấp
  dispatch: { label: 'Điều phối logistics', pin: '5555', home: '/ke-hoach' },
  purchasing: { label: 'Mua hàng', pin: '6666', home: '/mua-hang' },
  accounting: { label: 'Kế toán', pin: '7777', home: '/tai-chinh' },
  admin: { label: 'Admin / Founder', pin: '9999', home: '/tong-quan' }
};

/** Nhóm quyền đọc dữ liệu thô của đơn hàng. */
export const ORDER_VIEW = {
  workshop: 'anonymous', // chỉ mã đơn, khu, khung giờ
  hub: 'recipient', // tên + địa chỉ + SĐT người nhận để in phiếu tuyến
  shipper: 'recipient_masked', // SĐT che một phần
  dispatch: 'anonymous',
  purchasing: 'anonymous',
  accounting: 'finance', // có customerId và tiền, không cần địa chỉ
  admin: 'full'
};
