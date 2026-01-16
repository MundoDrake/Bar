import { supabase } from './supabase';

const API_BASE = '/api';

/**
 * Helper to make authenticated requests to our Cloudflare Worker API
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
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
