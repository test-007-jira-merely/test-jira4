const { MessageBus } = require('./MessageBus');
const { Node } = require('./Node');
const { NodeState } = require('./constants');

class Cluster {
  constructor({ size = 5, ids = null, timingCfg = {} } = {}) {
    this.size = size;
    this.ids = ids || Array.from({ length: size }, (_, i) => `n${i + 1}`);
    this.bus = new MessageBus();
    this.nodes = new Map();

    const peerMap = new Map();
    for (const id of this.ids) {
      peerMap.set(id, this.ids.filter((x) => x !== id));
    }

    for (const id of this.ids) {
      const node = new Node({
        id,
        peerIds: peerMap.get(id),
        bus: this.bus,
        timingCfg,
      });
      this.nodes.set(id, node);
    }
  }

  getLeaderId() {
    for (const [id, node] of this.nodes) {
      if (node.alive && node.state === NodeState.LEADER) return id;
    }
    return null;
  }

  getNodeState(id) {
    return this.nodes.get(id)?.state || null;
  }

  getCommitIndexes() {
    const res = {};
    for (const [id, node] of this.nodes) {
      res[id] = node.commitIndex;
    }
    return res;
  }

  getKVSnapshot(id) {
    const node = this.nodes.get(id);
    if (!node) return null;
    // Deep clone
    return JSON.parse(JSON.stringify(node.kv));
    }

  // Client API
  set(key, value) {
    const leaderId = this.getLeaderId();
    if (!leaderId) throw new Error('No leader available');
    const leader = this.nodes.get(leaderId);
    return leader.clientSet(key, value);
  }

  delete(key) {
    const leaderId = this.getLeaderId();
    if (!leaderId) throw new Error('No leader available');
    const leader = this.nodes.get(leaderId);
    return leader.clientDelete(key);
  }

  get(key) {
    const leaderId = this.getLeaderId();
    if (!leaderId) return null;
    const leader = this.nodes.get(leaderId);
    const res = leader.clientRead(key);
    if (res && typeof res === 'object' && 'value' in res) return res.value;
    return null;
  }

  // Simulation control
  tick(n = 1) {
    for (let i = 0; i < n; i++) {
      const t = this.bus.advanceTick();
      for (const node of this.nodes.values()) {
        node.onTick(t);
      }
    }
  }

  runTicks(n) {
    this.tick(n);
  }

  partition(groups) {
    this.bus.partition(groups);
  }

  heal() {
    this.bus.heal();
  }

  killNode(id) {
    const n = this.nodes.get(id);
    if (n) n.kill();
  }

  restartNode(id, opts = {}) {
    const n = this.nodes.get(id);
    if (n) n.restart(opts);
  }

  introduceDelay(range) {
    this.bus.setDefaultDelay(range);
  }

  addDropRule(fn) {
    this.bus.addDropRule(fn);
  }

  clearDropRules() {
    this.bus.clearDropRules();
  }
}

module.exports = { Cluster };
