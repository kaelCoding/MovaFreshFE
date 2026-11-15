<template>
  <div class="budget">
    <div class="brow">
      <div>
        <label class="blabel" for="bRange">Ngân sách đi chợ tuần này</label>
        <input
          type="range"
          id="bRange"
          min="400000"
          max="3500000"
          step="100000"
          :value="store.budget"
          @input="onRangeChange"
        />
        <div class="rangeends num">
          <span>400.000đ</span>
          <span>3.500.000đ</span>
        </div>
      </div>
      <div>
        <label class="blabel" for="bInput">Hoặc nhập số tiền</label>
        <div class="money">
          <input
            id="bInput"
            inputmode="numeric"
            autocomplete="off"
            :value="formattedInput"
            @input="onInputChange"
            @blur="onInputBlur"
          />
          <span>đ</span>
        </div>
      </div>
    </div>

    <!-- Quick chips -->
    <div class="quick">
      <button
        v-for="item in quickAmounts"
        :key="item.v"
        class="chip"
        :class="{ active: store.budget === item.v }"
        @click="store.setBudget(item.v)"
      >
        {{ item.label }}
      </button>
    </div>

    <!-- People count chips -->
    <div class="people">
      <span class="lbl">Số người ăn:</span>
      <button
        v-for="p in peopleOptions"
        :key="p.n"
        class="chip"
        :class="{ active: store.n === p.n }"
        @click="store.setPeople(p.n)"
      >
        {{ p.label }}
      </button>
    </div>

    <div style="margin-top: 14px">
      <button class="btn primary" @click="handleOptimize">
        Tự động xếp thực đơn vừa túi tiền
      </button>
    </div>

    <div
      v-if="store.msg"
      class="bresult"
      :class="{ warn: store.msg.warn }"
      role="status"
    >
      {{ store.msg.t }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();

const quickAmounts = [
  { v: 800000, label: '800k' },
  { v: 1200000, label: '1,2 triệu' },
  { v: 1500000, label: '1,5 triệu' },
  { v: 2000000, label: '2 triệu' }
];

const peopleOptions = [
  { n: 1, label: '1 người' },
  { n: 2, label: '2 vợ chồng' },
  { n: 4, label: 'Gia đình 4 người' }
];

const nf = new Intl.NumberFormat('vi-VN');
const inputVal = ref(nf.format(store.budget));

const formattedInput = computed(() => {
  return nf.format(store.budget);
});

const onRangeChange = (e) => {
  store.setBudget(+e.target.value);
};

const onInputChange = (e) => {
  const digits = e.target.value.replace(/\D/g, '');
  if (digits) {
    store.setBudget(+digits);
  }
};

const onInputBlur = (e) => {
  e.target.value = nf.format(store.budget);
};

const handleOptimize = () => {
  store.optimize();
  if (store.msg) {
    store.toast(store.msg.t);
  }
};
</script>

<style scoped>
.budget {
  margin-top: 14px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px;
}

.brow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px;
  gap: 16px;
  align-items: end;
}

input[type=range] {
  width: 100%;
  accent-color: var(--green);
  height: 28px;
}

.rangeends {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
}

.quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.people {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}

.people .lbl {
  font-size: 13.5px;
  font-weight: 600;
  margin-right: 4px;
}

.bresult {
  margin-top: 12px;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  background: var(--green-soft);
  color: var(--green-d);
}

.bresult.warn {
  background: var(--orange-soft);
  color: var(--orange-ink);
}

@media (max-width: 600px) {
  .brow {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
