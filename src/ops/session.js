import { ref, computed } from 'vue';

const KEY = 'mova_ops_session';

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const session = ref(load());

export const ctx = computed(() =>
  session.value ? { role: session.value.role, supplierId: session.value.supplierId || null } : null
);

export function setSession(s) {
  session.value = s;
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
    else sessionStorage.removeItem(KEY);
  } catch {
    // sessionStorage có thể bị chặn; phiên vẫn chạy trong bộ nhớ
  }
}
