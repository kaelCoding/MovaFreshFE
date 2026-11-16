import { BUSINESS } from '../config/business';
import { SKUS, SUPPLIERS } from './catalog';
import { SOURCES } from './sources';
import { addDays, atDay, dayKey } from '../utils/time';
import {
  approvePo, confirmPo, ensureProcurement, matchPo, payPo, priceResolver, receivePo, recordDirectPurchase, sendForecast, sendPo, submitInvoice
} from '../domain/procurementOps';

/**
 * Dữ liệu mẫu của mua hàng / kho phụ (P2B), tất cả là dữ liệu minh họa để các màn có thứ để xem:
 * hồ sơ và giấy chứng nhận (mã số thuế, CCCD, số tài khoản là số GIẢ), bảng giá có lịch sử, tồn kho có lô và hạn dùng,
 * vài PO cũ đã nhận / có hóa đơn (một cái lệch số lượng và giá) / đã trả, một bảng kê thu mua.
 *
 * `supplementProcurement` chạy khi dựng hạt giống và khi mở bộ nhớ cũ chưa có `db.procurement`
 * (không đổi DB_VERSION nên dữ liệu demo cũ của người dùng không bị mất).
 */

const PROFILES = [
  { id: 'S-FACTORY', kind: 'factory', taxId: '6001234567', address: 'Lô A3, KCN Hòa Phú, Buôn Ma Thuột, Đắk Lắk', bank: ['Vietcombank CN Đắk Lắk', '0071001234567', 'CONG TY MOVA DAK LAK'], phone: '0262388123' },
  { id: 'S-SEAFOOD', kind: 'seafood', taxId: '3501987654', address: 'Chợ đầu mối hải sản, TP. Vũng Tàu', bank: ['Agribank CN Vũng Tàu', '5501205123456', 'DNTN HAI SAN BIEN DONG'], phone: '0254385222' },
  { id: 'S-TRUCK', kind: 'long_haul', taxId: '6002345678', address: '45 Nguyễn Tất Thành, Buôn Ma Thuột, Đắk Lắk', bank: ['Techcombank', '19036789012345', 'CONG TY TNHH VAN TAI LANH TAY NGUYEN'], phone: '0262391777' },
  { id: 'S-LASTMILE', kind: 'last_mile', taxId: '0312456789', address: '12 Lê Văn Việt, TP. Thủ Đức, TP. Hồ Chí Minh', bank: ['MB Bank', '0123456789012', 'CONG TY TNHH GIAO NHAN NHANH'], phone: '0903456789' },
  { id: 'S-PACK', kind: 'packaging', taxId: '3702345678', address: 'KCN Sóng Thần 2, Dĩ An, Bình Dương', bank: ['BIDV CN Bình Dương', '31510001234567', 'CONG TY CP BAO BI CACH NHIET'], phone: '0274373999' },
  { id: 'SRC-HTX-01', kind: 'htx', taxId: '6003456789', address: 'Xã Ea Tam, Krông Năng, Đắk Lắk', bank: ['Agribank CN Krông Năng', '6004205123456', 'HTX NONG NGHIEP THAO MOC'], phone: '0262388456', term: 15 },
  { id: 'SRC-HTX-02', kind: 'htx', taxId: '6004567890', address: 'Thị trấn Ea Kar, Ea Kar, Đắk Lắk', bank: ['Agribank CN Ea Kar', '6005205654321', 'HTX LUA GAO HUU CO EA KAR'], phone: '0262388789', term: 15 },
  { id: 'SRC-HTX-03', kind: 'htx', taxId: '6005678901', address: 'Xã Ea Pô, Cư Jút, Đắk Nông', bank: ['Agribank CN Cư Jút', '6006205777888', 'HTX RAU CU XU LANH CU JUT'], phone: '0261388321', term: 15 },
  { id: 'SRC-NH-01', kind: 'nong_ho', cccd: '066085012345', address: "Xã Ea Kiết, Cư M'gar, Đắk Lắk", bank: ['Agribank CN Cư M\'gar', '6007205111222', 'NGUYEN VAN BO'], phone: '0912345601', term: 0 },
  { id: 'SRC-NH-02', kind: 'nong_ho', cccd: '066087054321', address: 'Xã Pơng Drang, Krông Búk, Đắk Lắk', bank: ['Agribank CN Krông Búk', '6008205333444', 'TRAN THI KHOAI'], phone: '0912345602', term: 0 },
  { id: 'SRC-NH-03', kind: 'nong_ho', cccd: '066090067890', address: 'Xã Cư Ni, Cư Kuin, Đắk Lắk', bank: ['Agribank CN Cư Kuin', '6009205555666', 'LE VAN CO'], phone: '0912345603', term: 0 },
  { id: 'SRC-LM-01', kind: 'lo_mo', taxId: '6006789012', address: 'Đường Hà Huy Tập, Buôn Ma Thuột, Đắk Lắk', bank: ['Vietinbank CN Đắk Lắk', '10201234567890', 'CONG TY LO MO BUON MA THUOT'], phone: '0262385999', term: 7 },
  { id: 'SRC-LM-02', kind: 'lo_mo', taxId: '6007890123', address: "Thị trấn Quảng Phú, Cư M'gar, Đắk Lắk", bank: ['Vietinbank CN Cư M\'gar', '10209876543210', 'CO SO GIET MO GIA CAM CU MGAR'], phone: '0262386111', term: 7 }
];

