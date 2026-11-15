<template>
  <aside
    class="cart"
    :class="{ open: store.mobileCartOpen }"
    aria-label="Giỏ hàng tuần này"
  >
    <div class="cart-head">
      <h2>Giỏ tuần này</h2>
      <button class="sheet-x" @click="store.mobileCartOpen = false" aria-label="Đóng giỏ">×</button>
    </div>

    <!-- Đồng hồ đếm ngược -->
    <div class="cut">
      Chốt đơn đợt {{ cutoffData.sunLbl }}: <b>{{ cutoffData.formatted }}</b>
    </div>

    <!-- Thanh tiến trình 3 mốc (MOV 250k -> VietQR 400k -> Freeship 600k) -->
    <div class="progress-box">
      <div class="p-header">
        <span>Ưu đãi hành trình xe lạnh</span>
        <span class="num">{{ fmt(c.netFood) }}</span>
      </div>
      <div class="p-bar-outer">
        <div class="p-bar-inner" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="p-nodes">
        <span :class="{ reached: c.netFood >= 250000 }">250k: Đủ đơn</span>
        <span :class="{ reached: c.netFood >= 400000 }">400k: -20k QR</span>
        <span :class="{ reached: c.netFood >= 600000 && c.meals >= 4 }">600k: Freeship</span>
      </div>
      <div class="p-hint" :class="hintStatusClass">
        {{ progressHintText }}
      </div>
    </div>

    <!-- Chọn đợt nhận hàng đầu tiên -->
    <div class="first-drop-pick">
      <span class="f-lbl">Đợt nhận hàng đầu tiên:</span>
      <div class="drop-radios">
        <label :class="{ checked: store.firstDrop === 'sun' }">
          <input
            type="radio"
            name="firstDrop"
            value="sun"
            :checked="store.firstDrop === 'sun'"
            @change="store.setFirstDrop('sun')"
          />
          <span>Sáng Chủ Nhật</span>
        </label>
        <label :class="{ checked: store.firstDrop === 'wed' }">
          <input
            type="radio"
            name="firstDrop"
            value="wed"
            :checked="store.firstDrop === 'wed'"
            @change="store.setFirstDrop('wed')"
          />
          <span>Sáng Thứ Tư</span>
        </label>
      </div>
    </div>

    <!-- Danh sách món theo đợt giao -->
    <div v-if="!c.meals && !c.adTotal" class="cart-empty">
      Giỏ đang trống. Hãy bấm “Thêm” món bạn thích, hoặc chuyển sang chế độ “Soạn thực đơn theo ngân sách”.
    </div>
    <div v-else>
      <!-- Giao gộp 1 đợt -->
      <div v-if="!c.isSplit && drop1Ids.length" class="drop">
        <h3>
          Giao gộp 1 đợt: Sáng {{ dLbl(drop1Date) }}
          <span>{{ drop1Ids.length }} bữa</span>
        </h3>
        <p class="muted" style="font-size: 12px; margin-bottom: 6px">
          Đơn dưới 600k (hoặc ≤ 3 bữa) giao gộp 1 chuyến xe lạnh. Phí giao: 25.000đ.
        </p>
        <ul>
          <li v-for="id in drop1Ids" :key="id">
            <span>{{ byId[id].name }} <span class="muted">× {{ currentCart[id] }}</span></span>
            <span class="num">
              {{ fmt((byId[id].price - byId[id].save) * currentCart[id]) }}
              <button class="x" @click="store.tryChangeDish(id, 0)" aria-label="Bỏ món">✕</button>
            </span>
          </li>
        </ul>
      </div>

      <!-- Tách 2 đợt -->
      <div v-if="c.isSplit">
        <div class="drop">
          <h3>
            Đợt 1: Sáng {{ dLbl(drop1Date) }}
            <span>{{ drop1Ids.length }} bữa</span>
          </h3>
          <ul>
            <li v-for="id in drop1Ids" :key="id">
              <span>{{ byId[id].name }} <span class="muted">× {{ currentCart[id] }}</span></span>
              <span class="num">
                {{ fmt((byId[id].price - byId[id].save) * currentCart[id]) }}
                <button class="x" @click="store.tryChangeDish(id, 0)">✕</button>
              </span>
            </li>
          </ul>
        </div>
        <div class="drop">
          <h3>
            Đợt 2: Sáng {{ dLbl(drop2Date) }}
            <span>{{ drop2Ids.length }} bữa</span>
          </h3>
          <ul>
            <li v-for="id in drop2Ids" :key="id">
              <span>{{ byId[id].name }} <span class="muted">× {{ currentCart[id] }}</span></span>
              <span class="num">
                {{ fmt((byId[id].price - byId[id].save) * currentCart[id]) }}
                <button class="x" @click="store.tryChangeDish(id, 0)">✕</button>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Danh sách Addons trong giỏ -->
    <div v-if="c.adTotal > 0" class="drop" style="margin-top: 10px">
      <h3>Sản phẩm mua thêm cùng xe</h3>
      <ul>
        <li
          v-for="(q, id) in currentAddons"
          :key="id"
          v-show="q > 0"
        >
          <span>{{ addonById[id].icon }} {{ addonById[id].name }} <span class="muted">× {{ q }}</span></span>
          <span class="num">
            {{ fmt(addonById[id].price * q) }}
            <button class="x" @click="store.tryChangeAddon(id, 0)">✕</button>
          </span>
        </li>
      </ul>
    </div>

    <!-- Tinh chỉnh đóng gói -->
    <div class="subh">Quy cách đóng gói nhà máy</div>
    <label class="tog">
      <input type="checkbox" v-model="store.sauce" @change="onSauceChange" />
      <span>
        Tách riêng gói sốt gia vị
        <small>Nhà có người già, trẻ nhỏ ăn nhạt: tự nêm khi xào nấu.</small>
      </span>
    </label>
    <label class="tog">
      <input type="checkbox" v-model="store.carb" @change="onCarbChange" />
      <span>
        Giảm 50% lượng tinh bột (cơm, bún)
        <small>Cho bữa tối nhẹ bụng. Nhà máy đóng bớt lượng tinh bột, giá không đổi.</small>
      </span>
    </label>

    <!-- Bảng tổng tiền -->
    <div class="sum">
      <div class="r">
        <span>Tổng giá trị món ăn</span>
        <span class="num">{{ fmt(c.sub) }}</span>
      </div>
      <div v-if="c.save > 0" class="r">
        <span>Tiết kiệm theo mẻ nấu</span>
        <span class="num g">−{{ fmt(c.save) }}</span>
      </div>
      <div v-if="c.adTotal > 0" class="r">
        <span>Sản phẩm mua thêm cùng xe</span>
        <span class="num">{{ fmt(c.adTotal) }}</span>
      </div>
      <div class="r">
        <span>Phí vận chuyển xe lạnh Đắk Lắk – TP.HCM</span>
        <span class="num" :class="{ g: c.meals && !c.shipFee }">
          {{ c.meals ? (c.shipFee ? fmt(c.shipFee) : 'Miễn phí') : '–' }}
        </span>
      </div>
      <div v-if="c.qrDiscount > 0" class="r">
        <span>Ưu đãi VietQR (đơn ≥ 400k)</span>
        <span class="num g">−{{ fmt(c.qrDiscount) }}</span>
      </div>
      <div class="total">
        <span>Tổng thanh toán</span>
        <b>{{ fmt(c.total) }}</b>
      </div>
    </div>

    <!-- So sánh ngân sách Mode B -->
    <div v-if="store.mode === 'B'" class="bbar" :class="{ over: c.total > store.budget }">
      <div class="track">
        <i :style="{ width: Math.min(100, (c.total / store.budget) * 100) + '%' }"></i>
      </div>
      <p v-if="c.total > store.budget">
        Vượt <b class="num">{{ fmt(c.total - store.budget) }}</b> so với ngân sách {{ fmt(store.budget) }}
      </p>
      <p v-else>
        Còn dư <b class="num">{{ fmt(store.budget - c.total) }}</b> so với ngân sách {{ fmt(store.budget) }}
      </p>
    </div>

    <!-- Hình thức thanh toán -->
    <div class="subh">Hình thức thanh toán</div>
    <div class="pays" role="radiogroup" aria-label="Hình thức thanh toán">
      <button
        class="pay"
        :class="{ active: store.pay === 'prepaid' }"
        role="radio"
        :aria-checked="store.pay === 'prepaid'"
        @click="store.setPay('prepaid')"
      >
        <div>
          <b>Trừ vào Gói Đi Chợ Trả Trước</b>
          <small>Số dư khả dụng: {{ fmt(store.user.prepaidBalance) }}</small>
        </div>
        <span class="badge" style="background: var(--green)">Khuyên dùng</span>
      </button>

      <button
        class="pay"
        :class="{ active: store.pay === 'qr' }"
        role="radio"
        :aria-checked="store.pay === 'qr'"
        @click="store.setPay('qr')"
      >
        <div>
          <b>Chuyển khoản VietQR</b>
          <small>{{ c.canQR ? 'Đủ điều kiện: Giảm ngay 20.000đ' : 'Áp dụng khi tiền món ≥ 400.000đ' }}</small>
        </div>
        <span v-if="c.canQR" class="badge">Giảm 20.000đ</span>
      </button>

      <button
        class="pay"
        :class="{ active: store.pay === 'cod' }"
        role="radio"
        :aria-checked="store.pay === 'cod'"
        @click="store.setPay('cod')"
      >
        <div>
          <b>Thanh toán khi nhận hàng (COD)</b>
          <small>Giao tiền mặt cho shipper</small>
        </div>
      </button>
    </div>

    <button
      class="btn orange order"
      :disabled="!c.meals || !c.meetsMOV"
      @click="handleOrder"
    >
      {{ orderBtnText }}
    </button>
  </aside>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';
