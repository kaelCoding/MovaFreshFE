// Nguồn nguyên liệu xưởng nhận hàng (HTX, nông hộ, lò mổ). Tên là minh họa; bản thật do mua hàng / nguồn hàng quản lý (P2B).
// skus: các SKU nguồn này giao cho xưởng.

export const SOURCE_KINDS = {
  htx: 'Hợp tác xã',
  nong_ho: 'Nông hộ',
  lo_mo: 'Lò mổ'
};

export const SOURCES = {
  'SRC-HTX-01': { id: 'SRC-HTX-01', kind: 'htx', name: 'Hợp tác xã Nông nghiệp Thảo Mộc Krông Năng', location: 'Krông Năng, Đắk Lắk', region: 'Cao nguyên Đắk Lắk', skus: ['NL-BO-01', 'NL-BO-02'] },
  'SRC-HTX-02': { id: 'SRC-HTX-02', kind: 'htx', name: 'Hợp tác xã Lúa gạo hữu cơ Ea Kar', location: 'Ea Kar, Đắk Lắk', region: 'Cao nguyên Đắk Lắk', skus: ['NL-GAO-01', 'NL-BUN-01'] },
  'SRC-HTX-03': { id: 'SRC-HTX-03', kind: 'htx', name: 'Hợp tác xã Rau củ xứ lạnh Cư Jút', location: 'Cư Jút, Đắk Nông', region: 'Tây Nguyên', skus: ['NL-RAU-01', 'NL-RAU-02', 'NL-BI-05', 'NL-CACHUA-06'] },
  'SRC-NH-01': { id: 'SRC-NH-01', kind: 'nong_ho', name: "Nông hộ vườn trái cây Cư M'gar", location: "Cư M'gar, Đắk Lắk", region: 'Cao nguyên Đắk Lắk', skus: ['NL-TRAI-02', 'NL-TRAI-03'] },
  'SRC-NH-02': { id: 'SRC-NH-02', kind: 'nong_ho', name: 'Nông hộ khoai lang mật Krông Búk', location: 'Krông Búk, Đắk Lắk', region: 'Cao nguyên Đắk Lắk', skus: ['NL-KHOAI-01', 'NL-RAU-02', 'NL-BI-05'] },
  'SRC-NH-03': { id: 'SRC-NH-03', kind: 'nong_ho', name: 'Nông hộ nuôi bò cỏ Cư Kuin', location: 'Cư Kuin, Đắk Lắk', region: 'Cao nguyên Đắk Lắk', skus: ['NL-BO-01', 'NL-BO-02'] },
  'SRC-LM-01': { id: 'SRC-LM-01', kind: 'lo_mo', name: 'Lò mổ Buôn Ma Thuột', location: 'Buôn Ma Thuột, Đắk Lắk', region: 'Cao nguyên Đắk Lắk', skus: ['NL-BO-01', 'NL-BO-02', 'NL-HEO-02', 'NL-SUON-04'] },
  'SRC-LM-02': { id: 'SRC-LM-02', kind: 'lo_mo', name: "Lò mổ gia cầm Cư M'gar", location: "Cư M'gar, Đắk Lắk", region: 'Cao nguyên Đắk Lắk', skus: ['NL-GA-03'] }
};

export const sourcesForSku = (skuId) => Object.values(SOURCES).filter((s) => s.skus.includes(skuId));
