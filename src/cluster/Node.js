const {
  NodeState,
  MESSAGE_TYPES,
  HEARTBEAT_INTERVAL_TICKS,
  ELECTION_TIMEOUT_MIN,
  ELECTION_TIMEOUT_MAX,
  majorityOf,
} = require('./constants');
const {
  deepCloneJSON,
  getLastIndexTerm,
  isCandidateUpToDate,
  truncateAndAppend,
  computeNewCommitIndex,
  applyEntriesToState,
  lastIndex,
  lastTerm,
} = require('./Log');

class Node {
  constructor({ id, peerIds, bus, timingCfg = {} }) {
    this.id = id;
    this.peerIds = peerIds.filter((p) => p !== id);
    this.bus = bus;

    // Persistent Raft state on all servers
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = []; // entries: { index, term, command }

    // Volatile state on all servers
    this.commitIndex = 0;
    this.lastApplied = 0;
    this.kv = {};

    // Volatile state on leaders
    this.nextIndex = new Map();
    this.matchIndex = new Map();

    // Node status
    this.state = NodeState.FOLLOWER;
    this.knownLeaderId = null;
    this.inbox = [];
    this.alive = true;

    // Timing
    this.heartbeatDueTick = 0;
    this.electionDeadlineTick = 0;
    this.timingCfg = {
      heartbeat: timingCfg.heartbeat || HEARTBEAT_INTERVAL_TICKS,
      electionMin: timingCfg.electionMin || ELECTION_TIMEOUT_MIN,
      electionMax: timingCfg.electionMax || ELECTION_TIMEOUT_MAX,
    };

    this._resetElectionDeadline(0);
    this.bus.registerNode(this.id, (msg) => {
      if (!this.alive) return;
      this.enqueue(msg);
    });
  }

  // Utilities
  _randElectionTimeout() {
    const { electionMin, electionMax } = this.timingCfg;
    const span = Math.max(0, electionMax - electionMin);
    return electionMin + Math.floor(Math.random() * (span + 1));
  }

  _resetElectionDeadline(currentTick) {
    this.electionDeadlineTick = currentTick + this._randElectionTimeout();
  }

  _resetHeartbeatDue(currentTick) {
    this.heartbeatDueTick = currentTick + this.timingCfg.heartbeat;
  }

  _majority() {
    return majorityOf(this.peerIds.length + 1);
  }

  enqueue(msg) {
    this.inbox.push(msg);
  }

  getLocal(key) {
    return Object.prototype.hasOwnProperty.call(this.kv, key) ? deepCloneJSON(this.kv[key]) : null;
  }

  clientSet(key, value) {
    if (!this.alive) throw new Error('Node not alive');
    if (this.state !== NodeState.LEADER) {
      return { redirected: true, leaderId: this.knownLeaderId || null };
    }
    // validate JSON-serializable
    try {
      JSON.stringify(value);
    } catch {
      throw new Error('Value must be JSON-serializable');
    }
    const index = lastIndex(this.log) + 1;
    const entry = { index, term: this.currentTerm, command: { type: 'SET', key, value: deepCloneJSON(value) } };
    this.log.push(entry);
    // Send AppendEntries to followers
    this._replicateToFollowers();
    return { index, term: this.currentTerm };
  }

  clientDelete(key) {
    if (!this.alive) throw new Error('Node not alive');
    if (this.state !== NodeState.LEADER) {
      return { redirected: true, leaderId: this.knownLeaderId || null };
    }
    const index = lastIndex(this.log) + 1;
    const entry = { index, term: this.currentTerm, command: { type: 'DELETE', key } };
    this.log.push(entry);
    this._replicateToFollowers();
    return { index, term: this.currentTerm };
  }

  clientRead(key) {
    if (this.state !== NodeState.LEADER) {
      return { redirected: true, leaderId: this.knownLeaderId || null };
    }
    return { value: this.getLocal(key) };
  }

  kill() {
    this.alive = false;
    // Keep bus registration but ignore deliveries. Optionally unregister:
    // this.bus.unregisterNode(this.id);
  }

  restart({ preserve = true, partialLoss = {} } = {}) {
    this.alive = true;
    if (!preserve) {
      this.currentTerm = 0;
      this.votedFor = null;
      this.log = [];
      this.commitIndex = 0;
      this.lastApplied = 0;
      this.kv = {};
    } else {
      if (typeof partialLoss.truncateIndex === 'number') {
        const truncateIndex = Math.max(0, partialLoss.truncateIndex);
        this.log = this.log.slice(0, truncateIndex);
        if (this.commitIndex > truncateIndex) this.commitIndex = truncateIndex;
        if (this.lastApplied > truncateIndex) this.lastApplied = truncateIndex;
        // Recompute kv by replaying applied entries
        const newKv = {};
        applyEntriesToState(newKv, this.log, 1, this.commitIndex);
        this.kv = newKv;
      }
    }
    this.state = NodeState.FOLLOWER;
    this.knownLeaderId = null;
    this.inbox = [];
    this.nextIndex.clear();
    this.matchIndex.clear();
    // Reset timers
    this._resetElectionDeadline(this.bus.tick);
    this._resetHeartbeatDue(this.bus.tick);
  }

