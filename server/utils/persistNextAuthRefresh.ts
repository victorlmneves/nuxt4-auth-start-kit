import { appendHeader, getCookie, getRequestHeaders, getRequestURL } from 'h3';
import type { H3Event } from 'h3';
import { ofetch } from 'ofetch';
import { buildAuthCookieHeader } from '@/server/utils/buildAuthCookieHeader';

/**
 * Calls NextAuth's session update endpoint to persist refreshed tokens into browser cookies
 * and forwards Set-Cookie headers to the client.
 * @param {H3Event} event - The H3 event object representing the incoming request.
 * @returns {{ refreshed: boolean }} An object indicating whether the tokens were refreshed.
 *
 * This function is used to persist the refreshed tokens into the browser cookies and forward the Set-Cookie headers to the client.
 * It is useful when:
 * - A server-initiated refresh happens (via getServerToken) and the browser’s NextAuth cookies should update immediately so future client-side requests (which don’t attach Authorization headers) are also authenticated.
 * - To avoid “cookie drift” where the server can proceed with a fresh access token while the browser still holds an expired session cookie, leading to intermittent 401s on client-only paths.
 */
export async function persistNextAuthRefresh(event: H3Event): Promise<{ refreshed: boolean }> {
    const cookieHeader = buildAuthCookieHeader(event);
    const reqUrl = getRequestURL(event);
    const reqHeaders = getRequestHeaders(event);
    const forwardedProto = (reqHeaders['x-forwarded-proto'] as string) || reqUrl.protocol.replace(':', '');
    const forwardedHost = (reqHeaders['x-forwarded-host'] as string) || (reqHeaders['host'] as string) || reqUrl.host;
    const origin = `${forwardedProto}://${forwardedHost}`;
    const absoluteSessionUrl = new URL('/api/auth/session', origin).toString();

    const devCsrf = getCookie(event, 'next-auth.csrf-token');
    const prodCsrf = getCookie(event, '__Host-next-auth.csrf-token');
    const rawCsrf = prodCsrf || devCsrf || '';
    const csrfToken = rawCsrf?.split('|')[0] || '';

    const commonHeaders = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken ? { 'XSRF-Token': csrfToken } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        Host: forwardedHost,
        'X-Forwarded-Host': forwardedHost,
        'X-Forwarded-Proto': forwardedProto,
        Referer: `${origin}/`,
    } as Record<string, string>;

    const callbackUrl = `${origin}/`;

    const attempt = {
        method: 'POST' as const,
        body: { csrfToken, data: { forceRefresh: true }, json: true, callbackUrl },
        label: 'POST next-auth style',
    };

    const res = await ofetch.raw(absoluteSessionUrl, {
        method: attempt.method,
        body: attempt.body,
        headers: { ...commonHeaders, Origin: origin },
    });

    const headers = res.headers as Headers & {
        getSetCookie?: () => string[];
        raw?: () => Record<string, string[]>;
    };

    let setCookies: string[] = [];

    if (typeof headers.getSetCookie === 'function') {
        setCookies = headers.getSetCookie();
    } else if (typeof headers.raw === 'function') {
        const raw = headers.raw();
        setCookies = raw['set-cookie'] || [];
    } else {
        const single = res.headers.get('set-cookie');
        if (single) {
            setCookies = [single];
        }
    }

    for (const cookie of setCookies) {
        appendHeader(event, 'set-cookie', cookie);
    }

    // Return the upstream response data (which contains the session object)
    return res._data;
}
