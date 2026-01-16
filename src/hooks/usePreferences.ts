import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { UserPreferences } from '../types/database'

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
    const { user, session } = useAuth()

    const fetchPreferences = useCallback(async () => {
        if (!user || !session?.access_token) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            // Try to fetch existing preferences
            const { data, error: fetchError } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (data) {
                setPreferences({
                    ...data,
                    alert_low_stock: Boolean(data.alert_low_stock),
                    alert_expiry: Boolean(data.alert_expiry),
                    alert_ai_suggestions: Boolean(data.alert_ai_suggestions),
                })
            } else if (fetchError?.code === 'PGRST116') {
                // Not found - create default preferences
                const defaultPrefs = {
                    user_id: user.id,
                    alert_low_stock: true,
                    alert_expiry: true,
                    alert_expiry_days: 7,
                    alert_ai_suggestions: true
                }

                const { data: newData, error: insertError } = await supabase
                    .from('user_preferences')
                    .insert(defaultPrefs)
                    .select()
                    .single()

                if (insertError) {
                    // Handle race condition
                    if (insertError.code === '23505') {
                        const { data: existingData } = await supabase
                            .from('user_preferences')
                            .select('*')
                            .eq('user_id', user.id)
                            .single()
                        if (existingData) {
                            setPreferences(existingData)
                        }
                    } else {
                        throw insertError
                    }
                } else if (newData) {
                    setPreferences(newData)
                }
            } else if (fetchError) {
                throw fetchError
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar preferências'
            setError(message)
            console.error('Error fetching preferences:', err)
        } finally {
            setLoading(false)
        }
    }, [user, session?.access_token])

    useEffect(() => {
        fetchPreferences()
    }, [fetchPreferences])

    const updatePreferences = async (data: Partial<UserPreferences>) => {
        if (!user || !preferences) return { error: 'Preferências não carregadas' }

        try {
            const { data: updated, error: updateError } = await supabase
                .from('user_preferences')
                .update({
                    ...data,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .select()
                .single()

            if (updateError) throw updateError

            if (updated) {
                setPreferences({
                    ...updated,
                    alert_low_stock: Boolean(updated.alert_low_stock),
                    alert_expiry: Boolean(updated.alert_expiry),
                    alert_ai_suggestions: Boolean(updated.alert_ai_suggestions),
                })
            }

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
