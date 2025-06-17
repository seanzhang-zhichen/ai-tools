/**
 * 上传工具函数
 * 处理七牛云上传和去水印流程
 */
import request from '@/utils/request';
import visualApi from '@/api/visualApi';

/**
 * 图片上传到七牛云，然后进行去水印处理
 * @param {Object} options - 上传和处理选项
 * @param {File} options.imageFile - 要上传的图片文件
 * @param {String} options.imagePath - 本地图片路径
 * @param {Array} options.rectangles - 水印区域矩形数组
 * @param {Function} options.onProgress - 处理进度回调，参数为0-1的小数
 * @param {Function} options.onSuccess - 成功回调，参数为处理结果对象
 * @param {Function} options.onError - 错误回调，参数为错误信息
 */
export const uploadImageAndRemoveWatermark = async (options) => {
  const { imageFile, imagePath, rectangles, onProgress, onSuccess, onError } = options;
  
  try {
    // 检查用户是否已登录
    const token = uni.getStorageSync('token');
    if (!token) {
      throw new Error('登录已过期，请重新登录');
    }
    
    // 进度更新
    if (onProgress) onProgress(0.1);
    
    // 第一步：上传图片到七牛云
    const uploadResult = await uploadToQiniu(imageFile, imagePath);
    
    if (!uploadResult || !uploadResult.url) {
      throw new Error('图片上传到七牛云失败');
    }
    
    // 进度更新
    if (onProgress) onProgress(0.3);
    
    // 第二步：调用去水印API进行处理
    const result = await startWatermarkRemoval({
      imageUrl: uploadResult.url,
      rectangles,
      onProgress: (progress) => {
        // 将进度映射到30%-95%区间
        if (onProgress) onProgress(0.3 + progress * 0.65);
      }
    });
    
    // 进度更新
    if (onProgress) onProgress(1);
    
    // 返回结果
    if (onSuccess) onSuccess(result);
    return result;
  } catch (error) {
    console.error('上传并去水印处理失败:', error);
    // 处理特定错误消息
    if (error.message.includes('401') || 
        error.message.includes('未授权') || 
        error.message.includes('登录已过期')) {
      // 清除无效token
      uni.removeStorageSync('token');
      if (onError) onError('登录已过期，请重新登录');
    } else {
      if (onError) onError(error.message || '处理失败');
    }
    throw error;
  }
};

/**
 * 上传图片到七牛云
 * @param {File} imageFile - 图片文件对象
 * @param {String} imagePath - 图片本地路径
 * @returns {Promise<Object>} - 返回包含url字段的对象
 */
