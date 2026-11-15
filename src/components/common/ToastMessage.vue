<template>
  <div
    class="toast"
    :class="{ show: store.toastVisible }"
    role="status"
    aria-live="polite"
  >
    {{ store.toastMessage }}
  </div>
</template>

<script setup>
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
</script>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translate(-50%, 16px);
  background: #1C1917;
  color: #FFFFFF;
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  opacity: 0;
  pointer-events: none;
  transition: .25s ease;
  z-index: 9999;
  max-width: min(92vw, 500px);
  text-align: center;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
}

.toast.show {
  opacity: 1;
  transform: translate(-50%, 0);
}

@media (max-width: 980px) {
  .toast {
    bottom: 92px;
  }
}
</style>
