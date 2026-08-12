import { getLinkByCode } from '../lib/db.js';
import { issueVisitToken } from '../lib/visit-token.js';

export default async function handler(req, res) {
  try {
    const code = String(req.query.code || '').trim();
    if (!code) {
      res.writeHead(302, { Location: '/not-found.html' });
      return res.end();
    }
    const link = await getLinkByCode(code);
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
