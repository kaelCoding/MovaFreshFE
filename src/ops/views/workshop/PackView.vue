<template>
  <section class="pack">
    <div class="ops-noprint">
      <h1>Đóng gói</h1>
      <div class="seg" role="tablist" aria-label="Việc đóng gói">
        <button class="seg-btn" :class="{ on: tab === 'batch' }" role="tab" data-tab="batch" @click="tab = 'batch'">Mẻ túi và nhãn</button>
        <button class="seg-btn" :class="{ on: tab === 'box' }" role="tab" data-tab="box" @click="tab = 'box'">Đóng thùng theo đơn</button>
      </div>
    </div>

    <!-- ===== Mẻ túi: gán lô nguyên liệu, in nhãn túi ===== -->
    <template v-if="tab === 'batch'">
      <section class="ops-card ops-noprint" aria-label="Gán lô cho mẻ túi">
        <h2>Gán lô nguyên liệu cho mẻ túi</h2>
        <p class="ops-muted">Mỗi mẻ là một số túi của một nguyên liệu, gắn một mã lô. Bò và gạo bắt buộc có lô. Nhãn túi có QR trỏ trang truy xuất của khách.</p>
        <div v-for="l in batchLines" :key="l.key" class="batch-line" :data-key="l.key">
          <div class="batch-line-head">
            <div>
              <strong>{{ l.name }}</strong> <StickerTag :temp="l.temp" />
              <span v-if="l.requiresLot" class="ops-pill ops-pill-warn">bắt buộc có lô</span>
            </div>
            <div class="ops-muted">Đã làm {{ l.done }} · đã gán lô {{ l.batched }} · <strong>chưa gán {{ l.left }}</strong> (cần {{ l.need }} túi × {{ l.bagGrams }}g)</div>
            <button class="ops-btn" :data-open-batch="l.key" @click="openBatch(l)">Gán lô và in nhãn</button>
          </div>
          <form v-if="form.key === l.key" class="batch-form" novalidate @submit.prevent="createBatch(l)">
            <template v-if="l.type === 'sku'">
              <label :for="`lot-${l.key}`">Lô nguyên liệu</label>
              <select :id="`lot-${l.key}`" v-model="form.lotCode" class="ops-input" data-testid="b-lot">
                <option v-if="!l.requiresLot" value="">Không gắn lô</option>
                <option v-else value="" disabled>Chọn lô</option>
                <option v-for="r in lotsFor(l.key)" :key="r.lotCode" :value="r.lotCode">{{ r.lotCode }} · {{ r.weightKg }} kg · còn ≈ {{ r.leftKg }} kg</option>
              </select>
              <p v-if="!lotsFor(l.key).length" class="ops-error">Chưa có lô nào đạt. Nhận nguyên liệu trước.
                <RouterLink to="/xuong/nhan-nguyen-lieu">Tới nhận nguyên liệu</RouterLink></p>
            </template>
            <label :for="`bags-${l.key}`">Số túi của mẻ</label>
            <input :id="`bags-${l.key}`" v-model.number="form.bags" class="ops-input" type="number" inputmode="numeric" min="1" step="1" data-testid="b-bags" />
            <p v-if="formError" class="ops-error" role="alert" data-testid="b-error">{{ formError }}</p>
            <div class="ops-actions">
              <button class="ops-btn ops-btn-primary" type="submit" data-testid="b-submit">Tạo mẻ và xem nhãn</button>
              <button class="ops-btn" type="button" @click="form.key = ''">Hủy</button>
            </div>
          </form>
        </div>
        <p v-if="!batchLines.length" class="ops-muted">Chuyến này chưa có nguyên liệu cần đóng.</p>
      </section>

      <section class="ops-card ops-noprint" aria-label="Mẻ đã tạo">
        <h2>Mẻ đã tạo</h2>
        <ul class="batch-list" data-testid="batch-list">
          <li v-for="b in batchRows" :key="b.id" class="batch-item">
            <div>
              <strong class="mono">{{ b.id }}</strong> · {{ b.name }} · <strong>{{ b.bags }} túi</strong> × {{ b.bagGrams }}g
              <span v-if="b.pending" class="ops-pill ops-pill-warn" data-testid="row-unsent">chưa gửi</span>
              <span v-if="b.labelsPrintedAt" class="ops-pill ops-pill-ok">đã in nhãn</span>
              <div class="ops-muted">{{ b.lotCode ? `Lô ${b.lotCode}` : 'Không gắn lô' }} · HSD {{ b.expiresAt ? fmtDate(new Date(b.expiresAt)) : '—' }}</div>
            </div>
            <button class="ops-btn" :data-show-labels="b.id" @click="preview = { kind: 'bag', id: b.id }">Xem và in nhãn</button>
          </li>
          <li v-if="!batchRows.length" class="ops-muted">Chưa tạo mẻ nào cho chuyến này.</li>
        </ul>
      </section>
    </template>

    <!-- ===== Đóng thùng theo đơn ===== -->
    <template v-else>
      <section class="ops-card ops-noprint" aria-label="Danh sách thùng">
        <h2>Thùng của {{ tripInfo ? tripInfo.label : '' }} <small class="ops-muted">{{ packedCount }} / {{ boxes.length }} đã đóng</small></h2>
        <p class="ops-muted">Mở từng thùng, tích từng túi theo phiếu nhặt, rồi đóng thùng và in nhãn. Xưởng chỉ thấy mã đơn, khu và khung giờ.</p>
        <div class="ops-actions">
          <button class="ops-btn" :disabled="!packedCount" data-testid="print-all-box" @click="preview = { kind: 'boxes' }">In nhãn mọi thùng đã đóng</button>
        </div>
        <div class="box-list" data-testid="box-list">
          <article v-for="b in boxRows" :key="b.list.orderId" class="box-card" :class="{ open: openId === b.list.orderId }" :data-order="b.list.orderId">
            <button class="box-head" :aria-expanded="openId === b.list.orderId" @click="openId = openId === b.list.orderId ? '' : b.list.orderId">
              <span class="box-code">{{ b.list.orderId }}</span>
              <span class="box-where">{{ zoneName(b.list.zoneId) }} · {{ slotLabel(b.list.zoneId, b.list.slotId) }}</span>
              <span class="ops-pill" :class="b.stateClass" data-testid="box-state">{{ b.state }}</span>
              <span class="box-prog">{{ b.prog.done }}/{{ b.prog.total }} túi</span>
              <span v-if="b.pending" class="ops-pill ops-pill-warn" data-testid="row-unsent">chưa gửi</span>
            </button>
            <div v-if="openId === b.list.orderId" class="box-pick">
              <div v-for="g in b.groups" :key="g.temp" class="pick-group">
                <h3 class="pick-title"><StickerTag :temp="g.temp" /> <small class="ops-muted">{{ g.bags }} túi</small></h3>
                <div v-for="it in g.items" :key="it.key" class="pick-item" :data-item="it.key">
                  <div class="pick-name">
                    <strong>{{ it.name }}</strong>
                    <span class="ops-muted">{{ it.bags }} túi × {{ it.bagGrams }}g</span>
                    <span v-if="over(it.key)" class="ops-pill ops-pill-bad">vượt số túi đã làm</span>
                  </div>
                  <div class="pick-ticks">
                    <button
                      v-for="i in it.bags" :key="i" type="button" class="tick" :class="{ on: (b.box.ticks[it.key] || 0) >= i }" :disabled="b.prog.packed"
                      :aria-pressed="(b.box.ticks[it.key] || 0) >= i" :aria-label="`${it.name} túi ${i}`" data-testid="tick" @click="tick(b, it, i)"
                    >{{ (b.box.ticks[it.key] || 0) >= i ? '✓' : i }}</button>
                  </div>
                </div>
              </div>
              <p v-if="b.hub.length" class="ops-muted pick-hub">Kho phụ TP.HCM ghép thêm: {{ b.hub.map((h) => `${h.name} (${h.bags} túi)`).join(', ') }}.</p>
              <div class="ops-actions">
                <button v-if="!b.prog.packed" class="ops-btn ops-btn-primary" :disabled="!b.prog.complete" data-testid="close-box" @click="closeBox(b)">Đóng thùng</button>
                <button v-else class="ops-btn" data-testid="reopen-box" @click="apply('reopenBox', { orderId: b.list.orderId })">Mở lại thùng</button>
                <button class="ops-btn" :disabled="!b.prog.packed" data-testid="print-box" @click="preview = { kind: 'box', id: b.list.orderId }">In nhãn thùng</button>
              </div>
            </div>
          </article>
          <p v-if="!boxRows.length" class="ops-muted">Chuyến này chưa có thùng.</p>
        </div>
      </section>
    </template>

    <!-- ===== Xem trước và in (chỉ phần này được in) ===== -->
    <section v-if="previewData" class="ops-card ops-print-block preview" data-testid="preview">
      <div class="ops-actions ops-noprint">
        <button class="ops-btn ops-btn-primary" data-testid="do-print" @click="doPrint">In</button>
        <button class="ops-btn" @click="preview = null">Đóng xem trước</button>
      </div>
      <BagLabels v-if="previewData.kind === 'bag'" :batch="previewData.batch" :info="previewData.info" />
      <div v-else class="box-labels">
        <BoxLabel v-for="l in previewData.lists" :key="l.orderId" :list="l" :trip="tripInfo" />
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { fmtDate } from '../../../shared/utils/time';
import { boxProgress, expiryOf, lotUsedKg, nextDailyId } from '../../../shared/domain/factory';
import { apply, clientNow, hasUnsent } from '../../queue';
import { boxes, catalog, factory, lines, scope, slotLabel, tripInfo, tripProgress, zoneName } from '../../factoryStore';
import StickerTag from '../../components/StickerTag.vue';
import BagLabels from '../../components/BagLabels.vue';
import BoxLabel from '../../components/BoxLabel.vue';

