import { fmtDeadline } from '../shared/utils/time';

const nf1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** "2,5°C" */
export const tempText = (n) => (n == null ? '—' : `${nf1.format(n)}°C`);

/** "75%" hoặc "—" khi chưa có dữ liệu */
export const pctText = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);

export const dt = (iso) => (iso ? fmtDeadline(new Date(iso)) : '—');

/** Số thập phân kiểu Việt */
export const dec = (n) => (n == null ? '—' : nf1.format(n));

export const EXCEPTION_KIND = {
  missing_box: 'Thùng thiếu ở kho phụ',
  damaged_box: 'Thùng hỏng ở kho phụ',
  delivery_failed: 'Giao không thành công',
  cold_discard: 'QC hủy hàng (vượt nhiệt)'
};

export const FAIL_REASON = { unreachable: 'Không liên lạc được', wrong_address: 'Sai địa chỉ', customer_reschedule: 'Khách hẹn lại' };

export const WAIT_REASON = {
  waiting_truck: 'Chờ xe về kho phụ',
  box_missing: 'Thùng thiếu / hỏng',
  seafood: 'Chưa ghép hải sản',
  exception: 'Đang có ngoại lệ'
};

export const ROUTE_STATUS = { planned: 'Đã lập, chưa xuất kho', dispatched: 'Đang giao', done: 'Đã xong' };
export const STOP_STATUS = { planned: 'Chờ xuất kho', pending: 'Chờ giao', delivered: 'Đã giao', failed: 'Không giao được', moved: 'Đã chuyển', unrouted: 'Chưa lên tuyến' };
export const STOP_PILL = { planned: '', pending: 'ops-pill-warn', delivered: 'ops-pill-ok', failed: 'ops-pill-bad', moved: '' };
