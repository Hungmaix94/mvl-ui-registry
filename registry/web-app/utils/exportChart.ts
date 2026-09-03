import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

const PX_PER_MM = 25.4 / 96

const pxToMm = (value: number) => value * PX_PER_MM

const ensureSpinnerStyle = () => {
  if (document.getElementById('global-download-spinner-style')) {
    return
  }

  const style = document.createElement('style')
  style.id = 'global-download-spinner-style'
  style.innerHTML = `
    @keyframes global-download-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}

const createLoadingOverlay = (message: string) => {
  ensureSpinnerStyle()

  const overlay = document.createElement('div')
  overlay.setAttribute('data-global-download-overlay', 'true')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'rgba(255, 255, 255, 0.75)'
  overlay.style.display = 'flex'
  overlay.style.flexDirection = 'column'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.zIndex = '9999'
  overlay.style.gap = '12px'

  const spinner = document.createElement('div')
  spinner.style.width = '40px'
  spinner.style.height = '40px'
  spinner.style.border = '4px solid var(--color-border-1, #d8d8d8)'
  spinner.style.borderTopColor = 'var(--color-action-primary-red-default, #b32b2f)'
  spinner.style.borderRadius = '9999px'
  spinner.style.animation = 'global-download-spin 1s linear infinite'

  const label = document.createElement('div')
  label.textContent = message
  label.style.color = 'var(--color-content-dark-1, #000000)'
  label.style.fontFamily = 'Inter, sans-serif'
  label.style.fontSize = '14px'
  label.style.fontWeight = '500'

  overlay.appendChild(spinner)
  overlay.appendChild(label)
  document.body.appendChild(overlay)

  return {
    remove: () => {
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay)
      }
    },
  }
}

type PdfOrientation = 'portrait' | 'landscape' | 'p' | 'l'

type ExportOptions = {
  fileName: string
  overlayMessage?: string
  orientation?: PdfOrientation
}

export const exportElementToPdf = async (container: HTMLElement, options: ExportOptions) => {
  const { fileName, overlayMessage = 'Đang tạo báo cáo...', orientation } = options

  const downloadButtons = container.querySelectorAll('button')
  const originalDisplays = new Map<Element, string>()
  downloadButtons.forEach((btn) => {
    originalDisplays.set(btn, (btn as HTMLElement).style.display)
    ;(btn as HTMLElement).style.display = 'none'
  })

  const originalInlineStyles = {
    border: container.style.border,
    borderRadius: container.style.borderRadius,
    boxShadow: container.style.boxShadow,
    outline: container.style.outline,
  }

  container.style.border = 'none'
  container.style.borderRadius = '0'
  container.style.boxShadow = 'none'
  container.style.outline = 'none'

  const overlayController = createLoadingOverlay(overlayMessage)

  try {
    const dataUrl = await toPng(container, {
      cacheBust: true,
      pixelRatio: window.devicePixelRatio || 1,
      backgroundColor: '#ffffff',
      fontEmbedCSS: '',
    })

    const rect = container.getBoundingClientRect()
    const imageWidthMm = pxToMm(rect.width)
    const imageHeightMm = pxToMm(rect.height)

    const inferredOrientation: PdfOrientation =
      orientation ?? (imageWidthMm > imageHeightMm ? 'landscape' : 'portrait')
    const doc = new jsPDF({ orientation: inferredOrientation, unit: 'mm', format: 'a4' })

    const pdfWidth = doc.internal.pageSize.getWidth()
    const pdfHeight = doc.internal.pageSize.getHeight()
    const margin = 10

    const scale = Math.min(
      (pdfWidth - margin * 2) / imageWidthMm,
      (pdfHeight - margin * 2) / imageHeightMm,
      1
    )

    const renderWidth = imageWidthMm * scale
    const renderHeight = imageHeightMm * scale
    const x = (pdfWidth - renderWidth) / 2
    const y = (pdfHeight - renderHeight) / 2

    doc.addImage(dataUrl, 'PNG', x, y, renderWidth, renderHeight)
    const normalizedFileName = fileName.toLowerCase().endsWith('.pdf')
      ? fileName
      : `${fileName}.pdf`
    doc.save(normalizedFileName)
  } finally {
    downloadButtons.forEach((btn) => {
      ;(btn as HTMLElement).style.display = originalDisplays.get(btn) ?? ''
    })

    overlayController.remove()

    container.style.border = originalInlineStyles.border
    container.style.borderRadius = originalInlineStyles.borderRadius
    container.style.boxShadow = originalInlineStyles.boxShadow
    container.style.outline = originalInlineStyles.outline
  }
}
