<template>
  <div class="dash-header">
    <div class="u-info">
      <div class="u-avatar">{{ store.user.name.charAt(0) }}</div>
      <div>
        <h2>{{ store.user.name }}</h2>
        <p><span>{{ store.user.phone }}</span> • <span class="muted">Khách hàng Gia đình TP.HCM</span></p>
      </div>
    </div>
    <div class="u-stats">
      <div class="stat-chip">
        <small>Gói Đi Chợ Trả Trước</small>
        <b class="num">{{ fmt(store.user.prepaidBalance) }}</b>
      </div>
      <div class="stat-chip">
        <small>Đơn đang chạy</small>
        <b>{{ store.activeOrder ? '1 đơn' : '0 đơn' }}</b>
      </div>
      <div class="stat-chip">
        <small>Bữa ăn đã nấu</small>
        <b>24 bữa</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../utils/formatters';

const store = useMovaStore();
</script>

<style scoped>
.dash-header {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.u-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.u-avatar {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--green), var(--green-d));
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 22px;
}

.dash-header h2 {
  font-size: 22px;
  font-weight: 800;
}

.dash-header p {
  color: var(--muted);
  font-size: 14px;
}

.u-stats {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.stat-chip {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 8px 14px;
  text-align: right;
}

.stat-chip small {
  display: block;
  font-size: 11.5px;
  color: var(--muted);
  font-weight: 600;
}

.stat-chip b {
  font-size: 17px;
  font-weight: 800;
  color: var(--green);
}
</style>
