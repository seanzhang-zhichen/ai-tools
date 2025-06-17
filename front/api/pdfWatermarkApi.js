/**
 * PDF去水印API封装
 * 提供PDF文档去水印相关功能的API接口
 */
import request from '@/utils/request';

/**
 * PDF去水印相关API封装
 */
const pdfWatermarkApi = {
  /**
   * 处理PDF去水印
   * @param {Object} params - 去水印参数
   * @param {File} params.pdf_file - PDF文件
   * @param {String} params.pdf_url - PDF文件URL
   * @param {String} [params.password] - PDF密码（如有）
   * @returns {Promise} - 返回处理结果的Promise
   */
  removePdfWatermark(params) {
    console.log('PDF去水印API调用参数:', params);
    
    // 获取最新的token，确保每次调用都使用最新token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    // 对于只有URL的情况
    if (!params.pdf_file) {
      return request({
        url: '/pdf/remove-pdf-watermark',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        data: {
          pdf_url: params.pdf_url,
          password: params.password || '',
          format: 'doc-repair' // 添加必填参数format
        }
      }).then(response => {
        console.log('PDF去水印API请求成功:', response);
        return response;
      }).catch(error => {
        console.error('PDF去水印API请求失败:', error);
        
        // 检查是否为token过期错误
        if (error.message && (error.message.includes('登录已过期') || error.message.includes('未授权'))) {
          // 清除失效的token
          uni.removeStorageSync('token');
        }
        
        throw error;
      });
    }
    
    // 对于有文件的情况，使用uploadFile方法
    return new Promise((resolve, reject) => {
      // 创建普通对象存储表单参数
      const formData = {};
      
      // 添加密码参数（如有）
      if (params.password) {
        formData.password = params.password;
      }
      
      // 添加必填参数format
      formData.format = 'doc-repair';
      
      console.log('PDF去水印上传文件参数:', formData);
      
      uni.uploadFile({
        url: request.getBaseUrl() + '/pdf/remove-pdf-watermark',
        filePath: params.pdf_file,
        name: 'pdf_file',
        formData: formData,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (uploadRes) => {
          try {
            console.log('PDF去水印上传文件响应:', uploadRes);
            
            // 检查是否为401未授权错误
            if (uploadRes.statusCode === 401) {
              uni.removeStorageSync('token');
              reject(new Error('登录已过期，请重新登录'));
              return;
            }
            
            const data = JSON.parse(uploadRes.data);
            resolve(data);
          } catch (e) {
            console.error('解析上传响应数据失败:', e, uploadRes);
            reject(new Error('解析响应数据失败'));
          }
        },
        fail: (err) => {
          console.error('PDF去水印上传文件失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 获取PDF去水印任务处理结果
   * @param {String} taskId - 任务ID
   * @returns {Promise} - 返回任务状态和结果的Promise
   */
  getTaskResult(taskId) {
    console.log('查询PDF去水印任务结果，任务ID:', taskId);
    
    // 获取最新的token，确保每次调用都使用最新token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    return request({
      url: `/pdf/task/${taskId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      }
    }).then(response => {
      console.log('PDF去水印任务查询成功:', response);
      return response;
    }).catch(error => {
      console.error('PDF去水印任务查询失败:', error);
      
      // 检查是否为token过期错误
      if (error.message && (error.message.includes('登录已过期') || error.message.includes('未授权'))) {
        // 清除失效的token
        uni.removeStorageSync('token');
      }
      
      throw error;
    });
  }
};

export default pdfWatermarkApi; 