const tab = ref('batch');
const preview = ref(null);
const openId = ref('');
const form = reactive({ key: '', lotCode: '', bags: 1 });
const formError = ref('');

const info = (key) => (catalog.value && catalog.value.items[key]) || { name: key, temp: 'chill', bagGrams: 0 };

// ---- Mẻ túi ----
const batchesHere = computed(() => factory.value.batches.filter((b) => b.scope === scope.value));
const batchLines = computed(() =>
  lines.value.map((l) => {
    const batched = batchesHere.value.filter((b) => b.key === l.key).reduce((s, b) => s + b.bags, 0);
    return { ...l, batched, left: Math.max(0, l.done - batched), requiresLot: info(l.key).requiresLot };
  })
);
const batchRows = computed(() =>
  [...batchesHere.value]
    .sort((a, b) => Date.parse(b.producedAt) - Date.parse(a.producedAt))
    .map((b) => ({ ...b, name: info(b.key).name, pending: hasUnsent((a) => a.type === 'batch' && a.id === b.id) }))
);

const lotsFor = (key) =>
  factory.value.receipts
    .filter((r) => r.sku === key && r.verdict === 'pass')
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((r) => ({ ...r, leftKg: Math.max(0, Math.round((r.weightKg - lotUsedKg(r.lotCode, factory.value.batches, key)) * 10) / 10) }));

