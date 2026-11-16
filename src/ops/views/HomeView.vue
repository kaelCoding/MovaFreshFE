<template>
  <section>
    <h1>Tổng quan</h1>
    <p class="ops-muted">Màn tổng quan tài chính đầy đủ sẽ làm ở P2D. Dưới đây là trạng thái đơn hàng hiện tại.</p>

    <div v-if="sum" class="ops-grid">
      <div class="ops-card ops-stat"><span class="ops-stat-n">{{ sum.ordersTotal }}</span><span>Tổng số đơn giao</span></div>
      <div v-for="(n, status) in sum.ordersByStatus" :key="status" class="ops-card ops-stat">
        <span class="ops-stat-n">{{ n }}</span><span>{{ STATUS_LABEL[status] || status }}</span>
      </div>
      <div class="ops-card ops-stat"><span class="ops-stat-n">{{ sum.closedPlans }}</span><span>Kế hoạch đã chốt sổ</span></div>
      <div class="ops-card ops-stat"><span class="ops-stat-n">{{ sum.purchaseOrders }}</span><span>PO đã lập</span></div>
    </div>

    <h2>Phân hệ</h2>
    <div class="ops-grid">
      <RouterLink v-for="m in modules" :key="m.path" :to="m.path" class="ops-card ops-link">
        <strong>{{ m.title }}</strong>
        <span class="ops-muted">{{ m.note }}</span>
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { api } from '../../shared/api';
import { session, ctx } from '../session';
import { modulesFor } from '../modules';

const STATUS_LABEL = {
  scheduled: 'Chờ trừ tiền',
  paid: 'Đã thu tiền',
  charge_failed: 'Trừ tiền lỗi',
  locked: 'Đã chốt sổ',
  skipped_unpaid: 'Tạm hoãn (chưa trả tiền)'
};

const sum = ref(null);
const modules = computed(() => modulesFor(session.value.role).filter((m) => m.name !== 'overview'));

onMounted(() => {
  sum.value = api.ops.summary(ctx.value);
});
</script>
