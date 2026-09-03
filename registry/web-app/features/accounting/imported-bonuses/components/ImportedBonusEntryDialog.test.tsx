import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportedBonusEntryDialog from './ImportedBonusEntryDialog'
import type { ImportedBonusEntryDetail } from '../services/imported-bonus-service'
// Lấy enum thẳng từ schema chứ không qua service: module service đang bị `vi.mock` bên dưới,
// re-export `BonusType` của nó không tồn tại trong bản mock.
import { ImportedBonusEntryBonus_type } from '@/api/schema'

vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))
import toastService from '@/services/toast-service'

const mutateAsync = vi.fn()
vi.mock('../services/imported-bonus-service', () => ({
  useCreateImportedBonusEntry: () => ({ mutateAsync, isPending: false }),
  useUpdateImportedBonusEntry: () => ({ mutateAsync, isPending: false }),
}))

// employee_id đã có sẵn qua `entry` (chế độ sửa, ô bị khoá) — không cần picker thật.
vi.mock(
  '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog',
  () => ({
    default: () => null,
  })
)

const baseEntry: ImportedBonusEntryDetail = {
  id: 5,
  batch: 1,
  employee: 42,
  bonus_type: ImportedBonusEntryBonus_type.OTHER,
  amount: '100000',
  is_taxable: true,
  already_paid_externally: false,
  pit_withheld_at_payment: '0',
  note: '',
}

// Regression 86eypeaku: `onSubmit` từng tự bắt lỗi bằng try/catch rồi chỉ toast, không throw ra
// ngoài — AppDialog thấy `onConfirm` resolve bình thường nên tự đóng dialog dù request thất bại.
// Fix: throw lại kèm cờ `isApiError` để AppDialog giữ dialog mở.
describe('ImportedBonusEntryDialog', () => {
  it('keeps the dialog open and shows the real error when the mutation is rejected', async () => {
    const onOpenChange = vi.fn()
    const detail = 'Nhân viên MV000013720 đã có một khoản thưởng loại Other bonus trong lô này.'
    mutateAsync.mockRejectedValueOnce({ server: { errors: [{ detail }] } })

    render(
      <ImportedBonusEntryDialog open onOpenChange={onOpenChange} batchId={1} entry={baseEntry} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => {
      expect(toastService.error).toHaveBeenCalledWith(detail)
    })
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('closes the dialog and calls onSuccess when the mutation succeeds', async () => {
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()
    mutateAsync.mockResolvedValueOnce({})

    render(
      <ImportedBonusEntryDialog
        open
        onOpenChange={onOpenChange}
        batchId={1}
        entry={baseEntry}
        onSuccess={onSuccess}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})
