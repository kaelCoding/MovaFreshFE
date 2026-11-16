<template>
  <section class="pl-card about" aria-live="polite">
    <!-- Màn đầu: ưu đãi + MỘT ô liên hệ -->
    <template v-if="q === 0">
      <h1 class="pl-h1">Thiết kế thực đơn riêng cho nhà bạn</h1>
      <p class="pl-lead">
        Đăng ký gói 4 tuần, nhận thẻ quà tặng đến
        <b class="num">{{ fmt(giftMax) }}</b>
        chia theo từng tuần. Chỉ cần một thông tin để bắt đầu, không cần mật khẩu.
      </p>
      <form class="pl-stack" @submit.prevent="saveContact">
        <label class="pl-label" for="plContact">Số Zalo hoặc email của bạn</label>
        <input
          id="plContact"
          v-model="contactInput"
          class="pl-input"
          type="text"
          inputmode="email"
          autocomplete="email"
          placeholder="Ví dụ 0987 654 321 hoặc ten@email.com"
          required
        />
        <p v-if="store.error" class="pl-error" role="alert">{{ store.error }}</p>
        <button class="pl-btn primary" type="submit">Bắt đầu, mất khoảng 2 phút</button>
        <p class="pl-note">MOVA chỉ dùng thông tin này để gửi thực đơn và nhắc lịch giao.</p>
      </form>
    </template>

    <template v-else>
      <div class="q-head">
        <button class="pl-back" type="button" @click="go(q - 1)">‹ Quay lại</button>
        <span class="q-count num">{{ q <= 6 ? `Câu ${q}/6` : 'Câu tùy chọn' }}</span>
      </div>
      <div class="q-bar" aria-hidden="true"><i :style="{ width: Math.min(q, 6) / 6 * 100 + '%' }"></i></div>

      <!-- 1. Quận/huyện -->
      <div v-if="q === 1" class="pl-stack">
        <h2 class="pl-h2">Nhà bạn ở quận/huyện nào?</h2>
        <div class="pl-chips">
          <button
            v-for="d in districts"
            :key="d"
            type="button"
            class="pl-chip"
            :class="{ on: store.answers.district === d && !customOpen }"
            :aria-pressed="store.answers.district === d && !customOpen"
            @click="pickDistrict(d)"
          >{{ d }}</button>
          <button type="button" class="pl-chip" :class="{ on: customOpen }" :aria-pressed="customOpen" @click="customOpen = true">Khu vực khác</button>
        </div>
        <div v-if="customOpen" class="pl-stack">
          <label class="pl-label" for="plOther">Bạn ở quận/huyện nào?</label>
          <input id="plOther" v-model="customText" class="pl-input" type="text" placeholder="Ví dụ Cần Thơ, Vũng Tàu" @input="outOfZone = false" />
        </div>

        <div v-if="outOfZone" class="pl-panel warn" role="alert">
          <b>MOVA chưa giao tới {{ store.answers.district }}.</b>
          <p v-if="!store.waitlist">Để lại thông tin, MOVA sẽ báo ngay khi xe lạnh tới khu bạn.</p>
          <p v-else class="ok-line">Đã ghi nhận. MOVA sẽ báo qua <b>{{ store.contact }}</b> khi có chuyến tới {{ store.waitlist.district }}.</p>
          <button v-if="!store.waitlist" class="pl-btn orange" type="button" @click="joinWaitlist">Báo tôi khi MOVA tới khu bạn</button>
          <button class="pl-btn" type="button" @click="chooseOther">Chọn khu vực khác</button>
        </div>
      </div>

      <!-- 2. Số người -->
      <div v-else-if="q === 2" class="pl-stack">
        <h2 class="pl-h2">Nhà bạn có mấy người ăn?</h2>
        <PeopleStepper :model-value="store.answers.size" @update:model-value="(v) => store.setAnswer('size', v)" />
        <p class="pl-note">
          {{ store.answers.size === 1 ? 'Một người: suất ăn nấu một chảo, xong trong 10–15 phút.' : 'Từ hai người: mâm cơm Việt đủ món đạm, rau, canh, tinh bột và trái cây.' }}
        </p>
      </div>

      <!-- 3. Người cần lưu ý -->
      <div v-else-if="q === 3" class="pl-stack">
        <h2 class="pl-h2">Trong nhà có ai cần lưu ý?</h2>
        <p class="pl-note">Chọn được nhiều ý. Nhà bạn không có ai đặc biệt thì bấm tiếp tục.</p>
        <div class="pl-chips col">
          <button
            v-for="n in NEEDS"
            :key="n.id"
            type="button"
            class="pl-chip"
            :class="{ on: store.answers.needs.includes(n.id) }"
            :aria-pressed="store.answers.needs.includes(n.id)"
            @click="toggle('needs', n.id)"
          >{{ n.label }}</button>
        </div>
      </div>

      <!-- 4. Khẩu vị -->
      <div v-else-if="q === 4" class="pl-stack">
        <h2 class="pl-h2">Nhà bạn thích khẩu vị nào?</h2>
        <div class="pl-chips col">
          <button
            v-for="c in CUISINES"
            :key="c.id"
            type="button"
            class="pl-chip big"
            :class="{ on: store.answers.cuisine === c.id }"
            :aria-pressed="store.answers.cuisine === c.id"
            @click="store.setAnswer('cuisine', c.id)"
          >
            <b>{{ c.label }}</b>
            <small>{{ c.hint }}</small>
          </button>
        </div>
      </div>

      <!-- 5. Kiêng -->
      <div v-else-if="q === 5" class="pl-stack">
        <h2 class="pl-h2">Nhà bạn có kiêng món nào không?</h2>
        <div class="pl-chips">
          <button
            v-for="a in AVOIDS"
            :key="a.id"
            type="button"
            class="pl-chip"
            :class="{ on: store.answers.avoid.includes(a.id) }"
            :aria-pressed="store.answers.avoid.includes(a.id)"
            @click="toggle('avoid', a.id)"
          >{{ a.label }}</button>
        </div>
        <p class="pl-note">Nhà ăn được hết thì bấm tiếp tục.</p>
      </div>

      <!-- 6. Số bữa -->
      <div v-else-if="q === 6" class="pl-stack">
        <h2 class="pl-h2">Mỗi tuần nhà bạn nấu mấy bữa ở nhà?</h2>
        <div class="pl-chips">
          <button
            v-for="n in mealOptions"
            :key="n"
            type="button"
            class="pl-chip round num"
            :class="{ on: store.answers.meals === n }"
            :aria-pressed="store.answers.meals === n"
            @click="store.setAnswer('meals', n)"
          >{{ n }}</button>
        </div>
        <p class="pl-note">Số bữa này tính cho cả nhà, mỗi bữa là một mâm hoặc một suất.</p>
      </div>

      <!-- Tùy chọn: chi tiêu đi chợ -->
      <div v-else class="pl-stack">
        <h2 class="pl-h2">Mỗi tuần nhà bạn thường chi bao nhiêu cho đi chợ?</h2>
        <p class="pl-note">Không bắt buộc. Chỉ để AI xếp món vừa túi tiền; bạn vẫn đổi món thoải mái ở bước sau.</p>
        <div class="pl-chips col">
          <button
            v-for="v in budgetChoices"
            :key="v"
            type="button"
            class="pl-chip num"
            :class="{ on: store.answers.budget === v }"
            :aria-pressed="store.answers.budget === v"
            @click="store.setAnswer('budget', store.answers.budget === v ? null : v)"
          >Đến {{ fmt(v) }}</button>
        </div>
      </div>

      <p v-if="store.error && q > 0" class="pl-error" role="alert">{{ store.error }}</p>
      <div class="q-foot">
        <button v-if="q < LAST" class="pl-btn primary" type="button" :disabled="!canNext" @click="next">Tiếp tục</button>
        <template v-else>
          <button class="pl-btn primary" type="button" @click="finish">Xem thực đơn tuần 1 của tôi</button>
          <button v-if="store.answers.budget" class="pl-btn ghost" type="button" @click="clearBudgetAndFinish">Bỏ qua câu này</button>
          <button v-else class="pl-btn ghost" type="button" @click="finish">Bỏ qua câu này</button>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PeopleStepper from './PeopleStepper.vue';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { api } from '../../shared/api';
