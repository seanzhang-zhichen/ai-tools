/**
 * 聊天机器人 API 封装
 * 提供与聊天机器人服务器交互的方法
 */
import { getApiBaseUrl, getWsBaseUrl } from '../utils/config.js';

/**
 * 获取用户所有会话列表
 * @param {String} token - 用户认证令牌
 * @returns {Promise} - 返回会话列表的Promise
 */
export function getConversations(token) {
  const baseApiUrl = getApiBaseUrl();
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseApiUrl}/chatbot/conversations`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        console.log('获取会话列表成功:', res.data);
        resolve(res.data);
      },
      fail: (err) => {
        console.error('获取会话列表失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 创建新会话
 * @param {String} token - 用户认证令牌
 * @param {String} title - 会话标题，默认为"新会话"
 * @returns {Promise} - 返回创建结果的Promise
 */
export function createConversation(token, title = '新会话') {
  const baseApiUrl = getApiBaseUrl();
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseApiUrl}/chatbot/conversations`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: title
      },
      success: (res) => {
        console.log('创建新会话成功:', res.data);
        resolve(res.data);
      },
      fail: (err) => {
        console.error('创建新会话失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 更新会话标题
 * @param {String} token - 用户认证令牌
 * @param {Number} conversationId - 会话ID
 * @param {String} title - 新的会话标题
 * @returns {Promise} - 返回更新结果的Promise
 */
export function updateConversation(token, conversationId, title) {
  const baseApiUrl = getApiBaseUrl();
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseApiUrl}/chatbot/conversations/${conversationId}`,
      method: 'PUT',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: title
      },
      success: (res) => {
        console.log('更新会话成功:', res.data);
        resolve(res.data);
      },
      fail: (err) => {
        console.error('更新会话失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 删除会话
 * @param {String} token - 用户认证令牌
 * @param {Number} conversationId - 要删除的会话ID
 * @returns {Promise} - 返回删除结果的Promise
 */
export function deleteConversation(token, conversationId) {
  const baseApiUrl = getApiBaseUrl();
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseApiUrl}/chatbot/conversations/${conversationId}`,
      method: 'DELETE',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        console.log('删除会话成功:', res.data);
        resolve(res.data);
      },
      fail: (err) => {
        console.error('删除会话失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 获取指定会话中的所有消息
 * @param {String} token - 用户认证令牌
 * @param {Number} conversationId - 会话ID
 * @returns {Promise} - 返回消息列表的Promise
 */
export function getConversationMessages(token, conversationId) {
  const baseApiUrl = getApiBaseUrl();
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseApiUrl}/chatbot/conversations/${conversationId}/messages`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        console.log('获取会话消息成功:', res.data);
        resolve(res.data);
      },
      fail: (err) => {
        console.error('获取会话消息失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 检查会话是否存在且有效
 * @param {String} token - 用户认证令牌
 * @param {Number} conversationId - 要检查的会话ID
 * @returns {Promise} - 返回检查结果的Promise
 */
export function checkConversation(token, conversationId) {
  const baseApiUrl = getApiBaseUrl();
  
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseApiUrl}/chatbot/conversations/${conversationId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        console.log('检查会话有效性成功:', res.data);
        resolve(res.data);
      },
      fail: (err) => {
        console.error('检查会话有效性失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 创建WebSocket连接
 * @param {String} token - 用户认证令牌
 * @returns {Promise} - 返回WebSocket连接结果的Promise
 */
export function connectWebSocket(token) {
  const baseWsUrl = getWsBaseUrl();
  
  return new Promise((resolve, reject) => {
    try {
      // 关闭可能已存在的WebSocket连接
      try {
        uni.closeSocket();
      } catch (e) {
        console.log('无需关闭WebSocket或关闭失败');
      }
      
      // 连接WebSocket
      uni.connectSocket({
        url: `${baseWsUrl}/chatbot/ws?token=${token}`,
        success: () => {
          console.log('WebSocket连接创建成功');
        },
        fail: (err) => {
          console.error('WebSocket连接创建失败:', err);
          reject(err);
        }
      });
      
      // 监听WebSocket连接打开事件
      uni.onSocketOpen((res) => {
        console.log('WebSocket连接已打开:', res);
        resolve(res);
      });
      
      // 监听WebSocket错误事件
      uni.onSocketError((err) => {
        console.error('WebSocket连接错误:', err);
        reject(err);
      });
      
    } catch (error) {
      console.error('创建WebSocket连接时发生异常:', error);
      reject(error);
    }
  });
}

/**
 * 发送WebSocket消息
 * @param {Object} messageObj - 消息对象
 * @param {String} messageObj.content - 消息内容
 * @param {Number} [messageObj.conversation_id] - 会话ID，如果未指定则创建新会话
 * @param {String} [messageObj.title] - 如果创建新会话，指定会话标题
 * @param {Array} [messageObj.history] - 历史消息列表，用于提供上下文
 * @returns {Promise} - 返回发送结果的Promise
 */
export function sendWebSocketMessage(messageObj) {
  return new Promise((resolve, reject) => {
    try {
      uni.sendSocketMessage({
        data: JSON.stringify(messageObj),
        success: (res) => {
          console.log('WebSocket发送消息成功:', messageObj);
          resolve(res);
        },
        fail: (err) => {
          console.error('WebSocket发送消息失败:', err);
          reject(err);
        }
      });
    } catch (error) {
      console.error('发送WebSocket消息时发生异常:', error);
      reject(error);
    }
  });
}

/**
 * 关闭WebSocket连接
 * @returns {Promise} - 返回关闭结果的Promise
 */
export function closeWebSocket() {
  return new Promise((resolve, reject) => {
    try {
      uni.closeSocket({
        success: (res) => {
          console.log('WebSocket连接已关闭');
          resolve(res);
        },
        fail: (err) => {
          console.error('关闭WebSocket连接失败:', err);
          reject(err);
        }
      });
    } catch (error) {
      console.error('关闭WebSocket连接时发生异常:', error);
      reject(error);
    }
  });
}

/**
 * 构建聊天历史记录
 * @param {Array} messages - 消息列表
 * @param {Number} limit - 最大消息数量，默认为10
 * @returns {Array} - 格式化的历史消息数组
 */
export function buildMessageHistory(messages, limit = 10) {
  // 最多获取最近limit条消息作为历史记录
  const recentMessages = messages.slice(-limit);
  
  // 过滤掉欢迎消息（第一条助手消息）
  const firstAssistantIndex = recentMessages.findIndex(msg => !msg.isUser);
  const filteredMessages = firstAssistantIndex === 0 
    ? recentMessages.slice(1) // 如果第一条就是助手消息（欢迎语），则过滤掉
    : recentMessages;
  
  return filteredMessages.map(msg => ({
    content: msg.content,
    role: msg.isUser ? 'user' : 'assistant'
  }));
} 