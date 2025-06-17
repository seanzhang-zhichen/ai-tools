<template>
  <view class="music-generator-container">
    <!-- Header -->
    <view class="header">
      <text class="title">AI音乐生成</text>
      <text class="subtitle">创作你的专属音乐</text>
    </view>

    <!-- 模式选择 -->
    <view class="mode-tabs">
      <view 
        class="mode-tab" 
        :class="{ active: activeMode === 'inspiration' }"
        @click="setMode('inspiration')"
      >
        <text class="tab-text">灵感模式</text>
      </view>
      <view 
        class="mode-tab" 
        :class="{ active: activeMode === 'custom' }"
        @click="setMode('custom')"
      >
        <text class="tab-text">定制模式</text>
      </view>
      <view 
        class="mode-tab" 
        :class="{ active: activeMode === 'continuation' }"
        @click="setMode('continuation')"
        :style="{ opacity: canContinue ? 1 : 0.5 }"
        :disabled="!canContinue"
      >
        <text class="tab-text">续写模式</text>
      </view>
    </view>

    <!-- 灵感模式 -->
    <view v-if="activeMode === 'inspiration'" class="mode-container">
      <view class="section">
        <text class="section-title">歌曲描述</text>
        <textarea
          class="prompt-input"
          v-model="inspirationParams.gpt_description_prompt"
          placeholder="描述你想要的音乐，例如：'欢快的磁性女声歌曲，中文，主题：难忘周末'"
          :maxlength="200"
        ></textarea>
        <text class="prompt-counter" 
          :class="{
            'within-limit': inspirationParams.gpt_description_prompt.length < 150,
            'near-limit': inspirationParams.gpt_description_prompt.length >= 150 && inspirationParams.gpt_description_prompt.length < 190,
            'at-limit': inspirationParams.gpt_description_prompt.length >= 190
          }">
          {{inspirationParams.gpt_description_prompt.length}}/200
        </text>
      </view>

      <view class="section">
        <view class="checkbox-option">
          <switch 
            :checked="inspirationParams.make_instrumental"
            @change="e => inspirationParams.make_instrumental = e.detail.value"
            color="#007AFF"
          />
          <text class="checkbox-label">生成纯音乐（不包含歌词）</text>
        </view>
      </view>
    </view>

    <!-- 定制模式 -->
    <view v-if="activeMode === 'custom'" class="mode-container">
      <view class="section">
        <text class="section-title">歌曲标题</text>
        <input
          class="text-input"
          v-model="customParams.title"
          placeholder="输入歌曲标题"
          :maxlength="50"
        />
      </view>

      <view class="section">
        <text class="section-title">风格标签</text>
        <input
          class="text-input"
          v-model="customParams.tags"
          placeholder="输入风格标签，例如：'爵士'、'古典'、'电子'"
          :maxlength="1000"
        />
      </view>

      <view class="section">
        <text class="section-title">歌词内容</text>
        <view class="lyric-tips">留空将创建纯音乐，或按以下格式输入：[Verse]\\n第一段歌词\\n[Chorus]\\n副歌部分</view>
        <textarea
          class="prompt-input lyrics-input"
          v-model="customParams.prompt"
          placeholder="输入歌词内容"
          :maxlength="5000"
        ></textarea>
        <text class="prompt-counter"
          :class="{
            'within-limit': customParams.prompt.length < 750,
            'near-limit': customParams.prompt.length >= 750 && customParams.prompt.length < 950,
            'at-limit': customParams.prompt.length >= 950
          }">
          {{customParams.prompt.length}}/1000
        </text>
      </view>
    </view>

    <!-- 续写模式 -->
    <view v-if="activeMode === 'continuation'" class="mode-container">
      <view class="section">
        <text class="section-title">选择原始歌曲</text>
        <picker 
          class="song-picker"
          :range="historyPickerRange" 
          range-key="displayName"
          @change="onHistorySongSelected"
          :disabled="musicHistory.length === 0"
        >
          <view class="picker-wrapper">
            <view class="selected-song-info">
              <view class="picker-header" v-if="!selectedHistorySong">
                <text class="picker-placeholder">请选择要续写的歌曲</text>
              </view>
              <view class="picker-header" v-else>
                <text class="picker-value">{{ selectedHistorySong.displayName }}</text>
                <text class="selected-indicator">已选择</text>
              </view>
              <text class="picker-hint" v-if="!selectedHistorySong && musicHistory.length > 0">点击此处可查看历史歌曲</text>
            </view>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>

        <view v-if="continuationParams.task_id" class="original-song">
          <text class="original-title">{{continuationParams.title || '未命名'}}</text>
          <view class="play-control" @click="toggleOriginalSong">
            <image class="play-icon-img" :src="isPlayingOriginal ? '/static/pause.png' : '/static/play.png'" mode="aspectFit"></image>
            <text class="play-text">{{ isPlayingOriginal ? '暂停原曲' : '播放原曲' }}</text>
          </view>
        </view>
        <view v-else class="no-song-selected">
          <text class="no-song-text">{{ musicHistory.length > 0 ? '请从上方下拉框选择一首歌曲' : '暂无可用的历史歌曲' }}</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">续写位置 (秒)</text>
        <slider 
          class="continuation-slider"
          :min="0" 
          :max="originalDuration" 
          :value="continuationParams.continue_at" 
          :step="1"
          :disabled="!continuationParams.task_id"
          @change="e => continuationParams.continue_at = e.detail.value"
          activeColor="#3a5af9"
          backgroundColor="#e8ebf2"
          blockColor="#2d8cf0"
          blockSize="28"
        />
        <view class="slider-time-display">
          <text class="time-text current-time">{{ formatTime(continuationParams.continue_at) }}</text>
          <text class="time-text total-time">{{ formatTime(originalDuration) }}</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">续写歌词</text>
        <textarea
          class="prompt-input lyrics-input"
          v-model="continuationParams.prompt"
          placeholder="输入续写的歌词内容"
          :disabled="!continuationParams.task_id"
          :maxlength="1000"
        ></textarea>
        <text class="prompt-counter"
          :class="{
            'within-limit': continuationParams.prompt.length < 750,
            'near-limit': continuationParams.prompt.length >= 750 && continuationParams.prompt.length < 950,
            'at-limit': continuationParams.prompt.length >= 950
          }">
          {{continuationParams.prompt.length}}/1000
        </text>
      </view>
    </view>

    <!-- Generate Button -->
    <view class="action-section">
      <view class="points-info">
        <text class="points-text">消耗积分: {{ currentPointsCost }}</text>
      </view>
      <button 
        class="generate-btn" 
        :class="{ 'pulse': generationProgress >= 0.99 && isGenerating }"
        :disabled="isGenerating || !canGenerate" 
        @click="generateMusic"
      >
        <text v-if="!isGenerating">生成音乐</text>
        <text v-else-if="generationProgress >= 0.99">生成中...即将完成</text>
        <text v-else>生成中...{{ Math.floor(generationProgress * 100) }}%</text>
      </button>
    </view>

    <!-- Player Section -->
    <view class="player-section" v-if="musicUrl">
      <!-- Songs Tabs -->
      <view class="songs-tabs" v-if="generatedSongs.length > 1">
        <view 
          v-for="(song, index) in generatedSongs" 
          :key="index"
          class="song-tab"
          :class="{ active: activeIndex === index }"
          @click="switchSong(index)"
        >
          <text class="song-tab-text">{{ song.title || `歌曲 ${index + 1}` }}</text>
        </view>
      </view>
      
      <view class="player-card">
        <view class="player-title-row">
          <text class="player-title">{{ currentMusic?.title || '您的专属音乐' }}</text>
          <view class="player-actions">
            <button class="player-action-btn" @click="downloadMedia">
              <image class="action-icon" src="/static/download.png" mode="aspectFit"></image>
            </button>
            <button class="player-action-btn" @click="shareMusic">
              <image class="action-icon" src="/static/share.png" mode="aspectFit"></image>
            </button>
            <button class="player-action-btn" @click="continueThisSong" v-if="!isGenerating">
              <image class="action-icon" src="/static/continue_generate.png" mode="aspectFit"></image>
            </button>
          </view>
        </view>
        
        <view class="music-info">
          <text class="music-prompt">{{ truncatedPrompt }}</text>
          <text class="music-tags" v-if="currentMusic?.tags">{{ currentMusic.tags }}</text>
        </view>
        
        <!-- Cover Image (Audio Mode) -->
        <view class="cover-image-container" v-if="currentMusic?.image_url" @click="togglePlay">
          <image class="cover-image" :src="currentMusic.image_url" mode="aspectFill"></image>
          <view class="cover-overlay" :class="{ visible: !isPlaying }">
            <view class="cover-play-btn" v-if="!isPlaying">
              <image class="cover-play-icon" src="/static/play.png" mode="aspectFit"></image>
            </view>
          </view>
        </view>
        
        <!-- Lyrics Display Section -->
        <view class="lyrics-section" v-if="showLyrics && formattedLyrics">
          <view class="lyrics-header">
            <text class="lyrics-title">歌词</text>
            <view class="lyrics-actions">
              <view class="lyrics-copy-action" @click="copyLyricsToClipboard">
                <text class="copy-text">复制</text>
              </view>
              <view class="lyrics-toggle" @click="toggleLyricsDisplay">
                <text class="lyrics-toggle-text">{{ showLyrics ? '隐藏' : '显示' }}歌词</text>
              </view>
            </view>
          </view>
          <scroll-view class="lyrics-container" scroll-y>
            <text class="lyrics-text">{{ formattedLyrics }}</text>
          </scroll-view>
        </view>
        
        <view v-else class="lyrics-collapsed" @click="toggleLyricsDisplay">
          <text class="lyrics-toggle-text">显示歌词</text>
        </view>
        
        <!-- Waveform (Audio Mode) -->
        <view class="waveform">
          <view class="wave-bars">
            <view 
              v-for="i in 40" 
              :key="i" 
              class="wave-bar"
              :style="{ 
                height: isPlaying ? getRandomHeight() + 'rpx' : '20rpx',
                backgroundColor: i % 2 === 0 ? '#2d8cf0' : '#3a5af9'
              }"
            ></view>
          </view>
        </view>
        
        <!-- Audio Player Controls (Audio Mode) -->
        <view class="player-controls">
          <view class="play-control-group">
            <view class="play-btn" @click="togglePlay">
              <image class="play-icon" :src="isPlaying ? '/static/pause.png' : '/static/play.png'" mode="aspectFit"></image>
            </view>
          </view>
          <slider 
            class="progress-slider" 
            :value="playProgress" 
            :max="100"
            @change="onProgressChange"
            activeColor="#3a5af9"
            backgroundColor="#e0e0e0"
            blockColor="#2d8cf0"
            blockSize="28"
          />
          <text class="time-text">{{ formatTime(currentTime) }}/{{ formatTime(totalDuration) }}</text>
        </view>
      </view>
      
      <view class="action-section" style="margin-top: 30rpx;">
        <button 
          class="regenerate-btn" 
          :disabled="isGenerating" 
          @click="generateMusic"
        >
          <text>重新生成</text>
        </button>
      </view>
    </view>
    
    <!-- 历史记录 -->
    <view class="section history-section" v-if="musicHistory.length > 0">
      <text class="section-title">历史作品</text>
      <view 
        v-for="(item, index) in musicHistory" 
        :key="index"
        class="history-item"
        @click="loadHistoryItem(item)"
      >
        <view class="history-image" v-if="item.image_url || (item.songs && item.songs[0]?.image_url)">
          <image class="history-thumbnail" :src="item.image_url || item.songs[0]?.image_url" mode="aspectFill"></image>
        </view>
        <view class="history-item-content">
          <text class="history-title">{{ item.title || (item.songs && item.songs[0]?.title) || '未命名' }}</text>
          <text class="history-date">{{ formatDate(item.created_at) }}</text>
          <text class="history-prompt">{{ getPromptText(item) }}</text>
          <view class="history-badges">
            <text class="history-badge songs-badge" v-if="item.songs && item.songs.length > 1">{{ item.songs.length }}首歌曲</text>
          </view>
        </view>
      </view>
      
      <view class="load-more" v-if="hasMoreHistory">
        <button class="load-more-btn" @click="loadMoreHistory" :disabled="loadingMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </view>
    </view>

    <!-- Chat Controls -->
    <view class="chat-controls" v-if="musicUrl">
      <view class="control-btn" style="margin-right: 10rpx;">
        <text class="control-icon">@</text>
      </view>
      <view class="control-btn">
        <text class="control-icon">≡</text>
      </view>
    </view>
    
    <!-- Login confirm popup -->
    <login-confirm-popup 
      :visible="showLoginConfirmPopup" 
      :message="loginConfirmMessage"
      @confirm="handleLoginConfirm" 
      @cancel="handleLoginCancel" 
    />

    <!-- 添加积分不足弹窗 -->
    <points-confirm-popup
      :visible="showInsufficientPointsPopup"
      :message="insufficientPointsMessage"
      :pointsBalance="pointsBalance"
      :pointsNeeded="currentPointsCost"
      :showPointsInfo="true"
      @confirm="handlePointsConfirm"
      @cancel="handlePointsCancel"
    />
  </view>
