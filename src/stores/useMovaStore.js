import { defineStore } from 'pinia';
import { api } from '../shared/api';
import { usePlanFlowStore } from './usePlanFlowStore';

// Store của phần tài khoản (/account) và các thành phần dùng chung toàn app (toast, modal, ngăn thông báo).
// Mọi dữ liệu tài khoản lấy từ src/shared/api (đơn và gói do phễu /plans tạo ra), không còn dữ liệu demo riêng.
//
// "Khách hiện tại": ưu tiên khách vừa đăng ký ở phễu /plans (mã khách nằm trong result của store phễu);
// nếu khách tự đăng nhập bằng SĐT / email đã dùng khi đăng ký (không mật khẩu, bản demo) thì dùng khách đó.
const SESSION_KEY = 'mova_account_session_v2';
const POLL_MS = 20000;

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || {};
  } catch {
    return {};
  }
}

function writeSession(s) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // chế độ riêng tư: bỏ qua
  }
}

export const useMovaStore = defineStore('mova', {
  state: () => ({
    customerId: null,
    account: null, // kết quả api.customer.getAccount
    notifications: [],
    loaded: false,
    version: 0, // tăng mỗi lần dữ liệu tải lại; các tab theo dõi để tự cập nhật

    // Trạng thái giao diện tạm thời
    toastMessage: '',
    toastVisible: false,
    toastTimer: null,
    notifDrawerOpen: false,
    activeModal: null, // 'login' | 'topup'
    topupSuggest: null // { pay_vnd } gợi ý mức nạp khi mở từ cảnh báo
  }),

  getters: {
    isLoggedIn: (s) => Boolean(s.customerId && s.account),
    userName: (s) => (s.account ? s.account.customer.name : ''),
    unreadNotifsCount: (s) => s.notifications.filter((n) => !n.read).length,
    balance: (s) => (s.account ? s.account.credit : { real_vnd: 0, promo_vnd: 0, total_vnd: 0 }),
    alertCount: (s) => (s.account && s.account.alert ? 1 : 0) + (s.account && s.account.renewal && s.account.renewal.due ? 1 : 0),
    hasActivePlan: (s) => Boolean(s.account && s.account.subscription && s.account.subscription.status === 'active')
  },

  actions: {
    toast(msg) {
      this.toastMessage = msg;
      this.toastVisible = true;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastVisible = false;
      }, 3200);
    },

    openModal(name, payload = null) {
      this.activeModal = name;
      if (name === 'topup') this.topupSuggest = payload;
    },

    closeModal() {
      this.activeModal = null;
    },

    /** Xác định khách hiện tại từ phiên đăng nhập hoặc từ phễu /plans. */
    resolveCustomer() {
      const session = readSession();
      let flowId = null;
      try {
        flowId = usePlanFlowStore().result?.customer_id || null;
      } catch {
        flowId = null;
      }
      // Khách vừa đăng ký xong ở phễu thì chuyển sang khách đó (một lần cho mỗi khách mới)
      if (flowId && flowId !== session.flowSeen) {
        session.customerId = flowId;
        session.flowSeen = flowId;
        writeSession(session);
      }
      this.customerId = session.customerId || null;
      return this.customerId;
    },

    /** Chạy job tới hạn, rồi tải lại tổng quan và thông báo. Trả false nếu chưa có khách / dữ liệu đã bị đặt lại. */
    refresh() {
      if (!this.customerId && !this.resolveCustomer()) {
        this.account = null;
        this.notifications = [];
        this.loaded = true;
        return false;
      }
      api.customer.tick();
      const res = api.customer.getAccount(this.customerId);
      if (res.status === 'error') {
        // Dữ liệu dùng chung đã bị đặt lại: bỏ phiên cũ
        this.logout(true);
        this.loaded = true;
        return false;
      }
      this.account = res.data;
      this.notifications = api.customer.notifications(this.customerId);
      this.loaded = true;
      this.version += 1;
      return true;
    },

    startPolling() {
      this.stopPolling();
      this._poll = setInterval(() => this.refresh(), POLL_MS);
    },

    stopPolling() {
      if (this._poll) clearInterval(this._poll);
      this._poll = null;
    },

    loginWithContact(text) {
      const res = api.customer.findCustomerByContact(text);
      if (res.status === 'error') return res.error.message;
      this.loginAs(res.data.customer_id);
      return '';
    },

    loginAs(customerId) {
      const session = readSession();
      writeSession({ ...session, customerId });
      this.customerId = customerId;
      this.refresh();
      this.toast(`Đã vào tài khoản ${this.userName}`);
      this.closeModal();
    },

    logout(silent = false) {
      const session = readSession();
      writeSession({ flowSeen: session.flowSeen, customerId: null });
      this.customerId = null;
      this.account = null;
      this.notifications = [];
      if (!silent) this.toast('Đã đăng xuất');
    },

    markAllNotifsRead() {
      if (!this.customerId) return;
      api.customer.markNotificationsRead(this.customerId);
      this.notifications = api.customer.notifications(this.customerId);
      this.refresh();
    }
  }
});
