/**
 * 积分API封装
 * 提供与积分查询、消费记录和购买相关的API接口
 */
import request from '../utils/request.js';

/**
 * 获取积分消费记录
 * @param {Object} params - 查询参数
 * @param {String} [params.start_date] - 开始日期（ISO格式）
 * @param {String} [params.end_date] - 结束日期（ISO格式）
 * @param {String} [params.feature] - 按功能筛选
 * @param {Number} [params.skip=0] - 跳过的记录数
 * @param {Number} [params.limit=100] - 返回的最大记录数
 * @returns {Promise} - 返回积分消费记录列表的Promise
 */
export function getPointsRecords(params = {}) {
  // 打印传入的原始参数
  console.log('Points Records API - 原始参数:', JSON.stringify(params));
  
  // 构建查询参数数组
  const queryParts = [];
  
  // 添加基础分页参数
  queryParts.push(`skip=${encodeURIComponent(params.skip || 0)}`);
  queryParts.push(`limit=${encodeURIComponent(params.limit || 100)}`);
  
  // 添加日期参数
  if (params.start_date) {
    queryParts.push(`start_date=${encodeURIComponent(params.start_date)}`);
  }
  
  if (params.end_date) {
    queryParts.push(`end_date=${encodeURIComponent(params.end_date)}`);
  }
  
  // 添加功能筛选参数
  if (params.feature && params.feature.trim() !== '') {
    queryParts.push(`feature=${encodeURIComponent(params.feature.trim())}`);
  }
  
  // 构建完整的查询字符串
  const queryString = queryParts.join('&');
  console.log('构建的查询字符串:', queryString);
  
  // 使用URL查询方式发送请求
  return request({
    url: `/points/records?${queryString}`,
    method: 'GET'
  });
}

/**
 * 获取积分消费汇总
 * @param {Object} params - 查询参数
 * @param {String} [params.start_date] - 开始日期（ISO格式）
 * @param {String} [params.end_date] - 结束日期（ISO格式）
 * @param {String} [params.feature] - 按功能筛选
 * @returns {Promise} - 返回积分消费汇总的Promise
 */
export function getPointsSummary(params = {}) {
  // 打印传入的原始参数
  console.log('Points Summary API - 原始参数:', JSON.stringify(params));
  
  // 构建查询参数数组
  const queryParts = [];
  
  // 添加日期参数
  if (params.start_date) {
    queryParts.push(`start_date=${encodeURIComponent(params.start_date)}`);
  }
  
  if (params.end_date) {
    queryParts.push(`end_date=${encodeURIComponent(params.end_date)}`);
  }
  
  // 添加功能筛选参数
  if (params.feature && params.feature.trim() !== '') {
    queryParts.push(`feature=${encodeURIComponent(params.feature.trim())}`);
  }
  
  // 构建完整的查询字符串
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  console.log('汇总查询字符串:', queryString);
  
  // 使用URL查询方式发送请求
  return request({
    url: `/points/summary${queryString}`,
    method: 'GET'
  });
}

/**
 * 创建支付订单（购买积分）
 * @param {Object} orderData - 订单数据
 * @param {Number} orderData.optionId - 购买选项ID
 * @param {Number} orderData.amount - 对应的价格
 * @param {String} orderData.paymentMethod - 支付方式，如'wxpay_app'
 * @returns {Promise} - 返回创建订单结果的Promise，包含支付所需参数
 */
export function createPaymentOrder(orderData) {
  return request({
    url: '/payment/create',
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: orderData
  });
}

/**
 * 验证支付订单状态
 * @param {String} orderId - 订单ID
 * @returns {Promise} - 返回订单状态的Promise
 */
export function verifyPaymentStatus(orderId) {
  return request({
    url: '/payment/verify',
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: {
      orderId: orderId
    }
  });
}

/**
 * 获取用户积分余额
 * @returns {Promise} - 返回用户积分余额的Promise
 */
export function getPointsBalance() {
  return request({
    url: '/user/info',
    method: 'GET'
  }).then(response => {
    // 如果请求成功且有数据
    if (response && response.code === 0 && response.data) {
      // 从用户信息中提取积分数据
      const points = response.data.points || 0;
      // 返回相同格式的响应，但只包含积分信息
      return {
        code: 0,
        message: '获取积分成功',
        data: { points }
      };
    }
    // 如果请求失败，直接返回原始响应
    return response;
  });
}

/**
 * 获取购买积分选项列表
 * @returns {Promise} - 返回积分购买选项的Promise
 */
export function getPointsOptions() {
  return request({
    url: '/payment/options',
    method: 'GET'
  });
}

/**
 * 获取积分配置字典
 * @returns {Promise} - 返回积分配置字典的Promise，包含配置和描述
 */
export function getPointsConfigs() {
  return request({
    url: '/points/configs/dict',
    method: 'GET'
  });
} 