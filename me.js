import { getUserFromRequest, publicUser } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const user = await getUserFromRequest(req);
    return res.status(200).json({ user: publicUser(user) });
  } catch (err) {
    console.error('me error', err);
    return res.status(200).json({ user: null });
  }
}
