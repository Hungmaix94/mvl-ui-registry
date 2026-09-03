import { BookingRefundSaleSale_type as SaleType } from '@/api/schema'
import { CtvLineType, F2Source as F2SourceEnum } from '@/constants/api-schema-aliases'

/**
 * Which field the validation error belongs to, so the dialog can render the
 * message under the correct input instead of a single shared location.
 */
export type SaleStaffErrorField =
  | 'primary' // employee / exchange / collaborator picker (SaleStaffSelect)
  | 'f2Source' // F2 source picker (dòng đối tác sàn)
  | 'director' // F2 source business director
  | 'ctvLineType'
  | 'ctvLineEmployee'
  | 'ctvLineDepartment'

export type SaleStaffFieldError = {
  field: SaleStaffErrorField
  message: string
}

export type ValidateAddSaleStaffInput = {
  saleType: string
  /** Whether the selected sale type is an internal MaiVietLand employee. */
  isInternal: boolean
  selectedEmployeeId: number | null
  selectedCollaboratorId: number | null
  selectedExchangeId: number | null
  f2Source: string | null
  f2SourceDirectorId: number | null
  ctvLineType: string
  ctvLineEmployeeId: number | null
  ctvLineDepartmentId: number | null
}

/**
 * Pure validation for the "Thêm nhân sự phụ trách bán" dialog. Returns the
 * first field-scoped error, or `undefined` when the input is valid. Keeping the
 * error tagged with its `field` is what lets the dialog render each message
 * under the input it refers to.
 */
export function validateAddSaleStaff(
  input: ValidateAddSaleStaffInput
): SaleStaffFieldError | undefined {
  const { saleType, isInternal } = input

  if (isInternal && !input.selectedEmployeeId) {
    return { field: 'primary', message: 'Vui lòng chọn nhân viên' }
  }

  if (!isInternal) {
    if (saleType === SaleType.collaborator && !input.selectedCollaboratorId) {
      return { field: 'primary', message: 'Vui lòng chọn cộng tác viên' }
    }
    if (saleType !== SaleType.collaborator && !input.selectedExchangeId) {
      return { field: 'primary', message: 'Vui lòng chọn sàn / đối tác' }
    }
  }

  const isCollaborator = !isInternal && saleType === SaleType.collaborator
  const isPartner = !isInternal && saleType === SaleType.partner

  // Ô "Nguồn F2" gắn `required`, nên bỏ trống phải bị chặn NGAY ở dialog kèm lời tiếng
  // Việt. Không chặn ở đây thì giá trị rỗng đi xuống form và chỉ bật ra ở zod dưới dạng
  // message tiếng Anh gắn vào `sales_staff.<i>.f2_source` — chỗ người dùng không đọc được.
  if (isPartner && !input.f2Source) {
    return { field: 'f2Source', message: 'Vui lòng chọn nguồn F2' }
  }

  if (isPartner && input.f2Source === F2SourceEnum.director && !input.f2SourceDirectorId) {
    return {
      field: 'director',
      message: 'Vui lòng chọn giám đốc cho nguồn giám đốc kinh doanh',
    }
  }

  if (isCollaborator) {
    if (!input.ctvLineType) {
      return { field: 'ctvLineType', message: 'Vui lòng chọn loại line' }
    }
    const isManagementOrInternalSale =
      input.ctvLineType === CtvLineType.management ||
      input.ctvLineType === CtvLineType.internal_sale
    if (isManagementOrInternalSale && !input.ctvLineEmployeeId) {
      return { field: 'ctvLineEmployee', message: 'Vui lòng chọn Nhân viên MV' }
    }
    if (input.ctvLineType === CtvLineType.exchange_dept && !input.ctvLineDepartmentId) {
      return { field: 'ctvLineDepartment', message: 'Vui lòng chọn Phòng quản lý sàn LK' }
    }
    if (isManagementOrInternalSale && !input.ctvLineDepartmentId) {
      return { field: 'ctvLineDepartment', message: 'Vui lòng chọn Phòng ban' }
    }
  }

  return undefined
}
