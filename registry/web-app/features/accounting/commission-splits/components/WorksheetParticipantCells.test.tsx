/**
 * Cột đồng bán sau CR `86eyj75hg`: ĐÚNG MỘT cột "Danh sách sale" gộp cả ba loại người bán, và cụm
 * tổ chức của mỗi người nằm inline ngay trong ô của người đó (sửa 20/08 — bản trước tách khối và
 * phòng ban thành hai cột riêng, user bác).
 *
 * Nội dung từng loại giữ nguyên như ba cột cũ của CR STT45 (`86eygjpeg`) — sale MV ra cụm tổ
 * chức, sàn F2 ra NGUỒN (đối tác ngoài, không có phòng ban), CTV ra LOẠI TUYẾN — nên phần lớn
 * test dưới đây là test cũ trỏ sang component mới. Khác biệt do CR mang lại, khoá riêng ở cuối.
 */
import type { ReactElement } from 'react'

import { createMongoAbility } from '@casl/ability'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BookingRefundSaleSale_type } from '@/api/schema'
import { AbilityContext, type AppAbility } from '@/lib/ability.ts'

import { SellerList } from './WorksheetParticipantCells'
import { CtvLineType as CtvLineType, F2Source as F2Source } from '@/constants/api-schema-aliases'

const ref = (id: number, code: string, name: string) => ({ id, code, name })

const mvSale = {
  sale_type: BookingRefundSaleSale_type.mv,
  participation_percentage: '30.00',
  employee: ref(1, 'MV000003385', 'Lưu Thị Lệ'),
  collaborator: null,
  exchange: null,
  branch: ref(10, 'CN-QN', 'Quảng Ninh'),
  block: ref(20, 'K-KD', 'Khối Kinh doanh_QN'),
  department: ref(30, 'P-KD3', 'Phòng Kinh Doanh 3_QN'),
}

const f2Director = {
  exchange: ref(7, 'EX000001940', 'Sàn Tuấn Anh 66'),
  participation_percentage: '40.00',
  f2_source: F2Source.director,
  f2_source_display: 'Nguồn giám đốc kinh doanh',
  f2_source_director: ref(12, 'MV000003385', 'Lưu Thị Lệ'),
}

const f2Linked = {
  ...f2Director,
  f2_source: F2Source.linked,
  f2_source_display: 'Nguồn sàn liên kết',
  f2_source_director: null,
}

const ctvInternalSale = {
  collaborator: ref(3, 'CTV000000135', 'Hà Bích Ngọc'),
  participation_percentage: '30.00',
  ctv_line_type: CtvLineType.internal_sale,
  ctv_line_type_display: 'Line nhân viên sale nội bộ',
  ctv_line_employee: ref(44, 'MV000013772', 'Hoàng Văn Long'),
  branch: ref(2, 'CN-DN', 'Đà Nẵng'),
  block: ref(5, 'K-HT', 'Khối Hỗ trợ'),
  department: ref(9, 'P-SLK-QN', 'Sàn Liên Kết & CTV_QN'),
}

const ctvExchangeDept = {
  ...ctvInternalSale,
  ctv_line_type: CtvLineType.exchange_dept,
  ctv_line_type_display: 'Line P.Sàn liên kết',
  ctv_line_employee: null,
}

const ctvIndependent = {
  ...ctvInternalSale,
  ctv_line_type: CtvLineType.independent,
  ctv_line_type_display: 'CTV độc lập / Kế toán',
  ctv_line_employee: null,
  branch: null,
  block: null,
  department: null,
}

const fullAbility = createMongoAbility<AppAbility>([{ action: 'manage', subject: 'all' }])

function renderWithFullAbility(ui: ReactElement) {
  return render(<AbilityContext.Provider value={fullAbility}>{ui}</AbilityContext.Provider>)
}

/** Cột gộp với đủ quyền xem sàn/CTV — mặc định của phần lớn test. */
function sellers(row: Record<string, unknown>) {
  return <SellerList row={row} canViewExchange canViewCollaborator />
}

