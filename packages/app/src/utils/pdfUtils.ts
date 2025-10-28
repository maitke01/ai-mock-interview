import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface ResumeTemplateData {
  header: string
  sidebar: string
  mainContent: string
}

/**
 * Merges text content into a PDF template
 * @param pdfUrl - URL or path to the PDF template
 * @param templateData - Object containing header, sidebar, and mainContent text
 * @returns PDF bytes ready for download
 */
export async function mergePDFWithText (
  pdfUrl: string,
  templateData: ResumeTemplateData
): Promise<Uint8Array> {
  try {
    // Fetch the PDF template
    const existingPdfBytes = await fetch(pdfUrl).then((res) => res.arrayBuffer())

    // Load the PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]

    // Get page dimensions
    const { height } = firstPage.getSize()

    // Embed fonts
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Helper function to draw multi-line text
    const drawMultiLineText = (
      text: string,
      x: number,
      startY: number,
      fontSize: number,
      font: any,
      maxWidth: number,
      lineHeight: number
    ) => {
      const lines = text.split('\n')
      let y = startY

      lines.forEach((line) => {
        if (line.trim()) {
          // Check if line is a heading (ALL CAPS or first line)
          const isHeading = line === line.toUpperCase() && line.length < 30
          const currentFont = isHeading ? boldFont : font
          const currentSize = isHeading ? fontSize + 1 : fontSize

          firstPage.drawText(line, {
            x,
            y,
            size: currentSize,
            font: currentFont,
            color: rgb(0, 0, 0),
            maxWidth
          })
        }
        y -= lineHeight
      })
    }

    // Draw Header (centered at top)
    const headerLines = templateData.header.split('\n')
    let yPosition = height - 60

    headerLines.forEach((line, index) => {
      if (line.trim()) {
        const fontSize = index === 0 ? 20 : 11
        const font = index === 0 ? boldFont : regularFont
        const textWidth = font.widthOfTextAtSize(line, fontSize)
        const xCenter = (firstPage.getWidth() - textWidth) / 2

        firstPage.drawText(line, {
          x: xCenter,
          y: yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        })
        yPosition -= index === 0 ? 25 : 18
      }
    })

    // Draw Sidebar (left column)
    drawMultiLineText(
      templateData.sidebar,
      50,
      height - 180,
      10,
      regularFont,
      180,
      15
    )

    // Draw Main Content (right column)
    drawMultiLineText(
      templateData.mainContent,
      250,
      height - 180,
      10,
      regularFont,
      300,
      15
    )

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save()
    return pdfBytes
  } catch (error) {
    console.error('Error merging PDF:', error)
    throw new Error('Failed to merge text into PDF template')
  }
}

/**
 * Triggers download of PDF file
 * @param pdfBytes - PDF data as Uint8Array
 * @param fileName - Name for the downloaded file
 */
export function downloadPDF (pdfBytes: Uint8Array, fileName: string): void {
  // Use the underlying ArrayBuffer to satisfy Blob typing
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
