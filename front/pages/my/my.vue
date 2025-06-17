<template>
  <view class="my-container">
    <!-- Status bar height placeholder -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- Header section with user info -->
    <view class="header-section">
      <view class="profile-card">
        <view class="user-profile">
          <view class="avatar-container" @tap="checkLoginAndProceed('chooseAvatar')">
            <view class="avatar">
              <image
                :src="
                  isLoggedIn
                    ? formatAvatarUrl(userInfo.avatar) || '/static/user-avatar.png'
                    : '/static/user-avatar.png'
                "
                mode="aspectFill"
              ></image>
            </view>
          </view>
          <view class="user-info">
            <text class="username">{{
              isLoggedIn ? userInfo.username || "用户名" : "未登录"
            }}</text>
            <view class="user-id-container" v-if="isLoggedIn">
              <text class="user-id" @tap="copyUserId"
                >ID: {{ userInfo.id || "12345678" }}</text
              >
            </view>
            <view class="user-id-container" v-else>
              <text class="user-id">点击头像登录账户</text>
            </view>
          </view>
          <view
            class="edit-profile-btn"
            @tap="checkLoginAndProceed('/pages/user/edit-profile')"
          >
            <text class="edit-profile-text">编辑</text>
          </view>
        </view>
      </view>

      <!-- Points Card Section -->
      <view class="menu-list" style="margin-top: 20rpx">
        <view
          class="menu-item points-balance-item"
          hover-class="menu-item-hover"
          @tap="checkLoginAndProceed('/pages/purchase/points')"
        >
          <view class="menu-icon-container points-balance-icon">
            <text class="menu-icon-text">💰</text>
          </view>
          <view class="points-balance-wrapper">
            <text class="balance-label">积分余额</text>
            <text class="points-balance-value">{{
              isLoggedIn ? userStats.points : "0"
            }}</text>
          </view>
          <!-- 在非iOS设备上显示充值按钮 -->
          <text
            v-if="!isIOSDevice"
            class="recharge-text"
            @tap.stop="checkLoginAndProceed('/pages/purchase/points')"
            >去充值</text
          >
          <!-- 在iOS设备上显示限制说明 -->
          <text v-else class="ios-limitation-text">{{ iosLimitationMessage }}</text>
          <view class="menu-arrow"></view>
        </view>

        <!-- 添加积分使用记录菜单项 -->
        <view
          class="menu-item"
          hover-class="menu-item-hover"
          @tap="checkLoginAndProceed('/pages/points/records')"
        >
          <view class="menu-icon-container points-records-icon">
            <text class="menu-icon-text">📋</text>
          </view>
          <text class="menu-text">使用记录</text>
          <view class="menu-arrow"></view>
        </view>
      </view>
    </view>

    <!-- Menu Section -->
    <view class="section-title">
      <text>支持与帮助</text>
    </view>
    <view class="menu-list">
      <view
        class="menu-item"
        hover-class="menu-item-hover"
        @tap="checkLoginAndProceed('/pages/feedback/feedback')"
      >
        <view class="menu-icon-container feedback-icon">
          <text class="menu-icon-text">📝</text>
        </view>
        <text class="menu-text">意见反馈</text>
        <view class="menu-arrow"></view>
      </view>

      <view
        class="menu-item"
        hover-class="menu-item-hover"
        @tap="navigateTo('/pages/agreement/user-agreement')"
      >
        <view class="menu-icon-container agreement-icon">
          <text class="menu-icon-text">📜</text>
        </view>
        <text class="menu-text">用户协议</text>
        <view class="menu-arrow"></view>
      </view>

      <view
        class="menu-item"
        hover-class="menu-item-hover"
        @tap="navigateTo('/pages/agreement/privacy-policy')"
      >
        <view class="menu-icon-container privacy-icon">
          <text class="menu-icon-text">🔒</text>
        </view>
        <text class="menu-text">隐私政策</text>
        <view class="menu-arrow"></view>
      </view>

      <view
        class="menu-item"
        hover-class="menu-item-hover"
        @tap="navigateTo('/pages/about/about')"
      >
        <view class="menu-icon-container about-icon">
          <text class="menu-icon-text">ℹ️</text>
        </view>
        <text class="menu-text">关于我们</text>
        <view class="menu-arrow"></view>
      </view>

      <view
        class="menu-item"
        hover-class="menu-item-hover"
        @tap="navigateTo('/pages/follow/follow')"
      >
        <view class="menu-icon-container follow-icon">
          <text class="menu-icon-text">👥</text>
        </view>
        <text class="menu-text">关注AI实用宝</text>
        <view class="menu-arrow"></view>
      </view>

      <view
        class="menu-item"
        hover-class="menu-item-hover"
        @tap="navigateTo('/pages/customer-service/customer-service')"
      >
        <view class="menu-icon-container customer-service-icon">
          <text class="menu-icon-text">🎧</text>
        </view>
        <text class="menu-text">联系客服获取积分</text>
        <view class="menu-arrow"></view>
      </view>
    </view>

    <button
      v-if="isLoggedIn"
      class="logout-button"
      hover-class="logout-button-hover"
      @tap="confirmLogout"
    >
      退出登录
    </button>
    <button
      v-else
      class="login-button"
      hover-class="login-button-hover"
      @tap="navigateToLogin"
    >
      登录账户
    </button>

    <!-- Version info -->
    <view class="version-info">
      <text>版本 {{ appVersion }}</text>
    </view>

    <!-- Login confirm popup -->
    <login-confirm-popup
      :visible="showLoginConfirmPopup"
      :message="loginConfirmMessage"
      @confirm="handleLoginConfirm"
      @cancel="handleLoginCancel"
    />
  </view>
