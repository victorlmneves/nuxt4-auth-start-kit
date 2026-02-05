import { getToken } from '#auth';

/**
 * Generates the OIDC logout URL without exposing tokens
 * @param {Event} event - The event object.
 * @returns {Promise<string>} - A promise that resolves to the logout URL or an error.
 */
export default defineEventHandler(async (event) => {
    try {
        // eslint-disable-next-line no-restricted-syntax
        const token = await getToken({ event });
        const idToken = token?.idToken;

        if (!idToken) {
            // Return a basic logout URL without idToken hint
            return {
                logoutUrl: `/auth/logout?fallback=true`,
                requiresServerLogout: true,
            };
        }

        // Build the OIDC logout URL
        const baseUrl = process.env.AUTH_ORIGIN;

        console.log("🚀 🚀 🚀 🚀 🚀 🚀 🚀 🚀 🚀 ~ process.env.AUTH_ORIGIN:", process.env.AUTH_ORIGIN)

        const redirectURI = `${baseUrl}/signin`;
        const mekLogoutParams = new URLSearchParams({
            id_token_hint: typeof idToken !== 'string' ? JSON.stringify(idToken) : idToken,
            post_logout_redirect_uri: redirectURI,
        });
        const mekLogoutURL = `${process.env.NUXT_MEK_ISSUER_BASE_URL}/oidc/logout?${mekLogoutParams.toString()}`;

        return {
            logoutUrl: mekLogoutURL,
            requiresServerLogout: false,
        };
    } catch (error) {
        console.error('Error generating logout URL:', error);

        return {
            logoutUrl: `/auth/logout?fallback=true`,
            requiresServerLogout: true,
        };
    }
});
