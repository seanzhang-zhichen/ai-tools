/**
 * 平台相关工具函数
 */

/**
 * 判断当前设备是否是iOS系统
 * @returns {boolean} 如果是iOS返回true，否则返回false
 */
export function isIOS() {
  // #ifdef APP-PLUS
  const platform = plus.os.name.toLowerCase();
  return platform === 'ios';
  // #endif
  
  // #ifdef MP-WEIXIN
  const systemInfo = uni.getSystemInfoSync();
  return systemInfo.platform === 'ios';
  // #endif
  
  // 其他平台默认返回false
  return false;
}

/**
 * 判断当前设备是否是Android系统
 * @returns {boolean} 如果是Android返回true，否则返回false
 */
export function isAndroid() {
  // #ifdef APP-PLUS
  const platform = plus.os.name.toLowerCase();
  return platform === 'android';
  // #endif
  
  // #ifdef MP-WEIXIN
  const systemInfo = uni.getSystemInfoSync();
  return systemInfo.platform === 'android';
  // #endif
  
  // 其他平台默认返回false
  return false;
}

/**
 * iOS功能限制提示信息
 * @returns {string} iOS功能限制的提示文案
 */
export function getIOSLimitationMessage() {
  return '由于平台规范限制，此功能在iOS设备上不可用';
} 