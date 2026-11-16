import { BUSINESS } from '../config/business';
import { SKUS } from '../data/catalog';
import { fmt } from '../utils/formatters';
import { nextDailyId, substitutionHits } from './factory';
import { notify } from './jobs';
import { creditCompensation } from './opsEvents';
import { ensureProcurement, wasteStock } from './procurementOps';
import { RECALL_GROUP_LABEL, affectedDishNames, affectedDishValueVnd, traceLot } from './recall';

/**
 * Thu hồi lô (P2B): tạo đợt thu hồi, giữ hàng, báo khách, bù Fresh Credit, hủy tồn đang giữ, đóng đợt.
 * Dùng hàm thông báo `notify` và cách ghi khoản bù (`creditCompensation`) đã có của app vận hành.
 * Mỗi hàm trả `{ ok: true, ... }` hoặc `{ ok: false, code, message }`.
 */

const bad = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const good = (extra = {}) => ({ ok: true, ...extra });

const find = (db, recallId) => (db.procurement ? db.procurement.recalls.find((r) => r.id === recallId) : null) || null;

function log(recall, at, by, action, detail = '') {
  recall.log.push({ at, by, action, detail });
}

/** Các đơn của đợt thu hồi (tính lại từ dữ liệu hiện tại, nên trạng thái luôn mới nhất). */
export function recallOrders(db, recall, cfg = BUSINESS) {
  const t = traceLot(db, recall.lotCode, cfg);
  return t ? t.orders : [];
}

export function createRecall(db, { lotCode, reason, by = '' }, now, cfg = BUSINESS) {
  const proc = ensureProcurement(db);
  const trace = traceLot(db, lotCode, cfg);
  if (!trace) return bad('LOT_NOT_FOUND', 'Không tìm thấy lô này');
  if (!String(reason || '').trim()) return bad('REASON_REQUIRED', 'Ghi lý do thu hồi');
  const open = proc.recalls.find((r) => r.lotCode === lotCode && r.status === 'open');
  if (open) return bad('RECALL_EXISTS', `Lô này đang có đợt thu hồi ${open.id}`, { recallId: open.id });
  const nowIso = now.toISOString();
  const recall = {
    id: nextDailyId('RC', proc.recalls.map((r) => r.id), nowIso),
    lotCode,
    sku: trace.sku,
    reason: String(reason).trim(),
    status: 'open',
    createdAt: nowIso,
    createdBy: by,
    closedAt: null,
    held: {}, // { orderId: at }
    notified: {}, // { orderId: at }
    compensated: {}, // { orderId: { amountVnd, at } }
    stockHeld: [],
    log: []
  };
  // Hàng tồn của lô này ở kho phụ bị giữ ngay để FEFO không xuất ra nữa
  for (const s of proc.stock) {
    if (s.lotCode === lotCode && !s.heldBy) {
      s.heldBy = recall.id;
      recall.stockHeld.push(s.id);
    }
  }
  proc.recalls.push(recall);
  log(recall, nowIso, by, 'create', `${trace.counts.total} đơn bị ảnh hưởng, giữ ${recall.stockHeld.length} lô tồn kho`);
  return good({ recall });
}

/** Giữ hàng: các đơn chưa xuất kho của lô không được lên xe cho tới khi xử lý (đổi món / đóng đợt). */
export function holdOrders(db, { recallId, orderIds = null, by = '' }, now, cfg = BUSINESS) {
  const recall = find(db, recallId);
  if (!recall) return bad('RECALL_NOT_FOUND', 'Không tìm thấy đợt thu hồi');
  if (recall.status !== 'open') return bad('RECALL_CLOSED', 'Đợt thu hồi đã đóng');
  const nowIso = now.toISOString();
  const targets = recallOrders(db, recall, cfg).filter((o) => o.group === 'not_shipped' && (!orderIds || orderIds.includes(o.orderId)));
  let n = 0;
  for (const t of targets) {
    const order = db.orders.find((o) => o.id === t.orderId);
    if (!order.recallHold) {
      order.recallHold = { recallId, at: nowIso };
      recall.held[order.id] = nowIso;
      n += 1;
    }
  }
  if (n) log(recall, nowIso, by, 'hold', `Giữ ${n} đơn chưa xuất kho`);
  return good({ held: n });
}

