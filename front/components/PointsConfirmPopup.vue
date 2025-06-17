<template>
  <view class="points-confirm-overlay" v-if="visible" @click="onCancel">
    <view class="points-confirm-popup" @click.stop>
      <view class="points-confirm-header">
        <text class="points-confirm-title">积分不足</text>
      </view>
      <view class="points-confirm-content">
        <text class="points-confirm-message">{{ message || '您的积分不足，无法完成此操作' }}</text>
        <view class="points-info" v-if="showPointsInfo">
          <view class="points-item">
            <text class="points-label">当前积分:</text>
            <text class="points-value">{{ pointsBalance }}</text>
          </view>
          <view class="points-item">
            <text class="points-label">所需积分:</text>
            <text class="points-value">{{ pointsNeeded }}</text>
          </view>
        </view>
        <!-- iOS限制提示 -->
        <view v-if="isIOSDevice" class="ios-limitation-info">
          <text class="ios-limitation-message">{{ iosLimitationMessage }}</text>
        </view>
      </view>
      <view class="points-confirm-actions">
        <button class="popup-button cancel-button" @click="onCancel">取消</button>
        <!-- 在非iOS设备上显示充值按钮 -->
        <button v-if="!isIOSDevice" class="popup-button primary-button" @click="onConfirm">去充值</button>
        <!-- 在iOS设备上显示确认按钮 -->
        <button v-else class="popup-button primary-button" @click="onCancel">确定</button>
      </view>
    </view>
  </view>
</template>

<script>
// 导入平台判断工具函数
import { isIOS, getIOSLimitationMessage } from '../utils/platform.js';

export default {
  name: 'PointsConfirmPopup',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: ''
    },
    pointsBalance: {
      type: Number,
      default: 0
    },
    pointsNeeded: {
      type: Number,
      default: 0
    },
    showPointsInfo: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      isIOSDevice: false,
      iosLimitationMessage: ''
    };
  },
  created() {
    // 检查是否为iOS设备
    this.isIOSDevice = isIOS();
    this.iosLimitationMessage = getIOSLimitationMessage();
    console.info(`[PointsConfirmPopup] 设备平台: ${this.isIOSDevice ? 'iOS' : '非iOS'}`);
  },
  methods: {
    onConfirm() {
      this.$emit('confirm');
    },
    onCancel() {
      this.$emit('cancel');
    }
  }
}
</script>

<style>
.points-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.points-confirm-popup {
  width: 80%;
  max-width: 600rpx;
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
  animation: popupFadeIn 0.3s ease-out;
}

@keyframes popupFadeIn {
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}

.points-confirm-header {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  padding: 24rpx;
  border-bottom: 1rpx solid #eee;
}

.points-confirm-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}

.points-confirm-content {
  padding: 32rpx 24rpx;
}

.points-confirm-message {
  font-size: 30rpx;
  color: #333;
  line-height: 1.5;
  margin-bottom: 20rpx;
}

.points-info {
  background-color: #f7f8fc;
  padding: 20rpx;
  border-radius: 10rpx;
  margin-bottom: 10rpx;
}

.points-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.points-item:last-child {
  margin-bottom: 0;
}

.points-label {
  font-size: 26rpx;
  color: #666;
}

.points-value {
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
}

.points-confirm-actions {
  display: flex;
  border-top: 1rpx solid #eee;
}

.popup-button {
  flex: 1;
  height: 90rpx;
  line-height: 90rpx;
  text-align: center;
  font-size: 32rpx;
  border-radius: 0;
  margin: 0;
  border: none;
}

.popup-button::after {
  border: none;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #666;
}

.primary-button {
  background-color: #2575fc;
  color: #fff;
}

/* iOS限制提示样式 */
.ios-limitation-info {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8rpx;
  padding: 16rpx;
  margin-top: 16rpx;
}

.ios-limitation-message {
  font-size: 26rpx;
  color: #6c757d;
  line-height: 1.5;
}
</style> 