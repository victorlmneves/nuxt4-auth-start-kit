import { useState } from '#imports';
import type { RouteLocationNormalized } from '#vue-router';
import type { UserData, AppMetadata, UserMetadata } from 'auth0';

import { useApplicationStore } from '~/app/stores/app';
import { useNavigationStore } from '~/app/stores/navigation';
import { useUserStore } from '~/app/stores/user';
import type { ISession, IToken } from '~/app/types/session';

const isDevelopment = process.env.NODE_ENV === 'development';

// Paths that should be ignored by auth middleware (browser/tool requests)
const IGNORED_PATHS = new Set(['/.well-known/appspecific/com.chrome.devtools.json', '/favicon.ico', '/robots.txt', '/sitemap.xml']);

const COOKIE_NAMES = {
    dev: {
        session0: 'next-auth.session-token.0',
        session1: 'next-auth.session-token.1',
        csrf: 'next-auth.csrf-token',
        callback: 'next-auth.callback-url',
    },
    prod: {
        session0: '__Secure-next-auth.session-token.0',
        session1: '__Secure-next-auth.session-token.1',
        csrf: '__Host-next-auth.csrf-token',
        callback: '__Secure-next-auth.callback-url',
    },
} as const;

const getCookies = () => {
    const names = isDevelopment ? COOKIE_NAMES.dev : COOKIE_NAMES.prod;

    return {
        session0: useCookie(names.session0),
        session1: useCookie(names.session1),
        csrf: useCookie(names.csrf),
        callback: useCookie(names.callback),
    };
};

const buildCookieHeader = (cookies: ReturnType<typeof getCookies>) => {
    const names = isDevelopment ? COOKIE_NAMES.dev : COOKIE_NAMES.prod;
    const parts = [];

    if (cookies.session0.value && cookies.session1.value) {
        parts.push(`${names.session0}=${cookies.session0.value}`);
        parts.push(`${names.session1}=${cookies.session1.value}`);
    }

    if (cookies.csrf.value) {
        parts.push(`${names.csrf}=${cookies.csrf.value}`);
    }

    if (cookies.callback.value) {
        parts.push(`${names.callback}=${cookies.callback.value}`);
    }

    return parts.join('; ');
};

const clearSessionCookies = () => {
    const cookies = getCookies();

    Object.values(cookies).forEach((cookie) => {
        if (cookie.value) {
            cookie.value = null;
        }
    });
};

const hasValidSessionCookies = (cookies: ReturnType<typeof getCookies>) => cookies.session0.value && cookies.session1.value;

const updateUserStore = (userStore: ReturnType<typeof useUserStore>, userSession: ISession) => {
    userStore.user = userSession?.sub || undefined;
};

const handleSSRAuth = (appStore: ReturnType<typeof useApplicationStore>, userSession: ISession, userToken: IToken, origin: string) => {
    // console.warn('Handling SSR authentication with user token:', userToken);
    const userProfile = userSession?.user;
    const isAuthenticated = Boolean(userProfile);
    const accountId = userProfile?.sub;
    const accessToken = userToken?.accessToken;

    appStore.middlewareOrigin = origin;
    appStore.ssrAuthInfo = {
        ...(import.meta.server && { accessToken }),
        accountId: accountId as UserData<AppMetadata, UserMetadata>,
        isAuthenticated,
        tokenAvailable: Boolean(accessToken),
        tokenExpired: false,
    };
};

const fetchServerToken = async (cookieHeader: string, authHeader: string) => {
    try {
        return await $fetch('/api/server-token', {
            method: 'POST',
            headers: { cookie: cookieHeader, authorization: authHeader },
        });
    } catch (error) {
        console.error('[Auth Middleware] Failed to get server token:', error);

        return null;
    }
};

const isTokenError = (token: unknown): boolean =>
    typeof token === 'object' && token !== null && 'error' in token && Boolean((token as { error?: unknown }).error);

const handleInvalidSession = (currentPath: string) => {
    clearSessionCookies();

    if (currentPath === '/signin') {
        return undefined;
    }

    if (currentPath !== '/error/404') {
        return navigateTo({ path: '/signin', query: { redirect: currentPath } }, { redirectCode: 302 });
    }

    return undefined;
};

