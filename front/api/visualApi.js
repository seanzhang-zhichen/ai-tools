import request from '@/utils/request';

/**
 * 视觉处理相关API封装
 */
const visualApi = {
  /**
   * 图片去水印处理
   * @param {Object} params - 去水印参数
   * @param {File} params.image_file - 源图像文件
   * @param {String} params.image_url - 源图像URL
   * @param {File} params.mask_file - 蒙版图像文件
   * @param {String} params.mask_url - 蒙版图像URL
   * @param {String} params.rectangles - 矩形区域JSON字符串
   * @param {Number} params.sync - 是否同步处理(0异步，1同步)
   * @param {Number} params.return_type - 结果返回类型(1=URL, 2=base64, 3=二进制)
   */
  removeWatermark(params) {
    console.log('去水印API调用参数:', params);
    
    // 获取最新的token，确保每次调用都使用最新token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    // 对于只有URL的情况
    if (!params.image_file) {
      // 微信小程序没有FormData对象，使用普通对象并设置表单格式的Content-Type
      return request({
        url: '/visual/inpaint',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        data: {
          image_url: params.image_url,
          rectangles: params.rectangles,
          mask_url: params.mask_url,
          sync: 0, // 强制使用异步模式
          return_type: params.return_type || 1,
          ...(params.callback_url ? { callback_url: params.callback_url } : {})
        }
      }).then(response => {
        console.log('去水印API请求成功:', response);
        return response;
      }).catch(error => {
        console.error('去水印API请求失败:', error);
        
        // 检查是否为token过期错误
        if (error.message.includes('登录已过期') || error.message.includes('未授权')) {
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
      
      // 添加其他参数
      if (params.rectangles) {
        formData.rectangles = params.rectangles;
      }
      if (params.mask_url) {
        formData.mask_url = params.mask_url;
      }
      
      // 强制使用异步模式(0)
      formData.sync = 0;
      formData.return_type = params.return_type || 1;
      
      if (params.callback_url) {
        formData.callback_url = params.callback_url;
      }
      
      console.log('去水印上传文件参数:', formData);
      
      uni.uploadFile({
        url: request.getBaseUrl() + '/visual/inpaint',
        filePath: params.image_file,
        name: 'image_file',
        formData: formData,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (uploadRes) => {
          try {
            console.log('去水印上传文件响应:', uploadRes);
            
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
          console.error('去水印上传文件失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 自动去水印处理
   * @param {Object} params - 去水印参数
   * @param {File} params.image_file - 源图像文件
   * @param {String} params.image_url - 源图像URL
   * @param {Number} params.sync - 是否同步处理(0异步，1同步)
   * @param {String} params.callback_url - 回调通知地址
   */
  autoRemoveWatermark(params) {
    console.log('自动去水印API调用参数:', params);
    
    // 获取最新的token，确保每次调用都使用最新token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    // 对于只有URL的情况
    if (!params.image_file) {
      // 使用普通对象并设置表单格式的Content-Type
      return request({
        url: '/visual/watermark_auto',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        data: {
          url: params.image_url,
          sync: 0, // 强制使用异步模式
          ...(params.callback_url ? { callback_url: params.callback_url } : {})
        }
      }).then(response => {
        console.log('自动去水印API请求成功:', response);
        return response;
      }).catch(error => {
        console.error('自动去水印API请求失败:', error);
        
        // 检查是否为token过期错误
        if (error.message.includes('登录已过期') || error.message.includes('未授权')) {
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
      
      // 强制使用异步模式(0)
      formData.sync = 0;
      
      if (params.callback_url) {
        formData.callback_url = params.callback_url;
      }
      
      console.log('自动去水印上传文件参数:', formData);
      
      uni.uploadFile({
        url: request.getBaseUrl() + '/visual/watermark_auto',
        filePath: params.image_file,
        name: 'file',
        formData: formData,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (uploadRes) => {
          try {
            console.log('自动去水印上传文件响应:', uploadRes);
            
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
          console.error('自动去水印上传文件失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 图片清晰化(无损放大)处理
   * @param {Object} params - 清晰化参数
   * @param {File} params.image_file - 源图像文件
   * @param {String} params.image_url - 源图像URL
   * @param {Number} params.sync - 是否同步处理(0异步，1同步)
   * @param {String} params.type - 前景类型(空=自动，person=人像，object=物品，stamp=图章)
   * @param {Number} params.return_type - 结果返回类型(1=URL, 2=base64, 3=二进制)
   * @param {Number} params.scale_factor - 放大倍数(1=不放大，2=2倍放大，4=4倍放大)
   * @param {String} params.callback_url - 回调通知地址
   */
  enhanceImage(params) {
    console.log('图片清晰化API调用参数:', params);
    
    // 获取最新的token，确保每次调用都使用最新token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    // 对于只有URL的情况
    if (!params.image_file) {
      // 使用普通对象并设置表单格式的Content-Type
      return request({
        url: '/visual/scale',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        data: {
          image_url: params.image_url,
          sync: 0, // 强制使用异步模式
          type: params.type || '',
          return_type: params.return_type || 1,
          scale_factor: params.scale_factor,
          ...(params.callback_url ? { callback_url: params.callback_url } : {})
        }
      }).then(response => {
        console.log('图片清晰化API请求成功:', response);
        return response;
      }).catch(error => {
        console.error('图片清晰化API请求失败:', error);
        
        // 检查是否为token过期错误
        if (error.message.includes('登录已过期') || error.message.includes('未授权')) {
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
      
      // 强制使用异步模式(0)
      formData.sync = 0;
      formData.return_type = params.return_type || 1;
      
      if (params.type) {
        formData.type = params.type;
      }
      
      if (params.scale_factor !== undefined) {
        formData.scale_factor = params.scale_factor;
      }
      
      if (params.callback_url) {
        formData.callback_url = params.callback_url;
      }
      
      console.log('图片清晰化上传文件参数:', formData);
      
      uni.uploadFile({
        url: request.getBaseUrl() + '/visual/scale',
        filePath: params.image_file,
        name: 'image_file',
        formData: formData,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (uploadRes) => {
          try {
            console.log('图片清晰化上传文件响应:', uploadRes);
            
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
          console.error('图片清晰化上传文件失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 获取任务处理状态
   * @param {String} taskId - 任务ID
   */
  getTaskStatus(taskId) {
    console.log(`查询任务状态: taskId=${taskId}`);
    
    // 获取最新的token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    return request({
      url: `/visual/task/${taskId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      }
    }).then(response => {
      console.log('任务状态查询结果:', response);
      // 直接返回原始响应，由调用者处理响应格式
      return response;
    }).catch(error => {
      console.error('查询任务状态失败:', error);
      
      // 检查是否为token过期错误
      if (error.message && (error.message.includes('登录已过期') || error.message.includes('未授权'))) {
        // 清除失效的token
        uni.removeStorageSync('token');
      }
      
      throw error;
    });
  },
  
  /**
   * 获取用户信息，包含积分余额
   */
  getUserInfo() {
    console.log('[VisualApi] 开始请求用户信息...');
    return request({
      url: '/user/info',
      method: 'GET',
      skipAuthRedirect: true
    }).then(response => {
      console.log('[VisualApi] 用户信息API响应:', JSON.stringify(response));
      return response;
    }).catch(error => {
      console.error('[VisualApi] 获取用户信息失败:', error);
      throw error;
    });
  },

  /**
   * AI证件照处理
   * @param {Object} params - 证件照参数
   * @param {File} params.image_file - 源图像文件
   * @param {String} params.image_url - 源图像URL
   * @param {String} params.size - 证件照尺寸，格式：{width}x{height}，例如：300x400
   * @param {String} params.format - 输出格式，png(透明背景)或jpg(白色背景)
   * @param {Number} params.sync - 是否同步处理(0异步，1同步)
   * @param {String} params.bg_color - 背景颜色，格式：RRGGBB，例如：FFFFFF
   * @param {Number} params.return_type - 结果返回类型(1=URL, 2=base64, 3=二进制)
   * @param {String} params.callback_url - 回调通知地址
   */
  createIdPhoto(params) {
    console.log('AI证件照API调用参数:', params);
    
    // 获取最新的token，确保每次调用都使用最新token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    // 对于只有URL的情况
    if (!params.image_file) {
      // 使用普通对象并设置表单格式的Content-Type
      return request({
        url: '/visual/idphoto',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        data: {
          image_url: params.image_url,
          size: params.size,
          format: params.format || 'png',
          sync: 0, // 强制使用异步模式
          bg_color: params.bg_color,
          return_type: params.return_type || 1,
          ...(params.callback_url ? { callback_url: params.callback_url } : {})
        }
      }).then(response => {
        console.log('AI证件照API请求成功:', response);
        return response;
      }).catch(error => {
        console.error('AI证件照API请求失败:', error);
        
        // 检查是否为token过期错误
        if (error.message.includes('登录已过期') || error.message.includes('未授权')) {
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
      
      // 添加其他参数
      if (params.size) {
        formData.size = params.size;
      }
      
      if (params.format) {
        formData.format = params.format;
      }
      
      if (params.bg_color) {
        formData.bg_color = params.bg_color;
      }
      
      // 强制使用异步模式(0)
      formData.sync = 0;
      formData.return_type = params.return_type || 1;
      
      if (params.callback_url) {
        formData.callback_url = params.callback_url;
      }
      
      console.log('AI证件照上传文件参数:', formData);
      
      uni.uploadFile({
        url: request.getBaseUrl() + '/visual/idphoto',
        filePath: params.image_file,
        name: 'image_file',
        formData: formData,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (uploadRes) => {
          try {
            console.log('AI证件照上传文件响应:', uploadRes);
            
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
          console.error('AI证件照上传文件失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 照片上色处理
   * @param {Object} params - 上色参数
   * @param {File} params.image_file - 源图像文件
   * @param {String} params.image_url - 源图像URL
   * @param {String} params.format - 处理后的输出格式(jpeg/jpg、png、webp)
   * @param {Number} params.sync - 是否同步处理(0异步，1同步)
   * @param {Number} params.return_type - 结果返回类型(1=URL, 2=base64, 3=二进制)
   * @param {String} params.callback_url - 回调通知地址
   */
  colorizeImage(params) {
    console.log('照片上色API调用参数:', params);
    
    // 获取最新的token，确保每次调用都使用最新token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    // 对于只有URL的情况
    if (!params.image_file) {
      // 使用普通对象并设置表单格式的Content-Type
      return request({
        url: '/visual/colorization',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        data: {
          image_url: params.image_url,
          format: params.format || 'jpeg/jpg',
          sync: 0, // 强制使用异步模式
          return_type: params.return_type || 1,
          ...(params.callback_url ? { callback_url: params.callback_url } : {})
        }
      }).then(response => {
        console.log('照片上色API请求成功:', response);
        return response;
      }).catch(error => {
        console.error('照片上色API请求失败:', error);
        
        // 检查是否为token过期错误
        if (error.message.includes('登录已过期') || error.message.includes('未授权')) {
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
      
      // 添加其他参数
      formData.format = params.format || 'jpeg/jpg';
      formData.sync = 0; // 强制使用异步模式
      formData.return_type = params.return_type || 1;
      
      if (params.callback_url) {
        formData.callback_url = params.callback_url;
      }
      
      console.log('照片上色上传文件参数:', formData);
      
      uni.uploadFile({
        url: request.getBaseUrl() + '/visual/colorization',
        filePath: params.image_file,
        name: 'image_file',
        formData: formData,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (uploadRes) => {
          try {
            console.log('照片上色上传文件响应:', uploadRes);
            
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
          console.error('照片上色上传文件失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 智能抠图处理
   * @param {Object} params - 抠图参数
   * @param {File} params.image_file - 源图像文件
   * @param {String} params.image_url - 源图像URL
   * @param {Number} params.sync - 是否同步处理(0异步，1同步)
   * @param {String} params.type - 前景类型(空=自动，person=人像，object=物品，stamp=图章)
   * @param {Number} params.return_type - 结果返回类型(1=URL, 2=base64, 3=二进制)
   * @param {Number} params.output_type - 图片返回选项(1=同时返回图片和蒙版，2=只返回图片，3=只返回蒙版)
   * @param {Number} params.crop - 是否裁剪至目标边缘(0=返回原始图像大小，1=裁剪至目标边缘)
   * @param {String} params.format - 图片格式(png=透明图片，jpg=默认白色背景的非透明图片)
   * @param {String} params.bg_color - 背景颜色，格式：RRGGBB，例如：FFFFFF，仅在format=jpg时有效
   * @param {String} params.callback_url - 回调通知地址
   */
  segmentImage(params) {
    console.log('智能抠图API调用参数:', params);
    
    // 获取最新的token，确保每次调用都使用最新token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    // 对于只有URL的情况
    if (!params.image_file) {
      // 使用普通对象并设置表单格式的Content-Type
      return request({
        url: '/visual/segmentation',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        data: {
          image_url: params.image_url,
          sync: 0, // 强制使用异步模式
          type: params.type || '',
          return_type: params.return_type || 1,
          output_type: params.output_type || 2,
          crop: params.crop || 0,
          format: params.format || 'png',
          ...(params.bg_color ? { bg_color: params.bg_color } : {}),
          ...(params.callback_url ? { callback_url: params.callback_url } : {})
        }
      }).then(response => {
        console.log('智能抠图API请求成功:', response);
        return response;
      }).catch(error => {
        console.error('智能抠图API请求失败:', error);
        
        // 检查是否为token过期错误
        if (error.message.includes('登录已过期') || error.message.includes('未授权')) {
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
      
      // 添加其他参数
      formData.sync = 0; // 强制使用异步模式
      formData.return_type = params.return_type || 1;
      formData.output_type = params.output_type || 2;
      formData.crop = params.crop || 0;
      formData.format = params.format || 'png';
      
      if (params.type) {
        formData.type = params.type;
      }
      
      if (params.bg_color) {
        formData.bg_color = params.bg_color;
      }
      
      if (params.callback_url) {
        formData.callback_url = params.callback_url;
      }
      
      console.log('智能抠图上传文件参数:', formData);
      
      uni.uploadFile({
        url: request.getBaseUrl() + '/visual/segmentation',
        filePath: params.image_file,
        name: 'image_file',
        formData: formData,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (uploadRes) => {
          try {
            console.log('智能抠图上传文件响应:', uploadRes);
            
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
          console.error('智能抠图上传文件失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 图片添加背景处理
   * @param {Object} params - 添加背景参数
   * @param {File} params.image_file - 源图像文件
   * @param {String} params.image_url - 源图像URL
   * @param {Number} params.batch_size - 每次生成图片数，默认为2张。不可超过4张
   * @param {String} params.prompt - 背景提示词
   * @param {Number} params.sync - 是否同步处理(0异步，1同步)
   * @param {String} params.callback_url - 回调通知地址
   */
  addBackground(params) {
    console.log('图片添加背景API调用参数:', params);
    
    // 获取最新的token，确保每次调用都使用最新token
    const token = uni.getStorageSync('token');
    if (!token) {
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    
    // 对于只有URL的情况
    if (!params.image_file) {
      // 使用普通对象并设置表单格式的Content-Type
      return request({
        url: '/visual/background',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        },
        data: {
          image_url: params.image_url,
          batch_size: params.batch_size || 2,
          prompt: params.prompt || '',
          sync: 0, // 强制使用异步模式
          ...(params.callback_url ? { callback_url: params.callback_url } : {})
        }
      }).then(response => {
        console.log('图片添加背景API请求成功:', response);
        return response;
      }).catch(error => {
        console.error('图片添加背景API请求失败:', error);
        
        // 检查是否为token过期错误
        if (error.message.includes('登录已过期') || error.message.includes('未授权')) {
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
      
      // 添加其他参数
      formData.sync = 0; // 强制使用异步模式
      formData.batch_size = params.batch_size || 2;
      formData.prompt = params.prompt || '';
      
      if (params.callback_url) {
        formData.callback_url = params.callback_url;
      }
      
      console.log('图片添加背景上传文件参数:', formData);
      
      uni.uploadFile({
        url: request.getBaseUrl() + '/visual/background',
        filePath: params.image_file,
        name: 'image_file',
        formData: formData,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (uploadRes) => {
          try {
            console.log('图片添加背景上传文件响应:', uploadRes);
            
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
          console.error('图片添加背景上传文件失败:', err);
          reject(err);
        }
      });
    });
  }
};

export default visualApi; 