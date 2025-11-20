const registry = require("./registry");

function describe(name, fn) {
  const s = registry.pushSuite(name);
  try {
    fn();
  } finally {
    registry.popSuite();
  }
  return s;
}

function it(name, fn, opts = {}) {
  return registry.addTest(name, fn, opts);
}

function test(name, fn, opts = {}) {
  return it(name, fn, opts);
}

function beforeAll(fn) {
  registry.addHook("beforeAll", fn);
}

function beforeEach(fn) {
  registry.addHook("beforeEach", fn);
}

function afterAll(fn) {
  registry.addHook("afterAll", fn);
}

function afterEach(fn) {
  registry.addHook("afterEach", fn);
}

module.exports = {
  describe,
  it,
  test,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach
};