</template>

<script>
import musicApi from '@/api/musicApi';
import LoginConfirmPopup from '../../components/LoginConfirmPopup.vue';
import PointsConfirmPopup from '../../components/PointsConfirmPopup.vue';
import { getPointsConfigs } from '@/api/pointsApi';
import pointsService from '@/utils/pointsService';

export default {
  components: {
    LoginConfirmPopup,
    PointsConfirmPopup
  },
  data() {
    return {
      // 活动模式
      activeMode: 'inspiration', // 'inspiration', 'custom', 'continuation'
      modelVersion: 'chirp-auk', // Fixed model version
      
      // 灵感模式参数
      inspirationParams: {
        gpt_description_prompt: '',
        make_instrumental: false
      },
      
      // 定制模式参数
      customParams: {
        prompt: '',
        title: '',
        tags: ''
      },
      
      // 续写模式参数
      continuationParams: {
        prompt: '',
        title: '',
        tags: '',
        task_id: '',
        continue_clip_id: '',
        continue_at: 30
      },
      
      // 原始歌曲音频时长
      originalDuration: 60,
      originalAudio: null,
      
      // 积分消费
      pointsCost: 30, // 默认值，可能从配置中获取
      pointsBalance: 0, // 当前积分余额
      
      // Generation state
      isGenerating: false,
      generationProgress: 0,
      currentTaskId: null,
      statusCheckInterval: null,
      simulatedProgressInterval: null, // 模拟进度条间隔
      isSimulatedProgress: false, // 是否使用模拟进度
      
      // Player state
      musicUrl: '', // 生成完的音乐URL
      isPlaying: false,
      playProgress: 0,
      currentTime: 0,
      totalDuration: 30, // 默认30秒，实际会从音频中获取
      audioContext: null,
      
      // 音乐信息
      currentMusic: null,
      generatedSongs: [], // 存储所有生成的歌曲
      activeIndex: 0, // 当前播放的歌曲索引
      
      // 历史记录
      musicHistory: [],
      historyPage: 1,
      historyLimit: 20,
      historyTotal: 0,
      historyLoaded: false,
      historyPickerRange: [], // 用于存储历史歌曲的选择器数据
      selectedHistorySong: null, // 当前选择的历史歌曲
      hasMoreHistory: true,
      loadingMore: false,
      
      // 标记是否正在播放原曲
      isPlayingOriginal: false,
      
      // Lyrics related
      showLyrics: false, // 是否显示歌词
      formattedLyrics: '', // 格式化后的歌词文本
      
      // Login confirm popup related
      showLoginConfirmPopup: false,
      loginConfirmMessage: '生成音乐需要登录，是否前往登录？',
      
      // Points confirm popup related
      showInsufficientPointsPopup: false,
      insufficientPointsMessage: '您的积分不足，无法生成音乐',
      userPoints: 0, // 用户当前积分,
      pointsConfigs: {},
      pointsDescriptions: {},
    };
  },
  computed: {
    truncatedPrompt() {
      if (this.activeMode === 'inspiration') {
        return this.inspirationParams.gpt_description_prompt.length > 60 
          ? this.inspirationParams.gpt_description_prompt.substring(0, 60) + '...' 
          : this.inspirationParams.gpt_description_prompt;
      } else {
        const prompt = this.activeMode === 'custom' ? this.customParams.prompt : this.continuationParams.prompt;
        return prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
      }
    },
    
    // 根据后端配置获取积分消耗
    currentPointsCost() {
      return pointsService.getFeaturePointsCost('music_generation', 300);
    },
    
    canGenerate() {
      if (this.activeMode === 'inspiration') {
        return this.inspirationParams.gpt_description_prompt.trim().length > 0;
      } else if (this.activeMode === 'custom') {
        return this.customParams.title.trim().length > 0 && this.customParams.tags.trim().length > 0;
      } else if (this.activeMode === 'continuation') {
        return this.continuationParams.task_id && 
               this.continuationParams.prompt.trim().length > 0 && 
               this.continuationParams.continue_clip_id;
      }
      return false;
    },
    
    canContinue() {
      return this.musicHistory.length > 0;
    }
  },
  onLoad() {
    // 加载历史记录
    this.loadMusicHistory();
    // 获取用户积分信息
    this.fetchUserInfo();
    // 获取积分配置信息 - 添加错误处理
    this.fetchPointsConfigs().catch(err => {
      console.error('加载积分配置时出错，使用默认值:', err);
      // 设置默认积分值，确保功能可用
      this.pointsCost = 300; // 音乐生成的默认积分
    });
    
    // 检查是否有未完成的任务
    this.checkUnfinishedTask();
  },
  onShow() {
    // 每次显示页面时刷新积分信息，以便在用户充值后更新积分
    this.fetchUserInfo();
    
    // 每次显示页面时刷新积分配置 - 添加错误处理
    this.fetchPointsConfigs().catch(err => {
      console.error('刷新积分配置时出错，使用现有配置:', err);
    });
    
    // 如果有正在进行的任务但没有查询间隔，重新开始查询
    if (this.currentTaskId && this.isGenerating && !this.statusCheckInterval) {
      console.log('恢复任务状态查询:', this.currentTaskId);
      this.startProgressSimulation();
      this.statusCheckInterval = setInterval(() => {
        this.checkMusicStatus();
      }, 1000);
    }
  },
  onUnload() {
    // 清理资源
    this.clearIntervals();
    if (this.audioContext) {
      this.audioContext.destroy();
    }
    if (this.originalAudio) {
      this.originalAudio.destroy();
    }
    
    // 如果有正在进行的任务，保存当前进度
    if (this.isGenerating && this.currentTaskId) {
      this.saveCurrentProgress();
    }
  },
  onHide() {
    // 如果有正在进行的任务，保存当前进度
    if (this.isGenerating && this.currentTaskId) {
      this.saveCurrentProgress();
    }
  },
  // 添加微信小程序分享功能
  onShareAppMessage(res) {
    // 如果有音乐，分享音乐，否则分享页面
    if (this.currentMusic && this.musicUrl) {
      const title = this.currentMusic.title || '我用AI生成的专属音乐';
      const summary = this.currentMusic.prompt || '快来听听我用AI生成的音乐吧！';
      const imageUrl = this.currentMusic.image_url || '';
      
      return {
        title: title,
        desc: summary,
        imageUrl: imageUrl,
        path: '/pages/music-generator/music-generator',
        success: function() {
          console.log('分享成功');
          uni.showToast({
            title: '分享成功',
            icon: 'success'
          });
        },
        fail: function() {
          console.log('分享失败');
          uni.showToast({
            title: '分享失败',
            icon: 'none'
          });
        }
      };
    } else {
      // 默认分享页面
      return {
        title: 'AI音乐生成器',
        desc: '创作你的专属音乐',
        path: '/pages/music-generator/music-generator'
      };
    }
  },
  created() {
    // ... existing code ...
    this.refreshMusicHistory();
  },
  methods: {
    // 获取用户信息（包含积分）
    async fetchUserInfo() {
      try {
        // 检查是否登录
        const token = uni.getStorageSync('token');
        if (!token) {
          console.log('用户未登录，无法获取积分信息');
          return;
        }
        
        const response = await musicApi.getUserInfo();
        if (response.code === 0 && response.data) {
          this.pointsBalance = response.data.points || 0;
          this.userPoints = response.data.points || 0;
          console.log('获取积分成功，当前积分：', this.pointsBalance);
        } else {
          console.error('获取用户信息失败:', response.message);
        }
      } catch (error) {
        console.error('获取用户信息出错:', error);
      }
    },
    
    setMode(mode) {
      if (mode === 'continuation' && !this.canContinue) {
        uni.showToast({
          title: '请先生成或选择一首歌曲再使用续写功能',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      this.activeMode = mode;
    },
    
    getRandomHeight() {
      return Math.floor(Math.random() * 60) + 10;
    },
    
    clearIntervals() {
      if (this.statusCheckInterval) {
        clearInterval(this.statusCheckInterval);
        this.statusCheckInterval = null;
      }
      if (this.simulatedProgressInterval) {
        clearInterval(this.simulatedProgressInterval);
        this.simulatedProgressInterval = null;
      }
    },
    
    async generateMusic() {
      // 检查是否已登录
      const token = uni.getStorageSync('token');
      if (!token) {
        console.log('用户未登录，显示登录确认弹窗');
        this.showLoginConfirmPopup = true;
        return;
      }
      
      // 用户已登录，继续生成音乐
      this.processGenerateMusic();
    },
    
    // 处理生成音乐的实际逻辑（已登录状态）
    async processGenerateMusic() {
      if (!this.canGenerate) {
        uni.showToast({
          title: '请填写必要的信息',
          icon: 'none'
        });
        return;
      }
      
      this.isGenerating = true;
      // 明确设置为0，确保新任务从0开始
      this.generationProgress = 0;
      console.log('新任务开始，重置进度为0');
      this.clearIntervals();
      
      // 开始模拟进度条
      this.startProgressSimulation();
      
      try {
        // 根据当前模式准备参数
        let params = {
          mode: this.activeMode,
          mv: this.modelVersion
        };
        
        if (this.activeMode === 'inspiration') {
          params.gpt_description_prompt = this.inspirationParams.gpt_description_prompt;
          params.make_instrumental = this.inspirationParams.make_instrumental;
        } else if (this.activeMode === 'custom') {
          params.prompt = this.customParams.prompt;
          params.title = this.customParams.title;
          params.tags = this.customParams.tags;
        } else if (this.activeMode === 'continuation') {
          params.prompt = this.continuationParams.prompt;
          params.title = this.continuationParams.title;
          params.tags = this.continuationParams.tags;
          params.task_id = this.continuationParams.task_id;
          params.continue_clip_id = this.continuationParams.continue_clip_id;
          params.continue_at = this.continuationParams.continue_at;
        }
        
        // 调用后端API生成音乐
        const response = await musicApi.generateMusic(params);
        console.log('generateMusic');
        console.log(response);
        
        if (response.code !== 0) {
          // 处理积分不足的情况
          if (response.code === 4000) { // ErrorCode.INSUFFICIENT_POINTS
            console.log('积分不足，显示积分不足弹窗');
            this.isGenerating = false;
            this.clearIntervals(); // 确保清除所有定时器
            
            // 获取积分信息，如果响应中包含
            if (response.data && response.data.points_balance !== undefined) {
              this.pointsBalance = response.data.points_balance;
            }
            
            // 获取所需积分，优先使用响应中的值，否则使用计算属性的值
            if (response.data && response.data.points_needed !== undefined) {
              this.pointsCost = response.data.points_needed;
            } else {
              // 使用计算属性的值
              this.pointsCost = this.currentPointsCost;
            }
            
            this.insufficientPointsMessage = response.message || '您的积分不足，无法生成音乐';
            this.showInsufficientPointsPopup = true;
            return;
          }
          
          // 其他错误情况
          const errorMsg = response.message && response.message.message ? 
                          response.message.message : response.message || '生成失败';
          throw new Error(errorMsg);
        }
        
        const taskData = response.data;
        this.currentTaskId = taskData.task_id;
        
        // 保存任务ID到本地存储，便于页面重新加载时恢复查询
        uni.setStorageSync('current_music_task_id', this.currentTaskId);
        
        // 保存任务开始时间，用于计算模拟进度
        uni.setStorageSync('music_task_start_time', Date.now());
        
        // 继续模拟进度，不停止模拟，直到任务实际完成
        // 移除: this.isSimulatedProgress = false;
        
        // 开始定时检查任务状态，每秒查询一次
        this.statusCheckInterval = setInterval(() => {
          this.checkMusicStatus();
        }, 1000);
        
      } catch (error) {
        uni.showToast({
          title: error.message || '生成失败，请重试',
          icon: 'none'
        });
        console.error('Generate music error:', error);
        this.isGenerating = false;
        this.clearIntervals(); // 清除所有定时器
      }
    },
    
    // 开始模拟进度条
    startProgressSimulation() {
      // 只有在进度为0或未设置时才初始化为5%
      if (!this.generationProgress) {
        this.generationProgress = 0.05; // 起始进度5%
        console.log('初始化进度为5%');
      } else {
        console.log('保持现有进度:', Math.floor(this.generationProgress * 100) + '%');
      }
      
      // 创建定时器，每秒更新进度
      this.simulatedProgressInterval = setInterval(() => {
        this.updateSimulatedProgress();
      }, 1000);
    },
    
    // 更新模拟进度
    updateSimulatedProgress() {
      // 如果不是生成状态，停止模拟
      if (!this.isGenerating) {
        this.clearIntervals();
        return;
      }
      
      // 随机增加1-5%的进度（降低速度）
      const increment = Math.random() * 0.04 + 0.01;
      
      // 新进度，最高不超过99%
      let newProgress = this.generationProgress + increment;
      if (newProgress > 0.99) {
        newProgress = 0.99;
        
        // 如果已经到99%但还未收到实际完成消息，则继续等待
        console.log('模拟进度已达到99%，等待任务实际完成');
      }
      
      this.generationProgress = newProgress;
      console.log(`模拟进度更新: ${Math.floor(this.generationProgress * 100)}%`);
    },
    
    async checkMusicStatus() {
      if (!this.currentTaskId) return;
      
      try {
        const response = await musicApi.getMusicStatus(this.currentTaskId);
        
        if (response.code !== 0) {
          throw new Error(response.message || '获取状态失败');
        }
        
        const statusData = response.data;
        
        // 不再根据实际进度更新，保持模拟进度继续运行
        // 只有当任务完成或失败时，才结束模拟
        
        // 在控制台输出当前进度，方便调试
        console.log(`音乐生成实际进度: ${statusData.progress ? Math.floor(statusData.progress * 100) : 0}%, 显示进度: ${Math.floor(this.generationProgress * 100)}%`);
        
        // 根据任务状态处理
        if (statusData.status === 'completed') {
          // 任务完成，停止模拟并设置进度为100%
          this.clearIntervals();
          this.isGenerating = false;
          this.generationProgress = 1.0; // 设置为100%
          
          // 清除存储的任务ID
          uni.removeStorageSync('current_music_task_id');
          uni.removeStorageSync('music_task_start_time');
          uni.removeStorageSync('music_task_progress');
          
          let songDuration = 30; // 默认时长
          
          // 处理多首歌曲
          console.log('statusData:', statusData);
          
          if (statusData.songs && statusData.songs.length > 0) {
            this.generatedSongs = statusData.songs.map(song => ({
              task_id: statusData.task_id,
              title: song.title,
              audio_url: song.audio_url,
              image_url: song.image_url,
              prompt: statusData.prompt || song.metadata?.prompt || '',
              // 修改此处：使用song.prompt作为歌词，而不是statusData.prompt
              lyrics: song.prompt || '',
              tags: this.activeMode === 'custom' ? this.customParams.tags : '',
              created_at: statusData.created_at,
              completed_at: statusData.completed_at,
              continue_clip_id: song.id || '', // 可用于续写
              metadata: song.metadata || {},
              id: song.id,
              duration: song.duration || (song.metadata ? song.metadata.duration : null) // 从响应中获取时长
            }));
            console.log('generatedSongs:', this.generatedSongs);
            
            // 设置第一首歌曲为当前播放
            this.activeIndex = 0;
            this.currentMusic = this.generatedSongs[0];
            console.log('任务完成后设置 currentMusic (多首歌曲选第一首):', this.currentMusic);
            this.musicUrl = this.currentMusic.audio_url;
            
            // 尝试获取歌曲时长
            if (this.currentMusic.duration) {
              songDuration = this.currentMusic.duration;
            }
          } else {
            // 单首歌曲的处理（兼容旧格式）
            this.musicUrl = statusData.url;
            
            // 从状态数据中提取时长
            if (statusData.duration) {
              songDuration = statusData.duration;
            } else if (statusData.metadata && statusData.metadata.duration) {
              songDuration = statusData.metadata.duration;
            }
            
            this.currentMusic = {
              task_id: statusData.task_id,
              audio_url: statusData.url,
              image_url: statusData.image_url,
              prompt: statusData.prompt || '',
              // 如果有歌词字段，使用歌词字段，否则尝试使用prompt
              lyrics: statusData.lyrics || statusData.prompt || "",
              tags: this.activeMode === 'custom' ? this.customParams.tags : '',
              created_at: statusData.created_at,
              completed_at: statusData.completed_at,
              duration: songDuration // 设置时长
            };
            console.log('任务完成后设置 currentMusic (单首歌曲):', this.currentMusic);
            
            this.generatedSongs = [this.currentMusic];
          }
          
          // 预设音频时长，不用等待onTimeUpdate事件
          this.totalDuration = songDuration;
          this.originalDuration = songDuration;
          
          // 初始化音频播放器，传入时长信息
          this.initAudioPlayer(songDuration);
          
          // 重置歌词状态并解析歌词
          this.showLyrics = false;
          this.formattedLyrics = '';
          console.log('任务完成，准备解析歌词');
          this.parseAndFormatLyrics();
          
          // 刷新历史记录
          this.loadMusicHistory();
          
        } else if (statusData.status === 'failed' || statusData.error) {
          // 任务失败，停止模拟
          this.clearIntervals();
          this.isGenerating = false;
          
          // 清除存储的任务ID
          uni.removeStorageSync('current_music_task_id');
          uni.removeStorageSync('music_task_start_time');
          uni.removeStorageSync('music_task_progress');
          
          uni.showToast({
            title: statusData.error || '生成失败，请重试',
            icon: 'none'
          });
        }
        // 其他状态继续等待，保持模拟进度条更新
        
      } catch (error) {
        console.error('Check music status error:', error);
        // 继续检查，不中断流程
      }
    },
    
    // 加载历史歌曲数据
    async loadMusicHistory(page = 1, limit = 20) {
      try {
        // 检查用户是否已登录
        const token = uni.getStorageSync('token');
        if (!token) {
          // 用户未登录，直接设置空列表
          console.log('用户未登录，历史记录设为空');
          this.musicHistory = [];
          this.hasMoreHistory = false;
          this.historyTotal = 0;
          this.historyLoaded = true;
          this.historyPickerRange = [];
          return;
        }
        
        console.log(`开始加载历史歌曲数据 - 页码:${page}, 每页条数:${limit}`);
        this.loadingMore = true;
        const response = await musicApi.getMusicHistory({
          skip: (page - 1) * limit,
          limit: limit
        });
        console.log('loadMusicHistory');
        console.log(response);
        
        // 调试：打印API响应详情
        console.log(`历史记录API响应 - 状态码:${response.code}, 数据条数:${response.data?.items?.length || 0}`);
        
        if (response.code !== 0) {
          throw new Error(response.message || '获取历史记录失败');
        }
        
        const historyData = response.data.items || [];
        
        // 调试：打印原始历史记录数据
        console.log(`原始历史记录数据 - 条数:${historyData.length}`);
        if (historyData.length > 0) {
          console.log('第一条历史记录示例:', JSON.stringify(historyData[0], null, 2));
          
          // 检查多首歌曲的情况
          const multiSongItems = historyData.filter(item => item.songs && item.songs.length > 0);
          console.log(`包含多首歌曲的记录数:${multiSongItems.length}`);
          
          if (multiSongItems.length > 0) {
            const firstMultiSongItem = multiSongItems[0];
            console.log('多首歌曲记录示例:');
            console.log('- task_id:', firstMultiSongItem.task_id);
            console.log('- title:', firstMultiSongItem.title);
            console.log('- 歌曲数量:', firstMultiSongItem.songs.length);
            console.log('- 第一首歌曲:', JSON.stringify(firstMultiSongItem.songs[0], null, 2));
          }
        }
        
        // Process history items to ensure they have image_url 
        const processedHistory = historyData.map(item => {
          // Make sure we have image URL
          if (item.songs && item.songs.length > 0) {
            const song = item.songs[0];
            return {
              ...item,
              image_url: item.image_url || song.image_url,
              audio_url: item.audio_url || song.audio_url
            };
          }
          return item;
        });
        
        // 调试：打印处理后的历史记录
        console.log(`处理后的历史记录 - 条数:${processedHistory.length}`);
        
        if (page === 1) {
          this.musicHistory = processedHistory;
        } else {
          this.musicHistory = this.musicHistory.concat(processedHistory);
        }
        
        this.hasMoreHistory = historyData.length === limit;
        this.historyTotal = response.data.total;
        this.historyLoaded = true;
        this.historyPage = page;
        
        // 调试：打印最终状态
        console.log(`历史记录加载完成 - 总条数:${this.musicHistory.length}, 总页数:${Math.ceil(this.historyTotal / limit)}, 当前页:${this.historyPage}`);
        
        // 更新历史歌曲选择器的数据
        this.updateHistoryPickerRange();
        
      } catch (error) {
        console.error('Load history error:', error);
        // 如果是因为未登录导致的错误，我们不显示提示
        const token = uni.getStorageSync('token');
        if (token) {
          uni.showToast({
            title: '获取历史记录失败',
            icon: 'none'
          });
        }
      } finally {
        this.loadingMore = false;
      }
    },
    
    // 刷新历史歌曲数据
    async refreshMusicHistory() {
      this.musicHistory = [];
      this.historyPage = 1;
      this.historyLoaded = false;
      await this.loadMusicHistory();
    },
    
    // 更新历史歌曲选择器的数据
    updateHistoryPickerRange() {
      console.log('开始更新历史歌曲选择器数据 - 历史记录数:', this.musicHistory.length);
      let pickerItems = [];
      
      this.musicHistory.forEach((item, itemIndex) => {
        // 处理多首歌曲的情况
        if (item.songs && item.songs.length > 0) {
          console.log(`历史记录[${itemIndex}] - 包含${item.songs.length}首歌曲 - task_id:${item.task_id}`);
          
          // 对于每首歌曲创建单独的选项
          item.songs.forEach((song, index) => {
            const songTitle = song.title || item.title || '未命名歌曲';
            const date = this.formatDate(item.created_at);
            
            // 添加歌曲序号，如果有多首歌曲
            const displayTitle = item.songs.length > 1 
              ? `${songTitle} (${index + 1}/${item.songs.length})` 
              : songTitle;
              
            pickerItems.push({
              ...song,
              task_id: item.task_id,
              parent_item: item,
              created_at: item.created_at,
              prompt: item.prompt,
              tags: song.tags || item.tags || '',
              displayName: `${displayTitle} (${date})`
            });
            
            // 调试：打印每首歌曲的选择器数据
            if (index === 0) {
              console.log(`- 第一首歌曲选择器项: ID=${song.id || '无ID'}, 标题="${displayTitle}"`);
              console.log(`  audio_url存在: ${!!song.audio_url}, image_url存在: ${!!song.image_url}`);
            }
          });
        } else {
          // 单首歌曲的情况
          console.log(`历史记录[${itemIndex}] - 单首歌曲 - task_id:${item.task_id}`);
          const title = item.title || '未命名歌曲';
          const date = this.formatDate(item.created_at);
          
          const pickerItem = {
            ...item,
            displayName: `${title} (${date})`
          };
          
          pickerItems.push(pickerItem);
          
          // 调试：打印单首歌曲的选择器数据
          console.log(`- 单首歌曲选择器项: ID=${item.id || '无ID'}, 标题="${title}"`);
          console.log(`  audio_url存在: ${!!(item.audio_url || item.url)}, image_url存在: ${!!item.image_url}`);
        }
      });
      
      this.historyPickerRange = pickerItems;
      console.log(`历史歌曲选择器数据更新完成 - 共${pickerItems.length}个选项`);
    },
    
    loadMoreHistory() {
      if (this.loadingMore || !this.hasMoreHistory) return;
      
      this.historyPage++;
      this.loadMusicHistory();
    },
    
    loadHistoryItem(item) {
      if (!item) return;
      
      console.log('加载历史歌曲 - 开始', item.id ? `ID: ${item.id}` : `task_id: ${item.task_id}`);
      console.log('输入item数据结构:', JSON.stringify(item, null, 2));
      
      // 更新选中的历史歌曲
      this.selectedHistorySong = item;
      
      // 设置续写模式的参数
      this.continuationParams = {
        prompt: '',
        title: item.title || '',
        tags: item.tags || '',
        task_id: item.task_id,
        continue_clip_id: item.id || item.continue_clip_id || '',
        continue_at: Math.min(30, Math.floor((item.duration || 60) / 2)) // 默认在中间位置续写，但不超过30秒
      };
      
      console.log('续写模式参数设置完成:', JSON.stringify(this.continuationParams, null, 2));
      
      // 加载歌曲项目
      let songDuration = item.duration || 30; // 默认时长30秒
      console.log('初始歌曲时长:', songDuration, '来源:', item.duration ? 'item.duration' : '默认值30');
      
      // 如果是从多首歌曲数据结构中直接选择的单首歌曲
      if (item.parent_item) {
        console.log('分支1: 处理从父项中选择的子歌曲', `ID: ${item.id || '无'}`);
        console.log('父项ID:', item.parent_item.task_id);
        
        // 直接使用当前歌曲数据
        this.currentMusic = {
          task_id: item.task_id,
          title: item.title,
          audio_url: item.audio_url,
          image_url: item.image_url,
          prompt: item.prompt,
          // 修改这里: 使用song.prompt作为lyrics，而不是父项的prompt
          lyrics: item.prompt || '',
          tags: item.tags || '',
          created_at: item.created_at,
          continue_clip_id: item.id || '',
          id: item.id,
          duration: item.duration
        };
        console.log('加载历史歌曲设置 currentMusic (从父项选择子歌曲):', this.currentMusic);
        this.musicUrl = this.currentMusic.audio_url;
        this.generatedSongs = [this.currentMusic];
        this.activeIndex = 0;
        
        // 获取歌曲时长
        if (item.duration) {
          songDuration = item.duration;
          console.log('更新歌曲时长:', songDuration, '来源: item.duration');
        }
      }
      // 处理原始多首歌曲的情况 (通过历史记录点击的项目)
      else if (item.songs && item.songs.length > 0) {
        console.log('分支2: 处理包含多首歌曲的项目', `歌曲数: ${item.songs.length}`);
        
        this.generatedSongs = item.songs.map(song => ({
          task_id: item.task_id,
          title: song.title || item.title,
          audio_url: song.audio_url,
          image_url: song.image_url,
          prompt: item.prompt,
          // 修改这里: 使用song.prompt作为lyrics，而不是item.prompt
          lyrics: song.prompt || '',
          tags: song.tags || item.tags || '',
          created_at: item.created_at,
          completed_at: item.completed_at,
          continue_clip_id: song.id || '',
          metadata: song.metadata || {},
          id: song.id,
          duration: song.duration // 从历史记录中获取时长
        }));
        
        console.log('从多首歌曲生成的generatedSongs:');
        this.generatedSongs.forEach((song, index) => {
          console.log(`[${index}] ID: ${song.id || '无'}, 标题: ${song.title || '未命名'}, audio_url存在: ${!!song.audio_url}`);
        });
        
        // 设置第一首歌曲为当前播放
        this.activeIndex = 0;
        this.currentMusic = this.generatedSongs[0];
        this.musicUrl = this.currentMusic.audio_url;
        
        // 获取歌曲时长
        if (this.currentMusic.duration) {
          songDuration = this.currentMusic.duration;
          console.log('更新歌曲时长:', songDuration, '来源: this.currentMusic.duration');
        }
      } else {
        // 单首歌曲的情况
        console.log('分支3: 处理单首歌曲', `URL存在: ${!!(item.audio_url || item.url)}`);
        
        this.currentMusic = {
          ...item,
          audio_url: item.audio_url || item.url
        };
        console.log('加载历史歌曲设置 currentMusic (单首歌曲):', this.currentMusic);
        this.musicUrl = this.currentMusic.audio_url;
        this.generatedSongs = [this.currentMusic];
        this.activeIndex = 0;
        
        // 获取歌曲时长
        if (item.duration) {
          songDuration = item.duration;
          console.log('更新歌曲时长:', songDuration, '来源: item.duration');
        }
      }
      
      // 预设音频时长，不用等待onTimeUpdate事件
      this.totalDuration = songDuration;
      this.originalDuration = songDuration;
      console.log('设置时长完成 - totalDuration:', this.totalDuration, 'originalDuration:', this.originalDuration);
      
      // 初始化音频播放器
      this.initAudioPlayer(songDuration);
      
      // 重置歌词状态并解析歌词
      this.showLyrics = false;
      this.formattedLyrics = '';
      this.parseAndFormatLyrics();
      
      // 设置原始音频
      if (this.originalAudio) {
        this.originalAudio.destroy();
      }
      
      this.originalAudio = uni.createInnerAudioContext();
      this.originalAudio.src = this.musicUrl;
      this.originalAudio.onCanplay(() => {
        this.originalDuration = this.originalAudio.duration || songDuration;
        console.log('原始音频可播放, 时长更新为:', this.originalDuration);
      });
      this.originalAudio.onError((res) => {
        console.error('音频加载失败', res);
        uni.showToast({
          title: '原始音频加载失败',
          icon: 'none'
        });
      });
      
      console.log('历史歌曲加载完成');
    },
    
    continueThisSong() {
      if (!this.currentMusic) return;
      
      this.activeMode = 'continuation';
      
      // 获取实际歌曲时长
      const actualDuration = this.currentMusic.duration || this.totalDuration || 30;
      
      this.continuationParams = {
        prompt: '',
        title: this.currentMusic.title || '',
        tags: this.currentMusic.tags || '',
        task_id: this.currentMusic.task_id,
        continue_clip_id: this.currentMusic.continue_clip_id || '',
        continue_at: Math.min(30, Math.floor(actualDuration / 2)) // 续写点不超过30秒
      };
      
      this.originalDuration = actualDuration;
      
      // 初始化原始歌曲的音频
      this.initOriginalAudio();
      
      uni.showToast({
        title: '已准备续写，请输入续写内容',
        icon: 'none'
      });
    },
    
    initOriginalAudio() {
      if (this.originalAudio) {
        this.originalAudio.destroy();
      }
      
      this.originalAudio = uni.createInnerAudioContext();
      this.originalAudio.src = this.musicUrl;
      
      // 设置时长信息 (如果有)
      if (this.currentMusic?.duration) {
        // 在原始音频对象上存储时长信息，以便在需要时使用
        this.originalAudio.originalDuration = this.currentMusic.duration;
      }
      
      // 添加监听器
      this.originalAudio.onEnded(() => {
        this.isPlayingOriginal = false;
      });
      
      this.originalAudio.onError(() => {
        this.isPlayingOriginal = false;
        uni.showToast({
          title: '播放原曲失败',
          icon: 'none'
        });
      });
      
      this.originalAudio.onPlay(() => {
        this.isPlayingOriginal = true;
      });
      
      this.originalAudio.onPause(() => {
        this.isPlayingOriginal = false;
      });
      
      this.originalAudio.onStop(() => {
        this.isPlayingOriginal = false;
      });
    },
    
    playOriginalSong() {
      if (!this.originalAudio) {
        this.initOriginalAudio();
      }
      
      if (this.isPlayingOriginal) {
        // 如果正在播放，则暂停
        this.originalAudio.pause();
        this.isPlayingOriginal = false;
      } else {
        // 如果已暂停，则播放
        // 暂停当前播放的音乐
        if (this.audioContext && this.isPlaying) {
          this.audioContext.pause();
          this.isPlaying = false;
        }
        
        this.originalAudio.play();
        this.isPlayingOriginal = true;
      }
    },
    
    initAudioPlayer(initialDuration = null) {
      // 清理之前的音频上下文
      if (this.audioContext) {
        this.audioContext.destroy();
      }
      
      // 创建新的音频上下文
      this.audioContext = uni.createInnerAudioContext();
      this.audioContext.src = this.musicUrl;
      this.audioContext.autoplay = false;
      
      // 如果有初始时长，立即设置
      if (initialDuration) {
        this.totalDuration = initialDuration;
      } else if (this.currentMusic?.duration) {
        // 如果当前音乐对象有持久化的时长，也可以使用
        this.totalDuration = this.currentMusic.duration;
      }
      
      this.audioContext.onCanplay(() => {
        console.log('Audio can play');
        
        // 在canplay事件中尝试获取音频时长
        // 有些浏览器在这个事件中可以获取到duration
        if (this.audioContext.duration > 0 && this.audioContext.duration !== Infinity) {
          this.totalDuration = this.audioContext.duration;
          // 保存时长到当前音乐对象
          if (this.currentMusic) {
            this.currentMusic.duration = this.totalDuration;
          }
        }
      });
      
      this.audioContext.onTimeUpdate(() => {
        this.currentTime = this.audioContext.currentTime;
        
        // 只有当音频实际时长大于当前设置的时长时才更新
        // 或者当前时长为默认值30时才更新
        if (this.audioContext.duration > 0 && 
            (this.audioContext.duration > this.totalDuration || this.totalDuration === 30)) {
          this.totalDuration = this.audioContext.duration;
          // 保存时长到当前音乐对象
          if (this.currentMusic) {
            this.currentMusic.duration = this.totalDuration;
          }
        }
        
        this.playProgress = (this.currentTime / this.totalDuration) * 100;
      });
      
      this.audioContext.onEnded(() => {
        this.isPlaying = false;
        this.currentTime = 0;
        this.playProgress = 0;
      });
      
      this.audioContext.onError((err) => {
        console.error('Audio error:', err);
        uni.showToast({
          title: '音频播放失败',
          icon: 'none'
        });
        this.isPlaying = false;
      });
      
      // 重置播放状态
      this.currentTime = 0;
      this.playProgress = 0;
      this.isPlaying = false;
    },
    
    togglePlay() {
      if (!this.audioContext) return;
      
      this.isPlaying = !this.isPlaying;
      
      if (this.isPlaying) {
        this.audioContext.play();
      } else {
        this.audioContext.pause();
      }
    },
    
    onProgressChange(e) {
      if (!this.audioContext) return;
      
      const progress = e.detail.value;
      this.playProgress = progress;
      
      const seekTime = (progress / 100) * this.totalDuration;
      this.currentTime = seekTime;
      this.audioContext.seek(seekTime);
    },
    
    formatTime(seconds) {
      // 处理无效输入
      if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
        return '00:00';
      }
      
      // 确保seconds是数字类型
      const secValue = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
      
      // 将秒数格式化为 MM:SS 格式
      const min = Math.floor(secValue / 60).toString().padStart(2, '0');
      const sec = Math.floor(secValue % 60).toString().padStart(2, '0');
      return `${min}:${sec}`;
    },
    
    formatDate(dateStr) {
      // 格式化日期为 YYYY-MM-DD HH:MM
      if (!dateStr) return '';
      
      const date = new Date(dateStr);
      
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    
    getPromptText(item) {
      if (item.generation_mode === 'inspiration') {
        return item.prompt;
      } else if (item.generation_mode === 'custom' || item.generation_mode === 'continuation') {
        return item.title;
      }
      return item.prompt || '';
    },
    
    downloadMedia() {
      // 获取当前音乐的所有相关媒体URL
      const audioUrl = this.musicUrl || this.currentMusic?.audio_url;
      const imageUrl = this.currentMusic?.image_url;
      
      if (!audioUrl && !imageUrl) {
        uni.showToast({
          title: '没有可下载的媒体文件',
          icon: 'none'
        });
        return;
      }
      
      // 下载进度计数器
      let totalFiles = 0;
      let completedFiles = 0;
      let failedFiles = 0;
      let downloadResults = []; // 存储下载结果以便最终汇总
      
      if (audioUrl) totalFiles++;
      if (imageUrl) totalFiles++;
      
      // 显示下载开始提示
      uni.showToast({
        title: '准备下载文件...',
        icon: 'none',
        duration: 1500
      });
      
      // 下载完成时的处理函数
      const onDownloadComplete = (fileType, success, errorMsg = null, savedPath = null) => {
        completedFiles++;
        
        // 记录下载结果
        downloadResults.push({
          fileType,
          success,
          errorMsg,
          savedPath
        });
        
        if (!success) {
          failedFiles++;
        }
        
        // 更新加载提示
        if (completedFiles < totalFiles) {
          // 当前文件下载完成后，继续处理下一个文件
          uni.showToast({
            title: `${fileType}${success ? '下载完成' : '下载失败'}`,
            icon: success ? 'success' : 'none',
            duration: 1500
          });
        } else {
          // 所有文件下载完成后的汇总提示
          uni.hideLoading();
          
          if (failedFiles === 0) {
            // 收集所有成功下载的文件路径信息
            const successPaths = downloadResults
              .filter(item => item.success && item.savedPath)
              .map(item => `${item.fileType}：${item.savedPath}`)
              .join('\n');
            
            // 全部成功，显示保存位置信息
            uni.showModal({
              title: '文件保存成功',
              content: `所有文件已成功保存到您的设备上\n\n位置：\n${successPaths}`,
              confirmText: '查看文件',
              cancelText: '关闭',
              success: (res) => {
                if (res.confirm && downloadResults.length > 0) {
                  // 尝试打开第一个文件所在的文件夹
                  const firstSuccessFile = downloadResults.find(item => item.success && item.savedPath);
                  if (firstSuccessFile && firstSuccessFile.savedPath) {
                    // 根据平台尝试打开文件管理器
                    // #ifdef APP-PLUS
                    if (plus && plus.os) {
                      const osName = plus.os.name.toLowerCase();
                      if (osName === 'android') {
                        // 安卓平台尝试打开文件
                        plus.runtime.openFile(firstSuccessFile.savedPath);
                      } else if (osName === 'ios') {
                        // iOS平台尝试打开文件
                        plus.runtime.openFile(firstSuccessFile.savedPath);
                      }
                    }
                    // #endif
                  }
                }
              }
            });
          } else {
            // 有失败的情况，构建详细的汇总消息
            let summaryMessage = `共${totalFiles}个文件，成功${totalFiles - failedFiles}个，失败${failedFiles}个\n`;
            
            // 添加成功文件的保存位置
            let successDetails = downloadResults
              .filter(item => item.success && item.savedPath)
              .map(item => `${item.fileType}：${item.savedPath}`)
              .join('\n');
            
            // 添加失败文件详情
            let failDetails = downloadResults
              .filter(item => !item.success)
              .map(item => `${item.fileType}：${item.errorMsg || '下载失败'}`)
              .join('\n');
            
            // 显示详细信息对话框
            uni.showModal({
              title: '下载完成',
              content: summaryMessage + 
                      (successDetails ? '\n\n成功保存位置：\n' + successDetails : '') + 
                      (failDetails ? '\n\n失败详情：\n' + failDetails : ''),
              confirmText: '查看文件',
              cancelText: '关闭',
              success: (res) => {
                if (res.confirm) {
                  // 尝试打开第一个成功下载的文件
                  const firstSuccessFile = downloadResults.find(item => item.success && item.savedPath);
                  if (firstSuccessFile && firstSuccessFile.savedPath) {
                    // 根据平台尝试打开文件管理器
                    // #ifdef APP-PLUS
                    if (plus && plus.os) {
                      const osName = plus.os.name.toLowerCase();
                      if (osName === 'android') {
                        // 安卓平台尝试打开文件
                        plus.runtime.openFile(firstSuccessFile.savedPath);
                      } else if (osName === 'ios') {
                        // iOS平台尝试打开文件
                        plus.runtime.openFile(firstSuccessFile.savedPath);
                      }
                    }
                    // #endif
                  }
                }
              }
            });
          }
        }
      };
      
      // 下载单个文件的函数
      const downloadSingleFile = (url, fileType, index) => {
        // 文件不存在，直接跳过
        if (!url) {
          return;
        }
        
        // 显示正在下载哪个文件
        uni.showLoading({
          title: `正在下载${fileType}...`,
          mask: true
        });
        
        console.log(`开始下载${fileType}: ${url}`);
        
        uni.downloadFile({
          url: url,
          success: (res) => {
            if (res.statusCode === 200) {
              uni.saveFile({
                tempFilePath: res.tempFilePath,
                success: (saveRes) => {
                  console.log(`${fileType}保存成功:`, saveRes);
                  // 记录保存的文件路径
                  const savedPath = saveRes.savedFilePath;
                  onDownloadComplete(fileType, true, null, savedPath);
                },
                fail: (err) => {
                  const errorMsg = err.errMsg || '保存到本地失败';
                  console.error(`${fileType}保存失败:`, err);
                  // 显示单个文件保存失败的详细错误
                  onDownloadComplete(fileType, false, errorMsg);
                }
              });
            } else {
              const errorMsg = `HTTP状态码: ${res.statusCode}`;
              console.error(`${fileType}下载失败，状态码:`, res.statusCode);
              onDownloadComplete(fileType, false, errorMsg);
            }
          },
          fail: (err) => {
            const errorMsg = err.errMsg || '网络错误';
            console.error(`${fileType}下载失败:`, err);
            onDownloadComplete(fileType, false, errorMsg);
          }
        });
      };
      
      // 按顺序下载各种媒体文件
      let downloadQueue = [];
      
      if (audioUrl) {
        downloadQueue.push({ url: audioUrl, type: '音频', index: 1 });
      }
      
      if (imageUrl) {
        downloadQueue.push({ url: imageUrl, type: '封面图', index: 2 });
      }
      
      // 顺序下载，避免并发可能导致的问题
      const processQueue = (index = 0) => {
        if (index >= downloadQueue.length) return;
        
        const item = downloadQueue[index];
        setTimeout(() => {
          downloadSingleFile(item.url, item.type, item.index);
          // 当前文件开始下载后，等待一小段时间再开始下一个
          processQueue(index + 1);
        }, 800); // 稍微错开下载时间
      };
      
      // 开始下载队列
      processQueue();
    },
    
    // 切换歌曲时重置状态
    switchSong(index) {
      if (index < 0 || index >= this.generatedSongs.length) return;
      
      console.log(`切换到第${index+1}首歌曲`);
      
      // 暂停当前播放
      if (this.audioContext && this.isPlaying) {
        this.audioContext.pause();
        this.isPlaying = false;
      }
      
      // 切换到新的歌曲
      this.activeIndex = index;
      this.currentMusic = this.generatedSongs[index];
      console.log('切换歌曲设置 currentMusic:', this.currentMusic);
      this.musicUrl = this.currentMusic.audio_url;
      
      // 重置歌词状态
      this.showLyrics = false;
      this.formattedLyrics = '';
      console.log('切换歌曲，重置歌词状态');
      this.parseAndFormatLyrics();
      
      // 初始化音频播放器
      this.initAudioPlayer();
    },
    
    // Method to handle cover image click
    onCoverClick() {
      // 只切换音频播放/暂停状态
      this.togglePlay();
    },
    onHistorySongSelected(e) {
      const index = e.detail.value;
      console.log(`历史歌曲选择事件 - 选择索引: ${index}`);
      
      if (index >= 0 && index < this.historyPickerRange.length) {
        // 如果之前有播放原曲，停止播放
        if (this.isPlayingOriginal && this.originalAudio) {
          this.originalAudio.stop();
          this.isPlayingOriginal = false;
          console.log('停止播放原曲');
        }
        
        // 获取选中的歌曲项
        const selectedItem = this.historyPickerRange[index];
        console.log('选中的历史歌曲项目:', selectedItem.displayName);
        console.log('选中项目详情:', JSON.stringify({
          id: selectedItem.id,
          task_id: selectedItem.task_id,
          title: selectedItem.title,
          parent_item: selectedItem.parent_item ? '存在' : '不存在',
          audio_url: !!selectedItem.audio_url
        }, null, 2));
        
        this.selectedHistorySong = selectedItem;
        
        // 检查是否是来自多首歌曲的单首歌曲
        if (selectedItem.parent_item) {
          console.log('处理多首歌曲中的单首歌曲');
          // 如果是多首歌曲中的一首，需要特殊处理
          const songItem = {
            ...selectedItem,
            task_id: selectedItem.task_id,
            title: selectedItem.title,
            prompt: selectedItem.prompt,
            created_at: selectedItem.created_at,
            continue_clip_id: selectedItem.id
          };
          console.log('构建songItem:', JSON.stringify({
            title: songItem.title,
            task_id: songItem.task_id,
            id: songItem.id,
            continue_clip_id: songItem.continue_clip_id
          }, null, 2));
          
          this.loadHistoryItem(songItem);
        } else {
          console.log('处理单首歌曲');
          // 单首歌曲的普通情况
          this.loadHistoryItem(selectedItem);
        }
        
        uni.showToast({
          title: '已选择歌曲',
          icon: 'none',
          duration: 1500
        });
      } else {
        console.log(`选择的索引无效: ${index}, 选择器范围: 0-${this.historyPickerRange.length-1}`);
      }
    },
    toggleOriginalSong() {
      if (!this.originalAudio) {
        this.initOriginalAudio();
      }
      
      if (this.isPlayingOriginal) {
        // 如果正在播放，则暂停
        this.originalAudio.pause();
        this.isPlayingOriginal = false;
      } else {
        // 如果已暂停，则播放
        // 暂停当前播放的音乐
        if (this.audioContext && this.isPlaying) {
          this.audioContext.pause();
          this.isPlaying = false;
        }
        
        this.originalAudio.play();
        this.isPlayingOriginal = true;
      }
    },
    // Login confirm handlers
    handleLoginConfirm() {
      console.log('用户确认登录');
      this.showLoginConfirmPopup = false;
      
      // 跳转到登录页面
      uni.reLaunch({
        url: '/pages/login/login?redirect=/pages/music-generator/music-generator'
      });
    },
    
    handleLoginCancel() {
      console.log('用户取消登录');
      this.showLoginConfirmPopup = false;
    },
    
    // Points confirm handlers
    handlePointsConfirm() {
      console.log('用户确认前往充值积分');
      this.showInsufficientPointsPopup = false;
      
      // 跳转到积分充值页面
      uni.navigateTo({
        url: '/pages/purchase/points'
      });
    },
    
    handlePointsCancel() {
      console.log('用户取消积分充值');
      this.showInsufficientPointsPopup = false;
    },
    
    // 检查是否有未完成的任务
    checkUnfinishedTask() {
      // 从本地存储获取任务ID
      const taskId = uni.getStorageSync('current_music_task_id');
      if (!taskId) {
        return; // 没有未完成的任务
      }
      
      // 获取任务开始时间，如果没有则使用当前时间
      const taskStartTime = uni.getStorageSync('music_task_start_time') || Date.now();
      
      // 计算任务已经运行的时间(毫秒)
      const elapsedTime = Date.now() - taskStartTime;
      
      // 假设音乐生成总共需要约60秒，根据已过时间计算模拟进度
      // 限制最大进度为95%，让用户知道任务还在进行中
      const timeBasedProgress = Math.min(0.95, elapsedTime / (60 * 1000));
      
      // 获取上次保存的进度值
      const savedProgress = uni.getStorageSync('music_task_progress') || 0;
      
      // 基于上次保存的进度值增加10%，但不超过95%
      const progressWithBonus = Math.min(0.95, savedProgress + 0.1);
      
      // 取时间计算的进度和(上次进度+10%)的较大值，确保进度不会后退
      const finalProgress = Math.max(timeBasedProgress, progressWithBonus);
      
      console.log('恢复任务进度 - 时间计算进度:', timeBasedProgress, 
                '保存的进度:', savedProgress, 
                '增加10%后:', progressWithBonus, 
                '最终进度:', finalProgress);
      
      // 设置当前任务ID
      this.currentTaskId = taskId;
      this.isGenerating = true;
      
      // 先设置进度值，然后再调用startProgressSimulation
      this.generationProgress = Math.max(0.05, finalProgress); // 至少从5%开始，最大95%
      console.log('恢复任务进度为:', Math.floor(this.generationProgress * 100) + '%');
      
      // 显示提示
      uni.showToast({
        title: '正在继续查询未完成的音乐生成任务',
        icon: 'none',
        duration: 2000
      });
      
      // 开始模拟进度
      this.startProgressSimulation();
      
      // 开始查询任务状态
      this.statusCheckInterval = setInterval(() => {
        this.checkMusicStatus();
      }, 1000);
    },
    saveCurrentProgress() {
      // 保存当前进度到本地存储
      console.log('保存当前进度:', this.generationProgress);
      uni.setStorageSync('music_task_progress', this.generationProgress);
    },
    
    // 歌词相关方法
    toggleLyricsDisplay() {
      this.showLyrics = !this.showLyrics;
      console.log('切换歌词显示状态:', this.showLyrics ? '显示' : '隐藏');
      
      // 如果切换到显示歌词并且还没有解析歌词，尝试解析
      if (this.showLyrics && !this.formattedLyrics) {
        console.log('需要解析歌词');
        this.parseAndFormatLyrics();
      }
    },
    
    parseAndFormatLyrics() {
      // 如果没有当前音乐或没有提示词，则不处理
      if (!this.currentMusic) {
        console.log('无法解析歌词: 没有当前音乐');
        return;
      }
      
      console.log('开始解析歌词 - currentMusic完整数据:', JSON.stringify(this.currentMusic));
      
      // 特别检查metadata字段
      if (this.currentMusic.metadata) {
        console.log('currentMusic.metadata:', JSON.stringify(this.currentMusic.metadata));
      }
      
      // 尝试从不同来源获取歌词内容
      let lyricsContent = '';
      let lyricsSource = '未知来源';
      
      // 1. 优先使用歌曲专门的lyrics字段，但要确保它是实际歌词而不是生成提示
      if (this.currentMusic.lyrics && this.currentMusic.lyrics.includes('[')) {
        lyricsContent = this.currentMusic.lyrics;
        lyricsSource = 'lyrics字段(包含格式标记)';
        console.log('从lyrics字段获取歌词内容(包含格式标记):', this.currentMusic.lyrics);
      }
      // 2. 如果当前歌曲是从多首歌曲中选择的，使用歌曲本身的prompt
      else if (this.currentMusic.id && this.generatedSongs.length > 0) {
        // 在generatedSongs中查找匹配的歌曲
        const matchingSong = this.generatedSongs.find(s => s.id === this.currentMusic.id);
        if (matchingSong && matchingSong.prompt && matchingSong.prompt.includes('[')) {
          lyricsContent = matchingSong.prompt;
          lyricsSource = '匹配歌曲的prompt字段';
          console.log('从匹配歌曲的prompt字段获取歌词内容:', matchingSong.prompt);
        }
      }
      // 3. 检查当前music对象的prompt是否包含格式标记（如[Verse]等）
      else if (this.currentMusic.prompt && this.currentMusic.prompt.includes('[')) {
        lyricsContent = this.currentMusic.prompt;
        lyricsSource = 'currentMusic.prompt (包含格式标记)';
        console.log('从currentMusic.prompt获取歌词内容(包含格式标记):', this.currentMusic.prompt);
      }
      // 4. 检查原始item中是否有songs数组并提取歌词
      else {
        // 从歌曲历史中查找
        const historyItem = this.musicHistory.find(h => h.task_id === this.currentMusic.task_id);
        if (historyItem && historyItem.songs && historyItem.songs.length > 0) {
          // 使用第一首歌曲的prompt作为歌词
          const songPrompt = historyItem.songs[0].prompt;
          if (songPrompt && songPrompt.includes('[')) {
            lyricsContent = songPrompt;
            lyricsSource = '历史记录中匹配task_id的歌曲prompt';
            console.log('从历史记录中匹配task_id的歌曲prompt获取歌词:', songPrompt);
          }
        }
      }
      
      // 5. 如果以上都未找到合适的歌词，则尝试其他可能的来源
      if (!lyricsContent) {
        // 尝试从metadata中获取
        if (this.currentMusic.metadata && this.currentMusic.metadata.prompt) {
          lyricsContent = this.currentMusic.metadata.prompt;
          lyricsSource = 'metadata.prompt';
          console.log('从metadata.prompt获取歌词内容:', this.currentMusic.metadata.prompt);
        }
        // 最后尝试从inspirationParams或当前的prompt
        else if (this.currentMusic.prompt) {
          lyricsContent = this.currentMusic.prompt;
          lyricsSource = 'currentMusic.prompt (无格式标记)';
          console.log('从currentMusic.prompt获取歌词内容(无格式标记):', this.currentMusic.prompt);
        }
        else if (this.inspirationParams.gpt_description_prompt) {
          lyricsContent = this.inspirationParams.gpt_description_prompt;
          lyricsSource = 'inspirationParams.gpt_description_prompt';
          console.log('从inspirationParams.gpt_description_prompt获取歌词内容:', this.inspirationParams.gpt_description_prompt);
        }
      }
      
      console.log('歌词内容来源:', lyricsSource);
      console.log('原始歌词内容:', lyricsContent);
      
      // 格式化歌词展示
      if (lyricsContent) {
        // 尝试检测是否已经有格式化结构（如[Verse], [Chorus]等标记）
        if (lyricsContent.includes('[') && lyricsContent.includes(']')) {
          // 已有格式，保持原样
          this.formattedLyrics = lyricsContent.replace(/\\n/g, '\n');
          console.log('歌词已有格式化标记，保持原样');
        } else {
          // 无格式，尝试简单格式化，以换行和标点为界
          const cleanedLyrics = lyricsContent.replace(/\\n/g, '\n');
          this.formattedLyrics = cleanedLyrics;
          console.log('歌词无格式化标记，简单替换换行符');
        }
        console.log('格式化后的歌词:', this.formattedLyrics);
      } else {
        this.formattedLyrics = '暂无歌词信息';
        console.log('无歌词内容');
      }
    },
    copyLyricsToClipboard() {
      // Check if there's content to copy
      if (!this.formattedLyrics || this.formattedLyrics === '暂无歌词信息') {
        uni.showToast({
          title: '没有可复制的歌词内容',
          icon: 'none'
        });
        return;
      }
      
      // Trigger vibration for feedback (if available)
      if (uni.vibrateShort) {
        uni.vibrateShort({
          success: function() {
            console.log('震动反馈成功');
          },
          fail: function() {
            console.log('震动反馈失败或不支持');
          }
        });
      }
      
      // Copy lyrics to clipboard
      uni.setClipboardData({
        data: this.formattedLyrics,
        success: () => {
          // Show success message with custom icon
          uni.showToast({
            title: '歌词已复制',
            icon: 'success',
            duration: 1500
          });
        },
        fail: function() {
          uni.showToast({
            title: '复制歌词失败，请重试',
            icon: 'none'
          });
        }
      });
    },
    shareMusic() {
      // 获取当前音乐信息
      if (!this.currentMusic || !this.musicUrl) {
        uni.showToast({
          title: '没有可分享的音乐',
          icon: 'none'
        });
        return;
      }
      
      // 显示分享选项菜单
      uni.showActionSheet({
        title: '选择分享方式',
        itemList: ['分享到社交平台', '复制音乐链接', '复制封面图链接'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0: // 分享到社交平台
              this.shareToSocialPlatforms();
              break;
            case 1: // 复制音乐链接
              this.copyShareLink();
              break;
            case 2: // 复制封面图链接
              this.copyImageLink();
              break;
          }
        }
      });
    },
    
    // 分享到社交平台
    shareToSocialPlatforms() {
      // 准备分享内容
      const title = this.currentMusic.title || '我用AI生成的专属音乐';
      const summary = this.currentMusic.prompt || '快来听听我用AI生成的音乐吧！';
      const imageUrl = this.currentMusic.image_url || '';
      
      // 检查当前环境和平台
      const platform = uni.getSystemInfoSync().platform;
      const isAppEnv = platform === 'android' || platform === 'ios';
      
      // 判断是否在App环境中
      // #ifdef APP-PLUS
      // 先尝试使用系统分享API
      if (uni.shareWithSystem) {
        uni.shareWithSystem({
          type: 'media',
          title: title,
          summary: summary,
          href: this.musicUrl,
          imageUrl: imageUrl,
          mediaUrl: this.musicUrl,
          success: () => {
            uni.showToast({
              title: '分享成功',
              icon: 'success'
            });
          },
          fail: (err) => {
            console.error('系统分享失败:', err);
            
            // 系统分享失败，使用uni.share
            this.shareWithUniShare();
          }
        });
      } else {
        // 设备不支持系统分享，使用uni.share
        this.shareWithUniShare();
      }
      // #endif
      
      // #ifndef APP-PLUS
      // 小程序环境
      // #ifdef MP-WEIXIN
      // 提示用户点击右上角分享
      uni.showModal({
        title: '分享提示',
        content: '请点击右上角 "..." 按钮，选择 "分享" 即可',
        showCancel: false,
        confirmText: '知道了'
      });
      // #endif
      
      // H5或其他环境
      // #ifndef MP-WEIXIN
      uni.showModal({
        title: '分享提示',
        content: '当前平台不支持直接分享，请使用复制链接或下载文件后分享',
        cancelText: '复制链接',
        confirmText: '下载文件',
        success: (res) => {
          if (res.confirm) {
            // 用户点击下载文件
            this.downloadAndShare();
          } else {
            // 用户点击复制链接
            this.copyShareLink();
          }
        }
      });
      // #endif
      // #endif
    },
    
    // 下载后分享
    downloadAndShare() {
      uni.showLoading({
        title: '准备文件中...',
        mask: true
      });
      
      // 下载音频文件
      uni.downloadFile({
        url: this.musicUrl,
        success: (res) => {
          uni.hideLoading();
          
          if (res.statusCode === 200) {
            // 获取当前平台
            const platform = uni.getSystemInfoSync().platform;
            const isApp = plus && plus.runtime ? true : false;
            const isIOS = platform === 'ios';
            const isAndroid = platform === 'android';
            
            // 根据平台选择不同的分享方法
            if (isApp) {
              // App环境使用plus分享
              this.shareWithPlusShare(res.tempFilePath);
            } else if (isIOS || isAndroid) {
              // 原生环境可以尝试使用系统分享
              this.shareWithSystemShare(res.tempFilePath);
            } else {
              // H5或小程序环境
              if (uni.shareFileMessage) {
                // 小程序专用API
                uni.shareFileMessage({
                  filePath: res.tempFilePath,
                  success: () => {
                    uni.showToast({
                      title: '分享成功',
                      icon: 'success'
                    });
                  },
                  fail: (err) => {
                    console.error('文件分享失败:', err);
                    this.fallbackToDownload(res.tempFilePath);
                  }
                });
              } else {
                // 其他情况，提示用户保存文件后手动分享
                this.fallbackToDownload(res.tempFilePath);
              }
            }
          } else {
            uni.showToast({
              title: '文件下载失败',
              icon: 'none'
            });
          }
        },
        fail: () => {
          uni.hideLoading();
          uni.showToast({
            title: '文件下载失败',
            icon: 'none'
          });
        }
      });
    },
    
    // 使用plus分享（App环境）
    shareWithPlusShare(filePath) {
      // #ifdef APP-PLUS
      try {
        // 构建分享参数
        const msg = {
          type: 'file',
          title: this.currentMusic?.title || 'AI生成的音乐',
          href: filePath,
          pictures: [this.currentMusic?.image_url],
          extra: { fileName: (this.currentMusic?.title || 'AI生成的音乐') + '.mp3' }
        };
        
        // 调用系统分享
        plus.share.sendWithSystem(msg, 
          () => {
            uni.showToast({ title: '分享成功', icon: 'success' });
          }, 
          (err) => {
            console.error('系统分享失败:', err);
            this.fallbackToDownload(filePath);
          }
        );
      } catch (error) {
        console.error('Plus分享出错:', error);
        this.fallbackToDownload(filePath);
      }
      // #endif
      
      // #ifndef APP-PLUS
      // 非App环境直接使用降级方案
      this.fallbackToDownload(filePath);
      // #endif
    },
    
    // 使用系统分享（原生环境）
    shareWithSystemShare(filePath) {
      // #ifdef APP-PLUS
      if (uni.shareWithSystem) {
        try {
          uni.shareWithSystem({
            type: 'file',
            title: this.currentMusic?.title || 'AI生成的音乐',
            summary: this.currentMusic?.prompt || '快来听听我用AI生成的音乐吧！',
            imageUrl: this.currentMusic?.image_url,
            mediaUrl: filePath,
            filePath: filePath,
            success: () => {
              uni.showToast({
                title: '分享成功',
                icon: 'success'
              });
            },
            fail: (err) => {
              console.error('系统分享失败:', err);
              this.fallbackToDownload(filePath);
            }
          });
        } catch (error) {
          console.error('系统分享出错:', error);
          this.fallbackToDownload(filePath);
        }
      } else {
        this.fallbackToDownload(filePath);
      }
      // #endif
      
      // #ifndef APP-PLUS
      // 非App环境直接使用降级方案
      this.fallbackToDownload(filePath);
      // #endif
    },
    
    // 降级到下载功能的处理方法
    fallbackToDownload(filePath) {
      uni.showModal({
        title: '分享提示',
        content: '无法直接分享文件，是否保存到本地后手动分享？',
        confirmText: '保存文件',
        success: (modalRes) => {
          if (modalRes.confirm) {
            // 保存临时文件到本地
            uni.saveFile({
              tempFilePath: filePath,
              success: (saveRes) => {
                const savedFilePath = saveRes.savedFilePath;
                
                // 使用模态框显示保存位置，并提供查看文件的选项
                uni.showModal({
                  title: '文件保存成功',
                  content: `文件已保存到：\n${savedFilePath}`,
                  confirmText: '查看文件',
                  cancelText: '关闭',
                  success: (res) => {
                    if (res.confirm) {
                      // 尝试打开文件管理器（如果平台支持）
                      // #ifdef APP-PLUS
                      if (plus && plus.os) {
                        const osName = plus.os.name.toLowerCase();
                        if (osName === 'android' || osName === 'ios') {
                          plus.runtime.openFile(savedFilePath);
                        }
                      }
                      // #endif
                    }
                  }
                });
              },
              fail: (err) => {
                console.error('保存文件失败:', err);
                uni.showToast({
                  title: '保存文件失败，请重试',
                  icon: 'none'
                });
              }
            });
          }
        }
      });
    },
    
    // App端使用uni.share分享
    shareWithUniShare() {
      const title = this.currentMusic.title || '我用AI生成的专属音乐';
      const summary = this.currentMusic.prompt || '快来听听我用AI生成的音乐吧！';
      const imageUrl = this.currentMusic.image_url || '';
      
      // 检查是否在App环境中
      // #ifdef APP-PLUS
      // 分享场景列表
      const shareMenu = {
        menus: [
          { "img": "/static/weixin.png", "text": "微信好友", "share": { "provider": "weixin" } },
          { "img": "/static/weixin.png", "text": "微信朋友圈", "share": { "provider": "weixin", "scene": "WXSenceTimeline" } },
          { "img": "/static/qq.png", "text": "QQ", "share": { "provider": "qq" } },
          { "img": "/static/weibo.png", "text": "微博", "share": { "provider": "sinaweibo" } },
          { "img": "/static/more.png", "text": "更多", "share": { "provider": "system" } }
        ]
      };
      
      // 显示分享菜单
      uni.showActionSheet({
        title: "分享到",
        itemList: shareMenu.menus.map(item => item.text),
        success: (res) => {
          const index = res.tapIndex;
          const provider = shareMenu.menus[index].share.provider;
          const scene = shareMenu.menus[index].share.scene || "";
          
          // 调用分享接口
          uni.share({
            provider: provider,
            scene: scene,
            type: 0, // 图文
            title: title,
            summary: summary,
            imageUrl: imageUrl,
            href: this.musicUrl,
            success: () => {
              uni.showToast({
                title: '分享成功',
                icon: 'success'
              });
            },
            fail: (err) => {
              console.error('分享失败:', err);
              uni.showToast({
                title: '分享失败，请重试',
                icon: 'none'
              });
            }
          });
        }
      });
      // #endif
      
      // #ifndef APP-PLUS
      // 非App环境提供替代解决方案
      uni.showModal({
        title: '分享提示',
        content: '当前平台不支持直接分享，请使用复制音乐链接或下载文件后分享',
        cancelText: '复制链接',
        confirmText: '下载文件',
        success: (res) => {
          if (res.confirm) {
            // 用户点击下载文件
            this.downloadAndShare();
          } else {
            // 用户点击复制链接
            this.copyShareLink();
          }
        }
      });
      // #endif
    },
    
    copyShareLink() {
      if (!this.musicUrl) {
        uni.showToast({
          title: '没有可分享的音乐链接',
          icon: 'none'
        });
        return;
      }
      
      // 复制音乐链接到剪贴板
      uni.setClipboardData({
        data: this.musicUrl,
        success: () => {
          uni.showToast({
            title: '音乐链接已复制，可粘贴给好友',
            icon: 'none',
            duration: 2000
          });
        }
      });
    },
    
    // 新增方法：复制封面图链接
    copyImageLink() {
      const imageUrl = this.currentMusic?.image_url;
      
      if (!imageUrl) {
        uni.showToast({
          title: '没有可分享的封面图链接',
          icon: 'none'
        });
        return;
      }
      
      // 复制封面图链接到剪贴板
      uni.setClipboardData({
        data: imageUrl,
        success: () => {
          uni.showToast({
            title: '封面图链接已复制，可粘贴给好友',
            icon: 'none',
            duration: 2000
          });
        }
      });
    },
    // 获取积分配置
    async fetchPointsConfigs() {
      try {
        console.log('开始获取积分配置...');
        const result = await pointsService.getPointsConfigsWithCache();
        
        // 更新组件内部的配置副本
        this.pointsConfigs = result.configs;
        this.pointsDescriptions = result.descriptions;
        
        // 更新默认积分消耗
        this.pointsCost = this.currentPointsCost;
        console.log('已更新音乐生成积分消耗为:', this.pointsCost);
        
        return result;
      } catch (error) {
        console.error('获取积分配置出错:', error);
        // 即使出错，pointsService也会提供默认值，所以这里不需要额外处理
      }
    },
  }
};
</script>

<style lang="scss">
.music-generator-container {
  padding: 30rpx;
  background-color: #f8f9fb;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
  padding: 20rpx 0;
  
  .title {
    font-size: 48rpx;
    font-weight: bold;
    background: linear-gradient(90deg, #2d8cf0, #3a5af9);
    -webkit-background-clip: text;
    color: transparent;
    margin-bottom: 10rpx;
    display: block;
  }
  
  .subtitle {
    font-size: 28rpx;
    color: #666;
    display: block;
  }
}

.mode-tabs {
  display: flex;
  background: #f5f7fa;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  padding: 6rpx;
  
  .mode-tab {
    flex: 1;
    text-align: center;
    padding: 24rpx 0;
    transition: all 0.3s;
    position: relative;
    z-index: 1;
    border-radius: 12rpx;
    margin: 0 4rpx;
    
    &.active {
      background: linear-gradient(90deg, #2d8cf0, #3a5af9);
      box-shadow: 0 4rpx 10rpx rgba(58, 90, 249, 0.2);
      transform: translateY(-2rpx);
      
      .tab-text {
        color: #fff;
        font-weight: bold;
      }
    }
    
    .tab-text {
      font-size: 28rpx;
      color: #666;
    }
  }
}

.section {
  margin-bottom: 30rpx;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.08);
  }
  
  .section-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
    display: block;
    position: relative;
    padding-left: 24rpx;
    
    &:before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 8rpx;
      height: 32rpx;
      background: linear-gradient(180deg, #2d8cf0, #3a5af9);
      border-radius: 4rpx;
    }
  }
  
  &.active {
    border-left: 6rpx solid #3a5af9;
    padding-left: 24rpx;
  }
}

.text-input, .prompt-input {
  width: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  background-color: #f8f9fb;
  transition: all 0.3s;
  
  &:focus {
    border-color: #3a5af9;
    box-shadow: 0 0 0 2px rgba(58, 90, 249, 0.1);
    background-color: #fff;
  }
}

.text-input {
  height: 80rpx;
}

.prompt-input {
  height: 200rpx;
  
  &.lyrics-input {
    height: 300rpx;
  }
}

.prompt-counter {
  font-size: 24rpx;
  color: #999;
  text-align: right;
  margin-top: 10rpx;
  display: block;
  
  &.within-limit {
    color: #2d8cf0;
  }
  
  &.near-limit {
    color: #ff9900;
  }
  
  &.at-limit {
    color: #ff5252;
  }
}

.lyric-tips {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
  line-height: 1.4;
}

.checkbox-option {
  display: flex;
  align-items: center;
  background: #f8fafd;
  padding: 20rpx;
  border-radius: 12rpx;
  transition: all 0.3s ease;
  
  &:active {
    background: #eef1f5;
  }
  
  .checkbox-label {
    font-size: 28rpx;
    color: #333;
    margin-left: 20rpx;
  }
  
  /* Custom styles for the switch */
  switch {
    transform: scale(0.9);
  }
}

.continuation-slider {
  margin: 20rpx 0;
  height: 60rpx;
}

.continuation-time {
  font-size: 28rpx;
  color: #666;
  text-align: center;
  display: block;
}

.original-song {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-radius: 16rpx;
  background: linear-gradient(145deg, #f7f8fc, #eef1f7);
  box-shadow: 0 8rpx 20rpx rgba(45, 140, 240, 0.08);
  margin-top: 24rpx;
  position: relative;
  overflow: hidden;
  
  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 3rpx;
    background: linear-gradient(90deg, #2d8cf0, #3a5af9);
  }
  
  .original-title {
    font-size: 30rpx;
    color: #333;
    font-weight: bold;
  }
  
  .play-control {
    display: flex;
    align-items: center;
    background: transparent;
    padding: 12rpx 24rpx;
    border-radius: 50rpx;
    box-shadow: none;
    border: none;
    transition: all 0.2s ease;
    
    &:active {
      transform: scale(0.97);
      box-shadow: none;
    }
    
    .play-icon-img {
      width: 32rpx;
      height: 32rpx;
      margin-right: 10rpx;
    }
    
    .play-text {
      font-size: 24rpx;
      color: #2d8cf0;
      font-weight: 500;
    }
  }
}

.no-song-selected {
  padding: 40rpx 0;
  text-align: center;
  background: linear-gradient(145deg, #f7f8fc, #eef1f7);
  border-radius: 16rpx;
  box-shadow: inset 2rpx 2rpx 5rpx rgba(0, 0, 0, 0.03),
              inset -2rpx -2rpx 5rpx rgba(255, 255, 255, 0.3);
  margin-top: 24rpx;
  
  .no-song-text {
    font-size: 28rpx;
    color: #999;
  }
}

.action-section {
  margin: 40rpx 0;
  text-align: center;
}

.points-info {
  margin-bottom: 20rpx;
  
  .points-text {
    font-size: 26rpx;
    color: #666;
    background: #f0f5ff;
    border-radius: 50rpx;
    padding: 8rpx 24rpx;
    display: inline-block;
  }
}

.generate-btn {
  background: #4361ee;
  color: white;
  font-size: 32rpx;
  padding: 22rpx 0;
  border-radius: 12rpx;
  width: 80%;
  margin: 0 auto;
  border: none;
  font-weight: 600;
  letter-spacing: 1rpx;
  box-shadow: 0 4rpx 12rpx rgba(67, 97, 238, 0.2);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  
  &:active {
    transform: translateY(2rpx);
    background: #3b55d9;
    box-shadow: 0 2rpx 8rpx rgba(67, 97, 238, 0.15);
  }
  
  &:disabled {
    background: #d1d5db;
    color: #9ca3af;
    box-shadow: none;
  }
}

.player-section {
  margin: 40rpx 0;
}

.player-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 6rpx;
    background: linear-gradient(90deg, #2d8cf0, #3a5af9);
  }
}

.player-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  
  .player-title {
    font-size: 34rpx;
    font-weight: bold;
    color: #333;
  }
  
  .player-actions {
    display: flex;
    gap: 6rpx; /* 从16rpx减小到6rpx */
    
    .player-action-btn {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
      transition: all 0.2s ease;
      padding: 0;
      margin: 0 2rpx; /* 从10rpx减小到4rpx */
      outline: none !important;
      position: relative;
      
      /* 重置按钮在各平台的默认样式 */
      &::after {
        border: none !important;
        outline: none !important;
        display: none !important; /* 彻底移除小程序环境中按钮的默认边框 */
      }
      
      &:active {
        box-shadow: none !important;
        transform: scale(0.9);
      }
      
      .action-icon {
        width: 50rpx;
        height: 50rpx;
        transition: all 0.2s ease;
      }
      
      &:hover {
        background: transparent !important;
        
        .action-icon {
          transform: scale(1.1);
        }
      }
      
      // 移除微信特定样式
      &.share-btn {
        position: relative;
        
        .action-icon {
          width: 50rpx;
          height: 50rpx;
        }
      }
    }
  }
}

.music-info {
  margin-bottom: 30rpx;
  
  .music-prompt {
    font-size: 28rpx;
    color: #666;
    line-height: 1.5;
    margin-bottom: 16rpx;
    display: block;
  }
  
  .music-tags {
    font-size: 24rpx;
    color: #3a5af9;
    background-color: rgba(58, 90, 249, 0.1);
    padding: 8rpx 24rpx;
    border-radius: 30rpx;
    display: inline-block;
    font-weight: 500;
  }
}

.waveform {
  height: 140rpx;
  margin: 30rpx 0;
  display: flex;
  align-items: center;
  background: linear-gradient(145deg, #f8fafd, #eef1f5);
  border-radius: 16rpx;
  padding: 0 20rpx;
  box-shadow: inset 2rpx 2rpx 5rpx rgba(0, 0, 0, 0.05),
              inset -2rpx -2rpx 5rpx rgba(255, 255, 255, 0.5);
  overflow: hidden;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2rpx;
    background: linear-gradient(90deg, transparent, rgba(58, 90, 249, 0.4), transparent);
  }
  
  .wave-bars {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    
    .wave-bar {
      width: 8rpx;
      background: linear-gradient(180deg, #2d8cf0, #3a5af9);
      border-radius: 4rpx;
      transition: height 0.15s ease;
      
      @for $i from 1 through 5 {
        &:nth-child(#{$i}n) {
          transition-delay: #{$i * 0.02}s;
        }
      }
    }
  }
}

// Lyrics section styles
.lyrics-section {
  margin: 20rpx 0;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
  
  .lyrics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    
    .lyrics-title {
      font-size: 30rpx;
      font-weight: bold;
      color: #333;
    }
    
    .lyrics-actions {
      display: flex;
      gap: 16rpx;
      align-items: center;
      
      .lyrics-copy-action {
        display: flex;
        align-items: center;
        background: rgba(45, 140, 240, 0.1);
        padding: 6rpx 16rpx;
        border-radius: 30rpx;
        transition: all 0.2s ease;
        
        &:active {
          transform: scale(0.95);
          background: rgba(45, 140, 240, 0.2);
        }
        
        .copy-icon {
          width: 24rpx;
          height: 24rpx;
          margin-right: 8rpx;
        }
        
        .copy-text {
          font-size: 24rpx;
          color: #3a5af9;
          font-weight: 500;
        }
      }
      
      .lyrics-toggle {
        padding: 6rpx 16rpx;
        background: #f0f5ff;
        border-radius: 30rpx;
        transition: all 0.2s ease;
        
        &:active {
          transform: scale(0.95);
          background: rgba(58, 90, 249, 0.15);
        }
        
        .lyrics-toggle-text {
          font-size: 24rpx;
          color: #3a5af9;
        }
      }
    }
  }
  
  .lyrics-container {
    max-height: 400rpx;
    transition: background-color 0.3s ease;
    
    &.copy-success {
      background-color: rgba(45, 140, 240, 0.1);
    }
    
    .lyrics-text {
      font-size: 28rpx;
      color: #333;
      line-height: 1.8;
      white-space: pre-wrap;
      user-select: text;
      position: relative;
      padding: 10rpx 0;
      transition: all 0.3s ease;
      
      &:active {
        background-color: rgba(45, 140, 240, 0.1);
        border-radius: 8rpx;
      }
    }
  }
}

.lyrics-collapsed {
  margin: 20rpx 0 10rpx;
  padding: 16rpx;
  background: #f0f5ff;
  border-radius: 12rpx;
  text-align: center;
  
  .lyrics-toggle-text {
    font-size: 26rpx;
    color: #3a5af9;
    font-weight: 500;
  }
}

.player-controls {
  display: flex;
  align-items: center;
  margin-top: 30rpx;
  
  .play-control-group {
    display: flex;
    align-items: center;
    gap: 16rpx;
    
    .play-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 70rpx;
      height: 70rpx;
      border-radius: 50%;
      background: transparent;
      margin-right: 5rpx;
      box-shadow: none;
      border: none;
      
      .play-icon {
        width: 40rpx;
        height: 40rpx;
      }
    }
    
    .next-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50rpx;
      height: 50rpx;
      border-radius: 0;
      background: transparent;
      border: none;
      box-shadow: none;
      margin-left: 5rpx;
      
      .next-icon {
        font-size: 40rpx;
        color: #666;
        font-weight: bold;
      }
    }
  }
  
  .progress-slider {
    flex: 1;
  }
  
  .time-text {
    font-size: 24rpx;
    color: #999;
    margin-left: 20rpx;
    min-width: 120rpx;
  }
}