  onTick(currentTick) {
    if (!this.alive) return;

    // 1) Process all inbox messages
    while (this.inbox.length > 0) {
      const msg = this.inbox.shift();
      this._handleMessage(msg, currentTick);
    }

    // 2) State-specific periodic actions
    if (this.state === NodeState.LEADER) {
      if (currentTick >= this.heartbeatDueTick) {
        this._sendHeartbeats();
        this._resetHeartbeatDue(currentTick);
      }
      // Try to advance commit and apply
      this._advanceCommitAndApply();
    } else {
      // Follower/Candidate election timeout
      if (currentTick >= this.electionDeadlineTick) {
        this._startElection(currentTick);
      }
    }

    // 3) Apply committed entries if any lagged behind
    this._applyCommitted();
  }

  _handleMessage(msg, currentTick) {
    const type = msg.type;
    switch (type) {
      case MESSAGE_TYPES.REQUEST_VOTE:
        this._onRequestVote(msg, currentTick);
        break;
      case MESSAGE_TYPES.REQUEST_VOTE_RESPONSE:
        this._onRequestVoteResponse(msg, currentTick);
        break;
      case MESSAGE_TYPES.APPEND_ENTRIES:
        this._onAppendEntries(msg, currentTick);
        break;
      case MESSAGE_TYPES.APPEND_ENTRIES_RESPONSE:
        this._onAppendEntriesResponse(msg, currentTick);
        break;
      default:
        // ignore unknown
        break;
    }
  }

  _becomeFollower(term, leaderId = null, currentTick = 0) {
    this.state = NodeState.FOLLOWER;
    this.currentTerm = term;
    this.votedFor = null;
    this.knownLeaderId = leaderId;
    this.nextIndex.clear();
    this.matchIndex.clear();
    this._resetElectionDeadline(currentTick);
  }

  _becomeLeader(currentTick) {
    this.state = NodeState.LEADER;
    this.knownLeaderId = this.id;
    // Initialize leader volatile state
    const next = lastIndex(this.log) + 1;
    this.peerIds.forEach((pid) => {
      this.nextIndex.set(pid, next);
      this.matchIndex.set(pid, 0);
    });
    this._resetHeartbeatDue(currentTick);
    // Send initial heartbeats to assert leadership
    this._sendHeartbeats();
  }

  _startElection(currentTick) {
    // Convert to candidate
    this.state = NodeState.CANDIDATE;
    this.currentTerm += 1;
    this.votedFor = this.id;
    this.knownLeaderId = null;
    this.votesGranted = 1;

    const { index: lastIdx, term: lastT } = getLastIndexTerm(this.log);
    for (const peer of this.peerIds) {
      this.bus.send({
        type: MESSAGE_TYPES.REQUEST_VOTE,
        from: this.id,
        to: peer,
        term: this.currentTerm,
        lastLogIndex: lastIdx,
        lastLogTerm: lastT,
      });
    }
    // Reset election deadline for potential new election if split vote
    this._resetElectionDeadline(currentTick);
  }

  _onRequestVote(msg, currentTick) {
    const { from, term, lastLogIndex, lastLogTerm } = msg;
    if (term < this.currentTerm) {
      this._sendRequestVoteResponse(from, false);
      return;
    }
    if (term > this.currentTerm) {
      this._becomeFollower(term, null, currentTick);
    }
    const { index: myLastIdx, term: myLastTerm } = getLastIndexTerm(this.log);

    let grant = false;
    const votedThisTerm = this.votedFor && this.votedFor !== from;
    if (!votedThisTerm && isCandidateUpToDate(lastLogIndex, lastLogTerm, myLastIdx, myLastTerm)) {
      grant = true;
      this.votedFor = from;
      this._resetElectionDeadline(currentTick);
    }
    this._sendRequestVoteResponse(from, grant);
  }

  _sendRequestVoteResponse(to, granted) {
    this.bus.send({
      type: MESSAGE_TYPES.REQUEST_VOTE_RESPONSE,
      from: this.id,
      to,
      term: this.currentTerm,
      granted: !!granted,
    });
  }

  _onRequestVoteResponse(msg, currentTick) {
    if (this.state !== NodeState.CANDIDATE) return;
    const { term, granted } = msg;

    if (term > this.currentTerm) {
      this._becomeFollower(term, null, currentTick);
      return;
    }
    if (term < this.currentTerm) return;

    if (granted) {
      this.votesGranted = (this.votesGranted || 0) + 1;
      if (this.votesGranted >= this._majority()) {
        this._becomeLeader(currentTick);
      }
    }
  }

