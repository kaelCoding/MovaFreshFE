<template>
  <div v-html="svgContent" class="qr-svg-wrapper"></div>
</template>

<script setup>
import { computed } from 'vue';
import { rng } from '../../utils/formatters';

const props = defineProps({
  seed: {
    type: Number,
    default: 1000000
  }
});

const svgContent = computed(() => {
  const R = rng(props.seed);
  const n = 25;
  let r = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const f = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
      let on;
      if (f) {
        const fx = x >= n - 7 ? x - n + 7 : x;
        const fy = y >= n - 7 ? y - n + 7 : y;
        on =
          fx === 0 ||
          fx === 6 ||
          fy === 0 ||
          fy === 6 ||
          (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
      } else {
        on = R() > 0.52;
      }
      if (on) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }
  return `<svg viewBox="0 0 25 25" fill="#1E241D" style="width:100%;height:100%" aria-label="Mã VietQR">${r}</svg>`;
});
</script>

<style scoped>
.qr-svg-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
