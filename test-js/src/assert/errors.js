class AssertionError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AssertionError";
    if (options.expected !== undefined) this.expected = options.expected;
    if (options.received !== undefined) this.received = options.received;
    if (options.operator) this.operator = options.operator;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, options.stackStartFn || AssertionError);
    }
  }
}

module.exports = { AssertionError };
