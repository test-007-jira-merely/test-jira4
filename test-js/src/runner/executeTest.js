const withTimeout = require("./withTimeout");
const runHooks = require("./runHooks");
const { getAncestors } = require("../core/registry");

async function executeTest(test, config) {
  const start = Date.now();
  let status = "passed";
  let error = null;

  const ancestors = getAncestors(test.parent);
  const befores = [];
  const afters = [];
  for (const s of ancestors) {
    befores.push(...s.hooks.beforeEach);
  }
  befores.push(...test.parent.hooks.beforeEach);
  for (const s of [test.parent, ...ancestors.slice().reverse()]) {
    afters.push(...s.hooks.afterEach);
  }

  try {
    await runHooks(befores, config.testTimeout);
    const timeout = test.timeout || config.testTimeout;
    await withTimeout(test.fn || (() => {}), timeout);
  } catch (e) {
    status = "failed";
    error = e;
  } finally {
    try {
      await runHooks(afters, config.testTimeout);
    } catch (e) {
      if (status !== "failed") {
        status = "failed";
        error = e;
      }
    }
  }

  return {
    name: test.name,
    fullName: ancestors.map(a => a.name).concat([test.parent.name !== "<root>" ? test.parent.name : null, test.name].filter(Boolean)).join(" > "),
    status,
    durationMs: Date.now() - start,
    error
  };
}

module.exports = executeTest;
