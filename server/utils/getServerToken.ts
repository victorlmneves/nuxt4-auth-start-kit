import { getToken } from '#auth';
import type { H3Event } from 'h3';
import { refreshToken } from '~/server/utils/refreshToken';

export async function getServerToken(event: H3Event) {
    try {
        // Check for refreshed token in event context first
        if (event.context.refreshedToken) {
            return event.context.refreshedToken;
        }

        // eslint-disable-next-line no-restricted-syntax
        const token = await getToken({ event });

        if (!token) {
            console.warn('[getServerToken] No token available');

            return null;
        }

        // Need to check if token is expired unless force refresh requested
        const now = Date.now();
        const expiryDate = Number(token?.expiresAt) * 1000;
        const buffer = 60 * 1000; // 1 minute

        if (!event.context.forceRefresh) {
            if (now < expiryDate - buffer) {
                return token;
            }
        }

        const result = await refreshToken(token?.refreshToken as string);

        if (result.error) {
            console.error('[getServerToken] Token refresh failed:', result.error);

            return null;
        }

        // Cache for this request lifecycle to avoid repeated refreshes
        event.context.refreshedToken = result;

        return event.context.refreshedToken;
    } catch (error) {
        console.error('[getServerToken] Error getting server token:', error);

        return null;
    }
}
