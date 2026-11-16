import { BUSINESS } from '../config/business';
import { DISHES, SKUS, SAUCES } from '../data/catalog';
import { recipeFor } from '../data/recipes';

/** Kiểm tra một lô do xưởng ghi. Trả danh sách lỗi (rỗng là hợp lệ). */
export function validateLot(lot) {
  const errors = [];
  if (!lot || typeof lot !== 'object') return ['Thiếu dữ liệu lô'];
  if (!/^MOVA-TRACE-[A-Z0-9-]{4,}$/.test(String(lot.qr_code || ''))) errors.push('Mã QR phải có dạng MOVA-TRACE-...');
  if (!String(lot.product_name || '').trim()) errors.push('Thiếu tên sản phẩm');
  if (!lot.sku || !SKUS[lot.sku]) errors.push('Mã nguyên liệu (sku) không có trong danh mục');
  if (!lot.farm_info || !String(lot.farm_info.farm_name || '').trim()) errors.push('Thiếu tên HTX / trang trại');
  if (!lot.farm_info || !String(lot.farm_info.location || '').trim()) errors.push('Thiếu địa điểm');
  if (!lot.slaughter_and_packing_timestamp && !lot.processed_timestamp) errors.push('Thiếu thời điểm sơ chế');
  return errors;
}

/** Các món dùng nguyên liệu của lô: ưu tiên danh sách xưởng ghi, nếu không thì món có nguyên liệu chính là sku đó. */
export function dishesForLot(lot) {
  if (Array.isArray(lot.dish_ids) && lot.dish_ids.length) return lot.dish_ids.filter((id) => DISHES[id]);
  return Object.values(DISHES)
    .filter((d) => d.bom[0] && d.bom[0].sku === lot.sku)
    .map((d) => d.id);
}

/** Nhật ký nhiệt có nằm trong ngưỡng chuỗi lạnh không (chỉ với nguyên liệu cần mát). */
export function temperatureSummary(lot, cfg = BUSINESS) {
  const readings = lot.temperature_readings || [];
  const sku = SKUS[lot.sku];
  const needsCold = sku && sku.temp === 'chill';
  if (!readings.length) return { readings: [], needs_cold_chain: Boolean(needsCold), min: null, max: null, within_limit: null, limit: needsCold ? cfg.temperature.chill : null };
  const temps = readings.map((r) => r.celsius);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const limit = needsCold ? cfg.temperature.chill : null;
  return {
    readings,
    needs_cold_chain: Boolean(needsCold),
    min,
    max,
    within_limit: limit ? min >= limit.min && max <= limit.max : null,
    limit
  };
}

/**
 * Dữ liệu trang truy xuất cho khách quét QR (không cần đăng nhập). Chỉ giữ thứ khách cần thấy:
 * không có tên cán bộ, không có tọa độ trang trại.
 */
export function lotView(lot, cfg = BUSINESS) {
  const recipes = dishesForLot(lot).map((id) => {
    const d = DISHES[id];
    const rec = recipeFor(id);
    return {
      dish_id: id,
      name: d.name,
      sauce_name: d.sauce ? SAUCES[d.sauce].name : null,
      minutes: rec ? rec.minutes : d.prepMinutes,
      steps: rec ? rec.steps : []
    };
  });
  const v = lot.verifications || {};
  return {
    qr_code: lot.qr_code,
    product_name: lot.product_name,
    sample: Boolean(lot.sample),
    kind: lot.kind || null,
    farm: {
      name: lot.farm_info.farm_name,
      location: lot.farm_info.location,
      region: lot.farm_info.region || lot.farm_info.location
    },
    trust_score: lot.trust_score ?? null,
    harvest_or_slaughter_at: lot.harvest_or_slaughter_timestamp || null,
    processed_at: lot.processed_timestamp || lot.slaughter_and_packing_timestamp || null,
    inspector: { verified: Boolean(v.mova_inspector && v.mova_inspector.verified), antibiotic_test: v.mova_inspector ? v.mova_inspector.antibiotic_test : null },
    peer_validations_count: v.peer_validations_count || 0,
    last_peer_check: v.last_peer_check || null,
    temperature: { log: lot.temperature_log || '', ...temperatureSummary(lot, cfg) },
    recipes
  };
}
