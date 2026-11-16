import { SKUS, SUPPLIERS, DISHES } from '../data/catalog';
import { ForbiddenError, recipientFor, viewInvoice, viewPo } from './views';
import { dayKey, addDays } from '../utils/time';
import { BUSINESS } from '../config/business';
import {
  PO_OPEN_FOR_RECEIPT, PO_STATUS_LABEL, RECEIPT_REASONS, SUPPLIER_KINDS, agingBuckets, certAlerts, certStatus, lineTarget, marketDiff, payableRows,
  poStage, priceAt, priceHistory, receivedBySku, skuCatalog, threeWayMatch
} from '../domain/procurement';
import {
  addCert, addPrice, approvePo, claimsOfPo, confirmPo, countStock, editPoLine, ensureProcurement, findPo, forecastRows, invoiceOfPo, issueStock,
  latestForecast, matchPo, payPo, receivePo, receiptsOfPo, recordDirectPurchase, removeCert, replyClaim, saveSettings, saveSupplierProfile, sendForecast,
  sendPo, stockStateOf, submitInvoice, wasteStock
} from '../domain/procurementOps';
import { buildDemandDays, shortageImpact, tripDepartAt } from '../domain/factory';
import { buildStatement } from '../domain/statement';
import { expiryState, fefoAllocate, stockBySku, wasteSummary } from '../domain/inventory';
import { listTraceLots, resolveLotCode, traceLot, affectedDishNames, RECALL_GROUP_LABEL } from '../domain/recall';
import { closeRecall, compensateOrders, createRecall, holdOrders, notifyCustomers, recallOrders, recallReportData, recallSubstitutions, wasteHeldStock } from '../domain/recallOps';

const toError = (res) => {
  const e = new Error(res.message || res.code);
  e.code = res.code;
  if (res.errors) e.errors = res.errors;
  if (res.match) e.match = res.match;
  if (res.shortfall != null) e.shortfall = res.shortfall;
  if (res.recallId) e.recallId = res.recallId;
  return e;
};
const must = (res) => {
  if (!res.ok) throw toError(res);
  return res;
};
const notFound = (message) => toError({ code: 'NOT_FOUND', message });

/**
 * API phía vận hành của mua hàng, kho phụ và cổng nhà cung cấp (P2B). Mọi hàm kiểm quyền ở `guard`, mọi thao tác ghi đi qua
 * `server.write`; logic nằm ở `domain/procurementOps.js`, `domain/recallOps.js` (ghi) và `domain/procurement.js`, `inventory.js`,
 * `recall.js` (hàm thuần). Nhà cung cấp luôn bị ép về chính mình: `portalId` bỏ qua mọi mã nhà cung cấp client gửi lên.
 */
