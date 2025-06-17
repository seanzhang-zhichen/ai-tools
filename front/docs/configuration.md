# 项目配置系统架构

## 概述

本项目采用一套灵活的配置系统，用于管理不同环境下的API地址、WebSocket连接、资源路径等配置参数。配置系统设计考虑了以下几个方面：

- **环境隔离**: 开发、测试、生产环境使用不同的配置
- **易访问性**: 在项目任何位置都可以方便地获取配置
- **类型安全**: 配置项有明确的结构，减少错误
- **便于维护**: 集中管理配置，减少重复代码

## 配置系统架构

![配置系统架构](../static/docs/config-system.png)

配置系统由以下几个部分组成：

1. **环境配置对象** (`config/index.js`): 包含各环境的具体配置参数
2. **环境切换机制** (`config/env.js`): 控制当前使用的环境配置
3. **访问工具函数** (`config/config.js`): 提供便捷的配置访问方法
4. **Vue集成层**: 将配置注入Vue实例，便于在组件中使用

## 关键配置项

项目中定义了以下关键配置项：

- **API相关**:
  - `apiBaseUrl`: 后端API基础地址
  - `baseApiWsUrl`: WebSocket连接地址
  - `uploadUrl`: 文件上传接口地址

- **资源相关**:
  - `staticUrl`: 静态资源CDN基础路径

- **应用设置**:
  - `debug`: 是否开启调试模式
  - `timeout`: API请求超时设置
  - `version`: 应用版本号

## 典型使用场景

### API请求

```javascript
// 使用配置中的API基础URL和超时设置
const apiUrl = this.$baseApiUrl + '/users';
const timeout = this.$getConfig('timeout');

uni.request({
  url: apiUrl,
  timeout: timeout,
  // ...其他选项
});
```

### WebSocket连接

```javascript
// 使用配置中的WebSocket URL
connectToChat() {
  const wsUrl = this.$baseApiWsUrl + '/chat';
  
  uni.connectSocket({
    url: wsUrl,
    // ...其他选项
  });
}
```

### 静态资源加载

```javascript
// 在模板中使用
<image :src="staticUrl + '/images/logo.png'"></image>

// 在脚本中
export default {
  computed: {
    staticUrl() {
      return this.$getConfig('staticUrl');
    }
  }
}
```

## 配置管理最佳实践

1. **不要在代码中硬编码URL**:
   ```javascript
   // 错误方式
   const url = 'https://api.example.com/users';
   
   // 正确方式
   const url = this.$baseApiUrl + '/users';
   ```

2. **利用多环境配置进行测试**:
   ```javascript
   // config/env.js
   export const CURRENT_ENV = 'testing';
   export const FORCE_ENV = true;
   ```

3. **添加新配置项时的步骤**:
   - 在所有环境配置中添加该项
   - 考虑是否需要为其添加便捷访问方法
   - 更新文档

4. **处理环境特定逻辑**:
   ```javascript
   if (this.$getConfig('debug')) {
     console.log('调试信息...');
   }
   ```

## 维护与更新

当需要为项目添加新的环境或配置项时，请确保：

1. 在所有环境配置中都添加该配置项
2. 更新相关文档
3. 如果必要，为新配置项添加便捷访问方法
4. 通知团队成员关于配置的变更

详细的配置系统使用指南，请参考 [配置系统文档](../config/README.md)。 