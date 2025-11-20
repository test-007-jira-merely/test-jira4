const fs = require("fs");
const path = require("path");

function jsonReport(allFiles, config) {
  const stats = { passed: 0, failed: 0, skipped: 0, durationMs: 0 };
  const tests = [];

  for (const file of allFiles) {
    stats.durationMs += file.durationMs || 0;
    for (const t of file.tests) {
      tests.push({
        file: file.file,
        name: t.name,
        fullName: t.fullName || t.name,
        status: t.status,
        durationMs: t.durationMs || 0,
        error: t.error ? { message: t.error.message, stack: t.error.stack } : null
      });
      if (t.status === "passed") stats.passed++;
      else if (t.status === "failed") stats.failed++;
      else stats.skipped++;
    }
  }

  const out = { stats, files: allFiles, tests };
  const json = JSON.stringify(out, null, 2);
  console.log(json);

  const outPath = config.reporterOptions && config.reporterOptions.outputPath;
  if (outPath) {
    const abs = path.isAbsolute(outPath) ? outPath : path.join(process.cwd(), outPath);
    fs.writeFileSync(abs, json, "utf8");
  }
}

module.exports = { jsonReport };
