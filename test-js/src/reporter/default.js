const { colors } = require("./colors");
const { cleanStack } = require("../util/stack");

function formatDuration(ms) {
  return `${ms} ms`;
}

function printResults(allFiles, config) {
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  for (const file of allFiles) {
    totalDuration += file.durationMs;
    for (const t of file.tests) {
      const status = t.status;
      if (status === "passed") totalPassed++;
      else if (status === "failed") totalFailed++;
      else totalSkipped++;

      let symbol = "•";
      if (status === "passed") symbol = colors.green("✓", config.colors);
      else if (status === "failed") symbol = colors.red("✗", config.colors);
      else symbol = colors.yellow("○", config.colors);

      const name = t.fullName || t.name;
      const line = `${symbol} ${name} ${colors.dim(formatDuration(t.durationMs || 0), config.colors)}`;
      console.log(line);
      if (status === "failed" && t.error) {
        const errMsg = (t.error && t.error.message) || String(t.error);
        console.log(colors.red(`  Error: ${errMsg}`, config.colors));
        if (t.error && t.error.stack) {
          console.log(colors.dim(cleanStack(t.error.stack).split("\n").map(l => "  " + l).join("\n"), config.colors));
        }
      }
    }
  }

  const summary = `${colors.bold("Summary:", config.colors)} ${colors.green(`${totalPassed} passed`, config.colors)}, ${colors.red(`${totalFailed} failed`, config.colors)}, ${colors.yellow(`${totalSkipped} skipped`, config.colors)} ${colors.dim(`(${formatDuration(totalDuration)})`, config.colors)}`;
  console.log("");
  console.log(summary);
}

module.exports = { printResults };
