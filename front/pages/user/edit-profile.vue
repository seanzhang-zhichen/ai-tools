<template>
  <view class="edit-profile-container">
    <!-- Status bar height placeholder -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- Header with title only -->
    <view class="header">
      <view class="placeholder"></view>
      <text class="header-title">编辑个人资料</text>
      <view class="placeholder"></view>
    </view>

    <!-- Profile form -->
    <view class="profile-form">
      <!-- Avatar section -->
      <view class="avatar-section">
        <image
          class="avatar"
          :src="formatAvatarUrl(userInfo.avatar) || '/static/user-avatar.png'"
          mode="aspectFill"
        ></image>
        <view class="change-avatar-btn" @tap="chooseAvatar">更换头像</view>
      </view>

      <!-- Form items - Only keeping username field -->
      <view class="form-item">
        <text class="form-label">用户名</text>
        <textarea
          class="form-input username-input"
          v-model="userInfo.username"
          placeholder="请输入用户名"
          :maxlength="20"
          auto-height
        />
      </view>

      <view class="form-item">
        <text class="form-label">性别</text>
        <picker
          class="gender-picker"
          :value="genderIndex"
          :range="genderOptions"
          @change="onGenderChange"
        >
          <view class="form-input picker-view">
            {{ userInfo.gender || "请选择性别" }}
          </view>
        </picker>
      </view>

      <!-- Removed User ID and Stats sections -->
    </view>

    <!-- Save button -->
    <button class="save-button" @tap="saveProfile">保存</button>
  </view>
</template>

<script>
// 导入用户API模块
import { getUserInfo, updateUserInfo } from "../../api/userApi.js";

