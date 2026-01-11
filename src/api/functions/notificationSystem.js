import { logFn } from './_log';
import { nextId, keyPrefix, nowIso } from './_ids';

const PREFIX = keyPrefix();
const KEY = `${PREFIX}notifications`;

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function readAll() {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function pushNotification(notification) {
  const list = readAll();
  list.unshift(notification);
  // Keep bounded for UI.
  const next = list.slice(0, 200);
  writeAll(next);
  return notification;
}

function makeNotification({ type, title, body, meta }) {
  return {
    id: nextId('notif'),
    type: type || 'generic',
    title: title || 'Notification',
    body: body || '',
    createdAt: nowIso(),
    readAt: null,
    meta: meta && typeof meta === 'object' ? meta : {},
  };
}

export async function notifyForumReply({ topicId, replyId, toUserId } = {}) {
  logFn('notificationSystem', 'notifyForumReply', [{ topicId, replyId, toUserId }]);
  const n = makeNotification({
    type: 'forum_reply',
    title: 'New forum reply',
    body: 'Someone replied to a topic you follow.',
    meta: { topicId, replyId, toUserId },
  });
  return pushNotification(n);
}

export async function notifyPredictionClosing({ leagueId, tournamentId } = {}) {
  logFn('notificationSystem', 'notifyPredictionClosing', [{ leagueId, tournamentId }]);
  const n = makeNotification({
    type: 'prediction_closing',
    title: 'Predictions closing soon',
    body: 'Submit your picks before the deadline.',
    meta: { leagueId, tournamentId },
  });
  return pushNotification(n);
}

export async function notifyMatchResult({ matchId, winnerId } = {}) {
  logFn('notificationSystem', 'notifyMatchResult', [{ matchId, winnerId }]);
  const n = makeNotification({
    type: 'match_result',
    title: 'Match result posted',
    body: 'A match result is available.',
    meta: { matchId, winnerId },
  });
  return pushNotification(n);
}

export async function markNotificationAsRead(notificationId) {
  logFn('notificationSystem', 'markNotificationAsRead', [notificationId]);
  const id = String(notificationId || '').trim();
  if (!id) return { ok: true, updated: 0 };

  const list = readAll();
  let updated = 0;
  const next = list.map((n) => {
    if (n && n.id === id && !n.readAt) {
      updated += 1;
      return { ...n, readAt: nowIso() };
    }
    return n;
  });

  writeAll(next);
  return { ok: true, updated };
}

export async function markAllAsRead(_maybeRecipient) {
  logFn('notificationSystem', 'markAllAsRead', [_maybeRecipient]);
  const list = readAll();
  let updated = 0;
  const next = list.map((n) => {
    if (n && !n.readAt) {
      updated += 1;
      return { ...n, readAt: nowIso() };
    }
    return n;
  });

  writeAll(next);
  return { ok: true, updated };
}