</template>

<script>
import { isIOS, getIOSLimitationMessage } from "../../utils/platform.js";
import LoginConfirmPopup from "../../components/LoginConfirmPopup.vue";
import {
  getUserInfo,
  isLoggedIn,
  logout,
  uploadAvatar,
  updateUserInfo,
} from "../../api/userApi.js";
import { getPointsBalance } from "../../api/pointsApi.js";
import { getAppVersion } from "../../utils/config.js";

export default {
  components: {
    LoginConfirmPopup,
  },
  data() {
    return {
      statusBarHeight: 0,
      appVersion: getAppVersion(),
      userInfo: {
        username: "",
        id: "",
        avatar: "",
        phone: "",
        gender: "",
      },
      userStats: {
        points: 0,
      },
      token: "",
      logger: null,
      baseApiUrl: "",
      isLoggedIn: false,

      // Login confirm popup related
      showLoginConfirmPopup: false,
      loginConfirmMessage: "此功能需要登录后才能使用，是否前往登录？",
      pendingAction: null, // Stores the action to be executed after login

      // 平台相关
      isIOSDevice: false,
      iosLimitationMessage: "",
    };
  },
  onShareAppMessage() {
    if (this.isLoggedIn && this.userInfo.username) {
      return {
        title: `${this.userInfo.username}邀请您体验AI实用宝`,
        path: "/pages/home/home",
        imageUrl: "/static/share-my.png",
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
    } else {
      return {
        title: "AI实用宝 - 智能工具一站式解决方案",
        path: "/pages/home/home",
        imageUrl: "/static/share-my.png",
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
    }
  },
  onLoad() {
    console.log("My page loaded");
    // Initialize logger
    this.initLogger();

    // 检查是否为iOS设备
    this.isIOSDevice = isIOS();
    this.iosLimitationMessage = getIOSLimitationMessage();
    this.logger.info(`设备平台: ${this.isIOSDevice ? "iOS" : "非iOS"}`);

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

    // Initialize baseApiUrl
    this.initBaseApiUrl();

    // Get token from storage
    this.token = uni.getStorageSync("token") || "";
    this.isLoggedIn = !!this.token;

    // Load user data if logged in
    if (this.isLoggedIn) {
      this.getUserInfo();
    }
  },
  onShow() {
    console.log("My page shown");

    // 重新获取状态栏高度，确保在页面显示时是正确的
    const systemInfo = uni.getSystemInfoSync();
    // 根据不同平台设置适当的状态栏高度
    if (systemInfo.platform === "android") {
      this.statusBarHeight = systemInfo.statusBarHeight || 0;
    } else if (systemInfo.platform === "ios") {
      this.statusBarHeight = systemInfo.statusBarHeight || 20;
    } else {
      this.statusBarHeight = 0; // 其他平台设为0
    }

    // Check if token is still valid or has changed
    const currentToken = uni.getStorageSync("token") || "";
    const wasLoggedIn = this.isLoggedIn;

    // Update login status
    this.isLoggedIn = !!currentToken;
    this.token = currentToken;

    // Update user data if needed
    if (this.isLoggedIn) {
      // Token exists, get user info
      this.getUserInfo();
    } else if (wasLoggedIn && !this.isLoggedIn) {
      // User was logged in but now isn't - token was removed
      this.logger.warn("Token removed while page was hidden");
    }
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
          console.info("[MyPage][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[MyPage][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[MyPage][ERROR] " + message, error);
        },
      };
      this.logger.info("Logger initialized");
    },

    // Initialize API base URL
    initBaseApiUrl() {
      this.baseApiUrl =
        this.$baseApiUrl || (getApp().globalData ? getApp().globalData.apiBaseUrl : null);

      // Fallback to a default URL if not defined elsewhere
      if (!this.baseApiUrl) {
        this.baseApiUrl = "https://api.example.com"; // Replace with your actual default API URL
        this.logger.warn("No API base URL found, using default: " + this.baseApiUrl);
      } else {
        this.logger.info("Using API base URL: " + this.baseApiUrl);
      }
    },

    // Format avatar URL to ensure it has https:// prefix
    formatAvatarUrl(url) {
      if (!url) return "";

      // If URL already has protocol, return as is
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }

      // If it's a local file path (starts with '/' or contains 'static/'), return as is
      if (url.startsWith("/") || url.includes("static/")) {
        return url;
      }

      // If it's a temp file path (starts with 'file://'), return as is
      if (
        url.startsWith("file://") ||
        url.startsWith("_www/") ||
        url.startsWith("_doc/") ||
        url.startsWith("_downloads/")
      ) {
        return url;
      }

      // Otherwise add https:// prefix
      return "https://" + url;
    },

    // Get user information from API
    getUserInfo() {
      this.logger.info("Fetching user info");

      // 使用API封装模块的getUserInfo方法
      getUserInfo()
        .then((res) => {
          if (res.code === 0) {
            // Update user info with data from API
            const userData = res.data;
            this.logger.info(
              "User data fetched successfully: " + JSON.stringify(userData)
            );

            // Update user info
            this.userInfo = {
              username: userData.username || "未设置",
              id: userData.userId || "",
              avatar: userData.avatar || "/static/user-avatar.png",
              phone: userData.phone || "",
              gender: userData.gender || "",
            };

            // Update userStats with points from API
            this.userStats.points = userData.points || 0;
          } else {
            // Handle error
            this.logger.error(
              "Failed to get user info: " + (res.message || "Unknown error")
            );
            uni.showToast({
              title: res.message || "获取用户信息失败",
              icon: "none",
              duration: 2000,
            });
          }
        })
        .catch((err) => {
          this.logger.error("Network error while fetching user info", err);
          console.error("Failed to fetch user info:", err);
          uni.showToast({
            title: "网络错误，请稍后重试",
            icon: "none",
            duration: 2000,
          });

          // If token expired or invalid, update login status
          if (err.message === "未授权" || err.message === "登录已过期") {
            this.logger.warn("Token unauthorized, clearing token");
            uni.removeStorageSync("token");
            this.isLoggedIn = false;
            this.token = "";
          }
        });
    },

    // Copy user ID to clipboard
    copyUserId() {
      if (!this.isLoggedIn) {
        this.showLoginRequired();
        return;
      }

      this.logger.info("Copying user ID: " + this.userInfo.id);
      uni.setClipboardData({
        data: this.userInfo.id || "",
        success: () => {
          this.logger.info("User ID copied successfully");
          uni.showToast({
            title: "ID已复制",
            icon: "none",
          });
        },
      });
    },

    // Navigate to specific page
    navigateTo(url) {
      this.logger.info("Navigating to: " + url);
      uni.navigateTo({
        url: url,
        fail: (err) => {
          this.logger.error("Navigation failed: " + url, err);
          console.error("Navigation failed:", err);
          uni.showToast({
            title: "页面开发中",
            icon: "none",
          });
        },
      });
    },

    // Navigate to login page
    navigateToLogin() {
      this.logger.info("Navigating to login page");
      uni.navigateTo({
        url: "/pages/login/login?redirect=/pages/my/my",
        fail: (err) => {
          this.logger.error("Navigation to login page failed", err);
          uni.reLaunch({
            url: "/pages/login/login?redirect=/pages/my/my",
          });
        },
      });
    },

    // Check if user is logged in before proceeding with an action
    checkLoginAndProceed(action) {
      if (!this.isLoggedIn) {
        // Set the pending action and show login popup
        this.pendingAction = action;
        this.showLoginRequired();
        return;
      }

      // User is logged in, proceed with the action
      if (action === "chooseAvatar") {
        this.chooseAvatar();
      } else if (typeof action === "string" && action.startsWith("/")) {
        this.navigateTo(action);
      }
    },

    // Show login required popup
    showLoginRequired() {
      this.logger.info("Showing login required popup");
      this.showLoginConfirmPopup = true;
    },

    // Choose avatar image and update via API
    chooseAvatar() {
      if (!this.isLoggedIn) {
        this.showLoginRequired();
        return;
      }

      this.logger.info("Opening avatar selection");
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.logger.info("Avatar image selected: " + tempFilePath);

          // Store original avatar in case upload fails
          const originalAvatar = this.userInfo.avatar;

          // Update UI immediately for better UX
          this.userInfo.avatar = tempFilePath;

          // Upload avatar to server
          uni.showLoading({
            title: "上传中...",
          });

          // 使用API封装模块的uploadAvatar方法
          uploadAvatar(tempFilePath)
            .then((avatarUrl) => {
              this.logger.info("Avatar uploaded successfully: " + avatarUrl);

              // 更新用户信息
              return updateUserInfo({ avatar: avatarUrl });
            })
            .then((res) => {
              if (res.code === 0) {
                this.logger.info("User info updated with new avatar");
                uni.showToast({
                  title: "头像已更新",
                  icon: "success",
                });

                // 更新全局用户信息
                if (getApp().globalData && getApp().globalData.userInfo) {
                  getApp().globalData.userInfo.avatar = this.userInfo.avatar;
                }
              } else {
                this.logger.error(
                  "Failed to update user info with new avatar: " +
                    (res.message || "Unknown error")
                );
                uni.showToast({
                  title: res.message || "更新失败",
                  icon: "none",
                });
                // 恢复原头像
                this.userInfo.avatar = originalAvatar;
              }
            })
            .catch((err) => {
              this.logger.error("Error during avatar update process", err);
              uni.showToast({
                title: "头像更新失败",
                icon: "none",
              });
              // 恢复原头像
              this.userInfo.avatar = originalAvatar;
            })
            .finally(() => {
              uni.hideLoading();
            });
        },
        fail: (err) => {
          this.logger.error("Avatar selection failed", err);
        },
      });
    },

    // Confirm logout with dialog
    confirmLogout() {
      if (!this.isLoggedIn) {
        return;
      }

      this.logger.info("Showing logout confirmation dialog");
      uni.showModal({
        title: "退出登录",
        content: "确定要退出登录吗？",
        confirmColor: "#4a7cff",
        success: (res) => {
          if (res.confirm) {
            this.logger.info("Logout confirmed");
            this.logout();
          } else {
            this.logger.info("Logout canceled");
          }
        },
      });
    },

    // Add login confirm handlers
    handleLoginConfirm() {
      this.logger.info("User confirmed to go to login page");
      this.showLoginConfirmPopup = false;

      // Navigate to login page with the pending action stored as a query parameter
      const redirectUrl = "/pages/my/my";
      const actionParam = this.pendingAction
        ? `?action=${encodeURIComponent(this.pendingAction)}`
        : "";

      uni.navigateTo({
        url: `/pages/login/login?redirect=${redirectUrl}${actionParam}`,
        fail: (err) => {
          this.logger.error("Navigation to login page failed", err);
          // Fall back to reLaunch if navigateTo fails
          uni.reLaunch({
            url: `/pages/login/login?redirect=${redirectUrl}${actionParam}`,
          });
        },
      });

      // Clear pending action
      this.pendingAction = null;
    },

    handleLoginCancel() {
      this.logger.info("User cancelled login prompt");
      this.showLoginConfirmPopup = false;

      // Clear pending action
      this.pendingAction = null;
    },

    // Logout function
    logout() {
      if (!this.isLoggedIn) {
        return;
      }

      this.logger.info("Logging out user");
      // 显示加载提示
      uni.showLoading({
        title: "正在退出...",
      });

      // 使用API封装模块的logout方法
      logout()
        .then(() => {
          this.logger.info("Logout successful");
          this.isLoggedIn = false;
          this.token = "";

          setTimeout(() => {
            uni.hideLoading();
            uni.showToast({
              title: "已退出登录",
              icon: "success",
              duration: 1500,
            });
          }, 500);
        })
        .catch((err) => {
          this.logger.error("Logout error", err);
          // 即使API调用失败，也清除本地存储
          uni.removeStorageSync("token");
          this.isLoggedIn = false;
          this.token = "";

          setTimeout(() => {
            uni.hideLoading();
            uni.showToast({
              title: "已退出登录",
              icon: "success",
              duration: 1500,
            });
          }, 500);
        });
    },
  },
};
</script>

