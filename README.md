Simulated Distributed Key-Value Store (Raft-like)
=================================================

Overview
- Pure JS, CommonJS modules, Node >= 18.
- No real network: tick-based MessageBus with delay/drop/partition simulation.
- Minimal Raft subset: leader election, heartbeats, log replication, majority commit.
- Client API via Cluster: set(key, value), delete(key), get(key), tick(n), partition(groups), heal(), killNode(id), restartNode(id).
- Values must be JSON-serializable. get() returns null for missing keys.

Layout
- src/cluster/constants.js: enums and timing
- src/cluster/MessageBus.js: bus with per-node inboxes and tick delivery
- src/cluster/Log.js: log and state-machine helpers
- src/cluster/Node.js: node behavior (Follower/Candidate/Leader)
- src/cluster/Cluster.js: client-facing façade and simulation controls
- tests/: custom runner and specs
- examples/cluster-demo.js: quick demo

Usage
- npm not required. Run:
  - node tests/runner.js
  - node examples/cluster-demo.js

Testing
- tests/basic.spec.js: basic write/read/delete and replication
- tests/leader_crash.spec.js: leader crash and re-election
- tests/partition.spec.js: isolate leader, heal, and converge

Notes
- Election timeout randomized (10–20 ticks). Heartbeats every 5 ticks.
- Commit only advances for entries in current term.
- Followers apply entries only up to commitIndex.
- Restart with preserve=true keeps log and commitIndex; optional partialLoss.truncateIndex supports truncation scenarios.
