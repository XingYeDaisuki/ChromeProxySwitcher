"use strict";

const $ = (id) => document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  enabled: $("enabled"),
  protocolGroup: $("protocolGroup"),
  modeGroup: $("modeGroup"),
  langGroup: $("langGroup"),
  host: $("host"),
  port: $("port"),
  username: $("username"),
  password: $("password"),
  authBox: $("authBox"),
  authHint: $("authHint"),
  targetsPanel: $("targetsPanel"),
  targets: $("targets"),
  targetCount: $("targetCount"),
  bypassPanel: $("bypassPanel"),
  bypass: $("bypass"),
  scopeHint: $("scopeHint"),
  statusText: $("statusText"),
  message: $("message"),
  saveBtn: $("saveBtn"),
  disableBtn: $("disableBtn")
};

const PROTOCOL_LABELS = {
  http: "HTTP",
  https: "HTTPS",
  socks4: "SOCKS4",
  socks5: "SOCKS5"
};

const LANG_OPTIONS = ["zh", "en", "ja"];
const LANG_STORAGE_KEY = "uiLang";

const I18N = {
  zh: {
    appName: "自定义代理",
    switchTitle: "启用或停用代理",
    appearanceTitle: "外观",
    langTitle: "语言",
    sectionProtocol: "代理协议",
    sectionScope: "代理范围",
    scopeAll: "全部流量",
    scopeTarget: "仅名单",
    scopeHintAll: "所有网站流量都会经过代理，可在下方添加例外。",
    scopeHintTarget: "只有名单命中的网址 / IP 会走代理，其余流量直连。",
    sectionServer: "代理服务器",
    hostLabel: "地址（IP 或域名）",
    hostPlaceholder: "127.0.0.1 或 proxy.example.com",
    portLabel: "端口",
    portPlaceholder: "8080",
    authLabel: "代理认证",
    authOptional: "可选",
    usernameLabel: "用户名",
    usernamePlaceholder: "代理需要认证时填写",
    passwordLabel: "密码",
    passwordPlaceholder: "代理需要认证时填写",
    socksAuthHint: "Chrome 原生不支持 SOCKS 代理的用户名密码认证，SOCKS 模式请留空认证信息。",
    targetTitle: "走代理名单",
    targetPlaceholder: "example.com\n*.google.com\n1.2.3.4\n10.0.0.0/8",
    targetHint: "支持域名、*. 通配符、IPv4 / IPv6、IPv4 网段；example.com 与 www.example.com 互相覆盖。",
    bypassTitle: "例外：不走代理",
    bypassPlaceholder: "localhost、127.0.0.1、<local>",
    bypassHint: "多个地址用逗号或换行分隔。",
    disable: "停用代理",
    save: "保存并应用",
    statusOn: "已启用",
    statusOff: "未启用 · 使用系统代理",
    targetCount: (count) => `${count} 条`,
    errorNoHost: "请先填写代理服务器地址（IP 或域名）。",
    errorPort: "端口必须是 1 - 65535 之间的整数。",
    errorTargets: "已选择“仅名单”，请至少填写一个网址、域名或 IP。",
    errorRead: "读取状态失败",
    errorUnknown: "发生未知错误",
    errorInit: "初始化失败",
    msgEnabled: "代理已启用。",
    msgDisabled: "代理已停用，已恢复系统代理设置。"
  },
  en: {
    appName: "Custom Proxy",
    switchTitle: "Enable or disable proxy",
    appearanceTitle: "Appearance",
    langTitle: "Language",
    sectionProtocol: "Protocol",
    sectionScope: "Proxy scope",
    scopeAll: "All traffic",
    scopeTarget: "List only",
    scopeHintAll: "All website traffic will go through the proxy. Add exceptions below if needed.",
    scopeHintTarget: "Only sites/IPs on the list go through the proxy; everything else connects directly.",
    sectionServer: "Proxy server",
    hostLabel: "Address (IP or domain)",
    hostPlaceholder: "127.0.0.1 or proxy.example.com",
    portLabel: "Port",
    portPlaceholder: "8080",
    authLabel: "Proxy authentication",
    authOptional: "Optional",
    usernameLabel: "Username",
    usernamePlaceholder: "Fill in only if your proxy needs authentication",
    passwordLabel: "Password",
    passwordPlaceholder: "Fill in only if your proxy needs authentication",
    socksAuthHint: "Chrome doesn't support username/password authentication for SOCKS proxies. Leave credentials empty in SOCKS mode.",
    targetTitle: "Proxy list",
    targetPlaceholder: "example.com\n*.google.com\n1.2.3.4\n10.0.0.0/8",
    targetHint: "Supports domains, *. wildcards, IPv4/IPv6 and IPv4 CIDR. example.com and www.example.com cover each other.",
    bypassTitle: "Exceptions: don't proxy",
    bypassPlaceholder: "localhost, 127.0.0.1, <local>",
    bypassHint: "Separate addresses with commas or new lines.",
    disable: "Disable proxy",
    save: "Save & apply",
    statusOn: "Enabled",
    statusOff: "Disabled · System proxy",
    targetCount: (count) => (count === 1 ? "1 item" : `${count} items`),
    errorNoHost: "Enter a proxy server address (IP or domain) first.",
    errorPort: "Port must be an integer between 1 and 65535.",
    errorTargets: "You selected “List only”. Add at least one site, domain or IP.",
    errorRead: "Failed to load settings",
    errorUnknown: "Unknown error",
    errorInit: "Failed to initialize",
    msgEnabled: "Proxy enabled.",
    msgDisabled: "Proxy disabled. System proxy settings restored."
  },
  ja: {
    appName: "カスタムプロキシ",
    switchTitle: "プロキシを有効化 / 無効化",
    appearanceTitle: "外観",
    langTitle: "言語",
    sectionProtocol: "プロトコル",
    sectionScope: "プロキシ対象",
    scopeAll: "すべての通信",
    scopeTarget: "リストのみ",
    scopeHintAll: "すべての通信がプロキシを経由します。必要に応じて以下で除外を追加できます。",
    scopeHintTarget: "リストに一致するサイト / IP のみプロキシを経由し、それ以外は直接接続します。",
    sectionServer: "プロキシサーバー",
    hostLabel: "アドレス（IP またはドメイン）",
    hostPlaceholder: "127.0.0.1 または proxy.example.com",
    portLabel: "ポート",
    portPlaceholder: "8080",
    authLabel: "プロキシ認証",
    authOptional: "任意",
    usernameLabel: "ユーザー名",
    usernamePlaceholder: "認証が必要な場合に入力",
    passwordLabel: "パスワード",
    passwordPlaceholder: "認証が必要な場合に入力",
    socksAuthHint: "Chrome は SOCKS プロキシのユーザー名 / パスワード認証に対応していません。SOCKS モードでは認証情報を空にしてください。",
    targetTitle: "プロキシ適用リスト",
    targetPlaceholder: "example.com\n*.google.com\n1.2.3.4\n10.0.0.0/8",
    targetHint: "ドメイン、*. ワイルドカード、IPv4 / IPv6、IPv4 ネットワークに対応。example.com と www.example.com は相互にカバーします。",
    bypassTitle: "除外：プロキシしない",
    bypassPlaceholder: "localhost、127.0.0.1、<local>",
    bypassHint: "複数のアドレスはカンマまたは改行で区切ります。",
    disable: "プロキシを無効化",
    save: "保存して適用",
    statusOn: "有効",
    statusOff: "無効 · システムプロキシ",
    targetCount: (count) => `${count} 件`,
    errorNoHost: "プロキシサーバーのアドレス（IP またはドメイン）を入力してください。",
    errorPort: "ポートは 1 ～ 65535 の整数で指定してください。",
    errorTargets: "「リストのみ」が選択されています。サイト、ドメイン、IP を 1 つ以上入力してください。",
    errorRead: "設定の読み込みに失敗しました",
    errorUnknown: "不明なエラーが発生しました",
    errorInit: "初期化に失敗しました",
    msgEnabled: "プロキシを有効にしました。",
    msgDisabled: "プロキシを無効にし、システムプロキシ設定に戻しました。"
  }
};

