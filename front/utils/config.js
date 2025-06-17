/**
 * 配置文件 - 从main.js中提取用于全局共享
 */

// 自动检测当前环境
const detectEnvironment = () => {
  // 小程序环境检测
  try {
    // 1. 尝试获取小程序账号信息
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion;
    
    // 根据小程序版本环境确定使用哪个配置
    switch (envVersion) {
      case 'develop': // 开发版
        return 'development';
      case 'trial': // 体验版
        return 'production';
      case 'release': // 正式版
        return 'production';
      default:
        return 'production';
    }
  } catch (error) {
    console.log('环境检测失败，使用默认production环境:', error);
    return 'production';
  }
};

// 自动检测当前环境
const ENV = detectEnvironment();
console.log('当前环境:', ENV);

// 所有环境的配置
const configs = {
  development: {
    apiBaseUrl: 'http://localhost:8000/api',
    baseApiWsUrl: 'ws://localhost:8000/api',
    uploadUrl: 'http://localhost:8000/api/upload',
    staticUrl: 'http://localhost:8000/static',
    debug: true,
    timeout: 10000,
    version: '1.0.0'
  },
  production: {
    apiBaseUrl: 'https://localhost:8000/api',
    baseApiWsUrl: 'wss://localhost:8000/api',
    uploadUrl: 'https://localhost:8000/api/upload',
    staticUrl: 'https://localhost:8000/static',
    debug: false,
    timeout: 15000,
    version: '1.0.0'
  },
  testing: {
    apiBaseUrl: 'http://localhost:8000/api',
    baseApiWsUrl: 'ws://localhost:8000/api',
    uploadUrl: 'http://localhost:8000/api/upload',
    staticUrl: 'http://localhost:8000/static',
    debug: true,
    timeout: 10000,
    version: '1.0.0'
  },
};

// 获取当前环境配置
const appConfig = configs[ENV];

// 配置工具方法
const configUtils = {
  getConfig: (key, defaultValue) => {
    if (!key) return appConfig;
    return (appConfig[key] !== undefined) ? appConfig[key] : defaultValue;
  },
  getApiBaseUrl: () => appConfig.apiBaseUrl,
  getWsBaseUrl: () => appConfig.baseApiWsUrl,
  getAppVersion: () => appConfig.version
};

// 导出配置和工具方法
export const config = appConfig;
export const getConfig = configUtils.getConfig;
export const getApiBaseUrl = configUtils.getApiBaseUrl;
export const getWsBaseUrl = configUtils.getWsBaseUrl;
export const getAppVersion = configUtils.getAppVersion;

export default appConfig; 