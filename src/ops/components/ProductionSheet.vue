<template>
  <article class="sheet" data-testid="production-sheet">
    <header class="sheet-head">
      <div>
        <p class="sheet-kicker">PHIẾU YÊU CẦU SẢN XUẤT · XƯỞNG ĐẮK LẮK</p>
        <h2 class="sheet-title">{{ sheet.code }}</h2>
      </div>
      <dl class="sheet-meta">
        <div><dt>Ngày giao</dt><dd>{{ fmtDay(sheet.day) }}</dd></div>
        <div><dt>Số thùng</dt><dd>{{ sheet.boxes }}</dd></div>
        <div v-if="sheet.status === 'closed'"><dt>Chốt sổ lúc</dt><dd>{{ fmtDeadline(new Date(sheet.closedAt)) }}</dd></div>
        <div v-else><dt>Tình trạng</dt><dd>Bản nháp dự kiến, chưa chốt sổ</dd></div>
        <div v-if="sheet.status === 'closed'"><dt>Tạm hoãn (chưa trả tiền)</dt><dd>{{ sheet.skippedUnpaid }} đơn, không sản xuất</dd></div>
      </dl>
    </header>

    <h3 class="sheet-h">Bảng 1. Nguyên liệu thô sơ chế tại Đắk Lắk</h3>
    <table class="sheet-table">
      <thead>
        <tr><th>Mã NL</th><th>Tên nguyên liệu</th><th>Quy cách sơ chế</th><th class="r">Đơn vị</th><th class="r">Tổng sản lượng</th><th>Ghi chú đóng gói</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in sheet.table1" :key="r.code">
          <td class="mono">{{ r.code }}</td><td>{{ r.name }}</td><td>{{ r.prep }}</td><td class="r">{{ r.unit }}</td>
          <td class="r"><strong>{{ kg(r.qtyKg) }}</strong></td>
          <td>{{ r.packNote }} <span class="sheet-dot" :class="dotClass(r.temp)" aria-hidden="true"></span></td>
        </tr>
        <tr v-if="!sheet.table1.length"><td colspan="6" class="ops-muted">Chưa có nguyên liệu.</td></tr>
      </tbody>
    </table>

    <h3 class="sheet-h">Bảng 2. Gói xốt tiêu chuẩn (sauce pouches)</h3>
    <table class="sheet-table">
      <thead>
        <tr><th>Mã xốt</th><th>Tên gói xốt</th><th class="r">Định lượng mỗi túi</th><th class="r">Số túi cần sản xuất</th><th>Hạn dùng</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in sheet.table2" :key="r.code">
          <td class="mono">{{ r.code }}</td><td>{{ r.name }}</td><td class="r">{{ r.grams }}g</td><td class="r"><strong>{{ r.bags }} túi</strong></td><td>{{ r.shelf }}</td>
        </tr>
        <tr v-if="!sheet.table2.length"><td colspan="5" class="ops-muted">Không có gói xốt.</td></tr>
      </tbody>
    </table>

    <h3 class="sheet-h">Bảng 3. Nguyên liệu hải sản kho phụ TP.HCM</h3>
    <table class="sheet-table">
      <thead>
        <tr><th>Mã NL</th><th>Tên hải sản</th><th>Quy cách</th><th class="r">Đơn vị</th><th class="r">Số lượng</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in sheet.table3" :key="r.code">
          <td class="mono">{{ r.code }}</td><td>{{ r.name }}</td><td>{{ r.spec }}</td><td class="r">{{ r.unit }}</td><td class="r"><strong>{{ kg(r.qtyKg) }}</strong></td>
        </tr>
        <tr v-if="!sheet.table3.length"><td colspan="5" class="ops-muted">Không có hải sản.</td></tr>
      </tbody>
    </table>
    <p class="sheet-foot">Chấm màu cạnh ghi chú đóng gói là màu sticker: xanh lá = ngăn mát, xanh dương = ngăn đông, xám = nhiệt độ thường (không dán sticker).</p>
  </article>
</template>

<script setup>
import { fmtDay, fmtDeadline } from '../../shared/utils/time';
import { BUSINESS } from '../../shared/config/business';
import { kg } from '../format';

defineProps({ sheet: { type: Object, required: true } });

const dotClass = (temp) => `dot-${(BUSINESS.stickers[temp] && BUSINESS.stickers[temp].color) || 'none'}`;
</script>
