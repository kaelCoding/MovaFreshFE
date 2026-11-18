import { BUSINESS } from '../config/business';
import { DISHES, PACKAGING_SKU, SKUS } from '../data/catalog';
import { addDays, dayKey, dowOfKey } from '../utils/time';
import { aggregateBom } from './bom';
import { priceAt } from './procurement';

const round = (n) => Math.round(n);

// ---------------------------------------------------------------------------------------------
// Giá vốn mỗi thùng = SKU x giá PO + bao bì + túi xốt + chi phí logistics phân bổ (P2C)

/**
 * Môi trường tra giá và chi phí logistics từ `db`.
 * Giá SKU: dòng PO của ngày giao (giá thật đã mua) > bảng giá theo ngày hiệu lực > giá danh mục.
 * Chi phí logistics mỗi thùng: bản ghi `db.logisticsCosts` của ngày giao (P2C đẩy sang); chưa có thì dùng `fallbackDayCost(day)` nếu được truyền.
 */
export function buildCostEnv(db, cfg = BUSINESS, { fallbackDayCost = null } = {}) {
  const poPrice = {};
  for (const po of db.purchaseOrders || []) for (const l of po.lines) poPrice[`${po.deliveryDay}|${l.sku}`] = l.unitPriceVnd;
  const priceList = (db.procurement && db.procurement.priceList) || [];
  const logistics = {};
  for (const c of db.logisticsCosts || []) logistics[c.day] = c;
  return {
    cfg,
    priceFor(sku, day) {
      const p = poPrice[`${day}|${sku}`];
      return p != null ? p : priceAt(priceList, sku, day);
    },
    logisticsFor(day) {
      const c = logistics[day];
      if (c) return { perBoxVnd: c.perBoxVnd || 0, estimated: c.status !== 'final' || (c.trips || []).some((t) => t.estimated) || Boolean(c.hub && c.hub.estimated), source: 'logisticsCosts' };
      const f = fallbackDayCost ? fallbackDayCost(day) : null;
      if (f && f.perBoxVnd != null) return { perBoxVnd: f.perBoxVnd, estimated: true, source: 'estimate' };
      return { perBoxVnd: 0, estimated: true, source: 'none' };
    }
  };
}

/**
 * Giá vốn một thùng. `byTaxGroup` là giá trị nguyên liệu theo nhóm thuế, dùng để tách VAT.
 * Số lượng mua = gram sơ chế / tỷ lệ thu hồi x (1 + dự phòng hao hụt của mua hàng).
 */
export function boxCost(order, env) {
  const cfg = env.cfg || BUSINESS;
  const bom = aggregateBom([order], DISHES);
  const buffer = cfg.purchasing.wasteBufferPct;
  const lines = [];
  const byTaxGroup = {};
  let skuVnd = 0;
  for (const [sku, grams] of Object.entries(bom.skuGrams)) {
    const s = SKUS[sku];
    const qty = (grams / 1000 / s.yield) * (1 + buffer);
    const priceVnd = env.priceFor(sku, order.deliveryDay);
    const costVnd = qty * priceVnd;
    lines.push({ sku, name: s.name, qty: Math.round(qty * 1000) / 1000, unit: s.unit, priceVnd, costVnd: round(costVnd) });
    skuVnd += costVnd;
    byTaxGroup[s.taxGroup] = (byTaxGroup[s.taxGroup] || 0) + costVnd;
  }
  const packagingVnd = env.priceFor(PACKAGING_SKU, order.deliveryDay) || 0;
  byTaxGroup[SKUS[PACKAGING_SKU].taxGroup] = (byTaxGroup[SKUS[PACKAGING_SKU].taxGroup] || 0) + packagingVnd;
  const saucePacks = Object.values(bom.sauces).reduce((s, n) => s + n, 0);
  let sauceVnd = 0;
  if (typeof cfg.finance.sauceCostPerPackVnd === 'object' && cfg.finance.sauceCostPerPackVnd !== null) {
    for (const [sCode, count] of Object.entries(bom.sauces)) {
      const unit = cfg.finance.sauceCostPerPackVnd[sCode] ?? cfg.finance.sauceCostPerPackVnd.default ?? 4500;
      sauceVnd += count * unit;
    }
  } else {
    sauceVnd = saucePacks * Number(cfg.finance.sauceCostPerPackVnd || 0);
  }
  byTaxGroup.sauce = (byTaxGroup.sauce || 0) + sauceVnd;
  const logistics = env.logisticsFor(order.deliveryDay);
  const materialsVnd = round(skuVnd) + round(packagingVnd) + round(sauceVnd);
  return {
    orderId: order.id,
    skuVnd: round(skuVnd),
    packagingVnd: round(packagingVnd),
    sauceVnd: round(sauceVnd),
    saucePacks,
    materialsVnd,
    logisticsVnd: logistics.perBoxVnd,
    logisticsEstimated: logistics.estimated,
    totalVnd: materialsVnd + logistics.perBoxVnd,
    byTaxGroup,
    lines
  };
}

