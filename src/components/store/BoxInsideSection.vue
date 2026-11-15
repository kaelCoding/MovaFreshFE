<template>
  <section class="box" id="ben-trong">
    <div class="wrap">
      <div class="sec-h">
        <h2>Bên trong hộp MOVA</h2>
        <p>Mỗi bữa là một bộ đủ để nấu ngay. Bạn chỉ cần chảo, bếp và 15 phút.</p>
      </div>
      <div class="boxgrid">
        <div class="bx">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="6" y="18" width="52" height="34" rx="8" fill="#F3EEE3" stroke="#D9CFB9" stroke-width="2"/>
            <rect x="12" y="24" width="18" height="12" rx="5" fill="#8A3E24"/>
            <rect x="33" y="24" width="18" height="12" rx="5" fill="#9E4A2C"/>
            <rect x="18" y="37" width="20" height="10" rx="5" fill="#7B3520"/>
            <path d="M14 18c4-6 32-6 36 0" fill="none" stroke="#146C43" stroke-width="2"/>
          </svg>
          <b>Khay thịt, trứng sơ chế sạch</b>
          <p>Cắt miếng chuẩn cỡ, ướp nền thảo mộc tự nhiên. Mở hộp ra là nấu.</p>
        </div>

        <div class="bx">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path d="M16 14h32l-3 40H19z" fill="#E4F0E8" stroke="#146C43" stroke-width="2"/>
            <circle cx="26" cy="30" r="5" fill="#B87BB0"/>
            <circle cx="38" cy="34" r="4" fill="#F4E9C8"/>
            <rect x="24" y="40" width="16" height="4" rx="2" fill="#9DBB5B"/>
            <path d="M33 22l6 4" stroke="#D3352B" stroke-width="3" stroke-linecap="round"/>
          </svg>
          <b>Túi gia vị tươi trong ngày</b>
          <p>Hành tím, tỏi, sả, ớt tươi băm sẵn trong ngày để phi thơm dậy mùi bếp nhà.</p>
        </div>

        <div class="bx">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="14" y="12" width="36" height="42" rx="6" fill="#FCEDE4" stroke="#D9531E" stroke-width="2"/>
            <path d="M14 22h36" stroke="#D9531E" stroke-width="2" stroke-dasharray="3 3"/>
            <path d="M22 38c4-6 16-6 20 0-4 6-16 6-20 0z" fill="#B5542A"/>
          </svg>
          <b>Gói sốt gia vị đóng rời</b>
          <p>Tách riêng hoàn toàn để người ăn đậm hay ăn nhạt tự gia giảm theo ý thích.</p>
        </div>

        <div class="bx">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="8" y="18" width="48" height="36" rx="6" fill="#FFFFFF" stroke="#8FB3C9" stroke-width="2"/>
            <rect x="8" y="12" width="48" height="10" rx="4" fill="#DCEAF2" stroke="#8FB3C9" stroke-width="2"/>
            <rect x="16" y="30" width="14" height="16" rx="4" fill="#BFE0F0"/>
            <rect x="34" y="30" width="14" height="16" rx="4" fill="#BFE0F0"/>
            <path d="M23 34v8M19 38h8M41 34v8M37 38h8" stroke="#5D93B3" stroke-width="1.6"/>
          </svg>
          <b>Thùng giữ nhiệt & đá gel -18°C</b>
          <p>Đá gel cấp đông −18°C giữ thực phẩm trong khoảng 0–4°C suốt 16 giờ xuyên đêm.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.box {
  padding: 40px 0;
  background: var(--card);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
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

.boxgrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.bx {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 18px;
  background: var(--bg);
}

.bx svg {
  width: 56px;
  height: 56px;
  display: block;
  margin-bottom: 12px;
}

.bx b {
  display: block;
  font-size: 15.5px;
}

.bx p {
  font-size: 13.5px;
  color: var(--muted);
  margin-top: 6px;
}

@media (max-width: 900px) {
  .boxgrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .boxgrid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
