const globalsApi = require("./globals");
const { expect } = require("../assert/expect");
const { fn, spyOn } = require("../mock");

const GLOBAL_NAMES = [
  "describe", "it", "test",
  "beforeAll", "beforeEach", "afterAll", "afterEach",
  "expect", "fn", "spyOn"
];

function installGlobals() {
  const prev = {};
  for (const k of GLOBAL_NAMES) {
    prev[k] = globalThis[k];
  }

  Object.assign(globalThis, globalsApi, { expect, fn, spyOn });

  return function uninstallGlobals() {
    for (const k of GLOBAL_NAMES) {
      if (prev[k] === undefined) {
        delete globalThis[k];
      } else {
        globalThis[k] = prev[k];
      }
    }
  };
}

module.exports = { installGlobals };
