import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type ResumeTemplate = {
  header: string
  sidebar: string
  mainContent: string
}

/**
 * Fetches a template PDF and overlays simple text blocks from the resume template.
 * This is intentionally simple: it writes header/sidebar/mainContent to fixed positions
 * on the first page. For production you may want a templating system or better layout.
 */
export async function mergePDFWithText(templateUrl: string, template: ResumeTemplate) {
  // templateUrl will be a resolved import (string path) when Vite bundles assets
  const res = await fetch(String(templateUrl))
  if (!res.ok) throw new Error(`Failed to fetch template PDF: ${res.status}`)

  const arrayBuffer = await res.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer)

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  const { width, height } = firstPage.getSize()

  const margin = 40
  const fontSize = 10

  // Header: top-left area
  firstPage.drawText(stripTags(template.header), {
    x: margin,
    y: height - margin - fontSize,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
    maxWidth: width - margin * 2
  })

  // Sidebar: left column lower down
  firstPage.drawText(stripTags(template.sidebar), {
    x: margin,
    y: height / 2,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
    maxWidth: (width / 3) - margin
  })

  // Main content: start to the right of sidebar
  firstPage.drawText(stripTags(template.mainContent), {
    x: width / 3 + margin / 2,
    y: height / 2,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
    maxWidth: width - (width / 3) - margin * 1.5
  })

  const merged = await pdfDoc.save()
  return merged
}

export function downloadPDF(pdfBytes: Uint8Array | ArrayBuffer, fileName = 'document.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

function stripTags(input: string) {
  return input.replace(/<[^>]*>/g, '').replace(/\r?\n/g, ' ')
}
