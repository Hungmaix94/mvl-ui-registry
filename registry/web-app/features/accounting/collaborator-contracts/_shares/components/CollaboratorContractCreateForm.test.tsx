import { createRef } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CollaboratorContractCreateForm, {
  type CollaboratorContractCreateFormRef,
} from './CollaboratorContractCreateForm'

// jsdom không có ResizeObserver; `Select` dùng nó qua `useMatchTriggerWidth`.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const { createMock, invalidateByPrefixMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  invalidateByPrefixMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock(
  '@/features/accounting/collaborator-contracts/services/collaborator-contract-service',
  () => ({
    useCreateCollaboratorContract: () => ({ mutateAsync: createMock, isPending: false }),
  })
)

vi.mock('@/hooks/useApiQuery.ts', () => ({
  useInvalidateQueries: () => ({ invalidateByPrefix: invalidateByPrefixMock }),
}))

vi.mock('@/hooks/useDealSelect', () => ({
  useDealSelect: () => ({
    loadDealOptions: vi.fn().mockResolvedValue([]),
    loadInitialDealOptions: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map() }),
}))

vi.mock('@/services/toast-service.tsx', () => ({
  default: { success: toastSuccessMock, error: toastErrorMock },
}))

vi.mock('@/components/ui/file-upload/FileUpload.tsx', () => ({
  FileUpload: () => <div data-testid="file-upload" />,
}))

type PickerProps = {
  placeholder?: string
  value?: unknown
  onChange?: (next: unknown) => void
}

/** Người nhận (CTV): dropdown thật gọi API + cmdk, thay bằng nút bấm một phát ra giá trị. */
vi.mock(
  '@/features/accounting/collaborators/_shares/components/CollaboratorSelectWithCreate.tsx',
  () => ({
    default: ({ placeholder, value, onChange }: PickerProps) => (
      <button type="button" aria-label={placeholder} onClick={() => onChange?.(7)}>
        {value ? String(value) : placeholder}
      </button>
    ),
  })
)

/** Ô "Căn (Giao dịch)" dùng `Select` của bộ UI; giữ nguyên các export khác của barrel. */
vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui')>()
  return {
    ...actual,
    Select: ({ placeholder, value, onChange }: PickerProps) => (
      <button type="button" aria-label={placeholder} onClick={() => onChange?.('5')}>
        {value ? String(value) : placeholder}
      </button>
    ),
  }
})

function renderForm() {
  const ref = createRef<CollaboratorContractCreateFormRef>()
  const onSuccess = vi.fn()
  render(<CollaboratorContractCreateForm ref={ref} onSuccess={onSuccess} />)
  return { ref, onSuccess }
}

async function fillOneValidSplitRow() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Chọn căn (Deal)' }))
  await user.click(screen.getByRole('button', { name: 'Chọn người nhận' }))
  await user.type(screen.getByLabelText('% hoa hồng dòng 1'), '1.5')
}

describe('CollaboratorContractCreateForm — submit', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ id: 1 })
    invalidateByPrefixMock.mockReset().mockResolvedValue(undefined)
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
  })

  // ClickUp 86eypf62k: bản cũ dừng ở đây mà KHÔNG in ra chữ nào và KHÔNG gửi request nào — người
  // dùng đọc thành "bấm nút không lên gì". Ba assert dưới là ba mặt của đúng lỗi đó.
  it('bấm xác nhận khi form còn thiếu: không gọi API, có toast, và lỗi hiện ngay trong dòng chia', async () => {
    const { ref } = renderForm()

    await expect(ref.current?.submitForm()).rejects.toMatchObject({ isValidationError: true })

    expect(createMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalled()
    expect(toastErrorMock.mock.calls.flat()).toContain('Dòng 1: Vui lòng chọn căn')

    await waitFor(() => {
      expect(screen.getByText('Vui lòng chọn căn')).toBeInTheDocument()
    })
    expect(screen.getByText('Vui lòng chọn người nhận')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập % hoa hồng')).toBeInTheDocument()
  })

  it('điền đủ một dòng chia thì gọi API đúng một lần với payload của dòng đó', async () => {
    const { ref, onSuccess } = renderForm()
    await fillOneValidSplitRow()

    await ref.current?.submitForm()

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ deal: 5, collaborator: 7, pct_commission: '1.5' })
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('Tạo hợp đồng Cộng tác viên thành công')
    expect(onSuccess).toHaveBeenCalled()
  })

  // Mỗi dòng chia là một POST riêng ⇒ cú click thứ hai lọt qua là nhân đôi số hợp đồng tạo ra.
  it('bấm hai lần liên tiếp vẫn chỉ tạo một lần', async () => {
    const { ref } = renderForm()
    await fillOneValidSplitRow()

    await Promise.all([ref.current?.submitForm(), ref.current?.submitForm()])

    expect(createMock).toHaveBeenCalledTimes(1)
  })

  async function fillSplitRowWithPct(pct: string) {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Chọn căn (Deal)' }))
    await user.click(screen.getByRole('button', { name: 'Chọn người nhận' }))
    await user.type(screen.getByLabelText('% hoa hồng dòng 1'), pct)
  }

  it.each(['101', '150', '-1'])(
    '%% hoa hồng ngoài khoảng 0–100 (%s) thì chặn lại trước khi gửi lên server',
    async (pct) => {
      const { ref } = renderForm()
      await fillSplitRowWithPct(pct)

      await expect(ref.current?.submitForm()).rejects.toMatchObject({ isValidationError: true })

      expect(createMock).not.toHaveBeenCalled()
      await waitFor(() => {
        expect(screen.getByText('% hoa hồng phải nằm trong khoảng 0 đến 100')).toBeInTheDocument()
      })
    }
  )

  // Hai đầu mút phải ĐI QUA, nếu không luật chặn trên lại chặn nhầm ca hợp lệ.
  it.each(['100', '0'])('%% hoa hồng ở đúng đầu mút (%s) vẫn gửi lên server', async (pct) => {
    const { ref } = renderForm()
    await fillSplitRowWithPct(pct)

    await ref.current?.submitForm()

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ pct_commission: pct }))
  })

  it('% hoa hồng không phải số thì chặn lại trước khi gửi lên server', async () => {
    const { ref } = renderForm()
    await fillSplitRowWithPct('abc')

    await expect(ref.current?.submitForm()).rejects.toMatchObject({ isValidationError: true })

    expect(createMock).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText('% hoa hồng phải là số')).toBeInTheDocument()
    })
  })
})
