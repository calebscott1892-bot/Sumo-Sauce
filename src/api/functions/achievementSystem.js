import { logFn } from './_log';
import { keyPrefix } from './_ids';

const PREFIX = keyPrefix();
const KEY = `${PREFIX}forumStats`;

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function readState() {
  if (!hasLocalStorage()) {
    return { topics: {}, users: {} };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { topics: {}, users: {} };
  } catch {
    return { topics: {}, users: {} };
  }
}

function writeState(state) {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export async function updateForumStats({ topicId, userId, deltaReplies, deltaViews } = {}) {
  logFn('achievementSystem', 'updateForumStats', [{ topicId, userId, deltaReplies, deltaViews }]);

  const state = readState();
  const tId = topicId ? String(topicId) : null;
  const uId = userId ? String(userId) : null;
  const dr = Number.isFinite(deltaReplies) ? deltaReplies : 0;
  const dv = Number.isFinite(deltaViews) ? deltaViews : 0;

  if (tId) {
    state.topics[tId] = state.topics[tId] || { replies: 0, views: 0 };
    state.topics[tId].replies += dr;
    state.topics[tId].views += dv;
  }

  if (uId) {
    state.users[uId] = state.users[uId] || { replies: 0, views: 0 };
    state.users[uId].replies += dr;
    state.users[uId].views += dv;
  }

  writeState(state);

  return {
    ok: true,
    stats: {
      topic: tId ? state.topics[tId] : null,
      user: uId ? state.users[uId] : null,
    },
  };
}
