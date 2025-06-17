<template>
  <view class="feedback-container">
    <!-- Status bar height placeholder -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- Feedback Form -->
    <view class="form-container">
      <!-- Feedback Type -->
      <view class="form-group">
        <text class="form-label">反馈类型<text class="required">*</text></text>
        <view class="feedback-types">
          <view
            v-for="(type, index) in feedbackTypes"
            :key="index"
            class="type-tag"
            :class="{ 'type-tag-selected': selectedType === type.value }"
            @tap="selectType(type.value)"
          >
            <text class="type-text">{{ type.label }}</text>
          </view>
        </view>
      </view>

      <!-- Feedback Content -->
      <view class="form-group">
        <text class="form-label">反馈内容<text class="required">*</text></text>
        <view class="textarea-container">
          <textarea
            class="feedback-content"
            v-model="content"
            placeholder="请详细描述您遇到的问题或建议..."
            :maxlength="500"
            auto-height
          ></textarea>
          <text class="word-count">{{ content.length }}/500</text>
        </view>
      </view>

      <!-- Screenshot Upload -->
      <view class="form-group">
        <text class="form-label">截图上传（选填）</text>
        <view class="upload-area">
          <view class="image-list">
            <view v-for="(image, index) in images" :key="index" class="image-item">
              <image :src="image" mode="aspectFill" class="preview-image"></image>
              <view class="delete-image" @tap="deleteImage(index)">×</view>
            </view>

            <view class="upload-button" @tap="chooseImage" v-if="images.length < 3">
              <text class="upload-icon">+</text>
              <text class="upload-text">上传图片</text>
            </view>
          </view>
          <text class="upload-tip">您最多可上传3张截图，每张不超过5MB</text>
        </view>
      </view>

      <!-- Contact Info -->
      <view class="form-group">
        <text class="form-label">联系方式（选填）</text>
        <input
          class="contact-input"
          v-model="contact"
          placeholder="填写您的邮箱或手机号，方便我们联系您"
          maxlength="50"
        />
      </view>
    </view>

    <!-- Submit Button -->
    <button
      class="submit-button"
      :disabled="!isValid || isSubmitting"
      :class="{ 'button-disabled': !isValid || isSubmitting }"
      @tap="submitFeedback"
    >
      {{ isSubmitting ? "提交中..." : "提交反馈" }}
    </button>

    <!-- Success Popup -->
    <view class="popup-mask" v-if="showSuccessPopup" @tap="closeSuccessPopup">
      <view class="success-popup" @tap.stop>
        <view class="success-icon">✓</view>
        <text class="success-title">提交成功</text>
        <text class="success-message">感谢您的反馈，我们会认真考虑您的意见！</text>
        <button class="close-button" @tap="closeSuccessPopup">确定</button>
      </view>
    </view>
  </view>
</template>

<script>
// 导入反馈API模块
import {
  submitFeedback,
  uploadFeedbackImage,
  uploadFeedbackImages,
} from "../../api/feedbackApi.js";

