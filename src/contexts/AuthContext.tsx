import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
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
    const lastFetchedUserId = useRef<string | null>(null)

    useEffect(() => {
        let mounted = true;

        const fetchProfile = async (userId: string) => {
            if (lastFetchedUserId.current === userId && customId) return;
            
            try {
                console.log('[AuthContext] Fetching profile for user:', userId)
                const cid = await getOrCreateUserProfile(userId)
                if (mounted && cid) {
                    console.log('[AuthContext] Got customId:', cid)
                    setCustomId(cid)
                    lastFetchedUserId.current = userId
                }
            } catch (e) {
                console.error('[AuthContext] Error fetching profile:', e)
            }
        }

        // Get initial session
        const initSession = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession()

                if (mounted) {
                    console.log('[AuthContext] Initial session check')
                    setSession(initialSession)
                    setUser(initialSession?.user ?? null)

                    if (initialSession?.user?.id) {
                        await fetchProfile(initialSession.user.id)
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
            async (event, currentSession) => {
                if (!mounted) return

                console.log('[AuthContext] Auth state changed:', event, currentSession?.user?.id)
                
                setSession(currentSession)
                setUser(currentSession?.user ?? null)

                if (currentSession?.user?.id) {
                    await fetchProfile(currentSession.user.id)
                } else if (event === 'SIGNED_OUT') {
                    setCustomId(null)
                    lastFetchedUserId.current = null
                }

                setLoading(false)
            }
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [customId])

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
        lastFetchedUserId.current = null
        setCustomId(null)
        const { error } = await supabase.auth.signOut()
        if (error) {
            console.error('[AuthContext] Error signing out:', error)
        }
        setSession(null)
        setUser(null)
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
