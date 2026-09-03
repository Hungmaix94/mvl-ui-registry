import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Danh mục ngân hàng đến từ `/api/hrm/banks/` qua hook dùng chung; stub lại để test không cần
// React Query. Hai bản ghi là đủ để phân biệt "có đổ danh sách" với "danh sách rỗng".
vi.mock('@/hooks/useBankOptions', () => ({
  default: () => ({
    bankOptions: [
      {
        value: 'Ngân hàng TMCP Ngoại thương Việt Nam',
        label: 'VCB - Ngân hàng TMCP Ngoại thương Việt Nam',
      },
      {
        value: 'Ngân hàng TMCP Kỹ thương Việt Nam',
        label: 'TCB - Ngân hàng TMCP Kỹ thương Việt Nam',
      },
    ],
    isLoadingBanks: false,
  }),
}))

import { DepositContractActionForm } from './DepositContractActionForm'

// Hộp thoại Hủy bỏ / Hoàn tiền từng có ô tích "Gửi mail thông báo cho khách hàng".
// Ô đó gửi `send_email` mà backend không hề khai báo nên bị bỏ lặng lẽ — người dùng tưởng
// đã gửi mail nhưng không có gì xảy ra (ClickUp 86eychqzv). Nghiệp vụ chốt lại: mail thu hồi
// cọc là thao tác RIÊNG trong menu Thao tác, chỉ dùng cho hợp đồng đã hủy — nên ô tích bị bỏ.
describe('DepositContractActionForm', () => {
  const baseProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  }

  it('không còn ô tích gửi mail ở hộp thoại Hủy bỏ', () => {
    render(<DepositContractActionForm {...baseProps} requireNote confirmText="Hủy bỏ" />)

    expect(screen.queryByText(/Gửi mail thông báo cho khách hàng/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('không còn ô tích gửi mail ở hộp thoại Hoàn tiền', () => {
    render(
      <DepositContractActionForm
        {...baseProps}
        requireNote
        showRefundAmount
        confirmText="Hoàn tiền"
      />
    )

    expect(screen.queryByText(/Gửi mail thông báo cho khách hàng/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText('Số tiền hoàn')).toBeInTheDocument()
  })

  it('gửi lên đúng ghi chú, không kèm cờ gửi mail nào', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <DepositContractActionForm
        {...baseProps}
        onSubmit={onSubmit}
        requireNote
        confirmText="Hủy bỏ"
      />
    )

    await user.type(screen.getByPlaceholderText(/Nhập lý do\/ghi chú/i), 'Khach khong dong tien')
    await user.click(screen.getByRole('button', { name: 'Hủy bỏ' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.note).toBe('Khach khong dong tien')
    expect(payload).not.toHaveProperty('sendEmail')
  })

  it('bắt buộc nhập ghi chú khi requireNote', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <DepositContractActionForm
        {...baseProps}
        onSubmit={onSubmit}
        requireNote
        confirmText="Hủy bỏ"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Hủy bỏ' }))

    expect(await screen.findByText(/Vui lòng nhập lý do\/ghi chú/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  // API hủy/hoàn cọc mất tới ~30s. Trước đây form không tự khóa nên nút vẫn bấm được, không có
  // spinner — người dùng tưởng hộp thoại treo và bấm lại nhiều lần, bắn nhiều request hủy
  // (ClickUp 86eyfapdx).
  describe('khóa form trong lúc chờ API (ClickUp 86eyfapdx)', () => {
    const fillNoteAndSubmit = async (onSubmit: (data: unknown) => Promise<void>) => {
      const user = userEvent.setup()
      render(
        <DepositContractActionForm
          {...baseProps}
          onSubmit={onSubmit as never}
          requireNote
          confirmText="Hủy bỏ"
        />
      )
      await user.type(screen.getByPlaceholderText(/Nhập lý do\/ghi chú/i), 'Khach doi y')
      await user.click(screen.getByRole('button', { name: 'Hủy bỏ' }))
      return user
    }

    it('vô hiệu hóa nút xác nhận và nút hủy khi đang gửi', async () => {
      let resolveSubmit: () => void = () => {}
      const onSubmit = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve
          })
      )

      await fillNoteAndSubmit(onSubmit)

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Hủy bỏ' })).toBeDisabled())
      expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled()

      resolveSubmit()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Hủy bỏ' })).toBeEnabled())
    })

    it('không bắn thêm request khi người dùng bấm lại lúc đang chờ', async () => {
      let resolveSubmit: () => void = () => {}
      const onSubmit = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve
          })
      )

      const user = await fillNoteAndSubmit(onSubmit)
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

      await user.click(screen.getByRole('button', { name: 'Hủy bỏ' }))
      await user.click(screen.getByRole('button', { name: 'Hủy bỏ' }))

      expect(onSubmit).toHaveBeenCalledTimes(1)

      resolveSubmit()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Hủy bỏ' })).toBeEnabled())
    })

    it('mở khóa lại form khi API lỗi để người dùng thử lại', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('API 500'))

      await fillNoteAndSubmit(onSubmit)

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Hủy bỏ' })).toBeEnabled())
      expect(screen.getByRole('button', { name: 'Hủy' })).toBeEnabled()
    })
  })

  // Ô "Ngân hàng" của khối tài khoản nhận tiền hoàn từng là ô nhập tay, nên mỗi người gõ một
  // kiểu và giá trị lưu xuống không đối chiếu được với danh mục ngân hàng (ClickUp 86eyqjbtb).
  describe('chọn ngân hàng nhận từ danh mục (ClickUp 86eyqjbtb)', () => {
    const renderRefundForm = () =>
      render(
        <DepositContractActionForm
          {...baseProps}
          requireNote
          showRefundAmount
          confirmText="Hoàn tiền"
        />
      )

    it('ô Ngân hàng là dropdown, không cho gõ tay', () => {
      renderRefundForm()

      // Đối chứng: "Số tài khoản" VẪN là ô nhập tay. Không có vế này thì phép khẳng định
      // "Ngân hàng không còn textbox" cũng đúng khi ta dò nhầm cách truy vấn và không thấy gì
      // cả — nó chỉ chứng minh được điều gì khi cùng cách truy vấn đó tìm ra một ô thật.
      expect(screen.getByRole('textbox', { name: /Số tài khoản/ })).toBeInTheDocument()

      expect(screen.queryByRole('textbox', { name: /Ngân hàng/ })).toBeNull()
      expect(screen.getByRole('combobox')).toHaveTextContent('Chọn ngân hàng')
    })

    // Ghim luôn liên kết nhãn ↔ ô: `Select` chỉ đặt `id` lên trigger khi nhận được `name`, mà
    // `name` tới từ `{...field}` của Controller. Lớp `RefundPayeeBankSelect` chen ở giữa nên
    // quên chuyển tiếp là nhãn "Ngân hàng" hết trỏ vào đâu — hỏng lặng lẽ, chỉ trình đọc màn
    // hình và người dùng bấm vào nhãn mới thấy.
    it('nhãn "Ngân hàng" gắn đúng vào ô chọn', () => {
      renderRefundForm()

      expect(screen.getByLabelText(/Ngân hàng/)).toBe(screen.getByRole('combobox'))
    })

    it('đổ danh sách ngân hàng từ danh mục dùng chung', async () => {
      const user = userEvent.setup()
      renderRefundForm()

      await user.click(screen.getByRole('combobox'))

      expect(
        await screen.findByText('VCB - Ngân hàng TMCP Ngoại thương Việt Nam')
      ).toBeInTheDocument()
      expect(screen.getByText('TCB - Ngân hàng TMCP Kỹ thương Việt Nam')).toBeInTheDocument()
    })

    it('chọn xong thì giá trị vào form là tên chính thống của ngân hàng', async () => {
      // Radix khoá `pointer-events` trên lớp popover khi mở; jsdom không gỡ lại nên `user-event`
      // từ chối click vào option. Bỏ kiểm tra con trỏ — đây là hạn chế của môi trường test,
      // không phải trạng thái mà người dùng thật gặp.
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      renderRefundForm()

      await user.click(screen.getByRole('combobox'))
      await user.click(await screen.findByText('VCB - Ngân hàng TMCP Ngoại thương Việt Nam'))

      // Trigger hiển thị lại `label`, nên nó chỉ đổi khi giá trị đã đi qua Controller vào RHF.
      await waitFor(() =>
        expect(screen.getByRole('combobox')).toHaveTextContent(
          'VCB - Ngân hàng TMCP Ngoại thương Việt Nam'
        )
      )
    })

    it('chưa chọn ngân hàng thì chặn submit và báo là phải CHỌN', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(
        <DepositContractActionForm
          {...baseProps}
          onSubmit={onSubmit}
          requireNote
          showRefundAmount
          confirmText="Hoàn tiền"
        />
      )

      await user.click(screen.getByRole('button', { name: 'Hoàn tiền' }))

      expect(await screen.findByText('Vui lòng chọn ngân hàng nhận')).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  // QA trả task 25/08/2026: "chưa validate ở phần stk ... nhập sai form nhưng kết quả vẫn trả
  // về 200". Ô này vốn chỉ chặn để trống (`min(1)`), còn `DepositRefundSerializer` bên BE khai
  // `CharField(required=True)` trần — không `max_length`, không khuôn dạng — nên chuỗi rác đi
  // trọn đường xuống DB.
  describe('khuôn dạng số tài khoản nhận (ClickUp 86eyqjbtb)', () => {
    const renderRefundForm = (onSubmit = vi.fn()) =>
      render(
        <DepositContractActionForm
          {...baseProps}
          onSubmit={onSubmit}
          requireNote
          showRefundAmount
          confirmText="Hoàn tiền"
        />
      )

    const accountNumberInput = () => screen.getByRole('textbox', { name: /Số tài khoản/ })

    it.each([
      ['dấu cách kiểu chép từ mặt thẻ', '0123 4567 89'],
      ['chữ cái', 'VCB0123456789'],
      ['dấu nháy Excel để lại', "'9999888877"],
    ])('chặn submit khi số tài khoản có %s', async (_label, bad) => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      renderRefundForm(onSubmit)

      await user.type(accountNumberInput(), bad)
      await user.click(screen.getByRole('button', { name: 'Hoàn tiền' }))

      expect(await screen.findByText('Số tài khoản chỉ được chứa chữ số')).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    /**
     * Cột `refund_payee_account_number` là `CharField(max_length=50)`. Quá 50 mà lọt xuống thì
     * không dừng ở "dữ liệu xấu": serializer không khai `max_length` nên lỗi nổ ở tầng DB.
     */
    it('chặn chuỗi dài hơn bề rộng cột DB, kèm thông báo nói đúng lý do', async () => {
      const user = userEvent.setup()
      renderRefundForm()

      await user.type(accountNumberInput(), '9'.repeat(51))
      await user.click(screen.getByRole('button', { name: 'Hoàn tiền' }))

      expect(await screen.findByText('Số tài khoản không vượt quá 50 ký tự')).toBeInTheDocument()
    })

    // Đối chứng: nếu thiếu ca này thì một luật chặn-sạch-mọi-thứ cũng làm hai test trên xanh.
    it('số tài khoản hợp lệ thì KHÔNG còn lỗi khuôn dạng nào ở ô đó', async () => {
      const user = userEvent.setup()
      renderRefundForm()

      await user.type(accountNumberInput(), '9999888877')
      await user.click(screen.getByRole('button', { name: 'Hoàn tiền' }))

      // Đợi form chấm điểm xong bằng một lỗi CHẮC CHẮN có (chưa chọn ngân hàng), rồi mới
      // khẳng định điều vắng mặt — không có mốc này thì phép "không thấy gì" luôn đúng.
      expect(await screen.findByText('Vui lòng chọn ngân hàng nhận')).toBeInTheDocument()
      expect(screen.queryByText('Số tài khoản chỉ được chứa chữ số')).toBeNull()
      expect(screen.queryByText('Số tài khoản không vượt quá 50 ký tự')).toBeNull()
    })

    it('để trống vẫn báo là chưa nhập, không phải sai khuôn dạng', async () => {
      const user = userEvent.setup()
      renderRefundForm()

      await user.click(screen.getByRole('button', { name: 'Hoàn tiền' }))

      expect(await screen.findByText('Vui lòng nhập số tài khoản nhận')).toBeInTheDocument()
      expect(screen.queryByText('Số tài khoản chỉ được chứa chữ số')).toBeNull()
    })
  })
})
