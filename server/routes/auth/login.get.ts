/**
 * Safe login entrypoint for legacy links.
 *
 * Prevents open-redirects by only allowing same-origin paths in the `redirect` query param.
 * If the param is unsafe, users will be sent to `/` (customer portal).
 */
import { resolveSafeRedirectPath } from '~/server/utils/urls';

export default defineEventHandler(async (event) => {
    const origin = getRequestURL(event).origin;
    const { redirect } = getQuery(event);
    const safePath = resolveSafeRedirectPath(redirect, origin, '/');

    // Keep redirect as an internal path only
    await sendRedirect(event, `/login?redirect=${encodeURIComponent(safePath)}`, 302);
});
