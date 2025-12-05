/**
 * Constants for the simulated Raft-like cluster.
 * CommonJS module exports to align with Node.js environment.
 */

const NodeState = {
  FOLLOWER: 'Follower',
  CANDIDATE: 'Candidate',
  LEADER: 'Leader',
};

const MESSAGE_TYPES = {
  REQUEST_VOTE: 'REQUEST_VOTE',
  REQUEST_VOTE_RESPONSE: 'REQUEST_VOTE_RESPONSE',
  APPEND_ENTRIES: 'APPEND_ENTRIES',
  APPEND_ENTRIES_RESPONSE: 'APPEND_ENTRIES_RESPONSE',
};

const HEARTBEAT_INTERVAL_TICKS = 5;
const ELECTION_TIMEOUT_MIN = 10;
const ELECTION_TIMEOUT_MAX = 20;

function majorityOf(n) {
  return Math.floor(n / 2) + 1;
}

module.exports = {
  NodeState,
  MESSAGE_TYPES,
  HEARTBEAT_INTERVAL_TICKS,
  ELECTION_TIMEOUT_MIN,
  ELECTION_TIMEOUT_MAX,
  majorityOf,
};
