import { BUSINESS } from '../config/business';
import { ROLES } from '../config/roles';
import { SKUS, SUPPLIERS, SAUCES } from '../data/catalog';
import { getServer } from '../mock-server/server';
import { cutoffAtFor } from '../domain/delivery';
import { createCustomerApi } from './customer';
import { ForbiddenError, viewOrder, viewSupplier } from './views';

export { ForbiddenError };

const ROLE_CAN = {
  listOrders: ['workshop', 'hub', 'shipper', 'dispatch', 'purchasing', 'accounting', 'admin'],
  productionPlans: ['workshop', 'hub', 'dispatch', 'purchasing', 'accounting', 'admin'],
  purchaseOrders: ['purchasing', 'accounting', 'admin', 'supplier'],
  suppliers: ['purchasing', 'accounting', 'admin', 'supplier'],
  demo: ['admin']
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
