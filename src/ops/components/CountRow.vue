<template>
  <div class="count-row" :class="{ 'count-done': done >= need && need > 0 }" :data-key="itemKey">
    <div class="count-name">
      <strong>{{ name }}</strong>
      <StickerTag :temp="temp" />
      <span v-if="pending" class="ops-pill ops-pill-warn" data-testid="row-unsent">chưa gửi</span>
    </div>
    <div class="count-spec ops-muted">{{ need }} túi × {{ bagGrams }}g = {{ kg }} kg</div>
    <div class="count-num" :aria-label="`Đã làm ${done} trên ${need} túi`">
      <span class="count-done-n" data-testid="done-n">{{ done }}</span><span class="count-sep"> / </span><span>{{ need }}</span>
      <small v-if="done > need" class="ops-muted"> (dư {{ done - need }})</small>
    </div>
    <div class="ops-bar-track"><div class="ops-bar-fill" :style="{ width: pct + '%' }"></div></div>
    <div class="count-actions">
      <button v-for="n in quick" :key="n" class="ops-btn count-btn" :data-add="n" @click="$emit('add', n)">+{{ n }}</button>
      <button class="ops-btn count-btn" data-testid="open-set" @click="editing = !editing">Nhập số</button>
    </div>
    <form v-if="editing" class="count-edit" @submit.prevent="save">
      <label :for="`set-${itemKey}`">Tổng số túi đã làm</label>
      <input :id="`set-${itemKey}`" v-model.number="value" class="ops-input" type="number" inputmode="numeric" min="0" step="1" data-testid="set-input" />
      <div class="ops-actions">
        <button class="ops-btn ops-btn-primary" type="submit" data-testid="set-save">Lưu</button>
        <button class="ops-btn" type="button" @click="editing = false">Hủy</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import StickerTag from './StickerTag.vue';

const props = defineProps({
  itemKey: { type: String, required: true },
  name: { type: String, required: true },
  temp: { type: String, required: true },
  need: { type: Number, required: true },
  done: { type: Number, required: true },
  bagGrams: { type: Number, required: true },
  kg: { type: Number, required: true },
  quick: { type: Array, default: () => [10, 50] },
  pending: { type: Boolean, default: false }
});
const emit = defineEmits(['add', 'set']);

const editing = ref(false);
const value = ref(props.done);
const pct = computed(() => (props.need ? Math.min(100, Math.round((props.done / props.need) * 100)) : 0));

function save() {
  const n = Math.round(Number(value.value));
  if (!Number.isFinite(n) || n < 0) return;
  emit('set', n);
  editing.value = false;
}
</script>
