// Quy cách sơ chế và đóng túi theo SKU của xưởng Đắk Lắk (mẫu theo docs/factory-requests/README.md của platform).
// bagGrams: cỡ túi chuẩn của xưởng (gram), shelfDays: hạn dùng tính từ ngày đóng túi.
// Mọi con số ở đây là GIẢ ĐỊNH chờ quản đốc xác nhận; số chuẩn phải lấy từ xưởng.

import { SKUS } from './catalog';
import { BUSINESS } from '../config/business';

export const SKU_PACKING = {
  'NL-BO-01': { prep: 'Thái mỏng 2mm, hút chân không', bagGrams: 250, shelfDays: 5 },
  'NL-BO-02': { prep: 'Cắt steak dày 2,5cm, hút chân không', bagGrams: 260, shelfDays: 5 },
  'NL-HEO-02': { prep: 'Thái vuông kho tàu 3x3cm', bagGrams: 300, shelfDays: 60 },
  'NL-GA-03': { prep: 'Cắt con thoi áp chảo', bagGrams: 200, shelfDays: 4 },
  'NL-SUON-04': { prep: 'Chặt khúc 4cm', bagGrams: 400, shelfDays: 60 },
  'NL-RAU-01': { prep: 'Rửa ozone, cắt nhánh vừa ăn', bagGrams: 200, shelfDays: 3 },
  'NL-RAU-02': { prep: 'Rửa sạch, cắt khúc 4cm', bagGrams: 200, shelfDays: 3 },
  'NL-BI-05': { prep: 'Gọt vỏ, cắt miếng 3cm', bagGrams: 300, shelfDays: 4 },
  'NL-CACHUA-06': { prep: 'Rửa sạch, cắt múi', bagGrams: 250, shelfDays: 4 },
  'NL-GAO-01': { prep: 'Đóng túi hút chân không', bagGrams: 500, shelfDays: 180 },
  'NL-BUN-01': { prep: 'Đóng túi', bagGrams: 350, shelfDays: 180 },
  'NL-KHOAI-01': { prep: 'Rửa sạch, cắt khúc', bagGrams: 600, shelfDays: 10 },
  'NL-TRAI-01': { prep: 'Chọn quả chín đều, đóng khay', bagGrams: 300, shelfDays: 4 },
  'NL-TRAI-02': { prep: 'Chuối tiêu chín cây, bó nải nhỏ', bagGrams: 480, shelfDays: 5 },
  'NL-BANHMI-01': { prep: 'Đóng túi', bagGrams: 240, shelfDays: 3 },
  'NL-MI-01': { prep: 'Đóng túi', bagGrams: 320, shelfDays: 180 },
  // Hải sản do kho phụ TP.HCM ghép, không đóng ở Đắk Lắk
  'HS-CA-01': { prep: 'Làm sạch mang vây, túi chân không', bagGrams: 240, shelfDays: 2 },
  'HS-TOM-02': { prep: 'Bỏ chỉ lưng, cấp đông mềm', bagGrams: 300, shelfDays: 30 }
};

/** Cỡ túi, quy cách và hạn dùng của một SKU (có mặc định theo nhóm nhiệt nếu chưa khai báo). */
export function packingOf(skuId) {
  const p = SKU_PACKING[skuId] || {};
  const sku = SKUS[skuId];
  const f = BUSINESS.factory;
  return {
    prep: p.prep || '',
    bagGrams: p.bagGrams || f.defaultBagGrams,
    shelfDays: p.shelfDays || f.shelfDaysByTemp[(sku && sku.temp) || 'chill']
  };
}
