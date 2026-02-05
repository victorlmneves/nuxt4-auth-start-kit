import type { Session } from 'next-auth';
import { computed } from '#imports';
import { useRoute } from 'vue-router';
import { useUserStore } from '~/app/stores/user';
import { useHandleRequest } from '~/app/composables/useHandleRequest';
import { resolveSafeRedirectPath } from '~/server/utils/urls';

type UserState = {
    isLoggedIn: boolean;
    user: Session | undefined;
};

type AuthSession = {
    user?: UserState & {
        sub?: string;
    };
    accessToken?: string;
    expiresAt?: number;
};

/**
 * A composable function that provides authentication-related functionality.
 * @returns {object} An object containing the following functions and computed properties:
 * - isAuthenticated: A computed property that returns a boolean indicating whether the user is authenticated.
 * - updateAuthUserInfo: A function that updates the user's authentication information.
 * - login: A function that redirects the user to the login page.
 * - logout: A function that logs the user out.
 * - register: A function that redirects the user to the registration page.
 * - sendVerificationMail: A function that sends a verification email to the user.
 */

export const useAuthentication = () => {
    const { signIn, signOut } = useAuth();
    const userStore = useUserStore();
    const isAuthenticated = computed(() => userStore.isLoggedIn);
    const route = useRoute();

    /**
     * Asynchronously logs in the user by calling the `signIn` function with the argument 'auth0'.
     * @param {string} callbackUrl - The URL to redirect to after successful login.
     * @returns {Promise<void>} A promise that resolves when the login process is complete.
     */
    async function login(callbackUrl?: string): Promise<void> {
        const config = useRuntimeConfig();
        const origin: string = config.public.AUTH_ORIGIN ?? 'http://localhost:3000';
        const returnUrl = resolveSafeRedirectPath(callbackUrl ?? route?.query?.redirect ?? '/', origin, '/');

        await signIn('auth0', {
            callbackUrl: returnUrl,
        });
    }

    /**
     * Redirects the user to the registration page.
     * @returns {void} - No return value.
     */
    function register(): void {
        const origin = globalThis.location.origin;

        window.location.href = `${origin}/auth/register`;
    }

    async function updateUserStoreFromSession(): Promise<void> {
        try {
            const { data } = useAuth();
            const session = data?.value as AuthSession | null;

            if (session) {
                const profile: Session | undefined = session.user;
                userStore.user.value = profile;
            }
        } catch (error) {
            console.error('Failed to update user from session:', error);

            throw error;
        }
    }

    /**
     * Updates the user information in the authentication store.
     * @returns {Promise<void>} A promise that resolves when the user information is updated.
     */
    async function updateAuthUserInfo(): Promise<void> {
        try {
            await $fetch('/api/force-refresh', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Token force refresh failed:', error);
        }

        // Sync store from session
        await updateUserStoreFromSession();
    }

    /**
     * Logs out the user.
     * @returns {Promise<void>} - A promise that resolves once the logout process is complete.
     */
    async function logout(): Promise<void> {
        const callbackURL = `${window.location.origin}/`;

        try {
            // Get the logout URL without exposing tokens to client
            let logoutInfo = null;

            try {
                const { data: logoutResponse } = await useHandleRequest('/auth/logout-url', {});
                logoutInfo = logoutResponse.value;
            } catch (error: unknown) {
                console.error('[Could not get logout URL]:', error);
            }

            // If we have a logout URL that doesn't require server logout, handle OIDC logout manually
            if (logoutInfo && !logoutInfo.requiresServerLogout) {
                // Clear the session and redirect to OIDC logout (bypass our logout route)
                await signOut({ redirect: false });
                window.location.href = logoutInfo.logoutUrl;

                return;
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(error.message);
            }
        }

        signOut({ callbackUrl: callbackURL });
    }

    return {
        isAuthenticated,
        updateAuthUserInfo,
        login,
        logout,
        register,
    };
};
