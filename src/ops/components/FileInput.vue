<template>
  <div class="file-input">
    <div v-if="modelValue" class="file-chosen">
      <img v-if="isImage" :src="modelValue.dataUrl" alt="Hóa đơn đã chọn" class="file-thumb" />
      <span v-else class="ops-pill">PDF</span>
      <span class="file-name">{{ modelValue.name }}</span>
      <button type="button" class="ops-btn ops-btn-small ops-btn-danger" @click="$emit('update:modelValue', null)">Bỏ tệp</button>
    </div>
    <label v-else class="ops-btn file-pick">
      <span>{{ busy ? 'Đang xử lý…' : label }}</span>
      <input type="file" accept="image/*,application/pdf" class="file-hidden" :data-testid="testid" @change="onPick" />
    </label>
    <p v-if="error" class="ops-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: { type: Object, default: null },
  label: { type: String, default: 'Chọn ảnh / PDF hóa đơn' },
  testid: { type: String, default: 'file' },
  maxPx: { type: Number, default: 900 },
  maxPdfBytes: { type: Number, default: 700000 }
});
const emit = defineEmits(['update:modelValue']);
const busy = ref(false);
const error = ref('');
const isImage = computed(() => props.modelValue && /^image\//.test(props.modelValue.type));

const readAsDataUrl = (f) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Không đọc được tệp'));
    r.readAsDataURL(f);
  });

/** Ảnh được thu nhỏ để nhẹ bộ nhớ trình duyệt; PDF giữ nguyên nhưng giới hạn dung lượng. */
async function shrink(f) {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Không đọc được ảnh'));
      i.src = url;
    });
    const k = Math.min(1, props.maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function onPick(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  busy.value = true;
  error.value = '';
  try {
    if (f.type === 'application/pdf') {
      if (f.size > props.maxPdfBytes) throw new Error('Tệp PDF quá lớn (tối đa khoảng 700 KB). Hãy chụp ảnh hóa đơn thay thế.');
      emit('update:modelValue', { name: f.name, type: f.type, dataUrl: await readAsDataUrl(f) });
    } else if (/^image\//.test(f.type)) {
      emit('update:modelValue', { name: f.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', dataUrl: await shrink(f) });
    } else {
      throw new Error('Chỉ nhận ảnh hoặc PDF');
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.file-pick { display: inline-flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.file-hidden { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.file-chosen { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.file-thumb { width: 88px; height: 88px; object-fit: cover; border-radius: 12px; border: 2px solid var(--line); }
.file-name { font-size: 15px; word-break: break-all; }
</style>
