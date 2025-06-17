/**
 * 积分配置服务
 * 提供获取积分配置、缓存配置、获取特定功能积分消耗等功能
 */
import { getPointsConfigs } from '@/api/pointsApi';

// 默认积分消耗配置
const DEFAULT_POINTS_COSTS = {
  chatbot: 0,        // 聊天机器人默认消耗0积分
  music_generation: 300, // 音乐生成默认消耗300积分
  inpaint: 50,       // 图片去水印默认消耗50积分
  segmentation: 10,  // 智能抠图默认消耗10积分
  scale: 10,         // 图片清晰化默认消耗10积分
};

// 缓存的积分配置
let cachedPointsConfigs = null;
let cachedPointsDescriptions = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 缓存有效期5分钟

/**
 * 获取积分配置
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Object>} - 包含积分配置和描述的对象
 */
export const getPointsConfigsWithCache = async (forceRefresh = false) => {
  const now = Date.now();
  
  // 如果有缓存且未过期且不需要强制刷新，直接返回缓存
  if (
    !forceRefresh && 
    cachedPointsConfigs && 
    now - lastFetchTime < CACHE_TTL
  ) {
    console.log('使用缓存的积分配置');
    return {
      configs: cachedPointsConfigs,
      descriptions: cachedPointsDescriptions
    };
  }
  
  try {
    console.log('开始获取积分配置...');
    const response = await getPointsConfigs();
    console.log('积分配置API响应:', response);
    
    // 处理直接返回配置对象的情况
    if (response && response.configs && response.descriptions) {
      cachedPointsConfigs = response.configs || {};
      cachedPointsDescriptions = response.descriptions || {};
      lastFetchTime = now;
      
      console.log('直接从响应获取积分配置成功');
      return { 
        configs: cachedPointsConfigs, 
        descriptions: cachedPointsDescriptions 
      };
    }
    
    // 处理标准API响应格式
    if (response && response.code === 0 && response.data) {
      cachedPointsConfigs = response.data.configs || {};
      cachedPointsDescriptions = response.data.descriptions || {};
      lastFetchTime = now;
      
      console.log('从标准响应格式获取积分配置成功');
      return { 
        configs: cachedPointsConfigs, 
        descriptions: cachedPointsDescriptions 
      };
    }
    
    // 处理错误情况
    const errorMessage = response && response.message 
      ? response.message 
      : '获取配置返回格式不正确';
    console.error('获取积分配置失败:', errorMessage);
    
    // 如果有旧缓存，依然返回旧缓存
    if (cachedPointsConfigs) {
      console.warn('使用过期的缓存配置');
      return { 
        configs: cachedPointsConfigs, 
        descriptions: cachedPointsDescriptions,
        error: errorMessage
      };
    }
    
    // 无缓存，返回默认配置
    console.warn('使用默认积分配置');
    return { 
      configs: DEFAULT_POINTS_COSTS, 
      descriptions: {},
      error: errorMessage
    };
  } catch (error) {
    console.error('获取积分配置出错:', error);
    
    // 如果有旧缓存，依然返回旧缓存
    if (cachedPointsConfigs) {
      console.warn('出错后使用缓存配置');
      return { 
        configs: cachedPointsConfigs, 
        descriptions: cachedPointsDescriptions,
        error: error.message || '未知错误'
      };
    }
    
    // 无缓存，返回默认配置
    console.warn('使用默认积分配置');
    return { 
      configs: DEFAULT_POINTS_COSTS, 
      descriptions: {},
      error: error.message || '未知错误'
    };
  }
};

/**
 * 获取特定功能的积分消耗
 * @param {string} featureKey - 功能键名，如'music_generation'、'inpaint'等
 * @param {number} defaultValue - 默认值，当配置不存在时返回
 * @returns {number} - 积分消耗值
 */
export const getFeaturePointsCost = (featureKey, defaultValue) => {
  // 如果没有指定默认值，尝试从默认配置获取
  if (defaultValue === undefined) {
    defaultValue = DEFAULT_POINTS_COSTS[featureKey] || 0;
  }
  
  // 如果配置未加载，返回默认值
  if (!cachedPointsConfigs) {
    return defaultValue;
  }
  
  // 安全地获取配置值
  return cachedPointsConfigs[featureKey] !== undefined 
    ? cachedPointsConfigs[featureKey] 
    : defaultValue;
};

/**
 * 重置缓存
 * 用于用户登录/登出等情况下清除缓存
 */
export const resetPointsConfigCache = () => {
  cachedPointsConfigs = null;
  cachedPointsDescriptions = null;
  lastFetchTime = 0;
  console.log('积分配置缓存已重置');
};

export default {
  getPointsConfigsWithCache,
  getFeaturePointsCost,
  resetPointsConfigCache
}; 