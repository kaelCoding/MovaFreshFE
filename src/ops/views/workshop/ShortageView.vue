<template>
  <section class="shortage">
    <h1>Báo thiếu / hỏng</h1>
    <p class="ops-muted">Báo mặt hàng thiếu hoặc hỏng. Hệ thống liệt kê các đơn bị ảnh hưởng (chỉ mã đơn, khu, khung giờ) và đề xuất món thay. Bấm "Báo khách + bù Fresh Credit" để khách nhận thông báo món thay.</p>

    <form class="ops-card" novalidate @submit.prevent="submit">
      <h2>Báo cáo mới cho {{ selDay ? fmtDay(selDay) : '' }}</h2>
      <label for="s-key">Mặt hàng</label>
      <select id="s-key" v-model="key" class="ops-input" data-testid="s-key">
        <option value="" disabled>Chọn mặt hàng</option>
        <option v-for="i in itemOptions" :key="i.key" :value="i.key">{{ i.name }}</option>
      </select>

      <div class="field-row">
        <div>
          <label for="s-qty">Số lượng</label>
          <input id="s-qty" v-model="qty" class="ops-input" type="number" inputmode="decimal" min="0" step="any" data-testid="s-qty" />
        </div>
        <div>
          <label for="s-unit">Đơn vị</label>
          <select id="s-unit" v-model="unit" class="ops-input" data-testid="s-unit">
            <option value="bag">túi</option>
            <option value="kg">kg</option>
          </select>
        </div>
      </div>

      <fieldset class="verdict">
        <legend>Loại báo cáo</legend>
        <button type="button" class="ops-btn" :class="{ on: kind === 'short' }" data-testid="kind-short" @click="kind = 'short'">Thiếu hàng</button>
        <button type="button" class="ops-btn" :class="{ on: kind === 'damaged' }" data-testid="kind-damaged" @click="kind = 'damaged'">Hàng hỏng</button>
      </fieldset>

      <label>Ảnh {{ kind === 'damaged' ? '(bắt buộc với hàng hỏng)' : '(nên chụp nếu có)' }}</label>
      <PhotoInput v-model="photo" testid="s-photo" />
      <label for="s-note">Ghi chú</label>
      <input id="s-note" v-model="note" class="ops-input" autocomplete="off" />

      <p v-if="error" class="ops-error" role="alert" data-testid="s-error">{{ error }}</p>
      <button class="ops-btn ops-btn-primary ops-btn-block" type="submit" data-testid="s-submit">Gửi báo cáo</button>
    </form>

    <section v-for="r in reports" :key="r.id" class="ops-card report" :data-report="r.id">
      <header class="report-head">
        <div>
          <strong>{{ r.name }}</strong>
          <span class="ops-pill" :class="r.kind === 'damaged' ? 'ops-pill-bad' : 'ops-pill-warn'">{{ r.kind === 'damaged' ? 'Hỏng' : 'Thiếu' }}</span>
          <span v-if="r.pending" class="ops-pill ops-pill-warn" data-testid="row-unsent">chưa gửi</span>
          <span v-if="r.status === 'resolved'" class="ops-pill ops-pill-ok">Đã xử lý hết</span>
          <span v-if="r.status === 'closed'" class="ops-pill">Đã đóng</span>
        </div>
        <div class="ops-muted">{{ r.id }} · {{ r.qty }} {{ r.unit === 'bag' ? 'túi' : 'kg' }} · {{ fmtDeadline(new Date(r.at)) }}{{ r.note ? ` · ${r.note}` : '' }}</div>
        <img v-if="r.photo" :src="r.photo" alt="Ảnh báo cáo" class="receipt-photo" />
      </header>

      <p v-if="r.pending" class="ops-muted">Báo cáo chưa gửi lên hệ thống. Khi có mạng sẽ tự gửi, sau đó danh sách đơn bị ảnh hưởng hiện ra ở đây.</p>
      <template v-else-if="impacts[r.id]">
        <p v-if="impacts[r.id].error" class="ops-error" role="alert">{{ impacts[r.id].error }}</p>
        <template v-else>
          <p>
            <strong data-testid="affected-count">{{ impacts[r.id].affected.length }}</strong> đơn bị ảnh hưởng
            <span class="ops-muted">(lượng thiếu {{ kgText(impacts[r.id].needGrams) }}, các đơn giao muộn nhất bị chọn trước)</span>
          </p>
          <div v-if="rowsOf(r).length" class="ops-actions">
            <button class="ops-btn ops-btn-primary" data-testid="notify-all" @click="notifyAll(r)">Báo khách + bù Fresh Credit cho tất cả</button>
          </div>
          <ul class="impact-list">
            <li v-for="row in rowsOf(r)" :key="row.k" class="impact" :data-order="row.orderId">
              <div class="impact-info">
                <strong class="mono">{{ row.orderId }}</strong>
                <span class="ops-muted">{{ zoneName(row.zoneId) }} · {{ slotLabel(row.zoneId, row.slotId) }} · {{ shortDay(row.deliveryDay) }}</span>
                <div>{{ row.dishName }} <span class="ops-muted">→</span></div>
              </div>
              <div v-if="row.options.length" class="impact-pick">
                <select v-model="choice[row.k]" class="ops-input" :aria-label="`Món thay cho ${row.orderId}`" data-testid="sub-select">
                  <option v-for="o in row.options" :key="o.dishId" :value="o.dishId">{{ o.name }}{{ o.compensationVnd > 0 ? ` (bù ${fmt(o.compensationVnd)})` : '' }}</option>
                </select>
                <button class="ops-btn ops-btn-primary" :disabled="row.pending" data-testid="notify-one" @click="notify(r, row)">
                  {{ row.pending ? 'Chưa gửi' : 'Báo khách + bù Fresh Credit' }}
                </button>
              </div>
              <p v-else class="ops-error">Chưa có món thay phù hợp, báo điều phối xử lý.</p>
            </li>
          </ul>
          <div v-if="impacts[r.id].handled.length" class="handled">
            <h3>Đã báo khách ({{ impacts[r.id].handled.length }})</h3>
            <ul class="ops-list" data-testid="handled-list">
              <li v-for="h in impacts[r.id].handled" :key="`${h.orderId}-${h.mealIndex}-${h.kind}`">
                <span class="mono">{{ h.orderId }}</span>: {{ h.fromDishName }} → <strong>{{ h.toDishName }}</strong>
                <span class="ops-muted">{{ h.compensationVnd > 0 ? `· bù ${fmt(h.compensationVnd)} vào Fresh Credit` : '· không chênh giá' }}</span>
              </li>
            </ul>
          </div>
        </template>
      </template>
      <div v-if="!r.pending && r.status === 'open'" class="ops-actions">
        <button class="ops-btn" @click="apply('closeShortage', { id: r.id })">Đóng báo cáo</button>
      </div>
    </section>
    <p v-if="!reports.length" class="ops-muted">Chưa có báo cáo nào cho ngày này.</p>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { api } from '../../../shared/api';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDay, fmtDeadline } from '../../../shared/utils/time';
