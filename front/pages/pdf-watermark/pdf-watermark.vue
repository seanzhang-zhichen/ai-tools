<template>
  <view class="pdf-watermark-container">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">PDF去水印</text>
      <text class="subtitle">一键去除PDF文档中的水印</text>
    </view>

    <!-- PDF文件上传区域 -->
    <view class="upload-area" @click="choosePdfFile" v-if="!pdfUrl && !pdfFile">
      <view class="upload-content">
        <image
          class="upload-icon"
          src="/static/pdf-watermark.png"
          mode="aspectFit"
        ></image>
        <text class="upload-text">点击选择PDF文件</text>
        <text class="upload-hint">支持PDF格式，最大{{ maxFileSizeMB }}MB</text>
        <text v-if="platform.isWechat" class="platform-hint"
          >可以从聊天记录中选择PDF文件</text
        >
        <text v-if="platform.isH5" class="platform-hint">将从本地文件中选择PDF文件</text>
        <text v-if="platform.isApp" class="platform-hint">将从手机文件中选择PDF文件</text>
        <text v-if="platform.isOtherMP" class="platform-warning"
          >当前小程序平台不支持文件选择，请使用微信小程序</text
        >
      </view>
    </view>

    <!-- PDF预览和信息区域 -->
    <view v-if="pdfUrl || pdfFile" class="pdf-preview-area">
      <!-- PDF文件信息卡片 -->
      <view class="pdf-info-card">
        <view class="pdf-icon">
          <image src="/static/pdf-watermark.png" mode="aspectFit"></image>
        </view>
        <view class="pdf-info">
          <text class="pdf-name">{{ pdfName }}</text>
        </view>
        <text class="pdf-size">{{ pdfSizeText }}</text>
      </view>

      <!-- PDF操作按钮 -->
      <view class="pdf-actions">
        <view class="action-btn" @click="resetPdf">
          <text class="action-text">重选文件</text>
        </view>
      </view>

      <!-- 密码输入区域 (如果PDF有密码保护) -->
      <view class="password-section">
        <text class="option-title">PDF密码 (如有):</text>
        <input
          class="password-input"
          type="password"
          v-model="pdfPassword"
          placeholder="如PDF有密码保护，请输入密码"
        />
      </view>
    </view>

    <!-- 结果区域 -->
    <view class="result-section" v-if="resultUrl">
      <text class="result-title">处理结果</text>

      <!-- 结果信息卡片 -->
      <view class="result-info-card">
        <view class="pdf-icon">
          <image src="/static/pdf-done.png" mode="aspectFit"></image>
        </view>
        <view class="pdf-info">
          <text class="pdf-name">已完成处理</text>
          <text class="pdf-pages">总页数: {{ resultPagesCount }}</text>
        </view>
      </view>

      <!-- 增加过期提示 -->
      <view class="expiry-warning">
        <image
          class="warning-icon"
          src="/static/icon-warning.png"
          mode="aspectFit"
        ></image>
        <text class="warning-text">请在1小时内保存文件，结果将在1小时后过期</text>
      </view>

      <view class="result-actions">
        <button class="action-btn save-btn" @click="downloadResult">
          <text>复制下载链接</text>
        </button>
        <button class="action-btn reset-btn" @click="resetAll">
          <text class="reset-icon">↻</text>
          <text>重新处理</text>
        </button>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view
      class="action-section"
      v-if="(pdfUrl || pdfFile) && !resultUrl && !isProcessing"
    >
      <view class="points-info">
        <text class="points-text">消耗积分: {{ currentPointsCost }}</text>
        <text v-if="userPoints < currentPointsCost" class="points-not-enough"
          >积分不足，当前积分: {{ userPoints }}</text
        >
      </view>
      <button
        class="process-btn"
        :disabled="isProcessing || userPoints < currentPointsCost"
        @click="processPdf"
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
          >{{ Math.floor(processingProgress) }}%</text
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
import pdfWatermarkApi from "@/api/pdfWatermarkApi";
import LoginConfirmPopup from "@/components/LoginConfirmPopup.vue";
import { getPointsConfigs } from "@/api/pointsApi";
import pointsService from "@/utils/pointsService";
import request from "@/utils/request";

