/**
 * 用户API封装
 * 提供与用户认证、用户信息相关的API接口
 */
import request from '../utils/request.js';

/**
 * 用户登录
 * @param {String} username - 用户名
 * @param {String} password - 密码
 * @returns {Promise} - 返回登录结果的Promise
 */
export function login(username, password) {
  return request({
    url: '/auth/login',
    method: 'POST',
    header: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: {
      username,
      password
    }
  });
}

/**
 * 用户注册
 * @param {Object} userData - 用户注册信息
 * @param {String} userData.username - 用户名
 * @param {String} userData.password - 密码
 * @param {String} [userData.email] - 可选的邮箱
 * @param {String} [userData.full_name] - 可选的全名
 * @returns {Promise} - 返回注册结果的Promise
 */
export function register(userData) {
  return request({
    url: '/auth/register',
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: userData
  });
}

/**
 * 微信登录
 * @param {String} code - 微信授权码
 * @returns {Promise} - 返回微信登录结果的Promise
 */
export function wechatLogin(code) {
  return request({
    url: '/auth/wechat-login',
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: {
      code
    }
  });
}

/**
 * 获取用户信息
 * @param {String} [token] - 可选的用户令牌，如果不提供则使用存储的令牌
 * @returns {Promise} - 返回用户信息的Promise
 */
export function getUserInfo(token) {
  return request({
    url: '/user/info',
    method: 'GET',
    skipAuthRedirect: true
  });
}

/**
 * 更新用户信息
 * @param {Object} updateData - 要更新的用户数据
 * @param {String} [updateData.username] - 用户名
 * @param {String} [updateData.email] - 邮箱
 * @param {String} [updateData.full_name] - 全名
 * @param {String} [updateData.avatar] - 头像URL
 * @returns {Promise} - 返回更新结果的Promise
 */
export function updateUserInfo(updateData) {
  return request({
    url: '/user/update',
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: updateData
  });
}

/**
 * 登出
 * 清除本地存储的令牌
 */
export function logout() {
  try {
    uni.removeStorageSync('token');
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * 发送短信验证码
 * @param {String} phoneNumber - 手机号
 * @returns {Promise} - 返回发送结果的Promise
 */
export function sendSmsCode(phoneNumber) {
  return request({
    url: '/auth/send-sms-code',
    method: 'POST',
    data: {
      phoneNumber
    }
  });
}

/**
 * 验证短信验证码
 * @param {String} phoneNumber - 手机号
 * @param {String} code - 验证码
 * @returns {Promise} - 返回验证结果的Promise
 */
export function verifySmsCode(phoneNumber, code) {
  return request({
    url: '/auth/verify-sms-code',
    method: 'POST',
    data: {
      phoneNumber,
      code
    }
  });
}

/**
 * 检查用户是否已登录
 * @returns {Boolean} - 返回是否已登录
 */
export function isLoggedIn() {
  try {
    const token = uni.getStorageSync('token');
    return !!token;
  } catch (error) {
    console.error('检查登录状态出错:', error);
    return false;
  }
}

/**
 * 获取当前用户的令牌
 * @returns {String|null} - 返回令牌或null
 */
export function getToken() {
  try {
    return uni.getStorageSync('token');
  } catch (error) {
    console.error('获取令牌出错:', error);
    return null;
  }
}

/**
 * 上传用户头像
 * @param {String} filePath - 头像图片文件路径
 * @returns {Promise} - 返回包含图片URL的Promise
 */
export function uploadAvatar(filePath) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${getApiBaseUrl()}/upload/image`,
      filePath: filePath,
      name: 'file',
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