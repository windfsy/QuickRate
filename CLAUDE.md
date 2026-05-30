# QuickRate 浏览器扩展开发规范

## 项目概述
QuickRate 是一款 Chrome 内核浏览器扩展，自动识别网页中的金额数字并换算为目标货币单位，提供无感浏览体验。

## 技术栈
- **扩展规范**: Chrome Manifest V3
- **前端**: HTML + CSS + JavaScript (原生，保持轻量)
- **构建工具**: Webpack 5 (模块打包 + 代码分割)
- **汇率 API**: Frankfurter API (https://api.frankfurter.app)
- **存储**: Chrome Storage API
- **测试**: Jest (单元测试) + Puppeteer (E2E 测试)

## 项目结构约定
```
QuickRate_Extention/
├── src/                    # 源代码
│   ├── manifest.json       # 扩展清单文件
│   ├── content/            # 内容脚本 (网页注入)
│   │   ├── detector.js     # 金额识别模块
│   │   ├── converter.js    # 金额转换模块
│   │   └── replacer.js     # DOM 替换模块
│   ├── background/         # 后台服务
│   │   ├── service-worker.js # 主服务工作者
│   │   └── api.js          # 汇率 API 封装
│   ├── popup/              # 弹出窗口 GUI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── options/            # 设置页面 (可选)
│   │   ├── options.html
│   │   ├── options.css
│   │   └── options.js
│   ├── shared/             # 共享工具
│   │   ├── constants.js    # 常量定义
│   │   ├── storage.js      # 存储封装
│   │   └── utils.js        # 工具函数
│   └── styles/             # 共享样式
│       └── common.css
├── public/                 # 静态资源
│   ├── icons/              # 扩展图标
│   └── _locales/           # 国际化文件
├── tests/                  # 测试文件
│   ├── unit/               # 单元测试
│   └── e2e/                # 端到端测试
├── dist/                   # 构建输出 (gitignore)
├── webpack.config.js       # Webpack 配置
├── package.json
└── CLAUDE.md               # 本文件
```

## 命名规范
- 文件名: kebab-case (如 `api.js`, `popup.html`)
- 变量/函数: camelCase (如 `convertCurrency`, `exchangeRate`)
- 常量: UPPER_SNAKE_CASE (如 `DEFAULT_CURRENCY`, `API_BASE_URL`)
- CSS 类: BEM 命名 (如 `.popup__header`, `.currency-select--active`)

## 开发阶段

### 阶段 1: 基础架构 (1-2天)
1. 初始化项目结构
2. 配置 Webpack 构建流程
3. 创建 manifest.json 基础配置
4. 实现最小可运行扩展 (仅弹出窗口)

### 阶段 2: 核心功能 (3-4天)
1. 金额识别模块 (正则表达式匹配多种货币格式)
2. 汇率 API 封装 (Frankfurter API 调用)
3. 金额转换逻辑
4. DOM 替换模块 (安全替换网页内容)

### 阶段 3: 用户界面 (2-3天)
1. 弹出窗口设计 (源货币/目标货币选择)
2. 实时汇率显示
3. 配置保存/读取
4. 状态指示器 (转换中/完成/错误)

### 阶段 4: 优化完善 (2-3天)
1. 性能优化 (防抖、节流、缓存)
2. 错误处理 (网络错误、API 限制)
3. 边界情况处理 (动态内容、SPA 应用)
4. 用户体验优化 (动画、反馈)

### 阶段 5: 测试发布 (1-2天)
1. 单元测试编写
2. E2E 测试
3. 打包构建
4. 发布准备 (图标、描述、截图)

## 关键技术决策

### 金额识别策略
- 使用正则表达式匹配常见货币格式
- 支持格式: $100, €100, ¥100, 100 USD, 100.00
- 考虑千位分隔符 (1,000.00) 和不同小数点格式
- 排除明显非金额的数字 (年份、电话号码等)

### DOM 替换策略
- 使用 TreeWalker 遍历文本节点
- 避免替换已在处理中的节点 (MutationObserver)
- 保持原始 DOM 结构和事件绑定
- 支持动态加载内容 (MutationObserver 监听)

### 汇率缓存策略
- 缓存汇率数据到 Chrome Storage
- 缓存有效期: 1小时 (可配置)
- 离线时使用缓存数据
- 后台定期更新汇率

## 质量要求
- 所有公共函数必须添加 JSDoc 注释
- 关键逻辑必须有单元测试
- 代码提交前必须通过 ESLint 检查
- 构建后必须测试扩展基本功能

## 开发流程
- **频繁提交**: 每完成一个功能或代码片段后执行 git commit，确保开发可控
- 提交信息格式: `feat: 功能描述` / `fix: 修复描述` / `refactor: 重构描述`
- 每个提交应保持可运行状态，避免提交半成品代码

## 注意事项
- Chrome 扩展安全策略 (CSP) 限制
- 跨域请求需要在 manifest.json 中声明权限
- 避免使用 eval() 和 innerHTML (安全风险)
- 考虑扩展对页面性能的影响