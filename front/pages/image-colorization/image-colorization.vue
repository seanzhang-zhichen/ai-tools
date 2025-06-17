<template>
  <view class="image-colorization-container">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">照片上色</text>
      <text class="subtitle">AI智能为黑白照片上色，让老照片重获生机</text>
    </view>

    <!-- 图片上传区域 -->
    <view class="upload-area" @click="chooseImage" v-if="!imageUrl">
      <view class="upload-content">
        <image class="upload-icon" src="/static/colorize.png" mode="aspectFit"></image>
        <text class="upload-text">点击选择图片</text>
        <text class="upload-hint">支持JPG、PNG、WEBP格式</text>
      </view>
    </view>

    <!-- 图片预览和编辑区域 -->
    <view v-if="imageUrl && !resultImageUrl" class="image-preview-area">
      <image
        :src="imageUrl"
        class="preview-image"
        mode="widthFix"
        @load="onImageLoad"
      ></image>

      <!-- 图片操作按钮 -->
      <view class="image-actions">
        <view class="action-btn" @click="resetImage">
          <text class="action-text">重选图片</text>
        </view>
      </view>

      <!-- 输出格式选择 -->
      <view class="option-section format-options">
        <text class="option-title">输出格式:</text>
        <view class="options-row">
          <view
            v-for="item in formatOptions"
            :key="item.value"
            class="format-option"
            :class="{ active: outputFormat === item.value }"
            @click="selectFormat(item.value)"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 处理结果对比 -->
    <view class="result-section" v-if="resultImageUrl">
      <text class="result-title">处理结果</text>

      <!-- 图片对比区域 -->
      <view class="image-comparison-container">
        <view class="comparison-wrapper">
          <!-- 处理后图片作为背景 -->
          <image
            class="result-image"
            :src="resultImageUrl"
            mode="widthFix"
            @load="onComparisonImageLoad"
          ></image>

          <!-- 原图只显示左侧部分 -->
          <view class="original-container" :style="{ width: sliderPosition + '%' }">
            <image
              class="original-image"
              :src="imageUrl"
              mode="widthFix"
              @load="onComparisonImageLoad"
            ></image>
          </view>

          <!-- 拖动分隔线 -->
          <view
            class="slider"
            :style="{ left: sliderPosition + '%' }"
            @touchstart="startSliderDrag"
            @touchmove="dragSlider"
            @touchend="endSliderDrag"
          >
            <view class="slider-line"></view>
            <view class="slider-handle">
              <view class="handle-arrow handle-arrow-left"></view>
              <view class="handle-arrow handle-arrow-right"></view>
            </view>
          </view>

          <!-- 原图标识 -->
          <view class="image-label original-label">原图</view>

          <!-- 结果标识 -->
          <view class="image-label result-label">上色后</view>
        </view>
      </view>

      <!-- 增加过期提示 -->
      <view class="expiry-warning">
        <image
          class="warning-icon"
          src="/static/icon-warning.png"
          mode="aspectFit"
        ></image>
        <text class="warning-text">请在1小时内保存图片，结果将在1小时后过期</text>
      </view>

      <view class="result-actions">
        <button class="action-btn save-btn" @click="saveImage">
          <text>保存图片</text>
        </button>
        <button class="action-btn reset-btn" @click="resetAll">
          <text class="reset-icon">↻</text>
          <text>重新处理</text>
        </button>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-section" v-if="imageUrl && !resultImageUrl">
      <view class="points-info">
        <text class="points-text">消耗积分: {{ currentPointsCost }}</text>
        <text v-if="userPoints < currentPointsCost" class="points-not-enough"
          >积分不足，当前积分: {{ userPoints }}</text
        >
      </view>
      <button
        class="process-btn"
        :disabled="isProcessing || userPoints < currentPointsCost"
        @click="processImage"
      >
        <text v-if="!isProcessing && userPoints < currentPointsCost">积分不足</text>
        <text v-else-if="!isProcessing">开始上色</text>
        <text v-else>处理中...</text>
      </button>
    </view>

    <!-- 加载中状态 -->
    <view class="loading-overlay" v-if="isProcessing">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">{{ loadingText }}</text>
        <text class="loading-progress" v-if="processingProgress > 0"
          >{{ Math.floor(processingProgress * 100) }}%</text
        >
      </view>
    </view>

    <!-- 登录弹窗组件 -->
    <login-confirm-popup
      :visible="showLoginPopup"
      :title="loginPopupTitle"
      :message="loginPopupMessage"
      :confirm-text="loginPopupConfirmText"
      :cancel-text="loginPopupCancelText"
      @confirm="goToLogin"
      @cancel="hideLoginPopup"
    />
  </view>
