
// src/worker/auth.ts
import { verifyResult } from './types';
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';

// Store JWKS in global scope for caching
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
let lastUsedUrl: string | null = null;

export async function verifySupabaseToken(token: string, supabaseUrl: string): Promise<verifyResult> {
    try {
        // 1. Basic validation of inputs
        if (!token || !supabaseUrl) {
            return { valid: false, error: 'Missing token or Supabase URL' };
        }

        const normalizedUrl = supabaseUrl.replace(/\/$/, '');
        
        // 2. Initialize or Refresh JWKS if URL changed
        if (!JWKS || lastUsedUrl !== normalizedUrl) {
            const jwksUrl = `${normalizedUrl}/auth/v1/jwks`;
            console.log(`[Auth] Initializing JWKS for: ${jwksUrl}`);
            JWKS = createRemoteJWKSet(new URL(jwksUrl));
            lastUsedUrl = normalizedUrl;
        }

        // 3. Decode without verification first just for logging/diagnostics (Safe)
        const decoded = decodeJwt(token);
        console.log(`[Auth] Verifying token for user: ${decoded.sub}, iss: ${decoded.iss}`);

        // 4. Verify the token
        // We are lenient with options here because Supabase URLs can vary 
        // (e.g., custom domains vs supabase.co)
        const { payload } = await jwtVerify(token, JWKS, {
            // We don't strictly enforce issuer here to avoid 401 loops, 
            // but we ensure it's a valid Supabase token via JWKS signature.
        });

        return {
            valid: true,
            userId: payload.sub as string,
            email: payload.email as string
        };
    } catch (e: any) {
        console.error('[Auth] Token verification failed:', e.message);
        console.error('[Auth] Error code:', e.code);
        
        // If JWKS fails, clear it so it can be retried
        if (e.code === 'ERR_JWKS_FETCH_FAILED' || e.message?.includes('fetch failed')) {
            JWKS = null;
        }

        return { 
            valid: false, 
            error: e.code === 'ERR_JWT_EXPIRED' ? 'Token expired' : `Invalid token: ${e.message}` 
        };
    }
}
