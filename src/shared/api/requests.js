import { BUSINESS } from '../config/business';

/** Mã lỗi của một phản hồi lỗi từ API. */
export const errorKind = (res) => (res && res.error ? res.error.code : null);

/** Gắn thẻ quà tặng của chiến dịch vào yêu cầu đăng ký / xem trước gói. */
export const withGiftCard = (req, cfg = BUSINESS) => ({ ...req, voucher_code: cfg.incentives.giftCardCode });
