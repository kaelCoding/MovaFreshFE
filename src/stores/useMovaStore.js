import { defineStore } from 'pinia';
import {
  DISHES,
  byId,
  ADDONS,
  addonById,
  MAXM,
  DEFAULT_STATE,
  DEMO_LAN_DATA,
  DEMO_MINH_DATA
} from '../data/mockData';
import { fmt } from '../shared/utils/formatters';

const STORAGE_KEY = 'mova_fresh_v3_onboard_v4';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE(), ...parsed };
    }
  } catch (e) {
    console.warn('Could not parse saved state:', e);
  }
  return DEFAULT_STATE();
}

export const useMovaStore = defineStore('mova', {
  state: () => {
    const initial = loadState();
    return {
      ...initial,
      // Ephemeral UI states
      toastMessage: '',
      toastVisible: false,
      toastTimer: null,
      notifDrawerOpen: false,
      mobileCartOpen: false,

      // Modal states
      activeModal: null, // 'dish' | 'login' | 'checkout' | 'success' | 'refund' | 'topup' | 'address'
      selectedDishId: null,
      lastPlacedOrder: null,
      pendingTopup: { amount: 0, bonus: 0 },
      pendingCheckoutAfterLogin: false
    };
  },

  getters: {
    cart(state) {
      return state.mode === 'A' ? state.cartA : state.cartB;
    },
    addons(state) {
      return state.mode === 'A' ? state.addonsA : state.addonsB;
    },
    allowed: (state) => (d) => {
      const f = new Set(state.f);
      if (f.has('noBo') && d.p === 'bo') return false;
      if (f.has('noHeo') && (d.p === 'heo' || d.p === 'suon')) return false;
      if (f.has('noCay') && d.spicy) return false;
      if (f.has('lowOil') && !d.lowOil) return false;
      if (f.has('chay') && !d.isVegan) return false;
      return true;
    },
    calcAll(state) {
      const dishes = state.mode === 'A' ? state.cartA : state.cartB;
      const ads = state.mode === 'A' ? state.addonsA : state.addonsB;

      let sub = 0;
      let save = 0;
      let meals = 0;
      let serv = 0;

      Object.entries(dishes).forEach(([id, q]) => {
        const d = byId[id];
        if (d && q > 0) {
          sub += d.price * q;
          save += d.save * q;
          meals++;
          serv += q;
        }
      });

      let adTotal = 0;
      Object.entries(ads).forEach(([id, q]) => {
        const a = addonById[id];
        if (a && q > 0) {
          adTotal += a.price * q;
        }
      });

      const netFood = sub - save + adTotal;
      const isSplit = netFood >= 600000 && meals >= 4;
      const shipFee = meals ? (isSplit ? 0 : 25000) : 0;
      const canQR = netFood >= 400000;
      const qrDiscount = state.pay === 'qr' && canQR ? 20000 : 0;
      const total = Math.max(0, netFood + shipFee - qrDiscount);
      const meetsMOV = netFood >= 250000;

      return {
        sub,
        save,
        adTotal,
        netFood,
        isSplit,
        shipFee,
        canQR,
        qrDiscount,
        total,
        meals,
        serv,
        meetsMOV
      };
    },
    unreadNotifsCount(state) {
      return state.notifications.filter((n) => n.unread).length;
    }
  },

  actions: {
    persist() {
      try {
        const clone = {
          mode: this.mode,
          cartA: this.cartA,
          cartB: this.cartB,
          addonsA: this.addonsA,
          addonsB: this.addonsB,
          budget: this.budget,
          n: this.n,
          f: this.f,
          pay: this.pay,
          sauce: this.sauce,
          carb: this.carb,
          firstDrop: this.firstDrop,
          cutoffPassed: this.cutoffPassed,
          user: this.user,
          activeOrder: this.activeOrder,
          historyOrders: this.historyOrders,
          ledger: this.ledger,
          notifications: this.notifications
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
      } catch (e) {
        console.warn('Failed to persist store:', e);
      }
    },

    toast(msg) {
      this.toastMessage = msg;
      this.toastVisible = true;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastVisible = false;
      }, 2800);
    },

    openModal(modalName, payload = null) {
      this.activeModal = modalName;
      if (modalName === 'dish' && payload) {
        this.selectedDishId = payload;
      }
      if (modalName === 'topup' && payload) {
        this.pendingTopup = payload;
      }
    },

    closeModal() {
      this.activeModal = null;
      this.pendingCheckoutAfterLogin = false;
    },

    setMode(m) {
      this.mode = m;
      if (m === 'B' && Object.keys(this.cartB).length === 0) {
        this.optimize();
      }
      if (m === 'B') {
        this.toast('Chế độ ngân sách: giỏ riêng, không làm mất giỏ tự chọn.');
      }
      this.persist();
    },

    setBudget(b) {
      this.budget = Math.max(100000, Math.round(b / 1000) * 1000);
      if (this.mode === 'B') {
        this.optimize();
      }
      this.persist();
    },

    setPeople(n) {
      this.n = n;
      if (this.mode === 'B') {
        this.optimize();
      }
      this.persist();
    },

    toggleFilter(f) {
      const set = new Set(this.f);
      if (set.has(f)) set.delete(f);
      else set.add(f);
      this.f = [...set];

      if (this.mode === 'B') {
        this.optimize();
      } else {
        const n = this.cleanFiltered();
        if (n) this.toast(`Đã đổi ${n} món trong giỏ cho hợp khẩu vị`);
        else this.toast(`Đã cập nhật bộ lọc khẩu vị`);
      }
      this.persist();
    },

    toggleShowNutrition() {
      this.showNutrition = !this.showNutrition;
      this.toast(this.showNutrition ? 'Đang hiện chỉ số dinh dưỡng (Calo/Đạm) trên món' : 'Đã ẩn chỉ số dinh dưỡng');
      this.persist();
    },

    setPay(p) {
      this.pay = p;
      if (p === 'qr') {
        const c = this.calcAll;
        this.toast(c.canQR ? 'Đã chọn VietQR: Giảm trực tiếp 20.000đ!' : 'Đã chọn VietQR (cần đơn ≥ 400k để giảm 20.000đ)');
      } else if (p === 'prepaid') {
        this.toast(`Đã chọn trừ vào Gói Đi Chợ (Số dư: ${fmt(this.user.prepaidBalance)})`);
      } else {
        this.toast('Đã chọn thanh toán tiền mặt khi nhận hàng (COD)');
      }
      this.persist();
    },

    setFirstDrop(d) {
      this.firstDrop = d;
      this.toast(`Đợt nhận đầu tiên: Sáng ${d === 'sun' ? 'Chủ Nhật' : 'Thứ Tư'} tới`);
      this.persist();
    },

    tryChangeDish(id, q) {
      const targetCart = this.mode === 'A' ? this.cartA : this.cartB;
      const next = { ...targetCart };
      if (q <= 0) delete next[id];
      else next[id] = q;

      // Check max meals
      const nextKeys = Object.keys(next);
      if (nextKeys.length > MAXM && !targetCart[id]) {
        this.toast('Mỗi tuần tối đa 10 bữa ăn tươi.');
        return false;
      }

      // In Mode B, verify prospective total vs budget
      if (this.mode === 'B' && q > (targetCart[id] || 0)) {
        let testSub = 0;
        let testSave = 0;
        let testMeals = 0;
        Object.entries(next).forEach(([dId, dQ]) => {
          const d = byId[dId];
          if (d && dQ > 0) {
            testSub += d.price * dQ;
            testSave += d.save * dQ;
            testMeals++;
          }
        });
        let testAdTotal = 0;
        Object.entries(this.addonsB).forEach(([adId, adQ]) => {
          const a = addonById[adId];
          if (a && adQ > 0) testAdTotal += a.price * adQ;
        });
        const testNet = testSub - testSave + testAdTotal;
        const testIsSplit = testNet >= 600000 && testMeals >= 4;
        const testShip = testMeals ? (testIsSplit ? 0 : 25000) : 0;
        const testQr = this.pay === 'qr' && testNet >= 400000 ? 20000 : 0;
        const testTotal = Math.max(0, testNet + testShip - testQr);

        if (testTotal > this.budget) {
          this.toast(`Món này làm vượt ngân sách ${fmt(testTotal - this.budget)}. Bỏ bớt món hoặc tăng ngân sách.`);
          return false;
        }
      }

      if (this.mode === 'A') {
        this.cartA = next;
      } else {
        this.cartB = next;
        this.msg = null;
      }
      this.persist();
      return true;
    },

    // BUG 4 FIX: Khóa trần ngân sách cho cả sản phẩm mua thêm (Add-ons) khi ở Chế độ Ngân sách (Mode B)
    tryChangeAddon(id, q) {
      const targetAddons = this.mode === 'A' ? this.addonsA : this.addonsB;
      const next = { ...targetAddons };
      if (q <= 0) delete next[id];
      else next[id] = q;

      if (this.mode === 'B' && q > (targetAddons[id] || 0)) {
        let testSub = 0;
        let testSave = 0;
        let testMeals = 0;
        Object.entries(this.cartB).forEach(([dId, dQ]) => {
          const d = byId[dId];
          if (d && dQ > 0) {
            testSub += d.price * dQ;
            testSave += d.save * dQ;
            testMeals++;
          }
        });
        let testAdTotal = 0;
        Object.entries(next).forEach(([adId, adQ]) => {
          const a = addonById[adId];
          if (a && adQ > 0) testAdTotal += a.price * adQ;
        });
        const testNet = testSub - testSave + testAdTotal;
        const testIsSplit = testNet >= 600000 && testMeals >= 4;
        const testShip = testMeals ? (testIsSplit ? 0 : 25000) : 0;
        const testQr = this.pay === 'qr' && testNet >= 400000 ? 20000 : 0;
        const testTotal = Math.max(0, testNet + testShip - testQr);

        if (testTotal > this.budget) {
          this.toast(`Sản phẩm này làm đơn vượt ngân sách ${fmt(testTotal - this.budget)}. Bỏ bớt món hoặc tăng ngân sách.`);
          return false;
        }
      }

      if (this.mode === 'A') {
        this.addonsA = next;
      } else {
        this.addonsB = next;
      }
      this.persist();
      return true;
    },

    swapDish(id) {
      const targetCart = this.mode === 'A' ? this.cartA : this.cartB;
      const d = byId[id];
      const q = targetCart[id];
      if (!d || !q) return;

      const cands = DISHES.filter(
        (x) => x.id !== id && !targetCart[x.id] && this.allowed(x)
      ).sort(
        (a, b) =>
          Math.abs(a.price - a.save - (d.price - d.save)) -
          Math.abs(b.price - b.save - (d.price - d.save))
      );

      for (const c of cands) {
        const next = { ...targetCart };
        delete next[id];
        next[c.id] = q;

        if (this.mode === 'A') {
          this.cartA = next;
        } else {
          this.cartB = next;
          this.msg = null;
        }
        const diff = (c.price - c.save) - (d.price - d.save);
        this.toast(`Đã đổi sang ${c.name}${diff ? ` (${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff) * q)})` : ''}`);
        this.persist();
        return;
      }
      this.toast('Chưa có món tương đương giá còn trống để đổi.');
    },

    cleanFiltered() {
      const targetCart = this.mode === 'A' ? this.cartA : this.cartB;
      let changed = 0;
      const next = { ...targetCart };

      Object.keys(next).forEach((id) => {
        const d = byId[id];
        if (d && this.allowed(d)) return;
        const q = next[id];
        delete next[id];

        const cand = DISHES.filter((x) => this.allowed(x) && !next[x.id]).sort(
          (a, b) => Math.abs(a.price - d.price) - Math.abs(b.price - d.price)
        )[0];
        if (cand) {
          next[cand.id] = q;
        }
        changed++;
      });

      if (this.mode === 'A') this.cartA = next;
      else this.cartB = next;
      return changed;
    },

    optimize() {
      const B = this.budget;
      const n = this.n;
      const pool = DISHES.filter((d) => this.allowed(d));
      const byCost = [...pool].sort((a, b) => a.price - a.save - (b.price - b.save));

      const calcPayable = (ids) => {
        let sub = 0;
        let save = 0;
        ids.forEach((id) => {
          const d = byId[id];
          if (d) {
            sub += d.price * n;
            save += d.save * n;
          }
        });
        // Include any existing addons in Mode B
        let adTotal = 0;
        Object.entries(this.addonsB).forEach(([adId, adQ]) => {
          const a = addonById[adId];
          if (a && adQ > 0) adTotal += a.price * adQ;
        });
        const net = sub - save + adTotal;
        const isSplit = net >= 600000 && ids.length >= 4;
        const ship = isSplit ? 0 : 25000;
        const qr = this.pay === 'qr' && net >= 400000 ? 20000 : 0;
        return net + ship - qr;
      };

      let k = 0;
      for (let i = 1; i <= Math.min(MAXM, byCost.length); i++) {
        if (calcPayable(byCost.slice(0, i).map((d) => d.id)) <= B) k = i;
      }

      if (!k) {
        this.cartB = {};
        const need = byCost[0] ? calcPayable([byCost[0].id]) : 0;
        this.msg = byCost.length
          ? { warn: true, t: `Ngân sách chưa đủ 1 bữa cho ${n} người. Cần tối thiểu ${fmt(need)}.` }
          : { warn: true, t: 'Không còn món phù hợp bộ lọc. Vui lòng bỏ bớt một bộ lọc khẩu vị.' };
        this.persist();
        return;
      }

      let sel = byCost.slice(0, k).map((d) => d.id);
      const setScore = (ids) => {
        let s = 0;
        const c = {};
        ids.forEach((id) => {
          const d = byId[id];
          if (d) {
            s += d.pop;
            c[d.p] = (c[d.p] || 0) + 1;
          }
        });
        s += 4 * Object.keys(c).length;
        Object.values(c).forEach((v) => {
          if (v > 2) s -= 3 * (v - 2);
        });
        return s;
      };

      for (let it = 0; it < 40; it++) {
        let best = null;
        let bs = setScore(sel);
        for (let i = 0; i < sel.length; i++) {
          for (const d of pool) {
            if (sel.includes(d.id)) continue;
            const t = sel.slice();
            t[i] = d.id;
            if (calcPayable(t) > B) continue;
            const sc = setScore(t);
            if (sc > bs) {
              bs = sc;
              best = t;
            }
          }
        }
        if (!best) break;
        sel = best;
      }

      sel.sort((a, b) => byId[b].pop - byId[a].pop);
      const newCartB = {};
      sel.forEach((id) => {
        newCartB[id] = n;
      });
      this.cartB = newCartB;

      const tot = calcPayable(sel);
      const ppl = n === 1 ? '1 người' : n === 2 ? '2 người' : '4 người';
      this.msg = {
        warn: false,
        t: `Đã tối ưu ${k} bữa cho ${ppl}. Tổng ${fmt(tot)}, nằm gọn trong ngân sách ${fmt(B)} của bạn.`
      };
      this.persist();
    },

    setCutoffPassed(val) {
      this.cutoffPassed = val;
      this.toast(val ? 'Đã chuyển mốc: SAU 20:00 (Nhà máy Đắk Lắk sơ chế - Khóa sửa)' : 'Đã chuyển mốc: TRƯỚC 20:00 (Cho phép sửa, hoãn, hủy)');
      this.persist();
    },

    // BUG 3 FIX: Cập nhật trạng thái thực tế khi bấm "⏳ Hoãn đợt giao này"
    delayActiveOrder() {
      if (!this.activeOrder) return;
      this.activeOrder.delayed = true;
      this.activeOrder.delayNotice = 'Đã hoãn sang chuyến xe tuần kế tiếp — Bảo lưu 100% giá trị';
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: `Đã hoãn đợt giao đơn #${this.activeOrder.id}`,
        desc: 'MOVA đã dời lịch giao sang chuyến xe tuần kế tiếp. Toàn bộ tiền suất ăn được bảo lưu 100%.',
        unread: true
      });
      this.toast('Đã hoãn đợt giao thành công. MOVA sẽ dời lịch sang chuyến xe tuần kế tiếp.');
      this.persist();
    },

    cancelActiveOrder() {
      if (!this.activeOrder) return;
      const refundAmt = this.activeOrder.total;
      this.user.prepaidBalance += refundAmt;
      this.ledger.unshift({
        date: 'Hôm nay ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        desc: `Hoàn tiền hủy đơn #${this.activeOrder.id}`,
        amount: refundAmt,
        bal: this.user.prepaidBalance
      });
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: `Đã hủy đơn #${this.activeOrder.id}`,
        desc: `Hoàn tiền 100% (${fmt(refundAmt)}) vào Gói Đi Chợ Trả Trước.`,
        unread: true
      });
      this.activeOrder = null;
      this.toast(`Đã hủy đơn và hoàn ${fmt(refundAmt)} vào Gói Đi Chợ Trả Trước.`);
      this.persist();
    },

    refundItem(dishId, reason) {
      const d = byId[dishId];
      const refundAmount = d ? d.price * 2 : 110000;
      this.user.prepaidBalance += refundAmount;
      this.ledger.unshift({
        date: 'Hôm nay ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        desc: `Bồi thường chất lượng (${reason.slice(0, 24)}...)`,
        amount: refundAmount,
        bal: this.user.prepaidBalance
      });
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: 'Đã hoàn tiền bồi thường chất lượng',
        desc: `MOVA đã cộng ${fmt(refundAmount)} vào Gói Đi Chợ cho món ${d ? d.name : 'bữa ăn'}.`,
        unread: true
      });
      this.toast(`🎉 Đã duyệt hoàn ${fmt(refundAmount)} ngay vào Gói Đi Chợ Trả Trước.`);
      this.closeModal();
      this.persist();
    },

    reorderHistory(oid) {
      const ord = this.historyOrders.find((x) => x.id === oid);
      if (!ord) return;
      const newCart = {};
      ord.items.forEach((it) => {
        newCart[it.id] = it.qty;
      });
      const newAddons = {};
      if (ord.addons) {
        ord.addons.forEach((a) => {
          newAddons[a.id] = a.qty;
        });
      }
      this.cartA = newCart;
      this.addonsA = newAddons;
      this.mode = 'A';
      this.toast(`Đã nạp toàn bộ thực đơn của đơn #${oid} vào giỏ hàng!`);
      this.persist();
    },

    rateDish(oid, did, rating) {
      const ord = this.historyOrders.find((x) => x.id === oid);
      if (!ord) return;
      const item = ord.items.find((x) => x.id === did);
      if (!item) return;

      item.rate = rating;
      if (rating === 'salty') {
        this.user.pref.sauce = true;
        this.sauce = true;
        this.toast('Đã ghi nhận! MOVA sẽ tự động bật "Tách riêng gói sốt" cho đơn tiếp theo của bạn.');
      } else if (rating === 'good') {
        this.toast('Cảm ơn bạn! Bếp Đắk Lắk sẽ giữ vững công thức này.');
      } else {
        this.toast('Đã ghi nhận khẩu vị thanh nhẹ của bạn.');
      }
      this.persist();
    },

    topupPrepaid(amount, bonus) {
      const totalVal = amount + bonus;
      this.user.prepaidBalance += totalVal;
      this.ledger.unshift({
        date: 'Hôm nay ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        desc: `Nạp Gói Đi Chợ ${fmt(amount)} (Tặng ${fmt(bonus)})`,
        amount: totalVal,
        bal: this.user.prepaidBalance
      });
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: 'Nạp Gói Đi Chợ thành công',
        desc: `Đã cộng ${fmt(totalVal)} vào số dư gói bữa ăn tươi.`,
        unread: true
      });
      this.closeModal();
      this.toast(`🎉 Nạp thành công! Số dư Gói Đi Chợ hiện tại: ${fmt(this.user.prepaidBalance)}`);
      this.persist();
    },

    checkout(form) {
      const c = this.calcAll;
      const code = 'MV' + (Date.now() % 1e7).toString().padStart(7, '0');
      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

      let paidPrepaid = 0;
      let needQrDiff = 0;

      if (this.pay === 'prepaid') {
        if (this.user.prepaidBalance >= c.total) {
          paidPrepaid = c.total;
          this.user.prepaidBalance -= c.total;
        } else {
          paidPrepaid = this.user.prepaidBalance;
          needQrDiff = c.total - paidPrepaid;
          this.user.prepaidBalance = 0;
        }

        if (paidPrepaid > 0) {
          this.ledger.unshift({
            date: 'Hôm nay ' + nowStr,
            desc: `Thanh toán đơn hàng #${code}`,
            amount: -paidPrepaid,
            bal: this.user.prepaidBalance
          });
        }
      }

      const cartSource = this.mode === 'A' ? this.cartA : this.cartB;
      const addonSource = this.mode === 'A' ? this.addonsA : this.addonsB;

      const items = Object.entries(cartSource)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => {
          const d = byId[id];
          return { id: d.id, qty: q, name: d.name, price: d.price, save: d.save, storage: d.storage };
        });

      const addons = Object.entries(addonSource)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => {
          const a = addonById[id];
          return { id: a.id, qty: q, name: a.name, price: a.price, storage: a.storage };
        });

      this.activeOrder = {
        id: code,
        createdAt: 'Hôm nay lúc ' + nowStr,
        status: 'confirmed',
        delayed: false,
        delayNotice: '',
        firstDrop: this.firstDrop,
        deliveryTimeSlot: form.timeSlot,
        address: `${form.address}, ${form.district}`,
        receiver: `${form.name} - ${form.phone}`,
        note: form.note,
        sauce: this.sauce,
        carb: this.carb,
        items,
        addons,
        payMethod: this.pay,
        subTotal: c.sub,
        saveBatch: c.save,
        netFood: c.netFood,
        shipFee: c.shipFee,
        qrDiscount: c.qrDiscount,
        total: c.total,
        isSplit: c.isSplit
      };

      this.lastPlacedOrder = {
        code,
        calc: c,
        needQrDiff,
        timeSlot: form.timeSlot,
        firstDrop: this.firstDrop
      };

      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: `Đặt thành công đơn #${code}`,
        desc: `Đơn gồm ${c.meals} bữa ăn tươi đã lên lịch chuyển xe lạnh từ Đắk Lắk.`,
        unread: true
      });

      // Clear active cart
      if (this.mode === 'A') {
        this.cartA = {};
        this.addonsA = {};
      } else {
        this.cartB = {};
        this.addonsB = {};
      }

      this.closeModal();
      this.openModal('success');
      this.persist();
    },

    loginDemoLan() {
      this.user = JSON.parse(JSON.stringify(DEMO_LAN_DATA.user));
      this.activeOrder = JSON.parse(JSON.stringify(DEMO_LAN_DATA.activeOrder));
      this.historyOrders = JSON.parse(JSON.stringify(DEMO_LAN_DATA.historyOrders));
      this.ledger = JSON.parse(JSON.stringify(DEMO_LAN_DATA.ledger));
      this.notifications = JSON.parse(JSON.stringify(DEMO_LAN_DATA.notifications));
      this.pay = 'prepaid';
      this.toast('Đã chuyển sang tài khoản Demo: Chị Lan (850k Gói Đi Chợ)');
      if (this.pendingCheckoutAfterLogin) {
        this.pendingCheckoutAfterLogin = false;
        this.openModal('checkout');
      } else {
        this.closeModal();
      }
      this.persist();
    },

    loginDemoNew() {
      this.user = JSON.parse(JSON.stringify(DEMO_MINH_DATA.user));
      this.activeOrder = null;
      this.historyOrders = [];
      this.ledger = JSON.parse(JSON.stringify(DEMO_MINH_DATA.ledger));
      this.notifications = JSON.parse(JSON.stringify(DEMO_MINH_DATA.notifications));
      this.pay = 'qr';
      this.toast('Đã đăng nhập tài khoản Khách Mới: Anh Minh (Tặng 30.000đ)!');
      if (this.pendingCheckoutAfterLogin) {
        this.pendingCheckoutAfterLogin = false;
        this.openModal('checkout');
      } else {
        this.closeModal();
      }
      this.persist();
    },

    loginCustom(phone) {
      if (!phone) return;
      this.user.isLoggedIn = true;
      this.user.phone = phone;
      this.user.name = 'Khách hàng ' + phone.slice(-4);
      if (!this.user.addresses || !this.user.addresses.length) {
        this.user.addresses = [
          {
            id: 'addr-' + Date.now(),
            label: 'Địa chỉ giao hàng',
            name: this.user.name,
            phone: phone,
            district: 'Quận 1',
            detail: 'Chưa cập nhật chi tiết số nhà, tên đường',
            isDefault: true
          }
        ];
      }
      this.toast('Đăng nhập thành công!');
      if (this.pendingCheckoutAfterLogin) {
        this.pendingCheckoutAfterLogin = false;
        this.openModal('checkout');
      } else {
        this.closeModal();
      }
      this.persist();
    },

    addAddress(addr) {
      const newId = 'addr-' + Date.now();
      if (addr.isDefault) {
        this.user.addresses.forEach((a) => (a.isDefault = false));
      }
      this.user.addresses.push({
        id: newId,
        label: addr.label || 'Địa chỉ mới',
        name: this.user.name,
        phone: this.user.phone,
        district: addr.district,
        detail: addr.detail,
        isDefault: addr.isDefault || this.user.addresses.length === 0
      });
      this.closeModal();
      this.toast('Đã lưu địa chỉ mới thành công.');
      this.persist();
    },

    deleteAddress(id) {
      if (this.user.addresses.length <= 1) {
        this.toast('Cần giữ ít nhất 1 địa chỉ để giao hàng.');
        return;
      }
      this.user.addresses = this.user.addresses.filter((a) => a.id !== id);
      if (!this.user.addresses.some((a) => a.isDefault)) {
        this.user.addresses[0].isDefault = true;
      }
      this.toast('Đã xóa địa chỉ.');
      this.persist();
    },

    setDefaultAddress(id) {
      this.user.addresses.forEach((a) => {
        a.isDefault = a.id === id;
      });
      this.toast('Đã đổi địa chỉ nhận hàng mặc định.');
      this.persist();
    },

    savePreferences(pref) {
      this.user.pref = { ...pref };
      this.n = pref.ppl;
      this.sauce = pref.sauce;
      this.carb = pref.carb;
      this.f = [...pref.f];
      this.toast('Đã lưu và đồng bộ cài đặt khẩu vị vào Cửa hàng!');
      this.persist();
    },

    markAllNotifsRead() {
      this.notifications.forEach((n) => (n.unread = false));
      this.toast('Đã đánh dấu đọc toàn bộ thông báo.');
      this.persist();
    },

    resetDemoData() {
      localStorage.removeItem(STORAGE_KEY);
      const fresh = DEFAULT_STATE();
      Object.assign(this, fresh);
      this.toast('Đã khôi phục dữ liệu Demo gốc.');
      this.persist();
    }
  }
});
