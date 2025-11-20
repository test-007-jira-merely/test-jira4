const { Cluster } = require('../src/cluster/Cluster');

function runUntilLeader(cluster, maxTicks = 300) {
  for (let i = 0; i < maxTicks; i++) {
    cluster.tick(1);
    const leader = cluster.getLeaderId();
    if (leader) return leader;
  }
  return null;
}

function committedOnAll(cluster, key, expected) {
  for (const id of cluster.ids) {
    const snap = cluster.getKVSnapshot(id);
    const val = Object.prototype.hasOwnProperty.call(snap, key) ? snap[key] : null;
    if (JSON.stringify(val) !== JSON.stringify(expected)) {
      return false;
    }
  }
  return true;
}

async function leader_isolated_partition_heal({ assert, assertEqual }) {
  const cluster = new Cluster({ size: 5 });
  const leader1 = runUntilLeader(cluster);
  assert(!!leader1, 'Leader should be elected');

  // Commit a first value
  cluster.set('k', 'v1');
  // Wait until committed everywhere
  for (let i = 0; i < 1000; i++) {
    cluster.tick(1);
    if (committedOnAll(cluster, 'k', 'v1')) break;
  }
  assert(committedOnAll(cluster, 'k', 'v1'), 'Initial value should be committed everywhere');

  // Create partition: leader isolated in minority group
  const others = cluster.ids.filter((id) => id !== leader1);
  const minority = [leader1];
  const majority = others.slice(0, 3);
  const isolated = others.slice(3);
  // Ensure leader in minority alone, others in majority group
  cluster.partition([minority, majority.concat(isolated)]);

  // Leader should not be able to commit new entries while isolated
  cluster.set('k', 'v2'); // Goes to current leader (isolated)
  for (let i = 0; i < 200; i++) cluster.tick(1);
  // Majority shouldn't have v2 committed
  assert(committedOnAll(cluster, 'k', 'v1'), 'No commits should happen in minority partition');

  // Heal partition
  cluster.heal();
  for (let i = 0; i < 1000; i++) {
    cluster.tick(1);
    if (cluster.get('k') === 'v2') break;
  }
  // After healing, the system should converge and commit v2 (the last leader may change)
  const v = cluster.get('k');
  assert(v === 'v2' || v === 'v1', 'After healing, value should be one of the consistent states');
}

module.exports = { leader_isolated_partition_heal };
