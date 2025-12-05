const runFile = require("./core/runFile");
const discover = require("./runner/discover");
const { loadConfig } = require("./util/loadConfig");
const { printResults } = require("./reporter/default");
const { jsonReport } = require("./reporter/json");
const { expect } = require("./assert/expect");
const { fn, spyOn } = require("./mock");

async function run(configOverrides = {}) {
  const config = loadConfig(configOverrides);
  const files = discover(config);
  const results = [];

  const start = Date.now();
  for (const f of files) {
    const r = await runFile(f, config);
    results.push(r);
  }
  const totalDuration = Date.now() - start;

  // attach top-level summary duration
  results.totalDuration = totalDuration;

  if (config.reporter === "default") {
    printResults(results, config);
  } else if (config.reporter === "json") {
    jsonReport(results, config);
  }

  // Exit code be non-zero if any failed
  const anyFailed = results.some((file) => file.tests.some((t) => t.status === "failed"));
  return { results, anyFailed };
}

module.exports = {
  run,
  expect,
  fn,
  spyOn
};
