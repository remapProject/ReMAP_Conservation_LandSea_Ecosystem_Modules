import './assets/main.css'
import 'vuetify/dist/vuetify.min.css'
import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Tool';
  next();
});
const vuetify = createVuetify();
app.use(createPinia());
app.use(router);
app.use(vuetify);
app.mount('#app')
