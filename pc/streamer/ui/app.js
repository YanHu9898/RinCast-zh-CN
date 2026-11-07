// RinCast Streamer UI. Talks to the native app through WebView2 messaging;
// outside WebView2 (design preview) a small mock backend is used.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------------------------------------------------------------- translations
// The dictionary lives in i18n.js, which loads before this module. The wrappers
// below keep this file readable: t() takes a key, tf() looks a phrase up by its
// English text, and both fall back to the English they were given.
const i18n = window.RinCastI18n;
const t = (key, vars, fallback) => i18n.t(key, vars, fallback);
const tf = (english, vars) => i18n.tf(english, vars);
// Re-fills the static markup and re-renders everything that is built in script.
document.addEventListener("rincast:language", () => {
  i18n.apply();
  if (state) renderAll();
});

// ---------------------------------------------------------------- bridge
const native = window.chrome?.webview;
const pending = new Map();
let nextId = 1;
const listeners = [];

function send(msg) {
  if (native) native.postMessage(JSON.stringify(msg));
  else mock(msg);
}
// Resolves with the reply, or with { ok: false } if the app doesn't answer in time.
function request(msg, timeoutMs = 30000) {
  const requestId = String(nextId++);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      resolve({ ok: false, error: t("error.noResponse", null, "RinCast didn't respond. Try again.") });
    }, timeoutMs);
    pending.set(requestId, (r) => { clearTimeout(timer); resolve(r); });
    send({ ...msg, requestId });
  });
}
function receive(msg) {
  if (msg.requestId && pending.has(msg.requestId)) {
    pending.get(msg.requestId)(msg);
    pending.delete(msg.requestId);
    if (msg.type === "reply") return;
  }
  listeners.forEach((fn) => fn(msg));
}
if (native) native.addEventListener("message", (e) => receive(typeof e.data === "string" ? JSON.parse(e.data) : e.data));

// ---------------------------------------------------------------- state and notices
let state = null;
const history = [];

function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
}
// Failures stay until dismissed: nobody should have to catch them in a toast.
function showError(text) {
  $("#bannerText").textContent = text;
  $("#banner").hidden = false;
  $("#main").scrollTop = 0;
}
$("#bannerClose").onclick = () => { $("#banner").hidden = true; };

const confirmDialog = $("#confirm");
function confirmAction(title, text, action, danger = true) {
  $("#confirmTitle").textContent = title;
  $("#confirmText").textContent = text;
  $("#confirmYes").textContent = action;
  $("#confirmYes").className = danger ? "btn danger" : "btn primary";
  confirmDialog.returnValue = "";
  confirmDialog.showModal();
  return new Promise((resolve) => {
    $("#confirmYes").onclick = () => confirmDialog.close("yes");
    $("#confirmNo").onclick = () => confirmDialog.close("no");
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "yes"), { once: true });
  });
}

listeners.push((msg) => {
  switch (msg.type) {
    case "state":
      state = msg;
      renderAll();
      break;
    case "stats":
      if (state) state.session = msg.session;
      if (msg.session) countPoor(msg.session);
      renderHome();
      renderStatus();
      break;
    case "session":
      request({ type: "getState" });
      if (msg.connected) toast(t("toast.connected", { device: msg.deviceName }, `${msg.deviceName} connected`));
      else if (msg.reason !== "replaced") toast(t("toast.disconnected", { device: msg.deviceName }, `${msg.deviceName} disconnected`));
      break;
    case "approval":
      if (state) state.pendingApproval = msg;
      showApproval(msg);
      renderHome();
      break;
    case "firewall":
      if (state) state.system.firewall = msg.firewall;
      renderHome();
      renderFirewall();
      break;
    case "approvalEnded":
      // Not an answer: the headset stopped asking.
      if (state) state.pendingApproval = null;
      approvalFor = null;
      if ($("#approval").open) $("#approval").close();
      renderHome();
      renderStatus();
      break;
    case "vrState":
      if (state?.session) Object.assign(state.session, { vrState: msg.state, vrProducer: msg.producer, vrApp: msg.app });
      renderHome();
      renderStatus();
      break;
  }
});

// ---------------------------------------------------------------- navigation
function goTo(page, moveFocus) {
  $$("#nav button").forEach((x) => {
    if (x.dataset.page === page) x.setAttribute("aria-current", "page");
    else x.removeAttribute("aria-current");
  });
  $$(".page").forEach((p) => p.classList.toggle("active", p.dataset.page === page));
  const active = $(".page.active");
  const title = $("h1", active);
  document.title = page === "home" ? "RinCast Streamer" : `${title.textContent} - RinCast Streamer`;
  $("#main").scrollTop = 0;
  if (moveFocus) title.focus();
  if (page !== "home") request({ type: "getState" });
  if (state) renderStatus();
}
$$("#nav button").forEach((b) =>
  // detail is 0 for keyboard activation: then focus follows to the new page.
  b.addEventListener("click", (e) => goTo(b.dataset.page, e.detail === 0)),
);