export default {
  components: {
    LoginConfirmPopup,
  },
  data() {
    return {
      // PDF文件相关
      pdfUrl: "",
      pdfFile: null,
      pdfName: "",
      pdfSize: 0,
      pdfPassword: "",

      // 平台信息
      platform: {
        isApp: false,
        isH5: false,
        isWechat: false,
        isOtherMP: false,
        supportFileSelect: false,
      },

      // 最大文件大小限制 (100MB)
      maxFileSize: 100 * 1024 * 1024,

      // 处理相关
      pointsCost: 80, // 默认积分消耗
      pointsConfigs: {}, // 积分配置
      pointsDescriptions: {}, // 积分描述
      isProcessing: false,
      processingProgress: 0,
      loadingText: "正在处理PDF...",

      // 结果相关
      resultUrl: "",
      resultPagesCount: 0,

      // 用户信息
      userPoints: 0,
      isLoggedIn: false,

      // 登录弹窗
      showLoginPopup: false,
      loginPopupTitle: "需要登录",
      loginPopupMessage: "使用PDF去水印功能需要先登录",
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
      const featureKey = "pdf_watermark_removal";
      const defaultValue = 80; // PDF去水印默认80积分

      return pointsService.getFeaturePointsCost(featureKey, defaultValue);
    },

    /**
     * PDF大小的文本表示
     * @returns {String} 格式化的文件大小文本
     */
    pdfSizeText() {
      if (!this.pdfSize) {
        return "未知大小";
      }

      const kb = this.pdfSize / 1024;
      if (kb < 1024) {
        return kb.toFixed(2) + " KB";
      }

      const mb = kb / 1024;
      return mb.toFixed(2) + " MB";
    },

    /**
     * 最大文件大小的MB表示
     * @returns {Number} 最大文件大小（MB）
     */
    maxFileSizeMB() {
      return this.maxFileSize / (1024 * 1024);
    },
  },
  created() {
    // 页面创建时检查登录状态和积分余额
    this.checkLoginStatus();
    this.loadPointsInfo();

    // 初始化平台信息
    this.initPlatformInfo();
  },
  onLoad() {
    // 获取用户信息
    this.getUserInfo();
  },
  onShow() {
    // 刷新用户信息
    this.getUserInfo();
  },
  methods: {
    /**
     * 初始化平台信息
     */
    initPlatformInfo() {
      // #ifdef APP-PLUS
      this.platform.isApp = true;
      this.platform.supportFileSelect = true;
      // #endif

      // #ifdef H5
      this.platform.isH5 = true;
      this.platform.supportFileSelect = true;
      // #endif

      // #ifdef MP-WEIXIN
      this.platform.isWechat = true;
      this.platform.supportFileSelect = true;
      // #endif

      // #ifdef MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
      this.platform.isOtherMP = true;
      this.platform.supportFileSelect = false;
      // #endif

      console.log("当前平台信息:", this.platform);
    },

    /**
     * 检查用户登录状态
     */
    checkLoginStatus() {
      const token = uni.getStorageSync("token");
      this.isLoggedIn = !!token;
    },

    /**
     * 获取用户信息和积分余额
     */
    async getUserInfo() {
      try {
        const res = await request({
          url: "/user/info",
          method: "GET",
          skipAuthRedirect: true,
        });

        if (res.code === 0 && res.data) {
          this.userPoints = res.data.points || 0;
          this.isLoggedIn = true;
        }
      } catch (error) {
        console.error("获取用户信息失败", error);
      }
    },

    /**
     * 加载积分配置信息
     */
    async loadPointsInfo() {
      try {
        const result = await getPointsConfigs();
        if (result.code === 0 && result.data) {
          // 更新积分配置和描述
          this.pointsConfigs = result.data.configs || {};
          this.pointsDescriptions = result.data.descriptions || {};
          console.log("积分配置加载成功:", this.pointsConfigs);
        }
      } catch (error) {
        console.error("加载积分配置失败:", error);
      }
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
     * 跳转到登录页面
     */
    goToLogin() {
      this.hideLoginPopup();
      uni.navigateTo({
        url: "/pages/login/login",
      });
    },

    /**
     * 选择PDF文件
     */
    async choosePdfFile() {
      // 先检查登录状态
      if (!this.isLoggedIn) {
        this.showLoginConfirm();
        return;
      }

      try {
        let result;
        // 判断平台，使用对应的文件选择API
        // #ifdef APP-PLUS
        // APP环境使用plus.io或uni.chooseFile
        result = await new Promise((resolve, reject) => {
          uni.chooseFile({
            count: 1,
            type: "all",
            extension: [".pdf"],
            success: resolve,
            fail: reject,
          });
        });
        // #endif

        // #ifdef H5
        // H5环境使用input file
        result = await new Promise((resolve, reject) => {
          // 创建一个隐藏的file input
          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = ".pdf";
          fileInput.style.display = "none";
          document.body.appendChild(fileInput);

          fileInput.onchange = (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              resolve({
                tempFiles: [
                  {
                    path: window.URL.createObjectURL(files[0]),
                    name: files[0].name,
                    size: files[0].size,
                  },
                ],
              });
            } else {
              reject(new Error("未选择文件"));
            }
            document.body.removeChild(fileInput);
          };

          fileInput.click();
        });
        // #endif

        // #ifdef MP-WEIXIN
        // 微信小程序环境使用chooseMessageFile
        result = await new Promise((resolve, reject) => {
          uni.chooseMessageFile({
            count: 1, // 限制只能选择一个文件
            type: "file", // 选择文件
            extension: [".pdf", "pdf"], // 仅允许选择PDF文件
            success: resolve,
            fail: reject,
          });
        });
        // #endif

        // #ifdef MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
        // 其他小程序平台
        uni.showToast({
          title: "当前平台不支持文件选择，请前往微信小程序使用",
          icon: "none",
          duration: 3000,
        });
        return;
        // #endif

        if (result && result.tempFiles && result.tempFiles.length > 0) {
          const file = result.tempFiles[0];

          // 检查文件大小
          if (file.size > this.maxFileSize) {
            uni.showToast({
              title: `文件过大，最大限制${this.maxFileSizeMB}MB`,
              icon: "none",
            });
            return;
          }

          // 检查文件类型
          if (!file.name.toLowerCase().endsWith(".pdf")) {
            uni.showToast({
              title: "只支持PDF格式文件",
              icon: "none",
            });
            return;
          }

          // 保存文件信息
          this.pdfFile = file.path;
          this.pdfName = file.name;
          this.pdfSize = file.size;
          console.log("已选择PDF文件:", this.pdfName);
        }
      } catch (error) {
        console.error("选择PDF文件失败:", error);
        uni.showToast({
          title: "选择文件失败",
          icon: "none",
        });
      }
    },

    /**
     * 重置PDF文件选择
     */
    resetPdf() {
      this.pdfFile = null;
      this.pdfUrl = "";
      this.pdfName = "";
      this.pdfSize = 0;
      this.pdfPassword = "";
    },

    /**
     * 重置所有状态
     */
    resetAll() {
      this.resetPdf();
      this.resultUrl = "";
      this.resultPagesCount = 0;

      // 清除任务检查定时器
      if (this.taskCheckInterval) {
        clearInterval(this.taskCheckInterval);
        this.taskCheckInterval = null;
      }

      this.taskId = null;
      this.isProcessing = false;
      this.processingProgress = 0;
    },

    /**
     * 处理PDF文件去水印
     */
    async processPdf() {
      if (!this.isLoggedIn) {
        this.showLoginConfirm();
        return;
      }

      if (!this.pdfFile && !this.pdfUrl) {
        uni.showToast({
          title: "请先选择PDF文件",
          icon: "none",
        });
        return;
      }

      // 检查积分
      if (this.userPoints < this.currentPointsCost) {
        uni.showModal({
          title: "积分不足",
          content: `当前操作需要${this.currentPointsCost}积分，您的积分余额为${this.userPoints}，是否前往购买积分？`,
          confirmText: "去购买",
          cancelText: "取消",
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({
                url: "/pages/points/buy-points",
              });
            }
          },
        });
        return;
      }

      try {
        // 开始处理
        this.isProcessing = true;
        this.loadingText = "正在上传PDF文件...";
        this.processingProgress = 0;

        // 准备请求参数
        const params = {
          password: this.pdfPassword || "",
        };

        // 添加文件或URL
        if (this.pdfFile) {
          params.pdf_file = this.pdfFile;
        } else if (this.pdfUrl) {
          params.pdf_url = this.pdfUrl;
        }

        // 调用API开始处理
        const result = await pdfWatermarkApi.removePdfWatermark(params);

        // 记录原始响应数据
        console.log("PDF去水印API原始响应:", JSON.stringify(result));

        // 重要修改：检测是否直接返回任务对象（没有code和data结构）
        if (result.task_id && result.status !== undefined) {
          // API直接返回了任务对象
          console.log("API直接返回了任务对象:", JSON.stringify(result));

          // 保存任务ID
          this.taskId = result.task_id;
          this.loadingText = "正在处理PDF文件...";
          console.log("任务已提交成功，开始轮询状态，任务ID:", this.taskId);

          // 开始轮询查询任务状态
          this.startTaskStatusCheck();
          return;
        }

        // 以下是原来的处理逻辑，处理常规的code/data结构
        // 检查并解析返回的数据（如果是字符串）
        let parsedResult = result;
        if (typeof result.data === "string") {
          try {
            // 尝试解析JSON字符串
            parsedResult = {
              ...result,
              data: JSON.parse(result.data),
            };
            console.log("JSON解析后的响应数据:", JSON.stringify(parsedResult));
          } catch (parseError) {
            console.error("解析返回数据失败:", parseError);
          }
        }

        // 记录任务ID和状态判断过程
        console.log("处理的任务数据:", {
          hasTaskId: !!parsedResult.data?.task_id,
          taskId: parsedResult.data?.task_id,
          statusCode: parsedResult.statusCode,
          code: parsedResult.code,
          message: parsedResult.data?.message || parsedResult.message,
        });

        // 检查处理结果
        if (parsedResult.code === 0 || (parsedResult.data && parsedResult.data.task_id)) {
          // 保存任务ID (兼容两种返回格式)
          this.taskId = parsedResult.data.task_id;
          this.loadingText = "正在处理PDF文件...";
          console.log("任务已提交成功，开始轮询状态，任务ID:", this.taskId);

          // 开始轮询查询任务状态
          this.startTaskStatusCheck();
        } else {
          // 记录失败原因
          console.error(
            "提交任务失败，原因:",
            parsedResult.message || parsedResult.data?.message || "未知错误"
          );
          throw new Error(
            parsedResult.message || parsedResult.data?.message || "处理失败"
          );
        }
      } catch (error) {
        console.error("处理PDF文件失败:", error);
        this.isProcessing = false;

        uni.showToast({
          title: error.message || "处理失败，请重试",
          icon: "none",
        });

        // 减少用户积分计数（假设后端已消费积分）
        this.userPoints = Math.max(0, this.userPoints - this.currentPointsCost);
      }
    },

    /**
     * 开始查询任务状态
     */
    startTaskStatusCheck() {
      if (this.taskCheckInterval) {
        clearInterval(this.taskCheckInterval);
      }

      // 设置轮询间隔（每3秒查询一次）
      this.taskCheckInterval = setInterval(async () => {
        await this.checkTaskStatus();
      }, 3000);
    },

    /**
     * 查询任务状态
     */
    async checkTaskStatus() {
      if (!this.taskId) {
        console.warn("没有有效的任务ID，无法查询状态");
        return;
      }

      try {
        console.log("开始查询任务状态，任务ID:", this.taskId);
        const result = await pdfWatermarkApi.getTaskResult(this.taskId);
        console.log("任务状态查询原始响应:", JSON.stringify(result));

        // 重要改动：检测是否直接返回任务对象
        if (result.task_id && result.status !== undefined) {
          // API直接返回了任务对象
          console.log("任务状态API直接返回了任务对象:", JSON.stringify(result));

          // 更新进度（如果有）
          if (result.progress !== undefined) {
            this.processingProgress = result.progress;
            console.log("任务进度更新:", this.processingProgress);
          }

          // 根据任务状态处理
          // 状态: 1=处理中, 2=成功, 3=失败
          if (result.status === 2) {
            // 任务完成
            console.log("任务处理成功，结果:", JSON.stringify(result.result || {}));
            this.handleTaskSuccess(result);
          } else if (result.status === 3) {
            // 任务失败
            console.error("任务处理失败，原因:", result.message || "未知错误");
            this.handleTaskFailed(result);
          } else if (result.status === 1) {
            // 继续等待
            console.log("任务仍在处理中:", result.message || "等待处理完成");
            this.loadingText = result.message || "正在处理PDF文件...";
          } else {
            console.warn("未知的任务状态:", result.status);
          }
          return;
        }

        // 以下是原来的处理逻辑，处理常规的code/data结构
        // 检查并解析返回的数据（如果是字符串）
        let parsedResult = result;
        if (typeof result.data === "string") {
          try {
            // 尝试解析JSON字符串
            parsedResult = {
              ...result,
              data: JSON.parse(result.data),
            };
            console.log("任务状态查询JSON解析后:", JSON.stringify(parsedResult));
          } catch (parseError) {
            console.error("任务状态查询解析返回数据失败:", parseError);
          }
        }

        // 详细的响应分析日志
        console.log("任务状态查询分析:", {
          statusCode: parsedResult.statusCode,
          code: parsedResult.code,
          hasData: !!parsedResult.data,
          status: parsedResult.data?.status,
          progress: parsedResult.data?.progress,
          message: parsedResult.data?.message,
        });

        if (
          (parsedResult.code === 0 || parsedResult.statusCode === 200) &&
          parsedResult.data
        ) {
          const taskResult = parsedResult.data;

          // 更新进度（如果有）
          if (taskResult.progress !== undefined) {
            this.processingProgress = taskResult.progress;
          }

          // 根据任务状态处理
          // 状态: 1=处理中, 2=成功, 3=失败
          if (taskResult.status === 2) {
            // 任务完成
            this.handleTaskSuccess(taskResult);
          } else if (taskResult.status === 3) {
            // 任务失败
            this.handleTaskFailed(taskResult);
          } else if (taskResult.status === 1) {
            // 继续等待
            this.loadingText = taskResult.message || "正在处理PDF文件...";
          }
        }
      } catch (error) {
        console.error("查询任务状态失败:", error);
      }
    },

    /**
     * 处理任务成功
     * @param {Object} taskResult - 任务结果
     */
    handleTaskSuccess(taskResult) {
      // 清除任务检查定时器
      if (this.taskCheckInterval) {
        clearInterval(this.taskCheckInterval);
        this.taskCheckInterval = null;
      }

      // 设置处理结果
      this.resultUrl = taskResult.result?.url || "";
      this.resultPagesCount = taskResult.result?.pages_count || 0;

      // 更新状态
      this.isProcessing = false;

      // 减少用户积分计数（假设后端已消费积分）
      this.userPoints = Math.max(0, this.userPoints - this.currentPointsCost);

      uni.showToast({
        title: "处理成功",
        icon: "success",
      });
    },

    /**
     * 处理任务失败
     * @param {Object} taskResult - 任务结果
     */
    handleTaskFailed(taskResult) {
      // 清除任务检查定时器
      if (this.taskCheckInterval) {
        clearInterval(this.taskCheckInterval);
        this.taskCheckInterval = null;
      }

      // 更新状态
      this.isProcessing = false;

      uni.showToast({
        title: taskResult.message || "处理失败，请重试",
        icon: "none",
      });
    },

    /**
     * 下载结果文件
     */
    downloadResult() {
      if (!this.resultUrl) {
        return;
      }

      // 复制下载链接到剪贴板
      uni.setClipboardData({
        data: this.resultUrl,
        success: () => {
          uni.showToast({
            title: "下载链接已复制",
            icon: "success",
          });
        },
      });
    },

    // 添加分享功能
    onShareAppMessage() {
      // PDF处理结果通常是文件下载而非图片，所以我们使用默认分享信息
      return {
        title: "AI实用宝 - PDF去水印工具",
        path: "/pages/pdf-watermark/pdf-watermark",
        imageUrl: "/static/pdf-watermark.png", // 使用功能图标作为分享封面
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

<style lang="scss" scoped>
.pdf-watermark-container {
  padding: 20rpx;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;

  // 页面标题样式
  .header {
    margin: 30rpx 0;
    text-align: center;

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
  }

  // 上传区域样式
  .upload-area {
    background-color: #fff;
    border-radius: 24rpx;
    height: 400rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 40rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
    border: 2rpx dashed #ddd;

    .upload-content {
      display: flex;
      flex-direction: column;
      align-items: center;

      .upload-icon {
        width: 120rpx;
        height: 120rpx;
        margin-bottom: 20rpx;
      }

      .upload-text {
        font-size: 32rpx;
        color: #333;
        margin-bottom: 12rpx;
      }

      .upload-hint {
        font-size: 24rpx;
        color: #999;
      }

      .platform-hint {
        font-size: 24rpx;
        color: #666;
        margin-top: 10rpx;
      }

      .platform-warning {
        font-size: 24rpx;
        color: #ff6b6b;
        margin-top: 10rpx;
      }
    }
  }

  // PDF预览区域样式
  .pdf-preview-area {
    background-color: #fff;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 40rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);

    .pdf-info-card {
      display: flex;
      align-items: center;
      padding: 20rpx;
      background-color: #f8f8f8;
      border-radius: 12rpx;

      .pdf-icon {
        width: 80rpx;
        height: 80rpx;
        margin-right: 20rpx;

        image {
          width: 100%;
          height: 100%;
        }
      }

      .pdf-info {
        flex: 1;

        .pdf-name {
          font-size: 28rpx;
          color: #333;
          word-break: break-all;
        }
      }

      .pdf-size {
        font-size: 24rpx;
        color: #666;
        padding-left: 10rpx;
      }
    }

    .pdf-actions {
      margin-top: 20rpx;
      margin-bottom: 20rpx;

      .action-btn {
        width: 180rpx;
        height: 60rpx;
        border-radius: 30rpx;
        border: 1px solid #ddd;
        display: flex;
        align-items: center;
        justify-content: center;

        .action-text {
          font-size: 24rpx;
          color: #666;
        }
      }
    }

    .password-section {
      margin-top: 30rpx;

      .option-title {
        font-size: 28rpx;
        color: #333;
        margin-bottom: 16rpx;
      }

      .password-input {
        width: 100%;
        height: 80rpx;
        background-color: #f8f8f8;
        border-radius: 12rpx;
        padding: 0 24rpx;
        box-sizing: border-box;
        font-size: 28rpx;
      }
    }
  }

  // 结果区域样式
  .result-section {
    background-color: #fff;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 40rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);

    .result-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 20rpx;
    }

    .result-info-card {
      display: flex;
      align-items: center;
      padding: 20rpx;
      background-color: #f0f9eb;
      border-radius: 12rpx;
      margin-bottom: 20rpx;

      .pdf-icon {
        width: 80rpx;
        height: 80rpx;
        margin-right: 20rpx;

        image {
          width: 100%;
          height: 100%;
        }
      }

      .pdf-info {
        flex: 1;

        .pdf-name {
          font-size: 28rpx;
          color: #333;
          margin-bottom: 8rpx;
        }

        .pdf-pages {
          font-size: 24rpx;
          color: #666;
        }
      }
    }

    .expiry-warning {
      display: flex;
      align-items: center;
      background-color: #fff9f0;
      padding: 16rpx;
      border-radius: 8rpx;
      margin: 20rpx 0;

      .warning-icon {
        width: 32rpx;
        height: 32rpx;
        margin-right: 12rpx;
      }

      .warning-text {
        font-size: 24rpx;
        color: #ff9900;
      }
    }

    .result-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 30rpx;

      .action-btn {
        width: 48%;
        height: 80rpx;
        border-radius: 40rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28rpx;
      }

      .save-btn {
        background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
        color: #fff;
        box-shadow: 0 4rpx 12rpx rgba(58, 90, 249, 0.3);
      }

      .reset-btn {
        background: linear-gradient(135deg, #ff6b6b 0%, #ff4d4f 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4rpx 12rpx rgba(255, 77, 79, 0.3);
        border: none;
        transition: all 0.3s ease;

        .reset-icon {
          margin-right: 8rpx;
          font-size: 32rpx;
          font-weight: bold;
        }
      }
    }
  }

  // 操作区域样式
  .action-section {
    margin: 40rpx 0;

    .points-info {
      text-align: center;
      margin-bottom: 20rpx;

      .points-text {
        font-size: 26rpx;
        color: #666;
        background: #f0f5ff;
        border-radius: 50rpx;
        padding: 8rpx 24rpx;
        display: inline-block;
      }

      .points-not-enough {
        font-size: 24rpx;
        color: #f56c6c;
        margin-top: 8rpx;
        display: block;
      }
    }

    .process-btn {
      background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
      color: #fff;
      padding: 20rpx 0;
      border-radius: 40rpx;
      font-size: 32rpx;
      margin-top: 20rpx;
      box-shadow: 0 4rpx 12rpx rgba(58, 90, 249, 0.3);
      border: none;
      transition: all 0.3s ease;
      width: 100%;
      height: 90rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      &:active {
        transform: translateY(2rpx);
        box-shadow: 0 2rpx 8rpx rgba(58, 90, 249, 0.2);
      }

      &[disabled] {
        background: linear-gradient(135deg, #c0c4cc 0%, #909399 100%);
        color: #fff;
        box-shadow: none;
      }
    }
  }

  // 加载中状态样式
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

    .loading-content {
      background-color: #fff;
      border-radius: 16rpx;
      padding: 40rpx;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 80%;
      max-width: 600rpx;

      .loading-spinner {
        width: 80rpx;
        height: 80rpx;
        border: 6rpx solid #f3f3f3;
        border-top: 6rpx solid #409eff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loading-text {
        font-size: 28rpx;
        color: #333;
        margin-top: 30rpx;
      }

      .loading-progress {
        font-size: 28rpx;
        color: #409eff;
        margin-top: 20rpx;
        font-weight: bold;
      }
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}
</style>
