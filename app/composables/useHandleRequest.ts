import { useNProgress } from '@vueuse/integrations/useNProgress';
import type { FetchOptions, FetchResponse } from 'ofetch';
import { useApplicationStore } from '~/app/stores/app';

interface INuxtWindow extends Window {
    __NUXT__?: Record<string, unknown> | Record<string, Record<string, unknown>>;
}

type TNitroHttpMethod =
    | 'GET'
    | 'HEAD'
    | 'PATCH'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'CONNECT'
    | 'OPTIONS'
    | 'TRACE'
    | 'get'
    | 'head'
    | 'patch'
    | 'post'
    | 'put'
    | 'delete'
    | 'connect'
    | 'options'
    | 'trace';

interface IResponseError {
    url: string;
    statusCode: number;
    statusMessage: string;
    message: string;
    data: {
        statusCode: number;
        message: string;
    };
}

interface IRequestConfig extends Omit<FetchOptions, 'headers' | 'query' | 'body'> {
    retries?: number;
    headers?: Record<string, string>;

    // Axios fallback (oFetch does not know about "data") just in case:
    data?: unknown;
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: BodyInit | Record<string, unknown> | null | undefined;
}

export interface ISsrAuthInfo {
    accessToken?: string;
    accountId?: string;
    isAuthenticated?: boolean;
    tokenAvailable?: boolean;
    tokenExpired?: boolean;
}

const isSSR = import.meta.server;

const createAuthInfoHeaders = (authInfo: ISsrAuthInfo | undefined, fdCookie?: string) => ({
    ...(authInfo?.accountId && { 'auth-id': authInfo.accountId.toString() }),
    ...(authInfo?.isAuthenticated && { 'is-authenticated': authInfo.isAuthenticated.toString() }),
    ...(authInfo?.tokenAvailable && { 'token-available': authInfo.tokenAvailable.toString() }),
    ...(authInfo?.tokenExpired && { 'token-expired': authInfo.tokenExpired.toString() }),
    ...(fdCookie && !isSSR && { Cookie: fdCookie }),
});

const createAuthHeaders = (accessToken?: string) => {
    return {
        ...(accessToken && { authorization: `Bearer ${accessToken}` }),
        accept: 'application/json, application/x-www-form-urlencoded, multipart/form-data, application/pdf',
    };
};

const fetchWithRetry = async (url: string, config: IRequestConfig) => {
    const maxRetries = config.retries ?? 0;
    const timeout = config.timeout ?? 30000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const { data: axiosData, method, ...remainingConfig } = config as IRequestConfig & { data?: unknown; body?: unknown };

            if (axiosData !== undefined || (config as { params?: unknown }).params !== undefined) {
                console.warn('[useHandleRequest] Axios-style config detected (data/params). Prefer body/query.');
            }

            return await $fetch(url, {
                ...remainingConfig,
                method: method as TNitroHttpMethod | undefined,
                body: ((remainingConfig as { body?: unknown }).body ?? axiosData) as BodyInit | Record<string, unknown> | null | undefined,
                timeout,
                onRequestError({ error }) {
                    if (error.name === 'AbortError') {
                        throw new Error('Request timeout');
                    }
                },
            });
        } catch (error) {
            if (attempt === maxRetries - 1) {
                throw error;
            }

            if ((error as { status: number }).status === 429) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    }
};

/**
 * A custom hook for handling HTTP requests.
 * @param {string} url - The URL of the request.
 * @param {{ [key: string]: unknown }} paramsConfig - Optional configuration parameters for the request.
 * @returns {object} - An object containing the response data, response error, general error, and loading state.
 */
