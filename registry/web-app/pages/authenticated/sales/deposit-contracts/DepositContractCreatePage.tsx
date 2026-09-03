import { useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { UseFormSetError } from 'react-hook-form'

import type { components } from '@/api/schema'
import { CtvLineType } from '@/constants/api-schema-aliases'
import { FullScreenLoading } from '@/components/Loading'
import { PageTitle } from '@/components/ui'
import { QUERY_KEYS } from '@/constants'
import { useAbility } from '@/lib/ability'
import {
  useCreateDepositContract,
  getDepositContractService,
} from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { useFeeSupportProposalCreator } from '@/features/sales/deposit-contracts/hooks/useFeeSupportProposalCreator'
import {
  FEE_SUPPORT_ACTION,
  FEE_SUPPORT_PERMISSION_SUBJECT,
} from '@/features/sales/fee-support-requests/constants/fee-support-request-constants'
import type {
  DepositContractFormValues,
  DepositContractSaleValues,
} from '@/features/sales/deposit-contracts/types/deposit-contract-form-types'
import { APP_PATH } from '@/routes'
import { useProductInventory } from '@/services/realestate-service'
import { useBooking } from '@/services/sales-service'
import toastService from '@/services/toast-service'
import { formatDateToApi } from '@/utils/date-utils'
import { handleApiError } from '@/utils/error-utils'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'
import { DepositContractForm } from './components/DepositContractForm'
import type { DepositContractFormRef } from './components/DepositContractForm'

type BookingSaleApi = components['schemas']['BookingSale']

// Backend currently returns these fields on BookingSale but the OpenAPI spec
// does not include them. Update spec + regenerate schema when sync'd.
type BookingSaleWithExtras = BookingSaleApi & {
  ctv_line_employee_id?: number | null
  ctv_line_department_id?: number | null
}

function mapBookingSaleToFormValue(sale: BookingSaleWithExtras): DepositContractSaleValues {
  // sale_type is optional in OpenAPI spec but always populated by backend for
  // saved sales-staff rows (validated server-side at booking creation).
  return {
    employee: sale.employee_detail?.id,
    exchange: sale.exchange_detail?.id,
    collaborator: sale.collaborator_detail?.id,
    sale_type: sale.sale_type!,
    percentage: Number(sale.participation_percentage) || 0,
    pct_commission: sale.pct_commission != null ? Number(sale.pct_commission) : undefined,
    amt_commission: sale.amt_commission != null ? Number(sale.amt_commission) : undefined,
    employee_detail: sale.employee_detail,
    exchange_detail: sale.exchange_detail,
    collaborator_detail: sale.collaborator_detail,
    ctv_line_type: sale.ctv_line_type,
    ctv_line_employee_id: sale.ctv_line_employee_id ?? undefined,
    ctv_line_department_id: sale.ctv_line_department_id ?? undefined,
  }
}

type DepositContractInitialValues = Partial<DepositContractFormValues & { customer_type?: string }>
export const DepositContractCreatePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawBookingIds = searchParams.get('booking_ids')
  const rawBookingId = searchParams.get('booking_id')

  const bookingIds = useMemo(() => {
    if (rawBookingIds) {
      return rawBookingIds
        .split(',')
        .map(Number)
        .filter((id) => !isNaN(id))
    }
    if (rawBookingId && !isNaN(Number(rawBookingId))) {
      return [Number(rawBookingId)]
    }
    return []
  }, [rawBookingIds, rawBookingId])

  const primaryBookingId = bookingIds[0] ?? 0

  const queryClient = useQueryClient()
  const { mutateAsync: createDepositContract, isPending } = useCreateDepositContract()
  const formRef = useRef<DepositContractFormRef>(null)

  const ability = useAbility()
  const { confirmThenCreate } = useFeeSupportProposalCreator()
  const canCreateFeeSupport = ability.can(FEE_SUPPORT_ACTION.CREATE, FEE_SUPPORT_PERMISSION_SUBJECT)

  const { data: bookingDetail, isLoading: isLoadingBooking } = useBooking(primaryBookingId)

  const productInventoryId = bookingDetail?.product_inventory_detail?.id ?? 0
  const { data: productDetail, isLoading: isLoadingProduct } =
    useProductInventory(productInventoryId)

  const isLoading = isLoadingBooking || (productInventoryId > 0 && isLoadingProduct)

  const initialValues = useMemo<DepositContractInitialValues | undefined>(() => {
    if (!bookingDetail) return undefined

    return {
      booking_ids: bookingIds,
      booking: bookingDetail.id,
      customer: bookingDetail.customer_detail?.id,
      customer_type: bookingDetail.cust_customer_type,
      investor: bookingDetail.investor_detail?.id,
      project: bookingDetail.project_detail?.id,
      product_inventory: bookingDetail.product_inventory_detail?.id,
      listed_price:
        productDetail?.listed_price !== undefined ? Number(productDetail.listed_price) : undefined,
      fee_calculation_price:
        bookingDetail?.fee_calculation_price != null
          ? Number(bookingDetail.fee_calculation_price)
          : productDetail?.fee_calculation_price !== undefined
            ? Number(productDetail.fee_calculation_price)
            : undefined,
      payment_method: bookingDetail.payment_method,
      registration_amount: Number(bookingDetail.payment_amount) || 0,
      note: bookingDetail.note,
      sales_staff:
        (bookingDetail.sales_staff as BookingSaleWithExtras[] | undefined)?.map(
          mapBookingSaleToFormValue
        ) || [],
    }
  }, [bookingDetail, productDetail, bookingIds])

  const submitDepositContract = useCallback(
    async (values: DepositContractFormValues) => {
      try {
        const payload = {
          customer_id: values.customer,
          investor_id: values.investor,
          project_id: values.project,
          product_inventory_id: values.product_inventory,
          booking_ids: values.booking_ids?.length ? values.booking_ids : undefined,
          contract_number: values.contract_number,
          contract_date: formatDateToApi(values.contract_date ?? undefined) || undefined,
          registration_amount: values.registration_amount
            ? String(values.registration_amount)
            : undefined,
          supplementary_amount: values.supplementary_amount
            ? String(values.supplementary_amount)
            : undefined,
          payment_method: values.payment_method,
          // Gửi với MỌI hình thức thanh toán, không riêng chuyển khoản. Tiền mặt đưa
          // thẳng cho CĐT cũng là một nơi giữ tiền có thật, và chính nhóm này trước đây
          // để trống 100% — cột nuôi báo cáo thu-chi và quyết định luồng duyệt (về CĐT
          // thì TP TKKD duyệt là xong). Ô chọn nay luôn hiện nên không còn giá trị mồ côi.
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
              // F2 source (partner line only) — the per-transaction source picked
              // in the sale-staff dialog. Must be forwarded here or the choice is
              // silently dropped and never reaches the backend.
              f2_source: s.f2_source ?? undefined,
              f2_source_director_id: s.f2_source_director_id ?? undefined,
            }
          }),
        } as any

        const res = await createDepositContract(payload)

        // NOTE: When only part of a booking's value is converted into a deposit contract,
        // the leftover amount must be split into a new booking and taken through its
        // approval flow. That is a multi-step financial operation which must run as a
        // single backend transaction (atomicity + real approval authority), so it is
        // handled server-side and intentionally not orchestrated from the client.

        // Workaround: Backend ignores fee_calculation_price on create if booking_ids is present.
        // We issue a patch immediately after creation.
        if (payload.booking_ids && 'fee_calculation_price' in values) {
          try {
            await getDepositContractService().updateDepositContract(res.id, {
              fee_calculation_price:
                values.fee_calculation_price !== undefined && values.fee_calculation_price !== null
                  ? String(values.fee_calculation_price)
                  : (null as any),
            })
          } catch (e) {
            console.error('Failed to update fee_calculation_price after creation', e)
          }
        }

        toastService.success('Tạo hợp đồng đặt cọc thành công')
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.LIST({}),
        })

        // Có tick "đề xuất hỗ trợ phí" khi tạo → sau khi lưu (đã có id) mới mời tạo
        // phiếu hỗ trợ bán hàng, rồi vào màn CHI TIẾT HĐ vừa tạo (cả 2 nhánh). Create
        // trả về DepositContract base; dialog cần DepositContractDetail để prefill nên
        // fetch lại trước khi hỏi.
        if (values.has_fee_support_proposal && canCreateFeeSupport) {
          const goDetail = () =>
            navigate(APP_PATH.DEPOSIT_CONTRACT_DETAIL.replace(':id', String(res.id)))
          try {
            const detail = await getDepositContractService().getDepositContract(res.id)
            confirmThenCreate(detail, { onCreateClose: goDetail, onSkip: goDetail })
          } catch {
            // Fetch detail lỗi → vẫn về chi tiết HĐ vừa tạo (có thể tạo phiếu từ màn
            // sửa sau).
            goDetail()
          }
          return
        }

        // Không đề xuất hỗ trợ phí → giữ hành vi cũ: về danh sách HĐ cọc.
        navigate(APP_PATH.DEPOSIT_CONTRACT)
      } catch (error: unknown) {
        if (formRef.current) {
          handleApiError(error, formRef.current.setError as UseFormSetError<any>, {
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
    [createDepositContract, queryClient, navigate, confirmThenCreate, canCreateFeeSupport]
  )

  // Chặn double-submit ở mức đồng bộ (§4.3c). `isPending` một mình là chưa đủ: nó chỉ
  // bật khi `mutateAsync` được gọi, tức sau toàn bộ async pre-work ở trên.
  const { submit: handleCreateSubmit, isSubmitting } = useSubmitOnce(submitDepositContract)

  const handleCancel = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <>
      <PageTitle enableBackButton />
      <div className="flex flex-col gap-4 pb-12">
        {bookingIds.length > 0 && isLoading ? (
          <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
        ) : (
          <DepositContractForm
            ref={formRef}
            initialValues={initialValues}
            onSubmit={handleCreateSubmit}
            onCancel={handleCancel}
            isSubmitting={isPending || isSubmitting}
          />
        )}
      </div>
    </>
  )
}

export default DepositContractCreatePage
