import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportedBonusUploadDialog from './ImportedBonusUploadDialog'

vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))
import toastService from '@/services/toast-service'

// Chỉ cần XLSX.read/sheet_to_json trả về đúng 1 dòng hợp lệ — việc parse file thật không phải
// điều đang test, tách khỏi hành vi giữ/đóng dialog đang muốn xác nhận.
vi.mock('xlsx', () => ({
  read: vi.fn(() => ({ SheetNames: ['Template'], Sheets: { Template: {} } })),
  utils: {
    sheet_to_json: vi.fn(() => [
      ['Mã nhân viên', 'Loại thưởng', 'Số tiền (VND)', 'Ghi chú', 'Thuế đã khấu (VND)'],
      ['MV000013720', 'thưởng khác', 111000, 'note', 0],
    ]),
    book_new: vi.fn(),
    aoa_to_sheet: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

// Regression 86eypeaku: AppDialog đóng dialog bất cứ khi nào `onConfirm` resolve mà không throw.
// `handleConfirm` trước đây nuốt mọi lỗi (thiếu kỳ tháng, chưa có file, hay API từ chối) chỉ bằng
// toast rồi `return` — AppDialog luôn thấy "thành công" và tự đóng dialog, làm mất file/kỳ tháng
// vừa chọn. Fix: throw lỗi gắn cờ `isValidationError`/`isApiError` ở mọi nhánh lỗi để AppDialog
// giữ dialog mở.
describe('ImportedBonusUploadDialog', () => {
  it('keeps the dialog open and does not call onSuccess when no Excel file has been parsed yet', async () => {
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()
    render(<ImportedBonusUploadDialog open onOpenChange={onOpenChange} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: 'Import dữ liệu' }))

    await waitFor(() => {
      expect(toastService.error).toHaveBeenCalledWith('Chưa có dữ liệu Excel hợp lệ được chọn')
    })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('keeps the dialog open and shows the real error when onSuccess is rejected by the server', async () => {
    const onOpenChange = vi.fn()
    const detail = 'Đã tồn tại một lô thưởng đang xử lý cho 12/2028.'
    const onSuccess = vi.fn().mockRejectedValue({ server: { errors: [{ detail }] } })

    render(<ImportedBonusUploadDialog open onOpenChange={onOpenChange} onSuccess={onSuccess} />)

    const file = new File(['dummy'], 'test.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    // DialogContent portal ra document.body (Radix) — không nằm trong `container` của render().
    // Input file thô không có accessible name (không có <label htmlFor>) nên không truy được
    // qua query chuẩn của Testing Library — querySelector là cách hợp lệ còn lại.
    // eslint-disable-next-line testing-library/no-node-access
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(toastService.success).toHaveBeenCalledWith(
        'Đã đọc thành công 1 dòng dữ liệu từ file Excel'
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Import dữ liệu' }))

    await waitFor(() => {
      expect(toastService.error).toHaveBeenCalledWith(detail)
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
