<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '/stores/user';
import { useApplicationStore } from '/stores/app';

const route = useRoute();
const userStore = useUserStore();
const appStore = useApplicationStore();

const items = computed(() => [
    {
        label: 'Docs',
        to: '/docs',
        active: route.path.startsWith('/docs'),
    },
    {
        label: 'Pricing',
        to: '/pricing',
    },
    {
        label: 'Blog',
        to: '/blog',
    },
    {
        label: 'Changelog',
        to: '/changelog',
    },
]);

const { login, logout, register } = useAuthentication();

// Prefer SSR-aware isAuthenticated from appStore, fallback to Pinia userStore
const isAuthenticated = computed(() => {
    if (typeof appStore.ssrAuthInfo?.isAuthenticated === 'boolean') {
        return appStore.ssrAuthInfo.isAuthenticated;
    }
    return userStore.isLoggedIn;
});

function handleLogin() {
    login();
}

function handleLogout() {
    logout();
}

function handleRegister() {
    register();
}
</script>

<template>
    <UHeader>
        <template #left>
            <NuxtLink to="/">
                <AppLogo class="w-auto h-6 shrink-0" />
            </NuxtLink>
            <TemplateMenu />
        </template>

        <UNavigationMenu :items="items" variant="link" />

        <template #right>
            <UColorModeButton />
            <template v-if="!isAuthenticated">
                <UButton icon="i-lucide-log-in" color="neutral" variant="ghost" class="lg:hidden" @click="handleLogin" />
                <UButton label="Sign in" color="neutral" variant="outline" class="hidden lg:inline-flex" @click="handleLogin" />
                <UButton
                    label="Sign up"
                    color="neutral"
                    trailing-icon="i-lucide-arrow-right"
                    class="hidden lg:inline-flex"
                    @click="handleRegister"
                />
            </template>
            <template v-else>
                <UButton label="Sign out" color="neutral" variant="outline" class="hidden lg:inline-flex" @click="handleLogout" />
            </template>
        </template>

        <template #body>
            <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
            <USeparator class="my-6" />
            <UButton v-if="userStore.user === undefined" label="..." color="neutral" variant="subtle" block class="mb-3" disabled />
            <template v-else-if="!isAuthenticated">
                <UButton label="Sign in" color="neutral" variant="subtle" @click="handleLogin" block class="mb-3" />
                <UButton label="Sign up" color="neutral" @click="handleRegister" block />
            </template>
        </template>
    </UHeader>
</template>
