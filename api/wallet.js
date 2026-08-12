import { requireAuth } from '../lib/auth.js';
import { saveUser } from '../lib/db.js';

const PATTERNS = {
  'BTC': /^(bc1|[13])[a-km-zA-HJ-NP-Z0-9]{25,39}$/,
  'ETH': /^0x[a-fA-F0-9]{40}$/,
  'USDT-TRC20': /^T[a-zA-Z0-9]{33}$/,
  'USDT-BEP20': /^0x[a-fA-F0-9]{40}$/,
  'TRX': /^T[a-zA-Z0-9]{33}$/
};
const VALID_TYPES = Object.keys(PATTERNS);

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    return res.status(200).json({ wallet: user.wallet || { type: '', address: '' } });
  }

  if (req.method === 'POST') {
    const { type, address } = req.body || {};
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'اختر نوع عملة رقمية صحيح' });
    }
    const addr = String(address || '').trim();
    if (!addr) return res.status(400).json({ error: 'أدخل عنوان المحفظة' });
    if (!PATTERNS[type].test(addr)) {
      return res.status(400).json({ error: 'صيغة عنوان المحفظة غير صحيحة لهذا النوع من العملات' });
    }
    user.wallet = { type, address: addr };
    await saveUser(user);
    return res.status(200).json({ ok: true, wallet: user.wallet });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
