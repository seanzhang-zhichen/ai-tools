/**
 * 封装 uni-app 的请求API
 */

// 导入配置
import { getApiBaseUrl } from './config.js';

/**
 * 请求拦截器
 * @param {Object} config 请求配置
 */
function requestInterceptor(config) {
  // 从本地存储获取token
  const token = uni.getStorageSync('token');
  
  // 如果有token，添加到header中
  if (token) {
    config.header = {
      ...config.header,
      'Authorization': `Bearer ${token}`
    };
  }
  
  // 添加API基础URL
  if (config.url.indexOf('http') !== 0) {
    config.url = getApiBaseUrl() + config.url;
  }
  
  // 确保params中的中文参数被正确编码
  if (config.params) {
    // 对参数进行URL编码，特别是处理中文参数
    const encodedParams = {};
    Object.keys(config.params).forEach(key => {
      if (config.params[key] !== undefined && config.params[key] !== null) {
        // 将参数值转换为字符串并进行编码
        encodedParams[key] = encodeURIComponent(String(config.params[key]));
      }
    });
    config.params = encodedParams;
    
    // 记录编码后的参数
    console.log('请求参数(编码后):', config.params);
  }
  
  return config;
}

/**
 * 响应拦截器
 * @param {Object} response 响应数据
 * @param {Object} options 请求配置
 */
function responseInterceptor(response, options) {
  // 这里可以统一处理错误码等
  if (response.statusCode === 401) {
    // 如果设置了跳过授权重定向，则直接拒绝promise而不进行重定向
    if (options.skipAuthRedirect) {
      return Promise.reject(new Error('未授权'));
    }
    
    // token过期，跳转到登录页
    uni.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none'
    });
    
    // 清除token
    uni.removeStorageSync('token');
    
    // 跳转到登录页
    setTimeout(() => {
      uni.reLaunch({
        url: '/pages/login/login'
      });
    }, 1500);
    
    return Promise.reject(new Error('登录已过期'));
  }
  
  // 其他错误码处理
  if (response.statusCode !== 200) {
    uni.showToast({
      title: response.data.message || '请求失败',
      icon: 'none'
    });
    return Promise.reject(new Error(response.data.message || '请求失败'));
  }
  
  return response.data;
}

/**
 * 统一请求方法
 * @param {Object} options 请求配置
 * @param {boolean} options.skipAuthRedirect 是否跳过401未授权的自动重定向
 */
function request(options = {}) {
  // 应用请求拦截器
  const config = requestInterceptor(options);
  
  // 返回Promise
  return new Promise((resolve, reject) => {
    uni.request({
      ...config,
      success: (res) => {
        try {
          // 应用响应拦截器，传入原始配置
          const data = responseInterceptor(res, options);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      },
      fail: (err) => {
        uni.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        reject(new Error('网络请求失败'));
      }
    });
  });
}

// 导出 API 基础 URL 获取方法
request.getBaseUrl = getApiBaseUrl;

export default request; 