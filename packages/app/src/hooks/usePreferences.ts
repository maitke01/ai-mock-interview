import { useState, useCallback } from 'react'

export function usePreferences() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const savePreference = useCallback(async (opts: { id?: string; userId?: string; name?: string; text: string; metadata?: any }) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/preferences/upsert', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: opts.id, userId: opts.userId, name: opts.name, text: opts.text, metadata: opts.metadata })
            })
            let j: any = null
            let textBody = null
            try {
                textBody = await res.text()
                j = textBody ? JSON.parse(textBody) : null
            } catch {
                j = null
            }
            setLoading(false)
            if (!res.ok) {
                const errInfo = j || textBody || `HTTP ${res.status}`
                setError(typeof errInfo === 'string' ? errInfo : JSON.stringify(errInfo))
                return { success: false, error: errInfo, status: res.status }
            }
            return { success: true, data: j || textBody }
        } catch (e: any) {
            setLoading(false)
            setError(String(e))
            return { success: false, error: String(e) }
        }
    }, [])

    const searchPreferences = useCallback(async (opts: { query: string; topK?: number; userId?: string }) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/preferences/search', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: opts.query, topK: opts.topK || 5, userId: opts.userId })
            })
            const j = await res.json()
            setLoading(false)
            if (!res.ok) {
                setError(j?.error || 'Search failed')
                return { success: false, error: j }
            }
            return { success: true, results: j.results }
        } catch (e: any) {
            setLoading(false)
            setError(String(e))
            return { success: false, error: String(e) }
        }
    }, [])

    const listPreferences = useCallback(async (opts?: { userId?: string }) => {
        setLoading(true)
        setError(null)
        try {
            const userQuery = opts?.userId ? `?userId=${encodeURIComponent(opts.userId)}` : ''
            const res = await fetch(`/api/preferences/list${userQuery}`, { method: 'GET', credentials: 'include' })
            const j = await res.json()
            setLoading(false)
            if (!res.ok) {
                setError(j?.error || 'List failed')
                return { success: false, error: j }
            }
            return { success: true, results: j.results }
        } catch (e: any) {
            setLoading(false)
            setError(String(e))
            return { success: false, error: String(e) }
        }
    }, [])

    const deletePreference = useCallback(async (id: string) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/preferences/delete/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
            let j: any = null
            try { j = await res.json() } catch { j = null }
            setLoading(false)
            if (!res.ok) {
                const errInfo = j || `HTTP ${res.status}`
                setError(typeof errInfo === 'string' ? errInfo : JSON.stringify(errInfo))
                return { success: false, error: errInfo }
            }
            return { success: true }
        } catch (e: any) {
            setLoading(false)
            setError(String(e))
            return { success: false, error: String(e) }
        }
    }, [])

    return { savePreference, searchPreferences, listPreferences, deletePreference, loading, error }
}

export default usePreferences
