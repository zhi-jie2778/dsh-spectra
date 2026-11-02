/**
 * AI theming for dsh-ui-beautify.
 *
 * Preferred path: the model DSH already configured, through the Host `llm`
 * service (so the user's existing provider, key and quota are used as-is).
 * Fallback: if that service is missing, or the deployment keeps its key in a
 * form this plugin cannot read, the user may paste a DeepSeek key in the AI
 * tab; it is stored next to the theme document and used to call the public API
 * directly. The key is never sent back to the browser.
 */

import { chmod, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const PRESET_BRIEF = [
	"apple-glass: frosted glass, big radii, soft shadows, clean blue accent",
	"cyber-neon: dark neon, violet and cyan, glowing edges, strong motion",
	"candy-aurora: dreamy gradients, pink and violet, springy motion",
	"minimal-swiss: high contrast, hairlines, whitespace, near-zero glass",
	"warm-paper: muted warm paper tones, calm, low saturation",
	"terminal-retro: phosphor green terminal, monospace mood, CRT feel",
].join("\n");

const STATE_BRIEF = '{"preset":"one preset id or null","reply":"one short sentence","state":{"mode":"auto|light|dark","palette":{"light":{"accent":"#rrggbb"},"dark":{"accent":"#rrggbb"}},"materials":{"glass":true,"glassBlur":0-40,"panelAlpha":0.1-1,"radius":0-2.4,"shadow":0-1,"border":0-1,"density":0.85-1.15},"effects":{"hover":0-1,"enter":0-1,"msg":0-1,"stream":0-1,"focus":0-1,"think":0-1,"page":0-1},"wallpaper":{"style":"none|gradient|image|animated","url":"","fit":"cover|contain|tile","blur":0-30,"dim":0-0.85,"saturate":0-2,"animate":6-120},"eye":{"enabled":false,"strength":0-0.6},"regions":{"sidebar":true,"chat":true,"composer":true,"overlays":true,"settings":true,"terminal":true,"code":true,"details":true}}}';

/**
 * @returns this plugin's data directory.
 */
function directory() {
	return join(process.env.DSH_HOME || join(homedir(), ".dsh"), "ui-beautify");
}

/**
 * @returns the stored DeepSeek key, or null.
 */
export async function readStoredKey() {
	try {
		const text = await readFile(join(directory(), "key.json"), "utf8");
		const parsed = JSON.parse(text);
		return typeof parsed.key === "string" && parsed.key !== "" ? parsed.key : null;
	} catch {
		return null;
	}
}

/**
 * Store the DeepSeek key, best-effort private.
 *
 * @param key - the key to keep.
 */
export async function storeKey(key) {
	const path = join(directory(), "key.json");
	await writeFile(path, JSON.stringify({ key, savedAt: Date.now() }), { encoding: "utf8", mode: 0o600 });
	try { await chmod(path, 0o600); } catch { }
}

/**
 * Ask for a theme, trying the DSH-configured model first and a pasted key second.
 *
 * @param llm - the host Llm service, or null.
 * @param prompt - the user's description.
 * @param base - the current theme when building on it.
 * @param lang - reply language.
 * @param providedKey - a key sent with this request.
 * @returns the parsed answer.
 */
export async function askModel(llm, prompt, base, lang, providedKey, history = []) {
	const system = [
		"You are the theme designer inside DeepSeek Harness UI Beautify.",
		"Reply with ONE JSON object and nothing else, no markdown fences.",
		"Design a complete theme from the request, not a preset pick. ALWAYS return all of these groups:",
		"- palette.light and palette.dark, each with all 11 colors;",
		"- materials: glass (true/false), glassBlur 0-40 px (frost amount), panelAlpha 0.1-1 (1 = solid, 0.4 = very see-through), radius 0-2.4 (corner roundness), shadow 0-1, border 0-1, density 0.85-1.15;",
		"- effects: hover, enter, msg, stream, focus, think, page, each 0-1 (0 = off);",
		"- wallpaper: style none|gradient|image|animated, plus blur 0-30, dim 0-0.85, saturate 0-2, animate 6-120;",
		"- regions (sidebar, chat, composer, overlays, settings, terminal, code, details) and eye (enabled, strength).",
		"Words about 透明/穿透/通透/毛玻璃/磨砂 mean panelAlpha low and glassBlur high; 圆角大 means radius high; 动效克制 means effects low.",
		"Keep every field within its range and never omit a group.",
		"Presets:",
		PRESET_BRIEF,
		"Output shape:",
		STATE_BRIEF,
		lang === "en" ? "Write the reply field in English." : "The reply field must be Simplified Chinese.",
	].join("\n");
	const transcript = history.slice(-8)
		.filter((turn) => turn && typeof turn.text === "string" && turn.text !== "")
		.map((turn) => (turn.role === "assistant" ? "assistant" : "user") + ": " + turn.text)
		.join("\n");
	const context = transcript === "" ? "" : "Earlier turns of this conversation (context only, do not repeat them):\n" + transcript + "\n\n";
	const user = context + (base
		? "Adjust the current theme instead of starting over.\nCURRENT=" + JSON.stringify(base) + "\nREQUEST=" + prompt
		: "Design a theme from scratch.\nREQUEST=" + prompt);
	const messages = [
		{ role: "system", content: [{ type: "text", text: system }] },
		{ role: "user", content: [{ type: "text", text: user }] },
	];

	let lastError = "no provider";
	if (llm !== null && llm !== undefined) {
		for (const candidate of candidateRoutes(llm)) {
			try {
				const text = await streamOnce(llm, candidate.provider, candidate.model, messages);
				const parsed = extractJson(text);
				if (parsed === null) {
					lastError = "model returned no JSON";
					continue;
				}
				return {
					ok: true,
					engine: "ai",
					preset: typeof parsed.preset === "string" ? parsed.preset : null,
					state: parsed.state && typeof parsed.state === "object" ? parsed.state : null,
					message: typeof parsed.reply === "string" ? parsed.reply : "",
					model: candidate.provider + "/" + candidate.model,
				};
			} catch (error) {
				lastError = String(error && error.message || error);
			}
		}
	}

	const key = (typeof providedKey === "string" && providedKey.trim() !== "" ? providedKey.trim() : null) ?? (await readStoredKey());
	if (key === null) {
		throw new Error("no-credentials: " + lastError);
	}
	const text = await callDeepSeek(key, system, user);
	const parsed = extractJson(text);
	if (parsed === null) throw new Error("model returned no JSON");
	return {
		ok: true,
		engine: "ai",
		preset: typeof parsed.preset === "string" ? parsed.preset : null,
		state: parsed.state && typeof parsed.state === "object" ? parsed.state : null,
		message: typeof parsed.reply === "string" ? parsed.reply : "",
		model: "deepseek-chat (api key)",
	};
}

/**
 * @param llm - host Llm service.
 * @returns provider/model pairs to try.
 */
function candidateRoutes(llm) {
	const routes = [];
	try {
		const providers = llm.listProviders();
		for (const entry of Array.isArray(providers) ? providers : []) {
			const provider = typeof entry === "string" ? entry : entry && (entry.provider ?? entry.name ?? entry.id);
			if (typeof provider !== "string") continue;
			const models = (entry && (entry.models ?? entry.modelIds)) || [];
			const first = Array.isArray(models) && models.length > 0
				? (typeof models[0] === "string" ? models[0] : models[0] && (models[0].id ?? models[0].model))
				: undefined;
			if (typeof first === "string") routes.push({ provider, model: first });
			for (const fallback of ["deepseek-flash", "deepseek-chat"]) routes.push({ provider, model: fallback });
		}
	} catch {
		// fall through to the built-in guesses
	}
	for (const pair of [["deepseek-account", "deepseek-flash"], ["deepseek-official", "deepseek-flash"], ["deepseek-account", "deepseek-chat"]]) {
		routes.push({ provider: pair[0], model: pair[1] });
	}
	const seen = new Set();
	return routes.filter((route) => {
		const key = route.provider + "/" + route.model;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Stream one call through the host service.
 *
 * @param llm - host Llm service.
 * @param provider - provider route.
 * @param model - model id.
 * @param messages - request messages.
 * @returns concatenated text.
 */
async function streamOnce(llm, provider, model, messages) {
	let text = "";
	for await (const chunk of llm.stream({ provider, model, messages })) {
		if (chunk === null || typeof chunk !== "object") continue;
		if (chunk.type === "text-delta") text += chunk.text ?? chunk.delta ?? "";
		else if (chunk.type === "finish") break;
	}
	if (text.trim() === "") throw new Error("empty completion");
	return text;
}

/**
 * Call the public DeepSeek chat API with a pasted key.
 *
 * @param key - API key.
 * @param system - system prompt.
 * @param user - user prompt.
 * @returns the answer text.
 */
async function callDeepSeek(key, system, user) {
	const response = await fetch("https://api.deepseek.com/chat/completions", {
		method: "POST",
		headers: { "content-type": "application/json", authorization: "Bearer " + key },
		body: JSON.stringify({
			model: "deepseek-chat",
			temperature: 0.4,
			messages: [
				{ role: "system", content: system },
				{ role: "user", content: user },
			],
		}),
	});
	if (!response.ok) throw new Error("deepseek api " + response.status);
	const payload = await response.json();
	const text = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
	if (typeof text !== "string" || text.trim() === "") throw new Error("empty completion");
	return text;
}

/**
 * Extract the first JSON object from a model answer.
 *
 * @param text - raw text.
 * @returns parsed object or null.
 */
function extractJson(text) {
	const cleaned = String(text).replace(/```json/gi, "```").replace(/```/g, "").trim();
	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	if (start === -1 || end <= start) return null;
	try {
		const parsed = JSON.parse(cleaned.slice(start, end + 1));
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
}