// Giấy chứng nhận: số ngày còn lại tính từ hôm nay (âm = đã hết hạn). Giữ vài cái sắp hết hạn để thấy cảnh báo.
const CERTS = {
  'S-FACTORY': [['attp', 'ATTP-DL-2024-0156', 'Chi cục ATVSTP Đắk Lắk', 20], ['haccp', 'HACCP-VN-23-0912', 'Bureau Veritas', 240]],
  'S-SEAFOOD': [['attp', 'ATTP-VT-2025-0733', 'Chi cục ATVSTP Bà Rịa - Vũng Tàu', 25]],
  'S-PACK': [['other', 'ISO-9001-BD-0045', 'TUV Rheinland', 310]],
  'SRC-HTX-01': [['vietgap', 'VG-DL-0128/2025', 'Tổ chức chứng nhận VietGAP', 18], ['attp', 'ATTP-DL-2025-0310', 'Chi cục ATVSTP Đắk Lắk', 180]],
  'SRC-HTX-02': [['vietgap', 'VG-DL-0307/2025', 'Tổ chức chứng nhận VietGAP', 150]],
  'SRC-HTX-03': [['vietgap', 'VG-DN-0044/2025', 'Tổ chức chứng nhận VietGAP', 95]],
  'SRC-NH-01': [['vietgap', 'VG-DL-0509/2024', 'Tổ chức chứng nhận VietGAP', -5]],
  'SRC-NH-02': [['vietgap', 'VG-DL-0612/2025', 'Tổ chức chứng nhận VietGAP', 200]],
  'SRC-LM-01': [['attp', 'ATTP-DL-2025-0402', 'Chi cục ATVSTP Đắk Lắk', 110]],
  'SRC-LM-02': [['attp', 'ATTP-DL-2025-0415', 'Chi cục ATVSTP Đắk Lắk', 45]]
};

const CONTACT_NAMES = {
  'S-FACTORY': 'Quản đốc nhà máy', 'S-SEAFOOD': 'Chủ đầu mối', 'S-TRUCK': 'Điều độ xe', 'S-LASTMILE': 'Trưởng đội', 'S-PACK': 'Kinh doanh'
};

