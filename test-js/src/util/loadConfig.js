const fs = require("fs");
const path = require("path");
const { DEFAULT_CONFIG } = require("./defaults");

function readJsonIfExists(p) {
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    throw new Error(`Failed to read JSON config at ${p}: ${e.message}`);
  }
  return null;
}

function mergeConfig(base, override) {
  const out = { ...base };
  for (const k of Object.keys(override || {})) {
    const v = override[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = mergeConfig(out[k] || {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function validateConfig(cfg) {
  if (typeof cfg.testMatch !== "string") {
    throw new Error("config.testMatch must be a string glob pattern");
  }
  if (typeof cfg.testTimeout !== "number" || cfg.testTimeout <= 0) {
    throw new Error("config.testTimeout must be a positive number (ms)");
  }
  if (typeof cfg.colors !== "boolean") {
    throw new Error("config.colors must be a boolean");
  }
  if (!["default", "json"].includes(cfg.reporter)) {
    throw new Error('config.reporter must be "default" or "json"');
  }
  if (cfg.reporterOptions && typeof cfg.reporterOptions !== "object") {
    throw new Error("config.reporterOptions must be an object");
  }
  if (cfg.snapshot && typeof cfg.snapshot !== "object") {
    throw new Error("config.snapshot must be an object");
  }
}

function loadConfig(overrides = {}) {
  const cwd = process.cwd();
  const rootConfigPath = path.join(cwd, "test.config.json");
  const localConfigPath = path.join(cwd, "test-js", "test.config.json");

  const rootCfg = readJsonIfExists(rootConfigPath);
  const localCfg = readJsonIfExists(localConfigPath);

  let cfg = { ...DEFAULT_CONFIG };
  if (rootCfg) cfg = mergeConfig(cfg, rootCfg);
  if (localCfg) cfg = mergeConfig(cfg, localCfg);
  if (overrides && Object.keys(overrides).length) cfg = mergeConfig(cfg, overrides);

  // Env toggles
  if (process.env.UPDATE_SNAPSHOTS === "1" || process.env.UPDATE_SNAPSHOTS === "true") {
    cfg.snapshot = { ...(cfg.snapshot || {}), update: true };
  }

  validateConfig(cfg);
  return cfg;
}

module.exports = { loadConfig, mergeConfig, readJsonIfExists, validateConfig };
