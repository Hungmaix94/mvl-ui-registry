/**
 * Guard: bảng ② "Thưởng theo giao dịch" (mục ② Thưởng HH quản lý) phải in **mã căn** dưới mã deal
 * — ClickUp 86eynmfj7, và mã căn phải là `unitLabel` (`unit_number`), không phải `unit_code`.
 *
 * Vì sao cần guard chứ không chỉ test util:
 *
 * `buildMgmtBonusDealRows` nay trả `row.unitLabel`, và test của nó
 * (`utils/mgmt-bonus-deal-rows.test.ts`) canh đúng giá trị đó. Nhưng field ấy **xanh kể cả khi
 * bảng không render nó** — đúng cảnh đã xảy ra: BE phục vụ `unit_number` từ 86eyd8qvq (04/08),
 * mục ① đọc ngay, còn bảng ② thì không ai nối dây trong 16 ngày và không lớp nào báo động.
 *
 * `docs/ai/domain/accounting-vouchers-commissions.md` §"Mã căn trên các bảng deal của 20.14" ghi
 * quy tắc **chỉ đọc `unit_number`, TUYỆT ĐỐI không fallback `unit_code`** — nhưng một dòng tài
 * liệu không chặn được ai cả; chỉ test đỏ mới chặn.
 *
 * Guard đọc source thay vì render DOM, cùng lý do đã ghi ở `CommMgrDetail.section-total.guard.test.ts`:
 * `MgmtDealSubTable` là component nội bộ của file, và đo quan hệ cha–con trên DOM vướng
 * `testing-library/no-node-access` (bật ở `eslint.config.js`, `--max-warnings 0`).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const COMPONENT = join(dirname(fileURLToPath(import.meta.url)), 'CommMgrDetail.tsx')
const source = readFileSync(COMPONENT, 'utf8')

/**
 * Lát cắt của riêng `MgmtDealSubTable`.
 *
 * File có 8 mục và nhiều bảng cùng lối viết (`<code className="text-xs">` cho mã deal), nên khớp
 * trên toàn file là đo nhầm bảng khác — mục ① vốn đã có mã căn từ trước, và nó một mình đủ làm
 * mọi phép khớp toàn file thành xanh.
 */
const subTable = (() => {
  const startsAt = source.indexOf('const MgmtDealSubTable')
  expect(
    startsAt,
    'không còn tìm thấy `MgmtDealSubTable` — guard mất hiệu lực, cập nhật lại mốc cắt'
  ).toBeGreaterThan(-1)

  const endsAt = source.indexOf('const TransactionGroupBTable', startsAt)
  expect(
    endsAt,
    'không còn tìm thấy `TransactionGroupBTable` — guard mất hiệu lực, cập nhật lại mốc cắt'
  ).toBeGreaterThan(startsAt)

  return source.slice(startsAt, endsAt)
})()

/** Bỏ chú thích JSX: chính chú thích có thể nhắc tên field và làm guard tự đánh lừa mình. */
const markup = subTable.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('CommMgrDetail — mã căn ở bảng ② Thưởng theo giao dịch (86eynmfj7)', () => {
  it('render mã căn từ row.unitLabel', () => {
    expect(
      markup,
      'bảng ② thôi in mã căn. Kế toán không phân biệt được các dòng thưởng của cùng một dự án ' +
        'thuộc căn nào — ClickUp 86eynmfj7.'
    ).toContain('row.unitLabel')
  })

  it('mã căn đứng trong CÙNG ô với mã deal, không tách thành cột riêng', () => {
    const dealCellStart = markup.indexOf('row.dealCode')
    expect(dealCellStart, 'bảng ② không còn ô mã deal').toBeGreaterThan(-1)

    const cellEnd = markup.indexOf('</td>', dealCellStart)
    expect(cellEnd, 'ô mã deal không đóng thẻ — cắt sai lát').toBeGreaterThan(dealCellStart)

    expect(
      markup.slice(dealCellStart, cellEnd),
      'mã căn bị đẩy ra ngoài ô mã deal ⇒ lệch với mục ① và các màn Sale/CTV/F2, vốn xếp chồng ' +
        'mã căn ngay dưới mã deal trong cùng một ô.'
    ).toContain('row.unitLabel')
  })

  it('KHÔNG đọc unit_code — đó là mã bản ghi nội bộ BH…, không phải mã căn', () => {
    expect(
      markup,
      'bảng ② đọc `unit_code`. Đó là `ProductInventory.code` (vd BH000002417), người dùng đọc ra ' +
        'một mã vô nghĩa — chính bug 86eyd8qvq. Mã căn là `unit_number`, lấy qua `getDealUnitLabel`.'
    ).not.toContain('unit_code')
  })

  it('số cột của bảng không đổi — mã căn xếp chồng, không thêm cột', () => {
    const openAt = markup.indexOf('<thead>')
    const closeAt = markup.indexOf('</thead>')
    expect(openAt, 'bảng ② không còn <thead>').toBeGreaterThan(-1)
    expect(closeAt, 'bảng ② không còn </thead>').toBeGreaterThan(openAt)

    const headers = [...markup.slice(openAt, closeAt).matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(
      (m) => m[1].replace(/\s+/g, ' ').trim()
    )

    expect(headers).toEqual([
      'Mã deal',
      'Dự án · KH',
      'Thưởng quản lý',
      'HH bổ sung DA',
      'Thưởng quản lý từ CDT',
      'Thưởng quản lý bổ sung',
      'Tổng cấu hình',
      '% chia đợt này',
      '% tiền về',
      'HH thực tế',
    ])
  })
})
