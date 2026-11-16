import { BUSINESS } from '../config/business';
import { runDueJobs } from '../domain/jobs';
import { defaultStorage } from './storage';
import { buildSeed, DB_VERSION } from './seed';
import { supplementProcurement } from '../data/procurementSeed';

export const STORAGE_KEY = 'mova_shared_db_v1';

/**
 * "Backend giả" chạy trên trình duyệt, dùng chung cho app khách và app vận hành.
 * Dữ liệu nằm trong một khóa localStorage. Mỗi thao tác đọc lại từ storage nên hai tab
 * (hai app cùng origin) luôn thấy cùng dữ liệu.
 *
 * Đồng hồ giả lập: thời gian nghiệp vụ = `clock.simMs` + thời gian thực đã trôi từ `clock.realMs`
 * (nếu `running`). Khi test đặt `running: false` thì thời gian đứng yên.
 */
export function createServer({ storage = defaultStorage(), key = STORAGE_KEY, startAt = null, running = true, cfg = BUSINESS } = {}) {
  const initialNow = () => (startAt ? new Date(startAt) : new Date());

  const simNow = (db) => {
    const c = db.clock;
    return new Date(c.running ? c.simMs + (Date.now() - c.realMs) : c.simMs);
  };

  function load() {
    const raw = storage.getItem(key);
    if (!raw) return null;
    try {
      const db = JSON.parse(raw);
      return db.version === DB_VERSION ? db : null;
    } catch {
      return null;
    }
  }

  const persist = (db) => storage.setItem(key, JSON.stringify(db));

  function ensure() {
    let db = load();
    if (!db) {
      db = buildSeed(initialNow(), { running, cfg });
      persist(db);
    } else if (!db.procurement || !db.procurement.suppliers || !Object.keys(db.procurement.suppliers).length) {
      // Bộ nhớ demo cũ (trước P2B) chưa có dữ liệu mua hàng / kho phụ: bù hạt giống mà không đổi DB_VERSION
      supplementProcurement(db, simNow(db), cfg);
      persist(db);
    }
    return db;
  }

  return {
    cfg,
    /** Đọc: fn(db, now). Không ghi lại. */
    read(fn) {
      const db = ensure();
      return fn(db, simNow(db));
    },
    /**
     * Ghi: fn(db, now), sau đó lưu. Hai tab cùng máy (ví dụ bảng demo và màn xưởng) dùng chung một khóa localStorage
     * nên trước khi lưu kiểm tra khóa chưa bị tab khác ghi đè; nếu đã đổi thì đọc lại và chạy lại fn (tối đa vài lần).
     */
    write(fn) {
      let result;
      for (let attempt = 0; attempt < 4; attempt++) {
        ensure();
        const raw = storage.getItem(key);
        const db = JSON.parse(raw);
        result = fn(db, simNow(db));
        if (storage.getItem(key) === raw || attempt === 3) {
          persist(db);
          return result;
        }
      }
      return result;
    },
    now() {
      return this.read((db, now) => now);
    },
    /** Chạy các job đã tới hạn tại thời điểm hiện tại. */
    tick() {
      return this.write((db, now) => runDueJobs(db, now, cfg));
    },
    /** Đặt đồng hồ giả lập. Chỉ đi tới, không lùi (muốn lùi thì reset). Chạy job sau khi đặt. */
    setNow(date) {
      return this.write((db) => {
        const target = new Date(date);
        if (Number.isNaN(target.getTime())) throw new Error('Thời điểm không hợp lệ');
        if (target.getTime() < simNow(db).getTime()) throw new Error('Đồng hồ giả lập chỉ đi tới. Muốn quay lại hãy reset dữ liệu.');
        db.clock = { simMs: target.getTime(), realMs: Date.now(), running: db.clock.running };
        return runDueJobs(db, target, cfg);
      });
    },
    reset() {
      persist(buildSeed(initialNow(), { running, cfg }));
    }
  };
}

let singleton = null;
/** Server dùng chung của trang hiện tại (localStorage). */
export function getServer() {
  if (!singleton) singleton = createServer();
  return singleton;
}
