import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import '../assets/styles/main.css';
import './ops.css';
import './ops-factory.css';
import './ops-procurement.css';
import './ops-logistics.css';
import './ops-finance.css';

createApp(App).use(router).mount('#ops-app');
