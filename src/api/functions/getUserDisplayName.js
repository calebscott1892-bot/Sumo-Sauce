import { logFn } from './_log';

function looksLikeEmail(value) {
  return typeof value === 'string' && value.includes('@') && value.indexOf('@') > 0;
}

function titleCase(word) {
  const w = String(word || '').trim();
  if (!w) return '';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function fromEmail(email) {
  const raw = String(email || '').trim();
  if (!raw) return 'Unknown User';
  const local = raw.split('@')[0] || '';
  const parts = local.split(/[._-]+/g).filter(Boolean);
  const name = parts.length ? parts.map(titleCase).join(' ') : titleCase(local);
  return name.trim() || 'Unknown User';
}

export function getUserDisplayName(userOrEmailOrId) {
  logFn('getUserDisplayName', 'getUserDisplayName', [userOrEmailOrId]);

  if (looksLikeEmail(userOrEmailOrId)) return fromEmail(userOrEmailOrId);

  if (typeof userOrEmailOrId === 'object' && userOrEmailOrId) {
    const fullName = String(userOrEmailOrId.full_name || '').trim();
    if (fullName) return fullName;

    const username = String(userOrEmailOrId.username || '').trim();
    if (username) return username;

    return 'User';
  }

  if (typeof userOrEmailOrId === 'string' && userOrEmailOrId.trim()) {
    return titleCase(userOrEmailOrId.trim()) || 'User';
  }

  return 'Unknown User';
}

export function getDisplayNameFromEmail(email) {
  logFn('getUserDisplayName', 'getDisplayNameFromEmail', [email]);
  return fromEmail(email);
}
