<template>
  <div>
    <div class="sec-h" style="margin-bottom: 14px">
      <div>
        <h3>Lịch sử các bữa cơm đã giao</h3>
        <p>Bấm “Đặt lại thực đơn này” để đưa toàn bộ món vào giỏ chỉ với 1 chạm.</p>
      </div>
    </div>

    <div
      v-for="ord in store.historyOrders"
      :key="ord.id"
      class="hist-item"
    >
      <div class="hist-top">
        <div>
          <b>Đơn #{{ ord.id }}</b>
          <span class="muted"> • {{ ord.date }} • {{ ord.meals }} bữa</span>
        </div>
        <div class="act-box">
          <span class="num total-text">{{ fmt(ord.total) }}</span>
          <button class="btn primary sm" @click="handleReorder(ord.id)">
            🔁 Đặt lại thực đơn này (1 chạm)
          </button>
        </div>
      </div>

      <div class="rate-prompt">
        Đánh giá nhanh khẩu vị để MOVA nêm gia vị chuẩn hơn lần sau:
      </div>
      <div class="dish-rate-list">
        <div
          v-for="it in ord.items"
          :key="it.id"
          class="rate-row"
        >
          <span><b>{{ it.name }}</b> ({{ it.qty }} suất)</span>
          <div class="rate-btns">
            <button
              class="rate-btn"
              :class="{ selected: it.rate === 'good' }"
              @click="store.rateDish(ord.id, it.id, 'good')"
            >
              👍 Vừa miệng
            </button>
            <button
              class="rate-btn"
              :class="{ selected: it.rate === 'salty' }"
              @click="store.rateDish(ord.id, it.id, 'salty')"
            >
              🧂 Hơi mặn
            </button>
            <button
              class="rate-btn"
              :class="{ selected: it.rate === 'bland' }"
              @click="store.rateDish(ord.id, it.id, 'bland')"
            >
              💧 Hơi nhạt
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../shared/utils/formatters';

const store = useMovaStore();
const router = useRouter();

const handleReorder = (id) => {
  store.reorderHistory(id);
  router.push('/');
};
</script>

<style scoped>
.sec-h h3 {
  font-size: 18px;
  font-weight: 800;
}

.sec-h p {
  color: var(--muted);
  font-size: 13.5px;
  margin-top: 2px;
}

.hist-item {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 16px;
}

.hist-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.hist-top b {
  font-size: 15.5px;
}

.act-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.total-text {
  font-weight: 800;
  color: var(--green);
  font-size: 16px;
}

.rate-prompt {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
}

.dish-rate-list {
  display: grid;
  gap: 8px;
  margin: 12px 0 4px;
}

.rate-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--bg);
  font-size: 13.5px;
}

.rate-btns {
  display: flex;
  gap: 4px;
}

.rate-btn {
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  transition: .15s;
}

.rate-btn:hover {
  background: var(--line-2);
}

.rate-btn.selected {
  background: var(--green-soft);
  border-color: var(--green);
  color: var(--green-d);
  font-weight: 700;
}

@media (max-width: 640px) {
  .rate-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
