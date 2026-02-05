/**
 * Event handler for user registration.
 * @param {Event} event - The event object representing the incoming request.
 * @returns {Promise<void>} - A promise that resolves when the registration process is complete.
 * @throws {Error} Will log an error and redirect to the base URL if an error occurs.
 */
export default defineEventHandler(async (event) => {
    const AUTH0_CLIENT_ID = process.env.NUXT_AUTH0_CLIENT_ID;
    const AUTH0_ISSUER_BASE_URL = process.env.NUXT_AUTH0_ISSUER_BASE_URL;
    const baseUrl = process.env.AUTH0_ORIGIN ?? getRequestURL(event).origin;
    const AUTH0_AUDIENCE = process.env.NUXT_AUTH0_AUDIENCE;
    const SCOPE = process.env.AUTH0_SCOPE;
    const AUTH0_RESPONSE_TYPE = 'code';

    try {
        const mekRegisterURL = `${AUTH0_ISSUER_BASE_URL}/authorize?response_type=${AUTH0_RESPONSE_TYPE}&client_id=${AUTH0_CLIENT_ID}&scope=${SCOPE}&viewsignup=true&screen_hint=signup&redirect_uri=${encodeURIComponent(baseUrl)}&audience=${AUTH0_AUDIENCE}`;

        await sendRedirect(event, mekRegisterURL, 200);
    } catch (error) {
        console.error({
            warning: `Error on log out`,
            error: error,
            process: process.pid,
        });

        await sendRedirect(event, `${baseUrl}`, 200);
    }
});
