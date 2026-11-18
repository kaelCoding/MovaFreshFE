<template>
  <section class="pl-card about" aria-live="polite">
    <!-- Màn đầu: ưu đãi + Đăng nhập MXH & MỘT ô liên hệ -->
    <template v-if="q === 0">
      <h1 class="pl-h1">Thiết kế thực đơn riêng cho nhà bạn</h1>
      <p class="pl-lead">
        Đăng ký gói 4 tuần, nhận thẻ quà tặng đến
        <b class="num">{{ fmt(giftMax) }}</b>
        chia theo từng tuần. Bắt đầu ngay, không cần mật khẩu rườm rà.
      </p>

      <!-- Nút tiếp tục nhanh MXH -->
      <div class="social-fast-actions">
        <button type="button" class="social-btn google" @click="quickSocialLogin('Google')">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/><path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/></svg>
          <span>Đăng nhập với Google</span>
        </button>
        <button type="button" class="social-btn zalo" @click="quickSocialLogin('Zalo')">
          <span class="zalo-badge">Zalo</span>
          <span>Đăng nhập với Zalo</span>
        </button>
        <button type="button" class="social-btn facebook" @click="quickSocialLogin('Facebook')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          <span>Đăng nhập với Facebook</span>
        </button>
      </div>

      <div class="divider">
        <span>Hoặc nhập Email / Số điện thoại</span>
      </div>

      <form class="pl-stack" @submit.prevent="saveContact">
        <label class="pl-label" for="plContact">Số điện thoại hoặc Email</label>
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
        <button class="pl-btn primary" type="submit">Bắt đầu khảo sát (1 phút)</button>
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

      <!-- 2. Số người (Dùng nút - / + to rõ) -->
      <div v-else-if="q === 2" class="pl-stack">
        <h2 class="pl-h2">Nhà bạn có mấy người ăn?</h2>
        <div class="stepper-wrap">
          <PeopleStepper :model-value="store.answers.size" :min="1" :max="10" @update:model-value="(v) => store.setAnswer('size', v)" />
        </div>
      </div>

      <!-- 3. Nhu cầu sức khỏe & ô Khác tự nhập -->
      <div v-else-if="q === 3" class="pl-stack">
        <h2 class="pl-h2">Mục tiêu sức khỏe & Thể trạng gia đình?</h2>
        <div class="pl-chips col">
          <button
            v-for="n in HEALTH_NEEDS"
            :key="n.id"
            type="button"
            class="pl-chip"
            :class="{ on: isNeedActive(n.id) }"
            :aria-pressed="isNeedActive(n.id)"
            @click="toggleNeed(n.id)"
          >{{ n.label }}</button>
        </div>

        <div v-if="showCustomNeedInput" class="custom-input-box">
          <label class="pl-label" for="customNeed">Gõ tình trạng sức khỏe / nhu cầu khác:</label>
          <input
            id="customNeed"
            v-model="customNeedText"
            class="pl-input"
            type="text"
            placeholder="Ví dụ: gout, kiêng hải sản, dạ dày ít dầu mỡ..."
            @input="analyzeNeedText"
          />
          <p v-if="needAnalysisTags.length" class="auto-tag-hint">
            ✓ Đã tự động gắn tag: <b>{{ needAnalysisTags.join(', ') }}</b>
          </p>
        </div>
      </div>

      <!-- 4. 3 Phong cách ẩm thực chuẩn xác -->
      <div v-else-if="q === 4" class="pl-stack">
        <h2 class="pl-h2">Phong cách ẩm thực bạn mong muốn?</h2>
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

      <!-- 5. Kiêng cữ / Dị ứng & ô Khác tự nhập -->
      <div v-else-if="q === 5" class="pl-stack">
        <h2 class="pl-h2">Nhà bạn có kiêng món nào không?</h2>
        <div class="pl-chips">
          <button
            v-for="a in AVOIDS"
            :key="a.id"
            type="button"
            class="pl-chip"
            :class="{ on: isAvoidActive(a.id) }"
            :aria-pressed="isAvoidActive(a.id)"
            @click="toggleAvoid(a.id)"
          >{{ a.label }}</button>
        </div>

        <div v-if="showCustomAvoidInput" class="custom-input-box">
          <label class="pl-label" for="customAvoid">Gõ món kiêng khác:</label>
          <input
            id="customAvoid"
            v-model="customAvoidText"
            class="pl-input"
            type="text"
            placeholder="Ví dụ: kiêng tôm, kiêng ớt cay, kiêng thịt đỏ..."
            @input="analyzeAvoidText"
          />
          <p v-if="avoidAnalysisTags.length" class="auto-tag-hint">
            ✓ Đã tự động loại trừ: <b>{{ avoidAnalysisTags.join(', ') }}</b>
          </p>
        </div>
      </div>

      <!-- 6. Số bữa nấu tại nhà (Nút - / + to rõ từ 3 đến 7) -->
      <div v-else-if="q === 6" class="pl-stack">
        <h2 class="pl-h2">Mỗi tuần nhà bạn nấu mấy bữa ở nhà?</h2>
        <div class="stepper-wrap">
          <div class="ps" role="group" aria-label="Số bữa mỗi tuần">
            <button
              type="button"
              class="ps-btn"
              :disabled="store.answers.meals <= 3"
              aria-label="Bớt một bữa"
              @click="store.setAnswer('meals', store.answers.meals - 1)"
            >−</button>
            <div class="ps-val num">
              <b>{{ store.answers.meals }}</b>
              <span>bữa / tuần</span>
            </div>
            <button
              type="button"
              class="ps-btn"
              :disabled="store.answers.meals >= 7"
              aria-label="Thêm một bữa"
              @click="store.setAnswer('meals', store.answers.meals + 1)"
            >+</button>
          </div>
        </div>
      </div>

      <!-- Tùy chọn: chi tiêu đi chợ -->
      <div v-else class="pl-stack">
        <h2 class="pl-h2">Mỗi tuần nhà bạn thường chi bao nhiêu cho đi chợ?</h2>
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
          <button class="pl-btn primary" type="button" @click="finish">Xem thực đơn Đầu bếp thiết kế cho tôi</button>
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