.regenerate-btn {
  background: #fff;
  color: #3a5af9;
  font-size: 32rpx;
  font-weight: bold;
  padding: 26rpx 0;
  border-radius: 100rpx;
  width: 80%;
  border: 1px solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  
  &:active {
    transform: translateY(2rpx);
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
  }
}

.history-section {
  margin-top: 50rpx;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  margin-bottom: 16rpx;
  border-radius: 12rpx;
  background: white;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  border-left: 4rpx solid transparent;
  
  &:hover, &:active {
    border-left-color: #3a5af9;
    transform: translateX(4rpx);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .history-image {
    margin-right: 20rpx;
    width: 100rpx;
    height: 100rpx;
    min-width: 100rpx; /* 添加最小宽度以防止压缩 */
    flex: 0 0 100rpx; /* 设置为不可伸缩且固定大小 */
    border-radius: 12rpx;
    overflow: hidden;
    
    .history-thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  
  .history-item-content {
    flex: 1;
    
    .history-title {
      font-size: 30rpx;
      color: #333;
      font-weight: 500;
      margin-bottom: 8rpx;
      display: block;
    }
    
    .history-date {
      font-size: 24rpx;
      color: #999;
      margin-bottom: 8rpx;
      display: block;
    }
    
    .history-prompt {
      font-size: 26rpx;
      color: #666;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 600rpx;
    }
  }
}

.load-more {
  text-align: center;
  margin-top: 30rpx;
  
  .load-more-btn {
    background-color: transparent;
    border: 1px solid #ddd;
    color: #666;
    font-size: 28rpx;
    padding: 16rpx 40rpx;
    border-radius: 100rpx;
    transition: all 0.2s ease;
    
    &:hover {
      background-color: #f0f5ff;
      border-color: #3a5af9;
      color: #3a5af9;
    }
    
    &:disabled {
      color: #999;
    }
  }
}

.mode-container {
  animation: fade-in 0.3s ease-in-out;
  
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(20rpx);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4rpx); }
}

