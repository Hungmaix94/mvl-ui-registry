import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'

/**
 * Regression cho bug "sheet trong suốt": bản shadcn gốc đặt nền panel bằng `bg-background`,
 * nhưng theme dự án không khai báo token `--color-background` ⇒ Tailwind v4 KHÔNG sinh ra
 * class `.bg-background` ⇒ panel không có nền, nội dung trang phía dưới xuyên qua.
 * Đã gặp thật ở sheet "Xem lịch sử" của màn Thực nhận HH / Giao dịch tiền về đợt này.
 *
 * Class name đúng thôi chưa đủ — cái hỏng là class trỏ vào token KHÔNG tồn tại. Nên test
 * lấy chính token mà panel đang dùng rồi đối chiếu ngược lại file theme.
 */

const THEME_CSS = readFileSync(
  resolve(__dirname, '../../assets/styles/tailwind-colors.css'),
  'utf-8'
)

const openSheet = (className?: string) => {
  render(
    <Sheet open>
      <SheetContent side="right" className={className}>
        <SheetHeader>
          <SheetTitle>Lịch sử</SheetTitle>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
  // `SheetContent` là Radix DialogContent nên tra bằng role, không đụng DOM trực tiếp.
  return screen.getByRole('dialog')
}

const getBackgroundClass = (el: HTMLElement) =>
  Array.from(el.classList).find((c) => c.startsWith('bg-'))

describe('SheetContent — nền panel', () => {
  it('có sẵn class nền khi call site không truyền className', () => {
    expect(getBackgroundClass(openSheet())).toBeDefined()
  })

  it('dùng token nền có thật trong theme, không phải token shadcn đã chết', () => {
    const bgClass = getBackgroundClass(openSheet())

    // `bg-background-1` -> `--color-background-1`
    expect(THEME_CSS).toContain(`--color-${bgClass!.replace(/^bg-/, '')}:`)
  })

  it('không còn dùng `bg-background` (token shadcn không được khai báo ở dự án này)', () => {
    expect(openSheet().classList.contains('bg-background')).toBe(false)
  })

  it('vẫn nhận className của call site', () => {
    const content = openSheet('w-[800px] p-0')

    expect(content.classList.contains('w-[800px]')).toBe(true)
    expect(content.classList.contains('p-0')).toBe(true)
  })
})
