
// src/worker/auth.ts
import { verifyResult } from './types';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Store JWKS in global scope for caching
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function verifySupabaseToken(token: string, supabaseUrl: string): Promise<verifyResult> {
    try {
        if (!JWKS) {
            JWKS = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/jwks`));
        }

        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `${supabaseUrl}/auth/v1`,
            audience: 'authenticated',
        });

        return {
            valid: true,
            userId: payload.sub as string,
            email: payload.email as string
        };
    } catch (e: any) {
        console.error('Token verification failed:', e.message);
        
        // If JWKS fails, clear it so it can be retried on next request
        if (e.code === 'ERR_JWKS_FETCH_FAILED' || e.message?.includes('fetch failed')) {
            JWKS = null;
        }

        return { 
            valid: false, 
            error: e.code === 'ERR_JWT_EXPIRED' ? 'Token expired' : 'Invalid token' 
        };
    }
}
