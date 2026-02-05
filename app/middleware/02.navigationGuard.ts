import { resolveSafeRedirectPath } from '@/server/utils/urls';

export default defineNuxtRouteMiddleware(async (to) => {
    // Skip this middleware for unrestricted routes
    if (to.meta?.isRestricted === false) {
        return;
    }

    const isSSR = import.meta.server;
    const { status, signOut } = useAuth();
    const isAuthenticated = status.value === 'authenticated';
    const isLoginPage = to.path === '/signin' || to.path.startsWith('/signin');

    // Break potential loops on the client when arriving at /login with an OAuth error in the URL.
    // SSR is handled by server/middleware/auth-error-redirect.server.ts
    if (!isSSR && isLoginPage && (to?.query?.error || to?.query?.authError)) {
        try {
            await signOut({ callbackUrl: '/signin' });
        } catch (error: unknown) {
            console.error('Signout after OAuth error failed:', error);
        }

        return;
    }

    // Detecta rotas não encontradas (404)
    if (to.matched.length === 0) {
        abortNavigation();

        return navigateTo('/error/404');
    }

    if (isSSR && isAuthenticated) {
        // Get server token using cookies and headers that are available in middleware
        let serverToken: { error?: unknown; fullProfile?: { email_verified?: boolean } } | null = null;

        try {
            const sessionCookie = useCookie('next-auth.session-token') || useCookie('__Secure-next-auth.session-token');
            const headers = useRequestHeaders(['cookie', 'authorization']);

            if (sessionCookie.value || headers.cookie) {
                serverToken = await $fetch<{ error?: unknown; fullProfile?: { email_verified?: boolean } }>('/api/server-token', {
                    method: 'POST',
                    headers: {
                        cookie: headers.cookie || `next-auth.session-token=${sessionCookie.value}`,
                        authorization: headers.authorization || '',
                    },
                });
            }
        } catch (tokenError) {
            console.error('[Navigation Guard Middleware] Failed to get server token: ', tokenError);

            return;
        }

        if (!serverToken || serverToken?.error) {
            console.warn('[Navigation Guard Middleware] No server token available.');

            return;
        }

        if (isLoginPage) {
            abortNavigation();

            const origin = useRequestURL().origin;
            const redirectPath = resolveSafeRedirectPath(to.query.redirect, origin, '/');

            // Never bounce back to login (avoid loops)
            if (redirectPath && redirectPath !== '/signin') {
                return navigateTo(redirectPath);
            }

            return navigateTo('/');
        }
    }

    // Client-side redirect for authenticated users on login page
    if (!isSSR && isAuthenticated && isLoginPage) {
        const origin = window.location.origin;
        const redirectPath = resolveSafeRedirectPath(to.query.redirect, origin, '/');

        // Never bounce back to login (avoid loops)
        if (redirectPath && redirectPath !== '/signin') {
            return navigateTo(redirectPath);
        }

        return navigateTo('/');
    }
});