export default {
  data() {
    return {
      statusBarHeight: 44,
      feedbackTypes: [
        { label: "功能建议", value: "feature_suggestion" },
        { label: "产品体验", value: "user_experience" },
        { label: "问题反馈", value: "bug_report" },
        { label: "其他", value: "other" },
      ],
      selectedType: "",
      content: "",
      contact: "",
      images: [],
      imageFiles: [], // For API upload
      isSubmitting: false,
      showSuccessPopup: false,
      token: "",
      logger: null,
      baseApiUrl: "",
    };
  },
  computed: {
    isValid() {
      return this.selectedType && this.content.trim().length > 0;
    },
  },
  onLoad() {
    // Initialize logger
    this.initLogger();

    // Get system info for status bar height
    const systemInfo = uni.getSystemInfoSync();
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.logger.info("System status bar height: " + this.statusBarHeight);

    // Initialize baseApiUrl
    this.initBaseApiUrl();

    // Get token from storage
    this.token = uni.getStorageSync("token") || "";
    if (!this.token) {
      this.logger.warn("No token found, redirecting to login");
      uni.redirectTo({
        url: "/pages/login/login",
      });
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
          console.info("[FeedbackPage][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[FeedbackPage][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[FeedbackPage][ERROR] " + message, error);
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

    // Go back to previous page
    goBack() {
      uni.navigateBack();
    },

    // Select feedback type
    selectType(type) {
      this.selectedType = type;
      this.logger.info("Selected feedback type: " + type);
    },

    // Choose image from gallery or camera
    chooseImage() {
      if (this.images.length >= 3) {
        uni.showToast({
          title: "最多上传3张图片",
          icon: "none",
        });
        return;
      }

      this.logger.info("Opening image selection");
      uni.chooseImage({
        count: 3 - this.images.length,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (res) => {
          // Check file size
          const newImages = res.tempFilePaths;
          const newFiles = res.tempFiles;

          let validImages = [];
          let validFiles = [];

          // Check each file
          newFiles.forEach((file, index) => {
            if (file.size > 5 * 1024 * 1024) {
              // 5MB
              uni.showToast({
                title: "图片不能超过5MB",
                icon: "none",
              });
            } else {
              validImages.push(newImages[index]);
              validFiles.push(file);
            }
          });

          this.logger.info("Added " + validImages.length + " images");
          this.images = [...this.images, ...validImages].slice(0, 3);
          this.imageFiles = [...this.imageFiles, ...validFiles].slice(0, 3);
        },
        fail: (err) => {
          this.logger.error("Image selection failed", err);
        },
      });
    },

    // Delete image by index
    deleteImage(index) {
      this.logger.info("Deleting image at index: " + index);
      this.images.splice(index, 1);
      this.imageFiles.splice(index, 1);
    },

    // Upload images and return URLs
    async uploadImages() {
      this.logger.info("Uploading " + this.images.length + " images");

      try {
        const imageUrls = await uploadFeedbackImages(this.images);
        this.logger.info(
          "Images uploaded successfully, URLs: " + JSON.stringify(imageUrls)
        );
        return imageUrls;
      } catch (error) {
        this.logger.error("Error uploading images: " + error.message, error);
        uni.showToast({
          title: "图片上传失败",
          icon: "none",
        });
        throw error; // Re-throw to be caught by the submission process
      }
    },

    // Submit feedback to API
    async submitFeedback() {
      if (!this.isValid) {
        uni.showToast({
          title: "请填写必填项",
          icon: "none",
        });
        return;
      }

      this.isSubmitting = true;
      this.logger.info("Submitting feedback");

      uni.showLoading({
        title: "提交中...",
      });

      try {
        // Upload images first if any
        let imageUrls = [];
        if (this.images.length > 0) {
          imageUrls = await this.uploadImages();
        }

        // Submit feedback data
        const feedbackData = {
          type: this.selectedType,
          content: this.content,
          contact: this.contact,
          images: imageUrls,
        };

        this.logger.info("Submitting feedback data: " + JSON.stringify(feedbackData));

        // 使用API封装模块的submitFeedback方法
        const res = await submitFeedback(feedbackData);

        if (res.success || res.code === 0) {
          this.logger.info("Feedback submitted successfully");

          // Show success popup
          this.showSuccessPopup = true;

          // Clear form
          this.selectedType = "";
          this.content = "";
          this.contact = "";
          this.images = [];
          this.imageFiles = [];
        } else {
          this.logger.error(
            "Feedback submission failed: " + (res.message || "Unknown error")
          );
          uni.showToast({
            title: res.message || "提交失败，请稍后重试",
            icon: "none",
          });
        }
      } catch (error) {
        this.logger.error("Error in feedback submission process", error);
        uni.showToast({
          title: "提交过程中出错，请重试",
          icon: "none",
        });
      } finally {
        uni.hideLoading();
        this.isSubmitting = false;
      }
    },

    // Close success popup and navigate back
    closeSuccessPopup() {
      this.showSuccessPopup = false;
      uni.navigateBack();
    },

    // 添加分享功能
    onShareAppMessage() {
      return {
        title: "AI实用宝 - 意见反馈",
        path: "/pages/feedback/feedback",
        imageUrl: "/static/feedback.png", // 使用意见反馈图标作为分享封面
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
.feedback-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 0;
}

.status-bar {
  background-color: #f5f7fa;
}

.form-container {
  padding: 0 30rpx;
  margin-top: 20rpx;
}

.form-group {
  margin-bottom: 40rpx;
}

.form-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.required {
  color: #ff4d4f;
  margin-left: 8rpx;
}

/* Feedback Types */
.feedback-types {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.type-tag {
  padding: 16rpx 30rpx;
  border-radius: 30rpx;
  background-color: #f0f2f5;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.type-tag-selected {
  background-color: rgba(74, 124, 255, 0.1);
  border-color: #4a7cff;
}

.type-text {
  font-size: 28rpx;
  color: #666;
}

.type-tag-selected .type-text {
  color: #4a7cff;
  font-weight: 500;
}

/* Feedback Content */
.textarea-container {
  position: relative;
  border-radius: 16rpx;
  background-color: white;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.feedback-content {
  width: 100%;
  min-height: 240rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #333;
}

.word-count {
  position: absolute;
  bottom: 16rpx;
  right: 20rpx;
  font-size: 24rpx;
  color: #999;
}

/* Image Upload */
.upload-area {
  margin-top: 20rpx;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.image-item {
  width: 180rpx;
  height: 180rpx;
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.preview-image {
  width: 100%;
  height: 100%;
}

.delete-image {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  color: white;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-button {
  width: 180rpx;
  height: 180rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #ccc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
}

.upload-icon {
  font-size: 48rpx;
  color: #ccc;
  margin-bottom: 10rpx;
}

.upload-text {
  font-size: 24rpx;
  color: #999;
}

.upload-tip {
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
}

/* Contact Input */
.contact-input {
  height: 90rpx;
  background-color: white;
  border-radius: 16rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

/* Submit Button */
.submit-button {
  background: linear-gradient(135deg, #614de5 0%, #4a7cff 100%);
  color: white;
  border: none;
  border-radius: 45rpx;
  margin: 60rpx 30rpx;
  padding: 30rpx 0;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 25rpx rgba(74, 124, 255, 0.25);
  transition: all 0.3s ease;
}

.button-disabled {
  background: linear-gradient(135deg, #a8a8a8 0%, #c8c8c8 100%);
  box-shadow: none;
  opacity: 0.7;
}

/* Success Popup */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.success-popup {
  width: 560rpx;
  background-color: white;
  border-radius: 24rpx;
  padding: 50rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.15);
}

.success-icon {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #52c082 0%, #3dc282 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 70rpx;
  margin-bottom: 30rpx;
}

.success-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.success-message {
  font-size: 28rpx;
  color: #666;
  text-align: center;
  margin-bottom: 40rpx;
}

.close-button {
  width: 100%;
  background: linear-gradient(135deg, #614de5 0%, #4a7cff 100%);
  color: white;
  border: none;
  border-radius: 45rpx;
  padding: 24rpx 0;
  font-size: 32rpx;
  font-weight: 500;
}
</style>