import { BUSINESS } from '../../shared/config/business';
import { fmt } from '../../shared/utils/formatters';

const NEEDS = [
  { id: 'gym', label: 'Có người tập gym' },
  { id: 'weight_loss', label: 'Muốn giảm cân' },
  { id: 'limit_sugar', label: 'Cần hạn chế đường, ít tinh bột' },
  { id: 'elderly', label: 'Có người lớn tuổi' },
  { id: 'young_child', label: 'Có trẻ nhỏ' },
  { id: 'sensitive_stomach', label: 'Dạ dày nhạy cảm' }
];
const CUISINES = [
  { id: 'viet', label: 'Thuần Việt', hint: 'Các món cơm nhà quen thuộc' },
  { id: 'viet_western', label: 'Việt, thêm 1–2 bữa Tây mỗi tuần', hint: 'Steak, gà xốt kem cho đổi vị' }
];
const AVOIDS = [
  { id: 'no_beef', label: 'Không ăn bò' },
  { id: 'no_pork', label: 'Không ăn heo' },
  { id: 'no_seafood', label: 'Không ăn hải sản' },
  { id: 'no_spicy', label: 'Không ăn cay' }
];
const LAST = 7;

const store = usePlanFlowStore();
const route = useRoute();
const router = useRouter();

const q = computed(() => {
  const n = Number(route.query.q);
  if (route.query.q !== undefined && Number.isInteger(n) && n >= 0 && n <= LAST) return n;
  return store.leadId ? 1 : 0;
});

