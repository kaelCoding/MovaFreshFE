<template>
  <div class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox" style="max-width: 480px; padding: 24px">
      <button class="mclose" @click="store.closeModal" aria-label="Đóng">×</button>
      <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 4px">
        Nạp Fresh Credit (Điểm bữa ăn trả trước)
      </h3>
      <p class="muted" style="font-size: 13px; margin-bottom: 14px">
        Quét mã VietQR để hoàn tất nạp giá trị vào tài khoản.
      </p>

      <div class="qr-container">
        <div class="qr-box">
          <VietQrSvg :seed="store.pendingTopup.amount" />
        </div>
        <div style="margin-top: 10px; font-size: 13.5px">
          <div>
            Số tiền chuyển khoản:
            <b class="num" style="color: var(--green); font-size: 18px">
              {{ fmt(store.pendingTopup.amount) }}
            </b>
          </div>
          <div>
            Giá trị nhận được:
            <b class="num" style="color: var(--orange); font-size: 16px">
              {{ fmt(store.pendingTopup.amount + store.pendingTopup.bonus) }}
            </b>
          </div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 6px">
            Nội dung chuyển khoản:
            <b>{{ transferContent }}</b>
          </div>
        </div>
      </div>

      <button
        class="btn primary"
        style="width: 100%; justify-content: center; padding: 12px; font-size: 15px; margin-top: 14px"
        @click="confirmTopup"
      >
        Xác nhận đã chuyển khoản thành công
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import VietQrSvg from '../common/VietQrSvg.vue';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../utils/formatters';

const store = useMovaStore();

const transferContent = computed(() => {
  const code = Math.round(store.pendingTopup.amount / 1e6);
  const phone = store.user.phone.replace(/\s/g, '');
  return `NAP${code}TR ${phone}`;
});

const confirmTopup = () => {
  store.topupPrepaid(store.pendingTopup.amount, store.pendingTopup.bonus);
};
</script>

<style scoped>
.qr-container {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  text-align: center;
}

.qr-box {
  width: 180px;
  height: 180px;
  margin: 0 auto;
  background: #fff;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--line);
}
</style>
