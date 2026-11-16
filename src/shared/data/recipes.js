// Công thức nấu của từng món (mã món theo catalog.js). Trang /q/:code hiện công thức theo món dùng nguyên liệu của lô.
// Mọi món nấu trong khoảng 15 phút: nguyên liệu đã sơ chế, gói xốt đã định lượng, không cần gia vị bếp ngoài muối, đường, dầu ăn sẵn có.

const r = (minutes, steps) => ({ minutes, steps });

export const RECIPES = {
  'D-PRT-001': r(15, [
    'Đun nóng chảo, cho ba rọi vào áp chảo 4 phút đến khi xém nhẹ hai mặt.',
    'Đổ gói Xốt Kho Tàu Củ Sen vào, thêm nửa chén nước, đậy nắp om lửa nhỏ 8 phút.',
    'Mở nắp, rim thêm 2 phút cho xốt sánh, nêm lại theo khẩu vị rồi dọn ra.'
  ]),
  'D-PRT-002': r(12, [
    'Làm nóng chảo thật nóng với một chút dầu. Cho thịt bò vào, áp chảo 1 phút mỗi mặt, không đảo liên tục.',
    'Đổ gói Xốt Tiêu Đen Tây Nguyên vào, đảo nhanh 1 đến 2 phút cho xốt bám đều.',
    'Tắt bếp, dọn ngay khi thịt còn nóng để bò mềm.'
  ]),
  'D-PRT-003': r(15, [
    'Xếp gà lên khay, phết đều gói Xốt Xào Tỏi Gừng, để 3 phút cho thấm.',
    'Nướng bằng nồi chiên không dầu 190 độ C trong 10 phút, hoặc áp chảo 5 phút mỗi mặt.',
    'Để yên 2 phút trước khi cắt miếng cho nước thịt không chảy ra.'
  ]),
  'D-PRT-004': r(15, [
    'Chần sườn với nước sôi 1 phút, vớt ra để ráo.',
    'Cho sườn vào chảo với gói Xốt Kho Tàu Củ Sen và 1 chén nước, đun sôi rồi hạ lửa nhỏ.',
    'Rim 10 phút, trở sườn 2 lần cho xốt sánh và bóng.'
  ]),
  'D-PRT-005': r(15, [
    'Xếp cá vào nồi nhỏ hoặc chảo sâu lòng, rưới gói Xốt Kho Tộ lên trên.',
    'Thêm nửa chén nước, đun sôi rồi hạ lửa nhỏ, đậy nắp 8 phút.',
    'Mở nắp, múc xốt rưới lên cá thêm 2 phút rồi tắt bếp.'
  ]),
  'D-PRT-006': r(10, [
    'Làm nóng chảo, cho tôm vào xào 2 phút đến khi đổi màu hồng.',
    'Cho gói Xốt Xào Tỏi Gừng vào, đảo đều 2 phút cho tôm thấm.',
    'Thêm chút tiêu, tắt bếp. Tôm chín nhanh nên đừng xào quá lâu.'
  ]),
  'D-WST-001': r(12, [
    'Để thịt ra ngoài 5 phút cho bớt lạnh, thấm khô bằng khăn giấy.',
    'Áp chảo lửa lớn 2 phút mỗi mặt, tắt bếp để thịt nghỉ 3 phút.',
    'Hâm gói Xốt Rượu Vang Đỏ trong chảo nhỏ 1 phút, rưới lên thịt.'
  ]),
  'D-WST-002': r(12, [
    'Áp chảo gà 4 phút mỗi mặt đến khi vàng đều và chín tới.',
    'Hạ lửa, đổ gói Xốt Kem Nấm Bơ Tỏi vào chảo, đun nhẹ 2 phút.',
    'Xếp gà ra đĩa, rưới xốt.'
  ]),
  'D-WST-003': r(15, [
    'Phết đều gói Xốt BBQ Khói lên sườn, để 3 phút.',
    'Nướng bằng nồi chiên không dầu 180 độ C trong 12 phút, trở mặt giữa chừng.',
    'Phết thêm xốt còn lại trong 1 phút cuối cho bóng.'
  ]),
  'D-VEG-001': r(7, [
    'Chần bông cải trong nước sôi 1 phút, vớt ra để ráo.',
    'Xào nhanh với gói Xốt Xào Tỏi Gừng 2 phút lửa lớn, dọn ra khi rau còn giòn.'
  ]),
  'D-VEG-002': r(5, [
    'Làm nóng chảo với chút dầu, cho gói Xốt Xào Tỏi Gừng vào phi 20 giây.',
    'Cho cải vào xào lửa lớn 2 phút, nêm lại rồi dọn ngay.'
  ]),
  'D-SUP-001': r(15, [
    'Đun sôi 1 lít nước, cho sườn vào nấu 8 phút.',
    'Cho bí đỏ vào nấu thêm 5 phút đến khi bí mềm.',
    'Nêm vừa ăn rồi tắt bếp.'
  ]),
  'D-SUP-002': r(10, [
    'Đun sôi 800 ml nước, cho gói Xốt Canh Chua Nam Bộ vào khuấy tan.',
    'Cho cà chua vào nấu 4 phút, nêm lại vị chua ngọt.'
  ]),
  'D-SUP-003': r(10, [
    'Đun sôi 800 ml nước, cho thịt bằm vào khuấy tơi, nấu 4 phút.',
    'Cho cải ngọt vào nấu thêm 2 phút, nêm vừa ăn rồi tắt bếp.'
  ]),
  'D-CRB-001': r(20, [
    'Vo gạo nhẹ một lần, cho vào nồi cơm với nước theo tỷ lệ 1 gạo, 1,1 nước.',
    'Bật nồi. Cơm nấu song song với các món khác nên không làm bữa kéo dài.'
  ]),
  'D-CRB-002': r(5, [
    'Ngâm bún trong nước nóng 3 phút cho mềm, vớt ra để ráo.',
    'Dọn kèm món chính.'
  ]),
  'D-CRB-003': r(15, [
    'Rửa sạch khoai, xếp vào nồi chiên không dầu 180 độ C trong 15 phút.',
    'Hoặc hấp 15 phút. Để nguội 2 phút trước khi ăn.'
  ]),
  'D-CRB-004': r(3, [
    'Phết đều bơ tỏi lên bánh mì.',
    'Nướng 2 đến 3 phút đến khi vàng giòn.'
  ]),
  'D-CRB-005': r(8, [
    'Luộc mì trong nước sôi 7 phút, vớt ra để ráo.',
    'Trộn mì với xốt cà nóng, dọn kèm món chính.'
  ]),
  'D-DST-001': r(1, ['Bổ đôi quả bơ, bỏ hạt, múc ra bát. Có thể rưới chút sữa đặc hoặc ăn nguyên vị.']),
  'D-DST-002': r(1, ['Bóc vỏ chuối, ăn tráng miệng sau bữa chính.'])
};

/** Công thức của một món, hoặc null nếu chưa có. */
export const recipeFor = (dishId) => RECIPES[dishId] || null;
