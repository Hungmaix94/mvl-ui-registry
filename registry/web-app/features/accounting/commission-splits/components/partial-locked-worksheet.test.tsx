/**
 * Kỳ chốt MỘT PHẦN: một đợt tiền về đã có phiếu chi (đóng băng), đợt sau vẫn mở.
 *
 * Trước đây BE gộp trạng thái khoá lên grain KỲ bằng phép AND, nên một đợt đã chi làm
 * xám toàn bộ bảng chia — kể cả đợt mới chưa ai đụng vào. Giờ BE trả `locked_amount` /
 * `editable_amount` (cả ở kỳ lẫn từng dòng) và FE gate theo từng nhóm.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PartialLockBanner } from './PartialLockBanner'
import { groupLockState } from './RecipientPayoutTable'

const position = (locked: string, editable: string) =>
  ({
    posData: { locked_amount: locked, editable_amount: editable },
  }) as never

const group = (...positions: ReturnType<typeof position>[]) =>
  ({
    code: 'G1',
    name: 'Nguyễn Văn A',
    recipient_type: 'employee',
    recipient_id: 1,
    participationPct: 55,
    positions,
  }) as never

describe('groupLockState', () => {
  it('gộp tiền đã chốt và tiền còn sửa được qua mọi position của nhóm', () => {
    const state = groupLockState(group(position('1000', '2000'), position('500', '300')))
    expect(state.locked).toBe(1500)
    expect(state.editable).toBe(2300)
  })

  it('nhóm đóng băng hoàn toàn khi không còn đồng nào sửa được', () => {
    const state = groupLockState(group(position('1500', '0')))
    expect(state.isFullyLocked).toBe(true)
    expect(state.isPartiallyLocked).toBe(false)
  })

  it('nhóm chốt một phần khi còn tiền của đợt đang mở', () => {
    const state = groupLockState(group(position('1500', '800')))
    expect(state.isFullyLocked).toBe(false)
    expect(state.isPartiallyLocked).toBe(true)
  })

  it('không có gì bị khoá thì không phải fully lock — đây là ca phổ biến nhất', () => {
    const state = groupLockState(group(position('0', '2000')))
    expect(state.locked).toBe(0)
    expect(state.isFullyLocked).toBe(false)
    expect(state.isPartiallyLocked).toBe(false)
  })

  it('position thiếu trường (BE cũ chưa deploy) đọc thành 0, không NaN', () => {
    const state = groupLockState({ positions: [{ posData: {} }] } as never)
    expect(state.locked).toBe(0)
    expect(state.editable).toBe(0)
    expect(state.isFullyLocked).toBe(false)
  })
})

describe('PartialLockBanner', () => {
  it('không hiện gì khi kỳ chưa có đợt nào bị khoá', () => {
    const { container } = render(
      <PartialLockBanner
        recipientsEditable
        recipientsLockReason={null}
        lockedAmount="0"
        editableAmount="5000000"
        lockedTranches={[]}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('nói rõ bao nhiêu đã chốt, bao nhiêu còn chia được, và phiếu chi nào đã đóng băng', () => {
    render(
      <PartialLockBanner
        recipientsEditable
        recipientsLockReason="PBTV_LOCKED"
        lockedAmount="43161470"
        editableAmount="27767949"
        lockedTranches={[
          {
            pbtv_id: 781,
            pbtv_code: 'PBTV000000781',
            receipt_code: 'PT000000848',
            amount: '108900000',
            payment_voucher_codes: ['PV000000737'],
          },
        ]}
      />
    )
    expect(screen.getByText('Kỳ này đã chốt một phần')).toBeInTheDocument()
    // Mã phiếu chi xuất hiện 2 lần và cố ý: gắn vào đúng đợt nó khoá, và trong câu hướng
    // dẫn huỷ ở cuối banner.
    expect(screen.getAllByText(/PV000000737/).length).toBeGreaterThan(0)
  })

  it('nêu danh tính từng đợt — mã phiếu thu, tiền về, phần đã/còn chia được', () => {
    // Dữ liệu thật của worksheet 176 trên dev: 150tr về ở đợt mở nhưng chỉ 196.544 còn
    // chia được (số ròng sau giảm trừ) — nếu chỉ hiện tổng thì người đọc không nối được.
    render(
      <PartialLockBanner
        recipientsEditable
        recipientsLockReason="PBTV_LOCKED"
        lockedAmount="40263300"
        editableAmount="196544"
        lockedTranches={[
          {
            pbtv_id: 781,
            pbtv_code: 'PBTV000000781',
            receipt_code: 'PT000000848',
            amount: '108900000',
            split_amount: '40263300',
            payment_voucher_codes: ['PV000000737'],
          },
        ]}
        openTranches={[
          {
            pbtv_id: 782,
            pbtv_code: 'PBTV000000782',
            receipt_code: 'PT000000849',
            amount: '150000000',
            split_amount: '196544',
            payment_voucher_codes: [],
          },
        ]}
      />
    )
    expect(screen.getByText('PT000000848')).toBeInTheDocument()
    expect(screen.getByText('PT000000849')).toBeInTheDocument()
    // Đợt mở phải đặt cạnh nhau tiền về và phần thực sự chia được.
    expect(screen.getByText(/về 150.000.000 đ → 196.544 đ còn chia được/)).toBeInTheDocument()
    expect(screen.getByText(/về 108.900.000 đ → 40.263.300 đ đã chia, khoá/)).toBeInTheDocument()
  })

  it('kỳ đã chốt toàn bộ thì không liệt kê đợt đang mở', () => {
    render(
      <PartialLockBanner
        recipientsEditable={false}
        recipientsLockReason="PBTV_LOCKED"
        lockedAmount="40263300"
        editableAmount="0"
        lockedTranches={[
          {
            pbtv_id: 781,
            pbtv_code: 'PBTV000000781',
            receipt_code: 'PT000000848',
            amount: '108900000',
            split_amount: '40263300',
            payment_voucher_codes: ['PV000000737'],
          },
        ]}
        openTranches={[
          {
            pbtv_id: 782,
            pbtv_code: 'PBTV000000782',
            receipt_code: 'PT000000849',
            amount: '150000000',
            split_amount: '0',
            payment_voucher_codes: [],
          },
        ]}
      />
    )
    expect(screen.getByText('PT000000848')).toBeInTheDocument()
    expect(screen.queryByText('PT000000849')).not.toBeInTheDocument()
  })

  it('mọi đợt đều khoá thì đổi tiêu đề và không hứa phần còn chia được', () => {
    render(
      <PartialLockBanner
        recipientsEditable={false}
        recipientsLockReason="PBTV_LOCKED"
        lockedAmount="43161470"
        editableAmount="0"
        lockedTranches={[]}
      />
    )
    expect(screen.getByText('Kỳ này đã chốt toàn bộ')).toBeInTheDocument()
    expect(screen.queryByText(/còn chia được/)).not.toBeInTheDocument()
  })
})
