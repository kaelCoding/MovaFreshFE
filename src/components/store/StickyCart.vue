<template>
  <aside
    class="cart"
    :class="{ open: store.mobileCartOpen }"
    aria-label="Giỏ hàng Subscription 4 tuần"
  >
    <!-- PHẦN TRÊN: Cố định đỉnh (Header + Countdown) -->
    <div class="cart-top">
      <div class="cart-head">
        <div>
          <h2>Giỏ Subscription 4 Tuần</h2>
          <small class="cart-sub">
            Gói {{ c.mealsPerWeek }} bữa/tuần • {{ c.householdSize === 1 ? 'Suất 1 người' : `Mâm ${c.householdSize} người` }} (Tổng: {{ c.totalMeals4Weeks }} bữa)
          </small>
        </div>
        <button class="sheet-x" @click="store.mobileCartOpen = false" aria-label="Đóng giỏ">×</button>
      </div>

      <!-- Tuyến lạnh Đắk Lắk & Miễn phí vận chuyển -->
      <div class="v2-logistics-box">
        <div class="v2-logistics-badge">
          <span class="dot-live"></span>
          <span>Xe lạnh xuyên đêm Đắk Lắk – TP.HCM</span>
        </div>
        <p class="v2-logistics-desc">
          Bảo đảm 0°C – 4°C tận cửa nhà • <b>Miễn phí vận chuyển 100%</b>
        </p>
      </div>
    </div>

    <!-- PHẦN GIỮA: Tự cuộn mượt khi danh sách món dài -->
    <div class="cart-scroll-body">
      <!-- Tùy chỉnh nhanh số bữa & người -->
      <div class="config-quick-strip">
        <div class="strip-item">
          <span class="lbl">Quy mô:</span>
          <b>{{ c.householdSize }} người ăn</b>
        </div>
        <div class="strip-item">
          <span class="lbl">Tần suất:</span>
          <b>{{ c.mealsPerWeek }} bữa/tuần</b>
        </div>
        <button class="btn-change-conf" @click="scrollToMenu">Chỉnh ✎</button>
      </div>

      <!-- Danh sách mâm cơm đã chọn cho tuần -->
      <div v-if="!c.meals && !c.adTotal" class="cart-empty">
        <span class="empty-icon">🥗</span>
        <p>Chưa có mâm cơm nào trong thực đơn tuần.</p>
        <button class="btn sm primary" @click="store.autoFillMenu">
          ✨ AI Tự động xếp thực đơn chuẩn
        </button>
      </div>
      <div v-else>
        <div class="drop">
          <div class="drop-head">
            <h3>Thực đơn tuần này ({{ c.meals }} bữa)</h3>
            <button
              v-if="c.meals < c.mealsPerWeek"
              class="btn-need-more"
              @click="scrollToMenu"
            >
              + Chọn thêm {{ c.mealsPerWeek - c.meals }} bữa
            </button>
          </div>

          <ul class="meal-list">
            <li v-for="id in dishKeys" :key="id" class="cart-meal-item">
              <div class="item-main">
                <b class="meal-name">{{ byId[id]?.name }}</b>
                <span class="meal-sub">
                  {{ byId[id]?.components?.main }}
                </span>
              </div>
              <div class="item-act">
                <span class="num pr">{{ fmt(getMealLinePrice(id)) }}</span>
                <button class="x" @click="store.tryChangeDish(id, 0)" aria-label="Bỏ món">✕</button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Sản phẩm mua thêm cùng xe lạnh -->
      <div v-if="c.adTotal > 0" class="drop" style="margin-top: 10px">
        <h3>Sản phẩm mua thêm cùng chuyến</h3>
        <ul class="meal-list">
          <li
            v-for="(q, id) in currentAddons"
            :key="id"
            v-show="q > 0"
            class="cart-meal-item"
          >
            <div class="item-main">
              <span>{{ addonById[id]?.icon }} {{ addonById[id]?.name }} <small class="muted">× {{ q }}</small></span>
            </div>
            <div class="item-act">
              <span class="num pr">{{ fmt(addonById[id]?.price * q) }}</span>
              <button class="x" @click="store.tryChangeAddon(id, 0)">✕</button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Staggered Gift Card Schedule Card (HelloFresh-style) -->
      <div class="giftcard-breakdown-card">
        <div class="gc-head">
          <span class="gc-title">🎁 Phân bổ Gift Card 900.000đ qua 4 tuần:</span>
          <span class="gc-badge">Đã nhận</span>
        </div>
        <div class="gc-weeks-grid">
          <div class="gc-col active">
            <span class="w-name">Tuần 1</span>
            <b class="w-disc num">-300k</b>
            <small class="w-status">Trừ hôm nay</small>
          </div>
          <div class="gc-col">
            <span class="w-name">Tuần 2</span>
            <b class="w-disc num">-200k</b>
            <small class="w-status">Kỳ tiếp</small>
          </div>
          <div class="gc-col">
            <span class="w-name">Tuần 3</span>
            <b class="w-disc num">-200k</b>
            <small class="w-status">Kỳ tiếp</small>
          </div>
          <div class="gc-col">
            <span class="w-name">Tuần 4</span>
            <b class="w-disc num">-200k</b>
            <small class="w-status">Trọn tháng</small>
          </div>
        </div>
        <p class="gc-note">
          🔄 Tự do đổi món hoặc tạm hoãn trước giờ chốt sổ nhà máy <b>8 tiếng</b>.
        </p>
      </div>

      <!-- Tinh chỉnh đóng gói -->
      <div class="subh">Quy cách đóng gói nhà máy</div>
      <label class="tog">
        <input type="checkbox" v-model="store.sauce" @change="onSauceChange" />
        <span>
          Tách riêng gói sốt công thức
          <small>Đóng gói sốt rời để gia đình tự nêm nếm khi nấu.</small>
        </span>
      </label>
      <label class="tog">
        <input type="checkbox" v-model="store.carb" @change="onCarbChange" />
        <span>
          Giảm 50% lượng tinh bột (Đổi Gạo lứt)
          <small>Bữa tối nhẹ bụng, kiểm soát đường huyết (giá không đổi).</small>
        </span>
      </label>
    </div>

    <!-- PHẦN ĐÁY: Luôn ghim chặt ở đáy thẻ giỏ hàng -->
    <div class="cart-bottom">
      <div class="sum">
        <div class="r">
          <span>Chi phí thực đơn 1 tuần ({{ c.meals }} bữa)</span>
          <span class="num">{{ fmt(c.sub) }}</span>
        </div>
        <div v-if="c.save > 0" class="r">
          <span>Tiết kiệm mâm cơm gia đình</span>
          <span class="num g">−{{ fmt(c.save) }}</span>
        </div>
        <div v-if="c.adTotal > 0" class="r">
          <span>Sản phẩm mua thêm</span>
          <span class="num">{{ fmt(c.adTotal) }}</span>
        </div>
        <div class="r">
          <span>Tổng giá trị chu kỳ 4 tuần ({{ c.totalMeals4Weeks }} bữa)</span>
          <span class="num">{{ fmt(c.gross4Weeks) }}</span>
        </div>
        <div class="r highlight-row">
          <span>Ưu đãi Gift Card Tuần 1</span>
          <span class="num g">−{{ fmt(c.week1GiftCardDiscount) }}</span>
        </div>
        <div class="r">
          <span>Phí vận chuyển xe lạnh</span>
          <span class="num g">Miễn phí</span>
        </div>
        <div class="total">
          <div class="total-lbl">
            <span>Thanh toán kỳ này:</span>
            <small class="muted" v-if="store.pay === 'card_recurring'">(Tuần 1 hôm nay • Các tuần sau tự trừ trước 72h)</small>
            <small class="muted" v-else>(Khóa trọn giá 4 tuần • Đã trừ Gift Card)</small>
          </div>
          <b class="num total-amount">{{ fmt(c.total) }}</b>
        </div>
      </div>

      <button
        class="btn orange order"
        :disabled="!c.meals"
        @click="handleOrder"
      >
        <span>Đăng ký gói Subscription 4 tuần • {{ fmt(c.total) }}</span>
      </button>

      <p class="guarantee-note">
        🛡 Cam kết nguyên liệu tươi sạch 100% từ Đắk Lắk • Đổi trả bảo hành trong 1 nốt nhạc.
      </p>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';
