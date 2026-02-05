import type { UserData, AppMetadata, UserMetadata } from 'auth0';
import { defineStore, type StateTree } from 'pinia';

interface ApplicationStateTree extends StateTree {
    middlewareOrigin: string | undefined;
    ssrAuthInfo:
        | undefined
        | {
              accessToken?: string;
              accountId: UserData<AppMetadata, UserMetadata> | undefined;
              isAuthenticated: boolean;
              tokenAvailable: boolean;
              tokenExpired: boolean;
          };
    isRequestInProgress: boolean;
}

export const useApplicationStore = defineStore('app', {
    state: (): ApplicationStateTree => ({
        middlewareOrigin: undefined,
        ssrAuthInfo: undefined, // for server side use only!!!
        isRequestInProgress: false,
    }),
    hydrate(state, initialState) {
        state.middlewareOrigin = initialState.middlewareOrigin;
        state.isRequestInProgress = initialState.isRequestInProgress;

        if (initialState.ssrAuthInfo) {
            state.ssrAuthInfo = {
                accountId: initialState.ssrAuthInfo.accountId,
                isAuthenticated: initialState.ssrAuthInfo.isAuthenticated,
                tokenAvailable: initialState.ssrAuthInfo.tokenAvailable,
                tokenExpired: initialState.ssrAuthInfo.tokenExpired,
            };
        }
    },

    getters: {
        getRequestInProgress(): boolean {
            return this.isRequestInProgress;
        },
    },
    actions: {
        setRequestInProgress(state: boolean) {
            if (typeof state !== 'boolean') {
                return;
            }

            this.isRequestInProgress = state;
        },
    },
});
