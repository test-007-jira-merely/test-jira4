const DEFAULT_TEST_MATCH = "**/*.test.js";
const DEFAULT_TIMEOUT = 5000;

const DEFAULT_CONFIG = {
  testMatch: DEFAULT_TEST_MATCH,
  testTimeout: DEFAULT_TIMEOUT,
  colors: true,
  reporter: "default", // "default" | "json"
  reporterOptions: {},
  snapshot: {
    update: false
  }
};

module.exports = {
  DEFAULT_TEST_MATCH,
  DEFAULT_TIMEOUT,
  DEFAULT_CONFIG
};
