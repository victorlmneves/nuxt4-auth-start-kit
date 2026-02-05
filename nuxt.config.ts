import path from 'path';

const sidebaseConfig = {
    isEnabled: true,
    provider: {
        type: 'authjs',
    },
    sessionRefresh: {
        enablePeriodically: false,
        enableOnWindowFocus: false,
    },
    disableServerSideAuth: false,
    exclude: ['/auth/logout'],
};

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: [
        // '@nuxt/a11y',
        '@nuxt/content',
        '@nuxt/eslint',
        // '@nuxt/hints',
        '@nuxt/image',
        '@nuxt/scripts',
        '@nuxt/test-utils',
        '@nuxt/ui',
        '@pinia/nuxt',
        '@sidebase/nuxt-auth',
        'nuxt-og-image',
    ],

    devtools: {
        enabled: true,
    },

    vite: {
        // build: {
        //     target: 'esnext',
        //     sourcemap: 'hidden',
        // },
        envPrefix: ['VITE_', 'NUXT_PUBLIC_', 'NUXT_'],
    },

    app: {
        buildAssetsDir: '/_nuxt/',
        keepalive: true,
        head: {
            meta: [
                { charset: 'utf-8' },
                { name: 'viewport', content: 'width=device-width, initial-scale=1' },
                { name: 'format-detection', content: 'telephone=no' },
            ],
            link: [],
            style: [],
            script: [],
            noscript: [{ innerHTML: '<meta http-equiv="refresh" content=".5; url=/javascript-error">' }],
        },
    },

    imports: {
        autoImport: true,
        dirs: ['src/stores'],
    },

    css: ['~/app/assets/css/main.css'],

    routeRules: {
        '/': {
            prerender: true,
        },
        '/docs': {
            redirect: '/docs/getting-started',
            prerender: false,
        },
    },

    auth: { ...sidebaseConfig },

    alias: {
        '~': path.resolve(__dirname, './'),
    },

    runtimeConfig: {
        AUTH0_AUDIENCE: '',
        AUTH0_CLIENT_ID: '',
        AUTH0_CLIENT_SECRET: '',
        AUTH0_ENCRYPTION_SECRET: '',
        AUTH0_ISSUER_BASE_URL: '',
        AUTH0_SCOPE: 'openid profile email offline_access',
        public: {
            AUTH0_ISSUER_BASE_URL: process.env.NUXT_AUTH0_ISSUER_BASE_URL,
            AUTH_ORIGIN: '',
        },
    },

    nitro: {
        alias: {
            '~': path.resolve(__dirname, './'),
        },
        prerender: {
            routes: ['/'],
            crawlLinks: true,
        },
    },

    compatibilityDate: '2025-01-15',

    eslint: {
        config: {
            stylistic: {
                commaDangle: 'never',
                braceStyle: '1tbs',
            },
        },
    },
});