// Chat controls (first red rectangle)
.chat-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin: 0 10rpx;
  position: absolute;
  right: 20rpx;
  top: 20rpx;
  
  .control-btn {
    width: 60rpx;
    height: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    transition: all 0.2s ease;
    
    &:active {
      background: transparent;
      transform: scale(0.9);
      box-shadow: none;
    }
    
    .control-icon {
      font-size: 40rpx;
      color: #666;
    }
  }
}

// Play controls group (second red rectangle)
.play-control-group {
  display: flex;
  align-items: center;
  gap: 16rpx;
  
  .play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 70rpx;
    height: 70rpx;
    border-radius: 50%;
    background: transparent;
    margin-right: 5rpx;
    box-shadow: none;
    border: none;
    
    .play-icon {
      width: 40rpx;
      height: 40rpx;
    }
  }
  
  .next-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50rpx;
    height: 50rpx;
    border-radius: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    margin-left: 5rpx;
    
    .next-icon {
      font-size: 40rpx;
      color: #666;
      font-weight: bold;
    }
  }
}

// Regenerate button (third red rectangle)
.regenerate-btn {
  background: #fff;
  color: #3a5af9;
  font-size: 32rpx;
  font-weight: bold;
  padding: 26rpx 0;
  border-radius: 100rpx;
  width: 80%;
  border: 1px solid #e0e0e0;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  
  &:active {
    transform: translateY(2rpx);
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
  }
}