// ---------------------------------------------------------------------------------------------
// Thuế

/**
 * Tách VAT khỏi một số tiền ĐÃ GỒM VAT theo tỷ trọng các nhóm hàng (`mix` = { nhóm: giá trị }).
 * Thuế suất lấy ở `cfg.tax.groups`; `rate: null` (chưa xác định) coi như 0 và đánh dấu `unconfirmed`.
 */
export function vatSplit(grossVnd, mix, cfg = BUSINESS) {
  const total = Object.values(mix || {}).reduce((s, v) => s + v, 0);
  if (!(grossVnd > 0) || !(total > 0)) return { grossVnd: grossVnd || 0, netVnd: grossVnd || 0, vatVnd: 0, unconfirmed: false, groups: [] };
  let vat = 0;
  let unconfirmed = false;
  const groups = [];
  for (const [g, w] of Object.entries(mix)) {
    if (!(w > 0)) continue;
    const def = cfg.tax.groups[g];
    const rate = def && def.rate != null ? def.rate : 0;
    if (!def || !def.confirmed) unconfirmed = true;
    const share = (grossVnd * w) / total;
    const v = share - share / (1 + rate);
    vat += v;
    groups.push({ group: g, rate: def ? def.rate : null, grossVnd: round(share), vatVnd: round(v) });
  }
  const vatVnd = Math.min(round(vat), grossVnd);
  return { grossVnd, netVnd: grossVnd - vatVnd, vatVnd, unconfirmed, groups };
}

// ---------------------------------------------------------------------------------------------
// Doanh thu: CHỈ khi đơn đã giao, theo giá trị tiền thật đã dùng

/** Hai ngăn đã trả cho một đơn, chuẩn hóa để tổng bằng số tiền đơn (phần dư coi là tiền thật). */
export function normalizeFunding(order, funding) {
  const real = Math.max(0, funding.real || 0);
  const promo = Math.max(0, funding.promo || 0);
  const diff = order.amountVnd - real - promo;
  return { real: Math.max(0, real + diff), promo };
}

export const isFirstCycle = (o, cfg = BUSINESS) => (o.movedFromWeek != null ? o.movedFromWeek : o.weekIndex) < cfg.subscription.defaultWeeks;
export const planTypeOf = (o) => (o.householdSize === 1 ? 'solo' : 'family');
export const PLAN_LABEL = { solo: 'Gói 1 người', family: 'Gói gia đình (2 người trở lên)' };

/**
 * Ghi nhận doanh thu. `fundingOf(order)` = { real, promo } đã dùng; `mixOf(order)` = giá trị theo nhóm thuế.
 * Đơn CHƯA giao (đã thu tiền, chốt sổ, đang giao, hủy...) không có dòng nào.
 */
export function recognizeRevenue({ orders, fundingOf, mixOf }, cfg = BUSINESS, treatment = cfg.finance.promoTreatment) {
  const rows = [];
  for (const o of orders) {
    if (o.status !== 'delivered' || !o.deliveredAt) continue;
    const f = normalizeFunding(o, fundingOf(o));
    const vat = vatSplit(f.real, mixOf(o), cfg);
    rows.push({
      orderId: o.id,
      customerId: o.customerId,
      deliveredAt: o.deliveredAt,
      day: dayKey(new Date(o.deliveredAt)),
      deliveryDay: o.deliveryDay,
      zoneId: o.zoneId,
      weekIndex: o.weekIndex,
      householdSize: o.householdSize,
      planType: planTypeOf(o),
      paymentMethod: o.paymentMethod,
      firstCycle: isFirstCycle(o, cfg),
      listVnd: o.listPriceVnd,
      giftVnd: o.discountVnd || 0,
      amountVnd: o.amountVnd,
      realVnd: f.real,
      promoVnd: f.promo,
      vatVnd: vat.vatVnd,
      netRevenueVnd: vat.netVnd,
      vatUnconfirmed: vat.unconfirmed,
      // Doanh thu dùng để tính margin: net = chỉ tiền thật (không VAT); gross = cộng cả phần khuyến mãi
      marginRevenueVnd: vat.netVnd + (treatment === 'gross' ? f.promo : 0)
    });
  }
  return rows.sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt) || a.orderId.localeCompare(b.orderId));
}

