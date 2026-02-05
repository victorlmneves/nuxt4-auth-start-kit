import { getServerToken } from '~/server/utils/getServerToken';

export default defineEventHandler(async (event) => {
    // Accept a force-refresh signal via header or body
    try {
        const headers = getHeaders(event);
        const headerForce = headers['x-auth-force-refresh'];
        let bodyForce = false;

        try {
            const body = await readBody<{ forceRefresh?: boolean }>(event);
            bodyForce = Boolean(body?.forceRefresh);
        } catch {
            // Ignore body parse errors (e.g., no body).
        }

        if ((typeof headerForce === 'string' && headerForce.toLowerCase() === 'true') || bodyForce) {
            event.context.forceRefresh = true;
        }
    } catch (error) {
        console.error('[server-token API] Failed to parse force refresh signal:', error);
    }

    try {
        const token = await getServerToken(event);

        if (!token) {
            console.error('[server-token API] No token available');

            return { error: 'no_token', message: 'No token available' };
        }

        return {
            accessToken: token.accessToken,
            idToken: token.idToken,
            refreshToken: token.refreshToken,
            fullProfile: token.fullProfile,
            expiresAt: token.expiresAt,
        };
    } catch (error) {
        console.error('[server-token API] Error:', error);

        return { error: 'server_error', message: 'Failed to retrieve token' };
    }
});
