function escapeRegex(s) {
  return s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

// Convert a simple glob like **/*.test.js to a RegExp
function globToRegex(glob) {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        // **
        const next = glob[i + 2];
        if (next === "/") {
          re += "(?:.*\\/)?";
          i += 3;
        } else {
          re += ".*";
          i += 2;
        }
      } else {
        re += "[^/]*";
        i += 1;
      }
    } else if (ch === "?") {
      re += ".";
      i += 1;
    } else if (ch === "/") {
      re += "\\/";
      i += 1;
    } else {
      re += escapeRegex(ch);
      i += 1;
    }
  }
  re += "$";
  return new RegExp(re);
}

module.exports = { globToRegex };
