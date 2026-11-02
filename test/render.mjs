/**
 * Render harness for the settings section.
 *
 * React is stubbed with just enough surface to drive function components, so
 * this walks the whole element tree of every tab and dialog. It catches the
 * class of mistake a node-only test cannot: a bad variable, a missing helper or
 * a hook used outside a component, in a branch the user opens often.
 *
 * Run: node test/render.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "lib", "client.js"), "utf8");

/* ------------------------------------------------------------------ */
/* Browser fakes                                                       */
/* ------------------------------------------------------------------ */
function element(tag) {
	return {
		tagName: String(tag).toUpperCase(),
		dataset: {},
		style: {},
		children: [],
		textContent: "",
		isConnected: true,
		append(child) { this.children.push(child); child.parent = this; },
		remove() { this.removed = true; },
		setAttribute(name, value) { this.attributes = this.attributes || {}; this.attributes[name] = String(value); },
		removeAttribute(name) { if (this.attributes) delete this.attributes[name]; },
		hasAttribute(name) { return Boolean(this.attributes && name in this.attributes); },
		addEventListener() { },
		removeEventListener() { },
	};
}

const body = element("body");
const head = element("head");
const documentElement = element("html");
const documentFake = {
	body, head, documentElement,
	createElement: element,
	createTextNode: (text) => ({ text }),
	querySelector: () => null,
	querySelectorAll: () => [],
};

let tabQueue = [];
let tabValue = "presets";

const ReactFake = {
	createElement: (type, props, ...children) => {
		const flat = children.flat();
		return { type, props: { ...(props || {}), children: flat.length === 1 ? flat[0] : flat }, children: flat };
	},
	Fragment: "fragment",
	Component: class Component {
		constructor(props) { this.props = props; this.state = {}; }
		setState(value) { this.state = { ...this.state, ...value }; }
	},
	useState(initial) {
		if (tabQueue.length > 0) return [tabQueue.shift(), () => { }];
		return [tabValue, (next) => { tabValue = next; }];
	},
	useEffect() { },
	useLayoutEffect() { },
	useMemo(factory) { return factory(); },
	useRef(value) { return { current: value }; },
	useCallback(fn) { return fn; },
	useSyncExternalStore(_subscribe, get) { return get(); },
	createContext(defaultValue) { return { defaultValue, Provider: (props) => props.children }; },
};

const windowFake = {
	__ModuleLoader__: null,
	addEventListener() { },
	removeEventListener() { },
	setTimeout: (fn) => { void fn; return 0; },
	clearTimeout() { },
	setInterval: () => 0,
	clearInterval() { },
	location: { href: "http://127.0.0.1:56708/" },
};

globalThis.window = windowFake;
Object.defineProperty(globalThis, "navigator", { value: { language: "zh-CN", clipboard: { writeText: async () => { } } }, configurable: true });
globalThis.document = documentFake;
globalThis.MutationObserver = class { observe() { } disconnect() { } };
globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
globalThis.localStorage = {
	map: new Map(),
	getItem(key) { return this.map.has(key) ? this.map.get(key) : null; },
	setItem(key, value) { this.map.set(key, String(value)); },
	removeItem(key) { this.map.delete(key); },
};
globalThis.btoa = (value) => Buffer.from(value, "binary").toString("base64");
globalThis.atob = (value) => Buffer.from(value, "base64").toString("binary");
globalThis.Image = class { set src(_value) { } };
globalThis.URL = { createObjectURL: () => "blob:fake", revokeObjectURL: () => { } };
globalThis.Blob = class { };
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

let record = null;
windowFake.__ModuleLoader__ = {
	load(next) { record = next; },
};

new Function("window", source)(windowFake);

const module = record.factory((id) => {
	if (id === "react") return ReactFake;
	throw new Error("unexpected require: " + id);
});

assert.equal(typeof module.apply, "function");
const api = module.__test;
assert.ok(module.__test.BeautifySection, "section exported for the harness");

