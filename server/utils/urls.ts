/**
 * Ensures that a given path or URL has a leading slash.
 * If the given path or URL is undefined, or already starts with a slash or 'http', it will be returned unchanged.
 * Otherwise, a leading slash will be prepended to the path or URL.
 * @param {string} [pathOrUrl] - The path or URL to be processed.
 * @returns {string | undefined} - The processed path or URL, or undefined if the input was undefined.
 */
export function ensureLeadingSlash(pathOrUrl?: string): string | undefined {
    if (pathOrUrl === undefined) {
        return pathOrUrl;
    }

    if (pathOrUrl.startsWith('/') || pathOrUrl.startsWith('http')) {
        return pathOrUrl;
    }

    return `/${pathOrUrl}`;
};

/**
 * Normalizes a single query value, which may be passed as an array of one value or as a string.
 * If the value is an array, it will be resolved to the first element of the array if it is a string.
 * If the value is not an array or string, it will be resolved to undefined.
 * @param {unknown} value - The value to be normalized.
 * @returns {string | undefined} - The normalized value, or undefined if it is not a string or array of strings.
 */
function normalizeSingleQueryValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : undefined;
    }

    return typeof value === 'string' ? value : undefined;
};

/**
 * Resolves a safe, same-origin redirect path.
 * Accepts absolute URLs and relative paths, but only returns a path if it resolves to the same origin.
 * Returns a fallback path if the candidate is unsafe or invalid.
 * @param {unknown} target - The target URL or path to resolve.
 * @param {string} origin - The origin to resolve against.
 * @param {string} [fallback] - The fallback path to use if the candidate is unsafe or invalid. Defaults to '/'.
 * @returns {string} - The resolved safe redirect path.
 */
export function resolveSafeRedirectPath(target: unknown, origin: string, fallback = '/'): string {
    const candidate = normalizeSingleQueryValue(target);

    if (!candidate) {
        return fallback;
    }

    try {
        const resolved = new URL(candidate, origin);
        const baseOrigin = new URL(origin).origin;

        if (resolved.origin !== baseOrigin) {
            return fallback;
        }

        const safePath = `${resolved.pathname}${resolved.search}${resolved.hash}`;
        return safePath || fallback;
    } catch {
        // Only allow clean internal paths as a last resort
        if (candidate.startsWith('/') && !candidate.startsWith('//')) {
            return candidate;
        }

        return fallback;
    }
};
