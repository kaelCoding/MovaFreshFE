import { defineStore } from 'pinia';
import { DEFAULT_STATE, DEMO_LAN_DATA, DEMO_MINH_DATA } from '../data/mockData';
import { fmt } from '../shared/utils/formatters';

// Store của phần tài khoản cũ (/account). Giỏ hàng, phí giao, ưu đãi theo mức đơn và chọn món lẻ của V1
// đã bị gỡ: khách giờ đăng ký gói 4 tuần trả trước ở /plans (xem usePlanFlowStore). P1B sẽ viết lại màn tài khoản.
const STORAGE_KEY = 'mova_fresh_v4_account';

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

const nowLabel = () => 'Hôm nay ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const useMovaStore = defineStore('mova', {
  state: () => {
    const initial = loadState();
    return {
      ...initial,
      // Trạng thái giao diện tạm thời
      toastMessage: '',
      toastVisible: false,
      toastTimer: null,
      notifDrawerOpen: false,

      // Modal: 'login' | 'refund' | 'topup' | 'address'
      activeModal: null,
      pendingTopup: { amount: 0, bonus: 0 }
    };
  },

  getters: {
    unreadNotifsCount(state) {
      return state.notifications.filter((n) => n.unread).length;
    }
  },

  actions: {
    persist() {
      try {
        const clone = {
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
      if (modalName === 'topup' && payload) {
        this.pendingTopup = payload;
      }
    },

    closeModal() {
      this.activeModal = null;
    },

    setCutoffPassed(val) {
      this.cutoffPassed = val;
      this.toast(val ? 'Đã chuyển mốc: SAU giờ chốt sổ (nhà máy Đắk Lắk đang sơ chế, khóa sửa)' : 'Đã chuyển mốc: TRƯỚC giờ chốt sổ (cho phép sửa, hoãn, hủy)');
      this.persist();
    },

    delayActiveOrder() {
      if (!this.activeOrder) return;
      this.activeOrder.delayed = true;
      this.activeOrder.delayNotice = 'Đã hoãn sang chuyến xe tuần kế tiếp, bảo lưu 100% giá trị';
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: `Đã hoãn đợt giao đơn #${this.activeOrder.id}`,
        desc: 'MOVA đã dời lịch giao sang chuyến xe tuần kế tiếp. Toàn bộ giá trị bữa ăn được bảo lưu 100%.',
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
        date: nowLabel(),
        desc: `Hoàn tiền hủy đơn #${this.activeOrder.id}`,
        amount: refundAmt,
        bal: this.user.prepaidBalance
      });
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: `Đã hủy đơn #${this.activeOrder.id}`,
        desc: `Hoàn ${fmt(refundAmt)} vào Fresh Credit.`,
        unread: true
      });
      this.activeOrder = null;
      this.toast(`Đã hủy đơn và hoàn ${fmt(refundAmt)} vào Fresh Credit.`);
      this.persist();
    },

    refundItem(dishId, reason) {
      const refundAmount = 110000;
      this.user.prepaidBalance += refundAmount;
      this.ledger.unshift({
        date: nowLabel(),
        desc: `Bồi thường chất lượng (${reason.slice(0, 24)}...)`,
        amount: refundAmount,
        bal: this.user.prepaidBalance
      });
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: 'Đã hoàn tiền bồi thường chất lượng',
        desc: `MOVA đã cộng ${fmt(refundAmount)} vào Fresh Credit.`,
        unread: true
      });
      this.toast(`Đã duyệt hoàn ${fmt(refundAmount)} vào Fresh Credit.`);
      this.closeModal();
      this.persist();
    },

    rateDish(oid, did, rating) {
      const ord = this.historyOrders.find((x) => x.id === oid);
      if (!ord) return;
      const item = ord.items.find((x) => x.id === did);
      if (!item) return;

      item.rate = rating;
      if (rating === 'salty') {
        this.toast('Đã ghi nhận! MOVA sẽ chỉnh khẩu vị nhạt hơn cho các tuần sau.');
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
        date: nowLabel(),
        desc: `Nạp Fresh Credit ${fmt(amount)} (thưởng ${fmt(bonus)})`,
        amount: totalVal,
        bal: this.user.prepaidBalance
      });
      this.notifications.unshift({
        id: 'notif-' + Date.now(),
        time: 'Vừa xong',
        title: 'Nạp Fresh Credit thành công',
        desc: `Đã cộng ${fmt(totalVal)} vào Fresh Credit.`,
        unread: true
      });
      this.closeModal();
      this.toast(`Nạp thành công! Fresh Credit hiện tại: ${fmt(this.user.prepaidBalance)}`);
      this.persist();
    },

    loginDemoLan() {
      this.user = JSON.parse(JSON.stringify(DEMO_LAN_DATA.user));
      this.activeOrder = JSON.parse(JSON.stringify(DEMO_LAN_DATA.activeOrder));
      this.historyOrders = JSON.parse(JSON.stringify(DEMO_LAN_DATA.historyOrders));
      this.ledger = JSON.parse(JSON.stringify(DEMO_LAN_DATA.ledger));
      this.notifications = JSON.parse(JSON.stringify(DEMO_LAN_DATA.notifications));
      this.toast('Đã chuyển sang tài khoản demo: Chị Lan');
      this.closeModal();
      this.persist();
    },

    loginDemoNew() {
      this.user = JSON.parse(JSON.stringify(DEMO_MINH_DATA.user));
      this.activeOrder = null;
      this.historyOrders = [];
      this.ledger = JSON.parse(JSON.stringify(DEMO_MINH_DATA.ledger));
      this.notifications = JSON.parse(JSON.stringify(DEMO_MINH_DATA.notifications));
      this.toast('Đã đăng nhập tài khoản khách mới: Anh Minh');
      this.closeModal();
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
      this.closeModal();
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
      this.user.pref = { ...this.user.pref, ...pref };
      this.toast('Đã lưu cài đặt.');
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
      this.toast('Đã khôi phục dữ liệu demo gốc.');
      this.persist();
    }
  }
});