/* ------------------------------------------------------------------ */
/* Drive apply() with a fake client context                            */
/* ------------------------------------------------------------------ */
let registered = null;
const disposers = [];
const ctx = {
	get: () => undefined,
	on: () => () => { },
	effect(factory) {
		const result = factory();
		if (typeof result === "function") disposers.push(result);
		return () => { };
	},
	slots: {
		inject(_name, factory) { factory(); return () => { }; },
		register(options, component) { registered = { options, component }; return () => { }; },
	},
	logger: { info() { }, warn() { }, error() { } },
};

const context = module.apply(ctx);
assert.ok(context && context.store, "apply returns the store for the host page");
assert.ok(registered, "section registered into settings.section");
assert.equal(registered.options.name, "settings.section");
assert.equal(typeof registered.options.label(), "string");
assert.ok(registered.options.label().length > 0);

const store = context.store;
assert.ok(typeof store.getSnapshot().state.enabled === "boolean");

/* ------------------------------------------------------------------ */
/* Walk every tab and dialog                                           */
/* ------------------------------------------------------------------ */
const seen = new Set();

function walk(node, depth) {
	if (node === null || node === undefined || node === false) return;
	if (Array.isArray(node)) { for (const child of node) walk(child, depth); return; }
	if (typeof node === "string" || typeof node === "number") return;
	if (typeof node.type === "function") {
		seen.add(node.type.name || "anonymous");
		const rendered = /^class\s/.test(Function.prototype.toString.call(node.type))
			? new node.type(node.props).render()
			: node.type(node.props);
		walk(rendered, depth + 1);
		return;
	}
	if (node.children) for (const child of node.children) walk(child, depth);
}

const tabs = ["presets", "ai", "appearance", "palette", "materials", "motion", "layout", "background", "details", "more"];
for (const tab of tabs) {
	tabQueue = [tab, null];
	const tree = registered.component({ store });
	walk(tree, 0);
}

// dialog branches: open the export and import modals from the "more" tab
for (const dialog of ["export", "import"]) {
	tabQueue = ["presets", dialog];
	const tree = registered.component({ store });
	walk(tree, 0);
}

// a saved custom theme and an active preset must render too
store.update((prev) => ({
	...prev,
	state: {
		...prev.state,
		enabled: true,
		presetId: "cyber-neon",
		customName: "娴嬭瘯",
		custom: [{
			id: "c1", name: "娴嬭瘯", createdAt: Date.now(),
			state: { palette: prev.state.palette, materials: prev.state.materials, effects: prev.state.effects, wallpaper: prev.state.wallpaper, regions: prev.state.regions, mode: "dark" },
		}],
	},
}));
for (const tab of tabs) {
	tabQueue = [tab, null];
	walk(registered.component({ store }), 0);
}

assert.ok(seen.has("Card"), "cards rendered");
assert.ok(seen.has("Row"), "rows rendered");
assert.ok(seen.has("Switch"), "switches rendered");
assert.ok(seen.has("Slider") || seen.has("ColorField"), "value controls rendered");

// the presenter must have written a live stylesheet while enabled
const themeStyle = head.children.find((child) => child.id === "dsh-spectra-theme");
assert.ok(themeStyle, "theme style element installed");
assert.ok(themeStyle.textContent.length > 500, "stylesheet content written");
assert.ok(themeStyle.textContent.includes("--dsw-alias-bg-base"));

// switching off must leave no stylesheet and no attribute behind
store.update((prev) => ({ ...prev, state: { ...prev.state, enabled: false } }));
assert.equal(themeStyle.textContent, "", "disabling clears the stylesheet");
assert.ok(!documentElement.hasAttribute("data-ui-beautify"), "disabling removes the root attribute");

// cleanup must remove the injected nodes
for (const dispose of disposers) dispose();
assert.ok(themeStyle.removed, "dispose removes the theme stylesheet");

console.log("render: ok");
console.log("tabs:", tabs.length, "components:", [...seen].sort().join(", "));

