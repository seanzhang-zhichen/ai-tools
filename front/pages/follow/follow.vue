<template>
  <view class="follow-container">
    <!-- Main Content -->
    <view class="content-container">
      <view class="qrcode-section">
        <view class="qrcode-title">
          <text>关注公众号</text>
        </view>
        <view class="qrcode-description">
          <text>扫描下方二维码关注我们的官方公众号，或长按图片选择"识别图中二维码"</text>
        </view>
        <view class="qrcode-container">
          <image
            class="qrcode-image"
            src="https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/qrcode_for_gh_5ddcc60de8d6_860.jpg"
            mode="aspectFit"
            :show-menu-by-longpress="true"
            @longpress="handleLongPress"
          ></image>
        </view>
        <view class="qrcode-tips">
          <text>长按二维码可识别或保存图片</text>
        </view>
      </view>

      <view class="benefits-section">
        <view class="benefits-title">
          <text>关注我们，您将获得</text>
        </view>
        <view class="benefits-list">
          <view class="benefit-item">
            <view class="benefit-icon">📢</view>
            <view class="benefit-text">第一时间获取产品更新和功能发布通知</view>
          </view>
          <view class="benefit-item">
            <view class="benefit-icon">💡</view>
            <view class="benefit-text">获取实用的使用技巧和功能介绍</view>
          </view>
          <view class="benefit-item">
            <view class="benefit-icon">👨‍💻</view>
            <view class="benefit-text">获得更多客户支持和问题解答</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      statusBarHeight: 0,
      logger: null,
    };
  },
  onLoad() {
    this.initLogger();

    // Get system info for status bar height
    const systemInfo = uni.getSystemInfoSync();
    // 根据不同平台设置适当的状态栏高度
    if (systemInfo.platform === "android") {
      this.statusBarHeight = systemInfo.statusBarHeight || 0;
    } else if (systemInfo.platform === "ios") {
      this.statusBarHeight = systemInfo.statusBarHeight || 20;
    } else {
      this.statusBarHeight = 0; // 其他平台设为0
    }
    this.logger.info("System status bar height: " + this.statusBarHeight);
  },
  methods: {
    // Initialize logger
    initLogger() {
      // Only initialize if not already done
      if (this.logger) {
        return;
      }

      this.logger = {
        info: (message) => {
          console.info("[FollowPage][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[FollowPage][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[FollowPage][ERROR] " + message, error);
        },
      };
      this.logger.info("Logger initialized");
    },

    // Go back to previous page
    goBack() {
      this.logger.info("Navigating back");
      uni.navigateBack({
        fail: () => {
          // If navigateBack fails, redirect to home page
          this.logger.warn("Navigate back failed, redirecting to home page");
          uni.switchTab({
            url: "/pages/index/index",
          });
        },
      });
    },

    // Handle long press on QR code image
    // Note: This is mostly for logging purposes as the show-menu-by-longpress attribute
    // already shows the default context menu with options to identify QR code or save image
    handleLongPress() {
      this.logger.info("QR code long pressed");
      // The default context menu appears with options:
      // - 发送给朋友 (Send to friends)
      // - 收藏 (Collect)
      // - 保存图片 (Save image)
      // - 识别图片中的小程序码 (Identify mini program code in the image)
      // - 取消 (Cancel)
      // Users should select "识别图片中的小程序码" to scan and follow
    },

    // 添加分享功能
    onShareAppMessage() {
      return {
        title: "关注AI实用宝公众号，获取更多资讯",
        path: "/pages/follow/follow",
        imageUrl:
          "https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/qrcode_for_gh_5ddcc60de8d6_860.jpg", // 使用二维码作为分享封面
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
  },
};
</script>

<style>
.follow-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.status-bar {
  background-color: #ffffff;
  width: 100%;
  z-index: 100;
}

.custom-nav-bar {
  height: 90rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  position: relative;
  padding: 0 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
  font-weight: 300;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}

.nav-placeholder {
  width: 60rpx;
}

.content-container {
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qrcode-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  width: 100%;
  padding: 30rpx 20rpx;
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.qrcode-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  text-align: center;
}

.qrcode-description {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 30rpx;
  text-align: center;
  padding: 0 20rpx;
  line-height: 1.5;
}

.qrcode-container {
  width: 320rpx;
  height: 320rpx;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.qrcode-image {
  width: 300rpx;
  height: 300rpx;
}

.qrcode-tips {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
  text-align: center;
}

.benefits-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  width: 100%;
  padding: 30rpx 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.benefits-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
  text-align: center;
}

.benefits-list {
  display: flex;
  flex-direction: column;
  padding: 0 10rpx;
}

.benefit-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 20rpx;
  padding: 6rpx 0;
}

.benefit-item:last-child {
  margin-bottom: 0;
}

.benefit-icon {
  width: 50rpx;
  height: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.benefit-text {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}
</style>