<style>
.my-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 0;
}

.status-bar {
  background-color: #f5f7fa;
  width: 100%;
  z-index: 100;
}

.custom-nav-bar {
  height: 90rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  position: relative;
}

.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.header-section {
  padding: 10rpx 0 0; /* 改为更小的上部填充 */
  margin-bottom: 20rpx;
  position: relative;
}

.profile-card {
  background-color: white;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.03);
  margin: 0 30rpx;
  overflow: hidden;
  padding: 30rpx;
}

.user-profile {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  z-index: 2;
}

.avatar-container {
  position: relative;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 4rpx solid #f0f2f5;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.08);
  background-color: #f0f0f0;
  transition: transform 0.3s ease;
  overflow: hidden;
}

.avatar:active {
  transform: scale(0.97);
}

.avatar image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.user-info {
  margin-left: 30rpx;
  flex: 1;
}

.username {
  font-size: 42rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.user-id-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 6rpx;
}

.user-id {
  font-size: 24rpx;
  color: #666;
  padding: 4rpx 0; /* 添加一些内边距 */
}

.user-id:active {
  opacity: 0.7; /* 点击时的视觉反馈 */
}

/* Edit profile button */
.edit-profile-btn {
  min-width: 90rpx;
  height: 56rpx;
  background-color: #f7f8fa;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.edit-profile-text {
  font-size: 26rpx;
  color: #999;
  padding: 0 16rpx;
  font-weight: 500;
}

