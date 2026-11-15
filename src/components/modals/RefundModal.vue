<template>
  <div class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox" style="max-width: 500px; padding: 24px">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px">
        <div class="shield-icon">🛡️</div>
        <h3 style="font-size: 18px; font-weight: 800">Cam kết độ tươi 100% MOVA</h3>
      </div>
      <p class="muted" style="font-size: 13px; margin-bottom: 14px">
        Nếu thùng hàng mất lạnh, thịt không đạt chuẩn hoặc rau dập trong chuyến xe, MOVA hoàn tiền 100% ngay vào Gói Đi Chợ Trả Trước.
      </p>

      <form @submit.prevent="handleSubmitRefund" style="display: grid; gap: 12px">
        <div>
          <label class="blabel">Loại sự cố gặp phải:</label>
          <select v-model="selectedReason" class="select-box">
            <option value="Hộp mất lạnh, đá gel tan hoàn toàn">Hộp mất lạnh, đá gel tan hoàn toàn</option>
            <option value="Rau củ dập nát do va đập">Rau củ dập nát do va đập</option>
            <option value="Thiếu gói sốt hoặc túi gia vị tươi">Thiếu gói sốt hoặc túi gia vị tươi</option>
            <option value="Thịt không đúng định lượng / quy cách">Thịt không đúng định lượng / quy cách</option>
          </select>
        </div>

        <div>
          <label class="blabel">Chọn món bị ảnh hưởng:</label>
          <select v-model="selectedDishId" class="select-box">
            <option
              v-for="it in availableDishes"
              :key="it.id"
              :value="it.id"
            >
              {{ it.name }} ({{ it.qty }} suất)
            </option>
          </select>
        </div>

        <div>
          <label class="blabel">Mô phỏng hình chụp thực tế:</label>
          <div
            class="photo-drop"
            :class="{ uploaded: photoUploaded }"
            @click="photoUploaded = !photoUploaded"
          >
            <span style="font-size: 24px">📸</span>
            <span style="display: block; font-size: 13px; font-weight: 600; margin-top: 4px">
              {{ photoUploaded ? '✓ Đã đính kèm ảnh: "hop_mat_lanh_01.jpg" (Chạm để đổi)' : 'Bấm để tải ảnh chụp thùng/món lên' }}
            </span>
          </div>
        </div>

        <button
          type="submit"
          class="btn primary"
          style="width: 100%; justify-content: center; padding: 12px; margin-top: 6px"
        >
          Gửi yêu cầu & Nhận hoàn tiền ngay
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();

const selectedReason = ref('Hộp mất lạnh, đá gel tan hoàn toàn');
const photoUploaded = ref(false);

const availableDishes = computed(() => {
  if (!store.activeOrder) return [];
  return store.activeOrder.items;
});

const selectedDishId = ref(availableDishes.value[0]?.id || 'bo-luclac');

const handleSubmitRefund = () => {
  store.refundItem(selectedDishId.value, selectedReason.value);
};
</script>

<style scoped>
.shield-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--orange-soft);
  color: var(--orange-ink);
  display: grid;
  place-items: center;
  font-size: 18px;
}

.select-box {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: #fff;
  font-size: 14px;
  outline: none;
}

.photo-drop {
  border: 1.5px dashed var(--line);
  border-radius: 12px;
  padding: 14px;
  text-align: center;
  cursor: pointer;
  background: var(--bg);
  transition: .15s;
}

.photo-drop.uploaded {
  border-color: var(--green);
  background: var(--green-soft);
}
</style>
