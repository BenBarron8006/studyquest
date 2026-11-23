import { BUILTIN, STEPS, SEED_CARDS, PUZZLES, MARKETS, TITLES } from "./data.js";
import { LIBRARY, PACK_PROMPT } from "./library.js";
import { METHOD } from "./method.js";
import { LESSONS, LESSON_PROMPT } from "./lessons.js";
import { GEN, checkAnswer } from "./gens.js";
import { PUZZLE_BANK, puzzleSet, genPuzzle, genSequence, genBet, genBlitz } from "./games.js";

/* ============================== Storage ============================== */
let dbp = null;
function db() {
  if (!dbp)
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open("studyquest", 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv"); if (!d.objectStoreNames.contains("files")) d.createObjectStore("files"); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  return dbp;
}
async function idb(store, mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction(store, mode); const req = fn(tx.objectStore(store)); tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error); }); }
const kvGet = (k) => idb("kv", "readonly", (s) => s.get(k));
const kvPut = (k, v) => idb("kv", "readwrite", (s) => s.put(v, k));
const fileGet = (k) => idb("files", "readonly", (s) => s.get(k));
const filePut = (k, v) => idb("files", "readwrite", (s) => s.put(v, k));
const fileDel = (k) => idb("files", "readwrite", (s) => s.delete(k));

