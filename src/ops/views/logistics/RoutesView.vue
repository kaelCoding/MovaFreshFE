<template>
  <section>
    <h1 class="ops-noprint">Lập tuyến chặng cuối</h1>
    <p class="ops-muted proc-note ops-noprint">
      Theo khung giờ: gom theo khu, rồi phường, rồi xếp thứ tự điểm giao. Mỗi shipper có sức chở (thùng / chuyến) trong cấu hình và không bao giờ bị xếp vượt. Điều phối thấy mã đơn, quận, phường;
      tên, địa chỉ, SĐT người nhận chỉ hiện ở kho phụ để in phiếu tuyến. Kho phụ chia thùng và xuất kho ở tab Kho phụ.
    </p>
    <RouteBoard mode="plan" />
  </section>
</template>

<script setup>
import RouteBoard from '../../components/RouteBoard.vue';
</script>
