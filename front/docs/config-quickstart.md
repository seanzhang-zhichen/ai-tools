# 配置系统快速入门

## 1. 基础配置

在项目中使用配置系统，首先需要了解几个核心概念：

- **环境**: 开发(development)、测试(testing)、生产(production)
- **配置项**: 如API地址、WebSocket地址、调试标志等
- **访问方式**: 在Vue组件中或普通JS文件中获取配置的方法

## 2. 快速使用

### 在Vue组件中获取配置

```javascript
export default {
  methods: {
    example() {
      // 获取API地址
      const apiUrl = this.$baseApiUrl;
      
      // 获取WebSocket地址
      const wsUrl = this.$baseApiWsUrl;
      
      // 获取其他配置项
      const timeout = this.$getConfig('timeout');
      const isDebug = this.$getConfig('debug');
      
      // 使用配置...
    }
  }
}
```

### 在普通JS文件中获取配置

```javascript
import { getConfig, getApiBaseUrl, getWsBaseUrl } from '@/config/config';

// 获取API地址
const apiUrl = getApiBaseUrl();

// 获取WebSocket地址
const wsUrl = getWsBaseUrl();

// 获取其他配置项
const timeout = getConfig('timeout');
const isDebug = getConfig('debug');

// 使用配置...
```

## 3. 修改环境

### 切换当前环境

编辑 `front/config/env.js` 文件:

```javascript
// 切换到测试环境
export const CURRENT_ENV = 'testing';

// 强制使用指定环境（即使在生产构建中）
export const FORCE_ENV = true;
```

### 修改环境配置

编辑 `front/config/index.js` 文件中的相应环境对象:

```javascript
// 修改开发环境配置
const development = {
  apiBaseUrl: 'http://new-dev-server:8000/api',
  baseApiWsUrl: 'ws://new-dev-server:8000',
  // 其他配置...
};
```

## 4. 添加新配置项

假设需要添加一个新的配置项 `maxRetryCount`：

### 步骤1: 添加到环境配置

编辑 `front/config/index.js`:

```javascript
const development = {
  // 现有配置...
  maxRetryCount: 3
};

const production = {
  // 现有配置...
  maxRetryCount: 5
};

const testing = {
  // 现有配置...
  maxRetryCount: 3
};
```

### 步骤2: 添加便捷访问方法（可选）

编辑 `front/config/config.js`:

```javascript
export function getMaxRetryCount() {
  return getConfig('maxRetryCount');
}

// 更新默认导出
export default {
  // 现有方法...
  getMaxRetryCount
}
```

### 步骤3: 添加到Vue原型（可选）

编辑 `front/main.js`:

```javascript
// Vue 2
Vue.prototype.$getMaxRetryCount = configUtils.getMaxRetryCount;

// Vue 3
app.config.globalProperties.$getMaxRetryCount = configUtils.getMaxRetryCount;
```

## 5. 配置相关文件

- `front/config/index.js` - 环境配置定义
- `front/config/config.js` - 工具函数
- `front/config/env.js` - 环境切换
- `front/config/README.md` - 详细文档

## 6. 排错指南

- **配置不生效**: 确认环境设置正确，检查 `env.js` 中的设置
- **找不到配置项**: 确认配置项名称拼写正确，检查相应环境配置中是否有该项
- **Vue组件中无法访问**: 检查是否正确使用 `this.$xxx` 语法
- **非Vue文件无法导入**: 检查导入路径是否正确

更多详细信息，请参阅 [完整配置文档](../config/README.md) 和 [配置系统架构](configuration.md)。 