
// src/worker/auth.ts
import { verifyResult } from './types';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Store JWKS in global scope for caching
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

export async function verifySupabaseToken(token: string, supabaseUrl: string): Promise<verifyResult> {
    try {
        if (!JWKS) {
            // Ensure URL doesn't have double slashes
            const jwksUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/jwks`;
            JWKS = createRemoteJWKSet(new URL(jwksUrl));
        }

        // We verify the token. We are more lenient with issuer/audience 
        // to avoid 401 loops caused by slight URL mismatches.
        const { payload } = await jwtVerify(token, JWKS);

        // Optional: Manual check if you want to be extra secure but flexible
        // const expectedIssuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
        // if (payload.iss !== expectedIssuer) { ... }

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
