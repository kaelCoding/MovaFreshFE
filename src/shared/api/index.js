import { BUSINESS } from '../config/business';
import { ROLES } from '../config/roles';
import { SKUS, SUPPLIERS, SAUCES } from '../data/catalog';
import { getServer } from '../mock-server/server';
import { cutoffAtFor } from '../domain/delivery';
import { applyOrderStatus, applySubstitution, upsertLot } from '../domain/opsEvents';
import { dishItemGrams, emptyFactory, shortageGrams } from '../domain/factory';
import { createCustomerApi } from './customer';
import { createOpsFactoryApi } from './opsFactory';
import { ForbiddenError, viewOrder, viewSupplier } from './views';

export { ForbiddenError };

const ROLE_CAN = {
  listOrders: ['workshop', 'hub', 'shipper', 'dispatch', 'purchasing', 'accounting', 'admin'],
  productionPlans: ['workshop', 'hub', 'dispatch', 'purchasing', 'accounting', 'admin'],
  purchaseOrders: ['purchasing', 'accounting', 'admin', 'supplier'],
  suppliers: ['purchasing', 'accounting', 'admin', 'supplier'],
  demo: ['admin'],
  // Ghi trạng thái giao và thông báo cho khách (xưởng báo đang sản xuất, kho / shipper báo đang giao, đã giao)
  fulfilment: ['workshop', 'hub', 'shipper', 'dispatch', 'admin'],
  substitution: ['workshop', 'hub', 'dispatch', 'admin'],
  lots: ['workshop', 'admin'],
  // P2A: kế hoạch & chốt sổ (điều phối, mua hàng, admin); xưởng ghi (xưởng, admin); xưởng đọc (thêm điều phối, mua hàng)
  planning: ['dispatch', 'purchasing', 'admin'],
  factory: ['workshop', 'admin'],
  factoryRead: ['workshop', 'admin', 'dispatch', 'purchasing']
};

const fromEvent = (res) => {
  if (!res.ok) {
    const e = new Error(res.message);
    e.code = res.code;
    throw e;
  }
  return res;
};

function guard(ctx, action) {
  if (!ctx || !ROLE_CAN[action].includes(ctx.role)) throw new ForbiddenError();
}

/**
 * API dùng chung cho app khách và app vận hành. Hình dạng các luồng đã có khớp
 * movafresh-platform/docs/api-contract.json; chỗ khác contract xem docs/contract-changes.md.
 */
