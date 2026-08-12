import { requireAuth } from '../lib/auth.js';
import { createLink, listUserLinks, getLinkByCode, getLinkById, getSettings } from '../lib/db.js';
import { issueVisitToken } from '../lib/visit-token.js';

const URL_RE = /^https?:\/\/.+\..+/i;

// One function handling everything link-related, to stay under the serverless
// function count limit:
//   GET  /api/links?code=xxxxx  -> public: resolve short code, redirect into skip.html
//   GET  /api/links?id=xxxxx    -> public: minimal info for the skip page (no auth, no destination URL)
//   GET  /api/links             -> private: list the logged-in user's links
//   POST /api/links             -> private: create a new link
export default async function handler(req, res) {
  if (req.query.code) {
    return handleResolve(req, res);
  }
  if (req.method === 'GET' && req.query.id) {
    return handleLinkInfo(req, res);
  }

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

async function handleResolve(req, res) {
  try {
    const code = String(req.query.code || '').trim();
    const link = code ? await getLinkByCode(code) : null;
    if (!link) {
      res.writeHead(302, { Location: '/not-found.html' });
      return res.end();
    }
    const { t, ts } = issueVisitToken(link.id);
    const dest = `/skip.html?id=${encodeURIComponent(link.id)}&stage=1&t=${encodeURIComponent(t)}&ts=${ts}`;
    res.writeHead(302, { Location: dest });
    return res.end();
  } catch (err) {
    console.error('resolve error', err);
    res.writeHead(302, { Location: '/not-found.html' });
    return res.end();
  }
}

async function handleLinkInfo(req, res) {
  try {
    const id = String(req.query.id || '').trim();
    const link = await getLinkById(id);
    if (!link) return res.status(404).json({ error: 'الرابط غير موجود أو انتهت صلاحيته' });
    const settings = await getSettings();
    return res.status(200).json({ id: link.id, exists: true, stageSeconds: settings.stageSeconds });
  } catch (err) {
    console.error('link-info error', err);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع' });
  }
}