// Cover image
.cover-image-container {
  margin-bottom: 20rpx;
  position: relative;
  border-radius: 16rpx;
  overflow: hidden;
  
  .cover-image {
    width: 100%;
    height: 360rpx;
    border-radius: 12rpx;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  .cover-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
    
    &.visible {
      opacity: 1;
    }
    
    .cover-play-btn {
      width: 100rpx;
      height: 100rpx;
      background: transparent;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: scale(0.8);
      transition: transform 0.3s ease;
      border: none;
      box-shadow: none;
      
      .cover-play-icon {
        width: 40rpx;
        height: 40rpx;
      }
    }
  }
  
  &:active {
    .cover-overlay {
      opacity: 1;
    }
    
    .cover-play-btn {
      transform: scale(1);
    }
    
    .cover-image {
      transform: scale(1.05);
    }
  }
}

// History badges
.history-badges {
  margin-top: 8rpx;
  display: flex;
  gap: 10rpx;
  
  .history-badge {
    font-size: 20rpx;
    padding: 4rpx 12rpx;
    background: rgba(58, 90, 249, 0.1);
    color: #3a5af9;
    border-radius: 20rpx;
    
    &.songs-badge {
      background: rgba(67, 97, 238, 0.15);
      color: #4361ee;
    }
  }
}

