<template>
  <div class="mbar">
    <div>
      <div style="font-size: 12px; opacity: .8">Giỏ hàng tuần này</div>
      <b class="num">{{ cartSummaryText }}</b>
    </div>
    <button class="btn sm" @click="store.mobileCartOpen = true">
      Xem giỏ hàng
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../utils/formatters';

const store = useMovaStore();

const cartSummaryText = computed(() => {
  const c = store.calcAll;
  return c.meals ? `${c.meals} bữa, ${fmt(c.total)}` : '0 bữa';
});
</script>

<style scoped>
.mbar {
  display: none;
}

@media (max-width: 980px) {
  .mbar {
    display: flex;
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 35;
    background: var(--ink);
    color: #fff;
    border-radius: 16px;
    padding: 9px 12px 9px 16px;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    box-shadow: 0 10px 24px rgba(30, 25, 15, .3);
  }

  .mbar .btn {
    background: var(--orange);
    border-color: var(--orange);
    color: #fff;
  }
}
</style>
