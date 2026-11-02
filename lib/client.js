/**
 * dsh-ui-beautify — browser half.
 *
 * Everything drawn here is reversible: while the master switch is off the
 * theme stylesheet is empty and no attribute is left on <html>/<body>, so the
 * client looks exactly like a stock installation.
 */
window.__ModuleLoader__.load({
	id: "dsh-ui-beautify",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		const React = require("react");
		const h = React.createElement;

		const PACKAGE_ID = "dsh-ui-beautify";
		const ENTRY_ID = "ui-beautify";
		const API = { version: "1.7.4" };

		/* ------------------------------------------------------------------ *
		 * Language
		 * ------------------------------------------------------------------ */
		const ZH = (() => {
			try {
				const lang = (navigator.language || "zh").toLowerCase();
				if (lang.startsWith("zh")) return true;
				const saved = localStorage.getItem("dsh-ui-beautify.lang");
				return saved === "zh";
			} catch { return true; }
		})();
		const L = (zh, en) => (ZH ? zh : en);

		/* ------------------------------------------------------------------ *
		 * Small utilities
		 * ------------------------------------------------------------------ */
		const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
		const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

		function clone(value) {
			try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
		}

		function deepMerge(base, patch) {
			if (!isObj(base) || !isObj(patch)) return patch === undefined ? clone(base) : clone(patch);
			const out = clone(base);
			for (const key of Object.keys(patch)) {
				const value = patch[key];
				if (isObj(value) && isObj(out[key])) out[key] = deepMerge(out[key], value);
				else out[key] = clone(value);
			}
			return out;
		}

		function getIn(obj, path) {
			let cur = obj;
			for (const key of path) {
				if (!isObj(cur)) return undefined;
				cur = cur[key];
			}
			return cur;
		}

		function setIn(obj, path, value) {
			if (path.length === 0) return value;
			const [head, ...rest] = path;
			const out = isObj(obj) ? { ...obj } : {};
			out[head] = setIn(out[head] ?? {}, rest, value);
			return out;
		}

		function normalizeHex(input, fallback) {
			if (typeof input !== "string") return fallback;
			let value = input.trim().replace(/^#/, "");
			if (/^[0-9a-fA-F]{3}$/.test(value)) value = value.split("").map((c) => c + c).join("");
			if (!/^[0-9a-fA-F]{6}$/.test(value)) return fallback;
			return "#" + value.toLowerCase();
		}

		function rgb(hex) {
			const value = normalizeHex(hex, "#000000").slice(1);
			return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
		}

		function rgba(hex, alpha) {
			const [r, g, b] = rgb(hex);
			const a = Number(clamp(alpha, 0, 1).toFixed(3));
			return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
		}

		function mix(a, b, t) {
			const [r1, g1, b1] = rgb(a);
			const [r2, g2, b2] = rgb(b);
			const f = clamp(t, 0, 1);
			const c = (x, y) => Math.round(x + (y - x) * f).toString(16).padStart(2, "0");
			return "#" + c(r1, r2) + c(g1, g2) + c(b1, b2);
		}

		/**
		 * Flip a palette between light and dark while keeping hue and saturation.
		 *
		 * @param source - the palette to read.
		 * @param target - "light" or "dark".
		 * @returns a complete palette for the other mode.
		 */
		function derivePalette(source, target) {
			if (target === "dark") {
				return {
					bg: mix(source.bg, "#08090c", 0.88),
					surface: mix(source.surface, "#12151b", 0.86),
					surfaceAlt: mix(source.surfaceAlt, "#191d24", 0.82),
					text: mix(source.text, "#f3f6fa", 0.9),
					muted: mix(source.muted, "#9aa3b0", 0.72),
					border: mix(source.border, "#2b313a", 0.72),
					bubble: mix(source.bubble, "#1a1e25", 0.84),
					bubbleSelf: mix(source.accent, "#11161f", 0.6),
					codeBg: mix(source.codeBg, "#0b0e12", 0.9),
					accent: lighten(source.accent, 0.14),
					accent2: lighten(source.accent2, 0.1),
				};
			}
			return {
				bg: mix(source.bg, "#ffffff", 0.9),
				surface: mix(source.surface, "#ffffff", 0.88),
				surfaceAlt: mix(source.surfaceAlt, "#f7f8fb", 0.85),
				text: mix(source.text, "#141821", 0.9),
				muted: mix(source.muted, "#5f6b7a", 0.72),
				border: mix(source.border, "#d6dbe4", 0.78),
				bubble: mix(source.bubble, "#f3f5f9", 0.86),
				bubbleSelf: mix(source.accent, "#ffffff", 0.82),
				codeBg: mix(source.codeBg, "#f6f8fb", 0.88),
				accent: darken(source.accent, 0.08),
				accent2: darken(source.accent2, 0.05),
			};
		}

		function lighten(hex, amount) { return mix(hex, "#ffffff", amount); }
		function darken(hex, amount) { return mix(hex, "#000000", amount); }

		/* ------------------------------------------------------------------ *
		 * Wallpaper gradients shipped with the presets
		 * ------------------------------------------------------------------ */
		const WALL = {
			appleLight: "radial-gradient(1200px 820px at 12% 6%, #d9e9ff 0%, rgba(217,233,255,0) 62%), radial-gradient(1000px 720px at 88% 12%, #ffe6f2 0%, rgba(255,230,242,0) 58%), linear-gradient(158deg, #f4f7fd 0%, #e9eef8 52%, #f7f4fb 100%)",
			appleDark: "radial-gradient(1200px 820px at 12% 6%, #1d2b45 0%, rgba(29,43,69,0) 62%), radial-gradient(1000px 720px at 88% 12%, #2a1f3d 0%, rgba(42,31,61,0) 58%), linear-gradient(158deg, #0a0c10 0%, #0c1017 52%, #100d15 100%)",
			neonLight: "radial-gradient(900px 620px at 15% 8%, #efe3ff 0%, rgba(239,227,255,0) 60%), radial-gradient(800px 560px at 85% 20%, #dcf7ff 0%, rgba(220,247,255,0) 60%), linear-gradient(160deg, #f6f3ff 0%, #eef1fb 100%)",
			neonDark: "radial-gradient(900px 620px at 15% 8%, #2a1250 0%, rgba(42,18,80,0) 60%), radial-gradient(800px 560px at 85% 20%, #07303c 0%, rgba(7,48,60,0) 60%), linear-gradient(160deg, #06060c 0%, #0a0713 100%)",
			candyLight: "radial-gradient(760px 560px at 10% 10%, #ffd6ea 0%, rgba(255,214,234,0) 60%), radial-gradient(760px 560px at 86% 14%, #dcd6ff 0%, rgba(220,214,255,0) 60%), radial-gradient(900px 700px at 50% 100%, #d5f5ff 0%, rgba(213,245,255,0) 60%), linear-gradient(160deg, #fff6fb 0%, #f6f2ff 100%)",
			candyDark: "radial-gradient(760px 560px at 10% 10%, #3c1130 0%, rgba(60,17,48,0) 60%), radial-gradient(760px 560px at 86% 14%, #251a4d 0%, rgba(37,26,77,0) 60%), radial-gradient(900px 700px at 50% 100%, #0d2b38 0%, rgba(13,43,56,0) 60%), linear-gradient(160deg, #120b1a 0%, #0d0914 100%)",
			paperLight: "radial-gradient(900px 700px at 20% 0%, #fdf8ee 0%, rgba(253,248,238,0) 70%), linear-gradient(170deg, #f7f1e6 0%, #efe7d8 100%)",
			paperDark: "radial-gradient(900px 700px at 20% 0%, #241f18 0%, rgba(36,31,24,0) 70%), linear-gradient(170deg, #17130e 0%, #1d1811 100%)",
			terminalLight: "radial-gradient(900px 700px at 50% 0%, #e8f7e9 0%, rgba(232,247,233,0) 70%), linear-gradient(170deg, #f4faf4 0%, #eaf4ea 100%)",
			terminalDark: "radial-gradient(900px 700px at 50% 0%, #0a2013 0%, rgba(10,32,19,0) 70%), linear-gradient(170deg, #04070a 0%, #060f0a 100%)",
		};

		/* ------------------------------------------------------------------ *
		 * Palettes
		 * ------------------------------------------------------------------ */
		function palette(spec) {
			return {
				bg: spec[0], surface: spec[1], surfaceAlt: spec[2], text: spec[3],
				muted: spec[4], accent: spec[5], accent2: spec[6], border: spec[7],
				bubble: spec[8], bubbleSelf: spec[9], codeBg: spec[10],
			};
		}

		/* ------------------------------------------------------------------ *
		 * Built-in presets
		 * ------------------------------------------------------------------ */
		const PRESETS = [
			{
				id: "apple-glass",
				name: { zh: "苹果玻璃", en: "Apple Glass" },
				tag: { zh: "磨砂毛玻璃 · 大圆角 · 柔和阴影", en: "Frosted glass, soft radii, quiet shadows" },
				palette: {
					light: palette(["#eef2f9", "#ffffff", "#f7f9fc", "#1c1f26", "#6b7280", "#0a84ff", "#5ac8fa", "#d9dee8", "#f2f4f8", "#e4f0ff", "#f5f7fb"]),
					dark: palette(["#0b0d10", "#15181d", "#1c2026", "#eef1f5", "#9aa3b0", "#0a84ff", "#64d2ff", "#2b3038", "#1b1f25", "#16324f", "#0f1216"]),
				},
				materials: { glass: true, glassBlur: 22, panelAlpha: 0.66, radius: 1.25, shadow: 0.5, border: 0.22, density: 1 },
				effects: { hover: 0.35, enter: 0.5, msg: 0.45, stream: 0.35, focus: 0.5, think: 0.4, page: 0.3, scrollbar: true, selection: true, cursor: true },
				wallpaper: { style: "gradient", image: "", url: "", fit: "cover", blur: 0, dim: 0.08, saturate: 1, animate: 26 },
			},
			{
				id: "cyber-neon",
				name: { zh: "赛博霓虹", en: "Cyber Neon" },
				tag: { zh: "深色发光 · 霓虹紫青 · 强动效", en: "Dark glow, violet and cyan, bold motion" },
				palette: {
					light: palette(["#eef0fb", "#ffffff", "#f5f5ff", "#171335", "#6a6394", "#7c3aed", "#06b6d4", "#d8d8f0", "#f3f2ff", "#e9e2ff", "#f7f6ff"]),
					dark: palette(["#06060c", "#0d0b18", "#141026", "#ece9ff", "#9b93c9", "#a855f7", "#22d3ee", "#2b2350", "#120f22", "#241a4d", "#0a0814"]),
				},
				materials: { glass: true, glassBlur: 16, panelAlpha: 0.58, radius: 0.7, shadow: 0.85, border: 0.35, density: 1 },
				effects: { hover: 0.8, enter: 0.75, msg: 0.7, stream: 0.9, focus: 0.85, think: 0.8, page: 0.6, scrollbar: true, selection: true, cursor: true },
				wallpaper: { style: "gradient", image: "", url: "", fit: "cover", blur: 0, dim: 0.18, saturate: 1.1, animate: 18 },
			},
			{
				id: "candy-aurora",
				name: { zh: "糖果极光", en: "Candy Aurora" },
				tag: { zh: "梦幻渐变 · 光晕 · 弹性动效", en: "Dreamy gradients, halos, springy motion" },
				palette: {
					light: palette(["#fdf3fb", "#ffffff", "#fbf4ff", "#2a1b33", "#7d6a8a", "#ff5fa2", "#7c5cff", "#efd9ee", "#fdf6fb", "#ffe4f1", "#fbf5ff"]),
					dark: palette(["#120b1a", "#1a1126", "#22162f", "#f7ecff", "#b09bc4", "#ff6fae", "#8b7bff", "#3a2a4d", "#1e1429", "#3a2340", "#150e1f"]),
				},
				materials: { glass: true, glassBlur: 24, panelAlpha: 0.6, radius: 1.6, shadow: 0.6, border: 0.2, density: 1 },
				effects: { hover: 0.55, enter: 0.8, msg: 0.7, stream: 0.6, focus: 0.7, think: 0.7, page: 0.55, scrollbar: true, selection: true, cursor: true },
				wallpaper: { style: "gradient", image: "", url: "", fit: "cover", blur: 0, dim: 0.05, saturate: 1.05, animate: 22 },
			},
			{
				id: "minimal-swiss",
				name: { zh: "极简瑞士", en: "Swiss Minimal" },
				tag: { zh: "高对比 · 细线框 · 大量留白", en: "High contrast, hairlines, generous whitespace" },
				palette: {
					light: palette(["#ffffff", "#ffffff", "#fafafa", "#111111", "#6b6b6b", "#111111", "#e11d48", "#e5e5e5", "#fafafa", "#f0f0f0", "#f7f7f7"]),
					dark: palette(["#0a0a0a", "#121212", "#181818", "#f5f5f5", "#a3a3a3", "#fafafa", "#fb7185", "#262626", "#161616", "#1f1f1f", "#101010"]),
				},
				materials: { glass: false, glassBlur: 0, panelAlpha: 1, radius: 0.35, shadow: 0.1, border: 0.55, density: 1 },
				effects: { hover: 0.15, enter: 0.2, msg: 0.2, stream: 0.1, focus: 0.3, think: 0.15, page: 0.15, scrollbar: true, selection: true, cursor: true },
				wallpaper: { style: "none", image: "", url: "", fit: "cover", blur: 0, dim: 0, saturate: 1, animate: 30 },
			},
			{
				id: "warm-paper",
				name: { zh: "暖色纸感", en: "Warm Paper" },
				tag: { zh: "莫兰迪低饱和 · 护眼暖调", en: "Muted Morandi tones, warm and easy on the eyes" },
				palette: {
					light: palette(["#f6f1e7", "#fdfaf3", "#f3ecdf", "#3a342b", "#8a7f6d", "#b4693a", "#7d9b6a", "#e4d9c6", "#fbf7ee", "#efe4d2", "#f4ecdd"]),
					dark: palette(["#1b1712", "#241f18", "#2c261d", "#efe7d8", "#b3a691", "#d98b57", "#93b47c", "#3b3327", "#262019", "#3a2c1f", "#1e1913"]),
				},
				materials: { glass: false, glassBlur: 10, panelAlpha: 0.92, radius: 0.9, shadow: 0.3, border: 0.3, density: 1 },
				effects: { hover: 0.25, enter: 0.35, msg: 0.3, stream: 0.1, focus: 0.35, think: 0.25, page: 0.25, scrollbar: true, selection: true, cursor: true },
				wallpaper: { style: "gradient", image: "", url: "", fit: "cover", blur: 0, dim: 0.04, saturate: 1, animate: 30 },
			},
			{
				id: "terminal-retro",
				name: { zh: "终端复古", en: "Retro Terminal" },
				tag: { zh: "荧光绿 · 等宽字体 · CRT 味道", en: "Phosphor green, monospace, CRT flavour" },
				palette: {
					light: palette(["#f2f7f2", "#fbfdfb", "#f4faf4", "#0f2a12", "#4b6b4f", "#16a34a", "#d97706", "#cfe0cf", "#f4faf4", "#e3f3e3", "#f0f7f0"]),
					dark: palette(["#05080a", "#0a120e", "#0d1712", "#8ff0a4", "#4f9d63", "#22c55e", "#f59e0b", "#14351f", "#0b1611", "#0f2b19", "#060d09"]),
				},
				materials: { glass: false, glassBlur: 0, panelAlpha: 1, radius: 0.15, shadow: 0.2, border: 0.45, density: 0.98 },
				effects: { hover: 0.3, enter: 0.3, msg: 0.4, stream: 0.8, focus: 0.6, think: 0.7, page: 0.2, scrollbar: true, selection: true, cursor: true },
				wallpaper: { style: "gradient", image: "", url: "", fit: "cover", blur: 0, dim: 0.2, saturate: 1, animate: 30 },
			},
		];

		const PRESET_BY_ID = Object.fromEntries(PRESETS.map((p) => [p.id, p]));

		/* ------------------------------------------------------------------ *
		 * Default document
		 * ------------------------------------------------------------------ */
		function defaults() {
			const first = PRESETS[0];
			return {
				version: 1,
				enabled: false,
				presetId: "none",
				customName: "",
				mode: "auto",
				palette: clone(first.palette),
				materials: { glass: true, glassBlur: 18, panelAlpha: 0.62, radius: 1, shadow: 0.45, border: 0.24, density: 1 },
				effects: { hover: 0.35, enter: 0.45, msg: 0.4, stream: 0.3, focus: 0.45, think: 0.35, page: 0.25, scrollbar: true, selection: true, cursor: true },
				wallpaper: { style: "none", image: "", url: "", fit: "cover", blur: 14, dim: 0.34, saturate: 1, animate: 26 },
				regions: { sidebar: true, chat: true, composer: true, overlays: true, settings: true, terminal: true, code: true, details: true },
				eye: { enabled: false, strength: 0.16, schedule: "off", from: "20:00", to: "07:00" },
				custom: [],
				wallpapers: [],
				aiMemory: true,
				zones: { sidebar: "", chat: "", composer: "" },
				lastBoot: 0,
			};
		}

		const REGION_KEYS = ["sidebar", "chat", "composer", "overlays", "settings", "terminal", "code", "details"];

		/** Every tunable worth searching for: keywords, tab, and the row label. */
		const PARAM_INDEX = [
			{ tab: "materials", k: ["毛玻璃", "玻璃", "glass"], zh: "开启毛玻璃" },
			{ tab: "materials", k: ["模糊", "blur"], zh: "模糊强度" },
			{ tab: "materials", k: ["透明", "透", "opacity", "alpha"], zh: "面板透明度" },
			{ tab: "materials", k: ["边框", "border"], zh: "边框强度" },
			{ tab: "materials", k: ["阴影", "shadow"], zh: "阴影强度" },
			{ tab: "layout", k: ["圆角", "radius"], zh: "圆角" },
			{ tab: "layout", k: ["密度", "density", "紧凑"], zh: "界面密度" },
			{ tab: "motion", k: ["悬停", "hover"], zh: "悬停微交互" },
			{ tab: "motion", k: ["进场", "浮层", "enter"], zh: "浮层进出场" },
			{ tab: "motion", k: ["消息", "msg"], zh: "消息进场" },
			{ tab: "motion", k: ["流式", "stream", "光效"], zh: "流式文字光效" },
			{ tab: "motion", k: ["聚焦", "focus", "光晕"], zh: "输入框聚焦光晕" },
			{ tab: "motion", k: ["思考", "呼吸", "think"], zh: "思考/执行呼吸" },
			{ tab: "motion", k: ["页面", "过渡", "page"], zh: "页面切换过渡" },
			{ tab: "background", k: ["背景", "壁纸", "wallpaper"], zh: "背景类型" },
			{ tab: "background", k: ["压暗", "dim"], zh: "压暗程度" },
			{ tab: "background", k: ["饱和", "saturate"], zh: "饱和度" },
			{ tab: "background", k: ["流动", "animated"], zh: "流动速度" },
			{ tab: "background", k: ["上传", "图片", "image"], zh: "上传本机图片" },
			{ tab: "appearance", k: ["明暗", "深色", "浅色", "dark"], zh: "明暗模式" },
			{ tab: "appearance", k: ["区域", "region"], zh: "区域开关" },
			{ tab: "palette", k: ["主色", "accent"], zh: "主色" },
			{ tab: "palette", k: ["辅色", "accent2"], zh: "辅色" },
			{ tab: "palette", k: ["气泡", "bubble"], zh: "AI 气泡" },
			{ tab: "palette", k: ["取色", "壁纸主色"], zh: "提取壁纸主色" },
			{ tab: "details", k: ["滚动条", "scrollbar"], zh: "自定义滚动条" },
			{ tab: "details", k: ["护眼", "eye"], zh: "护眼模式" },
			{ tab: "ai", k: ["ai", "生成", "定制"], zh: "AI 定制" },
			{ tab: "presets", k: ["方案", "预设", "preset"], zh: "一键切换方案" },
			{ tab: "more", k: ["导入", "导出", "配置码"], zh: "分享与备份" },
		];

		function normalizeState(raw) {
			const base = defaults();
			if (isObj(raw) && isObj(raw.materials)) {
				const source = raw.materials;
				if (source.opacity !== undefined && source.panelAlpha === undefined) source.panelAlpha = source.opacity;
				if (source.transparency !== undefined && source.panelAlpha === undefined) source.panelAlpha = 1 - Number(source.transparency);
				if (source.blur !== undefined && source.glassBlur === undefined) source.glassBlur = source.blur;
				if (source.cornerRadius !== undefined && source.radius === undefined) source.radius = source.cornerRadius;
				if (source.rounded !== undefined && source.radius === undefined) source.radius = source.rounded;
			}
			if (isObj(raw) && isObj(raw.effects) && raw.effects.motion !== undefined && raw.effects.hover === undefined) {
				raw.effects.hover = raw.effects.motion;
			}
			if (!isObj(raw)) return base;
			const state = deepMerge(base, raw);
			state.version = 1;
			state.enabled = raw.enabled === true;
			state.mode = ["auto", "light", "dark"].includes(state.mode) ? state.mode : "auto";
			state.presetId = typeof state.presetId === "string" ? state.presetId : "none";
			state.custom = Array.isArray(state.custom) ? state.custom.filter((item) => isObj(item) && typeof item.id === "string") : [];
			if (typeof state.aiMemory !== "boolean") state.aiMemory = true;
			if (!isObj(state.zones)) state.zones = { sidebar: "", chat: "", composer: "" };
			for (const zone of ["sidebar", "chat", "composer"]) {
				state.zones[zone] = typeof state.zones[zone] === "string" ? state.zones[zone] : "";
			}
			state.wallpapers = libraryEntries(state.wallpapers);
			if (!isObj(state.palette)) state.palette = clone(base.palette);
			if (isObj(state.wallpaper) && typeof state.wallpaper.image === "string") {
				const image = state.wallpaper.image;
				if (image.includes("/wall/")) {
					// a dead per-image route from an earlier build
					state.wallpaper.image = "";
				} else if (image.includes("/plugins/dsh-ui-beautify/wallpaper")) {
					// an absolute URL baked in before the library existed; its port is stale
					const match = /[?&]id=([^&]+)/.exec(image);
					state.wallpaper.image = "wall:" + (match ? decodeURIComponent(match[1]) : "legacy1");
				}
			}
			for (const mode of ["light", "dark"]) {
				const fallback = base.palette[mode];
				const current = isObj(state.palette[mode]) ? state.palette[mode] : {};
				const merged = {};
				for (const key of Object.keys(fallback)) merged[key] = normalizeHex(current[key], fallback[key]);
				state.palette[mode] = merged;
			}
			state.materials.glassBlur = clamp(Number(state.materials.glassBlur) || 0, 0, 40);
			state.materials.panelAlpha = clamp(Number(state.materials.panelAlpha) || 0.62, 0.1, 1);
			state.materials.radius = clamp(Number(state.materials.radius) || 1, 0, 2.4);
			state.materials.shadow = clamp(Number(state.materials.shadow) || 0, 0, 1);
			state.materials.border = clamp(Number(state.materials.border) || 0, 0, 1);
			state.materials.density = clamp(Number(state.materials.density) || 1, 0.85, 1.15);
			state.wallpaper.blur = clamp(Number(state.wallpaper.blur) || 0, 0, 30);
			state.wallpaper.dim = clamp(Number(state.wallpaper.dim) || 0, 0, 0.85);
			state.wallpaper.saturate = clamp(Number(state.wallpaper.saturate) || 1, 0, 2);
			state.wallpaper.animate = clamp(Number(state.wallpaper.animate) || 26, 6, 120);
			state.wallpaper.fit = ["cover", "contain", "tile"].includes(state.wallpaper.fit) ? state.wallpaper.fit : "cover";
			state.wallpaper.style = ["none", "color", "gradient", "image", "animated"].includes(state.wallpaper.style) ? state.wallpaper.style : "none";
			state.eye.strength = clamp(Number(state.eye.strength) || 0, 0, 0.6);
			for (const key of REGION_KEYS) state.regions[key] = state.regions[key] !== false;
			return state;
		}

		/* ------------------------------------------------------------------ *
		 * Theme resolution
		 * ------------------------------------------------------------------ */
		function systemDark() {
			try { return !!document.body && document.body.hasAttribute("data-ds-dark-theme"); } catch { return false; }
		}

		function resolveMode(state) {
			if (state.mode === "light" || state.mode === "dark") return state.mode;
			return systemDark() ? "dark" : "light";
		}

		/* ------------------------------------------------------------------ *
		 * Token map — the whole visual language in one place
		 * ------------------------------------------------------------------ */
		function tokenVars(state, mode) {
			const p = state.palette[mode];
			const m = state.materials;
			const hasWall = state.wallpaper.style !== "none";
			const alpha = m.glass ? clamp(m.panelAlpha, 0.1, 1) : 1;
			const canvas = hasWall ? rgba(p.bg, clamp(alpha - 0.08, 0.12, 1)) : rgba(p.bg, 1);
			const overlay = rgba(p.surface, clamp(alpha + 0.16, 0, 1));
			const sidebar = rgba(p.surface, clamp(alpha + 0.04, 0, 1));
			const menu = rgba(p.surfaceAlt, clamp(alpha + 0.12, 0, 1));
			const bubble = rgba(p.bubble, clamp(alpha + 0.18, 0, 1));
			const bubbleSelf = rgba(p.bubbleSelf, clamp(alpha + 0.14, 0, 1));
			const code = rgba(p.codeBg, clamp(alpha + 0.22, 0, 1));
			const b = m.border;
			const secondary = mix(p.text, p.bg, 0.34);
			const tertiary = mix(p.text, p.bg, 0.52);
			const radius = (value) => (value * m.radius).toFixed(1) + "px";
			const shadow = (y, blur, spread) => {
				const strength = clamp(m.shadow, 0, 1);
				const color = rgba(darken(p.bg, 0.55), 0.18 + strength * 0.38);
				return "0 " + y + "px " + blur + "px " + spread + "px " + color;
			};
			const glow = rgba(p.accent2, 0.32 * clamp(m.shadow, 0, 1.4));
			const vars = {
				"--dsw-alias-bg-base": canvas,
				"--dsw-alias-bg-layer-1": rgba(p.surface, alpha),
				"--dsw-alias-bg-layer-2": rgba(p.surfaceAlt, clamp(alpha + 0.06, 0, 1)),
				"--dsw-alias-bg-layer-3": rgba(p.surfaceAlt, clamp(alpha + 0.12, 0, 1)),
				"--dsw-alias-bg-overlay": overlay,
				"--dsw-alias-bg-module-platform": rgba(p.surface, clamp(alpha + 0.02, 0, 1)),
				"--dsw-alias-bg-skeleton": rgba(mix(p.surfaceAlt, p.text, 0.06), clamp(alpha + 0.2, 0, 1)),
				"--dsw-specific-sidebar-fill": sidebar,
				"--dsw-specific-sidebar-nav-item-hover": rgba(p.accent, 0.1),
				"--dsw-specific-sidebar-nav-item-active": rgba(p.accent, 0.16),
				"--dsw-specific-sidebar-nav-item-active-accent": p.accent,
				"--dsw-specific-menu": menu,
				"--dsw-menu-surface-fill": menu,
				"--dsw-alias-menu-group-header-fill": rgba(mix(p.surfaceAlt, p.bg, 0.18), 0.94),
				"--dsw-alias-menu-icon": mix(p.text, p.bg, 0.3),
				"--dsw-specific-bubble": bubble,
				"--dsw-specific-bubble-highlight": bubbleSelf,
				"--dsw-specific-input-major": rgba(p.bubble, clamp(alpha + 0.24, 0, 1)),
				"--dsw-specific-selector": rgba(p.surfaceAlt, clamp(alpha + 0.2, 0, 1)),
				"--dsw-specific-tip": rgba(p.surfaceAlt, 0.96),
				"--dsw-alias-markdown-code-block": code,
				"--dsw-alias-markdown-code-block-banner": rgba(mix(p.codeBg, p.text, 0.06), 0.96),
				"--dsw-alias-markdown-inline-code": rgba(mix(p.codeBg, p.text, 0.04), 0.9),
				"--dsw-alias-markdown-code-segment-selected": rgba(p.accent, 0.22),
				"--dsw-alias-markdown-code-segment-unselected": rgba(p.surfaceAlt, 0.7),
				"--dsw-alias-tooltip-bg": rgba(darken(mix(p.text, p.bg, 0.12), 0.15), 0.96),
				"--dsw-alias-tooltip-key-bg": rgba(p.surface, 0.16),
				"--dsw-alias-toast-bg": rgba(mix(p.surfaceAlt, p.text, 0.04), 0.96),
				"--dsw-alias-toast-label": p.text,
				"--dsw-alias-label-primary": p.text,
				"--dsw-alias-label-primary-bluish": p.text,
				"--dsw-alias-label-primary-dimmed": mix(p.text, p.bg, 0.22),
				"--dsw-alias-label-primary-inverted": p.bg,
				"--dsw-alias-label-primary-foreground": p.bg,
				"--dsw-alias-label-secondary": secondary,
				"--dsw-alias-label-tertiary": tertiary,
				"--dsw-alias-label-caption": mix(p.text, p.bg, 0.42),
				"--dsw-alias-label-dimmed": mix(p.text, p.bg, 0.5),
				"--dsw-alias-label-shimmer": rgba(mode === "dark" ? "#ffffff" : "#000000", 0.28),
				"--dsw-alias-border-l1": rgba(p.border, clamp(b * 0.7, 0, 1)),
				"--dsw-alias-border-l2": rgba(p.border, b),
				"--dsw-alias-border-l3": rgba(p.border, clamp(b * 1.25, 0, 1)),
				"--dsw-alias-border-l4": rgba(p.border, clamp(b * 1.5, 0, 1)),
				"--dsw-alias-brand-primary": p.accent,
				"--dsw-alias-brand-text": p.accent,
				"--dsw-alias-link": p.accent,
				"--dsw-alias-button-primary-fill": p.accent,
				"--dsw-alias-button-primary-hover": lighten(p.accent, 0.12),
				"--dsw-alias-button-primary-dimmed": rgba(p.accent, 0.35),
				"--dsw-alias-button-info-fill": rgba(p.accent2, 0.18),
				"--dsw-alias-button-info-hover": rgba(p.accent2, 0.28),
				"--dsw-alias-button-elevated-fill": rgba(p.surfaceAlt, 0.96),
				"--dsw-alias-button-floating-fill": rgba(p.surface, 0.94),
				"--dsw-alias-button-floating-hover": rgba(p.surfaceAlt, 0.98),
				"--dsw-alias-button-ghost-active-fill": rgba(p.accent, 0.16),
				"--dsw-alias-button-ghost-active-hover": rgba(p.accent, 0.24),
				"--dsw-alias-button-ghost-active-border": rgba(p.accent, 0.5),
				"--dsw-alias-button-tool-bar-fill": rgba(p.surfaceAlt, 0.7),
				"--dsw-alias-button-tool-bar-hover": rgba(p.surfaceAlt, 0.92),
				"--dsw-alias-button-tool-bar-fill-invisible": "transparent",
				"--dsw-alias-interactive-bg-hover": rgba(p.accent, 0.1),
				"--dsw-alias-interactive-bg-hover-solid": rgba(p.surfaceAlt, 0.96),
				"--dsw-alias-interactive-bg-active": rgba(p.accent, 0.18),
				"--dsw-alias-interactive-bg-hover-accent": rgba(p.accent, 0.16),
				"--dsw-alias-interactive-bg-hover-danger": rgba("#ef4444", 0.14),
				"--dsw-alias-state-business-primary": p.accent,
				"--dsw-alias-state-business-tertiary": rgba(p.accent, 0.2),
				"--dsw-alias-state-idle-primary": mix(p.text, p.bg, 0.45),
				"--dsw-alias-switch-thumb": mode === "dark" ? "#e6e9ef" : "#ffffff",
				"--dsw-alias-scrollbar-bg-l1": rgba(p.border, 0.5),
				"--dsw-alias-scrollbar-hover-l1": rgba(p.border, 0.9),
				"--dsw-alias-scrollbar-bg-l2": rgba(p.border, 0.55),
				"--dsw-alias-scrollbar-hover-l2": rgba(p.border, 0.95),
				"--dsw-alias-settings-card-fill": rgba(p.surfaceAlt, clamp(alpha + 0.1, 0, 1)),
				"--dsw-alias-settings-card-stroke": rgba(p.border, clamp(b * 1.1, 0, 1)),
				"--dsw-radius-xs": radius(4),
				"--dsw-radius-sm": radius(6),
				"--dsw-radius-md": radius(8),
				"--dsw-radius-lg": radius(12),
				"--dsw-radius-xl": radius(16),
				"--dsw-radius-panel": radius(20),
				"--dsw-shadow-lv1": shadow(1, 3, 0),
				"--dsw-shadow-lv2": shadow(4, 14, -2),
				"--dsw-shadow-lv3": shadow(10, 32, -6),
				"--dsw-elevation-stroke-color": rgba(p.border, clamp(b * 0.9, 0, 1)),
				"--dsw-elevation-panel": shadow(6, 24, -4) + ", 0 0 0 0.5px " + rgba(p.border, b),
				"--dsw-elevation-prominent": shadow(12, 40, -8) + ", 0 0 0 0.5px " + rgba(p.border, b),
				"--dsw-elevation-soft": shadow(4, 18, -6),
				"--dsw-menu-backdrop-filter": "blur(" + m.glassBlur + "px) saturate(160%)",
				"--dsw-mask-blur": "blur(" + Math.round(m.glassBlur / 2) + "px)",
				"--dsw-focus-ring-color": p.accent,
				"--ub-accent": p.accent,
				"--ub-accent2": p.accent2,
				"--ub-glow": glow,
			};
			return vars;
		}

		/* ------------------------------------------------------------------ *
		 * Stylesheet generation
		 * ------------------------------------------------------------------ */
		const GATE = 'html[data-ui-beautify="on"]';

		function decls(vars) {
			return Object.keys(vars).map((key) => key + ":" + vars[key] + ";").join("");
		}

		function wallpaperCss(state) {
			const w = state.wallpaper;
			if (w.style === "none") return "";
			/* a conversation-area tint takes over that surface, so the picture stands down */
			if (state.zones && typeof state.zones.chat === "string" && state.zones.chat !== "") return "";
			let image = "";
			const source = wallpaperSource(state);
			if (source !== "") image = 'url("' + String(source).replace(/"/g, '\\"') + '")';
			else if (w.style === "gradient") {
				const dark = resolveMode(state) === "dark";
				image = "linear-gradient(160deg, var(--ub-wall-a), var(--ub-wall-b))";
				const p = state.palette[dark ? "dark" : "light"];
				image = "radial-gradient(1200px 800px at 12% 4%, " + rgba(p.accent, 0.18) + " 0%, transparent 62%), radial-gradient(900px 700px at 88% 10%, " + rgba(p.accent2, 0.2) + " 0%, transparent 58%), linear-gradient(160deg, " + p.bg + " 0%, " + mix(p.bg, p.surfaceAlt, 0.6) + " 100%)";
			} else if (w.style === "animated") image = "linear-gradient(120deg, " + state.palette[resolveMode(state)].bg + " 0%, " + rgba(state.palette[resolveMode(state)].accent, 0.35) + " 35%, " + rgba(state.palette[resolveMode(state)].accent2, 0.3) + " 65%, " + state.palette[resolveMode(state)].bg + " 100%)";
			if (!image) return "";
			const mode = resolveMode(state);
			const pal = state.palette[mode];
			const size = w.fit === "tile" ? "auto, auto" : w.fit === "contain" ? "contain" : "cover";
			const repeat = w.fit === "tile" ? "repeat" : "no-repeat";
			/*
			 * Only emit a filter when it changes something.
			 *
			 * `filter: saturate(1)` looks like a no-op but it still routes the
			 * layer through the GPU filter path, and a huge filtered layer whose
			 * texture carries alpha shows uninitialised memory (green) where the
			 * picture is transparent. Skipping the useless filter avoids that path.
			 */
			const filters = [];
			if (Number(w.blur) > 0) filters.push("blur(" + w.blur + "px)");
			if (Math.abs(Number(w.saturate) - 1) > 0.005) filters.push("saturate(" + w.saturate + ")");
			const filtered = filters.length > 0;
			const animate = w.style === "animated"
				? "background-size: 300% 300%;animation: ub-drift " + w.animate + "s ease-in-out infinite alternate;"
				: "background-size:" + size + ";background-repeat:" + repeat + ";";
			return [
				"@keyframes ub-drift{0%{background-position:0% 40%}100%{background-position:100% 60%}}",
				GATE + " html," + GATE + " body{background-color:transparent!important;}",
				GATE + " html{background-image:" + image + ";background-position:center;background-repeat:" + repeat + ";background-size:" + size + ";background-attachment:fixed;}",
				GATE + " body::before{content:\"\";position:fixed;inset:-8%;z-index:0;pointer-events:none;",
				"background-image:" + image + ";" + animate,
				"filter:blur(" + w.blur + "px) saturate(" + w.saturate + ");}",
				// the dimming veil over the wallpaper
				GATE + " body::after{content:\"\";position:fixed;inset:0;z-index:0;pointer-events:none;background:" + rgba(state.palette[resolveMode(state)].bg, w.dim) + ";}",
				// put the application above both layers and let its own surfaces show through
				GATE + " #root," + GATE + " #app," + GATE + " [data-dockkit-host]{position:relative;z-index:1;}",
				GATE + " #root,#app,#root>div,#app>div,body>div:first-of-type{background-color:transparent!important;}",
				// the picture lives only inside the tagged chat surface
				GATE + " html{background-image:none!important;}",
				GATE + " body::before{display:none!important;}",
				GATE + " body::after{display:none!important;}",
				GATE + " [data-ub-wall]{position:relative;z-index:0;background-image:none!important;background-color:transparent!important;}",
				GATE + " [data-ub-wall]::before{content:\"\";position:absolute;inset:-28px;pointer-events:none;z-index:-1;background-color:" + rgba(pal.bg, 1) + ";background-image:" + image + ";background-size:" + size + ";background-repeat:" + repeat + ";background-position:center;" + (filtered ? "filter:" + filters.join(" ") + ";" : "") + (filtered ? "will-change:filter;" : "") + "}",
				GATE + " [data-ub-wall]::after{content:\"\";position:absolute;inset:0;pointer-events:none;z-index:-1;background:" + rgba(pal.bg, w.dim) + ";}",
				// keep the shell solid so the picture never bleeds into the sidebar or the top bar
				GATE + " body[data-ub-mode=\"" + mode + "\"]{--dsw-alias-bg-base:" + rgba(pal.bg, 1) + ";--dsw-alias-bg-module-platform:" + rgba(pal.surface, 1) + ";--dsw-alias-bg-layer-1:" + rgba(pal.surface, 1) + ";--dsw-specific-sidebar-fill:" + rgba(pal.surface, 1) + ";}",
				// keep the old tint rule harmless when it is still present
				GATE + " [data-ub-wall]{--dsw-alias-bg-base:" + rgba(pal.bg, 0.35) + ";}",
				GATE + " body[data-ub-mode=\"" + mode + "\"]{--dsw-alias-bg-base:" + rgba(pal.bg, 0.5) + ";--dsw-alias-bg-module-platform:" + rgba(pal.surface, 0.55) + ";--dsw-alias-bg-layer-1:" + rgba(pal.surface, 0.72) + ";--dsw-specific-sidebar-fill:" + rgba(pal.surface, 0.66) + ";}",
			].join("");
		}

		function effectsCss(state) {
			const e = state.effects;
			const r = state.regions;
			const out = [];
			const fast = (0.12 + e.hover * 0.35).toFixed(2) + "s";
			const slow = (0.22 + e.enter * 0.5).toFixed(2) + "s";
			const breathe = (5 - e.think * 2.6).toFixed(2) + "s";
			const lift = (e.hover * 2.5).toFixed(2);
			const ease = "cubic-bezier(.22,.61,.36,1)";
			out.push("@keyframes ub-pop{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}");
			out.push("@keyframes ub-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}");
			out.push("@keyframes ub-breathe{0%,100%{opacity:.55}50%{opacity:1}}");
			out.push("@keyframes ub-glow{0%,100%{box-shadow:0 0 0 0 var(--ub-glow)}50%{box-shadow:0 0 18px 2px var(--ub-glow)}}");
			out.push("@keyframes ub-fade{0%,100%{opacity:.9}50%{opacity:1}}");

			if (r.overlays && e.enter > 0) {
				out.push(GATE + " :where([role=dialog],[role=menu],[role=listbox],[role=tooltip],[data-portal]){animation:ub-pop " + slow + " " + ease + " both;}");
			}
			if (e.hover > 0) {
				out.push(GATE + " :where(button,[role=button],a[href]){transition:transform " + fast + " " + ease + ",background-color " + fast + " ease,box-shadow " + fast + " ease,border-color " + fast + " ease,color " + fast + " ease;}");
				if (r.sidebar) out.push(GATE + " :where([data-sidebar-collapsed] button,[data-sidebar-collapsed] [role=button],nav button){transition:transform " + fast + " " + ease + ",background-color " + fast + " ease,box-shadow " + fast + " ease;}");
				out.push(GATE + " :where(button,[role=button]):not(:disabled):hover{transform:translateY(calc(-1px * " + lift + "));}");
			}
			if (e.focus > 0) {
				out.push(GATE + " :where(textarea,input:not([type=checkbox]):not([type=radio]),[contenteditable=true],[data-lexical-editor]):focus-within,:where(textarea,input:not([type=checkbox]):not([type=radio]),[contenteditable=true]):focus-visible{box-shadow:0 0 0 1px var(--ub-accent),0 0 0 4px " + rgba(state.palette[resolveMode(state)].accent, 0.16 * e.focus) + ";}");
			}
			if (r.chat && e.msg > 0) {
				out.push(GATE + " [data-content-phase]{animation:ub-rise " + (0.2 + e.msg * 0.45).toFixed(2) + "s " + ease + " both;}");
			}
			if (r.chat && e.stream > 0) {
				out.push(GATE + " [data-content-phase=active]{text-shadow:0 0 " + (10 * e.stream).toFixed(1) + "px " + rgba(state.palette[resolveMode(state)].accent2, 0.45 * e.stream) + ";}");
				out.push(GATE + " [data-phase=active] :where(p,li,h1,h2,h3,strong){animation:ub-fade " + (2.4 - 1.2 * e.stream).toFixed(2) + "s ease-in-out infinite;}");
			}
			if (e.think > 0) {
				out.push(GATE + " [role=status]{animation:ub-breathe " + breathe + " ease-in-out infinite;}");
				out.push(GATE + " [data-phase=active] [role=status]{animation:ub-glow " + breathe + " ease-in-out infinite;}");
			}
			if (r.details && e.selection) {
				out.push(GATE + " ::selection{background:" + rgba(state.palette[resolveMode(state)].accent, 0.28) + ";color:inherit;}");
			}
			if (r.details && e.cursor) {
				out.push(GATE + " :where(textarea,input,[contenteditable=true],[data-lexical-editor]){caret-color:var(--ub-accent);}");
			}
			if (r.details && e.scrollbar) {
				out.push(GATE + " ::-webkit-scrollbar{width:9px;height:9px;}");
				out.push(GATE + " ::-webkit-scrollbar-track{background:transparent;}");
				out.push(GATE + " ::-webkit-scrollbar-thumb{background:" + rgba(state.palette[resolveMode(state)].border, 0.95) + ";border:2px solid transparent;background-clip:padding-box;border-radius:999px;}");
				out.push(GATE + " ::-webkit-scrollbar-thumb:hover{background:" + rgba(state.palette[resolveMode(state)].border, 1) + ";border:2px solid transparent;background-clip:padding-box;}");
			}
			if (state.wallpaper.style !== "none" && r.overlays) {
				out.push(GATE + " :where([role=dialog],[role=menu]){backdrop-filter:blur(" + state.materials.glassBlur + "px) saturate(160%);-webkit-backdrop-filter:blur(" + state.materials.glassBlur + "px) saturate(160%);}");
			}
			return out.join("");
		}

		function buildCss(state) {
			if (!state.enabled) return "";
			const mode = resolveMode(state);
			const p = state.palette[mode];
			const vars = tokenVars(state, mode);
			const out = [];
			out.push(GATE + " body[data-ub-mode=\"" + mode + "\"]{" + decls(vars) + "}");
			// the composer keeps its own surface so the wallpaper shows through
			if (state.regions.composer || state.regions.chat) {
				out.push(GATE + " [data-lexical-editor]{background:transparent;color:inherit;}");
			}
			/*
			 * Per-zone colours, hung on the anchors the shell really uses:
			 *   sidebar  -> the column, the sidebar body and the window strip all
			 *               read --dsw-specific-sidebar-fill, so the variable is enough
			 *   composer -> the card reads --dsw-specific-input-major
			 *   chat     -> the scrollport paints nothing itself, so tint it directly
			 */
			if (state.zones && state.zones.sidebar) {
				out.push(GATE + " body[data-ub-mode=\"" + mode + "\"]{--dsw-specific-sidebar-fill:" + state.zones.sidebar + ";}");
			}
			if (state.zones && state.zones.composer) {
				out.push(GATE + " [data-composer-seat]," + GATE + " [data-composer-card]{--dsw-specific-input-major:" + state.zones.composer + ";}");
			}
			if (state.zones && state.zones.chat) {
				out.push(GATE + " [data-conversation-scroll]{background-color:" + state.zones.chat + " !important;}");
			}
			if (state.regions.code) {
				out.push(GATE + " pre{background:" + rgba(p.codeBg, 0.9) + " !important;border-radius:var(--dsw-radius-lg);}");
			}
			if (state.materials.density !== 1) {
				out.push(GATE + " body{zoom:" + state.materials.density + ";}");
			}
			out.push(wallpaperCss(state));
			out.push(effectsCss(state));
			return out.join("");
		}

		/* ------------------------------------------------------------------ *
		 * Eye-care overlay
		 * ------------------------------------------------------------------ */
		function eyeActive(state) {
			if (!state.eye.enabled) return false;
			if (state.eye.schedule !== "on") return true;
			const now = new Date();
			const minutes = now.getHours() * 60 + now.getMinutes();
			const parse = (text) => {
				const [hh, mm] = String(text || "0:0").split(":").map((n) => parseInt(n, 10) || 0);
				return hh * 60 + mm;
			};
			const from = parse(state.eye.from);
			const to = parse(state.eye.to);
			return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
		}

		/* ------------------------------------------------------------------ *
		 * DOM presenter
		 * ------------------------------------------------------------------ */
		function createPresenter() {
			let themeStyle = null;
			let uiStyle = null;
			let veil = null;
			let observer = null;
			let timer = null;
			let current = null;
			/** Last generated stylesheet, so an identical rebuild never touches the DOM. */
			let lastCss = "";
			/** The one container currently carrying the wallpaper. */
			let lastSurface = null;
			/** Flattening jobs in flight, keyed like the cache above. */
			const pendingOpaque = new Set();
			/** Pictures that could not be flattened; never retried. */
			const failedOpaque = new Set();

			function ensureThemeStyle() {
				if (themeStyle && themeStyle.isConnected) return themeStyle;
				themeStyle = document.createElement("style");
				themeStyle.id = "dsh-ui-beautify-theme";
				themeStyle.dataset.plugin = PACKAGE_ID;
				document.head.append(themeStyle);
				return themeStyle;
			}

			function ensureUiStyle() {
				if (uiStyle && uiStyle.isConnected) return uiStyle;
				uiStyle = document.createElement("style");
				uiStyle.id = "dsh-ui-beautify-ui";
				uiStyle.dataset.plugin = PACKAGE_ID;
				document.head.append(uiStyle);
				return uiStyle;
			}

			function ensureVeil() {
				if (veil && veil.isConnected) return veil;
				veil = document.createElement("div");
				veil.id = "dsh-ui-beautify-eye";
				veil.setAttribute("aria-hidden", "true");
				veil.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483000;display:none;mix-blend-mode:multiply;";
				document.body.append(veil);
				return veil;
			}

			/**
			 * Paint the wallpaper on the conversation scroller only: the sidebar,
			 * the title bar and every dock keep their own surfaces.
			 *
			 * The target is memoised because every attribute write on a container
			 * that holds a large blurred layer makes the compositor rebuild it, and
			 * a freshly allocated GPU texture can show an uninitialised frame.
			 *
			 * @param state - the current theme document.
			 */
			function tagWallpaper(state) {
				const zoneTint = state.zones && typeof state.zones.chat === "string" ? state.zones.chat : "";
				let surface = null;
				if (state.enabled && state.wallpaper.style !== "none" && zoneTint === "") {
					const anchor = document.querySelector("[data-content-phase]") || document.querySelector("[data-lexical-editor]");
					if (anchor) {
						let node = anchor;
						while (node && node !== document.body) {
							let overflow = "";
							try { overflow = getComputedStyle(node).overflowY; } catch { overflow = ""; }
							if (overflow === "auto" || overflow === "scroll" || overflow === "overlay") { surface = node; break; }
							node = node.parentElement;
						}
						if (surface === null) surface = anchor.parentElement;
					}
				}
				if (lastSurface === surface && (surface === null || surface.isConnected)) return;
				if (lastSurface) lastSurface.removeAttribute("data-ub-wall");
				lastSurface = surface;
				if (lastSurface) lastSurface.setAttribute("data-ub-wall", "");
			}

			/**
			 * Make sure the picture behind a filtered layer carries no alpha.
			 *
			 * Runs once per picture per mode; when the flattened version arrives the
			 * theme is rebuilt, and because the URL changed the stylesheet does too.
			 *
			 * @param state - the theme document.
			 */
			function prepareOpaque(state) {
				const w = state && state.wallpaper;
				if (!w || w.style !== "image" || !state.enabled) return;
				const needsFilter = Number(w.blur) > 0 || Math.abs(Number(w.saturate) - 1) > 0.005;
				if (!needsFilter) return;
				const raw = rawWallpaperSource(state);
				if (raw === "" || /^(data|blob):/.test(raw)) return;
				const pal = state.palette[resolveMode(state)];
				const key = raw + "|" + pal.bg;
				if (opaqueWallpapers.has(key) || pendingOpaque.has(key) || failedOpaque.has(key)) return;
				pendingOpaque.add(key);
				void makeOpaque(raw, pal.bg).then((data) => {
					pendingOpaque.delete(key);
					if (typeof data !== "string" || data === raw) {
						failedOpaque.add(key);
						return;
					}
					opaqueWallpapers.set(key, data);
					if (opaqueWallpapers.size > 6) {
						const oldest = opaqueWallpapers.keys().next().value;
						if (oldest !== key) opaqueWallpapers.delete(oldest);
					}
					if (current) apply(current);
				});
			}

			function apply(state) {
				current = state;
				const root = document.documentElement;
				const body = document.body;
				if (!body || !document.head) return;
				try { tagWallpaper(state); } catch { }
				if (!state.enabled) {
					root.removeAttribute("data-ui-beautify");
					body.removeAttribute("data-ub-mode");
					for (const key of REGION_KEYS) body.removeAttribute("data-ub-region-" + key);
					if (themeStyle && lastCss !== "") themeStyle.textContent = "";
					lastCss = "";
					if (veil) veil.style.display = "none";
					return;
				}
				const mode = resolveMode(state);
				root.setAttribute("data-ui-beautify", "on");
				body.setAttribute("data-ub-mode", mode);
				for (const key of REGION_KEYS) body.setAttribute("data-ub-region-" + key, state.regions[key] ? "on" : "off");
				/*
				 * Only touch the stylesheet when the generated CSS actually changed.
				 * Rewriting an identical sheet re-rasterises the blurred wallpaper
				 * layer for no reason, and the periodic watchdog would do it every
				 * minute forever.
				 */
				const css = buildCss(state);
				if (css !== lastCss) {
					ensureThemeStyle().textContent = css;
					lastCss = css;
				}
				if (state.eye.enabled && eyeActive(state)) {
					const node = ensureVeil();
					node.style.display = "block";
					node.style.background = "rgb(255, 176, 92)";
					node.style.opacity = String(state.eye.strength);
				} else if (veil) veil.style.display = "none";
				prepareOpaque(state);
			}

			function watch(listener) {
				if (observer) return;
				observer = new MutationObserver(() => listener());
				observer.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
				timer = window.setInterval(() => listener(), 60000);
			}

			return {
				apply,
				watch,
				installUi(css) { ensureUiStyle().textContent = css; },
				dispose() {
					try { observer?.disconnect(); } catch { }
					if (timer) window.clearInterval(timer);
					observer = null;
					timer = null;
					lastCss = "";
					if (lastSurface) { try { lastSurface.removeAttribute("data-ub-wall"); } catch { } lastSurface = null; }
					themeStyle?.remove();
					uiStyle?.remove();
					veil?.remove();
					themeStyle = uiStyle = veil = null;
					document.documentElement.removeAttribute("data-ui-beautify");
					for (const key of REGION_KEYS) document.body.removeAttribute("data-ub-region-" + key);
					document.body.removeAttribute("data-ub-mode");
				},
			};
		}

		/* ------------------------------------------------------------------ *
		 * Store
		 * ------------------------------------------------------------------ */
		function createStore(initial) {
			let snapshot = initial;
			const listeners = new Set();
			return {
				getSnapshot: () => snapshot,
				subscribe(fn) {
					listeners.add(fn);
					return () => listeners.delete(fn);
				},
				set(next) {
					snapshot = next;
					for (const fn of [...listeners]) fn();
				},
				update(fn) {
					this.set(fn(snapshot));
				},
			};
		}

		/* ------------------------------------------------------------------ *
		 * Share codes
		 * ------------------------------------------------------------------ */
		function toBase64Url(text) {
			const bytes = new TextEncoder().encode(text);
			let binary = "";
			for (const byte of bytes) binary += String.fromCharCode(byte);
			return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		}

		function fromBase64Url(code) {
			const padded = code.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((code.length + 3) % 4);
			const binary = atob(padded);
			const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
			return new TextDecoder().decode(bytes);
		}

		function encodeTheme(name, state) {
			const payload = {
				dsh: "ui-beautify",
				v: 1,
				name: name || state.customName || L("我的方案", "My theme"),
				state: {
					palette: state.palette,
					materials: state.materials,
					effects: state.effects,
					wallpaper: { ...state.wallpaper, image: state.wallpaper.style === "animated" ? "" : state.wallpaper.image },
					regions: state.regions,
				},
			};
			return "UB1." + toBase64Url(JSON.stringify(payload));
		}

		function decodeTheme(code) {
			const text = String(code || "").trim().replace(/\s+/g, "");
			if (!text.startsWith("UB1.")) throw new Error(L("配置码格式不正确", "Not a UI Beautify code"));
			const payload = JSON.parse(fromBase64Url(text.slice(4)));
			if (payload.dsh !== "ui-beautify" || !isObj(payload.state)) throw new Error(L("配置码内容无效", "Invalid theme payload"));
			return payload;
		}

		/* ------------------------------------------------------------------ *
		 * UI CSS (always loaded while the plugin is enabled in Settings)
		 * ------------------------------------------------------------------ */
		const UI_CSS = `
.ub-root{--ub-fg:var(--dsw-alias-label-primary,#1c1f26);--ub-muted:var(--dsw-alias-label-secondary,#6b7280);--ub-line:var(--dsw-alias-border-l2,rgba(0,0,0,.12));--ub-card:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-1,#fff));--ub-stroke:var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l1,rgba(0,0,0,.08)));--ub-accent:var(--dsw-alias-brand-primary,#0a84ff);color:var(--ub-fg);font-size:13px;line-height:1.5;max-width:760px;margin:0 auto;padding:2px 2px 40px;display:flex;flex-direction:column;gap:14px}
.ub-hero{position:relative;border-radius:16px;padding:16px 18px;background:linear-gradient(135deg,color-mix(in srgb,var(--ub-accent) 12%,transparent),transparent 55%),var(--ub-card);border:1px solid var(--ub-stroke);display:flex;gap:14px;align-items:center;justify-content:space-between;overflow:hidden}
.ub-hero-main{min-width:0}
.ub-title{font-size:16px;font-weight:600;letter-spacing:.01em;margin:0 0 4px}
.ub-sub{color:var(--ub-muted);font-size:12px;margin:0}
.ub-hero-side{display:flex;align-items:center;gap:12px;flex-shrink:0}
.ub-state{font-size:12px;color:var(--ub-muted);text-align:right}
.ub-search{position:relative;display:flex;flex-direction:column;gap:6px}
.ub-search-input{width:100%;max-width:none;box-sizing:border-box;padding:6px 10px;border-radius:10px}
.ub-search-hits{display:flex;flex-wrap:wrap;gap:6px}
.ub-search-hit{border:1px solid var(--ub-line);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--ub-fg);border-radius:999px;padding:3px 10px;font-size:11.5px;cursor:pointer}
.ub-search-hit:hover{border-color:var(--ub-accent);color:var(--ub-accent)}
.ub-search-empty{font-size:11.5px;color:var(--ub-muted)}
.ub-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:2px 2px 8px}
.ub-tabs::-webkit-scrollbar{display:none}
.ub-tab{border:1px solid transparent;background:transparent;color:var(--ub-muted);border-radius:999px;padding:5px 12px;font-size:12px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s,border-color .15s}
.ub-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--ub-fg)}
.ub-tab[aria-selected=true]{background:var(--dsw-alias-bg-layer-2,var(--ub-card));color:var(--ub-fg);border-color:var(--ub-stroke);font-weight:600}
.ub-card{border:1px solid var(--ub-stroke);background:var(--ub-card);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:2px}
.ub-card-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:2px}
.ub-card-title{font-size:13px;font-weight:600;margin:0}
.ub-card-desc{font-size:11.5px;color:var(--ub-muted);margin:0 0 4px}
.ub-row{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:8px 0;border-top:1px solid color-mix(in srgb,var(--ub-line) 55%,transparent)}
.ub-row:first-of-type{border-top:0}
.ub-row-main{min-width:0}
.ub-row-label{font-size:12.5px}
.ub-row-hint{font-size:11px;color:var(--ub-muted);margin-top:2px;max-width:380px}
.ub-row-ctl{display:flex;align-items:center;gap:8px;flex-shrink:0}
.ub-sw{width:38px;height:22px;border-radius:999px;border:1px solid var(--ub-line);background:color-mix(in srgb,var(--ub-muted) 22%,transparent);position:relative;cursor:pointer;padding:0;transition:background .18s,border-color .18s;flex-shrink:0}
.ub-sw[aria-pressed=true]{background:var(--ub-accent);border-color:transparent}
.ub-sw>span{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .18s;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.ub-sw[aria-pressed=true]>span{transform:translateX(16px)}
.ub-sw:disabled{opacity:.45;cursor:not-allowed}
.ub-range{display:flex;align-items:center;gap:10px}
.ub-range input[type=range]{-webkit-appearance:none;appearance:none;width:150px;height:18px;background:transparent;border:0;padding:0;margin:0;cursor:pointer}
.ub-range input[type=range]:focus{outline:none}
.ub-range input[type=range]::-webkit-slider-runnable-track{height:5px;border-radius:999px;background:linear-gradient(to right,var(--ub-accent) 0%,var(--ub-accent) var(--ub-fill,0%),color-mix(in srgb,var(--ub-muted) 26%,transparent) var(--ub-fill,0%),color-mix(in srgb,var(--ub-muted) 26%,transparent) 100%);border:0}
.ub-range input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;margin-top:-4px;border-radius:50%;background:#fff;border:2px solid var(--ub-accent);box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .12s ease}
.ub-range input[type=range]:active::-webkit-slider-thumb{transform:scale(1.15)}
.ub-range input[type=range]::-moz-range-track{height:5px;border-radius:999px;background:color-mix(in srgb,var(--ub-muted) 26%,transparent);border:0}
.ub-range input[type=range]::-moz-range-progress{height:5px;border-radius:999px;background:var(--ub-accent)}
.ub-range input[type=range]::-moz-range-thumb{width:11px;height:11px;border-radius:50%;background:#fff;border:2px solid var(--ub-accent)}
.ub-num{font-variant-numeric:tabular-nums;font-size:11.5px;color:var(--ub-muted);min-width:44px;text-align:right}
.ub-color{display:flex;align-items:center;gap:6px}
.ub-color input[type=color]{width:26px;height:22px;padding:0;border:1px solid var(--ub-line);border-radius:6px;background:none;cursor:pointer}
.ub-color input[type=text]{width:76px;font-size:11px;font-family:ui-monospace,monospace;padding:3px 6px;border-radius:6px;border:1px solid var(--ub-line);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--ub-fg)}
.ub-select,.ub-text{font-size:12px;padding:4px 8px;border-radius:8px;border:1px solid var(--ub-line);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--ub-fg);max-width:220px}
.ub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.ub-preset{border:1px solid var(--ub-stroke);border-radius:12px;overflow:hidden;background:var(--ub-card);cursor:pointer;text-align:left;padding:0;transition:transform .15s,border-color .15s,box-shadow .15s;color:inherit}
.ub-preset:hover{transform:translateY(-1px);border-color:var(--ub-accent)}
.ub-preset[data-active=true]{border-color:var(--ub-accent);box-shadow:0 0 0 1px var(--ub-accent)}
.ub-prev{height:62px;position:relative;display:flex;flex-direction:column;gap:4px;padding:8px}
.ub-prev-bar{height:12px;border-radius:4px;opacity:.9}
.ub-prev-line{height:5px;border-radius:3px;opacity:.75}
.ub-prev-pill{position:absolute;right:8px;bottom:8px;width:26px;height:10px;border-radius:999px;opacity:.95}
.ub-preset-label{padding:7px 9px;font-size:11.5px;font-weight:600;border-top:1px solid var(--ub-stroke);display:flex;justify-content:space-between;align-items:center;gap:6px}
.ub-badge{font-size:10px;font-weight:500;color:var(--ub-muted);background:color-mix(in srgb,var(--ub-muted) 14%,transparent);padding:1px 5px;border-radius:999px}
.ub-actions{display:flex;flex-wrap:wrap;gap:8px}
.ub-btn{border:1px solid var(--ub-line);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--ub-fg);border-radius:8px;padding:5px 11px;font-size:12px;cursor:pointer;transition:background .15s,border-color .15s}
.ub-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}
.ub-btn[data-tone=primary]{background:var(--ub-accent);border-color:transparent;color:#fff}
.ub-btn[data-tone=primary]:hover{filter:brightness(1.06)}
.ub-btn[data-tone=danger]{color:var(--dsw-alias-state-error-primary,#dc2626)}
.ub-btn:disabled{opacity:.5;cursor:not-allowed}
.ub-empty{font-size:11.5px;color:var(--ub-muted);padding:6px 0}
.ub-note{font-size:11px;color:var(--ub-muted);margin:6px 0 0}
.ub-modal{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;background:rgba(6,8,12,.55);backdrop-filter:blur(4px);padding:24px}
.ub-modal-card{width:min(620px,94vw);max-height:82vh;overflow:auto;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--ub-stroke);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--dsw-elevation-prompt,0 18px 48px rgba(0,0,0,.35))}
.ub-modal-title{font-size:14px;font-weight:600;margin:0}
.ub-code{width:100%;min-height:110px;resize:vertical;font-family:ui-monospace,monospace;font-size:11px;padding:8px;border-radius:8px;border:1px solid var(--ub-line);background:var(--dsw-alias-bg-layer-2,transparent);color:var(--ub-fg)}
.ub-inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ub-saved{font-size:11px;color:var(--ub-muted)}
.ub-wall{display:flex;align-items:center;gap:10px;padding:8px 0}
.ub-wall-img{width:96px;height:54px;object-fit:cover;border-radius:8px;border:1px solid var(--ub-stroke);background:var(--dsw-alias-bg-layer-2,transparent)}
.ub-wall-meta{font-size:11.5px}
.ub-wall-hint{font-size:11px;color:var(--ub-muted);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ub-stage{border-radius:12px;border:1px solid var(--ub-stroke);padding:10px;display:flex;flex-direction:column;gap:8px;min-height:118px;overflow:hidden;position:relative}
.ub-stage-row{display:flex;gap:8px;align-items:center}
.ub-stage-card{flex:1;border-radius:8px;padding:7px 9px;font-size:11px;line-height:1.45}
.ub-stage-input{border-radius:999px;padding:7px 10px;font-size:11px;color:var(--ub-muted);display:flex;justify-content:space-between;align-items:center}
.ub-stage-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px}
.ub-ai-box{box-sizing:border-box;display:block;width:100%;max-width:100%;min-height:76px;resize:vertical;padding:8px 10px;border-radius:10px;border:1px solid var(--ub-line);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--ub-fg);font-size:12px;font-family:inherit}
.ub-card,.ub-row,.ub-inline{min-width:0}
.ub-lib{display:flex;flex-wrap:wrap;gap:6px;padding:6px 0}
.ub-lib-cell{position:relative;display:block}
.ub-lib-item{width:68px;height:42px;padding:0;border-radius:8px;overflow:hidden;border:1px solid var(--ub-stroke);background:none;cursor:pointer;position:relative}
.ub-lib-item img{width:100%;height:100%;object-fit:cover;display:block}
.ub-lib-item[data-active=true]{box-shadow:0 0 0 2px var(--ub-accent)}
.ub-lib-del{position:absolute;top:-5px;right:-5px;width:16px;height:16px;line-height:14px;padding:0;border-radius:50%;font-size:12px;text-align:center;cursor:pointer;border:1px solid var(--ub-stroke);background:var(--ub-surface,var(--dsw-alias-bg-layer-2,#222));color:inherit;opacity:0;transition:opacity .15s ease}
.ub-lib-cell:hover .ub-lib-del{opacity:1}
.ub-reset{border:0;background:transparent;color:var(--ub-muted);cursor:pointer;font-size:12px;line-height:1;padding:2px 4px;border-radius:6px;opacity:.55}
.ub-reset:hover{opacity:1;background:var(--dsw-alias-interactive-bg-hover,transparent)}
.ub-ai-result{margin-top:6px;font-size:11.5px;color:var(--ub-muted);line-height:1.55}
.ub-check{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ub-muted);cursor:pointer;user-select:none}
.ub-check input{accent-color:var(--ub-accent);width:13px;height:13px}
.ub-title-row{display:flex;align-items:flex-end;gap:7px;margin:0 0 4px}
.ub-version{font-size:11px;color:var(--ub-muted);font-variant-numeric:tabular-nums;transform:translateY(-1px)}
`;

		/* ------------------------------------------------------------------ *
		 * Tiny presentational components
		 * ------------------------------------------------------------------ */
		function Switch({ checked, onChange, disabled, title }) {
			return h("button", {
				type: "button",
				className: "ub-sw",
				role: "switch",
				"aria-pressed": !!checked,
				"aria-checked": !!checked,
				title,
				disabled,
				onClick: () => onChange(!checked),
			}, h("span", null));
		}

				/** Set by the mounted settings page so any Row can reset itself. */
		let rowReset = null;

		function Row({ label, hint, path, children }) {
			const helper = rowReset === null ? null : { reset: rowReset };
			return h("div", { className: "ub-row" },
				h("div", { className: "ub-row-main" },
					h("div", { className: "ub-row-label" }, label),
					hint ? h("div", { className: "ub-row-hint" }, hint) : null),
				h("div", { className: "ub-row-ctl" }, children,
					path && helper ? h("button", {
						type: "button", className: "ub-reset", title: L("恢复默认", "Reset"),
						onClick: () => helper.reset(path),
					}, "↺") : null));
		}

		function Slider({ value, min, max, step, unit, onChange, width }) {
			const v = Number(value);
			const span = Number(max) - Number(min) || 1;
			const percent = clamp(((v - Number(min)) / span) * 100, 0, 100).toFixed(1) + "%";
			return h("div", { className: "ub-range" },
				h("input", {
					type: "range", min, max, step, value: v,
					style: { width: width || undefined, "--ub-fill": percent },
					onChange: (event) => onChange(Number(event.target.value)),
				}),
				h("span", { className: "ub-num" }, (Math.round(v * 100) / 100) + (unit || "")));
		}

		function ColorField({ value, onChange }) {
			const [text, setText] = React.useState(value);
			React.useEffect(() => setText(value), [value]);
			return h("div", { className: "ub-color" },
				h("input", { type: "color", value, onChange: (event) => onChange(event.target.value) }),
				h("input", {
					type: "text", value: text, spellCheck: false,
					onChange: (event) => {
						setText(event.target.value);
						const next = normalizeHex(event.target.value, null);
						if (next) onChange(next);
					},
					onBlur: () => setText(value),
				}));
		}

		function Card({ title, desc, right, children }) {
			return h("section", { className: "ub-card" },
				h("div", { className: "ub-card-head" },
					h("div", null,
						h("h3", { className: "ub-card-title" }, title),
						desc ? h("p", { className: "ub-card-desc" }, desc) : null),
					right || null),
				children);
		}

		function PresetTile({ preset, state, active, onApply }) {
			const mode = resolveMode(state);
			const p = preset.palette[mode];
			return h("button", {
				type: "button", className: "ub-preset", "data-active": active,
				onClick: () => onApply(preset.id), title: preset.tag[ZH ? "zh" : "en"],
			},
				h("div", { className: "ub-prev", style: { background: p.bg } },
					h("div", { className: "ub-prev-bar", style: { background: p.surface, width: "62%" } }),
					h("div", { className: "ub-prev-bar", style: { background: p.bubble, width: "86%" } }),
					h("div", { className: "ub-prev-line", style: { background: p.border, width: "48%" } }),
					h("div", { className: "ub-prev-bar", style: { background: p.surfaceAlt, width: "72%" } }),
					h("div", { className: "ub-prev-pill", style: { background: p.accent } })),
				h("div", { className: "ub-preset-label" },
					h("span", null, preset.name[ZH ? "zh" : "en"]),
					active ? h("span", { className: "ub-badge" }, L("使用中", "Active")) : null));
		}

		function Modal({ title, onClose, children }) {
			React.useEffect(() => {
				const onKey = (event) => { if (event.key === "Escape") onClose(); };
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [onClose]);
			return h("div", { className: "ub-modal", onMouseDown: (event) => { if (event.target === event.currentTarget) onClose(); } },
				h("div", { className: "ub-modal-card" },
					h("div", { className: "ub-card-head" },
						h("h3", { className: "ub-modal-title" }, title),
						h("button", { type: "button", className: "ub-btn", onClick: onClose }, L("关闭", "Close"))),
					children));
		}

		/* ------------------------------------------------------------------ *
		 * Section body
		 * ------------------------------------------------------------------ */
		class SectionBoundary extends React.Component {
			constructor(props) {
				super(props);
				this.state = { error: null };
			}
			static getDerivedStateFromError(error) {
				return { error };
			}
			render() {
				if (this.state.error) {
					return h("div", { className: "ub-root" },
						h("div", { className: "ub-card" },
							h("h3", { className: "ub-card-title" }, L("界面美化暂时无法显示", "UI Beautify could not render")),
							h("p", { className: "ub-card-desc" }, String(this.state.error && this.state.error.message || this.state.error)),
							h("button", { type: "button", className: "ub-btn", onClick: () => this.setState({ error: null }) }, L("重试", "Retry"))));
				}
				return this.props.children;
			}
		}

		function BeautifySectionSafe(props) {
			return h(SectionBoundary, null, h(BeautifySection, props));
		}

		function BeautifySection(props) {
			const store = props.store || activeStore;
			if (!store) {
				return h("div", { className: "ub-root" },
					h("div", { className: "ub-card" },
						h("h3", { className: "ub-card-title" }, L("界面美化正在初始化", "UI Beautify is starting")),
						h("p", { className: "ub-card-desc" }, L("插件尚未准备好，重新打开设置即可", "The plugin is not ready yet; reopen Settings."))));
			}
			const snap = React.useSyncExternalStore(store.subscribe, store.getSnapshot);
			const state = snap.state;
			const [tab, setTab] = React.useState("presets");
			const [dialog, setDialog] = React.useState(null);
			const [code, setCode] = React.useState("");
			const [message, setMessage] = React.useState("");
			const [saveName, setSaveName] = React.useState(state.customName || "");
			const [aiPrompt, setAiPrompt] = React.useState("");
			const [aiBase, setAiBase] = React.useState(true);
			const [aiBusy, setAiBusy] = React.useState(false);
			const [aiResult, setAiResult] = React.useState("");
			const [aiKey, setAiKey] = React.useState("");
			const [search, setSearch] = React.useState("");
			const [aiHistory, setAiHistory] = React.useState([]);
			const undoStack = React.useRef([]);
			/** The hidden file picker behind "style from a picture". */
			const referenceInput = React.useRef(null);

			const remember = () => {
				undoStack.current.push(clone(store.getSnapshot().state));
				if (undoStack.current.length > 12) undoStack.current.shift();
			};

			const resetPath = (path) => {
				remember();
				store.update((prev) => ({ ...prev, dirty: true, state: setIn(prev.state, path, getIn(defaults(), path)) }));
			};

			rowReset = resetPath;

			const undo = () => {
				const previous = undoStack.current.pop();
				if (!previous) {
					setMessage(L("没有可撤销的操作", "Nothing to undo"));
					return;
				}
				store.update((prev) => ({ ...prev, dirty: true, state: previous }));
				setMessage(L("已撤销一步", "Undone"));
			};

			const patch = (path, value) => {
				remember();
				store.update((prev) => ({
					...prev,
					dirty: true,
					state: setIn(prev.state, path, value),
				}));
			};

			const patchMany = (entries) => store.update((prev) => {
				let next = prev.state;
				for (const [path, value] of entries) next = setIn(next, path, value);
				return { ...prev, dirty: true, state: next };
			});

			const applyPreset = (id) => {
				const preset = PRESET_BY_ID[id];
				if (!preset) return;
				store.update((prev) => ({
					...prev,
					dirty: true,
					state: normalizeState({
						...prev.state,
						presetId: id,
						enabled: true,
						palette: clone(preset.palette),
						materials: { ...prev.state.materials, ...preset.materials },
						effects: { ...prev.state.effects, ...preset.effects },
					}),
				}));
			};

			const saveCustom = () => {
				const name = (saveName || "").trim() || L("我的方案 " + (state.custom.length + 1), "My theme " + (state.custom.length + 1));
				const item = {
					id: "c" + Date.now().toString(36),
					name,
					createdAt: Date.now(),
					state: {
						palette: clone(state.palette),
						materials: clone(state.materials),
						effects: clone(state.effects),
						wallpaper: clone(state.wallpaper),
						regions: clone(state.regions),
						mode: state.mode,
					},
				};
				store.update((prev) => ({
					...prev,
					dirty: true,
					state: { ...prev.state, custom: [...prev.state.custom, item], customName: name, presetId: "custom" },
				}));
				setMessage(L("已保存方案：" + name, "Saved: " + name));
			};

			const loadCustom = (item) => {
				store.update((prev) => ({
					...prev,
					dirty: true,
					state: normalizeState({ ...prev.state, ...clone(item.state), enabled: true, presetId: "custom", customName: item.name }),
				}));
			};

			const removeCustom = (id) => {
				store.update((prev) => ({
					...prev,
					dirty: true,
					state: { ...prev.state, custom: prev.state.custom.filter((item) => item.id !== id) },
				}));
			};

			const exportCode = (name, value) => {
				try {
					setCode(encodeTheme(name, value));
					setMessage("");
				} catch (error) {
					setMessage(String(error && error.message || error));
				}
			};

			const importCode = () => {
				try {
					const payload = decodeTheme(code);
					store.update((prev) => ({
						...prev,
						dirty: true,
						state: normalizeState({
							...prev.state,
							...payload.state,
							enabled: true,
							presetId: "custom",
							customName: payload.name || "",
						}),
					}));
					setDialog(null);
					setMessage(L("已导入：" + (payload.name || "主题"), "Imported: " + (payload.name || "theme")));
				} catch (error) {
					setMessage(String(error && error.message || error));
				}
			};

			/**
			 * Drop one image from the library, host side and state side.
			 *
			 * @param id - library entry id.
			 */
			const removeWallpaper = (id) => {
				const endpoint = stateEndpoint();
				const base = endpoint === null ? null : endpoint.replace(/\/state$/, "/wallpaper");
				const forget = () => {
					hostWallpapers = hostWallpapers.filter((entry) => entry.id !== id);
					remember();
					store.update((prev) => {
						const remaining = prev.state.wallpapers.filter((item) => item.id !== id);
						const active = prev.state.wallpaper.image === "wall:" + id;
						const image = active ? (remaining.length > 0 ? "wall:" + remaining[0].id : "") : prev.state.wallpaper.image;
						const style = active && remaining.length === 0 ? "none" : prev.state.wallpaper.style;
						return {
							...prev,
							dirty: true,
							state: { ...prev.state, wallpapers: remaining, wallpaper: { ...prev.state.wallpaper, image, style } },
						};
					});
				};
				if (base === null) {
					forget();
					return;
				}
				fetch(base + "?id=" + encodeURIComponent(id), { method: "DELETE", credentials: "same-origin" })
					.then((response) => {
						forget();
						if (!response.ok) setMessage(L("已从列表移除，但磁盘上的文件没删掉", "Removed from the list, the file on disk survived"));
					})
					.catch(() => {
						forget();
						setMessage(L("已从列表移除，但磁盘上的文件没删掉", "Removed from the list, the file on disk survived"));
					});
			};

			const downloadJson = () => {
				try {
					const payload = { dsh: "ui-beautify", v: 1, name: state.customName || L("我的方案", "My theme"), state };
					const blob = new Blob([JSON.stringify({ ...payload, v: 2, wallpaper: state.wallpapers }, null, 2)], { type: "application/json" });
					const url = URL.createObjectURL(blob);
					const anchor = document.createElement("a");
					anchor.href = url;
					anchor.download = "dsh-ui-beautify-" + new Date().toISOString().slice(0, 10) + ".dshbeautify";
					anchor.click();
					setTimeout(() => URL.revokeObjectURL(url), 2000);
				} catch (error) {
					setMessage(String(error && error.message || error));
				}
			};

			const applyAi = async () => {
				const text = aiPrompt.trim();
				if (text === "") {
					setAiResult(L("先写一句你想要的风格", "Describe the style first"));
					return;
				}
				setAiBusy(true);
				setAiResult("");
				const base = aiBase ? state : null;
				let result = null;
				const endpoint = stateEndpoint();
				let aiError = "";
				if (endpoint === null) aiError = "no-endpoint";
				if (endpoint) {
					try {
						const response = await fetch(endpoint.replace(/\/state$/, "/ai"), {
							method: "POST",
							headers: { "content-type": "application/json" },
							credentials: "same-origin",
							body: JSON.stringify({
								prompt: text, base, locale: ZH ? "zh" : "en",
								key: aiKey.trim() || undefined,
								history: state.aiMemory ? aiHistory.slice(-6) : [],
								memory: state.aiMemory,
							}),
						});
						if (response.ok) result = await response.json();
						else {
							const failure = await response.json().catch(() => ({}));
							aiError = "HTTP " + response.status + (failure && failure.error ? " " + failure.error : "");
						}
					} catch (error) {
						result = null;
						aiError = String(error && error.message || error);
					}
				}
				if (!result || !result.ok) {
					result = localInterpret(text, base);
					result.engine = "local";
				}
				const preset = result.preset ? PRESET_BY_ID[result.preset] : null;
				store.update((prev) => {
					let next = base ? clone(prev.state) : normalizeState({ ...defaults(), enabled: true });
					if (preset) {
						next = {
							...next,
							presetId: preset.id,
							palette: clone(preset.palette),
							materials: { ...next.materials, ...preset.materials },
							effects: { ...next.effects, ...preset.effects },
							wallpaper: { ...next.wallpaper, ...preset.wallpaper },
						};
					}
					if (result.state) next = deepMerge(next, result.state);
					next = normalizeState({ ...next, enabled: true, presetId: preset ? preset.id : (next.presetId === "none" ? "custom" : next.presetId) });
					return { ...prev, dirty: true, state: next };
				});
				if (state.aiMemory) {
					setAiHistory((prev) => [...prev, { role: "user", text }, { role: "assistant", text: String(result.message || "") }].slice(-12));
				}
				const changed = result.state ? Object.keys(result.state).filter((key) => key !== "reply").join("/") : "";
				setAiResult((result.message ? result.message + " · " : "") + (changed ? L("改动了 " + changed + " · ", "changed " + changed + " · ") : "") + (result.engine === "local" ? L("本地解析（模型未调用：" + aiError + "）", "local parser (model not called: " + aiError + ")") : (result.model || "AI")));
				setAiBusy(false);
			};

			const paletteField = (mode, key) => h(ColorField, {
				value: state.palette[mode][key],
				onChange: (value) => patch(["palette", mode, key], value),
			});

			const tabs = [
				["presets", L("方案", "Presets")],
				["ai", L("AI 定制", "AI")],
				["appearance", L("外观", "Appearance")],
				["palette", L("颜色", "Colors")],
				["materials", L("材质", "Materials")],
				["motion", L("动效", "Motion")],
				["layout", L("布局", "Layout")],
				["background", L("背景", "Background")],
				["details", L("细节", "Details")],
				["more", L("更多", "More")],
			];

			const body = [];
			if (tab === "presets") {
				const pal = state.palette[resolveMode(state)];
				const radius = (10 * state.materials.radius).toFixed(1) + "px";
				const surfaceAlpha = state.materials.glass ? state.materials.panelAlpha : 1;
				body.push(h(Card, { key: "p0", title: L("当前效果预览", "Live preview"), desc: L("改任何参数这里都会跟着变", "Follows every change you make") },
					h("div", { className: "ub-stage", style: { background: pal.bg } },
						h("div", { className: "ub-stage-row" },
							h("div", { className: "ub-stage-dot", style: { background: rgba(pal.accent, 0.18), color: pal.accent, borderRadius: "8px" } }, "AI"),
							h("div", { className: "ub-stage-card", style: { background: rgba(pal.surface, surfaceAlpha), color: pal.text, borderRadius: radius, border: "1px solid " + rgba(pal.border, 0.8) } },
								L("这是你当前配色的预览", "A preview of your current palette"),
								h("div", { style: { marginTop: 6, color: pal.muted, fontSize: 10.5 } }, L("次要文字与边框", "Secondary text and border")))),
						h("div", { className: "ub-stage-row", style: { justifyContent: "flex-end" } },
							h("div", { className: "ub-stage-card", style: { background: rgba(pal.bubbleSelf, 0.9), color: pal.text, borderRadius: radius, maxWidth: "72%" } },
								L("你的消息长这样", "Your message looks like this"))),
						h("div", { className: "ub-stage-input", style: { background: rgba(pal.surfaceAlt, 0.92), border: "1px solid " + rgba(pal.border, 0.85) } },
							h("span", null, L("输入框", "Composer")),
							h("span", { style: { width: 22, height: 22, borderRadius: 999, background: pal.accent, display: "inline-block" } })))));
				body.push(h(Card, { key: "p1", title: L("一键切换方案", "One-click presets"), desc: L("点击即应用，开启总开关后立即生效", "Click to apply; takes effect as soon as the master switch is on.") },
					h("div", { className: "ub-grid" }, PRESETS.map((preset) => h(PresetTile, {
						key: preset.id, preset, state, active: state.presetId === preset.id, onApply: applyPreset,
					}))),
					h("p", { className: "ub-note" }, L("切换方案会覆盖颜色、材质、动效与背景；你自己的自定义方案不受影响", "Switching a preset overwrites colors, materials, motion and background; your saved themes are untouched."))));
				const customGrid = state.custom.length === 0
					? h("p", { className: "ub-empty" }, L("还没有自定义方案", "No saved themes yet."))
					: h("div", { className: "ub-grid" }, state.custom.map((item) => {
						const mode = resolveMode(state);
						const pal = item.state && item.state.palette ? item.state.palette[mode] : state.palette[mode];
						return h("div", {
							key: item.id, className: "ub-preset",
							"data-active": state.customName === item.name,
							role: "button", tabIndex: 0,
							onClick: () => loadCustom(item),
						},
							h("div", { className: "ub-prev", style: { background: pal.bg } },
								h("div", { className: "ub-prev-bar", style: { background: pal.surface, width: "62%" } }),
								h("div", { className: "ub-prev-bar", style: { background: pal.bubble, width: "86%" } }),
								h("div", { className: "ub-prev-pill", style: { background: pal.accent } })),
							h("div", { className: "ub-preset-label" },
								h("span", null, item.name),
								h("button", {
									type: "button", className: "ub-btn",
									style: { padding: "1px 6px", fontSize: 10 },
									onClick: (event) => { event.stopPropagation(); removeCustom(item.id); },
								}, L("删除", "Delete"))));
					}));
				body.push(h(Card, { key: "p2", title: L("我的方案", "My themes"), desc: L("保存当前全套设置为一个方案，之后一键切回", "Save the current look as a named theme and switch back any time.") },
					h("div", { className: "ub-inline" },
						h("input", { className: "ub-text", placeholder: L("方案名称", "Theme name"), value: saveName, onChange: (event) => setSaveName(event.target.value) }),
						h("button", { type: "button", className: "ub-btn", "data-tone": "primary", onClick: saveCustom }, L("保存当前", "Save current")),
						h("button", { type: "button", className: "ub-btn", onClick: () => { setCode(encodeTheme(state.customName, state)); setDialog("export"); } }, L("导出配置码", "Export code")),
						h("button", { type: "button", className: "ub-btn", onClick: () => { setCode(""); setDialog("import"); } }, L("导入配置码", "Import code"))),
					customGrid));
			}
			if (tab === "ai") {
				const examples = [
					L("深夜写代码，深色，紫色霓虹，边框发光", "late night coding, dark, violet neon, glowing edges"),
					L("干净的白色，少动效，像文档", "clean white, little motion, document-like"),
					L("暖色纸张，护眼，圆角柔和", "warm paper, easy on the eyes, soft corners"),
					L("赛博朋克终端，绿色字，强光效", "cyberpunk terminal, green text, strong glow"),
				];
				body.push(h(Card, { key: "ai1", title: L("用一句话描述你想要的界面", "Describe the look in one sentence"), desc: L("模型挑最接近的方案再微调，然后直接应用", "The model picks the closest preset, tunes it, then applies it") },
					h("textarea", {
						className: "ub-ai-box",
						value: aiPrompt,
						placeholder: L("例如：深夜写代码，想要深色，紫色霓虹，边框有发光感，动效强一点", "e.g. late-night coding, dark, violet neon, glowing edges, more motion"),
						onChange: (event) => setAiPrompt(event.target.value),
					}),
					h("div", { className: "ub-actions", style: { marginTop: 8, alignItems: "center" } },
						h("button", { type: "button", className: "ub-btn", "data-tone": "primary", disabled: aiBusy, onClick: () => { void applyAi(); } },
							aiBusy ? L("生成中…", "Working…") : L("生成并应用", "Generate & apply")),
						h("label", { className: "ub-check" },
							h("input", { type: "checkbox", checked: aiBase, onChange: (event) => setAiBase(event.target.checked) }),
							L("在现在的基础上修改", "Build on my current look")),
						h("label", { className: "ub-check" },
							h("input", { type: "checkbox", checked: state.aiMemory !== false, onChange: (event) => patch(["aiMemory"], event.target.checked) }),
							L("记住这一轮的上下文", "Remember this conversation"))),
					h("div", { className: "ub-inline", style: { marginTop: 8, gap: 6 } },
						examples.map((example, index) => h("button", {
							key: index, type: "button", className: "ub-btn",
							style: { fontSize: 11, padding: "3px 9px" },
							onClick: () => setAiPrompt(example),
						}, example))),
					h("div", { className: "ub-inline", style: { marginTop: 6 } },
						h("button", {
							type: "button", className: "ub-btn", style: { fontSize: 11, padding: "3px 9px" },
							onClick: () => {
								const input = referenceInput.current;
								if (input && typeof input.click === "function") input.click();
							},
						}, L("从参考图取风格", "Style from a picture")),
						h("input", {
							ref: referenceInput,
							type: "file", accept: "image/*", style: { display: "none" },
							onChange: (event) => {
								const input = event.target;
								const file = input && input.files && input.files[0];
								if (!file) return;
								readReferencePalette(file, (palette) => {
									/* the picker keeps its value, so the same file must be pickable twice */
									try { input.value = ""; } catch { }
									if (palette === null) {
										setMessage(L("这张图解析失败，换一张试试", "Could not read that picture"));
										return;
									}
									remember();
									store.update((prev) => ({
										...prev,
										dirty: true,
										state: normalizeState({
											...prev.state,
											enabled: true,
											presetId: "custom",
											customName: L("参考图配色", "From picture"),
											palette: {
												light: { ...prev.state.palette.light, ...palette },
												dark: derivePalette(palette, "dark"),
											},
										}),
									}));
									setMessage(L("已从这张图生成配色", "Palette generated from the picture"));
								});
							},
						})),
					h(Row, { label: L("API Key（可选）", "API key (optional)"), hint: L("默认用 DSH 已接好的模型；如果这里读不到凭证，就填一个 DeepSeek Key，只存在本机", "Uses the model DSH already configured; if its credentials cannot be read, paste a DeepSeek key here - stored locally only") },
						h("input", {
							className: "ub-text", type: "password", style: { width: 190 }, placeholder: aiKey ? "••••••" : "sk-…",
							value: aiKey, onChange: (event) => setAiKey(event.target.value),
						})),
					aiResult ? h("div", { className: "ub-ai-result" }, aiResult) : null));
			}
			if (tab === "appearance") {
				body.push(h(Card, { key: "a1", title: L("模式", "Mode"), desc: L("跟随 DSH 主题自动切换明暗，也可以手动锁定", "Follow the DSH theme automatically, or lock a mode.") },
					h(Row, { path: ["mode"], label: L("明暗模式", "Light / dark"), hint: L("自动 = 跟随 DSH 当前的浅色/深色", "Auto follows the current DSH light/dark state.") },
						h("select", { className: "ub-select", value: state.mode, onChange: (event) => patch(["mode"], event.target.value) },
							h("option", { value: "auto" }, L("自动跟随", "Auto")),
							h("option", { value: "light" }, L("强制浅色", "Light")),
							h("option", { value: "dark" }, L("强制深色", "Dark")))),
					h(Row, { label: L("当前生效", "Currently active"), hint: L("这是此刻实际渲染的模式", "The mode actually rendered right now.") },
						h("span", { className: "ub-num" }, resolveMode(state) === "dark" ? L("深色", "Dark") : L("浅色", "Light")))));
				body.push(h(Card, { key: "a2", title: L("区域开关", "Regions"), desc: L("每个区域都能单独关掉，关掉的部分保持原版外观", "Every region can be switched off independently; it then keeps the stock look.") },
					[
						["sidebar", L("侧边栏与导航", "Sidebar & navigation"), L("侧栏底色、导航悬停与玻璃效果", "Sidebar fill, nav hover and glass.")],
						["chat", L("对话与消息", "Conversation & messages"), L("气泡配色、消息进场与流式光效", "Bubbles, message entrance, streaming glow.")],
						["composer", L("输入框", "Composer"), L("输入区材质与聚焦光晕", "Composer material and focus ring.")],
						["overlays", L("浮层与弹窗", "Overlays"), L("菜单、对话框、提示的毛玻璃与进出场", "Glass and entrance motion for menus and dialogs.")],
						["settings", L("设置面板", "Settings panel"), L("设置页的卡片与配色", "Cards and colors inside Settings.")],
						["terminal", L("终端与预览", "Terminal & preview"), L("底部/侧边停靠面板的材质", "Docked panels material.")],
						["code", L("代码块", "Code blocks"), L("代码块底色、圆角与行内代码", "Code block fill, radius and inline code.")],
						["details", L("细节", "Details"), L("滚动条、光标、选中文字颜色", "Scrollbar, caret and selection color.")],
					].map(([key, label, hint]) => h(Row, { path: ["regions", key], key, label, hint },
						h(Switch, { checked: state.regions[key], onChange: (value) => patch(["regions", key], value) })))));
			}
			if (tab === "palette") {
				body.push(h(Card, { key: "c1", title: L("浅色配色", "Light palette"), desc: L("浅色模式下的每一处关键颜色", "Every key color used in light mode.") },
					h(Row, { label: L("主色", "Accent") }, paletteField("light", "accent")),
					h(Row, { label: L("辅色", "Secondary accent") }, paletteField("light", "accent2")),
					h(Row, { label: L("画布", "Canvas") }, paletteField("light", "bg")),
					h(Row, { label: L("面板", "Surface") }, paletteField("light", "surface")),
					h(Row, { label: L("次级面板", "Secondary surface") }, paletteField("light", "surfaceAlt")),
					h(Row, { label: L("正文", "Text") }, paletteField("light", "text")),
					h(Row, { label: L("次要文字", "Muted text") }, paletteField("light", "muted")),
					h(Row, { label: L("边框", "Border") }, paletteField("light", "border")),
					h(Row, { label: L("AI 气泡", "Assistant bubble") }, paletteField("light", "bubble")),
					h(Row, { label: L("我的气泡", "My bubble") }, paletteField("light", "bubbleSelf")),
					h(Row, { label: L("代码块", "Code block") }, paletteField("light", "codeBg"))));
				body.push(h(Card, { key: "c2", title: L("深色配色", "Dark palette"), desc: L("深色模式下同一组颜色，独立调节", "The same set, tuned independently for dark mode.") },
					h(Row, { label: L("主色", "Accent") }, paletteField("dark", "accent")),
					h(Row, { label: L("辅色", "Secondary accent") }, paletteField("dark", "accent2")),
					h(Row, { label: L("画布", "Canvas") }, paletteField("dark", "bg")),
					h(Row, { label: L("面板", "Surface") }, paletteField("dark", "surface")),
					h(Row, { label: L("次级面板", "Secondary surface") }, paletteField("dark", "surfaceAlt")),
					h(Row, { label: L("正文", "Text") }, paletteField("dark", "text")),
					h(Row, { label: L("次要文字", "Muted text") }, paletteField("dark", "muted")),
					h(Row, { label: L("边框", "Border") }, paletteField("dark", "border")),
					h(Row, { label: L("AI 气泡", "Assistant bubble") }, paletteField("dark", "bubble")),
					h(Row, { label: L("我的气泡", "My bubble") }, paletteField("dark", "bubbleSelf")),
					h(Row, { label: L("代码块", "Code block") }, paletteField("dark", "codeBg"))));
				body.push(h(Card, { key: "c3", title: L("智能配色", "Smart colors"), desc: L("从背景图里提取主色，生成与壁纸配套的配色", "Pull an accent out of your wallpaper so the UI matches.") },
					h(Row, { label: L("从壁纸取色", "Sample wallpaper"), hint: L("需要先设置背景图；取色后仍是完整可调的配色", "Set a wallpaper first; the sampled colors remain fully editable.") },
						h("button", { type: "button", className: "ub-btn", onClick: () => {
							const url = wallpaperSource(state);
							if (!url) { setMessage(L("请先在「背景」里设置图片", "Set a wallpaper image first.")); return; }
							sampleImage(url).then((color) => {
								if (!color) { setMessage(L("这张图片没能取到合适的颜色", "Could not sample a color from that image.")); return; }
								store.update((prev) => ({
									...prev, dirty: true,
									state: normalizeState(deepMerge(prev.state, {
										palette: {
											light: { accent: color, accent2: lighten(color, 0.35), bubbleSelf: mix(color, "#ffffff", 0.86) },
											dark: { accent: color, accent2: lighten(color, 0.25), bubbleSelf: mix(color, "#000000", 0.78) },
										},
									})),
								}));
								setMessage(L("已根据壁纸生成配色", "Palette derived from your wallpaper."));
							});
						} }, L("提取壁纸主色", "Sample wallpaper"))) ));
			}
			if (tab === "palette") {
				body.push(h(Card, { key: "c4", title: L("一键互推", "Cross-generate"), desc: L("按明暗关系把一套配色推成另一套，再逐项微调", "Derive the opposite palette, then tune it") },
					h("div", { className: "ub-actions" },
						h("button", { type: "button", className: "ub-btn", onClick: () => { remember(); patchMany([[["palette", "dark"], derivePalette(state.palette.light, "dark")], [["mode"], "dark"]]); setMessage(L("已生成深色配色，并切到深色查看", "Dark palette generated and applied")); } }, L("浅色 → 深色", "Light → dark")),
						h("button", { type: "button", className: "ub-btn", onClick: () => { remember(); patchMany([[["palette", "light"], derivePalette(state.palette.dark, "light")], [["mode"], "light"]]); setMessage(L("已生成浅色配色，并切到浅色查看", "Light palette generated and applied")); } }, L("深色 → 浅色", "Dark → light")))));
			}
			if (tab === "palette") {
				const zoneRow = (zone, label, hint) => h(Row, { label, hint, path: ["zones", zone] },
					h("div", { className: "ub-inline" },
						h(ColorField, {
							value: state.zones[zone] || state.palette[resolveMode(state)].surface,
							onChange: (value) => patch(["zones", zone], value),
						}),
						state.zones[zone] ? h("button", { type: "button", className: "ub-btn", onClick: () => patch(["zones", zone], "") }, L("跟随主题", "Follow theme")) : null));
				body.push(h(Card, { key: "c5", title: L("分区着色", "Per-zone colors"), desc: L("让侧栏、对话区、输入框各有自己的底色，其余部分仍跟随主题", "Give the sidebar, the conversation and the composer their own tints") },
					zoneRow("sidebar", L("侧栏底色", "Sidebar"), L("左侧会话列表与导航，连窗口顶部那条也一起变", "The left column and the window strip above it")),
					zoneRow("chat", L("对话区底色", "Conversation"), L("消息区域的背景；一旦设了颜色，壁纸会让位给它", "Behind the messages; a colour here takes over from the wallpaper")),
					zoneRow("composer", L("输入框底色", "Composer"), L("底部输入框与工具条卡片", "The input card and its toolbar"))));
			}
			if (tab === "materials") {
				body.push(h(Card, { key: "m1", title: L("毛玻璃", "Glass"), desc: L("毛玻璃只影响半透明表面，不会改变布局", "Glass only affects translucent surfaces, never layout.") },
					h(Row, { path: ["materials", "glass"], label: L("开启毛玻璃", "Enable glass"), hint: L("关闭后所有面板变回实色", "Off returns every surface to a solid fill.") },
						h(Switch, { checked: state.materials.glass, onChange: (value) => patch(["materials", "glass"], value) })),
					h(Row, { path: ["materials", "glassBlur"], label: L("模糊强度", "Blur radius") },
						h(Slider, { value: state.materials.glassBlur, min: 0, max: 40, step: 1, unit: "px", onChange: (value) => patch(["materials", "glassBlur"], value) })),
					h(Row, { path: ["materials", "panelAlpha"], label: L("面板透明度", "Panel opacity"), hint: L("数值越低越通透，太低会影响可读性", "Lower is more transparent; too low hurts readability.") },
						h(Slider, { value: state.materials.panelAlpha, min: 0.1, max: 1, step: 0.01, onChange: (value) => patch(["materials", "panelAlpha"], value) })),
					h(Row, { path: ["materials", "border"], label: L("边框强度", "Border strength") },
						h(Slider, { value: state.materials.border, min: 0, max: 1, step: 0.01, onChange: (value) => patch(["materials", "border"], value) })),
					h(Row, { path: ["materials", "shadow"], label: L("阴影强度", "Shadow strength") },
						h(Slider, { value: state.materials.shadow, min: 0, max: 1, step: 0.01, onChange: (value) => patch(["materials", "shadow"], value) }))));
			}
			if (tab === "motion") {
				body.push(h(Card, { key: "m2", title: L("动效强度", "Motion"), desc: L("逐项调节；任何一项调到 0 就等于关掉", "Tune each effect; 0 turns it off.") },
					h(Row, { path: ["effects", "hover"], label: L("悬停微交互", "Hover feedback"), hint: L("按钮上浮与高光跟随", "Buttons lift and highlight on hover.") },
						h(Slider, { value: state.effects.hover, min: 0, max: 1, step: 0.01, onChange: (value) => patch(["effects", "hover"], value) })),
					h(Row, { path: ["effects", "enter"], label: L("浮层进出场", "Overlay entrance") },
						h(Slider, { value: state.effects.enter, min: 0, max: 1, step: 0.01, onChange: (value) => patch(["effects", "enter"], value) })),
					h(Row, { path: ["effects", "msg"], label: L("消息进场", "Message entrance") },
						h(Slider, { value: state.effects.msg, min: 0, max: 1, step: 0.01, onChange: (value) => patch(["effects", "msg"], value) })),
					h(Row, { path: ["effects", "stream"], label: L("流式文字光效", "Streaming glow") },
						h(Slider, { value: state.effects.stream, min: 0, max: 1, step: 0.01, onChange: (value) => patch(["effects", "stream"], value) })),
					h(Row, { path: ["effects", "focus"], label: L("输入框聚焦光晕", "Composer focus glow") },
						h(Slider, { value: state.effects.focus, min: 0, max: 1, step: 0.01, onChange: (value) => patch(["effects", "focus"], value) })),
					h(Row, { path: ["effects", "think"], label: L("思考/执行呼吸", "Thinking pulse") },
						h(Slider, { value: state.effects.think, min: 0, max: 1, step: 0.01, onChange: (value) => patch(["effects", "think"], value) })),
					h(Row, { path: ["effects", "page"], label: L("页面切换过渡", "Page transition"), hint: L("标签页与面板切换时的淡入", "Fade when switching tabs and panels.") },
						h(Slider, { value: state.effects.page, min: 0, max: 1, step: 0.01, onChange: (value) => patch(["effects", "page"], value) }))));
			}
			if (tab === "layout") {
				body.push(h(Card, { key: "l1", title: L("布局微调", "Layout"), desc: L("圆角、间距与整体密度，密度会等比缩放整个界面", "Radii, spacing and overall density; density scales the whole UI.") },
					h(Row, { path: ["materials", "radius"], label: L("圆角", "Corner radius") },
						h(Slider, { value: state.materials.radius, min: 0, max: 2.4, step: 0.05, unit: "×", onChange: (value) => patch(["materials", "radius"], value) })),
					h(Row, { path: ["materials", "density"], label: L("界面密度", "Density"), hint: L("1.00 为标准；0.95 更紧凑，1.05 更舒展", "1.00 is standard; below is tighter, above roomier.") },
						h(Slider, { value: state.materials.density, min: 0.85, max: 1.15, step: 0.01, unit: "×", onChange: (value) => patch(["materials", "density"], value) })),
					h(Row, { label: L("恢复标准布局", "Reset layout") },
						h("button", { type: "button", className: "ub-btn", onClick: () => store.update((prev) => ({ ...prev, dirty: true, state: setIn(setIn(prev.state, ["materials", "radius"], 1), ["materials", "density"], 1) })) }, L("重置", "Reset")))));
			}
			if (tab === "background") {
				const w = state.wallpaper;
				body.push(h(Card, { key: "b1", title: L("背景类型", "Background"), desc: L("毛玻璃的质感很大程度上取决于底下垫了什么", "Glass looks best when there is something behind it.") },
					h(Row, { path: ["wallpaper", "style"], label: L("类型", "Type") },
						h("select", { className: "ub-select", value: w.style, onChange: (event) => patch(["wallpaper", "style"], event.target.value) },
							h("option", { value: "none" }, L("无（纯色）", "None (solid)")),
							h("option", { value: "gradient" }, L("渐变", "Gradient")),
							h("option", { value: "image" }, L("图片", "Image")),
							h("option", { value: "animated" }, L("动态流动", "Animated")))),
					h(Row, { label: L("图片地址", "Image URL"), hint: L("支持网络链接，本机图片用下面上传", "Any URL, or upload a local file below") },
						h("div", { className: "ub-inline" },
							h("input", {
								className: "ub-text", style: { width: 190 }, placeholder: "https://…", value: w.url,
								onChange: (event) => {
									const value = event.target.value;
									patchMany([["wallpaper", "url", value], ["wallpaper", "style", value ? "image" : w.style]]);
								},
							}),
							w.url || w.image ? h("button", { type: "button", className: "ub-btn", onClick: () => patchMany([["wallpaper", "url", ""], ["wallpaper", "image", ""]]) }, L("清除", "Clear")) : null)),
					h(Row, { label: L("上传本机图片", "Upload image"), hint: L("存进下面的壁纸库，可随时切换，建议小于 3 MB", "Saved to the library below so you can switch any time, keep it under 3 MB") },
						h("input", { type: "file", accept: "image/*", style: { maxWidth: 190, fontSize: 11 }, onChange: (event) => {
							const file = event.target.files && event.target.files[0];
							if (!file) return;
							if (file.size > 3 * 1024 * 1024) { setMessage(L("图片太大，请选小于 3 MB 的", "Please pick an image under 3 MB")); return; }
							const endpoint = stateEndpoint();
							const base = endpoint ? endpoint.replace(/\/state$/, "/wallpaper") : null;
							if (base === null) {
								setMessage(L("接口不可用，无法保存壁纸", "Storage endpoint unavailable"));
								return;
							}
							const id = "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
							const name = String(file.name || "").replace(/\.[^.]+$/, "").slice(0, 40);
							fetch(base + "?id=" + encodeURIComponent(id) + "&name=" + encodeURIComponent(name), {
								method: "POST",
								headers: { "content-type": file.type || "image/jpeg" },
								credentials: "same-origin",
								body: file,
							})
								.then((response) => response.ok ? response.json() : Promise.reject(new Error("HTTP " + response.status)))
								.then((payload) => {
									const listed = payload && Array.isArray(payload.wallpapers) ? payload.wallpapers : [];
									if (listed.length > 0) {
										hostWallpapers = listed.map((entry) => ({ ...entry, url: absoluteUrl(entry.url) }));
									}
									const entries = libraryEntries(listed);
									remember();
									store.update((prev) => ({
										...prev,
										dirty: true,
										state: {
											...prev.state,
											wallpapers: entries.length > 0 ? entries : prev.state.wallpapers,
											wallpaper: { ...prev.state.wallpaper, image: "wall:" + id, url: "", style: "image" },
										},
									}));
									setMessage(L("已存入壁纸库 " + Math.round(file.size / 1024) + " KB", "Saved to the library, " + Math.round(file.size / 1024) + " KB"));
								})
								.catch((error) => setMessage(L("壁纸保存失败：" + String(error && error.message || error), "Wallpaper upload failed: " + String(error && error.message || error))));
						} })),
					state.wallpapers.length > 0 ? h("div", { className: "ub-lib" }, state.wallpapers.map((item) => h("div", {
						key: item.id, className: "ub-lib-cell",
					},
						h("button", {
							type: "button",
							className: "ub-lib-item",
							title: (item.name || item.id) + " · " + Math.max(1, Math.round((item.bytes || 0) / 1024)) + " KB",
							"data-active": w.image === "wall:" + item.id ? "true" : "false",
							onClick: () => patchMany([["wallpaper", "image", "wall:" + item.id], ["wallpaper", "url", ""], ["wallpaper", "style", "image"]]),
						}, h("img", { src: libraryUrl(item.id), alt: "", loading: "lazy" })),
						h("button", {
							type: "button", className: "ub-lib-del", title: L("从库里删掉这张", "Remove from library"),
							onClick: () => removeWallpaper(item.id),
						}, "×")))) : null,
					wallpaperSource(state) !== "" ? h("div", { className: "ub-wall" },
						h("img", {
							className: "ub-wall-img", src: wallpaperSource(state), alt: "",
							onError: () => setMessage(L("缩略图加载失败，说明这张图的格式浏览器不支持", "The thumbnail failed to load, so this image format is not supported")),
						}),
						h("div", { className: "ub-wall-meta" },
							h("div", null, L("壁纸已设置", "Wallpaper set")),
							h("div", { className: "ub-wall-hint" },
								w.image.indexOf("wall:") === 0
									? ((state.wallpapers.find((item) => item.id === w.image.slice(5)) || {}).name || L("壁纸库里的图片", "Image from the library"))
									: (w.image ? L("本机图片", "Local image") : w.url)))) : null,
					h(Row, { path: ["wallpaper", "fit"], label: L("铺放方式", "Fit") },
						h("select", { className: "ub-select", value: w.fit, onChange: (event) => patch(["wallpaper", "fit"], event.target.value) },
							h("option", { value: "cover" }, L("铺满", "Cover")),
							h("option", { value: "contain" }, L("完整显示", "Contain")),
							h("option", { value: "tile" }, L("平铺", "Tile")))),
					h(Row, { path: ["wallpaper", "blur"], label: L("背景模糊", "Background blur") },
						h(Slider, { value: w.blur, min: 0, max: 30, step: 1, unit: "px", onChange: (value) => patch(["wallpaper", "blur"], value) })),
					h(Row, { path: ["wallpaper", "dim"], label: L("压暗程度", "Dim") },
						h(Slider, { value: w.dim, min: 0, max: 0.85, step: 0.01, onChange: (value) => patch(["wallpaper", "dim"], value) })),
					h(Row, { path: ["wallpaper", "saturate"], label: L("饱和度", "Saturation") },
						h(Slider, { value: w.saturate, min: 0, max: 2, step: 0.01, unit: "×", onChange: (value) => patch(["wallpaper", "saturate"], value) })),
					w.style === "animated" ? h(Row, { path: ["wallpaper", "animate"], label: L("流动速度", "Animation speed"), hint: L("数值越大越慢", "Higher is slower.") },
						h(Slider, { value: w.animate, min: 6, max: 120, step: 1, unit: "s", onChange: (value) => patch(["wallpaper", "animate"], value) })) : null));
			}
			if (tab === "details") {
				body.push(h(Card, { key: "d1", title: L("细节替换", "Details"), desc: L("小地方决定质感", "Small things carry the finish.") },
					h(Row, { path: ["effects", "scrollbar"], label: L("自定义滚动条", "Custom scrollbar") },
						h(Switch, { checked: state.effects.scrollbar, onChange: (value) => patch(["effects", "scrollbar"], value) })),
					h(Row, { path: ["effects", "cursor"], label: L("光标颜色跟随主色", "Accent caret") },
						h(Switch, { checked: state.effects.cursor, onChange: (value) => patch(["effects", "cursor"], value) })),
					h(Row, { path: ["effects", "selection"], label: L("选中文字配色", "Selection color") },
						h(Switch, { checked: state.effects.selection, onChange: (value) => patch(["effects", "selection"], value) }))));
				body.push(h(Card, { key: "d2", title: L("护眼模式", "Eye care"), desc: L("一层低蓝光暖色滤镜，可按时段自动开关", "A warm low-blue-light filter, optionally on a schedule.") },
					h(Row, { path: ["eye", "enabled"], label: L("开启护眼", "Enable eye care") },
						h(Switch, { checked: state.eye.enabled, onChange: (value) => patch(["eye", "enabled"], value) })),
					h(Row, { path: ["eye", "strength"], label: L("强度", "Strength") },
						h(Slider, { value: state.eye.strength, min: 0, max: 0.6, step: 0.01, onChange: (value) => patch(["eye", "strength"], value) })),
					h(Row, { path: ["eye", "schedule"], label: L("时段自动", "Schedule"), hint: L("选「按时段」后仅在设定时间内生效", "With a schedule it only applies inside the window.") },
						h("select", { className: "ub-select", value: state.eye.schedule, onChange: (event) => patch(["eye", "schedule"], event.target.value) },
							h("option", { value: "off" }, L("始终开启", "Always")),
							h("option", { value: "on" }, L("按时段", "Scheduled")))),
					state.eye.schedule === "on" ? h(Row, { path: ["eye", "from"], label: L("时间段", "Time window") },
						h("div", { className: "ub-inline" },
							h("input", { className: "ub-text", style: { width: 70 }, value: state.eye.from, onChange: (event) => patch(["eye", "from"], event.target.value) }),
							h("span", { className: "ub-num" }, "→"),
							h("input", { className: "ub-text", style: { width: 70 }, value: state.eye.to, onChange: (event) => patch(["eye", "to"], event.target.value) }))) : null));
			}
			if (tab === "more") {
				body.push(h(Card, { key: "x1", title: L("分享与备份", "Share & backup"), desc: L("配置码便于发到聊天窗口；JSON 便于长期存档", "A code is easy to paste in chat; JSON is for archiving.") },
					h("div", { className: "ub-actions" },
						h("button", { type: "button", className: "ub-btn", onClick: () => { exportCode(state.customName, state); setDialog("export"); } }, L("导出配置码", "Export code")),
						h("button", { type: "button", className: "ub-btn", onClick: () => { setCode(""); setDialog("import"); } }, L("导入配置码", "Import code")),
						h("button", { type: "button", className: "ub-btn", onClick: downloadJson }, L("导出主题包", "Export package")),
						h("label", { className: "ub-btn", style: { display: "inline-flex", alignItems: "center" } },
							L("导入主题包", "Import package"),
							h("input", {
								type: "file", accept: ".dshbeautify,.json,application/json", style: { display: "none" },
								onChange: (event) => {
									const file = event.target.files && event.target.files[0];
									if (!file) return;
									const reader = new FileReader();
									reader.onload = () => {
										try {
											const payload = JSON.parse(String(reader.result || "{}"));
											const incoming = payload && payload.state ? payload.state : payload;
											if (!isObj(incoming)) throw new Error("bad file");
											remember();
											/* imported ids only mean something if this machine has those files */
											const imported = libraryEntries(incoming.wallpapers).filter((item) => hostWallpapers.some((entry) => entry.id === item.id));
											store.update((prev) => ({
												...prev, dirty: true,
												state: normalizeState({ ...incoming, enabled: true, wallpapers: imported.length > 0 ? imported : prev.state.wallpapers }),
											}));
											setMessage(L("主题包已导入", "Package imported"));
										} catch {
											setMessage(L("这个文件读不出来", "Could not read that file"));
										}
									};
									reader.readAsText(file);
								},
							})),
						h("button", { type: "button", className: "ub-btn", onClick: undo }, L("撤销上一版", "Undo")),
						h("button", { type: "button", className: "ub-btn", "data-tone": "danger", onClick: () => store.update((prev) => ({ ...prev, dirty: true, state: normalizeState({ ...defaults(), custom: prev.state.custom }) })) }, L("恢复出厂", "Reset everything")))));
				body.push(h(Card, { key: "x2", title: L("快捷键", "Shortcut"), desc: L("Ctrl + Alt + B 快速打开/关闭美化，Shift + Alt + B 循环切换内置方案", "Ctrl+Alt+B toggles beautify; Shift+Alt+B cycles presets.") },
					h(Row, { path: ["shortcut"], label: L("启用快捷键", "Enable shortcut") },
						h(Switch, { checked: state.shortcut !== false, onChange: (value) => patch(["shortcut"], value) }))));
				body.push(h(Card, { key: "x3", title: L("关于", "About"), desc: L("界面美化 v" + API.version + " · 完全基于 DSH 设计令牌，不改动任何源码", "UI Beautify v" + API.version + " · built entirely on DSH design tokens, no source patching.") },
					h(Row, { label: L("当前方案", "Active preset") },
						h("span", { className: "ub-num" }, PRESET_BY_ID[state.presetId] ? PRESET_BY_ID[state.presetId].name[ZH ? "zh" : "en"] : state.presetId === "custom" ? (state.customName || L("自定义", "Custom")) : L("未选择", "None"))),
					h(Row, { label: L("持久化", "Persistence") },
						h("span", { className: "ub-num" }, snap.remote ? L("跟随 DSH 存储", "DSH storage") : L("仅本机浏览器", "Local browser")))),
				body.push(h(Card, { key: "x4", title: L("诊断", "Diagnostics"), desc: L("背景偶尔闪一下绿？用这里把它按出来", "Background flashes green now and then? Force it to happen.") },
					h(Row, { label: L("重绘压力测试", "Layer stress test"), hint: L("连续重绘 24 次，每轮都换一张样式表。开始后请一直盯着聊天区，闪了就截图", "Rebuilds the blurred layer 24 times. Watch the conversation area while it runs and grab a screenshot if it flashes.") },
						h("button", {
							type: "button", className: "ub-btn",
							onClick: () => {
								if (typeof window === "undefined" || !window.__UI_BEAUTIFY__ || typeof window.__UI_BEAUTIFY__.burst !== "function") {
									setMessage(L("这个版本还没带上测试入口，请刷新页面", "This build has no test hook, reload the page"));
									return;
								}
								setMessage(L("重绘中 24 次，盯着聊天区", "Rebuilding 24 times, keep watching the conversation"));
								window.__UI_BEAUTIFY__.burst(24, 170);
								window.setTimeout(() => setMessage(L("重绘结束。闪到了就截图发我", "Done. Send me a screenshot if it flashed")), 24 * 170 + 400);
							},
						}, L("开始测试", "Start test"))))));
			}

			const percent = state.enabled ? L("已开启", "On") : L("已关闭", "Off");
			const status = snap.saving ? L("保存中…", "Saving…") : snap.savedAt ? L("已保存", "Saved") : "";

			return h("div", { className: "ub-root" },
				h("div", { className: "ub-hero" },
					h("div", { className: "ub-hero-main" },
						h("div", { className: "ub-title-row" },
							h("h2", { className: "ub-title" }, L("界面美化", "UI Beautify")),
							h("span", { className: "ub-version" }, "v" + API.version)),
						h("p", { className: "ub-sub" }, L("总开关关闭时，界面完全保持原版，所有参数都可以随时改回来", "With the master switch off this page changes nothing at all"))),
					h("div", { className: "ub-hero-side" },
						h("div", { className: "ub-state" },
							h("div", null, percent),
							status ? h("div", { className: "ub-saved" }, status) : null),
						h(Switch, {
							checked: state.enabled,
							title: L("总开关", "Master switch"),
							onChange: (value) => store.update((prev) => ({ ...prev, dirty: true, state: normalizeState({ ...prev.state, enabled: value }) })),
						}))),
				h("div", { className: "ub-search" },
					h("input", {
						className: "ub-text ub-search-input",
						placeholder: L("搜索参数：模糊 / 圆角 / 透明 / 动效 …", "Search a setting: blur, radius, opacity …"),
						value: search,
						onChange: (event) => setSearch(event.target.value),
					}),
					search.trim() === "" ? null : (() => {
						const query = search.trim().toLowerCase();
						const hits = PARAM_INDEX.filter((item) => item.zh.toLowerCase().includes(query) || item.k.some((word) => word.includes(query))).slice(0, 8);
						if (hits.length === 0) return h("div", { className: "ub-search-hits" }, h("span", { className: "ub-search-empty" }, L("没有匹配的参数", "No match")));
						return h("div", { className: "ub-search-hits" }, hits.map((item, index) => h("button", {
							key: index, type: "button", className: "ub-search-hit",
							onClick: () => { setTab(item.tab); setSearch(""); },
						}, item.zh)));
					})()),
				h("div", { className: "ub-tabs", role: "tablist" },
					tabs.map(([id, label]) => h("button", {
						key: id, type: "button", role: "tab", className: "ub-tab",
						"aria-selected": tab === id,
						onClick: () => setTab(id),
					}, label))),
				...body,
				message ? h("p", { className: "ub-note" }, message) : null,
				dialog === "export" ? h(Modal, { title: L("配置码", "Theme code"), onClose: () => setDialog(null) },
					h("p", { className: "ub-note" }, L("复制下面这段文本发给别人，对方在「导入配置码」里粘贴即可", "Copy this text to someone; they paste it under Import code.")),
					h("textarea", { className: "ub-code", readOnly: true, value: code, onFocus: (event) => event.target.select() }),
					h("div", { className: "ub-actions" },
						h("button", { type: "button", className: "ub-btn", "data-tone": "primary", onClick: async () => {
							try { await navigator.clipboard.writeText(code); setMessage(L("已复制到剪贴板", "Copied to clipboard.")); }
							catch { setMessage(L("复制失败，请手动选中复制", "Copy failed; select the text manually.")); }
						} }, L("复制", "Copy")))) : null,
				dialog === "import" ? h(Modal, { title: L("导入配置码", "Import theme code"), onClose: () => setDialog(null) },
					h("p", { className: "ub-note" }, L("粘贴以 UB1. 开头的配置码，应用后会立即生效", "Paste a code starting with UB1.; it applies immediately.")),
					h("textarea", { className: "ub-code", value: code, placeholder: "UB1.…", onChange: (event) => setCode(event.target.value) }),
					message ? h("p", { className: "ub-note" }, message) : null,
					h("div", { className: "ub-actions" },
						h("button", { type: "button", className: "ub-btn", "data-tone": "primary", onClick: importCode }, L("应用", "Apply")),
						h("button", { type: "button", className: "ub-btn", onClick: () => setDialog(null) }, L("取消", "Cancel")))) : null);
		}

		/* ------------------------------------------------------------------ *
		 * Wallpaper color sampling
		 * ------------------------------------------------------------------ */
		function sampleImage(url) {
			return new Promise((resolve) => {
				try {
					const image = new Image();
					image.crossOrigin = "anonymous";
					image.onload = () => {
						try {
							const canvas = document.createElement("canvas");
							const size = 24;
							canvas.width = size;
							canvas.height = size;
							const context = canvas.getContext("2d");
							context.drawImage(image, 0, 0, size, size);
							const data = context.getImageData(0, 0, size, size).data;
							let best = null;
							let bestScore = -1;
							for (let i = 0; i < data.length; i += 4) {
								const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
								if (a < 200) continue;
								const max = Math.max(r, g, b), min = Math.min(r, g, b);
								const saturation = max === 0 ? 0 : (max - min) / max;
								const lightness = (max + min) / 510;
								const score = saturation * 1.4 + (1 - Math.abs(lightness - 0.55)) * 0.6;
								if (score > bestScore) { bestScore = score; best = [r, g, b]; }
							}
							if (!best) { resolve(null); return; }
							resolve("#" + best.map((n) => n.toString(16).padStart(2, "0")).join(""));
						} catch { resolve(null); }
					};
					image.onerror = () => resolve(null);
					image.src = url;
				} catch { resolve(null); }
			});
		}

		/* ------------------------------------------------------------------ *
		 * Persistence endpoint
		 * ------------------------------------------------------------------ */
		function stateEndpoint() {
			try {
				if (typeof location !== "undefined" && /^https?:$/.test(location.protocol)) {
					return "/plugins/dsh-ui-beautify/state";
				}
			} catch { }
			// A shell-hosted page (dsh-app://…) needs the Host origin from the transport row.
			const transport = globalThis.__DSH_TRANSPORT__;
			if (transport && typeof transport === "object") {
				for (const key of ["httpUrl", "baseUrl", "url", "streamBaseUrl"]) {
					const candidate = transport[key];
					if (typeof candidate !== "string" || candidate === "") continue;
					try {
						const parsed = new URL(candidate);
						const protocol = parsed.protocol === "wss:" ? "https:" : parsed.protocol === "ws:" ? "http:" : parsed.protocol;
						return protocol + "//" + parsed.host + "/plugins/dsh-ui-beautify/state";
					} catch { }
				}
			}
			return null;
		}

		/* ------------------------------------------------------------------ *
		 * Wallpaper library
		 * ------------------------------------------------------------------ */
		/** Images the host keeps on disk, newest first. Refreshed by /state and by uploads. */
		let hostWallpapers = [];
		/** Opaque versions of those images, keyed by "url|background". */
		const opaqueWallpapers = new Map();

		/**
		 * Turn a host-relative path into something an <img> can load.
		 *
		 * The GUI port changes whenever DSH restarts, so nothing absolute is ever
		 * written into the theme document; it is rebuilt here every time.
		 *
		 * @param path - a path like /plugins/dsh-ui-beautify/wallpaper?id=x.
		 * @returns an absolute URL, or the input when it cannot be parsed.
		 */
		function absoluteUrl(path) {
			if (typeof path !== "string" || path === "") return "";
			try {
				const endpoint = stateEndpoint();
				const base = endpoint ? new URL(endpoint, location.href).href : location.href;
				return new URL(path, base).href;
			} catch {
				return path;
			}
		}

		/**
		 * The current URL of one stored wallpaper.
		 *
		 * @param id - library entry id.
		 * @returns the URL, or an empty string when this machine has no such image.
		 */
		function libraryUrl(id) {
			const entry = hostWallpapers.find((item) => item && item.id === id);
			if (!entry) return "";
			const raw = typeof entry.url === "string" && entry.url !== ""
				? entry.url
				: "/plugins/dsh-ui-beautify/wallpaper?id=" + encodeURIComponent(id);
			return absoluteUrl(raw);
		}

		/**
		 * The picture the settings point at, before any opaque pass.
		 *
		 * @param state - the theme document.
		 * @returns the URL, or an empty string.
		 */
		function rawWallpaperSource(state) {
			const w = state && state.wallpaper ? state.wallpaper : null;
			if (!w || w.style !== "image") return "";
			const image = typeof w.image === "string" ? w.image : "";
			if (image.indexOf("wall:") === 0) {
				const url = libraryUrl(image.slice(5));
				if (url !== "") return url;
				if (hostWallpapers.length > 0) return libraryUrl(hostWallpapers[0].id);
				return hostWallpaperUrl;
			}
			return image || w.url || hostWallpaperUrl;
		}

		/**
		 * The concrete image URL the settings currently point at.
		 *
		 * @param state - the theme document.
		 * @returns the URL, or an empty string.
		 */
		function wallpaperSource(state) {
			const raw = rawWallpaperSource(state);
			if (raw === "") return "";
			const pal = state.palette ? state.palette[resolveMode(state)] : null;
			const background = pal && typeof pal.bg === "string" ? pal.bg : "#000000";
			return opaqueWallpapers.get(raw + "|" + background) || raw;
		}

		/**
		 * Paint a picture onto an opaque canvas.
		 *
		 * A filtered layer that carries alpha can show uninitialised texture where
		 * the picture is transparent — a green flash on this machine's GPU. Drawing
		 * the picture over the theme background first removes the alpha entirely.
		 *
		 * @param url - the picture to flatten.
		 * @param background - css colour to paint underneath.
		 * @returns the flattened data URL, or the original URL when that fails.
		 */
		function makeOpaque(url, background) {
			return new Promise((resolve) => {
				try {
					const image = new Image();
					image.crossOrigin = "anonymous";
					image.onload = () => {
						try {
							const naturalWidth = image.naturalWidth || image.width || 1024;
							const naturalHeight = image.naturalHeight || image.height || 1024;
							const scale = Math.min(1, 1600 / Math.max(1, naturalWidth));
							const width = Math.max(1, Math.round(naturalWidth * scale));
							const height = Math.max(1, Math.round(naturalHeight * scale));
							const canvas = document.createElement("canvas");
							canvas.width = width;
							canvas.height = height;
							const context2d = canvas.getContext("2d");
							if (!context2d) { resolve(url); return; }
							context2d.fillStyle = background;
							context2d.fillRect(0, 0, width, height);
							context2d.drawImage(image, 0, 0, width, height);
							resolve(canvas.toDataURL("image/jpeg", 0.86));
						} catch {
							resolve(url);
						}
					};
					image.onerror = () => resolve(url);
					image.src = url;
				} catch {
					resolve(url);
				}
			});
		}

		/**
		 * Reduce a host wallpaper list to what the settings document keeps.
		 *
		 * Only ids and labels are stored — never URLs, because the port moves.
		 *
		 * @param list - entries from the host or from an imported package.
		 * @returns a clean array.
		 */
		function libraryEntries(list) {
			if (!Array.isArray(list)) return [];
			return list
				.filter((item) => isObj(item) && typeof item.id === "string" && /^[A-Za-z0-9_-]{1,48}$/.test(item.id))
				.map((item) => ({
					id: item.id,
					name: typeof item.name === "string" ? item.name.slice(0, 60) : "",
					bytes: Number(item.bytes) || 0,
					savedAt: Number(item.savedAt) || 0,
				}))
				.slice(0, 24);
		}

		/**
		 * Reconcile the settings document with the host's library.
		 *
		 * The host is authoritative about which files exist; the document only
		 * keeps ids. This also repairs a pointer that resolves to nothing.
		 *
		 * @param state - the theme document.
		 * @returns a repaired copy, or null when nothing needs doing.
		 */
		function settleWallpapers(state) {
			if (!state || !isObj(state.wallpaper)) return null;
			let next = state;
			const entries = libraryEntries(hostWallpapers);
			const current = Array.isArray(state.wallpapers) ? state.wallpapers : [];
			const sameSet = entries.length === current.length
				&& entries.every((item, index) => current[index] && current[index].id === item.id && current[index].name === item.name);
			if (!sameSet) next = { ...next, wallpapers: entries };
			const w = next.wallpaper;
			const token = typeof w.image === "string" && w.image.indexOf("wall:") === 0 ? w.image.slice(5) : null;
			if (token !== null && !entries.some((item) => item.id === token)) {
				// the pointed-at image is gone, so land on the newest one instead
				next = { ...next, wallpaper: { ...w, image: entries.length > 0 ? "wall:" + entries[0].id : "" } };
			}
			const pointed = (typeof next.wallpaper.image === "string" && next.wallpaper.image !== "")
				|| (typeof next.wallpaper.url === "string" && next.wallpaper.url !== "");
			if (!pointed && next.wallpaper.style === "image" && entries.length > 0) {
				next = { ...next, wallpaper: { ...next.wallpaper, image: "wall:" + entries[0].id } };
			}
			return next === state ? null : next;
		}

		/* ------------------------------------------------------------------ *
		 * Navigation icon
		 * ------------------------------------------------------------------ */
		const NAV_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
			+ '<path d="M12 3a9 9 0 1 0 0 18h1.1a2.2 2.2 0 0 0 1.8-3.5 2.2 2.2 0 0 1 1.8-3.5H19a2 2 0 0 0 2-2A9 9 0 0 0 12 3Z"/>'
			+ '<circle cx="8.6" cy="8.8" r="1.15" fill="currentColor" stroke="none"/>'
			+ '<circle cx="12.1" cy="6.8" r="1.15" fill="currentColor" stroke="none"/>'
			+ '<circle cx="15.6" cy="9" r="1.15" fill="currentColor" stroke="none"/>'
			+ '<circle cx="8.4" cy="13.1" r="1.15" fill="currentColor" stroke="none"/>'
			+ '</svg>';

		/**
		 * The settings navigation renders a fixed glyph per section id, with a
		 * gear for unknown ids, so swap that gear for a palette glyph.
		 *
		 * @returns a disposer removing the observer.
		 */
		function installNavIcon() {
			if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return () => { };
			const labels = ["界面美化", "UI Beautify"];
			let timer = null;
			const paint = () => {
				let nodes = [];
				try { nodes = document.querySelectorAll("nav button"); } catch { nodes = []; }
				for (const button of nodes) {
					if (!button || button.dataset === undefined || button.dataset.ubIcon === "1") continue;
					const text = button.textContent || "";
					if (!labels.some((label) => text.includes(label))) continue;
					const old = button.querySelector("svg");
					if (!old) continue;
					const host = document.createElement("span");
					host.innerHTML = NAV_ICON;
					const next = host.firstElementChild;
					if (!next) continue;
					const className = old.getAttribute("class");
					if (className) next.setAttribute("class", className);
					old.replaceWith(next);
					button.dataset.ubIcon = "1";
				}
			};
			const schedule = () => {
				if (timer !== null) return;
				timer = window.setTimeout(() => { timer = null; paint(); }, 120);
			};
			let observer = null;
			try {
				observer = new MutationObserver(schedule);
				observer.observe(document.body, { childList: true, subtree: true });
			} catch { observer = null; }
			paint();
			window.setTimeout(paint, 400);
			return () => {
				try { observer?.disconnect(); } catch { }
				if (timer !== null) window.clearTimeout(timer);
			};
		}

		/* ------------------------------------------------------------------ *
		 * Local fallback interpreter (works without a model)
		 * ------------------------------------------------------------------ */
		function localInterpret(text, base) {
			const q = String(text || "").toLowerCase();
			const has = (...words) => words.some((word) => q.includes(word));
			const next = base ? clone(base) : normalizeState({ ...defaults(), enabled: true });
			let presetId = null;
			if (has("赛博", "cyber", "霓虹", "neon", "发光")) presetId = "cyber-neon";
			else if (has("糖果", "梦幻", "粉紫", "极光", "aurora", "甜")) presetId = "candy-aurora";
			else if (has("极简", "简约", "瑞士", "黑白", "minimal", "swiss", "干净")) presetId = "minimal-swiss";
			else if (has("暖", "纸", "莫兰迪", "护眼", "warm", "paper")) presetId = "warm-paper";
			else if (has("终端", "黑客", "复古", "terminal", "hacker", "绿字")) presetId = "terminal-retro";
			else if (has("玻璃", "磨砂", "苹果", "glass", "apple", "macos", "半透明")) presetId = "apple-glass";
			const overrides = {};
			if (has("深色", "暗色", "dark", "黑夜")) overrides.mode = "dark";
			if (has("浅色", "亮色", "light")) overrides.mode = "light";
			const COLORS = [
				[["蓝", "blue"], "#3b82f6"], [["紫", "purple", "violet"], "#8b5cf6"],
				[["粉", "pink", "樱"], "#ec4899"], [["绿", "green", "青草"], "#22c55e"],
				[["橙", "orange", "橘"], "#f97316"], [["红", "red"], "#ef4444"],
				[["青", "cyan", "湖"], "#06b6d4"], [["金", "gold", "黄"], "#eab308"],
			];
			for (const [words, color] of COLORS) {
				if (!has(...words)) continue;
				overrides.palette = { light: { accent: color, accent2: mix(color, "#ffffff", 0.35) }, dark: { accent: color, accent2: mix(color, "#ffffff", 0.2) } };
				break;
			}
			if (has("毛玻璃", "磨砂", "玻璃", "glass")) overrides.materials = { ...(overrides.materials || {}), glass: true, glassBlur: 22 };
			if (has("不要毛玻璃", "关闭毛玻璃", "不要玻璃", "实色")) overrides.materials = { ...(overrides.materials || {}), glass: false };
			if (has("圆角", "圆润", "柔和", "soft")) overrides.materials = { ...(overrides.materials || {}), radius: 1.8 };
			if (has("直角", "锐利", "硬朗", "sharp")) overrides.materials = { ...(overrides.materials || {}), radius: 0.3 };
			if (has("动效强", "动画多", "活泼", "流畅", "motion")) overrides.effects = { hover: 0.75, enter: 0.75, msg: 0.7, stream: 0.8, focus: 0.75, think: 0.7, page: 0.6 };
			if (has("少动效", "安静", "别动", "稳定", "calm")) overrides.effects = { hover: 0.1, enter: 0.15, msg: 0.1, stream: 0.1, focus: 0.2, think: 0.1, page: 0.1 };
			if (has("紧凑", "小一点", "密度高", "compact")) overrides.materials = { ...(overrides.materials || {}), density: 0.94 };
			if (has("宽松", "大一点", "疏", "roomy")) overrides.materials = { ...(overrides.materials || {}), density: 1.06 };
			if (has("护眼", "低蓝光", "eye")) overrides.eye = { enabled: true, strength: 0.18 };
			if (has("渐变", "gradient")) overrides.wallpaper = { style: "gradient" };
			if (has("动态", "流动", "animated")) overrides.wallpaper = { style: "animated", animate: 20 };
			const preset = presetId ? PRESET_BY_ID[presetId] : null;
			const message = preset
				? L("已应用「" + preset.name.zh + "」并微调", "Applied " + preset.name.en + " with tweaks")
				: L("已按描述生成配色", "Generated from your description");
			return { ok: true, preset: presetId, state: overrides, message, engine: "local" };
		}

		/* ------------------------------------------------------------------ *
		 * apply()
		 * ------------------------------------------------------------------ */
		const inject = ["slots"];

		/** Fallback handle for the section body when slot injection is unavailable. */
		let activeStore = null;
		/** The wallpaper the host currently stores, independent of the settings document. */
		let hostWallpaperUrl = "";

		/**
		 * Read a picture and return a light palette derived from it.
		 *
		 * @param file - the chosen image file.
		 * @param done - receives the palette, or null when the picture cannot be read.
		 */
		function readReferencePalette(file, done) {
			const reader = new FileReader();
			reader.onload = () => {
				const image = new Image();
				image.onload = () => {
					try {
						const canvas = document.createElement("canvas");
						canvas.width = 40;
						canvas.height = 40;
						const context2d = canvas.getContext("2d");
						context2d.drawImage(image, 0, 0, 40, 40);
						const data = context2d.getImageData(0, 0, 40, 40).data;
						const list = [];
						for (let i = 0; i < data.length; i += 4) list.push([data[i], data[i + 1], data[i + 2]]);
						list.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
						const at = (t) => list[Math.min(list.length - 1, Math.floor(t * (list.length - 1)))];
						const hex = (pixel) => "#" + pixel.map((n) => n.toString(16).padStart(2, "0")).join("");
						let accent = at(0.5);
						let best = -1;
						for (const pixel of list) {
							const mx = Math.max(pixel[0], pixel[1], pixel[2]);
							const mn = Math.min(pixel[0], pixel[1], pixel[2]);
							const score = mx === 0 ? 0 : (mx - mn) / mx;
							if (score > best) { best = score; accent = pixel; }
						}
						const dark = hex(at(0.04));
						const mid = hex(at(0.5));
						const light = hex(at(0.96));
						const accentHex = hex(accent);
						done({
							bg: mix(light, "#ffffff", 0.55), surface: light, surfaceAlt: mix(light, mid, 0.12),
							text: mix(dark, "#111827", 0.35), muted: mix(mid, "#4b5563", 0.55),
							border: mix(mid, "#ffffff", 0.6), bubble: mix(light, mid, 0.22),
							bubbleSelf: mix(accentHex, "#ffffff", 0.78), codeBg: mix(mid, "#ffffff", 0.82),
							accent: accentHex, accent2: mix(accentHex, "#22d3ee", 0.4),
						});
					} catch {
						done(null);
					}
				};
				image.onerror = () => done(null);
				image.src = String(reader.result || "");
			};
			reader.onerror = () => done(null);
			reader.readAsDataURL(file);
		}

		function apply(ctx) {
			const presenter = createPresenter();
			presenter.installUi(UI_CSS);
			const uninstallNavIcon = installNavIcon();

			const STATE_URL = stateEndpoint();
			const localKey = "dsh-ui-beautify.state";
			let local = null;
			try {
				const raw = localStorage.getItem(localKey);
				if (raw) {
					const parsed = JSON.parse(raw);
					local = parsed && parsed.state ? parsed : { state: parsed, savedAt: 0 };
				}
			} catch { local = null; }

			const store = createStore({
				state: normalizeState(local && local.state || undefined),
				remote: false,
				saving: false,
				savedAt: local ? Number(local.savedAt) || 0 : 0,
				dirty: false,
			});

			let writeTimer = null;
			let ignore = false;
			let remoteTried = false;
			activeStore = store;

			const persist = async () => {
				const value = store.getSnapshot().state;
				try { localStorage.setItem(localKey, JSON.stringify({ state: value, savedAt: Date.now() })); } catch { }
				store.update((prev) => ({ ...prev, saving: true }));
				let ok = false;
				if (STATE_URL) {
					try {
						const response = await fetch(STATE_URL, {
							method: "PUT",
							headers: { "content-type": "application/json" },
							credentials: "same-origin",
							body: JSON.stringify({ state: value }),
						});
						ok = response.ok;
					} catch { ok = false; }
				}
				store.update((prev) => ({ ...prev, saving: false, savedAt: Date.now(), dirty: false, remote: ok || prev.remote }));
			};

			const schedule = () => {
				if (ignore) return;
				window.clearTimeout(writeTimer);
				writeTimer = window.setTimeout(() => { void persist(); }, 450);
			};

			const rerender = () => {
				const snap = store.getSnapshot();
				presenter.apply(snap.state);
				if (snap.dirty) schedule();
			};

			store.subscribe(rerender);
			presenter.apply(store.getSnapshot().state);
			presenter.watch(() => presenter.apply(store.getSnapshot().state));

			// Adopt the durable document when it is newer than the local cache.
			const hydrate = async () => {
				if (remoteTried) return;
				remoteTried = true;
				if (!STATE_URL) return;
				try {
					const response = await fetch(STATE_URL, { cache: "no-store", credentials: "same-origin" });
					if (!response.ok) return;
					const payload = await response.json();
					const remoteState = payload && payload.state;
					const remoteSavedAt = Number(payload && payload.savedAt) || 0;
					if (typeof payload.wallpaperUrl === "string" && payload.wallpaperUrl !== "") {
						try {
							hostWallpaperUrl = new URL(payload.wallpaperUrl, stateEndpoint() || location.href).href;
						} catch {
							hostWallpaperUrl = payload.wallpaperUrl;
						}
					}
					/*
					 * The host owns the library: it is the only place that knows which
					 * image files still exist, and it hands out URLs for the current port.
					 * The settings document is reconciled against it by settleWallpapers().
					 */
					if (Array.isArray(payload.wallpapers)) {
						hostWallpapers = payload.wallpapers.map((entry) => ({ ...entry, url: absoluteUrl(entry.url) }));
					}
					if (!remoteState || typeof remoteState !== "object") return;
					store.update((prev) => ({ ...prev, remote: true }));
					const snap = store.getSnapshot();
					if (snap.dirty || remoteSavedAt <= snap.savedAt) return;
					ignore = true;
					store.update((prev) => ({ ...prev, state: normalizeState(remoteState), savedAt: remoteSavedAt, remote: true }));
					ignore = false;
					presenter.apply(store.getSnapshot().state);
				} catch {
					store.update((prev) => ({ ...prev, remote: false }));
				}
			};
			void hydrate().finally(() => {
				const settled = settleWallpapers(store.getSnapshot().state);
				if (settled === null) return;
				ignore = true;
				store.update((prev) => ({ ...prev, dirty: true, state: settled }));
				ignore = false;
			});

			// keyboard shortcut
			const onKey = (event) => {
				const state = store.getSnapshot().state;
				if (state.shortcut === false) return;
				const ctrl = event.ctrlKey || event.metaKey;
				if (!ctrl || !event.altKey || event.code !== "KeyB") return;
				const target = event.target;
				if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
				event.preventDefault();
				if (event.shiftKey) {
					const index = PRESETS.findIndex((preset) => preset.id === state.presetId);
					const next = PRESETS[(index + 1) % PRESETS.length];
					store.update((prev) => ({
						...prev, dirty: true,
						state: normalizeState({
							...prev.state, presetId: next.id, enabled: true,
							palette: clone(next.palette),
							materials: { ...prev.state.materials, ...next.materials },
							effects: { ...prev.state.effects, ...next.effects },
						}),
					}));
				} else {
					store.update((prev) => ({ ...prev, dirty: true, state: { ...prev.state, enabled: !prev.state.enabled } }));
				}
			};
			window.addEventListener("keydown", onKey, true);

			ctx.effect(() => () => {
				window.removeEventListener("keydown", onKey, true);
				window.clearTimeout(writeTimer);
				if (activeStore === store) activeStore = null;
				uninstallNavIcon();
				presenter.dispose();
			}, "ui-beautify: presenter");

			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: ENTRY_ID,
				order: 6,
				label: () => L("界面美化", "UI Beautify"),
				inject: () => ({ store }),
			}, BeautifySectionSafe)), "ui-beautify: settings section");

			// expose a read-only diagnostics handle for support
			try {
				window.__UI_BEAUTIFY__ = {
					version: API.version,
					get state() { return store.getSnapshot().state; },
					set(patchValue) { store.update((prev) => ({ ...prev, dirty: true, state: normalizeState(deepMerge(prev.state, patchValue)) })); },
					/**
					 * Rebuild the blurred wallpaper layer over and over.
					 *
					 * Every round writes a different stylesheet, which forces the
					 * compositor to re-rasterise the layer. If a graphics artefact
					 * such as a green flash exists, this makes it show up on purpose.
					 *
					 * @param rounds - how many rebuilds to run.
					 * @param gap - milliseconds between rounds.
					 */
					burst(rounds = 24, gap = 170) {
						const base = store.getSnapshot().state;
						const blur = Number(base.wallpaper.blur) || 0;
						let round = 0;
						const tick = () => {
							if (round >= rounds) {
								presenter.apply(store.getSnapshot().state);
								return;
							}
							const alternate = round % 2 === 0;
							presenter.apply({
								...base,
								wallpaper: { ...base.wallpaper, blur: alternate ? Math.min(30, blur + 16) : blur },
							});
							round += 1;
							window.setTimeout(tick, gap);
						};
						tick();
						return rounds;
					},
				};
			} catch { }
			ctx.effect(() => () => { try { delete window.__UI_BEAUTIFY__; } catch { } }, "ui-beautify: diagnostics");

			return { store };
		}

		/* ------------------------------------------------------------------ *
		 * Exports (the `__test` face is used by the package's node test)
		 * ------------------------------------------------------------------ */
		exports.apply = apply;
		exports.inject = inject;
		exports.__test = {
			PRESETS,
			defaults,
			normalizeState,
			buildCss,
			tokenVars,
			resolveMode,
			encodeTheme,
			decodeTheme,
			deepMerge,
			normalizeHex,
			libraryEntries,
			wallpaperSource,
			settleWallpapers,
			derivePalette,
			setHostWallpapers(list) { hostWallpapers = Array.isArray(list) ? list.map((entry) => ({ ...entry, url: absoluteUrl(entry.url) })) : []; },
			BeautifySection: BeautifySectionSafe,
		};
		return module.exports;
	},
});
