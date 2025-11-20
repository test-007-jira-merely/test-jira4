const { isPromise } = require("../util/isPromise");

function createMockFunction() {
  let impl = undefined;
  const onceQueue = [];
  const fn = function mockFn(...args) {
    const context = this;
    fn.mock.calls.push(args);
    fn.mock.contexts.push(context);
    try {
      let result;
      if (onceQueue.length) {
        const next = onceQueue.shift();
        result = next.apply ? next.apply(context, args) : next.value;
      } else if (impl) {
        result = impl.apply(context, args);
      }
      if (result === undefined) {
        // no impl; do nothing
      }
      fn.mock.results.push({ type: "return", value: result });
      return result;
    } catch (e) {
      fn.mock.results.push({ type: "throw", value: e });
      throw e;
    }
  };

  fn.mock = {
    calls: [],
    contexts: [],
    results: []
  };

  fn.mockImplementation = (newImpl) => {
    impl = newImpl;
    return fn;
  };
  fn.mockReturnValue = (value) => {
    impl = () => value;
    return fn;
  };
  fn.mockReturnValueOnce = (value) => {
    onceQueue.push({ value });
    return fn;
  };
  fn.mockResolvedValue = (value) => {
    impl = () => Promise.resolve(value);
    return fn;
  };
  fn.mockRejectedValue = (err) => {
    impl = () => Promise.reject(err);
    return fn;
  };
  fn.mockClear = () => {
    fn.mock.calls = [];
    fn.mock.contexts = [];
    fn.mock.results = [];
    return fn;
  };
  fn.mockReset = () => {
    fn.mockClear();
    impl = undefined;
    onceQueue.length = 0;
    return fn;
  };

  return fn;
}

module.exports = function fn() {
  return createMockFunction();
};