const handleSSRAuthentication = async (
    isSSR: boolean,
    isAuthenticated: boolean,
    appStore: ReturnType<typeof useApplicationStore>,
    userStore: ReturnType<typeof useUserStore>,
    userSession: Session | undefined,
    origin: string,
    isRestricted: boolean,
    to?: RouteLocationNormalized
): Promise<Session | undefined | ReturnType<typeof navigateTo>> => {
    const currentPath = to?.path || '';

    console.warn(
        'handleSSRAuthentication called. isSSR:',
        isSSR,
        'isAuthenticated:',
        isAuthenticated,
        'isRestricted:',
        isRestricted,
        'currentPath:',
        currentPath,
        'userSession:',
        userSession
    );

    if (!isSSR) {
        return undefined;
    }

    const cookies = getCookies();
    const headers = useRequestHeaders(['cookie', 'authorization']);
    const hasValidSession = hasValidSessionCookies(cookies) || Boolean(headers.cookie);

    // console.warn('🚀 ~ handleSSRAuthentication ~ hasValidSession:', hasValidSession);

    if (!hasValidSession && !isAuthenticated) {
        return undefined;
    }

    const cookieHeader = headers.cookie || buildCookieHeader(cookies);
    const serverToken = await fetchServerToken(cookieHeader, headers.authorization || '');

    if (hasValidSession && (!serverToken || isTokenError(serverToken))) {
        // Only redirect to login for restricted routes
        if (isRestricted) {
            return handleInvalidSession(currentPath);
        }

        // For unrestricted routes, clear cookies but don't redirect
        clearSessionCookies();

        return undefined;
    }

    // console.warn('🚀 ~ handleSSRAuthentication ~ serverToken:', serverToken);
    // console.warn('🚀 ~ handleSSRAuthentication ~ userSession:', userSession);

    if (serverToken && !isTokenError(serverToken)) {
        const userToken = serverToken as IToken;

        if (isAuthenticated) {
            handleSSRAuth(appStore, userSession, userToken, origin);
            updateUserStore(userStore, userSession);

            if (to && to.path !== '/signin' && !to.query?.redirect) {
                const navigationStore = useNavigationStore();

                if (!navigationStore.initRouteHandled) {
                    navigationStore.redirectTo = to.fullPath;
                }
            }
        }

        // console.warn('🚀 ~ handleSSRAuthentication ~ userToken:', userToken);

        return userToken;
    }

    return undefined;
};

const resetSrrAuthInfo = (appStore: ReturnType<typeof useApplicationStore>) => {
    if (import.meta.client) {
        appStore.ssrAuthInfo = undefined;
    }
};

const handleRefreshTokenError = (userSession: Session | undefined, isSSR: boolean): void => {
    if (userSession && userSession?.error === 'RefreshAccessTokenError' && !isSSR) {
        const { logout } = useAuthentication();

        logout();
    }
};

const validateUserSession = (userSession: Session | undefined): void => {
    if (!userSession) {
        throw createError({ status: 401, statusText: 'Invalid session structure' });
    }
};

const redirectToLogin = (redirectPath: string | undefined) => {
    const query = redirectPath ? { redirect: redirectPath } : undefined;

    if (import.meta.client) {
        abortNavigation();

        return navigateTo({ path: '/signin', query });
    }

    return navigateTo({ path: '/signin', query }, { redirectCode: 302 });
};

// Track if we've already processed this request
const authProcessed = new WeakMap<object, boolean>();

export default defineNuxtRouteMiddleware(async (to) => {
    const isSSR = import.meta.server;

    if (isSSR) {
        const event = useRequestEvent();

        if (authProcessed.get(event?.node?.req as unknown as object)) {
            return;
        }

        if (event?.node?.req) {
            authProcessed.set(event.node.req as unknown as object, true);
        }
    }

    const isLoginPage = to.path === '/signin' || to.path.startsWith('/signin');

    // Allow login page to pass through normally
    if (isLoginPage || to.path.startsWith('/_nuxt/') || to.path.startsWith('/_ipx/')) {
        return;
    }

    const { isAuthenticated } = useAuthentication(); // Must work on SSR!
    const isRestricted = (to.meta.isRestricted ?? false) as boolean;

    if (!isAuthenticated && isRestricted) {
        if (!isSSR) {
            abortNavigation();

            return navigateTo({ path: '/signin', query: { redirect: to.path, ...to.query } });
        }

        return redirectToLogin(to.fullPath);
    }

    // Only set authChecked after this logic
    const authChecked = useState('authChecked');
    authChecked.value = true;

    try {
        const { signIn, getSession } = useAuth();
        const userSession = await getSession();

        handleRefreshTokenError(userSession, isSSR);

        // Only validate session for restricted routes
        if (isRestricted) {
            validateUserSession(userSession ?? {});
        }

        const pinia = useNuxtApp().$pinia;
        const appStore = useApplicationStore(pinia);
        const userStore = useUserStore(pinia);
        const host = useRequestURL().host;
        const origin = host === 'localhost:3000' ? 'http://localhost:3000' : '';
        const isAuthenticated = Boolean(userSession?.user);

        // Pass the current path to prevent infinite redirects
        const result = await handleSSRAuthentication(
            isSSR,
            isAuthenticated,
            appStore,
            userStore,
            userSession,
            origin,
            isRestricted,
            to as unknown as RouteLocationNormalized
        );

        // Handle the case where no authentication token is available
        // Exception: allow verify-email page even without full authentication (user might be in registration flow)
        if (!result && !isAuthenticated) {
            if (isRestricted && to.path !== '/signin') {
                if (import.meta.client) {
                    abortNavigation();

                    return navigateTo({ path: '/signin', query: { redirect: to.path, ...to.query } });
                }

                return redirectToLogin(to.fullPath);
            }

            return;
        }

        if (typeof result === 'object' && result !== null && 'accessToken' in result && 'fullProfile' in result) {
            // const userToken: IToken = result;

            // TODO: investigate if there's another/better
            // for resetting ssrAuthInfo on the client side
            resetSrrAuthInfo(appStore);

            const referrer = isSSR ? undefined : document.referrer;

            // Check if referrer is from MEK DOMAIN to decide if we need to refresh session to get the 'email-verified' flag
            if (isAuthenticated && referrer?.includes('victorneves.eu.auth0.com')) {
                await signIn('auth0', { callbackUrl: '/' });

                return;
            }
        } else {
            return result;
        }
    } catch (error) {
        console.error('Error in auth middleware:', error);

        throw error;
    }
});
