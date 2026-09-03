import { useMemo, useCallback, useEffect, useRef } from 'react'
import { useFormContext, Controller, useWatch, useFieldArray } from 'react-hook-form'

import { BookingRefundSaleSale_type as SaleType } from '@/api/schema'
import { formatCurrencyVND, formatPercent } from '@/utils'
import { resolveRowIsAmt, formatRateSpecWithEquivalent } from '@/utils/rate-spec'
import { FullCellNumberInput } from '@/components/commons'
import { useDialog } from '@/hooks/useDialog'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

import { SaleStaffTable, type SaleStaffTableRow } from '@/features/sales/components/SaleStaffTable'
import AddSaleStaffDialog, {
  type AddSaleStaffDialogResult,
} from '@/features/sales/components/AddSaleStaffDialog'
import {
  useProductInventoryCurrentF2Commissions,
  useProductInventoryCurrentCommission,
  useCommissionWorkspaceSAF2,
  useCommissionWorkspaceSACore,
} from '@/services/realestate-service'

export type CommonSaleStaffTableProps = {
  module: 'booking' | 'deposit'
  paymentAmount: number
  isReadOnly?: boolean
  /** Extra fields to spread into every new row (e.g. deposit-specific defaults) */
  defaultAppendFields?: Record<string, unknown>
}

