<template>
  <view class="chatbot-container">
    <!-- 聊天头部 -->
    <view class="chat-header">
      <view class="header-content">
        <text class="header-title">智能聊天机器人</text>
        <text class="header-subtitle">随时在线，智能解答</text>
      </view>

      <!-- 新建会话按钮 -->
      <view class="new-chat-button" @click="handleNewChat">
        <text class="new-chat-icon">+</text>
      </view>
    </view>

    <!-- 聊天消息区域 -->
    <scroll-view
      class="chat-messages"
      scroll-y="true"
      :scroll-top="scrollTop"
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
      :show-scrollbar="false"
      id="message-scroll-view"
      @scroll="onScroll"
    >
      <view class="message-list">
        <!-- 消息内容 -->
        <block v-for="(message, index) in messages" :key="index">
          <view
            :id="'msg-' + index"
            class="message-row"
            :class="{ 'user-row': message.isUser, 'bot-row': !message.isUser }"
          >
            <view
              class="message-bubble"
              :class="{
                'user-bubble': message.isUser,
                'bot-bubble': !message.isUser,
                'error-bubble': message.isError,
              }"
            >
              <!-- 机器人头像 -->
              <view class="avatar bot-avatar" v-if="!message.isUser">
                <image
                  src="https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/bot-avatar.png"
                  mode="aspectFill"
                ></image>
              </view>

              <!-- 消息内容 -->
              <view
                class="message-content"
                :class="{
                  'user-content': message.isUser,
                  'bot-content': !message.isUser,
                  'error-content': message.isError,
                }"
              >
                <text>{{ message.content }}</text>
              </view>

              <!-- 用户头像 -->
              <view class="avatar user-avatar" v-if="message.isUser">
                <image
                  :src="formatAvatarUrl(userInfo.avatar) || '/static/user-avatar.png'"
                  mode="aspectFill"
                ></image>
              </view>
            </view>
          </view>
        </block>

        <!-- 正在输入指示器 -->
        <view class="message-row bot-row" v-if="isTyping" id="typing-indicator">
          <view class="message-bubble bot-bubble">
            <view class="avatar bot-avatar">
              <image
                src="https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/bot-avatar.png"
                mode="aspectFill"
              ></image>
            </view>
            <view class="typing-bubbles">
              <view class="typing-dot"></view>
              <view class="typing-dot"></view>
              <view class="typing-dot"></view>
            </view>
          </view>
        </view>

        <view id="msg-bottom" style="height: 20rpx"></view>
      </view>
    </scroll-view>

    <!-- 输入区域 -->
    <view class="chat-input-container">
      <view class="input-wrapper">
        <input
          class="chat-input"
          type="text"
          confirm-type="send"
          v-model="inputMessage"
          placeholder="请输入您想问的问题..."
          @confirm="sendMessage"
          :disabled="!isConnected || isWaitingForResponse"
          adjust-position="true"
          cursor-spacing="20"
        />
      </view>
      <button
        class="send-button"
        :class="{
          active: inputMessage.trim().length > 0 && isConnected && !isWaitingForResponse,
          disabled:
            !isConnected || isWaitingForResponse || inputMessage.trim().length === 0,
        }"
        @click="sendMessage"
        :disabled="
          !isConnected || isWaitingForResponse || inputMessage.trim().length === 0
        "
      >
        <text class="send-text">发送</text>
      </button>
    </view>

    <!-- 积分不足弹窗 -->
    <view
      class="points-popup-overlay"
      v-if="showInsufficientPointsPopup"
      @click="closePointsPopup"
    >
      <view class="points-popup" @click.stop>
        <view class="points-popup-header">
          <text class="points-popup-title">积分不足</text>
        </view>
        <view class="points-popup-content">
          <text class="points-popup-message">{{ insufficientPointsMessage }}</text>
          <view class="points-info">
            <view class="points-item">
              <text class="points-label">当前积分:</text>
              <text class="points-value">{{ pointsBalance }}</text>
            </view>
            <view class="points-item">
              <text class="points-label">所需积分:</text>
              <text class="points-value">{{ pointsNeeded }}</text>
            </view>
          </view>
          <!-- iOS平台限制提示 -->
          <view v-if="isIOSDevice" class="ios-limitation-info">
            <text class="ios-limitation-text">{{ iosLimitationMessage }}</text>
          </view>
        </view>
        <view class="points-popup-actions">
          <button class="popup-button cancel-button" @click="closePointsPopup">
            {{ isIOSDevice ? "确定" : "关闭" }}
          </button>
          <button
            v-if="!isIOSDevice"
            class="popup-button primary-button"
            @click="goToPointsPage"
          >
            获取积分
          </button>
        </view>
      </view>
    </view>

    <!-- 登录确认弹窗 -->
    <login-confirm-popup
      :visible="showLoginConfirmPopup"
      :message="loginConfirmMessage"
      @confirm="handleLoginConfirm"
      @cancel="handleLoginCancel"
    />
  </view>
</template>

<script>
import LoginConfirmPopup from "../../components/LoginConfirmPopup.vue";
import { isIOS, getIOSLimitationMessage } from "../../utils/platform.js";
import * as chatbotApi from "../../api/chatbotApi.js";
import { getUserInfo } from "../../api/userApi.js";

// 全局WebSocket状态管理
// 使用Vue.prototype扩展或应用的globalData来存储WebSocket的状态
// 确保在页面卸载后WebSocket状态依然保持
if (!getApp().globalData) {
  getApp().globalData = {};
}

if (!getApp().globalData.websocketState) {
  getApp().globalData.websocketState = {
    // WebSocket关闭定时器
    closeTimeout: null,
    // 最后一次活跃时间戳
    lastActiveTime: Date.now(),
  };
}