describe('SellerList — sale MaiVietLand trong cột gộp', () => {
  it('gạch ngang khi căn không có người bán nào', () => {
    renderWithFullAbility(sellers({}))
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('KHÔNG lấy bản thô của F2/CTV trong `sales_participants` — hai loại đó đọc từ mảng riêng', () => {
    renderWithFullAbility(
      sellers({
        sales_participants: [
          mvSale,
          {
            sale_type: BookingRefundSaleSale_type.partner,
            participation_percentage: '40.00',
            employee: null,
            collaborator: null,
            exchange: ref(7, 'EX000001940', 'Sàn Tuấn Anh 66'),
            branch: null,
            block: null,
            department: null,
          },
        ],
      })
    )

    expect(screen.getByText('MV000003385')).toBeInTheDocument()
    // Bản thô thiếu nguồn F2 ⇒ để lọt là vừa nghèo thông tin vừa in lặp với `f2_participants`.
    expect(screen.queryByText(/EX000001940/)).not.toBeInTheDocument()
  })

  it('mã là link hồ sơ nhân viên, kèm tỷ lệ tham gia', () => {
    renderWithFullAbility(sellers({ sales_participants: [mvSale] }))

    expect(screen.getByRole('link', { name: 'MV000003385' })).toHaveAttribute(
      'href',
      '/employee/management/1'
    )
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('MÃ ở tầng trên (là link), TÊN xuống dòng riêng bên dưới — không gộp "mã - tên" một dòng', () => {
    renderWithFullAbility(sellers({ sales_participants: [mvSale] }))

    const codeLink = screen.getByRole('link', { name: 'MV000003385' })
    const nameNode = screen.getByText('Lưu Thị Lệ')

    expect(codeLink).not.toContainElement(nameNode)
    expect(screen.queryByText('MV000003385 - Lưu Thị Lệ')).not.toBeInTheDocument()
  })

  it('tỷ lệ đứng TRƯỚC mã, nối bằng dấu chấm giữa dòng — buộc con số vào đúng chủ của nó', () => {
    renderWithFullAbility(sellers({ sales_participants: [mvSale] }))

    const pct = screen.getByText('30%')
    expect(pct).toHaveAttribute(
      'title',
      'Lưu Thị Lệ — tỷ lệ tham gia 30% trên hợp đồng cọc (tổng các bên đồng bán = 100%)'
    )
    // Dấu nối thuần trang trí: có mặt cho mắt người, nhưng ẩn với trình đọc màn hình để không
    // đọc "dấu chấm giữa" xen giữa mọi tỷ lệ và mọi mã trên mọi dòng bảng.
    expect(screen.getByText('·')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('link', { name: 'MV000003385' })).toBeInTheDocument()
  })

  it('cả ba cấp tổ chức nằm inline trong ô người bán (CR 86eyj75hg, sửa 20/08)', () => {
    renderWithFullAbility(sellers({ sales_participants: [mvSale] }))

    expect(screen.getByText('Chi nhánh: Quảng Ninh')).toBeInTheDocument()
    expect(screen.getByText('Khối: Khối Kinh doanh_QN')).toBeInTheDocument()
    expect(screen.getByText('Phòng ban: Phòng Kinh Doanh 3_QN')).toBeInTheDocument()
  })

  it('không có chi nhánh thì bỏ hẳn dòng, không in "Chi nhánh: —"', () => {
    renderWithFullAbility(sellers({ sales_participants: [{ ...mvSale, branch: null }] }))
    expect(screen.queryByText(/Chi nhánh:/)).not.toBeInTheDocument()
  })

  it('thiếu khối/phòng ban thì bỏ hẳn dòng, không in gạch ngang tạo bậc thang giả', () => {
    renderWithFullAbility(
      sellers({ sales_participants: [{ ...mvSale, block: null, department: null }] })
    )

    expect(screen.getByText('Chi nhánh: Quảng Ninh')).toBeInTheDocument()
    expect(screen.queryByText(/Khối:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Phòng ban:/)).not.toBeInTheDocument()
  })
})

describe('SellerList — sàn F2 trong cột gộp', () => {
  it('sàn + tỷ lệ + nhãn nguồn; nguồn giám đốc thì kèm tên giám đốc', () => {
    render(sellers({ f2_participants: [f2Director] }))

    expect(screen.getByRole('link', { name: 'EX000001940' })).toHaveAttribute(
      'href',
      '/project-admin/project/exchange/7'
    )
    // Bảng không kẻ vách dọc giữa các cột ⇒ tooltip phải gọi tên chính chủ, hover là hết nghi ngờ
    // "số này của cột nào".
    expect(screen.getByText('40%')).toHaveAttribute(
      'title',
      'Sàn Tuấn Anh 66 — tỷ lệ tham gia 40% trên hợp đồng cọc (tổng các bên đồng bán = 100%)'
    )
    expect(screen.getByText('Nguồn giám đốc kinh doanh')).toBeInTheDocument()
    expect(screen.getByText('GĐ kinh doanh:', { exact: false })).toBeInTheDocument()
  })

  it('"GĐ kinh doanh" mở hồ sơ nhân viên ở TAB MỚI, có gate quyền employee.retrieve', () => {
    renderWithFullAbility(sellers({ f2_participants: [f2Director] }))

    const link = screen.getByRole('link', { name: 'MV000003385 - Lưu Thị Lệ' })
    expect(link).toHaveAttribute('href', '/employee/management/12')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('KHÔNG có quyền xem nhân viên: "GĐ kinh doanh" về text thường, không dẫn vào trang 403', () => {
    // `render` trần = ability rỗng ⇒ `employee.retrieve` = false.
    render(sellers({ f2_participants: [f2Director] }))

    expect(screen.getByText('MV000003385 - Lưu Thị Lệ')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'MV000003385 - Lưu Thị Lệ' })).not.toBeInTheDocument()
  })

  it('KHÔNG bịa cấp tổ chức cho sàn F2 — sàn là đối tác ngoài cây tổ chức MVL', () => {
    render(sellers({ f2_participants: [f2Linked] }))

    expect(screen.getByText('Nguồn sàn liên kết')).toBeInTheDocument()
    expect(screen.queryByText(/GĐ kinh doanh:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Chi nhánh:/)).not.toBeInTheDocument()
    // Không có `Khối:` / `Phòng ban:` / `Khối / Phòng ban:` — sàn không có mấy thứ đó, gắn nhãn
    // vào là bảng tự khẳng định điều không tồn tại (user bác đúng chỗ này, 20/08).
    expect(screen.queryByText(/Khối/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Phòng ban/)).not.toBeInTheDocument()
  })

  it('không có quyền xem sàn: vẫn hiện tên nhưng không phải link', () => {
    render(
      <SellerList
        row={{ f2_participants: [f2Director] }}
        canViewExchange={false}
        canViewCollaborator
      />
    )

    expect(screen.getByText('EX000001940')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'EX000001940' })).not.toBeInTheDocument()
  })
})

describe('SellerList — CTV trong cột gộp', () => {
  it('tuyến gắn người: nhãn loại tuyến + chủ tuyến + chi nhánh của người đó', () => {
    render(sellers({ ctv_participants: [ctvInternalSale] }))

    expect(screen.getByRole('link', { name: 'CTV000000135' })).toHaveAttribute(
      'href',
      '/accounting/collaborator/manage/3'
    )
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByText('Line nhân viên sale nội bộ')).toBeInTheDocument()
    expect(screen.getByText('Chủ line:', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Chi nhánh: Đà Nẵng')).toBeInTheDocument()
  })

  it('"Chủ line" mở hồ sơ nhân viên ở TAB MỚI, có gate quyền employee.retrieve', () => {
    renderWithFullAbility(sellers({ ctv_participants: [ctvInternalSale] }))

    const link = screen.getByRole('link', { name: 'MV000013772 - Hoàng Văn Long' })
    expect(link).toHaveAttribute('href', '/employee/management/44')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('KHÔNG có quyền xem nhân viên: "Chủ line" về text thường, không dẫn vào trang 403', () => {
    render(sellers({ ctv_participants: [ctvInternalSale] }))

    expect(screen.getByText('MV000013772 - Hoàng Văn Long')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'MV000013772 - Hoàng Văn Long' })
    ).not.toBeInTheDocument()
  })

  it('tuyến phòng sàn liên kết: có nhãn tuyến nhưng KHÔNG có chủ tuyến', () => {
    render(sellers({ ctv_participants: [ctvExchangeDept] }))

    expect(screen.getByText('Line P.Sàn liên kết')).toBeInTheDocument()
    expect(screen.queryByText(/Chủ line:/)).not.toBeInTheDocument()
  })

  it('CTV độc lập: chỉ nhãn loại tuyến, dòng VẪN hiện vì họ có tham gia bán', () => {
    render(sellers({ ctv_participants: [ctvIndependent] }))

    expect(screen.getByText('CTV000000135')).toBeInTheDocument()
    expect(screen.getByText('CTV độc lập / Kế toán')).toBeInTheDocument()
    expect(screen.queryByText(/Chủ line:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Chi nhánh:/)).not.toBeInTheDocument()
  })

  it('không có quyền xem CTV: vẫn hiện tên nhưng không phải link', () => {
    render(
      <SellerList
        row={{ ctv_participants: [ctvInternalSale] }}
        canViewExchange
        canViewCollaborator={false}
      />
    )

    expect(screen.getByText('CTV000000135')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'CTV000000135' })).not.toBeInTheDocument()
  })

  it('nhiều CTV: mỗi người một entry riêng, giữ đủ mã + tên + tỷ lệ của từng người', () => {
    render(
      sellers({
        ctv_participants: [
          ctvInternalSale,
          {
            ...ctvIndependent,
            collaborator: ref(4, 'CTV000000144', 'Hoàng Thanh'),
            participation_percentage: '70.00',
          },
        ],
      })
    )

    expect(screen.getAllByRole('link', { name: /^CTV0000001/ })).toHaveLength(2)
    expect(screen.getByText('Hà Bích Ngọc')).toBeInTheDocument()
    expect(screen.getByText('Hoàng Thanh')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
  })
})

/**
 * Phần CR `86eyj75hg` thật sự mang lại, sau khi user bác bố cục hai cột org (20/08). Mỗi nhóm
 * test khoá một câu trong CR:
 *
 * - "Gộp … thành 1 cột duy nhất" ⇒ một cột chứa cả ba loại, đúng thứ tự MV → F2 → CTV.
 * - "Bổ sung: Tỷ lệ tham gia của từng người ở ngay bên cạnh tên người bán" ⇒ mỗi entry một tỷ lệ.
 * - "nếu là F2: hiển thị là Sàn F2" ⇒ dòng F2 đọc đúng "Sàn F2", **trần, không nhãn**.
 * - "nếu là CTV: hiển thị theo line" ⇒ dòng CTV lấy khối/phòng ban suy từ tuyến.
 * - "Khối, phòng ban sắp xếp lần lượt tương ứng với tên người bán" ⇒ nay là chuyện HIỂN NHIÊN chứ
 *   không còn là ràng buộc phải giữ: mỗi người là một cụm đọc khép kín, không có cột nào để lệch.
 *   Test cuối khoá đúng điều đó — org của người nào nằm trong cụm của người ấy.
 */
describe('CR 86eyj75hg — cột đồng bán đã gộp, tổ chức nằm inline', () => {
  const mixedRow = {
    sales_participants: [mvSale],
    f2_participants: [f2Linked],
    ctv_participants: [ctvInternalSale, ctvIndependent],
  }

  /** Mã của từng người bán, theo đúng thứ tự render. Mã là node lá nên khớp trọn văn bản. */
  const renderedCodes = () =>
    screen.getAllByText(/^(MV|EX|CTV)\d+$/).map((node) => node.textContent?.trim() ?? '')

  it('một cột chứa cả ba loại người bán, thứ tự sale MV → sàn F2 → CTV', () => {
    renderWithFullAbility(sellers(mixedRow))

    expect(renderedCodes()).toEqual(['MV000003385', 'EX000001940', 'CTV000000135', 'CTV000000135'])
  })

  it('mỗi người bán mang đúng một tỷ lệ tham gia của riêng mình', () => {
    renderWithFullAbility(sellers(mixedRow))

    expect(screen.getAllByText(/^\d+%$/)).toHaveLength(4)
  })

  it('dòng F2 đọc "Sàn F2" TRẦN — không nhãn "Khối"/"Phòng ban" nào bám vào', () => {
    render(sellers({ f2_participants: [f2Linked] }))

    // `getByText` mặc định khớp TRỌN văn bản của node, nên phép này đỏ ngay nếu ai bọc lại thành
    // "Khối / Phòng ban: Sàn F2" — đúng bố cục user đã bác (20/08).
    expect(screen.getByText('Sàn F2')).toBeInTheDocument()
    expect(screen.queryByText(/: Sàn F2/)).not.toBeInTheDocument()
  })

  it('dòng sale MV lấy khối/phòng ban của chính người đó, xếp theo cấp Chi nhánh → Khối → Phòng ban', () => {
    renderWithFullAbility(sellers({ sales_participants: [mvSale] }))

    // `getAllByText` trả về theo ĐÚNG thứ tự tài liệu, nên phép so mảng dưới đây khoá luôn cả thứ
    // tự chứ không chỉ sự có mặt.
    const orgLines = screen
      .getAllByText(/^(Chi nhánh|Khối|Phòng ban): /)
      .map((node) => node.textContent?.trim() ?? '')

    // Thứ tự cấp bậc, không phải thứ tự CR liệt kê: đọc từ rộng tới hẹp thì ba dòng thành một
    // đường đi trong cây tổ chức, đảo lại là ba mẩu rời.
    expect(orgLines).toEqual([
      'Chi nhánh: Quảng Ninh',
      'Khối: Khối Kinh doanh_QN',
      'Phòng ban: Phòng Kinh Doanh 3_QN',
    ])
  })

  it('dòng CTV lấy tổ chức THEO LINE; tuyến độc lập không có thì không in dòng nào', () => {
    render(sellers({ ctv_participants: [ctvInternalSale, ctvIndependent] }))

    expect(screen.getByText('Khối: Khối Hỗ trợ')).toBeInTheDocument()
    expect(screen.getByText('Phòng ban: Sàn Liên Kết & CTV_QN')).toBeInTheDocument()
    // Chỉ CTV tuyến gắn người mới có org ⇒ đúng MỘT dòng mỗi loại, không phải hai.
    expect(screen.getAllByText(/^Khối: /)).toHaveLength(1)
    expect(screen.getAllByText(/^Phòng ban: /)).toHaveLength(1)
  })

  it('org của người nào đi liền ngay sau tên người ấy — không thể ghép nhầm người với phòng ban', () => {
    renderWithFullAbility(
      sellers({
        sales_participants: [mvSale],
        ctv_participants: [ctvInternalSale],
      })
    )

    // Đây là bản thay thế cho phép đo "căn dòng ba cột" của bản trước. Gộp tên người và dòng Khối
    // vào MỘT truy vấn: `getAllByText` trả theo thứ tự tài liệu, nên nếu org của người này trôi
    // sang cụm của người kia thì chuỗi dưới đây đảo ngay. Đó chính là điều CR đòi khi viết "Khối,
    // phòng ban sắp xếp lần lượt tương ứng với tên người bán".
    const sequence = screen
      .getAllByText(/^(Lưu Thị Lệ|Hà Bích Ngọc|Khối: .+)$/)
      .map((node) => node.textContent?.trim() ?? '')

    expect(sequence).toEqual([
      'Lưu Thị Lệ',
      'Khối: Khối Kinh doanh_QN',
      'Hà Bích Ngọc',
      'Khối: Khối Hỗ trợ',
    ])
  })
})
