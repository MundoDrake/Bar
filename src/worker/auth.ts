// src/worker/auth.ts
import { verifyResult } from './types';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

// Store JWKS in global scope for caching, with timestamp for refresh
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksCreatedAt: number = 0;
const JWKS_MAX_AGE_MS = 5 * 60 * 1000; // Refresh JWKS every 5 minutes

/**
 * Verifies a Supabase JWT token using JWKS.
 * Includes automatic JWKS cache refresh and detailed error logging.
 */
export async function verifySupabaseToken(token: string, supabaseUrl: string): Promise<verifyResult> {
    // Normalize URL (remove trailing slash if present)
    const baseUrl = supabaseUrl.replace(/\/+$/, '');
    const jwksUrl = `${baseUrl}/auth/v1/.well-known/jwks.json`;

    try {
        const now = Date.now();

        // Create or refresh JWKS if expired/missing
        if (!JWKS || (now - jwksCreatedAt) > JWKS_MAX_AGE_MS) {
            console.log(`[Auth] Creating/refreshing JWKS from: ${jwksUrl}`);
            JWKS = createRemoteJWKSet(new URL(jwksUrl));
            jwksCreatedAt = now;
        }

        // Verify the token
        const { payload } = await jwtVerify(token, JWKS, {
            // Don't validate issuer/audience strictly - Supabase tokens vary
            // The signature verification is what matters
        });

        // Extract user info from payload
        const userId = payload.sub;
        const email = (payload as JWTPayload & { email?: string }).email;

        if (!userId) {
            console.error('[Auth] Token payload missing sub (userId)');
            return { valid: false, error: 'Token missing user ID' };
        }

        console.log(`[Auth] Token verified for user: ${userId}`);
        return {
            valid: true,
            userId,
            email: email || undefined
        };
    } catch (e: any) {
        const errorMessage = e.message || String(e);
        console.error(`[Auth] Token verification failed: ${errorMessage}`);
        console.error(`[Auth] JWKS URL used: ${jwksUrl}`);

        // If verification fails, invalidate cached JWKS so next request retries
        console.log('[Auth] Invalidating JWKS cache due to error');
        JWKS = null;
        jwksCreatedAt = 0;

        // Provide descriptive error
        let userError = 'Token verification failed';
        if (errorMessage.includes('expired')) {
            userError = 'Token expired';
        } else if (errorMessage.includes('signature')) {
            userError = 'Invalid token signature';
        } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            userError = 'Failed to fetch verification keys';
        }

        return { valid: false, error: `${userError}: ${errorMessage}` };
    }
}
