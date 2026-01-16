import { supabase } from './supabase';

const API_BASE = '/api';

/**
 * Helper to make authenticated requests to our Cloudflare Worker API
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // 1. Get current session
    let { data: { session } } = await supabase.auth.getSession();
    
    // 2. If no session or token is about to expire, try to refresh
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

    // 3. Handle 401 Unauthorized (Token might have expired just now)
    if (response.status === 401) {
        console.warn('[apiFetch] 401 Unauthorized, attempting session refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData.session) {
            const newToken = refreshData.session.access_token;
            // Retry the request once with the new token
            const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: {
                    ...headers,
                    'Authorization': `Bearer ${newToken}`,
                },
            });
            
            if (retryResponse.ok) {
                if (retryResponse.status === 204) return {} as T;
                return retryResponse.json();
            }
        } else {
            // If refresh fails, sign out to clear stale state
            console.error('[apiFetch] Session refresh failed, signing out');
            await supabase.auth.signOut();
            window.location.href = '/login';
            throw new Error('Session expired');
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
