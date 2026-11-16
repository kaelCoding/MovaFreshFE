<template>
  <span class="sticker" :class="cls" :title="title">
    <i class="sticker-dot" aria-hidden="true"></i>{{ short }}
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { BUSINESS } from '../../shared/config/business';

// Màu sticker lấy từ BUSINESS.stickers (chill = xanh lá, frozen = xanh dương). Chỉ app vận hành hiện màu này.
const props = defineProps({ temp: { type: String, required: true } });

const def = computed(() => BUSINESS.stickers[props.temp] || BUSINESS.stickers.ambient);
const cls = computed(() => (def.value.color ? `sticker-${def.value.color}` : 'sticker-none'));
const title = computed(() => def.value.label);
const short = computed(() => ({ chill: 'Xanh lá · Mát', frozen: 'Xanh dương · Đông' }[props.temp] || 'Thường'));
</script>
