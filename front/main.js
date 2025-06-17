// 导入配置
import appConfig, { getConfig, getApiBaseUrl, getWsBaseUrl } from './utils/config.js';

import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'

// 注入配置到Vue原型
Vue.prototype.$config = appConfig;
Vue.prototype.$baseApiWsUrl = getWsBaseUrl();
Vue.prototype.$baseApiUrl = getApiBaseUrl();

// 注入工具方法到Vue原型
Vue.prototype.$getConfig = getConfig;
Vue.prototype.$getApiBaseUrl = getApiBaseUrl;

Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  
  // 在Vue 3中添加全局配置
  app.config.globalProperties.$config = appConfig;
  app.config.globalProperties.$getConfig = getConfig;
  app.config.globalProperties.$baseApiWsUrl = getWsBaseUrl();
  app.config.globalProperties.$baseApiUrl = getApiBaseUrl();
  
  return {
    app
  }
}
// #endif