import { byId, addonById } from '../../data/mockData';
import { fmt } from '../../utils/formatters';

const store = useMovaStore();

const c = computed(() => store.calcAll);
const currentCart = computed(() => store.cart);
const currentAddons = computed(() => store.addons);

const dishKeys = computed(() => Object.keys(currentCart.value).filter((id) => currentCart.value[id] > 0));

const getMealLinePrice = (id) => {
  const d = byId[id];
  if (!d) return 0;
  const household = c.value.householdSize;
  const base = d.pricePerPerson || d.price || 75000;
  let price = household === 1 ? base : base * household;
  if (store.upsellProtein) price += (household === 1 ? 25000 : 35000);
  return price * (currentCart.value[id] || 1);
};

const scrollToMenu = () => {
  const el = document.getElementById('thuc-don');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

const onSauceChange = () => {
  store.toast(store.sauce ? 'Gói sốt được đóng rời riêng biệt cho mọi món' : 'Gói sốt theo đóng gói tiêu chuẩn');
};

const onCarbChange = () => {
  store.toast(store.carb ? 'Đã giảm 50% tinh bột & đổi sang gạo lứt hữu cơ' : 'Lượng tinh bột về mức chuẩn');
};

const handleOrder = () => {
  store.mobileCartOpen = false;
  if (!store.user.isLoggedIn) {
    store.pendingCheckoutAfterLogin = true;
    store.openModal('login');
  } else {
    store.openModal('checkout');
  }
};
</script>

<style scoped>
.cart {
  position: sticky;
  top: 84px;
  background: var(--card);
  border: 1.5px solid var(--line);
  border-radius: 20px;
  max-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.cart-top {
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  background: var(--card);
}

.cart-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.cart-head h2 {
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
}

.cart-sub {
  font-size: 11.5px;
  color: var(--muted);
  display: block;
  margin-top: 2px;
}

.sheet-x {
  display: none;
  background: transparent;
  border: 0;
  font-size: 24px;
  color: var(--muted);
  cursor: pointer;
}

.v2-logistics-box {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
}

.v2-logistics-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--green);
}

