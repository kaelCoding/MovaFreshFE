<template>
  <div class="bag-labels" data-testid="bag-labels">
    <article
      v-for="i in count"
      :key="i"
      class="bag-label"
      :class="[`bag-label-${color}`, { 'label-extra': i > previewCount }]"
      data-testid="bag-label"
    >
      <div class="bag-label-band" aria-hidden="true">{{ bandText }}</div>
      <div class="bag-label-body">
        <div class="bag-label-name">{{ info.name }}</div>
        <div class="bag-label-grams">{{ batch.bagGrams }}g</div>
        <div class="bag-label-line">Đóng {{ fmtDate(new Date(batch.producedAt)) }}</div>
        <div class="bag-label-hsd">HSD {{ batch.expiresAt ? fmtDate(new Date(batch.expiresAt)) : '—' }}</div>
        <div class="bag-label-lot">{{ batch.lotCode ? `Lô ${batch.lotCode}` : 'Không gắn lô' }}</div>
        <div class="bag-label-seq">Túi {{ i }}/{{ count }} · {{ batch.id }}</div>
      </div>
      <div v-if="url" class="bag-label-qr"><QrCode :value="url" label="QR truy xuất nguồn gốc" /></div>
    </article>
    <p v-if="count > previewCount" class="ops-muted label-more ops-noprint">Đang xem trước {{ previewCount }} nhãn đầu, khi in sẽ in đủ {{ count }} nhãn.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import QrCode from '../../components/common/QrCode.vue';
import { BUSINESS } from '../../shared/config/business';
import { fmtDate } from '../../shared/utils/time';

const props = defineProps({
  batch: { type: Object, required: true },
  info: { type: Object, required: true },
  previewCount: { type: Number, default: 6 }
});

const count = computed(() => props.batch.bags);
const def = computed(() => BUSINESS.stickers[props.info.temp] || BUSINESS.stickers.ambient);
const color = computed(() => def.value.color || 'none');
const bandText = computed(() => ({ chill: 'MÁT 0–4°C', frozen: 'ĐÔNG -18°C' }[props.info.temp] || 'THƯỜNG'));
// QR trỏ trang truy xuất của khách /q/:code
const url = computed(() => (props.batch.lotCode ? `${window.location.origin}/q/${props.batch.lotCode}` : ''));
</script>
