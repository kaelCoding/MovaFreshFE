<template>
  <section v-if="snapshot && snapshot.days.length" class="today">
    <div class="ops-noprint">
      <h1>Hôm nay làm</h1>
      <p class="ops-muted">
        {{ fmtDay(selDay) }} · {{ tripInfo ? tripInfo.label : '' }}: cần làm
        <strong data-testid="sum-bags">{{ totalNeed }} túi</strong> ({{ kg(totalKg) }} kg), <strong>{{ sauceNeed }} túi xốt</strong>,
        <strong>{{ tripOrders.length }} thùng</strong>.
      </p>
    </div>

    <section class="ops-card ops-noprint" aria-label="Túi theo SKU">
      <h2>Túi theo SKU <small class="ops-muted">đã làm / cần làm</small></h2>
      <div v-if="skuLines.length" class="count-list">
        <CountRow
          v-for="l in skuLines"
          :key="l.key"
          :item-key="l.key" :name="l.name" :temp="l.temp" :need="l.need" :done="l.done" :bag-grams="l.bagGrams" :kg="l.kg" :quick="quick"
          :pending="isPending(l.key)"
          @add="(n) => add(l.key, n)"
          @set="(n) => setTo(l.key, n)"
        />
      </div>
      <p v-else class="ops-muted">Chuyến này không có túi nguyên liệu.</p>
    </section>

    <section class="ops-card ops-noprint" aria-label="Túi xốt theo mã">
      <h2>Túi xốt theo mã <small class="ops-muted">đã làm / cần làm</small></h2>
      <div v-if="sauceLines.length" class="count-list">
        <CountRow
          v-for="l in sauceLines"
          :key="l.key"
          :item-key="l.key" :name="`${l.name} (${l.key})`" :temp="l.temp" :need="l.need" :done="l.done" :bag-grams="l.bagGrams" :kg="l.kg" :quick="quick"
          :pending="isPending(l.key)"
          @add="(n) => add(l.key, n)"
          @set="(n) => setTo(l.key, n)"
        />
      </div>
      <p v-else class="ops-muted">Chuyến này không có gói xốt.</p>
    </section>

    <section class="ops-card ops-noprint" aria-label="Thùng theo xe">
      <h2>Thùng theo xe <small class="ops-muted">đã đóng / cần đóng</small></h2>
      <div class="trip-list">
        <article v-for="t in tripRows" :key="t.id" class="trip-card" :class="{ on: t.id === selTrip }" :data-trip-card="t.id">
          <header>
            <strong>{{ t.label }}</strong> · xe rời {{ hhmm(t.departAt) }}
            <span v-if="t.departedAt" class="ops-pill ops-pill-ok">Đã xuất bến {{ hhmm(t.departedAt) }}</span>
          </header>
          <div class="count-num"><span data-testid="boxes-packed">{{ t.packed }}</span><span class="count-sep"> / </span><span>{{ t.boxes }}</span> thùng đã đóng</div>
          <div class="ops-bar-track"><div class="ops-bar-fill" :style="{ width: t.pct + '%' }"></div></div>
          <p class="ops-muted">Đã lên xe: {{ t.loaded }} / {{ t.boxes }} thùng</p>
        </article>
      </div>
      <div class="ops-actions">
        <RouterLink to="/xuong/dong-goi" class="ops-btn ops-btn-primary">Tới đóng gói</RouterLink>
        <RouterLink to="/xuong/xuat-xe" class="ops-btn">Tới xuất xe</RouterLink>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { fmtDay } from '../../../shared/utils/time';
import { apply, hasUnsent } from '../../queue';
import { catalog, factory, lines, scope, selDay, selTrip, snapshot, tripInfo, tripOrders } from '../../factoryStore';
import { hhmm, kg } from '../../format';
import CountRow from '../../components/CountRow.vue';

const quick = computed(() => (catalog.value ? catalog.value.quickAdds : [10, 50]));
const skuLines = computed(() => lines.value.filter((l) => l.type === 'sku'));
const sauceLines = computed(() => lines.value.filter((l) => l.type === 'sauce'));
const totalNeed = computed(() => skuLines.value.reduce((s, l) => s + l.need, 0));
const totalKg = computed(() => skuLines.value.reduce((s, l) => s + l.kg, 0));
const sauceNeed = computed(() => sauceLines.value.reduce((s, l) => s + l.need, 0));

const isPending = (key) => hasUnsent((a) => a.type === 'progress' && a.scope === scope.value && a.key === key);
const add = (key, n) => apply('progress', { scope: scope.value, key, delta: n });
const setTo = (key, n) => apply('progress', { scope: scope.value, key, set: n });

// Thùng theo xe: số thùng đã đóng và đã lên xe của từng chuyến trong ngày đang chọn (đã cộng thao tác chưa gửi)
const tripRows = computed(() => {
  const snap = snapshot.value;
  if (!snap) return [];
  const f = factory.value;
  return snap.trips.map((t) => {
    const lists = snap.orders.filter((o) => o.tripId === t.id);
    const packed = lists.filter((o) => f.boxes[o.orderId] && f.boxes[o.orderId].packedAt).length;
    const load = f.loads[`${selDay.value}|${t.id}`];
    const loaded = load ? Object.keys(load.loaded).filter((id) => lists.some((o) => o.orderId === id)).length : 0;
    return { ...t, packed, loaded, departedAt: load && load.departedAt ? load.departedAt : t.departedAt, pct: lists.length ? Math.round((packed / lists.length) * 100) : 0 };
  });
});
</script>
