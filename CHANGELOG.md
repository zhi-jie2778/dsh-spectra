# Changelog

## 1.8.0

改名，包名从 `dsh-ui-beautify` 变成 `dsh-spectra`

原因：npm 上已有另一个作者发布的 `dsh-ui-beautify`，而且它用的插件 id 也是 `ui-beautify`，两者装上会互相顶掉

- 包名改为 `dsh-spectra`，插件 id 改为 `spectra`
- 所有接口路径从 `/plugins/dsh-ui-beautify/*` 变成 `/plugins/dsh-spectra/*`
- 设置数据目录从 `$DSH_HOME/ui-beautify` 变成 `$DSH_HOME/spectra`，启动时自动从旧目录**复制**一次，旧目录不删不改
- 旧的配置码（`dsh: "ui-beautify"`）仍可导入，新导出的写 `spectra`
- 中文名「界面美化」不变，设置里的位置和外观都不变
- DOM 上的 `data-ui-beautify` 与 `data-ub-*` 属性保持原样，它们只是内部标记，不影响任何外部行为

升级注意：装完之后要**彻底退出 DSH 再打开**，插件在 `node_modules` 里的目录名也变了

## 1.7.4

- 修复「从参考图取风格」完全无效：写入调用的参数形状错了，把整个 `palette` 分支写成了字符串 `"dark"`，下一次渲染抛异常并被错误边界吞掉，表现为点了没反应
- 修复「浅色 → 深色」「深色 → 浅色」两个按钮的同一处错误
- 文件选择器改为按钮 + `ref.click()`，并在读完后清空 `input.value`，同一张图可以连续选两次
- 测试新增两条源码守卫，防止再写出三元素的 `patchMany` 条目；同时断言 `derivePalette` 生成的配色完整且全部为合法色值

## 1.7.3

- 修复「分区着色」没有任何可见效果：改用 DSH 真正暴露的锚点
  - 侧栏 → 在 `body` 上覆盖 `--dsw-specific-sidebar-fill`（侧栏列、侧栏主体、窗口顶部条都读这个令牌）
  - 输入框 → `[data-composer-seat]` / `[data-composer-card]` 上覆盖 `--dsw-specific-input-major`
  - 对话区 → 直接给 `[data-conversation-scroll]` 上底色（该容器自身没有背景，父列才吃 `bg-base`）
- 设了对话区底色时壁纸自动让位，两者不再互相覆盖
- 有对话区底色时不再给会话容器打壁纸标记，避免多余的重排
- 顺带解释了「偶尔闪绿」：旧规则把 `--dsw-alias-bg-base` 盖在会话容器上，而该属性在页面变动时会被反复重挂，分区颜色因此一明一灭

## 1.7.2

- 壁纸图层不再无条件生成 `filter`：模糊为 0、饱和度为 1 时整条 `filter` 不输出，不再为了 `saturate(1)` 这行无意义的声明而让整层走 GPU 滤镜通道
- 需要滤镜时，先把图片画到不透明画布再作为背景使用（透明区不再留洞）
- 移除 `translateZ(0)` 与 `will-change:filter` 的强制提层

## 1.7.1

- 生成的样式表内容没变时不再写入 DOM，1 分钟一次的看门狗不再整层重建
- 壁纸容器只在目标元素真正变化时才增删标记
- 壁纸图层补一个实色底色，图片未解码完时不再透出下层

## 1.7.0

- 壁纸库：每张图片独立保存为 `wallpapers/<id>.bin` + `<id>.json`
- 壁纸路由改为 `?id=` 形式，支持 `GET` / `POST` / `DELETE`，仍然全部是 exact 路由
- 升级时把原来的单文件壁纸自动收编为库中的 `legacy1`，原文件保持不动
- 设置文档里只保存 id，不保存 URL —— 修掉「重启后端口变了、壁纸地址就全失效」的根因
- 图库缩略图网格、点击切换、当前项描边、悬停显示删除按钮
- 壁纸指针指向已删除的图片、或指向空值时自动落回可用的一张
- 新增 `test/wallpaper.mjs`：锁定「文档里不许出现 URL」「悬空指针要落到最新一张」「有滤镜才允许生成 filter」等契约

## 1.1.0 – 1.6.0

这一阶段逐步补齐了：六套预设、材质与动效全参数、布局微调、背景四类型、护眼滤镜与时段、分区开关、自定义方案保存、配置码与 `.dshbeautify` 主题包、撤销与逐行复位、参数搜索、浅深互推、AI 定制（含多轮记忆与参考图）、分区着色雏形、错误边界

## 1.0.0

First release.

- Settings section **界面美化 / UI Beautify** with a master switch that restores the stock look exactly.
- Six presets with independent light and dark palettes: Apple Glass, Cyber Neon, Candy Aurora, Swiss Minimal, Warm Paper, Retro Terminal.
- Full parameter surface: 22 palette slots, glass/blur/opacity/border/shadow materials, seven motion effects with strength, radius and density, four background types with blur/dim/saturation/speed, eye-care filter with schedule, per-region switches.
- Saved custom themes, share codes (`UB1.…`), JSON export, factory reset.
- Durable state in `$DSH_HOME/ui-beautify/state.json` with an atomic write and one backup generation, cached in `localStorage`.
- Keyboard shortcuts: `Ctrl+Alt+B` toggle, `Shift+Alt+B` cycle presets.
- Render error boundary so a failure shows a retry card instead of breaking the settings page.
