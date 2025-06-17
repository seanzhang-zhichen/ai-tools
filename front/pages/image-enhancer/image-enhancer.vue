<template>
  <view class="image-enhancer-container">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">图片清晰化</text>
      <text class="subtitle">无损放大，一键提升图片清晰度</text>
    </view>

    <!-- 图片上传区域 -->
    <view class="upload-area" @click="chooseImage" v-if="!imageUrl">
      <view class="upload-content">
        <image class="upload-icon" src="/static/hd.png" mode="aspectFit"></image>
        <text class="upload-text">点击选择图片</text>
        <text class="upload-hint">支持JPG、PNG、GIF、WEBP格式</text>
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

      <!-- 放大倍数选择 -->
      <view class="option-section scale-options">
        <text class="option-title">放大倍数:</text>
        <view class="options-row">
          <view
            v-for="factor in [1, 2, 4]"
            :key="factor"
            class="scale-option"
            :class="{ active: scaleFactor === factor }"
            @click="selectScaleFactor(factor)"
          >
            <text>{{ factor === 1 ? "原始大小" : factor + "倍" }}</text>
          </view>
        </view>
      </view>

      <!-- 图像类型选择 -->
      <view class="option-section type-options">
        <text class="option-title">类型:</text>
        <view class="options-row">
          <view
            class="type-option"
            :class="{ active: imageType === 'clean' }"
            @click="selectImageType('clean')"
          >
            <text>通用清晰化</text>
          </view>
          <view
            class="type-option"
            :class="{ active: imageType === 'face' }"
            @click="selectImageType('face')"
          >
            <text>人像清晰化</text>
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
          <view class="image-label result-label">修复后</view>
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
        <text v-else-if="!isProcessing">开始处理</text>
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

      // 图片清晰化相关参数
      scaleFactor: 2, // 默认2倍放大
      imageType: "clean", // 默认通用清晰化

      // 处理相关
      pointsCost: 60, // 默认积分消耗
      pointsConfigs: {}, // 积分配置
      pointsDescriptions: {}, // 积分描述
      isProcessing: false,
      processingProgress: 0,
      loadingText: "正在处理图片...",

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
      loginPopupMessage: "使用图片清晰化功能需要先登录",
      loginPopupConfirmText: "去登录",
      loginPopupCancelText: "取消",

      // 任务状态查询
      taskCheckInterval: null, // 任务状态查询定时器
      taskId: null, // 当前任务ID
    };
  },
  computed: {
    /**
     * 获取当前功能的积分消耗
     * @returns {Number} 积分消耗值
     */
    currentPointsCost() {
      const featureKey = "scale";
      const defaultValue = 60; // 图片清晰化默认60积分

      return pointsService.getFeaturePointsCost(featureKey, defaultValue);
    },
  },
  /**
   * 添加分享功能
   */
  onShareAppMessage() {
    // 根据当前是否有处理结果提供不同的分享信息
    if (this.resultImageUrl) {
      return {
        title: "我用AI实用宝将图片清晰度提升了！快来试试",
        path: "/pages/image-enhancer/image-enhancer",
        imageUrl: this.resultImageUrl, // 直接使用处理后的图片作为分享封面
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
        title: "AI实用宝 - 图片清晰化工具",
        path: "/pages/image-enhancer/image-enhancer",
        imageUrl: "/static/hd.png", // 使用图标作为分享封面
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
    this.initLogger();
    this.loadUserInfo();
    this.fetchPointsConfigs();
  },
  onShow() {
    this.loadUserInfo();
    this.fetchPointsConfigs();
  },
  onUnload() {
    this.clearTaskCheckInterval();
  },
  methods: {
    /**
     * 初始化日志记录器
     */
    initLogger() {
      this.logger = {
        info: (message) => {
          console.info("[ImageEnhancer][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[ImageEnhancer][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[ImageEnhancer][ERROR] " + message, error);
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
        this.logger.info(`已更新图片清晰化积分消耗为: ${this.pointsCost}`);

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
    async chooseImage() {
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
     * 图片加载完成事件
     */
    onImageLoad(e) {
      // 图片加载完成，记录一些基本信息即可
      if (e && e.detail) {
        const { width, height } = e.detail;
        this.logger.info(`图片尺寸: ${width}x${height}`);
      }
    },

    /**
     * 对比图片加载完成事件
     */
    onComparisonImageLoad(e) {
      // 对比图片加载完成后的处理
      this.logger.info("对比图片加载完成");
    },

    /**
     * 选择放大倍数
     */
    selectScaleFactor(factor) {
      this.scaleFactor = factor;
      this.logger.info(`选择放大倍数: ${factor}`);
    },

    /**
     * 选择图像类型
     */
    selectImageType(type) {
      this.imageType = type;
      this.logger.info(`选择图像类型: ${type || "自动"}`);
    },

    /**
     * 开始处理图片
     */
    async processImage() {
      // 检查登录状态
      if (!this.isLoggedIn) {
        this.showLoginConfirmPopup();
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

      // 显示处理中状态
      this.isProcessing = true;
      this.processingProgress = 0;
      this.loadingText = "正在启动处理...";

      try {
        // 准备请求参数
        const params = {
          image_file: this.imageFile,
          sync: 0, // 使用异步模式
          return_type: 1, // 返回URL
          type: this.imageType,
          scale_factor: this.scaleFactor,
        };

        this.logger.info(`开始处理图片: ${JSON.stringify(params)}`);

        // 调用API处理图片
        const result = await visualApi.enhanceImage(params);

        // 处理任务结果
        if (result && result.status === 200 && result.data) {
          this.taskId = result.data.task_id;
          this.logger.info(`任务已创建, ID: ${this.taskId}`);

          // 设置状态检查定时器
          this.startTaskCheck();
          this.loadingText = "图片正在处理中...";
        } else {
          throw new Error("请求处理失败");
        }
      } catch (error) {
        this.logger.error("处理图片失败:", error);
        uni.showToast({
          title: "处理失败: " + (error.message || "未知错误"),
          icon: "none",
        });
        this.isProcessing = false;
      }
    },

    /**
     * 开始定时检查任务状态
     */
    startTaskCheck() {
      this.clearTaskCheckInterval();

      this.taskCheckInterval = setInterval(async () => {
        try {
          if (!this.taskId) {
            this.clearTaskCheckInterval();
            return;
          }

          const result = await visualApi.getTaskStatus(this.taskId);

          if (result && result.data) {
            const taskData = result.data;

            // 更新进度
            if (taskData.progress) {
              this.processingProgress = taskData.progress / 100;
            }

            // 检查任务是否完成
            if (taskData.state === 1) {
              // 完成状态
              this.resultImageUrl = taskData.image;
              this.loadingText = "处理完成";
              this.isProcessing = false;
              this.clearTaskCheckInterval();

              // 刷新用户积分
              this.loadUserInfo();

              this.logger.info(`任务完成, 结果URL: ${this.resultImageUrl}`);
            } else if (taskData.state === 2) {
              // 失败状态
              throw new Error(taskData.state_detail || "任务处理失败");
            }
          }
        } catch (error) {
          this.logger.error("检查任务状态失败:", error);
          uni.showToast({
            title: "任务检查失败: " + (error.message || "未知错误"),
            icon: "none",
          });
          this.isProcessing = false;
          this.clearTaskCheckInterval();
        }
      }, 2000); // 每2秒检查一次
    },

    /**
     * 清除任务检查定时器
     */
    clearTaskCheckInterval() {
      if (this.taskCheckInterval) {
        clearInterval(this.taskCheckInterval);
        this.taskCheckInterval = null;
      }
    },

    /**
     * 重置图片
     */
    resetImage() {
      this.imageUrl = "";
      this.imageFile = null;
      this.resultImageUrl = "";
      this.logger.info("重置图片");
    },

    /**
     * 重置所有
     */
    resetAll() {
      this.resultImageUrl = "";
      this.sliderPosition = 50;
      this.logger.info("重置处理结果");
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

      this.logger.info(`开始保存图片: ${this.resultImageUrl}`);

      // 先下载图片
      uni.downloadFile({
        url: this.resultImageUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            // 保存图片到相册
            uni.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                uni.showToast({
                  title: "保存成功",
                  icon: "success",
                });
                this.logger.info("图片保存成功");
              },
              fail: (err) => {
                this.logger.error("保存图片到相册失败:", err);
                uni.showToast({
                  title: "保存失败: " + (err.errMsg || "未知错误"),
                  icon: "none",
                });
              },
            });
          } else {
            this.logger.error("下载图片失败，状态码:", res.statusCode);
            uni.showToast({
              title: "下载图片失败",
              icon: "none",
            });
          }
        },
        fail: (err) => {
          this.logger.error("下载图片失败:", err);
          uni.showToast({
            title: "下载失败: " + (err.errMsg || "未知错误"),
            icon: "none",
          });
        },
      });
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

      // 使用uni.createSelectorQuery获取元素尺寸和位置
      const query = uni.createSelectorQuery().in(this);
      query
        .select(".image-comparison-container")
        .boundingClientRect((data) => {
          if (data) {
            // 计算滑块位置百分比
            const containerWidth = data.width;
            const touchX = touch.clientX - data.left;
            let position = (touchX / containerWidth) * 100;

            // 限制在0-100范围内
            position = Math.max(0, Math.min(100, position));

            this.sliderPosition = position;
            this.logger.info(`拖动滑块: 位置=${position}%`);
          }
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
     * 显示登录弹窗
     */
    showLoginConfirmPopup() {
      this.showLoginPopup = true;
    },

    /**
     * 隐藏登录弹窗
     */
    hideLoginPopup() {
      this.showLoginPopup = false;
    },

    /**
     * 跳转到登录页面
     */
    goToLogin() {
      this.hideLoginPopup();
      uni.navigateTo({
        url: "/pages/login/login",
      });
    },
  },
};
</script>

<style>
.image-enhancer-container {
  padding: 30rpx 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

/* 标题样式 */
.header {
  margin: 20rpx 0 30rpx;
  text-align: center;
  position: relative;
}

.title {
  font-size: 38rpx;
  font-weight: bold;
  color: #333;
  position: relative;
  display: inline-block;
  z-index: 1;
}

.title::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 5%;
  width: 90%;
  height: 8rpx;
  background: linear-gradient(
    90deg,
    rgba(58, 90, 249, 0) 0%,
    rgba(58, 90, 249, 0.7) 50%,
    rgba(58, 90, 249, 0) 100%
  );
  border-radius: 4rpx;
  z-index: -1;
}

.subtitle {
  font-size: 24rpx;
  color: #666;
  margin-top: 12rpx;
  display: block;
  letter-spacing: 1rpx;
}

/* 上传区域样式 */
.upload-area {
  height: 400rpx;
  background-color: #fff;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 30rpx 0;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  border: 2rpx dashed #ddd;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 30rpx;
}

.upload-text {
  font-size: 32rpx;
  margin-bottom: 10rpx;
  color: #333;
}

.upload-hint {
  font-size: 24rpx;
  color: #909399;
}

.image-preview-area {
  margin: 30rpx 0;
}

.preview-image {
  width: 100%;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.image-actions {
  display: flex;
  justify-content: center;
  margin: 24rpx 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 30rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  margin: 0 20rpx;
}

.option-section {
  margin: 30rpx 0;
  background-color: #f0f5ff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  border-left: 8rpx solid #0099ff;
}

.option-title {
  font-size: 30rpx;
  margin-bottom: 20rpx;
  display: block;
  color: #333;
  font-weight: 500;
}

.options-row {
  display: flex;
  flex-wrap: wrap;
}

.scale-option,
.type-option {
  background-color: #fff;
  padding: 15rpx 30rpx;
  border-radius: 40rpx;
  margin: 0 20rpx 20rpx 0;
  font-size: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.active {
  background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(58, 90, 249, 0.3);
}

.result-section {
  margin: 40rpx 0;
}

.result-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  display: block;
  text-align: center;
}

.image-comparison-container {
  position: relative;
  width: 100%;
  margin: 30rpx 0;
  overflow: hidden;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.comparison-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.result-image {
  display: block;
  width: 100%;
  height: auto;
}

.original-container {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  overflow: hidden;
  border-right: 2px solid #3a5af9;
}

.original-image {
  display: block;
  width: 100%;
  height: auto;
}

.slider {
  position: absolute;
  top: 0;
  width: 8rpx;
  height: 100%;
  background-color: #fff;
  cursor: ew-resize;
  z-index: 10;
}

.slider-line {
  position: absolute;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #3a5af9;
}

.slider-handle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 60rpx;
  height: 60rpx;
  background-color: #3a5af9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10rpx rgba(0, 0, 0, 0.3);
}

.handle-arrow {
  position: absolute;
  top: 50%;
  width: 0;
  height: 0;
  border-top: 10rpx solid transparent;
  border-bottom: 10rpx solid transparent;
}

.handle-arrow-left {
  left: 10rpx;
  border-right: 10rpx solid #fff;
  transform: translateY(-50%);
}

.handle-arrow-right {
  right: 10rpx;
  border-left: 10rpx solid #fff;
  transform: translateY(-50%);
}

.image-label {
  position: absolute;
  top: 20rpx;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  z-index: 5;
}

.original-label {
  left: 20rpx;
}

.result-label {
  right: 20rpx;
}

.expiry-warning {
  margin: 24rpx 0;
  padding: 20rpx;
  background-color: #fff8e6;
  border-radius: 12rpx;
  border-left: 4rpx solid #faad14;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.warning-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.warning-text {
  font-size: 24rpx;
  color: #d46b08;
  line-height: 1.5;
  font-weight: 500;
}

.result-actions {
  display: flex;
  justify-content: space-around;
  margin-top: 36rpx;
}

.result-actions .action-btn {
  width: 40%;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 40rpx;
  font-size: 28rpx;
  color: white;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
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
  box-shadow: 0 4rpx 16rpx rgba(255, 77, 79, 0.3);
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

.action-section {
  margin: 40rpx 0;
}

.points-info {
  text-align: center;
  margin-bottom: 24rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.points-text {
  font-size: 26rpx;
  color: #555;
  background: linear-gradient(to right, #f0f5ff, #e6f7ff);
  border-radius: 50rpx;
  padding: 8rpx 24rpx;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(58, 90, 249, 0.15);
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
}

.points-text::before {
  content: "💎";
  margin-right: 6rpx;
  font-size: 24rpx;
}

.points-not-enough {
  font-size: 26rpx;
  color: #f56c6c;
  margin-top: 10rpx;
  display: block;
  font-weight: 500;
}

.process-btn {
  background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
  color: #fff;
  padding: 20rpx 0;
  border-radius: 40rpx;
  font-size: 32rpx;
  margin-top: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(58, 90, 249, 0.3);
  border: none;
  transition: all 0.3s ease;
  width: 100%;
}

.process-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 8rpx rgba(58, 90, 249, 0.2);
}

.process-btn[disabled] {
  background: linear-gradient(135deg, #c0c4cc 0%, #909399 100%);
  color: #fff;
  box-shadow: none;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-content {
  background-color: white;
  border-radius: 16rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 70%;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.2);
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid #f3f3f3;
  border-top: 6rpx solid #3a5af9;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 30rpx;
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
  margin-bottom: 20rpx;
}

.loading-progress {
  font-size: 36rpx;
  font-weight: bold;
  color: #3a5af9;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .action-btn {
    padding: 12rpx 24rpx;
    font-size: 26rpx;
  }

  .reset-icon {
    font-size: 28rpx;
  }
}
</style>
