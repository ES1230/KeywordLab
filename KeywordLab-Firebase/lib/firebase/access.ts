import 'server-only';
import type { NextRequest } from 'next/server';
import { adminAuth, db } from './admin';
export const ADMIN_EMAIL = 'ryu_ralra@naver.com';
export async function getAccess(req: NextRequest) {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;
  try {
    // Server-side signature verification, no reliance on user-supplied email/role.
    const decoded = await adminAuth().verifyIdToken(token, true);
    const email = decoded.email?.trim().toLowerCase();
    if (!email || decoded.firebase?.sign_in_provider === 'anonymous') return null;
    if (!decoded.email_verified && email !== ADMIN_EMAIL) {
      // Users created manually in Firebase Console may not yet be verified.
      // Authorization is controlled by the independent allow-list below.
    }
    const isAdmin = email === ADMIN_EMAIL;
    if (!isAdmin) {
      const allow = await db().collection('allowed_emails').doc(email).get();
      if (!allow.exists || allow.data()?.enabled !== true) return null;
    }
    return {uid:decoded.uid,email,isAdmin};
  } catch { return null; }
}
