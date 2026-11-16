export function createMemoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k)
  };
}

/** localStorage nếu dùng được (trình duyệt), nếu không thì bộ nhớ tạm (test, chế độ riêng tư). */
export function defaultStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__mova_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    }
  } catch {
    // rơi xuống bộ nhớ tạm
  }
  return createMemoryStorage();
}
