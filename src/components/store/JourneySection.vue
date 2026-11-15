<template>
  <section class="journey" id="hanh-trinh">
    <div class="wrap">
      <div class="sec-h">
        <h2>Hành trình tươi 16 giờ</h2>
        <p>Mô hình thu hoạch và sơ chế theo đơn: thịt được cắt tại nhà máy Đắk Lắk và chạy xe lạnh thẳng về TP.HCM trong đêm, không qua kho trung chuyển.</p>
      </div>
      <ol class="steps">
        <li>
          <span class="dot">1</span>
          <span class="when">Trước 20:00 T5 hoặc CN</span>
          <b>Bạn chốt đơn</b>
          <p>Không ép mua cả tuần. Chọn số bữa vừa túi tiền (đơn tối thiểu 250.000đ).</p>
        </li>
        <li>
          <span class="dot">2</span>
          <span class="when">Sáng sớm tại Đắk Lắk</span>
          <b>Thu hoạch và sơ chế</b>
          <p>Nhà máy cắt định lượng, ướp thảo mộc nền nhạt, đóng gói gia vị tươi băm trong ngày.</p>
        </li>
        <li>
          <span class="dot">3</span>
          <span class="when">22:00 – 05:00</span>
          <b>Xe lạnh xuyên đêm</b>
          <p>Thùng giữ nhiệt với đá gel cấp đông −18°C chạy thẳng về cửa ngõ TP.HCM.</p>
        </li>
        <li>
          <span class="dot">4</span>
          <span class="when">Trước 10:00 Sáng CN & T4</span>
          <b>Giao tận bếp</b>
          <p>Shipper giao tận cửa theo khung giờ bạn chọn: 06:30–08:30 hoặc 08:30–10:00.</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.journey {
  padding: 32px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--card);
}

.sec-h {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.sec-h h2 {
  font-size: clamp(22px, 2.8vw, 30px);
  font-weight: 800;
}

.sec-h p {
  color: var(--muted);
  max-width: 56ch;
  font-size: 14.5px;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  position: relative;
}

.steps::before {
  content: "";
  position: absolute;
  left: 24px;
  right: 24px;
  top: 22px;
  height: 2px;
  background: repeating-linear-gradient(90deg, var(--green) 0 8px, transparent 8px 14px);
  opacity: .5;
}

.steps li {
  position: relative;
}

.steps .dot {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--card);
  border: 2px solid var(--green);
  display: grid;
  place-items: center;
  font-weight: 800;
  color: var(--green);
  position: relative;
  z-index: 1;
}

.steps li:last-child .dot {
  background: var(--green);
  color: #fff;
}

.steps .when {
  display: block;
  margin-top: 10px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--orange-ink);
}

.steps b {
  display: block;
  font-size: 15.5px;
  margin-top: 2px;
}

.steps p {
  font-size: 13.5px;
  color: var(--muted);
  margin-top: 4px;
}

@media (max-width: 820px) {
  .steps {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
  .steps::before {
    left: 21px;
    right: auto;
    top: 20px;
    bottom: 20px;
    width: 2px;
    height: auto;
    background: repeating-linear-gradient(180deg, var(--green) 0 8px, transparent 8px 14px);
  }
  .steps li {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    column-gap: 14px;
  }
  .steps .when {
    margin-top: 0;
  }
  .steps li > *:not(.dot) {
    grid-column: 2;
  }
  .steps .dot {
    grid-row: 1 / span 3;
  }
}
</style>
