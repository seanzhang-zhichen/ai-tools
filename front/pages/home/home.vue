<template>
  <view class="home-container">
    <!-- Header Section -->
    <view class="home-header">
      <text class="header-title">AI工具箱</text>
      <text class="header-subtitle">智能工具，一触即达</text>
    </view>

    <!-- 九宫格布局 -->
    <view class="grid-container">
      <view
        v-for="(tool, toolIndex) in tools"
        :key="toolIndex"
        class="grid-item"
        @click="goToTool(tool.path)"
        :style="{ animationDelay: toolIndex * 0.05 + 's' }"
      >
        <view class="grid-item-content">
          <view class="tool-icon-container">
            <image class="tool-icon" :src="tool.icon" mode="aspectFit"></image>
          </view>
          <text class="tool-name">{{ tool.name }}</text>
          <text class="tool-description">{{ tool.description }}</text>
        </view>
      </view>
    </view>

    <!-- Footer -->
    <view class="footer">
      <text class="footer-text">探索更多智能体验</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    const tools = [
      // 移除聊天机器人
      // {
      //   path: '/pages/chatbot/chatbot',
      //   icon: 'https://cdnp.52ace.cn/%E5%89%8D%E7%AB%AF%E8%B5%84%E6%BA%90/chatbot-icon.png',
      //   name: '智能聊天机器人',
      //   description: '随时随地，智能对话'
      // },
      {
        path: "/pages/music-generator/music-generator",
        icon: "/static/music-generator.png",
        name: "AI音乐生成",
        description: "创作独特的音乐旋律",
      },
      {
        path: "/pages/visual-processor/visual-processor",
        icon: "/static/delete_remark.png",
        name: "图片去水印",
        description: "一键去除图片水印",
      },
      {
        path: "/pages/image-enhancer/image-enhancer",
        icon: "/static/hd.png",
        name: "图片清晰化",
        description: "一键提升图片清晰度",
      },
      {
        path: "/pages/id-photo/id-photo",
        icon: "/static/id-photo.png",
        name: "AI证件照",
        description: "智能生成标准证件照，支持各种尺寸",
      },
      {
        path: "/pages/image-colorization/image-colorization",
        icon: "/static/colorize.png",
        name: "照片上色",
        description: "AI让黑白照片重获生机",
      },
      {
        path: "/pages/image-segmentation/image-segmentation",
        icon: "/static/segment.png",
        name: "智能抠图",
        description: "AI智能识别前景，一键抠图",
      },
      {
        path: "/pages/name-generator/name-generator",
        icon: "/static/name-generator.png",
        name: "AI宝宝取名",
        description: "为宝宝创造有寓意的好名字",
      },
      {
        path: "/pages/pdf-watermark/pdf-watermark",
        icon: "/static/pdf-watermark.png",
        name: "PDF去水印",
        description: "一键去除PDF水印",
      },
      // {
      //   path: "/pages/background/background",
      //   icon: "/static/background.png",
      //   name: "图片添加背景",
      //   description: "AI智能为图片添加自然美观背景",
      // },
      // 下面可以继续添加更多工具，直到9个
    ];
    return {
      tools,
    };
  },
  // 添加分享功能
  onShareAppMessage() {
    return {
      title: "AI 实用宝 - 智能工具，一触即达",
      path: "/pages/home/home",
      imageUrl: "/static/share-home.png", // 可以使用一张首页展示的图片作为分享封面
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
  methods: {
    goToTool(path) {
      // Check if the path is a tabBar page
      if (path === "/pages/my/my") {
        uni.switchTab({
          url: path,
        });
      } else {
        uni.navigateTo({
          url: path,
        });
      }
    },
  },
};
</script>

<style>
.home-container {
  padding: 30rpx;
  background-color: #f9fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header Styles */
.home-header {
  margin-bottom: 40rpx;
  padding: 10rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  letter-spacing: 2rpx;
}

.header-subtitle {
  font-size: 28rpx;
  color: #666;
  letter-spacing: 1rpx;
}

/* 九宫格布局 */
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 三列等宽 */
  grid-template-rows: repeat(3, 1fr); /* 三行等高 */
  gap: 20rpx;
  width: 100%;
}

.grid-item {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* 使元素成为正方形 */
  border-radius: 20rpx; /* 稍微增大圆角 */
  background-color: #fff;
  box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
  animation: fadeIn 0.5s ease forwards;
  opacity: 0;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.grid-item-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.grid-item:active {
  transform: scale(0.95);
  background-color: #f8f9fa;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
}

.tool-icon-container {
  width: 90rpx;
  height: 90rpx;
  border-radius: 50%; /* 改为圆形 */
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f0f4ff 0%, #e6eeff 100%);
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06); /* 添加轻微阴影增强立体感 */
}

.tool-icon {
  width: 90rpx;
  height: 90rpx;
  object-fit: cover;
  border-radius: 50%;
}

.tool-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 10rpx;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-description {
  font-size: 20rpx;
  color: #666;
  text-align: center;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  width: 100%;
  height: 52rpx;
}

/* Footer */
.footer {
  margin-top: auto;
  padding: 30rpx 0;
  text-align: center;
}

.footer-text {
  font-size: 24rpx;
  color: #999;
}
</style>
