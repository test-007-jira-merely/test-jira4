const { isPromise } = require("../util/isPromise");

function withTimeout(fn, timeoutMs) {
  return new Promise((resolve, reject) => {
    let finished = false;
    let doneCalled = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      reject(new Error(`Test timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    function finish(err) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve();
    }

    try {
      if (fn.length >= 1) {
        // done callback
        const done = (err) => {
          if (doneCalled) {
            finish(new Error("done() called multiple times"));
            return;
          }
          doneCalled = true;
          finish(err);
        };
        const ret = fn(done);
        if (isPromise(ret)) {
          finish(new Error("Test function should not both accept 'done' and return a Promise"));
        }
      } else {
        const ret = fn();
        if (isPromise(ret)) {
          ret.then(() => finish(), (e) => finish(e));
        } else {
          finish();
        }
      }
    } catch (e) {
      finish(e);
    }
  });
}

module.exports = withTimeout;
