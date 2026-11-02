# 界面美化 · dsh-spectra

DeepSeek Harness Web GUI 的外观定制插件，一个总开关，六套内置方案，全部参数可调，配置可分享

装好后默认什么都不改，先在 设置 → 界面美化 打开总开关，界面才开始变化，关掉总开关立刻回到原版

## 功能

### 六套内置方案

| 方案 | 风格 |
| --- | --- |
| 苹果玻璃 | 磨砂玻璃，大圆角，柔和阴影 |
| 赛博霓虹 | 深色底，霓虹紫青，发光边框 |
| 糖果极光 | 渐变，光晕，弹性动效 |
| 极简瑞士 | 高对比，细线框，留白多 |
| 暖色纸感 | 低饱和，暖调，护眼 |
| 终端复古 | 荧光绿，等宽字体，CRT 质感 |

浅色与深色各一套，一键切换

### 参数

- 总开关 关掉后完全还原，样式表与属性一并移除
- 明暗 跟随 DSH 主题，或强制浅色 / 深色
- 区域 侧栏、对话、输入框、浮层、设置页、终端与预览、代码块、细节，八块独立开关
- 颜色 主色、辅色、画布、面板、次级面板、正文、次要文字、边框、两种气泡、代码块，浅色与深色各 11 项，带取色器和色值输入
- 材质 玻璃开关、模糊半径、面板透明度、边框强度、阴影强度
- 动效 悬停、浮层进出场、消息进场、流式文字、输入框聚焦、思考呼吸、页面切换，逐项 0–100
- 布局 圆角倍率、界面密度，密度是等比缩放
- 背景 纯色 / 渐变 / 图片 / 动态流动，另有模糊、压暗、饱和度、流动速度
- 壁纸库 上传过的图都留在库里，点缩略图即换，当前那张带描边，悬停出现 × 可删，设置里只存图片编号，地址每次按当前端口重新生成，换端口或重启都不会失效
- 分区着色 侧栏、对话区、输入框三处各上一色，其余继续跟随主题
- 细节 滚动条、光标颜色、选中文字配色
- 护眼 低蓝光暖色滤镜，可设时段
- 智能配色 从壁纸取主色，生成配套配色
- 我的方案 保存整套设置、命名、切回、删除
- 分享 配置码 `UB1.…` 复制粘贴，或导出 JSON
- 快捷键 `Ctrl+Alt+B` 开关，`Shift+Alt+B` 循环预设
- 恢复出厂 回到原版，已保存的自定义方案不受影响

### 数据存在哪

主题文档存 `$DSH_HOME/ui-beautify/state.json`，默认是 `C:\Users\<你>\.dsh\ui-beautify\state.json`，浏览器 `localStorage` 另存一份即时缓存，换浏览器、重启、升级都还在，上一版留作 `state.bak.json`

## 安装

### 克隆下来用 dsh 安装

```bash
git clone https://github.com/zhi-jie2778/dsh-spectra.git
dsh plugin --profile desktop add link:<克隆目录的绝对路径>
```

Windows 上更省事的是用目录联接，以后 `git pull` 完不用重装

```powershell
New-Item -ItemType Junction `
  -Path   "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-spectra" `
  -Target "<克隆目录的绝对路径>"
```

### 手动两步

1. 把本目录放到 `<DSH_HOME>/profiles/<profile>/node_modules/dsh-spectra`，可用目录联接或 symlink
2. 在 `<DSH_HOME>/profiles/<profile>/cordis.patch.yml` 末尾追加

```yaml
- insert:
    - id: ui-beautify
      name: dsh-spectra
```

### 装完必须重启 DSH

彻底退出再打开，托盘图标右键 → 退出，只点窗口右上角 × 可能只是隐藏到托盘

Loader 只在启动时读插件代码，桌面端生产版没有刷新菜单，`Ctrl+R` 无效

重启后打开 设置 → 界面美化

### 升级

```bash
git pull
```

然后同样彻底退出 DSH 重开，设置存在 `$DSH_HOME/ui-beautify/`，升级不会动它

## 卸载

1. 设置里关掉总开关
2. 从 `cordis.patch.yml` 删掉上面的 `insert` 块
3. 删除 `node_modules/dsh-spectra` 与 `$DSH_HOME/ui-beautify`

## 兼容性

- 只覆盖 CSS 设计令牌加少量 DOM 属性，不改 DSH 源码，不注入业务逻辑
- 选择器只用 DSH 暴露的语义锚点，比如 `[data-conversation-scroll]`、`[data-composer-seat]`、`[data-composer-card]`、`[data-content-phase]`、`[data-lexical-editor]`，不依赖编译后的哈希类名
- 壁纸只画在会话滚动容器上，侧栏、顶栏、输入框保持自己的表面
- 模糊和饱和度都是中性值时不生成 `filter`，那一层不进 GPU 滤镜通道
- 总开关关闭时样式表为空字符串，`html` / `body` 上的属性全部移除
- 与其它皮肤插件共存时，本插件令牌声明在 `body[data-ub-mode]` 上，优先级高于皮肤默认层，想完全交给别的皮肤就关掉本插件
- 界面密度用 `zoom` 实现，非整数显示缩放时建议保持 1.00

## 诊断

设置 → 更多 → 诊断 里有重绘压力测试，连续重绘壁纸图层 24 次，用来排查偶发重绘异常，反馈问题时附截图最有用

宿主侧另有 `GET /plugins/dsh-spectra/diagnostics`，返回版本、状态文件路径和最近的请求记录

## 已知限制

- 对话区底色和壁纸互斥，设了底色壁纸就让位，想要壁纸把那一行点回 跟随主题
- 桌面端没有页面刷新，升级插件后必须彻底退出 DSH 重开
- 只用语义锚点，DSH 大版本改了某个 `data-*` 属性时，相关区域会退回原样而不报错，在 `lib/client.js` 里搜属性名能定位
- 界面密度用 `zoom`，非整数显示缩放时建议保持 1.00

## 开发

```bash
node test/smoke.mjs      # 主题引擎：预设、令牌、CSS、配置码、分区、跨模式配色
node test/wallpaper.mjs  # 壁纸库：id 契约、悬空指针修复、滤镜生成条件
node test/render.mjs     # 十个标签页和两个弹窗的渲染遍历
```

三个测试只用 Node 自带模块，自己 stub 掉浏览器全局，`npm test` 不需要装依赖，CI 直接跑

```
lib/index.js   宿主半边 4 条 exact 路由 state / ai / wallpaper?id= / diagnostics
lib/ai.js      宿主半边 AI 主题生成，先走 DSH 已配置的模型，失败再走填写的 Key
lib/client.js  浏览器半边 手写免构建，window.__ModuleLoader__ 注册
test/          三个 Node 测试
```

浏览器半边改完不需要编译，Node 半边管状态存储、壁纸库和 AI 路由

## 许可证

MIT
