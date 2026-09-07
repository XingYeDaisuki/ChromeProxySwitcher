"use strict";

const DEFAULT_CONFIG = {
  enabled: false,
  protocol: "http", // http | https | socks4 | socks5
  host: "",
  port: 8080,
  username: "",
  password: "",
  bypass: "",
  mode: "all", // all = 全部流量走代理 | targeted = 仅名单中的网址/IP 走代理
  targets: ""
};

const SUPPORTED_SCHEMES = ["http", "https", "socks4", "socks5"];
const SUPPORTED_MODES = ["all", "targeted"];
const PAC_TOKENS = {
  http: "PROXY",
  https: "HTTPS",
  socks4: "SOCKS4",
  socks5: "SOCKS5"
};

function normalizeConfig(input) {
  const cfg = { ...DEFAULT_CONFIG, ...(input || {}) };
  if (!SUPPORTED_SCHEMES.includes(cfg.protocol)) cfg.protocol = "http";
  cfg.enabled = Boolean(cfg.enabled);
  cfg.host = String(cfg.host || "").trim();
  cfg.port = Number(cfg.port);
  if (!Number.isInteger(cfg.port) || cfg.port <= 0 || cfg.port > 65535) cfg.port = DEFAULT_CONFIG.port;
  cfg.username = String(cfg.username || "");
  cfg.password = String(cfg.password || "");
  cfg.bypass = String(cfg.bypass || "");
  if (!SUPPORTED_MODES.includes(cfg.mode)) cfg.mode = DEFAULT_CONFIG.mode;
  cfg.targets = String(cfg.targets || "").trim();
  return cfg;
}

async function getConfig() {
  const stored = await chrome.storage.local.get("config");
  return normalizeConfig(stored.config);
}

async function setConfig(input) {
  const cfg = normalizeConfig(input);
  await chrome.storage.local.set({ config: cfg });
  return cfg;
}

function validateConfig(cfg) {
  const host = String(cfg.host || "").trim();
  if (!host) {
    throw new Error("请填写代理服务器地址（IP 或域名）。");
  }
  if (!/^[a-zA-Z0-9._\-:[\]]+$/.test(host)) {
    throw new Error("代理地址包含不支持的字符，请只填写 IP、域名或带方括号的 IPv6 地址。");
  }
  if (!Number.isInteger(cfg.port) || cfg.port <= 0 || cfg.port > 65535) {
    throw new Error("端口必须是 1 - 65535 之间的整数。");
  }
  if (!SUPPORTED_SCHEMES.includes(cfg.protocol)) {
    throw new Error("不支持该代理协议。");
  }
  if (cfg.mode === "targeted" && parseTargets(cfg.targets).length === 0) {
    throw new Error("已选择“仅名单走代理”，请至少填写一个网址、域名或 IP。");
  }
}

function parseBypass(text) {
  return String(text || "")
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTargets(text) {
  return String(text || "")
    .split(/[\r\n,，;；]+/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean);
}

function isIpv4(text) {
  const parts = String(text).split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

function isIpv6(text) {
  return /^[0-9a-f:.]+$/i.test(String(text)) && String(text).includes(":");
}

function ipv4MaskFromPrefix(prefix) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return [
    (mask >>> 24) & 255,
    (mask >>> 16) & 255,
    (mask >>> 8) & 255,
    mask & 255
  ].join(".");
}

function extractHostFromUrlish(line) {
  let rest = line.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const slash = rest.indexOf("/");
  if (slash >= 0) rest = rest.slice(0, slash);
  const at = rest.lastIndexOf("@");
  if (at >= 0) rest = rest.slice(at + 1);
  const match = rest.match(/^(\[[^\]]*\]|[^:]+)(?::\d+)?$/);
  if (!match) return null;
  return match[1].replace(/^\[|\]$/g, "").toLowerCase();
}

