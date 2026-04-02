const fs = require("fs");
const path = require("path");
const { globToRegex } = require("../util/globToRegex");

function discover(config) {
  const root = process.cwd();
  const rx = globToRegex(config.testMatch);
  const ignored = new Set(["node_modules", ".git", ".hg", ".svn"]);

  const found = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (ignored.has(e.name) || e.name.startsWith(".")) continue;
        walk(path.join(dir, e.name));
      } else if (e.isFile()) {
        const rel = path.relative(root, path.join(dir, e.name)).replace(/\\/g, "/");
        if (rx.test(rel)) found.push(rel);
      }
    }
  }

  walk(root);
  found.sort();
  return found;
}

module.exports = discover;
