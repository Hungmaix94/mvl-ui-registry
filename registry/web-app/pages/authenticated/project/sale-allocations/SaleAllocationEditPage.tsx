import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useQueryClient } from '@tanstack/react-query'

import { Loading } from '@/components/Loading'
import { PageTitle } from '@/components/ui'
import { QUERY_KEYS } from '@/constants'
import { SaleAllocationForm } from '@/features/project/sale-allocations/components/SaleAllocationForm'
import {
  useSalesAllocation,
  useUpdateSalesAllocation,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import type { SalesAllocationFormValues } from '@/features/project/sale-allocations/types/sale-allocation-types'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'

export const SaleAllocationEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: product, isLoading } = useSalesAllocation(id ?? '')
  const { mutateAsync: updateSalesAllocation, isPending } = useUpdateSalesAllocation()

  const handleSubmit = useCallback(
    async (values: SalesAllocationFormValues) => {
      if (!id) return

      const payload = {
        name: values.name,
        project_id: values.project_id,
        source_type: values.source_type,
        investor_id: values.investor_id,
        project_type: values.project_type,
        source_exchange_id: values.source_exchange_id,
        phase: values.phase,

        min_booking_amount: values.min_booking_amount,
        min_deposit_amount: values.min_deposit_amount,

        default_pct_agency_fee: values.default_pct_agency_fee,
        default_pct_sale_commission: values.default_pct_sale_commission,
        default_pct_investor_bonus: values.default_pct_investor_bonus,
        default_pct_f2_commission: values.default_pct_f2_commission,
        default_pct_f2_bonus: values.default_pct_f2_bonus,
        default_pct_revenue: values.default_pct_revenue,
        default_amt_revenue: values.default_amt_revenue,
        default_pct_mv_bonus_to_sale: values.default_pct_mv_bonus_to_sale,

        // Direct scalar fields
        pct_ceo: values.pct_ceo,
        pct_ceo_mv_paid: values.pct_ceo_mv_paid,
        pct_sales_director: values.pct_sales_director,
        pct_sales_manager: values.pct_sales_manager,
        pct_project_director: values.pct_project_director,
        pct_project_secretary: values.pct_project_secretary,
        pct_relationship: values.pct_relationship,
        pct_planning: values.pct_planning,
        pct_packaging: values.pct_packaging,
        pct_sales_support: values.pct_sales_support,
        pct_coordination: values.pct_coordination,

        note: values.note,
        attachment_ids: values.attachment_ids,
      }

      // Clean up undefined fields
      Object.keys(payload).forEach((key) => {
        if ((payload as unknown as Record<string, unknown>)[key] === undefined) {
          delete (payload as unknown as Record<string, unknown>)[key]
        }
      })

      await updateSalesAllocation({ id, data: payload })
      toastService.success('Cập nhật thông tin bán hàng thành công')
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.LIST({}),
      })
      navigate(APP_PATH.PROJECT_SALE_ALLOCATIONS)
    },
    [id, updateSalesAllocation, queryClient, navigate]
  )

  const initialValues = useMemo(() => {
    if (!product) return undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = { ...product }

    // No need to parse arrays here since they are handled in Detail page now

    return p as Partial<SalesAllocationFormValues>
  }, [product])

  if (isLoading) {
    return (
      <>
        <PageTitle title="Cập nhật thông tin bán hàng" enableBackButton />
        <Loading />
      </>
    )
  }

  return (
    <>
      <PageTitle title="Cập nhật thông tin bán hàng" enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className="pb-6">
        {initialValues && (
          <SaleAllocationForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            isSubmitting={isPending}
            isEdit
          />
        )}
      </Flex>
    </>
  )
}

export default SaleAllocationEditPage
