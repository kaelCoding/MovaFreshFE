import { BUSINESS } from '../config/business';
import { capFirstCycleIncentives, giftCardSchedule, topUpBonus } from './pricing';

const roundTo = (n, step = 1000) => Math.round(n / step) * step;
const sum = (a) => a.reduce((x, y) => x + y, 0);

/** Thưởng nạp thường xuyên (gói đầu tiên trong cấu hình), dùng làm mức mặc định cho phễu. */
export const regularBonusPct = (cfg = BUSINESS) => cfg.incentives.topUpPacks[0].bonusPct;

/**
 * Ưu đãi Fresh Credit của một lần nạp `payVnd` cho gói 4 tuần.
 * Thưởng nạp thô = payVnd * bonusPct; cộng thẻ quà tặng mà vượt trần maxFirstCycleDiscountPct
 * thì giảm thưởng nạp (capFirstCycleIncentives). Thẻ quà tặng giữ nguyên.
 */
export function freshCreditOffer({ packageValueVnd, giftTotalVnd, payVnd, bonusPct = regularBonusPct() }, cfg = BUSINESS) {
  const raw = topUpBonus(payVnd, bonusPct);
  const r = capFirstCycleIncentives({ packageValueVnd, giftCardTotal: giftTotalVnd, topUpBonusVnd: raw }, cfg);
  return {
    payVnd,
    bonusVnd: r.topUpBonusVnd,
    bonusUncappedVnd: raw,
    creditReceivedVnd: payVnd + r.topUpBonusVnd,
    capped: r.capped,
    capVnd: r.capVnd,
    firstCycleDiscountVnd: r.totalDiscountVnd
  };
}

/**
 * Lần nạp VỪA ĐỦ để trả cả gói 4 tuần sau thẻ quà tặng: nhận đúng (giá trị gói - thẻ quà tặng) Fresh Credit,
 * trả = nhận - thưởng nạp (thưởng nạp bị chặn bởi trần ưu đãi chu kỳ đầu).
 */
export function exactFreshCreditOffer({ packageValueVnd, giftTotalVnd, bonusPct = regularBonusPct() }, cfg = BUSINESS) {
  const need = Math.max(0, packageValueVnd - giftTotalVnd);
  const rawBonus = roundTo((need * bonusPct) / (1 + bonusPct));
  const capped = capFirstCycleIncentives({ packageValueVnd, giftCardTotal: giftTotalVnd, topUpBonusVnd: rawBonus }, cfg);
  const bonus = capped.topUpBonusVnd;
  return {
    payVnd: need - bonus,
    bonusVnd: bonus,
    bonusUncappedVnd: rawBonus,
    creditReceivedVnd: need,
    capped: capped.capped,
    capVnd: capped.capVnd,
    firstCycleDiscountVnd: capped.totalDiscountVnd
  };
}

/**
 * Báo giá gói theo tuần. weekValueVnd là giá trị thực đơn một tuần (giá niêm yết, đã khóa cho cả chu kỳ).
 * Mọi con số lấy từ business.js. Không có giá "so với siêu thị": giá trị là phần khách nhận.
 */
export function quotePackage({ weekValueVnd, mealsPerWeek, weeks = BUSINESS.subscription.defaultWeeks, bonusPct = regularBonusPct() }, cfg = BUSINESS) {
  const packageValueVnd = weekValueVnd * weeks;
  const gift = giftCardSchedule(packageValueVnd, cfg).slice(0, weeks);
  while (gift.length < weeks) gift.push(0);
  const giftTotalVnd = sum(gift);
  const totalMeals = mealsPerWeek * weeks;
  const weekly = gift.map((g, i) => ({
    weekIndex: i,
    listVnd: weekValueVnd,
    giftVnd: Math.min(g, weekValueVnd),
    payVnd: weekValueVnd - Math.min(g, weekValueVnd)
  }));
  const exact = exactFreshCreditOffer({ packageValueVnd, giftTotalVnd, bonusPct }, cfg);
  return {
    weeks,
    packageValueVnd,
    weekValueVnd,
    giftSchedule: gift,
    giftTotalVnd,
    weekly,
    week1PayVnd: weekly[0].payVnd,
    payAllUpfrontVnd: packageValueVnd - giftTotalVnd, // chuyển khoản một lần
    perMealListVnd: totalMeals ? roundTo(packageValueVnd / totalMeals) : 0,
    perMealPayVnd: totalMeals ? roundTo((packageValueVnd - giftTotalVnd) / totalMeals) : 0,
    freshCredit: exact,
    // Tổng ưu đãi nhận được khi nạp Fresh Credit ở chu kỳ đầu (thẻ quà tặng + thưởng nạp), không vượt trần
    bestPayVnd: exact.payVnd,
    firstCycleDiscountPct: packageValueVnd ? (giftTotalVnd + exact.bonusVnd) / packageValueVnd : 0
  };
}

/** Các gói nạp lớn hơn (cấu hình topUpPacks) để khách nạp dư cho chu kỳ sau. */
export function largerFreshCreditPacks({ packageValueVnd, giftTotalVnd, minPayVnd }, cfg = BUSINESS) {
  return cfg.incentives.topUpPacks
    .filter((p) => p.payVnd > minPayVnd)
    .map((p) => ({ id: p.id, label: p.label, ...freshCreditOffer({ packageValueVnd, giftTotalVnd, payVnd: p.payVnd, bonusPct: p.bonusPct }, cfg) }));
}
