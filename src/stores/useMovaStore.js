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
import { fmt } from '../utils/formatters';

const STORAGE_KEY = 'mova_fresh_v3_onboard_v4';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const def = DEFAULT_STATE();
      return {
        ...def,
        ...parsed,
        onboardingProfile: {
          ...def.onboardingProfile,
          ...(parsed.onboardingProfile || {})
        },
        profileRewardClaimed: parsed.profileRewardClaimed ?? def.profileRewardClaimed,
        onboardingSkipped: parsed.onboardingSkipped ?? def.onboardingSkipped
      };
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
      activeModal: null, // 'dish' | 'login' | 'checkout' | 'success' | 'refund' | 'topup' | 'address' | 'onboarding'
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
      const isSplit = meals >= 4;
      const shipFee = 0; // V2: Miễn phí vận chuyển tuyến xe lạnh định kỳ
      const canQR = netFood >= 400000;
      const qrDiscount = state.pay === 'qr' && canQR ? 20000 : 0;
      const total = Math.max(0, netFood + shipFee - qrDiscount);
      const meetsMOV = true; // V2: Bỏ hoàn toàn ngưỡng đơn tối thiểu 250.000đ

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
          notifications: this.notifications,
          onboardingProfile: this.onboardingProfile,
          profileRewardClaimed: this.profileRewardClaimed,
          onboardingSkipped: this.onboardingSkipped
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
      if (p !== 'qr' && p !== 'prepaid') {
        p = 'qr';
      }
      this.pay = p;
      if (p === 'qr') {
        const c = this.calcAll;
        this.toast(c.canQR ? 'Đã chọn VietQR: Giảm trực tiếp 20.000đ!' : 'Đã chọn VietQR (cần đơn ≥ 400k để giảm 20.000đ)');
      } else if (p === 'prepaid') {
        this.toast(`Đã chọn trừ vào Fresh Credit (Số dư: ${fmt(this.user.prepaidBalance)})`);
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
        const testShip = 0;
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

    // Khóa trần ngân sách cho cả sản phẩm mua thêm (Add-ons) khi ở Chế độ Ngân sách (Mode B)
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
        const testShip = 0;
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
        const ship = 0; // V2: Miễn phí vận chuyển
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
        desc: `Hoàn tiền 100% (${fmt(refundAmt)}) vào Fresh Credit.`,
        unread: true
      });
      this.activeOrder = null;
      this.toast(`Đã hủy đơn và hoàn ${fmt(refundAmt)} vào Fresh Credit.`);
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
        desc: `MOVA đã cộng ${fmt(refundAmount)} vào Fresh Credit cho món ${d ? d.name : 'bữa ăn'}.`,
        unread: true
      });
      this.toast(`🎉 Đã duyệt hoàn ${fmt(refundAmount)} ngay vào Fresh Credit.`);
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
        desc: `Nạp Fresh Credit ${fmt(amount)} (Tặng ${fmt(bonus)})`,
        amount: totalVal,
        bal: this.user.prepaidBalance
      });
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: 'Nạp Fresh Credit thành công',
        desc: `Đã cộng ${fmt(totalVal)} vào số dư điểm ăn tươi.`,
        unread: true
      });
      this.closeModal();
      this.toast(`🎉 Nạp thành công! Số dư Fresh Credit hiện tại: ${fmt(this.user.prepaidBalance)}`);
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

    saveOnboardingProfile(profile, claimReward = true) {
      this.onboardingProfile = {
        ...this.onboardingProfile,
        ...profile,
        isCompleted: true
      };
      this.onboardingSkipped = false;

      // Tự động đăng nhập người dùng khi hoàn tất khảo sát
      this.user.isLoggedIn = true;
      if (profile.contact) {
        const trimmed = profile.contact.trim();
        if (this.user.name && this.user.name !== 'Khách hàng' && this.user.name !== 'Khách mới' && !this.user.name.startsWith('Khách •')) {
          // Giữ nguyên tên tài khoản định danh / demo (như 'Anh Minh', 'Chị Lan')
          if (trimmed.includes('@')) {
            this.user.email = trimmed;
          } else {
            this.user.phone = trimmed;
          }
        } else if (trimmed.includes('@')) {
          const emailPrefix = trimmed.split('@')[0];
          this.user.name = emailPrefix || 'Khách hàng';
          this.user.email = trimmed;
        } else {
          const digits = trimmed.replace(/\D/g, '');
          const last4 = digits.length >= 4 ? digits.slice(-4) : digits;
          this.user.name = last4 ? `Khách • ${last4}` : 'Khách hàng';
          this.user.phone = trimmed;
        }
      } else if (!this.user.name || this.user.name === 'Khách hàng') {
        this.user.name = 'Khách mới';
      }

      // Khởi tạo sổ địa chỉ mặc định nếu chưa có
      if (!this.user.addresses || !this.user.addresses.length) {
        this.user.addresses = [
          {
            id: 'addr-' + Date.now(),
            label: 'Địa chỉ giao hàng',
            name: this.user.name,
            phone: this.user.phone || '',
            district: profile.region === 'hcm_inner' ? 'Quận 1' : 'TP. Thủ Đức',
            detail: 'Chưa cập nhật chi tiết số nhà, tên đường',
            isDefault: true
          }
        ];
      }

      // Sync household size to store
      if (profile.householdSize) {
        this.n = profile.householdSize;
        if (this.user.pref) {
          this.user.pref.ppl = profile.householdSize;
        }
      }

      // Sync exclusions to filter chips
      const newFilters = new Set(this.f);
      if (profile.exclusions) {
        if (profile.exclusions.includes('no_beef')) newFilters.add('noBo');
        else newFilters.delete('noBo');

        if (profile.exclusions.includes('no_pork')) newFilters.add('noHeo');
        else newFilters.delete('noHeo');

        if (profile.exclusions.includes('no_spicy')) newFilters.add('noCay');
        else newFilters.delete('noCay');
      }
      this.f = [...newFilters];

      // Award +20.000d Fresh Credit viral reward if not yet claimed
      let rewarded = false;
      if (claimReward && !this.profileRewardClaimed) {
        this.profileRewardClaimed = true;
        this.user.prepaidBalance += 20000;
        rewarded = true;

        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        this.ledger.unshift({
          date: 'Hôm nay ' + nowStr,
          desc: 'Thưởng 100% Hồ sơ sức khỏe AI (Viral Credit)',
          amount: 20000,
          bal: this.user.prepaidBalance
        });

        this.notifications.unshift({
          id: 'notif-' + Date.now(),
          time: 'Vừa xong',
          title: '🎁 Thưởng +20.000đ Fresh Credit',
          desc: 'MOVA đã cộng 20.000đ vào tài khoản Fresh Credit vì bạn đã hoàn thiện 100% Hồ sơ sức khỏe AI.',
          unread: true
        });
      }

      if (this.activeModal === 'onboarding') {
        this.closeModal();
      }

      if (rewarded) {
        this.toast(`🎉 Chúc mừng! Đã kích hoạt tài khoản ${this.user.name} & nhận +20.000đ Fresh Credit!`);
      } else {
        this.toast('Đã cập nhật Hồ sơ sức khỏe AI thành công!');
      }

      this.persist();
    },

    skipOnboarding() {
      this.onboardingSkipped = true;
      if (this.activeModal === 'onboarding') {
        this.closeModal();
      }
      this.toast('Đã chuyển sang thực đơn mẫu. Bạn có thể bấm "Sửa hồ sơ AI" trên thanh tiêu đề để thiết lập lại.');
      this.persist();
    },

    openOnboarding() {
      this.openModal('onboarding');
    },

    loginDemoLan() {
      this.user = JSON.parse(JSON.stringify(DEMO_LAN_DATA.user));
      this.activeOrder = JSON.parse(JSON.stringify(DEMO_LAN_DATA.activeOrder));
      this.historyOrders = JSON.parse(JSON.stringify(DEMO_LAN_DATA.historyOrders));
      this.ledger = JSON.parse(JSON.stringify(DEMO_LAN_DATA.ledger));
      this.notifications = JSON.parse(JSON.stringify(DEMO_LAN_DATA.notifications));
      this.onboardingProfile = JSON.parse(JSON.stringify(DEMO_LAN_DATA.onboardingProfile));
      this.profileRewardClaimed = true;
      this.onboardingSkipped = false;
      this.n = this.onboardingProfile.householdSize;
      this.pay = 'prepaid';
      this.toast('Đã chuyển sang tài khoản Demo: Chị Lan (850k Fresh Credit)');
      if (this.pendingCheckoutAfterLogin) {
        this.pendingCheckoutAfterLogin = false;
        this.openModal('checkout');
      } else {
        this.closeModal();
      }
      this.persist();
    },

    loginDemoReturning() {
      return this.loginDemoLan();
    },

    loginDemoNew() {
      this.user = JSON.parse(JSON.stringify(DEMO_MINH_DATA.user));
      this.user.isLoggedIn = true;
      this.user.name = 'Anh Minh';
      this.user.prepaidBalance = 30000;
      this.activeOrder = null;
      this.historyOrders = [];
      this.ledger = JSON.parse(JSON.stringify(DEMO_MINH_DATA.ledger));
      this.notifications = JSON.parse(JSON.stringify(DEMO_MINH_DATA.notifications));
      // Bắt buộc đặt onboardingProfile.isCompleted = false và reset câu trả lời để Anh Minh trải nghiệm đúng luồng khách mới
      this.onboardingProfile = {
        contact: '',
        region: 'hcm_inner',
        householdSize: 2,
        mealsPerWeek: 5,
        cuisinePreference: 'pure_viet',
        healthGoal: ['balanced'],
        exclusions: [],
        isCompleted: false
      };
      this.profileRewardClaimed = false;
      this.onboardingSkipped = false;
      this.n = 2;
      this.f = [];
      this.pay = 'qr';
      this.toast('Đã đăng nhập Demo Khách Mới: Anh Minh (Chưa làm khảo sát, sẵn sàng trải nghiệm AI)!');
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
