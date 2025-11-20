/**
 * Log and state-machine helpers for the simulated Raft-like protocol.
 */

function deepCloneJSON(value) {
  // Enforce JSON-serializable payloads, defensive copy to avoid mutation leaks.
  return JSON.parse(JSON.stringify(value));
}

function lastIndex(log) {
  return log.length;
}

function lastTerm(log) {
  if (log.length === 0) return 0;
  return log[log.length - 1].term;
}

function getLastIndexTerm(log) {
  return { index: lastIndex(log), term: lastTerm(log) };
}

function isCandidateUpToDate(candidateLastIndex, candidateLastTerm, followerLastIndex, followerLastTerm) {
  if (candidateLastTerm !== followerLastTerm) {
    return candidateLastTerm > followerLastTerm;
  }
  return candidateLastIndex >= followerLastIndex;
}

/**
 * Truncate the log at fromIndex-1 and append entries.
 * @param {Array} log - existing log (mutated)
 * @param {number} fromIndex - index to start applying new entries
 * @param {Array} entries - new entries (with absolute indices)
 */
function truncateAndAppend(log, fromIndex, entries) {
  if (fromIndex <= log.length) {
    log.splice(fromIndex - 1);
  }
  for (const e of entries) {
    log.push({ index: e.index, term: e.term, command: e.command ? deepCloneJSON(e.command) : null });
  }
}

/**
 * Advance commit index based on matchIndexes for current term.
 * Returns new commit index or existing if cannot advance.
 */
function computeNewCommitIndex(currentCommitIndex, currentTerm, matchIndexes, log) {
  // Sort a copy descending
  const sorted = [...matchIndexes].sort((a, b) => b - a);
  // Majority position
  const majorityPos = Math.floor(sorted.length / 2);
  const candidate = sorted[majorityPos];
  if (!candidate) return currentCommitIndex;
  if (candidate > currentCommitIndex) {
    const entry = log[candidate - 1];
    if (entry && entry.term === currentTerm) {
      return candidate;
    }
  }
  return currentCommitIndex;
}

function applyEntriesToState(kv, log, fromIndex, toIndex) {
  for (let i = fromIndex; i <= toIndex; i++) {
    const entry = log[i - 1];
    if (!entry || !entry.command) continue;
    const { type, key, value } = entry.command;
    if (type === 'SET') {
      kv[key] = value === undefined ? null : deepCloneJSON(value);
    } else if (type === 'DELETE') {
      delete kv[key];
    }
  }
}

module.exports = {
  deepCloneJSON,
  getLastIndexTerm,
  isCandidateUpToDate,
  truncateAndAppend,
  computeNewCommitIndex,
  applyEntriesToState,
  lastIndex,
  lastTerm,
};
