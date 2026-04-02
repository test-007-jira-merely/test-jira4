function isObject(o) {
  return o !== null && typeof o === "object";
}

function eqDates(a, b) {
  return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
}

function eqRegex(a, b) {
  return a instanceof RegExp && b instanceof RegExp && a.source === b.source && a.flags === b.flags;
}

function eqArray(a, b, stackA, stackB) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqualInternal(a[i], b[i], stackA, stackB)) return false;
  }
  return true;
}

function eqMap(a, b, stackA, stackB) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if (!b.has(k)) return false;
    if (!deepEqualInternal(v, b.get(k), stackA, stackB)) return false;
  }
  return true;
}

function eqSet(a, b, stackA, stackB) {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function eqObj(a, b, stackA, stackB) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!hasOwn(b, k)) return false;
    if (!deepEqualInternal(a[k], b[k], stackA, stackB)) return false;
  }
  return true;
}

function deepEqualInternal(a, b, stackA, stackB) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (!isObject(a) || !isObject(b)) return a === b;

  // Cycle handling
  const idx = stackA.indexOf(a);
  if (idx !== -1) {
    return stackB[idx] === b;
  }
  stackA.push(a); stackB.push(b);

  try {
    if (eqDates(a, b)) return true;
    if (eqRegex(a, b)) return true;

    if (Array.isArray(a)) {
      if (!Array.isArray(b)) return false;
      return eqArray(a, b, stackA, stackB);
    }

    if (a instanceof Map && b instanceof Map) return eqMap(a, b, stackA, stackB);
    if (a instanceof Set && b instanceof Set) return eqSet(a, b, stackA, stackB);

    // Different constructors (e.g., class instances) -> treat as objects
    const protoA = Object.getPrototypeOf(a);
    const protoB = Object.getPrototypeOf(b);
    if (protoA !== protoB) return false;

    return eqObj(a, b, stackA, stackB);
  } finally {
    stackA.pop(); stackB.pop();
  }
}

function deepEqual(a, b) {
  return deepEqualInternal(a, b, [], []);
}

module.exports = { deepEqual };