export function revenueTotals(rows) {
  const t = { orders: rows.length, listVnd: 0, giftVnd: 0, realVnd: 0, promoVnd: 0, vatVnd: 0, netRevenueVnd: 0 };
  for (const r of rows) {
    t.listVnd += r.listVnd;
    t.giftVnd += r.giftVnd;
    t.realVnd += r.realVnd;
    t.promoVnd += r.promoVnd;
    t.vatVnd += r.vatVnd;
    t.netRevenueVnd += r.netRevenueVnd;
  }
  return t;
}

// ---------------------------------------------------------------------------------------------
// Margin

/** Thứ Hai của tuần chứa `key`. */
export const weekStartOf = (key) => addDays(key, -((dowOfKey(key) + 6) % 7));

/** Ghép doanh thu và giá vốn của từng thùng đã giao. */
export function marginRows(revRows, costOf) {
  return revRows.map((r) => {
    const c = costOf(r);
    const marginVnd = r.marginRevenueVnd - c.totalVnd;
    return {
      ...r,
      cost: c,
      cogsVnd: c.totalVnd,
      marginVnd,
      marginPct: r.marginRevenueVnd > 0 ? marginVnd / r.marginRevenueVnd : null,
      // Biên trước logistics: để thấy vấn đề nằm ở giá nguyên liệu hay ở chi phí giao nhận
      productMarginVnd: r.marginRevenueVnd - c.materialsVnd
    };
  });
}

function groupBy(rows, keyOf, labelOf, cfg) {
  const map = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    const g = map.get(k) || { key: k, label: labelOf(k), boxes: 0, revenueVnd: 0, cogsVnd: 0, materialsVnd: 0, logisticsVnd: 0, marginVnd: 0 };
    g.boxes += 1;
    g.revenueVnd += r.marginRevenueVnd;
    g.cogsVnd += r.cogsVnd;
    g.materialsVnd += r.cost.materialsVnd;
    g.logisticsVnd += r.cost.logisticsVnd;
    g.marginVnd += r.marginVnd;
    map.set(k, g);
  }
  return [...map.values()]
    .map((g) => {
      const pct = g.revenueVnd > 0 ? g.marginVnd / g.revenueVnd : null;
      const productPct = g.revenueVnd > 0 ? (g.revenueVnd - g.materialsVnd) / g.revenueVnd : null;
      return { ...g, marginPct: pct, productMarginPct: productPct, alert: pct != null && pct < cfg.alerts.minGrossMarginPct };
    })
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

/**
 * Báo cáo margin: theo thùng, tuần, loại gói, khu. CHU KỲ ĐẦU (có ưu đãi lớn) tách riêng như chi phí kéo khách và không đưa vào
 * cảnh báo margin của vận hành thường; các tuần sau chu kỳ đầu mới bị so với ngưỡng `alerts.minGrossMarginPct`.
 */
