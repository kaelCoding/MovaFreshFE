<template>
  <div class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox" style="max-width: 440px; padding: 24px">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>
      <h3 style="font-size: 18px; font-weight: 800; margin-bottom: 12px">
        Thêm địa chỉ giao hàng tại TP.HCM
      </h3>
      <form @submit.prevent="handleSave" style="display: grid; gap: 12px">
        <div>
          <label class="blabel" for="adLabel">Tên nhãn (Nhà riêng, Công ty...):</label>
          <div class="money" style="background: #fff">
            <input id="adLabel" v-model="form.label" placeholder="VD: Nhà riêng / Căn hộ" required />
          </div>
        </div>
        <div>
          <label class="blabel" for="adDistrict">Quận/Huyện TP.HCM:</label>
          <select id="adDistrict" v-model="form.district" class="select-box">
            <option value="Quận 1">Quận 1</option>
            <option value="Quận 3">Quận 3</option>
            <option value="Quận 7">Quận 7</option>
            <option value="Bình Thạnh">Bình Thạnh</option>
            <option value="Phú Nhuận">Phú Nhuận</option>
            <option value="Tân Bình">Tân Bình</option>
            <option value="TP. Thủ Đức">TP. Thủ Đức</option>
            <option value="Quận 4">Quận 4</option>
            <option value="Quận 5">Quận 5</option>
            <option value="Quận 10">Quận 10</option>
          </select>
        </div>
        <div>
          <label class="blabel" for="adDetail">Địa chỉ chi tiết:</label>
          <div class="money" style="background: #fff">
            <input id="adDetail" v-model="form.detail" placeholder="Số nhà, tên đường, phường..." required />
          </div>
        </div>
        <label class="tog" style="margin-top: 4px">
          <input type="checkbox" v-model="form.isDefault" />
          <span>Đặt làm địa chỉ mặc định</span>
        </label>
        <button
          type="submit"
          class="btn primary"
          style="width: 100%; justify-content: center; padding: 11px; margin-top: 6px"
        >
          Lưu địa chỉ
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();

const form = reactive({
  label: 'Nhà riêng',
  district: 'Quận 7',
  detail: '',
  isDefault: false
});

const handleSave = () => {
  if (!form.detail.trim()) {
    store.toast('Vui lòng nhập địa chỉ chi tiết');
    return;
  }
  store.addAddress({ ...form });
};
</script>

<style scoped>
.select-box {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: #fff;
  font-size: 14px;
  outline: none;
}
</style>
