const path = require("path");
const registry = require("./registry");
const { installGlobals } = require("./installGlobals");
const executeSuite = require("../runner/executeSuite");

async function runFile(filePath, config) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  registry.resetRegistry();

  const uninstall = installGlobals();
  const start = Date.now();
  let loadError = null;

  try {
    delete require.cache[absPath];
    require(absPath);
  } catch (e) {
    loadError = e;
  }

  const root = registry.getRootSuite();
  let results = [];
  let fileStatus = "passed";
  let durationMs = 0;

  if (loadError) {
    // Represent file load error as a failed test
    results.push({
      name: `load: ${path.basename(filePath)}`,
      fullName: [`<root>`, `load: ${path.basename(filePath)}`].join(" "),
      status: "failed",
      durationMs: 0,
      error: loadError,
      file: filePath
    });
    fileStatus = "failed";
  } else {
    const out = await executeSuite(root, config, filePath);
    results = out.tests;
    fileStatus = out.stats.failed > 0 ? "failed" : "passed";
  }

  durationMs = Date.now() - start;
  uninstall();

  return {
    file: filePath,
    status: fileStatus,
    durationMs,
    tests: results
  };
}

module.exports = runFile;
