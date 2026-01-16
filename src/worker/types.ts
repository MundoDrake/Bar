// Basic type definition for D1 if not available globally in local dev environment
// In the actual Worker runtime, this is provided.
declare global {
    interface D1Database {
        prepare: (query: string) => D1PreparedStatement;
        dump: () => Promise<ArrayBuffer>;
        batch: <T = unknown>(statements: D1PreparedStatement[]) => Promise<D1Result<T>[]>;
        exec: (query: string) => Promise<D1ExecResult>;
    }

    interface D1PreparedStatement {
        bind: (...values: any[]) => D1PreparedStatement;
        first: <T = unknown>(colName?: string) => Promise<T | null>;
        run: <T = unknown>() => Promise<D1Result<T>>;
        all: <T = unknown>() => Promise<D1Result<T>>;
        raw: <T = unknown>() => Promise<T[]>;
    }

    interface D1Result<T = unknown> {
        results: T[];
        success: boolean;
        error?: string;
        meta: any;
    }

    interface D1ExecResult {
        count: number;
        duration: number;
    }
}

export type verifyResult =
    | { valid: true; userId: string; email: string }
    | { valid: false; error: string };

export interface Env {
    DB: D1Database;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}
