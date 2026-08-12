import crypto from 'crypto';

function secretKey() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not configured');
  return s;
}

export function issueVisitToken(linkId) {
  const ts = Date.now();
  const sig = crypto.createHmac('sha256', secretKey()).update(linkId + ':' + ts).digest('hex');
  return { t: sig, ts };
}

// minSeconds: the total time the visitor must have genuinely waited (stageSeconds * number of stages)
export function verifyVisitToken(linkId, t, ts, minSeconds) {
  if (!t || !ts) return { ok: false, reason: 'missing_token' };
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: 'bad_timestamp' };
  const expected = crypto.createHmac('sha256', secretKey()).update(linkId + ':' + tsNum).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(t));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' };
  }
  const elapsedSeconds = (Date.now() - tsNum) / 1000;
  if (elapsedSeconds < minSeconds - 2) return { ok: false, reason: 'too_fast' };
  if (elapsedSeconds > minSeconds + 1800) return { ok: false, reason: 'expired' };
  return { ok: true };
}
