import request from '@/utils/request';

const musicApi = {
  /**
   * 创建音乐生成任务
   * @param {Object} params 
   * @param {string} params.mode - 生成模式: 'inspiration'(灵感模式), 'custom'(定制模式), 或 'continuation'(续写模式)
   * @param {string} params.mv - 模型版本，可选值: 'chirp-v3-0', 'chirp-v3-5'
   * @param {string} params.gpt_description_prompt - 歌曲描述提示词 (灵感模式)
   * @param {boolean} params.make_instrumental - 是否生成纯音乐 (灵感模式，可选)
   * @param {string} params.prompt - 歌词内容 (定制模式和续写模式)
   * @param {string} params.title - 歌曲标题 (定制模式和续写模式)
   * @param {string} params.tags - 风格标签 (定制模式和续写模式)
   * @param {string} params.task_id - 原始任务ID (续写模式)
   * @param {string} params.continue_clip_id - 需要续写的歌曲片段ID (续写模式)
   * @param {number} params.continue_at - 在哪个时间点开始续写，单位秒 (续写模式)
   */
  generateMusic(params) {
    const data = {
      mode: params.mode,
      mv: params.mv || 'chirp-v3-0'
    };

    // 根据模式添加不同的参数
    if (params.mode === 'inspiration') {
      data.gpt_description_prompt = params.gpt_description_prompt;
      if (params.make_instrumental !== undefined) {
        data.make_instrumental = params.make_instrumental;
      }
    } else if (params.mode === 'custom') {
      data.prompt = params.prompt;
      data.title = params.title;
      data.tags = params.tags;
    } else if (params.mode === 'continuation') {
      data.prompt = params.prompt;
      data.title = params.title;
      data.tags = params.tags;
      data.task_id = params.task_id;
      data.continue_clip_id = params.continue_clip_id;
      data.continue_at = params.continue_at;
    }

    return request({
      url: '/music/generate',
      method: 'POST',
      data
    });
  },

  /**
   * 获取音乐生成任务状态
   * @param {string} taskId - 任务ID
   */
  getMusicStatus(taskId) {
    return request({
      url: `/music/status/${taskId}`,
      method: 'GET'
    });
  },

  /**
   * 获取用户的音乐生成历史记录
   * @param {Object} params 
   * @param {number} params.skip - 跳过的记录数，默认0
   * @param {number} params.limit - 返回的最大记录数，默认10
   */
  getMusicHistory(params = {}) {
    return request({
      url: '/music/history',
      method: 'GET',
      params: {
        skip: params.skip || 0,
        limit: params.limit || 10
      },
      skipAuthRedirect: true
    });
  },

  /**
   * 获取用户信息，包含积分余额
   */
  getUserInfo() {
    return request({
      url: '/user/info',
      method: 'GET',
      skipAuthRedirect: true
    });
  }
};

export default musicApi; 