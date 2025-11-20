# test-js

A minimal JavaScript testing framework implemented in pure JS with:
- describe/it/test lifecycle and hooks (beforeAll, beforeEach, afterAll, afterEach)
- Assertions (toBe, toEqual, toBeTruthy, toBeFalsy, toContain, toThrow, numeric comparators)
- Async support (Promises and done callback)
- Mocks and Spies (fn, spyOn)
- Test discovery by glob pattern
- Reporters: default (colored) and JSON

## Usage

- Place tests anywhere under the repository; by default it discovers **/*.test.js.
- Run the CLI:

node ./test-js/bin/test-js.js

## Configuration

Create test.config.json at repo root (or test-js/test.config.json) with:

{
  "testMatch": "**/*.test.js",
  "testTimeout": 5000,
  "colors": true,
  "reporter": "default",
  "reporterOptions": {}
}

Env:
- UPDATE_SNAPSHOTS=true to enable snapshot updates (stub; snapshots not implemented yet).

## Example

See ./test-js/examples/script.test.js for examples.
