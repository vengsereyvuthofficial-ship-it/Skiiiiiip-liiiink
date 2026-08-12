import { requireAuth } from '../lib/auth.js';
import { createLink, listUserLinks } from '../lib/db.js';

const URL_RE = /^https?:\/\/.+\..+/i;

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const links = await listUserLinks(user.id);
    return res.status(200).json({ links });
  }

  if (req.method === 'POST') {
    const { longUrl } = req.body || {};
    if (!longUrl || !URL_RE.test(String(longUrl).trim())) {
      return res.status(400).json({ error: 'أدخل رابطًا صحيحًا يبدأ بـ http:// أو https://' });
    }
    const link = await createLink({ ownerId: user.id, longUrl: String(longUrl).trim() });
    return res.status(201).json({ link });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
