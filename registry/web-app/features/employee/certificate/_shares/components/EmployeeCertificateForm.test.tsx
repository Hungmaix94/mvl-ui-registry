import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EmployeeCertificateType } from '@/constants/api-schema-aliases'

// jsdom không có ResizeObserver; `Select` dùng nó qua `useMatchTriggerWidth`.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const { createMock, updateMock, invalidateByPrefixMock, navigateMock, certificateRef } = vi.hoisted(
  () => ({
    createMock: vi.fn(),
    updateMock: vi.fn(),
    invalidateByPrefixMock: vi.fn(),
    navigateMock: vi.fn(),
    certificateRef: { current: null as unknown },
  })
)

// Mock BỘ PHẬN: `@/components/ui` kéo theo PageTitle → src/routes/AppRoute.tsx, file này cần
// `Outlet`. Mock toàn phần react-router-dom là gãy cả cây import trước khi chạy được test nào.
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))

// `@/routes` re-export cả `appRouter` — import thật là kéo nguyên cây page vào test.
vi.mock('@/routes', () => ({ APP_PATH: { EMPLOYEE_CERTIFICATE: '/employee/certificate' } }))

vi.mock('@/features/employee/services/employee-certificate-service', () => ({
  useEmployeeCertificate: () => ({ data: certificateRef.current, isLoading: false }),
  useCreateEmployeeCertificate: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateEmployeeCertificate: () => ({ mutateAsync: updateMock, isPending: false }),
}))

vi.mock('@/hooks/useApiQuery.ts', () => ({
  useInvalidateQueries: () => ({ invalidateByPrefix: invalidateByPrefixMock }),
}))

vi.mock('@/hooks/useAppConstant.ts', () => ({ default: () => ({ keysMapOptions: new Map() }) }))

vi.mock('@/services/toast-service.tsx', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/components/ui/file-upload/FileUpload.tsx', () => ({ FileUpload: () => null }))

vi.mock(
  '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx',
  () => ({ default: () => null })
)

import EmployeeCertificateForm from './EmployeeCertificateForm'

// Chạy ở chế độ SỬA có chủ đích: bản ghi hydrate sẵn mọi trường bắt buộc, nên test chạm được
// đúng một ô số mà không phải lái Radix Select trong jsdom.
function makeCertificate(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    code: 'CCBDS000000001',
    employee: { id: 7, code: 'MV0007', fullname: 'Nguyễn Văn A' },
    certificate_type: EmployeeCertificateType.diploma,
    certificate_code: 'BC-01',
    certificate_name: 'Bằng đại học',
    issuing_organization: 'ĐH Kinh tế',
    training_specialization: 'Quản trị kinh doanh',
    graduation_diploma: 'Loại giỏi',
    is_pending_issuance: false,
    issue_date: '2026-06-01',
    expected_issue_date: null,
    effective_date: null,
    expiry_date: null,
    notes: '',
    attachment: null,
    actual_sequence_number: 53,
    ...overrides,
  }
}

const SEQ_PLACEHOLDER = 'Nhập số thứ tự thực tế'

// CR STT53. Cụm này canh khâu HAY HỎNG IM LẶNG nhất: ô hiện ra trên màn nhưng giá trị không
// đi vào payload. Payload của form này dựng theo từng field tường minh, nên field không khai
// là rơi mất mà không có lỗi ở đâu cả.
describe('EmployeeCertificateForm — actual_sequence_number', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ id: 1 })
    updateMock.mockReset().mockResolvedValue({ id: 1 })
    invalidateByPrefixMock.mockReset().mockResolvedValue(undefined)
    navigateMock.mockReset()
    certificateRef.current = makeCertificate()
  })

  it('hydrates the saved value into the input when editing', async () => {
    render(<EmployeeCertificateForm certificateId={1} onSuccess={vi.fn()} onCancel={vi.fn()} />)

    expect(await screen.findByPlaceholderText(SEQ_PLACEHOLDER)).toHaveValue(53)
  })

  it('sends the edited value in the update payload', async () => {
    const user = userEvent.setup()
    render(<EmployeeCertificateForm certificateId={1} onSuccess={vi.fn()} onCancel={vi.fn()} />)

    const input = await screen.findByPlaceholderText(SEQ_PLACEHOLDER)
    await user.clear(input)
    await user.type(input, '77')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalled())
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        data: expect.objectContaining({ actual_sequence_number: 77 }),
      })
    )
  })

  // `undefined` bị loại khỏi JSON nên PUT sẽ giữ nguyên giá trị cũ — xoá trắng phải gửi `null`
  // thì backend mới thực sự xoá.
  it('sends null — not undefined — when the input is cleared', async () => {
    const user = userEvent.setup()
    render(<EmployeeCertificateForm certificateId={1} onSuccess={vi.fn()} onCancel={vi.fn()} />)

    const input = await screen.findByPlaceholderText(SEQ_PLACEHOLDER)
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(updateMock).toHaveBeenCalled())
    const payload = updateMock.mock.calls[0][0].data
    expect(payload).toHaveProperty('actual_sequence_number', null)
  })
})
