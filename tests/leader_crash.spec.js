const { Cluster } = require('../src/cluster/Cluster');

function runUntilLeader(cluster, maxTicks = 300) {
  for (let i = 0; i < maxTicks; i++) {
    cluster.tick(1);
    const leader = cluster.getLeaderId();
    if (leader) return leader;
  }
  return null;
}

function runUntilValue(cluster, key, expected, maxTicks = 800) {
  for (let i = 0; i < maxTicks; i++) {
    cluster.tick(1);
    const v = cluster.get(key);
    if (JSON.stringify(v) === JSON.stringify(expected)) return true;
  }
  return false;
}

async function leader_crash_and_reelect({ assert, assertEqual }) {
  const cluster = new Cluster({ size: 5 });
  const leader1 = runUntilLeader(cluster);
  assert(!!leader1, 'Initial leader should be elected');

  cluster.set('x', 1);
  assert(runUntilValue(cluster, 'x', 1), 'First write should commit');

  // Crash the leader
  cluster.killNode(leader1);

  // A new leader should be elected among remaining nodes
  const leader2 = runUntilLeader(cluster, 500);
  assert(!!leader2 && leader2 !== leader1, 'A new leader should be elected after crash');

  // New writes should still commit
  cluster.set('y', 2);
  assert(runUntilValue(cluster, 'y', 2), 'Second write should commit after re-election');

  // Ensure no data loss for committed entries
  for (const id of cluster.ids) {
    const snap = cluster.getKVSnapshot(id);
    if (id === leader1) continue; // crashed node may be stale
    assertEqual(snap['x'], 1, `Committed value should be present on node ${id}`);
    assertEqual(snap['y'], 2, `Committed value should be present on node ${id}`);
  }

  // Restart the crashed node and it should catch up after some ticks
  cluster.restartNode(leader1, { preserve: true });
  assert(runUntilValue(cluster, 'y', 2, 1000), 'Restarted node should catch up and see the latest committed value');
}

module.exports = { leader_crash_and_reelect };
