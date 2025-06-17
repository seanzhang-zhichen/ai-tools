<script>
	// #ifndef VUE3
	import Vue from 'vue';
	// #endif
	
	// #ifdef VUE3
	import { getCurrentInstance } from 'vue';
	// #endif
	
	// 导入版本号
	import { getAppVersion } from './utils/config.js';
	
	// 简化App.vue中的配置使用
	export default {
		globalData: {
			userInfo: null,
			appVersion: getAppVersion(), // 添加版本号到全局数据
		},
		onLaunch: function() {
			console.log('App Launch');
			// 配置请求拦截器
			this.setupRequestInterceptors();
			
			// #ifndef VUE3
			// 从Vue原型中获取配置
			this.globalData.apiBaseUrl = Vue.prototype.$baseApiUrl;
			this.globalData.baseApiWsUrl = Vue.prototype.$baseApiWsUrl;
			// #endif
			
			// #ifdef VUE3
			// 在Vue3中通过getCurrentInstance获取配置
			const instance = getCurrentInstance();
			if (instance && instance.appContext) {
				const { $baseApiUrl, $baseApiWsUrl } = instance.appContext.config.globalProperties;
				this.globalData.apiBaseUrl = $baseApiUrl;
				this.globalData.baseApiWsUrl = $baseApiWsUrl;
			} else {
				// 兜底配置
				console.log('Vue3实例不存在，使用默认配置');
				this.globalData.apiBaseUrl = 'http://localhost:8000/api';
				this.globalData.baseApiWsUrl = 'ws://localhost:8000';
			}
			// #endif
			
			// 输出应用版本信息
			console.log('应用版本:', this.globalData.appVersion);
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		},
		methods: {
			setupRequestInterceptors() {
				// 请求拦截器，添加统一的Authorization头
				const oldRequest = uni.request;
				uni.request = (options = {}) => {
					// 获取本地存储的token
					const token = uni.getStorageSync('token');
					
					// 如果有token，添加到请求头
					if (token) {
						options.header = {
							...(options.header || {}),
							'Authorization': `Bearer ${token}`
						};
					}
					
					// 请求失败处理
					const oldFail = options.fail;
					options.fail = (err) => {
						console.error('请求失败:', err);
						oldFail && oldFail(err);
					};
					
					// 请求完成处理
					const oldComplete = options.complete;
					options.complete = (res) => {
						// 检查是否401未授权错误（Token过期或无效）
						if (res.statusCode === 401) {
							// 清除本地token
							uni.removeStorageSync('token');
							
							// 提示用户
							uni.showToast({
								title: '登录已过期，请重新登录',
								icon: 'none'
							});
							
							// 跳转到登录页
							setTimeout(() => {
								uni.redirectTo({
									url: '/pages/login/login'
								});
							}, 1500);
						}
						
						oldComplete && oldComplete(res);
					};
					
					return oldRequest.call(this, options);
				};
			}
		}
	}
</script>

<style>
	/*每个页面公共css */
  @import url('/static/avatar-style.css');
  
  /* 全局统一的头像样式 */
  .global-avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    overflow: hidden;
    border: 4rpx solid white;
    box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f2f5;
  }
  
  .global-avatar image {
    width: 85%;
    height: 85%;
    border-radius: 50%;
    object-fit: cover;
  }
</style>
