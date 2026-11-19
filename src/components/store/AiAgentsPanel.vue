<template>
  <section class="ai-section" aria-labelledby="ai-title">
    <div class="ai-panel">
      <div class="ai-heading">
        <div>
          <p class="eyebrow">TRỢ LÝ MOVA</p>
          <h2 id="ai-title">Bếp trưởng</h2>
          <p class="muted">Dựa trên câu trả lời khảo sát để gợi ý thực đơn phù hợp gia đình bạn.</p>
        </div>
        <button
          class="btn primary"
          type="button"
          :disabled="loading || !personalDataConsent || !hasApiConfig"
          @click="runAgents"
        >
          {{ loading ? 'Đang tạo thực đơn…' : mealPlan || props.hasAppliedMenu ? 'Tạo lại thực đơn' : 'Nhờ Bếp trưởng gợi ý' }}
        </button>
      </div>

      <div class="ai-consents">
        <label>
          <input v-model="personalDataConsent" type="checkbox" @change="savePersonalDataConsent">
          Tôi đồng ý gửi câu trả lời khảo sát (không gồm thông tin liên hệ) tới Trợ lý MOVA để tạo thực đơn.
        </label>
        <label>
          <input v-model="behaviorConsent" type="checkbox" :disabled="!personalDataConsent" @change="saveBehaviorConsent">
          Tôi đồng ý để Gu ghi nhận các lượt xem chi tiết và đổi món nhằm cá nhân hóa gợi ý sau này (không bắt buộc).
        </label>
      </div>
      <p v-if="behaviorConsent && !hasSupabaseSession" class="ai-hint">
        Bếp trưởng vẫn dùng được ngay. Để lưu lịch sử Gu theo tài khoản web, hãy đăng nhập MOVA; việc theo dõi chỉ bắt đầu sau khi đăng nhập.
      </p>

      <p v-if="error" class="ai-error" role="alert">{{ error }}</p>
      <div v-if="mealPlan" class="ai-results">
        <h3 v-if="mealPlan.meals.length">Bếp trưởng đã tạo gợi ý cho {{ mealPlan.meals.length }} bữa</h3>
        <h3 v-else>Bếp trưởng chưa tìm được món phù hợp từ dữ liệu hiện có</h3>
        <p>MOVA sẽ dùng thực đơn gợi ý theo khảo sát nếu AI thiếu bữa hoặc món không khớp danh mục.</p>
        <p v-if="mealPlan.fallback_notice" class="muted">{{ mealPlan.fallback_notice }}</p>
      </div>

      <div v-if="recommendations" class="ai-results">
        <h3>Gợi ý dành riêng cho bạn</h3>
        <ul>
          <li v-for="item in recommendations.items" :key="item.dish_id">
            <strong>{{ item.name }}</strong>
            <small>{{ item.chef_reason }}</small>
          </li>
        </ul>
      </div>

      <p v-if="!hasApiConfig" class="ai-hint">
        Cần cấu hình VITE_API_BASE_URL để gọi Trợ lý MOVA.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { usePlanFlowStore } from '../../stores/usePlanFlowStore';
import { generateGuestMealPlan, generateMealPlan, getAiConsents, getPersonalizedRecommendations, updateAiConsents, updateAiProfile } from '../../services/aiApi';
import { getAccessToken, supabase } from '../../services/supabase';

const props = defineProps({
  hasAppliedMenu: { type: Boolean, default: false }
});
const emit = defineEmits(['behavior-consent-change', 'meal-plan-generated', 'meal-plan-unavailable']);
defineExpose({ refreshGu });
const store = usePlanFlowStore();
const mealPlan = ref(null);
const recommendations = ref(null);
const error = ref('');
const loading = ref(false);
const personalDataConsent = ref(false);
const behaviorConsent = ref(false);
const hasSupabaseSession = ref(false);
const hasApiConfig = computed(() => Boolean(import.meta.env.VITE_API_BASE_URL));
let authSubscription;

const cuisinePreferences = computed(() => {
  const cuisines = store.answers.cuisines;
  if (Array.isArray(cuisines) && cuisines.length) return cuisines;
  return [store.answers.cuisine || 'viet'];
});

function surveyAnswers() {
  const answers = store.answers;
  return {
    household_size: answers.size,
    weekly_home_meals_count: answers.meals,
    cuisine_preferences: cuisinePreferences.value,
    avoid: answers.avoid,
    allergies_and_restrictions: answers.avoid.filter((value) => value.startsWith('no_')),
    household_needs: answers.needs,
    weekly_grocery_budget_vnd: answers.budget || undefined
  };
}

function emitBehaviorConsent() {
  emit('behavior-consent-change', Boolean(hasSupabaseSession.value && personalDataConsent.value && behaviorConsent.value));
}

