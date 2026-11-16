<template>
  <div class="co">
    <header>
      <h1 class="pl-h1">Giao hàng và thanh toán</h1>
      <p class="pl-lead">Chọn ngày giao, điền nơi nhận và trả trước một lần. Tiền vào trước để nhà máy Đắk Lắk bắt đầu sơ chế cho bạn.</p>
    </header>

    <!-- 1. Giao hàng -->
    <section class="pl-card sec">
      <h2 class="pl-h2">1. Ngày và giờ giao</h2>
      <div class="pl-chips">
        <button v-for="f in [1, 2]" :key="f" type="button" class="pl-chip" :class="{ on: c.frequency === f }" :aria-pressed="c.frequency === f" @click="setFrequency(f)">
          {{ f }} lần mỗi tuần
        </button>
      </div>

      <template v-if="options && options.options.length">
        <p class="pl-label">Ngày giao cố định hằng tuần</p>
        <div class="pl-chips col" role="radiogroup" aria-label="Ngày giao">
          <button
            v-for="(o, i) in options.options"
            :key="o.preferred_days.join()"
            type="button"
            role="radio"
            :aria-checked="c.optionIndex === i"
            class="pl-chip big"
            :class="{ on: c.optionIndex === i }"
            @click="pickOption(i)"
          >
            <b>{{ o.day_labels.join(' và ') }}</b>
            <small>Giao đầu tiên {{ o.first_delivery_label }}</small>
          </button>
        </div>

        <p class="pl-label">Khung giờ (chỉ hiện khung còn chỗ)</p>
        <div class="pl-chips col" role="radiogroup" aria-label="Khung giờ giao">
          <button
            v-for="s in slots"
            :key="s.slot_id"
            type="button"
            role="radio"
            :aria-checked="c.slotId === s.slot_id"
            class="pl-chip"
            :class="{ on: c.slotId === s.slot_id }"
            @click="pickSlot(s.slot_id)"
          >{{ s.label }}</button>
        </div>
        <p class="pl-note">MOVA báo khung giờ giao chính xác cho bạn trước {{ options.lead_time_notice_hours }} giờ.</p>
      </template>
      <div v-else-if="options" class="pl-panel warn" role="alert">
        <b>Khu của bạn hiện đã kín chỗ giao.</b>
        <p>Bạn thử chọn {{ c.frequency === 1 ? '2 lần mỗi tuần' : '1 lần mỗi tuần' }}, hoặc để lại thông tin ở màn đầu để MOVA báo khi có chỗ.</p>
      </div>
    </section>

    <!-- 2. Người nhận -->
    <section class="pl-card sec">
      <h2 class="pl-h2">2. Nơi nhận hàng</h2>
      <div class="pl-stack">
        <div>
          <label class="pl-label" for="coName">Tên người nhận</label>
          <input id="coName" v-model="c.name" class="pl-input" type="text" autocomplete="name" placeholder="Ví dụ Nguyễn Thị Lan" @change="save" />
        </div>
        <div>
          <label class="pl-label" for="coPhone">Số điện thoại người nhận</label>
          <input id="coPhone" v-model="c.phone" class="pl-input num" type="tel" inputmode="tel" autocomplete="tel" placeholder="09xx xxx xxx" @change="save" />
        </div>
        <div>
          <label class="pl-label" for="coStreet">Số nhà, tên đường, phường</label>
          <input id="coStreet" v-model="c.street" class="pl-input" type="text" autocomplete="street-address" placeholder="Ví dụ 12 Nguyễn Văn Linh, P. Tân Phong" @change="save" />
        </div>
        <div v-if="options">
          <label class="pl-label" for="coArea">Quận/huyện</label>
          <select id="coArea" v-model="c.district" class="pl-input" @change="save">
            <option v-for="d in options.districts" :key="d" :value="d">{{ d }}, {{ options.province }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. Cách trả trước -->
    <section class="pl-card sec">
      <h2 class="pl-h2">3. Cách trả trước</h2>
      <p v-if="!preview" class="pl-note">Chọn ngày và khung giờ giao để xem số tiền chi tiết.</p>

      <div v-else class="methods" role="radiogroup" aria-label="Cách trả trước">
        <!-- a. Fresh Credit -->
        <div class="method" :class="{ on: c.method === 'fresh_credit' }">
          <button type="button" role="radio" :aria-checked="c.method === 'fresh_credit'" class="m-head" @click="setMethod('fresh_credit')">
            <span class="radio" :class="{ on: c.method === 'fresh_credit' }"></span>
            <span class="m-title">Nạp Fresh Credit <span class="pl-pill">Khuyên dùng</span></span>
          </button>
          <div v-if="c.method === 'fresh_credit'" class="m-body">
            <div class="offers" role="radiogroup" aria-label="Gói nạp">
              <button type="button" role="radio" :aria-checked="c.packId === 'exact'" class="offer" :class="{ on: c.packId === 'exact' }" @click="setPack('exact')">
                <span class="offer-n">Gói đủ {{ preview.cycle_weeks.length }} tuần</span>
                <span class="offer-get num">Nhận {{ fmt(fc.credit_received_vnd) }}</span>
                <span class="offer-pay num">Trả {{ fmt(fc.pay_vnd) }}</span>
              </button>
              <button v-for="p in fc.packs" :key="p.pack_id" type="button" role="radio" :aria-checked="c.packId === p.pack_id" class="offer" :class="{ on: c.packId === p.pack_id }" @click="setPack(p.pack_id)">
                <span class="offer-n">{{ p.label }}, nạp dư cho chu kỳ sau</span>
                <span class="offer-get num">Nhận {{ fmt(p.credit_received_vnd) }}</span>
                <span class="offer-pay num">Trả {{ fmt(p.pay_vnd) }}</span>
              </button>
            </div>
            <p class="pl-note">
              Fresh Credit là điểm bữa ăn trả trước, chỉ dùng để đổi bữa ăn tại MOVA; không rút ra được và không chuyển cho người khác.
              Tuần 1 trừ ngay, các tuần sau tự trừ trước giờ giao {{ chargeHours }} giờ.
            </p>
            <p v-if="fc.capped" class="pl-note">Thưởng nạp chu kỳ đầu đã được điều chỉnh theo mức ưu đãi tối đa của chương trình.</p>
          </div>
        </div>

        <!-- b. Chuyển khoản -->
        <div class="method" :class="{ on: c.method === 'bank_transfer_4w' }">
          <button type="button" role="radio" :aria-checked="c.method === 'bank_transfer_4w'" class="m-head" @click="setMethod('bank_transfer_4w')">
            <span class="radio" :class="{ on: c.method === 'bank_transfer_4w' }"></span>
            <span class="m-title">Chuyển khoản VietQR một lần cho cả {{ preview.cycle_weeks.length }} tuần</span>
          </button>
          <div v-if="c.method === 'bank_transfer_4w'" class="m-body bank">
            <div class="qr"><VietQrSvg :seed="qrSeed" /></div>
            <div class="bank-info">
              <p>Số tiền: <b class="num big">{{ fmt(preview.bank_transfer_4w.pay_vnd) }}</b></p>
              <p>Nội dung chuyển khoản: <b class="ref">{{ preview.payment_ref }}</b></p>
              <p class="pl-note">Giữ nguyên nội dung này để MOVA khớp khoản chuyển với gói của bạn.</p>
            </div>
          </div>
        </div>

        <!-- c. Liên kết thẻ -->
        <div class="method" :class="{ on: c.method === 'card' }">
          <button type="button" role="radio" :aria-checked="c.method === 'card'" class="m-head" @click="setMethod('card')">
            <span class="radio" :class="{ on: c.method === 'card' }"></span>
            <span class="m-title">Liên kết thẻ, tự trừ từng tuần</span>
          </button>
          <div v-if="c.method === 'card'" class="m-body">
            <ul class="charges">
              <li v-for="(ch, i) in preview.card.charges" :key="i">
                <span>{{ ch.now ? 'Hôm nay' : fmtDeadline(new Date(ch.charge_at)) }}<small class="muted"> · tuần {{ ch.week_index + 1 }}</small></span>
                <b class="num">{{ fmt(ch.amount_vnd) }}</b>
              </li>
            </ul>
            <p class="pl-note">Tuần 2 trở đi tự trừ trước giờ giao {{ chargeHours }} giờ. Thẻ không trừ được thì MOVA báo ngay để bạn cập nhật trước hạn đổi món.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. Cam kết -->
    <section v-if="preview" class="pl-card sec terms">
      <h2 class="pl-h2">Trước khi trả tiền, bạn nhớ giúp</h2>
      <ul class="rules">
        <li>Gói cam kết <b>{{ preview.cycle_weeks.length }} tuần</b> liên tục.</li>
        <li>Bạn được <b>tạm hoãn tối đa {{ maxSkip }} tuần</b> trong chu kỳ, báo trước hạn đổi món của tuần đó.</li>
        <li>Dừng giữa chừng thì <b>mất ưu đãi của các tuần còn lại</b>.</li>
        <li>
          Hạn đổi món của từng tuần:
          <ul class="deadlines">
            <li v-for="w in preview.cycle_weeks" :key="w.week_index">
              <span>Tuần {{ w.week_index + 1 }}</span>
              <b>trước {{ fmtDeadline(new Date(w.cutoff_at)) }}</b>
            </li>
          </ul>
        </li>
      </ul>
      <label class="agree">
        <input v-model="c.agree" type="checkbox" @change="save" />
        <span>Tôi đã đọc và đồng ý với các điều trên.</span>
      </label>
    </section>

    <!-- Nút trả tiền -->
    <section class="pay-bar">
      <div v-if="preview" class="pay-sum">
        <small>Hôm nay bạn trả</small>
        <b class="num">{{ fmt(payToday) }}</b>
      </div>
      <p v-if="problems.length" class="pl-note need">Còn thiếu: {{ problems.join(', ') }}.</p>
      <p v-if="message" class="pl-error" role="alert">{{ message }}</p>
      <button class="pl-btn orange" type="button" :disabled="problems.length > 0 || busy" @click="pay">{{ payLabel }}</button>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import VietQrSvg from '../common/VietQrSvg.vue';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { BUSINESS } from '../../shared/config/business';
import { fmt, hash } from '../../shared/utils/formatters';
import { fmtDeadline } from '../../shared/utils/time';
import { normalizeContact } from '../../shared/domain/leads';

const emit = defineEmits(['done']);
const store = usePlanFlowStore();
const c = store.checkout;
const options = computed(() => store.options);
const preview = computed(() => store.preview);
const busy = ref(false);
const message = ref('');
const maxSkip = BUSINESS.subscription.maxSkipWeeksPerCycle;
const chargeHours = BUSINESS.timings.chargeBeforeDeliveryHours;

const slots = computed(() => (options.value && options.value.options[c.optionIndex] ? options.value.options[c.optionIndex].slots : []));
const fc = computed(() => preview.value.fresh_credit);
const qrSeed = computed(() => Math.abs(hash(preview.value ? preview.value.payment_ref : 'mova')));

const payToday = computed(() => {
  const p = preview.value;
  if (!p) return 0;
  if (c.method === 'bank_transfer_4w') return p.bank_transfer_4w.pay_vnd;
  if (c.method === 'card') return p.card.charge_now_vnd;
  return store.selectedTopupPay();
});

const payLabel = computed(() => {
  if (!preview.value) return 'Chọn ngày giao để tiếp tục';
  if (c.method === 'bank_transfer_4w') return `Tôi đã chuyển khoản ${fmt(payToday.value)}`;
  if (c.method === 'card') return `Liên kết thẻ, trả ${fmt(payToday.value)} hôm nay`;
  return `Nạp ${fmt(payToday.value)} và đăng ký gói`;
});

const problems = computed(() => {
  const list = [];
  if (!c.slotId) list.push('ngày và khung giờ giao');
  if (c.name.trim().length < 2) list.push('tên người nhận');
  if (!/^0\d{9}$/.test(c.phone.replace(/[\s.\-]/g, ''))) list.push('số điện thoại người nhận');
  if (c.street.trim().length < 4) list.push('địa chỉ');
  if (!c.agree) list.push('đồng ý với các điều trên');
  return list;
});

function save() {
  store.persist();
}

function refresh() {
  store.loadPreview();
  store.persist();
}

function setFrequency(f) {
  c.frequency = f;
  c.optionIndex = 0;
  c.slotId = '';
  store.loadOptions();
  autoPick();
  refresh();
}

function pickOption(i) {
  c.optionIndex = i;
  const list = options.value.options[i].slots;
  if (!list.some((s) => s.slot_id === c.slotId)) c.slotId = list.length ? list[0].slot_id : '';
  refresh();
}

function pickSlot(id) {
  c.slotId = id;
  refresh();
}

function setMethod(m) {
  c.method = m;
  refresh();
}

function setPack(id) {
  c.packId = id;
  save();
}

function autoPick() {
  const o = options.value && options.value.options[c.optionIndex];
  if (o && !o.slots.some((s) => s.slot_id === c.slotId)) c.slotId = o.slots[0].slot_id;
}

async function pay() {
  message.value = '';
  busy.value = true;
  const r = store.submitOrder();
  busy.value = false;
  if (r.ok) {
    emit('done');
    return;
  }
  if (['SLOT_FULL', 'SLOT_NOT_AVAILABLE', 'DAY_NOT_AVAILABLE'].includes(r.kind)) {
    c.slotId = '';
    store.loadOptions();
    autoPick();
    refresh();
    message.value = 'Khung giờ bạn chọn vừa kín chỗ. Mời chọn khung giờ khác.';
  } else {
    message.value = r.message;
  }
}

onMounted(() => {
  store.loadOptions();
  const contact = normalizeContact(store.contact);
  if (!c.phone && contact && contact.type === 'phone') c.phone = contact.value;
  autoPick();
  refresh();
});

watch(() => c.packId, save);
</script>

<style scoped>
.co { display: grid; gap: 16px; max-width: 760px; margin: 0 auto; }
.sec { display: grid; gap: 14px; }
.methods { display: grid; gap: 12px; }
.method { border: 1.5px solid var(--line); border-radius: 16px; overflow: hidden; }
.method.on { border-color: var(--green); }
.m-head { width: 100%; min-height: 60px; display: flex; align-items: center; gap: 12px; background: var(--card); border: 0; padding: 12px 16px; text-align: left; font-size: 17px; font-weight: 700; }
.m-title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.radio { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line); flex-shrink: 0; position: relative; }
.radio.on { border-color: var(--green); }
.radio.on::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--green); }
.m-body { padding: 4px 16px 16px; display: grid; gap: 12px; }
.offers { display: grid; gap: 8px; }
.offer { display: grid; grid-template-columns: 1fr auto; column-gap: 12px; text-align: left; min-height: 64px; border: 1.5px solid var(--line); background: var(--card); border-radius: 14px; padding: 10px 14px; }
.offer.on { border-color: var(--green); background: var(--green-soft); }
.offer-n { grid-column: 1 / -1; font-size: 15px; color: var(--muted); }
.offer-get { font-size: 20px; font-weight: 800; }
.offer-pay { font-size: 16px; font-weight: 700; color: var(--orange-ink); align-self: end; }
.bank { grid-template-columns: 180px 1fr; align-items: center; }
.qr { width: 180px; height: 180px; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 8px; }
.bank-info { display: grid; gap: 6px; font-size: 16px; }
.bank-info .big { font-size: 24px; color: var(--green-d); }
.ref { background: var(--butter); padding: 2px 8px; border-radius: 8px; letter-spacing: .04em; }
.charges { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.charges li { display: flex; justify-content: space-between; gap: 10px; min-height: 44px; align-items: center; border-bottom: 1px dashed var(--line); font-size: 16px; }
.rules { margin: 0; padding-left: 20px; display: grid; gap: 8px; font-size: 16px; }
.deadlines { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 4px; }
.deadlines li { display: flex; justify-content: space-between; gap: 10px; background: var(--bg); border-radius: 10px; padding: 8px 12px; font-size: 16px; }
.agree { display: flex; gap: 12px; align-items: center; min-height: 48px; font-size: 16px; font-weight: 600; cursor: pointer; }
.agree input { width: 24px; height: 24px; accent-color: var(--green); flex-shrink: 0; }
.pay-bar { position: sticky; bottom: 0; background: rgba(250, 249, 245, .97); border-top: 1px solid var(--line); margin: 0 -20px; padding: 12px 20px; display: grid; gap: 8px; z-index: 10; }
.pay-sum { display: flex; justify-content: space-between; align-items: baseline; }
.pay-sum small { font-size: 15px; color: var(--muted); }
.pay-sum b { font-size: 24px; }
.need { color: var(--orange-ink); }
@media (max-width: 560px) {
  .bank { grid-template-columns: 1fr; justify-items: center; }
  .pay-bar { margin: 0 -16px; padding: 10px 16px; }
}
</style>
