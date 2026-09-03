import { useCallback, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import {
  useDepositContract,
  useUpdateDepositContract,
} from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import type { DepositContractFormValues } from '@/features/sales/deposit-contracts/types/deposit-contract-form-types'
import { DepositContractForm } from './components/DepositContractForm'
import type { DepositContractFormRef } from './components/DepositContractForm'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { Loading } from '@/components/Loading'
import { formatDateToApi } from '@/utils/date-utils'
import { getRealEstateService } from '@/services/realestate-service'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'
import { CtvLineType } from '@/constants/api-schema-aliases'
export const DepositContractEditPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: depositContract, isLoading } = useDepositContract(id)
  const piId = depositContract?.product_inventory_detail?.id
  const { data: commissionData } = useApiQuery(
    ['realestate', 'product-inventories', piId, 'current-commission'],
    () => getRealEstateService().getProductInventoryCurrentCommission(piId!),
    { enabled: !!piId }
  )
  const currentCommission = commissionData?.current_commission
  const { mutateAsync: updateDepositContract, isPending } = useUpdateDepositContract()
  const formRef = useRef<DepositContractFormRef>(null)

  const submitDepositContract = useCallback(
    async (values: DepositContractFormValues) => {
      if (!id) return

      const payload = {
        customer_id: values.customer,
        investor_id: values.investor,
        project_id: values.project,
        product_inventory_id: values.product_inventory,
        booking_ids: values.booking_ids?.length ? values.booking_ids : undefined,
        contract_date: formatDateToApi(values.contract_date ?? undefined) || undefined,
        registration_amount: values.registration_amount
          ? String(values.registration_amount)
          : undefined,
        supplementary_amount: values.supplementary_amount
          ? String(values.supplementary_amount)
          : undefined,
        payment_method: values.payment_method,
        // Xem chú thích cùng chỗ ở DepositContractCreatePage.
        transfer_to_account: values.transfer_to_account || undefined,
        source_account_holder_name: values.source_account_name,
        source_account_number: values.source_account_number,
        source_bank_name: values.source_bank_name,
        fee_calculation_price:
          values.fee_calculation_price !== undefined && values.fee_calculation_price !== null
            ? String(values.fee_calculation_price)
            : undefined,
        listed_price:
          values.listed_price !== undefined && values.listed_price !== null
            ? String(values.listed_price)
            : undefined,
        pct_sale_commission:
          values.pct_sale_commission !== undefined && values.pct_sale_commission !== null
            ? String(values.pct_sale_commission)
            : undefined,
        amt_sale_commission:
          values.amt_sale_commission !== undefined && values.amt_sale_commission !== null
            ? String(values.amt_sale_commission)
            : undefined,
        sale_commission_type: values.sale_commission_type,
        pct_revenue:
          values.pct_revenue !== undefined && values.pct_revenue !== null
            ? String(values.pct_revenue)
            : undefined,
        amt_revenue:
          values.amt_revenue !== undefined && values.amt_revenue !== null
            ? String(values.amt_revenue)
            : undefined,
        revenue_type: values.revenue_type,
        pct_agency_fee:
          values.pct_agency_fee !== undefined && values.pct_agency_fee !== null
            ? String(values.pct_agency_fee)
            : undefined,
        attachment_ids: values.kept_attachment_ids || [],
        ...(values.attachments && values.attachments.length > 0
          ? {
              files: {
                attachments: values.attachments,
              },
            }
          : {}),
        note: values.note,
        has_fee_support_proposal: values.has_fee_support_proposal,
        sales_staff: (values.sales_staff || []).map((s) => {
          // Each staff carries exactly ONE commission type (% or VNĐ). Send the
          // matching field only — never both — so a percentage value can't leak
          // into the integer-only amt_commission field (BE rejects decimals).
          const isAmtRow = s.amt_commission !== undefined && s.amt_commission !== null
          return {
            sale_type: s.sale_type,
            employee_id: s.employee ?? undefined,
            exchange_id: s.exchange ?? undefined,
            collaborator_id: s.collaborator ?? undefined,
            participation_percentage: String(s.percentage),
            pct_commission:
              !isAmtRow && s.pct_commission !== undefined && s.pct_commission !== null
                ? String(s.pct_commission)
                : undefined,
            amt_commission: isAmtRow ? String(Math.round(Number(s.amt_commission))) : undefined,
            // CTV line fields
            ctv_line_type: (s.ctv_line_type || undefined) as CtvLineType | undefined,
            ctv_line_employee_id: s.ctv_line_employee_id,
            ctv_line_department_id: s.ctv_line_department_id,
            count_as_line_revenue: s.count_as_line_revenue,
            // F2 source (partner line only) — the per-transaction source picked in
            // the sale-staff dialog. Must be forwarded here or the choice is
            // silently dropped and never reaches the backend.
            f2_source: s.f2_source ?? undefined,
            f2_source_director_id: s.f2_source_director_id ?? undefined,
          }
        }),
      }

      try {
        await updateDepositContract({ id: id, data: payload as any })
        toastService.success('Cập nhật hợp đồng đặt cọc thành công')
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.LIST({}),
        })
        navigate(APP_PATH.DEPOSIT_CONTRACT)
      } catch (error: any) {
        if (formRef.current) {
          handleApiError(error, formRef.current.setError as any, {
            customer_id: 'customer',
            investor_id: 'investor',
            project_id: 'project',
            product_inventory_id: 'product_inventory',
            // Lỗi theo dòng nhân sự (vd sàn F2 chưa có cấu hình TBC-F2) — BE trả
            // `sales_staff[i].exchange_id`, form đọc ở `sales_staff.i.exchange`.
            'sales_staff[].exchange_id': 'sales_staff.{index}.exchange',
            'sales_staff[].employee_id': 'sales_staff.{index}.employee',
            'sales_staff[].collaborator_id': 'sales_staff.{index}.collaborator',
          })
        }
      }
    },
    [id, updateDepositContract, queryClient, navigate]
  )

  // Chặn double-submit ở mức đồng bộ (§4.3c). `isPending` một mình là chưa đủ: nó chỉ
  // bật khi `mutateAsync` được gọi, tức sau toàn bộ async pre-work ở trên.
  const { submit: handleUpdateSubmit, isSubmitting } = useSubmitOnce(submitDepositContract)

  const handleCancel = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const initialValues = useMemo<Partial<DepositContractFormValues> | undefined>(() => {
    if (!depositContract) return undefined

    const parseDateFn = (d: string | null | undefined) => (d ? new Date(d) : undefined)

    // Prefer stored contract values; fall back to current commission only if not set
    const storedAmt = (depositContract as any).amt_revenue
    const fallbackAmt = currentCommission?.amt_revenue
    const revenueAmount =
      storedAmt != null ? Number(storedAmt) : fallbackAmt != null ? Number(fallbackAmt) : undefined

    const revenueType = revenueAmount != null && revenueAmount > 0 ? 'amt' : 'pct'

    const p: Partial<DepositContractFormValues> & { customer_type?: string } = {
      customer: depositContract.customer_detail?.id,
      customer_type:
        depositContract.customer_detail?.customer_type ||
        depositContract.cust_customer_type ||
        'individual',
      investor: depositContract.investor_detail?.id,
      project: depositContract.project_detail?.id,
      product_inventory: depositContract.product_inventory_detail?.id,
      booking_ids: depositContract.booking_details?.map((b) => b.id),
      registration_amount: depositContract.registration_amount
        ? Number(depositContract.registration_amount)
        : 0,
      supplementary_amount: depositContract.supplementary_amount
        ? Number(depositContract.supplementary_amount)
        : 0,
      listed_price:
        depositContract.listed_price != null ? Number(depositContract.listed_price) : undefined,
      fee_calculation_price:
        depositContract.fee_calculation_price != null
          ? Number(depositContract.fee_calculation_price)
          : undefined,
      pct_revenue:
        (depositContract as any).pct_revenue != null &&
        Number((depositContract as any).pct_revenue) !== 0
          ? Number((depositContract as any).pct_revenue)
          : currentCommission?.pct_revenue != null
            ? Number(currentCommission.pct_revenue)
            : undefined,
      amt_revenue: revenueAmount,
      revenue_type: revenueType,
      pct_sale_commission:
        (depositContract as any).pct_sale_commission != null
          ? Number((depositContract as any).pct_sale_commission)
          : currentCommission?.pct_sale_commission != null
            ? Number(currentCommission.pct_sale_commission)
            : undefined,
      amt_sale_commission:
        (depositContract as any).amt_sale_commission != null
          ? Number((depositContract as any).amt_sale_commission)
          : undefined,
      sale_commission_type: (depositContract as any).sale_commission_type || 'pct',
      pct_agency_fee:
        (depositContract as any).pct_agency_fee != null
          ? Number((depositContract as any).pct_agency_fee)
          : currentCommission?.pct_agency_fee != null
            ? Number(currentCommission.pct_agency_fee)
            : undefined,
      contract_number: (depositContract as any).contract_number,
      contract_date: parseDateFn(depositContract.contract_date) || new Date(),
      source_account_name: depositContract.source_account_holder_name,
      source_account_number: depositContract.source_account_number,
      source_bank_name: depositContract.source_bank_name,
      payment_method: depositContract.payment_method,
      // Đổ thẳng: mọi giá trị BE trả về giờ đều chọn lại được (chỉ còn mv/investor),
      // nên không cần lọc như hồi còn cờ backfill `unknown`.
      transfer_to_account: (depositContract as any).transfer_to_account || undefined,
      note: depositContract.note,
      has_fee_support_proposal: depositContract.has_fee_support_proposal ?? false,
      sales_staff: (depositContract.sales_staff || []).map((s) => {
        // Preserve each staff's OWN commission type. A saved row that used a fixed
        // amount must NOT also receive a fallback % (and vice-versa) — otherwise
        // the row carries both fields and the % value leaks into the integer-only
        // amt_commission on the next save.
        const isAmtRow = s.amt_commission != null
        const resolvedAmt = isAmtRow ? Number(s.amt_commission) : undefined
        const resolvedPct = isAmtRow
          ? undefined
          : s.pct_commission != null
            ? Number(s.pct_commission)
            : s.pct_sale_commission != null
              ? Number(s.pct_sale_commission)
              : (depositContract as any).pct_sale_commission != null
                ? Number((depositContract as any).pct_sale_commission)
                : currentCommission?.pct_sale_commission != null
                  ? Number(currentCommission.pct_sale_commission)
                  : undefined

        return {
          ...s,
          sale_type: s.sale_type,
          employee: s.employee_detail?.id,
          exchange: s.exchange_detail?.id,
          collaborator: (s as any).collaborator_detail?.id,
          percentage: Number(s.participation_percentage || 0),
          pct_commission: resolvedPct,
          amt_commission: resolvedAmt,
          ctv_line_type: (s as any).ctv_line_type,
          ctv_line_employee_id: (s as any).ctv_line_employee_id,
          ctv_line_department_id: (s as any).ctv_line_department_id,
          count_as_line_revenue: (s as any).count_as_line_revenue,
        }
      }) as DepositContractFormValues['sales_staff'],
      attachments_detail: depositContract.attachments || [],
      attachments: [],
    }

    return p
  }, [depositContract, currentCommission])

  if (isLoading) {
    return (
      <Flex justify="center" align="center" style={{ height: '50vh' }}>
        <Loading />
      </Flex>
    )
  }

  if (!depositContract) {
    return (
      <Flex justify="center" align="center" style={{ height: '50vh' }}>
        <div>Không tìm thấy Hợp đồng Đặt cọc</div>
      </Flex>
    )
  }

  return (
    <>
      <PageTitle
        title={`Chỉnh sửa Hợp đồng Đặt cọc ${depositContract.code}`}
        enableBackButton
        breadcrumb={[
          { label: 'Sales', href: '/sales' },
          { label: 'Hợp đồng Đặt cọc', href: APP_PATH.DEPOSIT_CONTRACT },
          {
            label: depositContract.code,
            href: APP_PATH.DEPOSIT_CONTRACT_DETAIL.replace(':id', String(depositContract.id)),
          },
          { label: 'Chỉnh sửa', isCurrentPage: true },
        ]}
      />
      <div className="flex flex-col gap-4 pb-12">
        <DepositContractForm
          ref={formRef}
          initialValues={initialValues}
          isEdit={true}
          depositContract={depositContract}
          onSubmit={handleUpdateSubmit}
          onCancel={handleCancel}
          isSubmitting={isPending || isSubmitting}
        />
      </div>
    </>
  )
}

export default DepositContractEditPage