/* Points balance styles */
.points-balance-wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
}

.balance-label {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
  margin-right: 20rpx; /* 增加与数值的间距 */
}

.points-balance-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #4a7cff; /* 蓝色字体 */
  margin-left: 0; /* 移除左边距，使用balance-label的右边距代替 */
  position: relative; /* 添加相对定位 */
  top: 0; /* 保持垂直对齐 */
}

.recharge-text {
  font-size: 24rpx;
  color: #999;
  background-color: #f7f8fa;
  padding: 6rpx 16rpx;
  border-radius: 24rpx;
  margin-right: 20rpx;
}

/* Section Title */
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #666;
  padding: 20rpx 40rpx 10rpx;
  margin-top: 20rpx;
}

/* Menu Section */
.menu-list {
  background-color: white;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.03);
  margin: 0 30rpx 20rpx;
  overflow: hidden;
  transition: all 0.3s ease;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.03);
  transition: background-color 0.2s ease;
  position: relative;
}

.menu-item-hover {
  background-color: #f9fafc;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon-container {
  width: 70rpx;
  height: 70rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  transition: transform 0.2s ease;
}

.menu-item:active .menu-icon-container {
  transform: scale(0.95);
}

.settings-icon {
  background-color: rgba(74, 124, 255, 0.1);
}