import { nextDailyId } from '../../../shared/domain/factory';
import { ctx } from '../../session';
import { apply, clientNow, hasUnsent, onQueueChange, online, submit as submitCall } from '../../queue';
import { catalog, factory, selDay, slotLabel, zoneName } from '../../factoryStore';
import { shortDay } from '../../format';
import PhotoInput from '../../components/PhotoInput.vue';

const key = ref('');
const qty = ref('');
const unit = ref('bag');
const kind = ref('short');
const photo = ref('');
const note = ref('');
const error = ref('');
const impacts = reactive({});
const choice = reactive({});

const itemOptions = computed(() => (catalog.value ? Object.values(catalog.value.items).filter((i) => !i.hub) : []));
const nameOf = (k) => (catalog.value && catalog.value.items[k] ? catalog.value.items[k].name : k);
const kgText = (g) => `${Math.round(g / 100) / 10} kg`;

const reports = computed(() =>
  factory.value.shortages
    .filter((s) => s.day === selDay.value)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((s) => ({ ...s, name: nameOf(s.key), pending: hasUnsent((a) => a.type === 'shortage' && a.id === s.id) }))
);

function submit() {
  error.value = '';
  const n = Number(qty.value);
  if (!key.value) return (error.value = 'Chọn mặt hàng.');
  if (!(n > 0)) return (error.value = 'Nhập số lượng lớn hơn 0.');
  if (unit.value === 'bag' && !Number.isInteger(n)) return (error.value = 'Số túi phải là số nguyên.');
  if (kind.value === 'damaged' && !photo.value) return (error.value = 'Hàng hỏng cần 1 ảnh.');
  if (!selDay.value) return (error.value = 'Chưa có ngày giao đã chốt.');
  const at = clientNow();
  const id = nextDailyId('SH', factory.value.shortages.map((s) => s.id), at);
  apply('shortage', { at, id, key: key.value, qty: n, unit: unit.value, kind: kind.value, note: note.value.trim(), photo: photo.value || null, day: selDay.value });
  key.value = '';
  qty.value = '';
  photo.value = '';
  note.value = '';
}

// Đơn bị ảnh hưởng của một báo cáo, mỗi dòng là một món cần thay
function rowsOf(r) {
  const im = impacts[r.id];
  if (!im || im.error) return [];
  const out = [];
  for (const o of im.affected) {
    for (const h of o.hits) {
      const k = `${r.id}|${o.orderId}|${h.mealIndex}|${h.kind}`;
      out.push({
        k, orderId: o.orderId, zoneId: o.zoneId, slotId: o.slotId, deliveryDay: o.deliveryDay, mealIndex: h.mealIndex, kind: h.kind,
        dishName: h.dishName, options: h.options, suggested: h.suggestedDishId,
        pending: hasUnsent((a, it) => it.call === 'substituteDish' && a.orderId === o.orderId && a.mealIndex === h.mealIndex && a.kind === h.kind)
      });
    }
  }
  return out;
}

function refresh() {
  if (!online.value) return;
  for (const r of reports.value) {
    if (r.pending) continue;
    try {
      const im = api.ops.factory.impact(ctx.value, r.id);
      impacts[r.id] = im;
      for (const row of rowsOf(r)) if (!(row.k in choice) || !row.options.some((o) => o.dishId === choice[row.k])) choice[row.k] = row.suggested;
    } catch (e) {
      impacts[r.id] = { error: e.message };
    }
  }
}

function notify(r, row) {
  const toDishId = choice[row.k] || row.suggested;
  if (!toDishId) return;
  submitCall('substituteDish', {
    orderId: row.orderId, mealIndex: row.mealIndex, kind: row.kind, toDishId,
    reason: r.kind === 'damaged' ? 'nguyên liệu bị hỏng' : 'nhà máy thiếu nguyên liệu', shortageId: r.id
  });
}
const notifyAll = (r) => rowsOf(r).filter((row) => !row.pending && (choice[row.k] || row.suggested)).forEach((row) => notify(r, row));

let off = null;
onMounted(() => {
  refresh();
  off = onQueueChange(refresh);
});
onBeforeUnmount(() => off && off());
watch(() => reports.value.map((r) => `${r.id}:${r.pending}`).join(','), refresh);
watch(online, refresh);
</script>