.dot-live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
}

.v2-logistics-desc {
  font-size: 11px;
  color: var(--muted);
  margin: 2px 0 0;
}

.v2-logistics-desc b {
  color: var(--green-d);
}

/* Phần giữa: cuộn */
.cart-scroll-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
}

.config-quick-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg);
  border-radius: 10px;
  padding: 6px 10px;
  margin-bottom: 12px;
  font-size: 12px;
}

.strip-item {
  display: flex;
  gap: 4px;
}

.strip-item .lbl {
  color: var(--muted);
}

.strip-item b {
  color: var(--ink);
}

.btn-change-conf {
  background: transparent;
  border: 0;
  color: var(--green);
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.cart-empty {
  text-align: center;
  padding: 24px 10px;
  color: var(--muted);
  font-size: 13px;
}

.empty-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 6px;
}

.drop {
  margin-bottom: 12px;
}

.drop-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.drop-head h3 {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.btn-need-more {
  background: transparent;
  border: 0;
  color: var(--orange-ink);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.meal-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.cart-meal-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12.5px;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.meal-name {
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meal-sub {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-act {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.item-act .pr {
  font-weight: 700;
  color: var(--ink);
}

.item-act .x {
  background: transparent;
  border: 0;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  padding: 2px 4px;
}

.item-act .x:hover {
  color: var(--red);
}

/* Gift Card Breakdown Card */
.giftcard-breakdown-card {
  background: linear-gradient(135deg, #FCEDE4 0%, #FAF0E4 100%);
  border: 1px solid var(--orange);
  border-radius: 12px;
  padding: 10px 12px;
  margin: 12px 0;
}

.gc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.gc-title {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--orange-ink);
}

.gc-badge {
  font-size: 10px;
  font-weight: 700;
  background: var(--green);
  color: #fff;
  padding: 1px 6px;
  border-radius: 999px;
}

.gc-weeks-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  text-align: center;
}

.gc-col {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(217, 83, 30, 0.2);
  border-radius: 8px;
  padding: 6px 2px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.gc-col.active {
  background: #fff;
  border-color: var(--orange);
  box-shadow: 0 1px 4px rgba(217, 83, 30, 0.15);
}

.w-name {
  font-size: 10px;
  color: var(--muted);
}

.w-disc {
  font-size: 12px;
  color: var(--orange);
}

.w-status {
  font-size: 9px;
  color: var(--orange-ink);
  font-weight: 600;
}

.gc-note {
  font-size: 10.5px;
  color: var(--ink);
  margin: 8px 0 0;
  line-height: 1.35;
}

.subh {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin: 12px 0 6px;
}

.tog {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 8px;
  cursor: pointer;
}

.tog input {
  margin-top: 2px;
}

.tog span {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.tog small {
  color: var(--muted);
  font-size: 10.5px;
}

/* Phần đáy */
.cart-bottom {
  padding: 14px 18px 16px;
  border-top: 1px solid var(--line);
  background: var(--card);
  flex-shrink: 0;
}

.sum {
  display: grid;
  gap: 6px;
  font-size: 12.5px;
  margin-bottom: 12px;
}

.sum .r {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
}

.sum .r.highlight-row {
  color: var(--orange-ink);
  font-weight: 700;
}

.sum .g {
  color: var(--green);
  font-weight: 700;
}

.sum .total {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-top: 1px solid var(--line);
  padding-top: 8px;
  margin-top: 4px;
}

.total-lbl {
  display: flex;
  flex-direction: column;
}

.total-lbl span {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
}

.total-amount {
  font-size: 20px;
  color: var(--green);
}

.order {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 13px;
  font-size: 14.5px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
}

.guarantee-note {
  font-size: 10.5px;
  color: var(--muted);
  text-align: center;
  margin: 8px 0 0;
  line-height: 1.35;
}

@media (max-width: 980px) {
  .cart {
    position: fixed;
    inset: 0;
    z-index: 100;
    max-height: 100vh;
    border-radius: 0;
    transform: translateY(100%);
    transition: transform 0.25s ease;
  }
  .cart.open {
    transform: translateY(0);
  }
  .sheet-x {
    display: block;
  }
}
</style>
