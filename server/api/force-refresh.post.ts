import { defineEventHandler, getRequestHeaders } from 'h3';
import { persistNextAuthRefresh } from '@/server/utils/persistNextAuthRefresh';

// AttemptBody variants intentionally omitted; persistence handled by helper
export default defineEventHandler(async (event) => {
    // Accept force refresh signal. If not present, enable by default for this endpoint.
    // This endpoint is specifically for forcing refresh; always enable
    event.context.forceRefresh = true;

    // Persist refresh via NextAuth
    try {
        return persistNextAuthRefresh(event);
    } catch (error) {
        // ONLY FOR DEBUGGING PURPOSES: add an x-debug-force-refresh' header to the response to force a 'persist-failed' response
        const reqHeaders = getRequestHeaders(event);
        const wantDebug = reqHeaders['x-debug-force-refresh'] === '1';

        if (!wantDebug) {
            return;
        }

        let errorMessage: string | undefined = undefined;
        let errorStatus: unknown = undefined;
        let errorStatusCode: unknown = undefined;

        if (typeof error === 'object' && error !== null) {
            if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
                errorMessage = (error as { message?: string }).message;
            }

            if ('status' in error) {
                errorStatus = (error as { status?: unknown }).status;
            }

            if ('statusCode' in error) {
                errorStatusCode = (error as { statusCode?: unknown }).statusCode;
            }
        }

        return {
            refreshed: false,
            error: 'persist_failed',
            debug: {
                message: errorMessage,
                status: errorStatus,
                statusCode: errorStatusCode,
            },
        };
    }
});