// ---------------------------------------------------------------- settings binding
function bindSettings() {
  $$("[data-setting]").forEach((el) => {
    const v = state.settings[el.dataset.setting];
    if (el.type === "checkbox") el.checked = !!v;
    else if (el.type === "radio") el.checked = String(v) === el.value;
    else if (document.activeElement !== el) el.value = v ?? "";
    if (el.type === "range") updateRangeLabel(el);
  });
}
function updateRangeLabel(el) {
  const text = `${el.value} Mbps`;
  el.parentElement.querySelector("output").textContent = text;
  el.setAttribute("aria-valuetext", text);
  el.style.setProperty("--fill", `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
}
// A setting that failed says so next to itself. One that worked just stays as you left it.
function settingError(el, text) {
  const host = el.closest(".check, .bar, .options") || el;
  let note = host.nextElementSibling;
  if (!note?.classList.contains("failed")) {
    if (!text) return;
    note = document.createElement("p");
    note.className = "failed";
    note.setAttribute("role", "alert");
    host.after(note);
  }
  note.textContent = text;
}
function commitSetting(el) {
  const key = el.dataset.setting;
  let value = el.type === "checkbox" ? el.checked : el.value;
  if (el.type === "range" || (el.type === "radio" && /^\d+$/.test(value))) value = Number(value);
  if (key === "pcName" && !String(value).trim()) {
    settingError(el, t("error.pcName", null, "The PC needs a name."));
    el.value = state.settings.pcName;
    return;
  }
  settingError(el, "");
  request({ type: "setSettings", settings: { [key]: value } }).then((r) => {
    if (r.ok === false || !r.settings) {
      settingError(el, r.error || t("error.saveFailed", null, "Couldn't save this. Try again."));
      if (state) bindSettings();  // back to what actually applies
      return;
    }
    if (state) state.settings = r.settings;
    renderDependents();
    renderAudio();
    drawSpark();
  });
}
function wireSetting(el) {
  if (el.type === "range") el.addEventListener("input", () => updateRangeLabel(el));
  el.addEventListener("change", async () => {
    if (el.dataset.setting === "requireApproval" && !el.checked &&
        !(await confirmAction(t("devices.stopAskingTitle"), t("devices.stopAskingText"), t("devices.stopAskingAction")))) {
      el.checked = true;
      return;
    }
    commitSetting(el);
  });
}
$$("[data-setting]").forEach(wireSetting);

// ---------------------------------------------------------------- health: one truth for the home screen
const ICONS = {
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3zM12 10v4M12 17v.5"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/></svg>',
};

// A number only counts as poor after a few seconds in a row, not on one bad sample, so nothing flickers.
const poorRuns = {};
function sustained(name, poor) {
  poorRuns[name] = poor ? (poorRuns[name] || 0) + 1 : 0;
  return poorRuns[name] >= 5;
}
function streamTrouble(s) {
  if (!numberCells(s).some((n) => n[3])) return null;
  // A slow picture with a busy encoder is the PC's doing; the rest is the network's.
  const { encodeMs } = liveNumbers(s);
  if (poorRuns.fps >= 5 && encodeMs >= 14) return { level: "warn", title: t("trouble.pcTitle"), text: t("trouble.pcText") };
  if (s.vpn) return { level: "warn", title: t("trouble.vpnTitle"), text: t("trouble.vpnText") };
  if (s.remote) return { level: "warn", title: t("trouble.remoteTitle"), text: t("trouble.remoteText") };
  return { level: "warn", title: t("trouble.localTitle"), text: t("trouble.localText") };
}

function health() {
  const sys = state.system;
  const issues = [];
  if (!sys.encoder.backend || !(sys.encoder.hevc || sys.encoder.av1 || sys.encoder.h264)) {
    issues.push({ level: "blocked", title: t("issue.noEncoderTitle"), text: t("issue.noEncoderText") });
  }
  if (!sys.steamvr.installed) {
    issues.push({ level: "info", title: t("issue.noSteamVrTitle"), text: t("issue.noSteamVrText") });
  } else if (!sys.steamvr.driverRegistered) {
    issues.push({ level: "warn", title: t("issue.driverMissingTitle"), text: t("issue.driverMissingText"), action: t("issue.driverMissingAction"), run: registerDriver });
  }
  const a = sys.audioDriver;
  if (state.settings.streamAudio && state.settings.micPassthrough && !a.active?.speaker && !a.active?.microphone && state.settings.audioDevices !== "system") {
    issues.push({ level: "warn", title: t("issue.noAudioTitle"), text: t("issue.noAudioText") });
  }
  const c = state.cloud;
  if (c.signedIn && state.settings.allowRemote && c.status === "error") {
    const detail = c.error || t("issue.cloudFallback");
    issues.push({ level: "warn", title: t("issue.cloudTitle"), text: t("issue.cloudText", { error: detail }) });
  }
  const fw = sys.firewall || {};
  if (fw.otherNetworksOpen === false) {
    issues.push({ level: "warn", title: t("issue.firewallTitle"), text: t("issue.firewallText"), action: t("issue.firewallAction"), run: () => setFirewall(!!fw.publicAllowed) });
  }
  // Not a fault: Public stays closed until someone chooses otherwise.
  if (fw.usbAdapter && fw.usbOpen === false) {
    issues.push({ level: "warn", title: t("issue.usbTitle"), text: t("issue.usbText", { adapter: fw.usbAdapter }), action: t("issue.usbAction"), run: allowUsbCable });
  }
  if (fw.publicInUse && !fw.publicAllowed) {
    const vpn = (sys.vpnAddresses || []).length ? t("issue.publicVpn") : "";
    issues.push({ level: "info", title: t("issue.publicTitle"), text: t("issue.publicText", { vpn }), action: t("issue.publicAction"), run: () => choosePublicNetworks(true) });
  }
  const trouble = state.session && streamTrouble(state.session);
  if (trouble) issues.push(trouble);
  const rank = { blocked: 0, warn: 1, info: 2 };
  issues.sort((a, b) => rank[a.level] - rank[b.level]);
  return { issues, blocked: issues.some((i) => i.level === "blocked") };
}

// ---------------------------------------------------------------- home
// Remembered here: "Allow once" never adds a headset to the settings.
function connectedBefore() {
  if (state.session || (state.settings.trustedDevices || []).length) {
    try { localStorage.setItem("connectedBefore", "1"); } catch {}
    return true;
  }
  try { return localStorage.getItem("connectedBefore") === "1"; } catch { return false; }
}

function setFacts(list, rows) {
  // Rewritten only when something changed, so text stays selectable while stats tick.
  const html = rows.filter((r) => r && r[1]).map(([k, v, cls]) => `<dt>${esc(k)}</dt><dd${cls ? ` class="${cls}"` : ""}>${esc(v)}</dd>`).join("");
  if (list.dataset.html !== html) {
    list.dataset.html = html;
    list.innerHTML = html;
  }
}

function encoderText() {
  const enc = state.system.encoder;
  if (!enc.backend) return t("general.encoderNone", null, "None found. Update your graphics driver.");
  const backend = { nvenc: "NVIDIA", amf: "AMD", mf: "Windows Media Foundation" }[enc.backend] || enc.backend;
  return `${backend}: ${[enc.h264 && "H.264", enc.hevc && "HEVC", enc.av1 && "AV1"].filter(Boolean).join(", ")}`;
}

function renderHome() {
  if (!state) return;
  const s = state.session;
  const approval = state.pendingApproval;
  const { issues, blocked } = health();
  $("#live").hidden = true;
  $("#numbers").hidden = true;
  $("#steps").hidden = true;
  if (approval) {
    $("#headline").textContent = t("home.wantsToConnect", { device: approval.deviceName });
    $("#subline").dataset.state = "wait";
    $("#subline").textContent = t("home.fromAddress", { address: approval.address });
    setActions("", () => []);
    setFacts($("#facts"), []);
  } else if (s) {
    const inVr = s.vrState === "running";
    const app = s.vrApp || (s.vrProducer === "steamvr" ? "SteamVR" : tf("a VR game"));
    const streaming = inVr || (s.desktop || []).length > 0;
    $("#headline").textContent = inVr ? t("home.playing", { app }) : streaming ? t("home.streamingDesktop") : t("home.connectedTo", { device: s.deviceName });
    $("#subline").dataset.state = s.vrState === "launching" ? "wait" : "plain";
    $("#subline").textContent = s.vrState === "launching" ? t("home.startingSteamVr") : t("home.deviceDuration", { device: s.deviceName, duration: duration(s.connectedSeconds) });
    setActions(`session:${s.deviceName}`, () => [button(t("home.disconnect"), "", async () => {
      const running = state.session?.vrState === "running";
      if (await confirmAction(t("home.disconnectTitle", { device: s.deviceName }), running ? t("home.disconnectRunning") : t("home.disconnectIdle"), t("home.disconnect"), false)) send({ type: "disconnect" });
    })]);
    $("#live").hidden = false;
    renderLive(s);
  } else {
    $("#headline").textContent = blocked ? t("home.cantStream") : t("home.choosePc", { pc: state.settings.pcName });
    const firstRun = !blocked && !connectedBefore();
    // The steps below say it all the first time; after that, the next step is the headline.
    if (firstRun) $("#headline").textContent = t("home.setUpQuest");
    $("#subline").textContent = blocked ? t("home.fixProblem") : "";
    $("#stepPcName").textContent = state.settings.pcName;
    $("#subline").dataset.state = blocked ? "bad" : "";
    $("#steps").hidden = !firstRun;
    setActions("", () => []);
    history.length = 0;
    const devices = (state.settings.trustedDevices || []).slice().sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    const last = devices[0];
    setFacts($("#facts"), [
      [(state.system.addresses || []).length > 1 ? t("home.addresses") : t("home.address"), (state.system.addresses || []).join(", ") || t("home.noNetwork")],
      ...(state.system.vpnAddresses || []).map((v) => [v.name, t("home.vpnHint", { address: v.address })]),
      state.cloud.signedIn && state.settings.allowRemote && state.cloud.status === "online" && [t("home.otherNetworks"), t("home.otherNetworksHint")],
      last && [t("home.lastHeadset"), `${last.name}${last.lastSeen ? `, ${new Date(last.lastSeen * 1000).toLocaleDateString()}` : ""}`],
    ]);
  }
  renderIssues(issues);
  const headline = $("#headline").textContent;
  if (renderHome.announced !== headline) {
    renderHome.announced = headline;
    $("#liveStatus").textContent = headline;
  }
}

// Rebuilt only when the buttons change: stats arrive every second, and rebuilding would
// lose keyboard focus and clicks in progress.
function setActions(key, make) {
  const actions = $("#homeActions");
  if (actions.dataset.key === key) return;
  actions.dataset.key = key;
  actions.replaceChildren(...make());
}

function renderIssues(issues) {
  const list = $("#issues");
  // Rebuilt only when something changed: stats arrive every second, and the buttons must keep focus.
  const key = JSON.stringify(issues.map((i) => [i.level, i.title, i.text]));
  if (list.dataset.key === key) return;
  list.dataset.key = key;
  list.replaceChildren(...issues.map((i) => {
    const li = document.createElement("li");
    li.className = i.level;
    li.innerHTML = `<div>${i.level === "info" ? ICONS.info : ICONS.warn}<b>${esc(i.title)}</b><p>${esc(i.text)}</p></div>`;
    if (i.action) li.append(button(i.action, "", i.run));
    return li;
  }));
}

// What's on screen in the status bar and on the home page, from one place.
function liveNumbers(s) {
  const vr = s.vr && s.vrState === "running" ? s.vr : null;
  const desk = (s.desktop || []).reduce((a, d) => ({ fps: Math.max(a.fps, d.fps), mbps: a.mbps + d.mbps, encodeMs: Math.max(a.encodeMs, d.encodeMs || 0) }), { fps: 0, mbps: 0, encodeMs: 0 });
  return { vr, fps: vr ? vr.fps : desk.fps, mbps: vr ? vr.mbps : desk.mbps, encodeMs: vr ? vr.encodeMs : desk.encodeMs, latency: vr?.latencyMs || s.client?.latencyMs || s.rttMs };
}

function countPoor(s) {
  const { vr, fps, mbps, latency } = liveNumbers(s);
  const wanted = vr?.refreshRate;
  sustained("latency", latency >= 80);
  sustained("fps", !!(wanted && fps && fps < wanted * 0.95));
  sustained("mbps", !!(vr && mbps && mbps < 10));
}

function numberCells(s) {
  const { vr, fps, mbps, latency } = liveNumbers(s);
  const wanted = vr?.refreshRate;
  const halfRate = wanted && fps >= wanted * 0.45 && fps <= wanted * 0.55;
  return [
    [t("numbers.latency"), latency ? Math.round(latency) : "–", latency ? (latency >= 130 ? t("numbers.msHigh") : latency >= 80 ? t("numbers.msNoticeable") : t("numbers.ms")) : "", poorRuns.latency >= 5],
    [t("numbers.frameRate"), fps ? Math.round(fps) : "–", fps ? (wanted && fps < wanted * 0.95 ? (halfRate ? t("numbers.fpsHalf") : t("numbers.fpsBelow", { target: Math.round(wanted) })) : t("numbers.fps")) : "", poorRuns.fps >= 5],
    [t("numbers.bitrate"), mbps ? mbps.toFixed(mbps < 10 ? 1 : 0) : "–", mbps ? (mbps < 10 ? t("numbers.mbpsLow") : t("numbers.mbps")) : "", poorRuns.mbps >= 5],
  ];
}

function renderLive(s) {
  const { vr, mbps, encodeMs } = liveNumbers(s);
  const numbers = $("#numbers");
  numbers.hidden = false;
  numbers.innerHTML = numberCells(s).map(([label, value, unit, poor]) => `<div><span>${esc(label)}</span><b class="${poor ? "poor" : ""}">${esc(value)}<small>${esc(unit)}</small></b></div>`).join("");
  const path = s.usb ? t("live.pathUsb") : s.vpn ? t("live.pathVpn") : s.remote ? t("live.pathRemote") : t("live.pathLocal");
  setFacts($("#facts"), [
    vr && [t("live.video"), t("live.videoVr", { codec: vr.codec, width: vr.eyeWidth, height: vr.eyeHeight, hz: Math.round(vr.refreshRate) })],
    !vr && (s.desktop || []).length && [t("live.video"), t("live.videoDesktop", { monitors: s.desktop.map((d) => d.name).join(", ") })],
    !vr && !(s.desktop || []).length && [t("live.video"), t("live.videoNothing")],
    encodeMs && [t("live.encoding"), encodeMs < 14 ? `${encodeMs.toFixed(1)} ms` : t("live.gpuBusy", { ms: encodeMs.toFixed(1) }), encodeMs < 14 ? "" : "no"],
    [t("live.network"), t("live.networkDetail", { ms: s.rttMs.toFixed(1), path })],
  ].filter(Boolean));
  renderStages(s);
  history.push(mbps || 0);
  if (history.length > 60) history.shift();
  drawSpark();
}

// The headset times each stage a frame goes through; together they make up the latency.
const STAGES = [
  ["uplink", "stage.uplink"],
  ["game", "stage.game"],
  ["encoderWait", "stage.encoderWait"],
  ["encode", "stage.encode"],
  ["capture", "stage.capture"],
  ["downlink", "stage.downlink"],
  ["decode", "stage.decode"],
  ["nextFrame", "stage.nextFrame"],
  ["compositor", "stage.compositor"],
];

function renderStages(s) {
  const got = s.client?.latencyStages || {};
  const rows = STAGES.filter(([key]) => typeof got[key] === "number");
  $("#stagesBox").hidden = !rows.length;
  if (!rows.length) return;
  const total = rows.reduce((sum, [key]) => sum + Math.max(got[key], 0), 0) || 1;
  const biggest = Math.max(...rows.map(([key]) => got[key]));
  $("#stages").innerHTML = rows.map(([key, label]) => {
    const ms = Math.max(got[key], 0);
    return `<div class="stage${got[key] === biggest ? " big" : ""}"><span>${esc(t(label))}</span><i style="width:${((ms / total) * 100).toFixed(1)}%"></i><b>${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms</b></div>`;
  }).join("");
}

// Live numbers while connected, for the pages that don't have them already.
function renderStatus() {
  const el = $("#status");
  const s = state.session;
  const onHome = $("#nav [aria-current]")?.dataset.page === "home";
  let html = "";
  if (s && !onHome) {
    const cell = (label, value, poor) => `<div><span>${esc(label)}</span><b class="${poor ? "poor" : ""}">${esc(value)}</b></div>`;
    html = cell(t("status.connectedTo"), s.deviceName) + '<i class="gap"></i>' +
      numberCells(s).map(([label, value, unit, poor]) => cell(label, `${value} ${unit}`.trim(), poor)).join("");
  }
  if (el.dataset.html !== html) {
    el.dataset.html = html;
    el.innerHTML = html;
  }
}

function drawSpark() {
  const c = $("#spark");
  if (!c.clientWidth || !state) return;
  const dpr = devicePixelRatio || 1;
  const h = c.clientHeight;
  c.width = c.clientWidth * dpr;
  c.height = h * dpr;
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const s = state.session;
  const limit = s?.vr ? s.headsetBitrateMbps || state.settings.vrBitrateMbps : state.settings.desktopBitrateMbps;
  const peak = Math.max(...history, 0);
  const w = c.clientWidth, max = Math.max(limit, peak);
  $("#sparkRange").textContent = t("video.overrideBitrate", { mbps: limit });
  c.setAttribute("aria-label", tf(`Bitrate over the last minute, peak ${Math.round(peak)} of ${limit} Mbps`));
  const forced = matchMedia("(forced-colors: active)").matches;
  // The limit, as the top of the chart.
  g.fillStyle = forced ? "CanvasText" : "#555";
  g.fillRect(0, 0, w, 1);
  if (history.length < 2) return;
  const step = w / 59;
  const pts = history.map((v, i) => [w - (history.length - 1 - i) * step, h - (v / max) * (h - 2)]);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.strokeStyle = forced ? "CanvasText" : "#2ec4ff";
  g.lineWidth = 2;
  g.lineJoin = "round";
  g.stroke();
}

function duration(sec) {
  if (sec < 60) return t("duration.justConnected");
  if (sec < 3600) return t("duration.minutes", { n: Math.floor(sec / 60) });
  return t("duration.hours", { h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60) });
}

function button(label, kind, onClick) {
  const b = document.createElement("button");
  b.className = `btn ${kind}`;
  b.textContent = label;
  b.onclick = onClick;
  return b;
}

// ---------------------------------------------------------------- approval
// Three explicit answers. Anything else (Esc, closing) means no.
const dialog = $("#approval");
let approvalFor = null;
function showApproval(a) {
  approvalFor = a;
  $("#approvalTitle").textContent = t("approval.title", { device: a.deviceName });
  $("#approvalText").textContent = t("approval.text", { model: a.model || t("approval.headsetFallback"), address: a.address });
  if (dialog.open) return;  // state updates must not move focus
  dialog.returnValue = "";
  dialog.showModal();
  $("#denyBtn").focus();
}
function answerApproval(answer) { dialog.close(answer); }
$("#denyBtn").onclick = () => answerApproval("deny");
$("#allowOnceBtn").onclick = () => answerApproval("once");
$("#allowBtn").onclick = () => answerApproval("always");
dialog.addEventListener("close", () => {
  if (!approvalFor) return;
  const answer = dialog.returnValue;
  const allow = answer === "once" || answer === "always";
  send({ type: allow ? "approve" : "deny", deviceId: approvalFor.deviceId, remember: answer === "always" });
  if (state) state.pendingApproval = null;
  approvalFor = null;
  renderHome();
});

// ---------------------------------------------------------------- other pages
const AUDIO_SETS = {
  rincast: { speaker: "RinCast Speaker", mic: "RinCast Microphone" },
  steam: { speaker: "Steam Streaming Speakers", mic: "Steam Streaming Microphone" },
};

function setOff(row, off) {
  row.classList.toggle("off", off);
  row.querySelector("input").disabled = off;
}
function renderDependents() {
  const enc = state.system.encoder;
  const offers = { auto: true, hevc: enc.hevc, av1: enc.av1, h264: enc.h264 };
  const unsupported = [];
  $$("#codecOptions label").forEach((l) => {
    const off = !offers[l.querySelector("input").value] && !!enc.backend;
    setOff(l, off);
    if (off) unsupported.push(l.textContent.trim());
  });
  const a = state.system.audioDriver;
  $("#audioRincast").hidden = !(a.speaker || a.microphone);
  setOff($("#audioSteam"), !(a.steam?.speaker || a.steam?.microphone));
  // What the connected headset chose goes first, so here it's only for show.
  const session = state.session;
  const fromHeadset = session?.headsetBitrateMbps > 0;
  setOff($("#vrBitrateBar"), !!fromHeadset);
  $("#vrBitrateBar output").textContent = fromHeadset ? `${session.headsetBitrateMbps} Mbps` : `${state.settings.vrBitrateMbps} Mbps`;
  if (fromHeadset) $("#vrBitrateBar input").style.setProperty("--fill", `${((session.headsetBitrateMbps - 20) / 480) * 100}%`);
  const codec = session?.headsetCodec && session.headsetCodec !== "auto" ? session.headsetCodec : "";
  const chosen = [fromHeadset && t("video.overrideBitrate", { mbps: session.headsetBitrateMbps }), codec && { hevc: "HEVC", av1: "AV1", h264: "H.264" }[codec]].filter(Boolean);
  $("#overrideNote").textContent = chosen.length ? t("video.overrideFromHeadset", { list: chosen.join(t("video.or")) }) : t("video.overrideHint");
  if (unsupported.length) $("#overrideNote").textContent += " " + t("video.cantEncode", { list: unsupported.join(t("video.or")) });
  const h264 = state.settings.codec === "h264";
  setOff($("#tenBitRow"), h264);
  $("#tenBitHint").hidden = !h264;
  setOff($("#foveatedRow"), state.system.encoder.backend !== "nvenc");
  const tunable = ["nvenc", "amf"].includes(state.system.encoder.backend);
  setOff($("#aqRow"), !tunable);
  setOff($("#twoPassRow"), !tunable);
  setOff($("#playOnPcRow"), !state.settings.streamAudio);
  setOff($("#micRow"), state.settings.audioDevices === "system");
}

function renderAudio() {
  if (!state) return;
  const a = state.system.audioDriver;
  const steam = a.steam || {};
  const active = a.active || {};
  const row = (ok, name, inUse) => [name, ok ? (inUse ? t("audio.usedWhileStreaming") : t("audio.installed")) : t("audio.notInstalled"), ok ? "" : "no"];
  const rows = [
    row(steam.speaker, AUDIO_SETS.steam.speaker, active.speaker === "steam"),
    row(steam.microphone, AUDIO_SETS.steam.mic, active.microphone === "steam"),
  ];
  // The RinCast driver only ships with signed builds: don't list it as missing otherwise.
  if (a.speaker || a.microphone) {
    rows.unshift(row(a.microphone && a.microphoneFeed, AUDIO_SETS.rincast.mic, active.microphone === "rincast"));
    rows.unshift(row(a.speaker, AUDIO_SETS.rincast.speaker, active.speaker === "rincast"));
  }
  // Only what's missing needs saying.
  const missing = rows.filter((r) => r[2] === "no").map((r) => r[0]);
  $("#audioMissing").textContent = missing.length ? t("audio.missing", { list: missing.join(t("video.or")), more: missing.length > 1 ? t("audio.missingMore") : t("audio.missingOne") }) : "";
  const mic = AUDIO_SETS[active.microphone]?.mic;
  $("#micHint").textContent = mic ? t("audio.micHint", { mic }) : t("audio.micNone");
  const speaker = AUDIO_SETS[active.speaker]?.speaker;
  $("#audioDevicesHint").textContent = speaker ? (mic && active.microphone !== active.speaker ? t("audio.usingBoth", { speaker, mic }) : t("audio.using", { speaker })) : t("audio.defaultSpeakers");
}

async function allowUsbCable() {
  toast(t("audio.acceptPrompt"));
  const r = await request({ type: "allowUsbCable" }, 90000);
  if (r.ok) toast(t("audio.usbAllowed"));
  else showError(t("audio.firewallFailed"));
  await request({ type: "getState" });
}

async function setFirewall(allowPublic) {
  toast(t("audio.acceptPrompt"));
  const r = await request({ type: "setFirewall", allowPublic }, 90000);
  if (r.ok) toast(allowPublic ? t("audio.publicAllowed") : t("audio.publicClosed"));
  else showError(t("audio.firewallFailed"));
  await request({ type: "getState" });
}

// Opening up asks first, and says what it means. Closing doesn't need convincing.
async function choosePublicNetworks(on) {
  if (on) {
    const risk = state.settings.requireApproval
      ? t("general.publicRiskApproval")
      : t("general.publicRiskOpen");
    const yes = await confirmAction(t("general.publicConfirmTitle"), t("general.publicConfirmText", { risk }), t("general.publicAction"));
    if (!yes) {
      renderFirewall();
      return;
    }
  }
  await setFirewall(on);
  renderFirewall();
}

function renderFirewall() {
  const fw = state.system.firewall || {};
  const box = $("#allowPublic");
  box.checked = !!fw.publicAllowed;
  setOff($("#publicRow"), !!fw.publicUnguarded);
  $("#publicNote").textContent = fw.publicUnguarded ? t("general.publicUnguarded") : t("general.publicNote");
}
$("#allowPublic").addEventListener("change", (e) => choosePublicNetworks(e.target.checked));

async function registerDriver() {
  const r = await request({ type: "registerSteamVrDriver" });
  if (r.ok) toast(t("vr.added"));
  else showError(t("vr.addFailed"));
  request({ type: "getState" });
}

function renderVr() {
  const sys = state.system;
  $$("#runtimeSeg input").forEach((b) => { b.checked = (b.value === "rincast" && sys.openxr.rincastActive) || (b.value === "steamvr" && sys.openxr.steamvrActive); });
  $("#runtimeRow").hidden = sys.openxr.rincastAvailable === false;
  $("#runtimeNote").textContent = sys.openxr.rincastActive || sys.openxr.steamvrActive ? "" : t("vr.otherRuntime");
  setFacts($("#vrFacts"), [
    [t("vr.status"), !sys.steamvr.installed ? t("vr.notInstalled") : sys.steamvr.running ? t("vr.running") : t("vr.notRunning"), sys.steamvr.installed ? "" : "no"],
    sys.steamvr.installed && [t("vr.driver"), sys.steamvr.driverRegistered ? t("vr.driverAdded") : t("vr.driverNotAdded"), sys.steamvr.driverRegistered ? "" : "no"],
  ]);
  $("#registerDriver").hidden = !sys.steamvr.installed || sys.steamvr.driverRegistered;
  $("#launchSteamVR").hidden = !sys.steamvr.installed || sys.steamvr.running;
  $("#restartSteamVR").hidden = !sys.steamvr.running;
  $("#getSteamVR").hidden = sys.steamvr.installed;
}
$$("#runtimeSeg input").forEach((b) => b.addEventListener("change", async () => {
  toast(t("vr.acceptPrompt"));
  const r = await request({ type: "setOpenXrRuntime", runtime: b.value });
  if (r.ok) toast(t("vr.runtimeSwitched", { runtime: b.nextElementSibling.textContent }));
  else showError(t("vr.nothingChanged"));
  request({ type: "getState" });
}));
$("#registerDriver").onclick = registerDriver;
$("#getSteamVR").onclick = () => send({ type: "openUrl", url: "https://store.steampowered.com/app/250820/SteamVR/" });
$("#launchSteamVR").onclick = () => { send({ type: "launchSteamVR" }); toast(t("vr.starting")); };
$("#restartSteamVR").onclick = async () => {
  if (await confirmAction(t("vr.restartTitle"), t("vr.restartText"), t("vr.restartAction"))) { send({ type: "restartSteamVR" }); toast(t("vr.restarting")); }
};
$("#openLogs").onclick = () => send({ type: "openLogs" });

function renderDevices() {
  const list = $("#devices");
  const devices = state.settings.trustedDevices || [];
  const key = JSON.stringify(devices);
  if (list.dataset.key === key) return;
  list.dataset.key = key;
  if (!devices.length) {
    list.innerHTML = `<li class="empty">${esc(t("devices.empty"))}</li>`;
    return;
  }
  list.innerHTML = devices.map((d) => `
    <li><div class="meta"><b>${esc(d.name)}</b><small>${esc(t("devices.lastConnected", { date: d.lastSeen ? new Date(d.lastSeen * 1000).toLocaleDateString() : t("home.never") }))}</small></div>
    <button class="btn" data-remove="${esc(d.id)}" data-name="${esc(d.name)}" aria-label="${esc(t("devices.removeAria", { name: d.name }))}">${esc(t("devices.remove"))}</button></li>`).join("");
  $$("[data-remove]", list).forEach((b) => (b.onclick = async () => {
    if (!(await confirmAction(t("devices.removeTitle", { name: b.dataset.name }), t("devices.removeText"), t("devices.remove")))) return;
    const r = await request({ type: "removeTrusted", deviceId: b.dataset.remove });
    if (r.ok === false) showError(t("devices.removeFailed"));
    else toast(t("devices.removed"));
    request({ type: "getState" });
  }));
}

let authMode = "signIn";
let accountKey = "";
function renderAccount() {
  const view = $("#accountView");
  const c = state.cloud;
  const key = c.signedIn ? `in:${c.userName}:${c.email}` : `out:${authMode}`;
  if (key !== accountKey) {
    accountKey = key;  // otherwise leave the form alone: state updates must not erase typing
    if (c.signedIn) renderSignedIn(view, c);
    else renderSignedOut(view);
  }
  if (c.signedIn) {
    const allow = $("#allowRemote");
    allow.checked = state.settings.allowRemote;
    $("#remoteStatus").textContent = !state.settings.allowRemote
      ? t("account.remoteOff")
      : { online: t("account.online"), connecting: t("account.connecting"), error: c.error || t("account.serverError") }[c.status] || "";
  }
}
function renderSignedIn(view, c) {
  view.innerHTML = `
    <div class="cols">
      <div>
        <h2 class="first">${esc(c.userName)}</h2>
        <p class="note selectable">${esc(c.email)}</p>
        <label class="check spaced"><input type="checkbox" data-setting="allowRemote" id="allowRemote"><span>${esc(t("account.allowRemote"))}</span><small id="remoteStatus"></small></label>
        <div class="btns spaced"><button class="btn" id="signOut">${esc(t("account.signOut"))}</button></div>
      </div>
      <div>
        <h2 class="first">${esc(t("account.signInHeadset"))}</h2>
        <h3 id="codeLabel">${esc(t("account.codeLabel"))}</h3>
        <form class="code-entry" id="codeForm"><input type="text" id="code" maxlength="9" placeholder="XXXX-XXXX" autocomplete="off" spellcheck="false" aria-labelledby="codeLabel"><button class="btn primary" id="codeSubmit">${esc(t("account.approve"))}</button></form>
        <p class="failed" id="codeError" role="alert"></p>
      </div>
    </div>`;
  wireSetting($("#allowRemote"));
  $("#codeForm").onsubmit = async (e) => {
    e.preventDefault();
    $("#codeError").textContent = "";
    const submit = $("#codeSubmit");
    submit.disabled = true;
    submit.textContent = t("account.approving");
    const r = await request({ type: "approveCode", code: $("#code").value });
    submit.disabled = false;
    submit.textContent = t("account.approve");
    if (r.ok) { toast(t("account.headsetSignedIn")); $("#code").value = ""; }
    else $("#codeError").textContent = r.error || t("account.codeFailed");
  };
  $("#signOut").onclick = async () => {
    if (!(await confirmAction(t("account.signOutTitle"), t("account.signOutText"), t("account.signOutAction")))) return;
    const r = await request({ type: "signOut" });
    if (r.ok === false) showError(r.error || t("account.signOutFailed"));
    else toast(t("account.signedOut"));
    request({ type: "getState" });
  };
}
function renderSignedOut(view) {
  const register = authMode === "register";
  view.innerHTML = `
    <h2 class="first">${esc(register ? t("account.createAccount") : t("account.signIn"))}</h2>
    <p class="note auth-note">${esc(t("account.onlyForRemote"))}</p>
    <form class="auth" id="authForm" novalidate>
      ${register ? `<label for="authName">${esc(t("account.name"))}</label><input type="text" id="authName" name="name" autocomplete="nickname">` : ""}
      <label for="authEmail">${esc(t("account.email"))}</label>
      <input type="email" id="authEmail" name="email" autocomplete="email" required aria-describedby="authError">
      <label for="authPassword">${esc(register ? t("account.passwordRule") : t("account.password"))}</label>
      <input type="password" id="authPassword" name="password" autocomplete="${register ? "new-password" : "current-password"}" required aria-describedby="authError">
      <p class="error" id="authError" role="alert"></p>
      <button class="btn primary" id="authSubmit">${esc(register ? t("account.create") : t("account.signIn"))}</button>
      <p class="switch-mode">${register ? `${esc(t("account.haveAccount"))} <button type="button" class="link" id="toggleAuth">${esc(t("account.signIn"))}</button>` : `${esc(t("account.newHere"))} <button type="button" class="link" id="toggleAuth">${esc(t("account.createAccount"))}</button>`}</p>
      ${register ? "" : `<p class="switch-mode">${esc(t("account.forgot"))}</p>`}
    </form>`;
  $("#toggleAuth").onclick = () => { authMode = register ? "signIn" : "register"; renderAccount(); ($("#authName") || $("#authEmail")).focus(); };
  $("#authForm").onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const err = $("#authError");
    err.textContent = "";
    if (!/^\S+@\S+\.\S+$/.test(data.email || "")) { err.textContent = t("account.invalidEmail"); $("#authEmail").focus(); return; }
    if (register && (data.password || "").length < 8) { err.textContent = t("account.shortPassword"); $("#authPassword").focus(); return; }
    const btn = $("#authSubmit");
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = register ? t("account.creating") : t("account.signingIn");
    const r = await request({ type: authMode, ...data });
    btn.disabled = false;
    btn.textContent = label;
    if (!r.ok) { err.textContent = r.error || t("account.tryAgain"); return; }
    toast(register ? t("account.created") : t("account.signedIn"));
    request({ type: "getState" });
  };
}

// The upstream site distributes an English APK; avoid linking to the wrong build.
function renderRail() {
  $("#downloadLink").textContent = t("general.useBundledApk");
  setFacts($("#aboutFacts"), [[t("general.gpu"), state.system.gpu], state.system.encoder.backend && [t("general.encoder"), encoderText()], [t("general.version"), state.version]]);
  $("#aboutLine").textContent = t("general.aboutLine", { port: state.system.port });
}

function renderAll() {
  bindSettings();
  renderHome();
  renderStatus();
  renderFirewall();
  renderDependents();
  renderAudio();
  renderVr();
  renderDevices();
  renderAccount();
  renderRail();
  if (state.pendingApproval) showApproval(state.pendingApproval);
}

// The static markup carries data-i18n keys; fill them before the first render.
i18n.apply();

window.addEventListener("resize", () => history.length && drawSpark());
request({ type: "getState" });

// ---------------------------------------------------------------- design-preview mock
function mock(msg) {
  const demo = new URLSearchParams(location.search).get("demo") || "connected";
  const none = demo === "firstrun" || demo === "problem" || demo === "signedout";
  if (demo === "firstrun") localStorage.removeItem("connectedBefore");
  const audio = { speaker: false, microphone: false, microphoneFeed: false, steam: { speaker: !(demo === "problem"), microphone: !(demo === "problem") }, active: demo === "problem" ? {} : { speaker: "steam", microphone: "steam" } };
  const base = mock.base ||= {
    type: "state", version: "1.0.0", downloadUrl: "https://rincast.com/#download", downloadSite: "rincast.com",
    settings: { pcName: "Studio PC", codec: "auto", tenBit: false, vrBitrateMbps: 200, desktopBitrateMbps: 40, adaptiveBitrate: true, fecPercent: 5, foveatedEncoding: true, adaptiveQuantization: true, twoPassEncoding: false, desktopMaxHeight: 0, streamAudio: true, playOnPcToo: false, micPassthrough: true, switchDefaultAudio: true, audioDevices: "auto", autoRegisterSteamVrDriver: true, requireApproval: true, desktopInput: true, startWithWindows: true, preventSleep: true, cloudUrl: "https://rincast.com", allowRemote: true,
      trustedDevices: none ? [] : [{ id: "q3", name: "Quest 3", model: "Meta Quest 3", lastSeen: Date.now() / 1000 }] },
    cloud: demo === "signedout" || demo === "firstrun" ? { signedIn: false } : { signedIn: true, userName: "Sam", email: "sam@example.com", status: demo === "problem" ? "error" : "online", error: demo === "problem" ? "The server didn't answer." : "", allowRemote: true },
    system: { gpu: demo === "problem" ? "Microsoft Basic Display Adapter" : "NVIDIA GeForce RTX 5070 Ti", port: 38711, addresses: ["192.168.1.20"], vpnAddresses: demo === "vpn" ? [{ name: "Tailscale", address: "100.101.102.103" }] : [], firewall: { otherNetworksOpen: demo !== "problem", publicInUse: demo === "public", publicAllowed: false, publicUnguarded: false }, encoder: demo === "problem" ? {} : { backend: "nvenc", h264: true, hevc: true, av1: true, hevc10: true },
      steamvr: { installed: true, running: false, driverRegistered: demo !== "problem" }, openxr: { rincastAvailable: false, rincastActive: false, steamvrActive: true },
      audioDriver: audio },
    session: demo === "connected" || demo === "lowbandwidth" ? { deviceName: "Quest 3", model: "Meta Quest 3", address: "192.168.1.42", remote: demo === "lowbandwidth", connectedSeconds: 1460, rttMs: demo === "lowbandwidth" ? 42.6 : 3.4, vrState: "running", vrApp: "Half-Life: Alyx",
      headsetBitrateMbps: 0, headsetCodec: "auto", vr: { fps: demo === "lowbandwidth" ? 45 : 90, encodeMs: 3.1, mbps: demo === "lowbandwidth" ? 7 : 182, codec: "HEVC", eyeWidth: 1536, eyeHeight: 1632, refreshRate: 90, latencyMs: demo === "lowbandwidth" ? 96 : 38 }, desktop: [],
      client: { latencyStages: demo === "lowbandwidth" ? { uplink: 21.3, game: 12.1, encoderWait: 0.7, encode: 4.4, downlink: 41.8, decode: 4.6, nextFrame: 3.1, compositor: 8 } : { uplink: 1.7, game: 11.4, encoderWait: 0.6, encode: 4.1, downlink: 5.3, decode: 4.2, nextFrame: 2.9, compositor: 7.8 } } } : null,
    pendingApproval: demo === "approval" ? { deviceId: "x", deviceName: "Quest 3", model: "Meta Quest 3", address: "192.168.1.42" } : null,
  };
  setTimeout(() => {
    if (msg.type === "getState") receive({ ...base, requestId: msg.requestId });
    else if (msg.type === "setSettings") { Object.assign(base.settings, msg.settings); receive({ type: "reply", requestId: msg.requestId, ok: true, settings: base.settings }); }
    else if (msg.requestId) receive({ type: "reply", requestId: msg.requestId, ok: true, settings: base.settings });
  }, 30);
  if (!mock.timer && base.session) {
    for (let i = 0; i < 40; i++) history.push(base.session.vr.mbps * (0.86 + Math.random() * 0.14));
    mock.timer = setInterval(() => {
      if (demo === "connected") {
        base.session.vr.mbps = 170 + Math.random() * 25;
        base.session.vr.latencyMs = 34 + Math.random() * 8;
      }
      receive({ type: "stats", session: base.session });
    }, 1000);
  }
}