// Songs tabs
.songs-tabs {
  display: flex;
  background: #f5f7fa;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  padding: 4rpx;
  
  .song-tab {
    flex: 1;
    text-align: center;
    padding: 20rpx 0;
    transition: all 0.3s;
    position: relative;
    z-index: 1;
    border-radius: 12rpx;
    margin: 0 4rpx;
    
    &.active {
      background: linear-gradient(90deg, #2d8cf0, #3a5af9);
      box-shadow: 0 4rpx 10rpx rgba(58, 90, 249, 0.2);
      transform: translateY(-2rpx);
      
      .song-tab-text {
        color: #fff;
        font-weight: bold;
      }
    }
    
    .song-tab-text {
      font-size: 28rpx;
      color: #666;
    }
  }
}

.song-picker {
  width: 100%;
  height: 94rpx;
  border: none;
  border-radius: 20rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: #f7f8fc;
  transition: all 0.3s ease;
  box-shadow: 0 8rpx 20rpx rgba(45, 140, 240, 0.08);
  position: relative;
  overflow: hidden;
  
  &:active, &:focus {
    background: #ffffff;
    box-shadow: 0 10rpx 24rpx rgba(58, 90, 249, 0.15);
    transform: translateY(-2rpx);
  }
  
  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 6rpx;
    background: linear-gradient(180deg, #2d8cf0, #3a5af9);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:active:before {
    opacity: 1;
  }
  
  &[disabled] {
    opacity: 0.6;
    background-color: #f0f2f5;
    box-shadow: none;
    
    .picker-arrow {
      background: rgba(0, 0, 0, 0.05);
      color: #999;
    }
    
    &:after {
      display: none;
    }
  }
}

.picker-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 10rpx;
  
  &:active .picker-arrow {
    transform: rotate(180deg);
    background: rgba(58, 90, 249, 0.2);
  }
}

