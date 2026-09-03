// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import CtvDealSendMailButton from './CtvDealSendMailButton'

const mockDisplayConfirm = vi.fn()

vi.mock('@/hooks/useDialog.ts', () => ({
  useDialog: () => ({ displayConfirm: mockDisplayConfirm }),
}))

describe('CtvDealSendMailButton', () => {
  beforeEach(() => {
    mockDisplayConfirm.mockReset()
  })

  it('shows "Gửi" and confirms + calls onSend when there is no prior send', () => {
    const onSend = vi.fn()
    render(
      <CtvDealSendMailButton dealCode="HD001" email="a@mvl.vn" sentAt={null} onSend={onSend} />
    )

    expect(screen.getByText('Gửi')).toBeTruthy()
    fireEvent.click(screen.getByText('Gửi'))

    expect(mockDisplayConfirm).toHaveBeenCalledTimes(1)
    const config = mockDisplayConfirm.mock.calls[0][0]
    expect(config.title).toBe('Gửi email đối chiếu')
    config.onConfirm()
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('shows "Gửi lại" once the deal already has a sent timestamp', () => {
    render(
      <CtvDealSendMailButton
        dealCode="HD001"
        email="a@mvl.vn"
        sentAt="2026-07-15T03:20:00Z"
        onSend={vi.fn()}
      />
    )

    expect(screen.getByText('Gửi lại')).toBeTruthy()
    fireEvent.click(screen.getByText('Gửi lại'))
    const config = mockDisplayConfirm.mock.calls[0][0]
    expect(config.title).toBe('Gửi lại email đối chiếu')
  })

  it('disables the button when there is no email resolved for this deal', () => {
    render(<CtvDealSendMailButton dealCode="HD001" email="" sentAt={null} onSend={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Gửi' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('disables the button when the caller marks it disabled (no permission)', () => {
    render(
      <CtvDealSendMailButton
        dealCode="HD001"
        email="a@mvl.vn"
        sentAt={null}
        disabled
        onSend={vi.fn()}
      />
    )

    const button = screen.getByRole('button', { name: 'Gửi' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })
})
