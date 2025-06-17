<template>
  <view class="login-container">
    <!-- Status bar height placeholder -->
    <view class="status-bar"></view>

    <!-- Header with logo -->
    <view class="logo-section">
      <view class="app-logo">
        <image
          src="https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/logo.png"
          mode="aspectFill"
        ></image>
      </view>
      <text class="app-name">AI智能助手</text>
      <text class="app-slogan">让AI赋能您的生活</text>
    </view>

    <!-- Login card -->
    <view class="login-card">
      <text class="login-title">欢迎登录</text>

      <!-- WeChat login button -->
      <view
        class="wechat-login-btn"
        @tap="handleWechatLogin"
        :class="{ 'wechat-login-btn-disabled': !agreedToTerms }"
      >
        <text class="wechat-text">微信一键登录</text>
      </view>

      <!-- Agreement checkbox -->
      <view class="agreement-section">
        <view class="agreement-checkbox">
          <view
            class="checkbox"
            :class="{ checked: agreedToTerms }"
            @tap="toggleAgreement"
          ></view>
          <text class="agreement-text">我已阅读并同意</text>
          <text class="agreement-link" @tap="viewUserAgreement">《用户协议》</text>
          <text class="agreement-text">和</text>
          <text class="agreement-link" @tap="viewPrivacyPolicy">《隐私政策》</text>
        </view>
      </view>
    </view>

    <!-- App version -->
    <view class="version-info">
      <text>版本 1.0.0</text>
    </view>
  </view>
</template>

<script>
// 导入用户API模块
import { wechatLogin, login } from "../../api/userApi.js";

export default {
  data() {
    return {
      agreedToTerms: false,
      redirect: "", // 存储重定向地址
    };
  },
  onLoad(options) {
    // 检查是否有重定向参数
    if (options.redirect) {
      console.log("检测到重定向参数:", options.redirect);
      this.redirect = options.redirect;
    }
  },
  methods: {
    toggleAgreement() {
      // 切换协议同意状态
      this.agreedToTerms = !this.agreedToTerms;
      console.log("同意协议状态:", this.agreedToTerms);
    },

    viewUserAgreement() {
      // 跳转到用户协议页面
      uni.navigateTo({
        url: "/pages/agreement/user-agreement",
        success: () => {
          console.log("成功跳转到用户协议页面");
        },
        fail: (err) => {
          console.error("跳转到用户协议页面失败:", err);
        },
      });
    },

    viewPrivacyPolicy() {
      // 跳转到隐私政策页面
      uni.navigateTo({
        url: "/pages/agreement/privacy-policy",
        success: () => {
          console.log("成功跳转到隐私政策页面");
        },
        fail: (err) => {
          console.error("跳转到隐私政策页面失败:", err);
        },
      });
    },

    handleWechatLogin() {
      if (!this.agreedToTerms) {
        uni.showToast({
          title: "请阅读并同意用户协议和隐私政策",
          icon: "none",
        });
        return;
      }

      console.log("正在尝试微信登录...");

      // 检查是否在真机环境中，模拟器可能无法使用微信登录
      // #ifdef APP-PLUS
      const isSimulator = plus.device.model.toLowerCase().indexOf("simulator") > -1;
      if (isSimulator) {
        uni.showToast({
          title: "模拟器中无法使用微信登录，请使用真机测试",
          icon: "none",
          duration: 3000,
        });
        return;
      }
      // #endif

      // 获取API基础URL (提前获取，用于调试)
      const apiBaseUrl = getApp().globalData.apiBaseUrl || this.$baseApiUrl;
      console.log("API基础URL:", apiBaseUrl);

      // 构建正确的URL路径
      let correctUrl = "";
      if (apiBaseUrl.endsWith("/api")) {
        correctUrl = `${apiBaseUrl}/auth/wechat-login`;
      } else {
        correctUrl = `${apiBaseUrl}/api/auth/wechat-login`;
      }
      console.log("微信登录API URL:", correctUrl);

      // 检查微信环境
      uni.getProvider({
        service: "oauth",
        success: (res) => {
          console.log("获取服务提供商成功:", JSON.stringify(res));
          if (res.provider.indexOf("weixin") !== -1) {
            // 调用微信登录
            uni.login({
              provider: "weixin",
              success: (loginRes) => {
                console.log("微信登录成功:", JSON.stringify(loginRes));
                // 获取微信临时code
                const code = loginRes.code;
                if (!code) {
                  uni.showToast({
                    title: "获取微信授权码失败",
                    icon: "none",
                    duration: 3000,
                  });
                  return;
                }

                // 显示加载提示
                uni.showLoading({
                  title: "登录中...",
                });

                // 执行微信登录 - 只发送一次请求
                this.doWechatLogin(code, correctUrl);
              },
              fail: (err) => {
                console.error("微信登录调用失败:", JSON.stringify(err));
                uni.showToast({
                  title: "微信登录失败: " + (err.errMsg || "未知错误"),
                  icon: "none",
                  duration: 3000,
                });
              },
            });
          } else {
            console.error(
              "当前环境不支持微信登录，可用的服务提供商:",
              JSON.stringify(res.provider)
            );
            uni.showToast({
              title: "当前环境不支持微信登录",
              icon: "none",
              duration: 3000,
            });
          }
        },
        fail: (err) => {
          console.error("获取服务提供商失败:", JSON.stringify(err));
          uni.showToast({
            title: "初始化微信登录失败: " + (err.errMsg || "未知错误"),
            icon: "none",
            duration: 3000,
          });
        },
      });
    },

    // 实际执行微信登录的函数（只发送一次请求）
    doWechatLogin(code, url) {
      console.log("执行微信登录请求:", code, url);

      // 显示加载提示
      uni.showLoading({
        title: "登录中...",
      });

      // 使用API封装模块的wechatLogin方法替代直接调用uni.request
      wechatLogin(code)
        .then((res) => {
          console.log("微信登录请求响应:", JSON.stringify(res));
          if (res.code === 0) {
            // 登录成功，保存token和用户信息
            const { token, user } = res.data;

            // 保存token到本地存储
            uni.setStorageSync("token", token.access_token);

            // 保存用户信息到全局数据
            getApp().globalData.userInfo = user;

            uni.showToast({
              title: "微信登录成功",
              icon: "success",
            });

            // 登录成功后的导航逻辑
            setTimeout(() => {
              if (this.redirect) {
                // 如果有重定向地址，则导航到该地址
                console.log("正在重定向到:", this.redirect);
                // 使用reLaunch而不是navigateTo来避免返回按钮返回到登录页面
                uni.reLaunch({
                  url: this.redirect,
                  fail: (err) => {
                    console.error("重定向失败，尝试使用switchTab:", err);
                    // 如果reLaunch失败，可能是因为重定向地址是一个tab页面
                    uni.switchTab({
                      url: this.redirect,
                      fail: (switchErr) => {
                        console.error("switchTab也失败了，导航到主页:", switchErr);
                        // 如果都失败，则返回主页
                        uni.switchTab({
                          url: "/pages/home/home",
                        });
                      },
                    });
                  },
                });
              } else {
                // 没有重定向地址，导航到主页
                uni.switchTab({
                  url: "/pages/home/home",
                });
              }
            }, 1500);
          } else {
            // 登录失败
            console.error("微信登录失败，服务器响应:", JSON.stringify(res));
            uni.showToast({
              title: res.message || "微信登录失败",
              icon: "none",
              duration: 3000,
            });
          }
        })
        .catch((err) => {
          console.error("微信登录请求失败:", JSON.stringify(err));
          uni.showToast({
            title: "网络错误，请重试",
            icon: "none",
            duration: 3000,
          });
        })
        .finally(() => {
          uni.hideLoading();
        });
    },
  },
};
</script>

