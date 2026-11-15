<template>
  <div class="addons-sec">
    <h3>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Mua thêm đi cùng chuyến xe lạnh Đắk Lắk – TP.HCM
    </h3>
    <p>Thực phẩm phụ tươi ngon từ Tây Nguyên & Đà Lạt, tiện mua thêm để đạt mốc 400k (giảm 20k) hoặc 600k (Freeship & tách 2 đợt):</p>

    <div class="addons-grid">
      <div
        v-for="a in ADDONS"
        :key="a.id"
        class="addon-card"
        :class="{ in: (store.addons[a.id] || 0) > 0 }"
      >
        <div class="aic">
          <div class="a-icon">{{ a.icon }}</div>
          <div>
            <b>{{ a.name }}</b>
            <div class="muted" style="font-size: 12px">{{ a.unit }}</div>
          </div>
        </div>
        <div class="apr num">{{ fmt(a.price) }}</div>
        <div class="abtn">
          <div v-if="(store.addons[a.id] || 0) > 0" class="stepper">
            <button @click="handleDec(a.id)">−</button>
            <b class="num">{{ store.addons[a.id] }}</b>
            <button @click="handleInc(a.id)">+</button>
          </div>
          <button
            v-else
            class="btn sm primary"
            @click="handleAdd(a.id)"
          >
            + Mua thêm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ADDONS } from '../../data/mockData';
import { fmt } from '../../utils/formatters';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();

const handleAdd = (id) => {
  if (store.tryChangeAddon(id, 1)) {
    const a = ADDONS.find((x) => x.id === id);
    store.toast(`Đã thêm ${a.name}`);
  }
};

const handleInc = (id) => {
  const cur = store.addons[id] || 0;
  if (store.tryChangeAddon(id, cur + 1)) {
    const a = ADDONS.find((x) => x.id === id);
    store.toast(`${a.name}: ${cur + 1}`);
  }
};

const handleDec = (id) => {
  const cur = store.addons[id] || 0;
  store.tryChangeAddon(id, cur - 1);
  const a = ADDONS.find((x) => x.id === id);
  if (cur - 1 > 0) {
    store.toast(`${a.name}: ${cur - 1}`);
  } else {
    store.toast(`Đã bỏ ${a.name}`);
  }
};
</script>

<style scoped>
.addons-sec {
  margin-top: 28px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 20px;
}

.addons-sec h3 {
  font-size: 17px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
}

.addons-sec p {
  font-size: 13.5px;
  color: var(--muted);
  margin-top: 2px;
  margin-bottom: 14px;
}

.addons-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.addon-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg);
  transition: .15s;
}

.addon-card.in {
  border-color: var(--green);
  background: var(--green-soft);
}

.addon-card .aic {
  display: flex;
  align-items: center;
  gap: 10px;
}

.addon-card .a-icon {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid var(--line);
  display: grid;
  place-items: center;
  font-size: 24px;
  flex-shrink: 0;
}

.addon-card b {
  font-size: 14px;
  line-height: 1.25;
  display: block;
}

.addon-card .apr {
  font-size: 14px;
  font-weight: 700;
  color: var(--green);
}

.addon-card .abtn {
  margin-top: auto;
}

@media (max-width: 880px) {
  .addons-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .addons-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
