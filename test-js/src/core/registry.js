/**
 * Suite structure:
 * {
 *   name, parent, suites: [], tests: [],
 *   hooks: { beforeAll: [], beforeEach: [], afterAll: [], afterEach: [] }
 * }
 * Test structure:
 * { name, fn, timeout, mode: "normal"|"skip"|"todo", file, parent }
 */

let rootSuite = null;
let currentSuite = null;

function createSuite(name, parent = null) {
  return {
    name,
    parent,
    suites: [],
    tests: [],
    hooks: {
      beforeAll: [],
      beforeEach: [],
      afterAll: [],
      afterEach: []
    }
  };
}

function resetRegistry() {
  rootSuite = createSuite("<root>", null);
  currentSuite = rootSuite;
}

function getRootSuite() {
  if (!rootSuite) resetRegistry();
  return rootSuite;
}

function pushSuite(name) {
  const suite = createSuite(name, currentSuite);
  currentSuite.suites.push(suite);
  currentSuite = suite;
  return suite;
}

function popSuite() {
  if (currentSuite && currentSuite.parent) {
    currentSuite = currentSuite.parent;
  }
}

function addTest(name, fn, opts = {}) {
  const test = {
    name,
    fn,
    timeout: opts.timeout || null,
    mode: opts.mode || "normal",
    file: opts.file || null,
    parent: currentSuite
  };
  currentSuite.tests.push(test);
  return test;
}

function addHook(type, fn) {
  currentSuite.hooks[type].push(fn);
}

function getAncestors(suite) {
  const list = [];
  let cur = suite;
  while (cur && cur.parent) {
    list.unshift(cur);
    cur = cur.parent;
  }
  return list;
}

module.exports = {
  resetRegistry,
  getRootSuite,
  pushSuite,
  popSuite,
  addTest,
  addHook,
  getAncestors
};
