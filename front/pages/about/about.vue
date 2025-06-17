<template>
  <view class="about-container">
    <!-- Status bar height placeholder -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- App logo and name -->
    <view class="app-info">
      <view class="app-logo">
        <image
          src="https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/logo.png"
          mode="aspectFill"
        ></image>
      </view>
      <text class="app-name">AI 实用宝</text>
      <text class="app-version">当前版本 v{{ appVersion }}</text>
    </view>

    <!-- Company Info Card -->
    <view class="info-section">
      <view class="info-card">
        <view class="card-title">
          <view class="title-icon">🏢</view>
          <text>公司信息</text>
        </view>
        <view class="info-item">
          <text class="item-label">公司名称</text>
          <text class="item-content">杭州富阳智源数智科技工作室</text>
        </view>
        <view class="info-item">
          <text class="item-label">联系邮箱</text>
          <text class="item-content" @tap="copyEmail">zhiyuanshuzhi@163.com</text>
        </view>
        <view class="info-item">
          <text class="item-label">成立时间</text>
          <text class="item-content">2025年4月23日</text>
        </view>
      </view>
    </view>

    <!-- App Description Card -->
    <view class="info-section">
      <view class="info-card">
        <view class="card-title">
          <view class="title-icon">📱</view>
          <text>产品介绍</text>
        </view>
        <view class="description">
          <text class="description-text"
            >我们致力于打造高品质的AI内容生成工具，为用户提供便捷、高效的人工智能服务。本应用基于先进的AI技术，可以帮助用户快速生成各类内容，提高工作和学习效率。</text
          >
        </view>
        <view class="feature-list">
          <view class="feature-item">
            <view class="feature-icon">✓</view>
            <text class="feature-text">智能内容生成</text>
          </view>
          <view class="feature-item">
            <view class="feature-icon">✓</view>
            <text class="feature-text">多场景适配</text>
          </view>
          <view class="feature-item">
            <view class="feature-icon">✓</view>
            <text class="feature-text">高效便捷服务</text>
          </view>
          <view class="feature-item">
            <view class="feature-icon">✓</view>
            <text class="feature-text">持续功能更新</text>
          </view>
        </view>
      </view>
    </view>

    <!-- App Policy Links -->
    <view class="info-section">
      <view class="info-card">
        <view class="card-title">
          <view class="title-icon">📜</view>
          <text>法律信息</text>
        </view>
        <view class="policy-links">
          <view class="policy-link" @tap="navigateTo('/pages/agreement/user-agreement')">
            <text>用户协议</text>
            <view class="link-arrow"></view>
          </view>
          <view class="policy-link" @tap="navigateTo('/pages/agreement/privacy-policy')">
            <text>隐私政策</text>
            <view class="link-arrow"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- Copyright -->
    <view class="copyright">
      <text>© {{ currentYear }} 杭州富阳智源数智科技工作室</text>
      <text>版权所有</text>
    </view>
  </view>
</template>

<script>
import { getAppVersion } from "../../utils/config.js";

export default {
  data() {
    return {
      statusBarHeight: 44,
      appVersion: getAppVersion(),
      currentYear: new Date().getFullYear(),
    };
  },
  onLoad() {
    // Get system info for status bar height
    const systemInfo = uni.getSystemInfoSync();
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
  },
  // 添加分享功能
  onShareAppMessage() {
    return {
      title: "AI 实用宝 - 关于我们",
      path: "/pages/about/about",
      imageUrl: "https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/logo.png",
      success: function () {
        console.log("分享成功");
        uni.showToast({
          title: "分享成功",
          icon: "success",
        });
      },
      fail: function () {
        console.log("分享失败");
        uni.showToast({
          title: "分享失败",
          icon: "none",
        });
      },
    };
  },
  methods: {
    // Navigate back
    goBack() {
      uni.navigateBack({
        fail: () => {
          uni.switchTab({
            url: "/pages/my/my",
          });
        },
      });
    },

    // Navigate to a page
    navigateTo(url) {
      uni.navigateTo({
        url: url,
        fail: (err) => {
          console.error("Navigation failed:", err);
          uni.showToast({
            title: "页面跳转失败",
            icon: "none",
          });
        },
      });
    },

    // Copy email to clipboard
    copyEmail() {
      uni.setClipboardData({
        data: "zhiyuanshuzhi@163.com",
        success: () => {
          uni.showToast({
            title: "邮箱已复制",
            icon: "none",
          });
        },
      });
    },
  },
};
</script>

<style>
.about-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 0 0 50rpx 0;
}

.status-bar {
  background-color: #f5f7fa;
}

.header {
  display: none;
}

.placeholder {
  display: none;
}

.page-title {
  display: none;
}

.app-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0 60rpx;
  background-color: #f5f7fa;
  margin-bottom: 40rpx;
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
  font-size: 42rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.app-version {
  font-size: 28rpx;
  color: #666;
  background-color: rgba(74, 124, 255, 0.1);
  padding: 12rpx 30rpx;
  border-radius: 30rpx;
}

.info-section {
  padding: 0 30rpx;
  margin-bottom: 30rpx;
}

.info-card {
  background-color: white;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
  padding: 30rpx;
  overflow: hidden;
}

.card-title {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
  border-bottom: 2rpx solid rgba(0, 0, 0, 0.03);
  padding-bottom: 20rpx;
}

.title-icon {
  font-size: 40rpx;
  margin-right: 15rpx;
}

.card-title text {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.info-item {
  margin-bottom: 24rpx;
}

.item-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
  display: block;
}

.item-content {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
  word-break: break-all;
}

.description {
  margin-bottom: 30rpx;
}

.description-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.feature-list {
  display: flex;
  flex-direction: column;
}

.feature-item {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.feature-icon {
  width: 40rpx;
  height: 40rpx;
  background-color: rgba(74, 124, 255, 0.1);
  color: #4a7cff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  margin-right: 16rpx;
}

.feature-text {
  font-size: 28rpx;
  color: #333;
}

.policy-links {
  display: flex;
  flex-direction: column;
}

.policy-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 2rpx solid rgba(0, 0, 0, 0.03);
}

.policy-link:last-child {
  border-bottom: none;
}

.policy-link text {
  font-size: 30rpx;
  color: #333;
}

.link-arrow {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid #4a7cff;
  border-right: 3rpx solid #4a7cff;
  transform: rotate(45deg);
}

.copyright {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 60rpx;
  padding: 30rpx;
}

.copyright text {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 6rpx;
}
</style>
