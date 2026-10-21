import { getRequestContext } from '@cloudflare/next-on-pages';
import type { User } from './types';

/**
 * Extracts user email from Cloudflare Access JWT.
 * CF Access sets the CF_Authorization cookie with a JWT.
 * The JWT payload contains the user's email.
 */
function decodeJwtPayload(token: string): { email?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return {};
  }
}

/**
 * Get the current authenticated user from CF Access JWT + DB lookup.
 * Returns null if not authenticated or user not found/inactive.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { env, cf } = getRequestContext();

    // In development, use a mock user
    if (process.env.NODE_ENV === 'development') {
      const mockEmail = 'himanshu@soiltostructure.com';
      const result = await env.DB.prepare(
        'SELECT * FROM user WHERE email = ? AND is_active = 1'
      ).bind(mockEmail).first<User>();
      return result ?? null;
    }

    // Get CF Access JWT from cookie
    // CF Access adds the JWT as CF_Authorization cookie
    const cookieHeader = (cf as any)?.request?.headers?.get?.('cookie') ?? '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c: string) => {
        const [key, ...val] = c.trim().split('=');
        return [key, val.join('=')];
      })
    );

    const token = cookies['CF_Authorization'];
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    if (!payload.email) return null;

    // Look up user in DB
    const result = await env.DB.prepare(
      'SELECT * FROM user WHERE email = ? AND is_active = 1'
    ).bind(payload.email).first<User>();

    return result ?? null;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Helper to get DB and R2 from request context.
 */
export function getBindings() {
  const { env } = getRequestContext();
  return {
    db: env.DB as D1Database,
    r2: env.R2 as R2Bucket,
  };
}
