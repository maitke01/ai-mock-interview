import type { Route } from '../../../index'

export const resumeUploadRoute: Route = async (ctx) => {
  try {
    // Expect a multipart/form-data request with a file field named 'file'
    const req = ctx.req
    // formData is supported in the Cloudflare-like worker environment
    const formData = await req.formData()
    const file = formData.get('file') as unknown as File | null

    if (!file || typeof (file as any).name !== 'string') {
      return ctx.json({ error: 'No file uploaded or invalid file field' }, 400)
    }

    const fileName = (file as any).name || 'upload'
    // We don't persist the file in this minimal implementation. For production,
    // you'd store it in durable storage (R2, D1, or external storage) or process it.

    return ctx.json({ success: true, fileName, size: (file as any).size ?? null })
  } catch (error) {
    console.error('Error in resumeUploadRoute:', error)
    return ctx.json({ error: 'Failed to handle resume upload', details: error instanceof Error ? error.message : String(error) }, 500)
  }
}
