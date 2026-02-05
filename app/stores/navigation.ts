import { defineStore, type StateTree } from 'pinia';

export interface INavigationStateTree extends StateTree {
    redirectTo: string | undefined;
}

export const useNavigationStore: () => INavigationStateTree = defineStore('navigation', {
    state: () => ({
        redirectTo: undefined,
    }),
});
