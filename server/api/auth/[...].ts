import { NuxtAuthHandler } from '#auth';
import Auth0Provider from 'next-auth/providers/auth0';
import { refreshToken } from '~/server/utils/refreshToken';
import type { Session } from 'next-auth';

interface ICustomSession extends Session {
    sub?: string;
    error?: string;
    expiresAt?: number;
}

const config = useRuntimeConfig();

const AUTH0_ENCRYPTION_SECRET = config.AUTH0_ENCRYPTION_SECRET;
const AUTH0_CLIENT_ID = config.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = config.AUTH0_CLIENT_SECRET;
const AUTH0_ISSUER_BASE_URL = config.AUTH0_ISSUER_BASE_URL;
const AUTH0_AUDIENCE = config.AUTH0_AUDIENCE;
const SCOPE = config.AUTH0_SCOPE;
const CHECKS = ['state'];
const AUTH0_RESPONSE_TYPE = 'code';

export default NuxtAuthHandler({
    debug: false, //!isDeployed,
    secret: AUTH0_ENCRYPTION_SECRET as string,
    providers: [
        Auth0Provider.default({
            id: 'auth0',
            clientSecret: AUTH0_CLIENT_SECRET,
            clientId: AUTH0_CLIENT_ID,
            responseType: AUTH0_RESPONSE_TYPE,
            issuer: AUTH0_ISSUER_BASE_URL,
            checks: CHECKS,
            scope: SCOPE,
            token: {
                params: {
                    audience: process.env.AUTH0_AUDIENCE,
                },
            },
            authorization: {
                params: {
                    scope: SCOPE,
                    audience: AUTH0_AUDIENCE,
                },
            },
            idpLogout: true,
            async profile(profile: { sub: string; nickname: string; email: string; picture: string }) {
                return {
                    id: profile.sub,
                    name: profile.nickname,
                    email: profile.email,
                    image: profile.picture,
                };
            },
        }),
    ],
    // pages: {
    //     signIn: '/signin',
    //     error: '/signin',
    // },
    events: {
        async session(message) {
            if (!message.token) {
                return;
            }
        },
    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            try {
                // Validate inputs - if baseUrl is missing, we can't proceed safely
                if (!baseUrl) {
                    return url || '/';
                }

                try {
                    const resolved = new URL(url, baseUrl);
                    const baseOrigin = new URL(baseUrl).origin;

                    if (resolved.origin !== baseOrigin) {
                        return baseUrl;
                    }

                    // Keep redirects on our origin only
                    return resolved.href;
                } catch {
                    // As a last resort, allow clean internal paths (but not scheme-relative URLs)
                    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
                        return `${baseUrl}${url}`;
                    }

                    return baseUrl;
                }
            } catch {
                // Fallback to baseUrl if anything goes wrong
                return baseUrl || url || '/';
            }
        },
        async jwt({ token, account, trigger, session }) {
            // Handle case where token or expiryDate might be undefined
            let expiryDate: number = (account?.expires_at as number) ?? (token?.expiresAt as number) ?? 0;
            expiryDate *= 1000;
            const currentDate = Date.now();

            // Force refresh path: triggered via useAuth().update({ forceRefresh: true })
            if (trigger === 'update' && (session as unknown as { forceRefresh?: boolean })?.forceRefresh) {

                if (!token?.refreshToken) {
                    throw new Error('Missing refresh token');
                }

                const result = await refreshToken(token.refreshToken as string);

                if (result.error) {
                    return { ...token, error: result.error };
                }

                // Fetch fresh profile data from Auth0
                try {
                    const userInfoResponse = await fetch(`${AUTH0_ISSUER_BASE_URL}/userinfo`, {
                        headers: {
                            Authorization: `Bearer ${result.accessToken}`,
                        },
                    });

                    if (userInfoResponse.ok) {
                        await userInfoResponse.json();

                        return {
                            ...token,
                            accessToken: result.accessToken,
                            idToken: result.idToken,
                            refreshToken: result.refreshToken,
                            expiresAt: result.expiresAt,
                        };
                    }
                } catch (error) {
                    console.error('Failed to fetch fresh profile data:', error);
                }

                // Fallback to existing profile if userinfo call fails
                return {
                    ...token,
                    accessToken: result.accessToken,
                    idToken: result.idToken,
                    refreshToken: result.refreshToken,
                    expiresAt: result.expiresAt,
                };
            }

            if (account) {
                token.accessToken = account.access_token;
                token.idToken = account.id_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;

                return token;
            } else if (currentDate <= Number(expiryDate)) {
                if (token) {
                    return token;
                }
            } else if (currentDate > Number(expiryDate) && expiryDate > 0) {
                if (!token?.refreshToken) {
                    throw new Error('Missing refresh token');
                }
                
                const result = await refreshToken(token.refreshToken as string);

                if (result.error) {
                    return { ...token, error: result.error };
                }


                return {
                    ...token,
                    accessToken: result.accessToken,
                    idToken: result.idToken,
                    refreshToken: result.refreshToken,
                    expiresAt: result.expiresAt,
                };
            }

            return token;
        },
        async session({ session, token }: { session: Session; token: Record<string, unknown> }) {
            // Mutate the session object in-place to add custom properties
            (session as ICustomSession).sub = token.sub as string | undefined;
            (session as ICustomSession).expiresAt = token.expiresAt as number | undefined;
            (session as ICustomSession).error = token.error as string | undefined;

            return session;
        },
    },
});
