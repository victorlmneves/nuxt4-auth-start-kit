<script setup lang="ts">
import { definePageMeta, useSeoMeta, useRoute } from '#imports';
import { useRouter } from 'vue-router';
import { useAuthentication } from '../composables/useAuthentication';
import { useUserStore } from '../stores/user';

definePageMeta({ layout: 'auth' });
useSeoMeta({ title: 'Sign in - MyApp', description: 'Sign in to your account' });

const userStore = useUserStore();
const { login, logout, register } = useAuthentication();
const router = useRouter();
const route = useRoute();

async function handleLogin() {
    const redirect = route.query.redirect;

    await login(redirect ? String(redirect) : undefined);
    await userStore.fetchUserState();

    if (userStore.isLoggedIn && redirect) {
        router.push(String(redirect));
    } else if (userStore.isLoggedIn) {
        router.push('/');
    }
}

async function handleLogout() {
    await logout();

    setTimeout(() => {
        userStore.fetchUserState();
    }, 500);
}

function handleRegister() {
    register();
}
</script>

<template>
    <UAuthForm title="Sign in to your account">
        <template #description>
            <div class="mt-8 flex items-center justify-center gap-6">
                <UButton label="Sign in" color="neutral" variant="outline" class="hidden lg:flex" @click="handleLogin" />
            </div>
            <div class="mt-8 flex items-center justify-center gap-6">
                <UButton
                    label="Sign up"
                    color="neutral"
                    trailing-icon="i-lucide-arrow-right"
                    class="hidden lg:flex"
                    @click="handleRegister"
                />
            </div>
        </template>
        <template #footer>
            By signing up, you agree to our
            <ULink to="/" class="text-primary font-medium">Terms of Service</ULink>
            .
        </template>
    </UAuthForm>
</template>
