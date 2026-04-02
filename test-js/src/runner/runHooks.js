const withTimeout = require("./withTimeout");

async function runHooks(hooks, timeout) {
  for (const fn of hooks) {
    await withTimeout(fn, timeout);
  }
}

module.exports = runHooks;
