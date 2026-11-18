<template>
  <div class="co">
    <header>
      <h1 class="pl-h1">Giao hàng và thanh toán</h1>
      <p class="pl-lead">Chọn ngày giao, điền nơi nhận và trả trước một lần. Tiền vào trước để nhà máy Đắk Lắk bắt đầu sơ chế cho bạn.</p>
    </header>

    <!-- 1. Giao hàng -->
    <section class="pl-card sec">
      <h2 class="pl-h2">1. Ngày và giờ giao</h2>
      <div class="pl-chips freq-chips">
        <button
          v-for="f in [1, 2]"
          :key="f"
          type="button"
          class="pl-chip freq-chip"
          :class="{ on: c.frequency === f }"
          :aria-pressed="c.frequency === f"
          @click="setFrequency(f)"
        >
          <span class="freq-title">{{ f }} lần mỗi tuần</span>
          <span v-if="f === 1" class="pl-pill recommend-pill">Khuyên dùng (tối ưu phí thùng &amp; ship 39.000đ/hộp)</span>
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
            class="pl-chip slot-chip"
            :class="{ on: c.slotId === s.slot_id, 'green-slot': s.slot_id === 'early_morning_06_08' }"
            @click="pickSlot(s.slot_id)"
          >
            <span class="slot-text">{{ s.label }}</span>
            <span v-if="s.slot_id === 'early_morning_06_08'" class="slot-badge">Freeship / Ưu đãi khung giờ xanh -15.000đ</span>
          </button>
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
          <div class="phone-row">
            <input
              id="coPhone"
              v-model="c.phone"
              class="pl-input num"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="09xx xxx xxx"
              @input="onPhoneChange"
              @change="save"
            />
            <button
              v-if="!c.phoneVerified"
              class="pl-btn outline sm-btn"
              type="button"
              @click="openOtpModal"
            >
              Xác thực SĐT (OTP)
            </button>
            <span v-else class="verified-pill">✓ Đã xác thực OTP</span>
          </div>
          <p v-if="phoneErr" class="pl-error phone-err" role="alert">{{ phoneErr }}</p>
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

    <!-- 3. Thanh toán -->
    <section class="pl-card sec">
      <h2 class="pl-h2">3. Thanh toán</h2>
      <p v-if="!preview" class="pl-note">Chọn ngày và khung giờ giao để xem số tiền chi tiết.</p>

      <div v-else class="methods" role="radiogroup" aria-label="Hình thức thanh toán">
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
              Tuần 1 trừ ngay, các tuần sau tự trừ trước giờ giao {{ chargeHours }} giờ (72 tiếng).
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
            <p class="pl-note">Tuần 2 trở đi tự trừ trước giờ giao {{ chargeHours }} giờ (72 tiếng). Thẻ không trừ được thì MOVA báo ngay để bạn cập nhật trước hạn đổi món.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Voucher / Mã ưu đãi -->
    <section v-if="preview" class="pl-card sec voucher-card">
      <h2 class="pl-h2">Mã ưu đãi / Voucher</h2>
      <div class="voucher-box">
        <input
          v-model="voucherInput"
          class="pl-input num voucher-input"
          type="text"
          placeholder="Nhập mã (THEQUATANG, MOVA20, FREESHIP...)"
          style="text-transform: uppercase;"
          :disabled="Boolean(appliedVoucher)"
          @keyup.enter="applyVoucher"
        />
        <button
          v-if="!appliedVoucher"
          class="pl-btn outline"
          type="button"
          @click="applyVoucher"
        >
          Áp dụng
        </button>
        <button
          v-else
          class="pl-btn ghost"
          type="button"
          @click="removeVoucher"
        >
          Gỡ bỏ
        </button>
      </div>
      <div v-if="appliedVoucher" class="applied-voucher">
        <span class="v-tag">✓ {{ appliedVoucher.name }}</span>
        <span v-if="appliedVoucher.discountVnd > 0" class="v-amt num">-{{ fmt(appliedVoucher.discountVnd) }}</span>
      </div>
      <p v-if="voucherMsg" :class="appliedVoucher ? 'v-success' : 'pl-error'" style="margin: 0; font-size: 14px;">
        {{ voucherMsg }}
      </p>
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
      <div class="checkbox-stack">
        <label class="agree">
          <input v-model="c.agree" type="checkbox" @change="save" />
          <span>Tôi đồng ý cho phép MOVA Fresh sử dụng thông tin liên hệ và địa chỉ giao hàng để xử lý đơn hàng và hỗ trợ khách hàng.</span>
        </label>
        <label class="agree newsletter">
          <input v-model="c.newsletterOptin" type="checkbox" @change="save" />
          <span>Đăng ký nhận bản tin công thức nấu ăn từ Đầu bếp MOVA &amp; ưu đãi định kỳ qua Email (Tặng ngay +15.000đ Fresh Credit).</span>
        </label>
      </div>
    </section>

    <!-- Nút trả tiền -->
    <section class="pay-bar">
      <div v-if="preview" class="pay-breakdown">
        <div v-if="slotDiscountVnd > 0" class="pay-line green">
          <span>Ưu đãi khung giờ xanh (06h - 08h):</span>
          <b class="num">-{{ fmt(slotDiscountVnd) }}</b>
        </div>
        <div v-if="voucherDiscountVnd > 0" class="pay-line green">
          <span>Ưu đãi voucher ({{ appliedVoucher.code }}):</span>
          <b class="num">-{{ fmt(voucherDiscountVnd) }}</b>
        </div>
        <div v-if="referralDiscountVnd > 0" class="pay-line green">
          <span>Ưu đãi người quen giới thiệu ({{ activeRefCode }}):</span>
          <b class="num">-{{ fmt(referralDiscountVnd) }}</b>
        </div>
        <div class="pay-sum">
          <small>Hôm nay bạn trả <span class="rate-note">(~{{ fmt(servingPayToday) }}/suất • {{ fmt(mealPayToday) }}/bữa)</span></small>
          <b class="num">{{ fmt(payToday) }}</b>
        </div>
      </div>
      <p v-if="problems.length" class="pl-note need">Còn thiếu: {{ problems.join(', ') }}.</p>
      <p v-if="message" class="pl-error" role="alert">{{ message }}</p>
      <button class="pl-btn orange" type="button" :disabled="problems.length > 0 || busy" @click="pay">{{ payLabel }}</button>
    </section>

    <!-- Modal xác thực OTP -->
    <div v-if="showOtpModal" class="otp-modal-backdrop" @click.self="showOtpModal = false">
      <div class="otp-modal">
        <button class="mclose" type="button" aria-label="Đóng" @click="showOtpModal = false">×</button>
        <h3 class="otp-title">Xác thực số điện thoại</h3>
        <p class="pl-note">Mã OTP đã được gửi đến số <b>{{ c.phone }}</b>.<br /><span class="demo-hint">(Mã OTP demo: <b>1234</b>)</span></p>
        <div class="otp-form">
          <input
            v-model="otpInput"
            class="pl-input num otp-input"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="1234"
            @keyup.enter="verifyOtp"
          />
          <button class="pl-btn primary" type="button" @click="verifyOtp">Xác nhận OTP</button>
        </div>
        <p v-if="otpError" class="pl-error" style="margin-top: 6px;">{{ otpError }}</p>
      </div>
    </div>
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

