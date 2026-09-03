import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { useForm, FormProvider, type UseFormReturn } from 'react-hook-form'
import { Theme } from '@radix-ui/themes'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.mock('@/lib/firebase', () => ({
  getFCMToken: vi.fn().mockResolvedValue(''),
  messaging: null,
}))

vi.mock('@/services/realestate-service', () => ({
  useProductInventoryCurrentF2Commissions: () => ({ data: null }),
  useCommissionWorkspaceSAF2: () => ({ data: null }),
  useProductInventoryCurrentCommission: () => ({ data: null }),
  useCommissionWorkspaceSACore: () => ({ data: null }),
}))

// QUAN TRỌNG: Map và mảng options phải dựng MỘT LẦN ở module scope.
//
// `useAppConstant` thật trả về tham chiếu ổn định giữa các lần render. Nếu mock dựng
// `new Map([...])` mới mỗi lần gọi thì `saleTypeOptions` đổi identity mỗi render →
// `getSaleTypeLabel` đổi → useMemo dựng dòng tính lại mỗi render, và bài test sẽ mất
// hết ý nghĩa. Giữ ổn định để mô phỏng đúng app thật.
const SALE_TYPE_OPTIONS = [
  { value: 'partner', label: 'Đối tác Sàn' },
  { value: 'mv', label: 'Nhân viên MaiVietLand' },
]
const KEYS_MAP = new Map([['DepositContractSale_SALE_TYPE_CHOICES', SALE_TYPE_OPTIONS]])
vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMapOptions: KEYS_MAP }),
}))

import { CommonSaleStaffTable } from './SaleStaffCommissionTable'

const BE_MESSAGE =
  "'EX000001940 - Sàn Tuấn Anh 66' chưa có tỷ lệ hoa hồng: cấu hình TBC hiệu lực vào ngày 2026-08-20 đang để trống tỷ lệ. Hãy điền tỷ lệ trên TBC trước khi tiếp tục."

/** Chỉ dòng trong bảng dùng class này; câu dưới bảng dùng `text-data-red-default`. */
const isInlineRowMessage = (el: HTMLElement) => el.className.includes('text-red-500')

/** Xả hết render/effect còn treo, để lần render kế tiếp chỉ do `setError` gây ra. */
const settle = async () => {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

function Harness({ onReady }: { onReady: (m: UseFormReturn<any>) => void }) {
  const methods = useForm<any>({
    defaultValues: {
      sales_staff: [
        {
          sale_type: 'partner',
          exchange: 2015,
          exchange_detail: { id: 2015, name: 'Sàn Tuấn Anh 66' },
          percentage: 100,
          pct_commission: 3,
          f2_source: 'linked',
        },
      ],
      product_inventory: 3586,
    },
  })
  useEffect(() => {
    onReady(methods)
  }, [methods, onReady])
  return (
    <Theme>
      <FormProvider {...methods}>
        <CommonSaleStaffTable module="deposit" paymentAmount={10000000} />
      </FormProvider>
    </Theme>
  )
}

/**
 * Hồi quy cho bug 86eyez5z6.
 *
 * BE chặn tạo HĐ cọc khi sàn F2 chưa có tỷ lệ trên TBC và trả message rất rõ, gắn vào
 * `sales_staff[0].exchange_id`. `handleApiError` map đúng sang `sales_staff.0.exchange`
 * và gọi `setError`. Nhưng `setError` của react-hook-form GHI ĐÈ TẠI CHỖ vào
 * `formState.errors` rồi phát lại chính object cũ — identity không đổi. Bản cũ để
 * `errors` trong deps của useMemo dựng các dòng, nên memo không bao giờ tính lại và
 * dòng không bao giờ hiện message; người dùng chỉ thấy câu chung chung dưới bảng.
 *
 * ⚠️ Giới hạn đã ĐO bằng mutation (đừng tin nhầm sức mạnh của bộ test này):
 * chỉ ca "xoá lỗi" ở dưới là thật sự phân biệt được bản đúng/bản lỗi. Hai ca "set lỗi"
 * vẫn XANH cả khi bug còn nguyên, vì trong jsdom `useWatch` phát lại giá trị đúng nhịp
 * `setError` khiến memo tình cờ tính lại — điều KHÔNG xảy ra trên trình duyệt thật.
 * Bằng chứng thật cho hướng "set lỗi" là lần verify tay trên localhost:3002: trước fix
 * message không có trong DOM, sau fix hiện ngay khi response 400 trở về.
 * Giữ 2 ca đó vì chúng vẫn khoá đúng hành vi mong muốn, nhưng đừng coi là lưới an toàn.
 */
describe('CommonSaleStaffTable — lỗi theo dòng từ server', () => {
  it('hiện message của BE trên đúng dòng khi setError chạy sau lúc mount', async () => {
    let methods!: UseFormReturn<any>
    render(<Harness onReady={(m) => (methods = m)} />)
    await settle()

    expect(screen.queryByText(BE_MESSAGE)).not.toBeInTheDocument()

    await act(async () => {
      methods.setError('sales_staff.0.exchange', { type: 'invalid', message: BE_MESSAGE })
    })

    expect(screen.getAllByText(BE_MESSAGE).some(isInlineRowMessage)).toBe(true)
  })

  it('hiện message cho lỗi nguồn F2 — field mà bản cũ không hề đọc tới', async () => {
    let methods!: UseFormReturn<any>
    render(<Harness onReady={(m) => (methods = m)} />)
    await settle()

    await act(async () => {
      methods.setError('sales_staff.0.f2_source', {
        type: 'invalid_enum_value',
        message: 'Vui lòng chọn nguồn F2',
      })
    })

    expect(screen.getAllByText('Vui lòng chọn nguồn F2').some(isInlineRowMessage)).toBe(true)
  })

  it('xoá message khỏi dòng khi lỗi được clear', async () => {
    let methods!: UseFormReturn<any>
    render(<Harness onReady={(m) => (methods = m)} />)
    await settle()

    await act(async () => {
      methods.setError('sales_staff.0.exchange', { type: 'invalid', message: BE_MESSAGE })
    })
    expect(screen.getAllByText(BE_MESSAGE).some(isInlineRowMessage)).toBe(true)

    await act(async () => {
      methods.clearErrors('sales_staff')
    })
    expect(screen.queryByText(BE_MESSAGE)).not.toBeInTheDocument()
  })
})
