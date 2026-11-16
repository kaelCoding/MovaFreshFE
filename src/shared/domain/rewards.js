import { BUSINESS } from '../config/business';
import { fmt } from '../utils/formatters';
import { nextId, notify } from './jobs';

/** Mã mời của khách: từ mã khách C-0007 thành MOVA-0007. Mã suy ra được từ mã khách nên không cần tra cứu. */
export const referralCodeFor = (customerId) => `MOVA-${String(customerId).replace(/^C-/, '')}`;

export const customerIdFromReferralCode = (code) => {
  const m = /^MOVA-(\d{3,})$/i.exec(String(code || '').trim());
  return m ? `C-${m[1]}` : null;
};

/** Hồ sơ thành viên đủ chưa: dùng để trả thưởng "hoàn thiện hồ sơ" một lần. */
export function profileCompleteness(customer) {
  const members = customer.members || [];
  const checks = [
    { id: 'name', label: 'Tên người nhận', ok: Boolean((customer.name || '').trim()) },
    { id: 'phone', label: 'Số điện thoại', ok: Boolean((customer.phone || '').trim()) },
    { id: 'email', label: 'Email', ok: Boolean((customer.email || '').trim()) },
    { id: 'address', label: 'Địa chỉ giao hàng', ok: Boolean((customer.address || '').trim()) },
    { id: 'members', label: 'Ít nhất một thành viên và lưu ý ăn uống', ok: members.some((m) => (m.name || '').trim() && (m.note || '').trim()) }
  ];
  const done = checks.filter((c) => c.ok).length;
  return { done, total: checks.length, complete: done === checks.length, missing: checks.filter((c) => !c.ok).map((c) => c.label), checks };
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

/** Số lần chia sẻ đã nhận thưởng trong 7 ngày gần nhất. */
export function sharesInLastWeek(shares, customerId, now) {
  return shares.filter((s) => s.customerId === customerId && now.getTime() - Date.parse(s.at) < WEEK_MS).length;
}

/**
 * Chia sẻ có được thưởng không: mỗi (loại, mã) chỉ một lần, và tối đa maxShareRewardsPerWeek lần mỗi tuần.
 * Trả { ok: true } hoặc { ok: false, code }.
 */
export function canClaimShare(shares, { customerId, kind, ref }, now, cfg = BUSINESS) {
  if (shares.some((s) => s.customerId === customerId && s.kind === kind && s.ref === ref)) return { ok: false, code: 'ALREADY_CLAIMED' };
  if (sharesInLastWeek(shares, customerId, now) >= cfg.incentives.maxShareRewardsPerWeek) return { ok: false, code: 'WEEKLY_LIMIT' };
  return { ok: true };
}

/** "Nguyễn Văn An" thành "Nguyễn V. A." để hiện tên bạn đã mời mà không lộ tên đầy đủ. */
export function maskName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Bạn mới';
  return `${parts[0]} ${parts.slice(1).map((p) => `${p[0]}.`).join(' ')}`;
}

/**
 * Áp mã mời khi một khách mới trả gói đầu tiên: người mời nhận `referrer` (vào ngăn khuyến mãi), khách mới nhận `referee`
 * nhưng không vượt trần ưu đãi chu kỳ đầu (maxFirstCycleDiscountPct). Mỗi khách chỉ được tính mã mời một lần,
 * không tự mời chính mình. Gọi sau khi gói đã kích hoạt.
 */
export function applyReferral(db, now, { referee, code, packageValueVnd, discountSoFarVnd }, cfg = BUSINESS) {
  const referrerId = customerIdFromReferralCode(code);
  const referrer = referrerId && db.customers.find((c) => c.id === referrerId);
  db.referrals = db.referrals || [];
  if (!referrer || referrer.id === referee.id || db.referrals.some((r) => r.refereeId === referee.id)) return { applied: false };
  const nowIso = now.toISOString();
  const rw = cfg.incentives.rewards;
  const headroom = Math.max(0, Math.floor(packageValueVnd * cfg.incentives.maxFirstCycleDiscountPct) - discountSoFarVnd);
  const refereeBonusVnd = Math.min(rw.referee, headroom);

  const grant = (customer, amount, kind) => {
    customer.credit = { ...customer.credit, promo: customer.credit.promo + amount };
    db.ledger.push({ id: nextId(db, 'LED'), customerId: customer.id, kind, amountVnd: amount, real: 0, promo: amount, at: nowIso });
  };
  grant(referrer, rw.referrer, 'reward_referrer');
  if (refereeBonusVnd > 0) grant(referee, refereeBonusVnd, 'reward_referee');
  notify(db, {
    customerId: referrer.id,
    type: 'reward',
    title: 'Bạn của bạn đã đăng ký gói đầu tiên',
    body: `${maskName(referee.name)} vừa trả gói đầu tiên. MOVA cộng ${fmt(rw.referrer)} vào Fresh Credit của bạn.`,
    at: nowIso,
    meta: { kind: 'referral', amountVnd: rw.referrer }
  });
  db.referrals.push({ id: nextId(db, 'REF'), code, referrerId: referrer.id, refereeId: referee.id, referrerRewardVnd: rw.referrer, refereeBonusVnd, at: nowIso });
  return { applied: true, referrerRewardVnd: rw.referrer, refereeBonusVnd };
}
