// Bản đồ phường GIẢ để lập tuyến chặng cuối (P2C). Đơn hàng chỉ có địa chỉ chữ "số nhà đường X, Quận Y", chưa có phường
// hay tọa độ. Bản thật sẽ lấy phường / tọa độ từ dịch vụ bản đồ hoặc engine tối ưu tuyến của Hiếu; hàm ở đây chỉ cần cho
// ra một "phường" ổn định (cùng đường, cùng dãy số nhà thì cùng phường) để thuật toán gom theo khu → phường chạy được.
// Tên phường là tên minh họa, không phải ranh giới hành chính chính xác.

export const WARDS = {
  'Quận 1': ['Bến Nghé', 'Bến Thành', 'Đa Kao'],
  'Quận 3': ['Võ Thị Sáu', 'Phường 9', 'Phường 12'],
  'Phú Nhuận': ['Phường 2', 'Phường 7', 'Phường 11'],
  'Quận 7': ['Tân Phú', 'Tân Hưng', 'Phú Mỹ'],
  'Nhà Bè': ['Phú Xuân', 'Phước Kiển', 'Hiệp Phước'],
  'Bình Thạnh': ['Phường 14', 'Phường 22', 'Phường 25'],
  'Thủ Đức': ['Linh Chiểu', 'Bình Thọ', 'Hiệp Bình Chánh'],
  'TP. Thủ Đức': ['Linh Chiểu', 'Bình Thọ', 'Hiệp Bình Chánh'],
  'Quận 10': ['Phường 1', 'Phường 6', 'Phường 12'],
  'Tân Bình': ['Phường 4', 'Phường 8', 'Phường 13'],
  'Tân Phú': ['Hòa Thạnh', 'Tân Quý', 'Phú Thọ Hòa'],
  'Gò Vấp': ['Phường 3', 'Phường 10', 'Phường 15'],
  'Quận 12': ['Thạnh Lộc', 'Tân Chánh Hiệp', 'Hiệp Thành'],
  'Dĩ An': ['Dĩ An', 'Tân Bình', 'Đông Hòa'],
  'Thuận An': ['Lái Thiêu', 'An Phú', 'Bình Chuẩn'],
  'Biên Hòa': ['Trung Dũng', 'Tân Hiệp', 'Long Bình']
};

const hashStr = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Tách "10 đường Lê Lợi, Quận 1" thành số nhà, tên đường và quận (không đoán được thì để trống). */
export function parseAddress(address = '') {
  const parts = String(address).split(',').map((x) => x.trim());
  const first = parts[0] || '';
  const m = first.match(/^(\d+)[A-Za-z]?\s*(?:đường\s+)?(.*)$/i);
  const no = m ? parseInt(m[1], 10) : 0;
  const street = (m ? m[2] : first).trim();
  const district = parts.length > 1 ? parts[parts.length - 1] : '';
  return { no, street, district };
}

/**
 * Phường giả của một địa chỉ. `district` ưu tiên giá trị của hồ sơ khách (đã biết), không có thì tách từ địa chỉ.
 * Trả `{ district, ward, wardIndex, street, no }`; `wardIndex` là thứ tự phường trong quận để xếp tuyến.
 */
export function geocode(address, district = '') {
  const p = parseAddress(address);
  const d = WARDS[district] ? district : WARDS[p.district] ? p.district : district || p.district;
  const list = WARDS[d] || ['Phường 1'];
  const idx = hashStr(`${p.street}|${Math.floor(p.no / 40)}`) % list.length;
  return { district: d, ward: list[idx], wardIndex: idx, street: p.street, no: p.no };
}