// Tồn kho mẫu. expireInDays tính từ hôm nay (âm = đã quá hạn), receivedAgoH = đã nhận cách đây bao nhiêu giờ.
const STOCK = [
  { sku: 'HS-CA-01', qty: 18, code: 'HUB-HS-CA-01-A', expireInDays: 1, receivedAgoH: 40, tempC: 2.5, supplierId: 'S-SEAFOOD', location: 'hub' },
  { sku: 'HS-CA-01', qty: 25, code: 'HUB-HS-CA-01-B', expireInDays: 3, receivedAgoH: 18, tempC: 1.8, supplierId: 'S-SEAFOOD', location: 'hub' },
  { sku: 'HS-CA-01', qty: 4, code: 'HUB-HS-CA-01-C', expireInDays: -1, receivedAgoH: 90, tempC: 3.5, supplierId: 'S-SEAFOOD', location: 'hub' },
  { sku: 'HS-TOM-02', qty: 30, code: 'HUB-HS-TOM-02-A', expireInDays: 25, receivedAgoH: 60, tempC: -19.5, supplierId: 'S-SEAFOOD', location: 'hub' },
  { sku: 'HS-TOM-02', qty: 12, code: 'HUB-HS-TOM-02-B', expireInDays: 9, receivedAgoH: 200, tempC: -20, supplierId: 'S-SEAFOOD', location: 'hub' },
  { sku: 'NL-BO-01', qty: 25, code: 'MOVA-TRACE-BO-202611-0912', expireInDays: 4, receivedAgoH: 20, tempC: 2.8, supplierId: 'S-FACTORY', location: 'hub' },
  { sku: 'NL-BO-02', qty: 12, code: 'MOVA-TRACE-BO-202611-0913', expireInDays: 4, receivedAgoH: 20, tempC: 3, supplierId: 'S-FACTORY', location: 'hub' },
  { sku: 'NL-GA-03', qty: 30, code: 'HUB-NL-GA-03-A', expireInDays: 1, receivedAgoH: 30, tempC: 2.2, supplierId: 'S-FACTORY', location: 'hub' },
  { sku: 'NL-GAO-01', qty: 300, code: 'MOVA-TRACE-GAO-202611-0207', expireInDays: 150, receivedAgoH: 120, tempC: null, supplierId: 'S-FACTORY', location: 'factory' },
  { sku: 'NL-BUN-01', qty: 120, code: 'HUB-NL-BUN-01-A', expireInDays: 120, receivedAgoH: 300, tempC: null, supplierId: 'S-FACTORY', location: 'factory' },
  { sku: 'NL-MI-01', qty: 60, code: 'HUB-NL-MI-01-A', expireInDays: 100, receivedAgoH: 300, tempC: null, supplierId: 'S-FACTORY', location: 'factory' },
  { sku: 'BB-THUNG-01', qty: 600, code: 'HUB-BB-THUNG-01-A', expireInDays: 300, receivedAgoH: 200, tempC: null, supplierId: 'S-PACK', location: 'factory' }
];

const HOUR = 3600 * 1000;

const mkLine = (price, sku, qty) => ({ sku, name: SKUS[sku].name, qty, unit: SKUS[sku].unit, unitPriceVnd: price(sku), lineTotalVnd: Math.round(qty * price(sku)) });

/** PO cũ chạy qua đúng các hàm ghi thật (duyệt, gửi, xác nhận, nhận, hóa đơn...), mỗi bước có giờ riêng. */
function historicPo(db, spec, now) {
  const resolve = priceResolver(db);
  const price = (sku) => resolve(sku, spec.day);
  const lines = spec.lines.map(([sku, qty]) => mkLine(price, sku, qty));
  const sup = SUPPLIERS[spec.supplierId];
  const at = (offsetDays, hour) => atDay(addDays(spec.day, offsetDays), hour, 0);
  const po = {
    id: `PO-${spec.day.replace(/-/g, '')}-${spec.supplierId}`,
    supplierId: spec.supplierId,
    supplierName: sup.name,
    deliveryDay: spec.day,
    termDays: sup.termDays,
    status: 'draft',
    createdAt: at(-3, 8).toISOString(),
    coveredByStock: [],
    history: [{ at: at(-3, 8).toISOString(), status: 'draft', by: 'system', note: 'Tự lập sau chốt sổ' }],
    lines,
    totalVnd: lines.reduce((s, l) => s + l.lineTotalVnd, 0),
    sample: true
  };
  db.purchaseOrders.push(po);
  const ok = (r) => {
    if (!r.ok) throw new Error(`Seed PO ${po.id}: ${r.message}`);
    return r;
  };
  ok(approvePo(db, { poId: po.id, by: 'mua hàng' }, at(-3, 9)));
  ok(sendPo(db, { poId: po.id, via: 'link', by: 'mua hàng' }, at(-3, 10)));
  ok(confirmPo(db, { poId: po.id, result: 'full', by: sup.name }, at(-2, 9)));
  if (!spec.receive) return po;
  const rec = ok(receivePo(db, { poId: po.id, lines: spec.receive, photo: spec.photo || '', by: 'kho phụ' }, at(0, 4)));
  // Lô của PO cũ đã dùng hết: giữ lịch sử nhận và xuất, không để thành tồn kho
  for (const l of rec.receipt.lines) {
    const s = db.procurement.stock.find((x) => x.id === l.stockId);
    if (!s) continue;
    db.procurement.stockMoves.push({ id: `MV-H-${s.id}`, at: at(1, 6).toISOString(), kind: 'issue', stockId: s.id, sku: s.sku, lotCode: s.lotCode, qty: s.qty, reason: 'order', ref: '', by: 'kho phụ' });
    s.qty = 0;
  }
  if (!spec.invoice) return po;
  ok(submitInvoice(db, { poId: po.id, number: spec.invoice.number, issuedAt: addDays(spec.day, spec.invoice.afterDays ?? 1), lines: spec.invoice.lines(price), by: sup.name }, at(spec.invoice.afterDays ?? 1, 15)));
  if (!spec.match) return po;
  ok(matchPo(db, { poId: po.id, by: 'mua hàng' }, at((spec.invoice.afterDays ?? 1) + 1, 9)));
  if (!spec.paidAfterDays) return po;
  ok(payPo(db, { poId: po.id, method: 'bank_transfer', ref: `UNC-${spec.day.replace(/-/g, '')}`, by: 'kế toán' }, at(spec.paidAfterDays, 10)));
  return po;
}

