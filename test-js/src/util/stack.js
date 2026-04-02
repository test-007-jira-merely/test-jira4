function cleanStack(stack) {
  if (!stack) return stack;
  const lines = String(stack).split("\n");
  return lines
    .filter((l) => !l.includes("/test-js/src/"))
    .join("\n");
}

module.exports = { cleanStack };
