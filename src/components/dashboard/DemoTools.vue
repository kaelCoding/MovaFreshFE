<template>
  <section class="pl-card demo" aria-label="Công cụ demo">
    <h2 class="pl-h2">Công cụ demo (chỉ hiện khi thêm ?demo=1)</h2>
    <p class="pl-note">Đồng hồ giả lập: <b class="num">{{ nowLabel }}</b>. Các nút này thay cho app vận hành để xem khách thấy gì ở từng mốc.</p>
    <div class="btns">
      <button class="pl-btn sm" type="button" @click="jump('charge')">Tua tới mốc trừ tiền kế</button>
      <button class="pl-btn sm" type="button" @click="jump('cutoff')">Tua tới giờ chốt sổ kế</button>
      <button class="pl-btn sm" type="button" @click="jump('delivery')">Tua tới giờ giao kế</button>
      <button class="pl-btn sm" type="button" @click="deliver">Đánh dấu giao xong các đơn đã chốt của tôi</button>
      <button class="pl-btn sm" type="button" @click="reset">Đặt lại toàn bộ dữ liệu demo</button>
    </div>
    <p v-if="message" class="pl-note" role="status">{{ message }}</p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { api } from '../../shared/api';
import { fmtDeadline } from '../../shared/utils/time';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const admin = { role: 'admin' };
const now = ref(api.demo.state(admin).now);
const message = ref('');
const nowLabel = computed(() => fmtDeadline(new Date(now.value)));

const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#E4F0E8"/><rect x="200" y="110" width="240" height="150" rx="12" fill="#E9D9BF" stroke="#146C43" stroke-width="4"/><text x="320" y="196" font-size="22" text-anchor="middle" fill="#146C43" font-family="sans-serif">Ảnh giao hàng (mẫu)</text></svg>'
  );

function sync() {
  now.value = api.demo.state(admin).now;
  store.refresh();
}

function jump(kind) {
  api.demo.jumpTo(admin, kind);
  message.value = '';
  sync();
}

function deliver() {
  const mine = api.ops.listOrders(admin).filter((o) => o.customerId === store.customerId && ['locked', 'in_production', 'shipped'].includes(o.status));
  if (!mine.length) {
    message.value = 'Chưa có đơn nào đã chốt sổ. Hãy tua tới giờ chốt sổ trước.';
    return;
  }
  for (const o of mine) {
    for (const status of ['in_production', 'shipped', 'delivered']) {
      try {
        api.ops.setOrderStatus(admin, { orderId: o.id, status, photoUrl: status === 'delivered' ? PHOTO : null });
      } catch {
        // đơn đã qua bước này
      }
    }
  }
  message.value = `Đã giao xong ${mine.length} đơn. Mở chuông thông báo và mục đánh giá để xem.`;
  sync();
}

function reset() {
  api.demo.reset(admin);
  message.value = 'Đã đặt lại dữ liệu demo.';
  store.logout(true);
  location.reload();
}
</script>

<style scoped>
.demo { margin-top: 28px; border-style: dashed; display: grid; gap: 10px; }
.btns { display: flex; flex-wrap: wrap; gap: 8px; }
.pl-h2 { font-size: 18px; }
</style>
