import Papa from 'papaparse'
import React, { useState } from 'react'

const AdminImportJobs: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [rssUrl, setRssUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [previewRows, setPreviewRows] = useState<any[] | null>(null)
  const [history, setHistory] = useState<any[] | null>(null)

  const uploadCSV = async () => {
    if (!file) return
    setLoading(true)
    // Parse CSV for preview using PapaParse
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (p) => {
        setPreviewRows(p.data as any[])
        setLoading(false)
      },
      error: () => {
        setResult({ error: 'Failed to parse CSV' })
        setLoading(false)
      }
    })
  }

  const confirmImportParsed = async () => {
    if (!previewRows || previewRows.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/import-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: previewRows })
      })
      const data = await res.json()
      setResult(data)
      // clear preview on success
      setPreviewRows(null)
    } catch {
      setResult({ error: 'Import failed' })
    }
    setLoading(false)
  }

  const importRss = async () => {
    if (!rssUrl) return
    setLoading(true)
    try {
      const res = await fetch('/api/import-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rssUrl })
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ error: 'Import failed' })
    }
    setLoading(false)
  }

  return (
    <div className='max-w-3xl mx-auto p-4'>
      <h2 className='text-2xl font-semibold mb-4'>Admin — Import Jobs</h2>

      <div className='mb-6'>
        <label className='block text-sm font-medium mb-1'>Upload CSV</label>
        <input type='file' accept='.csv' onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
        <div className='mt-2'>
          <button onClick={uploadCSV} disabled={!file || loading} className='px-4 py-2 bg-blue-600 text-white rounded'>
            {loading ? 'Importing...' : 'Import CSV'}
          </button>
        </div>
      </div>

      <div className='mb-6'>
        <label className='block text-sm font-medium mb-1'>Import from RSS</label>
        <input
          type='text'
          value={rssUrl}
          onChange={(e) => setRssUrl(e.target.value)}
          placeholder='https://example.com/feed.xml'
          className='w-full border rounded px-2 py-1'
        />
        <div className='mt-2'>
          <button
            onClick={importRss}
            disabled={!rssUrl || loading}
            className='px-4 py-2 bg-green-600 text-white rounded'
          >
            {loading ? 'Importing...' : 'Import RSS'}
          </button>
        </div>
      </div>

      {previewRows && (
        <div className='mb-4'>
          <h4 className='font-medium mb-2'>CSV Preview ({previewRows.length} rows)</h4>
          <div className='max-h-48 overflow-auto border rounded p-2 bg-white'>
            <pre className='text-xs'>{JSON.stringify(previewRows.slice(0, 10), null, 2)}</pre>
          </div>
          <div className='mt-2'>
            <button
              onClick={confirmImportParsed}
              className='px-4 py-2 bg-blue-600 text-white rounded mr-2'
              disabled={loading}
            >
              Import Parsed Rows
            </button>
            <button onClick={() => setPreviewRows(null)} className='px-4 py-2 border rounded'>Cancel</button>
          </div>
        </div>
      )}

      <div className='mb-6'>
        <div className='flex gap-2 mb-2'>
          <button
            onClick={async () => {
              setLoading(true)
              try {
                const res = await fetch('/api/setup-db', { method: 'POST', credentials: 'include' })
                let d: any
                try {
                  d = await res.json()
                } catch {
                  d = await res.text()
                }
                setResult({ status: res.status, body: d })
              } catch (e: any) {
                setResult({ error: 'Setup failed', details: String(e) })
              }
              setLoading(false)
            }}
            className='px-3 py-1 bg-yellow-400 rounded'
          >
            Setup DB
          </button>

          <button
            onClick={async () => {
              setLoading(true)
              try {
                const res = await fetch('/api/seed-jobs', { method: 'POST', credentials: 'include' })
                let d: any
                try {
                  d = await res.json()
                } catch {
                  d = await res.text()
                }
                setResult({ status: res.status, body: d })
              } catch (e: any) {
                setResult({ error: 'Seed failed', details: String(e) })
              }
              setLoading(false)
            }}
            className='px-3 py-1 bg-indigo-500 text-white rounded'
          >
            Seed Jobs
          </button>
        </div>

        <div className='mt-2'>
          <button
            onClick={async () => {
              setLoading(true)
              try {
                const res = await fetch('/api/reindex-vectors', { method: 'POST', credentials: 'include' })
                let d: any
                try {
                  d = await res.json()
                } catch {
                  d = await res.text()
                }
                setResult({ status: res.status, body: d })
              } catch (e: any) {
                setResult({ error: 'Reindex failed', details: String(e) })
              }
              setLoading(false)
            }}
            className='px-3 py-1 bg-emerald-600 text-white rounded'
          >
            Reindex Vectors
          </button>
        </div>

        <h4 className='font-medium mb-2'>Import History</h4>
        <div className='flex gap-2 mb-2'>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/import-history')
                const d = await res.json()
                setHistory(d.results || [])
              } catch {
                setResult({ error: 'Failed to fetch history' })
              }
            }}
            className='px-3 py-1 bg-gray-200 rounded'
          >
            Refresh
          </button>
        </div>
        {history && (
          <div className='max-h-40 overflow-auto border rounded p-2 bg-white text-xs'>
            <pre>{JSON.stringify(history, null, 2)}</pre>
          </div>
        )}
      </div>

      {result && (
        <div className='mt-4 p-3 border rounded bg-gray-50'>
          <pre className='whitespace-pre-wrap text-sm'>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default AdminImportJobs