export function createProcurementApi(server, cfg, guard) {
  const monthRange = (now) => {
    const today = dayKey(now);
    const start = `${today.slice(0, 7)}-01`;
    const next = addDays(`${today.slice(0, 7)}-28`, 4);
    const end = `${next.slice(0, 7)}-01`;
    return { from: new Date(`${start}T00:00:00+07:00`).toISOString(), to: new Date(`${end}T00:00:00+07:00`).toISOString(), label: today.slice(0, 7) };
  };

  const impactView = (db, shortage) => {
    const out = shortageImpact(db, shortage, cfg);
    return {
      ...out,
      note: shortage.note,
      handled: shortage.handled.map((h) => ({ ...h, fromDishName: DISHES[h.fromDishId] ? DISHES[h.fromDishId].name : h.fromDishId, toDishName: DISHES[h.toDishId] ? DISHES[h.toDishId].name : h.toDishId }))
    };
  };

  const poRow = (db, po, now, role) => {
    const proc = db.procurement;
    const inv = invoiceOfPo(db, po.id);
    return {
      ...viewPo(po, role),
      stage: poStage(po, now),
      stageLabel: PO_STATUS_LABEL[poStage(po, now)],
      receiptCount: receiptsOfPo(db, po.id).length,
      invoiceNumber: inv ? inv.number : null,
      claimCount: proc ? proc.claims.filter((c) => c.poId === po.id).length : 0,
      shortPct: po.confirmation ? po.confirmation.shortPct : null,
      certIssue: proc && proc.suppliers[po.supplierId] ? proc.suppliers[po.supplierId].certs.some((c) => certStatus(c, now).state === 'expired') : false
    };
  };

  /** Mã nhà cung cấp của cổng: nhà cung cấp luôn là chính mình; admin xem thử một nhà cung cấp được chọn. */
  const portalId = (ctx, asId) => {
    guard(ctx, 'supplierPortal');
    if (ctx.role === 'supplier') {
      if (!ctx.supplierId || !SUPPLIERS[ctx.supplierId]) throw new ForbiddenError();
      return ctx.supplierId;
    }
    if (!SUPPLIERS[asId]) throw toError({ code: 'SUPPLIER_REQUIRED', message: 'Chọn nhà cung cấp cần xem' });
    return asId;
  };

  const profileView = (p, now) => ({
    ...p,
    kindLabel: SUPPLIER_KINDS[p.kind] || p.kind,
    certs: p.certs.map((c) => ({ ...c, typeLabel: BUSINESS.suppliers.certTypes[c.type] || c.type, ...certStatus(c, now) }))
  });

  const stockRows = (db, now) =>
    db.procurement.stock
      .filter((s) => s.qty > 1e-9)
      .sort((a, b) => a.sku.localeCompare(b.sku) || Date.parse(a.expiresAt) - Date.parse(b.expiresAt))
      .map((s, i, arr) => ({
        ...s,
        name: SKUS[s.sku].name,
        temp: SKUS[s.sku].temp,
        state: stockStateOf(s, now),
        fefoRank: arr.filter((x, j) => j < i && x.sku === s.sku && !x.heldBy && Date.parse(x.expiresAt) > now.getTime()).length + 1
      }));

  return {
    // =========================================================================================
    // MUA HÀNG
    procurement: {
      /** Hồ sơ nhà cung cấp kèm tình trạng giấy chứng nhận và danh sách cảnh báo. */
      suppliers(ctx) {
        guard(ctx, 'procRead');
        return server.read((db, now) => {
          const proc = ensureProcurement(db);
          const list = Object.values(proc.suppliers).map((p) => profileView(p, now));
          const alerts = certAlerts(Object.values(proc.suppliers), now).map((a) => ({ ...a, typeLabel: BUSINESS.suppliers.certTypes[a.cert.type], kindLabel: SUPPLIER_KINDS[proc.suppliers[a.supplierId].kind] }));
          return {
            suppliers: list.map((p) => ({ ...p, poCount: db.purchaseOrders.filter((po) => po.supplierId === p.id).length })),
            alerts,
            warnDays: cfg.suppliers.certWarnDays,
            kinds: SUPPLIER_KINDS,
            certTypes: cfg.suppliers.certTypes
          };
        });
      },
      saveSupplier(ctx, profile) {
        guard(ctx, 'procWrite');
        return server.write((db, now) => must(saveSupplierProfile(db, profile, now)).supplier);
      },
      addCert(ctx, { supplierId, cert }) {
        guard(ctx, 'procWrite');
        return server.write((db, now) => must(addCert(db, { supplierId, cert }, now)).cert);
      },
      removeCert(ctx, { supplierId, certId }) {
        guard(ctx, 'procWrite');
        return server.write((db) => must(removeCert(db, { supplierId, certId })));
      },

      skuCatalog(ctx) {
        guard(ctx, 'procRead');
        return skuCatalog(cfg);
      },

      /** Bảng giá hiện hành, lịch sử và chênh lệch với giá thị trường (mock của pricing agent). */
      prices(ctx) {
        guard(ctx, 'procRead');
        return server.read((db, now) => {
          const proc = ensureProcurement(db);
          const today = dayKey(now);
          return {
            today,
            marketNote: 'Giá thị trường là dữ liệu mock của pricing agent (chạy 00:00 Chủ Nhật hàng tuần).',
            warnPct: cfg.purchasing.marketDiffWarnPct,
            rows: Object.values(SKUS).map((s) => {
              const price = priceAt(proc.priceList, s.id, today);
              const history = priceHistory(proc.priceList, s.id);
              const current = history.find((h) => h.effectiveFrom <= today) || null;
              const upcoming = history.filter((h) => h.effectiveFrom > today);
              return {
                sku: s.id, name: s.name, unit: s.unit, supplierId: s.supplierId, supplierName: SUPPLIERS[s.supplierId].name,
                priceVnd: price, effectiveFrom: current ? current.effectiveFrom : null, upcoming,
                ...marketDiff(s.id, price, cfg), history
              };
            })
          };
        });
      },
      addPrice(ctx, { sku, priceVnd, effectiveFrom, note }) {
        guard(ctx, 'procWrite');
        return server.write((db, now) => must(addPrice(db, { sku, priceVnd, effectiveFrom, note, by: ctx.role }, now)).entry);
      },

      /** Dự báo 4 tuần theo nhà cung cấp và SKU (không ràng buộc) kèm lần gửi gần nhất. */
      forecast(ctx) {
        guard(ctx, 'procRead');
        return server.read((db, now) => {
          const rows = forecastRows(db, now, cfg);
          return {
            note: 'Dự báo cộng từ các gói đang chạy, gửi nhà cung cấp để họ chuẩn bị. Không ràng buộc mua.',
            weeks: rows[0] ? rows[0].weeks : [],
            suppliers: rows.map((f) => {
              const last = latestForecast(db, f.supplierId);
              return { ...f, lastSentAt: last ? last.createdAt : null };
            })
          };
        });
      },
      sendForecast(ctx) {
        guard(ctx, 'procWrite');
        return server.write((db, now) => must(sendForecast(db, { by: ctx.role }, now)));
      },

      listPos(ctx) {
        guard(ctx, 'procRead');
        return server.read((db, now) =>
          db.purchaseOrders.map((po) => poRow(db, po, now, ctx.role)).sort((a, b) => b.deliveryDay.localeCompare(a.deliveryDay) || a.supplierId.localeCompare(b.supplierId))
        );
      },

      /** Chi tiết một PO: dòng hàng, lịch sử, phiếu nhập, hóa đơn, khiếu nại, đối chiếu 3 chiều, đề xuất món thay khi NCC xác nhận thiếu. */
      getPo(ctx, poId) {
        guard(ctx, 'procRead');
        return server.read((db, now) => {
          const po = findPo(db, poId);
          if (!po) throw notFound('Không tìm thấy PO');
          const proc = ensureProcurement(db);
          const receipts = receiptsOfPo(db, po.id);
          const inv = invoiceOfPo(db, po.id);
          const got = receivedBySku(receipts);
          const impacts = ((db.factory && db.factory.shortages) || []).filter((s) => (po.shortageIds || []).includes(s.id)).map((s) => impactView(db, s));
          return {
            po: poRow(db, po, now, ctx.role),
            lines: po.lines.map((l) => ({ ...l, targetQty: lineTarget(po, l), accepted: got[l.sku] ? got[l.sku].accepted : 0, rejected: got[l.sku] ? got[l.sku].rejected : 0 })),
            receipts,
            invoice: inv ? viewInvoice(inv) : null,
            claims: claimsOfPo(db, po.id),
            match: inv ? threeWayMatch({ po, receipts, invoice: inv, acceptInvoicePrice: Boolean(po.acceptedInvoicePrice) }, cfg) : null,
            impacts,
            supplier: proc.suppliers[po.supplierId] ? profileView(proc.suppliers[po.supplierId], now) : null,
            reasons: RECEIPT_REASONS
          };
        });
      },
      invoiceFile(ctx, invoiceId) {
        guard(ctx, 'procRead');
        return server.read((db) => {
          const inv = ensureProcurement(db).invoices.find((i) => i.id === invoiceId);
          if (!inv || !inv.file) throw notFound('Không có tệp hóa đơn');
          return inv.file;
        });
      },
      editLine(ctx, { poId, sku, qty }) {
        guard(ctx, 'procWrite');
        return server.write((db) => must(editPoLine(db, { poId, sku, qty })).po);
      },
      approvePo(ctx, poId) {
        guard(ctx, 'procWrite');
        return server.write((db, now) => must(approvePo(db, { poId, by: ctx.role }, now)).po);
      },
      /** via: 'link' | 'print'. Gửi = chuyển sang "Đã gửi"; nhà cung cấp thấy PO trong cổng của họ. */
      sendPo(ctx, { poId, via }) {
        guard(ctx, 'procWrite');
        return server.write((db, now) => must(sendPo(db, { poId, via, by: ctx.role }, now)).po);
      },
      /** Mua hàng nhập hộ hóa đơn giấy của nhà cung cấp chưa dùng cổng. */
      submitInvoice(ctx, input) {
        guard(ctx, 'procWrite');
        return server.write((db, now) => viewInvoice(must(submitInvoice(db, { ...input, by: ctx.role }, now)).invoice));
      },
      /** acceptDiff: chấp nhận chênh lệch (bắt buộc ghi lý do). acceptInvoicePrice: trả theo đơn giá hóa đơn thay vì đơn giá PO. */
      matchPo(ctx, input) {
        guard(ctx, 'procWrite');
        return server.write((db, now) => {
          const res = matchPo(db, { ...input, by: ctx.role }, now);
          if (!res.ok) throw toError(res);
          return { po: res.po, match: res.match };
        });
      },
      payPo(ctx, input) {
        guard(ctx, 'payment');
        return server.write((db, now) => must(payPo(db, { ...input, by: ctx.role }, now)));
      },

      /** Công nợ: mỗi PO đã nhận hàng một dòng, tuổi nợ 7 / 15 / 30 ngày, khiếu nại đang trừ. */
      payables(ctx) {
        guard(ctx, 'procRead');
        return server.read((db, now) => {
          const proc = ensureProcurement(db);
          const group = (list) => list.reduce((m, x) => ((m[x.poId] ||= []).push(x), m), {});
          const rows = payableRows(
            { pos: db.purchaseOrders, receiptsByPo: group(proc.receipts), invoicesByPo: Object.fromEntries(proc.invoices.map((i) => [i.poId, i])), claimsByPo: group(proc.claims), now },
            cfg
          );
          const open = rows.filter((r) => r.status === 'matched');
          return {
            rows,
            aging: agingBuckets(rows),
            totals: {
              openVnd: open.reduce((s, r) => s + (r.payableVnd || 0), 0),
              dueVnd: open.filter((r) => r.stage === 'due').reduce((s, r) => s + (r.payableVnd || 0), 0),
              waitingMatchVnd: rows.filter((r) => r.status === 'invoiced').reduce((s, r) => s + (r.invoiceVnd || 0), 0),
              claimOpenVnd: proc.claims.filter((c) => ['open', 'acknowledged'].includes(c.status)).reduce((s, c) => s + c.amountVnd, 0)
            },
            claims: proc.claims.map((c) => ({ ...c, supplierName: SUPPLIERS[c.supplierId] ? SUPPLIERS[c.supplierId].name : c.supplierId, skuName: SKUS[c.sku].name }))
          };
        });
      },

      // ---- Mua nông sản trực tiếp không hóa đơn -> bảng kê thu mua
      directPurchases(ctx) {
        guard(ctx, 'procRead');
        return server.read((db) => ({
          purchases: ensureProcurement(db).purchases.slice().reverse(),
          agriSkus: Object.values(SKUS).filter((s) => s.taxGroup === 'fresh').map((s) => ({ id: s.id, name: s.name, unit: s.unit })),
          sellers: Object.values(ensureProcurement(db).suppliers).filter((p) => ['nong_ho', 'htx'].includes(p.kind)).map((p) => ({ id: p.id, name: p.name, kind: p.kind, cccd: p.cccd, address: p.address, phone: p.contact.phone })),
          cashLimitVnd: cfg.alerts.cashPaymentVatLimitVnd
        }));
      },
      previewStatement(ctx, input) {
        guard(ctx, 'procWrite');
        return server.read((db, now) => {
          const proc = ensureProcurement(db);
          const res = buildStatement({ number: '(chưa lưu)', at: now.toISOString(), seller: input.seller, items: input.items, method: input.method, templateId: proc.settings.statementTemplate, settings: proc.settings }, cfg);
          if (!res.ok) throw toError({ code: 'STATEMENT_INVALID', message: res.errors.join('; '), errors: res.errors });
          return res.statement;
        });
      },
      recordDirectPurchase(ctx, input) {
        guard(ctx, 'procWrite');
        return server.write((db, now) => must(recordDirectPurchase(db, { ...input, by: ctx.role }, now)).purchase);
      },

      /** Cài đặt: mẫu bảng kê thu mua (kế toán chọn). */
      settings(ctx) {
        guard(ctx, 'procRead');
        return server.read((db) => ({
          settings: ensureProcurement(db).settings,
          templates: Object.entries(cfg.purchasing.statementTemplates).map(([id, t]) => ({ id, ...t })),
          canEdit: ['accounting', 'admin'].includes(ctx.role)
        }));
      },
      saveSettings(ctx, input) {
        guard(ctx, 'settingsWrite');
        return server.write((db) => must(saveSettings(db, input)).settings);
      }
    },

    // =========================================================================================
    // KHO PHỤ TP.HCM: nhận hàng, tồn kho, truy xuất và thu hồi
    hub: {
      /** PO còn nhận được (đã gửi, đã xác nhận, nhận một phần), kèm số đã nhận và số còn lại. */
      receivable(ctx) {
        guard(ctx, 'hubOps');
        return server.read((db, now) =>
          db.purchaseOrders
            .filter((po) => PO_OPEN_FOR_RECEIPT.includes(po.status))
            .map((po) => {
              const got = receivedBySku(receiptsOfPo(db, po.id));
              return {
                id: po.id, supplierId: po.supplierId, supplierName: po.supplierName, deliveryDay: po.deliveryDay, status: po.status,
                stageLabel: PO_STATUS_LABEL[poStage(po, now)], confirmedShort: Boolean(po.confirmation && po.confirmation.result === 'short'),
                lines: po.lines.map((l) => {
                  const r = got[l.sku] || { accepted: 0, rejected: 0 };
                  const target = lineTarget(po, l);
                  const sku = SKUS[l.sku];
                  return {
                    sku: l.sku, name: l.name, unit: l.unit, orderedQty: l.qty, targetQty: target, accepted: r.accepted, rejected: r.rejected,
                    remaining: Math.max(0, Math.round((target - r.accepted - r.rejected) * 10) / 10), temp: sku.temp, requiresLot: Boolean(sku.requiresLot)
                  };
                })
              };
            })
            .sort((a, b) => a.deliveryDay.localeCompare(b.deliveryDay))
        );
      },
      receive(ctx, input) {
        guard(ctx, 'hubOps');
        return server.write((db, now) => {
          const res = must(receivePo(db, { ...input, by: ctx.role }, now));
          return { receipt: res.receipt, claims: res.claims, complete: res.complete, status: res.po.status };
        });
      },
      receipts(ctx, { limit = 30 } = {}) {
        guard(ctx, 'hubOps');
        return server.read((db) => ensureProcurement(db).receipts.slice(-limit).reverse().map((r) => ({ ...r, photo: r.photo ? true : false })));
      },

      /** Tồn kho theo lô và hạn dùng (đã sắp theo FEFO), tổng theo SKU, các lần xuất nhập gần đây và hao hụt tháng này. */
      stock(ctx) {
        guard(ctx, 'hubOps');
        return server.read((db, now) => {
          const proc = ensureProcurement(db);
          const range = monthRange(now);
          const summary = stockBySku(proc.stock, now).map((s) => ({ ...s, name: SKUS[s.sku].name, temp: SKUS[s.sku].temp }));
          return {
            now: now.toISOString(),
            warnDays: cfg.inventory.expiryWarnDays,
            lots: stockRows(db, now),
            summary,
            moves: proc.stockMoves.slice(-40).reverse(),
            waste: { month: range.label, ...wasteSummary(proc.stockMoves, range.from, range.to) },
            wasteReasons: cfg.inventory.wasteReasons,
            countReasons: cfg.inventory.countReasons
          };
        });
      },
      /** Xem trước lô sẽ xuất theo FEFO (không ghi). */
      fefoPlan(ctx, { sku, qty }) {
        guard(ctx, 'hubOps');
        return server.read((db, now) => {
          const plan = fefoAllocate(ensureProcurement(db).stock, { sku, qty }, now);
          return { ...plan, allocations: plan.allocations.map((a) => ({ ...a, state: expiryState(a, now) })) };
        });
      },
      issue(ctx, input) {
        guard(ctx, 'hubOps');
        return server.write((db, now) => must(issueStock(db, { ...input, by: ctx.role }, now)));
      },
      waste(ctx, input) {
        guard(ctx, 'hubOps');
        return server.write((db, now) => must(wasteStock(db, { ...input, by: ctx.role }, now)).move);
      },
      count(ctx, input) {
        guard(ctx, 'hubOps');
        return server.write((db, now) => must(countStock(db, { ...input, by: ctx.role }, now)));
      },

      // ---- Truy xuất
      traceLots(ctx) {
        guard(ctx, 'hubOps');
        return server.read((db) => listTraceLots(db, cfg));
      },
      /** Đi ngược từ mã QR / mã lô / mã mẻ: nguồn, mẻ, túi, thùng, đơn. Tên và địa chỉ người nhận chỉ hiện cho kho phụ và admin. */
      trace(ctx, input) {
        guard(ctx, 'hubOps');
        return server.read((db) => {
          const hit = resolveLotCode(db, input);
          if (!hit) throw toError({ code: 'LOT_NOT_FOUND', message: 'Không tìm thấy mã lô, mã mẻ hoặc mã QR này' });
          const t = traceLot(db, hit.lotCode, cfg);
          const byId = new Map(db.orders.map((o) => [o.id, o]));
          return {
            via: hit.via,
            ...t,
            lot: undefined,
            receipt: t.receipt ? { ...t.receipt, photo: Boolean(t.receipt.photo) } : null,
            orders: t.orders.map(({ customerId, ...o }) => ({ ...o, groupLabel: RECALL_GROUP_LABEL[o.group] || '', recipient: recipientFor(byId.get(o.orderId), ctx.role) })),
            recalls: ensureProcurement(db).recalls.filter((r) => r.lotCode === hit.lotCode).map((r) => ({ id: r.id, status: r.status, createdAt: r.createdAt }))
          };
        });
      },

      // ---- Thu hồi
      recalls(ctx) {
        guard(ctx, 'hubOps');
        return server.read((db) =>
          ensureProcurement(db).recalls
            .slice()
            .reverse()
            .map((r) => {
              const orders = recallOrders(db, r, cfg);
              const g = (id) => orders.filter((o) => o.group === id).length;
              return {
                id: r.id, lotCode: r.lotCode, skuName: SKUS[r.sku] ? SKUS[r.sku].name : r.sku, reason: r.reason, status: r.status, createdAt: r.createdAt, closedAt: r.closedAt,
                counts: { not_shipped: g('not_shipped'), in_transit: g('in_transit'), delivered: g('delivered'), total: orders.length },
                notified: Object.keys(r.notified).length, held: Object.keys(r.held).length, compensated: Object.keys(r.compensated).length
              };
            })
        );
      },
      createRecall(ctx, { lotCode, reason }) {
        guard(ctx, 'hubOps');
        return server.write((db, now) => must(createRecall(db, { lotCode, reason, by: ctx.role }, now, cfg)).recall);
      },
      /** Chi tiết đợt thu hồi: đơn bị ảnh hưởng theo nhóm trạng thái, món thay đề xuất cho đơn chưa xuất, các việc đã làm, báo cáo. */
      recall(ctx, recallId) {
        guard(ctx, 'hubOps');
        return server.read((db) => {
          const recall = ensureProcurement(db).recalls.find((r) => r.id === recallId);
          if (!recall) throw notFound('Không tìm thấy đợt thu hồi');
          const report = recallReportData(db, recall, cfg);
          const byId = new Map(db.orders.map((o) => [o.id, o]));
          const subs = recallSubstitutions(db, recallId, cfg);
          const orders = report.orders.map(({ customerId, ...o }) => {
            const order = byId.get(o.orderId);
            return {
              ...o,
              groupLabel: RECALL_GROUP_LABEL[o.group] || '',
              dishes: affectedDishNames(order, recall.sku),
              recipient: recipientFor(order, ctx.role),
              heldAt: recall.held[o.orderId] || null,
              notifiedAt: recall.notified[o.orderId] || null,
              compensation: recall.compensated[o.orderId] || null,
              suggestions: (subs.find((s) => s.orderId === o.orderId) || { hits: [] }).hits
            };
          });
          return {
            recall: { ...recall, log: recall.log.slice() },
            skuName: report.skuName,
            source: report.trace ? report.trace.source : null,
            batches: report.trace ? report.trace.batches : [],
            bagsMade: report.trace ? report.trace.bagsMade : 0,
            stock: report.trace ? report.trace.stock : [],
            groups: report.groups,
            totals: report.totals,
            orders,
            canCompensate: ['purchasing', 'admin'].includes(ctx.role)
          };
        });
      },
      holdOrders(ctx, { recallId, orderIds }) {
        guard(ctx, 'hubOps');
        return server.write((db, now) => must(holdOrders(db, { recallId, orderIds, by: ctx.role }, now, cfg)));
      },
      notifyCustomers(ctx, { recallId, orderIds }) {
        guard(ctx, 'hubOps');
        return server.write((db, now) => must(notifyCustomers(db, { recallId, orderIds, by: ctx.role }, now, cfg)));
      },
      /** Bù Fresh Credit là tiền của MOVA nên chỉ mua hàng và admin được bấm. */
      compensate(ctx, { recallId, orderIds, amountVnd }) {
        guard(ctx, 'recallCompensate');
        return server.write((db, now) => must(compensateOrders(db, { recallId, orderIds, amountVnd, by: ctx.role }, now, cfg)));
      },
      wasteHeldStock(ctx, { recallId }) {
        guard(ctx, 'hubOps');
        return server.write((db, now) => must(wasteHeldStock(db, { recallId, by: ctx.role }, now)));
      },
      closeRecall(ctx, { recallId, note }) {
        guard(ctx, 'hubOps');
        return server.write((db, now) => must(closeRecall(db, { recallId, note, by: ctx.role }, now)).recall);
      }
    },

    // =========================================================================================
    // CỔNG NHÀ CUNG CẤP: chỉ dữ liệu của chính nhà cung cấp đang đăng nhập
    supplierPortal: {
      /** Một lần tải đủ cho cổng: hồ sơ, PO, dự báo 4 tuần, lịch giao, công nợ, khiếu nại. */
      overview(ctx, { asSupplierId = null } = {}) {
        const sid = portalId(ctx, asSupplierId);
        return server.read((db, now) => {
          const proc = ensureProcurement(db);
          const profile = proc.suppliers[sid];
          const pos = db.purchaseOrders.filter((po) => po.supplierId === sid);
          const rowsAll = payableRows(
            {
              pos,
              receiptsByPo: Object.fromEntries(pos.map((po) => [po.id, receiptsOfPo(db, po.id)])),
              invoicesByPo: Object.fromEntries(proc.invoices.filter((i) => i.supplierId === sid).map((i) => [i.poId, i])),
              claimsByPo: Object.fromEntries(pos.map((po) => [po.id, claimsOfPo(db, po.id)])),
              now
            },
            cfg
          );
          const forecast = latestForecast(db, sid);

          // Lịch giao: nhà cung cấp có hàng thì theo PO của mình; nhà xe và đội giao theo chuyến / ngày giao
          const schedule = [];
          for (const po of pos) {
            if (['draft', 'approved'].includes(po.status)) continue;
            schedule.push({ day: po.deliveryDay, kind: 'po', label: `PO ${po.id}`, detail: `${po.lines.length} mặt hàng`, status: po.status });
          }
          if (['long_haul', 'last_mile'].includes(SUPPLIERS[sid].type)) {
            for (const d of buildDemandDays(db, cfg)) {
              if (d.day < dayKey(now) || !d.totals.boxes) continue;
              if (SUPPLIERS[sid].type === 'long_haul') {
                for (const t of cfg.factory.trips) {
                  const boxes = d.lists.filter((l) => l.tripId === t.id).length;
                  if (boxes) schedule.push({ day: d.day, kind: 'trip', label: `${t.label} rời Đắk Lắk`, detail: `${boxes} thùng`, at: tripDepartAt(d.day, t).toISOString(), status: d.closed ? 'closed' : 'forecast' });
                }
              } else {
                schedule.push({ day: d.day, kind: 'delivery', label: 'Giao tới khách', detail: `${d.totals.boxes} thùng`, status: d.closed ? 'closed' : 'forecast' });
              }
            }
          }
          schedule.sort((a, b) => a.day.localeCompare(b.day) || (a.at || '').localeCompare(b.at || ''));

          return {
            now: now.toISOString(),
            supplier: { id: sid, name: SUPPLIERS[sid].name, type: SUPPLIERS[sid].type },
            profile: profile ? profileView(profile, now) : null,
            certAlerts: profile ? certAlerts([profile], now) : [],
            pos: pos.map((po) => ({ ...poRow(db, po, now, 'supplier'), canConfirm: po.status === 'sent', canInvoice: ['received', 'received_partial'].includes(po.status) })).filter((p) => !['draft', 'approved'].includes(p.status)).sort((a, b) => b.deliveryDay.localeCompare(a.deliveryDay)),
            forecast: forecast ? { createdAt: forecast.createdAt, weeks: forecast.weeks, boxes: forecast.boxes, rows: forecast.rows, note: 'Dự báo tham khảo để bạn chuẩn bị hàng, MOVA không bắt buộc mua đúng số này.' } : null,
            schedule,
            payables: rowsAll.map(({ supplierId, supplierName, ...r }) => r),
            claims: proc.claims.filter((c) => c.supplierId === sid).map((c) => ({ ...c, skuName: SKUS[c.sku].name })).reverse(),
            invoices: proc.invoices.filter((i) => i.supplierId === sid).map(viewInvoice).reverse(),
            reasons: RECEIPT_REASONS
          };
        });
      },

      /** Xác nhận PO đủ hoặc thiếu. `shortPct` (0–1) đặt nhanh mọi dòng thiếu cùng một tỷ lệ; không thì gửi `lines`. */
      confirmPo(ctx, { poId, result, lines = [], shortPct = null, note = '', asSupplierId = null }) {
        const sid = portalId(ctx, asSupplierId);
        return server.write((db, now) => {
          const po = findPo(db, poId);
          if (!po || po.supplierId !== sid) throw notFound('Không tìm thấy PO');
          const use = shortPct != null ? po.lines.map((l) => ({ sku: l.sku, confirmedQty: Math.round(l.qty * (1 - Number(shortPct)) * 10) / 10 })) : lines;
          const res = must(confirmPo(db, { poId, result: shortPct != null ? 'short' : result, lines: use, note, by: SUPPLIERS[sid].name }, now));
          return { po: viewPo(res.po, 'supplier') };
        });
      },

      submitInvoice(ctx, { poId, number, issuedAt, lines, file = null, asSupplierId = null }) {
        const sid = portalId(ctx, asSupplierId);
        return server.write((db, now) => {
          const po = findPo(db, poId);
          if (!po || po.supplierId !== sid) throw notFound('Không tìm thấy PO');
          return viewInvoice(must(submitInvoice(db, { poId, number, issuedAt, lines, file, by: SUPPLIERS[sid].name, supplierId: sid }, now)).invoice);
        });
      },

      replyClaim(ctx, { claimId, reply, asSupplierId = null }) {
        const sid = portalId(ctx, asSupplierId);
        return server.write((db) => must(replyClaim(db, { claimId, supplierId: sid, reply })).claim);
      },

      /** Nhà cung cấp tự cập nhật người liên hệ và thêm giấy chứng nhận mới (tài khoản ngân hàng và mã số thuế do MOVA nhập). */
      updateContact(ctx, { name, phone, asSupplierId = null }) {
        const sid = portalId(ctx, asSupplierId);
        return server.write((db, now) => {
          const p = ensureProcurement(db).suppliers[sid];
          if (!p) throw notFound('Không tìm thấy hồ sơ');
          const next = { ...p, contact: { name: String(name || '').trim() || p.contact.name, phone: String(phone || '').trim() || p.contact.phone } };
          must(saveSupplierProfile(db, next, now));
          return { ok: true };
        });
      },
      addCert(ctx, { cert, asSupplierId = null }) {
        const sid = portalId(ctx, asSupplierId);
        return server.write((db, now) => must(addCert(db, { supplierId: sid, cert }, now)).cert);
      }
    }
  };
}
