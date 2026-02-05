<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from '/stores/user';

const route = useRoute();
const userStore = useUserStore();

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

const { login, logout, register, isAuthenticated } = useAuthentication();

function handleLogin() {
    login();
}

function handleLogout() {
    logout();
}

function handleRegister() {
    register();
}

onMounted(() => {
    userStore.fetchUserState();
});
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
            <template v-if="userStore.user === undefined">
                <USkeleton class="w-24 h-8" />
            </template>
            <template v-else-if="!isAuthenticated">
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
            <UButton
                v-else-if="!isAuthenticated"
                label="Sign in"
                color="neutral"
                variant="subtle"
                @click="handleLogin"
                block
                class="mb-3"
            />
            <UButton v-else-if="!isAuthenticated" label="Sign up" color="neutral" @click="handleRegister" block />
        </template>
    </UHeader>
</template>