export function createApi(server = getServer()) {
  const cfg = server.cfg || BUSINESS;

  return {
    // ---------- Đăng nhập app vận hành (PIN demo) ----------
    auth: {
      login(pin) {
        for (const [role, def] of Object.entries(ROLES)) {
          if (def.pin && def.pin === String(pin)) return { role, label: def.label, home: def.home, supplierId: null };
        }
        const sup = Object.values(SUPPLIERS).find((s) => s.pin === String(pin));
        if (sup) return { role: 'supplier', label: `${ROLES.supplier.label}: ${sup.name}`, home: ROLES.supplier.home, supplierId: sup.id };
        return null;
      }
    },

    // ---------- App khách (khớp api-contract.json; phần thêm cho phễu /plans xem docs/contract-changes.md) ----------
    customer: createCustomerApi(server, cfg),

    // ---------- App vận hành (đã lọc theo vai trò) ----------
    ops: {
      ...createOpsFactoryApi(server, cfg, (ctx, action) => guard(ctx, action)),

      /** Chạy các job đã tới hạn (trừ tiền, chốt sổ, nhắc khách). Mọi vai trò đã đăng nhập đều gọi được. */
      tick(ctx) {
        if (!ctx) throw new ForbiddenError();
        return server.tick();
      },

      listOrders(ctx, { day = null, status = null } = {}) {
        guard(ctx, 'listOrders');
        return server.read((db) =>
          db.orders
            .filter((o) => (!day || o.deliveryDay === day) && (!status || o.status === status))
            .map((o) => viewOrder(o, ctx.role))
        );
      },

      listProductionPlans(ctx) {
        guard(ctx, 'productionPlans');
        return server.read((db) => [...db.productionPlans]);
      },

      getProductionPlan(ctx, day) {
        guard(ctx, 'productionPlans');
        return server.read((db) => db.productionPlans.find((p) => p.day === day) || null);
      },

      listPurchaseOrders(ctx) {
        guard(ctx, 'purchaseOrders');
        return server.read((db) =>
          db.purchaseOrders.filter((po) => ctx.role !== 'supplier' || po.supplierId === ctx.supplierId)
        );
      },

      listSuppliers(ctx) {
        guard(ctx, 'suppliers');
        return server.read(() =>
          Object.values(SUPPLIERS)
            .filter((s) => ctx.role !== 'supplier' || s.id === ctx.supplierId)
            .map(viewSupplier)
        );
      },

      /**
       * Đổi trạng thái đơn sau chốt sổ: 'in_production' | 'shipped' | 'delivered' | 'redelivery' (giao lại).
       * Ghi thông báo cho khách (đang giao, đã giao kèm ảnh, giao lại). P2A / P2C gọi hàm này.
       * Ném Error có `code` nếu đơn không hợp lệ. Không trả về dữ liệu khách.
       */
      setOrderStatus(ctx, { orderId, status, photoUrl = null, note = '' }) {
        guard(ctx, 'fulfilment');
        return server.write((db, now) => {
          const res = fromEvent(applyOrderStatus(db, { orderId, status, photoUrl, note }, now));
          return { orderId: res.order.id, status: res.order.status };
        });
      },

      /**
       * Nhà máy thiếu hàng nên thay món. Đổi món trong đơn, bù vào Fresh Credit của khách (mặc định phần chênh giá)
       * và báo khách. kind: 'protein' | 'veg' | 'soup' | 'carb' | 'dessert'.
       */
      substituteDish(ctx, { orderId, mealIndex, kind, toDishId, reason = '', compensationVnd = null, shortageId = null, opId = null }) {
        guard(ctx, 'substitution');
        return server.write((db, now) => {
          // P2A: opId khử trùng khi máy xưởng gửi lại (không bù hai lần); shortageId ghi đơn này đã được báo khách
          // vào báo cáo thiếu / hỏng của xưởng.
          db.factory = db.factory || emptyFactory();
          if (opId && db.factory.opIds.includes(opId)) return { orderId, compensationVnd: 0, duplicate: true };
          const before = db.orders.find((o) => o.id === orderId);
          const meal = before && before.meals.find((m) => m.index === mealIndex);
          const fromDishId = meal ? meal.dishes[kind] : null;
          const shortage = shortageId ? db.factory.shortages.find((s) => s.id === shortageId) : null;
          const grams = shortage && meal ? dishItemGrams(fromDishId, shortage.key, meal, before.householdSize) : 0;
          const res = fromEvent(applySubstitution(db, { orderId, mealIndex, kind, toDishId, reason, compensationVnd }, now));
          if (opId) db.factory.opIds.push(opId);
          if (shortage) {
            shortage.handled.push({ orderId, mealIndex, kind, fromDishId, toDishId, compensationVnd: res.compensationVnd, grams, at: now.toISOString() });
            if (shortage.status === 'open' && shortageGrams(shortage) - shortage.handled.reduce((s, h) => s + h.grams, 0) <= 0) shortage.status = 'resolved';
          }
          return { orderId: res.order.id, compensationVnd: res.compensationVnd };
        });
      },

      /** Xưởng ghi lô nguyên liệu / nhãn QR vào db.lots (trang /q/:code đọc từ đây). Khóa là qr_code. */
      saveLot(ctx, lot) {
        guard(ctx, 'lots');
        return server.write((db) => fromEvent(upsertLot(db, lot)).lot);
      },

      listLots(ctx) {
        guard(ctx, 'lots');
        return server.read((db) => [...(db.lots || [])]);
      },

      catalog(ctx) {
        if (!ctx) throw new ForbiddenError();
        return { skus: SKUS, sauces: SAUCES };
      },

      /** Tóm tắt nhanh cho màn hình chính theo vai trò. */
      summary(ctx) {
        if (!ctx) throw new ForbiddenError();
        return server.read((db, now) => {
          const out = { now: now.toISOString() };
          if (ROLE_CAN.listOrders.includes(ctx.role)) {
            const byStatus = {};
            for (const o of db.orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
            out.ordersByStatus = byStatus;
            out.ordersTotal = db.orders.length;
          }
          if (ROLE_CAN.productionPlans.includes(ctx.role)) {
            out.closedPlans = db.productionPlans.length;
          }
          if (ROLE_CAN.purchaseOrders.includes(ctx.role)) {
            out.purchaseOrders = db.purchaseOrders.filter((po) => ctx.role !== 'supplier' || po.supplierId === ctx.supplierId).length;
          }
          return out;
        });
      }
    },

    // ---------- Bảng demo (chỉ admin) ----------
    demo: {
      state(ctx) {
        guard(ctx, 'demo');
        return server.read((db, now) => {
          const scheduled = db.orders.filter((o) => o.status === 'scheduled');
          const days = [...new Set(db.orders.map((o) => o.deliveryDay))].sort();
          return {
            now: now.toISOString(),
            running: db.clock.running,
            counts: Object.fromEntries(
              ['scheduled', 'paid', 'charge_failed', 'locked', 'skipped_unpaid'].map((s) => [s, db.orders.filter((o) => o.status === s).length])
            ),
            nextCharge: scheduled.map((o) => o.chargeAt).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            nextCutoff: days.filter((d) => !db.firedJobs[`cutoff:${d}`]).map((d) => cutoffAtFor(d, cfg).toISOString()).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            nextDelivery: db.orders.map((o) => o.deliveryAt).filter((t) => Date.parse(t) > now.getTime()).sort()[0] || null,
            firedCutoffs: Object.keys(db.firedJobs).filter((k) => k.startsWith('cutoff:')),
            plans: db.productionPlans.length,
            purchaseOrders: db.purchaseOrders.length
          };
        });
      },

      setNow(ctx, iso) {
        guard(ctx, 'demo');
        return server.setNow(iso);
      },

      /** kind: 'charge' | 'cutoff' | 'delivery' — nhảy tới ngay sau mốc kế tiếp. */
      jumpTo(ctx, kind) {
        guard(ctx, 'demo');
        const st = this.state(ctx);
        const target = { charge: st.nextCharge, cutoff: st.nextCutoff, delivery: st.nextDelivery }[kind];
        if (!target) return [];
        return server.setNow(new Date(Date.parse(target) + 60 * 1000));
      },

      tick(ctx) {
        guard(ctx, 'demo');
        return server.tick();
      },

      reset(ctx) {
        guard(ctx, 'demo');
        server.reset();
      }
    }
  };
}

export const api = createApi();
