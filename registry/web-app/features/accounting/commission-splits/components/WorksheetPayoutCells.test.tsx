/**
 * Ô cụm cột "trả sale" dùng chung cho hai màn worksheet (CR STT17 `86eydbph4`).
 * Logic đáng test: dial chưa ghim phải ra GẠCH NGANG chứ không phải `0%`, và "% TT Thưởng" phải
 * suy ngược từ tiền khi server chưa ghi số.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  BonusProgressPctCell,
  ProgressPctCell,
  formatPayoutMoney,
  optionalWorksheetTotal,
} from './WorksheetPayoutCells'

const row = (overrides: Record<string, unknown>) =>
  ({ bonus_progress_pct: null, sales_bonus: null, bonus: null, ...overrides }) as never

describe('ProgressPctCell', () => {
  it('dial chưa ghim (null) hiện gạch ngang, KHÔNG hiện 0%', () => {
    render(<ProgressPctCell value={null} />)

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/0/)).not.toBeInTheDocument()
  })

  it('dial đã ghim 0% vẫn hiện 0%, phân biệt được với chưa ghim', () => {
    render(<ProgressPctCell value="0" />)

    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('làm tròn 2 chữ số thập phân', () => {
    render(<ProgressPctCell value="24.2424" />)

    expect(screen.getByText('24,24%')).toBeInTheDocument()
  })
})

describe('BonusProgressPctCell', () => {
  it('dùng số server ghi khi có', () => {
    render(
      <BonusProgressPctCell row={row({ bonus_progress_pct: '30', sales_bonus: '1', bonus: '2' })} />
    )

    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('server chưa ghi nhưng kỳ ĐÃ chia thưởng: suy ngược từ tiền thay vì bỏ trống', () => {
    render(<BonusProgressPctCell row={row({ sales_bonus: '3450000', bonus: '10000000' })} />)

    expect(screen.getByText('34,5%')).toBeInTheDocument()
    expect(screen.getByTitle('Suy từ tiền thưởng đã chia của kỳ.')).toBeInTheDocument()
  })

  it('không có gì để suy thì hiện gạch ngang', () => {
    render(<BonusProgressPctCell row={row({ sales_bonus: '0', bonus: '10000000' })} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('mẫu số 0 không sinh Infinity/NaN', () => {
    render(<BonusProgressPctCell row={row({ sales_bonus: '5000', bonus: '0' })} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('formatPayoutMoney', () => {
  it('null/undefined quy về 0 thay vì NaN', () => {
    expect(formatPayoutMoney(null)).toBe(formatPayoutMoney('0'))
    expect(formatPayoutMoney(undefined)).toBe(formatPayoutMoney('0'))
  })
})

describe('optionalWorksheetTotal', () => {
  it('trả undefined khi BE chưa gửi khoá (⇒ dòng TỔNG hiện gạch ngang)', () => {
    expect(optionalWorksheetTotal({ total: '10' } as never, 'sales_fee_amount')).toBeUndefined()
    expect(optionalWorksheetTotal(null, 'sales_bonus')).toBeUndefined()
    expect(optionalWorksheetTotal(undefined, 'sales_bonus')).toBeUndefined()
  })

  it('đọc được khoá khi BE bổ sung', () => {
    expect(optionalWorksheetTotal({ sales_bonus: '123' } as never, 'sales_bonus')).toBe('123')
  })
})