export default {
  data() {
    return {
      statusBarHeight: 44,
      token: "",
      userInfo: {
        username: "",
        id: "", // Keep for API compatibility but not displayed
        avatar: "",
        phone: "",
        gender: "",
      },
      originalUserInfo: null,
      logger: null,
      isSubmitting: false,
      baseApiUrl: "",
      genderIndex: 0,
      genderOptions: ["男", "女"],
    };
  },
  onLoad() {
    // Initialize logger
    this.initLogger();
    this.logger.info("Edit profile page loaded");

    // Get system info for status bar height
    const systemInfo = uni.getSystemInfoSync();
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    // Get token from storage
    this.token = uni.getStorageSync("token") || "";
    if (!this.token) {
      this.logger.warn("No token found, redirecting to login");
      uni.redirectTo({
        url: "/pages/login/login",
      });
      return;
    }

    // Initialize baseApiUrl
    this.initBaseApiUrl();

    // Load user data
    this.getUserInfo();
  },
  methods: {
    // Initialize logger
    initLogger() {
      this.logger = {
        info: (message) => {
          console.info("[EditProfile][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[EditProfile][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[EditProfile][ERROR] " + message, error);
        },
      };
    },

    // Initialize API base URL
    initBaseApiUrl() {
      this.baseApiUrl =
        this.$baseApiUrl || (getApp().globalData ? getApp().globalData.apiBaseUrl : null);

      // Fallback to a default URL if not defined elsewhere
      if (!this.baseApiUrl) {
        this.baseApiUrl = "https://api.example.com"; // Replace with actual default API URL
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
      this.logger.info("Fetching user info for editing");
      uni.showLoading({
        title: "加载中...",
      });

      if (!this.baseApiUrl) {
        this.logger.error("API base URL is undefined");
        uni.hideLoading();
        uni.showToast({
          title: "API配置错误",
          icon: "none",
        });
        return;
      }

      // 使用API封装模块的getUserInfo方法
      getUserInfo()
        .then((res) => {
          if (res.code === 0) {
            // Update user info with data from API
            const userData = res.data;
            this.logger.info(
              "User data fetched successfully for editing: " + JSON.stringify(userData)
            );

            // Update user info - only need username and avatar for UI
            this.userInfo = {
              username: userData.username || "",
              id: userData.userId || "", // Keep for API compatibility
              avatar: userData.avatar || "/static/user-avatar.png",
              phone: userData.phone || "",
              gender: userData.gender || "",
            };

            // Store original data for comparison when saving
            this.originalUserInfo = JSON.parse(JSON.stringify(this.userInfo));
          } else {
            // Handle error
            this.logger.error(
              "Failed to get user info for editing: " + (res.message || "Unknown error")
            );
            uni.showToast({
              title: res.message || "获取用户信息失败",
              icon: "none",
            });
          }
        })
        .catch((err) => {
          this.logger.error("Network error while fetching user info for editing", err);
          uni.showToast({
            title: "网络错误，请稍后重试",
            icon: "none",
          });

          // If token expired or invalid, redirect to login
          if (err.message === "未授权" || err.message === "登录已过期") {
            this.handleUnauthorized();
          }
        })
        .finally(() => {
          uni.hideLoading();
        });
    },

    // Choose avatar image
    chooseAvatar() {
      this.logger.info("Opening avatar selection in edit profile");
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.logger.info("Avatar image selected: " + tempFilePath);

          // Store the original avatar in case upload fails
          const originalAvatar = this.userInfo.avatar;

          // Update UI immediately for better UX
          this.userInfo.avatar = tempFilePath;

          // Check file size (max 5MB according to API docs)
          uni.getFileInfo({
            filePath: tempFilePath,
            success: (fileInfo) => {
              const maxSize = 5 * 1024 * 1024; // 5MB
              if (fileInfo.size > maxSize) {
                this.logger.warn("Avatar file too large: " + fileInfo.size + " bytes");
                uni.showToast({
                  title: "图片不能超过5MB",
                  icon: "none",
                });

                // Revert to original avatar
                this.userInfo.avatar = originalAvatar;
                return;
              }

              // File size is acceptable, we'll upload when the user clicks save
              this.logger.info("New avatar ready for upload: " + tempFilePath);
            },
            fail: (err) => {
              this.logger.error("Failed to get file info for avatar", err);
              // Still allow the avatar to be used if we can't check the size
            },
          });
        },
        fail: (err) => {
          this.logger.error("Avatar selection failed in edit profile", err);
        },
      });
    },

    // Validate input data
    validateData() {
      if (!this.userInfo.username.trim()) {
        uni.showToast({
          title: "用户名不能为空",
          icon: "none",
        });
        return false;
      }

      return true;
    },

    // Save profile changes
    saveProfile() {
      if (this.isSubmitting) {
        return;
      }

      this.logger.info("Saving profile changes");
      this.isSubmitting = true;

      // Check if anything has changed
      if (JSON.stringify(this.userInfo) === JSON.stringify(this.originalUserInfo)) {
        this.logger.info("No changes detected, skipping API call");
        uni.showToast({
          title: "未检测到变更",
          icon: "none",
        });
        this.isSubmitting = false;
        return;
      }

      // Check if we need to upload a new avatar (if the avatar path is a local file)
      if (this.userInfo.avatar && this.userInfo.avatar.startsWith("file://")) {
        this.uploadAvatar()
          .then((avatarUrl) => {
            // Avatar upload successful, save profile with new avatar URL
            this.userInfo.avatar = avatarUrl;
            this.saveUserInfoToAPI();
          })
          .catch((err) => {
            // Avatar upload failed, but we can still save other changes
            this.logger.error(
              "Avatar upload failed but proceeding with saving other changes",
              err
            );
            this.userInfo.avatar = this.originalUserInfo.avatar; // Revert to original avatar
            this.saveUserInfoToAPI();
          });
      } else {
        // No new avatar to upload, just save the profile
        this.saveUserInfoToAPI();
      }
    },

    // Save user info to API
    saveUserInfoToAPI() {
      uni.showLoading({
        title: "保存中...",
      });

      // Prepare data for update
      const updateData = {
        username: this.userInfo.username,
        avatar: this.userInfo.avatar,
        gender: this.userInfo.gender,
      };

      this.logger.info("Sending update to API: " + JSON.stringify(updateData));

      // 使用API封装模块的updateUserInfo方法
      updateUserInfo(updateData)
        .then((res) => {
          if (res.code === 0) {
            this.logger.info("Profile updated successfully");
            uni.showToast({
              title: "保存成功",
              icon: "success",
            });

            // Store the updated data as the original
            this.originalUserInfo = JSON.parse(JSON.stringify(this.userInfo));

            // Also update global user info if available
            if (getApp().globalData) {
              getApp().globalData.userInfo = this.userInfo;
            }

            // Go back to previous page after short delay
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          } else {
            // Update failed
            this.logger.error(
              "Failed to update profile: " + (res.message || "Unknown error")
            );
            uni.showToast({
              title: res.message || "保存失败",
              icon: "none",
            });
          }
        })
        .catch((err) => {
          this.logger.error("Network error while saving profile", err);
          uni.showToast({
            title: "网络错误，请稍后重试",
            icon: "none",
          });

          // If token expired or invalid, redirect to login
          if (err.message === "未授权" || err.message === "登录已过期") {
            this.handleUnauthorized();
          }
        })
        .finally(() => {
          uni.hideLoading();
          this.isSubmitting = false;
        });
    },

    // Handle unauthorized (token expired) scenario
    handleUnauthorized() {
      this.logger.warn("Token unauthorized, redirecting to login");
      // Clear all user data from storage
      uni.removeStorageSync("token");
      uni.removeStorageSync("userInfo");

      // Show message to user
      uni.showModal({
        title: "登录已过期",
        content: "您的登录已过期，请重新登录",
        showCancel: false,
        success: () => {
          // Redirect to login page
          uni.reLaunch({
            url: "/pages/login/login",
          });
        },
      });
    },

    // Gender picker change handler
    onGenderChange(e) {
      this.genderIndex = e.detail.value;
      this.userInfo.gender = this.genderOptions[this.genderIndex];
    },

    // 添加分享功能
    onShareAppMessage() {
      return {
        title: "AI实用宝 - 个人资料编辑",
        path: "/pages/user/edit-profile",
        imageUrl: "/static/user-avatar.png", // 使用用户头像图标作为分享封面
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
.edit-profile-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8f9fc;
  padding: 0;
}

.status-bar {
  background-color: #ffffff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 30rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid #f0f0f5;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
}

.placeholder {
  width: 70rpx;
}

.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.profile-form {
  padding: 40rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
}

.avatar {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  border: 8rpx solid rgba(74, 124, 255, 0.15);
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 30rpx;
  background-color: #f0f0f0;
  transition: transform 0.3s ease;
}

.avatar:active {
  transform: scale(0.97);
}

.change-avatar-btn {
  font-size: 30rpx;
  color: #4a7cff;
  padding: 16rpx 30rpx;
  background-color: rgba(74, 124, 255, 0.1);
  border-radius: 30rpx;
  transition: all 0.2s ease;
  box-shadow: 0 4rpx 10rpx rgba(74, 124, 255, 0.15);
}

.change-avatar-btn:active {
  transform: translateY(2rpx);
  background-color: rgba(74, 124, 255, 0.15);
  box-shadow: 0 2rpx 5rpx rgba(74, 124, 255, 0.1);
}

.form-item {
  width: 100%;
  margin-bottom: 30rpx;
  background-color: white;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.form-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}

.form-input {
  font-size: 32rpx;
  color: #333;
  padding: 16rpx 0;
  border-bottom: 1px solid #f0f0f0;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
    sans-serif;
  text-decoration-skip-ink: none;
  text-underline-offset: 2px;
}

.username-input {
  white-space: pre;
  word-break: keep-all;
  line-height: 1.5;
  text-transform: none;
  unicode-bidi: embed;
  font-variant-ligatures: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
    sans-serif;
  height: auto;
  padding: 16rpx 0;
  resize: none;
}

.save-button {
  background: linear-gradient(135deg, #614de5 0%, #4a7cff 100%);
  color: white;
  border: none;
  border-radius: 16rpx;
  margin: 60rpx auto;
  padding: 30rpx 0;
  font-size: 32rpx;
  font-weight: 500;
  box-shadow: 0 8rpx 20rpx rgba(74, 124, 255, 0.3);
  transition: all 0.2s ease;
  width: 85%;
  display: block;
}

.save-button:active {
  transform: translateY(2rpx);
  box-shadow: 0 4rpx 10rpx rgba(74, 124, 255, 0.2);
}
</style>
