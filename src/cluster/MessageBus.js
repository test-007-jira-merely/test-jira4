/**
 * In-memory message bus with tick-based delivery, partitions, delays, and drops.
 *
 * Nodes register with an id and a deliver function (enqueue).
 * Messages are plain JS objects with { type, from, to, ... }.
 */

class MessageBus {
  constructor() {
    this.tick = 0;
    this.nodes = new Map(); // id -> { deliver: fn }
    this.pending = []; // [{ deliverTick, msg }]
    this.dropRules = new Set(); // functions (msg) => boolean
    this.defaultDelay = { min: 0, max: 0 };
    this.partitions = null; // Map<id, groupId> or null
  }

  registerNode(id, deliverFn) {
    this.nodes.set(id, { deliver: deliverFn });
  }

  unregisterNode(id) {
    this.nodes.delete(id);
  }

  setDefaultDelay(range) {
    this.defaultDelay = { ...range };
  }

  addDropRule(ruleFn) {
    this.dropRules.add(ruleFn);
  }

  clearDropRules() {
    this.dropRules.clear();
  }

  partition(groups) {
    // groups: array of arrays of node ids
    const map = new Map();
    groups.forEach((grp, i) => grp.forEach((id) => map.set(id, i)));
    this.partitions = map;
  }

  heal() {
    this.partitions = null;
  }

  _inSamePartition(a, b) {
    if (!this.partitions) return true;
    return this.partitions.get(a) === this.partitions.get(b);
  }

  _shouldDrop(msg) {
    for (const rule of this.dropRules) {
      try {
        if (rule(msg)) return true;
      } catch {
        // ignore faulty drop rules
      }
    }
    if (!this._inSamePartition(msg.from, msg.to)) return true;
    return false;
  }

  _randDelay() {
    const { min, max } = this.defaultDelay;
    if (max <= min) return min || 0;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  send(msg, opts = {}) {
    const base = typeof opts.delayTicks === 'number' ? opts.delayTicks : this._randDelay();
    const deliverTick = this.tick + Math.max(0, base);
    this.pending.push({ deliverTick, msg: { ...msg } });
  }

  advanceTick() {
    this.tick += 1;
    this._deliverDue();
    return this.tick;
  }

  _deliverDue() {
    if (this.pending.length === 0) return;
    // Partition by due
    const due = [];
    const future = [];
    for (const item of this.pending) {
      if (item.deliverTick <= this.tick) due.push(item);
      else future.push(item);
    }
    // Optional reordering: shuffle due
    for (let i = due.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [due[i], due[j]] = [due[j], due[i]];
    }
    for (const { msg } of due) {
      if (this._shouldDrop(msg)) continue;
      const target = this.nodes.get(msg.to);
      if (target && typeof target.deliver === 'function') {
        try {
          target.deliver(msg);
        } catch {
          // Swallow node delivery errors to avoid halting the bus
        }
      }
    }
    this.pending = future;
  }
}

module.exports = { MessageBus };