let currentLang = "zh";
let messageTimer = null;

function t(key) {
  const table = I18N[currentLang] || I18N.zh;
  return table[key] !== undefined ? table[key] : (I18N.zh[key] !== undefined ? I18N.zh[key] : key);
}

function detectLanguage() {
  const candidates = [navigator.language, ...(navigator.languages || [])];
  for (const code of candidates) {
    const lower = String(code || "").toLowerCase();
    if (lower.startsWith("ja")) return "ja";
    if (lower.startsWith("zh")) return "zh";
  }
  return "en";
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function getSelected(group) {
  const active = group.querySelector(".active");
  return active ? active.dataset.value : "";
}

function setSegSelected(group, value) {
  group.querySelectorAll(".seg-btn").forEach((btn) => {
    const selected = btn.dataset.value === value;
    btn.classList.toggle("active", selected);
    btn.setAttribute("aria-pressed", String(selected));
  });
}

function applyStaticTranslations() {
  $$("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  $$("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  $$("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.dataset.i18nTitle));
  });
  $$("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
}

async function selectLanguage(lang) {
  const safe = LANG_OPTIONS.includes(lang) ? lang : detectLanguage();
  currentLang = safe;
  document.documentElement.lang = safe === "zh" ? "zh-CN" : safe;
  applyStaticTranslations();
  setSegSelected(elements.langGroup, safe);
  clearMessage();
  updateUiState();
  try {
    await chrome.storage.local.set({ [LANG_STORAGE_KEY]: safe });
  } catch (err) {
    // 保存语言偏好失败不影响本次切换
  }
}

function selectedProtocol() {
  return getSelected(elements.protocolGroup);
}

function selectedMode() {
  return getSelected(elements.modeGroup);
}

function protocolIsSocks() {
  const protocol = selectedProtocol();
  return protocol === "socks4" || protocol === "socks5";
}

function targetCount() {
  return elements.targets.value
    .split(/[\r\n]+/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean).length;
}

function readForm() {
  return {
    enabled: elements.enabled.checked,
    protocol: selectedProtocol(),
    mode: selectedMode(),
    host: elements.host.value.trim(),
    port: Number(elements.port.value),
    username: elements.username.value.trim(),
    password: elements.password.value,
    targets: elements.targets.value.trim(),
    bypass: elements.bypass.value.trim()
  };
}

function fillForm(config) {
  elements.enabled.checked = Boolean(config.enabled);
  setSegSelected(elements.protocolGroup, config.protocol || "http");
  setSegSelected(elements.modeGroup, config.mode || "all");
  elements.host.value = config.host || "";
  elements.port.value = config.port;
  elements.username.value = config.username || "";
  elements.password.value = config.password || "";
  elements.targets.value = config.targets || "";
  elements.bypass.value = config.bypass || "";
  updateUiState(config);
}

function updateScopeVisibility(config) {
  const cfg = config || {};
  const mode = cfg.mode || selectedMode();
  const targeted = mode === "targeted";
  const targetsWasHidden = elements.targetsPanel.classList.contains("hidden");
  const bypassWasHidden = elements.bypassPanel.classList.contains("hidden");

  elements.targetsPanel.classList.toggle("hidden", !targeted);
  elements.bypassPanel.classList.toggle("hidden", targeted);
  elements.scopeHint.textContent = targeted ? t("scopeHintTarget") : t("scopeHintAll");
  if (targeted && targetsWasHidden) {
    elements.targetsPanel.open = true;
  } else if (!targeted && bypassWasHidden) {
    elements.bypassPanel.open = true;
  }
}

function updateAuthHint() {
  elements.authHint.classList.toggle("hidden", !protocolIsSocks());
}

function updateTargetCount() {
  const count = targetCount();
  elements.targetCount.textContent = I18N[currentLang].targetCount(count);
}

function updateUiState(config) {
  const cfg = config || {};
  updateScopeVisibility(cfg);
  updateAuthHint();
  updateTargetCount();

  const enabled = cfg.enabled !== undefined ? cfg.enabled : elements.enabled.checked;
  const host = cfg.host !== undefined ? cfg.host : elements.host.value.trim();
  const port = cfg.port !== undefined ? cfg.port : Number(elements.port.value);
  const protocol = cfg.protocol || selectedProtocol();
  const mode = cfg.mode || selectedMode();
  const active = enabled && Boolean(host);

  elements.statusText.classList.toggle("on", Boolean(active));
  elements.statusText.classList.toggle("off", !active);

  if (active) {
    const scheme = PROTOCOL_LABELS[protocol] || String(protocol).toUpperCase();
    const scopeText = mode === "targeted" ? t("scopeTarget") : t("scopeAll");
    elements.statusText.textContent = `${t("statusOn")} · ${scheme} · ${scopeText}`;
  } else {
    elements.statusText.textContent = t("statusOff");
  }
  elements.statusText.title = elements.statusText.textContent;
}

function showMessage(text, type) {
  clearTimeout(messageTimer);
  elements.message.textContent = text || "";
  elements.message.className = `message show ${type || ""}`;
  if (type === "success") {
    messageTimer = setTimeout(clearMessage, 2600);
  }
}

function clearMessage() {
  elements.message.className = "message";
  elements.message.textContent = "";
}

function validateForm(config) {
  if (!config.enabled) return true;
  if (!config.host) {
    showMessage(t("errorNoHost"), "error");
    return false;
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    showMessage(t("errorPort"), "error");
    return false;
  }
  if (config.mode === "targeted" && targetCount() === 0) {
    showMessage(t("errorTargets"), "error");
    return false;
  }
  return true;
}

async function refresh() {
  const res = await sendMessage({ type: "getState" });
  if (!res.ok) {
    showMessage(res.error || t("errorRead"), "error");
    return;
  }
  fillForm(res.config);
}

async function save(enabled) {
  clearMessage();
  const config = readForm();
  config.enabled = enabled;
  if (!validateForm(config)) {
    if (enabled) elements.enabled.checked = false;
    updateUiState();
    return false;
  }

  elements.saveBtn.disabled = true;
  elements.disableBtn.disabled = true;
  try {
    const res = await sendMessage({
      type: enabled ? "save" : "disable",
      config
    });
    if (!res.ok) {
      showMessage(res.error || t("errorUnknown"), "error");
      if (enabled) elements.enabled.checked = false;
      updateUiState(res.config);
      return false;
    }
    elements.enabled.checked = enabled;
    updateUiState(res.config);
    showMessage(enabled ? t("msgEnabled") : t("msgDisabled"), "success");
    return true;
  } catch (err) {
    showMessage(err.message || t("errorUnknown"), "error");
    if (enabled) elements.enabled.checked = false;
    updateUiState();
    return false;
  } finally {
    elements.saveBtn.disabled = false;
    elements.disableBtn.disabled = false;
  }
}

elements.langGroup.addEventListener("click", (event) => {
  const btn = event.target.closest(".seg-btn");
  if (!btn) return;
  selectLanguage(btn.dataset.value);
});

elements.protocolGroup.addEventListener("click", (event) => {
  const btn = event.target.closest(".seg-btn");
  if (!btn) return;
  setSegSelected(elements.protocolGroup, btn.dataset.value);
  updateUiState();
});

elements.modeGroup.addEventListener("click", (event) => {
  const btn = event.target.closest(".seg-btn");
  if (!btn) return;
  setSegSelected(elements.modeGroup, btn.dataset.value);
  updateUiState();
});

elements.enabled.addEventListener("change", () => {
  save(elements.enabled.checked);
});

elements.host.addEventListener("input", () => {
  updateUiState();
});

elements.targets.addEventListener("input", () => {
  updateTargetCount();
  updateUiState();
});

elements.bypass.addEventListener("input", () => {
  updateUiState();
});

elements.saveBtn.addEventListener("click", () => {
  save(true);
});

elements.disableBtn.addEventListener("click", () => {
  elements.enabled.checked = false;
  save(false);
});

(async function init() {
  try {
    const stored = await chrome.storage.local.get(LANG_STORAGE_KEY);
    const lang = LANG_OPTIONS.includes(stored[LANG_STORAGE_KEY])
      ? stored[LANG_STORAGE_KEY]
      : detectLanguage();
    await selectLanguage(lang);
    try {
      await chrome.storage.local.remove(["themeColor", "uiTheme"]);
    } catch (err) {
      // 清理旧版颜色主题偏好，失败也不影响使用
    }
    await refresh();
  } catch (err) {
    showMessage(err.message || t("errorInit"), "error");
  }
})();
