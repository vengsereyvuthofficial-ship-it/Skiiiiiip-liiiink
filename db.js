import { Redis } from '@upstash/redis';

// Redis.fromEnv() reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
// (or the legacy KV_REST_API_URL / KV_REST_API_TOKEN names) automatically.
export const redis = Redis.fromEnv();

export const DEFAULT_SETTINGS = {
  cpm: 3,            // $ per 1000 ad impressions (blended average)
  adsPerVisit: 4,     // one ad per skip stage
  userSharePct: 65,   // % of revenue paid to the link owner
  minWithdraw: 5,      // $ minimum withdrawal
  stageSeconds: 30     // seconds per skip stage
};

const CODE_CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function randomCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

async function getJSON(key) {
  const raw = await redis.get(key);
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw; // in case the client already deserialized it
  try { return JSON.parse(raw); } catch { return null; }
}
async function setJSON(key, value) {
  await redis.set(key, JSON.stringify(value));
}

/* ---------------- Users ---------------- */
export async function getUserById(id) {
  if (!id) return null;
  return getJSON('user:' + id);
}
export async function getUserByEmail(email) {
  const norm = String(email).trim().toLowerCase();
  const id = await redis.get('useremail:' + norm);
  if (!id) return null;
  return getUserById(id);
}
export async function createUser({ name, email, passwordHash, isAdmin }) {
  const norm = String(email).trim().toLowerCase();
  const existingId = await redis.get('useremail:' + norm);
  if (existingId) throw new Error('EMAIL_TAKEN');
  const user = {
    id: randomId('u'),
    name,
    email: norm,
    passwordHash,
    isAdmin: !!isAdmin,
    balance: 0,
    totalEarned: 0,
    wallet: { type: '', address: '' },
    createdAt: new Date().toISOString()
  };
  await setJSON('user:' + user.id, user);
  await redis.set('useremail:' + norm, user.id);
  await redis.incr('platform:totalUsers');
  return user;
}
export async function saveUser(user) {
  await setJSON('user:' + user.id, user);
}

/* ---------------- Links ---------------- */
export async function createLink({ ownerId, longUrl }) {
  let code = randomCode(6);
  for (let i = 0; i < 5; i++) {
    const taken = await redis.get('linkcode:' + code);
    if (!taken) break;
    code = randomCode(6);
  }
  const link = {
    id: randomId('l'),
    ownerId,
    longUrl,
    code,
    clicks: 0,
    earnings: 0,
    createdAt: new Date().toISOString()
  };
  await setJSON('link:' + link.id, link);
  await redis.set('linkcode:' + code, link.id);
  await redis.sadd('userlinks:' + ownerId, link.id);
  await redis.incr('platform:totalLinks');
  return link;
}
export async function getLinkById(id) {
  if (!id) return null;
  return getJSON('link:' + id);
}
export async function getLinkByCode(code) {
  const id = await redis.get('linkcode:' + String(code).trim());
  if (!id) return null;
  return getLinkById(id);
}
export async function saveLink(link) {
  await setJSON('link:' + link.id, link);
}
export async function listUserLinks(userId) {
  const ids = await redis.smembers('userlinks:' + userId);
  if (!ids || ids.length === 0) return [];
  const links = await Promise.all(ids.map((id) => getLinkById(id)));
  return links.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/* ---------------- Withdrawals ---------------- */
export async function createWithdrawal({ userId, userName, amount, wallet, address }) {
  const w = {
    id: randomId('w'),
    userId,
    userName,
    amount,
    wallet,
    address,
    status: 'pending',
    date: new Date().toISOString().slice(0, 10)
  };
  await setJSON('withdrawal:' + w.id, w);
  await redis.sadd('userwithdrawals:' + userId, w.id);
  await redis.sadd('pendingwithdrawals', w.id);
  return w;
}
export async function getWithdrawal(id) {
  return getJSON('withdrawal:' + id);
}
export async function saveWithdrawal(w) {
  await setJSON('withdrawal:' + w.id, w);
}
export async function listUserWithdrawals(userId) {
  const ids = await redis.smembers('userwithdrawals:' + userId);
  if (!ids || ids.length === 0) return [];
  const items = await Promise.all(ids.map((id) => getWithdrawal(id)));
  return items.filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function listPendingWithdrawals() {
  const ids = await redis.smembers('pendingwithdrawals');
  if (!ids || ids.length === 0) return [];
  const items = await Promise.all(ids.map((id) => getWithdrawal(id)));
  return items.filter(Boolean).sort((a, b) => (a.date < b.date ? 1 : -1));
}
export async function removeFromPending(id) {
  await redis.srem('pendingwithdrawals', id);
}

/* ---------------- Platform settings & stats ---------------- */
export async function getSettings() {
  const s = await getJSON('platform:settings');
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}
export async function saveSettings(settings) {
  await setJSON('platform:settings', settings);
}
export async function getStats() {
  const [totalUsers, totalLinks, totalPaidOut] = await Promise.all([
    redis.get('platform:totalUsers'),
    redis.get('platform:totalLinks'),
    redis.get('platform:totalPaidOut')
  ]);
  return {
    totalUsers: Number(totalUsers) || 0,
    totalLinks: Number(totalLinks) || 0,
    totalPaidOut: Number(totalPaidOut) || 0
  };
}
export async function addToPaidOut(amount) {
  const current = Number(await redis.get('platform:totalPaidOut')) || 0;
  await redis.set('platform:totalPaidOut', current + amount);
}
