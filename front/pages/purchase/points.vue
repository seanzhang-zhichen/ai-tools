<template>
  <view class="purchase-container">
    <view class="title">{{ isIOSDevice ? "积分中心" : "购买积分" }}</view>

    <view class="current-points" v-if="currentPoints !== null">
      当前积分: {{ currentPoints }}
    </view>

    <!-- iOS平台限制提示 -->
    <view v-if="isIOSDevice" class="ios-limitation-notice">
      <view class="ios-limitation-text">❗{{ iosLimitationMessage }}</view>
    </view>

    <!-- 只在非iOS设备上显示购买选项 -->
    <template v-if="!isIOSDevice">
      <view class="options-grid">
        <view
          v-for="option in purchaseOptions"
          :key="option.id"
          class="option-card"
          :class="{ selected: selectedOption && selectedOption.id === option.id }"
          @tap="selectOption(option)"
          hover-class="option-card-hover"
        >
          <view class="points">{{ option.points }} 积分</view>
          <view class="price">¥ {{ option.amount }}</view>
        </view>
      </view>

      <button
        class="purchase-button"
        :disabled="!selectedOption || isPaying"
        @tap="initiatePurchase"
        :class="{ 'is-paying': isPaying }"
        hover-class="purchase-button-hover"
      >
        <view class="button-content">
          <view class="button-text">
            {{
              isPaying
                ? "处理中..."
                : selectedOption
                ? "立即支付 ¥" + selectedOption.amount
                : "请选择购买档位"
            }}
          </view>
          <view v-if="isPaying" class="loading-spinner"></view>
        </view>
      </button>

      <view class="payment-info">
        <!-- Make sure you have this icon or update the path -->
        <image
          src="/static/wechat-pay-icon.png"
          class="wechat-icon"
          mode="aspectFit"
        ></image>
        <text>支持微信支付</text>
      </view>
    </template>
  </view>
</template>

<script>
// 导入平台判断工具函数
import { isIOS, getIOSLimitationMessage } from "../../utils/platform.js";
// 导入积分API模块
import {
  getPointsBalance,
  getPointsOptions,
  createPaymentOrder,
  verifyPaymentStatus,
} from "../../api/pointsApi.js";
import { getUserInfo } from "../../api/userApi.js";