export const useHandleRequest = async (url: string, paramsConfig: IRequestConfig = {}) => {
    const data = ref();
    const responseError = ref<IResponseError>();
    const error = ref();
    let isLoading = ref<boolean>(false);

    // Try to get Nuxt context - will work if called from valid context
    // If not available, we'll handle it gracefully
    let nuxtApp;
    let pinia;
    let config;
    let applicationStore;

    try {
        nuxtApp = useNuxtApp();
        pinia = nuxtApp.$pinia;
        config = useRuntimeConfig();
        applicationStore = useApplicationStore(pinia);
    } catch {
        // If we can't get the Nuxt context, we're likely in an async callback
        // Try to get it from the current Nuxt instance if available
        if (typeof window !== 'undefined' && (window as INuxtWindow).__NUXT__) {
            console.warn('[useHandleRequest] Called outside Nuxt context, attempting fallback');
        }

        throw new Error('[useHandleRequest] Must be called within a valid Nuxt context');
    }

    const setLoadingState = (state: boolean) => {
        if (!isSSR) {
            isLoading.value = state;
        }
    };

    const consoleErrorWarning = (error: { code: string; message: string; cause: string }) => {
        if (error.code === 'ERR_CANCELED') {
            console.warn('Request', url, 'cancelled');
        } else {
            console.error('Caught error fetching', url, error.code, error.message, error.cause);
        }
    };

    if (!isSSR) {
        ({ isLoading } = useNProgress());
    }

    const dataRequest = async () => {
        setLoadingState(true);
        const ssrAuthInfo = applicationStore.ssrAuthInfo as ISsrAuthInfo | undefined;
        const fdCookie = config.public.FD_COOKIE as string | undefined;

        // For SSR, use the middleware origin if available, otherwise use empty string
        // For client-side, always use relative URLs to go through Nuxt API routes
        const baseURL = isSSR ? (applicationStore.middlewareOrigin ?? '') : '';
        const formMethod = paramsConfig?.method;

        const requestConfig = {
            baseURL,
            ...config,
            ...paramsConfig,
            timeout: 30000,
            retries: formMethod?.toUpperCase() !== 'GET' ? 1 : 3,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                ...(paramsConfig.headers as { [key: string]: string }),
                ...defaultHeaders(),
                // Server-only headers
                ...(isSSR
                    ? {
                          ...createAuthInfoHeaders(ssrAuthInfo, fdCookie),
                          ...createAuthHeaders(ssrAuthInfo?.accessToken),
                      }
                    : {}),
            },
            onResponseError({ response }: { response: FetchResponse<unknown> }) {
                // Handle the response errors
                responseError.value = (response as unknown as { _data?: IResponseError })?._data;

                // Example of the response object
                // _data: {
                //     url: '/api/symphony/contracts',
                //     statusCode: 429,
                //     statusMessage: 'Too Many Requests',
                //     message: '[GET] "https://enbwtest.azure-api.net/customerservicebackend/v1/api/contracts": 429 Too Many Requests',
                //     stack: '<pre><span class="stack internal">at process.processTicksAndRejections (node:internal/process/task_queues:95:5)</span>\n' +
                //     '<span class="stack internal">at async $fetchRaw2 (./node_modules/ofetch/dist/shared/ofetch.00501375.mjs:256:14)</span>\n' +
                //     '<span class="stack internal">at async $fetch2 (./node_modules/ofetch/dist/shared/ofetch.00501375.mjs:261:15)</span>\n' +
                //     '<span class="stack internal">at <anonymous> (./src/server/api/symphony/[...].ts:16:1)</span>\n' +
                //     '<span class="stack internal">at async Object.handler (./node_modules/h3/dist/index.mjs:1697:19)</span>\n' +
                //     '<span class="stack internal">at async Server.toNodeHandle (./node_modules/h3/dist/index.mjs:1907:7)</span></pre>',
                //     data: {
                //         statusCode: 429,
                //         message: 'Rate limit is exceeded. Try again in 2 seconds.'
                //     }
                // }
            },
        };

        try {
            const result = await fetchWithRetry(url, requestConfig);
            data.value = result;
        } catch (fetchError: unknown) {
            const errorData = fetchError as { data: { code: string; message: string; cause: string } } | undefined;
            error.value = errorData;
            consoleErrorWarning(error.value);

            if (error.value?.data?.statusCode === 401) {
                // Only call useAuthentication when we actually need to logout
                // and only if we're in a valid Nuxt context
                try {
                    const { logout } = useAuthentication();

                    await logout();
                } catch (authError) {
                    console.warn('[useHandleRequest] Could not logout - Nuxt context not available:', authError);
                }
            }
        } finally {
            setLoadingState(false);
        }
    };

    await dataRequest();

    return {
        data,
        responseError,
        error,
        isLoading,
    };
};
