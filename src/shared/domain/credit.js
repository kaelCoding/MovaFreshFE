// Fresh Credit có HAI NGĂN: tiền thật (khách đã nạp) và khuyến mãi (thưởng nạp, thưởng giới thiệu...).
// Đây không phải ví điện tử: khách không rút được, không chuyển cho người khác.

export const emptyBalance = () => ({ real: 0, promo: 0 });

export const totalBalance = (b) => (b.real || 0) + (b.promo || 0);

/**
 * Trừ `amount` theo thứ tự ngăn (mặc định tiền thật trước).
 * Không đủ số dư thì không trừ gì cả.
 */
export function spendCredit(balance, amount, spendOrder = ['real', 'promo']) {
  if (amount < 0) throw new Error('Số tiền trừ phải >= 0');
  if (totalBalance(balance) < amount) {
    return { ok: false, used: { real: 0, promo: 0 }, balance: { ...balance } };
  }
  const next = { ...balance };
  const used = { real: 0, promo: 0 };
  let left = amount;
  for (const bucket of spendOrder) {
    const take = Math.min(next[bucket] || 0, left);
    next[bucket] -= take;
    used[bucket] += take;
    left -= take;
  }
  return { ok: true, used, balance: next };
}

/** Nạp tiền: phần tiền thật vào ngăn real, phần thưởng vào ngăn promo. */
export function topUp(balance, payVnd, bonusVnd) {
  return { real: balance.real + payVnd, promo: balance.promo + bonusVnd };
}

/** Hoàn lại: chỉ hoàn phần tiền thật chưa dùng. Khuyến mãi bị thu hồi. */
export function refundOnCancel(balance) {
  return { refundVnd: balance.real, forfeitedPromoVnd: balance.promo, balance: emptyBalance() };
}

/**
 * Hoàn lại một khoản đã trừ: trả ngược về các ngăn đã trừ, theo thứ tự ngược của thứ tự trừ
 * (đã trừ tiền thật trước thì hoàn khuyến mãi trước). Phần không rõ nguồn vào ngăn tiền thật.
 * `used` = { real, promo } là phần đơn đã trừ từ mỗi ngăn.
 */
export function creditBack(balance, amount, used = null, spendOrder = ['real', 'promo']) {
  if (amount < 0) throw new Error('Số tiền hoàn phải >= 0');
  const next = { ...balance };
  const back = { real: 0, promo: 0 };
  let left = amount;
  if (used) {
    for (const bucket of [...spendOrder].reverse()) {
      const give = Math.min(used[bucket] || 0, left);
      next[bucket] += give;
      back[bucket] += give;
      left -= give;
    }
  }
  if (left > 0) {
    next.real += left;
    back.real += left;
  }
  return { balance: next, back };
}