/* ============================== Helpers ============================== */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseDay(k); d.setDate(d.getDate() + n); return dayKey(d); };
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
const isoWeek = (d) => { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7)); const w1 = new Date(t.getFullYear(), 0, 4); return t.getFullYear() + "-W" + (1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7)); };
const fmtDate = (k) => (k ? parseDay(k).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");
const uid6 = () => Math.random().toString(36).slice(2, 8);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "course";
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clone = (o) => JSON.parse(JSON.stringify(o));
const safeRe = (src) => { try { return new RegExp(src, "i"); } catch { return null; } };

/* ============================== State ============================== */
const DEFAULT_STATE = () => ({
  version: 2, created: Date.now(), xp: 0,
  streak: { count: 0, last: null, restWeeks: [] },
  days: {}, units: {}, cards: {}, zetamac: [], puzzles: {}, markets: [],
  goals: { zetamac: 45, weeklyMinutes: 600 },
  weeklyReviews: {}, badges: {}, files: {}, timer: null,
  enabled: ["ling", "prob"],
  customCourses: [],
  coursePrefs: {},
  sync: {}, updatedAt: 0, kps: {}, mistakes: [], genLessons: {},
  settings: { model: "Qwen3.5-2B-q4f16_1-MLC", mode: "break", minutes: { term: 120, break: 180 }, maxSubjects: 4 },
});
let S = DEFAULT_STATE();
let saveT = null;
function save() { invalidate(); S.updatedAt = Date.now(); clearTimeout(saveT); saveT = setTimeout(() => kvPut("state", S).catch(console.error), 250); if (syncToken) { clearTimeout(syncT); syncT = setTimeout(() => syncNow(), 15000); } }
function today() { const k = dayKey(); if (!S.days[k]) S.days[k] = { xp: 0, minutes: 0, reviews: 0, steps: 0, chest: false, blocks: {}, courseMin: {} }; const d = S.days[k]; d.blocks ||= {}; d.courseMin ||= {}; return d; }
function unitState(id) { if (!S.units[id]) S.units[id] = { steps: {}, score: null, mastered: null, pretest: null }; return S.units[id]; }
function migrate(saved) {
  const base = DEFAULT_STATE();
  saved = { ...saved };
  const s = { ...base, ...saved, settings: { ...base.settings, ...(saved.settings || {}), minutes: { ...base.settings.minutes, ...(saved.settings?.minutes || {}) } }, goals: { ...base.goals, ...(saved.goals || {}) } };
  if (!saved.enabled && saved.settings?.activeCourses) s.enabled = saved.settings.activeCourses;
  s.version = 2;
  return s;
}

/* ============================== Courses (packs) ============================== */
let _cache = null;
function invalidate() { _cache = null; }
function allPacks() {
  const byId = new Map();
  for (const p of [...BUILTIN, ...LIBRARY]) byId.set(p.id, { ...p, origin: BUILTIN.includes(p) ? "built-in" : "library" });
  for (const p of S.customCourses || []) byId.set(p.id, { ...p, origin: byId.has(p.id) ? "edited" : "custom" });
  return [...byId.values()];
}
function normalize(pack) {
  const prefs = S.coursePrefs[pack.id] || {};
  const units = (pack.units || []).map((u, i) => ({ ...u, id: u.id || `${pack.id}-${i + 1}`, concepts: u.concepts || [], resources: u.resources || [], apply: u.apply || "" }));
  const n = units.length;
  const sched = prefs.start && prefs.end ? prefs : pack.schedule?.start && pack.schedule?.end ? pack.schedule : null;
  const start = sched?.start || prefs.enabledOn || dayKey();
  const end = sched?.end || addDays(start, 7 * n);
  const span = Math.max(n, daysBetween(start, end));
  units.forEach((u, i) => { if (!u.target || (prefs.start && prefs.end)) u.target = addDays(start, Math.round(((i + 1) * span) / n)); });
  const course = { ...pack, units, priority: prefs.priority || 2 };
  units.forEach((u) => (u.course = course));
  return course;
}
function compute() {
  const packs = allPacks();
  const enabled = packs.filter((p) => S.enabled.includes(p.id)).map(normalize);
  const units = enabled.flatMap((c) => c.units);
  return { packs, enabled, units, byUnit: new Map(units.map((u) => [u.id, u])) };
}
const C = () => (_cache ||= compute());
const courses = () => C().enabled;
const allUnits = () => C().units;
const unitById = (id) => C().byUnit.get(id);
const rkey = (u, r, i) => `${u.id}|${r.id ?? i}`;


/* ============================== Sync across devices (private GitHub Gist) ============================== */
const SYNC_FILE = "studyquest-state.json", SYNC_DESC = "StudyQuest sync (private, do not edit)";
let syncToken = null, syncBusy = false, syncT = null, syncStatus = "";
function setSyncStatus(t) { syncStatus = t; const el = $("#syncstat"); if (el) el.textContent = t; }
async function gh(path, opts = {}) {
  const r = await fetch("https://api.github.com" + path, { ...opts, headers: { Authorization: "Bearer " + syncToken, Accept: "application/vnd.github+json", ...(opts.body ? { "Content-Type": "application/json" } : {}) } });
  if (!r.ok) throw new Error(r.status === 401 ? "token rejected (expired or mistyped)" : r.status === 403 || r.status === 404 ? "token lacks the gist scope" : "GitHub error " + r.status);
  return r.json();
}
const syncPayload = (s) => { const { files, timer, sync, ...rest } = s; return rest; };
async function findGist() {
  if (S.sync?.gistId) return S.sync.gistId;
  for (let page = 1; page <= 5; page++) { const list = await gh(`/gists?per_page=100&page=${page}`); const g = list.find((x) => x.files?.[SYNC_FILE]); if (g) return g.id; if (list.length < 100) break; }
  return null;
}
function mergeStates(a, b) {
  const mx = (x, y) => Math.max(x || 0, y || 0), newer = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
  const o = { ...a, version: 2, created: Math.min(a.created || Date.now(), b.created || Date.now()), updatedAt: mx(a.updatedAt, b.updatedAt) };
  for (const f of ["enabled", "coursePrefs", "settings", "goals", "customCourses"]) if (newer[f] !== undefined) o[f] = newer[f];
  o.days = { ...a.days };
  for (const [k, d] of Object.entries(b.days || {})) {
    const l = o.days[k]; if (!l) { o.days[k] = d; continue; }
    const m = { ...d, ...l };
    for (const f of ["xp", "minutes", "reviews", "steps", "focusXp"]) m[f] = mx(l[f], d[f]);
    for (const f of ["chest", "sessionDone", "tutorXp"]) m[f] = !!(l[f] || d[f]);
    m.blocks = { ...(d.blocks || {}), ...(l.blocks || {}) };
    m.courseMin = { ...(l.courseMin || {}) }; for (const [c, v] of Object.entries(d.courseMin || {})) m.courseMin[c] = mx(m.courseMin[c], v);
    o.days[k] = m;
  }
  o.units = { ...a.units };
  for (const [id, u] of Object.entries(b.units || {})) {
    const l = o.units[id]; if (!l) { o.units[id] = u; continue; }
    const steps = { ...(u.steps || {}) }; for (const [s, d] of Object.entries(l.steps || {})) steps[s] = steps[s] && steps[s] < d ? steps[s] : d;
    const both = (x, y, f) => (x == null ? y : y == null ? x : f(x, y));
    o.units[id] = { ...u, ...l, steps, score: both(l.score, u.score, Math.max), pretest: both(l.pretest, u.pretest, Math.max), mastered: both(l.mastered, u.mastered, (x, y) => (x < y ? x : y)), minutes: mx(l.minutes, u.minutes) };
  }
  o.cards = { ...a.cards };
  for (const [id, c] of Object.entries(b.cards || {})) { const l = o.cards[id]; o.cards[id] = !l ? c : (c.last || 0) > (l.last || 0) ? { ...l, ...c, deleted: l.deleted || c.deleted } : { ...c, ...l, deleted: l.deleted || c.deleted }; }
  const uniq = (x, y) => { const seen = new Set(), out = []; for (const e of [...(x || []), ...(y || [])]) { const k = JSON.stringify(e); if (!seen.has(k)) { seen.add(k); out.push(e); } } return out; };
  o.zetamac = uniq(a.zetamac, b.zetamac).sort((x, y) => (x.date < y.date ? -1 : 1));
  o.markets = uniq(a.markets, b.markets).sort((x, y) => (x.date < y.date ? -1 : 1));
  o.puzzles = { ...a.puzzles }; for (const [id, p] of Object.entries(b.puzzles || {})) { const l = o.puzzles[id] || {}; o.puzzles[id] = { ...p, ...l, revealed: l.revealed || p.revealed, graded: l.graded || p.graded, solved: l.solved || p.solved }; }
  o.badges = { ...a.badges }; for (const [id, d] of Object.entries(b.badges || {})) o.badges[id] = o.badges[id] && o.badges[id] < d ? o.badges[id] : d;
  o.weeklyReviews = { ...a.weeklyReviews }; for (const [k, v] of Object.entries(b.weeklyReviews || {})) if ((v || "").length > (o.weeklyReviews[k] || "").length) o.weeklyReviews[k] = v;
  const sa = a.streak || {}, sb = b.streak || {};
  o.streak = (sb.last || "") > (sa.last || "") ? { ...sb } : (sa.last || "") > (sb.last || "") ? { ...sa } : { ...sa, count: mx(sa.count, sb.count) };
  o.streak.restWeeks = [...new Set([...(sa.restWeeks || []), ...(sb.restWeeks || [])])];
  o.xp = Math.max(a.xp || 0, b.xp || 0, Object.values(o.days).reduce((t, d) => t + (d.xp || 0), 0));
  o.kps = { ...a.kps };
  for (const [id, k] of Object.entries(b.kps || {})) { const l = o.kps[id]; if (!l) { o.kps[id] = k; continue; } const later = (k.last || 0) > (l.last || 0) ? k : l; o.kps[id] = { ...l, ...k, s: later.s, d: later.d, due: later.due, last: later.last, reps: mx(l.reps, k.reps), errors: mx(l.errors, k.errors), correct: mx(l.correct, k.correct), learned: l.learned && k.learned ? (l.learned < k.learned ? l.learned : k.learned) : l.learned || k.learned, testedOut: l.testedOut || k.testedOut, seen: { ...(k.seen || {}), ...(l.seen || {}) } }; }
  o.mistakes = uniq(a.mistakes, b.mistakes).sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, 300);
  o.genLessons = { ...(b.genLessons || {}), ...(a.genLessons || {}) };
  o.files = a.files; o.timer = a.timer; o.sync = a.sync;
  return o;
}
async function syncNow(manual) {
  if (!syncToken || syncBusy) return;
  if (!navigator.onLine) { setSyncStatus("Offline: will sync when you're back online"); return; }
  syncBusy = true; setSyncStatus("Syncing…");
  try {
    const id = await findGist();
    let remote = null;
    if (id) { const g = await gh(`/gists/${id}`); const f = g.files?.[SYNC_FILE]; if (f) remote = JSON.parse(f.truncated ? await (await fetch(f.raw_url)).text() : f.content); }
    const before = JSON.stringify(syncPayload(S));
    if (remote?.version) S = migrate(mergeStates(S, remote));
    const content = JSON.stringify(syncPayload(S));
    const body = JSON.stringify({ description: SYNC_DESC, files: { [SYNC_FILE]: { content } } });
    let gid = id;
    if (id) { if (!remote || JSON.stringify(syncPayload(migrate(remote))) !== content) await gh(`/gists/${id}`, { method: "PATCH", body }); }
    else gid = (await gh("/gists", { method: "POST", body: JSON.stringify({ description: SYNC_DESC, public: false, files: { [SYNC_FILE]: { content } } }) })).id;
    S.sync = { ...(S.sync || {}), gistId: gid, lastSync: Date.now() };
    invalidate(); await kvPut("state", S);
    setSyncStatus("Synced at " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    if (manual) toast("🔄 Synced");
    if (before !== content && !drill.running && !["review", "edit", "tutor"].includes(route().view)) render();
  } catch (e) { console.warn(e); setSyncStatus("Sync failed: " + (e.message || e)); if (manual) toast("⚠️ Sync failed: " + (e.message || e)); }
  syncBusy = false;
}
window.addEventListener("online", () => syncNow());
document.addEventListener("visibilitychange", () => syncNow());

/* ============================== Gamification ============================== */
const level = (xp) => Math.floor(Math.sqrt(xp / 60)) + 1;
const levelXp = (l) => 60 * (l - 1) * (l - 1);
const title = (l) => TITLES[Math.min(TITLES.length - 1, Math.floor((l - 1) / 3))];
function markActive() {
  const k = dayKey(), st = S.streak;
  if (st.last === k) return;
  if (!st.last) st.count = 1;
  else {
    const gap = daysBetween(st.last, k), wk = isoWeek(parseDay(k));
    if (gap === 1) st.count += 1;
    else if (gap === 2 && !st.restWeeks.includes(wk)) { st.count += 1; st.restWeeks.push(wk); toast("🛌 Rest day used: streak kept"); }
    else st.count = 1;
  }
  st.last = k;
}
function addXP(n, why) {
  if (!n) return;
  const before = level(S.xp);
  S.xp += n; today().xp += n; markActive();
  if (why) toast(`+${n} XP · ${why}`);
  if (level(S.xp) > before) setTimeout(() => celebrate(`Level ${level(S.xp)}!`, `You're now a ${title(level(S.xp))}.`), 400);
  checkBadges(); save();
}
const totalReviews = () => Object.values(S.days).reduce((a, d) => a + (d.reviews || 0), 0);
const totalMin = () => Object.values(S.days).reduce((a, d) => a + (d.minutes || 0), 0);
const bestZ = () => S.zetamac.reduce((m, z) => Math.max(m, z.score), 0);
const courseDone = (id) => { const c = courses().find((x) => x.id === id); return c && c.units.length && c.units.every((u) => S.units[u.id]?.mastered); };
function checkBadges() {}

/* ============================== Spaced repetition (FSRS-4.5 default weights) ============================== */
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const FF = 19 / 81, CC = -0.5, RET = 0.9;
const clampD = (d) => Math.min(10, Math.max(1, d));
const D0 = (g) => clampD(W[4] - (g - 3) * W[5]);
const retr = (t, s) => Math.pow(1 + (FF * t) / s, CC);
const ivl = (s) => Math.max(1, Math.round((s / FF) * (Math.pow(RET, 1 / CC) - 1)));
function schedule(c, g, now = Date.now()) {
  const n = { ...c };
  if (!n.s) { n.s = W[g - 1]; n.d = D0(g); }
  else {
    const r = retr(Math.max(0, (now - n.last) / 864e5), n.s);
    let d = n.d - W[6] * (g - 3);
    d = W[7] * D0(3) + (1 - W[7]) * d;
    if (g === 1) { n.s = W[11] * Math.pow(n.d, -W[12]) * (Math.pow(n.s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)); n.lapses = (n.lapses || 0) + 1; }
    else n.s = n.s * (Math.exp(W[8]) * (11 - n.d) * Math.pow(n.s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1) + 1);
    n.d = clampD(d);
  }
  n.reps = (n.reps || 0) + 1; n.last = now;
  n.due = g === 1 ? now + 10 * 60e3 : now + ivl(n.s) * 864e5;
  return n;
}
const previewIvl = (c, g) => { const days = (schedule(c, g).due - Date.now()) / 864e5; return days < 1 ? "10m" : days < 30 ? Math.round(days) + "d" : days < 365 ? Math.round(days / 30) + "mo" : (days / 365).toFixed(1) + "y"; };
function seedCardsFor(u) { const raw = u.cards || SEED_CARDS[u.id] || []; return raw.map((c) => (Array.isArray(c) ? c : [c.front, c.back])).filter((c) => c[0] && c[1]); }
function allCards() {
  const out = [];
  for (const u of allUnits()) seedCardsFor(u).forEach(([f, b], i) => { const id = `${u.id}:${i}`; const st = S.cards[id] || {}; if (!st.deleted) out.push({ id, unit: u.id, front: st.front ?? f, back: st.back ?? b, ...st }); });
  for (const [id, st] of Object.entries(S.cards)) if (st.custom && !st.deleted && (unitById(st.unit) || st.unit === "general")) out.push({ id, ...st });
  return out;
}
const cardsFor = (uid) => allCards().filter((c) => c.unit === uid);
function dueCards() {
  const now = Date.now();
  const due = allCards().filter((c) => c.active && (c.due ?? 0) <= now).sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
  // Interleave across courses (round-robin) so reviews mix subjects.
  const groups = new Map();
  for (const c of due) { const k = unitById(c.unit)?.course.id || "general"; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
  const out = [], lists = [...groups.values()];
  while (lists.some((l) => l.length)) for (const l of lists) if (l.length) out.push(l.shift());
  return out;
}
function setCard(id, patch) { S.cards[id] = { ...(S.cards[id] || {}), ...patch }; save(); }
function activateUnitCards(uid) { for (const c of cardsFor(uid)) if (!c.active) setCard(c.id, { active: true, due: Date.now() }); }
function conceptStrength(uid) {
  const cs = cardsFor(uid).filter((c) => c.active && c.s);
  if (!cs.length) return null;
  const now = Date.now();
  return Math.round((cs.reduce((a, c) => a + retr(Math.max(0, (now - c.last) / 864e5), c.s), 0) / cs.length) * 100);
}

/* ============================== Unit status & daily session ============================== */
function unitStatus(u) {
  const st = S.units[u.id];
  if (st?.mastered) return "mastered";
  if (st && Object.keys(st.steps).length) return "active";
  const list = u.course.units, i = list.findIndex((x) => x.id === u.id);
  const prev = i > 0 ? S.units[list[i - 1].id] : null;
  if (i === 0 || prev?.mastered || (prev && Object.keys(prev.steps).length >= 3)) return "open";
  return "locked";
}
const stepsDone = (uid) => Object.keys(S.units[uid]?.steps || {}).length;
const nextStep = (uid) => { const st = S.units[uid]?.steps || {}; return STEPS.find((s) => !st[s.id]); };
function courseProgress(c) {
  const m = c.units.filter((u) => S.units[u.id]?.mastered).length;
  const due = c.units.filter((u) => u.target <= dayKey()).length;
  return { mastered: m, total: c.units.length, dueByNow: due, behind: Math.max(0, due - m), onTrack: m >= due };
}
const currentUnit = (c) => c.units.find((u) => !["mastered", "locked"].includes(unitStatus(u)));
function recentMinutes(cid) { let m = 0; for (let i = 1; i <= 7; i++) m += S.days[addDays(dayKey(), -i)]?.courseMin?.[cid] || 0; return m; }
function planToday() {
  const d = today();
  const budget = S.settings.minutes[S.settings.mode] || 120;
  const due = dueCards().length + dueKps().length;
  const warm = 5;
  const rev = Math.min(25, Math.max(due ? 5 : 0, Math.round(due * 0.4)));
  let remaining = Math.max(30, budget - warm - rev);
  const PW = { 1: 1, 2: 1.6, 3: 2.4 };
  const cands = courses().map((c) => ({ c, u: currentUnit(c) })).filter((x) => x.u).map((x) => {
    const p = courseProgress(x.c);
    const w = PW[x.c.priority] * (1 + 0.5 * Math.min(4, p.behind));
    return { ...x, w, score: w / (1 + recentMinutes(x.c.id) / 90) };
  });
  cands.sort((a, b) => b.score - a.score);
  const pick = cands.slice(0, Math.max(1, S.settings.maxSubjects || 4));
  const wsum = pick.reduce((a, x) => a + x.w, 0) || 1;
  let blocks = pick.map((x) => ({ course: x.c, unit: x.u, step: nextStep(x.u.id), minutes: Math.min(60, Math.max(15, Math.round((remaining * x.w) / wsum / 5) * 5)) }));
  // Rotate the order daily so a different subject leads each day (interleaving, and fresh energy for each subject).
  blocks.sort((a, b) => a.course.id.localeCompare(b.course.id));
  const doy = Math.floor((parseDay(dayKey()) - new Date(parseDay(dayKey()).getFullYear(), 0, 0)) / 864e5);
  if (blocks.length) blocks = [...blocks.slice(doy % blocks.length), ...blocks.slice(0, doy % blocks.length)];
  blocks.forEach((b) => (b.done = !!d.blocks[b.course.id]));
  return { budget, warm, rev, due, blocks, warmDone: S.zetamac.some((z) => z.date === dayKey()), revDone: due === 0 };
}

/* ============================== UI primitives ============================== */
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; $("#toasts").appendChild(t); setTimeout(() => t.classList.add("out"), 2200); setTimeout(() => t.remove(), 2700); }
function celebrate(head, sub) { const m = document.createElement("div"); m.className = "celebrate"; m.innerHTML = `<div class="burst">✨</div><h2>${esc(head)}</h2><p>${esc(sub)}</p>`; document.body.appendChild(m); m.addEventListener("click", () => m.remove()); setTimeout(() => m.remove(), 2600); }
function modal(html, cls = "") { closeModal(); const m = document.createElement("div"); m.id = "modal"; m.innerHTML = `<div class="modal-card ${cls}"><button class="x" data-act="close-modal" aria-label="Close">✕</button>${html}</div>`; document.body.appendChild(m); m.addEventListener("click", (e) => { if (e.target === m) closeModal(); }); return m; }
let openURLs = [];
function closeModal() { const m = $("#modal"); if (m) { m.querySelectorAll("video").forEach((v) => v.pause()); m.remove(); } openURLs.forEach((u) => URL.revokeObjectURL(u)); openURLs = []; }

/* ============================== Automatic time tracking ============================== */
// Time counts only while you're on a learning screen, the app is visible, and you've touched or typed in the
// last 2 minutes. No start/stop buttons, nothing to self-report.
const IDLE_MS = 120000, LEARN_VIEWS = ["lesson", "diag", "practice", "boss", "review", "tutor", "arena"];
let lastInput = Date.now(), trackCtx = null;
const acc = {};
["pointerdown", "keydown", "wheel", "touchstart", "input"].forEach((ev) => document.addEventListener(ev, () => (lastInput = Date.now()), { passive: true, capture: true }));
function learningContext() {
  const { view, arg } = route();
  if (!LEARN_VIEWS.includes(view) && !(view === "unit" && $("#modal"))) return null;
  if (view === "arena") return { kind: "arena", label: "Arena" };
  if (view === "tutor") return tutor.unit && unitById(tutor.unit) ? { unit: tutor.unit } : { kind: "tutor", label: "Tutor" };
  if (view === "review" || (view === "practice" && arg === "all")) return cur?.u ? { unit: cur.u.id } : { kind: "review", label: "Review" };
  return unitById(arg) ? { unit: arg } : null;
}
function creditMinute(c) {
  const d = today();
  d.minutes++;
  const u = c.unit ? unitById(c.unit) : null;
  if (u) {
    const us = unitState(u.id); us.minutes = (us.minutes || 0) + 1;
    const cid = u.course.id; d.courseMin[cid] = (d.courseMin[cid] || 0) + 1;
    const b = planToday().blocks.find((x) => x.course.id === cid);
    if (b && !d.blocks[cid] && d.courseMin[cid] >= b.minutes) completeBlock(cid);
  } else if (c.kind === "arena") d.arenaMin = (d.arenaMin || 0) + 1;
  if ((d.focusXp || 0) < 240) { d.focusXp = (d.focusXp || 0) + 1; S.xp++; d.xp++; }
  markActive(); save(); renderHeader();
}
setInterval(() => {
  const ctx = learningContext(), active = ctx && document.visibilityState === "visible" && Date.now() - lastInput < IDLE_MS;
  trackCtx = ctx ? { ...ctx, active } : null;
  if (active) { const k = ctx.unit || ctx.kind; acc[k] = (acc[k] || 0) + 5; if (acc[k] >= 60) { acc[k] -= 60; creditMinute(ctx); } }
  renderTimer();
}, 5000);
function completeBlock(cid) {
  const d = today();
  d.blocks[cid] = dayKey();
  addXP(10, "Block complete");
  const p = planToday();
  if (!d.sessionDone && p.blocks.length && p.blocks.every((b) => d.blocks[b.course.id])) { d.sessionDone = true; addXP(40, "Full session"); celebrate("🗓️ Session complete", "Every subject got its turn today."); }
  else { const next = p.blocks.find((b) => !d.blocks[b.course.id]); toast(next ? `✅ Block done. Next up: ${next.course.name}` : "✅ Block done"); }
}
function renderTimer() {
  const bar = $("#timerbar");
  if (!trackCtx) { bar.hidden = true; return; }
  bar.hidden = false;
  const u = trackCtx.unit ? unitById(trackCtx.unit) : null, d = today();
  let txt;
  if (u) { const b = planToday().blocks.find((x) => x.course.id === u.course.id), m = d.courseMin[u.course.id] || 0; txt = `${u.course.emoji} ${esc(u.course.name)}: ${m}${b ? ` / ${b.minutes}` : ""} min today${b && d.blocks[u.course.id] ? " ✅" : ""}`; }
  else txt = `${esc(trackCtx.label)}: ${trackCtx.kind === "arena" ? d.arenaMin || 0 : d.minutes} min`;
  bar.innerHTML = `<span>${trackCtx.active ? "⏱️" : "⏸️"} ${txt}${trackCtx.active ? "" : " · paused, no activity"}</span>`;
}

/* ============================== Router ============================== */
const NAV = [["today", "🏠", "Today"], ["map", "🗺️", "Map"], ["review", "🧠", "Review"], ["arena", "⚔️", "Arena"], ["tutor", "🤖", "Tutor"], ["more", "☰", "More"]];
const MORE = ["library", "goals", "method", "settings", "courses", "edit"];
const route = () => { const h = location.hash.replace(/^#\/?/, "") || "today"; const [view, ...rest] = h.split("/"); return { view, arg: rest.join("/") }; };
const go = (path) => (location.hash = "#/" + path);
window.addEventListener("hashchange", () => render());
function renderHeader() {
  const l = level(S.xp), lo = levelXp(l), hi = levelXp(l + 1), due = dueCards().length + dueKps().length;
  $("#header").innerHTML = `<div class="brand">StudyQuest</div><div class="lvl"><b>Lv ${l}</b> <span class="muted">${title(l)}</span><div class="bar"><i style="width:${Math.round(((S.xp - lo) / (hi - lo)) * 100)}%"></i></div></div>
    <div class="chips"><span class="chip">🔥 ${S.streak.count}</span><span class="chip">✨ ${S.xp}</span><span class="chip ${due ? "warn" : ""}">🧠 ${due}</span></div>`;
  const { view } = route();
  $("#nav").innerHTML = NAV.map(([id, ic, n]) => `<a href="#/${id}" class="${view === id || (id === "map" && ["unit", "lesson", "diag", "practice", "boss"].includes(view)) || (id === "more" && MORE.includes(view)) ? "on" : ""}"><span>${ic}</span>${n}</a>`).join("");
}
function render() {
  renderHeader();
  const { view, arg } = route();
  const views = { today: vToday, map: vMap, unit: vUnit, review: vReview, arena: vArena, tutor: vTutor, more: vMore, library: vLibrary, goals: vGoals, method: vMethod, settings: vSettings, courses: vCourses, edit: vEdit, lesson: vLesson, diag: vDiag, practice: vPractice, boss: vBoss };
  const v = $("#view");
  v.innerHTML = (views[view] || vToday)(arg);
  v.scrollTop = 0;
  if (view === "tutor") { const c = $("#tchat"); if (c) c.scrollTop = c.scrollHeight; }
  if (view === "library") updateQuota();
  if (view === "arena" && arg === "drill" && drill.running) setTimeout(() => $("#dans")?.focus(), 30);
  if (cur && !cur.answered && $("#pans")) setTimeout(() => $("#pans")?.focus(), 30);
}

/* ============================== Today: the mixed daily session ============================== */
function vToday() {
  const d = today(), p = planToday();
  const total = p.blocks.length + 2;
  const done = p.blocks.filter((b) => b.done).length + (p.warmDone ? 1 : 0) + (p.revDone ? 1 : 0);
  const q = [
    { name: "Warm-up: one mental-math run", done: p.warmDone },
    { name: "Clear your reviews", done: p.revDone },
    { name: `Finish today's ${p.blocks.length} subject blocks`, done: p.blocks.length > 0 && p.blocks.every((b) => b.done) },
    { name: "Complete one mastery step", done: d.steps >= 1 },
  ];
  const h = new Date().getHours();
  const greet = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const blockRow = (b, i) => `
    <div class="block ${b.done ? "done" : ""}" style="--c:${b.course.color}">
      <div class="bnum">${i + 3}</div>
      <div class="dot" style="background:${b.course.color}">${b.course.emoji}</div>
      <div class="grow" data-go="${stepRoute(b.unit.id)}"><b>${esc(b.course.name)} · ${b.minutes} min</b>
        <div class="muted">${esc(b.unit.title)} · ${b.step ? b.step.icon + " " + b.step.name : "Review & apply"}${b.unit.target < dayKey() ? ' · <span class="late">behind</span>' : ""}</div></div>
      ${b.done ? `<span class="pill ok">done</span>` : `<span class="muted">${today().courseMin[b.course.id] || 0}/${b.minutes}</span><button class="primary" data-act="block-start" data-unit="${b.unit.id}">Go</button>`}
    </div>`;
  return `
  <section class="hero"><h1>${greet}, Ben</h1><p class="muted">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · ${d.xp} XP today · ${d.minutes} focused min</p></section>
  <section class="card">
    <div class="course-head"><h2 class="grow">Today's session · ${p.budget} min</h2>
      <div class="seg"><a data-act="mode" data-mode="term" class="${S.settings.mode === "term" ? "on" : ""}">Term</a><a data-act="mode" data-mode="break" class="${S.settings.mode === "break" ? "on" : ""}">Break</a></div></div>
    <div class="mini wide2"><i style="width:${(done / total) * 100}%;background:linear-gradient(90deg,var(--accent),var(--accent2))"></i></div>
    <p class="muted">A bit of every subject, in a different order each day. Time is counted automatically while you work in the app (it pauses after 2 minutes without activity); a block completes when you reach its minutes.</p>
    <div class="block ${p.warmDone ? "done" : ""}"><div class="bnum">1</div><div class="dot" style="background:#f5a524">⚡</div><div class="grow"><b>Warm-up · ${p.warm} min</b><div class="muted">One 2-minute mental-math run</div></div>${p.warmDone ? `<span class="pill ok">done</span>` : `<button class="primary" data-go="arena/drill">Go</button>`}</div>
    <div class="block ${p.revDone ? "done" : ""}"><div class="bnum">2</div><div class="dot" style="background:#7c5cff">🧠</div><div class="grow"><b>Reviews · ~${p.rev} min</b><div class="muted">${p.due} due (problems and cards), mixed across subjects</div></div>${p.revDone ? `<span class="pill ok">done</span>` : `<button class="primary" data-go="review">Go</button>`}</div>
    ${p.blocks.map(blockRow).join("") || `<p class="muted">No active subjects. Turn some on in <a href="#/courses">Courses</a>.</p>`}
  </section>
  <section class="card"><h2>Daily quests</h2>
    ${q.map((x) => `<div class="quest ${x.done ? "done" : ""}"><span class="tick">${x.done ? "✅" : "⬜"}</span><span class="qname">${x.name}</span></div>`).join("")}
    ${q.every((x) => x.done) && !d.chest ? `<button class="primary big" data-act="chest">🎁 Open today's chest (+50 XP)</button>` : d.chest ? `<p class="muted center">Chest opened. See you tomorrow.</p>` : ""}
  </section>
  ${new Date().getDay() === 0 ? `<section class="card"><h2>Sunday review</h2><p class="muted">Two minutes: what worked, what didn't, one commitment for next week.</p><button data-go="goals">Write it (+30 XP)</button></section>` : ""}`;
}

/* ============================== Map ============================== */
function vMap() {
  const avail = allPacks().filter((p) => !S.enabled.includes(p.id));
  return `<section class="hero"><h1>Knowledge map</h1><p class="muted">Each node is a unit. Master it to unlock the next. 🧠 shows how well you currently remember its cards.</p>
    <div class="row-btns"><a class="btn primary" href="#/courses">+ Add or manage courses</a></div></section>
  ${courses().map((c) => { const p = courseProgress(c); return `
  <section class="card"><div class="course-head"><span class="dot" style="background:${c.color}">${esc(c.emoji)}</span><div class="grow"><h2>${esc(c.name)}</h2><div class="muted">${esc(c.source || "")}</div></div>
    <span class="pill ${p.onTrack ? "ok" : "bad"}">${p.mastered}/${p.total} · ${p.onTrack ? "on track" : p.behind + " behind"}</span></div>
    <div class="tree">${c.units.map((u) => { const st = unitStatus(u), str = conceptStrength(u.id); return `
      <div class="node ${st}" data-go="${st === "locked" ? "" : "unit/" + u.id}" style="--c:${c.color}"><div class="nicon">${st === "mastered" ? "👑" : st === "locked" ? "🔒" : st === "active" ? "⚔️" : "✨"}</div>
      <div class="ntitle">${esc(u.title)}</div><div class="nmeta">${stepsDone(u.id)}/${STEPS.length} steps${str !== null ? ` · 🧠 ${str}%` : ""} · ${fmtDate(u.target)}</div></div>`; }).join('<div class="link"></div>')}</div></section>`; }).join("")}
  ${avail.length ? `<section class="card"><h2>Available to add</h2>${avail.map((p) => `<div class="res"><span class="rtype">${esc(p.emoji)}</span><div class="grow"><b>${esc(p.name)}</b><div class="muted">${esc(p.source || "")} · ${p.units.length} units</div></div><button data-act="enable" data-course="${p.id}">Add</button></div>`).join("")}</section>` : ""}`;
}

/* ============================== Unit ============================== */
function vUnit(id) {
  const u = unitById(id);
  if (!u) return `<section class="card"><p>This unit isn't in an active course. <a href="#/courses">Manage courses</a>.</p></section>`;
  const st = unitState(id), cards = cardsFor(id), str = conceptStrength(id);
  const notesFile = u.resources.map((r, i) => ({ r, k: rkey(u, r, i) })).find((x) => x.r.type !== "video" && S.files[x.k]);
  const L = lessonFor(u), nL = L ? L.filter((kp) => S.kps[kp.id]?.learned).length : 0;
  const lessonStep = (sid) => !L ? null : {
    pretest: `<div class="row-btns"><button class="primary" data-act="dgo" data-unit="${id}">Take the quick check</button><button data-act="dskip" data-unit="${id}">It's all new: skip</button></div>`,
    learn: `<p class="muted">${nL}/${L.length} concepts learned. Explanation → worked example → you solve two in a row.</p><button class="primary" data-act="lstart" data-unit="${id}">${nL ? "Continue the lesson" : "Start the lesson"}</button>`,
    practice: `<p class="muted">8 generated problems, weighted toward your mistakes. 75% completes the step.</p><button class="primary" data-act="pr-go" data-unit="${id}">Practice</button>`,
    check: `<p class="muted">One fresh problem per concept, no hints. 80% masters the unit.${st.score != null ? ` Best so far: ${st.score}%.` : ""}</p><button class="primary" data-act="boss-go" data-unit="${id}">Boss fight</button>`,
  }[sid];
  const noLesson = `<div class="nolesson"><p><b>No lessons written for this unit yet.</b></p>
    ${writing === id ? `<p class="muted">🎩 Writing lessons…</p>` : `<div class="row-btns">${cloudReady() ? `<button class="primary" data-act="write-lessons" data-unit="${id}">🎩 Write lessons with Claude${notesFile ? " from your notes" : ""}</button>` : `<a class="btn" href="#/settings">Add a Claude API key to write them here</a>`}<button data-act="paste-lessons" data-unit="${id}">Paste lessons</button><button data-act="copy-lprompt" data-unit="${id}">Copy prompt for Claude chat</button></div>`}</div>`;
  return `
  <section class="hero"><a class="back" href="#/map">‹ Map</a><h1>${esc(u.course.emoji)} ${esc(u.title)}</h1>
    <p class="muted">${esc(u.course.name)} · target ${fmtDate(u.target)}${st.minutes ? ` · ${st.minutes} min logged` : ""}${st.mastered ? " · 👑 mastered " + fmtDate(st.mastered) : ""}</p>
    <div class="chips wrap">${u.concepts.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>${str !== null ? `<p class="muted">Memory strength: <b>${str}%</b></p>` : ""}</section>
  <section class="card row-btns"><button data-act="ask-tutor" data-unit="${id}">🎩 Ask the tutor</button></section>
  ${L ? `<section class="card"><h2>Concepts</h2>${L.map((kp, i) => { const ks = S.kps[kp.id] || {}, er = recentErrors(kp.id); return `<div class="cardrow" data-act="lstart" data-unit="${id}" data-k="${i}"><span>${ks.learned ? "✅" : ks.testedOut ? "⏭️" : "⬜"}</span><div class="grow"><b>${esc(kp.title)}</b>${er ? `<div class="muted">missed ${er}× in the last two weeks</div>` : ""}</div><span class="muted">›</span></div>`; }).join("")}</section>` : ""}
  <section class="card"><h2>Mastery loop</h2>
    ${STEPS.map((s, i) => { const done = st.steps[s.id], isNext = !done && nextStep(id)?.id === s.id; return `
      <details class="step ${done ? "done" : ""}" ${isNext ? "open" : ""}><summary><span class="sicon">${done ? "✅" : s.icon}</span><b>${i + 1}. ${s.name}</b><span class="muted">+${s.xp} XP</span></summary>
        ${lessonStep(s.id) ? "" : `<p>${esc(s.how)}</p>`}${lessonStep(s.id) || ""}${!L && s.id === "learn" ? noLesson : ""}
        ${s.id === "apply" && u.apply ? `<p class="task">🛠️ ${esc(u.apply)}</p>` : ""}
        ${s.id === "pretest" && !L ? (cards.length ? `<button data-act="pretest" data-unit="${id}">Start pre-test on ${cards.length} cards</button>` : `<p class="muted">No cards yet: try 3 problems from the problem set cold instead, then mark this done.</p><button class="primary" data-act="step" data-unit="${id}" data-step="pretest">Mark done</button>`) : ""}
        ${s.id === "tutor" ? `<button data-act="ask-tutor" data-unit="${id}" data-mode="quiz">Open tutor: Quiz me</button>` : ""}
        ${s.id === "cards" ? `<button data-act="gen-cards" data-unit="${id}">🃏 Have the tutor draft cards${notesFile ? " from your notes" : ""}</button>` : ""}
        ${s.id === "check" && !L ? `<div class="inline"><input type="number" min="0" max="100" placeholder="Score %" id="score-${id}" inputmode="numeric" value="${st.score ?? ""}"><button data-act="boss" data-unit="${id}">Submit score</button></div>` : ""}
        ${!["pretest", "check"].includes(s.id) && !(L && ["learn", "practice"].includes(s.id)) ? `<button class="${done ? "" : "primary"}" data-act="step" data-unit="${id}" data-step="${s.id}">${done ? "Undo" : "Mark done"}</button>` : ""}
        ${done ? `<span class="muted"> done ${fmtDate(done)}</span>` : ""}</details>`; }).join("")}</section>
  <section class="card"><h2>Materials</h2>
    ${u.resources.map((r, i) => { const k = rkey(u, r, i), has = S.files[k]; return `
      <div class="res"><span class="rtype">${{ notes: "📄", pset: "📝", video: "🎬", book: "📚" }[r.type] || "📎"}</span><div class="grow"><b>${esc(r.label)}</b><div class="muted">${has ? "✅ offline" : r.url ? "online only" : "attach a file"}</div></div>
        ${has ? `<button data-act="open-file" data-key="${esc(k)}">Open</button>` : r.url ? `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">Source ↗</a>` : ""}
        <label class="btn">${has ? "Replace" : "Attach"}<input type="file" hidden data-attach="${esc(k)}" accept=".pdf,video/*,application/pdf"></label></div>`; }).join("") || `<p class="muted">No materials yet. Add some in the course editor.</p>`}
    ${u.course.videos ? `<p><a href="${esc(u.course.videos)}" target="_blank" rel="noopener">All lecture videos for this course ↗</a></p>` : ""}</section>
  <section class="card"><h2>Cards (${cards.length})</h2><p class="muted">${cards.some((c) => c.active) ? "In your review rotation." : "These join your reviews at the Lock in step."} Edit anything that doesn't match the lectures.</p>
    ${cards.map((c) => `<div class="cardrow"><div class="grow"><b>${esc(c.front)}</b><div class="muted">${esc(c.back)}</div></div><button data-act="edit-card" data-id="${c.id}">Edit</button></div>`).join("")}
    <button data-act="add-card" data-unit="${id}">+ Add card</button></section>`;
}

/* ============================== Learning engine: lessons, adaptive check, practice, boss ============================== */
// Lessons come from lessons.js (built in), a course pack (unit.lesson), or ones written later (S.genLessons).
const lessonFor = (u) => (u && (u.lesson || S.genLessons?.[u.id] || LESSONS[u.id])) || null;
const kpState = (id) => (S.kps[id] ||= { errors: 0, correct: 0, seen: {} });
const safeHTML = (s) => esc(s).replace(/&lt;(\/?)(b|i|sup|sub|br)\s*\/?&gt;/g, "<$1$2>");
function asFrac(x) { if (Number.isInteger(x)) return x.toLocaleString(); for (let q = 2; q <= 5000; q++) { const n = Math.round(x * q); if (Math.abs(n / q - x) < 1e-9) return `${n}/${q} (≈ ${Math.round(x * 10000) / 10000})`; } return String(Math.round(x * 10000) / 10000); }
const shown = (p) => (p.type === "mc" ? p.choices[p.a] : p.type === "text" ? p.a[0] : asFrac(p.a));
function makeProblem(kp, avoidQ) {
  if (kp.gen && GEN[kp.gen]) { let p; for (let t = 0; t < 4; t++) { p = GEN[kp.gen](); if (p.q !== avoidQ) break; } return p; }
  const P = kp.problems || [], st = kpState(kp.id);
  if (!P.length) return null;
  const idx = P.map((_, i) => i).filter((i) => P[i].q !== avoidQ);
  const fresh = idx.filter((i) => st.seen[i] !== true); // never answered correctly
  const pool = fresh.length ? fresh : idx.length ? idx : [0];
  const i = pool[Math.floor(Math.random() * pool.length)];
  return { ...P[i], idx: i };
}
function recordAnswer(kp, u, p, ok, given, review) {
  const st = kpState(kp.id);
  if (ok) st.correct++; else st.errors++;
  if (p.idx !== undefined) st.seen[p.idx] = ok;
  if (!ok) { S.mistakes.unshift({ kp: kp.id, unit: u.id, q: p.q, given: p.type === "mc" ? p.choices[given] ?? "(skipped)" : String(given || "(skipped)"), a: shown(p), date: dayKey() }); S.mistakes.length = Math.min(S.mistakes.length, 300); }
  if (review && (st.learned || st.testedOut)) { const n = schedule(st, ok ? 3 : 1); Object.assign(st, { s: n.s, d: n.d, due: n.due, last: n.last, reps: n.reps }); }
  save();
}
function completeStep(uid, sid) {
  const st = unitState(uid);
  if (st.steps[sid]) return;
  st.steps[sid] = dayKey(); today().steps++;
  const s = STEPS.find((x) => x.id === sid); addXP(s.xp, s.name);
  if (sid === "cards") activateUnitCards(uid);
}
function learnedKps(units) { return units.flatMap((u) => (lessonFor(u) || []).map((kp) => ({ kp, u }))).filter((x) => S.kps[x.kp.id]?.learned || S.kps[x.kp.id]?.testedOut); }
function recentErrors(kpid) { const cut = addDays(dayKey(), -14); return S.mistakes.filter((m) => m.kp === kpid && m.date >= cut).length; }
function dueKps() { const now = Date.now(); return learnedKps(allUnits()).filter((x) => S.kps[x.kp.id].due && S.kps[x.kp.id].due <= now); }
function stepRoute(uid) {
  const u = unitById(uid); if (!u || !lessonFor(u)) return "unit/" + uid;
  const n = nextStep(uid)?.id;
  return { pretest: "diag/", learn: "lesson/", practice: "practice/", check: "boss/" }[n] ? { pretest: "diag/", learn: "lesson/", practice: "practice/", check: "boss/" }[n] + uid : "unit/" + uid;
}

// ---- One shared problem widget ----
let cur = null; // { p, kp, u, answered: null | {ok, given}, hint, onDone }
function problemHTML(opts = {}) {
  const p = cur.p, a = cur.answered;
  let input;
  if (p.type === "mc") input = `<div class="choices">${p.choices.map((c, i) => `<button class="choice ${a ? (i === p.a ? "right" : a.given === i ? "wrong" : "") : ""}" data-act="pchoice" data-i="${i}" ${a ? "disabled" : ""}>${esc(c)}</button>`).join("")}</div>`;
  else input = `<div class="inline"><input id="pans" autocomplete="off" autocapitalize="off" spellcheck="false" ${p.type === "num" ? 'inputmode="text" placeholder="Answer: a number, fraction, or expression like C(10,3)/2^10"' : 'placeholder="Your answer"'} value="${a ? esc(a.given) : ""}" ${a ? "disabled" : ""}>${a ? "" : `<button class="primary" data-act="pcheck">Check</button>`}</div>`;
  return `<div class="problem-card"><p class="pq">${esc(p.q)}</p>${input}
    ${!a && opts.idk ? `<button data-act="pidk">I haven't learned this</button>` : ""}
    ${!a && p.hint && !opts.noHint ? (cur.hint ? `<p class="hint">💡 ${esc(p.hint)}</p>` : `<button data-act="phint">Hint</button>`) : ""}
    ${a ? `<div class="feedback ${a.ok ? "ok" : "bad"}"><b>${a.ok ? "✅ Correct." : a.skip ? "Here's how it works:" : `❌ Not quite. The answer is ${esc(shown(p))}.`}</b><p>${esc(p.sol)}</p></div>
      <div class="row-btns"><button class="primary" data-act="pnext">Continue</button>${!a.ok && !opts.noTutor ? `<button data-act="ask-kp">🎩 Ask the tutor why</button>` : ""}</div>` : ""}</div>`;
}
function answer(given, skip) {
  if (!cur || cur.answered) return;
  const ok = !skip && checkAnswer(cur.p, given);
  cur.answered = { ok, given, skip };
  cur.onAnswer?.(ok, given);
  render();
}

// ---- Lesson player ----
let ls = null;
function startLesson(uid, k) {
  const L = lessonFor(unitById(uid));
  const first = L.findIndex((kp) => !S.kps[kp.id]?.learned);
  ls = { uid, k: k ?? (first < 0 ? 0 : first), phase: "teach", ex: 1, streak: 0, errs: 0 };
  cur = null;
}
function vLesson(uid) {
  const u = unitById(uid), L = lessonFor(u);
  if (!u || !L) return vUnit(uid);
  if (!ls || ls.uid !== uid) startLesson(uid);
  const kp = L[ls.k], st = kpState(kp.id), need = st.testedOut || st.learned ? 1 : 2;
  const vids = u.resources.filter((r) => r.type === "video" && /youtu/.test(r.url || ""));
  const dots = L.map((x, i) => `<a class="kdot ${S.kps[x.id]?.learned ? "done" : S.kps[x.id]?.testedOut ? "tested" : ""} ${i === ls.k ? "on" : ""}" data-act="lgoto" data-k="${i}" title="${esc(x.title)}"></a>`).join("");
  let body = "";
  if (ls.phase === "teach") body = `<section class="card lesson"><h2>${esc(kp.title)}</h2><div class="teach">${safeHTML(kp.teach)}</div>
      ${ls.k === 0 && vids.length ? `<details><summary>📺 Watch the lecture instead (online)</summary>${vids.slice(0, 2).map((v) => `<div class="vid"><iframe src="${esc(ytEmbed(v.url))}" allowfullscreen loading="lazy"></iframe></div>`).join("")}</details>` : ""}
      <div class="row-btns"><button class="primary" data-act="lphase" data-p="example">Show me a worked example</button><button data-act="lphase" data-p="try">Skip to practice</button><button data-act="ask-kp">🎩 Ask the tutor</button></div></section>`;
  else if (ls.phase === "example") body = `<section class="card lesson"><h2>Worked example</h2><p class="pq">${esc(kp.example.q)}</p>
      <ol class="steps">${kp.example.steps.slice(0, ls.ex).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      ${ls.ex < kp.example.steps.length ? `<p class="muted">Before you reveal it, try to predict the next step.</p><button class="primary" data-act="lex">Next step</button>` : `<button class="primary" data-act="lphase" data-p="try">Now you try</button>`}
      <button data-act="lphase" data-p="teach">Back to explanation</button></section>`;
  else {
    if (!cur || cur.mode !== "lesson" || cur.kp !== kp) newLessonProblem(kp, u);
    body = `<section class="card lesson"><div class="course-head"><h2 class="grow">Your turn</h2><span class="pill">${ls.streak}/${need} in a row</span></div>${problemHTML()}
      <p class="muted"><a data-act="lphase" data-p="teach">Re-read the explanation</a> · <a data-act="lphase" data-p="example">See the example</a></p></section>`;
  }
  return `<section class="hero"><a class="back" href="#/unit/${uid}">‹ ${esc(u.title)}</a><h1>${esc(u.course.emoji)} Lesson ${ls.k + 1} of ${L.length}</h1><div class="kdots">${dots}</div></section>${body}`;
}
function newLessonProblem(kp, u, avoid) {
  cur = { mode: "lesson", kp, u, p: makeProblem(kp, avoid), answered: null, hint: false,
    onAnswer: (ok, given) => { recordAnswer(kp, u, cur.p, ok, given, false); if (ok) ls.streak++; else { ls.streak = 0; ls.errs++; } } };
}
function lessonNext() {
  const u = unitById(ls.uid), L = lessonFor(u), kp = L[ls.k], st = kpState(kp.id), need = st.testedOut || st.learned ? 1 : 2;
  if (ls.streak >= need) {
    if (!st.learned) { st.learned = dayKey(); const n = schedule({}, ls.errs ? 2 : 3); Object.assign(st, { s: n.s, d: n.d, due: n.due, last: n.last, reps: 1 }); addXP(8, "Concept learned: " + kp.title); }
    save();
    const nextK = L.findIndex((x, i) => i > ls.k && !S.kps[x.id]?.learned);
    if (nextK >= 0) { ls = { ...ls, k: nextK, phase: "teach", ex: 1, streak: 0, errs: 0 }; cur = null; }
    else if (L.every((x) => S.kps[x.id]?.learned)) { completeStep(ls.uid, "learn"); celebrate("📖 Lesson complete", "Next: practice built from your mistakes."); ls = null; cur = null; go("practice/" + u.id); return; }
    else { const k0 = L.findIndex((x) => !S.kps[x.id]?.learned); ls = { ...ls, k: k0, phase: "teach", ex: 1, streak: 0, errs: 0 }; cur = null; }
  } else newLessonProblem(kp, u, cur.p.q);
  render();
}
const ytEmbed = (url) => { const m = String(url).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : url; };

// ---- Adaptive check (replaces the flashcard pre-test when a unit has lessons) ----
let dg = null;
function vDiag(uid) {
  const u = unitById(uid), L = lessonFor(u);
  if (!u || !L) return vUnit(uid);
  if (!dg || dg.uid !== uid) dg = { uid, k: 0, miss: 0, started: false, known: [] };
  const head = `<section class="hero"><a class="back" href="#/unit/${uid}">‹ ${esc(u.title)}</a><h1>Quick check</h1><p class="muted">One question per concept. It stops as soon as you hit two things you don't know, so if this is all new it takes 30 seconds.</p></section>`;
  if (!dg.started) return head + `<section class="card center"><p>${L.length} concepts in this unit. Anything you already know, you'll skip in the lesson.</p><div class="row-btns center"><button class="primary" data-act="dstart">Start the check</button><button data-act="dskip">It's all new to me: start teaching</button></div></section>`;
  if (dg.done || dg.k >= L.length) {
    if (!dg.done) finishDiag();
    const firstNew = L.find((kp) => !S.kps[kp.id]?.testedOut);
    return head + `<section class="card center"><p>You already know <b>${dg.known.length}</b> of ${L.length} concepts.</p>${firstNew ? `<p>Lessons start at <b>${esc(firstNew.title)}</b>.</p><button class="primary" data-act="lstart" data-unit="${uid}">Start the lesson</button>` : `<p>You know all of it. Go straight to the boss fight.</p><button class="primary" data-go="boss/${uid}">Boss fight</button>`}</section>`;
  }
  const kp = L[dg.k];
  if (!cur || cur.mode !== "diag" || cur.kp !== kp) cur = { mode: "diag", kp, u, p: makeProblem(kp), answered: null, hint: false,
    onAnswer: (ok, given) => { recordAnswer(kp, u, cur.p, ok, given, false); if (ok) { kpState(kp.id).testedOut = dayKey(); dg.known.push(kp.id); dg.miss = 0; } else dg.miss++; } };
  return head + `<section class="card"><div class="course-head"><b class="grow">Concept ${dg.k + 1} of ${L.length}</b></div>${problemHTML({ idk: true, noHint: true, noTutor: true })}</section>`;
}
function finishDiag() { dg.done = true; completeStep(dg.uid, "pretest"); save(); }

// ---- Practice: generated from your mistakes and weakest concepts ----
let pr = null;
function pickPractice(units, lastId) {
  const pool = learnedKps(units);
  if (!pool.length) return null;
  const now = Date.now();
  const w = pool.map((x) => { const st = S.kps[x.kp.id]; const r = st.s ? retr(Math.max(0, (now - (st.last || now)) / 864e5), st.s) : 0.5; return 1 + 3 * recentErrors(x.kp.id) + 3 * (1 - r) + (x.kp.id === lastId ? -0.9 : 0); });
  let t = Math.random() * w.reduce((a, b) => a + Math.max(0.1, b), 0);
  for (let i = 0; i < pool.length; i++) { t -= Math.max(0.1, w[i]); if (t <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
function vPractice(uid) {
  const all = uid === "all", u = all ? null : unitById(uid), units = all ? allUnits() : [u];
  if (!all && (!u || !lessonFor(u))) return vUnit(uid);
  if (!pr || pr.uid !== uid) pr = { uid, n: 0, total: 8, right: 0, last: null };
  const back = all ? `<a class="back" href="#/today">‹ Today</a>` : `<a class="back" href="#/unit/${uid}">‹ ${esc(u.title)}</a>`;
  const mistakes = S.mistakes.filter((m) => all || units.some((x) => x.id === m.unit)).slice(0, 6);
  const head = `<section class="hero">${back}<h1>Practice</h1><p class="muted">Fresh problems, weighted toward what you've gotten wrong and what you're about to forget.</p></section>`;
  if (pr.n >= pr.total) {
    const pctv = Math.round((pr.right / pr.total) * 100);
    if (!all && pctv >= 75 && unitState(uid).steps.learn) completeStep(uid, "practice");
    const res = `<section class="card center"><h2>${pr.right}/${pr.total} (${pctv}%)</h2><p>${pctv >= 75 ? (all || !unitState(uid).steps.learn ? "Solid." : "Practice step complete. Next: the boss fight.") : "Below 75%. Another round will target exactly the misses."}</p>
      <div class="row-btns center"><button data-act="pragain">Another round</button>${!all && pctv >= 75 ? `<button class="primary" data-go="boss/${uid}">Boss fight</button>` : ""}</div></section>`;
    return head + res;
  }
  if (!cur || cur.mode !== "practice") {
    const x = pickPractice(units, pr.last);
    if (!x) return head + `<section class="card center"><p>Nothing to practice yet: learn a concept first.</p>${all ? "" : `<button class="primary" data-act="lstart" data-unit="${uid}">Start the lesson</button>`}</section>`;
    pr.last = x.kp.id;
    cur = { mode: "practice", kp: x.kp, u: x.u, p: makeProblem(x.kp), answered: null, hint: false, onAnswer: (ok, given) => { recordAnswer(cur.kp, cur.u, cur.p, ok, given, true); if (ok) { pr.right++; addXP(2); } } };
  }
  return head + `<section class="card"><div class="course-head"><b class="grow">${pr.n + 1} of ${pr.total} · ${esc(cur.kp.title)}</b>${recentErrors(cur.kp.id) ? `<span class="pill bad">missed ${recentErrors(cur.kp.id)}× recently</span>` : ""}</div>${problemHTML()}</section>
    ${mistakes.length ? `<section class="card"><h2>Recent mistakes</h2>${mistakes.map((m) => `<div class="cardrow"><div class="grow"><b>${esc(m.q)}</b><div class="muted">You said ${esc(m.given)} · answer ${esc(m.a)} · ${fmtDate(m.date)}</div></div></div>`).join("")}</section>` : ""}`;
}

// ---- Boss fight: one fresh problem per concept, no hints, 80% to pass ----
let bs = null;
function vBoss(uid) {
  const u = unitById(uid), L = lessonFor(u);
  if (!u || !L) return vUnit(uid);
  if (!bs || bs.uid !== uid) bs = { uid, list: L.slice(0, 12), i: 0, right: 0, started: false, missed: [] };
  const head = `<section class="hero"><a class="back" href="#/unit/${uid}">‹ ${esc(u.title)}</a><h1>🐉 Boss fight</h1><p class="muted">${bs.list.length} fresh problems, one per concept. No hints. 80% to master the unit.</p></section>`;
  if (!bs.started) return head + `<section class="card center"><button class="primary big" data-act="bstart">Fight</button></section>`;
  if (bs.i >= bs.list.length) {
    const pctv = Math.round((bs.right / bs.list.length) * 100), st = unitState(uid);
    if (!bs.scored) { bs.scored = true; st.score = Math.max(st.score || 0, pctv); if (pctv >= 80) { st.steps.check ||= dayKey(); const first = !st.mastered; st.mastered ||= dayKey(); if (first) { addXP(60, "Boss defeated"); celebrate("👑 Unit mastered", u.title); } } save(); }
    return head + `<section class="card center"><h2>${bs.right}/${bs.list.length} (${pctv}%)</h2><p>${pctv >= 80 ? "Mastered. These concepts now come back in your reviews at spaced intervals." : "Not yet. Your practice is now weighted toward:"}</p>
      ${bs.missed.length ? `<ul class="left">${bs.missed.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      <div class="row-btns center">${pctv >= 80 ? `<button class="primary" data-go="unit/${uid}">Back to unit</button>` : `<button class="primary" data-act="pr-go" data-unit="${uid}">Practice the misses</button><button data-act="bretry">Retry later</button>`}</div></section>`;
  }
  const kp = bs.list[bs.i];
  if (!cur || cur.mode !== "boss" || cur.kp !== kp) cur = { mode: "boss", kp, u, p: makeProblem(kp), answered: null, hint: false, onAnswer: (ok, given) => { recordAnswer(kp, u, cur.p, ok, given, true); if (ok) bs.right++; else bs.missed.push(kp.title); } };
  return head + `<section class="card"><b>${bs.i + 1} of ${bs.list.length}</b>${problemHTML({ noHint: true, noTutor: true })}</section>`;
}

// ---- Units without built-in lessons: write them with Claude, or paste them ----
function validateLesson(arr) {
  if (!Array.isArray(arr) || !arr.length) throw new Error("Expected a JSON array of concepts");
  return arr.map((kp, i) => {
    if (!kp.title || !kp.teach) throw new Error(`Concept ${i + 1} needs a title and teach text`);
    const problems = (kp.problems || []).filter((p) => p.q && p.sol && (p.type === "num" ? Number.isFinite(Number(p.a)) : p.type === "mc" ? Array.isArray(p.choices) && p.choices[p.a] !== undefined : p.type === "text" ? Array.isArray(p.a) && p.a.length : false)).map((p) => ({ ...p, a: p.type === "num" ? Number(p.a) : p.a }));
    if (!problems.length) throw new Error(`Concept “${kp.title}” has no valid practice problems`);
    return { id: "g-" + slug(kp.id || kp.title) + "-" + uid6().slice(0, 3), title: String(kp.title), teach: String(kp.teach), example: kp.example?.q && Array.isArray(kp.example.steps) ? kp.example : { q: problems[0].q, steps: [problems[0].sol] }, problems };
  });
}
async function writeLessons(uid) {
  const u = unitById(uid);
  if (!cloudReady()) { toast("Add your Claude API key in Settings first, and be online"); return; }
  let notes = "";
  const hit = u.resources.map((r, i) => ({ r, k: rkey(u, r, i) })).find((x) => x.r.type !== "video" && S.files[x.k]);
  if (hit) { try { notes = await pdfText((await fileGet(S.files[hit.k])).blob, 16000); } catch (e) { console.warn(e); } }
  const prompt = LESSON_PROMPT.replace("<COURSE NAME>", u.course.name + (u.course.source ? ` (${u.course.source})` : "")).replace("<UNIT TITLE>", u.title).replace("<CONCEPTS>", u.concepts.join(", ") || "infer from the title").replace('<PASTE TEXT OR SAY "use the standard curriculum">', notes ? notes : "use the standard curriculum for this course");
  toast("🎩 Writing your lessons… about a minute");
  writing = uid; render();
  try {
    let out = "";
    for await (const t of claudeStream("You write accurate, rigorous lesson content as strict JSON.", [{ role: "user", content: prompt }], 12000)) out += t;
    const arr = validateLesson(JSON.parse(out.slice(out.indexOf("["), out.lastIndexOf("]") + 1)));
    S.genLessons[uid] = arr; save(); toast(`📖 ${arr.length} lessons written`);
  } catch (e) { console.error(e); toast("⚠️ Couldn't write lessons: " + (e.message || e)); }
  writing = null; render();
}
let writing = null;

/* ============================== Review ============================== */
let rv = { queue: [], i: 0, shown: false, done: 0, mode: "srs", unit: null, known: 0 };
function buildReviewQueue() {
  const cards = dueCards().map((c) => c.id), kps = dueKps().map((x) => "kp:" + x.kp.id), out = [];
  while (cards.length || kps.length) { if (kps.length) out.push(kps.shift()); if (cards.length) out.push(cards.shift()); if (cards.length) out.push(cards.shift()); }
  return out;
}
function vReview() {
  if (rv.mode === "srs" && !rv.queue.length) rv.queue = buildReviewQueue();
  const qid = rv.queue[rv.i];
  if (qid && qid.startsWith("kp:")) {
    const x = learnedKps(allUnits()).find((y) => y.kp.id === qid.slice(3));
    if (!x) { rv.i++; return vReview(); }
    if (!cur || cur.mode !== "review" || cur.qi !== rv.i) cur = { mode: "review", qi: rv.i, kp: x.kp, u: x.u, p: makeProblem(x.kp), answered: null, hint: false, onAnswer: (ok, given) => { recordAnswer(x.kp, x.u, cur.p, ok, given, true); today().reviews++; addXP(ok ? 2 : 1); if (!ok) rv.queue.push(qid); } };
    return `<section class="hero"><h1>Review</h1><p class="muted">${rv.queue.length - rv.i} left · <span style="color:${x.u.course.color}">${esc(x.u.course.emoji + " " + x.u.course.name)}</span> · ${esc(x.kp.title)}</p></section><section class="card">${problemHTML()}</section>`;
  }
  const c = qid ? allCards().find((x) => x.id === qid) : null;
  if (qid && !c) { rv.i++; return vReview(); }
  if (!c) {
    const summary = rv.mode === "pretest" ? `<p>Pre-test: you knew <b>${rv.known}/${rv.done}</b>. Study only the ones you missed.</p><button class="primary" data-go="unit/${rv.unit}">Back to unit</button>` : rv.done ? `<p>Session done: <b>${rv.done}</b> items reviewed. 🎉</p><button class="primary" data-go="today">Back to today's session</button>` : `<p>Nothing due. Concepts you learn and cards you lock in come back here on a spaced schedule.</p>`;
    rv = { queue: [], i: 0, shown: false, done: 0, mode: "srs", unit: null, known: 0 };
    return `<section class="hero"><h1>Review</h1></section><section class="card center">${summary}</section>`;
  }
  const u = unitById(c.unit);
  return `<section class="hero"><h1>${rv.mode === "pretest" ? "Pre-test" : "Review"}</h1><p class="muted">${rv.queue.length - rv.i} left${u ? ` · <span style="color:${u.course.color}">${esc(u.course.emoji + " " + u.course.name)}</span> · ${esc(u.title)}` : ""}</p></section>
  <section class="card flash"><div class="front">${esc(c.front)}</div>${rv.shown ? `<div class="back">${esc(c.back)}</div>` : `<p class="muted center">Answer out loud or on paper first.</p>`}</section>
  ${!rv.shown ? `<button class="primary big" data-act="reveal">Show answer</button>` : rv.mode === "pretest" ? `<div class="grade"><button class="again" data-act="pt" data-k="0">Didn't know</button><button class="good" data-act="pt" data-k="1">Knew it</button></div>` : `
  <div class="grade">${[[1, "again", "Again"], [2, "hard", "Hard"], [3, "good", "Good"], [4, "easy", "Easy"]].map(([g, cls, n]) => `<button class="${cls}" data-act="grade" data-g="${g}">${n}<small>${previewIvl(c, g)}</small></button>`).join("")}</div>`}`;
}

/* ============================== Arena ============================== */
const drill = { running: false, end: 0, score: 0, a: 0, b: 0, op: "+", ans: 0, t: null };
const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
function newProblem() {
  const k = ri(0, 3);
  if (k === 0) { drill.a = ri(2, 100); drill.b = ri(2, 100); drill.op = "+"; drill.ans = drill.a + drill.b; }
  if (k === 1) { const x = ri(2, 100), y = ri(2, 100); drill.a = x + y; drill.b = x; drill.op = "−"; drill.ans = y; }
  if (k === 2) { drill.a = ri(2, 12); drill.b = ri(2, 100); drill.op = "×"; drill.ans = drill.a * drill.b; }
  if (k === 3) { const x = ri(2, 12), y = ri(2, 100); drill.a = x * y; drill.b = x; drill.op = "÷"; drill.ans = y; }
}
const ARENA_TABS = [["drill", "⚡ Mental math"], ["puzzles", "🧩 Brainteasers"], ["markets", "📈 Make a market"], ["bets", "🎲 EV bets"], ["seq", "🔢 Sequences"], ["blitz", "⏱️ Probability blitz"]];
function vArena(tab = "drill") {
  tab ||= "drill";
  const head = `<section class="hero"><h1>Arena</h1><p class="muted">Trading-interview training: speed, probability, estimation, expected value.</p></section>
    <div class="tabs">${ARENA_TABS.map(([id, n]) => `<a href="#/arena/${id}" class="${tab === id ? "on" : ""}">${n}</a>`).join("")}</div>`;
  if (tab === "puzzles") return head + vPuzzles();
  if (tab === "markets") return head + vMarkets();
  if (tab === "bets" || tab === "seq") return head + vRounds(tab);
  if (tab === "blitz") return head + vBlitz();
  return head + `<section class="card center">${drill.running ? `
      <div class="timer" id="dtime">${Math.max(0, Math.ceil((drill.end - Date.now()) / 1000))}s</div><div class="problem">${drill.a} ${drill.op} ${drill.b} =</div>
      <input id="dans" class="answer" inputmode="numeric" autocomplete="off" autofocus><div class="muted">Score: <b id="dscore">${drill.score}</b></div>` : `
      <p>2 minutes, Zetamac default ranges (± up to 100, × ÷ up to 12 × 100). Answers submit automatically.</p><button class="primary big" data-act="drill-start">Start</button>
      <p class="muted">Best: <b>${bestZ() || "—"}</b> · Target: <b>${S.goals.zetamac}</b></p>`}</section>
  <section class="card"><h2>History</h2>${spark(S.zetamac.slice(-30).map((z) => z.score), S.goals.zetamac)}
    <div class="inline"><input type="number" id="zman" placeholder="Log a score from zetamac.com" inputmode="numeric"><button data-act="zlog">Log</button></div></section>`;
}
// ---- EV bets and sequences: 10-question rounds, checked automatically, with the tutor available.
let gs = null;
function vRounds(kind) {
  if (!gs || gs.kind !== kind) gs = { kind, n: 0, total: 10, right: 0 };
  S.arena ||= {};
  const best = S.arena[kind]?.best;
  const intro = kind === "bets" ? "Each bet: decide whether to take it. Take it only if its expected value (EV) is positive: EV = P(win) × payout − P(lose) × stake. Interviewers use these to see if you think in expectations rather than gut feel." : "Find the next term. Patterns: constant differences, ratios, squares, Fibonacci-style sums, growing differences, primes, alternating rules.";
  if (gs.n >= gs.total) {
    if (!gs.saved) { gs.saved = true; S.arena[kind] = { best: Math.max(best || 0, gs.right), plays: (S.arena[kind]?.plays || 0) + 1 }; addXP(5 + gs.right, "Round done"); save(); }
    return `<section class="card center"><h2>${gs.right}/${gs.total}</h2><p class="muted">Best: ${S.arena[kind].best}/10</p><button class="primary" data-act="g-again">Play again</button></section>`;
  }
  if (!cur || cur.mode !== "game" || cur.kind !== kind) cur = { mode: "game", kind, kp: { id: kind, title: kind === "bets" ? "Expected-value bet" : "Number sequence" }, u: null, p: kind === "bets" ? genBet() : genSequence(), answered: null, hint: false, onAnswer: (ok) => { if (ok) gs.right++; } };
  return `<section class="card"><p class="muted">${intro}</p><div class="course-head"><b class="grow">${gs.n + 1} of ${gs.total} · ${gs.right} right</b>${best != null ? `<span class="muted">best ${best}/10</span>` : ""}</div>${problemHTML()}</section>`;
}
// ---- Probability blitz: 60 seconds of quick probability questions. Fractions are fine.
const bz = { running: false, end: 0, score: 0, p: null, misses: [], t: null };
function vBlitz() {
  S.arena ||= {};
  const best = S.arena.blitz?.best || 0;
  if (bz.running) return `<section class="card center"><div class="timer" id="btime">${Math.max(0, Math.ceil((bz.end - Date.now()) / 1000))}s</div><p class="pq">${esc(bz.p.q)}</p>
    <div class="inline"><input id="bans" autocomplete="off" placeholder="e.g. 1/6" autofocus><button class="primary" data-act="bz-check">↵</button></div><div class="muted">Score: <b>${bz.score}</b> · Enter to submit; a wrong answer moves on.</div></section>`;
  return `<section class="card center"><p>60 seconds of quick probability: dice, coins, cards, independence. Type fractions like 5/36. Wrong answers are listed at the end with solutions.</p><button class="primary big" data-act="bz-start">Start</button><p class="muted">Best: ${best}</p></section>
    ${bz.misses.length ? `<section class="card"><h2>Last round's misses</h2>${bz.misses.map((m) => `<div class="cardrow"><div class="grow"><b>${esc(m.q)}</b><div class="muted">You: ${esc(m.given)} · ${esc(m.sol)}</div></div></div>`).join("")}</section>` : ""}`;
}
function blitzTick() {
  const left = Math.ceil((bz.end - Date.now()) / 1000), el = $("#btime");
  if (el) el.textContent = Math.max(0, left) + "s";
  if (left > 0) return;
  clearInterval(bz.t); bz.running = false;
  const pb = bz.score > (S.arena.blitz?.best || 0);
  S.arena.blitz = { best: Math.max(S.arena.blitz?.best || 0, bz.score) };
  addXP(5 + bz.score, pb ? `New blitz best: ${bz.score}` : `Blitz: ${bz.score}`); render();
}
function drillTick() {
  const left = Math.ceil((drill.end - Date.now()) / 1000), el = $("#dtime");
  if (el) el.textContent = Math.max(0, left) + "s";
  if (left > 0) return;
  clearInterval(drill.t); drill.running = false;
  const sc = drill.score, pb = sc > bestZ();
  S.zetamac.push({ date: dayKey(), score: sc, src: "arena" });
  addXP(10 + (pb ? 15 : 0), pb ? `New best: ${sc}!` : `Mental math: ${sc}`);
  if (pb) celebrate(`New best: ${sc}`, "Personal record.");
  render();
}
function spark(vals, target) {
  if (!vals.length) return `<p class="muted">No runs yet.</p>`;
  const w = 600, h = 120, max = Math.max(target + 10, ...vals);
  const x = (i) => (vals.length === 1 ? w / 2 : (i / (vals.length - 1)) * (w - 20) + 10), y = (v) => h - 10 - (v / max) * (h - 20);
  return `<svg viewBox="0 0 ${w} ${h}" class="spark"><line x1="0" x2="${w}" y1="${y(target)}" y2="${y(target)}" class="tline"/><polyline points="${vals.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" fill="none" class="sline"/>${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" class="sdot"/>`).join("")}<text x="${w - 4}" y="${y(target) - 4}" text-anchor="end" class="tlabel">target ${target}</text></svg>`;
}
// ---- Brainteasers: a new set every day (3 from the bank you haven't solved + 2 generated), checked automatically.
let ps = null;
function todaysPuzzles() {
  const k = dayKey();
  S.puzzleGen ||= {};
  if (S.puzzleGen.day !== k) S.puzzleGen = { day: k, items: [genPuzzle(), genPuzzle()] };
  const solved = Object.entries(S.puzzles).filter(([, v]) => v.solved).map(([id]) => id);
  return [...puzzleSet(k, solved), ...S.puzzleGen.items];
}
function vPuzzles() {
  const list = todaysPuzzles();
  if (!ps || ps.day !== dayKey()) ps = { day: dayKey(), i: null };
  const solvedBank = PUZZLE_BANK.filter((p) => S.puzzles[p.id]?.solved).length;
  if (ps.i === null || ps.i >= list.length) return `<section class="card"><h2>Today's set</h2><p class="muted">A new set every day: 3 classics from a bank of ${PUZZLE_BANK.length} (you've solved ${solvedBank}) plus 2 generated ones. Answers are checked automatically; after each one you can ask the tutor about any step.</p>
    ${list.map((p, i) => { const st = S.puzzles[p.id] || {}; return `<div class="cardrow" data-act="puz-open" data-i="${i}"><span>${st.solved ? "✅" : st.tried ? "❌" : "⬜"}</span><div class="grow">${esc(p.q.length > 110 ? p.q.slice(0, 110) + "…" : p.q)}</div><span class="muted">›</span></div>`; }).join("")}
    <div class="row-btns"><button data-act="puz-open" data-i="${list.findIndex((p) => !S.puzzles[p.id]?.tried) < 0 ? 0 : list.findIndex((p) => !S.puzzles[p.id]?.tried)}" class="primary">Start</button><button data-act="puz-more">+ 3 more generated</button></div></section>`;
  const p = list[ps.i];
  if (!cur || cur.mode !== "puzzle" || cur.p.id !== p.id) cur = { mode: "puzzle", kp: { id: "puzzle", title: "Brainteaser" }, u: null, p, answered: null, hint: false,
    onAnswer: (ok) => { const st = (S.puzzles[p.id] ||= {}); const first = !st.tried; st.tried = true; if (ok && !st.solved) { st.solved = dayKey(); addXP(first ? 15 : 8, "Puzzle solved"); } save(); } };
  return `<section class="card"><div class="course-head"><b class="grow">Puzzle ${ps.i + 1} of ${list.length}</b><a data-act="puz-list">All of today's</a></div>${problemHTML()}</section>`;
}
let mk = { i: null, res: null };
function vMarkets() {
  if (mk.i === null) mk.i = ri(0, MARKETS.length - 1);
  const m = MARKETS[mk.i], recent = S.markets.slice(-10).reverse();
  const hits = S.markets.filter((x) => x.score > 0).length, n = S.markets.length, rate = n ? Math.round((hits / n) * 100) : null;
  const verdict = (r) => { if (!r) return ""; const m2 = MARKETS[mk.i], inside = m2.a >= r.bid && m2.a <= r.ask, ratio = r.ask / Math.max(r.bid, 1e-9);
    return inside ? `✅ The true value is inside your market. Your ask was ${ratio.toFixed(2)}× your bid: ${ratio < 1.3 ? "a tight, useful market" : ratio < 2.5 ? "reasonable; tighten it if you were confident" : "very wide: safe, but a market this wide tells a trader little"}.`
      : m2.a > r.ask ? `❌ The true value is above your ask. A trader who knew it would buy from you at ${r.ask.toLocaleString()} and you'd lose ${(m2.a - r.ask).toLocaleString()} per unit.` : `❌ The true value is below your bid. A trader who knew it would sell to you at ${r.bid.toLocaleString()} and you'd lose ${(r.bid - m2.a).toLocaleString()} per unit.`; };
  return `<section class="card"><details ${n < 3 ? "open" : ""}><summary><b>How this game works</b></summary>
      <p>In trading interviews you're often asked to <b>“make a market”</b> on a number nobody expects you to know exactly, like the height of Everest. You answer with two prices:</p>
      <p>• your <b>bid</b>: the price at which you'd buy;<br>• your <b>ask</b>: the price at which you'd sell (higher than the bid).</p>
      <p>Imagine the other side knows the true value. If the truth is above your ask, they buy from you too cheaply; if it's below your bid, they sell to you too dearly. Either way you lose. If it's between, you're safe.</p>
      <p>So the skill is <b>calibration</b>: wide enough to contain the truth, narrow enough to be useful. A market of 1 to 1,000,000 is never wrong but worthless.</p>
      <p><b>Scoring:</b> a miss scores 0. A hit scores 100 − 60·log₁₀(ask ÷ bid): about 95 for ±10%, 82 if the ask is 2× the bid, 40 at 10×. Aim to contain the truth about <b>90%</b> of the time: much higher means you're too wide, much lower means you're overconfident.</p>
      <p class="muted">Tip: reason out loud first. Everest? Taller than Mont Blanc (~4,800 m), planes cruise around 10,000 m, so maybe 8,000–9,500.</p></details></section>
    <section class="card"><h2>${esc(m.q)}</h2>
    ${mk.res ? `<p class="task">True value: <b>${m.a.toLocaleString()}</b> · your market ${mk.res.bid.toLocaleString()} – ${mk.res.ask.toLocaleString()} · <b>${mk.res.score} pts</b></p><p>${verdict(mk.res)}</p><button class="primary" data-act="mk-next">Next market</button>` : `
    <div class="inline"><input type="number" id="mbid" placeholder="Bid" inputmode="decimal"><input type="number" id="mask" placeholder="Ask" inputmode="decimal"><button class="primary" data-act="mk-quote">Quote</button></div>`}</section>
  <section class="card"><h2>Recent</h2>${recent.length ? recent.map((x) => `<div class="cardrow"><div class="grow">${esc(x.q)}</div><b>${x.score}</b></div>`).join("") : `<p class="muted">No markets yet.</p>`}
  ${n ? `<p class="muted">Calibration: the truth was inside ${hits} of your ${n} markets (${rate}%). ${n < 10 ? "Play at least 10 to judge it." : rate > 95 ? "You're too wide: tighten up." : rate < 80 ? "You're overconfident: widen your markets." : "Well calibrated."}</p>` : ""}</section>`;
}

/* ============================== Tutor (local LLM via WebLLM) ============================== */
const MODELS = [
  ["Qwen3.5-2B-q4f16_1-MLC", "Qwen 3.5 2B — fast, ~1.1 GB download (recommended)"],
  ["Qwen3.5-4B-q4f16_1-MLC", "Qwen 3.5 4B — smarter, slower, ~2.5 GB"],
  ["Phi-4-mini-instruct-q4f16_1-MLC", "Phi-4 mini — good at math, ~2.2 GB"],
  ["Llama-3.2-3B-Instruct-q4f16_1-MLC", "Llama 3.2 3B — general, ~1.8 GB"],
];
const MODES = {
  socratic: ["🧭 Socratic", "Guide the learner toward understanding with questions. Don't lecture."],
  quiz: ["🎯 Quiz me", "Quiz the learner: ask ONE question at a time on this unit's concepts, starting easy and getting harder, adapting to their answers. After 5 questions, give a one-line score and list their weak spots."],
  check: ["🔍 Check my work", "The learner will paste their work. Find the FIRST error, if any, and give a hint toward fixing it, not the corrected solution. If it's all correct, say so and ask a harder follow-up."],
  explain: ["💡 Explain", "Explain the concept the learner names simply, with one concrete example, then ask one question to check understanding."],
  cards: ["🃏 Make cards", "Turn the provided material into 5 to 8 flashcards. Output ONLY a JSON array like [{\"front\":\"question\",\"back\":\"short answer\"}]. One fact per card. No other text."],
};
const tutor = { engine: null, loading: false, progress: "", mode: "socratic", unit: null, msgs: [], busy: false, ctx: "", draft: "", returnTo: null };
// Optional stronger tutor: Claude via the user's own API key, used whenever it's set and the device is online.
let cloudKey = null;
const cloudReady = () => !!cloudKey && navigator.onLine;
async function* claudeStream(system, messages, maxTokens = 1024) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": cloudKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: S.settings.cloudModel || "claude-sonnet-5-5", max_tokens: maxTokens, system, messages, stream: true }) });
  if (!r.ok) { let m = ""; try { m = (await r.json()).error?.message || ""; } catch {} throw new Error(`Claude API ${r.status}${m ? ": " + m : ""}`); }
  const rd = r.body.getReader(), dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      let j; try { j = JSON.parse(line.slice(5)); } catch { continue; }
      if (j.type === "error") throw new Error(j.error?.message || "stream error");
      if (j.type === "content_block_delta" && j.delta?.text) yield j.delta.text;
    }
  }
}
function systemPrompt() {
  const u = tutor.unit ? unitById(tutor.unit) : null;
  return [
    `You are Ben's private tutor, in the manner of a Victorian household tutor: one-on-one, attentive, demanding but warm. You lead the session: you decide what he needs next, explain it clearly, then make him demonstrate it. Plain modern English, no costume.${u ? ` Subject: ${u.course.name} (${u.course.source || ""}), unit "${u.title}". Key concepts: ${u.concepts.join(", ")}.` : ""}`,
    "Rules:",
    "1. Keep replies short: at most about 120 words. Ask at most one question at a time.",
    "2. Never give a full solution to a problem the learner hasn't attempted. Give the smallest useful hint, then ask them to try.",
    "3. When the learner answers, say clearly whether it's right and why, and correct misconceptions directly.",
    "4. Check understanding by asking them to explain in their own words or apply the idea to a new example.",
    "5. If they ask a direct factual question (a definition, a formula), answer it plainly.",
    "6. If you're not sure, say so. Never invent facts or sources.",
    "8. When you use a formula or rule, say why it applies here: which assumption or structure of the problem makes it valid. Expect follow-up questions like 'why that equation?' and answer them from first principles.",
    "7. When the learner got a problem wrong, find the specific misconception behind their answer, explain it, then give one similar problem (new numbers) and wait for their attempt.",
    `Mode: ${MODES[tutor.mode][1]}`,
    tutor.ctx ? `Material the learner provided:\n"""${tutor.ctx.slice(0, 6000)}"""` : "",
    cloudReady() ? "" : "/no_think",
  ].filter(Boolean).join("\n");
}
function vTutor(arg) {
  if (arg && unitById(arg)) tutor.unit = arg;
  const gpu = !!navigator.gpu;
  return `<section class="hero">${tutor.returnTo ? `<a class="back" href="${esc(tutor.returnTo)}">‹ Back to where you were</a>` : ""}<h1>🎩 Tutor</h1><p class="muted">${cloudReady() ? "Using Claude (online, your API key)." : "Using the on-device model (works offline). Add a Claude API key in Settings for a much stronger tutor when online."}</p></section>
  ${!gpu && !cloudReady() ? `<section class="card warn"><p>WebGPU isn't available in this browser, so the local model can't run here. Use Safari on iPadOS 26+ or Chrome, or add a Claude API key.</p></section>` : ""}
  <section class="card">${cloudReady() ? "" : tutor.engine ? `<p class="muted">✅ Model loaded: ${esc(S.settings.model)}</p>` : `
    <label>Model <select id="tmodel">${MODELS.map(([id, n]) => `<option value="${id}" ${id === S.settings.model ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
    <button class="primary" data-act="tload" ${!gpu || tutor.loading ? "disabled" : ""}>${tutor.loading ? "Loading…" : "Load model"}</button>
    <p class="muted" id="tprog">${esc(tutor.progress || "The first load downloads the model once (use Wi-Fi). After that it works offline.")}</p>`}
    <label>Unit <select id="tunit"><option value="">General</option>${allUnits().map((u) => `<option value="${u.id}" ${u.id === tutor.unit ? "selected" : ""}>${esc(u.course.name + ": " + u.title)}</option>`).join("")}</select></label>
    <div class="tabs small">${Object.entries(MODES).map(([k, [n]]) => `<a data-act="tmode" data-mode="${k}" class="${tutor.mode === k ? "on" : ""}">${n}</a>`).join("")}</div>
    <details ${tutor.ctx ? "open" : ""}><summary>Notes, a problem or your work (optional)</summary><textarea id="tctx" rows="5" placeholder="Paste text here">${esc(tutor.ctx)}</textarea></details></section>
  <section class="card chat" id="tchat">${tutor.msgs.length ? tutor.msgs.map(msgHTML).join("") : `<p class="muted center">Try: “Quiz me on allophones” or “Why is HT faster than HH?”</p>`}</section>
  <div class="composer"><textarea id="tin" rows="2" placeholder="Message the tutor…">${esc(tutor.draft)}</textarea><button class="primary" data-act="tsend" ${tutor.busy ? "disabled" : ""}>Send</button>${tutor.msgs.length ? `<button data-act="tclear">Clear</button>` : ""}</div>`;
}
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\n/g, "<br>");
const stripThink = (s) => s.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
function parseCards(s) { try { const j = JSON.parse(s.slice(s.indexOf("["), s.lastIndexOf("]") + 1)); return Array.isArray(j) ? j.filter((c) => c.front && c.back) : []; } catch { return []; } }
function msgHTML(m, i) {
  const body = m.role === "assistant" ? stripThink(m.content) : m.content;
  const cards = m.role === "assistant" && m.mode === "cards" && !m.streaming ? parseCards(body) : [];
  return `<div class="msg ${m.role}">${md(body || "…")}${cards.length ? `<button data-act="tcards" data-i="${i}">Add ${cards.length} cards to ${tutor.unit ? "this unit" : "a General deck"}</button>` : ""}</div>`;
}
// WebLLM ships as two halves (GitHub's web uploader caps file size); join them and import as one module.
let webllmP = null;
const loadWebLLM = () => (webllmP ||= Promise.all(["./web-llm.part1.js", "./web-llm.part2.js"].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error("Missing " + u); return r.arrayBuffer(); }))).then((parts) => import(URL.createObjectURL(new Blob(parts, { type: "text/javascript" })))));
async function tutorLoad() {
  if (tutor.loading) return;
  S.settings.model = $("#tmodel")?.value || S.settings.model; save();
  tutor.loading = true; render();
  try {
    const webllm = await loadWebLLM();
    tutor.engine = await webllm.CreateMLCEngine(S.settings.model, { initProgressCallback: (p) => { tutor.progress = p.text; const el = $("#tprog"); if (el) el.textContent = p.text; } });
    toast("🤖 Tutor ready");
  } catch (e) { console.error(e); tutor.progress = "Couldn't load the model: " + (e.message || e) + ". On the first load, check your connection; on smaller iPads try the 2B model."; }
  tutor.loading = false; render();
}
async function tutorSend() {
  const text = $("#tin")?.value.trim();
  if (!text || tutor.busy) return;
  tutor.ctx = $("#tctx")?.value ?? tutor.ctx; tutor.draft = "";
  const useCloud = cloudReady();
  if (!useCloud && !tutor.engine) { toast("Load the model first (or add a Claude API key in Settings)"); return; }
  tutor.msgs.push({ role: "user", content: text });
  const reply = { role: "assistant", content: "", mode: tutor.mode, streaming: true };
  tutor.msgs.push(reply); tutor.busy = true; render();
  try {
    const history = tutor.msgs.filter((m) => m !== reply).slice(-8).map((m) => ({ role: m.role, content: m.role === "assistant" ? stripThink(m.content) : m.content }));
    const paint = () => { const box = $("#tchat"); if (box?.lastElementChild) { box.lastElementChild.innerHTML = md(stripThink(reply.content) || "…"); box.scrollTop = box.scrollHeight; } };
    if (useCloud) { for await (const t of claudeStream(systemPrompt(), history, 1200)) { reply.content += t; paint(); } }
    else for await (const chunk of await tutor.engine.chat.completions.create({ messages: [{ role: "system", content: systemPrompt() }, ...history], stream: true, temperature: tutor.mode === "cards" ? 0.3 : 0.6, max_tokens: 700 })) {
      reply.content += chunk.choices?.[0]?.delta?.content || "";
      const box = $("#tchat");
      if (box?.lastElementChild) { box.lastElementChild.innerHTML = md(stripThink(reply.content) || "…"); box.scrollTop = box.scrollHeight; }
    }
  } catch (e) { reply.content += "\n[Error: " + (e.message || e) + "]"; }
  reply.streaming = false; tutor.busy = false;
  if (!today().tutorXp) { today().tutorXp = true; addXP(5, "Tutor session"); }
  render();
}
let pdfjsP = null;
const pdfjs = () => (pdfjsP ||= import("./pdf.min.mjs").then((lib) => { lib.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs"; return lib; }));
async function pdfText(blob, maxChars = 6000) {
  const lib = await pdfjs();
  const doc = await lib.getDocument({ data: await blob.arrayBuffer() }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages && out.length < maxChars; p++) { const tc = await (await doc.getPage(p)).getTextContent(); out += tc.items.map((x) => x.str).join(" ") + "\n"; }
  return out.slice(0, maxChars);
}

/* ============================== Courses: add, import, build, edit ============================== */
function vCourses() {
  const packs = allPacks();
  return `<section class="hero"><a class="back" href="#/more">‹ More</a><h1>Courses</h1><p class="muted">Turn courses on or off, set priority and dates, or add a new one. Every active course gets time in your daily session.</p></section>
  <section class="card"><h2>Add a new course</h2>
    <div class="addgrid">
      <label class="tile">📦<b>From an MIT OCW .zip</b><span class="muted">Use the course page's “Download course” button, then pick the file. Units are built automatically; you review them before saving.</span><input type="file" hidden id="ocwzip" accept=".zip,application/zip"></label>
      <label class="tile">🧩<b>Import a course pack</b><span class="muted">A .json pack (from Claude, ChatGPT, a friend, or an export).</span><input type="file" hidden id="packfile" accept=".json,application/json"></label>
      <button class="tile" data-act="pack-paste">📋<b>Paste pack JSON</b><span class="muted">Paste a pack an AI wrote for you.</span></button>
      <button class="tile" data-act="new-course">✏️<b>Build by hand</b><span class="muted">Start empty and add units yourself.</span></button>
    </div>
    <details><summary>How to get an AI to write a pack for any course</summary><p class="muted">Copy this prompt, add the course name and URL, and give it to Claude (or any capable AI). Then use “Paste pack JSON”.</p><textarea rows="8" readonly id="packprompt">${esc(PACK_PROMPT)}</textarea><button data-act="copy-prompt">Copy prompt</button></details>
    <p class="muted" id="cmsg"></p></section>
  ${packs.map((p) => { const on = S.enabled.includes(p.id), pr = S.coursePrefs[p.id] || {}; const c = on ? courses().find((x) => x.id === p.id) : null; return `
  <section class="card"><div class="course-head"><span class="dot" style="background:${esc(p.color || "#888")}">${esc(p.emoji || "📘")}</span><div class="grow"><h2>${esc(p.name)}</h2><div class="muted">${esc(p.source || "")} · ${p.units.length} units · ${p.origin}</div></div>
    <label class="switch"><input type="checkbox" data-toggle="${p.id}" ${on ? "checked" : ""}><span>${on ? "Active" : "Off"}</span></label></div>
    ${on ? `<div class="inline">
      <label>Priority <select data-pref="${p.id}" data-field="priority">${[[1, "Low"], [2, "Normal"], [3, "High"]].map(([v, n]) => `<option value="${v}" ${(pr.priority || 2) == v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <label>Start <input type="date" data-pref="${p.id}" data-field="start" value="${pr.start || ""}"></label>
      <label>Finish by <input type="date" data-pref="${p.id}" data-field="end" value="${pr.end || ""}"></label></div>
      <p class="muted">${pr.start && pr.end ? "Unit targets are spread evenly between these dates." : `Using the pack's own dates: last unit due ${fmtDate(c?.units.at(-1)?.target)}.`}</p>` : ""}
    <div class="row-btns"><button data-act="edit-course" data-course="${p.id}">${p.origin === "custom" || p.origin === "edited" ? "Edit" : "Customize"}</button><button data-act="export-pack" data-course="${p.id}">Export pack</button>${p.origin === "custom" || p.origin === "edited" ? `<button class="danger" data-act="del-course" data-course="${p.id}">${p.origin === "edited" ? "Revert to original" : "Delete"}</button>` : ""}</div>
  </section>`; }).join("")}`;
}
function addPack(pack, files) {
  if (!pack || !pack.name || !Array.isArray(pack.units)) throw new Error("A pack needs a name and a units list");
  let id = slug(pack.id || pack.name);
  const taken = new Set(allPacks().map((p) => p.id));
  while (taken.has(id)) id = id + "-" + uid6().slice(0, 2);
  pack.id = id;
  pack.units = pack.units.map((u, i) => ({ ...u, id: `${id}-${i + 1}`, resources: (u.resources || []).map((r) => ({ ...r, id: r.id || "r" + uid6() })) }));
  return pack;
}
function enableCourse(id) { if (!S.enabled.includes(id)) S.enabled.push(id); S.coursePrefs[id] = { ...(S.coursePrefs[id] || {}), enabledOn: S.coursePrefs[id]?.enabledOn || dayKey() }; save(); }

// ---- Course editor (works on a draft; nothing is saved until you press Save) ----
let draft = null; // { pack, files: { resId: Blob+name } , isNew }
function packForEdit(id) {
  const p = allPacks().find((x) => x.id === id);
  const copy = clone({ ...p, units: p.units.map((u, i) => ({ ...u, course: undefined, id: u.id || `${p.id}-${i + 1}`, cards: seedCardsFor({ ...u, id: u.id || `${p.id}-${i + 1}` }), resources: (u.resources || []).map((r, j) => ({ ...r, id: r.id ?? String(j) })) })) });
  delete copy.origin;
  return copy;
}
function vEdit() {
  if (!draft) return `<section class="card"><p>Nothing to edit. <a href="#/courses">Back to courses</a></p></section>`;
  const p = draft.pack;
  const allRes = p.units.flatMap((u, ui) => u.resources.map((r, ri) => ({ u, ui, r, ri })));
  return `<section class="hero"><a class="back" href="#/courses" data-act="cancel-edit">‹ Cancel</a><h1>${draft.isNew ? "New course" : "Edit course"}</h1><p class="muted">Check the units, rename anything, then save. Progress on existing units is kept.</p></section>
  <section class="card"><div class="inline">
    <label>Name <input data-d="name" value="${esc(p.name)}"></label><label>Emoji <input data-d="emoji" value="${esc(p.emoji || "📘")}" maxlength="4" style="max-width:90px"></label><label>Color <input type="color" data-d="color" value="${esc(p.color || "#4a90e2")}"></label></div>
    <label>Source <input data-d="source" value="${esc(p.source || "")}"></label><label>Course home URL <input data-d="home" value="${esc(p.home || "")}"></label>
    <label>File-name tag (regex, used to auto-file imports) <input data-d="fileTag" value="${esc(p.fileTag || "")}"></label></section>
  ${p.units.map((u, ui) => `<section class="card unit-edit">
    <div class="course-head"><b class="grow">Unit ${ui + 1}</b><button data-act="u-up" data-i="${ui}" ${ui ? "" : "disabled"}>↑</button><button data-act="u-down" data-i="${ui}" ${ui < p.units.length - 1 ? "" : "disabled"}>↓</button><button data-act="u-merge" data-i="${ui}" ${ui < p.units.length - 1 ? "" : "disabled"}>Merge with next</button><button class="danger" data-act="u-del" data-i="${ui}">Delete</button></div>
    <label>Title <input data-u="${ui}" data-f="title" value="${esc(u.title)}"></label>
    <label>Key concepts (comma-separated) <input data-u="${ui}" data-f="concepts" value="${esc((u.concepts || []).join(", "))}"></label>
    <label>Apply task <input data-u="${ui}" data-f="apply" value="${esc(u.apply || "")}"></label>
    <div class="muted">${(u.cards || []).length} starter cards</div>
    ${u.resources.map((r, ri) => `<div class="res small"><select data-r="${ui}:${ri}" data-f="type">${["notes", "pset", "video", "book"].map((t) => `<option ${r.type === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      <input class="grow" data-r="${ui}:${ri}" data-f="label" value="${esc(r.label)}">${draft.files[r.id] ? `<span class="pill ok">file</span>` : r.url ? `<span class="pill">link</span>` : ""}
      <select data-move="${ui}:${ri}"><option value="">Move to…</option>${p.units.map((x, k) => (k === ui ? "" : `<option value="${k}">Unit ${k + 1}</option>`)).join("")}</select><button data-act="r-del" data-i="${ui}:${ri}">✕</button></div>`).join("")}
    <div class="inline"><input placeholder="New material label" id="nrl-${ui}"><input placeholder="URL (optional)" id="nru-${ui}"><button data-act="r-add" data-i="${ui}">+ Material</button></div>
  </section>`).join("")}
  <section class="card row-btns"><button data-act="u-add">+ Add unit</button><button class="primary" data-act="save-course">💾 Save course</button></section>
  <p class="muted">${allRes.length} materials across ${p.units.length} units.</p>`;
}
async function saveDraft() {
  const p = draft.pack;
  if (!p.name?.trim()) { toast("Give the course a name"); return; }
  if (!p.units.length) { toast("Add at least one unit"); return; }
  p.units.forEach((u, i) => { u.id ||= `${p.id}-x${uid6()}`; u.title ||= `Unit ${i + 1}`; });
  for (const u of p.units) for (const r of u.resources) {
    const f = draft.files[r.id];
    if (f) { const fid = await storeBlob(f.name, f.blob, f.type); S.files[`${u.id}|${r.id}`] = fid; }
  }
  S.customCourses = (S.customCourses || []).filter((c) => c.id !== p.id).concat([p]);
  enableCourse(p.id);
  const n = Object.keys(draft.files).length;
  draft = null; save();
  toast(`💾 Saved${n ? `, ${n} files stored offline` : ""}`);
  checkBadges(); go("map");
}

// ---- Build a draft course from an MIT OCW "Download course" zip ----
async function buildFromZip(file) {
  const msg = $("#cmsg");
  if (msg) msg.textContent = "Reading the course package…";
  if (!window.JSZip) await loadScript("./jszip.min.js");
  const zip = await window.JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((e) => !e.dir);
  const pdfs = entries.filter((e) => /\.(pdf|mp4|m4v)$/i.test(e.name));
  if (!pdfs.length) throw new Error("No PDFs found in that zip");
  // Titles: OCW resource pages link to files in static_resources; use their page titles.
  const titles = new Map();
  let courseTitle = "", courseNum = "";
  const htmls = entries.filter((e) => /\.html?$/i.test(e.name)).slice(0, 3000);
  for (const h of htmls) {
    const txt = await h.async("string");
    const t = (txt.match(/<title>([^<]*)<\/title>/i)?.[1] || "").trim();
    const parts = t.split("|").map((s) => s.trim()).filter(Boolean);
    if (/(^|\/)index\.html?$/i.test(h.name) && h.name.split("/").length <= 2 && parts.length) { courseTitle ||= parts[0]; courseNum ||= parts[1] || ""; }
    if (!/resources\//i.test(h.name) || !parts.length) continue;
    for (const m of txt.matchAll(/static_resources\/([^"'#?\s]+?\.(pdf|mp4|m4v))/gi)) { const fn = decodeURIComponent(m[1]).split("/").pop(); if (!titles.has(fn)) titles.set(fn, parts[0]); }
  }
  const items = pdfs.map((e) => {
    const fn = e.name.split("/").pop(), t = titles.get(fn) || fn.replace(/^[0-9a-f]{32}_/i, "").replace(/\.(pdf|mp4|m4v)$/i, "").replace(/[_-]+/g, " ");
    const text = (t + " " + fn).toLowerCase();
    const kind = /\b(sol|soln|solution|solutions|answers?)\b|_sol/.test(text) ? "solution" : /exam|quiz|midterm|final/.test(text) ? "exam" : /problem.?set|pset|\bps ?\d|homework|\bhw ?\d|assignment/.test(text) ? "pset" : /lec|lecture|notes|slides|chapter|session|\bch ?\d/.test(text) ? "notes" : /\.(mp4|m4v)$/.test(fn) ? "video" : "other";
    const num = Number((text.match(/(?:lec(?:ture)?|ps|pset|problem set|hw|homework|assignment|ch(?:apter)?|session|quiz|exam|recitation)[ _#-]*0?(\d{1,3})/) || text.match(/(\d{1,3})/) || [])[1] || 0);
    return { e, fn, title: t, kind, num };
  });
  const notes = items.filter((x) => x.kind === "notes" || x.kind === "video").sort((a, b) => a.num - b.num || a.fn.localeCompare(b.fn));
  const psets = items.filter((x) => x.kind === "pset" || x.kind === "solution").sort((a, b) => a.num - b.num);
  const exams = items.filter((x) => x.kind === "exam");
  const other = items.filter((x) => x.kind === "other");
  const files = {};
  const res = (x, type) => { const id = "r" + uid6(); files[id] = { entry: x.e, name: x.fn }; return { id, type, label: x.title.slice(0, 80), match: reEsc(x.fn) }; };
  const base = notes.length ? notes : psets;
  const U = Math.min(12, Math.max(1, Math.round(base.length / 3)));
  const size = Math.ceil(base.length / U) || 1;
  const units = [];
  for (let i = 0; i < base.length; i += size) {
    const chunk = base.slice(i, i + size);
    const topics = [...new Set(chunk.map((x) => x.title.replace(/^(lecture|lec|session|chapter|ch)\s*\d+\s*[:.\-–]?\s*/i, "").replace(/\s*\(.*?\)\s*$/, "").trim()).filter(Boolean))];
    units.push({ title: topics.slice(0, 3).join(" · ").slice(0, 90) || `Unit ${units.length + 1}`, concepts: topics.slice(0, 6), resources: chunk.map((x) => res(x, x.kind === "video" ? "video" : base === notes ? "notes" : "pset")), apply: "" });
  }
  if (base === notes && psets.length) { const P = Math.max(1, ...psets.map((x) => x.num)); for (const x of psets) units[Math.min(units.length - 1, Math.max(0, Math.floor(((Math.max(1, x.num) - 1) / P) * units.length)))].resources.push(res(x, "pset")); }
  if (exams.length) units.push({ title: "Exams: final boss practice", concepts: ["Full-course review"], resources: exams.map((x) => res(x, "pset")), apply: "Take one exam under timed conditions, closed book." });
  if (other.length) units.push({ title: "Readings and other materials", concepts: [], resources: other.slice(0, 40).map((x) => res(x, "book")), apply: "" });
  const name = courseTitle || file.name.replace(/\.zip$/i, "");
  const pack = { id: slug(courseNum || name), name: name.slice(0, 60), source: [courseNum, "MIT OpenCourseWare"].filter(Boolean).join(" · "), color: "#" + ((Math.random() * 0xffffff) | 0).toString(16).padStart(6, "0"), emoji: "📘", home: "", fileTag: courseNum ? reEsc(courseNum).replace(/\\\./g, "[._-]?") : "", units };
  addPack(pack);
  // Load file blobs for the draft (kept in memory until Save).
  const blobs = {};
  for (const [id, f] of Object.entries(files)) { const b = await f.entry.async("blob"); blobs[id] = { name: f.name, blob: new Blob([b], { type: /\.pdf$/i.test(f.name) ? "application/pdf" : "video/mp4" }), type: /\.pdf$/i.test(f.name) ? "application/pdf" : "video/mp4" }; }
  // addPack re-ids resources only if missing, so ids above are kept.
  draft = { pack, files: blobs, isNew: true };
  if (msg) msg.textContent = "";
  toast(`📦 Built ${units.length} units from ${items.length} files: review and save`);
  go("edit");
}

/* ============================== Library, Goals, Method, Settings ============================== */
function vMore() {
  return `<section class="hero"><h1>More</h1></section><section class="card menu">
    <a href="#/courses">📘 Courses: add, import, manage</a><a href="#/goals">🎯 Goals &amp; accountability</a><a href="#/library">📚 Library &amp; offline files</a><a href="#/method">🔬 Why this works (the research)</a><a href="#/settings">⚙️ Settings &amp; backup</a></section>`;
}
let lastUnmatched = [];
async function updateQuota() { try { const est = await navigator.storage?.estimate?.(); const q = $("#quota"); if (est && q) q.textContent = `Storage used: ${(est.usage / 1e9).toFixed(2)} GB of about ${(est.quota / 1e9).toFixed(0)} GB available.`; } catch {} }
function vLibrary() {
  const all = allUnits().flatMap((u) => u.resources.map((r, i) => rkey(u, r, i)));
  return `<section class="hero"><h1>Library</h1><p class="muted">${all.filter((k) => S.files[k]).length}/${all.length} materials stored offline across your active courses.</p></section>
  <section class="card"><h2>Import files</h2><p class="muted">PDFs, videos, or a course .zip for a course you already have. Files are filed to matching lectures automatically. (To create a new course from a zip, use Courses.)</p>
    <label class="btn primary">Import files or .zip<input type="file" hidden multiple id="bulk" accept=".pdf,.zip,video/*,application/pdf,application/zip"></label>
    ${lastUnmatched.length ? `<h3>Not matched (${lastUnmatched.length})</h3>${lastUnmatched.map((f) => `<div class="res"><div class="grow">${esc(f.name)}</div><select data-assign="${esc(f.key)}"><option value="">Assign to…</option>${allUnits().flatMap((u) => u.resources.map((r, i) => `<option value="${esc(rkey(u, r, i))}">${esc(u.course.name + " · " + u.title + " · " + r.label)}</option>`)).join("")}</select></div>`).join("")}` : ""}
    <p class="muted" id="quota"></p></section>
  ${courses().map((c) => `<section class="card"><h2>${esc(c.emoji)} ${esc(c.name)}</h2>${c.units.map((u) => `<div class="libunit"><b>${esc(u.title)}</b>${u.resources.map((r, i) => { const k = rkey(u, r, i); return `<div class="res small"><span class="grow">${S.files[k] ? "✅" : "⬜"} ${esc(r.label)}</span>${S.files[k] ? `<button data-act="open-file" data-key="${esc(k)}">Open</button><button data-act="rm-file" data-key="${esc(k)}">Remove</button>` : r.url ? `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">Source ↗</a>` : ""}</div>`; }).join("")}</div>`).join("")}</section>`).join("")}`;
}
function weekMinutes() { const now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); const k = dayKey(d); return { k, m: S.days[k]?.minutes || 0, cm: S.days[k]?.courseMin || {}, label: d.toLocaleDateString(undefined, { weekday: "short" }) }; }); }
function vGoals() {
  const wk = weekMinutes(), tot = wk.reduce((a, d) => a + d.m, 0), max = Math.max(60, ...wk.map((d) => d.m)), thisWeek = isoWeek(new Date());
  const perCourse = courses().map((c) => ({ c, m: wk.reduce((a, d) => a + (d.cm[c.id] || 0), 0) }));
  return `<section class="hero"><h1>Goals</h1><p class="muted">Everything you're accountable for, in one place.</p></section>
  <section class="card"><h2>This week's focus time</h2><div class="bars">${wk.map((d) => `<div class="bcol"><div class="b" style="height:${(d.m / max) * 100}%"></div><span>${d.label}</span><small>${d.m}</small></div>`).join("")}</div>
    <p>${tot} / ${S.goals.weeklyMinutes} min ${tot >= S.goals.weeklyMinutes ? "✅" : ""}</p>
    ${perCourse.map((x) => `<div class="goalrow"><span>${esc(x.c.emoji)} ${esc(x.c.name)}</span><div class="mini wide"><i style="width:${tot ? (x.m / tot) * 100 : 0}%;background:${x.c.color}"></i></div><span class="muted">${x.m} min</span></div>`).join("")}
    <div class="inline"><label>Weekly target (min) <input type="number" id="gweek" value="${S.goals.weeklyMinutes}" inputmode="numeric"></label><label>Zetamac target <input type="number" id="gz" value="${S.goals.zetamac}" inputmode="numeric"></label><button data-act="save-goals">Save</button></div></section>
  <section class="card"><h2>Courses</h2>${courses().map((c) => { const p = courseProgress(c); return `<div class="goalrow"><span>${esc(c.emoji)} ${esc(c.name)}</span><div class="mini wide"><i style="width:${(p.mastered / Math.max(1, p.total)) * 100}%;background:${c.color}"></i></div><span class="pill ${p.onTrack ? "ok" : "bad"}">${p.mastered}/${p.total}${p.behind ? ` · ${p.behind} behind` : ""}</span></div>`; }).join("")}
    <p class="muted">A unit is “due” on its target date. Change dates per course in Courses.</p></section>
  <section class="card"><h2>Mental math</h2>${spark(S.zetamac.slice(-30).map((z) => z.score), S.goals.zetamac)}<p class="muted">Best ${bestZ() || "—"} · targets: 45 by Feb, 55 by May, 65+ by Aug</p></section>
  <section class="card"><h2>Weekly review</h2><textarea id="wrev" rows="4" placeholder="What worked? What didn't? One commitment for next week.">${esc(S.weeklyReviews[thisWeek] || "")}</textarea><button data-act="save-wrev">Save${S.weeklyReviews[thisWeek] ? "" : " (+30 XP)"}</button>
    ${Object.entries(S.weeklyReviews).filter(([k]) => k !== thisWeek).slice(-4).reverse().map(([k, v]) => `<details><summary>${k}</summary><p>${esc(v)}</p></details>`).join("")}</section>`;
}
function vMethod() {
  return `<section class="hero"><h1>Why this works</h1><p>${esc(METHOD.intro)}</p></section>
  <section class="card"><h2>Your daily session</h2><ol>${METHOD.daily.map((d) => `<li>${esc(d)}</li>`).join("")}</ol></section>
  ${METHOD.rules.map((r) => `<section class="card"><h2>${esc(r.title)}</h2><p>${esc(r.body)}</p>${r.sources.length ? `<p class="muted">Sources: ${r.sources.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join(" · ")}</p>` : ""}</section>`).join("")}
  <section class="card warn"><p>${esc(METHOD.caveat)}</p></section>`;
}
function vSettings() {
  const s = S.settings;
  return `<section class="hero"><h1>Settings</h1></section>
  <section class="card"><h2>Daily session</h2><div class="inline">
    <label>Term-time minutes/day <input type="number" data-set="term" value="${s.minutes.term}" inputmode="numeric"></label>
    <label>Break minutes/day <input type="number" data-set="break" value="${s.minutes.break}" inputmode="numeric"></label>
    <label>Subjects per day (max) <input type="number" min="1" max="8" data-set="maxSubjects" value="${s.maxSubjects}" inputmode="numeric"></label></div>
    <p class="muted">Each day the app splits your time across active courses by priority, how far behind each is, and how much time each got this past week. Switch Term/Break on the Today screen.</p></section>
  <section class="card"><h2>🎩 Stronger tutor (optional, online)</h2>
    <p class="muted">The built-in lessons and practice work offline with no AI. The tutor uses a small on-device model, which is fine for hints but makes mistakes. With your own Claude API key, the tutor uses Claude whenever you're online, and it can write full lessons for any unit that doesn't have them yet. Usage is billed to your Anthropic account (a tutoring session typically costs a few cents). The key stays on this device and is never synced.</p>
    <div class="inline"><input type="password" id="cloudkey" placeholder="sk-ant-…" value="${cloudKey ? "••••••••" : ""}" autocomplete="off"><input id="cloudmodel" value="${esc(S.settings.cloudModel || "claude-sonnet-5-5")}" style="max-width:220px"><button class="primary" data-act="cloud-save">Save</button></div>
    <p class="muted">Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. Leave blank and Save to turn it off.</p></section>
  <section class="card"><h2>Sync across devices</h2>
    ${syncToken ? `<p>✅ This device is connected. <span class="muted" id="syncstat">${esc(syncStatus)}</span></p><div class="row-btns"><button class="primary" data-act="sync-now">Sync now</button><button data-act="sync-off">Disconnect this device</button></div>
      <p class="muted">Syncs automatically when the app opens, when you switch away from it, when you come back online, and 15 seconds after any change.</p>` : `
      <p class="muted">Keep the iPad and the website in step through a private (secret) GitHub Gist on your account. Progress, cards, custom courses and settings sync. Imported PDFs and the AI model stay on each device.</p>
      <ol class="muted"><li><a href="https://github.com/settings/tokens/new?scopes=gist&description=StudyQuest%20sync" target="_blank" rel="noopener">Create a GitHub token</a> (classic) with only the <b>gist</b> box ticked; choose an expiration.</li><li>Paste it here, on each device (iPad and browser).</li></ol>
      <div class="inline"><input type="password" id="synctok" placeholder="ghp_…" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="primary" data-act="sync-on">Connect</button></div>`}</section>
  <section class="card"><h2>Backup</h2><p class="muted">Progress and your custom courses live on this iPad. Export every week or two (imported files aren't included).</p>
    <div class="row-btns"><button data-act="export">Export progress</button><label class="btn">Import backup<input type="file" hidden id="impjson" accept="application/json,.json"></label><button data-act="persist">Protect storage</button></div><p class="muted" id="setmsg"></p></section>
  <section class="card"><h2>About</h2><p class="muted">StudyQuest v2. Course materials © their authors: MIT OpenCourseWare content is CC BY-NC-SA; Stat 110 materials © Joseph Blitzstein and Jessica Hwang. Imported files stay on this device for personal study. Local AI via WebLLM (Apache-2.0); PDFs via pdf.js; zips via JSZip.</p><button class="danger" data-act="reset">Reset all progress</button></section>`;
}

/* ============================== Files ============================== */
async function storeBlob(name, blob, type) { const fid = "f_" + Date.now().toString(36) + uid6(); await filePut(fid, { name, blob, type, added: Date.now() }); return fid; }
async function assignFile(key, fid) {
  const old = S.files[key];
  S.files[key] = fid;
  // A shared resource (e.g. one textbook used by every unit) gets the same file everywhere.
  const [uid] = key.split("|");
  const u = unitById(uid);
  if (u) { const r = u.resources.find((x, i) => rkey(u, x, i) === key); if (r?.type === "book" && r.url) u.course.units.forEach((v) => v.resources.forEach((x, i) => { if (x.type === "book" && x.url === r.url) S.files[rkey(v, x, i)] = fid; })); }
  if (old && !Object.values(S.files).includes(old)) await fileDel(old);
  save();
}
async function openFile(key) {
  const f = S.files[key] && (await fileGet(S.files[key]));
  if (!f) { toast("File missing: re-import it"); return; }
  const url = URL.createObjectURL(f.blob); openURLs.push(url);
  if ((f.type || "").startsWith("video") || /\.(mp4|m4v|mov|webm)$/i.test(f.name)) { modal(`<h2>${esc(f.name)}</h2><video src="${url}" controls playsinline style="width:100%"></video><div class="row-btns"><button data-rate="1">1x</button><button data-rate="1.5">1.5x</button><button data-rate="2">2x</button></div>`, "wide"); return; }
  const m = modal(`<h2>${esc(f.name)}</h2><div class="pdf" id="pdfpages"><p class="muted">Rendering…</p></div>`, "wide");
  try {
    const lib = await pdfjs(), doc = await lib.getDocument({ data: await f.blob.arrayBuffer() }).promise, box = $("#pdfpages", m);
    box.innerHTML = "";
    const width = Math.min(box.clientWidth || 900, 1100);
    for (let p = 1; p <= doc.numPages; p++) {
      if (!document.body.contains(box)) return;
      const page = await doc.getPage(p), vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: (width / vp0.width) * (window.devicePixelRatio || 1) });
      const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height; c.style.width = "100%"; box.appendChild(c);
      await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    }
  } catch (e) { console.error(e); $("#pdfpages", m).innerHTML = `<p>Couldn't render this PDF here. <a href="${url}" target="_blank">Open it directly</a>.</p>`; }
}
function matchResource(name) {
  const n = name.toLowerCase();
  for (const c of courses()) {
    const tag = c.fileTag ? safeRe(c.fileTag) : null;
    if (!tag || !tag.test(n)) continue;
    for (const u of c.units) for (let i = 0; i < u.resources.length; i++) { const r = u.resources[i]; const re = r.match ? safeRe(r.match) : null; if (re && re.test(n)) return rkey(u, r, i); }
  }
  return null;
}
async function bulkImport(files) {
  let matched = 0, total = 0;
  lastUnmatched = [];
  const handle = async (name, blob, type) => { if (!/\.(pdf|mp4|m4v|mov|webm)$/i.test(name)) return; total++; const key = matchResource(name); const fid = await storeBlob(name, blob, type); if (key) { await assignFile(key, fid); matched++; } else lastUnmatched.push({ name, key: fid }); };
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      if (!window.JSZip) await loadScript("./jszip.min.js");
      const zip = await window.JSZip.loadAsync(f);
      for (const e of Object.values(zip.files)) { if (e.dir) continue; const base = e.name.split("/").pop(); if (!/\.(pdf|mp4|m4v|mov|webm)$/i.test(base)) continue; const t = /\.pdf$/i.test(base) ? "application/pdf" : "video/mp4"; await handle(base, new Blob([await e.async("blob")], { type: t }), t); }
    } else await handle(f.name, f, f.type);
  }
  toast(`📚 Imported ${total} files, ${matched} matched`); save(); render();
}
const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
function download(name, obj) { const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }

/* ============================== Events ============================== */
document.addEventListener("click", async (e) => {
  const rate = e.target.closest("[data-rate]");
  if (rate) { const v = $("#modal video"); if (v) v.playbackRate = Number(rate.dataset.rate); return; }
  const a = e.target.closest("[data-act]"), goEl = e.target.closest("[data-go]");
  if (!a && goEl?.dataset.go) { go(goEl.dataset.go); return; }
  if (!a) return;
  const act = a.dataset.act, uid = a.dataset.unit;
  try { switch (act) {
    case "close-modal": closeModal(); break;
    case "pchoice": answer(Number(a.dataset.i)); break;
    case "pcheck": { const v = $("#pans")?.value || ""; if (!v.trim()) { toast("Type an answer, or use the hint"); break; } answer(v); break; }
    case "pidk": answer("", true); break;
    case "phint": cur.hint = true; render(); break;
    case "pnext": {
      const m = cur?.mode;
      if (m === "lesson") { lessonNext(); break; }
      if (m === "diag") { dg.k++; if (dg.miss >= 2) finishDiag(); cur = null; }
      else if (m === "practice") { pr.n++; cur = null; }
      else if (m === "boss") { bs.i++; cur = null; }
      else if (m === "review") { rv.i++; rv.done++; cur = null; }
      else if (m === "puzzle") { ps.i++; cur = null; if (ps.i >= todaysPuzzles().length) ps.i = null; }
      else if (m === "game") { gs.n++; cur = null; }
      render(); break;
    }
    case "ask-kp": {
      const kp = cur?.kp || lessonFor(unitById(ls?.uid))?.[ls?.k], u = cur?.u || (cur ? null : unitById(ls?.uid));
      if (!kp) break;
      const tmp = document.createElement("div"); tmp.innerHTML = kp.teach || "";
      tutor.unit = u?.id || null; tutor.mode = "socratic"; tutor.returnTo = location.hash;
      tutor.ctx = (kp.teach ? `Lesson: ${kp.title}\n${tmp.textContent}` : `Activity: ${kp.title}`) + (cur?.p ? `\n\nProblem: ${cur.p.q}\nCorrect answer: ${shown(cur.p)}\nWorked solution: ${cur.p.sol}` + (cur.answered && !cur.answered.ok ? `\nBen answered: ${cur.p.type === "mc" ? cur.p.choices[cur.answered.given] ?? "(didn't know)" : cur.answered.given || "(didn't know)"}` : "") : "");
      tutor.draft = cur?.answered && !cur.answered.ok ? "I got this wrong. What am I misunderstanding?" : "Can you explain this another way?";
      go("tutor"); break;
    }
    case "lstart": startLesson(a.dataset.unit, a.dataset.k !== undefined ? Number(a.dataset.k) : undefined); go("lesson/" + a.dataset.unit); break;
    case "lgoto": ls = { ...ls, k: Number(a.dataset.k), phase: "teach", ex: 1, streak: 0, errs: 0 }; cur = null; render(); break;
    case "lphase": ls.phase = a.dataset.p; if (a.dataset.p === "example") ls.ex = 1; render(); break;
    case "lex": ls.ex++; render(); break;
    case "dgo": dg = null; cur = null; go("diag/" + a.dataset.unit); break;
    case "dstart": dg.started = true; render(); break;
    case "dskip": { const id = a.dataset.unit || dg?.uid; completeStep(id, "pretest"); save(); dg = null; startLesson(id); go("lesson/" + id); break; }
    case "pr-go": pr = null; cur = null; go("practice/" + a.dataset.unit); break;
    case "pragain": pr = { ...pr, n: 0, right: 0 }; cur = null; render(); break;
    case "boss-go": bs = null; cur = null; go("boss/" + a.dataset.unit); break;
    case "bstart": bs.started = true; render(); break;
    case "bretry": { const id = bs?.uid; bs = null; cur = null; go("unit/" + id); break; }
    case "write-lessons": writeLessons(a.dataset.unit); break;
    case "paste-lessons": modal(`<h2>Paste lessons</h2><p class="muted">A JSON array of concepts (from Claude chat, using the copied prompt).</p><textarea id="lessontext" rows="12"></textarea><button class="primary" data-act="paste-lessons-go" data-unit="${a.dataset.unit}">Import</button>`); break;
    case "paste-lessons-go": { const t = $("#lessontext").value; const arr = validateLesson(JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1))); S.genLessons[a.dataset.unit] = arr; save(); closeModal(); toast(`📖 ${arr.length} lessons added`); render(); break; }
    case "copy-lprompt": { const u = unitById(a.dataset.unit); const txt = LESSON_PROMPT.replace("<COURSE NAME>", u.course.name).replace("<UNIT TITLE>", u.title).replace("<CONCEPTS>", u.concepts.join(", ")); try { await navigator.clipboard.writeText(txt); toast("Prompt copied: paste it into Claude, then paste the result back here"); } catch { modal(`<textarea rows="14">${esc(txt)}</textarea>`); } break; }
    case "cloud-save": { const raw = $("#cloudkey").value.trim(); const k = raw === "••••••••" ? cloudKey : raw; cloudKey = k || null; await kvPut("cloudKey", cloudKey); S.settings.cloudModel = $("#cloudmodel").value.trim() || "claude-sonnet-5-5"; save(); toast(k ? "Claude tutor on" : "Claude tutor off"); render(); break; }
    case "chest": { const d = today(); if (!d.chest) { d.chest = true; addXP(50, "Daily chest"); celebrate("🎁 +50 XP", "All quests complete."); render(); } break; }
    case "mode": S.settings.mode = a.dataset.mode; save(); render(); break;
    case "block-start": cur = null; go(stepRoute(uid)); break;
    case "step": {
      const st = unitState(uid), s = STEPS.find((x) => x.id === a.dataset.step);
      if (st.steps[s.id]) delete st.steps[s.id];
      else { st.steps[s.id] = dayKey(); today().steps++; addXP(s.xp, s.name); if (s.id === "cards") activateUnitCards(uid); }
      save(); render(); break;
    }
    case "boss": {
      const v = Number($(`#score-${uid}`)?.value);
      if (!(v >= 0 && v <= 100)) { toast("Enter a score from 0 to 100"); break; }
      const st = unitState(uid); st.score = v;
      if (v >= 80) { if (!st.steps.check) { st.steps.check = dayKey(); today().steps++; } const first = !st.mastered; st.mastered ||= dayKey(); if (first) { addXP(60, "Boss defeated"); celebrate("👑 Unit mastered", unitById(uid).title); } }
      else toast(`${v}%: not yet. Back to Practice on your gaps, then try fresh problems.`);
      save(); render(); break;
    }
    case "pretest": rv = { queue: cardsFor(uid).map((c) => c.id), i: 0, shown: false, done: 0, mode: "pretest", unit: uid, known: 0 }; go("review"); break;
    case "reveal": rv.shown = true; render(); break;
    case "pt": {
      rv.known += Number(a.dataset.k); rv.done++; rv.i++; rv.shown = false;
      if (rv.i >= rv.queue.length) { const st = unitState(rv.unit); st.pretest = Math.round((rv.known / Math.max(1, rv.done)) * 100); if (!st.steps.pretest) { st.steps.pretest = dayKey(); today().steps++; addXP(STEPS[0].xp, "Pre-test"); } save(); }
      render(); break;
    }
    case "grade": {
      const id = rv.queue[rv.i], c = allCards().find((x) => x.id === id), g = Number(a.dataset.g), n = schedule(c, g);
      setCard(id, { s: n.s, d: n.d, due: n.due, reps: n.reps, lapses: n.lapses || 0, last: n.last, active: true });
      if (g === 1) rv.queue.push(id);
      rv.i++; rv.shown = false; rv.done++; today().reviews++; addXP(g === 1 ? 1 : 2); render(); break;
    }
    case "edit-card": case "add-card": {
      const c = act === "edit-card" ? allCards().find((x) => x.id === a.dataset.id) : { id: null, unit: uid, front: "", back: "" };
      modal(`<h2>${c.id ? "Edit card" : "New card"}</h2><label>Front<textarea id="cf" rows="3">${esc(c.front)}</textarea></label><label>Back<textarea id="cb" rows="3">${esc(c.back)}</textarea></label>
        <div class="row-btns"><button class="primary" data-act="save-card" data-id="${c.id || ""}" data-unit="${c.unit}">Save</button>${c.id ? `<button class="danger" data-act="del-card" data-id="${c.id}">Delete</button>` : ""}</div>`); break;
    }
    case "save-card": {
      const f = $("#cf").value.trim(), b = $("#cb").value.trim();
      if (!f || !b) { toast("Fill both sides"); break; }
      if (a.dataset.id) setCard(a.dataset.id, { front: f, back: b });
      else setCard("c_" + Date.now().toString(36), { custom: true, unit: a.dataset.unit, front: f, back: b, active: !!unitState(a.dataset.unit).steps.cards, due: Date.now() });
      closeModal(); render(); break;
    }
    case "del-card": setCard(a.dataset.id, { deleted: true }); closeModal(); render(); break;
    case "ask-tutor": tutor.unit = uid; if (a.dataset.mode) tutor.mode = a.dataset.mode; go("tutor"); break;
    case "gen-cards": {
      const u = unitById(uid);
      const hit = u.resources.map((r, i) => ({ r, k: rkey(u, r, i) })).find((x) => x.r.type !== "video" && S.files[x.k]);
      tutor.unit = uid; tutor.mode = "cards"; tutor.ctx = "";
      if (hit) { toast("Reading your notes…"); try { const f = await fileGet(S.files[hit.k]); tutor.ctx = await pdfText(f.blob); } catch (err) { console.warn(err); } }
      tutor.draft = hit ? "Make flashcards from these notes." : `Make flashcards for: ${u.concepts.join(", ")}.`;
      go("tutor"); break;
    }
    case "open-file": openFile(a.dataset.key); break;
    case "rm-file": { const fid = S.files[a.dataset.key]; delete S.files[a.dataset.key]; if (fid && !Object.values(S.files).includes(fid)) await fileDel(fid); save(); render(); break; }
    case "drill-start": drill.running = true; drill.score = 0; drill.end = Date.now() + 120000; newProblem(); clearInterval(drill.t); drill.t = setInterval(drillTick, 250); render(); break;
    case "zlog": { const v = Number($("#zman").value); if (!(v > 0)) break; const pb = v > bestZ(); S.zetamac.push({ date: dayKey(), score: v, src: "manual" }); addXP(10 + (pb ? 15 : 0), pb ? `New best: ${v}!` : "Score logged"); render(); break; }
    case "puz-open": ps.i = Number(a.dataset.i); cur = null; render(); break;
    case "puz-list": ps.i = null; cur = null; render(); break;
    case "puz-more": todaysPuzzles(); S.puzzleGen.items.push(genPuzzle(), genPuzzle(), genPuzzle()); save(); render(); break;
    case "g-again": gs = null; cur = null; render(); break;
    case "bz-start": bz.running = true; bz.score = 0; bz.misses = []; bz.end = Date.now() + 60000; bz.p = genBlitz(); clearInterval(bz.t); bz.t = setInterval(blitzTick, 250); render(); break;
    case "bz-check": { const v = $("#bans")?.value || ""; if (!v.trim()) break; if (checkAnswer(bz.p, v)) bz.score++; else bz.misses.push({ q: bz.p.q, given: v, sol: bz.p.sol }); bz.p = genBlitz(); render(); setTimeout(() => $("#bans")?.focus(), 20); break; }
    case "mk-quote": {
      const bid = Number($("#mbid").value), ask = Number($("#mask").value);
      if (!(ask > bid && bid >= 0)) { toast("Ask must be above bid"); break; }
      const m = MARKETS[mk.i], inside = m.a >= bid && m.a <= ask, score = inside ? Math.max(5, Math.round(100 - 60 * Math.log10(Math.max(ask, 1e-9) / Math.max(bid, 1e-9)))) : 0;
      mk.res = { bid, ask, score }; S.markets.push({ date: dayKey(), q: m.q, bid, ask, score }); addXP(inside ? 5 : 2); render(); break;
    }
    case "mk-next": mk = { i: null, res: null }; render(); break;
    case "tload": tutorLoad(); break;
    case "tmode": tutor.mode = a.dataset.mode; tutor.ctx = $("#tctx")?.value ?? tutor.ctx; tutor.draft = $("#tin")?.value || ""; render(); break;
    case "tsend": tutorSend(); break;
    case "tclear": tutor.msgs = []; render(); break;
    case "tcards": {
      const cards = parseCards(stripThink(tutor.msgs[Number(a.dataset.i)].content)), unit = tutor.unit || "general";
      cards.forEach((c, j) => setCard("c_" + Date.now().toString(36) + j, { custom: true, unit, front: String(c.front), back: String(c.back), active: true, due: Date.now() }));
      toast(`🃏 Added ${cards.length} cards`); a.remove(); break;
    }
    // Courses
    case "enable": enableCourse(a.dataset.course); toast("Added to your active courses"); render(); break;
    case "copy-prompt": { try { await navigator.clipboard.writeText(PACK_PROMPT); toast("Prompt copied"); } catch { $("#packprompt").select(); toast("Select and copy the text"); } break; }
    case "pack-paste": modal(`<h2>Paste a course pack</h2><textarea id="packtext" rows="12" placeholder='{"name": "...", "units": [...]}'></textarea><button class="primary" data-act="pack-paste-go">Import</button>`); break;
    case "pack-paste-go": { const txt = $("#packtext").value; const j = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1)); closeModal(); draft = { pack: addPack(j), files: {}, isNew: true }; go("edit"); break; }
    case "new-course": draft = { pack: addPack({ name: "New course", emoji: "📘", color: "#4a90e2", units: [{ title: "Unit 1", concepts: [], resources: [], apply: "" }] }), files: {}, isNew: true }; go("edit"); break;
    case "edit-course": draft = { pack: packForEdit(a.dataset.course), files: {}, isNew: false }; go("edit"); break;
    case "cancel-edit": draft = null; break;
    case "export-pack": { const p = packForEdit(a.dataset.course); download(`${p.id}-studyquest-pack.json`, p); break; }
    case "del-course": {
      const p = allPacks().find((x) => x.id === a.dataset.course);
      if (!confirm(p.origin === "edited" ? `Revert “${p.name}” to the original version? Your edits to units are discarded; progress is kept.` : `Delete “${p.name}”? Progress on its units stays in your backup but the course disappears.`)) break;
      S.customCourses = S.customCourses.filter((c) => c.id !== p.id);
      if (p.origin === "custom") S.enabled = S.enabled.filter((x) => x !== p.id);
      save(); render(); break;
    }
    case "u-up": case "u-down": { const i = Number(a.dataset.i), j = act === "u-up" ? i - 1 : i + 1, U = draft.pack.units; [U[i], U[j]] = [U[j], U[i]]; render(); break; }
    case "u-del": if (confirm("Delete this unit from the course?")) { draft.pack.units.splice(Number(a.dataset.i), 1); render(); } break;
    case "u-merge": { const i = Number(a.dataset.i), U = draft.pack.units, nx = U[i + 1]; U[i].resources.push(...nx.resources); U[i].concepts = [...new Set([...(U[i].concepts || []), ...(nx.concepts || [])])]; U[i].cards = [...(U[i].cards || []), ...(nx.cards || [])]; U.splice(i + 1, 1); render(); break; }
    case "u-add": draft.pack.units.push({ id: `${draft.pack.id}-x${uid6()}`, title: `Unit ${draft.pack.units.length + 1}`, concepts: [], resources: [], apply: "", cards: [] }); render(); break;
    case "r-del": { const [ui, ri] = a.dataset.i.split(":").map(Number); draft.pack.units[ui].resources.splice(ri, 1); render(); break; }
    case "r-add": { const ui = Number(a.dataset.i), label = $(`#nrl-${ui}`).value.trim(), url = $(`#nru-${ui}`).value.trim(); if (!label) { toast("Give it a label"); break; } draft.pack.units[ui].resources.push({ id: "r" + uid6(), type: /youtu|video/i.test(url) ? "video" : "notes", label, url }); render(); break; }
    case "save-course": await saveDraft(); break;
    // Goals & settings
    case "save-goals": S.goals.weeklyMinutes = Number($("#gweek").value) || 600; S.goals.zetamac = Number($("#gz").value) || 45; save(); toast("Saved"); render(); break;
    case "save-wrev": { const k = isoWeek(new Date()), first = !S.weeklyReviews[k]; S.weeklyReviews[k] = $("#wrev").value.trim(); if (first && S.weeklyReviews[k]) addXP(30, "Weekly review"); save(); render(); break; }
    case "sync-on": { const t = $("#synctok").value.trim(); if (!t) break; syncToken = t; await kvPut("syncToken", t); render(); await syncNow(true); if (syncStatus.startsWith("Sync failed")) { syncToken = null; await kvPut("syncToken", null); render(); toast("⚠️ " + syncStatus); } break; }
    case "sync-now": await syncNow(true); break;
    case "sync-off": syncToken = null; await kvPut("syncToken", null); S.sync = {}; save(); toast("This device is disconnected"); render(); break;
    case "export": download(`studyquest-backup-${dayKey()}.json`, S); break;
    case "persist": { const ok = await navigator.storage?.persist?.(); $("#setmsg").textContent = ok ? "Storage is protected from automatic clearing." : "The browser didn't grant protection. Keep exporting backups and open the app regularly."; break; }
    case "reset": if (prompt("Type RESET to erase all progress (imported files stay).") === "RESET") { S = DEFAULT_STATE(); save(); render(); } break;
  } } catch (err) { console.error(err); toast("⚠️ " + (err.message || err)); }
});
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "dans" && drill.running && t.value.trim() !== "" && Number(t.value) === drill.ans) {
    drill.score++; newProblem();
    const p = $(".problem"); if (p) p.textContent = `${drill.a} ${drill.op} ${drill.b} =`;
    const s = $("#dscore"); if (s) s.textContent = drill.score;
    t.value = "";
  }
  if (t.id === "tin") tutor.draft = t.value;
  if (draft && t.dataset.d) draft.pack[t.dataset.d] = t.value;
  if (draft && t.dataset.u !== undefined) { const u = draft.pack.units[Number(t.dataset.u)]; u[t.dataset.f] = t.dataset.f === "concepts" ? t.value.split(",").map((x) => x.trim()).filter(Boolean) : t.value; }
  if (draft && t.dataset.r && t.dataset.f === "label") { const [ui, ri] = t.dataset.r.split(":").map(Number); draft.pack.units[ui].resources[ri].label = t.value; }
});
document.addEventListener("change", async (e) => {
  const t = e.target;
  try {
    if (t.dataset.attach && t.files[0]) { const f = t.files[0]; await assignFile(t.dataset.attach, await storeBlob(f.name, f, f.type)); toast("📎 Attached for offline use"); render(); }
    if (t.id === "bulk" && t.files.length) await bulkImport([...t.files]);
    if (t.id === "ocwzip" && t.files[0]) await buildFromZip(t.files[0]);
    if (t.id === "packfile" && t.files[0]) { const j = JSON.parse(await t.files[0].text()); draft = { pack: addPack(j), files: {}, isNew: true }; go("edit"); }
    if (t.dataset.assign !== undefined && t.value) { await assignFile(t.value, t.dataset.assign); lastUnmatched = lastUnmatched.filter((f) => f.key !== t.dataset.assign); toast("Assigned"); render(); }
    if (t.dataset.toggle) { const id = t.dataset.toggle; if (t.checked) enableCourse(id); else { S.enabled = S.enabled.filter((x) => x !== id); save(); } render(); }
    if (t.dataset.pref) { const p = (S.coursePrefs[t.dataset.pref] ||= {}); p[t.dataset.field] = t.dataset.field === "priority" ? Number(t.value) : t.value; save(); render(); }
    if (t.dataset.set) { if (t.dataset.set === "maxSubjects") S.settings.maxSubjects = Math.max(1, Number(t.value) || 4); else S.settings.minutes[t.dataset.set] = Math.max(30, Number(t.value) || 120); save(); }
    if (draft && t.dataset.r && t.dataset.f === "type") { const [ui, ri] = t.dataset.r.split(":").map(Number); draft.pack.units[ui].resources[ri].type = t.value; }
    if (draft && t.dataset.move && t.value !== "") { const [ui, ri] = t.dataset.move.split(":").map(Number); const [r] = draft.pack.units[ui].resources.splice(ri, 1); draft.pack.units[Number(t.value)].resources.push(r); render(); }
    if (t.id === "tunit") tutor.unit = t.value || null;
    if (t.id === "tmodel") { S.settings.model = t.value; save(); }
    if (t.id === "impjson" && t.files[0]) { const j = JSON.parse(await t.files[0].text()); if (!j.version) throw new Error("Not a StudyQuest backup"); S = migrate(j); save(); toast("Backup restored"); render(); }
  } catch (err) { console.error(err); toast("⚠️ " + (err.message || err)); }
});
document.addEventListener("keydown", (e) => {
  if (e.target.id === "tin" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); tutorSend(); }
  if (e.target.id === "bans" && e.key === "Enter") { e.preventDefault(); $('[data-act="bz-check"]')?.click(); }
  if (e.target.id === "pans" && e.key === "Enter") { e.preventDefault(); $('[data-act="pcheck"]')?.click(); }
  if (e.key === "Enter" && cur?.answered && !e.target.closest("textarea,input")) { e.preventDefault(); $('[data-act="pnext"]')?.click(); }
  if (route().view === "review" && !e.target.closest("input,textarea")) {
    if (e.key === " " && !rv.shown) { e.preventDefault(); rv.shown = true; render(); }
    else if (rv.shown && rv.mode === "srs" && ["1", "2", "3", "4"].includes(e.key)) $(`[data-act="grade"][data-g="${e.key}"]`)?.click();
  }
});

/* ============================== Boot ============================== */
async function boot() {
  try { const saved = await kvGet("state"); if (saved?.version) S = migrate(saved); } catch (e) { console.warn("Storage unavailable", e); }
  try { syncToken = (await kvGet("syncToken")) || null; cloudKey = (await kvGet("cloudKey")) || null; } catch {}
  S.timer = null;
  invalidate(); render(); renderTimer();
  if (syncToken) syncNow();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW failed", e));
  try { if (navigator.storage?.persisted && !(await navigator.storage.persisted())) navigator.storage.persist?.(); } catch {}
  window.__sq = { cur: () => cur, state: () => S, schedule, render, planToday, courses, mergeStates, setState: (x) => { S = x; invalidate(); } };
}
boot();
