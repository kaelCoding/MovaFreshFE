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
        <summary>Đơn tối thiểu và quy tắc tách đợt giao như thế nào?</summary>
        <p>Đơn tối thiểu là 250.000đ để bù chi phí xe lạnh. Đơn từ 250k đến dưới 600k (hoặc ≤ 3 bữa) sẽ giao gộp 1 đợt, phí ship 25.000đ. Đơn từ 600k trở lên VÀ từ 4 bữa trở lên sẽ được Freeship và tự động tách làm 2 đợt (Sáng Chủ Nhật & Sáng Thứ Tư) để nguyên liệu luôn tươi mới.</p>
      </details>
      <details>
        <summary>"Gói Đi Chợ Trả Trước" là gì, có rút tiền mặt được không?</summary>
        <p>Theo quy định tại Nghị định 52/2024, "Gói Đi Chợ Trả Trước" là giải pháp trả trước tiền nguyên liệu định kỳ cho gia đình để nhận ưu đãi tặng thêm (50.000đ – 120.000đ/gói). Giá trị gói chỉ dùng để đổi món ăn tại MOVA Fresh, không thể rút tiền mặt, có giá trị bảo lưu trong 60 ngày.</p>
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
