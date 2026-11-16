import { pad } from './formatters';

export const DAYN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export function schedule(now = new Date()) {
  const sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7 || 7), 8, 0, 0);
  let cut = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() - 3, 20, 0, 0);
  if (now >= cut) {
    sun.setDate(sun.getDate() + 7);
    cut = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() - 3, 20, 0, 0);
  }
  const wed = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate() + 3, 8, 0, 0);
  return { sun, wed, cut };
}

export const dLbl = (d) => `${DAYN[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

export function splitDropsList(dishKeys, isSplit) {
  const ids = Array.isArray(dishKeys) ? dishKeys : [...dishKeys];
  if (!isSplit) {
    return [ids, []];
  }
  const mid = Math.ceil(ids.length / 2);
  return [ids.slice(0, mid), ids.slice(mid)];
}

export function getTimeLeft(targetDate = null) {
  const { cut, sun } = schedule();
  const target = targetDate || cut;
  const left = Math.max(0, target - new Date());
  const dd = Math.floor(left / 864e5);
  const hh = Math.floor((left % 864e5) / 36e5);
  const mm = Math.floor((left % 36e5) / 6e4);
  const ss = Math.floor((left % 6e4) / 1e3);
  return {
    dd,
    hh: pad(hh),
    mm: pad(mm),
    ss: pad(ss),
    formatted: `còn ${dd} ngày ${pad(hh)}:${pad(mm)}:${pad(ss)}`,
    sunLbl: dLbl(sun)
  };
}
