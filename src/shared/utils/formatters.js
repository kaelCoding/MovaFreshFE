const nf = new Intl.NumberFormat('vi-VN');

export const fmt = (n) => nf.format(Math.round(n || 0)) + 'đ';

// Tên chuẩn trong .agent/04 (formatVnd); fmt giữ lại để không phải sửa toàn bộ app V1.
export const formatVnd = fmt;

export const pad = (n) => String(n).padStart(2, '0');

export function rng(seed) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
