/**
 * Node smoke test for the browser bundle.
 *
 * The bundle is a browser artifact, so this harness stubs the few globals it
 * touches at module scope and then exercises the pure theme engine: preset
 * validity, token generation, CSS assembly and share-code round-tripping.
 *
 * Run: node test/smoke.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "lib", "client.js"), "utf8");

let loaded = null;
const windowGlobal = {
	__ModuleLoader__: {
		load(record) {
			loaded = record.factory((id) => {
				if (id === "react") {
					return {
						createElement: (type, props, ...children) => ({ type, props, children }),
						Component: class {
							constructor(props) { this.props = props; this.state = {}; }
							setState(value) { this.state = { ...this.state, ...value }; }
						},
						useState: (value) => [value, () => { }],
						useEffect: () => { },
						useMemo: (factory) => factory(),
						useRef: (value) => ({ current: value }),
						useSyncExternalStore: (_subscribe, get) => get(),
					};
				}
				throw new Error("unexpected require: " + id);
			});
		},
	},
};
globalThis.window = windowGlobal;
Object.defineProperty(globalThis, "navigator", { value: { language: "zh-CN" }, configurable: true });
globalThis.localStorage = {
	map: new Map(),
	getItem(key) { return this.map.has(key) ? this.map.get(key) : null; },
	setItem(key, value) { this.map.set(key, String(value)); },
	removeItem(key) { this.map.delete(key); },
};
globalThis.document = {
	body: { hasAttribute: () => false },
	documentElement: { setAttribute() { }, removeAttribute() { } },
};
globalThis.btoa = (value) => Buffer.from(value, "binary").toString("base64");
globalThis.atob = (value) => Buffer.from(value, "base64").toString("binary");

new Function("window", source)(globalThis.window);

assert.ok(loaded, "bundle must register through __ModuleLoader__");
assert.equal(typeof loaded.apply, "function");
assert.ok(Array.isArray(loaded.inject));

const api = loaded.__test;
assert.ok(api, "test face exported");
assert.equal(api.PRESETS.length, 6, "six built-in presets");

for (const preset of api.PRESETS) {
	assert.equal(typeof preset.id, "string");
	assert.ok(preset.palette.light && preset.palette.dark, preset.id + " needs both palettes");
	for (const mode of ["light", "dark"]) {
		for (const [key, value] of Object.entries(preset.palette[mode])) {
			assert.match(value, /^#[0-9a-f]{6}$/, preset.id + " " + mode + "." + key);
		}
	}
}

const state = api.normalizeState({
	enabled: true,
	presetId: "cyber-neon",
	palette: { light: { accent: "#123456" } },
	materials: { glass: true, glassBlur: 18 },
	wallpaper: { style: "gradient" },
});
assert.equal(state.enabled, true);
assert.equal(state.palette.light.accent, "#123456");
assert.match(state.palette.light.bg, /^#[0-9a-f]{6}$/);

const css = api.buildCss(state);
assert.ok(css.length > 500, "css must be substantial");
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, "balanced braces");
assert.ok(css.includes("--dsw-alias-bg-base"), "maps the canvas token");
assert.ok(css.includes("--dsw-alias-label-primary"), "maps the label token");
assert.ok(css.includes("--dsw-radius-lg"), "maps radii");
assert.ok(css.includes("body[data-ub-mode=\"light\"]"), "scopes to the resolved mode");

const dark = api.buildCss(api.normalizeState({ ...state, mode: "dark" }));
assert.ok(dark.includes("body[data-ub-mode=\"dark\"]"));

const off = api.buildCss({ ...state, enabled: false });
assert.equal(off, "", "disabled must emit no stylesheet at all");

// every token value must be a plain CSS value (no NaN/undefined leaking out)
for (const mode of ["light", "dark"]) {
	const vars = api.tokenVars(api.normalizeState({ ...state, mode }), mode);
	for (const [name, value] of Object.entries(vars)) {
		assert.equal(typeof value, "string", name);
		assert.ok(!/NaN|undefined|\[object/.test(value), name + " = " + value);
	}
}

const code = api.encodeTheme("测试主题", state);
assert.match(code, /^UB1\.[A-Za-z0-9_-]+$/);
const decoded = api.decodeTheme(code);
assert.equal(decoded.name, "测试主题");
assert.equal(decoded.state.palette.dark.accent, state.palette.dark.accent);
assert.throws(() => api.decodeTheme("nope"), /配置码|code/i);

const sanitized = api.normalizeState({ materials: { panelAlpha: 9 }, wallpaper: { style: "bogus" }, regions: { sidebar: false } });
assert.ok(sanitized.materials.panelAlpha <= 1);
assert.equal(sanitized.wallpaper.style, "none");
assert.equal(sanitized.regions.sidebar, false);
assert.equal(sanitized.regions.chat, true);

// per-zone colours must hang on the anchors the shell really exposes
const zoned = api.normalizeState({ enabled: true, zones: { sidebar: "#112233", chat: "#445566", composer: "#778899" } });
const zonedCss = api.buildCss(zoned);
assert.ok(zonedCss.includes("--dsw-specific-sidebar-fill:#112233"), "the sidebar zone drives the sidebar token");
assert.ok(zonedCss.includes("[data-composer-seat]"), "the composer zone targets the composer seat");
assert.ok(zonedCss.includes("--dsw-specific-input-major:#778899"), "the composer zone drives the input token");
assert.ok(zonedCss.includes("[data-conversation-scroll]{background-color:#445566"), "the chat zone paints the scrollport");
assert.ok(!zonedCss.includes("main{--dsw-alias-bg-base"), "the old main-based guess is gone");
assert.ok(!zonedCss.includes("[data-sidebar-collapsed]{--dsw"), "the old collapsed-only guess is gone");

/*
 * Guard the shape that broke "style from a picture": patchMany takes
 * [pathArray, value] pairs, so a three-element entry overwrites a whole branch
 * with a string and the next render throws.
 */
assert.ok(!/\[\s*"palette"\s*,\s*"light"\s*,\s*[a-zA-Z]/.test(source), "palette writes use a [path, value] entry");
assert.ok(!/patchMany\(\[\s*\[\s*"palette"/.test(source), "no palette branch is replaced wholesale");

// the dark palette derived from a picture must be complete and valid
const picturePalette = {
	bg: "#f4f1ea", surface: "#fbfaf6", surfaceAlt: "#efece4", text: "#1b1a17", muted: "#6b675f",
	border: "#d8d3c8", bubble: "#efece4", bubbleSelf: "#cfe3d8", codeBg: "#e8e4da",
	accent: "#2f8f6b", accent2: "#7cc4a3",
};
const derivedDark = api.derivePalette(picturePalette, "dark");
for (const key of Object.keys(picturePalette)) {
	assert.equal(typeof derivedDark[key], "string", "derived." + key);
	assert.match(derivedDark[key], /^#[0-9a-f]{6}$/, "derived." + key + " = " + derivedDark[key]);
}
assert.equal(api.normalizeState({ palette: { light: picturePalette, dark: derivedDark } }).palette.dark.accent, derivedDark.accent);

console.log("smoke: ok");console.log("presets:", api.PRESETS.map((p) => p.id).join(", "));
console.log("css bytes (gradient/glass):", css.length);
