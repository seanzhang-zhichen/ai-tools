<template>
  <view class="records-container">
    <!-- Header section with title -->
    <view class="header-section">
      <view class="header-content">
        <!-- Removed back button -->
        <view class="placeholder-view"></view>
        <text class="page-title">积分使用记录</text>
        <view class="placeholder-view"></view>
      </view>

      <!-- Summary card -->
      <view class="summary-card">
        <view class="summary-header">
          <text class="summary-title">积分消费汇总</text>
          <text class="summary-period">{{ formatDateRange(startDate, endDate) }}</text>
        </view>
        <view class="summary-content">
          <view class="balance-points">
            <text class="balance-points-label">当前积分余额</text>
            <text class="balance-points-value">{{ userPoints }}</text>
          </view>
          <view class="total-points">
            <text class="total-points-label">总消费积分</text>
            <text class="total-points-value">{{ summaryData.total_points || 0 }}</text>
          </view>
          <view class="feature-breakdown">
            <view
              v-for="(value, key) in summaryData.feature_breakdown"
              :key="key"
              class="feature-item"
            >
              <view class="feature-icon" :class="getFeatureClass(key)">
                <text class="feature-icon-text">{{ getFeatureIcon(key) }}</text>
              </view>
              <view class="feature-details">
                <text class="feature-name">{{ getFeatureName(key) }}</text>
                <view class="feature-points-container">
                  <text class="feature-points-value">{{ value }}</text>
                  <text class="feature-points-unit">积分</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Filter section -->
    <view class="filter-section">
      <view class="date-filter">
        <text class="filter-label">日期范围</text>
        <view class="date-inputs">
          <view class="date-input" @tap="showDatePicker('start')">
            <text class="date-text">{{ formatDate(startDate) }}</text>
            <text class="date-icon">📅</text>
          </view>
          <text class="date-separator">至</text>
          <view class="date-input" @tap="showDatePicker('end')">
            <text class="date-text">{{ formatDate(endDate) }}</text>
            <text class="date-icon">📅</text>
          </view>
        </view>
      </view>

      <view class="feature-filter">
        <text class="filter-label">功能筛选</text>
        <view class="feature-select" @tap="showFeatureSelector">
          <text class="feature-select-text">{{
            selectedFeature ? getFeatureName(selectedFeature) : "全部功能"
          }}</text>
          <text class="select-arrow">▼</text>
        </view>
      </view>

      <button class="apply-filter-btn" @tap="applyFilters">应用筛选</button>
      <button class="reset-filter-btn" @tap="resetFilters">重置</button>
    </view>

    <!-- Records list -->
    <view class="records-section">
      <text class="section-title">消费记录列表</text>

      <view class="empty-state" v-if="records.length === 0">
        <image
          class="empty-image"
          src="/static/empty-records.png"
          mode="aspectFit"
        ></image>
        <text class="empty-text">暂无消费记录</text>
      </view>

      <view v-else class="records-list">
        <view class="record-item" v-for="record in records" :key="record.id">
          <view class="record-icon" :class="getFeatureClass(record.feature)">
            <text class="record-icon-text">{{ getFeatureIcon(record.feature) }}</text>
          </view>
          <view class="record-content">
            <view class="record-header">
              <text class="record-description">{{ record.description }}</text>
              <text class="record-amount">-{{ record.amount }} 积分</text>
            </view>
            <text class="record-time">{{ formatDateTime(record.created_at) }}</text>
          </view>
        </view>
      </view>

      <!-- Load more button -->
      <view class="load-more" v-if="hasMoreRecords" @tap="loadMoreRecords">
        <text class="load-more-text">加载更多</text>
      </view>
    </view>

    <!-- Date picker popup (using conditional rendering) -->
    <view v-if="showDatePickerDialog" class="custom-popup-mask" @tap="closeDatePicker">
      <view class="custom-popup-content" @tap.stop>
        <view class="popup-header">
          <text class="popup-title"
            >选择{{ datePickerType === "start" ? "开始" : "结束" }}日期</text
          >
          <text class="popup-close" @tap="closeDatePicker">✕</text>
        </view>
        <picker-view class="date-picker" :value="currentDateArray" @change="onDateChange">
          <picker-view-column>
            <view class="picker-item" v-for="(year, index) in years" :key="index"
              >{{ year }}年</view
            >
          </picker-view-column>
          <picker-view-column>
            <view class="picker-item" v-for="(month, index) in months" :key="index"
              >{{ month }}月</view
            >
          </picker-view-column>
          <picker-view-column>
            <view class="picker-item" v-for="(day, index) in days" :key="index"
              >{{ day }}日</view
            >
          </picker-view-column>
        </picker-view>
        <button class="confirm-btn" @tap="confirmDateSelection">确定</button>
      </view>
    </view>

    <!-- 自定义功能选择器弹窗 -->
    <view
      v-if="showFeatureSelectorDialog"
      class="custom-popup-mask"
      @tap="closeFeatureSelector"
    >
      <view class="custom-popup-content feature-selector-content" @tap.stop>
        <view class="popup-header">
          <text class="popup-title">选择功能</text>
          <text class="popup-close" @tap="closeFeatureSelector">✕</text>
        </view>
        <scroll-view scroll-y="true" class="feature-list">
          <!-- 全部功能选项 -->
          <view class="feature-option" @tap="selectFeature('')">
            <view class="feature-option-content">
              <view class="feature-option-icon default-icon">
                <text class="feature-option-icon-text">🔍</text>
              </view>
              <text class="feature-option-text">全部功能</text>
            </view>
            <text class="feature-check" v-if="selectedFeature === ''">✓</text>
          </view>

          <!-- 具体功能选项 -->
          <view
            class="feature-option"
            v-for="(feature, key) in featureDict"
            :key="key"
            @tap="selectFeature(key)"
          >
            <view class="feature-option-content">
              <view class="feature-option-icon" :class="feature.class">
                <text class="feature-option-icon-text">{{ feature.icon }}</text>
              </view>
              <text class="feature-option-text">{{ feature.label }}</text>
            </view>
            <text class="feature-check" v-if="selectedFeature === key">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getPointsRecords,
  getPointsSummary,
  getPointsBalance,
} from "../../api/pointsApi.js";
import qs from "../../utils/qs.js";
import uniPopup from "@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue";

