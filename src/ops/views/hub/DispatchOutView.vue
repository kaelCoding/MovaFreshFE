<template>
  <section>
    <h1 class="ops-noprint">Xuất kho theo khung giờ</h1>
    <p class="ops-muted proc-note ops-noprint">
      Tới giờ khung (xuất kho trước giờ bắt đầu khung {{ lead }} phút), đo nhiệt độ rồi bấm xuất kho từng tuyến. Đơn chuyển sang "đang giao", khách nhận thông báo, shipper thấy tuyến trong app của mình.
    </p>
    <RouteBoard mode="dispatch" />
  </section>
</template>

<script setup>
import { BUSINESS } from '../../../shared/config/business';
import RouteBoard from '../../components/RouteBoard.vue';

const lead = BUSINESS.logistics.dispatchLeadMinutes;
</script>
