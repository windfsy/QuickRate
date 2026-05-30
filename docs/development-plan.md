# QuickRate 开发计划

## 一、项目目标
开发一款 Chrome 浏览器扩展，实现：
1. 自动识别网页中的金额数字
2. 实时转换为目标货币
3. 无感替换原金额显示
4. 提供简洁的配置界面

## 二、技术选型

### 核心决策
| 维度 | 选择 | 理由 |
|------|------|------|
| 扩展规范 | Manifest V3 | Chrome 强制要求，2024年起不再支持 V2 |
| 前端框架 | 原生 JS | 轻量、无依赖、性能最优 |
| 构建工具 | Webpack 5 | 模块化打包、代码分割、开发体验好 |
| CSS 方案 | 原生 CSS | 简单场景无需预处理器 |
| 汇率 API | Frankfurter | 免费、无需 API key、数据可靠 |
| 测试框架 | Jest + Puppeteer | 单元测试 + E2E 测试覆盖 |

### 备选方案对比
- **Vite vs Webpack**: Vite 更快，但 Webpack 生态更成熟，扩展打包支持更好
- **Vue/React vs 原生 JS**: 框架增加包体积，扩展场景收益不大
- **Sass/Less vs CSS**: 变量和嵌套有用，但增加构建复杂度

## 三、模块设计

### 3.1 金额识别模块 (detector.js)
**职责**: 从 DOM 文本节点中识别金额数字

**识别规则**:
```
支持格式:
- 符号前置: $100, €100, ¥100, £100
- 符号后置: 100 USD, 100 EUR, 100 CNY
- 带千位分隔符: $1,000.00, €1.000,00
- 带空格: $ 100, 100 $
- 负数: -$100, $-100, ($100)

排除规则:
- 年份: 2024, 1999
- 电话: 13800138000
- 百分比: 100%
- 纯数字ID: 订单号、编号等
```

**接口设计**:
```javascript
// 检测文本中的金额
detectAmounts(text: string): AmountMatch[]

// AmountMatch 结构
{
  raw: string,        // 原始匹配文本
  value: number,      // 解析后的数值
  currency: string,   // 货币代码 (USD, EUR, CNY...)
  start: number,      // 在原文本中的起始位置
  end: number         // 在原文本中的结束位置
}
```

### 3.2 汇率 API 模块 (api.js)
**职责**: 封装 Frankfurter API 调用

**API 端点**:
```
GET https://api.frankfurter.app/latest?from=USD&to=CNY
GET https://api.frankfurter.app/currencies  // 获取支持的货币列表
```

**接口设计**:
```javascript
// 获取汇率
getExchangeRate(from: string, to: string): Promise<RateData>

// RateData 结构
{
  from: string,
  to: string,
  rate: number,
  timestamp: number,
  cached: boolean
}
```

**缓存策略**:
- 缓存键: `${from}_${to}`
- 缓存时间: 1 小时 (可配置)
- 存储位置: Chrome Storage Local
- 离线降级: 使用缓存数据，显示"离线汇率"提示

### 3.3 金额转换模块 (converter.js)
**职责**: 将识别的金额转换为目标货币

**接口设计**:
```javascript
// 转换金额
convertAmount(value: number, from: string, to: string): Promise<ConversionResult>

// ConversionResult 结构
{
  original: number,
  converted: number,
  from: string,
  to: string,
  rate: number,
  formatted: string  // 格式化后的字符串 "¥720.50"
}
```

**格式化规则**:
- 保留原始精度 (通常2位小数)
- 使用目标货币的标准符号
- 考虑千位分隔符习惯

### 3.4 DOM 替换模块 (replacer.js)
**职责**: 安全地替换网页中的金额显示

**核心算法**:
```
1. 使用 TreeWalker 遍历文本节点
2. 对每个文本节点调用 detectAmounts()
3. 如果检测到金额，创建 DocumentFragment
4. 用 <span> 包裹金额，添加 data 属性
5. 替换原始文本节点
```

**安全考虑**:
- 不替换 <script>, <style>, <code> 等标签内容
- 不替换已处理过的节点 (添加标记)
- 不替换用户正在编辑的输入框
- 保持原始事件绑定不变

**动态内容处理**:
```javascript
// MutationObserver 监听 DOM 变化
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => processNode(node))
  })
})
```

### 3.5 弹出窗口 (popup)
**职责**: 提供用户配置界面

**UI 布局**:
```
┌─────────────────────────────┐
│  QuickRate          [设置]  │
├─────────────────────────────┤
│  源货币: [USD ▼]           │
│  目标货币: [CNY ▼]         │
├─────────────────────────────┤
│  当前汇率: 1 USD = 7.20 CNY│
│  更新时间: 10:30            │
├─────────────────────────────┤
│  [启用转换]  [ ] 显示原金额 │
├─────────────────────────────┤
│  状态: 已转换 12 个金额     │
└─────────────────────────────┘
```

**功能**:
- 源/目标货币选择 (下拉列表)
- 实时汇率显示
- 启用/禁用转换开关
- 显示原金额选项 (悬浮显示原文)
- 当前页面转换统计

