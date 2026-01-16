import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { getOrCreateUserProfile } from '../services/teamService'
import { supabase } from '../lib/supabase'
import { ROUTES } from '../constants/routes'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    customId: string | null
    signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signOut: () => Promise<void>
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>
    updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [customId, setCustomId] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true;

        // Get initial session
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (mounted) {
                    console.log('[AuthContext] Initial session:', session?.user?.id)
                    setSession(session)
                    setUser(session?.user ?? null)

                    if (session?.user?.id) {
                        try {
                            console.log('[AuthContext] Fetching customId for user:', session.user.id)
                            const cid = await getOrCreateUserProfile(session.user.id)
                            if (mounted) {
                                console.log('[AuthContext] Got customId:', cid)
                                setCustomId(cid)
                            }
                        } catch (e) {
                            console.error('[AuthContext] Error fetching profile:', e)
                        }
                    }
                }
            } catch (error) {
                console.error('[AuthContext] Initialization error:', error)
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        initSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mounted) return

                console.log('[AuthContext] Auth state changed:', _event, session?.user?.id)
                setSession(session)
                setUser(session?.user ?? null)

                // If we have a session but it's a new user (different from previous), fetch profile
                if (session?.user?.id) {
                    try {
                        const cid = await getOrCreateUserProfile(session.user.id)
                        if (mounted) {
                            console.log('[AuthContext] Got customId on change:', cid)
                            setCustomId(cid)
                        }
                    } catch (e) {
                        console.error('[AuthContext] Error fetching profile on change:', e)
                    }
                } else {
                    // Start of cleaning state
                    setCustomId(null)
                }

                setLoading(false)
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}${ROUTES.WELCOME}`,
            },
        })
        return { error }
    }

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { error }
    }

    const signOut = async () => {
        console.log('[AuthContext] Signing out...')
        const { error } = await supabase.auth.signOut()
        if (error) {
            console.error('[AuthContext] Error signing out:', error)
        }
        // Explicitly clear state just in case onAuthStateChange doesn't catch it immediately
        setSession(null)
        setUser(null)
        setCustomId(null)
    }

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}${ROUTES.RESET_PASSWORD}`,
        })
        return { error }
    }

    const updatePassword = async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        })
        return { error }
    }

    const value = {
        user,
        session,
        loading,
        customId,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