  _onAppendEntries(msg, currentTick) {
    const {
      from,
      term,
      prevLogIndex,
      prevLogTerm,
      entries,
      leaderCommit,
    } = msg;

    if (term < this.currentTerm) {
      this._sendAppendEntriesResponse(from, false, lastIndex(this.log));
      return;
    }

    if (term > this.currentTerm || this.state !== NodeState.FOLLOWER) {
      // Step down on higher term or accept leader if candidate
      this._becomeFollower(term, from, currentTick);
    } else {
      this.knownLeaderId = from;
      this._resetElectionDeadline(currentTick);
    }

    // Consistency check
    if (prevLogIndex > lastIndex(this.log)) {
      this._sendAppendEntriesResponse(from, false, lastIndex(this.log));
      return;
    }
    if (prevLogIndex > 0) {
      const localPrevTerm = this.log[prevLogIndex - 1].term;
      if (localPrevTerm !== prevLogTerm) {
        // Delete conflicting entry and all that follow
        this.log.splice(prevLogIndex - 1);
        this._sendAppendEntriesResponse(from, false, lastIndex(this.log));
        return;
      }
    }

    // Append any new entries (handling overwrites)
    if (entries && entries.length > 0) {
      truncateAndAppend(this.log, prevLogIndex + 1, entries);
    }

    // Update commit index
    if (typeof leaderCommit === 'number' && leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(leaderCommit, lastIndex(this.log));
    }

    this._applyCommitted();

    this._sendAppendEntriesResponse(from, true, lastIndex(this.log));
  }

  _sendAppendEntriesResponse(to, success, matchIndex) {
    this.bus.send({
      type: MESSAGE_TYPES.APPEND_ENTRIES_RESPONSE,
      from: this.id,
      to,
      term: this.currentTerm,
      success: !!success,
      matchIndex: matchIndex || 0,
    });
  }

  _onAppendEntriesResponse(msg, currentTick) {
    if (this.state !== NodeState.LEADER) return;
    const { from, term, success, matchIndex } = msg;

    if (term > this.currentTerm) {
      this._becomeFollower(term, null, currentTick);
      return;
    }
    if (term < this.currentTerm) return;

    if (success) {
      this.matchIndex.set(from, matchIndex);
      this.nextIndex.set(from, matchIndex + 1);
      this._advanceCommitAndApply();
    } else {
      // Back off nextIndex and retry later
      const next = Math.max(1, (this.nextIndex.get(from) || (lastIndex(this.log) + 1)) - 1);
      this.nextIndex.set(from, next);
      // Proactively send a smaller AppendEntries to repair
      this._sendAppendForPeer(from);
    }
  }

  _sendHeartbeats() {
    for (const peer of this.peerIds) {
      this._sendAppendForPeer(peer, true);
    }
  }

  _replicateToFollowers() {
    for (const peer of this.peerIds) {
      this._sendAppendForPeer(peer);
    }
  }

  _sendAppendForPeer(peer, heartbeatOnly = false) {
    const nextIdx = this.nextIndex.get(peer) || (lastIndex(this.log) + 1);
    const prevLogIndex = Math.max(0, nextIdx - 1);
    const prevLogTerm = prevLogIndex === 0 ? 0 : this.log[prevLogIndex - 1].term;
    let entries = [];
    if (!heartbeatOnly) {
      entries = this.log.slice(nextIdx - 1).map((e) => ({
        index: e.index,
        term: e.term,
        command: e.command ? { ...e.command } : null,
      }));
    }
    this.bus.send({
      type: MESSAGE_TYPES.APPEND_ENTRIES,
      from: this.id,
      to: peer,
      term: this.currentTerm,
      prevLogIndex,
      prevLogTerm,
      entries,
      leaderCommit: this.commitIndex,
    });
  }

  _advanceCommitAndApply() {
    // Build matchIndexes including leader itself
    const indexes = [lastIndex(this.log)];
    for (const peer of this.peerIds) {
      indexes.push(this.matchIndex.get(peer) || 0);
    }
    const newCommit = computeNewCommitIndex(this.commitIndex, this.currentTerm, indexes, this.log);
    if (newCommit > this.commitIndex) {
      this.commitIndex = newCommit;
      this._applyCommitted();
      // After new commit, update followers with committed index via heartbeats
      this._sendHeartbeats();
    }
  }

  _applyCommitted() {
    if (this.lastApplied < this.commitIndex) {
      applyEntriesToState(this.kv, this.log, this.lastApplied + 1, this.commitIndex);
      this.lastApplied = this.commitIndex;
    }
  }
}

module.exports = { Node };