const noticeBody = (group, dishes, lotCode) => {
  const list = dishes.length ? ` (${dishes.join(', ')})` : '';
  if (group === 'not_shipped') return `Một lô nguyên liệu${list} trong đơn của bạn đang được MOVA thu hồi để kiểm tra (lô ${lotCode}). Đơn chưa rời kho nên MOVA giữ lại, sẽ đổi món hoặc giao bù và báo bạn ngay.`;
  if (group === 'in_transit') return `Một lô nguyên liệu${list} trong đơn đang giao của bạn được MOVA thu hồi (lô ${lotCode}). Bạn vui lòng chưa dùng phần nguyên liệu đó; shipper sẽ liên hệ và MOVA bù lại cho bạn.`;
  return `Một lô nguyên liệu${list} trong đơn đã giao của bạn được MOVA thu hồi (lô ${lotCode}). Bạn vui lòng không dùng phần nguyên liệu đó. MOVA bù lại cho bạn và sẽ liên hệ để thu hồi.`;
};

/** Báo khách của các đơn bị ảnh hưởng (mỗi đơn một lần). */
export function notifyCustomers(db, { recallId, orderIds = null, by = '' }, now, cfg = BUSINESS) {
  const recall = find(db, recallId);
  if (!recall) return bad('RECALL_NOT_FOUND', 'Không tìm thấy đợt thu hồi');
  if (recall.status !== 'open') return bad('RECALL_CLOSED', 'Đợt thu hồi đã đóng');
  const nowIso = now.toISOString();
  let n = 0;
  for (const t of recallOrders(db, recall, cfg)) {
    if (!t.group || recall.notified[t.orderId] || (orderIds && !orderIds.includes(t.orderId))) continue;
    const order = db.orders.find((o) => o.id === t.orderId);
    notify(db, {
      customerId: order.customerId,
      type: 'recall',
      title: 'MOVA thu hồi một lô nguyên liệu trong đơn của bạn',
      body: noticeBody(t.group, affectedDishNames(order, recall.sku), recall.lotCode),
      at: nowIso,
      meta: { orderId: order.id, weekIndex: order.weekIndex, recallId, lotCode: recall.lotCode, group: t.group, kind: 'notice' }
    });
    recall.notified[t.orderId] = nowIso;
    n += 1;
  }
  if (n) log(recall, nowIso, by, 'notify', `Báo ${n} khách`);
  return good({ notified: n });
}

/**
 * Bù Fresh Credit. Mặc định bù giá trị các món có nguyên liệu của lô cho đơn đã giao và đang giao; đơn chưa xuất kho thì không bù
 * (đổi món bằng `api.ops.substituteDish`, hệ thống tự bù phần chênh). `amountVnd` đặt một mức bù chung cho mọi đơn được chọn.
 */
export function compensateOrders(db, { recallId, orderIds = null, amountVnd = null, by = '' }, now, cfg = BUSINESS) {
  const recall = find(db, recallId);
  if (!recall) return bad('RECALL_NOT_FOUND', 'Không tìm thấy đợt thu hồi');
  if (recall.status !== 'open') return bad('RECALL_CLOSED', 'Đợt thu hồi đã đóng');
  if (amountVnd != null && !(Number.isFinite(amountVnd) && amountVnd >= 0)) return bad('INVALID_AMOUNT', 'Mức bù không hợp lệ');
  const nowIso = now.toISOString();
  let n = 0;
  let total = 0;
  for (const t of recallOrders(db, recall, cfg)) {
    if (!['in_transit', 'delivered'].includes(t.group) || recall.compensated[t.orderId]) continue;
    if (orderIds && !orderIds.includes(t.orderId)) continue;
    const order = db.orders.find((o) => o.id === t.orderId);
    const amount = amountVnd != null ? Math.round(amountVnd) : affectedDishValueVnd(order, recall.sku, cfg);
    if (!(amount > 0)) continue;
    creditCompensation(db, order, amount, nowIso);
    notify(db, {
      customerId: order.customerId,
      type: 'recall',
      title: `MOVA bù ${fmt(amount)} vào Fresh Credit`,
      body: `Bù cho phần nguyên liệu bị thu hồi trong đơn của bạn (lô ${recall.lotCode}). Khoản này nằm ở ngăn khuyến mãi của Fresh Credit.`,
      at: nowIso,
      meta: { orderId: order.id, weekIndex: order.weekIndex, recallId, lotCode: recall.lotCode, group: t.group, kind: 'compensation', compensationVnd: amount }
    });
    recall.compensated[t.orderId] = { amountVnd: amount, at: nowIso };
    n += 1;
    total += amount;
  }
  if (n) log(recall, nowIso, by, 'compensate', `Bù ${fmt(total)} cho ${n} đơn`);
  return good({ compensated: n, totalVnd: total });
}

