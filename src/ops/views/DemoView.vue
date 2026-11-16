<template>
  <section>
    <h1>Bảng demo</h1>
    <p class="ops-muted">
      Đồng hồ nghiệp vụ là giả lập và chỉ đi tới. Mỗi nút nhảy tới ngay sau mốc kế tiếp và chạy các job đã tới hạn
      (trừ tiền, chốt sổ, nhắc khách). Muốn quay lại thì đặt lại dữ liệu.
    </p>

    <div v-if="st" class="ops-card">
      <h2>Bây giờ: {{ fmt(st.now) }}</h2>
      <ul class="ops-list">
        <li>Mốc trừ tiền kế tiếp: <strong>{{ fmt(st.nextCharge) }}</strong></li>
        <li>Giờ chốt sổ kế tiếp: <strong>{{ fmt(st.nextCutoff) }}</strong></li>
        <li>Giờ giao kế tiếp: <strong>{{ fmt(st.nextDelivery) }}</strong></li>
        <li>Đã chốt sổ: <strong>{{ st.plans }}</strong> ngày · PO đã lập: <strong>{{ st.purchaseOrders }}</strong></li>
      </ul>
      <p class="ops-muted">
        Đơn: chờ trừ tiền {{ st.counts.scheduled }} · đã thu {{ st.counts.paid }} · trừ lỗi {{ st.counts.charge_failed }} ·
        đã chốt {{ st.counts.locked }} · tạm hoãn {{ st.counts.skipped_unpaid }}
      </p>

      <div class="ops-actions">
        <button class="ops-btn ops-btn-primary" :disabled="!st.nextCharge" @click="jump('charge')">Tới mốc trừ tiền</button>
        <button class="ops-btn ops-btn-primary" :disabled="!st.nextCutoff" @click="jump('cutoff')">Tới giờ chốt sổ</button>
        <button class="ops-btn ops-btn-primary" :disabled="!st.nextDelivery" @click="jump('delivery')">Tới ngày giao</button>
      </div>

      <div class="ops-set">
        <label for="at">Đặt giờ (chỉ đi tới)</label>
        <input id="at" v-model="at" type="datetime-local" class="ops-input" />
        <button class="ops-btn" :disabled="!at" @click="setNow">Đặt</button>
      </div>

      <h2>Dữ liệu mẫu cho truy xuất và thu hồi lô</h2>
      <p class="ops-muted">Cần đã chốt sổ ít nhất một ngày. Dựng hai lô nguyên liệu, mẻ túi, thùng và đơn ở đủ ba trạng thái (chưa xuất / đang giao / đã giao) để thử Kho phụ → Truy xuất và Thu hồi lô.</p>
      <div class="ops-actions">
        <button class="ops-btn" data-testid="seed-trace" :disabled="!st.plans" @click="seedTrace">Dựng dữ liệu truy xuất mẫu</button>
      </div>

      <p v-if="msg" class="ops-ok" role="status" data-testid="demo-msg">{{ msg }}</p>
      <p v-if="err" class="ops-error" role="alert">{{ err }}</p>

      <hr />
      <button class="ops-btn ops-btn-danger" @click="reset">Reset dữ liệu về hạt giống</button>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../shared/api';
import { ctx } from '../session';
import { fmtDeadline } from '../../shared/utils/time';

const st = ref(null);
const at = ref('');
const msg = ref('');
const err = ref('');

const fmt = (iso) => (iso ? fmtDeadline(new Date(iso)) : 'Không còn');

function reload() {
  st.value = api.demo.state(ctx.value);
}

function run(fn, okText) {
  msg.value = '';
  err.value = '';
  try {
    const fired = fn();
    msg.value = okText(fired);
  } catch (e) {
    err.value = e.message;
  }
  reload();
}

const summarize = (fired) => {
  const n = (job) => fired.filter((f) => f.job === job).length;
  return `Đã chạy: ${n('charge')} lần trừ tiền, ${n('cutoff')} lần chốt sổ, ${n('remind')} lần nhắc khách.`;
};

const seedTrace = () =>
  run(
    () => api.demo.seedTrace(ctx.value),
    (r) => `Đã dựng ${r.skuName}: lô ${r.lotCodes.join(' và ')} trên ${r.orders} đơn (đã giao ${r.counts.delivered}, đang giao ${r.counts.shipped}, đang sản xuất ${r.counts.in_production}, chưa xuất ${r.counts.locked}).`
  );
const jump = (kind) => run(() => api.demo.jumpTo(ctx.value, kind), summarize);
const setNow = () => run(() => api.demo.setNow(ctx.value, new Date(at.value)), summarize);
const reset = () => {
  if (window.confirm('Đặt lại toàn bộ dữ liệu demo?')) run(() => api.demo.reset(ctx.value), () => 'Đã đặt lại dữ liệu.');
};

onMounted(reload);
</script>
