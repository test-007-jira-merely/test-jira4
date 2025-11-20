const { Cluster } = require('../src/cluster/Cluster');
const { NodeState } = require('../src/cluster/constants');

function runUntilLeader(cluster, maxTicks = 200) {
  for (let i = 0; i < maxTicks; i++) {
    cluster.tick(1);
    const leader = cluster.getLeaderId();
    if (leader) return leader;
  }
  return null;
}

function runUntilCommitted(cluster, key, expected, maxTicks = 500) {
  for (let i = 0; i < maxTicks; i++) {
    cluster.tick(1);
    const v = cluster.get(key);
    if (JSON.stringify(v) === JSON.stringify(expected)) return true;
  }
  return false;
}

async function basic_flow({ assert, assertEqual }) {
  const cluster = new Cluster({ size: 5 });
  const leaderId = runUntilLeader(cluster);
  assert(!!leaderId, 'Leader should be elected');

  // Before any write, missing key returns null
  assertEqual(cluster.get('user:1'), null, 'missing key should return null');

  // Write and commit
  cluster.set('user:1', { name: 'Alice' });

  const committed = runUntilCommitted(cluster, 'user:1', { name: 'Alice' });
  assert(committed, 'Write should commit and be readable');

  // Value should appear on all nodes' committed state
  for (const id of cluster.ids) {
    const snap = cluster.getKVSnapshot(id);
    assertEqual(snap['user:1'], { name: 'Alice' }, `Node ${id} should have the committed value`);
  }

  // Delete and commit
  cluster.delete('user:1');
  const deleted = runUntilCommitted(cluster, 'user:1', null);
  assert(deleted, 'Delete should commit and be visible as null on read');

  // Check final kv across nodes
  for (const id of cluster.ids) {
    const snap = cluster.getKVSnapshot(id);
    assert(!('user:1' in snap), `Node ${id} should not contain deleted key`);
  }
}

module.exports = { basic_flow };
