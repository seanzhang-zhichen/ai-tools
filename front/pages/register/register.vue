<template>
  <view class="register-container">
    <view class="register-title">欢迎注册</view>
    <view class="input-group">
      <input 
        v-model="username" 
        placeholder="请输入用户名" 
        class="input-field" 
        @context-menu="showAccountMenu"
      />
    </view>
    <view class="input-group">
      <input 
        v-model="password" 
        type="password" 
        placeholder="请输入密码" 
        class="input-field" 
        @context-menu="showPasswordMenu"
      />
    </view>
    <view class="input-group">
      <input 
        v-model="confirmPassword" 
        type="password" 
        placeholder="请再次输入密码" 
        class="input-field" 
        @context-menu="showPasswordMenu"
      />
    </view>
    <button @click="handleRegister" class="register-button">注册</button>
    <view class="login-tip" @click="goToLogin">
      已有账号？立即登录
    </view>
  </view>
</template>

<script>
// 导入用户API模块
import { register } from '../../api/userApi.js';

export default {
  data() {
    return {
      username: '',
      password: '',
      confirmPassword: ''
    };
  },
  methods: {
    handleRegister() {
      if (!this.username.trim()) {
        uni.showToast({
          title: '请输入用户名',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      if (!this.password.trim()) {
        uni.showToast({
          title: '请输入密码',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      if (this.password !== this.confirmPassword) {
        uni.showToast({
          title: '两次输入的密码不一致',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 显示加载状态
      uni.showLoading({
        title: '注册中...',
        mask: true
      });
      
      // 使用API封装模块的register方法替代直接调用uni.request
      register({
        username: this.username,
        password: this.password
      })
        .then(res => {
          if (res.code === 0) {
            // 注册成功，保存token和用户信息
            const { token, user } = res.data;
            
            // 保存token到本地存储
            uni.setStorageSync('token', token.access_token);
            
            // 保存用户信息到全局数据
            getApp().globalData.userInfo = user;
            
            uni.showToast({
              title: '注册成功',
              icon: 'success',
              duration: 2000
            });
            
            // 跳转到主页
            setTimeout(() => {
              uni.switchTab({
                url: '/pages/home/home'
              });
            }, 2000);
          } else {
            // 注册失败
            uni.showToast({
              title: res.message || '注册失败，请重试',
              icon: 'none',
              duration: 2000
            });
          }
        })
        .catch(err => {
          console.error('注册请求失败:', err);
          uni.showToast({
            title: '网络错误，请重试',
            icon: 'none',
            duration: 2000
          });
        })
        .finally(() => {
          uni.hideLoading();
        });
    },
    goToLogin() {
      uni.reLaunch({
        url: '/pages/login/login',
        success: () => {
          console.log('成功跳转到登录页面');
        },
        fail: (err) => {
          console.error('跳转到登录页面失败:', err);
        }
      });
    },
    // 账号输入框长按菜单
    showAccountMenu() {
      uni.showActionSheet({
        itemList: ['复制', '粘贴'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 复制操作
            uni.setClipboardData({
              data: this.username,
              success: () => {
                uni.showToast({
                  title: '复制成功',
                  icon: 'none'
                });
              }
            });
          } else if (res.tapIndex === 1) {
            // 粘贴操作
            uni.getClipboardData({
              success: (res) => {
                this.username = res.data;
              }
            });
          }
        }
      });
    },
    // 密码输入框长按菜单
    showPasswordMenu() {
      uni.showActionSheet({
        itemList: ['粘贴'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 粘贴操作
            uni.getClipboardData({
              success: (res) => {
                if (this.password === '') {
                  this.password = res.data;
                } else {
                  this.confirmPassword = res.data;
                }
              }
            });
          }
        }
      });
    }
  }
};
</script>

<style>
.register-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f5f5f5;
  padding: 40rpx;
}

.register-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 80rpx;
}

.input-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 40rpx;
}

.input-field {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #ccc;
  border-radius: 40rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
  background-color: #fff;
}

.register-button {
  width: 100%;
  height: 80rpx;
  background-color: #007aff;
  color: #fff;
  border-radius: 40rpx;
  font-size: 32rpx;
  margin-bottom: 40rpx;
}

.login-tip {
  font-size: 28rpx;
  color: #007aff;
  text-decoration: underline;
}
</style>