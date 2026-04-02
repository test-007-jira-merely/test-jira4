const runHooks = require("./runHooks");
const executeTest = require("./executeTest");

async function executeSuite(suite, config, filePath) {
  const results = [];
  const stats = { passed: 0, failed: 0, skipped: 0 };

  let beforeAllFailed = null;
  try {
    await runHooks(suite.hooks.beforeAll, config.testTimeout);
  } catch (e) {
    beforeAllFailed = e;
  }

  if (beforeAllFailed) {
    // mark all tests in this suite and children as skipped
    const markSkipped = (s) => {
      for (const t of s.tests) {
        results.push({
          name: t.name,
          fullName: t.name,
          status: "skipped",
          durationMs: 0,
          error: new Error("Skipped due to beforeAll failure in parent suite"),
          file: filePath
        });
        stats.skipped++;
      }
      for (const child of s.suites) markSkipped(child);
    };
    markSkipped(suite);
  } else {
    for (const t of suite.tests) {
      const r = await executeTest(t, config);
      results.push({ ...r, file: filePath });
      if (r.status === "passed") stats.passed++;
      else if (r.status === "failed") stats.failed++;
      else stats.skipped++;
    }
    for (const child of suite.suites) {
      const sub = await executeSuite(child, config, filePath);
      results.push(...sub.tests);
      stats.passed += sub.stats.passed;
      stats.failed += sub.stats.failed;
      stats.skipped += sub.stats.skipped;
    }
  }

  try {
    await runHooks(suite.hooks.afterAll, config.testTimeout);
  } catch (e) {
    // Report afterAll failure as a synthetic failed test for visibility
    results.push({
      name: "afterAll",
      fullName: "afterAll",
      status: "failed",
      durationMs: 0,
      error: e,
      file: filePath
    });
    stats.failed++;
  }

  return { tests: results, stats };
}

module.exports = executeSuite;