const contactInput = ref(store.contact);
const districts = api.customer.serviceAreas().flatMap((z) => z.districts).filter((d) => d !== 'TP. Thủ Đức');
const customOpen = ref(false);
const customText = ref('');
const outOfZone = ref(false);
const budgetChoices = BUSINESS.plan.groceryBudgetChoicesVnd;
const mealOptions = Array.from(
  { length: BUSINESS.plan.mealsPerWeekMax - BUSINESS.plan.mealsPerWeekMin + 1 },
  (_, i) => BUSINESS.plan.mealsPerWeekMin + i
);
const giftMax = BUSINESS.incentives.giftCardWeeklyVnd.reduce((a, b) => a + b, 0);

const canNext = computed(() => {
  if (q.value === 1) return customOpen.value ? customText.value.trim().length > 1 : Boolean(store.answers.district);
  return true;
});

watch(
  () => store.answers.district,
  (d) => {
    if (d && !districts.includes(d)) {
      customOpen.value = true;
      customText.value = d;
    }
  },
  { immediate: true }
);

function go(n) {
  router.push({ path: '/plans', query: { step: '1', q: String(Math.max(0, n)) } });
}

function saveContact() {
  if (store.saveContact(contactInput.value)) go(1);
}

function pickDistrict(d) {
  customOpen.value = false;
  outOfZone.value = false;
  store.setAnswer('district', d);
}

function chooseOther() {
  outOfZone.value = false;
  store.waitlist = null;
  customOpen.value = false;
  store.setAnswer('district', '');
}

function joinWaitlist() {
  store.joinWaitlist();
}

function toggle(key, id) {
  const cur = store.answers[key];
  store.setAnswer(key, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
}

function next() {
  if (q.value === 1 && customOpen.value) {
    const text = customText.value.trim();
    store.setAnswer('district', text);
    if (!api.customer.checkArea(text).served) {
      outOfZone.value = true;
      return;
    }
  }
  go(q.value + 1);
}

function finish() {
  const r = store.submitProfile();
  if (r === 'ok') router.push({ path: '/plans', query: { step: '2' } });
  else if (r === 'out_of_zone') {
    outOfZone.value = true;
    go(1);
  }
}

function clearBudgetAndFinish() {
  store.setAnswer('budget', null);
  finish();
}
</script>

<style scoped>
.about { max-width: 640px; margin: 0 auto; }
.q-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.q-count { font-size: 14px; color: var(--muted); font-weight: 600; }
.q-bar { height: 6px; background: var(--line-2); border-radius: 6px; margin-bottom: 20px; overflow: hidden; }
.q-bar i { display: block; height: 100%; background: var(--green); border-radius: 6px; transition: width .2s; }
.q-foot { display: grid; gap: 8px; margin-top: 22px; }
.ok-line { color: var(--green-d); }
</style>
