import { redis, getLinkById, saveLink, getUserById, saveUser, getSettings, addToPaidOut } from '../lib/db.js';
import { verifyVisitToken } from '../lib/visit-token.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id, t, ts } = req.body || {};
    if (!id) return res.status(400).json({ error: 'بيانات ناقصة' });

    const link = await getLinkById(id);
    if (!link) return res.status(404).json({ error: 'الرابط غير موجود' });

    const settings = await getSettings();
    const minSeconds = settings.stageSeconds * settings.adsPerVisit;

    const check = verifyVisitToken(id, t, ts, minSeconds);
    if (!check.ok) {
      return res.status(400).json({ error: 'تعذّر التحقق من إتمام المراحل بشكل صحيح', reason: check.reason });
    }

    // Prevent the same token from being redeemed twice.
    const usedKey = 'visitused:' + id + ':' + ts;
    const already = await redis.get(usedKey);
    if (already) {
      return res.status(400).json({ error: 'تم احتساب هذه الزيارة مسبقًا' });
    }
    await redis.set(usedKey, '1', { ex: minSeconds + 1800 });

    const revenue = (settings.adsPerVisit / 1000) * settings.cpm;
    const earning = Math.round(revenue * (settings.userSharePct / 100) * 1e6) / 1e6;

    link.clicks += 1;
    link.earnings += earning;
    await saveLink(link);

    const owner = await getUserById(link.ownerId);
    if (owner) {
      owner.balance += earning;
      owner.totalEarned += earning;
      await saveUser(owner);
    }
    await addToPaidOut(earning);

    return res.status(200).json({ ok: true, longUrl: link.longUrl, earning });
  } catch (err) {
    console.error('visits error', err);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع' });
  }
}
