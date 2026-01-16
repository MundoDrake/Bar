
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

        const { payload } = await jwtVerify(token, JWKS);

        return {
            valid: true,
            userId: payload.sub as string,
            email: payload.email as string
        };
    } catch (e) {
        console.error('Token verification failed:', e);
        return { valid: false, error: 'Invalid token' };
    }
}
