/**
 * qs.js - 简化版的查询字符串解析和格式化库
 */

/**
 * 将对象转换为查询字符串
 * @param {Object} obj - 要转换的对象
 * @param {Object} options - 选项
 * @returns {String} 格式化后的查询字符串
 */
export function stringify(obj, options = {}) {
  if (!obj || typeof obj !== 'object') return '';
  
  const defaults = {
    encode: true,
    delimiter: '&'
  };
  
  const opts = { ...defaults, ...options };
  const results = [];
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value === undefined) return;
    
    let encodedKey = opts.encode ? encodeURIComponent(key) : key;
    
    if (value === null) {
      results.push(encodedKey);
    } else if (Array.isArray(value)) {
      value.forEach(item => {
        let encodedValue = opts.encode ? encodeURIComponent(item) : item;
        results.push(`${encodedKey}=${encodedValue}`);
      });
    } else {
      let encodedValue = opts.encode ? encodeURIComponent(value) : value;
      results.push(`${encodedKey}=${encodedValue}`);
    }
  });
  
  return results.join(opts.delimiter);
}

/**
 * 将查询字符串解析为对象
 * @param {String} str - 要解析的查询字符串
 * @param {Object} options - 选项
 * @returns {Object} 解析后的对象
 */
export function parse(str, options = {}) {
  if (typeof str !== 'string') return {};
  
  const defaults = {
    decode: true,
    delimiter: '&'
  };
  
  const opts = { ...defaults, ...options };
  
  // 去除开头的问号
  str = str.trim().replace(/^\?/, '');
  
  // 如果字符串为空，返回空对象
  if (!str) return {};
  
  const result = {};
  const pairs = str.split(opts.delimiter);
  
  pairs.forEach(pair => {
    const idx = pair.indexOf('=');
    let key, value;
    
    if (idx === -1) {
      key = pair;
      value = null;
    } else {
      key = pair.substring(0, idx);
      value = pair.substring(idx + 1);
    }
    
    if (opts.decode) {
      key = decodeURIComponent(key);
      if (value !== null) {
        value = decodeURIComponent(value);
      }
    }
    
    // 处理数组
    if (key.includes('[]')) {
      const arrayKey = key.replace('[]', '');
      if (!result[arrayKey]) {
        result[arrayKey] = [];
      }
      result[arrayKey].push(value);
    } else {
      result[key] = value;
    }
  });
  
  return result;
}

// 默认导出
export default {
  stringify,
  parse
}; 