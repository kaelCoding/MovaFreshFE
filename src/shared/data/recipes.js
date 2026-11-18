// Công thức nấu của từng món (mã món theo catalog.js). Trang /q/:code hiện công thức theo món dùng nguyên liệu của lô.
// Mọi món nấu trong khoảng 15 phút: nguyên liệu đã sơ chế, gói xốt đã định lượng, không cần gia vị bếp ngoài muối, đường, dầu ăn sẵn có.

const r = (minutes, steps) => ({ minutes, steps });

export const RECIPES = {
  'D-PRT-001': r(15, [
    'Bước 1 (3 phút): Làm nóng chảo, cho ba rọi vào áp chảo xém vàng đều hai mặt để săn thớ thịt.',
    'Bước 2 (9 phút): Đổ túi Xốt Kho Tàu Củ Sen cùng nửa chén nước lọc, đậy nắp om lửa liu riu cho ngấm sâu.',
    'Bước 3 (3 phút): Mở nắp, đảo đều tay trên lửa lớn đến khi xốt sánh bóng bám đều từng miếng thịt.'
  ]),
  'D-PRT-002': r(12, [
    'Bước 1 (2 phút): Làm nóng chảo với 1 muỗng dầu ăn đến khi bốc khói nhẹ, cho thịt bò vào áp chảo 1 phút mỗi mặt.',
    'Bước 2 (8 phút): Rưới túi Xốt Tiêu Đen Chư Sê vào chảo, đảo nhanh tay lửa lớn cho xốt quyện tròn quanh khối thịt.',
    'Bước 3 (2 phút): Tắt bếp ngay khi bò vừa chín tới, dọn ra đĩa để giữ trọn vị mềm mọng.'
  ]),
  'D-PRT-003': r(15, [
    'Bước 1 (2 phút): Thấm khô miếng gà, phết 2/3 gói xốt sả mật ong lên đều khắp hai mặt.',
    'Bước 2 (10 phút): Nướng nồi chiên không dầu 190°C (hoặc áp chảo lửa vừa 5 phút mỗi mặt) đến khi vàng ruộm.',
    'Bước 3 (3 phút): Phết phần xốt còn lại, nướng thêm 1 phút cho dậy mùi thơm lừng rồi để nghỉ 2 phút trước khi thưởng thức.'
  ]),
  'D-PRT-004': r(15, [
    'Bước 1 (2 phút): Chần sườn qua nước sôi 1 phút để sạch bọt, vớt ra để ráo nước.',
    'Bước 2 (10 phút): Cho sườn vào chảo cùng gói Xốt Mắm Tỏi và nửa chén nước, đun sôi rồi hạ lửa rim nhỏ.',
    'Bước 3 (3 phút): Đảo đều tay cho nước xốt kẹo lại bao quanh từng dọng sườn vàng cánh gián.'
  ]),
  'D-PRT-005': r(15, [
    'Bước 1 (2 phút): Xếp từng khoanh cá bớp vào nồi hoặc chảo sâu lòng, rưới đều gói Xốt Kho Tộ lên mặt cá.',
    'Bước 2 (10 phút): Thêm 1/2 chén nước ấm, đun sôi bùng rồi hạ lửa nhỏ om liu riu trong 8–10 phút.',
    'Bước 3 (3 phút): Mở nắp, múc nước xốt rưới liên tục lên mình cá cho đến khi nước kho sánh lại thơm nức.'
  ]),
  'D-PRT-006': r(10, [
    'Bước 1 (2 phút): Làm nóng chảo với chút dầu ăn, trút tôm vào xào nhanh 1 phút đến khi chuyển màu hồng cam.',
    'Bước 2 (6 phút): Rưới gói Xốt Rim Cay vào chảo, hạ lửa vừa và đảo đều cho xốt phủ đều khắp thân tôm.',
    'Bước 3 (2 phút): Tắt bếp, rắc nhẹ tiêu đen và dọn ra đĩa khi tôm còn bốc khói nghi ngút.'
  ]),
  'D-WST-001': r(12, [
    'Bước 1 (2 phút): Thấm khô 2 mặt thịt bò bằng giấy bếp, để chảo gang thật nóng với 1 muỗng dầu ô-liu.',
    'Bước 2 (7 phút): Áp chảo thịt 2.5 phút mỗi mặt cho mức Medium-Rare, lấy ra đĩa để thịt nghỉ 3 phút.',
    'Bước 3 (3 phút): Cho gói Xốt Vang Đỏ vào chảo nóng đảo đều 1 phút cho sôi nhẹ rồi rưới lên miếng steak.'
  ]),
  'D-WST-002': r(12, [
    'Bước 1 (2 phút): Thấm khô miếng ức gà, xoa nhẹ chút dầu ăn lên hai mặt.',
    'Bước 2 (8 phút): Áp chảo gà lửa vừa 4 phút mỗi mặt cho chín vàng ươm hai mặt.',
    'Bước 3 (2 phút): Hạ nhỏ lửa, đổ gói Xốt Kem Nấm Bơ Tỏi vào chảo đun lăn tăn 1 phút rồi dọn ra đĩa.'
  ]),
  'D-WST-003': r(15, [
    'Bước 1 (2 phút): Phết đều 2/3 lượng xốt BBQ khói lên cả hai mặt dẻ sườn.',
    'Bước 2 (10 phút): Nướng nồi chiên không dầu 180°C trong 10 phút, trở mặt ở phút thứ 6.',
    'Bước 3 (3 phút): Phết phần xốt còn lại lên mặt thịt, nướng thêm 2 phút ở 200°C cho bề mặt caramen óng ả.'
  ]),
  'D-VEG-001': r(7, [
    'Bước 1 (2 phút): Chần bông cải vào nước sôi 45 giây rồi vớt ra ngâm nước lạnh để giữ màu xanh tươi.',
    'Bước 2 (4 phút): Làm nóng chảo với chút dầu, cho bông cải và gói Xốt Xào Dầu Hào Nấm vào đảo lửa lớn.',
    'Bước 3 (1 phút): Đảo đều trong 60 giây cho xốt áo đều từng nhánh cải rồi tắt bếp dọn ra đĩa.'
  ]),
  'D-VEG-002': r(5, [
    'Bước 1 (1 phút): Phi thơm gói xốt tỏi gừng trên chảo nóng 20 giây cho dậy mùi thơm nức.',
    'Bước 2 (3 phút): Cho phần cọng cải vào xào trước 1 phút, sau đó trút phần lá vào đảo lửa lớn 2 phút.',
    'Bước 3 (1 phút): Tắt bếp khi rau vừa chín tới giữ độ giòn tươi nguyên bản.'
  ]),
  'D-SUP-001': r(15, [
    'Bước 1 (3 phút): Đun sôi 800ml nước, thả sườn non vào hớt bọt cho nước canh trong ngọt.',
    'Bước 2 (9 phút): Thả bí đỏ vào nồi, đậy nắp nấu lửa vừa trong 8 phút đến khi bí chín bở bùi.',
    'Bước 3 (3 phút): Nêm gói gia vị canh vừa miệng, rắc chút hành ngò rồi tắt bếp.'
  ]),
  'D-SUP-002': r(10, [
    'Bước 1 (2 phút): Đảo sơ 1/2 lượng cà chua trên chảo với 1 muỗng dầu để tạo màu nước canh cam đỏ đẹp mắt.',
    'Bước 2 (6 phút): Đổ 800ml nước ấm và gói Xốt Canh Chua vào đun sôi bùng trong 5 phút.',
    'Bước 3 (2 phút): Cho phần cà chua còn lại vào, đun sôi lại 1 phút rồi tắt bếp để giữ độ giòn của cà.'
  ]),
  'D-SUP-003': r(10, [
    'Bước 1 (2 phút): Cho thịt bằm vào nồi cùng 700ml nước, khuấy nhẹ cho tơi thịt rồi bật bếp đun sôi.',
    'Bước 2 (6 phút): Khi nước sôi, hớt nhẹ bọt rồi trút toàn bộ cải ngọt vào nấu sôi lại trong 3 phút.',
    'Bước 3 (2 phút): Nêm vừa khẩu vị, rắc tiêu xay và tắt bếp ngay khi cọng cải vừa trong.'
  ]),
  'D-CRB-001': r(20, [
    'Bước 1 (1 phút): Tráng nhẹ gạo qua một lần nước sạch, không chà xát mạnh.',
    'Bước 2 (18 phút): Cho vào nồi cơm điện với tỷ lệ 1 bát gạo : 1.1 bát nước, bật chế độ nấu cơm tự động.',
    'Bước 3 (1 phút): Khi cơm chín, xới đều hạt cơm tơi xốp và ủ ấm 5 phút trước khi xới ra bát.'
  ]),
  'D-CRB-002': r(5, [
    'Bước 1 (1 phút): Đun sôi 1 lít nước trên bếp.',
    'Bước 2 (3 phút): Thả bún khô vào luộc trong 3–4 phút đến khi sợi bún mềm dẻo.',
    'Bước 3 (1 phút): Vớt bún ra xả nhanh qua nước lạnh, để ráo nước và dọn kèm món kho hoặc canh.'
  ]),
  'D-CRB-003': r(15, [
    'Bước 1 (1 phút): Xếp từng khúc khoai đã cắt vào khay nồi chiên không dầu.',
    'Bước 2 (12 phút): Bật nồi chiên ở nhiệt độ 180°C nướng trong 12 phút.',
    'Bước 3 (2 phút): Trở mặt nướng thêm 3 phút cho mật khoai dẻo quánh vàng ươm.'
  ]),
  'D-CRB-004': r(3, [
    'Bước 1 (1 phút): Phết đều lớp bơ tỏi lên bề mặt bánh mì mini đã xẻ rãnh.',
    'Bước 2 (2 phút): Cho vào nồi chiên không dầu nướng 170°C trong 2 phút.',
    'Bước 3 (1 phút): Lấy bánh ra khi vỏ vừa vàng giòn rụm và mùi bơ tỏi tỏa ngào ngạt.'
  ]),
  'D-CRB-005': r(8, [
    'Bước 1 (2 phút): Đun sôi 1 lít nước với 1/2 muỗng cà phê muối, thả mì Ý vào luộc.',
    'Bước 2 (6 phút): Luộc mì trong 6–7 phút đến độ dai Al Dente, vớt ra để ráo.',
    'Bước 3 (2 phút): Đảo mì nóng với xốt cà chua tươi trên chảo 1 phút cho xốt ngấm sâu vào từng sợi mì.'
  ]),
  'D-DST-002': r(1, [
    'Bước 1 (1 phút): Bóc vỏ nhẹ nhàng từ cuống và thưởng thức vị ngọt thơm tự nhiên sau bữa ăn.'
  ]),
  'D-DST-003': r(1, [
    'Bước 1 (1 phút): Lấy túi vải thiều IQF ra khỏi ngăn đông, cho vào đĩa sạch.',
    'Bước 2 (1 phút): Quay lò vi sóng 60 giây ở mức trung bình (hoặc ngâm đĩa trong nước ấm 3 phút).',
    'Bước 3 (1 phút): Thưởng thức từng quả vải mọng nước mát lạnh, tươi giòn ngọt lịm.'
  ])
};

/** Công thức của một món, hoặc null nếu chưa có. */
export const recipeFor = (dishId) => RECIPES[dishId] || null;
