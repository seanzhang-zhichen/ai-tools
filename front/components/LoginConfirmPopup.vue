<template>
  <view class="login-confirm-overlay" v-if="visible" @click.stop="onCancel">
    <view class="login-confirm-popup" @click.stop>
      <view class="login-confirm-header">
        <text class="login-confirm-title">{{ title || '登录提示' }}</text>
      </view>
      <view class="login-confirm-content">
        <text class="login-confirm-message">{{ message || '此功能需要登录后才能使用，是否前往登录？' }}</text>
      </view>
      <view class="login-confirm-actions">
        <view class="popup-button cancel-button" @click="onCancel">{{ cancelText }}</view>
        <view class="divider"></view>
        <view class="popup-button confirm-button" @click="onConfirm">{{ confirmText }}</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'LoginConfirmPopup',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: '需要登录'
    },
    confirmText: {
      type: String,
      default: '去登录'
    },
    cancelText: {
      type: String,
      default: '取消'
    }
  },
  methods: {
    /**
     * 确认按钮点击事件处理
     */
    onConfirm() {
      this.$emit('confirm');
    },
    
    /**
     * 取消按钮点击事件处理
     */
    onCancel() {
      this.$emit('cancel');
    }
  }
}
</script>

<style>
.login-confirm-overlay {
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

.login-confirm-popup {
  width: 75%;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.login-confirm-header {
  padding: 30rpx 40rpx 20rpx;
  text-align: center;
}

.login-confirm-title {
  font-size: 34rpx;
  font-weight: 500;
  color: #333;
}

.login-confirm-content {
  padding: 30rpx 40rpx 40rpx;
  min-height: 80rpx;
  text-align: center;
}

.login-confirm-message {
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
}

.login-confirm-actions {
  display: flex;
  border-top: 1px solid #eee;
  height: 100rpx;
}

.popup-button {
  flex: 1;
  height: 100rpx;
  line-height: 100rpx;
  text-align: center;
  font-size: 32rpx;
}

.divider {
  width: 1px;
  background-color: #eee;
}

.cancel-button {
  color: #666;
}

.confirm-button {
  color: #3a5af9;
  font-weight: 500;
}
</style> 