</template>

<script>
import visualApi from "@/api/visualApi";
import uploadHelper from "@/utils/uploadHelper";
import LoginConfirmPopup from "@/components/LoginConfirmPopup.vue";
import { getPointsConfigs } from "@/api/pointsApi";
import pointsService from "@/utils/pointsService";

export default {
  components: {
    LoginConfirmPopup,
  },
  data() {
    return {
      // 图片相关
      imageUrl: "",
      imageFile: null,
      imageWidth: 0,
      imageHeight: 0,

      // 上色相关参数
      outputFormat: "jpeg/jpg", // 默认输出格式
      formatOptions: [
        { label: "JPG", value: "jpeg/jpg" },
        { label: "PNG", value: "png" },
        { label: "WebP", value: "webp" },
      ],

      // 处理相关
      pointsCost: 60, // 默认积分消耗
      pointsConfigs: {}, // 积分配置
      pointsDescriptions: {}, // 积分描述
      isProcessing: false,
      processingProgress: 0,
      loadingText: "正在为照片上色...",

      // 结果相关
      resultImageUrl: "",

      // 对比滑块
      sliderPosition: 50, // 滑块位置百分比
      isDragging: false, // 是否正在拖动滑块

      // 用户信息
      userPoints: 0,
      isLoggedIn: false,

      // 日志
      logger: null,

      // 登录弹窗
      showLoginPopup: false,
      loginPopupTitle: "需要登录",
      loginPopupMessage: "使用照片上色功能需要先登录",
      loginPopupConfirmText: "去登录",
      loginPopupCancelText: "取消",
    };
  },
  computed: {
    currentPointsCost() {
      // 获取照片上色的积分配置
      const featureKey = "image_colorization";
      const defaultValue = 60; // 默认60积分

      const cost = pointsService.getFeaturePointsCost(featureKey, defaultValue);
      this.logger?.info(`获取照片上色积分消耗: featureKey=${featureKey}, 结果=${cost}`);
      return cost;
    },
  },
  onLoad() {
    this.initLogger();
    this.loadUserInfo();
    this.fetchPointsConfigs();
  },
  onShow() {
    // 每次页面显示时检查登录状态
    this.loadUserInfo();
    this.fetchPointsConfigs();
  },
  methods: {
    /**
     * 初始化日志记录器
     */
    initLogger() {
      this.logger = {
        info: (message) => {
          console.info("[ImageColorization][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[ImageColorization][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[ImageColorization][ERROR] " + message, error);
        },
      };
    },

    /**
     * 获取积分配置
     */
    async fetchPointsConfigs() {
      try {
        this.logger.info("开始获取积分配置...");
        const result = await pointsService.getPointsConfigsWithCache();

        this.pointsConfigs = result.configs;
        this.pointsDescriptions = result.descriptions;

        this.pointsCost = this.currentPointsCost;
        this.logger.info(`已更新照片上色积分消耗为: ${this.pointsCost}`);

        return result;
      } catch (error) {
        this.logger.error("获取积分配置出错:", error);
      }
    },

    /**
     * 加载用户信息
     */
    async loadUserInfo() {
      try {
        this.logger.info("加载用户信息...");
        const token = uni.getStorageSync("token");
        this.isLoggedIn = !!token;

        if (!this.isLoggedIn) {
          this.logger.warn("用户未登录或token已过期");
          this.userPoints = 0;
          return;
        }

        const userInfo = await visualApi.getUserInfo();

        if (userInfo && userInfo.data) {
          this.userPoints = userInfo.data.points || 0;
          this.logger.info(`用户积分: ${this.userPoints}`);
        }
      } catch (error) {
        this.logger.error("加载用户信息出错:", error);
        this.userPoints = 0;

        // 检查是否需要跳转到登录页面
        if (
          error.message &&
          (error.message.includes("登录已过期") || error.message.includes("未授权"))
        ) {
          uni.removeStorageSync("token");
          this.isLoggedIn = false;
        }
      }
    },

    /**
     * 选择图片
     */
    chooseImage() {
      // 检查登录状态
      if (!this.isLoggedIn) {
        this.showLoginPopup = true;
        return;
      }

      try {
        uni.chooseImage({
          count: 1,
          sizeType: ["original", "compressed"],
          sourceType: ["album", "camera"],
          success: (res) => {
            const tempFile = res.tempFiles[0];

            // 检查文件大小是否超过限制（15MB）
            const maxSize = 15 * 1024 * 1024;
            if (tempFile.size > maxSize) {
              uni.showToast({
                title: "图片大小不能超过15MB",
                icon: "none",
              });
              return;
            }

            this.imageUrl = res.tempFilePaths[0];
            this.imageFile = res.tempFilePaths[0];
            this.logger.info(`已选择图片: ${this.imageUrl}`);

            // 重置结果
            this.resultImageUrl = "";
          },
          fail: (error) => {
            this.logger.error("选择图片失败:", error);
            uni.showToast({
              title: "选择图片失败: " + (error.errMsg || "未知错误"),
              icon: "none",
            });
          },
        });
      } catch (error) {
        this.logger.error("选择图片操作异常:", error);
        uni.showToast({
          title: "选择图片失败: " + (error.message || "未知错误"),
          icon: "none",
        });
      }
    },

    /**
     * 图片加载完成
     */
    onImageLoad(e) {
      // 图片加载完成，记录基本信息
      if (e && e.detail) {
        const { width, height } = e.detail;
        this.imageWidth = width;
        this.imageHeight = height;
        this.logger.info(`图片尺寸: ${width}x${height}`);
      }
    },

    /**
     * 对比图片加载完成
     */
    onComparisonImageLoad() {
      // 对比图片加载后的处理
    },

    /**
     * 选择输出格式
     */
    selectFormat(format) {
      this.outputFormat = format;
    },

    /**
     * 开始拖动滑块
     */
    startSliderDrag() {
      this.isDragging = true;
    },

    /**
     * 拖动滑块
     */
    dragSlider(e) {
      if (!this.isDragging) return;

      // 获取触摸位置
      const touch = e.touches[0];

      // 获取容器信息
      const query = uni.createSelectorQuery().in(this);
      query
        .select(".comparison-wrapper")
        .boundingClientRect((data) => {
          if (!data) return;

          // 计算触摸位置相对于容器的百分比
          const containerWidth = data.width;
          const touchX = touch.clientX - data.left;
          let percentage = (touchX / containerWidth) * 100;

          // 限制在0-100之间
          percentage = Math.max(0, Math.min(100, percentage));

          // 更新滑块位置
          this.sliderPosition = percentage;
        })
        .exec();
    },

    /**
     * 结束拖动滑块
     */
    endSliderDrag() {
      this.isDragging = false;
    },

    /**
     * 重置图片
     */
    resetImage() {
      this.imageUrl = "";
      this.imageFile = null;
      this.imageWidth = 0;
      this.imageHeight = 0;
    },

    /**
     * 处理图片上色
     */
    async processImage() {
      // 检查登录状态
      if (!this.isLoggedIn) {
        this.showLoginPopup = true;
        return;
      }

      // 检查积分是否足够
      if (this.userPoints < this.currentPointsCost) {
        uni.showToast({
          title: "积分不足",
          icon: "none",
        });
        return;
      }

      // 检查是否有图片
      if (!this.imageFile && !this.imageUrl) {
        uni.showToast({
          title: "请先选择图片",
          icon: "none",
        });
        return;
      }

      try {
        this.isProcessing = true;
        this.loadingText = "正在为照片上色...";
        this.processingProgress = 0;

        // 设置参数
        const params = {
          image_file: this.imageFile,
          format: this.outputFormat,
          sync: 0, // 使用异步模式
          return_type: 1, // 返回URL
        };

        // 调用API
        const response = await visualApi.colorizeImage(params);
        console.log("照片上色处理结果:", response);

        // 处理结果
        if (response && response.data) {
          if (response.data.image) {
            this.resultImageUrl = response.data.image;
            this.userPoints -= this.currentPointsCost; // 扣除积分
          } else if (response.data.task_id) {
            // 如果是异步任务，需要查询任务状态
            await this.pollTaskStatus(response.data.task_id);
          }
        } else {
          throw new Error("处理结果无效");
        }
      } catch (error) {
        console.error("处理照片上色失败:", error);
        uni.showToast({
          title: error.message || "处理失败",
          icon: "none",
        });
      } finally {
        this.isProcessing = false;
      }
    },

    /**
     * 轮询任务状态
     */
    async pollTaskStatus(taskId) {
      return new Promise(async (resolve, reject) => {
        const maxAttempts = 30; // 最多尝试30次
        let attempts = 0;

        const checkStatus = async () => {
          try {
            if (attempts >= maxAttempts) {
              reject(new Error("处理超时，请稍后查看结果"));
              return;
            }

            attempts++;

            // 获取任务状态
            const result = await visualApi.getTaskStatus(taskId);
            console.log(`任务状态查询(${attempts}):`, result);

            if (result && result.data) {
              const taskData = result.data;

              // 更新进度
              if (taskData.progress) {
                this.processingProgress = taskData.progress / 100;
              }

              // 检查任务是否完成
              if (taskData.state === 1) {
                // 任务完成
                if (taskData.image) {
                  this.resultImageUrl = taskData.image;
                  this.userPoints -= this.currentPointsCost; // 扣除积分
                  resolve();
                } else {
                  reject(new Error("处理结果无效"));
                }
              } else if (taskData.state === 2) {
                // 任务失败
                reject(new Error(taskData.err_info || "处理失败"));
              } else {
                // 任务处理中
                setTimeout(checkStatus, 2000); // 2秒后再次查询
              }
            } else {
              reject(new Error("查询任务状态失败"));
            }
          } catch (error) {
            console.error("查询任务状态失败:", error);
            reject(error);
          }
        };

        // 开始查询
        checkStatus();
      });
    },

    /**
     * 保存图片
     */
    saveImage() {
      if (!this.resultImageUrl) {
        uni.showToast({
          title: "没有可保存的图片",
          icon: "none",
        });
        return;
      }

      uni.showLoading({
        title: "正在保存...",
      });

      // 下载图片
      uni.downloadFile({
        url: this.resultImageUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            // 保存图片到相册
            uni.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                uni.hideLoading();
                uni.showToast({
                  title: "保存成功",
                  icon: "success",
                });
              },
              fail: (err) => {
                uni.hideLoading();
                console.error("保存图片失败:", err);
                uni.showToast({
                  title: "保存失败",
                  icon: "none",
                });
              },
            });
          } else {
            uni.hideLoading();
            uni.showToast({
              title: "下载图片失败",
              icon: "none",
            });
          }
        },
        fail: (err) => {
          uni.hideLoading();
          console.error("下载图片失败:", err);
          uni.showToast({
            title: "下载图片失败",
            icon: "none",
          });
        },
      });
    },

    /**
     * 重新处理
     */
    resetAll() {
      this.resultImageUrl = "";
      this.processingProgress = 0;
    },

    /**
     * 显示登录弹窗
     */
    showLoginConfirm() {
      this.showLoginPopup = true;
    },

    /**
     * 隐藏登录弹窗
     */
    hideLoginPopup() {
      this.showLoginPopup = false;
    },

    /**
     * 跳转到登录页
     */
    goToLogin() {
      uni.navigateTo({
        url: "/pages/login/login",
      });
    },

    // 添加分享功能
    onShareAppMessage() {
      // 根据当前是否有处理结果提供不同的分享信息
      if (this.resultImageUrl) {
        return {
          title: "我用AI实用宝为黑白照片上色，效果惊艳！",
          path: "/pages/image-colorization/image-colorization",
          imageUrl: this.resultImageUrl, // 使用处理后的照片作为分享封面
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
        // 默认分享信息
        return {
          title: "AI实用宝 - 黑白照片智能上色",
          path: "/pages/image-colorization/image-colorization",
          imageUrl: "/static/colorize.png", // 使用功能图标作为分享封面
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
  },
};
</script>

<style scoped>
.image-colorization-container {
  padding: 20rpx;
}

.header {
  margin: 30rpx 0;
  text-align: center;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.subtitle {
  font-size: 24rpx;
  color: #666;
  margin-top: 10rpx;
  display: block;
}

.upload-area {
  width: 100%;
  height: 400rpx;
  background-color: #f8f8f8;
  border: 2rpx dashed #ddd;
  border-radius: 12rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30rpx;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 20rpx;
}

.upload-text {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.upload-hint {
  font-size: 24rpx;
  color: #999;
}

.image-preview-area {
  margin-bottom: 30rpx;
}

.preview-image {
  width: 100%;
  border-radius: 12rpx;
}

.image-actions {
  margin-top: 20rpx;
  display: flex;
  justify-content: center;
}

.action-btn {
  padding: 10rpx 30rpx;
  background-color: #f0f0f0;
  border-radius: 30rpx;
}

.action-text {
  font-size: 26rpx;
  color: #666;
}

.option-section {
  margin-top: 30rpx;
}

.option-title {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 15rpx;
}

.options-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.format-option {
  padding: 12rpx 30rpx;
  background-color: #f0f0f0;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
}

.format-option.active {
  background-color: #007aff;
  color: #fff;
}

.action-section {
  margin-top: 40rpx;
}

.points-info {
  text-align: center;
  margin-bottom: 20rpx;
}

.points-text {
  font-size: 28rpx;
  color: #606266;
  background: #f0f5ff;
  border-radius: 50rpx;
  padding: 8rpx 24rpx;
  display: inline-block;
}

.points-not-enough {
  font-size: 26rpx;
  color: #f56c6c;
  margin-top: 10rpx;
  display: block;
}

.process-btn {
  width: 100%;
  height: 90rpx;
  line-height: 90rpx;
  background-color: #007aff;
  color: #fff;
  font-size: 32rpx;
  border-radius: 45rpx;
  text-align: center;
}

.process-btn[disabled] {
  background-color: #cccccc;
  color: #ffffff;
}

.loading-overlay {
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

.loading-content {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid #f3f3f3;
  border-top: 6rpx solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20rpx;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.loading-progress {
  font-size: 36rpx;
  font-weight: bold;
  color: #007aff;
}

.result-section {
  margin-top: 30rpx;
}

.result-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.image-comparison-container {
  width: 100%;
  margin-bottom: 30rpx;
}

.comparison-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 12rpx;
}

.result-image {
  width: 100%;
  display: block;
}

.original-container {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  overflow: hidden;
}

.original-image {
  width: 100%;
  min-width: 100%;
  display: block;
}

.slider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4rpx;
  background-color: #fff;
  transform: translateX(-50%);
  cursor: ew-resize;
}

.slider-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 4rpx;
  background-color: #fff;
  transform: translateX(-50%);
  box-shadow: 0 0 10rpx rgba(0, 0, 0, 0.5);
}

.slider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40rpx;
  height: 40rpx;
  background-color: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10rpx rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.handle-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-top: 8rpx solid transparent;
  border-bottom: 8rpx solid transparent;
}

.handle-arrow-left {
  border-right: 8rpx solid #666;
  left: 8rpx;
}

.handle-arrow-right {
  border-left: 8rpx solid #666;
  right: 8rpx;
}

.image-label {
  position: absolute;
  top: 20rpx;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 24rpx;
  padding: 6rpx 12rpx;
  border-radius: 6rpx;
}

.original-label {
  left: 20rpx;
}

.result-label {
  right: 20rpx;
}

.expiry-warning {
  display: flex;
  align-items: center;
  background-color: #fff7e6;
  padding: 15rpx 20rpx;
  border-radius: 8rpx;
  margin-bottom: 30rpx;
}

.warning-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 10rpx;
}

.warning-text {
  font-size: 24rpx;
  color: #fa8c16;
}

.result-actions {
  display: flex;
  justify-content: space-around;
  margin-top: 30rpx;
}

.result-actions .action-btn {
  width: 40%;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 40rpx;
  font-size: 28rpx;
  color: white;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 0 30rpx;
  border: none;
}

.save-btn {
  background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
}

.reset-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff4d4f 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4rpx 12rpx rgba(255, 77, 79, 0.3);
}

.reset-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 79, 0.2);
  opacity: 0.9;
}

.reset-icon {
  font-size: 32rpx;
  font-weight: bold;
  margin-right: 6rpx;
}
</style>
