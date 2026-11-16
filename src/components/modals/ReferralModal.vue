<template>
  <div class="modal" role="dialog" aria-modal="true" @click.self="store.closeModal">
    <div class="mbox referral-modal-box">
      <ViralReferralCard as-modal @close="store.closeModal" />
    </div>
  </div>
</template>

<script setup>
import ViralReferralCard from '../shared/ViralReferralCard.vue';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
</script>

<style scoped>
.referral-modal-box {
  max-width: 680px;
  width: 95%;
  padding: 0;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(10, 30, 15, 0.28);
}
</style>
