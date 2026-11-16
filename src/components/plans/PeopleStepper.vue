<template>
  <div class="ps" role="group" aria-label="Số người ăn">
    <button type="button" class="ps-btn" :disabled="modelValue <= min" aria-label="Bớt một người" @click="$emit('update:modelValue', modelValue - 1)">−</button>
    <div class="ps-val num"><b>{{ modelValue }}</b><span>người ăn</span></div>
    <button type="button" class="ps-btn" :disabled="modelValue >= max" aria-label="Thêm một người" @click="$emit('update:modelValue', modelValue + 1)">+</button>
  </div>
</template>

<script setup>
import { BUSINESS } from '../../shared/config/business';

defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: BUSINESS.plan.householdMin },
  max: { type: Number, default: BUSINESS.plan.householdMax }
});
defineEmits(['update:modelValue']);
</script>

<style scoped>
.ps { display: inline-flex; align-items: center; gap: 14px; }
.ps-btn {
  width: 52px; height: 52px; border-radius: 14px; border: 1.5px solid var(--green);
  background: var(--card); color: var(--green); font-size: 26px; font-weight: 700; line-height: 1;
}
.ps-btn:hover:not(:disabled) { background: var(--green-soft); }
.ps-btn:disabled { opacity: .35; cursor: not-allowed; }
.ps-val { min-width: 96px; text-align: center; display: flex; flex-direction: column; line-height: 1.1; }
.ps-val b { font-size: 34px; font-weight: 800; }
.ps-val span { font-size: 14px; color: var(--muted); margin-top: 2px; }
</style>
