import { describe, expect, it } from 'vitest'
import { BookingRefundSaleSale_type as SaleType } from '@/api/schema'
import { CtvLineType, F2Source as F2SourceEnum } from '@/constants/api-schema-aliases'
import { validateAddSaleStaff, type ValidateAddSaleStaffInput } from './addSaleStaffValidation'

const makeInput = (
  overrides: Partial<ValidateAddSaleStaffInput> = {}
): ValidateAddSaleStaffInput => ({
  // Valid internal-employee baseline; each test overrides just what it needs.
  saleType: SaleType.mv,
  isInternal: true,
  selectedEmployeeId: 1,
  selectedCollaboratorId: null,
  selectedExchangeId: null,
  f2Source: F2SourceEnum.linked,
  f2SourceDirectorId: null,
  ctvLineType: '',
  ctvLineEmployeeId: null,
  ctvLineDepartmentId: null,
  ...overrides,
})

describe('validateAddSaleStaff', () => {
  it('returns undefined for a valid internal employee selection', () => {
    expect(validateAddSaleStaff(makeInput())).toBeUndefined()
  })

  it('flags the primary picker when an internal employee is missing', () => {
    const error = validateAddSaleStaff(makeInput({ selectedEmployeeId: null }))
    expect(error).toEqual({ field: 'primary', message: 'Vui lòng chọn nhân viên' })
  })

  it('flags the primary picker when a collaborator is missing', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.collaborator,
        isInternal: false,
        selectedEmployeeId: null,
        selectedCollaboratorId: null,
      })
    )
    expect(error).toEqual({ field: 'primary', message: 'Vui lòng chọn cộng tác viên' })
  })

  it('flags the primary picker when an exchange/partner is missing', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.partner,
        isInternal: false,
        selectedEmployeeId: null,
        selectedExchangeId: null,
      })
    )
    expect(error).toEqual({ field: 'primary', message: 'Vui lòng chọn sàn / đối tác' })
  })

  // Regression for the reported bug: the "select director" error must be tagged
  // to the `director` field, not leak into the primary (Sàn / Đối tác) picker.
  it('flags the director field when F2 source is director but no director is chosen', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.partner,
        isInternal: false,
        selectedEmployeeId: null,
        selectedExchangeId: 10,
        f2Source: F2SourceEnum.director,
        f2SourceDirectorId: null,
      })
    )
    expect(error).toEqual({
      field: 'director',
      message: 'Vui lòng chọn giám đốc cho nguồn giám đốc kinh doanh',
    })
  })

  it('passes a partner with F2 source director once a director is chosen', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.partner,
        isInternal: false,
        selectedEmployeeId: null,
        selectedExchangeId: 10,
        f2Source: F2SourceEnum.director,
        f2SourceDirectorId: 5,
      })
    )
    expect(error).toBeUndefined()
  })

  it('does not require a director when F2 source is not director', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.partner,
        isInternal: false,
        selectedEmployeeId: null,
        selectedExchangeId: 10,
        f2Source: F2SourceEnum.linked,
        f2SourceDirectorId: null,
      })
    )
    expect(error).toBeUndefined()
  })

  it('flags the ctvLineType field when a collaborator has no line type', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.collaborator,
        isInternal: false,
        selectedEmployeeId: null,
        selectedCollaboratorId: 3,
        ctvLineType: '',
      })
    )
    expect(error).toEqual({ field: 'ctvLineType', message: 'Vui lòng chọn loại line' })
  })

  it('flags the ctvLineEmployee field for a management line without an employee', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.collaborator,
        isInternal: false,
        selectedEmployeeId: null,
        selectedCollaboratorId: 3,
        ctvLineType: CtvLineType.management,
        ctvLineEmployeeId: null,
      })
    )
    expect(error).toEqual({ field: 'ctvLineEmployee', message: 'Vui lòng chọn Nhân viên MV' })
  })

  it('flags the ctvLineDepartment field for an exchange-dept line without a department', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.collaborator,
        isInternal: false,
        selectedEmployeeId: null,
        selectedCollaboratorId: 3,
        ctvLineType: CtvLineType.exchange_dept,
        ctvLineDepartmentId: null,
      })
    )
    expect(error).toEqual({
      field: 'ctvLineDepartment',
      message: 'Vui lòng chọn Phòng quản lý sàn LK',
    })
  })

  it('flags the ctvLineDepartment field for a management line missing its department', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.collaborator,
        isInternal: false,
        selectedEmployeeId: null,
        selectedCollaboratorId: 3,
        ctvLineType: CtvLineType.management,
        ctvLineEmployeeId: 7,
        ctvLineDepartmentId: null,
      })
    )
    expect(error).toEqual({ field: 'ctvLineDepartment', message: 'Vui lòng chọn Phòng ban' })
  })

  // Bug 86eyez5z6: ô "Nguồn F2" gắn `required` nhưng không ai canh, nên xoá trắng nó
  // vẫn thêm được dòng. Giá trị rỗng đó chỉ bị chặn ở zod của form cha, bằng message
  // tiếng Anh gắn vào `sales_staff.<i>.f2_source` — người dùng chỉ thấy câu chung chung
  // dưới bảng và không lưu được. Phải chặn ngay tại dialog, kèm lời tiếng Việt.
  it.each([[null], ['']])('flags the F2 source field when a partner leaves it empty (%p)', (v) => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.partner,
        isInternal: false,
        selectedEmployeeId: null,
        selectedExchangeId: 5,
        f2Source: v as string | null,
      })
    )
    expect(error).toEqual({ field: 'f2Source', message: 'Vui lòng chọn nguồn F2' })
  })

  it('does not require an F2 source for a collaborator line', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.collaborator,
        isInternal: false,
        selectedEmployeeId: null,
        selectedCollaboratorId: 3,
        ctvLineType: CtvLineType.management,
        ctvLineEmployeeId: 7,
        ctvLineDepartmentId: 9,
        f2Source: null,
      })
    )
    expect(error).toBeUndefined()
  })

  it('passes a fully specified collaborator management line', () => {
    const error = validateAddSaleStaff(
      makeInput({
        saleType: SaleType.collaborator,
        isInternal: false,
        selectedEmployeeId: null,
        selectedCollaboratorId: 3,
        ctvLineType: CtvLineType.management,
        ctvLineEmployeeId: 7,
        ctvLineDepartmentId: 9,
      })
    )
    expect(error).toBeUndefined()
  })
})
