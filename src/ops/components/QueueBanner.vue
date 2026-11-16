<template>
  <div v-if="show" class="ops-banner ops-noprint" :class="{ 'ops-banner-off': !online }" role="status" data-testid="queue-banner">
    <div class="ops-banner-main">
      <strong v-if="!online">Đang mất mạng.</strong>
      <strong v-else-if="unsent.length">Đang gửi…</strong>
      <span v-if="!online"> Ghi nhận vẫn được lưu trên máy và tự gửi khi có mạng.</span>
      <span class="ops-pill" :class="unsent.length ? 'ops-pill-warn' : 'ops-pill-ok'" data-testid="unsent-count">
        {{ unsent.length ? `Chưa gửi: ${unsent.length}` : 'Đã gửi hết' }}
      </span>
      <span v-if="failed.length" class="ops-pill ops-pill-bad" data-testid="failed-count">Lỗi: {{ failed.length }}</span>
      <button v-if="online && (unsent.length || failed.length)" class="ops-btn ops-btn-small" @click="retryAll">Gửi lại</button>
    </div>
    <p v-if="saveError" class="ops-error">{{ saveError }}</p>
    <ul v-if="failed.length" class="ops-banner-errors">
      <li v-for="f in failed" :key="f.id">
        <span>{{ describe(f) }}: {{ f.error }}</span>
        <button class="ops-btn ops-btn-small ops-btn-danger" @click="discard(f.id)">Bỏ</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { online, unsent, failed, items, saveError, retryAll, discard } from '../queue';

const show = computed(() => !online.value || items.value.length > 0 || Boolean(saveError.value));

const NAMES = {
  progress: 'Số túi đã làm', receipt: 'Nhận nguyên liệu', batch: 'Mẻ túi', printed: 'In nhãn', tick: 'Tích túi vào thùng', closeBox: 'Đóng thùng',
  reopenBox: 'Mở lại thùng', load: 'Lên xe', depart: 'Xuất xe', capacity: 'Năng lực tuần sau', shortage: 'Báo thiếu / hỏng', closeShortage: 'Đóng báo cáo'
};
const describe = (f) => (f.call === 'substituteDish' ? 'Báo khách đổi món' : NAMES[f.args.type] || 'Thao tác');
</script>
