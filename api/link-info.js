import { getLinkById, getSettings } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const id = String(req.query.id || '').trim();
    const link = await getLinkById(id);
    if (!link) return res.status(404).json({ error: 'الرابط غير موجود أو انتهت صلاحيته' });
    const settings = await getSettings();
    return res.status(200).json({
      id: link.id,
      exists: true,
      stageSeconds: settings.stageSeconds
    });
  } catch (err) {
    console.error('link-info error', err);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع' });
  }
}
