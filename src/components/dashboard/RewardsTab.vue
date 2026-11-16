<template>
  <div v-if="data" class="rewards">
    <section class="pl-card">
      <h2 class="pl-h2">Mời bạn bè</h2>
      <p class="pl-lead">
        Bạn của bạn trả gói đầu tiên, bạn nhận <b class="num">{{ fmt(r.referral.referrer_vnd) }}</b> Fresh Credit và bạn của bạn nhận
        <b class="num">{{ fmt(r.referral.referee_vnd) }}</b>.
      </p>
      <label class="pl-label" for="invite-link">Link mời riêng của bạn</label>
      <input id="invite-link" class="pl-input link" type="text" readonly :value="inviteUrl" @focus="$event.target.select()" />
      <div class="btns">
        <button class="pl-btn primary" type="button" @click="shareInvite">{{ copiedInvite ? 'Đã sao chép liên kết' : 'Gửi link mời' }}</button>
      </div>
      <ul v-if="r.referral.invited.length" class="invited">
        <li v-for="i in r.referral.invited" :key="i.id"><span>{{ i.name }} đã đăng ký</span><b class="num">+{{ fmt(i.reward_vnd) }}</b></li>
      </ul>
      <p v-else class="pl-note">Chưa có bạn nào đăng ký qua link của bạn.</p>
    </section>

    <section class="pl-card">
      <h2 class="pl-h2">Hoàn thiện hồ sơ thành viên</h2>
      <p class="pl-lead">Nhận <b class="num">{{ fmt(r.profile.reward_vnd) }}</b> Fresh Credit khi điền đủ thông tin và lưu ý ăn uống của cả nhà.</p>
      <template v-if="r.profile.claimed"><span class="pl-pill">Đã nhận thưởng</span></template>
      <template v-else>
        <p class="pl-note">Đã xong {{ r.profile.progress.done }} trên {{ r.profile.progress.total }} mục<template v-if="r.profile.progress.missing.length">. Còn thiếu: {{ r.profile.progress.missing.join(', ') }}</template>.</p>
        <button class="pl-btn" type="button" @click="$emit('tab', 'profile')">Mở hồ sơ</button>
      </template>
    </section>

    <section class="pl-card">
      <h2 class="pl-h2">Chia sẻ nhận thưởng</h2>
      <p class="pl-lead">Mỗi lần chia sẻ nhận <b class="num">{{ fmt(r.share.reward_vnd) }}</b> Fresh Credit, tối đa {{ r.share.max_per_week }} lần mỗi tuần. Tuần này bạn đã nhận {{ r.share.used_this_week }} lần.</p>
      <div class="btns">
        <button class="pl-btn" type="button" :disabled="busy" @click="shareMenu">Chia sẻ thực đơn tuần này</button>
        <label class="pl-btn file" :class="{ disabled: busy }">
          Gửi ảnh món đã nấu
          <input type="file" accept="image/*" class="sr" :disabled="busy" @change="sharePhoto" />
        </label>
      </div>
      <p v-if="message" class="pl-note" role="status">{{ message }}</p>
      <p class="pl-note">Ảnh món đã nấu được duyệt tự động trong bản demo. Gắn #MovaFresh #ComNha15Phut khi đăng lên mạng xã hội.</p>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../../shared/api';
import { fmt } from '../../shared/utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

defineEmits(['tab']);
const store = useMovaStore();
const data = ref(null);
const copiedInvite = ref(false);
const message = ref('');
const busy = ref(false);

const r = computed(() => data.value.rewards);
const inviteUrl = computed(() => `${location.origin}${data.value.invite_path}`);

function load() {
  const res = api.customer.rewards(store.customerId);
  if (res.status === 'success') data.value = res.data;
}
load();
watch(() => store.version, load);

async function send(text, url, title = 'MOVA Fresh') {
  try {
    if (navigator.share) await navigator.share({ title, text, url });
    else await navigator.clipboard.writeText(`${text} ${url}`);
    return true;
  } catch (e) {
    // Khách đóng hộp chia sẻ thì không tính là đã chia sẻ; trình duyệt chặn sao chép thì báo để khách tự làm
    if (!e || e.name !== 'AbortError') message.value = 'Trình duyệt không cho sao chép tự động. Bạn hãy chép nội dung này và gửi thủ công: ' + text + ' ' + url;
    return false;
  }
}

async function shareInvite() {
  const done = await send('Mình nấu cơm nhà 15 phút với MOVA Fresh: nguyên liệu sơ chế sẵn từ Đắk Lắk. Đăng ký qua link này nhé:', inviteUrl.value);
  if (done && !navigator.share) copiedInvite.value = true;
}

function claim(req) {
  const res = api.customer.claimShare({ customer_id: store.customerId, ...req });
  if (res.status === 'error') {
    message.value = res.error.message;
    return;
  }
  message.value = `Đã cộng ${fmt(res.data.reward_vnd)} vào Fresh Credit (phần khuyến mãi).`;
  store.refresh();
}

async function shareMenu() {
  busy.value = true;
  message.value = '';
  const weeks = api.customer.myWeeks(store.customerId);
  const w = weeks.status === 'success' ? weeks.data.weeks.find((x) => x.editable) || weeks.data.weeks[0] : null;
  if (!w) {
    message.value = 'Bạn chưa có thực đơn để chia sẻ.';
    busy.value = false;
    return;
  }
  const names = w.meals.map((m) => m.dishes[0].name).slice(0, 4).join(', ');
  const done = await send(`Thực đơn tuần này của nhà mình với MOVA Fresh: ${names}.`, `${location.origin}/`);
  if (done) claim({ kind: 'menu', ref: `week-${w.week_index}` });
  busy.value = false;
}

function sharePhoto(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  message.value = '';
  claim({ kind: 'photo', ref: `photo:${file.name}:${file.size}`, photo_name: file.name });
}
</script>

<style scoped>
.rewards { display: grid; gap: 16px; max-width: 760px; }
.rewards > section { display: grid; gap: 12px; }
.link { font-size: 15px; }
.btns { display: grid; gap: 10px; }
@media (min-width: 641px) { .btns { grid-auto-flow: column; justify-content: start; } }
.invited { list-style: none; margin: 0; padding: 0; display: grid; }
.invited li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--line-2); font-size: 16px; }
.invited b { color: var(--green-d); }
.file { cursor: pointer; position: relative; }
.file.disabled { opacity: .45; pointer-events: none; }
.pl-pill { justify-self: start; }
</style>
