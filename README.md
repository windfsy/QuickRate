# QuickRate - 智能货币转换浏览器扩展

<div align="center">

![QuickRate Logo](public/icons/icon128.png)

**自动识别网页金额，实时转换为目标货币**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)]()

</div>

## ✨ 功能特性

- 🔍 **智能识别** - 自动识别网页中的金额数字，支持多种货币格式
- 💱 **实时转换** - 使用 Frankfurter API 获取实时汇率
- 🎯 **精准替换** - 无感替换原金额显示，保持页面布局
- ⚡ **高性能** - 防抖、节流、缓存优化，不影响页面性能
- 🎨 **简洁界面** - 现代化弹出窗口，轻松配置
- 🔄 **动态支持** - MutationObserver 监听动态内容变化
- 💾 **智能缓存** - 1小时汇率缓存，离线也能用

## 🚀 支持的货币格式

| 格式 | 示例 |
|------|------|
| 符号前置 | $100, €1,000.50, ¥100 |
| 符号后置 | 100$, 1,000€ |
| 代码后置 | 100 USD, 1,000 EUR |
| 代码前置 | USD 100, EUR 1,000 |
| 千位分隔符 | $1,234.56, €1.234,56 |

## 📦 支持的货币

| 货币 | 代码 | 符号 |
|------|------|------|
| 美元 | USD | $ |
| 欧元 | EUR | € |
| 英镑 | GBP | £ |
| 人民币 | CNY | ¥ |
| 日元 | JPY | ¥ |
| 韩元 | KRW | ₩ |
| 印度卢比 | INR | ₹ |
| 俄罗斯卢布 | RUB | ₽ |
| 巴西雷亚尔 | BRL | R$ |
| 澳元 | AUD | A$ |
| 加元 | CAD | C$ |
| 瑞士法郎 | CHF | CHF |

## 🛠️ 安装

### 开发模式

1. 克隆仓库
```bash
git clone https://github.com/yourusername/QuickRate.git
cd QuickRate
```

2. 安装依赖
```bash
npm install
```

3. 构建扩展
```bash
npm run build
```

4. 加载扩展
   - 打开 Chrome，访问 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `dist` 目录

### 开发模式 (热重载)

```bash
npm run dev
```

## 📖 使用方法

1. 安装扩展后，点击工具栏图标打开配置窗口
2. 选择源货币和目标货币
3. 启用转换功能
4. 浏览网页，金额将自动转换显示

### 快捷操作

- **交换货币** - 点击中间的交换按钮
- **刷新汇率** - 点击右上角的刷新按钮
- **查看原金额** - 鼠标悬停在转换后的金额上

## 🏗️ 项目结构

```
QuickRate/
├── src/                    # 源代码
│   ├── manifest.json       # 扩展清单
│   ├── content/            # 内容脚本
│   │   ├── content.js      # 主控制器
│   │   ├── detector.js     # 金额识别
│   │   ├── converter.js    # 金额转换
│   │   └── replacer.js     # DOM 替换
│   ├── background/         # 后台服务
│   │   ├── service-worker.js
│   │   └── api.js          # API 封装
│   ├── popup/              # 弹出窗口
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── shared/             # 共享模块
│       ├── constants.js
│       ├── storage.js
│       └── utils.js
├── tests/                  # 测试文件
├── public/                 # 静态资源
├── webpack.config.js       # 构建配置
└── package.json
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 🔧 开发

### 技术栈

- **Manifest V3** - Chrome 扩展最新规范
- **原生 JavaScript** - 零依赖，轻量高效
- **Webpack 5** - 模块打包
- **Jest** - 单元测试

### 构建命令

```bash
npm run dev      # 开发模式 (监听文件变化)
npm run build    # 生产构建
npm test         # 运行测试
npm run lint     # 代码检查
```

## 📝 API 说明

### Frankfurter API

- **基础 URL**: https://api.frankfurter.app
- **最新汇率**: `/latest?from=USD&to=CNY`
- **货币列表**: `/currencies`
- **历史汇率**: `/2024-01-01..2024-01-31?from=USD&to=CNY`

### Chrome Storage API

- **本地存储**: `chrome.storage.local`
- **缓存策略**: 1小时有效期
- **自动清理**: 过期数据自动删除

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Frankfurter API](https://www.frankfurter.app/) - 免费汇率 API
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) - 官方文档

## 📞 联系方式

- 项目链接: https://github.com/yourusername/QuickRate
- 问题反馈: https://github.com/yourusername/QuickRate/issues

---

<div align="center">

**如果觉得有用，请给个 ⭐️ 支持一下！**

</div>