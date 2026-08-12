import { getUserByEmail, createUser } from '../lib/db.js';
import { hashPassword, verifyPassword, signSession, setSessionCookie, clearSessionCookie, getUserFromRequest, publicUser } from '../lib/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One function handling everything auth-related:
//   GET  /api/auth                 -> current user (or null)
//   POST /api/auth?action=register -> create account
//   POST /api/auth?action=login    -> sign in
//   POST /api/auth?action=logout   -> sign out
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const user = await getUserFromRequest(req);
      return res.status(200).json({ user: publicUser(user) });
    } catch (err) {
      console.error('me error', err);
      return res.status(200).json({ user: null });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const action = req.query.action;
  if (action === 'register') return handleRegister(req, res);
  if (action === 'login') return handleLogin(req, res);
  if (action === 'logout') return handleLogout(req, res);
  return res.status(400).json({ error: 'إجراء غير معروف' });
}

async function handleRegister(req, res) {
  try {
    const { name, email, password } = req.body || {};
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: 'أدخل اسمًا صحيحًا' });
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ error: 'أدخل بريدًا إلكترونيًا صحيحًا' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const existing = await getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'هذا البريد الإلكتروني مسجّل بالفعل' });

    const passwordHash = await hashPassword(password);
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const isAdmin = adminEmail && adminEmail === String(email).trim().toLowerCase();

    const user = await createUser({ name: String(name).trim(), email, passwordHash, isAdmin });
    const token = signSession(user.id);
    setSessionCookie(res, token);
    return res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err && err.message === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: 'هذا البريد الإلكتروني مسجّل بالفعل' });
    }
    console.error('register error', err);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع، حاول مرة أخرى' });
  }
}

async function handleLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'أدخل البريد الإلكتروني وكلمة المرور' });
    }
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    const token = signSession(user.id);
    setSessionCookie(res, token);
    return res.status(200).json({ user: publicUser(user) });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع، حاول مرة أخرى' });
  }
}

async function handleLogout(req, res) {
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