function classifyTarget(line) {
  let t = String(line).trim().toLowerCase();
  if (!t) return null;

  // 允许 www\.github.com 这类“转义写法”，与 www.github.com 等价
  t = t.replace(/\\\./g, ".");

  // 通配符形式的完整 URL，如 *://example.com/*
  if (t.includes("://")) {
    if (t.includes("*")) {
      return { type: "url", value: t };
    }
    const hostOnly = extractHostFromUrlish(t);
    if (hostOnly) t = hostOnly;
  }

  // IPv4 CIDR，例如 1.2.3.0/24
  if (t.includes("/")) {
    const [ip, prefixText] = t.split("/");
    if (isIpv4(ip)) {
      const mask = ipv4MaskFromPrefix(Number(prefixText));
      if (mask) return { type: "cidr", ip, mask };
    }
    // 类似 example.com/path 的写法，尝试只保留域名
    const hostOnly = extractHostFromUrlish(t);
    if (hostOnly) t = hostOnly;
  }

  // 去掉常见 IPv6 地址里的方括号
  t = t.replace(/^\[|\]$/g, "");

  if (isIpv4(t) || isIpv6(t)) {
    return { type: "ip", value: t };
  }

  if (t.startsWith(".")) t = t.slice(1);

  if (t.includes("*")) {
    return { type: "wildcard", value: t };
  }

  if (!/^[a-z0-9.\-]+$/.test(t) || !t.includes(".")) {
    // 不认识的写法也保留，交给 shExpMatch 宽松处理
    return { type: "wildcard", value: t };
  }

  return { type: "domain", value: t };
}

function pacHostPart(host) {
  const h = String(host).trim();
  return h.includes(":") && !h.startsWith("[") ? `[${h}]` : h;
}

function buildPacData(cfg) {
  const targetLines = parseTargets(cfg.targets);
  if (targetLines.length === 0) {
    throw new Error("名单为空，无法生成代理规则。");
  }

  const domains = [];
  const wildcards = [];
  const urls = [];
  const ips = [];
  const cidrs = [];

  targetLines.forEach((line) => {
    const rule = classifyTarget(line);
    if (!rule) return;
    if (rule.type === "domain") {
      domains.push(rule.value);
      // www.github.com 与 github.com 视为同一站点，互相覆盖
      if (rule.value.startsWith("www.")) {
        const base = rule.value.slice(4);
        if (base.includes(".") && !domains.includes(base)) {
          domains.push(base);
        }
      }
    }
    else if (rule.type === "wildcard") wildcards.push(rule.value);
    else if (rule.type === "url") urls.push(rule.value);
    else if (rule.type === "ip") ips.push(rule.value);
    else if (rule.type === "cidr") cidrs.push([rule.ip, rule.mask]);
  });

  const proxy = `${PAC_TOKENS[cfg.protocol]} ${pacHostPart(cfg.host)}:${cfg.port}`;

  return `function FindProxyForURL(url, host) {
  var i, d, h;
  url = String(url || "").toLowerCase();
  host = String(host || "").toLowerCase();
  h = host;
  if (h.charAt(0) === "[") {
    var closeBracket = h.indexOf("]");
    if (closeBracket > 0) h = h.substring(1, closeBracket);
  }

  var domains = ${JSON.stringify(domains)};
  for (i = 0; i < domains.length; i++) {
    d = domains[i];
    if (h === d || (h.length > d.length && h.substring(h.length - d.length - 1) === "." + d)) {
      return ${JSON.stringify(proxy + "; DIRECT")};
    }
  }

  var wildcards = ${JSON.stringify(wildcards)};
  for (i = 0; i < wildcards.length; i++) {
    if (shExpMatch(h, wildcards[i])) {
      return ${JSON.stringify(proxy + "; DIRECT")};
    }
  }

  var urls = ${JSON.stringify(urls)};
  for (i = 0; i < urls.length; i++) {
    if (shExpMatch(url, urls[i])) {
      return ${JSON.stringify(proxy + "; DIRECT")};
    }
  }

  var ips = ${JSON.stringify(ips)};
  for (i = 0; i < ips.length; i++) {
    if (h === ips[i]) {
      return ${JSON.stringify(proxy + "; DIRECT")};
    }
  }

  var cidrs = ${JSON.stringify(cidrs)};
  for (i = 0; i < cidrs.length; i++) {
    if (isInNet(h, cidrs[i][0], cidrs[i][1])) {
      return ${JSON.stringify(proxy + "; DIRECT")};
    }
  }

  return "DIRECT";
}
`;
}

