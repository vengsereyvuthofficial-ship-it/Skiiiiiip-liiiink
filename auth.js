import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserById } from './db.js';

const COOKIE_NAME = 'linkora_session';
const JWT_EXPIRES_IN = '30d';

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signSession(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ uid: userId }, secret, { expiresIn: JWT_EXPIRES_IN });
}
export function verifySession(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try { return jwt.verify(token, secret); }
  catch { return null; }
}

export function parseCookies(req) {
  const header = req.headers && req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

export function setSessionCookie(res, token) {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const parts = [`${COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
export function clearSessionCookie(res) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  res.setHeader('Set-Cookie', parts.join('; '));
}

export async function getUserFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload || !payload.uid) return null;
  return getUserById(payload.uid);
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function requireAuth(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    return null;
  }
  return user;
}
export async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (!user.isAdmin) {
    res.status(403).json({ error: 'هذا القسم مخصص لمالك المنصة فقط' });
    return null;
  }
  return user;
}
