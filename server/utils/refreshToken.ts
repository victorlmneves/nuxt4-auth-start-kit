import { useRuntimeConfig } from '#imports';

export interface IRefreshTokenResult {
    accessToken: string;
    idToken: string;
    refreshToken?: string;
    expiresAt: number;
    error?: 'RefreshAccessTokenError';
}

export async function refreshToken(refreshToken: string): Promise<IRefreshTokenResult> {
    const config = useRuntimeConfig();
    const AUTH0_ISSUER_BASE_URL = config.AUTH0_ISSUER_BASE_URL;
    const AUTH0_CLIENT_ID = config.AUTH0_CLIENT_ID;
    const AUTH0_CLIENT_SECRET = config.AUTH0_CLIENT_SECRET;
    const SCOPE = config.AUTH0_SCOPE;

    const errorResult: IRefreshTokenResult = {
        accessToken: '',
        idToken: '',
        refreshToken: '',
        expiresAt: 0,
        error: 'RefreshAccessTokenError',
    };

    if (!refreshToken) {
        console.warn('REFRESH UTILITY: Missing refresh token');

        return errorResult;
    }

    try {
        const mekTokenURL = `${AUTH0_ISSUER_BASE_URL}/oauth/token`;
        const requestBody = {
            client_id: AUTH0_CLIENT_ID!,
            client_secret: AUTH0_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            scope: SCOPE,
        };

        const response = await fetch(mekTokenURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: new URLSearchParams(requestBody as unknown as Record<string, string>),
        });

        const responseText = await response.json();

        if (!response.ok) {
            console.warn('REFRESH UTILITY: Error refreshing access token', response.status, responseText);

            return errorResult;
        }

        const tokens = { ...responseText };

        return {
            accessToken: tokens.access_token,
            idToken: tokens.id_token,
            refreshToken: refreshToken, // Keep the original refresh token as it's not returned in the response
            expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
        };
    } catch (err) {
        console.warn('REFRESH UTILITY: Error refreshing access token', err);

        return errorResult;
    }
}