async function setBadge(enabled) {
  try {
    await chrome.action.setBadgeText({ text: enabled ? "ON" : "" });
    await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#16a34a" : "#9ca3af" });
  } catch (err) {
    // 徽标更新失败不影响核心功能
  }
}

async function applyProxy(cfg) {
  cfg = normalizeConfig(cfg);
  if (!cfg.enabled) {
    await chrome.proxy.settings.set({
      value: { mode: "system" },
      scope: "regular"
    });
    await setBadge(false);
    return { active: false };
  }

  validateConfig(cfg);

  if (cfg.mode === "targeted") {
    const pacData = buildPacData(cfg);
    await chrome.proxy.settings.set({
      value: {
        mode: "pac_script",
        pacScript: { data: pacData }
      },
      scope: "regular"
    });
  } else {
    const proxyValue = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: cfg.protocol,
          host: cfg.host,
          port: cfg.port
        }
      }
    };

    const bypassList = parseBypass(cfg.bypass);
    if (bypassList.length > 0) {
      proxyValue.bypassList = bypassList;
    }

    await chrome.proxy.settings.set({ value: proxyValue, scope: "regular" });
  }

  await setBadge(true);
  return {
    active: true,
    scheme: cfg.protocol,
    host: cfg.host,
    port: cfg.port,
    mode: cfg.mode,
    targetCount: parseTargets(cfg.targets).length
  };
}

async function getCurrentState() {
  const cfg = await getConfig();
  let applied = null;
  try {
    const setting = await chrome.proxy.settings.get({});
    applied = setting.value || null;
    applied.levelOfControl = setting.levelOfControl || "";
  } catch (err) {
    applied = { error: err.message };
  }
  return { config: cfg, applied };
}

async function handleMessage(message) {
  switch (message && message.type) {
    case "getState": {
      return { ok: true, ...(await getCurrentState()) };
    }
    case "save": {
      const cfg = normalizeConfig(message.config);
      if (cfg.enabled) validateConfig(cfg);
      await setConfig(cfg);
      const result = await applyProxy(cfg);
      return { ok: true, ...result, config: cfg };
    }
    case "disable": {
      const cfg = normalizeConfig(message.config);
      cfg.enabled = false;
      await setConfig(cfg);
      const result = await applyProxy(cfg);
      return { ok: true, ...result, config: cfg };
    }
    case "reapply": {
      const cfg = await getConfig();
      const result = await applyProxy(cfg);
      return { ok: true, ...result, config: cfg };
    }
    default:
      throw new Error("未知的操作。");
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse(result))
    .catch((err) => {
      console.error("[Proxy Switcher]", err);
      sendResponse({ ok: false, error: err && err.message ? err.message : String(err) });
    });
  return true; // 保持消息通道等待异步回复
});

// 可选：HTTP / HTTPS 代理需要用户名密码时自动填充
chrome.webRequest.onAuthRequired.addListener(
  async (details) => {
    try {
      if (!details.isProxy) return undefined;
      const cfg = await getConfig();
      if (!cfg.enabled || !cfg.username) return undefined;
      if (cfg.protocol !== "http" && cfg.protocol !== "https") return undefined;
      return {
        authCredentials: {
          username: cfg.username,
          password: cfg.password
        }
      };
    } catch (err) {
      console.error("[Proxy Switcher] auth error:", err);
      return undefined;
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// 浏览器启动 / 扩展安装后恢复之前的状态
chrome.runtime.onStartup.addListener(() => {
  getConfig().then(applyProxy).catch(console.error);
});

chrome.runtime.onInstalled.addListener(() => {
  getConfig().then(applyProxy).catch(console.error);
});
