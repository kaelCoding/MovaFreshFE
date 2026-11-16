<template>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="swap-title" @click.self="$emit('close')">
    <div class="mbox box">
      <button class="mclose" type="button" @click="$emit('close')" aria-label="Đóng">×</button>
      <h2 id="swap-title" class="pl-h2">Đổi món</h2>
      <p class="pl-note">Tuần {{ week.number }}, bữa {{ target.meal.meal_index }}. Đang chọn: <b>{{ target.dish.name }}</b></p>

      <p v-if="loadError" class="pl-error" role="alert">{{ loadError }}</p>

      <template v-else-if="!preview">
        <p class="pl-note">Đổi được đến <b>{{ deadline }}</b>.</p>
        <div class="pl-chips col" role="list">
          <button
            v-for="o in options" :key="o.dish_id" type="button" class="pl-chip big" :class="{ on: o.current }"
            :disabled="o.current" role="listitem" @click="choose(o)"
          >
            <b>{{ o.name }}</b>
            <small>
              <template v-if="o.sauce_name">{{ o.sauce_name }} · </template>
              <span class="num" :class="{ up: o.price_delta_vnd > 0, down: o.price_delta_vnd < 0 }">{{ o.current ? 'Đang chọn' : deltaText(o.price_delta_vnd) }}</span>
            </small>
          </button>
        </div>
      </template>

      <template v-else>
        <div class="sum">
          <p><span class="muted">Từ</span> <b>{{ preview.from.name }}</b></p>
          <p><span class="muted">Sang</span> <b>{{ preview.to.name }}</b></p>
          <p v-if="preview.carb_reset" class="pl-note">Món tinh bột quay về {{ preview.carb_reset.name }} cho hợp món mới.</p>
        </div>

        <div class="pl-panel" :class="preview.delta_vnd > 0 ? 'warn' : 'good'" role="status">
          <p class="num">
            <template v-if="preview.delta_vnd === 0">Giá tuần không đổi.</template>
            <template v-else>Chênh lệch: <b class="big">{{ preview.delta_vnd > 0 ? '+' : '−' }}{{ fmt(Math.abs(preview.delta_vnd)) }}</b></template>
          </p>
          <p v-if="preview.settle.mode === 'charge'" class="num">
            Tuần này đã bị trừ tiền, nên phần chênh lệch trừ thêm vào Fresh Credit:
            còn <b>{{ fmt(preview.settle.balance_before_vnd) }}</b> → <b>{{ fmt(preview.settle.balance_after_vnd) }}</b>.
          </p>
          <p v-else-if="preview.settle.mode === 'refund'" class="num">
            Tuần này đã bị trừ tiền, nên MOVA hoàn phần chênh lệch vào Fresh Credit:
            từ <b>{{ fmt(preview.settle.balance_before_vnd) }}</b> lên <b>{{ fmt(preview.settle.balance_after_vnd) }}</b>.
          </p>
          <p v-else class="num">
            Tuần này chưa bị trừ tiền. Số tiền sẽ trừ lúc <b>{{ preview.charge_label }}</b> đổi từ {{ fmt(preview.old_amount_vnd) }} thành <b>{{ fmt(preview.new_amount_vnd) }}</b>.
          </p>
        </div>

        <p v-if="!preview.settle.enough" class="pl-error" role="alert">
          Fresh Credit còn thiếu {{ fmt(preview.settle.short_vnd) }} cho phần chênh lệch này. Nạp thêm rồi đổi lại, hoặc chọn món khác.
        </p>
        <p v-if="error" class="pl-error" role="alert">{{ error }}</p>

        <div class="btns">
          <button v-if="preview.settle.enough" class="pl-btn primary" type="button" :disabled="busy" @click="confirm">Xác nhận đổi món</button>
          <button v-else class="pl-btn orange" type="button" @click="topup">Nạp thêm Fresh Credit</button>
          <button class="pl-btn" type="button" @click="preview = null">Chọn món khác</button>
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

const props = defineProps({
  week: { type: Object, required: true },
  target: { type: Object, required: true } // { meal, dish }
});
const emit = defineEmits(['close', 'done']);
const store = useMovaStore();

const base = { customer_id: store.customerId, week_index: props.week.week_index, meal_index: props.target.meal.meal_index, kind: props.target.dish.kind };
const res = api.customer.mealOptions(base);
const loadError = ref(res.status === 'error' ? res.error.message : '');
const options = ref(res.status === 'success' ? res.data.options : []);
const deadline = res.status === 'success' ? res.data.deadline_label : '';
const preview = ref(null);
const error = ref('');
const busy = ref(false);
let picked = null;

const deltaText = (v) => (v === 0 ? 'Cùng giá' : `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`);

function choose(o) {
  error.value = '';
  picked = o;
  const p = api.customer.previewMealChange({ ...base, dish_id: o.dish_id });
  if (p.status === 'error') error.value = p.error.message;
  else preview.value = p.data;
}

function confirm() {
  busy.value = true;
  const r = api.customer.changeMeal({ ...base, dish_id: picked.dish_id });
  busy.value = false;
  if (r.status === 'error') {
    error.value = r.error.message;
    return;
  }
  store.refresh();
  store.toast(`Đã đổi sang ${picked.name}`);
  emit('done');
}

function topup() {
  emit('close');
  store.openModal('topup');
}
</script>

<style scoped>
.box { max-width: 520px; padding: 26px 20px; display: grid; gap: 14px; }
.sum { display: grid; gap: 6px; font-size: 17px; }
.big { font-size: 22px; }
.btns { display: grid; gap: 10px; }
.up { color: var(--orange-ink); font-weight: 700; }
.down { color: var(--green-d); font-weight: 700; }
.pl-chip.big:disabled { opacity: 1; cursor: default; }
</style>
