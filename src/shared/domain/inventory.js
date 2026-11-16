import { BUSINESS } from '../config/business';
import { SKUS } from '../data/catalog';
import { packingOf } from '../data/packaging';
import { addDays, dayKey, atDay } from '../utils/time';

/**
 * Tồn kho kho phụ theo lô và hạn dùng (P2B). Hàm thuần: nhận danh sách lô tồn, trả kết quả; lớp API ghi vào db.
 * Một lô tồn: { id, sku, lotCode, qty, qtyIn, unit, receivedAt, expiresAt, tempC, supplierId, receiptId, location, heldBy }.
 * `lotCode` là mã lô truy xuất (MOVA-TRACE-... với bò và gạo) hoặc mã lô nội bộ kho.
 */

const round2 = (n) => Math.round(n * 100) / 100;
const MS_DAY = 24 * 3600 * 1000;

/** Hạn dùng mặc định của một lô nhận lúc `receivedIso`: cuối ngày thứ `shelfDays` theo quy cách SKU. */
export function defaultExpiry(skuId, receivedIso) {
  const p = packingOf(skuId);
  return atDay(addDays(dayKey(new Date(receivedIso)), p.shelfDays), 23, 59).toISOString();
}

/** Mã lô nội bộ của kho cho hàng không cần truy xuất QR: HUB-<SKU>-<YYYYMMDD>-<NN>. */
export function nextHubLotCode(skuId, existingCodes, atIso) {
  const base = `HUB-${skuId}-${dayKey(new Date(atIso)).replace(/-/g, '')}-`;
  let max = 0;
  for (const c of existingCodes) if (typeof c === 'string' && c.startsWith(base)) max = Math.max(max, parseInt(c.slice(base.length), 10) || 0);
  return `${base}${String(max + 1).padStart(2, '0')}`;
}

/** Tình trạng hạn dùng: expired (đã quá hạn), expiring (còn <= warnDays ngày), ok. */
export function expiryState(lot, now, warnDays = BUSINESS.inventory.expiryWarnDays) {
  const ms = Date.parse(lot.expiresAt) - now.getTime();
  if (ms <= 0) return 'expired';
  return ms <= warnDays * MS_DAY ? 'expiring' : 'ok';
}

/** Lô dùng được để xuất: còn hàng, chưa hết hạn, không bị giữ (thu hồi). */
export const isIssuable = (lot, now) => lot.qty > 1e-9 && !lot.heldBy && Date.parse(lot.expiresAt) > now.getTime();

/**
 * FEFO (hết hạn trước xuất trước): chọn các lô của `sku` cho đủ `qty`, lô hết hạn sớm nhất trước;
 * cùng hạn thì lô nhận sớm hơn trước. Bỏ qua lô đã hết hạn, đang bị giữ hoặc hết hàng.
 * Trả { ok, allocations: [{ stockId, lotCode, qty, expiresAt }], shortfall }.
 */
export function fefoAllocate(lots, { sku, qty }, now) {
  const need = Number(qty);
  if (!(need > 0)) return { ok: false, allocations: [], shortfall: 0 };
  const usable = lots
    .filter((l) => l.sku === sku && isIssuable(l, now))
    .sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt) || Date.parse(a.receivedAt) - Date.parse(b.receivedAt) || String(a.id).localeCompare(String(b.id)));
  const allocations = [];
  let left = need;
  for (const l of usable) {
    if (left <= 1e-9) break;
    const take = round2(Math.min(l.qty, left));
    allocations.push({ stockId: l.id, lotCode: l.lotCode, qty: take, expiresAt: l.expiresAt });
    left = round2(left - take);
  }
  return { ok: left <= 1e-9, allocations, shortfall: Math.max(0, round2(left)) };
}

/** Tổng tồn khả dụng của một SKU (không tính lô hết hạn hay bị giữ). */
export function availableQty(lots, sku, now) {
  return round2(lots.filter((l) => l.sku === sku && isIssuable(l, now)).reduce((s, l) => s + l.qty, 0));
}

/** Tổng tồn theo SKU: tổng, khả dụng, sắp hết hạn, đã quá hạn, bị giữ. */
export function stockBySku(lots, now) {
  const out = {};
  for (const l of lots) {
    if (!(l.qty > 1e-9)) continue;
    const x = (out[l.sku] ||= { sku: l.sku, unit: l.unit, total: 0, available: 0, expiring: 0, expired: 0, held: 0, lots: 0, nextExpiry: null });
    x.total = round2(x.total + l.qty);
    x.lots += 1;
    const st = expiryState(l, now);
    if (l.heldBy) x.held = round2(x.held + l.qty);
    else if (st === 'expired') x.expired = round2(x.expired + l.qty);
    else {
      x.available = round2(x.available + l.qty);
      if (st === 'expiring') x.expiring = round2(x.expiring + l.qty);
      if (!x.nextExpiry || l.expiresAt < x.nextExpiry) x.nextExpiry = l.expiresAt;
    }
  }
  return Object.values(out).sort((a, b) => a.sku.localeCompare(b.sku));
}

/** Giá trị hao hụt (đồng) của `qty` SKU theo đơn giá. */
export const wasteCostVnd = (skuId, qty, unitPriceVnd) => Math.round(qty * (unitPriceVnd != null ? unitPriceVnd : SKUS[skuId].priceVnd));

/**
 * Điều chỉnh sau kiểm kê: counted = { [stockId]: số đếm thực tế }. Trả mỗi lô lệch một dòng
 * { stockId, sku, lotCode, systemQty, countedQty, diff } (diff âm là hao hụt).
 */
export function countDiffs(lots, counted) {
  const out = [];
  for (const [stockId, raw] of Object.entries(counted)) {
    const lot = lots.find((l) => l.id === stockId);
    const c = Number(raw);
    if (!lot || !Number.isFinite(c) || c < 0) continue;
    const diff = round2(c - lot.qty);
    if (Math.abs(diff) > 1e-9) out.push({ stockId, sku: lot.sku, lotCode: lot.lotCode, systemQty: lot.qty, countedQty: c, diff });
  }
  return out;
}

/** Gộp các lần xuất hủy / hao hụt kiểm kê của một khoảng thời gian thành chi phí hao hụt theo lý do. */
export function wasteSummary(moves, fromIso, toIso) {
  const rows = {};
  let totalVnd = 0;
  for (const m of moves) {
    if (!['waste', 'count'].includes(m.kind) || !(m.costVnd > 0)) continue;
    if (m.at < fromIso || m.at >= toIso) continue;
    const key = m.reason || 'other';
    const r = (rows[key] ||= { reason: key, costVnd: 0, count: 0 });
    r.costVnd += m.costVnd;
    r.count += 1;
    totalVnd += m.costVnd;
  }
  return { totalVnd, rows: Object.values(rows).sort((a, b) => b.costVnd - a.costVnd) };
}
