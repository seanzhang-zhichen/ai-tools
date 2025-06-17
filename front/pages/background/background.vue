<template>
  <view class="background-container">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">图片添加背景</text>
      <text class="subtitle">AI智能为图片添加自然美观的背景，让作品更出色</text>
    </view>

    <!-- 图片上传区域 -->
    <view class="upload-area" @click="chooseImage" v-if="!imageUrl">
      <view class="upload-content">
        <image class="upload-icon" src="/static/background.png" mode="aspectFit"></image>
        <text class="upload-text">点击选择图片</text>
        <text class="upload-hint">支持JPG、PNG、WEBP格式</text>
      </view>
    </view>

    <!-- 图片预览和编辑区域 -->
    <view v-if="imageUrl" class="image-preview-area">
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

      <!-- 背景提示词输入 -->
      <view class="option-section prompt-section" v-if="!resultImageUrl">
        <text class="option-title">背景提示词:</text>
        <view class="prompt-input-container">
          <textarea
            v-model="prompt"
            placeholder="输入背景描述，建议使用英文以获得更好效果（最多1024个字符）"
            class="prompt-input"
            maxlength="1024"
          ></textarea>
          <text class="prompt-count">{{ prompt.length }}/1024</text>
        </view>
      </view>

      <!-- 批量生成设置 -->
      <view class="option-section batch-options" v-if="!resultImageUrl">
        <text class="option-title">生成数量:</text>
        <view class="options-row">
          <view
            v-for="num in batchSizeOptions"
            :key="num"
            class="batch-option"
            :class="{ active: batchSize === num }"
            @click="selectBatchSize(num)"
          >
            <text>{{ num }}张</text>
          </view>
        </view>
        <text class="batch-hint" v-if="batchSize > 1"
          >注：生成多张图片将按数量翻倍消耗积分</text
        >
      </view>
    </view>

    <!-- 处理结果展示 -->
    <view class="result-section" v-if="resultImages.length > 0">
      <text class="result-title">处理结果</text>

      <!-- 结果图片展示 -->
      <view class="result-images-container">
        <view
          v-for="(image, index) in resultImages"
          :key="index"
          class="result-image-item"
        >
          <image :src="image" class="result-image" mode="widthFix"></image>
          <view class="result-image-actions">
            <button class="image-action-btn" @click="saveImageByIndex(index)">
              <text>保存</text>
            </button>
          </view>
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
        <button class="action-btn save-btn" @click="saveAllImages">
          <text>保存全部</text>
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
        :disabled="isProcessing || userPoints < currentPointsCost || !prompt.trim()"
        @click="processImage"
      >
        <text v-if="!isProcessing && userPoints < currentPointsCost">积分不足</text>
        <text v-else-if="!isProcessing && !prompt.trim()">请输入背景提示词</text>
        <text v-else-if="!isProcessing">添加背景</text>
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

      // 添加背景相关参数
      prompt: "", // 背景提示词
      batchSize: 2, // 默认生成2张
      batchSizeOptions: [1, 2, 3, 4], // 生成图片数量选项

      // 处理相关
      pointsCost: 50, // 默认积分消耗
      pointsConfigs: {}, // 积分配置
      pointsDescriptions: {}, // 积分描述
      isProcessing: false,
      processingProgress: 0,
      loadingText: "正在为图片添加背景...",

      // 结果相关
      resultImageUrl: "", // 第一张结果图URL（用于判断是否有结果）
      resultImages: [], // 所有结果图URL列表

      // 任务相关
      taskId: "",
      taskCheckInterval: null,

      // 用户信息
      userPoints: 0,
      isLoggedIn: false,

      // 日志
      logger: null,

      // 登录弹窗
      showLoginPopup: false,
      loginPopupTitle: "需要登录",
      loginPopupMessage: "使用图片添加背景功能需要先登录",
      loginPopupConfirmText: "去登录",
      loginPopupCancelText: "取消",
    };
  },
  computed: {
    currentPointsCost() {
      // 获取添加背景的积分配置
      const featureKey = "background";
      const defaultValue = 50; // 默认50积分

      // 基础积分乘以生成图片数量
      const baseCost = pointsService.getFeaturePointsCost(featureKey, defaultValue);
      const totalCost = baseCost * this.batchSize;

      this.logger?.info(
        `获取添加背景积分消耗: featureKey=${featureKey}, 基础积分=${baseCost}, 总消耗=${totalCost}`
      );
      return totalCost;
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
  onHide() {
    // 清除检查任务状态的定时器
    this.clearTaskCheckInterval();
  },
  onUnload() {
    // 页面卸载时清除定时器
    this.clearTaskCheckInterval();
  },
  methods: {
    /**
     * 初始化日志记录器
     */
    initLogger() {
      this.logger = {
        info: (message) => {
          console.info("[Background][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[Background][WARN] " + message);
        },
        error: (message) => {
          console.error("[Background][ERROR] " + message);
        },
      };
      this.logger.info("初始化图片添加背景页面");
    },

    /**
     * 加载用户信息
     */
    async loadUserInfo() {
      try {
        const token = uni.getStorageSync("token");
        this.isLoggedIn = !!token;

        if (!this.isLoggedIn) {
          this.logger.info("用户未登录");
          this.userPoints = 0;
          return;
        }

        const userInfo = await visualApi.getUserInfo();

        if (userInfo && userInfo.data) {
          this.userPoints = userInfo.data.points || 0;
          this.logger.info(`获取到用户积分: ${this.userPoints}`);
        }
      } catch (error) {
        this.logger.error(`加载用户信息失败: ${error.message}`);
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
     * 获取积分配置
     */
    async fetchPointsConfigs() {
      try {
        this.logger.info("开始获取积分配置...");
        const result = await pointsService.getPointsConfigsWithCache();

        this.pointsConfigs = result.configs;
        this.pointsDescriptions = result.descriptions;

        this.pointsCost = this.currentPointsCost;
        this.logger.info(`已更新图片添加背景积分消耗为: ${this.pointsCost}`);

        return result;
      } catch (error) {
        this.logger.error(`获取积分配置失败: ${error.message}`);
      }
    },

    /**
     * 选择图片
     */
    async chooseImage() {
      if (!this.isLoggedIn) {
        this.showLoginPopup = true;
        return;
      }

      try {
        uni.chooseImage({
          count: 1,
          sizeType: ["original"],
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
            this.logger.info(`选择图片成功: ${this.imageUrl}`);
          },
          fail: (error) => {
            this.logger.error(`选择图片失败: ${error.errMsg || "未知错误"}`);
            uni.showToast({
              title: "选择图片失败",
              icon: "none",
            });
          },
        });
      } catch (error) {
        this.logger.error(`选择图片失败: ${error.message}`);
        uni.showToast({
          title: "选择图片失败",
          icon: "none",
        });
      }
    },

    /**
     * 图片加载完成回调
     */
    onImageLoad(e) {
      // 获取图片尺寸
      const { width, height } = e.detail;
      this.imageWidth = width;
      this.imageHeight = height;
      this.logger.info(`图片加载完成，尺寸: ${width}x${height}`);
    },

    /**
     * 重置图片选择
     */
    resetImage() {
      this.imageUrl = "";
      this.imageFile = null;
      this.logger.info("重置图片选择");
    },

    /**
     * 选择批量生成数量
     */
    selectBatchSize(size) {
      this.batchSize = size;
      this.logger.info(`选择生成数量: ${size}`);
    },

    /**
     * 处理图片添加背景
     */
    async processImage() {
      if (!this.isLoggedIn) {
        this.showLoginPopup = true;
        return;
      }

      if (!this.imageUrl) {
        uni.showToast({
          title: "请先选择图片",
          icon: "none",
        });
        return;
      }

      if (!this.prompt.trim()) {
        uni.showToast({
          title: "请输入背景提示词",
          icon: "none",
        });
        return;
      }

      try {
        this.isProcessing = true;
        this.processingProgress = 0;
        this.loadingText = "正在为图片添加背景...";

        // 调用API进行处理
        const params = {
          image_file: this.imageFile,
          batch_size: this.batchSize,
          prompt: this.prompt.trim(),
          sync: 0, // 使用异步模式
        };

        this.logger.info(`开始处理图片添加背景: ${JSON.stringify(params)}`);

        const response = await visualApi.addBackground(params);
        this.logger.info(`API响应: ${JSON.stringify(response)}`);

        if (
          response &&
          response.status === 200 &&
          response.data &&
          response.data.task_id
        ) {
          this.taskId = response.data.task_id;

          // 开始查询任务状态
          this.startTaskCheck();
        } else {
          throw new Error("API响应异常");
        }
      } catch (error) {
        this.isProcessing = false;
        this.logger.error(`图片添加背景处理失败: ${error.message}`);

        // 检查是否是登录过期错误
        if (error.message.includes("登录已过期") || error.message.includes("未授权")) {
          this.showLoginPopup = true;
        } else {
          uni.showToast({
            title: `处理失败: ${error.message}`,
            icon: "none",
            duration: 3000,
          });
        }
      }
    },

    /**
     * 开始定时查询任务状态
     */
    startTaskCheck() {
      this.clearTaskCheckInterval(); // 先清除可能存在的旧定时器

      this.taskCheckInterval = setInterval(async () => {
        try {
          await this.checkTaskStatus();
        } catch (error) {
          this.logger.error(`查询任务状态失败: ${error.message}`);
          this.clearTaskCheckInterval();

          this.isProcessing = false;
          uni.showToast({
            title: `任务查询失败: ${error.message}`,
            icon: "none",
            duration: 3000,
          });
        }
      }, 2000); // 每2秒查询一次
    },

    /**
     * 清除任务查询定时器
     */
    clearTaskCheckInterval() {
      if (this.taskCheckInterval) {
        clearInterval(this.taskCheckInterval);
        this.taskCheckInterval = null;
      }
    },

    /**
     * 查询任务状态
     */
    async checkTaskStatus() {
      if (!this.taskId) {
        this.clearTaskCheckInterval();
        return;
      }

      const response = await visualApi.getTaskStatus(this.taskId);
      this.logger.info(`任务状态查询结果: ${JSON.stringify(response)}`);

      if (response && response.data) {
        const taskData = response.data;

        // 更新进度
        if (taskData.progress !== undefined) {
          this.processingProgress = taskData.progress / 100;
        }

        // 任务完成
        if (taskData.state === 1) {
          this.clearTaskCheckInterval();
          this.isProcessing = false;

          // 处理结果 - 收集所有有效的图片URL
          const images = [];

          // 检查是否有image_1, image_2等格式的URL
          for (let i = 1; i <= this.batchSize; i++) {
            const imageKey = `image_${i}`;
            if (taskData[imageKey] && taskData[imageKey].trim() !== "") {
              images.push(taskData[imageKey]);
            }
          }

          // 如果找到了image_1等格式的图片
          if (images.length > 0) {
            this.resultImages = images;
            this.resultImageUrl = images[0]; // 设置第一张图片URL用于显示判断
            this.logger.info(`任务完成，获取到 ${images.length} 张结果图片`);
          }
          // 检查其他可能的返回格式
          else if (
            taskData.result_type === "array" &&
            taskData.images &&
            taskData.images.length > 0
          ) {
            this.resultImages = taskData.images;
            this.resultImageUrl = taskData.images[0];
            this.logger.info(`任务完成，获取到 ${taskData.images.length} 张结果图片`);
          } else if (taskData.image) {
            // 如果只返回一张图片
            this.resultImages = [taskData.image];
            this.resultImageUrl = taskData.image;
            this.logger.info(`任务完成，获取到 1 张结果图片`);
          } else {
            throw new Error("未获取到结果图片");
          }

          // 任务完成后重新加载用户信息（刷新积分）
          this.loadUserInfo();
        } else if (taskData.state === 2 || taskData.state === -1) {
          // 失败（状态2或-1都表示失败）
          this.clearTaskCheckInterval();
          this.isProcessing = false;
          throw new Error(
            taskData.err_message || taskData.state_detail || "任务处理失败"
          );
        }
        // 其他状态继续等待
      }
    },

    /**
     * 保存指定索引的图片
     */
    saveImageByIndex(index) {
      if (index >= 0 && index < this.resultImages.length) {
        const imageUrl = this.resultImages[index];
        this.saveImageToAlbum(imageUrl);
      }
    },

    /**
     * 保存所有结果图片
     */
    saveAllImages() {
      if (this.resultImages.length === 0) {
        uni.showToast({
          title: "没有图片可保存",
          icon: "none",
        });
        return;
      }

      // 保存所有图片
      this.resultImages.forEach((imageUrl, index) => {
        setTimeout(() => {
          this.saveImageToAlbum(imageUrl, index + 1);
        }, index * 300); // 稍微错开保存时间，避免同时触发太多请求
      });
    },

    /**
     * 保存单张图片到相册
     */
    saveImageToAlbum(imageUrl, index) {
      this.logger.info(`保存图片: ${imageUrl}`);

      uni.showLoading({
        title: index ? `保存图片 ${index}/${this.resultImages.length}` : "保存图片中",
      });

      uni.downloadFile({
        url: imageUrl,
        success: (res) => {
          if (res.statusCode === 200) {
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
                this.logger.error(`保存图片到相册失败: ${JSON.stringify(err)}`);
                uni.showToast({
                  title: "保存失败，请检查相册权限",
                  icon: "none",
                });
              },
            });
          } else {
            uni.hideLoading();
            this.logger.error(`下载图片失败: ${res.statusCode}`);
            uni.showToast({
              title: "图片下载失败",
              icon: "none",
            });
          }
        },
        fail: (err) => {
          uni.hideLoading();
          this.logger.error(`下载图片失败: ${JSON.stringify(err)}`);
          uni.showToast({
            title: "图片下载失败",
            icon: "none",
          });
        },
      });
    },

    /**
     * 重置所有状态，重新开始
     */
    resetAll() {
      this.resultImageUrl = "";
      this.resultImages = [];
      this.processingProgress = 0;
      this.prompt = "";
      this.logger.info("重置所有状态，准备重新处理");
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

    /**
     * 隐藏登录弹窗
     */
    hideLoginPopup() {
      this.showLoginPopup = false;
    },

    /**
     * 添加分享功能
     */
    onShareAppMessage() {
      // 根据当前是否有处理结果提供不同的分享信息
      if (this.resultImages && this.resultImages.length > 0) {
        return {
          title: "我用AI实用宝给图片添加了精美背景！",
          path: "/pages/background/background",
          imageUrl: this.resultImages[0], // 使用第一张处理后的图片作为分享封面
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
          title: "AI实用宝 - 图片添加背景工具",
          path: "/pages/background/background",
          imageUrl: "/static/background.png", // 使用功能图标作为分享封面
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

<style>
.background-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.header {
  margin-bottom: 30rpx;
  text-align: center;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 26rpx;
  color: #666;
}

.upload-area {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
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
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.preview-image {
  width: 100%;
  border-radius: 6rpx;
}

.image-actions {
  display: flex;
  justify-content: center;
  margin-top: 20rpx;
}

.action-btn {
  background-color: #f2f2f2;
  padding: 10rpx 30rpx;
  border-radius: 30rpx;
}

.action-text {
  font-size: 26rpx;
  color: #666;
}

.option-section {
  margin-top: 30rpx;
  border-top: 1px solid #eee;
  padding-top: 20rpx;
}

.option-title {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 15rpx;
  display: block;
}

.prompt-input-container {
  position: relative;
}

.prompt-input {
  width: 100%;
  height: 180rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  padding: 15rpx;
  box-sizing: border-box;
}

.prompt-count {
  position: absolute;
  bottom: 10rpx;
  right: 15rpx;
  font-size: 24rpx;
  color: #999;
}

.options-row {
  display: flex;
  flex-wrap: wrap;
}

.batch-option {
  min-width: 100rpx;
  background-color: #f5f5f5;
  padding: 10rpx 20rpx;
  border-radius: 6rpx;
  margin-right: 20rpx;
  margin-bottom: 15rpx;
  text-align: center;
}

.batch-option.active {
  background-color: #007aff;
}

.batch-option.active text {
  color: #fff;
}

.batch-option text {
  font-size: 26rpx;
  color: #333;
}

.batch-hint {
  font-size: 24rpx;
  color: #ff9500;
  margin-top: 10rpx;
  display: block;
}

.action-section {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.points-info {
  margin-bottom: 20rpx;
}

.points-text {
  font-size: 28rpx;
  color: #333;
}

.points-not-enough {
  color: #ff3b30;
  font-size: 26rpx;
  display: block;
  margin-top: 10rpx;
}

.process-btn {
  width: 100%;
  background-color: #007aff;
  color: #fff;
  border-radius: 10rpx;
  height: 90rpx;
  line-height: 90rpx;
  font-size: 32rpx;
}

.process-btn[disabled] {
  opacity: 0.6;
  background-color: #cccccc;
}

.result-section {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.result-title {
  font-size: 32rpx;
  color: #333;
  font-weight: bold;
  margin-bottom: 20rpx;
  display: block;
  text-align: center;
}

.result-images-container {
  margin-bottom: 20rpx;
}

.result-image-item {
  margin-bottom: 30rpx;
  border: 1px solid #eee;
  border-radius: 8rpx;
  overflow: hidden;
}

.result-image {
  width: 100%;
  display: block;
}

.result-image-actions {
  display: flex;
  justify-content: center;
  padding: 15rpx 0;
  background-color: #f8f8f8;
}

.image-action-btn {
  font-size: 26rpx;
  color: #007aff;
  background: none;
  border: none;
  line-height: 1.5;
  margin: 0;
  padding: 0 30rpx;
}

.image-action-btn:after {
  display: none;
}

.expiry-warning {
  display: flex;
  align-items: center;
  background-color: #fff9e6;
  padding: 15rpx;
  border-radius: 6rpx;
  margin-bottom: 20rpx;
}

.warning-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 10rpx;
}

.warning-text {
  font-size: 24rpx;
  color: #ff9500;
}

.result-actions {
  display: flex;
  justify-content: space-between;
}

.save-btn,
.reset-btn {
  flex: 1;
  margin: 0 10rpx;
  background-color: #fff;
  border: 1px solid #007aff;
  color: #007aff;
  border-radius: 10rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
}

.save-btn {
  background-color: #007aff;
  color: #fff;
}

.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-icon {
  margin-right: 10rpx;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 70%;
  max-width: 500rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
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
  text-align: center;
}

.loading-progress {
  font-size: 26rpx;
  color: #007aff;
}
</style>
