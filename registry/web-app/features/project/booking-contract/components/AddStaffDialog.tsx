import { useMemo } from 'react'
import { BookingRefundSaleSale_type } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import AddSaleStaffDialog, {
  type AddSaleStaffDialogResult,
} from '@/features/sales/components/AddSaleStaffDialog'
import {
  useProductInventoryCurrentF2Commissions,
  useProductInventoryCurrentCommission,
} from '@/services/realestate-service'

export type AddStaffDialogResult = AddSaleStaffDialogResult

export type AddStaffDialogProps = {
  onConfirm: (data: AddStaffDialogResult) => void
  onCancel?: () => void
  defaultPctCommission?: string
  defaultAmtCommission?: string
  initialValues?: Partial<AddStaffDialogResult>
  submitText?: string
  productInventoryId?: number | null
  defaultPartnerPctCommission?: string
  commissionType?: 'pct' | 'amt'
  disableCommissionInput?: boolean
}

const AddStaffDialog = ({
  onConfirm,
  onCancel,
  defaultPctCommission,
  defaultAmtCommission,
  initialValues,
  submitText,
  productInventoryId,
  defaultPartnerPctCommission,
  commissionType,
  disableCommissionInput = false,
}: AddStaffDialogProps) => {
  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.BOOKING_SALE.SALE_TYPE_CHOICES],
  })

  const staffTypeOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.BOOKING_SALE.SALE_TYPE_CHOICES) ?? [],
    [keysMapOptions]
  )

  const { data: currentF2Data } = useProductInventoryCurrentF2Commissions(productInventoryId || 0, {
    enabled: !!productInventoryId,
  })

  const { data: currentCommData } = useProductInventoryCurrentCommission(productInventoryId || 0, {
    enabled: !!productInventoryId,
  })

  const f2Commissions = currentF2Data?.f2_commissions
  const currentCommissionVal = currentCommData?.current_commission?.pct_sale_commission

  const exchangeOptions = useMemo(() => {
    if (!f2Commissions || f2Commissions.length === 0) return undefined
    return f2Commissions.map((c: any) => ({
      value: String(c.exchange_id),
      label: c.exchange_name || `Sàn ID ${c.exchange_id}`,
    }))
  }, [f2Commissions])

  return (
    <AddSaleStaffDialog
      f2Commissions={f2Commissions}
      exchangeOptions={exchangeOptions}
      defaultMvCommission={currentCommissionVal != null ? String(currentCommissionVal) : undefined}
      saleTypeOptions={staffTypeOptions}
      defaultSaleType={initialValues?.sale_type || BookingRefundSaleSale_type.mv}
      defaultEmployeeId={initialValues?.employee_id}
      defaultExchangeId={initialValues?.exchange_id}
      defaultCollaboratorId={initialValues?.collaborator_id}
      defaultEmployee={initialValues?.employee_detail}
      defaultExchange={initialValues?.exchange_detail}
      defaultCollaborator={initialValues?.collaborator_detail}
      // CTV line fields
      defaultCtvLineType={initialValues?.ctv_line_type}
      defaultCtvLineEmployeeId={initialValues?.ctv_line_employee_id}
      defaultCtvLineDepartmentId={initialValues?.ctv_line_department_id}
      defaultCountAsLineRevenue={initialValues?.count_as_line_revenue}
      externalSaleTypeValues={[
        BookingRefundSaleSale_type.partner,
        BookingRefundSaleSale_type.collaborator,
      ]}
      showPercentageInputs
      defaultParticipationPercentage={initialValues?.participation_percentage}
      defaultPctCommission={initialValues?.pct_commission || defaultPctCommission}
      commissionType={commissionType}
      defaultAmtCommission={initialValues?.amt_commission || defaultAmtCommission}
      defaultPartnerPctCommission={defaultPartnerPctCommission}
      onConfirm={onConfirm}
      onCancel={onCancel}
      employeeAdditionalParams={(type) => ({ type })}
      exchangeAdditionalParams={(type) => {
        if (type === BookingRefundSaleSale_type.partner) {
          return { is_sale_exchange: true, product_inventory: productInventoryId || undefined }
        }
        return {}
      }}
      submitText={submitText || 'Thêm'}
      disableCommissionInput={disableCommissionInput}
    />
  )
}

export default AddStaffDialog