/** Hủy tồn kho phụ đang bị giữ của đợt thu hồi (xuất hủy với lý do "thu hồi lô", tính vào chi phí hao hụt). */
export function wasteHeldStock(db, { recallId, by = '' }, now) {
  const recall = find(db, recallId);
  if (!recall) return bad('RECALL_NOT_FOUND', 'Không tìm thấy đợt thu hồi');
  const proc = ensureProcurement(db);
  let n = 0;
  let cost = 0;
  for (const s of proc.stock.filter((x) => x.heldBy === recallId && x.qty > 0)) {
    const r = wasteStock(db, { stockId: s.id, qty: s.qty, reason: 'recall', note: `Thu hồi ${recall.lotCode}`, by }, now);
    if (r.ok) {
      n += 1;
      cost += r.move.costVnd;
    }
  }
  if (n) log(recall, now.toISOString(), by, 'waste', `Hủy ${n} lô tồn kho, hao hụt ${fmt(cost)}`);
  return good({ lots: n, costVnd: cost });
}

export function closeRecall(db, { recallId, note = '', by = '' }, now) {
  const recall = find(db, recallId);
  if (!recall) return bad('RECALL_NOT_FOUND', 'Không tìm thấy đợt thu hồi');
  if (recall.status !== 'open') return bad('RECALL_CLOSED', 'Đợt thu hồi đã đóng');
  const nowIso = now.toISOString();
  for (const order of db.orders) if (order.recallHold && order.recallHold.recallId === recallId) delete order.recallHold;
  recall.status = 'closed';
  recall.closedAt = nowIso;
  recall.closeNote = String(note || '').trim();
  log(recall, nowIso, by, 'close', recall.closeNote);
  return good({ recall });
}

/** Đơn chưa xuất kho và món thay đề xuất (cơ chế `substitutionHits` của P2A). Không có thông tin khách. */
export function recallSubstitutions(db, recallId, cfg = BUSINESS) {
  const recall = find(db, recallId);
  if (!recall) return [];
  const out = [];
  for (const t of recallOrders(db, recall, cfg)) {
    if (t.group !== 'not_shipped') continue;
    const order = db.orders.find((o) => o.id === t.orderId);
    out.push({ orderId: t.orderId, zoneId: t.zoneId, slotId: t.slotId, deliveryDay: t.deliveryDay, hits: substitutionHits(db, order, recall.sku, [recall.sku]) });
  }
  return out;
}

/** Số liệu báo cáo thu hồi in được: lô, nguồn, số lượng, đơn theo nhóm, các việc đã làm, chi phí. */
export function recallReportData(db, recall, cfg = BUSINESS) {
  const trace = traceLot(db, recall.lotCode, cfg);
  const proc = ensureProcurement(db);
  const orders = trace ? trace.orders : [];
  const wasteMoves = proc.stockMoves.filter((m) => m.kind === 'waste' && m.reason === 'recall' && m.lotCode === recall.lotCode);
  const compVnd = Object.values(recall.compensated).reduce((s, c) => s + c.amountVnd, 0);
  const wasteVnd = wasteMoves.reduce((s, m) => s + m.costVnd, 0);
  const groups = Object.keys(RECALL_GROUP_LABEL).map((g) => ({
    id: g,
    label: RECALL_GROUP_LABEL[g],
    count: orders.filter((o) => o.group === g).length,
    notified: orders.filter((o) => o.group === g && recall.notified[o.orderId]).length,
    held: orders.filter((o) => o.group === g && (recall.held[o.orderId] || o.held)).length,
    compensated: orders.filter((o) => o.group === g && recall.compensated[o.orderId]).length
  }));
  return {
    recall,
    skuName: SKUS[recall.sku] ? SKUS[recall.sku].name : recall.sku,
    trace,
    groups,
    totals: {
      orders: orders.length,
      notified: Object.keys(recall.notified).length,
      held: Object.keys(recall.held).length,
      compensated: Object.keys(recall.compensated).length,
      compensationVnd: compVnd,
      stockHeld: recall.stockHeld.length,
      stockWasteVnd: wasteVnd,
      costVnd: compVnd + wasteVnd
    }
  };
}
