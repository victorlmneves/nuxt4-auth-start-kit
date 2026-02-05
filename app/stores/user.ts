
import { defineStore } from 'pinia';
import type { Session } from 'next-auth';
import { useRequestURL } from '#imports';

type UserState = {
    user: Session | undefined;
};

export const useUserStore = defineStore('user', {
    state: (): UserState => ({
        user: undefined,
    }),
    getters: {
        isLoggedIn: (state) => !!state.user,
        getUserAuth0Id: (state) => state.user && 'sub' in state.user ? (state.user as Session & { sub?: string }).sub : undefined,
    },
    actions: {
        async fetchUserState() {
            try {
                let url = '/api/auth/session';
                if (process.server) {
                    const origin = useRequestURL().origin;
                    url = origin + url;
                }
                const response = await fetch(url);

                if (response.ok) {
                    const sessionData = await response.json();
                    this.user = sessionData.user;
                }
            } catch (error) {
                console.error('[fetchUserState]', error);
            }
        },
        async clearUserState() {
            try {
                this.user = undefined;
            } catch (error) {
                console.error('[clearUserState]', error);
            }
        },
    },
});