<style>
.login-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #dbeafe 100%);
  padding: 0;
}

.status-bar {
  height: 44px;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0 40rpx;
}

.app-logo {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  margin-bottom: 30rpx;
  border: 8rpx solid rgba(74, 124, 255, 0.15);
  background-color: white;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.1);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.app-logo image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.app-name {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.app-slogan {
  font-size: 30rpx;
  color: #666;
  margin-bottom: 50rpx;
}

.login-card {
  background: white;
  border-radius: 32rpx;
  box-shadow: 0 15rpx 40rpx rgba(0, 0, 0, 0.1);
  margin: 0 40rpx 60rpx;
  padding: 50rpx 40rpx;
  display: flex;
  flex-direction: column;
}

.login-title {
  font-size: 44rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 60rpx;
  text-align: center;
}

.checkbox {
  width: 34rpx;
  height: 34rpx;
  border: 2rpx solid #ccc;
  border-radius: 8rpx;
  margin-right: 12rpx;
  position: relative;
  transition: all 0.2s ease;
}

.checkbox.checked {
  background-color: #07c160;
  border-color: #07c160;
  box-shadow: 0 2rpx 8rpx rgba(7, 193, 96, 0.3);
}

.checkbox.checked::after {
  content: "";
  position: absolute;
  top: 6rpx;
  left: 10rpx;
  width: 14rpx;
  height: 8rpx;
  border-left: 3rpx solid #fff;
  border-bottom: 3rpx solid #fff;
  transform: rotate(-45deg);
}

.wechat-login-btn {
  width: 100%;
  height: 96rpx;
  background-color: #07c160;
  color: #fff;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: 600;
  margin: 0 0 40rpx;
  box-shadow: 0 10rpx 25rpx rgba(7, 193, 96, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.wechat-login-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 6rpx 15rpx rgba(7, 193, 96, 0.2);
}

.wechat-login-btn-disabled {
  background-color: #a9a9a9;
  box-shadow: 0 10rpx 20rpx rgba(160, 160, 160, 0.2);
  opacity: 0.8;
}

.wechat-text {
  color: white;
  font-size: 34rpx;
  font-weight: 600;
}

.version-info {
  text-align: center;
  padding: 40rpx 0;
  font-size: 24rpx;
  color: #999;
}

.agreement-section {
  margin: 10rpx 0 30rpx;
}

.agreement-checkbox {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 20rpx;
}

.agreement-text {
  font-size: 26rpx;
  color: #666;
  margin-right: 4rpx;
}

.agreement-link {
  font-size: 26rpx;
  color: #07c160;
  margin-right: 4rpx;
  font-weight: 500;
}

@font-face {
  font-family: "iconfont";
  src: url("//at.alicdn.com/t/font_2142634_vzrqsq3pde.woff2") format("woff2"),
    url("//at.alicdn.com/t/font_2142634_vzrqsq3pde.woff") format("woff"),
    url("//at.alicdn.com/t/font_2142634_vzrqsq3pde.ttf") format("truetype");
}
</style>
