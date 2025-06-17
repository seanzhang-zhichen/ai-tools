/**
 * 反馈API封装
 * 提供与用户反馈相关的API接口
 */
import request from '../utils/request.js';

/**
 * 提交反馈
 * @param {Object} feedbackData - 反馈数据
 * @param {String} feedbackData.type - 反馈类型(feature_suggestion, user_experience, bug_report, other)
 * @param {String} feedbackData.content - 反馈内容，最大500字
 * @param {String} [feedbackData.contact] - 联系方式（可选）
 * @param {Array} [feedbackData.images] - 图片URL列表（可选，最多3张）
 * @returns {Promise} - 返回提交结果的Promise
 */
export function submitFeedback(feedbackData) {
  return request({
    url: '/feedback/submit',
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: feedbackData
  });
}

/**
 * 获取用户反馈记录列表
 * @returns {Promise} - 返回反馈记录列表的Promise
 */
export function getFeedbackList() {
  return request({
    url: '/feedback/list',
    method: 'GET'
  });
}

/**
 * 上传反馈图片
 * @param {String} filePath - 图片文件路径
 * @returns {Promise} - 返回上传结果的Promise，包含图片URL
 */
export function uploadFeedbackImage(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${request.getBaseUrl()}/upload/image`,
      filePath: filePath,
      name: 'file',
      formData: {
        type: 'feedback'
      },
      header: {
        'Authorization': `Bearer ${uni.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0) {
              resolve(data.data.url);
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          } catch (e) {
            reject(new Error('解析上传结果失败'));
          }
        } else {
          reject(new Error(`上传失败，状态码: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 批量上传反馈图片
 * @param {Array} filePaths - 图片文件路径数组
 * @returns {Promise} - 返回包含所有图片URL的Promise
 */
export function uploadFeedbackImages(filePaths) {
  const uploads = filePaths.map(path => uploadFeedbackImage(path));
  return Promise.all(uploads);
} 