/** Bù dữ liệu mua hàng / kho phụ vào một `db` chưa có (hạt giống mới hoặc bộ nhớ cũ). Không ghi đè dữ liệu đã có. */
export function supplementProcurement(db, now, cfg = BUSINESS) {
  if (db.procurement && db.procurement.suppliers && Object.keys(db.procurement.suppliers).length) return false;
  const proc = ensureProcurement(db);
  const nowIso = now.toISOString();
  const today = dayKey(now);

  // Hồ sơ nhà cung cấp
  for (const p of PROFILES) {
    const portal = SUPPLIERS[p.id];
    const src = SOURCES[p.id];
    const name = portal ? portal.name : src.name;
    proc.suppliers[p.id] = {
      id: p.id,
      kind: p.kind,
      name,
      taxId: p.taxId || '',
      cccd: p.cccd || '',
      address: p.address,
      bank: { bankName: p.bank[0], accountNo: p.bank[1], accountName: p.bank[2] },
      termDays: portal ? portal.termDays : p.term,
      contact: { name: CONTACT_NAMES[p.id] || (src && src.kind === 'nong_ho' ? name.replace(/^Nông hộ /, 'Chủ hộ ') : 'Thủ quỹ HTX'), phone: p.phone },
      portal: Boolean(portal),
      certs: (CERTS[p.id] || []).map(([type, number, issuer, days], i) => ({
        id: `CERT-${p.id}-${i + 1}`, type, number, issuer, expiresAt: addDays(today, days), addedAt: nowIso
      })),
      updatedAt: nowIso
    };
  }

  // Bảng giá có lịch sử: giá hiện hành = giá trong danh mục; hai mức cũ thấp hơn
  let n = 0;
  for (const s of Object.values(SKUS)) {
    const old = (pct) => Math.round((s.priceVnd * pct) / 500) * 500;
    for (const [daysAgo, price, note] of [[90, old(0.94), 'Bảng giá đầu quý'], [35, old(0.97), 'Điều chỉnh theo thị trường'], [7, s.priceVnd, 'Bảng giá hiện hành']]) {
      n += 1;
      proc.priceList.push({ id: `PRC-${String(n).padStart(5, '0')}`, sku: s.id, priceVnd: price, effectiveFrom: addDays(today, -daysAgo), note, createdAt: nowIso, by: 'seed' });
    }
  }
  proc.seq.PRC = n;
  proc.seq.CERT = 100;

  // Tồn kho có lô và hạn dùng
  STOCK.forEach((s, i) => {
    const receivedAt = new Date(now.getTime() - s.receivedAgoH * HOUR).toISOString();
    const expiresAt = atDay(addDays(today, s.expireInDays), 23, 59).toISOString();
    const id = `STK-S${String(i + 1).padStart(4, '0')}`;
    proc.stock.push({
      id, sku: s.sku, lotCode: s.code, qty: s.qty, qtyIn: s.qty, unit: SKUS[s.sku].unit, receivedAt, expiresAt, tempC: s.tempC,
      supplierId: s.supplierId, receiptId: null, location: s.location, heldBy: null, unitCostVnd: SKUS[s.sku].priceVnd
    });
    proc.stockMoves.push({ id: `MV-S${String(i + 1).padStart(4, '0')}`, at: receivedAt, kind: 'receive', stockId: id, sku: s.sku, lotCode: s.code, qty: s.qty, ref: 'seed', by: 'seed' });
  });

  // PO cũ: đủ trạng thái để xem đối chiếu và công nợ
  const d = (n2) => addDays(today, n2);
  historicPo(db, {
    supplierId: 'S-SEAFOOD', day: d(-30), lines: [['HS-CA-01', 40], ['HS-TOM-02', 20]],
    receive: [{ sku: 'HS-CA-01', acceptedQty: 40, tempC: 2, expiresAt: d(-27) }, { sku: 'HS-TOM-02', acceptedQty: 20, tempC: -20, expiresAt: d(0) }],
    invoice: { number: 'HD-VT-0412', afterDays: 1, lines: (p) => [{ sku: 'HS-CA-01', qty: 40, unitPriceVnd: p('HS-CA-01') }, { sku: 'HS-TOM-02', qty: 20, unitPriceVnd: p('HS-TOM-02') }] },
    match: true, paidAfterDays: 16
  }, now);
  historicPo(db, {
    supplierId: 'S-SEAFOOD', day: d(-18), lines: [['HS-CA-01', 45], ['HS-TOM-02', 15]],
    receive: [{ sku: 'HS-CA-01', acceptedQty: 45, tempC: 2.2, expiresAt: d(-15) }, { sku: 'HS-TOM-02', acceptedQty: 15, tempC: -19.2, expiresAt: d(10) }],
    invoice: { number: 'HD-VT-0455', afterDays: 1, lines: (p) => [{ sku: 'HS-CA-01', qty: 45, unitPriceVnd: p('HS-CA-01') }, { sku: 'HS-TOM-02', qty: 15, unitPriceVnd: p('HS-TOM-02') }] },
    match: true
  }, now);
  historicPo(db, {
    supplierId: 'S-FACTORY', day: d(-9), lines: [['NL-HEO-02', 120], ['NL-GA-03', 150], ['NL-RAU-02', 80]],
    photo: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    receive: [
      { sku: 'NL-HEO-02', acceptedQty: 120, tempC: -19, expiresAt: d(40) },
      { sku: 'NL-GA-03', acceptedQty: 144, rejectedQty: 6, tempC: 3.4, reason: 'damaged', note: 'Một thùng rách bao bì, thịt chảy nước', expiresAt: d(-5) },
      { sku: 'NL-RAU-02', acceptedQty: 80, tempC: 2.6, expiresAt: d(-5) }
    ],
    // Hóa đơn lệch: heo +5.000đ/kg, rau thừa 3 kg
    invoice: { number: 'HD-DL-2211', afterDays: 1, lines: (p) => [{ sku: 'NL-HEO-02', qty: 120, unitPriceVnd: p('NL-HEO-02') + 5000 }, { sku: 'NL-GA-03', qty: 150, unitPriceVnd: p('NL-GA-03') }, { sku: 'NL-RAU-02', qty: 83, unitPriceVnd: p('NL-RAU-02') }] }
  }, now);
  historicPo(db, {
    supplierId: 'S-PACK', day: d(-6), lines: [['BB-THUNG-01', 800]],
    receive: [{ sku: 'BB-THUNG-01', acceptedQty: 800, expiresAt: d(300) }],
    invoice: { number: 'HD-BB-7781', afterDays: 1, lines: (p) => [{ sku: 'BB-THUNG-01', qty: 800, unitPriceVnd: p('BB-THUNG-01') }] },
    match: true
  }, now);
  historicPo(db, {
    supplierId: 'S-FACTORY', day: d(-3), lines: [['NL-BO-01', 60], ['NL-CACHUA-06', 50]],
    receive: [{ sku: 'NL-BO-01', acceptedQty: 40, tempC: 3, lotCode: 'MOVA-TRACE-BO-202611-0912', expiresAt: d(2) }]
  }, now);

  // Một bảng kê thu mua nông sản không hóa đơn
  const nh = proc.suppliers['SRC-NH-02'];
  const direct = recordDirectPurchase(db, {
    seller: { name: 'Trần Thị Khoai', cccd: nh.cccd, address: nh.address, phone: nh.contact.phone },
    items: [{ sku: 'NL-KHOAI-01', qty: 80, unitPriceVnd: 24000 }, { sku: 'NL-BI-05', qty: 35, unitPriceVnd: 16000 }],
    method: 'bank_transfer', intoStock: true, location: 'hub', by: 'mua hàng'
  }, new Date(now.getTime() - 20 * HOUR), cfg);
  if (!direct.ok) throw new Error(`Seed bảng kê: ${direct.message}`);

  // Dự báo đã gửi nhà cung cấp
  sendForecast(db, { by: 'mua hàng' }, now);
  return true;
}
