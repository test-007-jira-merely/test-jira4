#!/usr/bin/env node

const path = require("path");
const { run } = require("../src/index");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--colors") {
      out.colors = true;
    } else if (a === "--no-colors") {
      out.colors = false;
    } else if (a === "--reporter") {
      out.reporter = argv[++i];
    } else if (a === "--testMatch") {
      out.testMatch = argv[++i];
    } else if (a === "--timeout") {
      out.testTimeout = Number(argv[++i]);
    } else if (a === "--updateSnapshots") {
      out.snapshot = { update: true };
    } else if (a === "--reporterOutput") {
      out.reporterOptions = { ...(out.reporterOptions || {}), outputPath: argv[++i] };
    } else if (a === "--config") {
      // Not implemented: external config path; could be merged in loadConfig if needed
      out._configPath = argv[++i];
    }
  }
  return out;
}

(async () => {
  const overrides = parseArgs(process.argv);
  const { anyFailed } = await run(overrides);
  process.exit(anyFailed ? 1 : 0);
})();
