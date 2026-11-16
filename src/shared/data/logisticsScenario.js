import { applyFactoryOp, buildDemandDays, emptyFactory, scopeKey } from '../domain/factory';
import { applyOrderStatus } from '../domain/opsEvents';

/**
 * Dựng chuyến xe mẫu cho bảng demo (chỉ admin): trên ngày đã chốt sổ (mặc định ngày chốt gần nhất chưa xuất bến), xưởng đóng đủ
 * thùng, lên xe và xuất bến cả hai chuyến với nhiệt độ và số niêm phong. Dùng đúng các hàm ghi thật của xưởng (`applyFactoryOp`,
 * `applyOrderStatus`) trong MỘT lần ghi để không phải ghi hàng trăm lần vào bộ nhớ trình duyệt.
 */
export function seedTripsScenario(server, cfg, opts = {}) {
  return server.write((db, now) => {
    db.factory = db.factory || emptyFactory();
    const f = db.factory;
    const demand = buildDemandDays(db, cfg, { closedOnly: true });
    const fresh = (d) => cfg.factory.trips.some((t) => !(f.loads[scopeKey(d.day, t.id)] && f.loads[scopeKey(d.day, t.id)].departedAt));
    const target = opts.day ? demand.find((d) => d.day === opts.day) : demand.find((d) => d.day >= now.toISOString().slice(0, 10) && fresh(d)) || demand.find(fresh);
    if (!target) {
      const e = new Error('Chưa có ngày nào chốt sổ để dựng chuyến xe. Hãy bấm "Tới giờ chốt sổ" trước.');
      e.code = 'NO_PLAN';
      throw e;
    }
    const at = now.toISOString();
    let n = 0;
    const op = (o) => applyFactoryOp(f, { ...o, at, opId: `seed-trips-${target.day}-${(n += 1)}` }, cfg);
    const departed = [];
    for (const t of cfg.factory.trips) {
      const scope = scopeKey(target.day, t.id);
      if (f.loads[scope] && f.loads[scope].departedAt) continue;
      const lists = target.lists.filter((l) => l.tripId === t.id);
      for (const l of lists) {
        for (const it of l.items) if (!it.hub) op({ type: 'tick', orderId: l.orderId, key: it.key, count: it.bags });
        op({ type: 'closeBox', orderId: l.orderId });
        op({ type: 'load', scope, orderId: l.orderId, loaded: true });
        const o = db.orders.find((x) => x.id === l.orderId);
        if (o && o.status === 'locked') applyOrderStatus(db, { orderId: o.id, status: 'in_production' }, now);
      }
      const r = op({ type: 'depart', scope, tempC: 2.5, sealNo: `SEAL-${target.day.replace(/-/g, '')}-${t.id}`, expected: lists.map((l) => l.orderId) });
      if (r.ok) departed.push({ scope, boxes: lists.length });
    }
    return { day: target.day, departed, boxes: departed.reduce((s, x) => s + x.boxes, 0) };
  });
}
