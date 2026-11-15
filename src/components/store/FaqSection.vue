<template>
  <section class="faq" id="hoi-dap">
    <div class="wrap" style="max-width: 860px">
      <div class="sec-h">
        <h2>Hỏi đáp thường gặp</h2>
      </div>
      <details>
        <summary>Thịt sơ chế từ Đắk Lắk chở xuống Sài Gòn có đảm bảo tươi ngon?</summary>
        <p>Thịt và rau được thu hoạch sơ chế vào sáng sớm, đóng thùng giữ nhiệt đá gel −18°C, lên xe lạnh lúc 22:00 và tới Sài Gòn lúc 05:00 sáng. Suốt hành trình nhiệt độ luôn giữ 0–4°C. Nếu thùng hàng tới tay không còn lạnh, MOVA bồi thường 100% bữa ăn đó vào Gói Đi Chợ Trả Trước.</p>
      </details>
      <details>
        <summary>Quy cách giao hàng và chi phí vận chuyển như thế nào?</summary>
        <p>MOVA Fresh vận hành tuyến xe lạnh chuyên dụng từ Đắk Lắk về TP.HCM vào các khung giờ sáng sớm cố định (Thứ Tư và Chủ Nhật). Toàn bộ các gói bữa ăn tươi đều được miễn phí giao hàng tận cửa trong thùng giữ nhiệt đá gel chuẩn 0–4°C.</p>
      </details>
      <details>
        <summary>"Fresh Credit" là gì, có rút tiền mặt được không?</summary>
        <p>Theo quy định tại Nghị định 52/2024, "Fresh Credit" là điểm bữa ăn trả trước định kỳ cho gia đình để nhận ưu đãi chiết khấu trực tiếp (10% – 25%). Giá trị chỉ dùng để đổi nguyên liệu sơ chế tại MOVA Fresh, không phải ví điện tử và không rút tiền mặt, được cam kết bảo lưu giá trị.</p>
      </details>
      <details>
        <summary>Nếu bận đột xuất muốn hoãn đợt giao thì làm thế nào?</summary>
        <p>Bạn hoàn toàn có thể vào mục "Tài khoản & Đơn của tôi" bấm "Hoãn đợt giao" trước 20:00 của ngày chốt sổ (trước 20:00 Thứ Năm cho đợt Chủ Nhật, trước 20:00 Chủ Nhật cho đợt Thứ Tư). Toàn bộ tiền suất ăn sẽ được bảo lưu sang đợt tiếp theo.</p>
      </details>
    </div>
  </section>
</template>

<style scoped>
.faq {
  padding: 40px 0 60px;
}

.faq details {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  margin-bottom: 10px;
}

.faq summary {
  list-style: none;
  cursor: pointer;
  padding: 15px 18px;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.faq summary::-webkit-details-marker {
  display: none;
}

.faq summary::after {
  content: "+";
  font-size: 20px;
  line-height: 1;
  color: var(--green);
  font-weight: 500;
}

.faq details[open] summary::after {
  content: "−";
}

.faq details p {
  padding: 0 18px 15px;
  color: var(--muted);
  max-width: 72ch;
  font-size: 14px;
}
</style>