const HEALTH_NEEDS = [
  { id: 'balanced', label: 'Cân bằng dinh dưỡng' },
  { id: 'gym', label: 'Tăng cơ / Tập Gym' },
  { id: 'weight_loss', label: 'Giảm mỡ / Giữ dáng' },
  { id: 'limit_sugar', label: 'Kiểm soát đường huyết (Tiểu đường)' },
  { id: 'sensitive_stomach', label: 'Tiêu hóa nhẹ nhàng' },
  { id: 'elderly', label: 'Người lớn tuổi' },
  { id: 'young_child', label: 'Trẻ nhỏ' },
  { id: 'gout', label: 'Bệnh Gout (Ít đạm purin)' },
  { id: 'meat_lover', label: 'Thích ăn nhiều thịt' },
  { id: 'custom_need', label: 'Khác' }
];

const CUISINES = [
  { id: 'viet', label: 'Thuần Việt', hint: 'Cơm nhà truyền thống 3 miền chuẩn vị' },
  { id: 'western', label: 'Đồ Tây (Pháp, Ý, Mỹ...)', hint: 'Kết hợp các món Steak, áp chảo, xốt Âu thượng hạng' },
  { id: 'asian', label: 'Đồ Á (Hàn Quốc, Trung Quốc, Đài Loan...)', hint: 'Món Á phong vị hiện đại hợp khẩu vị Việt' }
];