const showOtpModal = ref(false);
const otpInput = ref('');
const otpError = ref('');
const phoneErr = ref('');

const voucherInput = ref('');
const voucherMsg = ref('');
const appliedVoucher = ref(null);

const slots = computed(() => (options.value && options.value.options[c.optionIndex] ? options.value.options[c.optionIndex].slots : []));
const fc = computed(() => preview.value.fresh_credit);
const qrSeed = computed(() => Math.abs(hash(preview.value ? preview.value.payment_ref : 'mova')));

const householdSize = computed(() => store.plan?.household_size || 2);
const mealsCount = computed(() => store.plan?.quote?.meals_per_week || 5);

const activeRefCode = computed(() => {
  return store.refCode || (appliedVoucher.value?.code?.startsWith('MOVA-') ? appliedVoucher.value.code : '');
});

const referralDiscountVnd = computed(() => {
  return activeRefCode.value ? 100000 : 0;
});

const slotDiscountVnd = computed(() => {
  return c.slotId === 'early_morning_06_08' ? 15000 : 0;
});

const voucherDiscountVnd = computed(() => {
  if (!appliedVoucher.value) return 0;
  return appliedVoucher.value.discountVnd;
});

const totalDiscountsTodayVnd = computed(() => {
  return slotDiscountVnd.value + voucherDiscountVnd.value + referralDiscountVnd.value;
});

