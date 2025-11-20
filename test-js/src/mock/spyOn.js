const createFn = require("./fn");

function spyOn(obj, methodName) {
  if (!obj || typeof obj[methodName] !== "function") {
    throw new Error(`spyOn: property ${String(methodName)} is not a function on the target object`);
  }
  const original = obj[methodName];
  const spy = createFn();
  const spied = function (...args) {
    return spy.apply(this, args);
  };
  Object.defineProperty(spied, "name", { value: `spy_${methodName}` });
  obj[methodName] = spied;

  spy.restore = () => {
    obj[methodName] = original;
  };

  return spy;
}

module.exports = { spyOn };
