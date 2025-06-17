<template>
  <view class="id-photo-container">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">AI证件照</text>
      <text class="subtitle">智能生成各种规格证件照</text>
    </view>

    <!-- 图片上传区域 -->
    <view class="upload-area" @click="chooseImage" v-if="!imageUrl">
      <view class="upload-content">
        <image class="upload-icon" src="/static/id-photo.png" mode="aspectFit"></image>
        <text class="upload-text">点击选择图片</text>
        <text class="upload-hint">上传您的正面清晰照片，AI将自动生成证件照</text>
      </view>
    </view>

    <!-- 图片预览区域 -->
    <view v-if="imageUrl" class="image-preview-area">
      <image :src="imageUrl" class="preview-image" mode="widthFix" @load="onImageLoad">
      </image>

      <!-- 图片操作按钮 -->
      <view class="image-actions">
        <view class="action-btn" @click="resetImage">
          <text class="action-text">重选图片</text>
        </view>
      </view>
    </view>

    <!-- 参数设置区域 -->
    <view class="settings-area" v-if="imageUrl">
      <!-- 尺寸选择 -->
      <view class="setting-item">
        <text class="setting-label">尺寸:</text>
        <view class="size-selector">
          <view class="selector-box">
            <picker :value="sizeIndex" :range="sizeLabels" @change="onSizePickerChange">
              <view class="picker-value"
                >{{ selectedSizeLabel }} <text class="picker-arrow">></text></view
              >
            </picker>
          </view>
        </view>

        <!-- 不再单独显示原始尺寸信息，已整合到下拉选项中 -->
      </view>

      <!-- 照片底色 -->
      <view class="setting-item">
        <text class="setting-label">照片底色:</text>
        <view class="color-options">
          <view
            v-for="(color, index) in colorOptions"
            :key="index"
            class="color-option"
            :class="{ active: backgroundColor === color.value }"
            :style="{ 'background-color': '#' + color.value }"
            @click="selectColor(color.value)"
          >
          </view>
          <view
            class="color-option rainbow"
            :class="{ active: isCustomColor }"
            @click="enableCustomColor"
          >
          </view>
        </view>

        <!-- 自定义颜色输入区域 -->
        <view class="custom-color-inputs" v-if="isCustomColor">
          <view
            class="color-preview"
            :style="{ 'background-color': '#' + (customColor || 'FFFFFF') }"
          ></view>

          <view class="color-input-group">
            <view class="color-input-row">
              <view class="color-input-item">
                <input
                  type="text"
                  v-model="customColor"
                  placeholder="FFFFFF"
                  maxlength="6"
                  @blur="validateCustomColor"
                  class="color-hex-input"
                />
                <text class="color-input-label">Hex</text>
              </view>

              <view class="color-input-item">
                <input
                  type="number"
                  v-model="customColorR"
                  placeholder="255"
                  maxlength="3"
                  @blur="updateCustomColorFromRGB"
                  class="color-rgb-input"
                />
                <text class="color-input-label">R</text>
              </view>

              <view class="color-input-item">
                <input
                  type="number"
                  v-model="customColorG"
                  placeholder="255"
                  maxlength="3"
                  @blur="updateCustomColorFromRGB"
                  class="color-rgb-input"
                />
                <text class="color-input-label">G</text>
              </view>

              <view class="color-input-item">
                <input
                  type="number"
                  v-model="customColorB"
                  placeholder="255"
                  maxlength="3"
                  @blur="updateCustomColorFromRGB"
                  class="color-rgb-input"
                />
                <text class="color-input-label">B</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 自定义尺寸输入框，只在选择自定义时显示 -->
      <view class="setting-item" v-if="isCustomSize">
        <text class="setting-label">自定义尺寸:</text>
        <view class="custom-size-inputs">
          <view class="custom-input-container">
            <view class="input-label">宽</view>
            <input
              type="number"
              v-model="customWidth"
              placeholder="2000"
              @blur="validateCustomSize"
            />
            <view class="input-unit">px</view>
          </view>
          <view class="custom-input-container">
            <view class="input-label">高</view>
            <input
              type="number"
              v-model="customHeight"
              placeholder="2000"
              @blur="validateCustomSize"
            />
            <view class="input-unit">px</view>
          </view>
        </view>
      </view>

      <!-- 格式选择 -->
      <view class="setting-item">
        <text class="setting-label">输出格式</text>
        <view class="format-options-container">
          <view class="format-options">
            <view
              class="format-option"
              :class="{ active: outputFormat === 'png' }"
              @click="setOutputFormat('png')"
            >
              <text>PNG</text>
            </view>
            <view
              class="format-option"
              :class="{ active: outputFormat === 'jpg' }"
              @click="setOutputFormat('jpg')"
            >
              <text>JPG</text>
            </view>
          </view>
        </view>
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
        :disabled="isProcessing || userPoints < currentPointsCost"
        @click="processImage"
      >
        <text v-if="!isProcessing && userPoints < currentPointsCost">积分不足</text>
        <text v-else-if="!isProcessing">生成证件照</text>
        <text v-else>处理中...</text>
      </button>
    </view>

    <!-- 处理结果 -->
    <view class="result-section" v-if="resultImageUrl">
      <text class="result-title">处理结果</text>
      <image :src="resultImageUrl" class="result-image" mode="widthFix"></image>

      <!-- 过期提示 -->
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

      // 参数设置
      sizeOptions: [
        { label: "原图尺寸", value: "original", mm: "" },
        { label: "一寸 (295*413px | 25*35mm)", value: "295x413", mm: "25*35mm" },
        { label: "二寸 (413*579px | 35*49mm)", value: "413x579", mm: "35*49mm" },
        { label: "小一寸 (260*378px | 22*32mm)", value: "260x378", mm: "22*32mm" },
        { label: "大一寸 (390*567px | 33*48mm)", value: "390x567", mm: "33*48mm" },
        { label: "小二寸 (413*531px | 35*45mm)", value: "413x531", mm: "35*45mm" },
        { label: "大二寸 (413*626px | 35*53mm)", value: "413x626", mm: "35*53mm" },
        { label: "自定义", value: "custom", mm: "" },
      ],
      sizeLabels: [
        "原图尺寸",
        "一寸 (295*413px | 25*35mm)",
        "二寸 (413*579px | 35*49mm)",
        "小一寸 (260*378px | 22*32mm)",
        "大一寸 (390*567px | 33*48mm)",
        "小二寸 (413*531px | 35*45mm)",
        "大二寸 (413*626px | 35*53mm)",
        "自定义",
      ],
      sizeIndex: 0, // 设置默认选中原图尺寸
      selectedSize: "original", // 默认选择原图尺寸
      selectedSizeLabel: "原图尺寸",
      customSize: "",
      customWidth: "2000",
      customHeight: "2000",
      isCustomSize: false,

      outputFormat: "png", // 默认PNG格式

      colorOptions: [
        { label: "白色", value: "FFFFFF" },
        { label: "蓝色", value: "0066FF" },
        { label: "红色", value: "E74C3C" },
      ],
      backgroundColor: "FFFFFF", // 默认白色背景
      customColor: "",
      customColorR: 255,
      customColorG: 255,
      customColorB: 255,
      isCustomColor: false,

      // 处理相关
      pointsCost: 50, // 默认积分消耗
      pointsConfigs: {}, // 积分配置
      pointsDescriptions: {}, // 积分描述
      isProcessing: false,
      processingProgress: 0,
      loadingText: "正在生成证件照...",

      // 结果相关
      resultImageUrl: "",

      // 定时查询相关
      checkStatusInterval: null,
      maxCheckAttempts: 60, // 最多查询60次，即10分钟
      currentCheckAttempt: 0,

      // 用户信息
      userPoints: 0,
      isLoggedIn: false,

      // 日志
      logger: null,

      // 登录弹窗
      showLoginPopup: false,
      loginPopupTitle: "需要登录",
      loginPopupMessage: "使用AI证件照功能需要先登录",
      loginPopupConfirmText: "去登录",
      loginPopupCancelText: "取消",
    };
  },
  computed: {
    // 当前功能的积分消耗
    currentPointsCost() {
      const featureKey = "idphoto";
      const defaultValue = 50; // 默认AI证件照消耗50积分

      const cost = pointsService.getFeaturePointsCost(featureKey, defaultValue);
      console.info(
        `[IDPhoto][计算] 获取证件照积分消耗: featureKey=${featureKey}, 结果=${cost}`
      );
      return cost;
    },
  },
  onLoad() {
    this.initLogger();
    console.info("[IDPhoto][初始化] 页面加载开始");
    this.loadUserInfo(); // 加载用户信息

    // 获取积分配置
    this.fetchPointsConfigs();

    // 检查全局状态中是否有用户积分信息
    try {
      const globalUserInfo = uni.getStorageSync("userInfo");
      console.info(
        `[IDPhoto][初始化] 全局用户信息: ${
          globalUserInfo ? JSON.stringify(globalUserInfo) : "未找到"
        }`
      );

      // 检查是否有其他可能存储积分的位置
      const possibleStorageKeys = ["points", "userPoints", "pointsInfo", "balance"];
      possibleStorageKeys.forEach((key) => {
        const value = uni.getStorageSync(key);
        if (value) {
          console.info(
            `[IDPhoto][初始化] 存储中发现可能的积分信息: ${key}=${JSON.stringify(value)}`
          );
        }
      });
    } catch (e) {
      console.error("[IDPhoto][初始化] 检查全局状态出错:", e);
    }
  },
  onShow() {
    // 刷新用户信息
    this.loadUserInfo();

    // 刷新积分配置
    this.fetchPointsConfigs();
  },
  onUnload() {
    // 清理定时器
    if (this.checkStatusInterval) {
      clearInterval(this.checkStatusInterval);
    }
  },
  methods: {
    /**
     * 初始化日志记录器
     */
    initLogger() {
      this.logger = {
        info: (message) => {
          console.info("[IDPhoto][INFO] " + message);
        },
        warn: (message) => {
          console.warn("[IDPhoto][WARN] " + message);
        },
        error: (message, error) => {
          console.error("[IDPhoto][ERROR] " + message, error);
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
        console.log("积分配置", result);

        // 更新组件内部的配置副本
        this.pointsConfigs = result.configs;
        this.pointsDescriptions = result.descriptions;

        // 更新默认积分消耗
        this.pointsCost = this.currentPointsCost;
        this.logger.info(`已更新证件照积分消耗为: ${this.pointsCost}`);

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
        this.logger.info(`当前token状态: ${token ? "存在" : "不存在"}`);

        if (!token) {
          this.isLoggedIn = false;
          this.userPoints = 0;
          return;
        }

        this.logger.info("开始请求用户信息API...");
        const response = await visualApi.getUserInfo();
        this.logger.info(`API返回的完整用户信息: ${JSON.stringify(response)}`);

        this.isLoggedIn = true;

        // 检查是否有标准的API响应结构
        if (response && response.code === 0) {
          this.logger.info("检测到标准API响应格式 (code=0)");
          if (response.data) {
            this.userPoints = response.data.points || 0;
            this.logger.info(`从标准响应结构(data.points)获取积分: ${this.userPoints}`);
          } else {
            this.userPoints = 0;
            this.logger.warn("标准响应中没有data字段或data字段为空");
          }
        } else if (response && response.data) {
          // 另一种API响应格式，没有code但有data
          this.userPoints = response.data.points || 0;
          this.logger.info(`从非标准响应(data.points)获取积分: ${this.userPoints}`);
        } else {
          // 直接返回用户信息的情况
          this.userPoints = response.points || 0;
          this.logger.info(`从直接响应(points)获取积分: ${this.userPoints}`);
        }

        this.logger.info(`最终设置的用户积分: ${this.userPoints}`);

        // 检查response对象中是否有其他积分相关字段
        const userInfoObj = response.data || response;
        const userInfoKeys = Object.keys(userInfoObj);
        this.logger.info(`用户信息包含的字段: ${userInfoKeys.join(", ")}`);

        // 如果没有points字段但有类似字段，记录日志
        const possiblePointsFields = userInfoKeys.filter(
          (key) =>
            key.toLowerCase().includes("point") ||
            key.toLowerCase().includes("score") ||
            key.toLowerCase().includes("credit") ||
            key.toLowerCase().includes("balance")
        );

        if (possiblePointsFields.length > 0) {
          this.logger.info(
            `发现可能的积分相关字段: ${JSON.stringify(
              possiblePointsFields.map((field) => ({ field, value: userInfoObj[field] }))
            )}`
          );
        }
      } catch (error) {
        this.logger.error("加载用户信息失败:", error);
        console.error("详细错误信息:", error);
        this.isLoggedIn = false;
        this.userPoints = 0;
      }
    },

    /**
     * 显示登录弹窗
     */
    showLoginConfirmPopup(title, message) {
      this.loginPopupTitle = title || "需要登录";
      this.loginPopupMessage = message || "使用AI证件照功能需要先登录";
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

    /**
     * 检查用户登录状态
     */
    checkLoginStatus() {
      const token = uni.getStorageSync("token");
      this.isLoggedIn = !!token;

      if (!this.isLoggedIn) {
        this.logger.warn("用户未登录或token已过期");
        this.showLoginConfirmPopup("需要登录", "使用AI证件照功能需要先登录");

        // 重置用户积分
        this.userPoints = 0;
        return false;
      }

      return true;
    },

    /**
     * 选择图片
     */
    chooseImage() {
      try {
        uni.chooseImage({
          count: 1,
          sizeType: ["original", "compressed"],
          sourceType: ["album", "camera"],
          success: (res) => {
            const tempFilePath = res.tempFilePaths[0];
            this.imageUrl = tempFilePath;
            this.imageFile = tempFilePath;
            this.logger.info(`选择图片: ${tempFilePath}`);
            this.resultImageUrl = ""; // 清除之前的结果
          },
          fail: (err) => {
            this.logger.error("选择图片失败:", err);
            uni.showToast({
              title: "选择图片失败: " + (err.errMsg || "未知错误"),
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
     * 图片加载完成事件处理
     */
    onImageLoad(e) {
      this.imageWidth = e.detail.width;
      this.imageHeight = e.detail.height;
      this.logger.info(`图片尺寸: ${this.imageWidth}x${this.imageHeight}`);

      // 更新原图尺寸选项的文本
      if (this.imageWidth && this.imageHeight) {
        this.sizeLabels[0] = `原图尺寸 (${this.imageWidth}*${this.imageHeight}px)`;
        this.sizeOptions[0].label = `原图尺寸 (${this.imageWidth}*${this.imageHeight}px)`;

        // 如果当前选择的是原图尺寸，也要更新显示文本
        if (this.selectedSize === "original") {
          this.selectedSizeLabel = this.sizeLabels[0];
        }
      }
    },

    /**
     * 重置图片
     */
    resetImage() {
      this.imageUrl = "";
      this.imageFile = null;
      this.resultImageUrl = "";
      // 重置原图尺寸选项的文本
      this.sizeLabels[0] = "原图尺寸";
      this.sizeOptions[0].label = "原图尺寸";
      if (this.selectedSize === "original") {
        this.selectedSizeLabel = "原图尺寸";
      }
      this.imageWidth = 0;
      this.imageHeight = 0;
      this.logger.info("重置图片");
    },

    /**
     * 设置输出格式
     */
    setOutputFormat(format) {
      this.outputFormat = format;
      this.logger.info(`设置输出格式: ${format}`);
    },

    /**
     * 验证自定义尺寸
     */
    validateCustomSize() {
      if (!this.customWidth || !this.customHeight) {
        uni.showToast({
          title: "请输入宽度和高度",
          icon: "none",
        });
        return;
      }

      const width = parseInt(this.customWidth);
      const height = parseInt(this.customHeight);

      // 检查数值范围
      if (width < 100 || width > 3000 || height < 100 || height > 3000) {
        uni.showToast({
          title: "尺寸必须在100至3000像素之间",
          icon: "none",
        });
        return;
      }

      // 格式正确，设置为当前选择的尺寸
      this.customSize = `${width}x${height}`;
      this.selectedSize = this.customSize;
      this.isCustomSize = true;
      this.logger.info(`设置自定义尺寸: ${this.selectedSize}`);
    },

    /**
     * 启用自定义颜色
     */
    enableCustomColor() {
      // 切换自定义颜色输入框的显示状态
      this.isCustomColor = !this.isCustomColor;

      if (this.isCustomColor) {
        // 如果已经有自定义颜色，则解析为RGB值
        if (this.customColor && /^[0-9A-Fa-f]{6}$/.test(this.customColor)) {
          // 解析RGB值
          this.customColorR = parseInt(this.customColor.substr(0, 2), 16).toString();
          this.customColorG = parseInt(this.customColor.substr(2, 2), 16).toString();
          this.customColorB = parseInt(this.customColor.substr(4, 2), 16).toString();
        } else if (
          this.backgroundColor &&
          /^[0-9A-Fa-f]{6}$/.test(this.backgroundColor)
        ) {
          // 从当前背景色解析
          this.customColor = this.backgroundColor;
          this.customColorR = parseInt(this.backgroundColor.substr(0, 2), 16).toString();
          this.customColorG = parseInt(this.backgroundColor.substr(2, 2), 16).toString();
          this.customColorB = parseInt(this.backgroundColor.substr(4, 2), 16).toString();
        } else {
          // 默认设为白色
          this.customColor = "FFFFFF";
          this.customColorR = "255";
          this.customColorG = "255";
          this.customColorB = "255";
        }

        this.logger.info("启用自定义颜色输入");
      } else {
        // 如果关闭自定义输入，且已有自定义颜色，则应用自定义颜色
        if (this.customColor && /^[0-9A-Fa-f]{6}$/.test(this.customColor)) {
          this.backgroundColor = this.customColor.toUpperCase();
          this.logger.info(`应用自定义颜色: ${this.backgroundColor}`);
        }
      }
    },

    /**
     * 更新自定义颜色
     */
    updateCustomColorFromRGB() {
      try {
        // 确保RGB值在有效范围内
        let r = Math.min(255, Math.max(0, parseInt(this.customColorR || 0)));
        let g = Math.min(255, Math.max(0, parseInt(this.customColorG || 0)));
        let b = Math.min(255, Math.max(0, parseInt(this.customColorB || 0)));

        // 更新RGB输入值
        this.customColorR = r.toString();
        this.customColorG = g.toString();
        this.customColorB = b.toString();

        // 转换为十六进制
        const rHex = r.toString(16).padStart(2, "0");
        const gHex = g.toString(16).padStart(2, "0");
        const bHex = b.toString(16).padStart(2, "0");

        this.customColor = (rHex + gHex + bHex).toUpperCase();
        this.backgroundColor = this.customColor;

        this.logger.info(`从RGB更新自定义颜色: ${this.backgroundColor}`);
      } catch (error) {
        this.logger.error("从RGB更新颜色失败:", error);
      }
    },

    /**
     * 验证自定义颜色
     */
    validateCustomColor() {
      if (!this.customColor) {
        return;
      }

      // 检查格式是否正确: 6位16进制颜色代码
      const colorPattern = /^[0-9A-Fa-f]{6}$/;

      if (!colorPattern.test(this.customColor)) {
        uni.showToast({
          title: "颜色格式错误，请使用6位16进制颜色代码",
          icon: "none",
        });
        return;
      }

      // 格式正确，设置为当前选择的颜色
      this.backgroundColor = this.customColor.toUpperCase();

      // 更新RGB值
      this.customColorR = parseInt(this.customColor.substr(0, 2), 16).toString();
      this.customColorG = parseInt(this.customColor.substr(2, 2), 16).toString();
      this.customColorB = parseInt(this.customColor.substr(4, 2), 16).toString();

      this.logger.info(`设置自定义颜色: ${this.backgroundColor}`);
    },

    /**
     * 处理图片
     */
    async processImage() {
      // 检查登录状态
      if (!this.checkLoginStatus()) {
        return;
      }

      // 检查积分是否足够
      if (this.userPoints < this.currentPointsCost) {
        uni.showToast({
          title: "积分不足，请充值",
          icon: "none",
        });
        return;
      }

      // 开始处理
      this.isProcessing = true;
      this.processingProgress = 0;
      this.loadingText = "正在生成证件照...";

      try {
        // 准备请求参数
        const params = {
          image_file: this.imageFile,
          format: this.outputFormat,
          sync: 0, // 异步处理
          return_type: 1, // 返回URL
        };

        // 处理尺寸
        if (this.selectedSize !== "original") {
          params.size = this.selectedSize;
        }

        // 如果是JPG格式且设置了背景色，则添加背景色参数
        if (this.outputFormat === "jpg") {
          if (this.backgroundColor === "rainbow") {
            params.bg_color = "rainbow";
          } else if (this.backgroundColor) {
            params.bg_color = this.backgroundColor;
          }
        }

        // 调用API处理图片
        this.logger.info("开始处理图片:", params);
        const result = await visualApi.createIdPhoto(params);

        // 检查处理结果
        if (result && result.data && result.data.task_id) {
          this.logger.info(`任务ID: ${result.data.task_id}`);
          // 开始定时查询处理状态
          this.startCheckingStatus(result.data.task_id);
        } else {
          this.logger.error("API响应格式:", JSON.stringify(result));
          throw new Error("处理失败，未获取到任务ID");
        }
      } catch (error) {
        this.logger.error("处理图片失败:", error);
        this.isProcessing = false;

        // 显示错误信息
        uni.showToast({
          title: error.message || "处理失败，请重试",
          icon: "none",
        });
      }
    },

    /**
     * 开始定时查询处理状态
     */
    startCheckingStatus(taskId) {
      this.currentCheckAttempt = 0;

      // 清理之前的定时器
      if (this.checkStatusInterval) {
        clearInterval(this.checkStatusInterval);
      }

      // 设置定时查询，每10秒查询一次
      this.checkStatusInterval = setInterval(() => {
        this.checkTaskStatus(taskId);
      }, 10000);

      // 立即进行第一次查询
      this.checkTaskStatus(taskId);
    },

    /**
     * 查询任务处理状态
     */
    async checkTaskStatus(taskId) {
      try {
        this.currentCheckAttempt++;

        this.logger.info(
          `查询任务状态 (${this.currentCheckAttempt}/${this.maxCheckAttempts}): ${taskId}`
        );

        // 如果超过最大查询次数，停止查询
        if (this.currentCheckAttempt > this.maxCheckAttempts) {
          clearInterval(this.checkStatusInterval);
          this.isProcessing = false;
          uni.showToast({
            title: "处理超时，请稍后再试",
            icon: "none",
          });
          return;
        }

        const result = await visualApi.getTaskStatus(taskId);

        // 更新进度
        if (result.data && result.data.progress !== undefined) {
          this.processingProgress = result.data.progress / 100;
        }

        // 检查任务状态
        if (result.data && result.data.state === 1) {
          // 成功
          // 停止查询
          clearInterval(this.checkStatusInterval);
          this.isProcessing = false;

          // 显示结果
          if (result.data && result.data.image) {
            this.resultImageUrl = result.data.image;
            this.logger.info(`任务完成，结果URL: ${this.resultImageUrl}`);

            // 更新用户积分（减去消耗的积分）
            this.userPoints -= this.currentPointsCost;

            // 显示成功提示
            uni.showToast({
              title: "证件照生成成功",
              icon: "success",
            });
          } else {
            throw new Error("未获取到结果URL");
          }
        } else if (result.data && (result.data.state === 3 || result.data.state === -1)) {
          // 失败或任务查询错误
          // 停止查询
          clearInterval(this.checkStatusInterval);
          this.isProcessing = false;

          // 获取错误详情
          let errorMessage = "";
          if (result.data.state === -1) {
            this.logger.error(`任务查询失败，错误详情: ${JSON.stringify(result.data)}`);
            errorMessage =
              result.data.err_message || result.data.state_detail || "处理出错，请重试";
          } else {
            errorMessage = result.data.message || "处理失败，请重试";
          }

          // 显示错误信息
          uni.showToast({
            title: errorMessage,
            icon: "none",
            duration: 3000, // 显示时间延长到3秒
          });
        }
        // 状态为0(排队中)或1(处理中)时继续定时查询
      } catch (error) {
        this.logger.error("查询任务状态失败:", error);

        // 不要立即停止查询，继续尝试
        // 如果多次失败会在最大查询次数处终止

        // 显示临时错误信息
        uni.showToast({
          title: "查询状态失败，正在重试",
          icon: "none",
        });
      }
    },

    /**
     * 保存结果图片
     */
    saveImage() {
      if (!this.resultImageUrl) {
        return;
      }

      this.logger.info("开始保存图片:", this.resultImageUrl);

      uni.showLoading({
        title: "保存中...",
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
                  title: "图片已保存到相册",
                  icon: "success",
                });
                this.logger.info("图片已保存到相册");
              },
              fail: (err) => {
                uni.hideLoading();
                this.logger.error("保存图片到相册失败:", err);

                if (err.errMsg.includes("auth deny")) {
                  uni.showModal({
                    title: "保存失败",
                    content: "需要您授权保存图片到相册",
                    confirmText: "去授权",
                    success: (res) => {
                      if (res.confirm) {
                        uni.openSetting();
                      }
                    },
                  });
                } else {
                  uni.showToast({
                    title: "保存失败，请重试",
                    icon: "none",
                  });
                }
              },
            });
          } else {
            uni.hideLoading();
            uni.showToast({
              title: "下载图片失败，请重试",
              icon: "none",
            });
            this.logger.error("下载图片失败:", res);
          }
        },
        fail: (err) => {
          uni.hideLoading();
          uni.showToast({
            title: "下载图片失败，请重试",
            icon: "none",
          });
          this.logger.error("下载图片失败:", err);
        },
      });
    },

    /**
     * 重置所有状态，重新开始
     */
    resetAll() {
      this.imageUrl = "";
      this.imageFile = null;
      this.resultImageUrl = "";

      // 重置进度
      this.isProcessing = false;
      this.processingProgress = 0;

      // 重置原图尺寸选项的文本
      this.sizeLabels[0] = "原图尺寸";
      this.sizeOptions[0].label = "原图尺寸";
      if (this.selectedSize === "original") {
        this.selectedSizeLabel = "原图尺寸";
      }
      this.imageWidth = 0;
      this.imageHeight = 0;

      // 清理定时器
      if (this.checkStatusInterval) {
        clearInterval(this.checkStatusInterval);
      }

      this.logger.info("重置所有状态");
    },

    /**
     * 选择器改变事件
     */
    onSizePickerChange(e) {
      this.sizeIndex = e.detail.value;
      const sizeLabel = this.sizeLabels[this.sizeIndex];
      this.selectedSizeLabel = sizeLabel;

      if (sizeLabel.includes("自定义")) {
        this.enableCustomSize();
      } else {
        const size = this.sizeOptions.find((item) => item.label === sizeLabel);
        if (size) {
          this.selectedSize = size.value;
          this.isCustomSize = false;
        }
      }
    },

    /**
     * 启用自定义尺寸
     */
    enableCustomSize() {
      this.isCustomSize = true;
      this.selectedSizeLabel = "自定义";
      const customIndex = this.sizeLabels.findIndex((label) => label.includes("自定义"));
      this.sizeIndex = customIndex !== -1 ? customIndex : 7; // 自定义的索引

      // 如果已经有自定义尺寸值，解析出宽高
      if (this.customSize && this.customSize.includes("x")) {
        const [width, height] = this.customSize.split("x");
        this.customWidth = width;
        this.customHeight = height;
      }
    },

    /**
     * 选择颜色
     */
    selectColor(color) {
      this.backgroundColor = color;
      // 选择普通颜色时隐藏自定义颜色面板
      this.isCustomColor = false;
      this.logger.info(`选择普通颜色: ${color}, 隐藏自定义颜色面板`);
    },

    // 添加分享功能
    onShareAppMessage() {
      // 根据当前是否有处理结果提供不同的分享信息
      if (this.resultImageUrl) {
        return {
          title: "我使用AI实用宝生成了专业证件照！",
          path: "/pages/id-photo/id-photo",
          imageUrl: this.resultImageUrl, // 使用处理后的证件照作为分享封面
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
          title: "AI实用宝 - AI智能证件照制作",
          path: "/pages/id-photo/id-photo",
          imageUrl: "/static/id-photo.png", // 使用功能图标作为分享封面
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
.id-photo-container {
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

.upload-area {
  width: 100%;
  height: 400rpx;
  background-color: #fff;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 30rpx 0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  border: 2rpx dashed #ddd;
  transition: all 0.3s ease;
}

.upload-area:active {
  background-color: #f0f0f0;
  border-color: #0099ff;
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
  color: #909399;
}

.image-preview-area {
  margin: 30rpx 0;
}

.preview-image {
  width: 100%;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.image-actions {
  display: flex;
  justify-content: center;
  margin: 20rpx 0;
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
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  margin: 0 20rpx;
  background-color: #f0f0f0;
}

.settings-area {
  background-color: #f0f5ff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
  border-left: 8rpx solid #0099ff;
}

.setting-item {
  margin-bottom: 30rpx;
}

.setting-label {
  font-size: 30rpx;
  font-weight: normal;
  color: #333;
  margin-bottom: 15rpx;
  display: block;
}

.size-selector {
  width: 100%;
  margin-top: 10rpx;
}

.selector-box {
  background-color: #fff;
  padding: 20rpx;
  border-radius: 40rpx;
  border: 1rpx solid #ddd;
}

.picker-value {
  font-size: 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker-arrow {
  color: #999;
  transform: rotate(90deg);
  font-size: 24rpx;
}

/* 尺寸详细信息样式 */
.size-details {
  margin-top: 15rpx;
  padding: 12rpx 20rpx;
  background-color: #fff;
  border-radius: 8rpx;
  border: 1rpx dashed #ddd;
}

.size-info {
  font-size: 26rpx;
  color: #666;
  display: block;
  text-align: center;
}

/* 自定义尺寸输入框样式 */
.custom-size-inputs {
  width: 100%;
  display: flex;
  justify-content: space-between;
  margin-top: 10rpx;
}

.custom-input-container {
  width: 48%;
  background-color: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #ddd;
  display: flex;
  align-items: center;
  padding: 10rpx;
}

.input-label {
  font-size: 26rpx;
  color: #333;
  margin-right: 10rpx;
  margin-left: 5rpx;
}

.input-unit {
  font-size: 26rpx;
  color: #999;
  margin-left: 5rpx;
}

.custom-input-container input {
  flex: 1;
  font-size: 26rpx;
  text-align: center;
  color: #333;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
}

.color-option {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  margin-bottom: 15rpx;
  border: 1rpx solid #ddd;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
  position: relative;
}

.color-option.active {
  border: 3rpx solid #3a5af9;
  box-shadow: 0 0 0 2rpx rgba(58, 90, 249, 0.3);
}

.color-option.rainbow {
  background: linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet);
  position: relative;
  overflow: hidden;
}

.color-option.rainbow:after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.2);
  opacity: 0;
  transition: opacity 0.3s;
  border-radius: 50%;
}

.color-option.rainbow:active:after {
  opacity: 1;
}

.custom-color-inputs {
  display: flex;
  background-color: #fff;
  padding: 20rpx;
  border-radius: 16rpx;
  margin-top: 20rpx;
  border: 1rpx solid #eee;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  align-items: center;
}

.color-preview {
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  border: 1rpx solid #ddd;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.color-input-group {
  flex: 1;
}

.color-input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.color-input-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.color-input-label {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
  text-align: center;
}

.color-hex-input {
  width: 150rpx;
  height: 60rpx;
  border: 1rpx solid #ddd;
  border-radius: 6rpx;
  padding: 0 10rpx;
  font-size: 24rpx;
  text-align: center;
  background-color: #f9f9f9;
}

.color-rgb-input {
  width: 80rpx;
  height: 60rpx;
  border: 1rpx solid #ddd;
  border-radius: 6rpx;
  padding: 0 10rpx;
  font-size: 24rpx;
  text-align: center;
  background-color: #f9f9f9;
}

.action-section {
  margin: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.points-info {
  text-align: center;
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
  background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  height: 80rpx;
  line-height: 80rpx;
  box-shadow: 0 4rpx 12rpx rgba(58, 90, 249, 0.3);
  border: none;
  transition: all 0.3s ease;
  margin-top: 20rpx;
  width: 80%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.process-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 8rpx rgba(58, 90, 249, 0.2);
  opacity: 0.95;
}

.process-btn[disabled] {
  background: linear-gradient(135deg, #c0c4cc 0%, #909399 100%);
  color: #fff;
  box-shadow: none;
}

.result-section {
  margin: 40rpx 0;
}

.result-title {
  font-size: 32rpx;
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

.expiry-warning {
  display: flex;
  align-items: center;
  background-color: #fff7e6;
  padding: 15rpx 20rpx;
  border-radius: 8rpx;
  margin: 20rpx 0;
  border-left: 4rpx solid #faad14;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.warning-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 10rpx;
}

.warning-text {
  font-size: 24rpx;
  color: #fa8c16;
  line-height: 1.5;
}

.result-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 30rpx;
}

.save-btn,
.reset-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  margin: 0 15rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.save-btn {
  background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
  color: #fff;
}

.reset-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff4d4f 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-icon {
  margin-right: 8rpx;
  font-size: 32rpx;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  background-color: #fff;
  padding: 40rpx;
  border-radius: 16rpx;
  text-align: center;
  width: 70%;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border: 6rpx solid #f3f3f3;
  border-top: 6rpx solid #3a5af9;
  border-radius: 50%;
  margin: 0 auto 20rpx;
  animation: spin 1s linear infinite;
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
  display: block;
}

.loading-progress {
  font-size: 36rpx;
  color: #3a5af9;
  font-weight: bold;
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

.format-options-container {
  margin-top: 10rpx;
}

.format-options {
  display: flex;
  border-radius: 40rpx;
  overflow: hidden;
  background-color: #f7f8fc;
  width: fit-content;
  border: none;
}

.format-option {
  padding: 12rpx 30rpx;
  font-size: 28rpx;
  color: #333;
  position: relative;
  transition: all 0.3s;
  border-radius: 40rpx;
  margin: 0 4rpx;
}

.format-option.active {
  background-color: #4285f4;
  color: #fff;
  font-weight: 500;
  box-shadow: 0 2rpx 8rpx rgba(66, 133, 244, 0.3);
}

.format-option:not(.active) {
  background-color: transparent;
}
</style>
