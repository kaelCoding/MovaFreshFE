import { SKUS, SUPPLIERS } from '../data/catalog';
import { packingOf } from '../data/packaging';
import { BUSINESS } from '../config/business';

const ceil1 = (n) => Math.ceil(n * 10 - 1e-9) / 10;

/** Hàng để lâu (gạo, bún, mì, bao bì): được trừ tồn kho khả dụng khi lập PO. */
export const isLongLife = (skuId, cfg = BUSINESS) => packingOf(skuId).shelfDays >= cfg.purchasing.longLifeShelfDays;

/**
 * Lập PO nháp theo nhà cung cấp từ BOM đã chốt.
 * Số lượng cần = gram sơ chế / tỷ lệ thu hồi sơ chế * (1 + dự phòng hao hụt). Hàng để lâu thì trừ tồn kho khả dụng
 * (`opts.availableStock(sku)`), phần trừ ghi ở `stockUsedQty`; hàng tươi luôn mua đủ vì hết hạn nhanh.
 * `opts.priceAt(sku, deliveryDay)` lấy đơn giá theo ngày hiệu lực (mặc định giá trong danh mục).
 * Gói xốt do nhà máy tự chiết rót nên không có dòng PO (chỉ có trong phiếu sản xuất).
 */
export function draftPurchaseOrders(bom, deliveryDay, cfg = BUSINESS, opts = {}) {
  const buffer = cfg.purchasing.wasteBufferPct;
  const priceAt = opts.priceAt || ((skuId) => SKUS[skuId].priceVnd);
  const availableStock = opts.availableStock || (() => 0);
  const createdAt = opts.createdAt || null;
  const bySupplier = {};
  const covered = {};

  const add = (supplierId, line) => {
    (bySupplier[supplierId] ||= []).push(line);
  };

  const makeLine = (skuId, need, { whole = false } = {}) => {
    const sku = SKUS[skuId];
    const wanted = whole ? Math.ceil(need) : ceil1(need);
    const stockUsed = isLongLife(skuId, cfg) ? Math.min(wanted, Math.max(0, availableStock(skuId))) : 0;
    const usedRounded = whole ? Math.floor(stockUsed) : Math.round(stockUsed * 10) / 10;
    const qty = Math.max(0, Math.round((wanted - usedRounded) * 10) / 10);
    if (usedRounded > 0) (covered[sku.supplierId] ||= []).push({ sku: skuId, qty: usedRounded, unit: sku.unit });
    if (qty <= 0) return;
    const unitPriceVnd = priceAt(skuId, deliveryDay);
    add(sku.supplierId, {
      sku: skuId, name: sku.name, qty, unit: sku.unit, unitPriceVnd, lineTotalVnd: Math.round(qty * unitPriceVnd),
      needQty: wanted, stockUsedQty: usedRounded
    });
  };

  for (const [skuId, grams] of Object.entries(bom.skuGrams)) {
    const sku = SKUS[skuId];
    if (!sku) throw new Error(`SKU không có trong danh mục: ${skuId}`);
    makeLine(skuId, (grams / 1000 / sku.yield) * (1 + buffer));
  }
  for (const [skuId, qty] of Object.entries(bom.packaging)) {
    if (!SKUS[skuId]) throw new Error(`SKU không có trong danh mục: ${skuId}`);
    makeLine(skuId, qty, { whole: true });
  }

  const compactDay = deliveryDay.replace(/-/g, '');
  return Object.entries(bySupplier).map(([supplierId, lines]) => ({
    id: `PO-${compactDay}-${supplierId}`,
    supplierId,
    supplierName: SUPPLIERS[supplierId].name,
    deliveryDay,
    termDays: SUPPLIERS[supplierId].termDays,
    status: 'draft',
    createdAt,
    coveredByStock: covered[supplierId] || [],
    history: createdAt ? [{ at: createdAt, status: 'draft', by: 'system', note: 'Tự lập sau chốt sổ' }] : [],
    lines,
    totalVnd: lines.reduce((s, l) => s + l.lineTotalVnd, 0)
  }));
}
