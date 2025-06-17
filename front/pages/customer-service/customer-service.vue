<template>
  <view class="customer-service-container">
    <!-- Main Content -->
    <view class="content-container">
      <view class="qrcode-section">
        <view class="qrcode-title">
          <text>联系客服</text>
        </view>
        <view class="qrcode-description">
          <text>扫描下方二维码添加客服微信，或长按图片选择"识别图中二维码"</text>
        </view>
        <view class="qrcode-container">
          <image
            class="qrcode-image"
            src="https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/kefuxiaozhang.png"
            mode="aspectFit"
            :show-menu-by-longpress="true"
            @longpress="handleLongPress"
          ></image>
        </view>
        <view class="qrcode-tips">
          <text>长按二维码可识别或保存图片</text>
        </view>
      </view>

      <view class="service-info-section">
        <view class="service-info-title">
          <text>客服服务时间</text>
        </view>
        <view class="service-time-item">
          <view class="service-time-icon">🕙</view>
          <view class="service-time-text">工作日: 9:00 - 18:00</view>
        </view>
        <view class="service-time-item">
          <view class="service-time-icon">🕙</view>
          <view class="service-time-text">周末及节假日: 10:00 - 16:00</view>
        </view>
      </view>

      <view class="service-tips-section">
        <view class="service-tips-title">
          <text>温馨提示</text>
        </view>
        <view class="service-tip-item">
          <view class="service-tip-icon">📌</view>
          <view class="service-tip-text">添加客服微信后，请说明您的问题</view>
        </view>
        <view class="service-tip-item">
          <view class="service-tip-icon">📌</view>
          <view class="service-tip-text">我们将尽快回复您的咨询</view>
        </view>
        <view class="service-tip-item">
          <view class="service-tip-icon">📌</view>
          <view class="service-tip-text">非工作时间可能回复较慢，请您谅解</view>
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
          console.info("[CustomerServicePage][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[CustomerServicePage][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[CustomerServicePage][ERROR] " + message, error);
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
    handleLongPress() {
      this.logger.info("QR code long pressed");
      // The default context menu appears with options for the user to scan or save the QR code
    },

    // 添加分享功能
    onShareAppMessage() {
      return {
        title: "AI实用宝 - 联系客服",
        path: "/pages/customer-service/customer-service",
        imageUrl:
          "https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/kefuxiaozhang.png", // 使用客服二维码作为分享封面
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
.customer-service-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
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
  border: 1px dashed #e0e0e0;
  padding: 10rpx;
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

.service-info-section,
.service-tips-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  width: 100%;
  padding: 30rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.service-info-title,
.service-tips-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
  text-align: center;
}

.service-time-item,
.service-tip-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 0 20rpx;
}

.service-time-icon,
.service-tip-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
  min-width: 40rpx;
  display: flex;
  justify-content: center;
}

.service-time-text,
.service-tip-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
  flex: 1;
}
</style>