const rawPayToday = computed(() => {
  const p = preview.value;
  if (!p) return 0;
  if (c.method === 'bank_transfer_4w') return p.bank_transfer_4w.pay_vnd;
  if (c.method === 'card') return p.card.charge_now_vnd;
  return store.selectedTopupPay();
});

const payToday = computed(() => {
  return Math.max(0, rawPayToday.value - totalDiscountsTodayVnd.value);
});

const mealPayToday = computed(() => {
  if (!payToday.value) return 0;
  const weeks = c.method === 'card' ? 1 : 4;
  const count = (mealsCount.value || 5) * weeks;
  return Math.round(payToday.value / count);
});

const servingPayToday = computed(() => {
  return Math.round(mealPayToday.value / (householdSize.value || 1));
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
  const cleanPhone = c.phone.replace(/[\s.\-]/g, '');
  if (!/^0\d{9}$/.test(cleanPhone)) {
    list.push('số điện thoại người nhận hợp lệ');
  } else if (!c.phoneVerified) {
    list.push('xác thực OTP số điện thoại');
  }
  if (c.street.trim().length < 4) list.push('địa chỉ');
  if (!c.agree) list.push('đồng ý với điều khoản dịch vụ');
  return list;
});

function onPhoneChange() {
  c.phoneVerified = false;
  phoneErr.value = '';
  save();
}

function openOtpModal() {
  phoneErr.value = '';
  const cleanPhone = c.phone.replace(/[\s.\-]/g, '');
  if (!/^0\d{9}$/.test(cleanPhone)) {
    phoneErr.value = 'Vui lòng nhập số điện thoại hợp lệ (10 số, bắt đầu bằng 0) trước khi xác thực OTP';
    return;
  }
  otpInput.value = '';
  otpError.value = '';
  showOtpModal.value = true;
}

function verifyOtp() {
  if (otpInput.value.trim() === '1234') {
    c.phoneVerified = true;
    showOtpModal.value = false;
    otpError.value = '';
    save();
  } else {
    otpError.value = 'Mã OTP không đúng. Nhập mã demo: 1234';
  }
}

function applyVoucher() {
  voucherMsg.value = '';
  const code = voucherInput.value.trim().toUpperCase();
  if (!code) {
    voucherMsg.value = 'Vui lòng nhập mã ưu đãi';
    return;
  }
  if (code === 'THEQUATANG') {
    appliedVoucher.value = {
      code: 'THEQUATANG',
      name: 'Thẻ quà tặng MOVA Fresh (trải đều 4 tuần)',
      discountVnd: 0
    };
    c.voucherCode = 'THEQUATANG';
    voucherMsg.value = '✓ Đã kích hoạt thẻ quà tặng 4 tuần!';
  } else if (code.startsWith('MOVA-')) {
    store.setRef(code);
    appliedVoucher.value = {
      code,
      name: `Ưu đãi người quen giới thiệu (${code})`,
      discountVnd: 0
    };
    c.voucherCode = code;
    voucherMsg.value = `✓ Áp dụng mã giới thiệu ${code}: Giảm ngay 100.000đ vào đơn đầu!`;
  } else if (code === 'MOVA20') {
    appliedVoucher.value = {
      code: 'MOVA20',
      name: 'Ưu đãi MOVA20 - Giảm 20.000đ',
      discountVnd: 20000
    };
    c.voucherCode = 'MOVA20';
    voucherMsg.value = '✓ Áp dụng thành công: Giảm 20.000đ';
  } else if (code === 'FREESHIP') {
    appliedVoucher.value = {
      code: 'FREESHIP',
      name: 'Ưu đãi FREESHIP - Miễn phí giao 25.000đ',
      discountVnd: 25000
    };
    c.voucherCode = 'FREESHIP';
    voucherMsg.value = '✓ Áp dụng thành công: Giảm 25.000đ';
  } else {
    voucherMsg.value = 'Mã ưu đãi không hợp lệ hoặc đã hết hạn';
  }
  save();
}

function removeVoucher() {
  if (appliedVoucher.value?.code?.startsWith('MOVA-')) {
    store.setRef('');
  }
  appliedVoucher.value = null;
  c.voucherCode = '';
  voucherInput.value = '';
  voucherMsg.value = '';
  save();
}

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
  if (c.voucherCode) {
    voucherInput.value = c.voucherCode;
    applyVoucher();
  } else if (store.refCode) {
    voucherInput.value = store.refCode;
    applyVoucher();
  }
  autoPick();
  refresh();
});

