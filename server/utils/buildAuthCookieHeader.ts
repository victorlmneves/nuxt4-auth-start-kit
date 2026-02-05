import type { H3Event } from 'h3';
import { getCookie, getRequestHeaders } from 'h3';

/**
 * Build a Cookie header string for NextAuth session in both dev and prod,
 * supporting split cookies (part .0 and .1) and optional CSRF/callback cookies.
 * Falls back to incoming request cookies if present.
 * @param {H3Event} event The current request event (server-side only).
 * @param {string} [existingCookieHeader] Optional cookie header to use if already available.
 * @returns {string} The constructed Cookie header string, or an empty string if not available.
 */
export function buildAuthCookieHeader(event: H3Event, existingCookieHeader?: string): string {
    if (existingCookieHeader) {
        return existingCookieHeader;
    }

    const headers = getRequestHeaders(event);

    if (headers.cookie) {
        return headers.cookie as string;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    // Dev cookies (unsplit and split)
    const devSessionCookie = getCookie(event, 'next-auth.session-token');
    const devSessionCookie0 = getCookie(event, 'next-auth.session-token.0');
    const devSessionCookie1 = getCookie(event, 'next-auth.session-token.1');
    const devCsrfToken = getCookie(event, 'next-auth.csrf-token');
    const devCallbackUrl = getCookie(event, 'next-auth.callback-url');

    // Prod cookies (unsplit and split, secure)
    const prodCsrfToken = getCookie(event, '__Host-next-auth.csrf-token');
    const prodCallbackUrl = getCookie(event, '__Secure-next-auth.callback-url');
    const prodSessionToken = getCookie(event, '__Secure-next-auth.session-token');
    const prodSessionToken0 = getCookie(event, '__Secure-next-auth.session-token.0');
    const prodSessionToken1 = getCookie(event, '__Secure-next-auth.session-token.1');

    let cookieHeader = '';

    if (isDevelopment && (devSessionCookie || (devSessionCookie0 && devSessionCookie1))) {
        if (devSessionCookie) {
            cookieHeader = `next-auth.session-token=${devSessionCookie}`;
        } else {
            cookieHeader = `next-auth.session-token.0=${devSessionCookie0}`;
            cookieHeader += `; next-auth.session-token.1=${devSessionCookie1}`;
        }

        if (devCsrfToken) {
            cookieHeader += `; next-auth.csrf-token=${devCsrfToken}`;
        }

        if (devCallbackUrl) {
            cookieHeader += `; next-auth.callback-url=${devCallbackUrl}`;
        }
    } else if (!isDevelopment && (prodSessionToken || (prodSessionToken0 && prodSessionToken1))) {
        if (prodSessionToken) {
            cookieHeader = `__Secure-next-auth.session-token=${prodSessionToken}`;
        } else {
            cookieHeader = `__Secure-next-auth.session-token.0=${prodSessionToken0}`;
            cookieHeader += `; __Secure-next-auth.session-token.1=${prodSessionToken1}`;
        }

        if (prodCsrfToken) {
            cookieHeader += `; __Host-next-auth.csrf-token=${prodCsrfToken}`;
        }

        if (prodCallbackUrl) {
            cookieHeader += `; __Secure-next-auth.callback-url=${prodCallbackUrl}`;
        }
    }

    return cookieHeader;
}
