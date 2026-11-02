/**
 * dsh-ui-beautify — node half.
 *
 * Three exact routes, nothing else: the theme document, the AI helper, and one
 * wallpaper file. Every route is registered inside its own try/catch so a
 * failure in one can never stop the others from being reachable.
 */

import { copyFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { askModel, readStoredKey, storeKey } from "./ai.js";

/** Package name the module graph uses for the browser bundle. */
export const PACKAGE_ID = "dsh-ui-beautify";
/** Route prefix owned by this package. */
export const ROUTE_PREFIX = "/plugins/dsh-ui-beautify";
/** Package version reported by diagnostics. */
export const VERSION = "1.7.4";
/** Wait for the Web server before touching its route table. */
export const inject = ["webServer"];

/** Reject absurd documents early. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

function pluginDirectory() {
	const home = process.env.DSH_HOME || join(homedir(), ".dsh");
	return join(home, "ui-beautify");
}

function readBody(request) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		request.on("data", (chunk) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				reject(new Error("payload too large"));
				request.destroy();
				return;
			}
			chunks.push(chunk);
		});
		request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
		request.on("error", reject);
	});
}

function readBinary(request) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		request.on("data", (chunk) => {
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				reject(new Error("payload too large"));
				request.destroy();
				return;
			}
			chunks.push(chunk);
		});
		request.on("end", () => resolve(Buffer.concat(chunks)));
		request.on("error", reject);
	});
}

function sendJson(response, status, payload) {
	const body = JSON.stringify(payload);
	response.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store",
		"content-length": Buffer.byteLength(body),
	});
	response.end(body);
}

async function readState() {
	try {
		const text = await readFile(join(pluginDirectory(), "state.json"), "utf8");
		const parsed = JSON.parse(text);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
}

async function writeState(payload) {
	const directory = pluginDirectory();
	await mkdir(directory, { recursive: true });
	const target = join(directory, "state.json");
	const temporary = join(directory, "state.tmp.json");
	await writeFile(temporary, JSON.stringify(payload, null, 2), "utf8");
	await rename(target, join(directory, "state.bak.json")).catch(() => { });
	await rename(temporary, target);
}

async function wallpaperUrl() {
	try {
		const info = await stat(join(pluginDirectory(), "wallpaper.bin"));
		return ROUTE_PREFIX + "/wallpaper?v=" + Math.trunc(info.mtimeMs);
	} catch {
		return null;
	}
}

/* ---------- wallpaper library ---------- */

function wallpapersDirectory() {
	return join(pluginDirectory(), "wallpapers");
}

function normalizeWallpaperId(value) {
	return typeof value === "string" && /^[A-Za-z0-9_-]{1,48}$/.test(value) ? value : null;
}

function newWallpaperId() {
	return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function wallpaperEntryUrl(id, stamp) {
	return ROUTE_PREFIX + "/wallpaper?id=" + encodeURIComponent(id) + "&v=" + Math.trunc(Number(stamp) || Date.now());
}

/**
 * Every stored wallpaper, newest first.
 *
 * @returns the library entries the client renders.
 */
async function listWallpapers() {
	const directory = wallpapersDirectory();
	let names;
	try {
		names = await readdir(directory);
	} catch {
		return [];
	}
	const items = [];
	for (const name of names) {
		if (!name.endsWith(".bin")) continue;
		const id = normalizeWallpaperId(name.slice(0, -4));
		if (id === null) continue;
		let info;
		try {
			info = await stat(join(directory, name));
		} catch {
			continue;
		}
		if (info.size === 0) continue;
		let meta = {};
		try {
			meta = JSON.parse(await readFile(join(directory, id + ".json"), "utf8")) || {};
		} catch {
			meta = {};
		}
		items.push({
			id,
			url: wallpaperEntryUrl(id, info.mtimeMs),
			name: typeof meta.name === "string" ? meta.name : "",
			type: typeof meta.type === "string" ? meta.type : "image/png",
			bytes: info.size,
			savedAt: typeof meta.savedAt === "number" ? meta.savedAt : Math.trunc(info.mtimeMs),
		});
	}
	items.sort((left, right) => right.savedAt - left.savedAt);
	return items;
}

async function writeWallpaperMeta(directory, id, meta) {
	await writeFile(join(directory, id + ".json"), JSON.stringify(meta), "utf8");
}

/**
 * Adopt the pre-library single file as the first library entry, once.
 *
 * The old `wallpaper.bin` is left untouched so nothing the user had can vanish.
 */
async function migrateLegacyWallpaper() {
	const directory = pluginDirectory();
	let info;
	try {
		info = await stat(join(directory, "wallpaper.bin"));
	} catch {
		return;
	}
	if (info.size === 0) return;
	const target = wallpapersDirectory();
	let existing = [];
	try {
		existing = await readdir(target);
	} catch {
		existing = [];
	}
	if (existing.some((name) => name.endsWith(".bin"))) return;
	await mkdir(target, { recursive: true });
	let meta = {};
	try {
		meta = JSON.parse(await readFile(join(directory, "wallpaper.json"), "utf8")) || {};
	} catch {
		meta = {};
	}
	const id = "legacy1";
	await copyFile(join(directory, "wallpaper.bin"), join(target, id + ".bin"));
	await writeWallpaperMeta(target, id, {
		type: typeof meta.type === "string" ? meta.type : "image/png",
		bytes: info.size,
		savedAt: typeof meta.savedAt === "number" ? meta.savedAt : Math.trunc(info.mtimeMs),
		name: "",
	});
}

/**
 * Host half.
 *
 * @param ctx - the host plugin context.
 */
export function apply(ctx) {
	const observations = [];
	let llm = null;
	try {
		ctx.inject(["llm"], (child) => { llm = child.llm; });
	} catch {
		llm = null;
	}

	/**
	 * Register one exact route with permissive CORS and request logging.
	 *
	 * @param path - route path.
	 * @param handler - request handler.
	 * @returns a disposer.
	 */
	const register = (path, handler) => {
		try {
			const dispose = ctx.webServer.register({
				kind: "exact",
				path: ROUTE_PREFIX + path,
				handler: async (request, response) => {
					const origin = request.headers.origin;
					response.setHeader("access-control-allow-origin", origin || "*");
					response.setHeader("vary", "origin");
					response.setHeader("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
					response.setHeader("access-control-allow-headers", "content-type");
					if (request.method === "OPTIONS") {
						response.writeHead(204);
						response.end();
						return;
					}
					observations.push({ at: new Date().toISOString(), method: request.method, path, origin: origin || null });
					if (observations.length > 40) observations.shift();
					try {
						await handler(request, response);
					} catch (error) {
						sendJson(response, 500, { ok: false, error: String(error && error.message || error) });
					}
				},
			});
			return typeof dispose === "function" ? dispose : () => { };
		} catch (error) {
			observations.push({ at: new Date().toISOString(), route: path, failed: String(error && error.message || error) });
			return () => { };
		}
	};

	const disposers = [];

	/* settings document */
	disposers.push(register("/state", async (request, response) => {
		if (request.method === "GET" || request.method === "HEAD") {
			const stored = await readState();
			sendJson(response, 200, {
				...(stored ?? { state: null, savedAt: 0 }),
				keyStored: (await readStoredKey()) !== null,
				wallpaperUrl: await wallpaperUrl(),
				wallpapers: await listWallpapers(),
			});
			return;
		}
		if (request.method !== "PUT" && request.method !== "POST") {
			response.writeHead(405, { allow: "GET, HEAD, PUT, POST" });
			response.end();
			return;
		}
		let parsed;
		try {
			parsed = JSON.parse(await readBody(request));
		} catch {
			sendJson(response, 400, { ok: false, error: "invalid JSON" });
			return;
		}
		const state = parsed && typeof parsed === "object" && "state" in parsed ? parsed.state : parsed;
		if (state !== null && (typeof state !== "object" || Array.isArray(state))) {
			sendJson(response, 400, { ok: false, error: "state must be an object" });
			return;
		}
		const payload = { state, savedAt: Date.now(), version: VERSION };
		await writeState(payload);
		sendJson(response, 200, { ok: true, savedAt: payload.savedAt });
	}));

	/* AI theming */
	disposers.push(register("/ai", async (request, response) => {
		if (request.method !== "POST") {
			response.writeHead(405, { allow: "POST" });
			response.end();
			return;
		}
		let body;
		try {
			body = JSON.parse(await readBody(request));
		} catch {
			sendJson(response, 400, { ok: false, error: "invalid JSON" });
			return;
		}
		const prompt = String(body && body.prompt || "").slice(0, 2000).trim();
		if (prompt === "") {
			sendJson(response, 400, { ok: false, error: "empty prompt" });
			return;
		}
		if (llm === null) {
			sendJson(response, 501, { ok: false, error: "no-llm" });
			return;
		}
		try {
			if (typeof body.key === "string" && body.key.trim() !== "") await storeKey(body.key.trim());
			const answer = await askModel(llm, prompt, body.base || null, body.locale === "en" ? "en" : "zh", body.key || null, Array.isArray(body.history) ? body.history : []);
			sendJson(response, 200, answer);
		} catch (error) {
			sendJson(response, 502, { ok: false, error: String(error && error.message || error) });
		}
	}));

	/*
	 * Wallpaper library. One exact route, the image picked by `?id=`.
	 * Without an id it still serves the pre-library single file, so an older
	 * client keeps working during an upgrade.
	 */
	disposers.push(register("/wallpaper", async (request, response) => {
		let query;
		try {
			query = new URL(request.url || "/", "http://127.0.0.1").searchParams;
		} catch {
			query = new URLSearchParams();
		}
		const requested = query.get("id");
		const id = requested === null ? null : normalizeWallpaperId(requested);
		if (requested !== null && id === null) {
			sendJson(response, 400, { ok: false, error: "bad id" });
			return;
		}
		const library = wallpapersDirectory();
		const legacyDirectory = pluginDirectory();

		if (request.method === "GET" || request.method === "HEAD") {
			const file = id === null ? join(legacyDirectory, "wallpaper.bin") : join(library, id + ".bin");
			const metaFile = id === null ? join(legacyDirectory, "wallpaper.json") : join(library, id + ".json");
			try {
				const bytes = await readFile(file);
				let type = "image/png";
				try {
					const meta = JSON.parse(await readFile(metaFile, "utf8"));
					if (meta && typeof meta.type === "string") type = meta.type;
				} catch { }
				response.writeHead(200, {
					"content-type": type,
					"cache-control": "no-cache",
					"content-length": bytes.length,
				});
				if (request.method === "HEAD") response.end();
				else response.end(bytes);
			} catch {
				response.writeHead(404);
				response.end();
			}
			return;
		}

		if (request.method === "DELETE") {
			if (id === null) {
				sendJson(response, 400, { ok: false, error: "id required" });
				return;
			}
			await unlink(join(library, id + ".bin")).catch(() => { });
			await unlink(join(library, id + ".json")).catch(() => { });
			sendJson(response, 200, { ok: true, id, wallpapers: await listWallpapers() });
			return;
		}

		if (request.method !== "POST" && request.method !== "PUT") {
			response.writeHead(405, { allow: "GET, HEAD, POST, PUT, DELETE" });
			response.end();
			return;
		}

		const type = String(request.headers["content-type"] || "image/png");
		if (!/^image\//i.test(type)) {
			sendJson(response, 400, { ok: false, error: "not an image" });
			return;
		}
		const bytes = await readBinary(request);
		if (bytes.length === 0) {
			sendJson(response, 400, { ok: false, error: "empty image" });
			return;
		}
		await mkdir(library, { recursive: true });
		const finalId = id === null ? newWallpaperId() : id;
		const savedAt = Date.now();
		const wanted = String(query.get("name") || "").slice(0, 60);
		await writeFile(join(library, finalId + ".bin"), bytes);
		let previous = {};
		try {
			previous = JSON.parse(await readFile(join(library, finalId + ".json"), "utf8")) || {};
		} catch {
			previous = {};
		}
		const name = wanted !== "" ? wanted : (typeof previous.name === "string" ? previous.name : "");
		await writeWallpaperMeta(library, finalId, { type, bytes: bytes.length, savedAt, name });
		if (id === null) {
			/* keep the single-file slot alive for older clients and for /state */
			await mkdir(legacyDirectory, { recursive: true });
			await writeFile(join(legacyDirectory, "wallpaper.bin"), bytes);
			await writeFile(join(legacyDirectory, "wallpaper.json"), JSON.stringify({ type, bytes: bytes.length, savedAt }), "utf8");
		}
		sendJson(response, 200, {
			ok: true,
			id: finalId,
			url: wallpaperEntryUrl(finalId, savedAt),
			bytes: bytes.length,
			wallpapers: await listWallpapers(),
		});
	}));

	/* support diagnostics, registered last on purpose */
	disposers.push(register("/diagnostics", async (_request, response) => {
		sendJson(response, 200, {
			package: PACKAGE_ID,
			version: VERSION,
			loadedAt: new Date().toISOString(),
			...compositionFacts(ctx),
			routePrefix: ROUTE_PREFIX,
			stateFile: join(pluginDirectory(), "state.json"),
			observations,
		});
	}));

	ctx.effect(() => () => {
		for (const dispose of disposers) {
			try { dispose(); } catch { }
		}
	}, "ui-beautify: routes");

	void writeDiagnostics(ctx);
	void migrateLegacyWallpaper().catch(() => { });
}

async function writeDiagnostics(ctx) {
	try {
		const directory = pluginDirectory();
		await mkdir(directory, { recursive: true });
		await writeFile(join(directory, "diagnostics.json"), JSON.stringify({
			package: PACKAGE_ID,
			version: VERSION,
			loadedAt: new Date().toISOString(),
			...compositionFacts(ctx),
			stateFile: join(directory, "state.json"),
		}, null, 2), "utf8");
	} catch {
		// never gates the plugin
	}
}

function compositionFacts(ctx) {
	const facts = { clientPath: null, graphEntries: null };
	try {
		const modules = ctx.clientModules;
		if (modules === void 0 || modules === null) {
			facts.clientPath = "no clientModules service";
			return facts;
		}
		if (typeof modules.clientPath === "function") facts.clientPath = modules.clientPath(PACKAGE_ID) ?? null;
		if (typeof modules.graph === "function") {
			const graph = modules.graph();
			facts.graphEntries = Array.isArray(graph && graph.entries)
				? graph.entries.filter((entry) => JSON.stringify(entry).includes("beautify")).slice(0, 3)
				: null;
		}
	} catch (error) {
		facts.clientPath = "error: " + String(error && error.message || error);
	}
	return facts;
}
