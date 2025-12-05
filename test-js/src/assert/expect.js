const { deepEqual } = require("./deepEqual");
const { formatValue } = require("./format");
const { AssertionError } = require("./errors");
const { isPromise } = require("../util/isPromise");

function makeError(msg, expected, received, operator, stackStartFn) {
  return new AssertionError(msg, { expected, received, operator, stackStartFn });
}

function matcherWrapper(actual, invert, name, fn) {
  const res = fn();
  if (isPromise(res)) {
    return res.then(
      () => {
        if (invert) throw makeError(`Expected not ${name} but it did.`, undefined, actual, name, fn);
      },
      (err) => {
        if (!invert) throw err;
      }
    );
  } else {
    if (res && res.pass) {
      if (invert) throw makeError(res.messageNot || `Expected not ${name} but it did.`, res.expected, res.received, name, fn);
    } else {
      if (!invert) {
        const msg = (res && res.message) || `Expected ${name} to pass.`;
        throw makeError(msg, res && res.expected, res && res.received, name, fn);
      }
    }
  }
}

function buildMatchers(actual, ctx = {}) {
  const base = {
    toBe(expected) {
      return matcherWrapper(actual, false, "toBe", () => {
        const pass = Object.is(actual, expected);
        return {
          pass,
          expected,
          received: actual,
          message: `Expected ${formatValue(actual)} to be ${formatValue(expected)}`
        };
      });
    },
    toEqual(expected) {
      return matcherWrapper(actual, false, "toEqual", () => {
        const pass = deepEqual(actual, expected);
        return {
          pass,
          expected,
          received: actual,
          message: `Expected ${formatValue(actual)} to equal ${formatValue(expected)}`
        };
      });
    },
    toBeTruthy() {
      return matcherWrapper(actual, false, "toBeTruthy", () => ({
        pass: !!actual,
        expected: true,
        received: actual,
        message: `Expected ${formatValue(actual)} to be truthy`
      }));
    },
    toBeFalsy() {
      return matcherWrapper(actual, false, "toBeFalsy", () => ({
        pass: !actual,
        expected: false,
        received: actual,
        message: `Expected ${formatValue(actual)} to be falsy`
      }));
    },
    toContain(item) {
      return matcherWrapper(actual, false, "toContain", () => {
        let pass = false;
        if (typeof actual === "string") {
          pass = actual.includes(item);
        } else if (Array.isArray(actual)) {
          pass = actual.some((x) => deepEqual(x, item));
        }
        return {
          pass,
          expected: item,
          received: actual,
          message: `Expected ${formatValue(actual)} to contain ${formatValue(item)}`
        };
      });
    },
    async toThrow(expected) {
      const run = async () => {
        if (typeof actual === "function") {
          try {
            const r = actual();
            if (isPromise(r)) await r;
            return { threw: false, error: undefined };
          } catch (e) {
            return { threw: true, error: e };
          }
        } else if (isPromise(actual)) {
          try {
            await actual;
            return { threw: false, error: undefined };
          } catch (e) {
            return { threw: true, error: e };
          }
        } else {
          return { threw: false, error: undefined };
        }
      };

      return matcherWrapper(actual, false, "toThrow", async () => {
        const { threw, error } = await run();
        let pass = threw;
        if (pass && expected) {
          if (typeof expected === "string") {
            pass = String(error && error.message || "").includes(expected);
          } else if (expected instanceof RegExp) {
            pass = expected.test(String(error && error.message || ""));
          } else if (typeof expected === "function") {
            pass = error instanceof expected;
          }
        }
        return {
          pass,
          expected,
          received: error,
          message: `Expected function/promise to throw${expected ? " " + formatValue(expected) : ""}, but it did not.`
        };
      });
    },
    toBeGreaterThan(n) {
      return matcherWrapper(actual, false, "toBeGreaterThan", () => ({
        pass: actual > n,
        expected: `> ${n}`,
        received: actual,
        message: `Expected ${formatValue(actual)} to be greater than ${formatValue(n)}`
      }));
    },
    toBeGreaterThanOrEqual(n) {
      return matcherWrapper(actual, false, "toBeGreaterThanOrEqual", () => ({
        pass: actual >= n,
        expected: `>= ${n}`,
        received: actual,
        message: `Expected ${formatValue(actual)} to be >= ${formatValue(n)}`
      }));
    },
    toBeLessThan(n) {
      return matcherWrapper(actual, false, "toBeLessThan", () => ({
        pass: actual < n,
        expected: `< ${n}`,
        received: actual,
        message: `Expected ${formatValue(actual)} to be less than ${formatValue(n)}`
      }));
    },
    toBeLessThanOrEqual(n) {
      return matcherWrapper(actual, false, "toBeLessThanOrEqual", () => ({
        pass: actual <= n,
        expected: `<= ${n}`,
        received: actual,
        message: `Expected ${formatValue(actual)} to be <= ${formatValue(n)}`
      }));
    },
    // Optional: snapshot placeholder to keep API extensible
    toMatchSnapshot() {
      throw new Error("Snapshot testing not implemented yet. Run with a future version that supports snapshots.");
    }
  };

  const negated = {};
  for (const key of Object.keys(base)) {
    negated[key] = function (...args) {
      return matcherWrapper(actual, true, key, () => {
        // reuse the base result and invert pass
        const res = (() => base[key](...args))();
        // For async matchers, base[key] returns a Promise; matcherWrapper handles inversion there.
        return { pass: true };
      });
    };
  }

  return { ...base, not: negated };
}

function expect(actual) {
  return buildMatchers(actual);
}

module.exports = { expect };
