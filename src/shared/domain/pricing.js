import { BUSINESS } from '../config/business';

const roundTo = (n, step = 1000) => Math.round(n / step) * step;

/**
 * Lịch thẻ quà tặng theo tuần, tính theo quy mô gói.
 * Gói nhỏ không được miễn phí trọn tuần 1: tổng thẻ quà tặng bị chặn ở giftCardMaxPctOfPackage.
 */
export function giftCardSchedule(packageValueVnd, cfg = BUSINESS) {
  const base = cfg.incentives.giftCardWeeklyVnd;
  const baseTotal = base.reduce((a, b) => a + b, 0);
  const maxTotal = Math.floor(packageValueVnd * cfg.incentives.giftCardMaxPctOfPackage);
  const scale = baseTotal > 0 ? Math.min(1, maxTotal / baseTotal) : 0;
  return base.map((v) => roundTo(v * scale));
}

/** Thưởng nạp: bonus = payVnd * bonusPct. */
export function topUpBonus(payVnd, bonusPct) {
  return roundTo(payVnd * bonusPct);
}

/**
 * Tổng ưu đãi chu kỳ đầu = thẻ quà tặng + thưởng nạp, không được vượt maxFirstCycleDiscountPct
 * giá trị gói. Vượt trần thì giảm phần THƯỞNG NẠP trước (thẻ quà tặng là công cụ kéo khách chính).
 */
export function capFirstCycleIncentives({ packageValueVnd, giftCardTotal, topUpBonusVnd }, cfg = BUSINESS) {
  const cap = Math.floor(packageValueVnd * cfg.incentives.maxFirstCycleDiscountPct);
  let gift = Math.min(giftCardTotal, cap);
  let bonus = topUpBonusVnd;
  let capped = false;
  if (gift + bonus > cap) {
    bonus = Math.max(0, cap - gift);
    capped = true;
  }
  return { giftCardTotal: gift, topUpBonusVnd: bonus, totalDiscountVnd: gift + bonus, capVnd: cap, capped };
}

/** Tiền mặt thực phải bỏ ra cho gói 4 tuần, sau ưu đãi. */
export function firstCycleCashPrice(packageValueVnd, incentives) {
  return Math.max(0, packageValueVnd - incentives.totalDiscountVnd);
}
