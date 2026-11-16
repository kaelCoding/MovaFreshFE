<template>
  <div>
    <div class="prof-grid">
      <!-- Sổ địa chỉ -->
      <div class="prof-sec">
        <div class="sec-head">
          <h3>Sổ địa chỉ nhận hàng TP.HCM</h3>
          <button class="btn sm" @click="store.openModal('address')">+ Thêm địa chỉ</button>
        </div>
        <div
          v-for="a in store.user.addresses"
          :key="a.id"
          class="addr-card"
          :class="{ default: a.isDefault }"
        >
          <div>
            <div style="display: flex; align-items: center; gap: 6px">
              <b>{{ a.label }}</b>
              <span v-if="a.isDefault" class="tag">Mặc định</span>
            </div>
            <p>{{ a.detail }}, {{ a.district }}</p>
            <small class="muted">{{ a.name }} • {{ a.phone }}</small>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px">
            <button
              v-if="!a.isDefault"
              class="btn sm ghost"
              @click="store.setDefaultAddress(a.id)"
            >
              Đặt mặc định
            </button>
            <button
              class="btn sm ghost"
              style="color: var(--red)"
              @click="store.deleteAddress(a.id)"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>

      <!-- Khẩu vị mặc định gia đình -->
      <div class="prof-sec">
        <h3>Khẩu vị & Quy cách mặc định</h3>
        <p class="muted" style="font-size: 13px; margin-bottom: 12px">
          Cài đặt tại đây sẽ tự động đồng bộ sang bộ lọc thực đơn ngoài Cửa hàng.
        </p>

        <div style="display: grid; gap: 10px">
          <div>
            <label class="blabel">Số người ăn mặc định:</label>
            <div class="people" style="margin-top: 4px">
              <button
                v-for="p in peopleOptions"
                :key="p.n"
                class="chip"
                :class="{ active: localPref.ppl === p.n }"
                @click="localPref.ppl = p.n"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="blabel">Thói quen đóng gói mặc định:</label>
            <label class="tog" style="margin-top: 4px">
              <input type="checkbox" v-model="localPref.sauce" />
              <span>Mặc định: Tách riêng gói sốt gia vị</span>
            </label>
            <label class="tog">
              <input type="checkbox" v-model="localPref.carb" />
              <span>Mặc định: Giảm 50% lượng tinh bột</span>
            </label>
          </div>

          <div>
            <label class="blabel">Loại trừ nguyên liệu dị ứng / ăn kiêng:</label>
            <div class="filters" style="margin: 4px 0 0">
              <button
                v-for="f in filterOptions"
                :key="f.key"
                class="chip"
                :class="{ no: f.key !== 'lowOil', active: localPref.f.includes(f.key) }"
                @click="togglePrefFilter(f.key)"
              >
                {{ f.label }}
              </button>
            </div>
          </div>

          <div style="margin-top: 8px">
            <button class="btn primary sm" @click="savePreferences">
              Lưu cài đặt khẩu vị
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Kết nối Zalo OA -->
    <div class="prof-sec" style="margin-top: 20px">
      <div class="zalo-top">
        <div>
          <h3>Kết nối Zalo Official Account (Zalo OA)</h3>
          <p class="muted" style="font-size: 13.5px">
            Nhận thông báo lịch chốt sổ, cập nhật hành trình xe lạnh và báo cáo chất lượng 1 chạm qua Zalo.
          </p>
        </div>
        <label class="tog" style="margin: 0; border: none; background: var(--bg)">
          <input type="checkbox" v-model="store.user.zaloRemind" />
          <span>Bật nhắc lịch chốt đơn trước 3 giờ</span>
        </label>
      </div>

      <div class="zalo-mock">
        <div class="zalo-hdr">
          <div class="zalo-logo">Z</div>
          <b>MOVA FRESH Official Account</b>
          <span class="muted" style="font-size: 11.5px; margin-left: auto">Vừa xong</span>
        </div>
        <div class="zalo-bubble">
          <b>🔔 {{ store.user.name }} ơi, chuẩn bị chốt sổ đợt giao Chủ Nhật nhé!</b>
          <p style="margin-top: 6px">
            Chuyến xe lạnh Đắk Lắk – Sài Gòn sẽ chốt danh sách sơ chế lúc <b>20:00 tối nay</b>. Số dư Gói Đi Chợ của chị hiện còn <b>{{ fmt(store.user.prepaidBalance) }}</b>.
          </p>
          <div class="zalo-acts">
            <!-- Mở phễu thiết kế thực đơn -->
            <button
              class="btn sm primary"
              style="font-size: 12px; padding: 5px 10px"
              @click="confirmMenuFromZalo"
            >
              Xác nhận thực đơn tuần này
            </button>
            <button
              class="btn sm"
              style="font-size: 12px; padding: 5px 10px"
              @click="handleDelayFromZalo"
            >
              Hoãn sang Thứ Tư
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Nút đặt lại dữ liệu demo -->
    <div class="reset-box">
      <div>
        <b>Trình diễn & Kiểm thử hệ thống</b>
        <p class="muted" style="font-size: 13px">
          Làm mới toàn bộ dữ liệu demo về trạng thái ban đầu để trình chiếu lại từ đầu.
        </p>
      </div>
      <button class="btn sm reset-btn" @click="handleResetDemo">
        Đặt lại dữ liệu Demo
      </button>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMovaStore } from '../../stores/useMovaStore';