export function marginReport(rows, cfg = BUSINESS, zoneName = (id) => id) {
  const steady = rows.filter((r) => !r.firstCycle);
  const first = rows.filter((r) => r.firstCycle);
  const sum = (list, f) => list.reduce((s, r) => s + f(r), 0);
  const total = (list) => {
    const rev = sum(list, (r) => r.marginRevenueVnd);
    const margin = sum(list, (r) => r.marginVnd);
    return { boxes: list.length, revenueVnd: rev, cogsVnd: sum(list, (r) => r.cogsVnd), marginVnd: margin, marginPct: rev > 0 ? margin / rev : null };
  };
  const weekLabel = (k) => `Tuần ${k}`;
  const out = {
    boxes: rows.map((r) => ({ orderId: r.orderId, deliveryDay: r.deliveryDay, zoneId: r.zoneId, planType: r.planType, firstCycle: r.firstCycle, revenueVnd: r.marginRevenueVnd, cogsVnd: r.cogsVnd, materialsVnd: r.cost.materialsVnd, logisticsVnd: r.cost.logisticsVnd, logisticsEstimated: r.cost.logisticsEstimated, marginVnd: r.marginVnd, marginPct: r.marginPct, alert: !r.firstCycle && r.marginPct != null && r.marginPct < cfg.alerts.minGrossMarginPct })),
    weeks: groupBy(steady, (r) => weekStartOf(r.deliveryDay), weekLabel, cfg),
    plans: groupBy(steady, (r) => r.planType, (k) => PLAN_LABEL[k], cfg),
    zones: groupBy(steady, (r) => r.zoneId, zoneName, cfg),
    steady: total(steady),
    firstCycle: {
      ...total(first),
      // Chi phí kéo khách = thẻ quà tặng đã giảm vào giá + khuyến mãi đã dùng (thưởng nạp, thưởng giới thiệu...)
      giftVnd: sum(first, (r) => r.giftVnd),
      promoUsedVnd: sum(first, (r) => r.promoVnd),
      acquisitionCostVnd: sum(first, (r) => r.giftVnd + r.promoVnd),
      weeks: groupBy(first, (r) => weekStartOf(r.deliveryDay), weekLabel, { ...cfg, alerts: { ...cfg.alerts, minGrossMarginPct: -Infinity } })
    },
    alerts: []
  };
  for (const g of out.weeks) if (g.alert) out.alerts.push({ type: 'week', key: g.key, label: g.label, marginPct: g.marginPct });
  for (const g of out.plans) if (g.alert) out.alerts.push({ type: 'plan', key: g.key, label: g.label, marginPct: g.marginPct });
  for (const g of out.zones) if (g.alert) out.alerts.push({ type: 'zone', key: g.key, label: g.label, marginPct: g.marginPct });
  return out;
}

// ---------------------------------------------------------------------------------------------
// Hóa đơn điện tử (lớp tích hợp mock). Thời điểm xuất là CẤU HÌNH vì quy định chưa thống nhất:
//   'delivery' = mỗi đơn đã giao một hóa đơn theo giá trị tiền thật đã dùng
//   'topup'    = mỗi lần nhận tiền (nạp, chuyển khoản trọn gói, trừ thẻ) một hóa đơn

/**
 * Lập danh sách hóa đơn cần xuất (chưa xuất). `existing` = hóa đơn đã có; mỗi nguồn (đơn hoặc bút sổ) chỉ có một hóa đơn.
 */
export function planEinvoices({ revenueRows, ledger, existing }, mode, cfg = BUSINESS) {
  const have = new Set(existing.map((i) => `${i.sourceKind}:${i.sourceId}`));
  const drafts = [];
  if (mode === 'delivery') {
    for (const r of revenueRows) {
      if (r.realVnd <= 0 || have.has(`order:${r.orderId}`)) continue;
      drafts.push({
        sourceKind: 'order', sourceId: r.orderId, customerId: r.customerId, eventAt: r.deliveredAt, mode,
        totalVnd: r.realVnd, vatVnd: r.vatVnd, netVnd: r.netRevenueVnd, vatUnconfirmed: r.vatUnconfirmed,
        description: `Bán hàng, đơn ${r.orderId} giao ngày ${r.deliveryDay}`
      });
    }
  } else if (mode === 'topup') {
    for (const l of ledger) {
      if (!['topup', 'prepaid_cycle', 'card_charge'].includes(l.kind) || l.backfill || !(l.real > 0) || have.has(`ledger:${l.id}`)) continue;
      const rate = cfg.finance.topupInvoiceVatRate;
      const vat = rate != null ? Math.round(l.real - l.real / (1 + rate)) : 0;
      drafts.push({
        sourceKind: 'ledger', sourceId: l.id, customerId: l.customerId, eventAt: l.at, mode,
        totalVnd: l.real, vatVnd: vat, netVnd: l.real - vat, vatUnconfirmed: rate == null,
        description: l.kind === 'topup' ? 'Nạp Fresh Credit (điểm bữa ăn trả trước)' : l.kind === 'card_charge' ? 'Thu tiền gói ăn qua thẻ' : 'Thu tiền gói ăn trọn chu kỳ'
      });
    }
  }
  return drafts.sort((a, b) => a.eventAt.localeCompare(b.eventAt) || a.sourceId.localeCompare(b.sourceId));
}
