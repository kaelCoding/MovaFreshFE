import { onBeforeUnmount, onMounted } from 'vue';

/**
 * Tải dữ liệu khi vào màn, tải lại theo nhịp và khi tab khác ghi vào dữ liệu dùng chung (sự kiện `storage`).
 * `fn` chỉ nên ĐỌC (không ghi), nên không tạo vòng lặp ghi giữa các tab.
 */
export function useLive(fn, { every = 6000 } = {}) {
  let timer = null;
  const onStorage = () => fn();
  onMounted(() => {
    fn();
    if (every) timer = setInterval(fn, every);
    window.addEventListener('storage', onStorage);
  });
  onBeforeUnmount(() => {
    clearInterval(timer);
    window.removeEventListener('storage', onStorage);
  });
}
