<template>
  <svg v-if="path" class="qr-code" :viewBox="`0 0 ${box} ${box}`" shape-rendering="crispEdges" role="img" :aria-label="label">
    <rect :width="box" :height="box" fill="#fff" />
    <path :d="path" fill="#000" />
  </svg>
</template>

<script setup>
import { computed } from 'vue';
import { encodeQr, qrPath } from '../../shared/utils/qr';

const props = defineProps({
  value: { type: String, required: true },
  quiet: { type: Number, default: 2 },
  label: { type: String, default: 'Mã QR' }
});

const qr = computed(() => {
  try {
    return encodeQr(props.value);
  } catch {
    return null;
  }
});
const box = computed(() => (qr.value ? qr.value.size + props.quiet * 2 : 0));
const path = computed(() => (qr.value ? qrPath(qr.value.modules, props.quiet) : ''));
</script>

<style scoped>
.qr-code { display: block; width: 100%; height: 100%; }
</style>
