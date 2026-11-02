/**
 * Wallpaper-library test.
 *
 * The library keeps only ids in the settings document — URLs are rebuilt from
 * the live host origin, because the GUI port changes on every DSH restart.
 * These assertions pin that contract down.
 *
 * Run: node test/wallpaper.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "lib", "client.js"), "utf8");

let loaded = null;
globalThis.window = {
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
globalThis.location = { protocol: "http:", href: "http://127.0.0.1:1234/" };
globalThis.btoa = (value) => Buffer.from(value, "binary").toString("base64");
globalThis.atob = (value) => Buffer.from(value, "base64").toString("binary");

new Function("window", source)(globalThis.window);
const api = loaded.__test;
assert.ok(api, "test face exported");

/* ---- 1. old absolute URLs become ids, not dead addresses ---- */
const fromAbsolute = api.normalizeState({
	wallpaper: { style: "image", image: "http://127.0.0.1:61478/plugins/dsh-ui-beautify/wallpaper?v=123" },
});
assert.equal(fromAbsolute.wallpaper.image, "wall:legacy1", "single-file URL maps to the migrated entry");

const fromIdUrl = api.normalizeState({
	wallpaper: { style: "image", image: "http://127.0.0.1:61478/plugins/dsh-ui-beautify/wallpaper?id=abc9&v=5" },
});
assert.equal(fromIdUrl.wallpaper.image, "wall:abc9", "per-id URL maps to that id");

const fromDeadRoute = api.normalizeState({
	wallpaper: { style: "image", image: "http://127.0.0.1:61478/plugins/dsh-ui-beautify/wall/xyz.png" },
});
assert.equal(fromDeadRoute.wallpaper.image, "", "the abandoned /wall/ route is cleared");

const keepsToken = api.normalizeState({ wallpaper: { style: "image", image: "wall:keepme" } });
assert.equal(keepsToken.wallpaper.image, "wall:keepme", "an id token survives normalisation");
const keepsRemote = api.normalizeState({ wallpaper: { style: "image", image: "https://example.com/a.jpg" } });
assert.equal(keepsRemote.wallpaper.image, "https://example.com/a.jpg", "an external URL is left alone");

/* ---- 2. the stored list carries ids, never URLs ---- */
const entries = api.libraryEntries([
	{ id: "a1", name: "沙滩", bytes: 2048, savedAt: 11, url: "http://127.0.0.1:1/plugins/dsh-ui-beautify/wallpaper?id=a1" },
	{ id: "b2", name: "", bytes: 4096, savedAt: 22, url: "http://127.0.0.1:1/plugins/dsh-ui-beautify/wallpaper?id=b2" },
]);
assert.equal(entries.length, 2);
assert.equal(entries[0].id, "a1");
assert.equal(entries[0].name, "沙滩");
assert.equal(entries[0].url, undefined, "URLs must not be persisted");
assert.equal(entries[1].name, "");
assert.deepEqual(api.libraryEntries([{ url: "http://x/y.png" }, null, 7, { id: "../etc/passwd" }]), [], "url-only and hostile entries are dropped");
assert.equal(api.libraryEntries(Array.from({ length: 40 }, (_, i) => ({ id: "w" + i }))).length, 24, "the list is capped");

/* ---- 3. resolution always asks the live origin ---- */
api.setHostWallpapers([
	{ id: "a1", url: "/plugins/dsh-ui-beautify/wallpaper?id=a1&v=11" },
	{ id: "b2", url: "/plugins/dsh-ui-beautify/wallpaper?id=b2&v=22" },
]);
const resolved = api.wallpaperSource(api.normalizeState({ wallpaper: { style: "image", image: "wall:b2" } }));
assert.equal(resolved, "http://127.0.0.1:1234/plugins/dsh-ui-beautify/wallpaper?id=b2&v=22");

const missing = api.normalizeState({ wallpaper: { style: "image", image: "wall:gone" } });
assert.equal(api.wallpaperSource(missing), "http://127.0.0.1:1234/plugins/dsh-ui-beautify/wallpaper?id=a1&v=11", "a vanished id falls back to the newest entry");

const notImage = api.normalizeState({ wallpaper: { style: "gradient" } });
assert.equal(api.wallpaperSource(notImage), "", "only the image style resolves a file");