.history-icon {
  background-color: rgba(255, 175, 74, 0.1);
}

.favorites-icon {
  background-color: rgba(255, 96, 96, 0.1);
}

.points-icon {
  background: linear-gradient(
    135deg,
    rgba(116, 100, 255, 0.15) 0%,
    rgba(82, 113, 255, 0.15) 100%
  );
}

.feedback-icon {
  background-color: rgba(82, 192, 130, 0.1);
}

.about-icon {
  background-color: rgba(152, 118, 255, 0.1);
}

.menu-icon-text {
  font-size: 36rpx;
}

.menu-text {
  flex: 1;
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.menu-arrow {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid #ccc;
  border-right: 3rpx solid #ccc;
  transform: rotate(45deg);
  margin-right: 10rpx;
  transition: transform 0.2s ease;
}

.menu-item:active .menu-arrow {
  transform: rotate(45deg) translateX(4rpx);
}

/* Logout Button */
.logout-button {
  background-color: white;
  color: #f56c6c;
  border: none;
  border-radius: 16rpx;
  margin: 40rpx 30rpx;
  padding: 30rpx 0;
  font-size: 32rpx;
  font-weight: 500;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.logout-button-hover {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  background-color: #fff8f8;
}

/* Login Button */
.login-button {
  background-color: white;
  color: #4a7cff;
  border: none;
  border-radius: 16rpx;
  margin: 40rpx 30rpx;
  padding: 30rpx 0;
  font-size: 32rpx;
  font-weight: 500;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.login-button-hover {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  background-color: #f8f9ff;
}

/* Version info */
.version-info {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  padding: 20rpx 0 100rpx;
}

/* Add new styles for the new menu items */
.agreement-icon {
  background-color: rgba(94, 114, 228, 0.1);
}

.privacy-icon {
  background-color: rgba(45, 206, 137, 0.1);
}

.follow-icon {
  background-color: rgba(64, 165, 255, 0.1);
}

.customer-service-icon {
  background-color: rgba(255, 126, 64, 0.1);
}

.points-balance-item {
  padding: 30rpx; /* 与标准菜单项保持一致的填充 */
}

.points-balance-icon {
  background-color: rgba(
    255,
    193,
    7,
    0.1
  ) !important; /* 使用与其他图标类似的背景色样式 */
  border-radius: 16rpx !important; /* 与标准图标保持一致的圆角 */
  width: 70rpx !important; /* 与标准图标保持一致的尺寸 */
  height: 70rpx !important;
}

.ios-limitation-text {
  font-size: 24rpx;
  color: #999;
  padding: 4rpx 12rpx;
  background-color: #f5f7fa;
  border-radius: 12rpx;
  margin-right: 40rpx;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.points-records-icon {
  background-color: rgba(255, 193, 7, 0.1);
}
</style>
