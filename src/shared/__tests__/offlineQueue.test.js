import { describe, it, expect } from 'vitest';
import {
  enqueue, flush, makeEntry, networkError, newOpId, parse, pendingOf, failedOf, removeEntry, retryFailed, serialize, unsentCount
} from '../domain/offlineQueue';

const entry = (id, extra = {}) => makeEntry({ id, call: 'factory.apply', args: { type: 'progress', opId: id }, at: '2026-11-21T03:00:00.000Z', ...extra });

describe('hàng đợi thao tác khi mất mạng', () => {
  it('thêm vào cuối hàng theo thứ tự, mã trùng bị bỏ qua', () => {
    let q = [];
    q = enqueue(q, entry('a'));
    q = enqueue(q, entry('b'));
    q = enqueue(q, entry('a'));
    expect(q.map((i) => i.id)).toEqual(['a', 'b']);
    expect(unsentCount(q)).toBe(2);
    expect(q[0]).toMatchObject({ status: 'pending', tries: 0, error: null });
  });

  it('thiếu id hoặc call thì không tạo được mục', () => {
    expect(() => makeEntry({ call: 'x' })).toThrow();
    expect(() => makeEntry({ id: 'x' })).toThrow();
  });

  it('mã thao tác sinh ra không trùng nhau', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newOpId('t')));
    expect(ids.size).toBe(500);
  });

  it('đang offline thì không gửi gì và giữ nguyên hàng đợi', async () => {
    const q = [entry('a'), entry('b')];
    const sent = [];
    const r = await flush({ items: q, send: (e) => sent.push(e.id), isOnline: () => false });
    expect(r.stopped).toBe('offline');
    expect(sent).toEqual([]);
    expect(r.items).toEqual(q);
  });

  it('có mạng thì gửi đúng thứ tự và xóa các mục đã gửi', async () => {
    const q = [entry('a'), entry('b'), entry('c')];
    const sent = [];
    const changes = [];
    const r = await flush({ items: q, send: (e) => sent.push(e.id), onChange: (items, ev) => changes.push([items.length, ev.result]) });
    expect(sent).toEqual(['a', 'b', 'c']);
    expect(r).toMatchObject({ sent: 3, failed: 0, stopped: null });
    expect(r.items).toEqual([]);
    expect(changes).toEqual([[2, 'sent'], [1, 'sent'], [0, 'sent']]);
  });

  it('mất mạng giữa chừng thì dừng, giữ mục đang gửi và các mục sau để gửi lại', async () => {
    const q = [entry('a'), entry('b'), entry('c')];
    const r = await flush({
      items: q,
      send: (e) => {
        if (e.id === 'b') throw networkError();
      }
    });
    expect(r.stopped).toBe('network');
    expect(r.sent).toBe(1);
    expect(r.items.map((i) => i.id)).toEqual(['b', 'c']);
    expect(r.items[0].tries).toBe(1);
    expect(r.items[0].status).toBe('pending');
    // lần sau có mạng thì gửi nốt
    const r2 = await flush({ items: r.items, send: () => {} });
    expect(r2.items).toEqual([]);
  });

  it('lỗi nghiệp vụ đánh dấu "lỗi" kèm lý do nhưng không chặn các mục sau', async () => {
    const q = [entry('a'), entry('b'), entry('c')];
    const sent = [];
    const r = await flush({
      items: q,
      send: (e) => {
        if (e.id === 'b') throw new Error('Mã lô này đã có');
        sent.push(e.id);
      }
    });
    expect(sent).toEqual(['a', 'c']);
    expect(r).toMatchObject({ sent: 2, failed: 1, stopped: null });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ id: 'b', status: 'failed', error: 'Mã lô này đã có', tries: 1 });
    expect(failedOf(r.items)).toHaveLength(1);
    expect(pendingOf(r.items)).toHaveLength(0);
    // mục lỗi không bị gửi lại cho tới khi quản đốc bấm gửi lại
    const sent2 = [];
    const again = await flush({ items: r.items, send: (e) => sent2.push(e.id) });
    expect(sent2).toEqual([]);
    expect(again.items).toHaveLength(1);
    const retried = retryFailed(r.items);
    expect(retried[0]).toMatchObject({ status: 'pending', error: null });
    expect(removeEntry(retried, 'b')).toEqual([]);
  });

  it('lưu và đọc lại từ chuỗi; dữ liệu hỏng không làm sập', () => {
    const q = [entry('a'), { ...entry('b'), status: 'failed', error: 'x', tries: 2 }];
    const back = parse(serialize(q));
    expect(back).toEqual(q);
    expect(parse('')).toEqual([]);
    expect(parse('không phải json')).toEqual([]);
    expect(parse(JSON.stringify({ items: [{ id: 1 }, null, { id: 'ok', call: 'x' }] })).map((i) => i.id)).toEqual(['ok']);
  });
});
