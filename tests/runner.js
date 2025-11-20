const fs = require('fs');
const path = require('path');

function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`AssertEqual failed${msg ? `: ${msg}` : ''}\nExpected: ${e}\nActual:   ${a}`);
  }
}

async function run() {
  const testsDir = path.join(process.cwd(), 'tests');
  const files = fs
    .readdirSync(testsDir)
    .filter((f) => f.endsWith('.spec.js'))
    .map((f) => path.join(testsDir, f));

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const spec = require(file);
    const cases = typeof spec === 'function' ? [spec] : Object.values(spec).filter((fn) => typeof fn === 'function');
    for (const testFn of cases) {
      const name = testFn.name || path.basename(file);
      try {
        await testFn({ assert, assertEqual });
        console.log(`✓ ${name}`);
        passed += 1;
      } catch (err) {
        console.error(`✗ ${name}`);
        console.error(err && err.stack ? err.stack : err);
        failed += 1;
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();