const AVOIDS = [
  { id: 'no_beef', label: 'Không ăn Bò' },
  { id: 'no_pork', label: 'Không ăn Heo' },
  { id: 'no_seafood', label: 'Không ăn Hải sản' },
  { id: 'no_spicy', label: 'Không ăn cay' },
  { id: 'no_gluten', label: 'Không Gluten' },
  { id: 'no_lactose', label: 'Không Lactose (sữa)' },
  { id: 'custom_avoid', label: 'Khác' }
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
const giftMax = BUSINESS.incentives.giftCardWeeklyVnd.reduce((a, b) => a + b, 0);

// Nhu cầu & Kiêng cữ tự nhập
const showCustomNeedInput = ref(false);
const customNeedText = ref('');
const needAnalysisTags = ref([]);

const showCustomAvoidInput = ref(false);
const customAvoidText = ref('');
const avoidAnalysisTags = ref([]);

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

function quickSocialLogin(provider) {
  const mockEmail = `khach.${provider.toLowerCase()}@movafresh.vn`;
  contactInput.value = mockEmail;
  if (store.saveContact(mockEmail)) go(1);
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

function isNeedActive(id) {
  if (id === 'custom_need') return showCustomNeedInput.value;
  return store.answers.needs.includes(id);
}

function toggleNeed(id) {
  if (id === 'custom_need') {
    showCustomNeedInput.value = !showCustomNeedInput.value;
    if (!showCustomNeedInput.value) {
      customNeedText.value = '';
      needAnalysisTags.value = [];
    }
    return;
  }
  const cur = store.answers.needs;
  store.setAnswer('needs', cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
}

function analyzeNeedText() {
  const t = customNeedText.value.toLowerCase();
  const tags = [];
  const cur = [...store.answers.needs];
  const curAvoid = [...store.answers.avoid];

  if (t.includes('gout') || t.includes('gút') || t.includes('purin')) {
    tags.push('Ít đạm purin (Bệnh Gout)');
    if (!cur.includes('gout')) cur.push('gout');
    if (!curAvoid.includes('no_seafood')) curAvoid.push('no_seafood');
  }
  if (t.includes('không hải sản') || t.includes('dị ứng hải sản') || t.includes('kiêng hải sản')) {
    tags.push('Kiêng hải sản');
    if (!curAvoid.includes('no_seafood')) curAvoid.push('no_seafood');
  }
  if (t.includes('dầu') || t.includes('dạ dày') || t.includes('tiêu hóa') || t.includes('thanh đạm')) {
    tags.push('Thanh đạm / Dễ tiêu');
    if (!cur.includes('sensitive_stomach')) cur.push('sensitive_stomach');
  }
  if (t.includes('gym') || t.includes('cơ bắp') || t.includes('tập')) {
    tags.push('Tăng cơ / Tập Gym');
    if (!cur.includes('gym')) cur.push('gym');
  }
  if (t.includes('đường') || t.includes('tiểu đường')) {
    tags.push('Kiểm soát đường huyết');
    if (!cur.includes('limit_sugar')) cur.push('limit_sugar');
  }
  if (t.includes('giảm cân') || t.includes('giảm mỡ') || t.includes('béo')) {
    tags.push('Giảm mỡ / Low carb');
    if (!cur.includes('weight_loss')) cur.push('weight_loss');
  }

  needAnalysisTags.value = tags;
  store.setAnswer('needs', [...new Set(cur)]);
  store.setAnswer('avoid', [...new Set(curAvoid)]);
}

function isAvoidActive(id) {
  if (id === 'custom_avoid') return showCustomAvoidInput.value;
  return store.answers.avoid.includes(id);
}

function toggleAvoid(id) {
  if (id === 'custom_avoid') {
    showCustomAvoidInput.value = !showCustomAvoidInput.value;
    if (!showCustomAvoidInput.value) {
      customAvoidText.value = '';
      avoidAnalysisTags.value = [];
    }
    return;
  }
  const cur = store.answers.avoid;
  store.setAnswer('avoid', cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
}

function analyzeAvoidText() {
  const t = customAvoidText.value.toLowerCase();
  const tags = [];
  const curAvoid = [...store.answers.avoid];

  if (t.includes('bò') || t.includes('beef')) {
    tags.push('Thịt bò');
    if (!curAvoid.includes('no_beef')) curAvoid.push('no_beef');
  }
  if (t.includes('heo') || t.includes('lợn') || t.includes('pork')) {
    tags.push('Thịt heo');
    if (!curAvoid.includes('no_pork')) curAvoid.push('no_pork');
  }
  if (t.includes('tôm') || t.includes('cua') || t.includes('cá') || t.includes('hải sản') || t.includes('seafood')) {
    tags.push('Hải sản');
    if (!curAvoid.includes('no_seafood')) curAvoid.push('no_seafood');
  }
  if (t.includes('cay') || t.includes('ớt') || t.includes('tiêu')) {
    tags.push('Đồ cay');
    if (!curAvoid.includes('no_spicy')) curAvoid.push('no_spicy');
  }
  if (t.includes('bột mì') || t.includes('gluten') || t.includes('bánh mì')) {
    tags.push('Gluten');
    if (!curAvoid.includes('no_gluten')) curAvoid.push('no_gluten');
  }
  if (t.includes('sữa') || t.includes('lactose') || t.includes('bơ sữa')) {
    tags.push('Lactose');
    if (!curAvoid.includes('no_lactose')) curAvoid.push('no_lactose');
  }

  avoidAnalysisTags.value = tags;
  store.setAnswer('avoid', [...new Set(curAvoid)]);
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

.stepper-wrap {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
.ps { display: inline-flex; align-items: center; gap: 18px; }
.ps-btn {
  width: 56px; height: 56px; border-radius: 16px; border: 2px solid var(--green);
  background: var(--card); color: var(--green); font-size: 28px; font-weight: 700; line-height: 1;
  cursor: pointer;
}
.ps-btn:hover:not(:disabled) { background: var(--green-soft); }
.ps-btn:disabled { opacity: .35; cursor: not-allowed; }
.ps-val { min-width: 110px; text-align: center; display: flex; flex-direction: column; line-height: 1.1; }
.ps-val b { font-size: 38px; font-weight: 800; color: var(--ink); }
.ps-val span { font-size: 15px; color: var(--muted); margin-top: 4px; font-weight: 600; }

.social-fast-actions {
  display: grid;
  gap: 10px;
  margin: 16px 0;
}
.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 48px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  border: 1px solid var(--line);
  background: var(--card);
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
}
.social-btn:hover {
  background: var(--bg);
  border-color: var(--muted);
}
.zalo-badge {
  background: #0068FF;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 14px 0 16px;
  color: var(--muted);
  font-size: 13px;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--line);
}
.divider span {
  padding: 0 10px;
}

.custom-input-box {
  margin-top: 10px;
  padding: 12px 14px;
  background: var(--bg);
  border: 1px dashed var(--green);
  border-radius: 12px;
  display: grid;
  gap: 6px;
}
.auto-tag-hint {
  font-size: 13px;
  color: var(--green-d);
  margin: 0;
}
</style>
