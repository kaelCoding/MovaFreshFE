import { describe, it, expect } from 'vitest';
import { encodeQr, qrPath } from '../utils/qr';

const URL = 'https://mova.example/q/MOVA-TRACE-BO-202611-0912';

// Đọc 15 bit thông tin định dạng ở bản sao thứ nhất và thứ hai, rồi kiểm tra mã BCH
function formatBits(m) {
  const size = m.length;
  const get = (x, y) => (m[y][x] ? 1 : 0);
  let a = 0;
  for (let i = 0; i <= 5; i++) a |= get(8, i) << i;
  a |= get(8, 7) << 6;
  a |= get(8, 8) << 7;
  a |= get(7, 8) << 8;
  for (let i = 9; i < 15; i++) a |= get(14 - i, 8) << i;
  let b = 0;
  for (let i = 0; i < 8; i++) b |= get(size - 1 - i, 8) << i;
  for (let i = 8; i < 15; i++) b |= get(8, size - 15 + i) << i;
  return [a, b];
}

function bchValid(bits) {
  const data = (bits ^ 0x5412) >>> 10;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) === (bits ^ 0x5412);
}

describe('bộ sinh mã QR', () => {
  it('chọn phiên bản nhỏ nhất đủ chứa nội dung, kích thước 17 + 4v', () => {
    const q = encodeQr(URL);
    expect(q.version).toBe(4); // 50 byte ở mức M
    expect(q.size).toBe(17 + 4 * q.version);
    expect(q.modules).toHaveLength(q.size);
    expect(encodeQr('A').version).toBe(1);
    expect(encodeQr('x'.repeat(100)).version).toBe(6);
  });

  it('có ba mẫu định vị, đường timing và ô tối cố định', () => {
    const { modules: m, size } = encodeQr(URL);
    const finder = (x0, y0) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const border = x === 0 || x === 6 || y === 0 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          expect(m[y0 + y][x0 + x]).toBe(border || core);
        }
      }
    };
    finder(0, 0);
    finder(size - 7, 0);
    finder(0, size - 7);
    for (let i = 8; i < size - 8; i++) {
      expect(m[6][i]).toBe(i % 2 === 0);
      expect(m[i][6]).toBe(i % 2 === 0);
    }
    expect(m[size - 8][8]).toBe(true);
  });

  it('thông tin định dạng hợp lệ (BCH) và hai bản sao giống nhau, mọi mức sửa lỗi', () => {
    for (const level of ['L', 'M', 'Q', 'H']) {
      const [a, b] = formatBits(encodeQr(URL, level).modules);
      expect(a).toBe(b);
      expect(bchValid(a)).toBe(true);
    }
  });

  it('cùng nội dung cho cùng ma trận, khác nội dung cho ma trận khác; quá dài thì báo lỗi', () => {
    expect(encodeQr(URL).modules).toEqual(encodeQr(URL).modules);
    expect(encodeQr(URL).modules).not.toEqual(encodeQr(URL.replace('0912', '0913')).modules);
    expect(() => encodeQr('x'.repeat(400))).toThrow();
    expect(() => encodeQr('a', 'Z')).toThrow();
  });

  it('chuỗi UTF-8 có dấu tiếng Việt mã hóa được', () => {
    expect(encodeQr('Thịt bò Đắk Lắk').size).toBeGreaterThan(20);
  });

  it('đường vẽ SVG chỉ có các ô tối, lùi theo viền trắng', () => {
    const { modules } = encodeQr('A');
    const d = qrPath(modules, 2);
    const dark = modules.flat().filter(Boolean).length;
    expect(d.split('M').length - 1).toBe(dark);
    expect(d.startsWith('M2,2')).toBe(true); // ô trên-trái của mẫu định vị luôn tối
  });
});
