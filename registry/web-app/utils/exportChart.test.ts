import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportElementToPdf } from './exportChart'

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mockImageData'),
}))

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(() => ({
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      addImage: vi.fn(),
      save: vi.fn(),
    })),
  }
})

describe('exportElementToPdf', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.style.width = '500px'
    container.style.height = '300px'

    const btn1 = document.createElement('button')
    btn1.textContent = 'Button 1'
    container.appendChild(btn1)

    const btn2 = document.createElement('button')
    btn2.textContent = 'Button 2'
    container.appendChild(btn2)

    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
    vi.clearAllMocks()
  })

  it('exports element to pdf and restores button visibility', async () => {
    const buttons = container.querySelectorAll('button')
    expect(buttons[0].style.display).toBe('')
    expect(buttons[1].style.display).toBe('')

    await exportElementToPdf(container, {
      fileName: 'TestExport.pdf',
      overlayMessage: 'Generating PDF...',
    })

    expect(buttons[0].style.display).toBe('')
    expect(buttons[1].style.display).toBe('')
  })
})
