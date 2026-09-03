/**
 * Ba builder này là chỗ DUY NHẤT quyết định "cột nào ăn dữ liệu nào". Ranh giới đó dễ vỡ theo một
 * cách rất im lặng: `sales_participants` chứa sẵn CẢ dòng partner lẫn collaborator (CR STT30), nên
 * quên lọc `sale_type='mv'` là sàn F2 / CTV hiện thêm một lần nữa ở cột "Danh sách sale" — bản thô,
 * không có nguồn F2 / loại tuyến, trông y như dữ liệu thật.
 */
import { describe, expect, it } from 'vitest'

import { BookingRefundSaleSale_type } from '@/api/schema'
import {
  buildCtvSellers,
  buildF2Sellers,
  buildMvSales,
  formatParticipantRef,
  type WorksheetParticipantSource,
} from './worksheet-participants'
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

/** Dòng F2 nằm SẴN trong `sales_participants` — bản thô, không được lọt sang cột "Danh sách sale". */
const f2InSalesParticipants = {
  sale_type: BookingRefundSaleSale_type.partner,
  participation_percentage: '40.00',
  employee: null,
  collaborator: null,
  exchange: ref(7, 'EX000001940', 'Sàn Tuấn Anh 66'),
  branch: null,
  block: null,
  department: null,
}

/** Dòng CTV cũng nằm sẵn trong `sales_participants` — nguồn rò rỉ thứ hai. */
const ctvInSalesParticipants = {
  sale_type: BookingRefundSaleSale_type.collaborator,
  participation_percentage: '30.00',
  employee: null,
  collaborator: ref(3, 'CTV000000135', 'Hà Bích Ngọc'),
  exchange: null,
  branch: null,
  block: null,
  department: null,
}

const f2Participant = {
  exchange: ref(7, 'EX000001940', 'Sàn Tuấn Anh 66'),
  participation_percentage: '40.00',
  f2_source: F2Source.director,
  f2_source_display: 'Nguồn giám đốc kinh doanh',
  f2_source_director: ref(12, 'MV000003385', 'Lưu Thị Lệ'),
}

const ctvParticipant = {
  collaborator: ref(3, 'CTV000000135', 'Hà Bích Ngọc'),
  participation_percentage: '30.00',
  ctv_line_type: CtvLineType.internal_sale,
  ctv_line_type_display: 'Line nhân viên sale nội bộ',
  ctv_line_employee: ref(44, 'MV000013772', 'Hoàng Văn Long'),
  branch: ref(2, 'CN-DN', 'Đà Nẵng'),
  block: ref(5, 'K-HT', 'Khối Hỗ trợ'),
  department: ref(9, 'P-SLK-QN', 'Sàn Liên Kết & CTV_QN'),
}

const fullRow: WorksheetParticipantSource = {
  sales_participants: [mvSale, f2InSalesParticipants, ctvInSalesParticipants],
  f2_participants: [f2Participant],
  ctv_participants: [ctvParticipant],
}

describe('buildMvSales', () => {
  it('trả list rỗng khi row null/undefined hoặc chưa có mảng nào', () => {
    expect(buildMvSales(null)).toEqual([])
    expect(buildMvSales(undefined)).toEqual([])
    expect(buildMvSales({})).toEqual([])
  })

  it('CHỈ lấy nhân viên MV — dòng partner/collaborator trong sales_participants bị loại', () => {
    const entries = buildMvSales(fullRow)

    expect(entries).toHaveLength(1)
    expect(entries[0].party?.code).toBe('MV000003385')
  })

  it('giữ tỷ lệ và cụm tổ chức của chính người đó', () => {
    expect(buildMvSales(fullRow)[0]).toMatchObject({
      pct: '30.00',
      branch: { name: 'Quảng Ninh' },
      block: { name: 'Khối Kinh doanh_QN' },
      department: { name: 'Phòng Kinh Doanh 3_QN' },
    })
  })
})

describe('buildF2Sellers', () => {
  it('rỗng khi không có f2_participants', () => {
    expect(buildF2Sellers({ sales_participants: [f2InSalesParticipants] })).toEqual([])
  })

  it('lấy sàn + tỷ lệ + nguồn, kèm giám đốc khi nguồn là director', () => {
    expect(buildF2Sellers(fullRow)).toEqual([
      {
        party: ref(7, 'EX000001940', 'Sàn Tuấn Anh 66'),
        pct: '40.00',
        sourceLabel: 'Nguồn giám đốc kinh doanh',
        sourceDirector: ref(12, 'MV000003385', 'Lưu Thị Lệ'),
      },
    ])
  })

  it('nguồn liên kết/công ty thì không có giám đốc', () => {
    const entries = buildF2Sellers({
      f2_participants: [
        {
          ...f2Participant,
          f2_source: F2Source.linked,
          f2_source_display: 'Nguồn sàn liên kết',
          f2_source_director: null,
        },
      ],
    })
    expect(entries[0].sourceDirector).toBeNull()
    expect(entries[0].sourceLabel).toBe('Nguồn sàn liên kết')
  })
})

describe('buildCtvSellers', () => {
  it('rỗng khi không có ctv_participants', () => {
    expect(buildCtvSellers({ sales_participants: [ctvInSalesParticipants] })).toEqual([])
  })

  it('lấy CTV + tỷ lệ + loại tuyến + chủ tuyến + tổ chức suy từ tuyến', () => {
    expect(buildCtvSellers(fullRow)[0]).toMatchObject({
      party: { code: 'CTV000000135' },
      pct: '30.00',
      lineTypeLabel: 'Line nhân viên sale nội bộ',
      lineEmployee: { code: 'MV000013772' },
      department: { name: 'Sàn Liên Kết & CTV_QN' },
    })
  })

  it('CTV độc lập: không chủ tuyến, không tổ chức — nhưng dòng VẪN tồn tại', () => {
    const entries = buildCtvSellers({
      ctv_participants: [
        {
          ...ctvParticipant,
          ctv_line_type: CtvLineType.independent,
          ctv_line_type_display: 'CTV độc lập / Kế toán',
          ctv_line_employee: null,
          branch: null,
          block: null,
          department: null,
        },
      ],
    })

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ lineEmployee: null, department: null })
  })
})

describe('formatParticipantRef', () => {
  it('ghép "mã - tên", mã đi trước', () => {
    expect(formatParticipantRef(ref(1, 'MV000003385', 'Lưu Thị Lệ'))).toBe(
      'MV000003385 - Lưu Thị Lệ'
    )
  })

  it('FK đã bị xoá (code rỗng) thì chỉ còn tên, không ra chuỗi bắt đầu bằng " - "', () => {
    expect(formatParticipantRef({ id: null, code: '', name: 'Lưu Thị Lệ' })).toBe('Lưu Thị Lệ')
  })

  it('không có ref thì ra gạch ngang', () => {
    expect(formatParticipantRef(null)).toBe('—')
  })
})
