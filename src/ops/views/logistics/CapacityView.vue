<template>
  <section>
    <h1>Khu giao &amp; sức chứa</h1>
    <p class="ops-muted proc-note">
      Mỗi khu có ngày giao cố định, khung giờ và sức chứa (thùng) mỗi khung. App khách chỉ hiện khung còn chỗ. Đổi sức chứa ở đây (lưu trong dữ liệu dùng chung, có số mặc định ở cấu hình)
      thì app khách đổi theo ngay. Hạ sức chứa thấp hơn số đã đặt thì đơn đã đặt vẫn phải giao, khách mới không đặt thêm được.
    </p>
    <p v-if="error" class="ops-error" role="alert" data-testid="cap-error">{{ error }}</p>
    <p v-if="ok" class="ops-ok" role="status" data-testid="cap-ok">{{ ok }}</p>

    <div v-if="board && board.overbookedTotal" class="alert-bad" role="alert" data-testid="cap-overbooked">
      <strong>Có {{ board.overbookedTotal }} thùng đã đặt vượt sức chứa mới.</strong> Các đơn này vẫn giao; hãy bố trí thêm xe / shipper cho khung đó hoặc nâng sức chứa lại.
    </div>

    <section v-if="board && board.suggestions.length" class="ops-card" aria-label="Gợi ý gộp ngày" data-testid="merge-suggestions">
      <h2 class="plan-h2">Gợi ý gộp ngày cho khu ít đơn</h2>
      <p class="ops-muted">Khu có ngày giao lấp đầy dưới {{ Math.round(board.belowPct * 100) }}% và toàn bộ đơn của ngày đó chuyển được sang ngày giao cùng tuần mà không vượt sức chứa. Gộp lại để mỗi tuyến chở được nhiều thùng hơn.</p>
      <ul class="history">
        <li v-for="s in board.suggestions" :key="s.zoneId + s.fromDay">
          <strong>{{ s.zoneName }}</strong>: gộp {{ fmtDay(s.fromDay) }} ({{ s.moveBoxes }} thùng) sang {{ fmtDay(s.toDay) }}.
          Mật độ từ {{ dec(s.beforePerDay) }} lên {{ s.afterPerDay }} thùng / ngày giao.
        </li>
      </ul>
    </section>

    <section v-for="z in board ? board.zones : []" :key="z.zoneId" class="ops-card" :data-zone="z.zoneId">
      <div class="head-row">
        <h2 class="plan-h2">{{ z.name }} <small class="ops-muted">{{ z.zoneId }}{{ z.province ? ' · ' + z.province : '' }}</small></h2>
        <span class="ops-muted">Ngày giao: {{ z.deliveryDays.map((d) => DOW[d]).join(', ') }}</span>
      </div>
      <div class="ops-table-wrap">
        <table class="ops-table cap-table">
          <thead>
            <tr>
              <th>Ngày giao</th>
              <th v-for="s in z.days[0].slots" :key="s.slotId">{{ s.label }}<small>đã đặt / sức chứa (thùng)</small></th>
              <th class="r">Cả ngày</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in z.days" :key="d.day" :data-day="d.day">
              <td><strong>{{ fmtDay(d.day) }}</strong></td>
              <td v-for="s in d.slots" :key="s.slotId" class="cap-cell" :class="{ over: s.overbooked, full: !s.overbooked && s.remaining === 0 }" :data-cell="`${z.zoneId}|${d.day}|${s.slotId}`">
                <template v-if="isEditing(z, d, s)">
                  <form class="cap-edit" @submit.prevent="save(z, d, s)">
                    <label :for="`cap-${z.zoneId}-${d.day}-${s.slotId}`" class="ops-muted">Sức chứa mới (thùng)</label>
                    <input :id="`cap-${z.zoneId}-${d.day}-${s.slotId}`" v-model.number="val" class="ops-input ops-input-sm" type="number" min="0" max="500" inputmode="numeric" data-testid="cap-input" />
                    <label class="check-row"><input v-model="allDays" type="checkbox" data-testid="cap-all" /> <span>Áp cho mọi ngày giao của khung này</span></label>
                    <p v-if="confirmBelow" class="ops-error" data-testid="cap-confirm">{{ confirmBelow }}</p>
                    <div class="btn-row">
                      <button class="ops-btn ops-btn-primary ops-btn-small" type="submit" data-testid="cap-save">{{ confirmBelow ? 'Vẫn hạ' : 'Lưu' }}</button>
                      <button v-if="s.overridden" class="ops-btn ops-btn-small" type="button" data-testid="cap-reset" @click="reset(z, d, s)">Về mặc định ({{ s.configCapacity }})</button>
                      <button class="ops-btn ops-btn-small" type="button" @click="cancel">Hủy</button>
                    </div>
                  </form>
                </template>
                <template v-else>
                  <div class="cap-n"><strong>{{ s.used }}</strong> / {{ s.capacity }} <span v-if="s.overridden" class="ops-pill ops-pill-warn" title="Đã đổi so với cấu hình">đã chỉnh</span></div>
                  <div class="ops-bar-track"><div class="ops-bar-fill" :class="{ 'bar-bad': s.overbooked }" :style="{ width: Math.round(s.fillPct * 100) + '%' }"></div></div>
                  <small v-if="s.overbooked" class="ops-error">Vượt {{ s.overbooked }} thùng</small>
                  <small v-else-if="s.remaining === 0" class="ops-muted">Hết chỗ (khách không thấy khung này)</small>
                  <small v-else class="ops-muted">Còn {{ s.remaining }}</small>
                  <button class="ops-btn ops-btn-small cap-btn" type="button" data-testid="cap-edit" @click="edit(z, d, s)">Sửa</button>
                </template>
              </td>
              <td class="r"><strong>{{ d.used }}</strong> / {{ d.capacity }}<small>{{ Math.round(d.fillPct * 100) }}% lấp đầy</small></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../../../shared/api';
