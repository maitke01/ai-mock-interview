import { useState, useEffect } from 'react'

export function usePreferences() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // On mount, try to sync any locally-saved pending preferences to the server.
    useEffect(() => {
        const pendingKey = 'pendingJobPreferences'
        async function syncPending() {
            try {
                const raw = localStorage.getItem(pendingKey)
                if (!raw) return
                const items = JSON.parse(raw || '[]') as any[]
                if (!Array.isArray(items) || items.length === 0) return
                const stillPending: any[] = []
                for (const it of items) {
                    try {
                        const res = await fetch('/api/preferences/upsert', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: it.id, userId: it.userId, name: it.name, text: it.text, metadata: it.metadata })
                        })
                        if (!res.ok) {
                            // if server still returns a D1 error, stop trying for now and keep remaining items pending
                            const text = await res.text()
                            if (text && text.includes('D1')) {
                                stillPending.push(it)
                                continue
                            }
                            // if other server error, keep item pending as well
                            stillPending.push(it)
                            continue
                        }
                        // success: do not re-add
                    } catch (e) {
                        // network or other error: keep item pending
                        stillPending.push(it)
                    }
                }
                if (stillPending.length > 0) localStorage.setItem(pendingKey, JSON.stringify(stillPending))
                else localStorage.removeItem(pendingKey)
            } catch (e) {
                console.warn('Failed to sync pending job preferences', e)
            }
        }

        // run in background without blocking
        syncPending()
    }, [])

    async function savePreference(opts: { id?: string; userId?: string; name?: string; text: string; metadata?: any }) {
        setLoading(true)
        setError(null)
        try {
            const body: any = { userId: opts.userId, name: opts.name, text: opts.text, metadata: opts.metadata }
            if (opts.id) body.id = opts.id
            const res = await fetch('/api/preferences/upsert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            let j: any = null
            let textBody = null
            try {
                textBody = await res.text()
                // try parse JSON, fall back to text
                j = textBody ? JSON.parse(textBody) : null
            } catch (err) {
                // not JSON
                j = null
            }
            setLoading(false)
            if (!res.ok) {
                const errInfo = j || textBody || `HTTP ${res.status}`
                // setError to a helpful string but keep original body for callers
                setError(typeof errInfo === 'string' ? errInfo : JSON.stringify(errInfo))

                // If the failure is a D1 DB error (local dev), fall back to saving preference locally so the user doesn't lose work.
                try {
                    const errStr = typeof errInfo === 'string' ? errInfo : JSON.stringify(errInfo)
                    if (errStr && errStr.includes('D1')) {
                        // generate a client-side id
                        const clientId = 'local-' + Math.random().toString(36).slice(2, 9)
                        const pendingKey = 'pendingJobPreferences'
                        const existing = JSON.parse(localStorage.getItem(pendingKey) || '[]')
                        existing.push({ id: clientId, userId: opts.userId || 'public', name: opts.name || null, text: opts.text, metadata: opts.metadata || null, savedAt: Date.now() })
                        localStorage.setItem(pendingKey, JSON.stringify(existing))
                        setLoading(false)
                        return { success: true, data: { savedLocally: true, id: clientId } }
                    }
                } catch (e) {
                    console.warn('Failed to persist preference locally', e)
                }

                return { success: false, error: errInfo, status: res.status }
            }
            // success: prefer parsed JSON, else return raw text
            return { success: true, data: j || textBody }
        } catch (e: any) {
            setLoading(false)
            setError(String(e))
            return { success: false, error: String(e) }
        }
    }

    async function deletePreference(id: string) {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/preferences/delete/${encodeURIComponent(id)}`, { method: 'DELETE' })
            let j = null
            try { j = await res.json() } catch { j = null }
            setLoading(false)
            if (!res.ok) return { success: false, error: j || `HTTP ${res.status}` }
            return { success: true, data: j }
        } catch (e: any) {
            setLoading(false)
            setError(String(e))
            return { success: false, error: String(e) }
        }
    }

    async function searchPreferences(opts: { query: string; topK?: number; userId?: string }) {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/preferences/search', {
                method: 'POST',
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
    }

    async function listPreferences(opts?: { userId?: string }) {
        setLoading(true)
        setError(null)
        try {
            const userQuery = opts?.userId ? `?userId=${encodeURIComponent(opts.userId)}` : ''
            const res = await fetch(`/api/preferences/list${userQuery}`, { method: 'GET' })
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
    }

    return { savePreference, deletePreference, searchPreferences, listPreferences, loading, error }
}

export default usePreferences
