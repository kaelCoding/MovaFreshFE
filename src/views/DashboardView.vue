<template>
  <div class="dash-view">
    <div class="wrap">
      <!-- 1. Header tóm tắt hồ sơ & số dư -->
      <DashHeader />

      <!-- Cụm tính năng Viral Referral Engine ở đầu Dashboard -->
      <div class="dash-referral-top" style="margin-bottom: 24px">
        <ViralReferralCard />
      </div>

      <!-- 2. Danh sách 4 Tabs liên thông -->
      <div class="dash-tabs" role="tablist">
        <button
          class="dash-tab-btn"
          :class="{ active: currentTab === 'active' }"
          @click="currentTab = 'active'"
          role="tab"
        >
          📦 Đơn hàng đang chạy & Lịch giao
        </button>
        <button
          class="dash-tab-btn"
          :class="{ active: currentTab === 'history' }"
          @click="currentTab = 'history'"
          role="tab"
        >
          🕒 Lịch sử đơn & Khẩu vị đã nấu
        </button>
        <button
          class="dash-tab-btn"
          :class="{ active: currentTab === 'prepaid' }"
          @click="currentTab = 'prepaid'"
          role="tab"
        >
          💳 Fresh Credit Trả Trước
        </button>
        <button
          class="dash-tab-btn"
          :class="{ active: currentTab === 'profile' }"
          @click="currentTab = 'profile'"
          role="tab"
        >
          ⚙️ Hồ sơ, Sổ địa chỉ & Zalo OA
        </button>
      </div>

      <!-- 3. Nội dung từng Tab -->
      <div class="tab-content">
        <ActiveOrderTab v-show="currentTab === 'active'" />
        <OrderHistoryTab v-show="currentTab === 'history'" />
        <PrepaidPlanTab v-show="currentTab === 'prepaid'" />
        <ProfileAddressTab v-show="currentTab === 'profile'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DashHeader from '../components/dashboard/DashHeader.vue';
import ViralReferralCard from '../components/shared/ViralReferralCard.vue';
import ActiveOrderTab from '../components/dashboard/ActiveOrderTab.vue';
import OrderHistoryTab from '../components/dashboard/OrderHistoryTab.vue';
import PrepaidPlanTab from '../components/dashboard/PrepaidPlanTab.vue';
import ProfileAddressTab from '../components/dashboard/ProfileAddressTab.vue';

const currentTab = ref('active');
</script>

<style scoped>
.dash-view {
  padding: 30px 0 60px;
}

.dash-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1.5px solid var(--line);
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.dash-tab-btn {
  border: 0;
  background: none;
  padding: 10px 16px;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--muted);
  border-radius: 12px 12px 0 0;
  white-space: nowrap;
  position: relative;
  transition: .15s;
}

.dash-tab-btn:hover {
  color: var(--ink);
}

.dash-tab-btn.active {
  color: var(--green);
  font-weight: 700;
}

.dash-tab-btn.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3.5px;
  height: 3px;
  background: var(--green);
  border-radius: 3px;
}
</style>
