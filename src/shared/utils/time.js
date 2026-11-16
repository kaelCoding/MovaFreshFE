// Mọi tính toán ngày giờ nghiệp vụ dùng múi giờ Việt Nam (UTC+7), không phụ thuộc máy chạy.
// Một "dayKey" là chuỗi 'YYYY-MM-DD' theo giờ Việt Nam.

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;
const VN_OFFSET_MS = 7 * HOUR;

const pad = (n) => String(n).padStart(2, '0');

export const DOW_LABELS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Tạo Date từ ngày giờ theo giờ Việt Nam. */
export function vnDate(y, m, d, h = 0, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h, min) - VN_OFFSET_MS);
}

/** Tách một Date thành các phần theo giờ Việt Nam. */
export function vnParts(date) {
  const s = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    y: s.getUTCFullYear(),
    m: s.getUTCMonth() + 1,
    d: s.getUTCDate(),
    h: s.getUTCHours(),
    min: s.getUTCMinutes(),
    dow: s.getUTCDay()
  };
}

export function dayKey(date) {
  const p = vnParts(date);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** Date tại giờ h:min của một dayKey. */
export function atDay(key, h = 0, min = 0) {
  const { y, m, d } = parseDayKey(key);
  return vnDate(y, m, d, h, min);
}

export function addDays(key, n) {
  const { y, m, d } = parseDayKey(key);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function dowOfKey(key) {
  const { y, m, d } = parseDayKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "08:00 Thứ Sáu 27/11" — luôn là ngày giờ cụ thể, không dùng "8 tiếng". */
export function fmtDeadline(date) {
  const p = vnParts(date);
  return `${pad(p.h)}:${pad(p.min)} ${DOW_LABELS[p.dow]} ${pad(p.d)}/${pad(p.m)}`;
}

/** "Thứ Sáu 27/11/2026" */
export function fmtDay(key) {
  const { y, m, d } = parseDayKey(key);
  return `${DOW_LABELS[dowOfKey(key)]} ${pad(d)}/${pad(m)}/${y}`;
}

/** Dãy `count` ngày (dayKey) liên tiếp từ `fromKey` có thứ nằm trong `dows`. */
export function dayKeySequence(dows, fromKey, count) {
  const out = [];
  let key = fromKey;
  for (let i = 0; i < 400 && out.length < count; i++) {
    if (dows.includes(dowOfKey(key))) out.push(key);
    key = addDays(key, 1);
  }
  return out;
}