function openBatch(l) {
  formError.value = '';
  form.key = l.key;
  const lots = lotsFor(l.key);
  form.lotCode = lots.length ? lots[0].lotCode : '';
  form.bags = Math.max(1, l.left || Math.max(0, l.need - l.batched) || 1);
}

function createBatch(l) {
  formError.value = '';
  const bags = Math.round(Number(form.bags));
  if (!(bags >= 1)) return (formError.value = 'Nhập số túi của mẻ (từ 1 trở lên).');
  if (l.requiresLot && !form.lotCode) return (formError.value = 'Bò và gạo bắt buộc gắn mã lô nguyên liệu.');
  const at = clientNow();
  const id = nextDailyId('B', factory.value.batches.map((b) => b.id), at);
  apply('batch', { at, id, key: l.key, bags, lotCode: l.type === 'sku' && form.lotCode ? form.lotCode : null, scope: scope.value, expiresAt: expiryOf(l.key, at) });
  form.key = '';
  preview.value = { kind: 'bag', id };
}

// ---- Đóng thùng ----
const GROUP_ORDER = ['chill', 'frozen', 'ambient'];
const boxRows = computed(() =>
  boxes.value.map(({ list, box, loadedAt }) => {
    const prog = boxProgress(list, box);
    const started = prog.done > 0;
    const state = loadedAt ? 'Đã lên xe' : prog.packed ? 'Đã đóng' : started ? 'Đang đóng' : 'Chưa đóng';
    const stateClass = loadedAt || prog.packed ? 'ops-pill-ok' : started ? 'ops-pill-warn' : '';
    const groups = GROUP_ORDER.map((temp) => {
      const items = list.items.filter((i) => !i.hub && i.temp === temp);
      return { temp, items, bags: items.reduce((s, i) => s + i.bags, 0) };
    }).filter((g) => g.items.length);
    return {
      list, box, prog, state, stateClass, groups,
      hub: list.items.filter((i) => i.hub),
      pending: hasUnsent((a) => ['tick', 'closeBox', 'reopenBox'].includes(a.type) && a.orderId === list.orderId)
    };
  })
);
const packedCount = computed(() => boxRows.value.filter((b) => b.prog.packed).length);

// Tổng số túi đã tích ở mọi thùng của chuyến, so với số túi đã làm: cảnh báo mềm khi tích vượt
const ticked = computed(() => {
  const t = {};
  for (const { box } of boxes.value) for (const [k, n] of Object.entries(box.ticks)) t[k] = (t[k] || 0) + n;
  return t;
});
const over = (key) => (ticked.value[key] || 0) > (tripProgress.value[key] || 0);

function tick(b, it, i) {
  const cur = b.box.ticks[it.key] || 0;
  apply('tick', { orderId: b.list.orderId, key: it.key, count: cur >= i ? i - 1 : i });
}
const closeBox = (b) => apply('closeBox', { orderId: b.list.orderId });

// ---- Xem trước / in ----
const previewData = computed(() => {
  const p = preview.value;
  if (!p) return null;
  if (p.kind === 'bag') {
    const batch = factory.value.batches.find((b) => b.id === p.id);
    return batch ? { kind: 'bag', batch, info: info(batch.key) } : null;
  }
  if (p.kind === 'box') {
    const b = boxes.value.find((x) => x.list.orderId === p.id);
    return b ? { kind: 'box', lists: [b.list] } : null;
  }
  return { kind: 'boxes', lists: boxes.value.filter((x) => x.box.packedAt).map((x) => x.list) };
});

function doPrint() {
  const p = preview.value;
  if (p && p.kind === 'bag') apply('printed', { batchId: p.id });
  window.print();
}
</script>
