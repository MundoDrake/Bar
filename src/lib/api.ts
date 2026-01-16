import { supabase } from './supabase';

const API_BASE = '/api';

// Track if we're currently refreshing to avoid concurrent refreshes
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the session and return new access token
 */
async function refreshSession(): Promise<string | null> {
    // If already refreshing, wait for that to complete
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            console.log('[API] Attempting to refresh session...');
            const { data, error } = await supabase.auth.refreshSession();

            if (error) {
                console.error('[API] Session refresh failed:', error.message);
                return null;
            }

            if (data.session?.access_token) {
                console.log('[API] Session refreshed successfully');
                return data.session.access_token;
            }

            return null;
        } catch (e) {
            console.error('[API] Error during session refresh:', e);
            return null;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Helper to make authenticated requests to our Cloudflare Worker API.
 * Automatically handles token refresh on 401 errors.
 */
export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry: boolean = false
): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    let token = session?.access_token;

    if (!token) {
        // No session at all - try to refresh first
        if (!isRetry) {
            token = await refreshSession();
        }

        if (!token) {
            throw new Error('No active session');
        }
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    // Handle 401 Unauthorized - try refreshing token once
    if (response.status === 401 && !isRetry) {
        console.warn('[API] Got 401, attempting token refresh...');

        // Log the error details from the server for debugging
        try {
            const errorBody = await response.clone().json();
            console.warn('[API] Server 401 response:', errorBody);
        } catch {
            // Ignore if we can't parse the error body
        }

        const newToken = await refreshSession();

        if (newToken) {
            console.log('[API] Retrying request with new token...');
            return apiFetch<T>(endpoint, options, true);
        } else {
            // Refresh failed - user needs to re-login
            console.error('[API] Token refresh failed, user needs to re-login');
            throw new Error('Session expired. Please log in again.');
        }
    }

    if (!response.ok) {
        let errorMessage = `${response.status} - API Error`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || `${response.status} - ${response.statusText}`;
            console.error('[API] Error response:', errorData);
        } catch {
            errorMessage = `${response.status} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }

    // Handle empty responses (e.g. 204)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
