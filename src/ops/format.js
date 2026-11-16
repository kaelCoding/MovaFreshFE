import { dowOfKey, parseDayKey, vnParts } from '../shared/utils/time';

const pad = (n) => String(n).padStart(2, '0');
const nf1 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('vi-VN');

/** 18,5 (một chữ số thập phân) */
export const kg = (n) => nf1.format(n || 0);
export const num = (n) => nf0.format(n || 0);

/** "T2 23/11" hoặc "CN 22/11" */
export function shortDay(key) {
  const { m, d } = parseDayKey(key);
  const dow = dowOfKey(key);
  return `${dow === 0 ? 'CN' : 'T' + (dow + 1)} ${pad(d)}/${pad(m)}`;
}

/** "23/11" */
export function dm(key) {
  const { m, d } = parseDayKey(key);
  return `${pad(d)}/${pad(m)}`;
}

/** Giờ:phút theo giờ Việt Nam */
export function hhmm(iso) {
  const p = vnParts(new Date(iso));
  return `${pad(p.h)}:${pad(p.min)}`;
}

export const sourceKindLabel = { htx: 'HTX', nong_ho: 'Nông hộ', lo_mo: 'Lò mổ' };
