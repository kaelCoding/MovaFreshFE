<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="stop-title" @click.self="$emit('close')">
    <div class="mbox box">
      <button class="mclose" type="button" @click="$emit('close')" aria-label="Đóng">×</button>
      <h2 id="stop-title" class="pl-h2">Dừng gói?</h2>

      <p v-if="loadError" class="pl-error" role="alert">{{ loadError }}</p>
      <template v-else>
        <section class="pl-panel warn" aria-label="Ưu đãi sẽ mất">
          <h3>Bạn sẽ mất</h3>
          <dl class="num">
            <div v-if="p.gift_lost_vnd > 0"><dt>Thẻ quà tặng của các tuần chưa giao</dt><dd>{{ fmt(p.gift_lost_vnd) }}</dd></div>
            <div><dt>Fresh Credit khuyến mãi còn lại</dt><dd>{{ fmt(p.forfeited_promo_vnd) }}</dd></div>
            <div class="total"><dt>Tổng ưu đãi mất</dt><dd>{{ fmt(p.lost_incentives_vnd) }}</dd></div>
          </dl>
        </section>

        <section class="pl-panel good" aria-label="Số tiền hoàn">
          <h3>Bạn được hoàn</h3>
          <p class="refund num">{{ fmt(p.refund_vnd) }}</p>
          <p class="pl-note">Chỉ hoàn phần Fresh Credit tiền thật chưa dùng. Phần khuyến mãi không hoàn. {{ p.weeks_cancelled }} tuần chưa chốt sổ sẽ được hủy<template v-if="p.kept_orders">; {{ p.kept_orders }} chuyến đã chốt sổ vẫn được giao</template>.</p>
        </section>

        <section v-if="p.skip_instead" class="pl-panel alt">
          <p>Chỉ cần nghỉ một tuần? Tạm hoãn <b>Tuần {{ p.skip_instead.number }}</b> thì bạn không mất ưu đãi nào, thực đơn dời xuống cuối gói.</p>
          <button class="pl-btn primary" type="button" @click="$emit('skip', p.skip_instead.week_index)">Tạm hoãn tuần {{ p.skip_instead.number }} thay vì dừng</button>
        </section>

        <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
        <div class="btns">
          <button class="pl-btn" type="button" @click="$emit('close')">Giữ gói của tôi</button>
          <button class="pl-btn danger" type="button" :disabled="busy" @click="confirm">Vẫn dừng gói và nhận hoàn {{ fmt(p.refund_vnd) }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const emit = defineEmits(['close', 'done', 'skip']);
const store = useMovaStore();

const res = api.customer.previewCancel(store.customerId);
const loadError = ref(res.status === 'error' ? res.error.message : '');
const p = res.status === 'success' ? res.data : null;
const error = ref('');
const busy = ref(false);

function confirm() {
  busy.value = true;
  const r = api.customer.cancelSubscription({ customer_id: store.customerId, confirm: true });
  busy.value = false;
  if (r.status === 'error') {
    error.value = r.error.message;
    return;
  }
  store.refresh();
  store.toast(`Đã dừng gói. MOVA hoàn ${fmt(r.data.refund_vnd)}`);
  emit('done', r.data);
}
</script>

<style scoped>
.box { max-width: 540px; padding: 26px 20px; display: grid; gap: 14px; }
h3 { font-size: 17px; font-weight: 800; }
dl { margin: 0; display: grid; }
dl > div { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 16px; }
dt { color: var(--ink); }
dd { margin: 0; font-weight: 700; }
.total { border-top: 1px solid #F1C7B1; margin-top: 4px; padding-top: 10px !important; }
.total dd { font-size: 20px; color: var(--orange-ink); }
.refund { font-size: 28px; font-weight: 800; color: var(--green-d); }
.alt { background: var(--butter); border-color: #eadba6; }
.btns { display: grid; gap: 10px; }
.pl-btn.danger { background: #fff; border-color: var(--red); color: var(--red); }
.pl-btn.danger:hover:not(:disabled) { background: #FBE5E2; }
</style>