.selected-song-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.picker-value {
  flex: 1;
  color: #333;
  font-size: 28rpx;
  font-weight: 500;
  padding: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.selected-indicator {
  font-size: 20rpx;
  color: #2d8cf0;
  margin-top: 6rpx;
  background: rgba(45, 140, 240, 0.1);
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  display: inline-block;
  width: fit-content;
  line-height: 1.2;
  opacity: 0.9;
  max-width: 120rpx;
  box-shadow: 0 2rpx 6rpx rgba(45, 140, 240, 0.15);
}

.picker-arrow {
  font-size: 20rpx;
  color: #ffffff;
  margin-left: 16rpx;
  background: linear-gradient(45deg, #2d8cf0, #3a5af9);
  width: 48rpx;
  height: 48rpx;
  min-width: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
  transform-origin: center;
  box-shadow: 0 4rpx 10rpx rgba(58, 90, 249, 0.2);
}

.play-icon-img {
  width: 40rpx;
  height: 40rpx;
}

.play-text {
  font-size: 24rpx;
  color: #3a5af9;
  font-weight: 500;
}

.slider-time-display {
  display: flex;
  justify-content: space-between;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #999;
}

.time-text.current-time, .time-text.total-time {
  min-width: 120rpx;
}

.picker-header {
  display: flex;
  align-items: center;
  width: 100%;
}

.picker-placeholder {
  color: #a0a0a0;
  font-size: 28rpx;
}

.picker-hint {
  font-size: 22rpx;
  color: #a0a0a0;
  margin-top: 6rpx;
  opacity: 0.8;
}

/* 增强滑块样式 */
.continuation-slider .uni-slider-handle {
  width: 36rpx;
  height: 36rpx;
  background-color: #2d8cf0;
  border-radius: 50%;
  box-shadow: 0 4rpx 8rpx rgba(45, 140, 240, 0.3);
  transition: transform 0.2s;
}

.continuation-slider .uni-slider-handle:active {
  transform: scale(1.1);
}

/* 移除进度条相关样式 */
.generation-progress-container {
  margin-top: 20rpx;
  padding: 0 20rpx;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.generation-progress-bar {
  height: 12rpx;
  background-color: #f0f2f5;
  border-radius: 10rpx;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.generation-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2d8cf0, #3a5af9);
  border-radius: 10rpx;
  transition: width 0.5s ease;
  position: relative;
  overflow: hidden;
}

.generation-progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.generation-progress-text {
  font-size: 24rpx;
  color: #666;
  margin-top: 10rpx;
  text-align: center;
  display: block;
}

.pulse {
  animation: pulse-animation 1.5s infinite;
  position: relative;
}

@keyframes pulse-animation {
  0% {
    box-shadow: 0 0 0 0 rgba(67, 97, 238, 0.7);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(67, 97, 238, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(67, 97, 238, 0);
  }
}

// 新增：自定义分享图标样式（如果没有图片资源）
.share-icon-fallback {
  width: 32rpx;
  height: 32rpx;
  position: relative;
  background: #07c160;
  border-radius: 6rpx;
  
  &:before, &:after {
    content: '';
    position: absolute;
    background: white;
  }
  
  &:before {
    // 用于绘制微信Logo的对话气泡
    width: 20rpx;
    height: 16rpx;
    border-radius: 4rpx;
    top: 4rpx;
    left: 6rpx;
  }
  
  &:after {
    // 用于绘制微信Logo的小尾巴
    width: 6rpx;
    height: 6rpx;
    transform: rotate(45deg);
    bottom: 8rpx;
    left: 4rpx;
    background: #07c160;
    border-right: 4rpx solid white;
    border-bottom: 4rpx solid white;
  }
  
  .share-arrow {
    position: absolute;
    width: 10rpx;
    height: 2rpx;
    background: white;
    bottom: 10rpx;
    right: 6rpx;
    
    &:before, &:after {
      content: '';
      position: absolute;
      width: 6rpx;
      height: 2rpx;
      background: white;
      right: -2rpx;
    }
    
    &:before {
      transform: rotate(45deg);
      bottom: 2rpx;
    }
    
    &:after {
      transform: rotate(-45deg);
      bottom: -2rpx;
    }
  }
}


</style> 