export const CommonSaleStaffTable = ({
  module,
  paymentAmount,
  isReadOnly = false,
  defaultAppendFields,
}: CommonSaleStaffTableProps) => {
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
    setError,
  } = useFormContext<any>()
  const { displayFormContent, displayClose } = useDialog()
  const addDialogKeyRef = useRef(0)

  // Mappings based on module
  const fNames = useMemo(() => {
    return module === 'booking'
      ? {
          array: 'sales_staff',
          productInventory: 'product_inventory_id',
          percentage: 'participation_percentage',
          employee: 'employee_id',
          exchange: 'exchange_id',
          collaborator: 'collaborator_id',
        }
      : {
          array: 'sales_staff',
          productInventory: 'product_inventory',
          percentage: 'percentage',
          employee: 'employee',
          exchange: 'exchange',
          collaborator: 'collaborator',
        }
  }, [module])

  // ─── Constants ────────────────────────────────────────────────────
  const saleTypeKey =
    module === 'booking'
      ? APP_CONSTANT_KEY.SALES.BOOKING_SALE.SALE_TYPE_CHOICES
      : APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT_SALE.SALE_TYPE_CHOICES

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [saleTypeKey],
  })
  const saleTypeOptions = keysMapOptions.get(saleTypeKey) || []
  const getSaleTypeLabel = useCallback(
    (val: string) => saleTypeOptions.find((opt) => opt.value === val)?.label || val,
    [saleTypeOptions]
  )

  // ─── Field array ──────────────────────────────────────────────────
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: fNames.array,
  })

  // ─── Watched values ───────────────────────────────────────────────
  const watchedStaff = useWatch({ control, name: fNames.array }) as any[] | undefined
  const pctSaleCommission = useWatch({ control, name: 'pct_sale_commission' }) as number | undefined
  const amtSaleCommission = useWatch({ control, name: 'amt_sale_commission' }) as number | undefined
  const saleCommissionType = useWatch({ control, name: 'sale_commission_type' }) as 'pct' | 'amt'
  const isAmtCommission = saleCommissionType === 'amt'

  // Deposit supports a per-staff commission type: each staff independently picks
  // % or VNĐ via the AddSaleStaffDialog toggle. Booking keeps a single
  // contract-level type driven by its global toggle. Resolve the type PER ROW so
  // flipping the global type for one staff (e.g. a partner entered in VNĐ) never
  // reinterprets another staff's commission or blanks its cell.
  const getRowIsAmt = useCallback(
    (staff: any): boolean => {
      return resolveRowIsAmt(staff, module, isAmtCommission)
    },
    [module, isAmtCommission]
  )

  const feeCalculationPrice = useWatch({ control, name: 'fee_calculation_price' }) as
    | number
    | undefined
  const pctRevenue = useWatch({ control, name: 'pct_revenue' }) as number | undefined
  const amtRevenue = useWatch({ control, name: 'amt_revenue' }) as number | undefined
  const revenueType = useWatch({ control, name: 'revenue_type' }) as 'pct' | 'amt'
  const productInventoryId = useWatch({ control, name: fNames.productInventory }) as
    | number
    | undefined
  const salesAllocationId = useWatch({ control, name: 'sales_allocation' }) as number | undefined
  const pctAgencyFee = useWatch({ control, name: 'pct_agency_fee' }) as number | undefined

  // ─── Derived values ───────────────────────────────────────────────
  const totalPercentage = useMemo(
    () => watchedStaff?.reduce((acc, item) => acc + Number(item[fNames.percentage] || 0), 0) ?? 0,
    [watchedStaff, fNames.percentage]
  )

  useEffect(() => {
    if (module === 'booking' && !isReadOnly) {
      setValue('total_commission_percentage', totalPercentage || 0)
    }
  }, [module, totalPercentage, setValue, isReadOnly])

  // ─── Commission config sources ────────────────────────────────────
  // Declared BEFORE the totals memo below: that memo reads `f2Commissions` in its
  // partner-fallback branch, so declaring it later puts the read in the temporal
  // dead zone and crashes the form on any partner row with a zero commission.
  const { data: currentF2Data } = useProductInventoryCurrentF2Commissions(productInventoryId || 0, {
    enabled: !!productInventoryId,
  })

  const effectiveSaId = salesAllocationId || currentF2Data?.sales_allocation_id || 0
  const { data: saF2Data } = useCommissionWorkspaceSAF2(effectiveSaId)

  const { data: currentCommData } = useProductInventoryCurrentCommission(productInventoryId || 0, {
    enabled: !!productInventoryId,
  })

  const { data: saCoreData } = useCommissionWorkspaceSACore(effectiveSaId)

  const f2Commissions = useMemo(() => {
    if (
      productInventoryId &&
      currentF2Data?.f2_commissions &&
      currentF2Data.f2_commissions.length > 0
    ) {
      return currentF2Data.f2_commissions
    }
    if (saF2Data?.current && saF2Data.current.length > 0) {
      return saF2Data.current.map((c: any) => ({
        exchange_id: c.exchange_id,
        exchange_name: c.exchange_name,
        is_configured: c.is_configured,
        is_distribution_exchange: false,
        resolution_tier: c.resolution_tier,
        current_commission: c.entry?.record || null,
      }))
    }
    return currentF2Data?.f2_commissions
  }, [productInventoryId, currentF2Data, saF2Data])

  const feeCalculationPriceResolved = feeCalculationPrice ?? paymentAmount

  const { totalDTCaNhan, totalHoaHong } = useMemo(() => {
    let sumDTCaNhan = 0
    let sumHoaHong = 0
    const baseAmount =
      revenueType === 'amt'
        ? amtRevenue
          ? Number(amtRevenue)
          : 0
        : feeCalculationPriceResolved *
          (pctRevenue !== undefined && pctRevenue !== null ? Number(pctRevenue) / 100 : 1)

    watchedStaff?.forEach((item) => {
      const isPartnerItem = item?.sale_type === 'partner'
      let itemIsAmt = getRowIsAmt(item)
      let commValue = itemIsAmt
        ? Number(item.amt_commission || 0)
        : Number(item.pct_commission || 0)

      if (isPartnerItem && !commValue) {
        const rawEx = item?.exchange_id || item?.[fNames.exchange]
        const exId = typeof rawEx === 'object' ? (rawEx?.id ?? rawEx?.exchange_id) : rawEx
        const match = f2Commissions?.find((c: any) => String(c.exchange_id) === String(exId))
        const mComm = match?.current_commission
        if (mComm) {
          if (mComm.amt_f2_commission != null || mComm.amt_commission != null) {
            itemIsAmt = true
            commValue = Number(mComm.amt_f2_commission ?? mComm.amt_commission ?? 0)
          } else if (mComm.pct_f2_commission != null || mComm.pct_commission != null) {
            commValue = Number(mComm.pct_f2_commission ?? mComm.pct_commission ?? 0)
          }
        }
      }

      const pct = Number(item[fNames.percentage] || 0) / 100
      const itemBaseAmount = isPartnerItem ? 0 : baseAmount
      sumDTCaNhan += itemBaseAmount * pct
      sumHoaHong += itemIsAmt
        ? commValue * pct
        : feeCalculationPriceResolved * pct * (commValue / 100)
    })

    return { totalDTCaNhan: sumDTCaNhan, totalHoaHong: sumHoaHong }
  }, [
    watchedStaff,
    feeCalculationPriceResolved,
    pctRevenue,
    isAmtCommission,
    amtRevenue,
    revenueType,
    fNames.percentage,
    fNames.exchange,
    getRowIsAmt,
    f2Commissions,
  ])

  const currentCommissionVal =
    currentCommData?.current_commission?.pct_sale_commission ??
    saCoreData?.current?.entry?.record?.pct_sale_commission

  // Hoa hồng MV mặc định: ưu tiên giá trị trên form (HĐ), fallback cấu hình BĐS hiện tại.
  const configuredPctSaleCommission = useMemo(() => {
    if (pctSaleCommission != null) return Number(pctSaleCommission)
    if (currentCommissionVal != null) return Number(currentCommissionVal)
    return undefined
  }, [pctSaleCommission, currentCommissionVal])

  const configuredAmtSaleCommission = useMemo(
    () => (amtSaleCommission != null ? Number(amtSaleCommission) : undefined),
    [amtSaleCommission]
  )

  const configuredPctSaleCommissionStr =
    configuredPctSaleCommission != null ? String(configuredPctSaleCommission) : ''

  const configuredAmtSaleCommissionStr =
    configuredAmtSaleCommission != null ? String(configuredAmtSaleCommission) : ''

  const exchangeOptions = useMemo(() => {
    // Chỉ lấy các Sàn liên kết ĐANG được cấu hình hiện tại của PI (is_configured).
    // Không dùng distribution_exchange thô của PI vì nó không gắn cờ is_configured
    // → tránh lọt sàn F0/chưa config (vd "Minh Trí" ở HĐ cọc 1660).
    const configured = (f2Commissions ?? []).filter((c: any) => c.is_configured)

    // Nếu trong nhóm đã config có sàn phân phối → chỉ cho chọn sàn phân phối đó.
    const distributionExchange = configured.find((c: any) => c.is_distribution_exchange)
    const source = distributionExchange ? [distributionExchange] : configured

    // Luôn trả về mảng (kể cả rỗng) để Select không fallback load TOÀN BỘ sàn.
    const opts = source.map((c: any) => ({
      value: String(c.exchange_id),
      label: c.exchange_name || `Sàn ID ${c.exchange_id}`,
    }))

    // Luôn giữ lại các sàn F2 đang được chọn/prefill trong watchedStaff để Select hiển thị đúng tên sàn và không bị trống.
    if (watchedStaff && Array.isArray(watchedStaff)) {
      watchedStaff.forEach((item) => {
        if (item?.sale_type === 'partner') {
          const rawEx = item?.exchange_id || item?.[fNames.exchange]
          const exId = typeof rawEx === 'object' ? (rawEx?.id ?? rawEx?.exchange_id) : rawEx
          const exDetail = item?.exchange_detail || (typeof rawEx === 'object' ? rawEx : null)
          if (exId != null) {
            const exIdStr = String(exId)
            if (!opts.some((opt) => opt.value === exIdStr)) {
              opts.push({
                value: exIdStr,
                label: exDetail?.name || exDetail?.exchange_name || `Sàn ID ${exId}`,
              })
            }
          }
        }
      })
    }

    return opts
  }, [f2Commissions, watchedStaff, fNames.exchange])

  // ─── Handlers ────────────────────────────────────────────────────
  const handleAddStaff = useCallback(() => {
    if (isReadOnly) return
    if (totalPercentage >= 100) {
      if (module === 'booking') {
        // Fallback for missing toastService or module differences
        setError(fNames.array, {
          type: 'manual',
          message:
            'Tổng Tỷ lệ tham gia đã đạt 100%, không thể thêm người phụ trách. Vui lòng giảm tỷ lệ của những người khác trước.',
        })
      } else {
        setError(fNames.array, {
          type: 'manual',
          message: `Tổng tỷ lệ doanh thu phải bằng 100% (hiện tại: ${totalPercentage}%)`,
        })
      }
      return
    }

    addDialogKeyRef.current += 1

    displayFormContent({
      title: 'Thêm nhân sự phụ trách bán',
      scrollable: false,
      content: (
        <AddSaleStaffDialog
          key={`add-sale-staff-${addDialogKeyRef.current}`}
          f2Commissions={f2Commissions}
          exchangeOptions={exchangeOptions}
          disableCommissionInput={true}
          defaultMvCommission={configuredPctSaleCommissionStr || undefined}
          saleTypeOptions={saleTypeOptions}
          defaultSaleType={saleTypeOptions[0]?.value || 'mv'}
          externalSaleTypeValues={['partner', 'collaborator']}
          showPercentageInputs
          defaultPctCommission={configuredPctSaleCommissionStr}
          defaultAmtCommission={configuredAmtSaleCommissionStr}
          commissionType={saleCommissionType}
          defaultPartnerPctCommission={pctAgencyFee != null ? String(pctAgencyFee) : ''}
          employeeAdditionalParams={(type) => ({ type })}
          exchangeAdditionalParams={(type) => {
            if (type === 'partner') {
              return { is_sale_exchange: true, product_inventory: productInventoryId || undefined }
            }
            return {}
          }}
          onConfirm={(data: AddSaleStaffDialogResult) => {
            const dataCommType = data.commission_type
            if (data.sale_type === 'mv' && dataCommType !== saleCommissionType) {
              setValue('sale_commission_type', dataCommType)
            }
            append({
              [fNames.employee]: data.employee_id ?? null,
              [fNames.percentage]: data.participation_percentage,
              // Write the field matching the type the user actually picked in the
              // dialog (dataCommType) — NOT the stale global captured by this
              // closure. Otherwise switching the dialog's %/VNĐ toggle drops the
              // entered value and leaves the row in the wrong field.
              pct_commission:
                dataCommType === 'pct' && data.pct_commission != null
                  ? data.pct_commission
                  : undefined,
              amt_commission:
                dataCommType === 'amt' && data.amt_commission != null
                  ? data.amt_commission
                  : undefined,
              sale_type: data.sale_type,
              [fNames.exchange]: data.exchange_id ?? null,
              employee_detail: data.employee_detail,
              exchange_detail: data.exchange_detail,
              [fNames.collaborator]: data.collaborator_id ?? null,
              collaborator_detail: data.collaborator_detail,
              ctv_line_type: data.ctv_line_type,
              ctv_line_employee_id: data.ctv_line_employee_id,
              ctv_line_department_id: data.ctv_line_department_id,
              count_as_line_revenue: data.count_as_line_revenue,
              f2_source: data.f2_source,
              f2_source_director_id: data.f2_source_director_id,
              f2_source_director_detail: data.f2_source_director_detail,
              ...(defaultAppendFields ?? {}),
            })
            displayClose()
          }}
          onCancel={() => displayClose()}
        />
      ),
      confirmText: '',
      hideFooter: true,
    })
  }, [
    isReadOnly,
    totalPercentage,
    module,
    setError,
    fNames,
    displayFormContent,
    displayClose,
    f2Commissions,
    exchangeOptions,
    configuredPctSaleCommissionStr,
    configuredAmtSaleCommissionStr,
    saleTypeOptions,
    saleCommissionType,
    pctAgencyFee,
    productInventoryId,
    append,
    setValue,
  ])

  const handleEditStaff = useCallback(
    (index: number) => {
      if (isReadOnly) return
      const currentValues = getValues(fNames.array)?.[index]
      displayFormContent({
        title: 'Chỉnh sửa nhân sự phụ trách bán',
        scrollable: false,
        content: (
          <AddSaleStaffDialog
            key={Date.now()}
            f2Commissions={f2Commissions}
            exchangeOptions={exchangeOptions}
            disableCommissionInput={true}
            defaultMvCommission={configuredPctSaleCommissionStr || undefined}
            saleTypeOptions={saleTypeOptions}
            externalSaleTypeValues={['partner', 'collaborator']}
            showPercentageInputs
            commissionType={getRowIsAmt(currentValues) ? 'amt' : 'pct'}
            defaultSaleType={currentValues?.sale_type || 'mv'}
            defaultEmployeeId={currentValues?.[fNames.employee]}
            defaultExchangeId={currentValues?.[fNames.exchange]}
            defaultCollaboratorId={currentValues?.[fNames.collaborator]}
            defaultEmployee={currentValues?.employee_detail}
            defaultExchange={currentValues?.exchange_detail}
            defaultCollaborator={currentValues?.collaborator_detail}
            defaultParticipationPercentage={
              currentValues?.[fNames.percentage] != null
                ? String(currentValues[fNames.percentage])
                : undefined
            }
            defaultPctCommission={currentValues?.pct_commission}
            defaultAmtCommission={currentValues?.amt_commission}
            defaultPctCommissionSpec={currentValues?.pct_commission_spec}
            defaultCtvLineType={currentValues?.ctv_line_type}
            defaultCtvLineEmployeeId={currentValues?.ctv_line_employee_id}
            defaultCtvLineDepartmentId={currentValues?.ctv_line_department_id}
            defaultCountAsLineRevenue={currentValues?.count_as_line_revenue}
            defaultF2Source={currentValues?.f2_source}
            defaultF2SourceDirectorId={currentValues?.f2_source_director_id}
            employeeAdditionalParams={(type) => ({ type })}
            exchangeAdditionalParams={(type) => {
              if (type === 'partner') {
                return {
                  is_sale_exchange: true,
                  product_inventory: productInventoryId || undefined,
                }
              }
              return {}
            }}
            submitText="Lưu thay đổi"
            onConfirm={(data: AddSaleStaffDialogResult) => {
              const dataCommType = data.commission_type
              if (data.sale_type === 'mv' && dataCommType !== saleCommissionType) {
                setValue('sale_commission_type', dataCommType)
              }
              update(index, {
                ...currentValues,
                sale_type: data.sale_type,
                [fNames.employee]: data.employee_id ?? null,
                [fNames.exchange]: data.exchange_id ?? null,
                [fNames.collaborator]: data.collaborator_id ?? null,
                employee_detail: data.employee_detail,
                exchange_detail: data.exchange_detail,
                collaborator_detail: data.collaborator_detail,
                [fNames.percentage]:
                  data.participation_percentage ?? currentValues[fNames.percentage],
                pct_commission:
                  dataCommType === 'pct'
                    ? data.pct_commission != null
                      ? data.pct_commission
                      : currentValues.pct_commission
                    : undefined,
                amt_commission:
                  dataCommType === 'amt'
                    ? data.amt_commission != null
                      ? data.amt_commission
                      : currentValues.amt_commission
                    : undefined,
                ctv_line_type: data.ctv_line_type,
                ctv_line_employee_id: data.ctv_line_employee_id,
                ctv_line_department_id: data.ctv_line_department_id,
                count_as_line_revenue: data.count_as_line_revenue,
                f2_source: data.f2_source,
                f2_source_director_id: data.f2_source_director_id,
                f2_source_director_detail: data.f2_source_director_detail,
              })
              displayClose()
            }}
            onCancel={() => displayClose()}
          />
        ),
        confirmText: '',
        hideFooter: true,
      })
    },
    [
      isReadOnly,
      getValues,
      fNames,
      displayFormContent,
      f2Commissions,
      exchangeOptions,
      configuredPctSaleCommissionStr,
      saleTypeOptions,
      saleCommissionType,
      productInventoryId,
      update,
      module,
      displayClose,
      setValue,
    ]
  )

  // ─── Compute normalized rows ──────────────────────────────────────
  // Phần nặng (tiền, tỷ lệ, nhãn) memo hoá bình thường; lỗi theo dòng gắn vào sau,
  // ngoài memo — xem ghi chú ở `rows` bên dưới.
  const baseRows = useMemo<SaleStaffTableRow[]>(
    () =>
      fields.map((field, index) => {
        const staff = watchedStaff?.[index]
        const rowIsAmt = getRowIsAmt(staff)
        const percentage = Number(staff?.[fNames.percentage] || 0)
        const commValue = rowIsAmt
          ? Number(staff?.amt_commission || 0)
          : Number(staff?.pct_commission || 0)

        const baseAmount =
          revenueType === 'amt'
            ? amtRevenue
              ? Number(amtRevenue)
              : 0
            : feeCalculationPriceResolved *
              (pctRevenue !== undefined && pctRevenue !== null ? Number(pctRevenue) / 100 : 1)

        const pct = percentage / 100
        // Use true for deposit because it always calculates financials
        const canCalculate = module === 'deposit' ? true : !!productInventoryId
        const isPartner = staff?.sale_type === 'partner'
        const itemBaseAmount = isPartner ? 0 : baseAmount
        const thanhTienDTCaNhan = canCalculate ? itemBaseAmount * pct : null
        const thanhTienHoaHong = canCalculate
          ? rowIsAmt
            ? commValue * pct
            : feeCalculationPriceResolved * pct * (commValue / 100)
          : null

        const personLabel =
          staff?.employee_detail?.fullname ||
          staff?.employee_detail?.full_name ||
          staff?.employee?.fullname ||
          staff?.employee?.full_name ||
          staff?.exchange_detail?.name ||
          staff?.exchange?.name ||
          staff?.collaborator_detail?.name ||
          staff?.collaborator_name ||
          staff?.collaborator?.name ||
          (staff?.[fNames.employee]
            ? typeof staff[fNames.employee] === 'object'
              ? '-'
              : `#${staff[fNames.employee]}`
            : staff?.[fNames.exchange]
              ? typeof staff[fNames.exchange] === 'object'
                ? '-'
                : `#${staff[fNames.exchange]}`
              : staff?.[fNames.collaborator]
                ? typeof staff[fNames.collaborator] === 'object'
                  ? '-'
                  : `#${staff[fNames.collaborator]}`
                : '-')

        const isInternal = staff?.sale_type === 'mv'
        const branchDeptLabel =
          isInternal && staff?.employee_detail
            ? [
                staff.employee_detail?.branch?.name,
                staff.employee_detail?.block?.name,
                staff.employee_detail?.department?.name,
              ]
                .filter(Boolean)
                .join(' - ') || undefined
            : undefined

        const revenueDisplay = isPartner
          ? revenueType === 'amt'
            ? formatCurrencyVND(0)
            : formatPercent(0)
          : revenueType === 'amt'
            ? formatCurrencyVND(Number(amtRevenue || 0))
            : formatPercent(
                pctRevenue !== undefined && pctRevenue !== null ? Number(pctRevenue) : 100
              )

        let fractionText: string | null = null
        let matchedComm: any = null
        if (isPartner) {
          const rawEx = staff?.exchange_id || staff?.[fNames.exchange]
          const exId = typeof rawEx === 'object' ? (rawEx?.id ?? rawEx?.exchange_id) : rawEx
          const match = f2Commissions?.find((c: any) => String(c.exchange_id) === String(exId))
          matchedComm = match?.current_commission
          const spec = matchedComm?.f2_commission_spec || staff?.pct_commission_spec
          fractionText = spec ? formatRateSpecWithEquivalent(spec) : null
        }

        const effectiveAmt =
          staff?.amt_commission ?? matchedComm?.amt_f2_commission ?? matchedComm?.amt_commission
        const effectivePct =
          staff?.pct_commission ?? matchedComm?.pct_f2_commission ?? matchedComm?.pct_commission
        const effectiveRowIsAmt =
          isPartner && effectiveAmt != null && String(effectiveAmt) !== '' ? true : rowIsAmt

        const commissionDisplay = fractionText
          ? fractionText
          : effectiveRowIsAmt
            ? formatCurrencyVND(Number(effectiveAmt || 0))
            : formatPercent(effectivePct || 0)

        return {
          id: field.id,
          saleTypeLabel: getSaleTypeLabel(staff?.sale_type as string),
          personLabel,
          branchDeptLabel,
          countAsLineRevenue: staff?.count_as_line_revenue,
          percentage,
          feeCalculationPriceDisplay: feeCalculationPriceResolved,
          revenueDisplay,
          thanhTienDTCaNhan,
          thanhTienHoaHong,
          commissionDisplay,
        }
      }),
    [
      fields,
      watchedStaff,
      fNames,
      isAmtCommission,
      revenueType,
      amtRevenue,
      pctRevenue,
      feeCalculationPriceResolved,
      module,
      productInventoryId,
      getSaleTypeLabel,
      getRowIsAmt,
    ]
  )

  // Lỗi theo dòng phải đọc NGOÀI useMemo ở trên.
  //
  // `setError` của react-hook-form ghi ĐÈ TẠI CHỖ vào `formState.errors` rồi phát lại
  // đúng object cũ — identity không đổi. Nên nếu `errors` nằm trong deps của một
  // `useMemo`, memo đó KHÔNG tính lại khi lỗi từ BE được set sau submit, và thông báo
  // của BE không bao giờ tới được dòng (bug 86eyez5z6: BE trả rõ "sàn F2 chưa có tỷ lệ
  // trên TBC" nhưng màn hình chỉ hiện câu chung chung dưới bảng).
  //
  // Cố ý KHÔNG bọc useMemo: chạy lại mỗi lần render chính là thứ giữ cho lỗi luôn tươi.
  // Chi phí chỉ là vài phép truy cập thuộc tính trên số dòng nhân sự (thực tế 1-5 dòng).
  const rows: SaleStaffTableRow[] = baseRows.map((row, index) => {
    const staffError = (errors as Record<string, any>)?.[fNames.array]?.[index]
    const personnelError =
      staffError?.[fNames.employee]?.message ||
      staffError?.[fNames.exchange]?.message ||
      staffError?.[fNames.collaborator]?.message ||
      staffError?.ctv_line_type?.message ||
      staffError?.f2_source?.message ||
      staffError?.f2_source_director_id?.message
    return personnelError ? { ...row, personnelError: String(personnelError) } : row
  })

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <SaleStaffTable
      isReadOnly={isReadOnly}
      isAmtCommission={isAmtCommission}
      revenueType={revenueType}
      rows={rows}
      totalPercentage={totalPercentage}
      totalDTCaNhan={totalDTCaNhan}
      totalHoaHong={totalHoaHong}
      totalDealCommission={
        isAmtCommission ? (configuredAmtSaleCommission ?? 0) : (configuredPctSaleCommission ?? 0)
      }
      canShowFinancials={module === 'deposit' ? true : !!productInventoryId}
      onAdd={handleAddStaff}
      onEdit={handleEditStaff}
      onRemove={(index) => remove(index)}
      formArrayErrors={errors?.[fNames.array]}
      renderParticipationCell={(index) =>
        isReadOnly ? (
          <div
            className={`flex h-full min-h-[44px] w-full items-center px-3 ${module === 'deposit' ? 'justify-end text-right' : 'justify-center'}`}
          >
            {formatPercent(watchedStaff?.[index]?.[fNames.percentage] || 0)}
          </div>
        ) : (
          <Controller
            control={control}
            name={`${fNames.array}.${index}.${fNames.percentage}`}
            render={({ field, fieldState }) => (
              <FullCellNumberInput
                {...field}
                isError={!!fieldState.error}
                value={field.value !== null && field.value !== undefined ? String(field.value) : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value
                  if (!val) {
                    field.onChange(module === 'deposit' ? 0 : '0')
                    return
                  }
                  const numVal = Number(val)
                  const capped = numVal > 100 ? 100 : numVal >= 0 ? numVal : 0
                  field.onChange(module === 'deposit' ? capped : String(capped))
                }}
                placeholder="0"
                className={`hover:ring-neutral-80 h-full min-h-[44px] w-full bg-transparent px-3 outline-none ring-inset focus-within:bg-white hover:ring-1 focus:ring-1 focus:ring-neutral-100 ${module === 'deposit' ? 'pr-8 pl-3 text-right' : 'text-center'}`}
                suffix="%"
              />
            )}
          />
        )
      }
      renderCommissionCell={(index, row) => {
        const staffItem = watchedStaff?.[index]
        const isPartnerStaff =
          staffItem?.sale_type === SaleType.partner || staffItem?.sale_type === 'partner'
        const cellIsAmt = getRowIsAmt(staffItem)

        if (isReadOnly || isPartnerStaff) {
          return (
            <div
              className={`flex h-full min-h-[44px] w-full items-center px-3 ${
                module === 'deposit'
                  ? 'text-content-dark-1 justify-end text-right'
                  : 'text-content-dark-1 justify-center'
              }`}
            >
              {row.commissionDisplay}
            </div>
          )
        }

        return (
          <Controller
            control={control}
            name={`${fNames.array}.${index}.${cellIsAmt ? 'amt_commission' : 'pct_commission'}`}
            render={({ field, fieldState }) => (
              <FullCellNumberInput
                {...field}
                isError={!!fieldState.error}
                disabled={true}
                value={field.value !== null && field.value !== undefined ? String(field.value) : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value
                  if (!val) {
                    field.onChange(module === 'deposit' ? 0 : '0')
                    return
                  }
                  const numVal = Number(val)
                  if (!cellIsAmt && numVal > 100) {
                    field.onChange(module === 'deposit' ? 100 : '100')
                  } else {
                    const capped = numVal >= 0 ? numVal : 0
                    field.onChange(module === 'deposit' ? capped : String(capped))
                  }
                }}
                placeholder="0"
                className={`hover:ring-neutral-80 h-full min-h-[44px] w-full bg-transparent px-3 outline-none ring-inset focus-within:bg-white hover:ring-1 focus:ring-1 focus:ring-neutral-100 ${module === 'deposit' ? 'pr-8 pl-3 text-right' : 'text-center'} bg-neutral-30 text-content-dark-3 cursor-not-allowed`}
                suffix={cellIsAmt ? 'VNĐ' : '%'}
                onSuffixClick={undefined}
                suffixTitle={undefined}
              />
            )}
          />
        )
      }}
    />
  )
}
