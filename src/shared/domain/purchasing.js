import { SKUS, SUPPLIERS } from '../data/catalog';
import { BUSINESS } from '../config/business';

const ceil1 = (n) => Math.ceil(n * 10) / 10;

/**
 * Lập PO nháp theo nhà cung cấp từ BOM đã chốt.
 * Số lượng mua = gram sơ chế / tỷ lệ thu hồi sơ chế * (1 + dự phòng hao hụt).
 * Gói xốt do nhà máy tự chiết rót nên không có dòng PO (chỉ có trong phiếu sản xuất).
 */
export function draftPurchaseOrders(bom, deliveryDay, cfg = BUSINESS) {
  const buffer = cfg.purchasing.wasteBufferPct;
  const bySupplier = {};

  const add = (supplierId, line) => {
    (bySupplier[supplierId] ||= []).push(line);
  };

  for (const [skuId, grams] of Object.entries(bom.skuGrams)) {
    const sku = SKUS[skuId];
    if (!sku) throw new Error(`SKU không có trong danh mục: ${skuId}`);
    const qty = ceil1((grams / 1000 / sku.yield) * (1 + buffer));
    add(sku.supplierId, { sku: skuId, name: sku.name, qty, unit: sku.unit, unitPriceVnd: sku.priceVnd, lineTotalVnd: Math.round(qty * sku.priceVnd) });
  }
  for (const [skuId, qty] of Object.entries(bom.packaging)) {
    const sku = SKUS[skuId];
    add(sku.supplierId, { sku: skuId, name: sku.name, qty, unit: sku.unit, unitPriceVnd: sku.priceVnd, lineTotalVnd: qty * sku.priceVnd });
  }

  const compactDay = deliveryDay.replace(/-/g, '');
  return Object.entries(bySupplier).map(([supplierId, lines]) => ({
    id: `PO-${compactDay}-${supplierId}`,
    supplierId,
    supplierName: SUPPLIERS[supplierId].name,
    deliveryDay,
    termDays: SUPPLIERS[supplierId].termDays,
    status: 'draft',
    lines,
    totalVnd: lines.reduce((s, l) => s + l.lineTotalVnd, 0)
  }));
}
