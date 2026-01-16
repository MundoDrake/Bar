import { supabase } from './supabase';

const API_BASE = '/api';

/**
 * Helper to make authenticated requests to our Cloudflare Worker API
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // 1. Get current session
    let { data: { session } } = await supabase.auth.getSession();
    
    // 2. If no session, try to refresh once
    if (!session) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        session = refreshData.session;
    }

    const token = session?.access_token;

    if (!token) {
        console.error('[apiFetch] No active session found');
        throw new Error('No active session');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    // 3. Handle 401 Unauthorized
    // If we get a 401, it means the Worker rejected the token.
    // We only attempt ONE refresh to avoid infinite loops.
    if (response.status === 401 && !options.headers?.hasOwnProperty('X-Retry')) {
        console.warn('[apiFetch] 401 Unauthorized, attempting session refresh...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData.session) {
            const newToken = refreshData.session.access_token;
            console.log('[apiFetch] Session refreshed, retrying request...');
            
            // Retry the request once with the new token and a marker to prevent loops
            const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: {
                    ...headers,
                    'Authorization': `Bearer ${newToken}`,
                    'X-Retry': 'true' // Marker to prevent infinite recursion
                },
            });
            
            if (retryResponse.ok) {
                if (retryResponse.status === 204) return {} as T;
                return retryResponse.json();
            }
            
            if (retryResponse.status === 401) {
                console.error('[apiFetch] 401 even after refresh. Possible Worker/Supabase config mismatch.');
            }
        } else {
            console.error('[apiFetch] Session refresh failed or no session returned');
        }
    }

    if (!response.ok) {
        let errorMessage = 'API Error';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch {
            errorMessage = response.statusText;
        }
        throw new Error(errorMessage);
    }

    // Handle empty responses (e.g. 204)
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
