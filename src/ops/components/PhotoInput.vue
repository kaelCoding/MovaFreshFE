<template>
  <div class="photo-input">
    <div v-if="modelValue" class="photo-preview">
      <img :src="modelValue" alt="Ảnh đã chụp" />
      <button type="button" class="ops-btn ops-btn-danger" @click="$emit('update:modelValue', '')">Chụp lại</button>
    </div>
    <label v-else class="ops-btn photo-pick">
      <span>{{ busy ? 'Đang xử lý ảnh…' : label }}</span>
      <input ref="file" type="file" accept="image/*" capture="environment" class="photo-file" :data-testid="testid" @change="onPick" />
    </label>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { BUSINESS } from '../../shared/config/business';

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Chụp ảnh / chọn ảnh' },
  testid: { type: String, default: 'photo' }
});
const emit = defineEmits(['update:modelValue']);

const busy = ref(false);
const error = ref('');
const file = ref(null);

/** Thu nhỏ ảnh (cạnh dài tối đa BUSINESS.factory.photoMaxPx) và nén JPEG để lưu nhẹ trên máy. */
async function shrink(f) {
  const max = BUSINESS.factory.photoMaxPx;
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Không đọc được ảnh'));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function onPick(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  busy.value = true;
  error.value = '';
  try {
    emit('update:modelValue', await shrink(f));
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
    if (file.value) file.value.value = '';
  }
}
</script>

<style scoped>
.photo-pick { display: inline-flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.photo-file { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.photo-preview { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.photo-preview img { width: 120px; height: 120px; object-fit: cover; border-radius: 12px; border: 2px solid var(--line); }
</style>