import { byId, addonById } from '../../data/mockData';
import { fmt } from '../../utils/formatters';
import { schedule, dLbl, splitDropsList, getTimeLeft } from '../../utils/schedule';

const store = useMovaStore();

const c = computed(() => store.calcAll);
const currentCart = computed(() => store.cart);
const currentAddons = computed(() => store.addons);

// Countdown timer
const cutoffData = ref(getTimeLeft());
let timer = null;

onMounted(() => {
  timer = setInterval(() => {
    cutoffData.value = getTimeLeft();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

const progressPercent = computed(() => {
  const net = c.value.netFood;
  if (net < 250000) return (net / 250000) * 33;
  if (net < 400000) return 33 + ((net - 250000) / 150000) * 33;
  if (net < 600000) return 66 + ((net - 400000) / 200000) * 34;
  return 100;
});

const hintStatusClass = computed(() => {
  if (!c.value.netFood || c.value.netFood < 250000) return 'warn';
  return 'ok';
});

const progressHintText = computed(() => {
  const net = c.value.netFood;
  if (!net) return 'Giỏ chưa có món. Chọn món để bắt đầu.';
  if (net < 250000) return `Cần thêm ${fmt(250000 - net)} để đạt đơn tối thiểu 250.000đ.`;
  if (net < 400000) return `Đã đủ đơn tối thiểu! Thêm ${fmt(400000 - net)} để được giảm ngay 20.000đ VietQR.`;
  if (net < 600000 || c.value.meals < 4) {
    const needMoney = Math.max(0, 600000 - net);
    const needMeals = Math.max(0, 4 - c.value.meals);
    if (needMoney && needMeals) return `Thêm ${fmt(needMoney)} & ${needMeals} bữa nữa để Freeship và Tách 2 đợt.`;
    if (needMoney) return `Thêm ${fmt(needMoney)} để được Miễn phí giao hàng & Tách 2 đợt.`;
    return `Thêm ${needMeals} bữa nữa để đủ điều kiện tách 2 đợt & Freeship.`;
  }
  return '🎉 Đạt mốc tối đa: Miễn phí giao hàng & Tự động tách 2 đợt giữ trọn độ tươi!';
});

const dates = computed(() => schedule());
const drop1Date = computed(() => (store.firstDrop === 'sun' ? dates.value.sun : dates.value.wed));
const drop2Date = computed(() => (store.firstDrop === 'sun' ? dates.value.wed : dates.value.sun));

const dishKeys = computed(() => Object.keys(currentCart.value).filter((id) => currentCart.value[id] > 0));
const drops = computed(() => splitDropsList(dishKeys.value, c.value.isSplit));
const drop1Ids = computed(() => drops.value[0]);
const drop2Ids = computed(() => drops.value[1]);

const onSauceChange = () => {
  store.toast(store.sauce ? 'Gói sốt được đóng rời riêng biệt cho mọi món' : 'Gói sốt theo đóng gói tiêu chuẩn');
};

const onCarbChange = () => {
  store.toast(store.carb ? 'Đã giảm 50% tinh bột, giá không đổi' : 'Lượng tinh bột về mức chuẩn');
};

const orderBtnText = computed(() => {
  if (!c.value.meals) return 'Chưa chọn món';
  if (!c.value.meetsMOV) return `Cần thêm ${fmt(250000 - c.value.netFood)} để đặt hàng`;
  return `Tiến hành đặt hàng • ${fmt(c.value.total)}`;
});

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
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 18px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.cart-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.cart-head h2 {
  font-size: 19px;
  font-weight: 800;
}

.sheet-x {
  display: none;
  background: transparent;
  border: 0;
  font-size: 26px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 0 4px;
}

.cut {
  font-size: 13px;
  color: var(--orange-ink);
  background: var(--orange-soft);
  border-radius: 10px;
  padding: 7px 10px;
  margin-top: 10px;
}

.cut b {
  font-variant-numeric: tabular-nums;
}

.progress-box {
  margin-top: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  background: var(--bg);
}

.p-header {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  font-weight: 700;
  margin-bottom: 8px;
}

.p-bar-outer {
  position: relative;
  height: 10px;
  border-radius: 6px;
  background: var(--line-2);
  overflow: hidden;
  margin-bottom: 8px;
}

.p-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, var(--orange), var(--green));
  border-radius: 6px;
  transition: width .3s ease;
}

.p-nodes {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}

.p-nodes span {
  padding: 2px 4px;
  border-radius: 6px;
  background: var(--card);
  border: 1px solid var(--line);
}

.p-nodes span.reached {
  background: var(--green-soft);
  color: var(--green-d);
  border-color: var(--green);
  font-weight: 700;
}

.p-hint {
  font-size: 12.5px;
  font-weight: 600;
  margin-top: 8px;
}

.p-hint.warn {
  color: var(--orange-ink);
}

.p-hint.ok {
  color: var(--green);
}

.first-drop-pick {
  margin-top: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--card);
}

.first-drop-pick .f-lbl {
  font-size: 12.5px;
  font-weight: 700;
  margin-bottom: 6px;
  display: block;
}

.drop-radios {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.drop-radios label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--line);
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.drop-radios label.checked {
  border-color: var(--green);
  background: var(--green-soft);
}

.drop-radios input {
  accent-color: var(--green);
}

.drop {
  margin-top: 14px;
}

.drop h3 {
  font-size: 13.5px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.drop h3 span {
  color: var(--muted);
  font-weight: 500;
}

.drop ul {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.drop li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13.5px;
  border-bottom: 1px dashed var(--line-2);
  padding-bottom: 5px;
}

.drop li .x {
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 13px;
  padding: 0 0 0 6px;
}

.cart-empty {
  margin-top: 14px;
  padding: 16px;
  border: 1.5px dashed var(--line);
  border-radius: 14px;
  font-size: 13.5px;
  color: var(--muted);
}

.sum {
  margin-top: 14px;
  display: grid;
  gap: 6px;
  font-size: 14px;
}

.sum .r {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.sum .g {
  color: var(--green);
}

.total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-top: 1px solid var(--line);
  padding-top: 10px;
  margin-top: 4px;
}

.total b {
  font-size: 24px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.bbar {
  margin-top: 10px;
}

.bbar .track {
  height: 9px;
  border-radius: 6px;
  background: var(--line-2);
  overflow: hidden;
}

.bbar .track i {
  display: block;
  height: 100%;
  background: var(--green);
  border-radius: 6px;
  transition: width .3s;
}

.bbar.over .track i {
  background: var(--orange);
}

.bbar p {
  font-size: 13px;
  margin-top: 5px;
}

.subh {
  font-size: 13.5px;
  font-weight: 700;
  margin-top: 14px;
}

.pays {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.pay {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--card);
  text-align: left;
  font-size: 13.5px;
  font-weight: 600;
  transition: .15s;
}

.pay.active {
  border-color: var(--green);
  background: var(--green-soft);
}

.pay small {
  display: block;
  font-weight: 400;
  font-size: 12px;
  color: var(--muted);
}

.pay .badge {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--orange);
  border-radius: 999px;
  padding: 3px 8px;
  white-space: nowrap;
}

.order {
  width: 100%;
  justify-content: center;
  margin-top: 14px;
  padding: 13px;
  font-size: 15.5px;
}

@media (max-width: 980px) {
  .sheet-x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .cart {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    z-index: 40;
    border-radius: 22px 22px 0 0;
    max-height: 86vh;
    transform: translateY(105%);
    transition: transform .28s ease;
    padding-bottom: 24px;
    box-shadow: 0 -12px 32px rgba(40, 30, 10, .18);
  }

  .cart.open {
    transform: none;
  }
}
</style>
