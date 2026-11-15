<template>
  <div>
    <div
      class="drawer"
      :class="{ open: store.notifDrawerOpen }"
      aria-label="Thông báo thời gian thực"
    >
      <div class="drawer-hdr">
        <h3>Thông báo từ bếp MOVA</h3>
        <button class="sheet-x" @click="store.notifDrawerOpen = false" aria-label="Đóng thông báo">×</button>
      </div>
      <div class="drawer-body">
        <div
          v-for="n in store.notifications"
          :key="n.id"
          class="notif-item"
          :class="{ unread: n.unread }"
        >
          <b>{{ n.title }}</b>
          <p>{{ n.desc }}</p>
          <small>{{ n.time }}</small>
        </div>
      </div>
      <div class="drawer-ftr">
        <button class="btn ghost sm" @click="store.markAllNotifsRead">
          Đánh dấu tất cả đã đọc
        </button>
      </div>
    </div>
    <div
      class="scrim"
      :class="{ open: store.notifDrawerOpen }"
      @click="store.notifDrawerOpen = false"
    ></div>
  </div>
</template>

<script setup>
import { useMovaStore } from '../../stores/useMovaStore';

const store = useMovaStore();
</script>

<style scoped>
.drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(400px, 92vw);
  background: var(--card);
  z-index: 65;
  box-shadow: -10px 0 30px rgba(20, 15, 10, .15);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform .28s ease;
}

.drawer.open {
  transform: none;
}

.drawer-hdr {
  padding: 18px 20px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-hdr h3 {
  font-size: 16px;
  font-weight: 800;
}

.drawer-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  display: grid;
  gap: 10px;
}

.notif-item {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg);
  font-size: 13px;
}

.notif-item.unread {
  background: var(--orange-soft);
  border-color: var(--orange);
}

.notif-item b {
  display: block;
  font-size: 14px;
  margin-bottom: 3px;
}

.notif-item small {
  color: var(--muted);
  display: block;
  margin-top: 6px;
}

.drawer-ftr {
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  text-align: center;
}

.scrim {
  display: none;
}

.scrim.open {
  display: block;
  position: fixed;
  inset: 0;
  background: rgba(30, 25, 15, .4);
  z-index: 64;
}
</style>