## 四、开发阶段

### 阶段 1: 项目初始化 (Day 1)
**目标**: 搭建开发环境，创建最小可运行扩展

**任务**:
1. 初始化 npm 项目，安装依赖
2. 配置 Webpack (多入口: popup, content, background)
3. 创建 manifest.json
4. 实现最小弹出窗口 (仅显示 "Hello QuickRate")
5. 配置开发脚本 (watch 模式)

**产出**: 可加载到 Chrome 的空白扩展

### 阶段 2: 核心功能 (Day 2-4)
**目标**: 实现金额识别和转换

**任务**:
1. 实现 amount-detector.js
   - 编写正则表达式
   - 处理各种货币格式
   - 单元测试覆盖
2. 实现 frankfurter-api.js
   - API 调用封装
   - 缓存逻辑
   - 错误处理
3. 实现 currency-converter.js
   - 转换逻辑
   - 格式化输出
4. 集成测试 (Node.js 环境)

**产出**: 命令行可用的转换工具

### 阶段 3: DOM 替换 (Day 5-6)
**目标**: 实现网页内容替换

**任务**:
1. 实现 dom-replacer.js
   - TreeWalker 遍历
   - 安全替换逻辑
   - 标记已处理节点
2. 实现 MutationObserver 监听
3. 集成到内容脚本
4. 测试各种网页场景

**产出**: 扩展可替换静态页面金额

### 阶段 4: 用户界面 (Day 7-8)
**目标**: 完善配置界面

**任务**:
1. 设计 popup.html 布局
2. 实现 popup.css 样式
3. 实现 popup.js 交互逻辑
4. 实现配置存储 (chrome.storage)
5. 实现状态同步 (popup ↔ content ↔ background)

**产出**: 功能完整的配置界面

### 阶段 5: 优化完善 (Day 9-10)
**目标**: 性能优化和边界处理

**任务**:
1. 性能优化
   - 防抖处理 (滚动、输入)
   - 批量处理 (requestIdleCallback)
   - 增量更新 (只处理变化的节点)
2. 错误处理
   - 网络错误重试
   - API 限制处理
   - 优雅降级
3. 边界情况
   - 动态加载内容 (SPA)
   - iframe 处理
   - 大量金额页面

**产出**: 稳定可靠的扩展

### 阶段 6: 测试发布 (Day 11-12)
**目标**: 测试和发布准备

**任务**:
1. 编写单元测试 (Jest)
2. 编写 E2E 测试 (Puppeteer)
3. 性能测试 (大型页面)
4. 打包构建
5. 准备发布材料
   - 扩展图标 (16x16, 48x48, 128x128)
   - 详细描述
   - 截图

**产出**: 可发布的扩展包

## 五、风险和应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 金额识别误判 | 用户体验差 | 严格排除规则 + 用户反馈机制 |
| 动态内容漏替换 | 功能不完整 | MutationObserver + 定期扫描 |
| API 限流/不可用 | 功能中断 | 缓存 + 离线模式 + 重试机制 |
| CSP 限制 | 功能受限 | 合理配置 manifest 权限 |
| 性能影响 | 用户投诉 | 节流 + 增量处理 + 性能监控 |

## 六、后续扩展

### 6.1 功能扩展
- 支持更多 API (CoinGecko 加密货币)
- 历史汇率图表
- 批量转换 (表格场景)
- 快捷键支持

### 6.2 平台扩展
- Firefox 扩展 (WebExtensions API 兼容)
- Edge 扩展 (Chromium 内核，基本兼容)

### 6.3 高级功能
- 智能识别 (机器学习模型)
- 自定义规则 (正则表达式)
- 导出转换记录
- 多语言支持

## 七、依赖清单

### 开发依赖
```json
{
  "webpack": "^5.88.0",
  "webpack-cli": "^5.1.0",
  "copy-webpack-plugin": "^11.0.0",
  "html-webpack-plugin": "^5.5.0",
  "css-loader": "^6.8.0",
  "style-loader": "^3.3.0",
  "jest": "^29.6.0",
  "puppeteer": "^21.0.0",
  "eslint": "^8.45.0"
}
```

### 生产依赖
无 (原生 JS，零依赖)

## 八、验收标准

### 功能验收
- [ ] 识别常见货币格式 ($, €, ¥, £, USD, EUR, CNY)
- [ ] 正确转换金额 (精度保留2位小数)
- [ ] 替换网页显示 (静态 + 动态内容)
- [ ] 配置界面可用 (货币选择、开关)
- [ ] 汇率缓存正常 (1小时有效期)

### 性能验收
- [ ] 首次加载 < 100ms
- [ ] 页面处理 < 500ms (1000个文本节点)
- [ ] 内存占用 < 50MB
- [ ] 无明显卡顿 (滚动、输入)

### 兼容性验收
- [ ] Chrome 110+
- [ ] Edge 110+ (Chromium 内核)
- [ ] 常见网站 (淘宝、Amazon、GitHub)