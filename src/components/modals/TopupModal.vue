<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="topup-title" @click.self="store.closeModal">
    <div class="mbox box">
      <button class="mclose" type="button" @click="store.closeModal" aria-label="Đóng">×</button>
      <h2 id="topup-title" class="pl-h2">Nạp thêm Fresh Credit</h2>

      <template v-if="!pending">
        <p v-if="alert" class="pl-panel warn" role="status">
          Tuần {{ alert.week_index + 1 }} cần <b class="num">{{ fmt(alert.amount_vnd) }}</b>, bạn đang có <b class="num">{{ fmt(alert.balance_vnd) }}</b>.
          Nạp thêm trước <b>{{ alert.charge_label }}</b> để MOVA trừ được tiền.
        </p>
        <p v-else class="pl-note">Số dư hiện tại <b class="num">{{ fmt(store.balance.total_vnd) }}</b>. Nạp bao nhiêu cũng được, thưởng nạp khoảng {{ Math.round(sum.bonus_pct * 100) }}% vào phần khuyến mãi.</p>

        <div class="pl-chips col opts" role="radiogroup" aria-label="Mức nạp">
          <button v-if="alert && alert.suggested_topup" type="button" class="pl-chip big" :class="{ on: choice === 'need' }" role="radio" :aria-checked="choice === 'need'" @click="choice = 'need'">
            <b class="num">Nạp vừa đủ: {{ fmt(alert.suggested_topup.pay_vnd) }}</b>
            <small class="num">Nhận {{ fmt(alert.suggested_topup.credit_received_vnd) }} (gồm thưởng {{ fmt(alert.suggested_topup.bonus_vnd) }})</small>
          </button>
          <button v-for="p in sum.packs" :key="p.pack_id" type="button" class="pl-chip big" :class="{ on: choice === p.pack_id }" role="radio" :aria-checked="choice === p.pack_id" @click="choice = p.pack_id">
            <b class="num">{{ p.label }}: {{ fmt(p.pay_vnd) }}</b>
            <small class="num">Nhận {{ fmt(p.credit_received_vnd) }} (gồm thưởng {{ fmt(p.bonus_vnd) }})</small>
          </button>
        </div>
        <p v-if="error" class="pl-error" role="alert">{{ error }}</p>
        <button class="pl-btn primary" type="button" :disabled="!choice" @click="prepare">Tiếp tục</button>
      </template>

      <template v-else>
        <p class="pl-lead">Quét mã bằng ứng dụng ngân hàng để chuyển <b class="num">{{ fmt(pending.pay_vnd) }}</b>.</p>
        <div class="qr"><VietQrSvg :seed="pending.pay_vnd" /></div>
        <p class="pl-note">Nội dung chuyển khoản: <b class="ref">{{ transferContent }}</b></p>
        <p class="pl-note">Bản demo: bấm xác nhận để mô phỏng tiền đã về.</p>
        <button class="pl-btn primary" type="button" @click="confirm">Tôi đã chuyển khoản</button>
        <button class="pl-btn ghost" type="button" @click="pending = null">Chọn mức khác</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import VietQrSvg from '../common/VietQrSvg.vue';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const sum = api.customer.creditSummary(store.customerId).data;
const alert = sum.alert;
const choice = ref(alert && alert.suggested_topup ? 'need' : sum.packs[0].pack_id);
const pending = ref(null);
const error = ref('');

function prepare() {
  error.value = '';
  if (choice.value === 'need') pending.value = { pay_vnd: alert.suggested_topup.pay_vnd };
  else {
    const p = sum.packs.find((x) => x.pack_id === choice.value);
    pending.value = { pay_vnd: p.pay_vnd, pack_id: p.pack_id };
  }
}

const transferContent = computed(() => `NAP ${store.account.customer.phone || store.customerId}`);

function confirm() {
  const res = api.customer.topUpCredit({ customer_id: store.customerId, ...(pending.value.pack_id ? { pack_id: pending.value.pack_id } : { pay_vnd: pending.value.pay_vnd }) });
  if (res.status === 'error') {
    error.value = res.error.message;
    pending.value = null;
    return;
  }
  store.refresh();
  store.closeModal();
  store.toast(`Đã nạp ${fmt(res.data.pay_vnd)}. Fresh Credit hiện có ${fmt(res.data.balance.total_vnd)}`);
}
</script>

<style scoped>
.box { max-width: 480px; padding: 26px 22px; display: grid; gap: 14px; }
.opts { margin-top: 2px; }
.qr { width: 190px; height: 190px; margin: 0 auto; background: #fff; padding: 8px; border-radius: 12px; border: 1px solid var(--line); }
.ref { background: var(--butter); padding: 2px 8px; border-radius: 8px; letter-spacing: .03em; }
</style>