export default {
  components: {
    LoginConfirmPopup,
  },
  data() {
    return {
      messages: [],
      inputMessage: "",
      scrollIntoView: "msg-0",
      pendingResponse: "",

      // WebSocket相关
      websocket: null,
      isConnected: false,
      connectionTimeout: null,
      retryCount: 0,
      maxRetries: 3,
      connectingStatus: "connecting", // 'connecting', 'failed', 'connected'
      connectingMessage: "连接中...",

      // 正在输入状态
      isTyping: false,
      isWaitingForResponse: false,

      // 会话相关
      currentConversationId: null,
      isFirstMessageSent: false, // 新增: 追踪是否发送了首条消息
      firstMessageProcessed: false, // 新增: 追踪首条消息是否已处理完成

      // 积分不足弹窗相关
      showInsufficientPointsPopup: false,
      insufficientPointsMessage: "",
      pointsBalance: 0,
      pointsNeeded: 0,

      // 登录确认弹窗相关
      showLoginConfirmPopup: false,
      loginConfirmMessage: "发送消息需要登录，是否前往登录？",
      pendingUserMessage: "", // 存储待发送的消息，仅用于临时保存，不会存储到本地

      // 错误码映射
      errorCodes: {
        0: "成功",
        1000: "无效请求",
        1001: "认证错误",
        1002: "授权错误",
        1003: "资源未找到",
        1004: "超出速率限制",
        1005: "内部服务器错误",
      },
      scrollTop: 0,

      // 用户滚动相关
      isUserScrolling: false,
      lastScrollTop: 0,
      shouldAutoScroll: true,

      // 用户信息
      userInfo: {
        avatar: "",
      },

      // iOS平台判断
      isIOSDevice: false,
      iosLimitationMessage: "此功能仅限iOS平台使用",

      // 导航栏高度
      navBarHeight: 0,

      // WebSocket延迟关闭时间（5分钟）
      websocketCloseDelay: 5 * 60 * 1000, // 5分钟，单位为毫秒
    };
  },
  onLoad(options) {
    console.log("Chatbot page loaded");

    // 检查设备平台
    this.isIOSDevice = isIOS();
    this.iosLimitationMessage = getIOSLimitationMessage();
    console.log(`设备平台: ${this.isIOSDevice ? "iOS" : "非iOS"}`);

    // 获取导航栏高度
    this.navBarHeight = this.calcNavBarHeight();
    console.log("Nav bar height:", this.navBarHeight);

    // 检查当前环境中可用的WebSocket方法
    this.checkWebSocketMethods();

    // 获取用户信息
    this.getUserInfo();

    // 添加一个小延迟确保页面完全加载再连接WebSocket
    // 这有助于确保事件监听器能正确注册
    setTimeout(() => {
      // 连接WebSocket
      this.connectWebSocket();
    }, 50);

    // 添加窗口大小改变监听器，确保滚动正常工作
    uni.onWindowResize(() => {
      console.log("窗口大小改变，尝试重新滚动");
      this.$nextTick(() => {
        this.scrollToBottom();
      });
    });
  },
  onShow() {
    console.log("聊天机器人页面显示");

    // 清除可能存在的延迟关闭定时器
    if (getApp().globalData.websocketState.closeTimeout) {
      console.log("清除WebSocket延迟关闭定时器");
      clearTimeout(getApp().globalData.websocketState.closeTimeout);
      getApp().globalData.websocketState.closeTimeout = null;
    }

    // 更新最后活跃时间
    getApp().globalData.websocketState.lastActiveTime = Date.now();

    // 检查WebSocket状态，如果未连接则重新连接
    if (!this.isConnected) {
      console.log("页面重新显示，WebSocket未连接，尝试重连");

      // 确保清理旧状态
      if (this.websocket) {
        this.removeAllSocketEventListeners();
      }
      this.websocket = null;

      // 延迟重连以确保页面状态已刷新
      setTimeout(() => {
        this.connectWebSocket();
      }, 50);
    } else {
      console.log("页面重新显示，WebSocket已连接");

      // 检查会话ID是否有效
      if (this.currentConversationId) {
        console.log("验证当前会话ID的有效性:", this.currentConversationId);
        this.checkConversationValid().then((isValid) => {
          if (!isValid) {
            console.log("当前会话ID无效，重置会话并显示欢迎语");
            this.currentConversationId = null;
            this.messages = [];
            this.addWelcomeMessage();
            return;
          }

          console.log("当前会话ID有效，继续使用");
          // 如果WebSocket已连接且会话ID有效，重新加载消息以确保同步
          this.messages = [];
          this.loadConversationMessages(this.currentConversationId);
        });
      } else {
        console.log("页面重新显示，没有当前会话ID，尝试加载历史会话");
        this.loadConversationHistory();
      }

      // 获取最新的用户信息
      this.getUserInfo();
    }
  },
  onUnload() {
    console.log("聊天机器人页面卸载，但WebSocket将保持连接5分钟");
    this.clearConnectionTimeout();

    // 记录最后活跃时间
    getApp().globalData.websocketState.lastActiveTime = Date.now();

    // 清除之前可能存在的定时器
    if (getApp().globalData.websocketState.closeTimeout) {
      clearTimeout(getApp().globalData.websocketState.closeTimeout);
    }

    // 设置5分钟后关闭WebSocket的定时器
    getApp().globalData.websocketState.closeTimeout = setTimeout(() => {
      console.log("用户离开聊天页面超过5分钟，关闭WebSocket连接");
      this.closeWebSocket();
      // 清空定时器引用
      getApp().globalData.websocketState.closeTimeout = null;
    }, this.websocketCloseDelay);

    // 移除窗口大小改变监听器
    try {
      uni.offWindowResize();
    } catch (e) {
      console.log("移除窗口大小改变监听器出错，忽略此错误:", e);
    }
  },
  methods: {
    // 添加新的方法：同步消息的会话ID
    syncMessageConversationIds(newConversationId, msgTimestamp = null) {
      if (!newConversationId) {
        console.log("无效的会话ID，不进行同步");
        return;
      }

      const timestamp = msgTimestamp || new Date().toISOString();
      console.log(`[${timestamp}] 同步所有消息的会话ID为: ${newConversationId}`);

      let updateCount = 0;

      // 更新所有消息的会话ID
      this.messages.forEach((msg, index) => {
        if (msg.conversation_id !== newConversationId) {
          console.log(
            `[${timestamp}] 更新消息[${index}]的会话ID: ${
              msg.conversation_id || "无"
            } -> ${newConversationId}`
          );
          msg.conversation_id = newConversationId;
          updateCount++;

          // 同时移除临时标记
          if (msg.pendingConfirmation) {
            delete msg.pendingConfirmation;
          }
        }
      });

      console.log(`[${timestamp}] 同步完成，共更新 ${updateCount} 条消息的会话ID`);

      // 更新当前会话ID
      if (this.currentConversationId !== newConversationId) {
        console.log(
          `[${timestamp}] 更新当前会话ID: ${
            this.currentConversationId || "无"
          } -> ${newConversationId}`
        );
        this.currentConversationId = newConversationId;
      }

      return updateCount;
    },

    // 检查当前会话ID是否有效
    checkConversationValid() {
      if (!this.currentConversationId) {
        return Promise.resolve(false);
      }

      const token = uni.getStorageSync("token");
      if (!token) {
        return Promise.resolve(false);
      }

      // 通过API检查会话是否存在
      return chatbotApi
        .checkConversation(token, this.currentConversationId)
        .then((res) => {
          // 如果API返回成功且会话存在
          const isValid = res && res.code === 0 && res.data;
          console.log(
            `会话ID ${this.currentConversationId} 验证结果: ${isValid ? "有效" : "无效"}`
          );
          return isValid;
        })
        .catch((err) => {
          console.error("检查会话有效性失败:", err);
          return false;
        });
    },

    // 获取用户信息
    getUserInfo() {
      // 获取全局用户信息
      const globalUserInfo = getApp().globalData.userInfo;
      if (globalUserInfo) {
        this.userInfo = globalUserInfo;
        console.log("成功获取全局用户信息:", this.userInfo);
        return;
      }

      // 如果全局状态没有用户信息，则尝试从API获取
      const token = uni.getStorageSync("token");
      if (token) {
        // 使用API封装模块的getUserInfo方法
        getUserInfo()
          .then((res) => {
            if (res.code === 0) {
              this.userInfo = res.data;
              // 同时更新全局状态
              getApp().globalData.userInfo = this.userInfo;
              console.log("成功获取用户信息:", this.userInfo);
            } else {
              console.warn("获取用户信息失败:", res.message);
            }
          })
          .catch((err) => {
            console.error("获取用户信息请求失败:", err);
          });
      } else {
        console.log("用户未登录，无法获取用户信息");
      }
    },

    // 格式化头像URL
    formatAvatarUrl(url) {
      if (!url) return "";

      url = "https://" + url;
      // 如果已经是完整URL，直接返回
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }

      // 如果不是完整URL，则拼接基础URL
      // 获取全局 API 资源基础 URL
      const baseResourceUrl =
        this.$baseResourceUrl || getApp().globalData.baseResourceUrl;
      if (baseResourceUrl) {
        return `${baseResourceUrl}${url}`;
      }

      return url;
    },

    // 检查当前环境中可用的WebSocket方法
    checkWebSocketMethods() {
      console.log("检查可用的WebSocket方法:");

      // 检查连接方法
      const connectMethods = ["connectSocket", "closeSocket", "sendSocketMessage"];

      // 检查事件监听方法
      const eventMethods = [
        "onSocketOpen",
        "onSocketClose",
        "onSocketMessage",
        "onSocketError",
      ];

      // 检查移除监听方法
      const removeMethods = [
        "offSocketOpen",
        "offSocketClose",
        "offSocketMessage",
        "offSocketError",
      ];

      // 输出可用方法
      connectMethods.forEach((method) => {
        console.log(
          `${method}: ${typeof uni[method] === "function" ? "可用" : "不可用"}`
        );
      });

      eventMethods.forEach((method) => {
        console.log(
          `${method}: ${typeof uni[method] === "function" ? "可用" : "不可用"}`
        );
      });

      removeMethods.forEach((method) => {
        console.log(
          `${method}: ${typeof uni[method] === "function" ? "可用" : "不可用"}`
        );
      });
    },
    // 连接WebSocket
    connectWebSocket() {
      console.log("开始连接WebSocket");

      try {
        // 检查是否有延迟关闭的定时器
        if (getApp().globalData.websocketState.closeTimeout) {
          console.log("发现延迟关闭的定时器，取消该定时器");
          clearTimeout(getApp().globalData.websocketState.closeTimeout);
          getApp().globalData.websocketState.closeTimeout = null;

          // 如果WebSocket仍然是连接状态，可以直接使用它
          if (this.isConnected && this.websocket) {
            console.log("WebSocket仍然处于连接状态，无需重新连接");
            return;
          }
        }

        // 计算自上次活跃以来的时间（毫秒）
        const idleTime = Date.now() - getApp().globalData.websocketState.lastActiveTime;

        // 如果未超过延迟关闭时间，且WebSocket仍然连接中，重用它
        if (idleTime < this.websocketCloseDelay && this.isConnected && this.websocket) {
          console.log(
            `离开页面时间(${Math.round(
              idleTime / 1000
            )}秒)未超过延迟关闭时间，重用现有连接`
          );
          return;
        }

        // 否则，关闭现有连接并创建新连接
        this.closeWebSocket();

        // 获取token（如果有）
        const token = uni.getStorageSync("token");

        // 重置连接状态
        this.isConnected = false;
        this.connectingStatus = "connecting";
        this.connectingMessage = "连接中...";

        // 设置连接超时
        this.clearConnectionTimeout();
        this.connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.error("WebSocket连接超时");
            this.handleConnectionFailure("连接超时，正在重试...");
          }
        }, 10000); // 10秒超时

        // 设置WebSocket事件监听器
        uni.onSocketOpen(() => {
          console.log("WebSocket连接已建立 - Open事件触发");
          // 清除超时定时器
          this.clearConnectionTimeout();

          // WebSocket已连接，但等待服务器确认
          this.connectingMessage = "等待服务器响应...";

          // 如果10秒内没有收到connected消息，也认为是连接失败
          this.connectionTimeout = setTimeout(() => {
            if (this.connectingStatus === "connecting") {
              console.error("服务器响应超时");
              this.handleConnectionFailure("服务器响应超时，正在重试...");
            }
          }, 10000);
        });

        uni.onSocketError((error) => {
          console.error("WebSocket错误:", error);
          this.clearConnectionTimeout();
          this.handleConnectionFailure("连接发生错误，正在重试...");
        });

        uni.onSocketClose(() => {
          console.log("WebSocket连接已关闭");
          this.clearConnectionTimeout();
          this.isConnected = false;
          // 如果之前已成功连接，现在突然断开，尝试重连
          if (this.connectingStatus === "connected") {
            this.handleConnectionFailure("连接已断开，正在重试...");
          }
        });

        uni.onSocketMessage((res) => {
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] 收到WebSocket原始消息:`, res.data);

          // 添加调试信息，检查消息内容
          try {
            const parsedMsg = JSON.parse(res.data);
            console.log(
              `[${timestamp}] 消息类型: ${parsedMsg.type || "未知"}, 消息内容预览:`,
              parsedMsg.content
                ? parsedMsg.content.substring(0, 50) +
                    (parsedMsg.content.length > 50 ? "..." : "")
                : "无内容"
            );
          } catch (err) {
            console.error(`[${timestamp}] 消息不是有效的JSON格式:`, err);
          }

          try {
            this.handleIncomingMessage(res.data);
          } catch (error) {
            console.error("处理WebSocket消息出错:", error);
            this.isWaitingForResponse = false;
            this.isTyping = false;
          }
        });

        // 使用封装的API建立连接
        chatbotApi
          .connectWebSocket(token)
          .then((res) => {
            console.log("WebSocket连接请求发送成功");
            this.websocket = true; // 标记连接已创建

            // 更新最后活跃时间
            getApp().globalData.websocketState.lastActiveTime = Date.now();
          })
          .catch((err) => {
            console.error("WebSocket连接请求发送失败:", err);
            this.handleConnectionFailure("连接失败，正在重试...");
          });
      } catch (error) {
        console.error("连接WebSocket失败:", error);
        this.clearConnectionTimeout();
        this.handleConnectionFailure("连接出错，正在重试...");
      }
    },

    // 处理连接失败
    handleConnectionFailure(message) {
      this.isConnected = false;
      this.connectingMessage = message || "连接失败，正在重试...";

      // 增加重试次数
      this.retryCount++;

      if (this.retryCount <= this.maxRetries) {
        // 尝试重新连接
        console.log(`尝试重新连接，第${this.retryCount}次`);
        setTimeout(() => {
          this.connectWebSocket();
        }, 3000); // 3秒后重试
      } else {
        // 超过最大重试次数
        this.connectingStatus = "failed";

        // 显示连接失败消息
        this.messages.push({
          isUser: false,
          content: "无法连接到服务器，请检查网络连接或稍后再试。",
          isComplete: true,
          isError: true,
        });

        // 滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },

    // 清除连接超时定时器
    clearConnectionTimeout() {
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
    },

    // 关闭WebSocket连接
    closeWebSocket() {
      if (this.websocket) {
        try {
          console.log("正在关闭WebSocket连接...");

          // 清除延迟关闭定时器
          if (getApp().globalData.websocketState.closeTimeout) {
            clearTimeout(getApp().globalData.websocketState.closeTimeout);
            getApp().globalData.websocketState.closeTimeout = null;
            console.log("已清除延迟关闭定时器");
          }

          // 尝试移除所有事件监听器
          this.removeAllSocketEventListeners();

          // 使用封装API关闭WebSocket连接
          chatbotApi
            .closeWebSocket()
            .then((res) => {
              console.log("WebSocket连接已关闭");

              // 在某些版本的uni-app中，事件监听器不会随连接关闭而清理
              // 通过重新设置空的监听器来防止旧的监听器被触发
              try {
                // 设置空的事件处理程序，覆盖之前的事件处理
                uni.onSocketOpen(function () {});
                uni.onSocketMessage(function () {});
                uni.onSocketError(function () {});
                uni.onSocketClose(function () {});
                console.log("已设置空的WebSocket事件处理程序");
              } catch (e) {
                console.log("设置空事件处理程序失败，忽略此错误:", e);
              }
            })
            .catch((err) => console.error("关闭WebSocket连接失败:", err))
            .finally(() => {
              // 确保状态被重置
              this.isConnected = false;
              this.websocket = null;
              this.connectingStatus = "connecting";
              console.log("WebSocket连接状态已重置");
            });
        } catch (error) {
          console.error("关闭WebSocket出错:", error);
          // 即使出错也要重置状态
          this.isConnected = false;
          this.websocket = null;
          this.connectingStatus = "connecting";
        }
      } else {
        console.log("WebSocket已经关闭或未连接");
      }
    },

    // 移除所有WebSocket事件监听器
    removeAllSocketEventListeners() {
      try {
        // 检查是否存在offSocket方法
        if (typeof uni.offSocketOpen === "function") {
          // 如果存在，则使用标准方法移除监听器
          uni.offSocketOpen();
          uni.offSocketError();
          uni.offSocketMessage();
          uni.offSocketClose();
          console.log("已移除所有WebSocket事件监听器");
        } else {
          console.log("当前uni-app版本不支持offSocket*方法，将使用连接重置替代");
          // 由于不能直接移除监听器，我们会依赖closeSocket方法来间接清理
          // 在某些uni-app版本中，关闭连接会自动清理相关的事件监听器

          // 这里我们不做额外处理，只记录这个情况
          // 事件处理将在新连接时通过重新设置来"替换"原有的处理程序
        }
      } catch (error) {
        console.error("移除WebSocket事件监听器出错:", error);
        console.log("将依赖连接的关闭和重置来清理事件监听");
      }
    },

    // 加载历史会话
    loadConversationHistory() {
      console.log("加载历史会话记录");

      // 如果已经发送过首条消息，则不要加载历史会话，以避免会话ID冲突
      if (this.isFirstMessageSent && !this.firstMessageProcessed) {
        console.log("已发送首条消息但尚未处理完成，跳过加载历史会话");
        return;
      }

      // 获取认证token
      const token = uni.getStorageSync("token");

      // 如果用户已登录，获取会话历史
      if (token) {
        chatbotApi
          .getConversations(token)
          .then((res) => {
            console.log("获取会话列表成功:", res);

            // 分析服务器返回的会话格式
            if (res && Array.isArray(res)) {
              console.log("会话列表包含 " + res.length + " 个会话");

              // 检查每个会话的结构
              if (res.length > 0) {
                console.log("第一个会话结构:", JSON.stringify(res[0]));
              }
            } else {
              console.warn("会话列表不是数组或为空:", res);
            }

            if (res && res.length > 0) {
              // 获取最近的会话
              const latestConversation = res[0];

              // 如果已经发送了第一条消息，不要更新会话ID
              if (!this.isFirstMessageSent) {
                this.currentConversationId = latestConversation.id;
                console.log("加载最近会话ID:", this.currentConversationId);
              } else {
                console.log(
                  "已发送首条消息，保持当前会话ID:",
                  this.currentConversationId
                );
              }

              // 获取该会话的消息
              if (!this.isFirstMessageSent) {
                this.loadConversationMessages(this.currentConversationId);
              }
            } else {
              // 没有历史会话，显示欢迎消息
              console.log("没有历史会话，显示欢迎消息");
              this.addWelcomeMessage();
            }
          })
          .catch((err) => {
            console.error("获取会话列表失败:", err);

            // 显示欢迎消息
            this.addWelcomeMessage();
          });
      } else {
        // 用户未登录，只显示欢迎消息
        console.log("用户未登录，显示欢迎消息");
        this.addWelcomeMessage();
      }
    },

    // 创建新会话
    createNewConversation() {
      console.log("创建新会话");

      // 清空当前消息列表
      this.messages = [];

      // 获取认证token
      const token = uni.getStorageSync("token");
      if (!token) {
        console.log("未登录，无法创建会话");
        this.addWelcomeMessage();
        return;
      }

      chatbotApi
        .createConversation(token, "新会话")
        .then((res) => {
          console.log("创建新会话成功:", res);

          if (res && res.code === 0 && res.data && res.data.id) {
            // 保存新会话ID
            this.currentConversationId = res.data.id;

            // 添加欢迎消息
            this.addWelcomeMessage();
          } else {
            console.error("创建会话返回数据异常");
            // 即使创建会话失败，也添加欢迎语
            this.addWelcomeMessage();
          }
        })
        .catch((err) => {
          console.error("创建新会话失败:", err);
          // 创建失败时也添加欢迎语
          this.addWelcomeMessage();
        });
    },

    // 加载指定会话的消息记录
    loadConversationMessages(conversationId) {
      if (!conversationId) {
        console.log("会话ID无效，无法加载消息");
        this.recoverConversation("invalid_id");
        return;
      }

      // 保存当前会话ID
      this.currentConversationId = conversationId;
      console.log(`设置当前会话ID: ${this.currentConversationId}`);

      // 获取认证token
      const token = uni.getStorageSync("token");

      chatbotApi
        .getConversationMessages(token, conversationId)
        .then((res) => {
          console.log("获取会话消息成功:", res);

          // 清空当前消息
          this.messages = [];

          // 检查是否有返回数据
          if (!res) {
            console.warn("会话消息API返回空数据");
            // 如果没有消息，添加欢迎语
            this.addWelcomeMessage();
            return;
          }

          // 检查数据结构
          let messagesData = res;

          // 如果返回的是包装对象，尝试提取实际的消息数组
          if (
            !Array.isArray(messagesData) &&
            messagesData.data &&
            Array.isArray(messagesData.data)
          ) {
            console.log("消息数据在data字段中，提取messages数组");
            messagesData = messagesData.data;
          }

          // 再次验证消息数组格式
          if (!Array.isArray(messagesData)) {
            console.warn("会话消息不是数组格式:", messagesData);
            // 如果消息格式不正确，添加欢迎语
            this.addWelcomeMessage();
            return;
          }

          // 无论是否有历史消息，都先添加欢迎语
          this.addWelcomeMessage();

          // 如果没有历史消息，直接返回，因为已经添加欢迎语了
          if (messagesData.length === 0) {
            console.log("该会话无历史消息，已添加欢迎消息");
            return;
          }

          // 转换并添加消息，确保所有消息都有正确的会话ID
          messagesData.forEach((msg) => {
            this.messages.push({
              isUser: msg.role === "user",
              content: msg.content,
              isComplete: true,
              conversation_id: this.currentConversationId, // 使用当前会话ID
              timestamp: msg.timestamp || Date.now(),
            });
          });

          // 滚动到底部
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        })
        .catch((err) => {
          console.error("获取会话消息失败:", err);

          // 如果获取失败，调用恢复机制
          this.recoverConversation("load_failed");

          // 如果是会话ID无效的错误，重置会话ID
          if (
            err.message &&
            (err.message.includes("会话不存在") || err.message.includes("会话已过期"))
          ) {
            console.log("会话ID无效或已过期，重置会话ID");
            this.currentConversationId = null;
          }
        });
    },

    // 添加欢迎消息
    addWelcomeMessage() {
      // 创建欢迎消息
      const welcomeMessage = {
        isUser: false,
        content: "你好！我是智能聊天机器人，有什么可以帮助你的吗？",
        isComplete: true,
        conversation_id: this.currentConversationId,
      };

      // 检查是否已经有欢迎消息
      const hasWelcomeMessage = this.messages.some(
        (msg) => !msg.isUser && msg.content === welcomeMessage.content
      );

      // 只有在没有欢迎消息时才添加
      if (!hasWelcomeMessage) {
        console.log("添加欢迎消息，当前会话ID:", this.currentConversationId);
        this.messages.push(welcomeMessage);

        // 滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      } else {
        console.log("已存在欢迎消息，不重复添加");
      }
    },

    // 发送消息
    sendMessage() {
      // 检查消息是否可以发送
      if (!this.inputMessage.trim() || this.isWaitingForResponse) {
        return;
      }

      // 记录用户输入
      const userQuery = this.inputMessage;

      // 检查是否已登录
      const token = uni.getStorageSync("token");
      if (!token) {
        console.log("用户未登录，显示登录确认弹窗");
        this.pendingUserMessage = userQuery; // 保存用户输入的消息
        this.showLoginConfirmPopup = true;
        return;
      }

      // 检查是否是首条消息
      const isFirstMessage = this.messages.filter((msg) => msg.isUser).length === 0;
      if (isFirstMessage) {
        console.log("这是用户的首条消息");
        this.isFirstMessageSent = true;
        this.firstMessageProcessed = false;
      }

      // 用户已登录，继续发送消息
      this.processSendMessage(userQuery, isFirstMessage);
    },

    // 处理发送消息的实际逻辑（已登录状态）
    processSendMessage(userQuery, isFirstMessage = false) {
      // 记录当前会话ID
      const currentConversationId = this.currentConversationId;
      console.log(
        `发送消息前的会话ID: ${
          currentConversationId || "无"
        }, 是否首条消息: ${isFirstMessage}`
      );

      // 添加用户消息到UI
      const userMessage = {
        isUser: true,
        content: userQuery,
        isComplete: true,
        conversation_id: this.currentConversationId,
        isFirstMessage: isFirstMessage,
        // 添加临时标记，表示这是一个等待服务器确认的消息
        pendingConfirmation: true,
        timestamp: Date.now(),
      };

      // 添加到消息列表
      this.messages.push(userMessage);

      // 清空输入框
      this.inputMessage = "";

      // 设置等待响应状态
      this.isWaitingForResponse = true;
      this.isTyping = true;

      // 确保我们有最新的用户信息
      const token = uni.getStorageSync("token");
      if (token && (!this.userInfo || !this.userInfo.avatar)) {
        this.getUserInfo();
      }

      // 用户发送消息时，始终启用自动滚动
      this.shouldAutoScroll = true;
      this.isUserScrolling = false;

      // 确保在DOM更新后再滚动
      this.$nextTick(() => {
        this.scrollToBottom();
        console.log("发送消息后滚动到底部");
      });

      // 使用WebSocket发送消息
      if (this.isConnected) {
        this.sendMessageViaWebSocket(userQuery, isFirstMessage);
      } else {
        // 处理未连接情况
        this.messages.push({
          isUser: false,
          content: "WebSocket未连接，请检查网络连接",
          isComplete: true,
          isError: true,
          conversation_id: this.currentConversationId,
        });

        this.isWaitingForResponse = false;
        this.isTyping = false;
        this.isFirstMessageSent = false; // 重置首条消息状态

        // 再次滚动确保错误消息可见
        this.$nextTick(() => {
          this.scrollToBottom();
          console.log("添加错误消息后滚动到底部");
        });

        // 尝试重新连接
        this.connectWebSocket();
      }
    },

    // 构建聊天历史记录
    buildMessageHistory() {
      return chatbotApi.buildMessageHistory(this.messages);
    },

    // 通过WebSocket发送消息
    sendMessageViaWebSocket(message, isFirstMessage = false) {
      // 在发送消息前验证会话ID
      const validateAndSendMessage = () => {
        // 准备消息对象
        const messageObj = {
          content: message,
        };

        // 总是添加历史聊天记录，无论是否有会话ID
        messageObj.history = this.buildMessageHistory();

        // 如果是首条消息，特殊处理
        if (isFirstMessage) {
          console.log("准备发送首条消息");

          // 为首条消息设置标志和标题
          messageObj.title = "新会话";
          messageObj.is_first_message = true;

          // 如果已有会话ID，我们也发送给服务器
          // 服务器可能会保留或创建新会话ID，但我们会在响应中同步所有消息的ID
          if (this.currentConversationId) {
            console.log(`发送首条消息时包含现有会话ID: ${this.currentConversationId}`);
            messageObj.conversation_id = this.currentConversationId;
          }

          this.doSendWebSocketMessage(messageObj);
          return;
        }

        // 非首条消息的常规处理
        if (this.currentConversationId) {
          this.checkConversationValid()
            .then((isValid) => {
              if (isValid) {
                // 会话ID有效，添加到消息
                console.log(`使用有效的会话ID发送消息: ${this.currentConversationId}`);
                messageObj.conversation_id = this.currentConversationId;
                this.doSendWebSocketMessage(messageObj);
              } else {
                // 会话ID无效，创建新会话
                console.log("当前会话ID无效，将创建新会话");
                // 不添加conversation_id，服务器会创建新会话
                messageObj.title = "新会话";
                this.doSendWebSocketMessage(messageObj);
              }
            })
            .catch((err) => {
              console.error("验证会话ID时出错:", err);
              // 出错时创建新会话
              messageObj.title = "新会话";
              this.doSendWebSocketMessage(messageObj);
            });
        } else {
          // 没有会话ID，添加默认标题
          console.log("没有会话ID，将创建新会话");
          messageObj.title = "新会话";
          this.doSendWebSocketMessage(messageObj);
        }
      };

      // 执行验证和发送
      validateAndSendMessage();
    },

    // 实际发送WebSocket消息
    doSendWebSocketMessage(messageObj) {
      // 重置待处理响应
      this.pendingResponse = "";

      // 发送WebSocket消息
      chatbotApi
        .sendWebSocketMessage(messageObj)
        .then((res) => {
          console.log("WebSocket发送消息成功:", messageObj);
        })
        .catch((err) => {
          console.error("WebSocket发送消息失败:", err);

          // 处理发送失败的情况
          this.messages.push({
            isUser: false,
            content: "消息发送失败，请检查网络连接",
            isComplete: true,
            isError: true,
            conversation_id: this.currentConversationId,
          });

          this.isWaitingForResponse = false;
          this.isTyping = false;

          // 尝试重新连接
          this.connectWebSocket();
        });
    },

    // 处理收到的消息
    handleIncomingMessage(data) {
      const msgTimestamp = new Date().toISOString();
      console.log(`[${msgTimestamp}] 进入handleIncomingMessage处理函数`);

      try {
        // 记录原始消息
        console.log(`[${msgTimestamp}] 开始处理原始WebSocket消息:`, data);
        console.log(
          `[${msgTimestamp}] 消息类型: ${typeof data}, 长度: ${data ? data.length : 0}`
        );

        // 尝试解析JSON
        let response;
        try {
          response = JSON.parse(data);
          console.log(`[${msgTimestamp}] JSON解析成功:`, response);
        } catch (parseError) {
          console.error(
            `[${msgTimestamp}] WebSocket消息JSON解析失败:`,
            parseError,
            "原始数据:",
            data
          );

          // 检查是否是字符串格式的问题
          if (typeof data === "string") {
            // 尝试修复常见的JSON格式问题
            try {
              // 有时后端可能会发送带有单引号而非双引号的JSON
              const fixedData = data.replace(/'/g, '"');
              response = JSON.parse(fixedData);
              console.log(
                `[${msgTimestamp}] 使用修复后的JSON格式成功解析消息:`,
                response
              );
            } catch (retryError) {
              console.error(`[${msgTimestamp}] 修复后解析仍然失败:`, retryError);
              throw parseError; // 使用原始错误继续抛出
            }
          } else {
            throw parseError;
          }
        }

        console.log(
          `[${msgTimestamp}] 处理WebSocket消息 - 类型: ${response.type || "未知"}`
        );

        // 首先判断是否为首条消息的响应
        const isFirstMessageResponse =
          this.isFirstMessageSent &&
          !this.firstMessageProcessed &&
          (response.type === "chunk" || response.type === "complete");

        // 检查是否需要处理首条消息的特殊情况
        if (isFirstMessageResponse && response.conversation_id) {
          console.log(
            `[${msgTimestamp}] 首条消息响应，会话ID: ${response.conversation_id}`
          );

          // 首条消息响应的会话ID优先级最高
          const prevConversationId = this.currentConversationId;

          // 使用同步方法更新所有消息的会话ID
          this.syncMessageConversationIds(response.conversation_id, msgTimestamp);

          // 标记首条消息已处理
          if (response.type === "complete") {
            console.log(`[${msgTimestamp}] 首条消息处理完成`);
            this.firstMessageProcessed = true;
          }
        }
        // 非首条消息的常规处理
        else if (response.conversation_id) {
          const prevConversationId = this.currentConversationId;

          // 如果收到的会话ID与当前会话ID不同，记录这种情况
          if (
            this.currentConversationId &&
            response.conversation_id !== this.currentConversationId
          ) {
            console.warn(
              `[${msgTimestamp}] 收到的会话ID(${response.conversation_id})与当前会话ID(${this.currentConversationId})不一致`
            );

            // 首条消息已处理完毕，保持当前会话ID不变
            if (this.firstMessageProcessed) {
              console.log(
                `[${msgTimestamp}] 首条消息已处理，保持当前会话ID: ${this.currentConversationId}`
              );
            }
            // 其他情况，接受新会话ID（如首条消息未处理完、服务端切换会话等）
            else if (["chunk", "complete"].includes(response.type)) {
              console.log(
                `[${msgTimestamp}] 接受新的会话ID: ${response.conversation_id}`
              );

              // 使用同步方法更新所有消息的会话ID
              this.syncMessageConversationIds(response.conversation_id, msgTimestamp);
            } else {
              console.log(
                `[${msgTimestamp}] 非关键消息类型，保持当前会话ID: ${this.currentConversationId}`
              );
            }
          } else if (prevConversationId !== response.conversation_id) {
            // 使用同步方法更新所有消息的会话ID
            this.syncMessageConversationIds(response.conversation_id, msgTimestamp);
          }
        }

        // 根据消息类型处理
        console.log(`[${msgTimestamp}] 开始按消息类型处理 - 类型: ${response.type}`);
        switch (response.type) {
          case "connected":
            // 连接成功
            console.log(`[${msgTimestamp}] 处理"connected"类型消息`);
            this.clearConnectionTimeout();
            this.isConnected = true;
            this.connectingStatus = "connected";
            this.retryCount = 0; // 重置重试计数
            console.log(`[${msgTimestamp}] WebSocket连接成功消息:`, {
              状态: "connected",
              内容: response.content,
              是否已认证: response.is_authenticated || false,
              时间戳: response.timestamp || "未指定",
            });

            // 如果用户已认证，刷新用户信息
            if (response.is_authenticated) {
              this.getUserInfo();
            }

            // 如果正在处理首条消息，跳过加载历史会话
            if (this.isFirstMessageSent && !this.firstMessageProcessed) {
              console.log(`[${msgTimestamp}] 正在处理首条消息，跳过历史会话加载`);
            }
            // 验证当前会话ID是否有效
            else if (this.currentConversationId) {
              this.checkConversationValid().then((isValid) => {
                if (!isValid) {
                  console.log(
                    `[${msgTimestamp}] 连接成功后验证发现当前会话ID无效，重置会话`
                  );
                  this.currentConversationId = null;
                  this.messages = [];
                }

                // 获取最近的会话或创建新会话
                // 只有当消息为空时才加载历史会话，避免重复加载
                if (this.messages.length === 0) {
                  console.log(`[${msgTimestamp}] 消息列表为空，准备加载会话历史记录...`);
                  this.loadConversationHistory();
                } else {
                  console.log(
                    `[${msgTimestamp}] 消息列表已有 ${this.messages.length} 条消息，无需加载历史`
                  );

                  // 确保所有消息都使用当前会话ID
                  if (this.currentConversationId) {
                    this.messages.forEach((msg) => {
                      msg.conversation_id = this.currentConversationId;
                    });
                  }
                }
              });
            } else {
              // 没有会话ID，加载历史会话
              if (this.messages.length === 0) {
                console.log(`[${msgTimestamp}] 消息列表为空，准备加载会话历史记录...`);
                this.loadConversationHistory();
              }
            }

            break;

          case "chunk":
            // 接收到消息片段表示连接肯定成功了
            if (!this.isConnected) {
              this.isConnected = true;
              this.connectingStatus = "connected";
              this.retryCount = 0; // 重置重试计数
              console.log("通过chunk消息确认WebSocket已连接");
            }

            // 如果是首条消息的响应，会话ID已在前面处理过

            // 关闭正在输入指示器
            this.isTyping = false;

            // 追加响应内容
            this.pendingResponse += response.content;

            // 查找是否已经有一个正在进行中的AI回复消息
            const lastMessageIndex = this.messages.length - 1;
            const lastMessage =
              lastMessageIndex >= 0 ? this.messages[lastMessageIndex] : null;

            if (lastMessage && !lastMessage.isUser && !lastMessage.isComplete) {
              // 更新现有的未完成消息
              this.messages[lastMessageIndex].content = this.pendingResponse;
              // 确保消息使用正确的会话ID
              this.messages[
                lastMessageIndex
              ].conversation_id = this.currentConversationId;
            } else {
              // 创建新的消息
              this.messages.push({
                isUser: false,
                content: this.pendingResponse,
                isComplete: false,
                timestamp: response.timestamp,
                conversation_id: this.currentConversationId,
              });
            }

            // 对于chunk消息，我们希望强制滚动到底部，所以临时启用自动滚动
            // 这样即使用户之前在滚动历史消息，也能看到新的回复内容
            this.shouldAutoScroll = true;

            // 使用强制延迟以确保DOM更新后再滚动
            setTimeout(() => {
              this.scrollToBottom();
              console.log("收到消息片段后滚动到底部");
            }, 100);
            break;

          case "complete":
            // 完成消息
            console.log("收到完成消息:", {
              会话ID: response.conversation_id || this.currentConversationId || "未指定",
              时间戳: response.timestamp || "未指定",
              是否有额外内容: !!response.content,
            });

            // 如果是首条消息的响应，标记处理完成
            if (this.isFirstMessageSent && !this.firstMessageProcessed) {
              console.log(
                `[${msgTimestamp}] 首条消息处理完成，会话ID: ${this.currentConversationId}`
              );
              this.firstMessageProcessed = true;
            }

            // 查找最后一条AI消息并标记为完成
            const lastAIMessageIndex = this.messages.findIndex(
              (msg) => !msg.isUser && !msg.isComplete
            );

            if (lastAIMessageIndex !== -1) {
              this.messages[lastAIMessageIndex].isComplete = true;

              // 确保使用当前会话ID
              this.messages[
                lastAIMessageIndex
              ].conversation_id = this.currentConversationId;

              // 如果有额外内容，也添加上
              if (response.content) {
                this.messages[lastAIMessageIndex].content += response.content;

                // 如果有额外内容，也强制滚动到底部一次
                this.shouldAutoScroll = true;
                this.$nextTick(() => {
                  this.scrollToBottom();
                });
              }
            }

            // 重置待处理响应
            this.pendingResponse = "";

            // 设置等待响应状态为false
            this.isWaitingForResponse = false;
            break;

          case "error":
            // 错误消息
            console.error("收到错误消息:", {
              错误内容: response.content,
              错误代码: response.code || "未提供",
              会话ID: response.conversation_id || this.currentConversationId || "未指定",
              时间戳: response.timestamp || "未指定",
            });

            // 添加错误提示
            this.messages.push({
              isUser: false,
              content: response.content,
              isComplete: true,
              isError: true,
              errorCode: response.code,
              conversation_id: response.conversation_id || this.currentConversationId,
            });

            // 强制滚动以确保错误消息可见
            this.shouldAutoScroll = true;

            // 设置等待响应状态为false
            this.isWaitingForResponse = false;
            this.isTyping = false;
            break;

          case "insufficient_points":
            // 积分不足消息
            console.log("收到积分不足消息:", {
              消息内容: response.content,
              积分余额: response.points_balance,
              所需积分: response.points_needed,
              会话ID: response.conversation_id || this.currentConversationId || "未指定",
              时间戳: response.timestamp || "未指定",
            });

            // 隐藏输入中指示器
            this.isTyping = false;

            // 保存积分信息
            this.insufficientPointsMessage =
              response.content || "您的积分不足，无法完成此次请求";
            this.pointsBalance = response.points_balance || 0;
            this.pointsNeeded = response.points_needed || 0;

            // 显示积分不足弹窗
            this.showInsufficientPointsPopup = true;

            // 设置等待响应状态为false
            this.isWaitingForResponse = false;
            break;

          case "rate_limited":
            // 隐藏打字指示器
            this.isTyping = false;

            console.log("收到速率限制消息:", {
              限制内容: response.content || "请求过于频繁，请稍后再试。",
              会话ID: response.conversation_id || this.currentConversationId || "未指定",
              时间戳: response.timestamp || "未指定",
            });

            // 显示速率限制消息
            this.messages.push({
              isUser: false,
              content: response.content || "请求过于频繁，请稍后再试。",
              isComplete: true,
              isError: true,
              timestamp: response.timestamp,
              conversation_id: response.conversation_id || this.currentConversationId,
            });

            // 强制滚动以确保消息可见
            this.shouldAutoScroll = true;

            // 设置等待响应状态为false
            this.isWaitingForResponse = false;
            break;

          case "disconnected":
            console.log("收到断开连接消息:", {
              原因: response.content || "未提供断开原因",
              会话ID: response.conversation_id || this.currentConversationId || "未指定",
              时间戳: response.timestamp || "未指定",
            });

            // 查找最后一条未完成AI消息并标记为完成
            const lastUnfinishedMessage = this.messages.findIndex(
              (msg) => !msg.isUser && !msg.isComplete
            );

            if (lastUnfinishedMessage !== -1) {
              this.messages[lastUnfinishedMessage].isComplete = true;
            }

            // 设置等待响应状态为false
            this.isWaitingForResponse = false;
            this.isTyping = false;

            // 如果提供了原因，显示断开连接消息
            if (response.content) {
              this.messages.push({
                isUser: false,
                content: `连接已断开: ${response.content}`,
                isComplete: true,
                isError: true,
                conversation_id: response.conversation_id || this.currentConversationId,
              });

              // 强制滚动以确保消息可见
              this.shouldAutoScroll = true;
            }
            break;

          default:
            console.log(`[${msgTimestamp}] 收到未知类型的WebSocket消息:`, {
              类型: response.type || "无类型",
              内容预览: response.content
                ? response.content.substring(0, 50) +
                  (response.content.length > 50 ? "..." : "")
                : "无内容",
              会话ID: response.conversation_id || this.currentConversationId || "未指定",
              完整消息: response,
            });
            this.isWaitingForResponse = false;
            break;
        }

        console.log(`[${msgTimestamp}] 消息处理完成，检查是否需要滚动到底部`);

        // 使用nextTick确保DOM已更新再滚动
        this.$nextTick(() => {
          // 只有在接收到机器人回复时或特定的消息类型时，才尝试自动滚动
          if (this.shouldAutoScroll) {
            this.scrollToBottom();
          }
        });
      } catch (error) {
        console.error(
          `[${msgTimestamp}] 处理WebSocket消息出错:`,
          error,
          "原始数据:",
          data
        );

        // 添加更多诊断信息
        console.error(`[${msgTimestamp}] 消息处理失败，详细信息:`, {
          消息类型: typeof data,
          消息长度: data ? data.length : 0,
          是否为空: !data,
          数据预览: typeof data === "string" ? data.substring(0, 100) : "不是字符串",
        });

        // 出错时也要重置状态
        this.isWaitingForResponse = false;
        this.isTyping = false;
      } finally {
        console.log(`[${msgTimestamp}] 退出handleIncomingMessage处理函数`);
      }
    },

    // 滚动到底部
    scrollToBottom() {
      // 只有当应该自动滚动时才执行滚动
      if (this.shouldAutoScroll) {
        // 使用scroll-into-view定位到最后一条消息
        this.scrollIntoView =
          this.messages.length > 0 ? `msg-${this.messages.length - 1}` : "msg-bottom";

        // 使用scrollTop确保滚动到底部
        setTimeout(() => {
          this.scrollTop = 999999;
          console.log(
            `自动滚动到底部: scrollIntoView=${this.scrollIntoView}, scrollTop=${this.scrollTop}`
          );
        }, 50);
      } else {
        console.log("用户正在浏览历史消息，不进行自动滚动");
      }
    },

    // 返回上一页
    goBack() {
      // 不再关闭WebSocket连接
      // this.closeWebSocket(); // 这一行被移除

      // 获取页面栈信息
      const pages = getCurrentPages();

      // 如果页面栈大于1，则可以返回上一页
      if (pages.length > 1) {
        uni.navigateBack({
          delta: 1,
        });
      } else {
        // 如果没有上一页，则返回到首页
        uni.switchTab({
          url: "/pages/home/home",
        });
      }
    },

    // 处理新建会话按钮点击
    handleNewChat() {
      console.log("点击新建会话按钮");

      // 重置首条消息状态
      this.isFirstMessageSent = false;
      this.firstMessageProcessed = false;

      // 清空当前消息
      this.messages = [];

      // 重置会话ID
      this.currentConversationId = null;

      // 创建新会话
      this.createNewConversation();
    },
    onScroll(event) {
      const currentScrollTop = event.detail.scrollTop;

      // 检测滚动方向
      if (currentScrollTop < this.lastScrollTop) {
        // 向上滑动，用户正在查看历史消息
        this.shouldAutoScroll = false;
        this.isUserScrolling = true;
        console.log("用户向上滚动，停用自动滚动");
      } else if (currentScrollTop >= this.lastScrollTop && this.isUserScrolling) {
        // 判断是否滚动到底部或接近底部
        const scrollViewHeight = event.detail.scrollHeight;
        const viewportHeight = event.detail.scrollHeight - currentScrollTop;

        // 如果用户滚动到接近底部，重新启用自动滚动
        // 这里设置一个阈值，例如如果滚动到内容底部的95%以下，就认为接近底部
        if (currentScrollTop + viewportHeight >= scrollViewHeight * 0.95) {
          this.shouldAutoScroll = true;
          this.isUserScrolling = false;
          console.log("用户滚动到底部，重新启用自动滚动");
        }
      }

      // 更新滚动位置
      this.lastScrollTop = currentScrollTop;
      this.scrollTop = currentScrollTop;
    },
    // 关闭积分不足弹窗
    closePointsPopup() {
      this.showInsufficientPointsPopup = false;
    },

    // 跳转到积分页面
    goToPointsPage() {
      // 关闭弹窗
      this.showInsufficientPointsPopup = false;

      // 跳转到积分页面
      uni.navigateTo({
        url: "/pages/purchase/points",
        fail: (err) => {
          console.error("跳转到积分页面失败:", err);
          // 提示用户
          uni.showToast({
            title: "跳转失败，请稍后再试",
            icon: "none",
            duration: 2000,
          });
        },
      });
    },

    // 处理登录确认弹窗的确认按钮
    handleLoginConfirm() {
      console.log("用户确认登录");
      this.showLoginConfirmPopup = false;

      // 不再保存消息
      // uni.setStorageSync('pendingChatMessage', this.pendingUserMessage);

      // 跳转到登录页面
      uni.reLaunch({
        url: "/pages/login/login?redirect=/pages/chatbot/chatbot",
      });
    },

    // 处理登录确认弹窗的取消按钮
    handleLoginCancel() {
      console.log("用户取消登录");
      this.showLoginConfirmPopup = false;
      this.pendingUserMessage = ""; // 清空待发送消息
    },

    // 计算导航栏高度
    calcNavBarHeight() {
      // 这里需要根据实际的设备和平台来计算导航栏的高度
      // 这里只是一个示例，实际实现需要根据具体情况来调整
      return 44; // 假设导航栏高度为44px
    },

    // 加载会话失败时的恢复机制
    recoverConversation(errorType) {
      console.log(`尝试恢复会话，错误类型: ${errorType}`);

      // 根据错误类型执行不同的恢复策略
      switch (errorType) {
        case "invalid_id":
          // 会话ID无效，重置当前会话并创建新会话
          console.log("会话ID无效，重置并创建新会话");
          this.currentConversationId = null;
          this.messages = [];
          this.addWelcomeMessage();
          break;

        case "load_failed":
          // 加载会话失败，使用当前消息状态但清除会话ID
          console.log("加载会话失败，保留当前消息但清除会话ID");
          this.currentConversationId = null;
          // 保留现有消息但清除会话ID
          this.messages.forEach((msg) => {
            msg.conversation_id = null;
          });
          break;

        case "sync_failed":
          // 同步失败，尝试重新加载当前会话
          if (this.currentConversationId) {
            console.log("同步失败，重新加载当前会话");
            this.loadConversationMessages(this.currentConversationId);
          } else {
            console.log("同步失败且没有有效会话ID，显示欢迎消息");
            this.messages = [];
            this.addWelcomeMessage();
          }
          break;

        default:
          // 未知错误，显示欢迎消息
          console.log("未知恢复类型，重置会话并显示欢迎消息");
          this.messages = [];
          this.addWelcomeMessage();
      }
    },

    // 添加分享功能
    onShareAppMessage() {
      // 根据当前是否有聊天记录提供不同的分享信息
      if (this.messages && this.messages.length > 1) {
        // 获取最后一条AI回复作为分享内容
        const lastAiMessage = [...this.messages]
          .reverse()
          .find((msg) => msg.sender === "ai");
        const shareContent = lastAiMessage
          ? lastAiMessage.content.substring(0, 30) + "..."
          : "";

        return {
          title: `AI实用宝智能助手回答: ${shareContent}`,
          path: "/pages/chatbot/chatbot",
          imageUrl: "/static/chatbot.png", // 使用功能图标作为分享封面
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
          title: "AI实用宝 - 智能对话助手",
          path: "/pages/chatbot/chatbot",
          imageUrl: "/static/chatbot.png", // 使用功能图标作为分享封面
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
.chatbot-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f7f8fc;
  position: relative;
  overflow: hidden;
}

/* 头部样式 */
.chat-header {
  padding: 40rpx 30rpx 30rpx;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  border-bottom-left-radius: 30rpx;
  border-bottom-right-radius: 30rpx;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header-title {
  font-size: 38rpx;
  font-weight: bold;
  color: white;
  text-align: center;
  margin-bottom: 6rpx;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.2);
}

.header-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
}

/* 新建会话按钮样式 */
.new-chat-button {
  width: 60rpx;
  height: 60rpx;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.new-chat-button:active {
  transform: scale(0.95);
  background-color: rgba(255, 255, 255, 0.3);
}

.new-chat-icon {
  font-size: 40rpx;
  color: white;
  font-weight: bold;
  line-height: 1;
}

/* 消息列表样式 */
.chat-messages {
  flex: 1;
  position: relative;
  height: calc(100vh - 250rpx); /* Adjusted for smaller input area */
  overflow: hidden;
}

.message-list {
  display: flex;
  flex-direction: column;
  padding: 30rpx 0;
  min-height: 100%;
  box-sizing: border-box;
  padding-bottom: 120rpx; /* Increased padding to ensure messages don't get hidden under input area */
}

/* 消息行样式 */
.message-row {
  width: 100%;
  padding: 10rpx 30rpx;
  box-sizing: border-box;
  display: flex;
}

.user-row {
  justify-content: flex-end;
}

.bot-row {
  justify-content: flex-start;
}

/* 消息气泡样式 */
.message-bubble {
  display: flex;
  max-width: 70%;
  align-items: flex-start;
  margin-bottom: 10rpx;
}

/* 头像样式 */
.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 4rpx solid white;
  box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.avatar image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bot-avatar {
  margin-right: 12rpx;
}

.user-avatar {
  margin-left: 12rpx;
}

/* 消息内容样式 */
.message-content {
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  word-break: break-word;
  line-height: 1.5;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.user-content {
  background: linear-gradient(135deg, #2575fc 0%, #6a11cb 100%);
  color: white;
  border-top-right-radius: 4rpx;
}

.bot-content {
  background-color: white;
  color: #333;
  border-top-left-radius: 4rpx;
}

/* 输入指示器样式 */
.typing-bubbles {
  background-color: white;
  padding: 20rpx 30rpx;
  border-radius: 20rpx;
  border-top-left-radius: 4rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.typing-dot {
  width: 16rpx;
  height: 16rpx;
  background-color: #ddd;
  border-radius: 50%;
  margin: 0 6rpx;
  animation: typingAnimation 1.4s infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingAnimation {
  0% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
}

/* 输入区域样式 */
.chat-input-container {
  display: flex;
  padding: 20rpx 30rpx 36rpx;
  background-color: white;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 -6rpx 20rpx rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 10;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.input-wrapper {
  flex: 1;
  position: relative;
  margin-right: 16rpx;
  background-color: #f5f7fa;
  border-radius: 35rpx;
  overflow: hidden;
  display: flex;
  align-items: center;
  border: 2rpx solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  height: 70rpx;
}

.input-wrapper:focus-within {
  border-color: rgba(106, 17, 203, 0.2);
  box-shadow: 0 4rpx 14rpx rgba(106, 17, 203, 0.12);
  background-color: #ffffff;
}

.chat-input {
  flex: 1;
  height: 70rpx;
  background-color: transparent;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #333;
  caret-color: #6a11cb;
  line-height: 70rpx;
  box-sizing: border-box;
}

/* 输入框占位符样式 */
.chat-input::placeholder {
  color: #9aa3af;
  font-size: 26rpx;
  font-weight: normal;
}

.chat-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-button {
  min-width: 90rpx;
  height: 70rpx;
  background: linear-gradient(135deg, #7742e6 0%, #4481fd 100%);
  border-radius: 35rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  padding: 0 18rpx;
  margin: 0;
  box-shadow: 0 4rpx 12rpx rgba(37, 117, 252, 0.3);
  border: none;
  flex-shrink: 0;
  overflow: hidden;
}

/* Add hover effect with pseudo-element */
.send-button::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0),
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0)
  );
  transform: translateX(-100%);
  transition: transform 0.8s ease;
  pointer-events: none;
  border-radius: 35rpx;
}

.send-button.active {
  transform: scale(1.03);
  box-shadow: 0 6rpx 16rpx rgba(37, 117, 252, 0.4);
}

.send-button.active::after {
  transform: translateX(100%);
}

.send-button.disabled {
  opacity: 0.5;
  background: #aaaaaa;
  transform: scale(1);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.send-text {
  font-size: 26rpx;
  color: white;
  font-weight: bold;
  letter-spacing: 1rpx;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.1);
}

.send-button:active {
  transform: scale(0.97);
  box-shadow: 0 2rpx 8rpx rgba(37, 117, 252, 0.2);
}

.send-button.disabled:active {
  transform: scale(1);
}

.send-button.disabled .send-text {
  color: #f0f0f0;
}

/* 连接状态指示器 */
.connection-status {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10rpx 0;
  text-align: center;
  font-size: 24rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.connecting-dots {
  display: flex;
  margin-left: 10rpx;
}

.connecting-dot {
  width: 8rpx;
  height: 8rpx;
  background-color: white;
  border-radius: 50%;
  margin: 0 4rpx;
  animation: connectingAnimation 1.4s infinite;
}

.connecting-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.connecting-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes connectingAnimation {
  0% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.3;
  }
}

/* 错误消息样式 */
.error-content {
  background-color: #ffebee !important;
  border-left: 4rpx solid #f44336;
  color: #d32f2f !important;
}

.error-bubble {
  opacity: 0.9;
}

/* 积分不足弹窗样式 */
.points-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.points-popup {
  width: 80%;
  max-width: 600rpx;
  background-color: white;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.2);
  animation: popupFadeIn 0.3s ease-out;
}

@keyframes popupFadeIn {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.points-popup-header {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  padding: 30rpx;
  text-align: center;
}

.points-popup-title {
  color: white;
  font-size: 32rpx;
  font-weight: bold;
}

.points-popup-content {
  padding: 40rpx 30rpx;
}

.points-popup-message {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  margin-bottom: 30rpx;
  text-align: center;
}

.points-info {
  background-color: #f7f8fc;
  padding: 20rpx;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
}

.points-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.points-item:last-child {
  margin-bottom: 0;
}

.points-label {
  font-size: 26rpx;
  color: #666;
}

.points-value {
  font-size: 26rpx;
  color: #333;
  font-weight: bold;
}

.points-popup-actions {
  display: flex;
  border-top: 1rpx solid #eee;
}

.popup-button {
  flex: 1;
  height: 90rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  border: none;
  background-color: transparent;
  position: relative;
}

.popup-button:after {
  border: none;
}

.cancel-button {
  color: #666;
  border-right: 1rpx solid #eee;
}

.primary-button {
  color: #2575fc;
  font-weight: bold;
}

.popup-button:active {
  background-color: rgba(0, 0, 0, 0.05);
}

/* iOS平台判断 */
.ios-limitation-info {
  text-align: center;
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #666;
}

.ios-limitation-text {
  background-color: #ffebee;
  padding: 10rpx 20rpx;
  border-radius: 10rpx;
}
</style>