/* ---- 4. the stylesheet uses the resolved URL and nothing else ---- */
const css = api.buildCss(api.normalizeState({
	enabled: true,
	wallpaper: { style: "image", image: "wall:b2", blur: 12, dim: 0.3, saturate: 1.1 },
}));
assert.ok(css.includes("wallpaper?id=b2"), "the picture reaches the stylesheet");
assert.ok(css.includes("blur(12px)"), "blur follows the setting");
assert.ok(css.includes("[data-ub-wall]::before"), "painted on the conversation scroller only");
assert.ok(!css.includes("undefined"), "no undefined leaked into css");

assert.ok(css.includes("background-color:"), "the layer keeps a solid fallback while the file decodes");
assert.ok(css.includes("will-change:filter"), "a layer that really is filtered is pinned so it is not reallocated mid-frame");

/* a neutral blur/saturation must not create a GPU filter layer at all */
const unfiltered = api.buildCss(api.normalizeState({
	enabled: true,
	wallpaper: { style: "image", image: "wall:b2", blur: 0, saturate: 1 },
}));
assert.ok(unfiltered.includes("wallpaper?id=b2"), "the picture is still painted");
assert.ok(!/\[data-ub-wall\]::before\{[^}]*filter:/.test(unfiltered), "no filter layer when blur and saturation are neutral");
assert.ok(/\[data-ub-wall\]::before\{[^}]*background-color:/.test(unfiltered), "the layer stays opaque without a filter");

const empty = api.buildCss(api.normalizeState({ enabled: true, wallpaper: { style: "image", image: "", blur: 4 } }));
assert.ok(!empty.includes("wallpaper?id="), "nothing to paint when the library is empty");

/* a conversation tint must win over the picture, steadily, on a stable anchor */
const zoneWins = api.buildCss(api.normalizeState({
	enabled: true,
	zones: { chat: "#123456" },
	wallpaper: { style: "image", image: "wall:b2", blur: 12 },
}));
assert.ok(!zoneWins.includes("[data-ub-wall]::before"), "a chat tint stands the wallpaper down");
assert.ok(zoneWins.includes("[data-conversation-scroll]{background-color:#123456"), "the tint lands on the stable scrollport");
assert.ok(!zoneWins.includes("[data-ub-wall]{"), "the flickering tint-after-render rule is gone");

/* ---- 5. reconciliation with the host library ---- */
const staleList = api.normalizeState({ wallpapers: [{ id: "gone", name: "旧的" }], wallpaper: { style: "image", image: "" } });
const settled = api.settleWallpapers(staleList);
assert.ok(settled !== null, "a stale list and an empty pointer get repaired");
assert.deepEqual(settled.wallpapers.map((item) => item.id), ["a1", "b2"], "the host list wins");
assert.equal(settled.wallpaper.image, "wall:a1", "the pointer lands on the newest image");

const alreadyFine = api.normalizeState({
	wallpapers: api.libraryEntries([{ id: "a1", name: "" }, { id: "b2", name: "" }]),
	wallpaper: { style: "image", image: "wall:b2" },
});
assert.equal(api.settleWallpapers(alreadyFine), null, "nothing is touched when the document already agrees");

const gradientState = api.normalizeState({ wallpapers: api.libraryEntries([{ id: "a1" }]), wallpaper: { style: "gradient", image: "" } });
assert.equal(api.settleWallpapers(gradientState).wallpaper.image, "", "a gradient background is never given a picture");

const dangling = api.normalizeState({
	wallpapers: api.libraryEntries([{ id: "a1" }, { id: "b2" }]),
	wallpaper: { style: "image", image: "wall:deleted-long-ago" },
});
assert.equal(api.settleWallpapers(dangling).wallpaper.image, "wall:a1", "a pointer to a deleted image lands on the newest one");

api.setHostWallpapers([]);
assert.equal(api.settleWallpapers(api.normalizeState({ wallpapers: [{ id: "a1" }] })).wallpapers.length, 0, "an empty host empties the list");
assert.equal(api.settleWallpapers(api.normalizeState({ wallpaper: { style: "image", image: "wall:a1" } })).wallpaper.image, "", "with an empty host the pointer is cleared");

console.log("wallpaper: ok");
console.log("entries kept:", entries.length, "resolved:", resolved.slice(0, 64) + "…");