import { fmt } from '../../shared/utils/formatters';

const store = useMovaStore();
const router = useRouter();

const peopleOptions = [
  { n: 1, label: '1 người' },
  { n: 2, label: '2 vợ chồng' },
  { n: 4, label: 'Gia đình 4 người' }
];

const filterOptions = [
  { key: 'noBo', label: 'Không Bò' },
  { key: 'noHeo', label: 'Không Heo' },
  { key: 'noCay', label: 'Không Cay' },
  { key: 'lowOil', label: 'Ít dầu mỡ' }
];

const localPref = reactive({
  ppl: store.user.pref.ppl || 4,
  sauce: store.user.pref.sauce || false,
  carb: store.user.pref.carb || false,
  f: [...(store.user.pref.f || [])]
});

watch(
  () => store.user.pref,
  (newPref) => {
    localPref.ppl = newPref.ppl;
    localPref.sauce = newPref.sauce;
    localPref.carb = newPref.carb;
    localPref.f = [...newPref.f];
  },
  { deep: true }
);

const togglePrefFilter = (key) => {
  const idx = localPref.f.indexOf(key);
  if (idx >= 0) localPref.f.splice(idx, 1);
  else localPref.f.push(key);
};

const savePreferences = () => {
  store.savePreferences({
    ppl: localPref.ppl,
    sauce: localPref.sauce,
    carb: localPref.carb,
    f: [...localPref.f]
  });
};

const confirmMenuFromZalo = async () => {
  await router.push('/plans');
};

const handleDelayFromZalo = () => {
  store.toast('Zalo OA: Đã chuyển lịch nhận sang Thứ Tư tuần sau.');
};

const handleResetDemo = () => {
  if (confirm('Đặt lại toàn bộ dữ liệu demo về trạng thái ban đầu?')) {
    store.resetDemoData();
    router.push('/');
  }
};
</script>

<style scoped>
.prof-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.prof-sec {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 18px;
}

.prof-sec h3 {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 12px;
}

.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sec-head h3 {
  margin-bottom: 0;
}

.addr-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  background: var(--bg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.addr-card.default {
  border-color: var(--green);
  background: var(--green-soft);
}

.addr-card b {
  font-size: 14px;
}

.addr-card p {
  font-size: 13px;
  color: var(--muted);
  margin-top: 2px;
}

.people, .filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.zalo-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.zalo-mock {
  background: #F0F2F5;
  border: 1px solid #D8DCE0;
  border-radius: 16px;
  padding: 16px;
  margin-top: 12px;
}

.zalo-bubble {
  background: #FFFFFF;
  border-radius: 14px 14px 14px 4px;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
  font-size: 13px;
  color: #1C1E21;
}

.zalo-hdr {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.zalo-logo {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #0068FF;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 11px;
}

.zalo-acts {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #ddd;
  display: flex;
  gap: 10px;
}

.reset-box {
  margin-top: 30px;
  padding: 18px;
  border: 1px dashed var(--line);
  border-radius: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.reset-btn {
  color: var(--red);
  border-color: #F5C2C0;
}

@media (max-width: 880px) {
  .prof-grid {
    grid-template-columns: 1fr;
  }
}
</style>
