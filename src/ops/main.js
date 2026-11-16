import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import '../assets/styles/main.css';
import './ops.css';
import './ops-factory.css';
import './ops-procurement.css';

createApp(App).use(router).mount('#ops-app');