export default {
  components: {
    uniPopup,
  },
  data() {
    return {
      statusBarHeight: 44,
      // 添加用户积分余额
      userPoints: 0,
      // Records data
      records: [],
      summaryData: {
        total_points: 0,
        record_count: 0,
        feature_breakdown: {},
      },
      // Pagination
      skip: 0,
      limit: 20,
      hasMoreRecords: false,
      // Filters
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
      endDate: new Date(),
      selectedFeature: "",
      // Date picker
      showDatePickerDialog: false,
      datePickerType: "start",
      years: [],
      months: [],
      days: [],
      currentDateArray: [0, 0, 0],
      tempSelectedDate: null,
      // 功能选择器
      showFeatureSelectorDialog: false,
      // 功能字典：统一管理所有功能的中英文映射和样式
      featureDict: {
        chatbot: {
          label: "聊天机器人",
          icon: "💬",
          class: "chatbot-icon",
        },
        music_generation: {
          label: "音乐生成",
          icon: "🎵",
          class: "music-icon",
        },
        inpaint: {
          label: "图片去水印",
          icon: "🖌️",
          class: "inpaint-icon",
        },
        segmentation: {
          label: "智能抠图",
          icon: "✂️",
          class: "segmentation-icon",
        },
        scale: {
          label: "图片清晰化",
          icon: "🔍",
          class: "scale-icon",
        },
        background: {
          label: "图片加背景",
          icon: "🖼️",
          class: "background-icon",
        },
        idphoto: {
          label: "AI证件照",
          icon: "📷",
          class: "idphoto-icon",
        },
        watermark_auto: {
          label: "自动图片去水印",
          icon: "✨",
          class: "watermark-auto-icon",
        },
        image_colorization: {
          label: "图片上色",
          icon: "🎨",
          class: "colorization-icon",
        },
      },
      // API and auth
      token: "",
      baseApiUrl: "",
    };
  },
  computed: {
    featureOptions() {
      return Object.entries(this.featureDict).map(([value, data]) => ({
        label: data.label,
        value: value,
      }));
    },
  },
  onLoad() {
    // 初始化系统信息获取状态栏高度
    const systemInfo = uni.getSystemInfoSync();
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    // 初始化日期选择器范围
    this.initDatePicker();

    // 确保初始的日期范围有效
    // 首次加载时，如果日期范围无效，则重置为默认值
    if (!this.validateDateRange()) {
      console.log("初始日期范围无效，重置为默认值");
      this.resetToDefaultDateRange();
    }

    // 检查登录状态
    const token = uni.getStorageSync("token") || "";
    if (!token) {
      uni.showToast({
        title: "请先登录",
        icon: "none",
      });
      setTimeout(() => {
        uni.redirectTo({ url: "/pages/login/login" });
      }, 1500);
      return;
    }

    try {
      // 加载初始数据
      this.fetchUserPoints(); // 获取用户积分余额
      this.fetchPointsRecords();
      this.fetchPointsSummary();
    } catch (error) {
      // 确保初始加载时如果出错也会关闭loading
      console.error("初始数据加载出错:", error);
      uni.hideLoading();
    }
  },
  methods: {
    // 日期校验辅助方法 - 确保开始日期不晚于结束日期
    validateDateRange() {
      // 创建副本以避免直接修改原始对象
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);

      // 如果开始日期晚于结束日期
      if (start > end) {
        console.warn("开始日期晚于结束日期，提示用户");

        // 直接提示用户，不自动调整
        uni.showToast({
          title: "开始日期不能晚于结束日期",
          icon: "none",
          duration: 2000,
        });

        return false;
      }
      return true;
    },

    // 获取用户积分余额
    fetchUserPoints() {
      getPointsBalance()
        .then((res) => {
          if (res && res.code === 0 && res.data) {
            this.userPoints = res.data.points || 0;
          }
        })
        .catch((err) => {
          console.error("获取积分余额失败:", err);
        });
    },

    // 测试方法：直接使用原生请求测试API
    testDirectApiCall() {
      // 获取基础URL和token
      const token = uni.getStorageSync("token") || "";
      const baseUrl = require("../../utils/config.js").getApiBaseUrl();

      if (!token) {
        console.error("未找到token，无法发起请求");
        return;
      }

      // 构建URL查询参数
      const feature = "chatbot";
      const queryParams = `feature=${encodeURIComponent(feature)}&skip=0&limit=20`;

      // 直接使用原生请求测试功能筛选，使用URL查询参数
      uni.request({
        url: `${baseUrl}/points/records?${queryParams}`,
        method: "GET",
        header: {
          Authorization: `Bearer ${token}`,
        },
        success: (res) => {
          console.log("原生请求测试结果:", {
            statusCode: res.statusCode,
            dataLength: res.data ? res.data.length : 0,
          });

          // 如果成功，显示统计信息
          if (res.statusCode === 200 && Array.isArray(res.data)) {
            const features = {};
            res.data.forEach((record) => {
              if (!features[record.feature]) {
                features[record.feature] = 0;
              }
              features[record.feature]++;
            });
            console.log("原生请求返回的功能分布:", features);

            // 分析返回结果中的feature值
            if (res.data.length > 0) {
              console.log("返回记录的feature值示例:");
              console.log("第1条记录:", JSON.stringify(res.data[0]));
              console.log(
                "feature:",
                res.data[0].feature,
                "类型:",
                typeof res.data[0].feature
              );
            }
          }
        },
        fail: (err) => {
          console.error("原生请求测试失败:", err);
        },
      });
    },

    // Date and time formatting
    formatDate(date) {
      if (!date) return "";
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    },

    formatDateTime(dateStr) {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(
        2,
        "0"
      )}:${String(date.getMinutes()).padStart(2, "0")}`;
    },

    formatDateRange(startDate, endDate) {
      return `${this.formatDate(startDate)} 至 ${this.formatDate(endDate)}`;
    },

    // Feature display helpers
    getFeatureName(feature) {
      return this.featureDict[feature]?.label || feature;
    },

    getFeatureIcon(feature) {
      return this.featureDict[feature]?.icon || "🔍";
    },

    getFeatureClass(feature) {
      return this.featureDict[feature]?.class || "default-icon";
    },

    // API calls
    fetchPointsRecords() {
      uni.showLoading({ title: "加载中..." });

      // 准备查询参数，按照后端API要求格式化
      const params = {
        skip: this.skip,
        limit: this.limit,
      };

      // 直接使用YYYY-MM-DD格式，避免时区问题
      params.start_date = this.formatDate(this.startDate) + " 00:00:00";
      params.end_date = this.formatDate(this.endDate) + " 23:59:59";

      // 特别处理功能筛选参数
      if (this.selectedFeature && this.selectedFeature.trim() !== "") {
        // 确保使用小写，避免大小写不一致问题
        params.feature = this.selectedFeature.trim();
        console.log("设置功能筛选:", params.feature, "类型:", typeof params.feature);
      } else {
        console.log("未设置功能筛选，使用全部功能");
      }

      console.log("请求参数:", JSON.stringify(params));

      // 调用API获取记录
      getPointsRecords(params)
        .then((res) => {
          console.log("获取积分记录成功，返回记录数:", res ? res.length : 0);
          if (!res || !Array.isArray(res)) {
            console.error("API返回格式错误:", res);
            this.records = [];
            uni.showToast({
              title: "数据格式有误",
              icon: "none",
            });
            return;
          }

          // 显示筛选状态通知
          if (this.selectedFeature && res.length === 0) {
            uni.showToast({
              title: "当前筛选条件下没有记录",
              icon: "none",
              duration: 2000,
            });
          } else if (res.length === 0) {
            // 添加这个条件，无记录时也显示提示
            uni.showToast({
              title: "暂无消费记录",
              icon: "none",
              duration: 2000,
            });
          }

          // 后端直接返回记录数组
          if (this.skip === 0) {
            this.records = res;
          } else {
            this.records = [...this.records, ...res];
          }

          // 检查是否有更多记录
          this.hasMoreRecords = res.length === this.limit;

          // 如果筛选了功能，打印筛选结果中的feature分布
          if (this.selectedFeature) {
            const featureCounts = {};
            res.forEach((record) => {
              if (!featureCounts[record.feature]) {
                featureCounts[record.feature] = 0;
              }
              featureCounts[record.feature]++;
            });
            console.log("筛选结果中的功能分布:", featureCounts);
          }
        })
        .catch((err) => {
          console.error("获取积分记录失败:", err);
          uni.showToast({
            title: "获取记录失败: " + (err.message || "未知错误"),
            icon: "none",
            duration: 3000,
          });
        })
        .finally(() => {
          // 确保加载状态被关闭
          uni.hideLoading();
        });
    },

    fetchPointsSummary() {
      // 准备查询参数，按照后端API要求格式化
      const params = {};

      // 直接使用YYYY-MM-DD格式，避免时区问题
      params.start_date = this.formatDate(this.startDate) + " 00:00:00";
      params.end_date = this.formatDate(this.endDate) + " 23:59:59";

      if (this.selectedFeature) {
        params.feature = this.selectedFeature;
      }

      console.log("汇总请求参数:", params);

      // 调用API获取汇总数据
      getPointsSummary(params)
        .then((res) => {
          console.log("获取汇总数据成功:", res);
          // 根据后端接口，汇总数据在data字段中
          if (res && res.data) {
            this.summaryData = res.data;
          } else {
            // 如果没有数据，使用默认值
            this.summaryData = {
              total_points: 0,
              record_count: 0,
              feature_breakdown: {},
            };
          }
        })
        .catch((err) => {
          console.error("获取汇总数据失败:", err);
          // 使用默认值
          this.summaryData = {
            total_points: 0,
            record_count: 0,
            feature_breakdown: {},
          };
        });
    },

    loadMoreRecords() {
      this.skip += this.limit;
      this.fetchPointsRecords();
    },

    // Filter operations
    applyFilters() {
      // 打印筛选条件，方便调试
      console.log("应用筛选，调试信息：", {
        selectedFeature: this.selectedFeature,
        selectedFeatureType: typeof this.selectedFeature,
        startDate: this.formatDate(this.startDate),
        endDate: this.formatDate(this.endDate),
      });

      // 首先验证日期范围，如果无效则直接返回
      if (!this.validateDateRange()) {
        console.log("日期范围无效，停止应用筛选");
        return;
      }

      // 如果选择了聊天机器人，先执行原生测试请求
      if (this.selectedFeature === "chatbot") {
        console.log("正在测试聊天机器人筛选...");
        this.testDirectApiCall();
      }

      // 先清空当前的记录列表，确保即使API调用失败也能显示空状态
      this.records = [];

      // 重置分页状态，从第一页开始获取数据
      this.skip = 0;

      // 显示加载中提示
      uni.showLoading({
        title: "加载中...",
        mask: true,
      });

      // 延迟100ms执行，确保UI状态先更新
      setTimeout(() => {
        // 在请求前再次检查筛选条件
        console.log("发起请求前的筛选条件:", {
          feature: this.selectedFeature,
          startDate: this.formatDate(this.startDate),
          endDate: this.formatDate(this.endDate),
        });

        // 获取筛选后的积分记录
        this.fetchPointsRecords();

        // 获取筛选后的汇总数据
        this.fetchPointsSummary();

        // 提示用户筛选已应用
        uni.showToast({
          title: "筛选已应用",
          icon: "success",
          duration: 1500,
        });
      }, 100);
    },

    // 重置日期范围到默认值（本月1日到今天）
    resetToDefaultDateRange() {
      try {
        // 获取当前月的第一天
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // 设置日期范围
        this.startDate = firstDayOfMonth;
        this.endDate = today;

        console.log(
          "已重置日期范围:",
          this.formatDate(this.startDate),
          "至",
          this.formatDate(this.endDate)
        );

        // 通知用户
        uni.showToast({
          title: "已重置日期范围",
          icon: "none",
          duration: 1500,
        });
      } catch (error) {
        console.error("重置日期范围失败:", error);
      }
    },

    // 重置筛选条件
    resetFilters() {
      // 重置日期到默认范围
      this.resetToDefaultDateRange();

      // 重置功能筛选
      this.selectedFeature = "";

      // 先清空当前的记录列表
      this.records = [];

      // 重置分页
      this.skip = 0;

      // 显示加载中提示
      uni.showLoading({
        title: "重置中...",
        mask: true,
      });

      // 延迟100ms执行，确保UI状态先更新
      setTimeout(() => {
        // 重新获取数据
        this.fetchPointsRecords();
        this.fetchPointsSummary();

        // 提示用户筛选已重置
        uni.showToast({
          title: "筛选已重置",
          icon: "success",
          duration: 1500,
        });
      }, 100);
    },

    // Date picker
    initDatePicker() {
      // Generate years (from 5 years ago to current year)
      const currentYear = new Date().getFullYear();
      this.years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);

      // Generate months (1-12)
      this.months = Array.from({ length: 12 }, (_, i) => i + 1);

      // Initialize days (will be updated when year and month change)
      this.updateDays(currentYear, new Date().getMonth() + 1);
    },

    updateDays(year, month) {
      // Get last day of the month (month is 1-based in our UI)
      const daysInMonth = new Date(year, month, 0).getDate();
      this.days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      // Log for debugging
      console.log(`Updated days for ${year}-${month}: ${daysInMonth} days`);
    },

    showDatePicker(type) {
      this.datePickerType = type;
      const targetDate = type === "start" ? this.startDate : this.endDate;

      // 计算日期在选择器中的索引
      const yearIndex = this.years.findIndex((year) => year === targetDate.getFullYear());
      const monthIndex =
        this.months.findIndex((month) => month === targetDate.getMonth() + 1) || 0;
      const dayIndex = this.days.findIndex((day) => day === targetDate.getDate()) || 0;

      this.currentDateArray = [
        yearIndex > -1 ? yearIndex : 0,
        monthIndex > -1 ? monthIndex : 0,
        dayIndex > -1 ? dayIndex : 0,
      ];

      this.tempSelectedDate = new Date(targetDate);
      this.showDatePickerDialog = true;
    },

    closeDatePicker() {
      this.showDatePickerDialog = false;
    },

    onDateChange(e) {
      const values = e.detail.value;

      // 根据选择器的值获取对应的年月日
      const year = this.years[values[0]] || new Date().getFullYear();
      const month = this.months[values[1]] || 1;

      // 当年份或月份变化时，更新天数选项
      if (
        values[0] !== this.currentDateArray[0] ||
        values[1] !== this.currentDateArray[1]
      ) {
        this.updateDays(year, month);

        // 避免选择的日期超出当月天数
        if (values[2] >= this.days.length) {
          values[2] = this.days.length - 1;
        }
      }

      const day = this.days[values[2]] || 1;
      this.currentDateArray = values;

      // 更新临时选择的日期（注意JavaScript中月份是从0开始的）
      this.tempSelectedDate = new Date(year, month - 1, day);
    },

    confirmDateSelection() {
      if (!this.tempSelectedDate) {
        console.error("未选择日期");
        uni.showToast({
          title: "请选择有效日期",
          icon: "none",
        });
        return;
      }

      // 创建日期副本以避免引用问题
      const newDate = new Date(this.tempSelectedDate);

      try {
        // 检查日期有效性
        if (isNaN(newDate.getTime())) {
          throw new Error("无效的日期");
        }

        // 先获取当前日期的副本
        const currentStartDate = new Date(this.startDate);
        const currentEndDate = new Date(this.endDate);

        // 临时更新日期以进行验证
        if (this.datePickerType === "start") {
          // 临时设置开始日期
          this.startDate = newDate;
        } else {
          // 临时设置结束日期
          this.endDate = newDate;
        }

        // 验证日期范围是否有效
        if (!this.validateDateRange()) {
          // 验证失败，恢复原始日期
          this.startDate = currentStartDate;
          this.endDate = currentEndDate;
          return;
        }

        // 关闭日期选择器并应用筛选
        this.closeDatePicker();
        this.applyFilters();
      } catch (error) {
        console.error("日期设置错误:", error);
        uni.showToast({
          title: "日期设置错误",
          icon: "none",
        });
      }
    },

    // Feature selector
    showFeatureSelector() {
      this.showFeatureSelectorDialog = true;
    },

    closeFeatureSelector() {
      this.showFeatureSelectorDialog = false;
    },

    selectFeature(feature) {
      console.log("选择功能:", feature);
      // 确保feature值是有效的
      this.selectedFeature = feature || "";
      console.log("设置selectedFeature值为:", this.selectedFeature);

      this.closeFeatureSelector();

      // 如果选择了功能，延迟200ms再应用筛选，以确保状态更新
      setTimeout(() => {
        console.log("应用筛选前，确认selectedFeature值:", this.selectedFeature);
        this.applyFilters();
      }, 200);
    },

    // 添加分享功能
    onShareAppMessage() {
      return {
        title: "AI实用宝 - 积分使用记录",
        path: "/pages/points/records",
        imageUrl: "/static/points-record.png", // 使用积分记录图标作为分享封面
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
.records-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 0;
}

.status-bar {
  background-color: #ffffff;
}

.header-section {
  background-color: #ffffff;
  padding: 0 0 20rpx;
  border-radius: 24rpx;
  margin: 20rpx 30rpx 40rpx;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.03);
  position: relative;
  overflow: hidden;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 30rpx;
}

.placeholder-view {
  width: 70rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
}

/* Summary Card */
.summary-card {
  margin: 0 30rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  overflow: hidden;
}

.summary-header {
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.summary-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.summary-period {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

.summary-content {
  padding: 20rpx 30rpx;
}

.balance-points {
  margin-bottom: 20rpx;
  background-color: #f7f9fc;
  padding: 15rpx 20rpx;
  border-radius: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.balance-points-label {
  font-size: 26rpx;
  color: #666;
}

.balance-points-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #4a7cff;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
}

.total-points {
  margin-bottom: 20rpx;
  background-color: #f7f9fc;
  padding: 15rpx 20rpx;
  border-radius: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-points-label {
  font-size: 26rpx;
  color: #666;
}

.total-points-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #ff6060;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
}

.feature-breakdown {
  margin-top: 20rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.feature-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  background-color: #f7f9fc;
}

.feature-icon-text {
  font-size: 30rpx;
}

.feature-details {
  flex: 1;
}

.feature-name {
  font-size: 24rpx;
  color: #666;
  display: block;
}

.feature-points-container {
  display: flex;
  align-items: center;
}

.feature-points-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #ff6060;
}

.feature-points-unit {
  font-size: 24rpx;
  color: #666;
  margin-left: 4rpx;
}

/* Filter Section */
.filter-section {
  margin: 0 30rpx 30rpx;
  background-color: white;
  border-radius: 24rpx;
  padding: 20rpx 30rpx;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.03);
}

.filter-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
}

.date-filter {
  margin-bottom: 20rpx;
}

.date-inputs {
  display: flex;
  align-items: center;
}

.date-input {
  flex: 1;
  height: 80rpx;
  background-color: #f7f9fc;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
}

.date-text {
  font-size: 28rpx;
  color: #333;
}

.date-icon {
  font-size: 32rpx;
  color: #4a7cff;
}

.date-separator {
  margin: 0 20rpx;
  color: #999;
  font-size: 28rpx;
}

.feature-filter {
  margin-bottom: 30rpx;
}

.feature-select {
  height: 80rpx;
  background-color: #f7f9fc;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20rpx;
}

.feature-select-text {
  font-size: 28rpx;
  color: #333;
}

.select-arrow {
  font-size: 24rpx;
  color: #999;
}

.apply-filter-btn {
  background: linear-gradient(135deg, #614de5 0%, #4a7cff 100%);
  color: white;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: 500;
  margin-bottom: 16rpx;
  box-shadow: 0 6rpx 16rpx rgba(74, 124, 255, 0.3);
}

.reset-filter-btn {
  background-color: #f2f4f8;
  color: #666;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: 500;
}

/* Records Section */
.records-section {
  flex: 1;
  margin: 0 30rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.empty-state {
  padding: 60rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-image {
  width: 240rpx;
  height: 240rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.records-list {
  margin-bottom: 30rpx;
}

.record-item {
  background-color: white;
  border-radius: 20rpx;
  display: flex;
  padding: 30rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
}

.record-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.record-icon-text {
  font-size: 36rpx;
}

.record-content {
  flex: 1;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6rpx;
}

.record-description {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  max-width: 70%;
}

.record-amount {
  font-size: 30rpx;
  color: #ff6060;
  font-weight: 600;
}

.record-time {
  font-size: 24rpx;
  color: #999;
}

.load-more {
  text-align: center;
  padding: 30rpx 0;
}

.load-more-text {
  font-size: 28rpx;
  color: #4a7cff;
}

/* Popups */
.popup-content {
  background-color: white;
  border-top-left-radius: 30rpx;
  border-top-right-radius: 30rpx;
  padding: 30rpx;
  position: relative;
  z-index: 1000;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 20rpx;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.popup-close {
  font-size: 32rpx;
  color: #999;
  padding: 10rpx;
}

.date-picker {
  height: 400rpx;
  width: 100%;
}

.picker-item {
  line-height: 70rpx;
  text-align: center;
  font-size: 30rpx;
}

.confirm-btn {
  margin-top: 30rpx;
  background: linear-gradient(135deg, #614de5 0%, #4a7cff 100%);
  color: white;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.feature-list {
  max-height: 600rpx;
}

.feature-option {
  padding: 30rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feature-option-content {
  display: flex;
  align-items: center;
}

.feature-option-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.feature-option-text {
  font-size: 30rpx;
  color: #333;
}

.feature-check {
  font-size: 32rpx;
  color: #4a7cff;
  font-weight: bold;
}

/* Feature icon colors */
.chatbot-icon {
  background-color: rgba(74, 124, 255, 0.15);
}

.image-icon {
  background-color: rgba(255, 175, 74, 0.15);
}

.speech-icon {
  background-color: rgba(82, 192, 130, 0.15);
}

.voice-icon {
  background-color: rgba(152, 118, 255, 0.15);
}

.default-icon {
  background-color: rgba(153, 153, 153, 0.15);
}

/* 新增功能图标样式 */
.music-icon {
  background-color: rgba(233, 90, 200, 0.15);
}

.inpaint-icon {
  background-color: rgba(255, 138, 101, 0.15);
}

.segmentation-icon {
  background-color: rgba(0, 188, 212, 0.15);
}

.scale-icon {
  background-color: rgba(156, 204, 101, 0.15);
}

.background-icon {
  background-color: rgba(121, 134, 203, 0.15);
}

.idphoto-icon {
  background-color: rgba(63, 81, 181, 0.15);
}

.watermark-auto-icon {
  background-color: rgba(255, 152, 0, 0.15);
}

.colorization-icon {
  background-color: rgba(233, 30, 99, 0.15);
}

/* Custom Popup Styles */
.custom-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.custom-popup-content {
  width: 100%;
  background-color: white;
  border-top-left-radius: 30rpx;
  border-top-right-radius: 30rpx;
  padding: 30rpx;
  position: relative;
  z-index: 10000;
  animation: slideUp 0.3s ease-out;
}

/* 功能选择器样式 */
.feature-selector-content {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.feature-list {
  flex: 1;
  max-height: 60vh;
}

.feature-option {
  padding: 24rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feature-option:active {
  background-color: #f7f9fc;
}

.feature-option-content {
  display: flex;
  align-items: center;
}

.feature-option-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.feature-option-icon-text {
  font-size: 30rpx;
}

.feature-option-text {
  font-size: 30rpx;
  color: #333;
}

.feature-check {
  font-size: 32rpx;
  color: #4a7cff;
  font-weight: bold;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
</style>
