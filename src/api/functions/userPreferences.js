import { logFn } from './_log';
import { keyPrefix } from './_ids';

const PREFIX = keyPrefix();

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function storageKey(userId = 'default') {
  return `${PREFIX}prefs:${userId}`;
}

function readJson(key, fallback) {
  if (!hasLocalStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

function defaults() {
  return {
    schemaVersion: 1,
    followedWrestlers: [],
    widgets: {},
    notificationSettings: {
      enabled: true,
      types: {
        tournament_update: true,
        league_invitation: true,
        prediction_closing: true,
        match_result: true,
        forum_reply: true,
        achievement_unlocked: true,
      },
    },
  };
}

function normalize(prefs) {
  const base = defaults();
  if (!prefs || typeof prefs !== 'object') return base;

  return {
    ...base,
    ...prefs,
    followedWrestlers: Array.isArray(prefs.followedWrestlers) ? prefs.followedWrestlers : base.followedWrestlers,
    widgets: prefs.widgets && typeof prefs.widgets === 'object' ? prefs.widgets : base.widgets,
    notificationSettings:
      prefs.notificationSettings && typeof prefs.notificationSettings === 'object'
        ? { ...base.notificationSettings, ...prefs.notificationSettings }
        : base.notificationSettings,
  };
}

export async function getUserPreferences(userId = 'default') {
  logFn('userPreferences', 'getUserPreferences', [userId]);
  const key = storageKey(userId);
  return normalize(readJson(key, defaults()));
}

export async function saveUserPreferences(prefs, userId = 'default') {
  logFn('userPreferences', 'saveUserPreferences', [prefs, userId]);
  const key = storageKey(userId);
  const next = normalize({ ...(await getUserPreferences(userId)), ...(prefs || {}) });
  writeJson(key, next);
  return next;
}

export async function toggleFollowWrestler(wrestlerId, userId = 'default') {
  logFn('userPreferences', 'toggleFollowWrestler', [wrestlerId, userId]);
  const prefs = await getUserPreferences(userId);
  const id = String(wrestlerId || '').trim();
  if (!id) return prefs;

  const set = new Set(prefs.followedWrestlers || []);
  if (set.has(id)) set.delete(id);
  else set.add(id);

  return saveUserPreferences({ followedWrestlers: Array.from(set) }, userId);
}

export async function toggleWidget(widgetKey, userId = 'default') {
  logFn('userPreferences', 'toggleWidget', [widgetKey, userId]);
  const prefs = await getUserPreferences(userId);
  const key = String(widgetKey || '').trim();
  if (!key) return prefs;

  const widgets = { ...(prefs.widgets || {}) };
  widgets[key] = !widgets[key];
  return saveUserPreferences({ widgets }, userId);
}

export async function updateNotificationSettings(settings, userId = 'default') {
  logFn('userPreferences', 'updateNotificationSettings', [settings, userId]);
  const prefs = await getUserPreferences(userId);
  const next = {
    ...prefs.notificationSettings,
    ...(settings && typeof settings === 'object' ? settings : {}),
  };
  return saveUserPreferences({ notificationSettings: next }, userId);
}
