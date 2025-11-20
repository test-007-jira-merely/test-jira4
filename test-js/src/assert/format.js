const util = require("util");

function formatValue(val) {
  return util.inspect(val, { depth: 5, maxArrayLength: 50, breakLength: 80, colors: false });
}

module.exports = { formatValue };
