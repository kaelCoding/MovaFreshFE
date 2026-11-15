<template>
  <section class="hero">
    <div class="wrap">
      <div>
        <span class="kicker">TƯƠI TỪ TRANG TRẠI ĐẮK LẮK • XE LẠNH XUYÊN ĐÊM GIAO SÁNG SỚM TP.HCM</span>
        <h1>Thịt tươi Đắk Lắk sơ chế sẵn. Giao tận bếp Sài Gòn, 15 phút xong bữa cơm nhà.</h1>
        <p class="anchor">Chỉ từ <b class="num">38.000đ</b> / người • Thu hoạch & sơ chế theo đơn, không trữ hàng tồn lâu ngày</p>
        <ul class="promises">
          <li>⏱ Chuẩn 15 phút – 1 chảo</li>
          <li>❄️ Xe lạnh xuyên đêm Đắk Lắk – TP.HCM</li>
          <li>🌿 Tách riêng gói sốt & giảm 50% tinh bột</li>
        </ul>
        <div class="cta">
          <button class="btn primary" @click="scrollToMenu">Chọn món tuần này</button>
          <button class="btn" @click="chooseBudgetMode">Xếp theo ngân sách của tôi</button>
        </div>
      </div>

      <!-- Khung gỗ 3 món bán chạy tuần này có hiệu ứng khói -->
      <div class="board" aria-label="3 món bán chạy tuần này">
        <div class="board-t">
          <span>Bán chạy tuần này</span>
          <span>Giá mỗi suất</span>
        </div>
        <div class="trio">
          <div
            v-for="(id, index) in trioIds"
            :key="id"
            class="hd"
          >
            <div class="plate">
              <DishPlateSvg
                :dish="byId[id]"
                :uid="'h' + id"
                :steam="index === 0"
                :size="index === 0 ? 105 : 84"
              />
            </div>
            <div>
              <b>{{ byId[id].name }}</b>
              <div class="meta">⏱ {{ byId[id].time }}p, {{ byId[id].meat[0] }}{{ byId[id].meat[1] }}</div>
              <div class="act-row">
                <span class="pr num">{{ fmt(byId[id].price) }}</span>
                <button class="btn sm" @click="quickAdd(id)">+ Thêm</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import DishPlateSvg from '../common/DishPlateSvg.vue';
import { byId } from '../../data/mockData';
import { fmt } from '../../utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
const trioIds = ['bo-luclac', 'ga-sa', 'heo-gung'];

const scrollToMenu = () => {
  const el = document.getElementById('thuc-don');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

const chooseBudgetMode = () => {
  store.setMode('B');
  scrollToMenu();
};

const quickAdd = (id) => {
  const cur = store.cart[id] || 0;
  const n = store.mode === 'B' ? store.n : 2;
  const target = cur ? cur + 1 : n;
  if (store.tryChangeDish(id, target)) {
    store.toast(`Đã thêm ${byId[id].name}`);
  }
};
</script>

<style scoped>
.hero {
  padding: 38px 0 32px;
}

.hero .wrap {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 40px;
  align-items: center;
}

.kicker {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: var(--orange-ink);
  background: var(--orange-soft);
  border-radius: 999px;
  padding: 5px 12px;
  margin-bottom: 14px;
}

.hero h1 {
  font-size: clamp(28px, 4.2vw, 46px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.anchor {
  margin-top: 14px;
  font-size: 16px;
  color: var(--muted);
}

.anchor b {
  color: var(--ink);
  font-weight: 700;
  font-size: 19px;
}

.promises {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
  padding: 0;
  list-style: none;
}

.promises li {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 7px 11px;
  font-size: 13.5px;
  font-weight: 500;
}

.cta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

/* board & trio */
.board {
  position: relative;
  border-radius: 24px;
  padding: 20px;
  background:
    repeating-linear-gradient(97deg, rgba(150, 110, 60, .06) 0 2px, transparent 2px 19px),
    repeating-linear-gradient(93deg, rgba(150, 110, 60, .05) 0 1px, transparent 1px 31px),
    linear-gradient(160deg, #F2E5CE, #E5D2B3);
  box-shadow: inset 0 0 0 1px rgba(120, 85, 40, .12), 0 16px 36px -20px rgba(90, 60, 20, .4);
}

.board-t {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin: 0 4px 10px;
  font-size: 13px;
  color: #6f5a3c;
  font-weight: 700;
}

.trio {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.trio .hd {
  background: rgba(255, 255, 255, .9);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.trio .hd:first-child {
  grid-column: 1 / -1;
  padding: 12px 14px;
}

.trio .plate {
  width: 90px;
  height: 90px;
  flex-shrink: 0;
  position: relative;
}

.trio .hd:first-child .plate {
  width: 120px;
  height: 120px;
}

.trio .hd:not(:first-child) {
  flex-direction: column;
  align-items: flex-start;
}

.trio .hd:not(:first-child) .plate {
  align-self: center;
}

.trio .hd b {
  display: block;
  font-size: 14.5px;
  line-height: 1.3;
}

.trio .hd:first-child b {
  font-size: 16.5px;
}

.trio .meta {
  font-size: 12.5px;
  color: var(--muted);
  margin: 3px 0 6px;
}

.trio .pr {
  font-weight: 700;
  font-size: 14.5px;
}

.act-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 980px) {
  .hero .wrap {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
}

@media (max-width: 520px) {
  .trio {
    grid-template-columns: minmax(0, 1fr);
  }
  .trio .hd:first-child .plate {
    width: 100px;
    height: 100px;
  }
}
</style>
