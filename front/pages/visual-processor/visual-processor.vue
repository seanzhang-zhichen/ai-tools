<template>
  <view class="visual-processor-container">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">图片去水印</text>
      <text class="subtitle">一键去除图片上的水印</text>
    </view>

    <!-- 图片上传区域 -->
    <view class="upload-area" @click="chooseImage" v-if="!imageUrl">
      <view class="upload-content">
        <image
          class="upload-icon"
          src="/static/delete_remark.png"
          mode="aspectFit"
        ></image>
        <text class="upload-text">点击选择图片</text>
        <text class="upload-hint">支持JPG、PNG、GIF、WEBP格式</text>
      </view>
    </view>

    <!-- 图片预览和编辑区域 -->
    <view v-if="imageUrl" class="image-preview-area">
      <!-- 自动去水印开关 -->
      <view class="mode-switch">
        <text class="switch-label">自动去水印</text>
        <switch :checked="isAutoMode" @change="toggleMode" color="#0099FF" />
        <text class="switch-hint" v-if="isAutoMode"
          >AI自动处理，无需手动选择水印区域</text
        >
        <text class="switch-hint" v-else>手动框选需要去除的水印区域</text>
      </view>

      <!-- 全屏遮罩层，在长按或绘制状态下阻止页面滚动 -->
      <view
        v-if="isLongPressed || isDrawing || isResizing"
        class="scroll-blocker"
        :style="'top:' + (lockedScrollTop || 0) + 'px'"
        @touchmove.stop.prevent
        @touchstart.stop.prevent="preventTouchDefault"
        @touchend.stop.prevent="preventTouchDefault"
        @touchcancel.stop.prevent="preventTouchDefault"
      ></view>

      <view
        class="image-container"
        :class="{ 'no-scroll': isLongPressed || isDrawing || isResizing }"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchCancel"
      >
        <image :src="imageUrl" class="preview-image" mode="widthFix" @load="onImageLoad">
        </image>

        <!-- 长按提示 -->
        <view v-if="isLongPressed && !isDrawing" class="long-press-indicator"></view>

        <!-- 矩形选择区域，用于标记去水印的位置 -->
        <view
          v-for="(rect, index) in rectangles"
          :key="index"
          class="selection-rect"
          :style="{
            left: rect.x + 'px',
            top: rect.y + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px',
          }"
        >
          <view class="rect-delete-btn" @click.stop="deleteRectangle(index)">×</view>
          <view
            class="rect-resize-handle"
            @touchstart.stop="startResizing(index, $event)"
          ></view>
        </view>

        <!-- 绘制中的矩形 -->
        <view
          v-if="isDrawing"
          class="drawing-rect"
          :style="{
            left: drawingRect.x + 'px',
            top: drawingRect.y + 'px',
            width: drawingRect.width + 'px',
            height: drawingRect.height + 'px',
          }"
        ></view>
      </view>

      <!-- 图片操作按钮 -->
      <view class="image-actions">
        <view class="action-btn" @click="resetImage">
          <text class="action-text">重选图片</text>
        </view>
        <view class="action-btn" @click="removeAllRectangles">
          <text class="action-text">清除选区</text>
        </view>
      </view>

      <!-- 操作说明 -->
      <view class="instruction" v-if="!isAutoMode">
        <text class="instruction-text"
          >长按图片并拖动创建选区，标记需要去除的水印区域</text
        >
      </view>
      <view class="instruction" v-else>
        <text class="instruction-text">自动模式下，AI将自动识别并去除水印区域</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-section" v-if="imageUrl">
      <view class="points-info">
        <text class="points-text">消耗积分: {{ currentPointsCost }}</text>
        <text v-if="userPoints < currentPointsCost" class="points-not-enough"
          >积分不足，当前积分: {{ userPoints }}</text
        >
      </view>
      <button
        class="process-btn"
        :disabled="isProcessing || (!isAutoMode && rectangles.length === 0)"
        @click="processImage"
      >
        <text v-if="!isProcessing && !isAutoMode && rectangles.length === 0"
          >请先选择水印区域</text
        >
        <text v-else-if="!isProcessing && userPoints < currentPointsCost">积分不足</text>
        <text v-else-if="!isProcessing">去除水印</text>
        <text v-else>处理中...</text>
      </button>
    </view>

    <!-- 处理结果 -->
    <view class="result-section" v-if="resultImageUrl">
      <text class="result-title">处理结果</text>
      <image :src="resultImageUrl" class="result-image" mode="widthFix"></image>

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
      imageContainerRect: null, // 图片容器的尺寸和位置

      // 页面滚动相关
      pageScrollTop: 0, // 记录页面的滚动位置
      lockedScrollTop: 0, // 锁定时的滚动位置
      isScrollLocked: false, // 是否锁定滚动
      scrollUpdateTimer: null, // 滚动更新定时器

      // 长按相关
      longPressTimer: null, // 长按计时器
      longPressThreshold: 300, // 长按触发阈值(毫秒)
      isLongPressed: false, // 是否已长按
      longPressStartX: 0, // 长按开始的X坐标
      longPressStartY: 0, // 长按开始的Y坐标

      // 矩形选择区域
      rectangles: [],
      isDrawing: false,
      drawingRect: { x: 0, y: 0, width: 0, height: 0 },
      isResizing: false,
      resizingIndex: -1,
      startX: 0,
      startY: 0,

      // 处理相关
      pointsCost: 15, // 默认积分消耗
      pointsConfigs: {}, // 积分配置
      pointsDescriptions: {}, // 积分描述
      isProcessing: false,
      processingProgress: 0,
      loadingText: "正在处理图片...",

      // 结果相关
      resultImageUrl: "",

      // 用户信息
      userPoints: 0,
      isLoggedIn: false, // 不再预先判断登录状态

      // 日志
      logger: null,

      // 登录弹窗
      showLoginPopup: false,
      loginPopupTitle: "需要登录",
      loginPopupMessage: "使用去水印功能需要先登录",
      loginPopupConfirmText: "去登录",
      loginPopupCancelText: "取消",

      // 原始图片尺寸
      originalWidth: 0,
      originalHeight: 0,

      // 自动去水印模式
      isAutoMode: false,
    };
  },
  computed: {
    // 移除登录状态判断，只在点击按钮时检查
    canProcess() {
      // 只检查是否有图片、水印区域、足够积分
      return (
        this.imageUrl &&
        (this.isAutoMode || this.rectangles.length > 0) &&
        this.userPoints >= this.currentPointsCost
      );
    },

    /**
     * 获取当前功能的积分消耗
     * @returns {Number} 积分消耗值
     */
    currentPointsCost() {
      // 根据当前模式返回不同的积分消耗
      const featureKey = this.isAutoMode ? "watermark_auto" : "inpaint";
      const defaultValue = this.isAutoMode ? 80 : 15; // 自动模式默认80积分，手动模式默认15积分

      return pointsService.getFeaturePointsCost(featureKey, defaultValue);
    },
  },
  onLoad() {
    this.initLogger();
    // 不再检查登录状态
    this.loadUserInfo(); // 仍然加载用户信息，但不强制登录

    // 获取积分配置
    this.fetchPointsConfigs();
  },

  /**
   * 监听屏幕方向变化
   * 在屏幕旋转时更新容器尺寸
   */
  onResize() {
    this.updateImageContainerSize();
  },
  onShow() {
    // 刷新用户信息
    this.loadUserInfo();

    // 刷新积分配置
    this.fetchPointsConfigs();
  },
  onUnload() {
    // 清理资源

    // 清理定时器
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }

    if (this.scrollUpdateTimer) {
      clearTimeout(this.scrollUpdateTimer);
    }
  },

  /**
   * 页面滚动处理函数
   * 在页面滚动时触发
   * @param {Object} e - 滚动事件对象，包含scrollTop属性
   */
  onPageScroll(e) {
    // 如果滚动被锁定，重新设置滚动位置
    if (this.isScrollLocked && this.lockedScrollTop !== undefined) {
      // 检测到页面滚动时，如果滚动被锁定，立即滚回锁定位置
      this.applyScrollLock();
      this.logger.info(`检测到滚动，重新锁定到: ${this.lockedScrollTop}`);
      return;
    }

    // 更新页面滚动位置
    this.pageScrollTop = e.scrollTop;

    // 在滚动后更新图片容器位置信息
    this.updateContainerAfterScroll();
  },
  methods: {
    /**
     * 初始化日志记录器
     */
    initLogger() {
      this.logger = {
        info: (message) => {
          console.info("[VisualProcessor][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[VisualProcessor][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[VisualProcessor][ERROR] " + message, error);
        },
      };
    },

    /**
     * 获取积分配置
     * 从后端API获取积分配置信息，设置图片处理的积分消耗
     * @returns {Promise} 返回Promise对象
     */
    async fetchPointsConfigs() {
      try {
        this.logger.info("开始获取积分配置...");
        const result = await pointsService.getPointsConfigsWithCache();

        // 更新组件内部的配置副本
        this.pointsConfigs = result.configs;
        this.pointsDescriptions = result.descriptions;

        // 更新默认积分消耗
        this.pointsCost = this.currentPointsCost;
        this.logger.info(`已更新图片去水印积分消耗为: ${this.pointsCost}`);

        return result;
      } catch (error) {
        this.logger.error("获取积分配置出错:", error);
        // 即使出错，pointsService也会提供默认值，所以这里不需要额外处理
      }
    },

    /**
     * 显示登录弹窗
     * @param {String} title - 弹窗标题
     * @param {String} message - 弹窗内容
     */
    showLoginConfirmPopup(title, message) {
      this.loginPopupTitle = title || "需要登录";
      this.loginPopupMessage = message || "使用去水印功能需要先登录";
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

    // 检查用户登录状态
    checkLoginStatus() {
      const token = uni.getStorageSync("token");
      this.isLoggedIn = !!token;

      if (!this.isLoggedIn) {
        this.logger.warn("用户未登录或token已过期");
        // 显示登录弹窗
        this.showLoginConfirmPopup("需要登录", "使用去水印功能需要先登录");

        // 重置用户积分
        this.userPoints = 0;
        return false;
      }

      this.logger.info("用户已登录");
      return true;
    },

    // 加载用户信息
    async loadUserInfo() {
      const token = uni.getStorageSync("token");
      if (!token) {
        // 无token则不加载用户信息
        this.userPoints = 0;
        return;
      }

      try {
        const response = await visualApi.getUserInfo();
        console.log("获取用户信息响应:", response);

        if (response && response.data) {
          this.userPoints = response.data.points;
          this.isLoggedIn = true;
          this.logger.info(`用户积分: ${this.userPoints}`);
        } else {
          // 如果无法获取用户积分，临时设置为允许处理
          this.userPoints = this.pointsCost + 100;
          this.logger.warn("未能获取用户积分信息，使用临时值");
        }
      } catch (error) {
        this.logger.error("获取用户信息失败", error);

        // 如果是401错误（未授权），说明token已过期
        if (error.message && error.message.includes("登录已过期")) {
          this.isLoggedIn = false;
        } else {
          // 其他错误，临时设置积分
          this.userPoints = this.pointsCost + 100;
        }
      }
    },

    // 选择图片
    chooseImage() {
      uni.chooseImage({
        count: 1, // 最多选择1张图片
        sizeType: ["original", "compressed"],
        sourceType: ["album", "camera"],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.imageUrl = tempFilePath;
          this.imageFile = res.tempFiles[0];
          this.rectangles = []; // 清空之前的选择区域
          this.isAutoMode = true; // 默认使用自动去水印模式
          this.logger.info("选择图片成功: " + tempFilePath);
        },
        fail: (err) => {
          this.logger.error("选择图片失败", err);
        },
      });
    },

    // 图片加载完成后获取尺寸
    onImageLoad(e) {
      this.updateImageContainerSize();
    },

    /**
     * 更新图片容器尺寸和图片信息
     * 在图片加载完成、屏幕旋转等情况下调用
     */
    updateImageContainerSize() {
      const query = uni.createSelectorQuery().in(this);
      query
        .select(".image-container")
        .boundingClientRect((data) => {
          if (data) {
            // 保存旧的容器位置，用于调试
            const oldRect = this.imageContainerRect
              ? `(${this.imageContainerRect.left}, ${this.imageContainerRect.top})`
              : "none";

            // 更新容器位置信息
            this.imageContainerRect = data;

            // 记录详细日志，包含页面滚动信息
            this.logger.info(
              `更新图片容器: ${data.width}x${data.height}, ` +
                `旧位置: ${oldRect}, 新位置: (${data.left}, ${data.top}), ` +
                `页面滚动: ${this.pageScrollTop}`
            );
          }
        })
        .exec();

      query
        .select(".preview-image")
        .boundingClientRect((data) => {
          if (data) {
            this.imageWidth = data.width;
            this.imageHeight = data.height;
            this.logger.info(`图片显示尺寸: ${this.imageWidth}x${this.imageHeight}`);

            // 获取原始图片尺寸
            uni.getImageInfo({
              src: this.imageUrl,
              success: (imageInfo) => {
                this.originalWidth = imageInfo.width;
                this.originalHeight = imageInfo.height;

                const scaleRatio = this.imageWidth / this.originalWidth;
                this.logger.info(
                  `原始图片尺寸: ${this.originalWidth}x${this.originalHeight}, 缩放比例: ${scaleRatio}`
                );

                // 更新后验证所有矩形是否在范围内
                if (this.rectangles.length > 0) {
                  this.validateAllRectangles();
                }
              },
              fail: (err) => {
                this.logger.error("获取图片原始尺寸失败", err);
              },
            });
          }
        })
        .exec();
    },

    /**
     * 限制坐标值在图片范围内
     * @param {Number} value - 原始坐标值
     * @param {Number} max - 最大允许值（图片宽度或高度）
     * @param {Number} tolerance - 允许超出的容忍度（默认为0）
     * @returns {Number} - 限制后的坐标值
     */
    clampToImageBounds(value, max, tolerance = 0) {
      // 允许一定的容忍度，但仍然有一个绝对的限制
      return Math.max(-tolerance, Math.min(max + tolerance, value));
    },

    // 处理触摸开始事件
    handleTouchStart(event) {
      // 如果是自动模式，不触发长按功能
      if (this.isAutoMode) {
        return;
      }

      // 如果正在调整大小或已经长按，始终阻止默认行为和事件冒泡
      if (this.isResizing || this.isLongPressed) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }

      const touch = event.touches[0];

      // 清除可能存在的上一次长按计时器
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
      }

      // 确保我们有最新的容器位置信息
      this.updateImageContainerSize();

      // 计算触摸点相对于图片容器的位置
      if (this.imageContainerRect) {
        // 获取图片容器的位置
        const containerRect = this.imageContainerRect;

        // 获取触摸点坐标
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        // 记录相对于容器的坐标，考虑页面滚动位置
        this.longPressStartX = touchX - containerRect.left;
        this.longPressStartY = touchY - containerRect.top;

        // 更新开发日志
        this.logger.info(
          `触摸开始: 原始位置=(${touchX}, ${touchY}), 容器位置=(${containerRect.left}, ${containerRect.top}), 相对位置=(${this.longPressStartX}, ${this.longPressStartY})`
        );

        // 设置长按计时器
        this.longPressTimer = setTimeout(() => {
          // 长按时间达到，标记为长按状态
          this.isLongPressed = true;

          // 再次获取最新的容器位置（可能在长按期间有变化）
          this.updateImageContainerSize();

          // 长按后才开始绘制准备
          this.startX = this.longPressStartX;
          this.startY = this.longPressStartY;

          // 固定滚动位置，防止后续操作中页面滚动
          this.lockScrollPosition();

          // 长按开始后，向用户提供震动反馈
          uni.vibrateShort({
            success: () => {
              this.logger.info("长按触发震动反馈");
            },
          });

          this.logger.info(`长按触发: 坐标=(${this.startX}, ${this.startY})`);
        }, this.longPressThreshold);
      }
    },

    /**
     * 锁定页面滚动位置
     * 在长按开始时调用，确保用户在绘制过程中页面不会滚动
     */
    lockScrollPosition() {
      // 记录当前滚动位置
      this.lockedScrollTop = this.pageScrollTop;

      // 多次调用确保锁定成功
      this.applyScrollLock();

      // 设置锁定标志
      this.isScrollLocked = true;

      this.logger.info(`锁定页面滚动位置: ${this.lockedScrollTop}`);
    },

    // 改进applyScrollLock方法，更频繁地锁定滚动
    applyScrollLock() {
      // 立即锁定滚动
      uni.pageScrollTo({
        scrollTop: this.lockedScrollTop,
        duration: 0,
      });

      // 多次锁定，确保效果（微信小程序环境中有时需要多次锁定）
      const lockTimes = [50, 100, 200, 500]; // 在不同时间点多次锁定

      lockTimes.forEach((time) => {
        setTimeout(() => {
          if (this.isScrollLocked) {
            uni.pageScrollTo({
              scrollTop: this.lockedScrollTop,
              duration: 0,
            });
          }
        }, time);
      });

      // 启动检测定时器，持续监测滚动位置
      this.startScrollMonitor();
    },

    // 添加滚动监测方法
    startScrollMonitor() {
      // 清理可能存在的旧定时器
      if (this._scrollMonitorTimer) {
        clearInterval(this._scrollMonitorTimer);
      }

      // 设置监测定时器
      this._scrollMonitorTimer = setInterval(() => {
        if (
          this.isScrollLocked &&
          (this.isLongPressed || this.isDrawing || this.isResizing)
        ) {
          // 如果检测到滚动位置变化，重新锁定
          const currentScrollTop = this.pageScrollTop;
          if (Math.abs(currentScrollTop - this.lockedScrollTop) > 5) {
            this.logger.info(
              `检测到滚动偏移: ${currentScrollTop}，重新锁定到: ${this.lockedScrollTop}`
            );

            uni.pageScrollTo({
              scrollTop: this.lockedScrollTop,
              duration: 0,
            });
          }
        } else {
          // 如果状态已变，停止监测
          this.stopScrollMonitor();
        }
      }, 100); // 每100ms检测一次
    },

    // 添加停止滚动监测方法
    stopScrollMonitor() {
      if (this._scrollMonitorTimer) {
        clearInterval(this._scrollMonitorTimer);
        this._scrollMonitorTimer = null;
      }
    },

    // 修改解锁方法，确保清理监测定时器
    unlockScrollPosition() {
      // 停止滚动监测
      this.stopScrollMonitor();

      // 简单设置标志位
      this.isScrollLocked = false;

      this.logger.info("解锁页面滚动位置");
    },

    // 处理触摸移动事件
    handleTouchMove(event) {
      // 如果是自动模式，不处理长按和绘制功能
      if (this.isAutoMode) {
        return;
      }

      // 如果是长按或绘制状态，阻止默认行为防止页面滚动
      if (this.isLongPressed || this.isDrawing || this.isResizing) {
        event.stopPropagation();
        event.preventDefault();

        // 额外确保滚动位置被锁定
        if (this.isScrollLocked) {
          uni.pageScrollTo({
            scrollTop: this.lockedScrollTop,
            duration: 0,
          });
        }
      }

      // 如果没有长按或者不在调整大小，则不处理移动
      if (!this.isLongPressed && !this.isResizing) {
        // 如果移动距离超过阈值，取消长按计时器
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
        return;
      }

      // 如果处于长按或绘制状态，确保页面不会滚动
      if (
        this.isScrollLocked &&
        (this.isLongPressed || this.isDrawing || this.isResizing)
      ) {
        this.applyScrollLock();
      }

      const touch = event.touches[0];

      // 如果已经长按但还没有开始绘制，则开始绘制
      if (this.isLongPressed && !this.isDrawing && !this.isResizing) {
        this.isDrawing = true;
        this.drawingRect = {
          x: this.startX,
          y: this.startY,
          width: 0,
          height: 0,
        };
      }

      if (this.imageContainerRect) {
        // 使用容器坐标，不依赖于页面滚动
        const containerRect = this.imageContainerRect;

        // 获取原始坐标值，直接使用相对于容器的坐标
        const currentX = touch.clientX - containerRect.left;
        const currentY = touch.clientY - containerRect.top;

        // 允许超出一定范围，但过大幅度超出时记录日志
        const tolerance = 20; // 允许超出20像素的容忍度
        const farOutsideBounds =
          currentX < -tolerance ||
          currentX > this.imageWidth + tolerance ||
          currentY < -tolerance ||
          currentY > this.imageHeight + tolerance;

        if (farOutsideBounds) {
          this.logger.info(
            `触摸点远离图片边界: (${currentX}, ${currentY}), 图片尺寸: ${this.imageWidth}x${this.imageHeight}`
          );
        }

        if (this.isResizing && this.resizingIndex >= 0) {
          // 调整矩形大小
          const rectangle = this.rectangles[this.resizingIndex];

          // 计算新的宽度和高度，允许边界附近自由调整
          const newWidth = Math.max(10, currentX - rectangle.x);
          const newHeight = Math.max(10, currentY - rectangle.y);

          // 创建一个新对象以触发响应式更新
          this.rectangles.splice(this.resizingIndex, 1, {
            ...rectangle,
            width: newWidth,
            height: newHeight,
          });
        } else {
          // 绘制新矩形，允许边界自由绘制
          const minX = Math.min(this.startX, currentX);
          const minY = Math.min(this.startY, currentY);
          const width = Math.abs(currentX - this.startX);
          const height = Math.abs(currentY - this.startY);

          this.drawingRect = {
            x: minX,
            y: minY,
            width: width,
            height: height,
          };
        }
      }
    },

    // 处理触摸结束事件
    handleTouchEnd(event) {
      // 如果是自动模式，不处理长按和绘制功能
      if (this.isAutoMode) {
        return;
      }

      // 如果是长按或绘制状态，阻止默认行为
      if (this.isLongPressed || this.isDrawing) {
        event.stopPropagation();
        event.preventDefault();
      }

      // 清除长按计时器
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      if (this.isResizing) {
        this.isResizing = false;
        this.resizingIndex = -1;

        // 在调整大小结束时，确保矩形在图片范围内
        this.validateAllRectangles();
        return;
      }

      if (!this.isDrawing) {
        // 如果只是长按但没有开始绘制，重置长按状态
        if (this.isLongPressed) {
          this.isLongPressed = false;
          this.unlockScrollPosition(); // 解锁页面滚动
        }
        return;
      }

      // 添加画好的矩形到列表中
      if (this.drawingRect.width > 10 && this.drawingRect.height > 10) {
        // 在绘制结束时，确保矩形不超出图片边界
        const safeRect = this.validateRectInBounds(this.drawingRect);

        this.rectangles.push(safeRect);
        this.logger.info(
          `添加选区: x=${safeRect.x}, y=${safeRect.y}, width=${safeRect.width}, height=${safeRect.height}`
        );
      }

      // 重置所有状态
      this.isDrawing = false;
      this.isLongPressed = false;
      this.drawingRect = { x: 0, y: 0, width: 0, height: 0 };

      // 解锁页面滚动
      this.unlockScrollPosition();
    },

    // 处理触摸取消事件（例如接到电话或其他系统事件）
    handleTouchCancel() {
      // 如果是自动模式，不处理长按和绘制功能
      if (this.isAutoMode) {
        return;
      }

      // 清除长按计时器
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // 重置所有状态
      this.isLongPressed = false;
      this.isDrawing = false;
      this.isResizing = false;
      this.resizingIndex = -1;
      this.drawingRect = { x: 0, y: 0, width: 0, height: 0 };

      // 解锁页面滚动
      this.unlockScrollPosition();

      this.logger.info("触摸取消，重置所有状态");
    },

    /**
     * 防止触摸默认行为
     * 用于阻止滚动等浏览器默认行为
     * @param {Object} event - 触摸事件对象
     */
    preventTouchDefault(event) {
      // 阻止事件冒泡
      if (event.stopPropagation) {
        event.stopPropagation();
      }

      // 阻止默认行为
      if (event.preventDefault) {
        event.preventDefault();
      }

      // 返回 false 进一步确保阻止默认行为
      return false;
    },

    // 开始调整矩形大小
    startResizing(index, event) {
      // 如果是自动模式，不处理调整大小功能
      if (this.isAutoMode) {
        return;
      }

      this.isResizing = true;
      this.resizingIndex = index;

      // 锁定滚动位置
      this.lockScrollPosition();

      // 记录原始矩形信息用于调试
      const rect = this.rectangles[index];
      this.logger.info(
        `开始调整矩形大小: 索引=${index}, 当前位置=(${rect.x}, ${rect.y}), 尺寸=${rect.width}x${rect.height}`
      );

      // 阻止事件冒泡和默认行为
      event.stopPropagation();
      event.preventDefault();
    },

    // 删除矩形
    deleteRectangle(index) {
      this.rectangles.splice(index, 1);
      this.logger.info(`删除选区: ${index}`);
    },

    // 重置图片
    resetImage() {
      this.imageUrl = "";
      this.imageFile = null;
      this.rectangles = [];
      this.logger.info("重置图片");
    },

    // 清除所有选区
    removeAllRectangles() {
      this.rectangles = [];
      this.logger.info("清除所有选区");
    },

    // 重置所有状态
    resetAll() {
      this.resultImageUrl = "";
      this.isProcessing = false;
      this.processingProgress = 0;

      // 刷新用户积分
      this.loadUserInfo();
    },

    /**
     * 将显示坐标转换为原始图片坐标
     * @param {Object} rect - 显示坐标系中的矩形
     * @returns {Object} - 图片坐标系中的矩形
     */
    convertToImageCoordinates(rect) {
      if (!this.imageContainerRect || !this.originalWidth || !this.originalHeight) {
        this.logger.warn("无法转换坐标：缺少图片尺寸信息");
        return rect; // 如果缺少必要信息，返回原始矩形
      }

      // 计算图片的缩放比例
      const scaleRatio = this.originalWidth / this.imageWidth;

      // 转换坐标和尺寸到图片真实尺寸
      return {
        x: Math.round(rect.x * scaleRatio),
        y: Math.round(rect.y * scaleRatio),
        width: Math.round(rect.width * scaleRatio),
        height: Math.round(rect.height * scaleRatio),
      };
    },

    /**
     * 将原始图片坐标转换为显示坐标
     * @param {Object} rect - 图片坐标系中的矩形
     * @returns {Object} - 显示坐标系中的矩形
     */
    convertToDisplayCoordinates(rect) {
      if (!this.imageContainerRect || !this.originalWidth || !this.originalHeight) {
        this.logger.warn("无法转换坐标：缺少图片尺寸信息");
        return rect; // 如果缺少必要信息，返回原始矩形
      }

      // 计算图片的缩放比例
      const scaleRatio = this.originalWidth / this.imageWidth;

      // 转换坐标和尺寸到显示尺寸
      return {
        x: Math.round(rect.x / scaleRatio),
        y: Math.round(rect.y / scaleRatio),
        width: Math.round(rect.width / scaleRatio),
        height: Math.round(rect.height / scaleRatio),
      };
    },

    /**
     * 验证矩形是否在图片范围内
     * @param {Object} rect - 矩形对象
     * @returns {Object} - 限制后的矩形对象
     */
    validateRectInBounds(rect) {
      if (!this.imageWidth || !this.imageHeight) {
        return rect;
      }

      // 计算调整后的矩形，使其完全位于图片范围内
      let x = rect.x;
      let y = rect.y;
      let width = rect.width;
      let height = rect.height;

      // 如果左上角超出左边或上边界，裁剪矩形
      if (x < 0) {
        width += x; // 减少宽度
        x = 0; // 左边界设为0
      }

      if (y < 0) {
        height += y; // 减少高度
        y = 0; // 上边界设为0
      }

      // 如果右下角超出右边或下边界，裁剪矩形
      if (x + width > this.imageWidth) {
        width = this.imageWidth - x;
      }

      if (y + height > this.imageHeight) {
        height = this.imageHeight - y;
      }

      // 确保宽度和高度不小于最小值
      width = Math.max(10, width);
      height = Math.max(10, height);

      return { x, y, width, height };
    },

    /**
     * 验证并修正所有矩形
     * @returns {Boolean} - 是否进行了修正
     */
    validateAllRectangles() {
      if (!this.imageWidth || !this.imageHeight || this.rectangles.length === 0) {
        return false;
      }

      let hasChanges = false;

      // 遍历并验证所有矩形
      const validatedRectangles = this.rectangles.map((rect) => {
        const validRect = this.validateRectInBounds(rect);

        // 检查是否有变化
        if (
          rect.x !== validRect.x ||
          rect.y !== validRect.y ||
          rect.width !== validRect.width ||
          rect.height !== validRect.height
        ) {
          hasChanges = true;
          this.logger.info(
            `修正矩形: 原始=(${rect.x}, ${rect.y}, ${rect.width}x${rect.height}), 修正后=(${validRect.x}, ${validRect.y}, ${validRect.width}x${validRect.height})`
          );
        }

        return validRect;
      });

      if (hasChanges) {
        this.rectangles = validatedRectangles;
        this.logger.info(
          `已修正 ${validatedRectangles.length} 个矩形，确保它们都在图片范围内`
        );
      }

      return hasChanges;
    },

    // 处理图片（去水印）
    async processImage() {
      // 首先检查登录状态
      if (!this.checkLoginStatus()) {
        return; // 如果未登录，直接返回
      }

      // 检查当前积分是否足够
      if (this.userPoints < this.currentPointsCost) {
        uni.showToast({
          title: `积分不足，需要${this.currentPointsCost}积分`,
          icon: "none",
          duration: 2000,
        });
        return;
      }

      // 手动模式，需要检查是否有选择区域
      if (!this.isAutoMode && (this.rectangles.length === 0 || !this.canProcess)) {
        uni.showToast({
          title: "请先选择水印区域",
          icon: "none",
          duration: 2000,
        });
        return;
      }

      // 避免重复请求
      if (this.isProcessing) return;

      // 在处理前验证所有矩形（仅手动模式需要）
      if (!this.isAutoMode) {
        this.validateAllRectangles();
      }

      this.isProcessing = true;
      this.loadingText = this.isAutoMode ? "正在上传图片..." : "正在上传图片...";
      this.processingProgress = 0;

      try {
        this.logger.info(
          `开始处理图片，模式: ${this.isAutoMode ? "自动去水印" : "手动去水印"}`
        );

        if (this.isAutoMode) {
          // 自动去水印模式
          await uploadHelper.uploadImageAndAutoRemoveWatermark({
            imageFile: this.imageFile,
            imagePath: this.imageUrl,
            onProgress: (progress) => {
              this.processingProgress = progress;

              // 根据进度更新提示文本
              if (progress < 0.3) {
                this.loadingText = "正在上传图片到云端...";
              } else if (progress < 0.95) {
                this.loadingText = "正在自动识别并去除水印...";
              } else {
                this.loadingText = "处理完成，准备显示结果...";
              }
            },
            onSuccess: (result) => {
              // 处理成功，显示结果
              this.resultImageUrl = result.resultImageUrl;
              this.isProcessing = false;

              uni.showToast({
                title: "处理成功",
                icon: "success",
              });
            },
            onError: (errorMsg) => {
              // 处理失败
              this.isProcessing = false;

              // 检查是否是登录过期错误
              if (errorMsg.includes("登录已过期") || errorMsg.includes("未授权")) {
                this.isLoggedIn = false;
                // 显示登录弹窗
                this.showLoginConfirmPopup("登录已过期", "您的登录已过期，请重新登录");
              } else {
                uni.showToast({
                  title: "处理失败: " + errorMsg,
                  icon: "none",
                });
              }
            },
          });
        } else {
          // 手动去水印模式
          this.logger.info("开始处理图片，使用真实图片坐标");
          this.logger.info(`原始图片尺寸: ${this.originalWidth}x${this.originalHeight}`);
          this.logger.info(`显示图片尺寸: ${this.imageWidth}x${this.imageHeight}`);
          this.logger.info(`缩放比例: ${this.originalWidth / this.imageWidth}`);

          // 记录UI上的矩形坐标
          this.logger.info("UI矩形坐标:", JSON.stringify(this.rectangles));

          // 将UI坐标转换为图片真实坐标
          const imageRectangles = this.rectangles.map((rect) =>
            this.convertToImageCoordinates(rect)
          );
          this.logger.info("转换后的图片真实坐标矩形:", JSON.stringify(imageRectangles));

          // 先上传到七牛云，再调用去水印API
          await uploadHelper.uploadImageAndRemoveWatermark({
            imageFile: this.imageFile,
            imagePath: this.imageUrl,
            rectangles: imageRectangles, // 使用转换后的图片真实坐标
            onProgress: (progress) => {
              this.processingProgress = progress;

              // 根据进度更新提示文本
              if (progress < 0.3) {
                this.loadingText = "正在上传图片到云端...";
              } else if (progress < 0.95) {
                this.loadingText = "正在去除水印...";
              } else {
                this.loadingText = "处理完成，准备显示结果...";
              }
            },
            onSuccess: (result) => {
              // 处理成功，显示结果
              this.resultImageUrl = result.resultImageUrl;
              this.isProcessing = false;

              uni.showToast({
                title: "处理成功",
                icon: "success",
              });
            },
            onError: (errorMsg) => {
              // 处理失败
              this.isProcessing = false;

              // 检查是否是登录过期错误
              if (errorMsg.includes("登录已过期") || errorMsg.includes("未授权")) {
                this.isLoggedIn = false;
                // 显示登录弹窗
                this.showLoginConfirmPopup("登录已过期", "您的登录已过期，请重新登录");
              } else {
                uni.showToast({
                  title: "处理失败: " + errorMsg,
                  icon: "none",
                });
              }
            },
          });
        }
      } catch (error) {
        this.logger.error("处理图片失败", error);
        this.isProcessing = false;

        // 检查是否是登录过期错误
        if (
          error.message &&
          (error.message.includes("登录已过期") || error.message.includes("未授权"))
        ) {
          this.isLoggedIn = false;
          // 显示登录弹窗
          this.showLoginConfirmPopup("登录已过期", "您的登录已过期，请重新登录");
        } else {
          uni.showToast({
            title: "处理失败: " + (error.message || "未知错误"),
            icon: "none",
          });
        }
      }
    },

    // 保存结果图片到相册
    saveImage() {
      if (!this.resultImageUrl) return;

      uni.downloadFile({
        url: this.resultImageUrl,
        success: (res) => {
          if (res.statusCode === 200) {
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
                uni.showToast({
                  title: "保存失败",
                  icon: "none",
                });
                this.logger.error("保存图片失败", err);
              },
            });
          } else {
            uni.showToast({
              title: "下载图片失败",
              icon: "none",
            });
          }
        },
        fail: () => {
          uni.showToast({
            title: "下载图片失败",
            icon: "none",
          });
        },
      });
    },

    /**
     * 在滚动后延迟更新容器位置信息
     * 避免频繁更新导致性能问题
     */
    updateContainerAfterScroll() {
      // 如果正在绘制或长按状态，不更新
      if (this.isDrawing || this.isLongPressed || this.isResizing) {
        return;
      }

      // 使用防抖处理，避免频繁调用
      if (this.scrollUpdateTimer) {
        clearTimeout(this.scrollUpdateTimer);
      }

      this.scrollUpdateTimer = setTimeout(() => {
        this.updateImageContainerSize();
      }, 100); // 100ms防抖
    },

    // 切换自动去水印模式
    toggleMode() {
      this.isAutoMode = !this.isAutoMode;
      if (this.isAutoMode) {
        this.rectangles = [];
        this.logger.info("切换到自动去水印模式");
      } else {
        this.logger.info("切换到手动去水印模式");
      }
    },

    // 添加分享功能
    onShareAppMessage() {
      // 根据当前是否有处理结果提供不同的分享信息
      if (this.resultImageUrl) {
        return {
          title: "我用AI实用宝成功去除了图片水印！",
          path: "/pages/visual-processor/visual-processor",
          imageUrl: this.resultImageUrl, // 使用处理后的图片作为分享封面
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
          title: "AI实用宝 - 图片去水印工具",
          path: "/pages/visual-processor/visual-processor",
          imageUrl: "/static/delete_remark.png", // 使用功能图标作为分享封面
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
.visual-processor-container {
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

/* 标题样式 */
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

/* 上传区域样式 */
.upload-area {
  height: 400rpx;
  background-color: #fff;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 30rpx 0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
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
  margin-bottom: 20rpx;
}

.upload-text {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.upload-hint {
  font-size: 22rpx;
  color: #999;
}

/* 图片预览区域样式 */
.image-preview-area {
  margin: 30rpx 0;
  position: relative;
}

.image-container {
  position: relative;
  overflow: hidden;
  border-radius: 12rpx;
  background-color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.preview-image {
  width: 100%;
  display: block;
}

/* 选择矩形样式 */
.selection-rect {
  position: absolute;
  border: 2px dashed #ff4500;
  background-color: rgba(255, 69, 0, 0.2);
  box-sizing: border-box;
}

.rect-delete-btn {
  position: absolute;
  top: -15px;
  right: -15px;
  width: 30px;
  height: 30px;
  background-color: #ff4500;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.rect-resize-handle {
  position: absolute;
  bottom: -10px;
  right: -10px;
  width: 20px;
  height: 20px;
  background-color: white;
  border: 2px solid #ff4500;
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.drawing-rect {
  position: absolute;
  border: 2px dashed #2d8cf0;
  background-color: rgba(45, 140, 240, 0.2);
  box-sizing: border-box;
}

/* 图片操作按钮样式 */
.image-actions {
  display: flex;
  justify-content: space-around;
  margin-top: 20rpx;
}

.action-btn {
  padding: 16rpx 30rpx;
  background-color: #f0f0f0;
  border-radius: 30rpx;
  border: 1px solid #ddd;
}

.action-text {
  font-size: 26rpx;
  color: #333;
}

/* 操作说明样式 */
.instruction {
  margin: 20rpx 0;
  padding: 20rpx;
  background-color: #e6f7ff;
  border-radius: 12rpx;
  border-left: 4rpx solid #1890ff;
}

.instruction-text {
  font-size: 24rpx;
  color: #333;
  line-height: 1.5;
}

/* 操作区域样式 */
.action-section {
  margin: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.points-info {
  margin-bottom: 20rpx;
}

.points-text {
  font-size: 26rpx;
  color: #666;
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
  width: 80%;
  height: 80rpx;
  background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
  color: white;
  border-radius: 40rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.process-btn:disabled {
  opacity: 0.5;
  background: #ccc;
}

/* 结果区域样式 */
.result-section {
  margin: 40rpx 0;
}

.result-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
  text-align: center;
}

.result-image {
  width: 100%;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
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

/* 增加按钮样式 */
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

.reset-icon {
  font-size: 32rpx;
  font-weight: bold;
  margin-right: 6rpx;
}

/* 加载遮罩样式 */
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

/* 增加过期提示样式 */
.expiry-warning {
  margin: 20rpx 0;
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

/* 按钮基础样式 */
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
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

/* 长按指示器样式 */
.long-press-indicator {
  position: absolute;
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background-color: rgba(255, 69, 0, 0.4);
  box-shadow: 0 0 15rpx rgba(255, 69, 0, 0.8);
  animation: pulse 1s infinite;
  pointer-events: none; /* 确保不会阻止触摸事件 */
}

/* 滚动阻止层样式 */
.scroll-blocker {
  position: fixed;
  top: 0; /* 会被动态设置为锁定滚动位置 */
  left: 0;
  right: 0;
  bottom: 0;
  background-color: transparent;
  z-index: 1000; /* 确保在最顶层但低于选区控制按钮 */
  pointer-events: auto; /* 捕获所有触摸事件 */
  touch-action: none !important; /* 阻止所有触摸操作 */
  height: 100vh; /* 使用视口高度 */
  width: 100vw; /* 使用视口宽度 */
  overflow: hidden !important;
  -webkit-overflow-scrolling: none !important;
  user-select: none;
  /* 添加更强的阻止滚动属性 */
  position: fixed !important;
  overscroll-behavior: none !important;
}

/* 禁止滚动的容器 */
.no-scroll {
  touch-action: none !important;
  overflow: hidden !important;
  overscroll-behavior: none !important;
  -webkit-overflow-scrolling: none !important;
}

/* 锁定页面滚动的全局样式 - 使用uni-app兼容写法 */
::v-deep .overflow-hidden,
:deep(.overflow-hidden) {
  overflow: hidden !important;
  position: fixed;
  width: 100%;
  height: 100%;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}

/* 按钮悬停和点击效果 */
.reset-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 8rpx rgba(255, 77, 79, 0.2);
  opacity: 0.9;
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

/* 模式切换开关样式 */
.mode-switch {
  background-color: #f0f5ff;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin: 20rpx 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  border-left: 8rpx solid #0099ff;
}

.switch-label {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
  margin-right: 20rpx;
}

.switch-hint {
  font-size: 24rpx;
  color: #666;
  margin-top: 6rpx;
  flex: 100%;
  margin-left: 0;
  margin-top: 10rpx;
  margin-bottom: 4rpx;
}
</style>
