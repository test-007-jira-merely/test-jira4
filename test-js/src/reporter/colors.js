function wrap(open, close) {
  return (s, enabled) => {
    if (!enabled) return String(s);
    return `\u001b[${open}m${s}\u001b[${close}m`;
  };
}

const colors = {
  green: wrap(32, 39),
  red: wrap(31, 39),
  yellow: wrap(33, 39),
  dim: wrap(2, 22),
  bold: wrap(1, 22)
};

module.exports = { colors };