export const uploadToQiniu = (imageFile, imagePath) => {
  return new Promise((resolve, reject) => {
    // 使用普通对象存储表单数据
    const formData = {};
    
    uni.uploadFile({
      url: request.getBaseUrl() + '/upload/image',
      name: 'file',
      filePath: imagePath,
      formData: formData,
      header: {
        'Authorization': 'Bearer ' + uni.getStorageSync('token')
      },
      success: (uploadRes) => {
        try {
          // 解析响应数据
          const data = JSON.parse(uploadRes.data);
          // 七牛云上传成功后应该返回包含url字段的对象
          if (data && data.url) {
            resolve(data);
          } else {
            reject(new Error('上传响应格式不正确'));
          }
        } catch (e) {
          reject(new Error('解析上传响应数据失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 使用图片URL调用去水印API
 * @param {Object} options - 处理选项
 * @param {String} options.imageUrl - 七牛云上的图片URL
 * @param {Array} options.rectangles - 水印区域矩形数组
 * @param {Function} options.onProgress - 处理进度回调(0-1)
 * @returns {Promise<Object>} - 返回处理结果，包含resultImageUrl
 */
export const startWatermarkRemoval = async (options) => {
  const { imageUrl, rectangles, onProgress } = options;
  
  try {
    // 构建矩形参数 - 确保是正确的JSON字符串格式
    const rectanglesParam = Array.isArray(rectangles) ? JSON.stringify(rectangles) : rectangles;
    
    console.log('调用去水印API，参数：', { 
      imageUrl, 
      rectanglesParam
    });
    
    // 提交去水印处理请求
    const response = await visualApi.removeWatermark({
      image_url: imageUrl, // 使用七牛云上的图片URL
      rectangles: rectanglesParam,
      sync: 0,  // 使用异步模式
      return_type: 1 // 返回URL
    });
    
    console.log('去水印API响应：', response);
    
    // 检查响应格式 - 根据后端API的实际返回格式调整
    let taskId;
    if (response && response.task_id) {
      // 直接返回的情况
      taskId = response.task_id;
    } else if (response && response.data && response.data.task_id) {
      // 嵌套在data字段中的情况
      taskId = response.data.task_id;
    } else {
      console.error('未获取到去水印任务ID，响应格式异常：', response);
      throw new Error('未获取到去水印任务ID');
    }
    
    console.log('获取到任务ID:', taskId);
    
    // 定期查询任务状态
    return await pollTaskStatus(taskId, onProgress);
  } catch (error) {
    console.error('去水印处理失败:', error);
    throw error;
  }
};

/**
 * 轮询任务状态
 * @param {String} taskId - 任务ID
 * @param {Function} onProgress - 进度回调函数
 * @returns {Promise<Object>} - 返回处理结果
 */
export const pollTaskStatus = (taskId, onProgress) => {
  return new Promise((resolve, reject) => {
    let retryCount = 0;
    const maxRetries = 30; // 最多轮询30次
    const intervalTime = 2000; // 每2秒查询一次
    
    console.log('开始轮询任务状态, taskId:', taskId);
    
    // 进度从0开始
    if (onProgress) onProgress(0);
    
    const checkStatus = async () => {
      try {
        console.log(`第${retryCount + 1}次查询任务状态, taskId: ${taskId}`);
        
        // 调用任务状态查询API
        const response = await visualApi.getTaskStatus(taskId);
        
        console.log('任务状态查询原始响应:', response);
        
        // 处理新版API响应格式
        if (!response || !response.data) {
          console.error('无法解析任务状态响应:', response);
          reject(new Error('获取任务状态失败：响应格式错误'));
          return;
        }
        
        // 解析新版API响应
        const data = response.data;
        const state = data.state;
        const image = data.file || data.image; // 兼容file和image字段
        const progress = data.progress || 0;
        
        // 状态码 = 1(成功) 或 < 0(失败)，任务结束
        const completed = state === 1;
        const failed = state < 0;
        
        // 如果任务失败，设置错误信息
        let errorMessage = '';
        if (failed) {
          // 根据状态码设置错误信息
          switch (state) {
            case -8: errorMessage = '处理超时，最长处理时间30秒'; break;
            case -7: errorMessage = '无效图片文件（图片损坏、格式不对等）'; break;
            case -5: errorMessage = '图片超出大小（15MB）'; break;
            case -3: errorMessage = '服务器下载图片文件失败，请检查图片URL是否可用'; break;
            case -2: errorMessage = '任务处理完成，但任务结果上传失败'; break;
            case -1: errorMessage = '任务处理失败'; break;
            default: errorMessage = '未知错误';
          }
        }
        
        console.log('解析后的任务状态:', { state, progress, completed, failed });
        
        // 更新进度回调，确保进度在0-1之间
        if (onProgress && progress >= 0) {
          const normalizedProgress = Math.min(Math.max(progress / 100, 0), 1);
          onProgress(normalizedProgress);
        }
        
        // 任务完成
        if (completed) {
          if (image) {
            console.log('任务完成，结果图片:', image);
            resolve({
              resultImageUrl: image,
              taskId,
              message: '处理成功'
            });
            return;
          } else {
            console.error('任务完成但无结果图片URL');
            reject(new Error('处理完成但未返回结果图片URL'));
            return;
          }
        }
        
        // 任务失败
        if (failed) {
          console.error('任务处理失败:', errorMessage);
          reject(new Error(`处理失败: ${errorMessage}`));
          return;
        }
        
        // 达到最大重试次数
        if (++retryCount >= maxRetries) {
          console.error('任务查询超时, 已达到最大重试次数:', maxRetries);
          reject(new Error('处理超时，请稍后查看结果'));
          return;
        }
        
        // 继续轮询
        setTimeout(checkStatus, intervalTime);
      } catch (error) {
        console.error('查询任务状态出错:', error);
        reject(error);
      }
    };
    
    // 开始轮询
    checkStatus();
  });
};

/**
 * 图片上传到七牛云，然后进行自动去水印处理
 * @param {Object} options - 上传和处理选项
 * @param {File} options.imageFile - 要上传的图片文件
 * @param {String} options.imagePath - 本地图片路径
 * @param {Function} options.onProgress - 处理进度回调，参数为0-1的小数
 * @param {Function} options.onSuccess - 成功回调，参数为处理结果对象
 * @param {Function} options.onError - 错误回调，参数为错误信息
 */
export const uploadImageAndAutoRemoveWatermark = async (options) => {
  const { imageFile, imagePath, onProgress, onSuccess, onError } = options;
  
  try {
    // 检查用户是否已登录
    const token = uni.getStorageSync('token');
    if (!token) {
      throw new Error('登录已过期，请重新登录');
    }
    
    // 进度更新
    if (onProgress) onProgress(0.1);
    
    // 第一步：上传图片到七牛云
    const uploadResult = await uploadToQiniu(imageFile, imagePath);
    
    if (!uploadResult || !uploadResult.url) {
      throw new Error('图片上传到七牛云失败');
    }
    
    // 进度更新
    if (onProgress) onProgress(0.3);
    
    // 第二步：调用自动去水印API进行处理
    const result = await startAutoWatermarkRemoval({
      imageUrl: uploadResult.url,
      onProgress: (progress) => {
        // 将进度映射到30%-95%区间
        if (onProgress) onProgress(0.3 + progress * 0.65);
      }
    });
    
    // 进度更新
    if (onProgress) onProgress(1);
    
    // 返回结果
    if (onSuccess) onSuccess(result);
    return result;
  } catch (error) {
    console.error('上传并自动去水印处理失败:', error);
    // 处理特定错误消息
    if (error.message.includes('401') || 
        error.message.includes('未授权') || 
        error.message.includes('登录已过期')) {
      // 清除无效token
      uni.removeStorageSync('token');
      if (onError) onError('登录已过期，请重新登录');
    } else {
      if (onError) onError(error.message || '处理失败');
    }
    throw error;
  }
};

/**
 * 使用图片URL调用自动去水印API
 * @param {Object} options - 处理选项
 * @param {String} options.imageUrl - 七牛云上的图片URL
 * @param {Function} options.onProgress - 处理进度回调(0-1)
 * @returns {Promise<Object>} - 返回处理结果，包含resultImageUrl
 */
export const startAutoWatermarkRemoval = async (options) => {
  const { imageUrl, onProgress } = options;
  
  try {
    console.log('调用自动去水印API，参数：', { imageUrl });
    
    // 提交自动去水印处理请求
    const response = await visualApi.autoRemoveWatermark({
      image_url: imageUrl, // 使用七牛云上的图片URL
      sync: 0,  // 使用异步模式
    });
    
    console.log('自动去水印API响应：', response);
    
    // 检查响应格式 - 根据后端API的实际返回格式调整
    let taskId;
    if (response && response.task_id) {
      // 直接返回的情况
      taskId = response.task_id;
    } else if (response && response.data && response.data.task_id) {
      // 嵌套在data字段中的情况
      taskId = response.data.task_id;
    } else {
      console.error('未获取到自动去水印任务ID，响应格式异常：', response);
      throw new Error('未获取到自动去水印任务ID');
    }
    
    console.log('获取到任务ID:', taskId);
    
    // 定期查询任务状态
    return await pollTaskStatus(taskId, onProgress);
  } catch (error) {
    console.error('自动去水印处理失败:', error);
    throw error;
  }
};

export default {
  uploadImageAndRemoveWatermark,
  uploadImageAndAutoRemoveWatermark,
  uploadToQiniu,
  startWatermarkRemoval,
  startAutoWatermarkRemoval,
  pollTaskStatus
}; 