watch(() => c.packId, save);
</script>

<style scoped>
.co { display: grid; gap: 16px; max-width: 760px; margin: 0 auto; }
.sec { display: grid; gap: 14px; }
.freq-chips { display: flex; gap: 10px; flex-wrap: wrap; }
.freq-chip { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px 14px; text-align: left; }
.freq-title { font-weight: 700; font-size: 16px; }
.recommend-pill { font-size: 12px; font-weight: 600; background: var(--green); color: #fff; padding: 2px 8px; border-radius: 99px; }

.slot-chip { display: flex; justify-content: space-between; align-items: center; gap: 8px; text-align: left; width: 100%; }
.slot-badge { font-size: 12px; font-weight: 700; background: var(--green-soft); color: var(--green-d); padding: 3px 8px; border-radius: 6px; }

.phone-row { display: flex; gap: 8px; align-items: center; }
.phone-row .pl-input { flex: 1; }
.sm-btn { padding: 8px 12px; font-size: 14px; white-space: nowrap; }
.verified-pill { font-size: 14px; font-weight: 700; color: var(--green-d); background: var(--green-soft); padding: 6px 12px; border-radius: 8px; white-space: nowrap; }
.phone-err { margin-top: 4px; font-size: 14px; }

.methods { display: grid; gap: 12px; }
.method { border: 1.5px solid var(--line); border-radius: 16px; overflow: hidden; }
.method.on { border-color: var(--green); }
.m-head { width: 100%; min-height: 60px; display: flex; align-items: center; gap: 12px; background: var(--card); border: 0; padding: 12px 16px; text-align: left; font-size: 17px; font-weight: 700; cursor: pointer; }
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

.voucher-card { padding: 16px; }
.voucher-box { display: flex; gap: 8px; align-items: center; }
.voucher-input { flex: 1; }
.applied-voucher { display: flex; justify-content: space-between; align-items: center; background: var(--green-soft); color: var(--green-d); padding: 8px 12px; border-radius: 8px; font-size: 15px; font-weight: 700; }
.v-amt { font-size: 16px; }
.v-success { color: var(--green-d); font-weight: 600; }
.rate-note { font-size: 13px; font-weight: 600; color: var(--green-d); margin-left: 4px; }

.rules { margin: 0; padding-left: 20px; display: grid; gap: 8px; font-size: 16px; }
.deadlines { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 4px; }
.deadlines li { display: flex; justify-content: space-between; gap: 10px; background: var(--bg); border-radius: 10px; padding: 8px 12px; font-size: 16px; }
.checkbox-stack { display: grid; gap: 8px; margin-top: 10px; }
.agree { display: flex; gap: 12px; align-items: flex-start; min-height: 44px; font-size: 15px; font-weight: 600; cursor: pointer; }
.agree input { width: 22px; height: 22px; accent-color: var(--green); flex-shrink: 0; margin-top: 2px; }

.pay-bar { position: sticky; bottom: 0; background: rgba(250, 249, 245, .97); border-top: 1px solid var(--line); margin: 0 -20px; padding: 12px 20px; display: grid; gap: 8px; z-index: 10; }
.pay-breakdown { display: grid; gap: 4px; }
.pay-line { display: flex; justify-content: space-between; font-size: 14px; }
.pay-line.green { color: var(--green-d); font-weight: 600; }
.pay-sum { display: flex; justify-content: space-between; align-items: baseline; }
.pay-sum small { font-size: 15px; color: var(--muted); }
.pay-sum b { font-size: 24px; }
.need { color: var(--orange-ink); }

/* OTP Modal */
.otp-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 16px; }
.otp-modal { background: #fff; width: 100%; max-width: 400px; border-radius: 20px; padding: 24px; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: grid; gap: 12px; }
.otp-title { font-size: 20px; font-weight: 800; margin: 0; }
.demo-hint { color: var(--green-d); font-weight: 700; }
.otp-form { display: flex; gap: 8px; align-items: center; }
.otp-input { width: 110px; font-size: 20px; text-align: center; letter-spacing: 4px; }
.mclose { position: absolute; top: 16px; right: 16px; border: 0; background: #f1f5f9; width: 32px; height: 32px; border-radius: 50%; font-size: 20px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }

@media (max-width: 560px) {
  .bank { grid-template-columns: 1fr; justify-items: center; }
  .pay-bar { margin: 0 -16px; padding: 10px 16px; }
}
</style>
