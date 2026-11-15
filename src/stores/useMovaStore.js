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

const STORAGE_KEY = 'mova_fresh_v2_fintech_m6';

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
        onboardingSkipped: parsed.onboardingSkipped ?? def.onboardingSkipped,
        heroWizardDismissed: parsed.heroWizardDismissed ?? def.heroWizardDismissed,
        upsellProtein: parsed.upsellProtein ?? def.upsellProtein,
        upsellLowCarb: parsed.upsellLowCarb ?? def.upsellLowCarb,
        upsellWestern: parsed.upsellWestern ?? def.upsellWestern,
        deliveryFrequency: parsed.deliveryFrequency ?? def.deliveryFrequency,
        deliveryTimeSlot: parsed.deliveryTimeSlot ?? def.deliveryTimeSlot
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
    // Thống nhất nguồn trạng thái người dùng
    currentUser(state) {
      return state.user;
    },
    cart(state) {
      return state.mode === 'A' ? state.cartA : state.cartB;
    },
    addons(state) {
      return state.mode === 'A' ? state.addonsA : state.addonsB;
    },
    // Lọc món thông minh theo quy mô và kiêng cữ
    allowed: (state) => (d) => {
      const p = state.onboardingProfile || {};
      const household = p.householdSize || state.n || 2;

      // 1. Phân tách theo số người ăn:
      // - 1 người: chỉ hiển thị Suất ăn Độc thân (category: 'solo')
      // - >= 2 người: hiển thị Mâm cơm Gia đình 5 thành phần & Mâm cơm Bistro
      if (household === 1) {
        if (d.category !== 'solo') return false;
      } else {
        if (d.category === 'solo') return false;
      }

      // 2. Bộ lọc khẩu vị người dùng
      const f = new Set(state.f);
      if (f.has('noBo') && d.p === 'bo') return false;
      if (f.has('noHeo') && (d.p === 'heo' || d.p === 'suon')) return false;
      if (f.has('noCay') && d.spicy) return false;
      if (f.has('lowOil') && !d.lowOil) return false;
      if (f.has('chay') && !d.isVegan) return false;

      // 3. Đồng bộ từ Onboarding exclusions
      if (p.exclusions) {
        if (p.exclusions.includes('no_beef') && d.p === 'bo') return false;
        if (p.exclusions.includes('no_pork') && (d.p === 'heo' || d.p === 'suon')) return false;
        if (p.exclusions.includes('no_seafood') && d.p === 'ca') return false;
        if (p.exclusions.includes('no_spicy') && d.spicy) return false;
      }

      return true;
    },
    // Tính toán giỏ hàng & Subscription 4 tuần
    calcAll(state) {
      const dishes = state.mode === 'A' ? state.cartA : state.cartB;
      const ads = state.mode === 'A' ? state.addonsA : state.addonsB;

      const p = state.onboardingProfile || {};
      const householdSize = p.householdSize || state.n || 2;
      const mealsPerWeek = p.mealsPerWeek || 5;
      const weeks = 4; // Khóa cứng Subscription tối thiểu 4 tuần

      let subWeekly = 0;
      let saveWeekly = 0;
      let meals = 0;
      let serv = 0;

      Object.entries(dishes).forEach(([id, q]) => {
        const d = byId[id];
        if (d && q > 0) {
          const basePerPerson = d.pricePerPerson || d.price || 75000;
          let mealPrice = householdSize === 1 ? basePerPerson : basePerPerson * householdSize;

          // Upsell: Tăng 30% Đạm (+35k/bữa cho gia đình, +25k/bữa cho 1 người)
          if (state.upsellProtein) {
            mealPrice += (householdSize === 1 ? 25000 : 35000);
          }

          subWeekly += mealPrice * q;
          saveWeekly += (d.save || 0) * q;
          meals += q;
          serv += q * householdSize;
        }
      });

      let adTotal = 0;
      Object.entries(ads).forEach(([id, q]) => {
        const a = addonById[id];
        if (a && q > 0) {
          adTotal += a.price * q;
        }
      });

      const weeklyNet = Math.max(0, subWeekly - saveWeekly + adTotal);

      // Subscription 4 tuần
      const totalMeals4Weeks = meals * weeks;
      const gross4Weeks = weeklyNet * weeks;

      // Lịch phân bổ Gift Card 900.000đ qua 4 tuần (HelloFresh-style)
      const giftCardSchedule = {
        w1: 300000,
        w2: 200000,
        w3: 200000,
        w4: 200000,
        total: 900000
      };

      // Kỳ 1: Giảm ngay 300k
      const week1GiftCardDiscount = Math.min(weeklyNet, giftCardSchedule.w1);
      const week1Payable = Math.max(0, weeklyNet - week1GiftCardDiscount);

      // Trọn gói 4 tuần: Giảm cả 900k
      const monthGiftCardDiscount = Math.min(gross4Weeks, giftCardSchedule.total);
      const monthPayable = Math.max(0, gross4Weeks - monthGiftCardDiscount);

      // Miễn phí vận chuyển tuyến xe lạnh Đắk Lắk – TP.HCM
      const shipFee = 0;
      const isSplit = state.deliveryFrequency === '2drop' || meals >= 4;

      // Xác định số tiền thanh toán hiện tại theo phương thức
      let currentPayable = monthPayable;
      if (state.pay === 'card_recurring') {
        currentPayable = week1Payable;
      } else if ((state.pay === 'credit' || state.pay === 'prepaid') && state.user.prepaidBalance < monthPayable && state.user.prepaidBalance >= week1Payable) {
        currentPayable = week1Payable;
      }

      return {
        sub: subWeekly,
        save: saveWeekly,
        adTotal,
        weeklyNet,
        weeks,
        gross4Weeks,
        giftCardSchedule,
        week1GiftCardDiscount,
        week1Payable,
        monthGiftCardDiscount,
        monthPayable,
        total: currentPayable,
        shipFee,
        isSplit,
        meals,
        totalMeals4Weeks,
        serv,
        householdSize,
        mealsPerWeek,
        canQR: weeklyNet >= 400000,
        qrDiscount: 0,
        meetsMOV: true
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
          upsellProtein: this.upsellProtein,
          upsellLowCarb: this.upsellLowCarb,
          upsellWestern: this.upsellWestern,
          deliveryFrequency: this.deliveryFrequency,
          deliveryTimeSlot: this.deliveryTimeSlot,
          heroWizardDismissed: this.heroWizardDismissed,
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
      }, 3500);
    },

    openModal(modalName, payload = null) {
      this.activeModal = modalName;
      if (modalName === 'dish') {
        this.selectedDishId = payload;
      }
    },

    closeModal() {
      this.activeModal = null;
      this.selectedDishId = null;
    },

    setMode(m) {
      if (this.mode === m) return;
      this.mode = m;
      this.persist();
    },

    setBudget(b) {
      this.budget = b;
      this.persist();
    },

    setHouseholdSize(n) {
      if (n < 1 || n > 8) return;
      this.n = n;
      if (!this.onboardingProfile) {
        this.onboardingProfile = { householdSize: n };
      } else {
        this.onboardingProfile.householdSize = n;
      }
      if (this.user.pref) this.user.pref.ppl = n;
      this.toast(`Đã cập nhật quy mô: ${n} người ăn (${n === 1 ? 'Chế độ Độc thân' : 'Mâm cơm Gia đình 5 món'})`);
      this.persist();
    },

    setMealsPerWeek(m) {
      if (m < 3 || m > 7) return;
      if (!this.onboardingProfile) {
        this.onboardingProfile = { mealsPerWeek: m };
      } else {
        this.onboardingProfile.mealsPerWeek = m;
      }
      this.toast(`Đã cập nhật tần suất: ${m} bữa / tuần (Chu kỳ 4 tuần: ${m * 4} bữa)`);
      this.persist();
    },

    setPeople(n) {
      this.setHouseholdSize(n);
    },

    // Upsell Toggles
    toggleUpsellProtein() {
      this.upsellProtein = !this.upsellProtein;
      this.toast(this.upsellProtein ? 'Đã bật: Tăng +30% lượng Đạm cho mâm cơm' : 'Đã về mức Đạm tiêu chuẩn');
      this.persist();
    },

    toggleUpsellLowCarb() {
      this.upsellLowCarb = !this.upsellLowCarb;
      this.carb = this.upsellLowCarb;
      this.toast(this.upsellLowCarb ? 'Đã bật: Giảm 50% Tinh bột & Đổi sang Gạo lứt hữu cơ' : 'Đã về mức Tinh bột chuẩn');
      this.persist();
    },

    toggleUpsellWestern() {
      this.upsellWestern = !this.upsellWestern;
      this.toast(this.upsellWestern ? 'Đã bật: Thêm 2 bữa Đồ Tây (Bistro Fusion) mỗi tuần' : 'Đã về thực đơn thuần cơm Việt');
      this.persist();
    },

    toggleFilter(tag) {
      const idx = this.f.indexOf(tag);
      if (idx > -1) {
        this.f.splice(idx, 1);
      } else {
        this.f.push(tag);
      }
      this.toast('Đã cập nhật bộ lọc khẩu vị');
      this.persist();
    },

    toggleShowNutrition() {
      this.showNutrition = !this.showNutrition;
      this.toast(this.showNutrition ? 'Đang hiện chỉ số dinh dưỡng (Calo/Đạm) trên món' : 'Đã ẩn chỉ số dinh dưỡng');
    },

    setPay(p) {
      this.pay = p;
      if (p === 'credit' || p === 'prepaid') {
        this.toast(`Đã chọn trừ vào Fresh Credit (Số dư: ${fmt(this.user.prepaidBalance)})`);
      } else if (p === 'vietqr_month' || p === 'qr') {
        this.toast('Đã chọn VietQR: Thanh toán trọn gói 4 tuần, khóa giá 1 tháng!');
      } else if (p === 'card_recurring') {
        this.toast('Đã chọn Thẻ tín dụng: Thanh toán Tuần 1 hôm nay, các tuần sau tự động trừ trước 72h');
      }
      this.persist();
    },

    setDeliveryFrequency(freq) {
      this.deliveryFrequency = freq;
      this.toast(freq === '2drop' ? 'Đã chọn giao 2 đợt/tuần (Chủ Nhật & Thứ Tư)' : 'Đã chọn giao gộp 1 đợt/tuần (Chủ Nhật)');
      this.persist();
    },

    setDeliveryTimeSlot(slot) {
      this.deliveryTimeSlot = slot;
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
      if (q <= 0) {
        delete next[id];
      } else {
        next[id] = q;
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

    tryChangeAddon(id, q) {
      const targetAddons = this.mode === 'A' ? this.addonsA : this.addonsB;
      const next = { ...targetAddons };
      if (q <= 0) delete next[id];
      else next[id] = q;

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
      );

      if (cands.length > 0) {
        const c = cands[0];
        const next = { ...targetCart };
        delete next[id];
        next[c.id] = q;
        if (this.mode === 'A') {
          this.cartA = next;
        } else {
          this.cartB = next;
        }
        this.toast(`Đã đổi sang ${c.name}`);
        this.persist();
      }
    },

    // Tự động xếp thực đơn chuẩn theo hồ sơ AI
    autoFillMenu() {
      const p = this.onboardingProfile || {};
      const needed = p.mealsPerWeek || 5;
      const pool = DISHES.filter((d) => this.allowed(d));

      const firstGoal = p.healthGoal && p.healthGoal[0] ? p.healthGoal[0] : 'balanced';
      pool.sort((a, b) => {
        const aMatch = a.goals && a.goals.includes(firstGoal) ? 1 : 0;
        const bMatch = b.goals && b.goals.includes(firstGoal) ? 1 : 0;
        return bMatch - aMatch || b.pop - a.pop;
      });

      const selected = pool.slice(0, needed);
      const newCart = {};
      selected.forEach((d) => {
        newCart[d.id] = 1;
      });

      if (this.mode === 'A') {
        this.cartA = newCart;
      } else {
        this.cartB = newCart;
      }
      this.persist();
    },

    setCutoffPassed(val) {
      this.cutoffPassed = val;
      this.toast(val ? 'Đã chuyển mốc: SAU 20:00 (Nhà máy Đắk Lắk sơ chế - Khóa sửa)' : 'Đã chuyển mốc: TRƯỚC 20:00 (Cho phép sửa, hoãn, hủy)');
      this.persist();
    },

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

    topupPrepaid(amount, bonus) {
      const totalVal = amount + bonus;
      this.user.prepaidBalance += totalVal;
      this.ledger.unshift({
        date: 'Hôm nay ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        desc: `Nạp Fresh Credit ${fmt(totalVal)} (Chỉ thanh toán ${fmt(amount)})`,
        amount: totalVal,
        bal: this.user.prepaidBalance
      });
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: 'Nạp Fresh Credit thành công',
        desc: `Đã cộng ${fmt(totalVal)} vào tài khoản điểm bữa ăn của bạn (Tặng ${fmt(bonus)}).`,
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

      if (this.pay === 'credit' || this.pay === 'prepaid') {
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
            desc: `Thanh toán Subscription 4 tuần #${code}`,
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
          return {
            id: d.id,
            qty: q,
            name: d.name,
            pricePerPerson: d.pricePerPerson || d.price,
            components: d.components,
            save: d.save
          };
        });

      const addons = Object.entries(addonSource)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => {
          const a = addonById[id];
          return { id: a.id, qty: q, name: a.name, price: a.price };
        });

      this.activeOrder = {
        id: code,
        createdAt: 'Hôm nay lúc ' + nowStr,
        status: 'confirmed',
        subscriptionWeeks: 4,
        householdSize: c.householdSize,
        mealsPerWeek: c.mealsPerWeek,
        delayed: false,
        delayNotice: '',
        firstDrop: this.firstDrop,
        deliveryFrequency: form.deliveryFrequency || this.deliveryFrequency || '2drop',
        deliveryTimeSlot: form.timeSlot || this.deliveryTimeSlot || '06:30–08:30',
        address: `${form.address}, ${form.district}`,
        receiver: `${form.name} - ${form.phone}`,
        note: form.note,
        sauce: this.sauce,
        carb: this.carb,
        upsellProtein: this.upsellProtein,
        items,
        addons,
        payMethod: this.pay,
        weeklyNet: c.weeklyNet,
        subTotal: c.gross4Weeks,
        giftCardDiscount: c.monthGiftCardDiscount,
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
        title: `Đăng ký thành công Subscription 4 tuần #${code}`,
        desc: `Gói ${c.mealsPerWeek} bữa/tuần (${c.totalMeals4Weeks} bữa/tháng) cho ${c.householdSize} người ăn đã chuyển sang nhà máy Đắk Lắk.`,
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

      // Tự động xếp thực đơn nếu giỏ chưa có món
      const curCart = this.mode === 'A' ? this.cartA : this.cartB;
      if (Object.keys(curCart).length === 0) {
        this.autoFillMenu();
      }

      if (rewarded) {
        this.toast(`🎉 Chúc mừng! Đã kích hoạt tài khoản ${this.user.name} & nhận +20.000đ Fresh Credit!`);
      } else {
        this.toast('Đã cập nhật Hồ sơ sức khỏe AI thành công!');
      }

      this.persist();
    },

    dismissHeroWizard() {
      this.heroWizardDismissed = true;
      if (this.activeModal === 'onboarding') {
        this.closeModal();
      }
      this.persist();
    },

    skipOnboarding() {
      this.onboardingSkipped = true;
      this.heroWizardDismissed = true;
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
      this.heroWizardDismissed = true;
      this.n = this.onboardingProfile.householdSize;
      this.pay = 'credit';
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
      this.heroWizardDismissed = false;
      this.n = 2;
      this.f = [];
      this.pay = 'credit';
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
      const newAddr = {
        id: newId,
        label: addr.label || 'Địa chỉ mới',
        name: addr.name || this.user.name,
        phone: addr.phone || this.user.phone,
        district: addr.district || 'Quận 1',
        detail: addr.detail || '',
        isDefault: addr.isDefault || false
      };

      if (newAddr.isDefault) {
        this.user.addresses.forEach((a) => (a.isDefault = false));
      }
      this.user.addresses.push(newAddr);
      this.closeModal();
      this.toast('Đã lưu địa chỉ mới thành công.');
      this.persist();
    },

    deleteAddress(id) {
      if (this.user.addresses.length <= 1) {
        this.toast('Cần giữ ít nhất 1 địa chỉ để giao hàng.');
        return;
      }
      const idx = this.user.addresses.findIndex((a) => a.id === id);
      if (idx > -1) {
        const wasDefault = this.user.addresses[idx].isDefault;
        this.user.addresses.splice(idx, 1);
        if (wasDefault && this.user.addresses.length) {
          this.user.addresses[0].isDefault = true;
        }
        this.toast('Đã xóa địa chỉ.');
        this.persist();
      }
    },

    setDefaultAddress(id) {
      this.user.addresses.forEach((a) => {
        a.isDefault = a.id === id;
      });
      this.toast('Đã đổi địa chỉ nhận hàng mặc định.');
      this.persist();
    },

    saveTasteProfile(pref) {
      this.user.pref = { ...this.user.pref, ...pref };
      this.sauce = pref.sauce;
      this.carb = pref.carb;
      this.f = [...(pref.f || [])];
      this.toast('Đã lưu và đồng bộ cài đặt khẩu vị vào Cửa hàng!');
      this.persist();
    },

    markAllNotifsRead() {
      this.notifications.forEach((n) => {
        n.unread = false;
      });
      this.toast('Đã đánh dấu đọc toàn bộ thông báo.');
      this.persist();
    },

    resetToDemoDefault() {
      localStorage.removeItem(STORAGE_KEY);
      const def = DEFAULT_STATE();
      Object.assign(this, def);
      this.toast('Đã khôi phục dữ liệu Demo gốc.');
    }
  }
});
