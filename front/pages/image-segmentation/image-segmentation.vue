<template>
  <view class="image-segmentation-container">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">智能抠图</text>
      <text class="subtitle">AI智能识别前景，一键抠图，透明背景轻松获取</text>
    </view>

    <!-- 图片上传区域 -->
    <view class="upload-area" @click="chooseImage" v-if="!imageUrl">
      <view class="upload-content">
        <image class="upload-icon" src="/static/segment.png" mode="aspectFit"></image>
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

      <!-- 前景类型选择 -->
      <view class="option-section">
        <text class="option-title">前景类型:</text>
        <view class="options-row">
          <view
            v-for="item in typeOptions"
            :key="item.value"
            class="option-item"
            :class="{ active: foregroundType === item.value }"
            @click="selectType(item.value)"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 输出格式选择 -->
      <view class="option-section">
        <text class="option-title">输出格式:</text>
        <view class="options-row">
          <view
            v-for="item in formatOptions"
            :key="item.value"
            class="option-item"
            :class="{ active: outputFormat === item.value }"
            @click="selectFormat(item.value)"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 裁剪选项 -->
      <view class="option-section">
        <text class="option-title">裁剪选项:</text>
        <view class="options-row">
          <view
            v-for="item in cropOptions"
            :key="item.value"
            class="option-item"
            :class="{ active: cropMode === item.value }"
            @click="selectCrop(item.value)"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 输出内容选项 -->
      <view class="option-section">
        <text class="option-title">输出内容:</text>
        <view class="options-row">
          <view
            v-for="item in outputTypeOptions"
            :key="item.value"
            class="option-item"
            :class="{ active: outputType === item.value }"
            @click="selectOutputType(item.value)"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 背景颜色选择，仅在JPG格式时显示 -->
      <view class="option-section" v-if="outputFormat === 'jpg'">
        <text class="option-title">背景颜色:</text>
        <view class="color-picker">
          <view
            v-for="(color, index) in colorOptions"
            :key="index"
            class="color-item"
            :class="{ active: bgColor === color.value }"
            :style="{ backgroundColor: '#' + color.value }"
            @click="selectBgColor(color.value)"
          ></view>
          <input
            type="text"
            class="color-input"
            v-model="customColor"
            placeholder="自定义颜色(RRGGBB)"
            maxlength="6"
            @blur="validateAndSetColor"
          />
        </view>
      </view>
    </view>

    <!-- 处理结果显示 -->
    <view class="result-section" v-if="resultImageUrl">
      <text class="result-title">处理结果</text>

      <!-- 结果图片显示 -->
      <view class="result-image-container">
        <image
          class="result-image"
          :src="resultImageUrl"
          mode="widthFix"
          @load="onResultImageLoad"
        ></image>
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
        <text v-else-if="!isProcessing">开始抠图</text>
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

      // 抠图相关参数
      foregroundType: "", // 默认自动识别
      typeOptions: [
        { label: "自动识别", value: "" },
        { label: "人像", value: "person" },
        { label: "物品", value: "object" },
        { label: "图章", value: "stamp" },
      ],
      outputFormat: "png", // 默认输出格式
      formatOptions: [
        { label: "PNG(透明背景)", value: "png" },
        { label: "JPG(白色背景)", value: "jpg" },
      ],
      cropMode: 0, // 默认保持原图尺寸
      cropOptions: [
        { label: "保持原图尺寸", value: 0 },
        { label: "裁剪至边缘", value: 1 },
      ],
      outputType: 2, // 默认只返回图片
      outputTypeOptions: [
        { label: "图片+蒙版", value: 1 },
        { label: "仅图片", value: 2 },
        { label: "仅蒙版", value: 3 },
      ],
      bgColor: "FFFFFF", // 默认白色背景
      customColor: "", // 自定义背景颜色
      colorOptions: [
        { label: "白色", value: "FFFFFF" },
        { label: "黑色", value: "000000" },
        { label: "红色", value: "FF0000" },
        { label: "绿色", value: "00FF00" },
        { label: "蓝色", value: "0000FF" },
        { label: "透明", value: "transparent" },
      ],

      // 处理相关
      pointsCost: 60, // 默认积分消耗
      pointsConfigs: {}, // 积分配置
      pointsDescriptions: {}, // 积分描述
      isProcessing: false,
      processingProgress: 0,
      loadingText: "正在智能抠图...",

      // 结果相关
      resultImageUrl: "",
      taskId: "",
      foregroundRect: null, // 前景区域信息

      // 用户信息
      userPoints: 0,
      isLoggedIn: false,

      // 日志
      logger: null,

      // 登录弹窗
      showLoginPopup: false,
      loginPopupTitle: "需要登录",
      loginPopupMessage: "使用智能抠图功能需要先登录",
      loginPopupConfirmText: "去登录",
      loginPopupCancelText: "取消",
    };
  },
  computed: {
    currentPointsCost() {
      // 获取智能抠图的积分配置
      const featureKey = "segmentation";
      const defaultValue = 60; // 默认60积分

      const cost = pointsService.getFeaturePointsCost(featureKey, defaultValue);
      this.logger?.info(`获取智能抠图积分消耗: featureKey=${featureKey}, 结果=${cost}`);
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
          console.info("[ImageSegmentation][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[ImageSegmentation][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[ImageSegmentation][ERROR] " + message, error);
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
        this.logger.info(`已更新智能抠图积分消耗为: ${this.pointsCost}`);

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
     * 结果图片加载完成
     */
    onResultImageLoad() {
      // 结果图片加载后的处理
    },

    /**
     * 选择前景类型
     */
    selectType(type) {
      this.foregroundType = type;
    },

    /**
     * 选择输出格式
     */
    selectFormat(format) {
      this.outputFormat = format;
      // 如果从PNG切换到JPG，设置默认白色背景
      if (format === "jpg" && !this.bgColor) {
        this.bgColor = "FFFFFF";
      }
    },

    /**
     * 选择裁剪模式
     */
    selectCrop(cropMode) {
      this.cropMode = cropMode;
    },

    /**
     * 选择输出类型
     */
    selectOutputType(type) {
      this.outputType = type;
    },

    /**
     * 选择背景颜色
     */
    selectBgColor(color) {
      this.bgColor = color;
      this.customColor = color === "FFFFFF" ? "" : color;
    },

    /**
     * 验证并设置自定义颜色
     */
    validateAndSetColor() {
      // 验证颜色格式是否正确
      const colorRegex = /^[0-9A-Fa-f]{6}$/;
      if (this.customColor && colorRegex.test(this.customColor)) {
        this.bgColor = this.customColor.toUpperCase();
      } else if (this.customColor) {
        // 颜色格式不正确，重置为默认白色
        uni.showToast({
          title: "颜色格式不正确，请输入6位十六进制码",
          icon: "none",
        });
        this.customColor = "";
        this.bgColor = "FFFFFF";
      }
    },

    /**
     * 重选图片
     */
    resetImage() {
      this.imageUrl = "";
      this.imageFile = null;
      this.resultImageUrl = "";
      this.processingProgress = 0;
    },

    /**
     * 开始抠图处理
     */
    async processImage() {
      if (this.isProcessing) return;

      try {
        this.isProcessing = true;
        this.processingProgress = 0;
        this.loadingText = "正在智能抠图...";

        // 请求参数
        const params = {
          image_file: this.imageFile,
          type: this.foregroundType,
          sync: 0, // 异步模式，通过任务查询获取结果
          return_type: 1, // 返回URL
          output_type: this.outputType,
          crop: this.cropMode,
          format: this.outputFormat,
        };

        // 如果是JPG格式且设置了背景颜色
        if (
          this.outputFormat === "jpg" &&
          this.bgColor &&
          this.bgColor !== "transparent"
        ) {
          params.bg_color = this.bgColor;
        }

        this.logger.info(`开始处理抠图请求: ${JSON.stringify(params)}`);

        // 发送抠图请求
        const result = await visualApi.segmentImage(params);

        this.logger.info(`抠图处理返回结果: ${JSON.stringify(result)}`);

        // 检查结果状态
        if (result && result.status === 200 && result.data) {
          if (result.data.task_id && !result.data.image) {
            // 异步模式返回，使用任务ID查询结果
            this.taskId = result.data.task_id;
            this.loadingText = "图片处理中，正在等待结果...";
            await this.pollTaskResult();
          } else if (result.data.image) {
            // 同步模式直接返回结果
            this.processingProgress = 1;
            this.resultImageUrl = result.data.image;

            // 保存前景区域信息
            if (result.data.foreground_rect) {
              this.foregroundRect = result.data.foreground_rect;
            }
          } else {
            throw new Error("处理结果不包含图片URL");
          }
        } else {
          throw new Error(result?.message || "处理请求失败");
        }
      } catch (error) {
        this.logger.error("抠图处理出错:", error);
        uni.showToast({
          title: "抠图处理失败: " + (error.message || "未知错误"),
          icon: "none",
          duration: 3000,
        });
      } finally {
        this.isProcessing = false;
      }
    },

    /**
     * 轮询任务结果
     */
    async pollTaskResult() {
      if (!this.taskId) return;

      // 最大尝试次数
      const maxAttempts = 30;
      // 当前尝试次数
      let attempts = 0;

      return new Promise((resolve, reject) => {
        const checkResult = async () => {
          attempts++;
          try {
            // 查询任务状态
            const result = await visualApi.getTaskStatus(this.taskId);

            if (result && result.data) {
              // 更新进度
              this.processingProgress = result.data.progress / 100;

              // 检查任务状态
              if (result.data.state === 1) {
                // 处理完成
                this.resultImageUrl = result.data.image;

                // 保存前景区域信息
                if (result.data.foreground_rect) {
                  this.foregroundRect = result.data.foreground_rect;
                }

                resolve(result);
                return;
              } else if (result.data.state === 2) {
                // 处理失败
                reject(new Error(result.data.err_info || "任务处理失败"));
                return;
              }
            }

            // 达到最大尝试次数
            if (attempts >= maxAttempts) {
              reject(new Error("任务查询超时，请稍后查看处理结果"));
              return;
            }

            // 继续轮询
            setTimeout(checkResult, 2000); // 2秒后再次查询
          } catch (error) {
            this.logger.error("查询任务状态出错:", error);
            reject(error);
          }
        };

        // 开始轮询
        checkResult();
      });
    },

    /**
     * 保存结果图片
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
        title: "正在保存",
      });

      // 下载图片到本地
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
      this.foregroundRect = null;
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
          title: "我用AI实用宝一键抠图，效果超赞！",
          path: "/pages/image-segmentation/image-segmentation",
          imageUrl: this.resultImageUrl, // 使用抠图结果作为分享封面
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
          title: "AI实用宝 - 智能抠图工具",
          path: "/pages/image-segmentation/image-segmentation",
          imageUrl: "/static/segment.png", // 使用功能图标作为分享封面
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
.image-segmentation-container {
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
  margin-bottom: 10rpx;
}

.option-item {
  padding: 12rpx 30rpx;
  background-color: #f0f0f0;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
}

.option-item.active {
  background-color: #007aff;
  color: #fff;
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  align-items: center;
}

.color-item {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  cursor: pointer;
}

.color-item.active {
  border: 4rpx solid #007aff;
}

.color-input {
  flex: 1;
  height: 60rpx;
  border: 2rpx solid #ddd;
  border-radius: 30rpx;
  padding: 0 20rpx;
  font-size: 24rpx;
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

.result-image-container {
  width: 100%;
  margin-bottom: 30rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-image: url("https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/transparent-photoshop-background-grid-free-vector.jpg");
  background-repeat: repeat;
  background-size: 20rpx 20rpx;
}

.result-image {
  width: 100%;
  display: block;
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
  transform: scale(0.98);
}

.reset-icon {
  font-size: 32rpx;
  margin-right: 5rpx;
}
</style>
