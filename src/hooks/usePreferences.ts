import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { UserPreferences } from '../types/database'

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
    alert_low_stock: true,
    alert_expiry: true,
    alert_expiry_days: 7,
    alert_ai_suggestions: true,
}

interface UsePreferencesReturn {
    preferences: UserPreferences | null
    loading: boolean
    error: string | null
    updatePreferences: (data: Partial<UserPreferences>) => Promise<{ error: string | null }>
    refreshPreferences: () => Promise<void>
}

export function usePreferences(): UsePreferencesReturn {
    const [preferences, setPreferences] = useState<UserPreferences | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { user } = useAuth()

    const fetchPreferences = useCallback(async () => {
        if (!user) return

        try {
            setLoading(true)
            setError(null)

            const { data, error: fetchError } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (fetchError) {
                // If no preferences exist, create default ones
                if (fetchError.code === 'PGRST116') {
                    const { data: newData, error: insertError } = await supabase
                        .from('user_preferences')
                        .insert({
                            user_id: user.id,
                            ...DEFAULT_PREFERENCES,
                        })
                        .select()
                        .single()

                    if (insertError) throw insertError
                    setPreferences(newData)
                    return
                }
                throw fetchError
            }

            setPreferences(data)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar preferências'
            setError(message)
            console.error('Error fetching preferences:', err)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        fetchPreferences()
    }, [fetchPreferences])

    const updatePreferences = async (data: Partial<UserPreferences>) => {
        if (!user || !preferences) return { error: 'Preferências não carregadas' }

        try {
            const { error: updateError } = await supabase
                .from('user_preferences')
                .update({
                    ...data,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)

            if (updateError) throw updateError

            await fetchPreferences()
            return { error: null }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao atualizar preferências'
            return { error: message }
        }
    }

    return {
        preferences,
        loading,
        error,
        updatePreferences,
        refreshPreferences: fetchPreferences,
    }
}
