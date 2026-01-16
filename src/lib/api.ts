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

    let response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    // 3. Handle 401 Unauthorized
    if (response.status === 401 && !options.headers?.hasOwnProperty('X-Retry')) {
        console.warn('[apiFetch] 401 Unauthorized, attempting session refresh...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData.session) {
            const newToken = refreshData.session.access_token;
            console.log('[apiFetch] Session refreshed, retrying request...');
            
            response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: {
                    ...headers,
                    'Authorization': `Bearer ${newToken}`,
                    'X-Retry': 'true'
                },
            });
        } else {
            console.error('[apiFetch] Session refresh failed:', refreshError);
        }
    }

    if (!response.ok) {
        let errorMessage = 'API Error';
        try {
            const errorData = await response.json();
            console.error(`[apiFetch] Error ${response.status} on ${endpoint}:`, errorData);
            errorMessage = errorData.error || errorMessage;
        } catch {
            errorMessage = response.statusText;
            console.error(`[apiFetch] Error ${response.status} on ${endpoint}:`, errorMessage);
        }
        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