async function syncConsents() {
  error.value = '';
  let token;
  try {
    token = await getAccessToken();
  } catch (cause) {
    hasSupabaseSession.value = false;
    error.value = cause instanceof Error ? cause.message : 'Không thể kiểm tra phiên đăng nhập.';
    return;
  }
  hasSupabaseSession.value = Boolean(token);
  if (!token) {
    personalDataConsent.value = false;
    behaviorConsent.value = false;
    emitBehaviorConsent();
    return;
  }
  try {
    const consents = await getAiConsents();
    personalDataConsent.value = consents.personal_data_processing;
    behaviorConsent.value = consents.personal_data_processing && consents.behavior_tracking;
    emitBehaviorConsent();
    if (consents.personal_data_processing && consents.behavior_tracking) {
      await refreshGu();
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Không thể tải trạng thái đồng ý.';
    emitBehaviorConsent();
  }
}

onMounted(async () => {
  await syncConsents();
  if (!supabase) return;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    hasSupabaseSession.value = Boolean(session);
    if (!session) {
      personalDataConsent.value = false;
      behaviorConsent.value = false;
      mealPlan.value = null;
      recommendations.value = null;
      emitBehaviorConsent();
      return;
    }
    window.setTimeout(() => { void syncConsents(); }, 0);
  });
  authSubscription = data.subscription;
});

onUnmounted(() => authSubscription?.unsubscribe());

async function saveBehaviorConsent() {
  error.value = '';
  if (!hasSupabaseSession.value) {
    emitBehaviorConsent();
    return;
  }
  try {
    await updateAiConsents({ behavior_tracking: behaviorConsent.value });
    emitBehaviorConsent();
  } catch (cause) {
    behaviorConsent.value = !behaviorConsent.value;
    error.value = cause instanceof Error ? cause.message : 'Không thể lưu lựa chọn theo dõi của Gu.';
    emitBehaviorConsent();
  }
}

async function savePersonalDataConsent() {
  error.value = '';
  if (personalDataConsent.value) return;

  const previousBehaviorConsent = behaviorConsent.value;
  behaviorConsent.value = false;
  mealPlan.value = null;
  recommendations.value = null;
  emitBehaviorConsent();
  if (!hasSupabaseSession.value) return;

  try {
    await updateAiConsents({
      personal_data_processing: false,
      behavior_tracking: false
    });
  } catch (cause) {
    personalDataConsent.value = true;
    behaviorConsent.value = previousBehaviorConsent;
    error.value = cause instanceof Error ? cause.message : 'Không thể cập nhật lựa chọn xử lý dữ liệu.';
    emitBehaviorConsent();
  }
}

async function refreshGu() {
  if (!hasSupabaseSession.value || !personalDataConsent.value || !behaviorConsent.value) return;
  try {
    recommendations.value = await getPersonalizedRecommendations();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Chưa thể tải gợi ý của Gu.';
  }
}

async function runAgents() {
  loading.value = true;
  error.value = '';
  mealPlan.value = null;
  recommendations.value = null;
  try {
    const answers = surveyAnswers();
    const token = await getAccessToken();
    if (token) {
      await updateAiConsents({
        personal_data_processing: true,
        behavior_tracking: behaviorConsent.value
      });
      await updateAiProfile({
        household_size: answers.household_size,
        servings_default: answers.household_size,
        weekly_grocery_budget_vnd: answers.weekly_grocery_budget_vnd,
        cuisines: cuisinePreferences.value,
        avoid: answers.avoid,
        allergen_codes: answers.allergies_and_restrictions
          .map((value) => ({ no_seafood: 'seafood', no_gluten: 'gluten', no_lactose: 'lactose' })[value])
          .filter(Boolean),
        avoid_tags: answers.allergies_and_restrictions
          .map((value) => ({ no_beef: 'beef', no_pork: 'pork', no_spicy: 'spicy' })[value])
          .filter(Boolean),
        household_needs: answers.household_needs
      });
      mealPlan.value = await generateMealPlan({ survey_answers: answers, max_prep_minutes: 20 });
    } else {
      mealPlan.value = await generateGuestMealPlan({
        survey_answers: answers,
        max_prep_minutes: 20
      });
    }
    emit('meal-plan-generated', mealPlan.value);
    if (token && behaviorConsent.value) {
      await refreshGu();
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Không thể kết nối AI Agent.';
    emit('meal-plan-unavailable');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.ai-section {
  padding: clamp(32px, 5vw, 64px) 0;
  background: linear-gradient(180deg, var(--green-soft), rgba(228, 240, 232, 0));
}
.ai-panel {
  padding: clamp(20px, 4vw, 36px);
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--card);
  box-shadow: 0 16px 40px rgba(20, 35, 25, .08);
}
.ai-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.ai-heading h2 {
  margin: 2px 0 6px;
  font-size: 24px;
}
.ai-heading p {
  margin: 0;
}
.eyebrow {
  color: var(--green);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
}
.ai-consents input[type="checkbox"] {
  accent-color: var(--green);
}
.ai-consents {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  font-size: 13px;
}
.ai-consents label {
  display: flex;
  gap: 8px;
}
.ai-results {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.ai-results h3 {
  margin: 0 0 10px;
}
.ai-results ul {
  display: grid;
  gap: 10px;
  padding-left: 20px;
}
.ai-results li small {
  display: block;
  color: var(--muted);
}
.ai-error {
  margin: 16px 0 0;
  color: #b42318;
}
.ai-hint {
  margin: 14px 0 0;
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 680px) {
  .ai-heading { align-items: flex-start; flex-direction: column; }
}
</style>
