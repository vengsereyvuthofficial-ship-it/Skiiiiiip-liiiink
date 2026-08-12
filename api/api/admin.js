import { requireAdmin } from '../lib/auth.js';
import {
  getSettings, saveSettings, DEFAULT_SETTINGS,
  getStats, listPendingWithdrawals, getWithdrawal, saveWithdrawal,
  removeFromPending, getUserById, saveUser
} from '../lib/db.js';

// One function handling everything admin-related:
//   GET/POST /api/admin?resource=settings
//   GET      /api/admin?resource=stats
//   GET/POST /api/admin?resource=withdrawals
export default async function handler(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const resource = req.query.resource;
  if (resource === 'settings') return handleSettings(req, res);
  if (resource === 'stats') return handleStats(req, res);
  if (resource === 'withdrawals') return handleWithdrawals(req, res);
  return res.status(400).json({ error: 'مورد غير معروف' });
}

async function handleSettings(req, res) {
  if (req.method === 'GET') {
    const settings = await getSettings();
    return res.status(200).json({ settings });
  }
  if (req.method === 'POST') {
    const body = req.body || {};
    const settings = {
      cpm: clampNumber(body.cpm, 0, 1000, DEFAULT_SETTINGS.cpm),
      adsPerVisit: clampNumber(body.adsPerVisit, 1, 10, DEFAULT_SETTINGS.adsPerVisit),
      userSharePct: clampNumber(body.userSharePct, 0, 100, DEFAULT_SETTINGS.userSharePct),
      minWithdraw: clampNumber(body.minWithdraw, 0, 100000, DEFAULT_SETTINGS.minWithdraw),
      stageSeconds: clampNumber(body.stageSeconds, 5, 300, DEFAULT_SETTINGS.stageSeconds)
    };
    await saveSettings(settings);
    return res.status(200).json({ ok: true, settings });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
function clampNumber(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

async function handleStats(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const stats = await getStats();
  const pending = await listPendingWithdrawals();
  return res.status(200).json({ ...stats, pendingWithdrawalsCount: pending.length });
}

async function handleWithdrawals(req, res) {
  if (req.method === 'GET') {
    const withdrawals = await listPendingWithdrawals();
    return res.status(200).json({ withdrawals });
  }
  if (req.method === 'POST') {
    const { id, action } = req.body || {};
    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'بيانات غير صحيحة' });
    }
    const w = await getWithdrawal(id);
    if (!w) return res.status(404).json({ error: 'طلب السحب غير موجود' });
    if (w.status !== 'pending') return res.status(400).json({ error: 'تم التعامل مع هذا الطلب مسبقًا' });

    if (action === 'approve') {
      w.status = 'paid';
    } else {
      w.status = 'rejected';
      const owner = await getUserById(w.userId);
      if (owner) {
        owner.balance += w.amount;
        await saveUser(owner);
      }
    }
    await saveWithdrawal(w);
    await removeFromPending(id);
    return res.status(200).json({ ok: true, withdrawal: w });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