import { fmtDay } from '../../../shared/utils/time';
import { ctx } from '../../session';
import { useLive } from '../../useLive';
import { dec } from '../../logisticsUi';

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const board = ref(null);
const error = ref('');
const ok = ref('');
const editKey = ref('');
const val = ref(0);
const allDays = ref(false);
const confirmBelow = ref('');

const key = (z, d, s) => `${z.zoneId}|${d.day}|${s.slotId}`;
const isEditing = (z, d, s) => editKey.value === key(z, d, s);

function load() {
  try {
    board.value = api.ops.logistics.capacityBoard(ctx.value);
  } catch (e) {
    error.value = e.message;
  }
}
useLive(() => {
  if (!editKey.value) load();
});

function edit(z, d, s) {
  editKey.value = key(z, d, s);
  val.value = s.capacity;
  allDays.value = false;
  confirmBelow.value = '';
  error.value = '';
  ok.value = '';
}
function cancel() {
  editKey.value = '';
  confirmBelow.value = '';
}

function save(z, d, s) {
  error.value = '';
  try {
    const r = api.ops.logistics.setCapacity(ctx.value, { zoneId: z.zoneId, day: allDays.value ? '*' : d.day, slotId: s.slotId, capacityBoxes: Number(val.value), allowBelowUsed: Boolean(confirmBelow.value) });
    ok.value = `Đã đặt sức chứa ${r.capacityBoxes} thùng cho ${s.label}${allDays.value ? ' (mọi ngày giao)' : ' ngày ' + fmtDay(d.day)}.${r.overbooked ? ` Cảnh báo: đã đặt vượt ${r.overbooked} thùng, các đơn này vẫn giao.` : ''}`;
    editKey.value = '';
    confirmBelow.value = '';
  } catch (e) {
    if (e.code === 'CAPACITY_BELOW_USED') confirmBelow.value = e.message;
    else error.value = e.message;
  }
  load();
}

function reset(z, d, s) {
  try {
    api.ops.logistics.setCapacity(ctx.value, { zoneId: z.zoneId, day: allDays.value ? '*' : d.day, slotId: s.slotId, capacityBoxes: null });
    ok.value = `Đã bỏ chỉnh sửa, ${s.label} về sức chứa mặc định ${s.configCapacity} thùng.`;
    editKey.value = '';
  } catch (e) {
    error.value = e.message;
  }
  load();
}
</script>
