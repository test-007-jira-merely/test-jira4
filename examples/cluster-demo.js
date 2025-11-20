const { Cluster } = require('../src/cluster/Cluster');

const cluster = new Cluster({ size: 5 });

function waitForLeader(maxTicks = 200) {
  for (let i = 0; i < maxTicks; i++) {
    cluster.tick(1);
    const leader = cluster.getLeaderId();
    if (leader) return leader;
  }
  return null;
}

const leaderId = waitForLeader();
console.log('Leader elected:', leaderId);

cluster.set('user:1', { name: 'Alice' });
for (let i = 0; i < 200; i++) cluster.tick(1);

console.log('Committed read user:1 =', cluster.get('user:1'));

console.log('Commit indexes:', cluster.getCommitIndexes());
for (const id of cluster.ids) {
  console.log(id, cluster.getKVSnapshot(id));
}
