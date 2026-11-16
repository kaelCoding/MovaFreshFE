<template>
  <section v-if="snap && snap.days.length" class="ops-card ops-noprint daytrip" aria-label="Ngày giao và chuyến xe">
    <div class="daytrip-row">
      <span class="daytrip-label">Ngày giao</span>
      <div class="chips">
        <button v-for="d in snap.days" :key="d.day" class="chip" :class="{ on: d.day === selDay }" :data-day="d.day" @click="setDay(d.day)">
          {{ shortDay(d.day) }} <small>{{ d.boxes }} thùng</small>
        </button>
      </div>
    </div>
    <div class="daytrip-row">
      <span class="daytrip-label">Chuyến xe</span>
      <div class="chips">
        <button v-for="t in snap.trips" :key="t.id" class="chip" :class="{ on: t.id === selTrip }" :data-trip="t.id" @click="setTrip(t.id)">
          {{ t.label }} · {{ hhmm(t.departAt) }} <small>{{ t.boxes }} thùng</small>
          <em v-if="liveDeparted(t)" class="chip-tag">đã xuất bến</em>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { snapshot as snap, selDay, selTrip, setDay, setTrip, factory } from '../factoryStore';
import { dowOfKey, parseDayKey, vnParts } from '../../shared/utils/time';

const pad = (n) => String(n).padStart(2, '0');
// "T2 23/11"
const shortDay = (key) => {
  const { m, d } = parseDayKey(key);
  const dow = dowOfKey(key);
  return `${dow === 0 ? 'CN' : 'T' + (dow + 1)} ${pad(d)}/${pad(m)}`;
};
const hhmm = (iso) => {
  const p = vnParts(new Date(iso));
  return `${pad(p.h)}:${pad(p.min)}`;
};
// Đã xuất bến tính cả thao tác chưa gửi
const liveDeparted = (t) => {
  const l = factory.value.loads[`${selDay.value}|${t.id}`];
  return Boolean(l && l.departedAt);
};
</script>