export default {
  data() {
    return {
      currentPoints: null, // Fetched from API
      selectedOption: null,
      purchaseOptions: [], // 将从API获取
      isPaying: false, // Prevent multiple payment attempts
      token: "",
      logger: null,
      baseApiUrl: "",
      currentOrderId: null, // 存储当前订单ID用于后续验证
      isIOSDevice: false, // 是否是iOS设备
      iosLimitationMessage: "", // iOS功能限制提示
    };
  },
  onLoad() {
    this.initLogger();
    this.initBaseApiUrl();

    // 检查是否为iOS设备
    this.isIOSDevice = isIOS();
    this.iosLimitationMessage = getIOSLimitationMessage();
    this.logger.info(`设备平台: ${this.isIOSDevice ? "iOS" : "非iOS"}`);

    this.token = uni.getStorageSync("token") || "";
    if (!this.token) {
      this.logger.warn("No token found, redirecting to login");
      uni.redirectTo({ url: "/pages/login/login" });
      return;
    }
    this.fetchCurrentPoints(); // Fetch points on load
    this.fetchPurchaseOptions(); // 获取购买选项
  },
  methods: {
    initLogger() {
      if (this.logger) return;
      this.logger = {
        info: (message) => console.info("[PurchasePoints][INFO] " + message),
        warn: (message) => console.warn("[PurchasePoints][WARN] " + message),
        error: (message, error) =>
          console.error("[PurchasePoints][ERROR] " + message, error),
      };
      this.logger.info("Logger initialized");
    },

    initBaseApiUrl() {
      // Attempt to get base URL from global data or config
      this.baseApiUrl =
        this.$baseApiUrl || (getApp().globalData ? getApp().globalData.apiBaseUrl : null);
      if (!this.baseApiUrl) {
        // !!! IMPORTANT: Replace this with your actual default backend API URL !!!
        this.baseApiUrl = "https://api.example.com";
        this.logger.warn(
          "No API base URL found in global config, using default: " + this.baseApiUrl
        );
      } else {
        this.logger.info("Using API base URL: " + this.baseApiUrl);
      }
    },

    fetchCurrentPoints() {
      this.logger.info("Fetching current points");

      // 使用API封装模块的getPointsBalance方法
      getPointsBalance()
        .then((res) => {
          if (res.code === 0) {
            this.currentPoints = res.data.points;
            this.logger.info("Current points fetched: " + this.currentPoints);
          } else {
            this.logger.warn(
              `Failed to fetch points. Message: ${res.message || "Unknown error"}`
            );
            this.currentPoints = 0; // Default to 0 if fetch fails
          }
        })
        .catch((err) => {
          this.logger.error("Network error fetching points", err);
          uni.showToast({ title: "无法获取当前积分", icon: "none" });
          this.currentPoints = 0; // Default on network error
        });
    },

    // 获取购买选项
    fetchPurchaseOptions() {
      this.logger.info("Fetching purchase options");

      // 使用API封装模块的getPointsOptions方法
      getPointsOptions()
        .then((res) => {
          if (res.code === 0 && res.data && Array.isArray(res.data)) {
            this.purchaseOptions = res.data;
            this.logger.info(`Retrieved ${this.purchaseOptions.length} purchase options`);
            // 详细打印购买选项数据
            console.info(
              "[PurchasePoints][购买选项详情] " +
                JSON.stringify(this.purchaseOptions, null, 2)
            );
          } else {
            this.logger.warn("Failed to fetch purchase options or invalid data format");
            // 使用默认选项
            this.purchaseOptions = [
              { id: 1, points: 200, amount: 1.99 },
              { id: 2, points: 1100, amount: 10 },
              { id: 3, points: 2200, amount: 20 },
              { id: 4, points: 5500, amount: 50 },
              { id: 5, points: 12000, amount: 100 },
            ];
            // 详细打印默认购买选项数据
            console.info(
              "[PurchasePoints][默认购买选项详情] " +
                JSON.stringify(this.purchaseOptions, null, 2)
            );
          }
        })
        .catch((err) => {
          this.logger.error("Network error fetching purchase options", err);
          // 使用默认选项
          this.purchaseOptions = [
            { id: 1, points: 200, amount: 1.99 },
            { id: 2, points: 1100, amount: 10 },
            { id: 3, points: 2200, amount: 20 },
            { id: 4, points: 5500, amount: 50 },
            { id: 5, points: 12000, amount: 100 },
          ];
          // 详细打印出错情况下的默认购买选项数据
          console.info(
            "[PurchasePoints][网络错误-默认购买选项详情] " +
              JSON.stringify(this.purchaseOptions, null, 2)
          );
        });
    },

    selectOption(option) {
      if (this.isPaying) return; // Prevent changing selection while payment is in progress
      this.logger.info(`Selected option: ID ${option.id}, Amount ${option.amount}`);
      this.selectedOption = option;
    },

    initiatePurchase() {
      if (!this.selectedOption || this.isPaying) {
        return;
      }
      this.logger.info(`Initiating purchase for option ID: ${this.selectedOption.id}`);
      this.isPaying = true;
      uni.showLoading({ title: "正在创建订单...", mask: true });

      // 使用API封装模块的createPaymentOrder方法
      createPaymentOrder({
        optionId: this.selectedOption.id,
        amount: this.selectedOption.amount,
        paymentMethod: "wxpay_app",
      })
        .then((res) => {
          uni.hideLoading();
          if (res.code === 0) {
            this.logger.info("Payment order created successfully by backend.");
            // 从后端响应获取支付参数
            const paymentParams = res.data;
            this.currentOrderId = paymentParams.orderId; // 保存订单ID用于后续验证

            // 调用微信支付
            this.callWxPay(paymentParams);
          } else {
            this.logger.error(
              `Failed to create payment order: ${res.message || "Unknown error"}`
            );
            uni.showToast({ title: res.message || "创建订单失败", icon: "none" });
            this.isPaying = false;
          }
        })
        .catch((err) => {
          uni.hideLoading();
          this.logger.error("Network error during payment order creation", err);
          uni.showToast({ title: "网络错误，请稍后重试", icon: "none" });
          this.isPaying = false;
        });
    },

    callWxPay(params) {
      this.logger.info("Calling uni.requestPayment with params received from backend.");
      // 确保从后端接收到所有必要参数
      if (
        !params ||
        !params.timeStamp ||
        !params.nonceStr ||
        !params.package ||
        !params.signType ||
        !params.paySign
      ) {
        this.logger.error("Missing required payment parameters from backend", params);
        uni.showToast({ title: "支付参数错误", icon: "none" });
        this.isPaying = false;
        return;
      }

      uni.requestPayment({
        provider: "wxpay",
        timeStamp: params.timeStamp, // 已经是字符串格式
        nonceStr: params.nonceStr,
        package: params.package, // 格式: "prepay_id=wx..."
        signType: params.signType, // 例如 'RSA'
        paySign: params.paySign,

        success: (res) => {
          this.logger.info("uni.requestPayment successful: " + JSON.stringify(res));
          // 成功回调只意味着用户完成了微信支付流程，不一定支付成功
          // 需要调用后端验证接口确认支付状态

          uni.showLoading({ title: "支付成功，正在确认...", mask: true });
          this.verifyPaymentStatus();
        },
        fail: (err) => {
          this.logger.error("uni.requestPayment failed: " + JSON.stringify(err));
          // 处理常见错误，如用户取消
          if (err.errMsg && err.errMsg.includes("cancel")) {
            uni.showToast({ title: "支付已取消", icon: "none" });
            // 用户取消支付时重置支付状态
            this.isPaying = false;
          } else {
            uni.showToast({ title: "支付失败，请重试", icon: "none" });
            // 其他失败情况也应重置支付状态
            this.isPaying = false;
          }
        },
        complete: () => {
          this.logger.info("uni.requestPayment process completed.");
          // 只有当支付成功且需要验证时，isPaying 才保持为 true
          // 如果支付失败或取消，在 fail 回调中已经重置 isPaying
        },
      });
    },

    // 实现支付验证方法
    verifyPaymentStatus() {
      if (!this.currentOrderId) {
        this.logger.error("No order ID available for verification");
        uni.hideLoading();
        uni.showToast({ title: "订单ID缺失，无法验证", icon: "none" });
        this.isPaying = false;
        return;
      }

      this.logger.info(`Verifying payment status for order: ${this.currentOrderId}`);

      // 使用API封装模块的verifyPaymentStatus方法
      verifyPaymentStatus(this.currentOrderId)
        .then((res) => {
          uni.hideLoading();

          if (res.code === 0) {
            // 支付成功且已验证
            uni.showToast({ title: "支付成功", icon: "success" });

            // 更新积分显示
            if (res.data && res.data.newPointsTotal !== undefined) {
              this.currentPoints = res.data.newPointsTotal;
            } else {
              // 如果没有返回新的积分余额，则刷新获取
              this.fetchCurrentPoints();
            }

            // 清除选择和订单ID
            this.selectedOption = null;
            this.currentOrderId = null;
          } else {
            // 支付验证失败
            this.logger.error(
              `Payment verification failed: ${res.message || "Unknown reason"}`
            );
            uni.showToast({
              title: res.message || "支付验证失败",
              icon: "none",
            });
          }
        })
        .catch((err) => {
          uni.hideLoading();
          this.logger.error("Network error during payment verification", err);
          uni.showToast({ title: "网络错误，无法验证支付", icon: "none" });
        })
        .finally(() => {
          // 无论成功失败，完成后重置支付状态
          this.isPaying = false;
        });
    },

    // 添加分享功能
    onShareAppMessage() {
      return {
        title: "AI实用宝 - 积分中心",
        path: "/pages/purchase/points",
        imageUrl: "/static/points.png", // 使用积分页面图标作为分享封面
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

<style scoped>
/* Scoped styles to prevent leaking */
.purchase-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 40rpx;
  box-sizing: border-box;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  text-align: center;
}

.current-points {
  font-size: 30rpx;
  color: #666;
  text-align: center;
  margin-bottom: 40rpx;
  background-color: #eef2ff;
  padding: 15rpx 20rpx;
  border-radius: 16rpx;
  display: inline-block; /* Fit content width */
  margin-left: auto;
  margin-right: auto;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30rpx;
  margin-bottom: 60rpx;
}

.option-card {
  background-color: white;
  border-radius: 20rpx;
  padding: 40rpx 20rpx;
  text-align: center;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.05);
  border: 3rpx solid transparent; /* Start transparent for smooth transition */
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.option-card-hover {
  transform: translateY(-4rpx);
  box-shadow: 0 10rpx 25rpx rgba(0, 0, 0, 0.08);
}

.option-card.selected {
  border-color: #4a7cff;
  background-color: #f0f5ff;
  box-shadow: 0 8rpx 25rpx rgba(74, 124, 255, 0.15);
}

.points {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.price {
  font-size: 32rpx;
  color: #4a7cff;
  font-weight: 500;
}

.purchase-button {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #4776e6 0%, #8e54e9 100%);
  color: white;
  font-size: 36rpx;
  font-weight: 600;
  padding: 0;
  height: 100rpx;
  width: 650rpx; /* Add fixed width */
  min-width: 650rpx; /* Ensure minimum width */
  max-width: 650rpx; /* Ensure maximum width */
  margin-left: auto; /* Center the button */
  margin-right: auto; /* Center the button */
  border-radius: 50rpx;
  box-shadow: 0 10rpx 30rpx rgba(71, 118, 230, 0.25);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  margin-bottom: 40rpx;
  border: none;
  outline: none;
  text-align: center;
  letter-spacing: 1px;
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

.button-text {
  display: inline-block;
  transition: transform 0.3s ease;
  white-space: nowrap; /* Prevent text wrapping */
  overflow: hidden; /* Hide overflow text */
  text-overflow: ellipsis; /* Show ellipsis for overflow */
  max-width: 90%; /* Limit text width to prevent overflow */
}

.button-icon {
  margin-left: 20rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.icon-arrow {
  font-size: 32rpx;
  font-weight: bold;
}

.purchase-button::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transition: left 0.7s ease;
  z-index: 0;
}

.purchase-button:not([disabled]):hover::before,
.purchase-button-hover:not([disabled])::before {
  left: 100%;
}

.purchase-button[disabled] {
  background: linear-gradient(135deg, #bdc3c7 0%, #a6acaf 100%);
  box-shadow: none;
  color: rgba(255, 255, 255, 0.7);
  opacity: 0.9;
  cursor: not-allowed;
}

.purchase-button-hover:not([disabled]) {
  transform: translateY(-3rpx) scale(1.01);
  box-shadow: 0 15rpx 35rpx rgba(71, 118, 230, 0.35);
}

.purchase-button:not([disabled]):active {
  transform: translateY(2rpx);
  box-shadow: 0 5rpx 15rpx rgba(71, 118, 230, 0.2);
}

.purchase-button.is-paying {
  background: linear-gradient(135deg, #5e7ce2 0%, #7b68ee 100%);
}

.loading-spinner {
  display: inline-block;
  width: 30rpx;
  height: 30rpx;
  margin-left: 20rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* For iPhone X and newer models - safe area bottom margin */
@supports (padding: max(0px)) {
  .payment-info {
    padding-bottom: max(20rpx, env(safe-area-inset-bottom));
  }
}

.payment-info {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #999;
  margin-top: auto; /* Push to bottom */
  /* Account for bottom safe area on iOS */
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.wechat-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 10rpx;
  vertical-align: middle; /* Align icon nicely with text */
}

/* 添加iOS限制提示样式 */
.ios-limitation-notice {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 16rpx;
  padding: 30rpx;
  margin: 30rpx 0 60rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ios-limitation-icon {
  font-size: 60rpx;
  margin-bottom: 20rpx;
}

.ios-limitation-text {
  font-size: 32rpx;
  color: #495057;
  line-height: 1.5;
}
</style>
