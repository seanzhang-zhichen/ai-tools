<template>
  <view class="name-generator-container">
    <!-- 页面标题 -->
    <view class="header">
      <text class="title">AI宝宝取名</text>
      <text class="subtitle">为您的宝宝创建有意义的好名字</text>
    </view>

    <!-- 顶部标签切换 -->
    <view class="tab-container">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'generate' }"
        @click="switchTab('generate')"
      >
        <text class="tab-text">生成名字</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'history' }"
        @click="switchTab('history')"
      >
        <text class="tab-text">历史记录</text>
      </view>
    </view>

    <!-- 生成名字表单 -->
    <block v-if="activeTab === 'generate'">
      <!-- 输入表单 -->
      <view class="form-container">
        <!-- 宝宝姓氏 -->
        <view class="form-section">
          <text class="section-title">宝宝姓氏</text>
          <input
            class="form-input"
            v-model="formData.surname"
            placeholder="请输入宝宝姓氏"
            :maxlength="10"
          />
        </view>

        <!-- 宝宝性别 -->
        <view class="form-section">
          <text class="section-title">宝宝性别</text>
          <view class="gender-tabs">
            <view
              class="gender-tab"
              :class="{ active: formData.gender === '男' }"
              @click="formData.gender = '男'"
            >
              <text class="tab-text">男孩</text>
            </view>
            <view
              class="gender-tab"
              :class="{ active: formData.gender === '女' }"
              @click="formData.gender = '女'"
            >
              <text class="tab-text">女孩</text>
            </view>
          </view>
        </view>

        <!-- 必须包含的汉字 -->
        <view class="form-section">
          <text class="section-title">必须包含的汉字 (选填)</text>
          <input
            class="form-input"
            v-model="formData.required_chars"
            placeholder="如：天、明、宇等"
            :maxlength="20"
          />
          <text class="input-tip">可以填写希望名字中包含的汉字</text>
        </view>

        <!-- 其他要求 -->
        <view class="form-section">
          <text class="section-title">其他要求 (选填)</text>
          <textarea
            class="form-textarea"
            v-model="formData.additional_requirements"
            placeholder="例如：希望有积极向上的含义，寓意美好等"
            :maxlength="200"
          ></textarea>
          <text class="input-tip">补充命名的特殊要求，可以描述期望的寓意</text>
          <text class="char-counter"
            >{{ formData.additional_requirements.length }}/200</text
          >
        </view>

        <!-- 提交按钮 -->
        <view class="action-section">
          <view class="points-info">
            <text class="points-text">消耗积分: {{ pointsCost }}</text>
          </view>
          <button
            class="generate-btn"
            :disabled="isGenerating || !canGenerate"
            @click="generateNames"
          >
            <text v-if="!isGenerating">生成名字</text>
            <text v-else>生成中...</text>
          </button>
        </view>
      </view>

      <!-- 名字结果区域 -->
      <view class="results-container" v-if="nameResults && nameResults.length > 0">
        <view class="result-title-bar">
          <text class="result-title">推荐名字</text>
          <view class="copy-all-btn" @click="copyAllToClipboard">
            <text class="copy-all-text">一键复制全部</text>
          </view>
        </view>

        <!-- 名字列表 -->
        <scroll-view scroll-y class="name-results-scroll">
          <view
            v-for="(nameItem, index) in nameResults"
            :key="index"
            class="name-result-card"
          >
            <view class="name-header">
              <text class="name-text">{{ nameItem.name }}</text>
              <view class="copy-btn" @click="copyToClipboard(nameItem)">
                <text class="copy-text">复制</text>
              </view>
            </view>

            <view class="meaning-section">
              <text class="meaning-title">寓意</text>
              <text class="meaning-text">{{ nameItem.meaning }}</text>
            </view>

            <view class="characters-section">
              <text class="characters-title">字义解析</text>
              <view
                v-for="(charItem, charIndex) in nameItem.characters_meaning"
                :key="charIndex"
                class="character-item"
              >
                <text class="character">【{{ charItem.character }}】</text>
                <text class="char-meaning">{{ charItem.meaning }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="!isGenerating && nameResults.length === 0">
        <text class="empty-text">填写表单并点击"生成名字"按钮开始取名</text>
      </view>
    </block>

    <!-- 历史记录部分 -->
    <block v-if="activeTab === 'history'">
      <view class="history-container">
        <!-- 筛选表单 -->
        <view class="filter-form">
          <!-- 姓氏筛选（从左右排版改为上下排版，姓氏在上） -->
          <view class="filter-section">
            <text class="filter-label">姓氏</text>
            <view class="surname-button-group">
              <view
                class="surname-button"
                :class="{ active: historyFilter.surname === '' }"
                @click="setSurnameFilter('')"
              >
                <text>全部</text>
              </view>
              <view
                class="surname-button"
                :class="{ active: historyFilter.surname === item }"
                @click="setSurnameFilter(item)"
                v-for="(item, index) in surnameOptions"
                :key="index"
              >
                <text>{{ item }}</text>
              </view>
            </view>
          </view>

          <!-- 性别筛选（从左右排版改为上下排版，性别在下） -->
          <view class="filter-section">
            <text class="filter-label">性别</text>
            <view class="gender-button-group">
              <view
                class="gender-button"
                :class="{ active: historyFilter.gender === '' }"
                @click="setGenderFilter('')"
              >
                <text>全部</text>
              </view>
              <view
                class="gender-button"
                :class="{ active: historyFilter.gender === '男' }"
                @click="setGenderFilter('男')"
              >
                <text>男</text>
              </view>
              <view
                class="gender-button"
                :class="{ active: historyFilter.gender === '女' }"
                @click="setGenderFilter('女')"
              >
                <text>女</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 历史记录列表 -->
        <view class="history-list" v-if="historyRecords.length > 0">
          <view
            v-for="(record, index) in historyRecords"
            :key="record.id"
            class="history-card"
          >
            <!-- 居中显示时间 -->
            <view class="history-time">
              <text class="history-date">{{ formatDate(record.created_at) }}</text>
            </view>

            <!-- 名字列表 - 修改为垂直卡片样式 -->
            <view class="history-names-list">
              <view
                v-for="(nameItem, nameIndex) in record.names_data.names"
                :key="nameIndex"
                class="history-name-card"
              >
                <view class="name-header">
                  <text class="name-text">{{ nameItem.name }}</text>
                  <view
                    class="copy-btn"
                    @click.stop="copyHistoryToClipboard(record, nameItem)"
                  >
                    <text class="copy-text">复制</text>
                  </view>
                </view>

                <view class="meaning-section">
                  <text class="meaning-title">寓意</text>
                  <text class="meaning-text">{{ nameItem.meaning }}</text>
                </view>

                <view class="characters-section">
                  <text class="characters-title">字义解析</text>
                  <view
                    v-for="(charItem, charIndex) in nameItem.characters_meaning"
                    :key="charIndex"
                    class="character-item"
                  >
                    <text class="character">【{{ charItem.character }}】</text>
                    <text class="char-meaning">{{ charItem.meaning }}</text>
                  </view>
                </view>
              </view>
            </view>

            <!-- 条件信息 -->
            <view
              class="history-conditions"
              v-if="record.required_chars || record.additional_requirements"
            >
              <text class="condition-label" v-if="record.required_chars"
                >包含字符: {{ record.required_chars }}</text
              >
              <text class="condition-label" v-if="record.additional_requirements"
                >额外要求: {{ record.additional_requirements }}</text
              >
            </view>
          </view>
        </view>

        <!-- 历史记录空状态 -->
        <view class="empty-state" v-if="historyRecords.length === 0">
          <text class="empty-text" v-if="isLoadingHistory">加载中...</text>
          <text class="empty-text" v-else>暂无历史生成记录</text>
        </view>

        <!-- 加载更多 -->
        <view class="load-more" v-if="historyRecords.length > 0 && hasMoreHistory">
          <button
            class="load-more-btn"
            :disabled="isLoadingHistory"
            @click="loadMoreHistory"
          >
            <text v-if="!isLoadingHistory">加载更多</text>
            <text v-else>加载中...</text>
          </button>
        </view>

        <!-- 已加载全部 -->
        <view class="all-loaded" v-if="historyRecords.length > 0 && !hasMoreHistory">
          <text class="all-loaded-text">已加载全部</text>
        </view>
      </view>
    </block>

    <!-- 加载状态 -->
    <view class="loading-overlay" v-if="isGenerating">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">AI正在为您精心取名...</text>
      </view>
    </view>

    <!-- 历史名字详情弹窗 -->
    <view class="popup-overlay" v-if="showNameDetailPopup" @click="closeNameDetailPopup">
      <view class="popup-content" @click.stop>
        <view class="popup-header">
          <text class="popup-title">名字详情</text>
          <view class="popup-close" @click="closeNameDetailPopup">
            <text class="close-icon">×</text>
          </view>
        </view>

        <view class="popup-body">
          <view class="detail-name">
            <text class="detail-name-text">{{ currentDetailName.fullName }}</text>
          </view>

          <view class="detail-section">
            <text class="detail-section-title">寓意</text>
            <text class="detail-section-content">{{ currentDetailName.meaning }}</text>
          </view>

          <view class="detail-section">
            <text class="detail-section-title">字义解析</text>
            <view
              v-for="(charItem, charIndex) in currentDetailName.characters_meaning"
              :key="charIndex"
              class="detail-character-item"
            >
              <text class="detail-character">【{{ charItem.character }}】</text>
              <text class="detail-char-meaning">{{ charItem.meaning }}</text>
            </view>
          </view>

          <view class="detail-actions">
            <view class="detail-copy-btn" @click="copyDetailToClipboard">
              <text class="detail-copy-text">复制名字详情</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import nameGeneratorApi from "@/api/nameGeneratorApi.js";

export default {
  data() {
    return {
      // 当前激活的标签
      activeTab: "generate",

      // 表单数据
      formData: {
        surname: "",
        gender: "男",
        required_chars: "",
        additional_requirements: "",
      },

      // 生成状态
      isGenerating: false,

      // 生成结果
      nameResults: [],

      // 用户积分
      userPoints: 0,

      // 消耗积分
      pointsCost: 50,

      // 历史记录相关
      historyRecords: [],
      isLoadingHistory: false,
      historyPage: 1,
      historyPageSize: 10,
      hasMoreHistory: true,

      // 历史筛选条件
      historyFilter: {
        surname: "",
        gender: "",
      },

      // 性别选项
      genderOptions: ["全部", "男", "女"],

      // 姓氏选项
      surnameOptions: [],

      // 名字详情弹窗
      showNameDetailPopup: false,
      currentDetailName: {
        fullName: "",
        meaning: "",
        characters_meaning: [],
      },
    };
  },
  computed: {
    // 是否可以生成
    canGenerate() {
      return this.formData.surname && this.formData.gender && !this.isGenerating;
    },
  },
  // 添加分享功能
  onShareAppMessage() {
    // 根据是否有生成结果提供不同的分享内容
    if (this.nameResults && this.nameResults.length > 0) {
      // 如果有生成结果，分享第一个名字及其寓意
      const firstResult = this.nameResults[0];
      return {
        title: `【AI宝宝取名】为${this.formData.surname}姓宝宝取名：${firstResult.name}`,
        path: "/pages/name-generator/name-generator",
        imageUrl: "/static/name-generator.png",
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
        title: "AI宝宝取名 - 为您的宝宝创建有意义的好名字",
        path: "/pages/name-generator/name-generator",
        imageUrl: "/static/name-generator.png",
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
    // 获取用户信息
    this.getUserInfo();
  },
  onShow() {
    // 如果当前是历史标签，刷新历史数据
    if (this.activeTab === "history") {
      this.loadHistoryData(true);
      // 加载所有姓氏数据
      this.loadSurnameOptions();
    }
  },
  methods: {
    // 切换标签
    switchTab(tab) {
      console.log(`切换标签: ${this.activeTab} -> ${tab}`);
      if (this.activeTab !== tab) {
        this.activeTab = tab;

        // 如果切换到历史标签，则加载历史数据和姓氏选项
        if (tab === "history") {
          this.loadHistoryData(true);
          this.loadSurnameOptions();
        }
      }
    },

    // 获取用户信息
    async getUserInfo() {
      try {
        const res = await nameGeneratorApi.getUserInfo();
        if (res.code === 0 && res.data) {
          this.userPoints = res.data.points || 0;
        }
      } catch (error) {
        console.error("获取用户信息失败", error);
      }
    },

    // 生成名字
    async generateNames() {
      if (!this.canGenerate) return;

      if (this.userPoints < this.pointsCost) {
        uni.showModal({
          title: "积分不足",
          content: `生成名字需要${this.pointsCost}积分，您当前积分不足`,
          confirmText: "去充值",
          cancelText: "取消",
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({
                url: "/pages/purchase/purchase",
              });
            }
          },
        });
        return;
      }

      try {
        this.isGenerating = true;
        this.nameResults = [];

        const res = await nameGeneratorApi.generateNames(this.formData);

        if (res.code === 0 && res.data && res.data.names) {
          this.nameResults = res.data.names;
          // 更新用户积分
          this.getUserInfo();

          // 添加自动滚动到结果部分的代码
          this.$nextTick(() => {
            // 使用nextTick确保DOM已更新
            setTimeout(() => {
              const query = uni.createSelectorQuery().in(this);
              query.selectViewport().scrollOffset();
              query.select(".results-container").boundingClientRect();
              query.exec((res) => {
                if (res[0] && res[1]) {
                  const scrollTop = res[0].scrollTop; // 当前滚动位置
                  const top = res[1].top; // 结果容器距视口顶部的距离
                  // 添加一点偏移量，使结果区域在视图中更容易阅读
                  const offset = -20; // 向上偏移一点
                  uni.pageScrollTo({
                    scrollTop: scrollTop + top + offset,
                    duration: 300,
                  });
                }
              });
            }, 100);
          });
        } else {
          throw new Error(res.message || "生成名字失败");
        }
      } catch (error) {
        uni.showToast({
          title: error.message || "生成名字失败，请重试",
          icon: "none",
        });
      } finally {
        this.isGenerating = false;
      }
    },

    // 加载历史数据
    async loadHistoryData(reset = false) {
      if (this.isLoadingHistory) {
        console.log("正在加载历史数据，忽略重复请求");
        return;
      }

      try {
        this.isLoadingHistory = true;

        // 重置页码
        if (reset) {
          console.log("重置历史记录分页数据");
          this.historyPage = 1;
          this.historyRecords = [];
          this.hasMoreHistory = true;
        }

        const params = {
          page: this.historyPage,
          page_size: this.historyPageSize,
          surname: this.historyFilter.surname || undefined,
          gender: this.historyFilter.gender || undefined,
        };

        // 详细记录筛选参数
        console.log("请求历史数据详细参数:");
        console.log("- 页码:", params.page);
        console.log("- 每页数量:", params.page_size);
        console.log("- 姓氏筛选:", params.surname ? `"${params.surname}"` : "无");
        console.log("- 性别筛选:", params.gender ? `"${params.gender}"` : "无");

        const res = await nameGeneratorApi.getNameHistory(params);
        console.log("历史数据请求结果:", res);

        // 检查API实际发送的参数
        console.log("API实际请求参数(转换后):");
        console.log("- skip:", (params.page - 1) * params.page_size);
        console.log("- limit:", params.page_size);
        console.log("- surname:", params.surname || "undefined");
        console.log("- gender:", params.gender || "undefined");

        if (res.code === 0) {
          // 处理分页数据
          const records = res.data && res.data.history ? res.data.history : [];
          const total = res.data && res.data.total ? res.data.total : 0;

          if (records.length > 0) {
            console.log(`获取到 ${records.length} 条历史记录，总记录数: ${total}`);

            // 查看第一条记录的数据结构
            if (records[0]) {
              console.log(
                "第一条记录示例:",
                JSON.stringify({
                  id: records[0].id,
                  surname: records[0].surname,
                  gender: records[0].gender,
                })
              );
            }

            this.historyRecords = reset ? records : [...this.historyRecords, ...records];

            // 判断是否还有更多数据
            if (total <= this.historyRecords.length) {
              console.log("已加载全部历史记录");
              this.hasMoreHistory = false;
            } else {
              console.log(
                `当前已加载 ${this.historyRecords.length} 条，总共 ${total} 条，还有更多数据`
              );
            }
          } else {
            console.log("未获取到历史记录数据");
            this.historyRecords = [];
            this.hasMoreHistory = false;
          }
        } else {
          console.error("获取历史记录失败:", res.message);
          throw new Error(res.message || "获取历史记录失败");
        }
      } catch (error) {
        console.error("加载历史数据异常:", error);
        uni.showToast({
          title: error.message || "获取历史记录失败",
          icon: "none",
        });
      } finally {
        console.log("历史数据加载完成");
        this.isLoadingHistory = false;
      }
    },

    // 加载更多历史记录
    loadMoreHistory() {
      if (this.isLoadingHistory || !this.hasMoreHistory) {
        console.log("正在加载或没有更多数据，忽略加载更多请求");
        return;
      }

      console.log(
        `加载更多历史记录，页码从 ${this.historyPage} 增加到 ${this.historyPage + 1}`
      );
      this.historyPage++;
      this.loadHistoryData();
    },

    // 性别筛选器变化处理
    setGenderFilter(gender) {
      console.log(`性别筛选条件变更: ${this.historyFilter.gender} -> ${gender}`);
      this.historyFilter.gender = gender;
      // 自动应用筛选
      this.loadHistoryData(true);
    },

    // 姓氏筛选器变化处理
    setSurnameFilter(surname) {
      console.log(`姓氏筛选条件变更: ${this.historyFilter.surname} -> ${surname}`);
      this.historyFilter.surname = surname;
      // 自动应用筛选
      this.loadHistoryData(true);
    },

    // 加载姓氏选项
    async loadSurnameOptions() {
      try {
        console.log("开始获取用户的唯一姓氏列表");
        const res = await nameGeneratorApi.getUniqueSurnames();

        if (res.code === 0 && res.data && res.data.surnames) {
          this.surnameOptions = res.data.surnames;
          console.log(`成功获取 ${this.surnameOptions.length} 个唯一姓氏`);
        } else {
          console.error("获取姓氏列表失败:", res.message);
          this.surnameOptions = [];
        }
      } catch (error) {
        console.error("加载姓氏选项出错:", error);
        uni.showToast({
          title: "获取姓氏列表失败",
          icon: "none",
        });
        this.surnameOptions = [];
      }
    },

    // 查看历史名字详情
    viewHistoryNameDetail(record, nameItem) {
      console.log(`查看名字详情: ${record.surname}${nameItem.name}, ID: ${record.id}`);
      this.currentDetailName = {
        fullName: nameItem.name,
        meaning: nameItem.meaning,
        characters_meaning: nameItem.characters_meaning,
      };
      this.showNameDetailPopup = true;
    },

    // 关闭名字详情弹窗
    closeNameDetailPopup() {
      console.log("关闭名字详情弹窗");
      this.showNameDetailPopup = false;
    },

    // 复制详情名字到剪贴板
    copyDetailToClipboard() {
      console.log(`复制名字详情到剪贴板: ${this.currentDetailName.fullName}`);
      // 格式化名字的所有信息
      let copyText = `${this.currentDetailName.fullName}\n\n`;
      copyText += `【寓意】\n${this.currentDetailName.meaning}\n\n`;
      copyText += `【字义解析】\n`;

      // 添加每个字的解析
      this.currentDetailName.characters_meaning.forEach((char) => {
        copyText += `${char.character}：${char.meaning}\n`;
      });

      uni.setClipboardData({
        data: copyText,
        success: () => {
          console.log("名字详情复制成功");
          uni.showToast({
            title: "已复制到剪贴板",
            icon: "success",
          });
        },
        fail: (err) => {
          console.error("名字详情复制失败:", err);
        },
      });
    },

    // 重用历史记录参数进行生成
    reuseHistory(record) {
      console.log(
        `重用历史记录生成新名字，记录ID: ${record.id}, 姓氏: ${record.surname}, 性别: ${record.gender}`
      );
      this.formData = {
        surname: record.surname,
        gender: record.gender,
        required_chars: record.required_chars || "",
        additional_requirements: record.additional_requirements || "",
      };

      // 切换到生成标签
      this.switchTab("generate");

      // 滚动到顶部
      uni.pageScrollTo({
        scrollTop: 0,
        duration: 300,
      });
    },

    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return "";

      const date = new Date(dateString);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(
        2,
        "0"
      )}:${String(date.getMinutes()).padStart(2, "0")}`;
    },

    // 复制到剪贴板
    copyToClipboard(nameItem) {
      // 格式化名字的所有信息
      let copyText = `${nameItem.name}\n\n`;
      copyText += `【寓意】\n${nameItem.meaning}\n\n`;
      copyText += `【字义解析】\n`;

      // 添加每个字的解析
      nameItem.characters_meaning.forEach((char) => {
        copyText += `${char.character}：${char.meaning}\n`;
      });

      uni.setClipboardData({
        data: copyText,
        success: () => {
          uni.showToast({
            title: "已复制到剪贴板",
            icon: "success",
          });
        },
      });
    },

    // 一键复制所有名字信息到剪贴板
    copyAllToClipboard() {
      if (!this.nameResults || this.nameResults.length === 0) return;

      let allNamesText = `===== AI宝宝取名推荐名字 =====\n\n`;

      // 遍历所有名字并格式化
      this.nameResults.forEach((nameItem, index) => {
        // 添加序号和分隔线
        allNamesText += `【名字 ${index + 1}】\n`;

        // 添加名字本身
        allNamesText += `${nameItem.name}\n\n`;

        // 添加寓意
        allNamesText += `【寓意】\n${nameItem.meaning}\n\n`;

        // 添加字义解析
        allNamesText += `【字义解析】\n`;
        nameItem.characters_meaning.forEach((char) => {
          allNamesText += `${char.character}：${char.meaning}\n`;
        });

        // 添加分隔线(除了最后一个)
        if (index < this.nameResults.length - 1) {
          allNamesText += `\n----------------------------------------\n\n`;
        }
      });

      // 添加AI实用宝宣传语
      allNamesText += `\n\n========================================\n`;
      allNamesText += `本名字由AI实用宝提供，更多实用AI工具请关注「AI实用宝」\n`;
      allNamesText += `您的贴心AI助手，让生活更智能，工作更高效!\n`;
      allNamesText += `========================================`;

      // 复制到剪贴板
      uni.setClipboardData({
        data: allNamesText,
        success: () => {
          uni.showToast({
            title: "已复制所有名字到剪贴板",
            icon: "success",
          });
        },
      });
    },

    // 复制历史记录中的名字到剪贴板
    copyHistoryToClipboard(record, nameItem) {
      console.log(`复制历史名字到剪贴板: ${nameItem.name}`);
      // 格式化名字的所有信息
      let copyText = `${nameItem.name}\n\n`;
      copyText += `【寓意】\n${nameItem.meaning}\n\n`;
      copyText += `【字义解析】\n`;

      // 添加每个字的解析
      nameItem.characters_meaning.forEach((char) => {
        copyText += `${char.character}：${char.meaning}\n`;
      });

      uni.setClipboardData({
        data: copyText,
        success: () => {
          console.log("历史名字复制成功");
          uni.showToast({
            title: "已复制到剪贴板",
            icon: "success",
          });
        },
        fail: (err) => {
          console.error("历史名字复制失败:", err);
        },
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.name-generator-container {
  position: relative;
  min-height: 100vh;
  background-color: #f8f8f8;
  padding: 20rpx;
}

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

/* 标签切换样式 */
.tab-container {
  display: flex;
  background-color: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;

  .tab-item {
    flex: 1;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    &.active {
      color: #3a5af9;
      font-weight: bold;

      &::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40rpx;
        height: 4rpx;
        background-color: #3a5af9;
        border-radius: 2rpx;
      }
    }

    .tab-text {
      font-size: 28rpx;
    }
  }
}

/* 历史记录样式 */
.history-container {
  background-color: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.filter-form {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 20rpx;
}

.filter-section {
  margin-bottom: 20rpx;
}

.filter-label {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
}

.filter-input,
.filter-picker {
  width: 100%;
  height: 70rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  background-color: #f8f8f8;
}

.filter-picker {
  width: 100%;
  height: 60rpx;
  background-color: #f0f0f0;
  border-radius: 8rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
}

.picker-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 26rpx;
  color: #333;
}

.gender-button-group {
  display: flex;
  width: 100%;
  margin-top: 10rpx;
}

.gender-button {
  flex: 1;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  margin: 0 5rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
}

.gender-button.active {
  background-color: #007aff;
  color: #fff;
}

.gender-button:first-child {
  margin-left: 0;
}

.gender-button:last-child {
  margin-right: 0;
}

.surname-button-group {
  display: flex;
  width: 100%;
  margin-top: 10rpx;
  flex-wrap: wrap;
  max-height: 200rpx;
  overflow-y: auto;
}

.surname-button {
  flex: 0 0 auto;
  min-width: 80rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  margin: 5rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  padding: 0 15rpx;
}

.surname-button.active {
  background-color: #007aff;
  color: #fff;
}

/* 增加手指滑动时的样式 */
.surname-button-group::-webkit-scrollbar {
  width: 4rpx;
}

.surname-button-group::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 4rpx;
}

.filter-btn {
  width: 100%;
  height: 70rpx;
  line-height: 70rpx;
  text-align: center;
  background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  margin-top: 10rpx;
}

.history-list {
  margin-top: 20rpx;
  padding-bottom: 30rpx;
}

.history-card {
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 8rpx;
  margin-bottom: 30rpx;
  position: relative;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.03);
}

.history-time {
  text-align: center;
  margin-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
  padding-bottom: 16rpx;
}

.history-date {
  font-size: 22rpx;
  color: #999;
  display: inline-block;
}

.history-names-list {
  margin-top: 0;
}

.history-name-card {
  padding: 16rpx;
  background-color: #fff;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  position: relative;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.03);
  border-left: 4rpx solid #3a5af9;

  .name-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;

    .name-text {
      color: #333;
      font-size: 20px;
      font-weight: bold;
    }

    .copy-btn {
      display: flex;
      align-items: center;
      padding: 6px 14px;
      background: linear-gradient(135deg, #f0f3ff 0%, #e6eaff 100%);
      border-radius: 15px;
      box-shadow: 0 1px 4px rgba(58, 90, 249, 0.15);
      transition: all 0.2s ease;

      &:active {
        transform: translateY(1px);
        box-shadow: 0 0 2px rgba(58, 90, 249, 0.1);
      }

      .copy-text {
        color: #3a5af9;
        font-size: 12px;
      }
    }
  }

  .meaning-section {
    margin-bottom: 10px;

    .meaning-title {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
      display: block;
    }

    .meaning-text {
      color: #333;
      font-size: 14px;
      line-height: 1.5;
    }
  }

  .characters-section {
    .characters-title {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
      display: block;
    }

    .character-item {
      display: flex;
      margin-top: 5px;

      .character {
        color: #3a5af9;
        font-size: 14px;
        margin-right: 10px;
      }

      .char-meaning {
        color: #333;
        font-size: 14px;
        flex: 1;
      }
    }
  }
}

.history-conditions {
  margin-top: 16rpx;
  margin-bottom: 20rpx;

  .condition-label {
    display: inline-block;
    font-size: 22rpx;
    color: #666;
    background-color: #f0f5ff;
    padding: 4rpx 16rpx;
    border-radius: 20rpx;
    margin-right: 16rpx;
    margin-bottom: 10rpx;
  }
}

.load-more {
  text-align: center;
  margin: 30rpx 0;

  .load-more-btn {
    background-color: transparent;
    border: 1rpx solid #ddd;
    color: #666;
    font-size: 26rpx;
    padding: 10rpx 30rpx;
    border-radius: 30rpx;

    &:active {
      background-color: #f5f5f5;
    }

    &:disabled {
      color: #999;
      background-color: #f5f5f5;
    }
  }
}

.all-loaded {
  text-align: center;
  margin: 30rpx 0;
  padding-bottom: 30rpx;

  .all-loaded-text {
    font-size: 24rpx;
    color: #999;
    position: relative;
    display: inline-block;
    padding: 0 30rpx;

    &::before,
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      width: 60rpx;
      height: 1rpx;
      background-color: #eee;
    }

    &::before {
      left: -40rpx;
    }

    &::after {
      right: -40rpx;
    }
  }
}

/* 弹窗样式 */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-content {
  width: 80%;
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;

  .popup-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }

  .popup-close {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .close-icon {
      font-size: 40rpx;
      color: #999;
    }
  }
}

.popup-body {
  padding: 30rpx;
  max-height: 70vh;
  overflow-y: auto;

  .detail-name {
    text-align: center;
    margin-bottom: 30rpx;

    .detail-name-text {
      font-size: 48rpx;
      font-weight: bold;
      color: #333;
    }
  }

  .detail-section {
    margin-bottom: 30rpx;

    .detail-section-title {
      font-size: 28rpx;
      color: #666;
      margin-bottom: 10rpx;
      display: block;
    }

    .detail-section-content {
      font-size: 28rpx;
      color: #333;
      line-height: 1.5;
    }
  }

  .detail-character-item {
    display: flex;
    margin-top: 10rpx;

    .detail-character {
      font-size: 28rpx;
      color: #3a5af9;
      margin-right: 10rpx;
    }

    .detail-char-meaning {
      font-size: 28rpx;
      color: #333;
      flex: 1;
    }
  }

  .detail-actions {
    margin-top: 40rpx;
    display: flex;
    justify-content: center;

    .detail-copy-btn {
      padding: 16rpx 40rpx;
      background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
      border-radius: 40rpx;
      box-shadow: 0 2rpx 8rpx rgba(58, 90, 249, 0.2);

      .detail-copy-text {
        font-size: 28rpx;
        color: #fff;
      }
    }
  }
}

.form-container {
  background-color: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.form-section {
  margin-bottom: 20px;

  .section-title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
    display: block;
  }

  .form-input {
    width: 100%;
    height: 45px;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 0 15px;
    font-size: 16px;
  }

  .form-textarea {
    width: 100%;
    height: 120px;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px 15px;
    font-size: 16px;
    line-height: 1.5;
  }

  .input-tip {
    font-size: 12px;
    color: #999;
    margin-top: 5px;
    display: block;
  }

  .char-counter {
    font-size: 12px;
    color: #999;
    text-align: right;
    margin-top: 5px;
  }
}

.gender-tabs {
  display: flex;
  border: 1px solid #3a5af9;
  border-radius: 8px;
  overflow: hidden;

  .gender-tab {
    flex: 1;
    height: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;

    &.active {
      background-color: #3a5af9;

      .tab-text {
        color: #fff;
      }
    }

    .tab-text {
      color: #3a5af9;
      font-size: 16px;
    }
  }
}

.action-section {
  margin: 40rpx 0;

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

  .generate-btn {
    background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
    color: #fff;
    padding: 20rpx 0;
    border-radius: 40rpx;
    font-size: 32rpx;
    margin-top: 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(58, 90, 249, 0.3);
    border: none;
    transition: all 0.3s ease;

    &:active {
      transform: translateY(2rpx);
      box-shadow: 0 2rpx 8rpx rgba(58, 90, 249, 0.2);
    }

    &:disabled {
      background: linear-gradient(135deg, #c0c4cc 0%, #909399 100%);
      color: #fff;
      box-shadow: none;
    }
  }
}

.results-container {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  margin-top: 20px;
  overflow: hidden;

  .result-title-bar {
    padding: 15px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .result-title {
      color: #333;
      font-size: 18px;
      font-weight: bold;
    }

    .copy-all-btn {
      display: flex;
      align-items: center;
      padding: 8px 20px;
      background: linear-gradient(135deg, #3a5af9 0%, #2d8cf0 100%);
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(58, 90, 249, 0.3);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.2),
          transparent
        );
        transition: 0.5s;
      }

      &:active {
        transform: translateY(2px);
        box-shadow: 0 1px 4px rgba(58, 90, 249, 0.2);
      }

      &:active::before {
        left: 100%;
      }

      .copy-all-text {
        color: #fff;
        font-size: 14px;
        font-weight: 500;
      }
    }
  }

  .name-results-scroll {
    max-height: 500px;
  }

  .name-result-card {
    padding: 15px;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .name-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .name-text {
        color: #333;
        font-size: 22px;
        font-weight: bold;
      }

      .copy-btn {
        display: flex;
        align-items: center;
        padding: 6px 14px;
        background: linear-gradient(135deg, #f0f3ff 0%, #e6eaff 100%);
        border-radius: 15px;
        box-shadow: 0 1px 4px rgba(58, 90, 249, 0.15);
        transition: all 0.2s ease;

        &:active {
          transform: translateY(1px);
          box-shadow: 0 0 2px rgba(58, 90, 249, 0.1);
        }

        .copy-text {
          color: #3a5af9;
          font-size: 12px;
        }
      }
    }

    .meaning-section {
      margin-bottom: 10px;

      .meaning-title {
        color: #666;
        font-size: 14px;
        margin-bottom: 5px;
        display: block;
      }

      .meaning-text {
        color: #333;
        font-size: 14px;
        line-height: 1.5;
      }
    }

    .characters-section {
      .characters-title {
        color: #666;
        font-size: 14px;
        margin-bottom: 5px;
        display: block;
      }

      .character-item {
        display: flex;
        margin-top: 5px;

        .character {
          color: #3a5af9;
          font-size: 14px;
          margin-right: 10px;
        }

        .char-meaning {
          color: #333;
          font-size: 14px;
          flex: 1;
        }
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 40px;

  .empty-text {
    color: #999;
    font-size: 14px;
  }
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

  .loading-content {
    background-color: white;
    border-radius: 16rpx;
    padding: 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 70%;

    .loading-spinner {
      width: 80rpx;
      height: 80rpx;
      border: 6rpx solid #f3f3f3;
      border-top: 6rpx solid #3a5af9;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 30rpx;
    }

    .loading-text {
      font-size: 28rpx;
      color: #333;
      margin-bottom: 20rpx;
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
</style>
