import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useQueryClient } from '@tanstack/react-query'

import { Button, PageTitle } from '@/components/ui'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { QUERY_KEYS } from '@/constants'
import {
  SaleAllocationForm,
  type SaleAllocationFormRef,
} from '@/features/project/sale-allocations/components/SaleAllocationForm'
import { useCreateSalesAllocation } from '@/features/project/sale-allocations/services/sales-allocation-service'
import type { SalesAllocationFormValues } from '@/features/project/sale-allocations/types/sale-allocation-types'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'

export const SaleAllocationCreatePage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mutateAsync: createSalesAllocation, isPending } = useCreateSalesAllocation()
  const formRef = useRef<SaleAllocationFormRef>(null)

  const handleSubmit = useCallback(
    async (values: SalesAllocationFormValues) => {
      try {
        // Construct Payload aligning with generated API types
        // Mảng TBC, target, f2... đã được chuyển sang làm ở Detail page
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

          // Các thuộc tính commission trực tiếp
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
          files: {
            attachments: values.attachment_tokens || [],
          },
          existing_files: {
            attachments: values.attachment_ids || [],
          },
        }

        // Clean up undefined fields
        Object.keys(payload).forEach((key) => {
          if ((payload as unknown as Record<string, unknown>)[key] === undefined) {
            delete (payload as unknown as Record<string, unknown>)[key]
          }
        })

        console.log('DEBUG API CALL PAYLOAD:', payload)
        await createSalesAllocation(payload as unknown as Record<string, unknown>)
        toastService.success('Tạo thông tin bán hàng thành công')
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.LIST({}),
        })
        navigate(APP_PATH.PROJECT_SALE_ALLOCATIONS)
      } catch (error) {
        console.error('Failed to create sales allocation', error)
      }
    },
    [createSalesAllocation, queryClient, navigate]
  )

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.handleSubmit(handleSubmit)()
    }
  }

  return (
    <>
      <PageTitle title="Thêm mới Thông tin bán hàng" enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className="px-5 pb-8 lg:px-10">
        <SaleAllocationForm ref={formRef} onSubmit={handleSubmit} isSubmitting={isPending} />

        <SeparatorHorizontal className="my-4" />

        <div className="flex items-center justify-end space-x-4">
          <Button
            variant="secondary-border"
            onClick={() => navigate(-1)}
            disabled={isPending}
            className="min-w-[120px]"
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isPending}
            className="min-w-[120px]"
          >
            Lưu cấu hình
          </Button>
        </div>
      </Flex>
    </>
  )
}

export default SaleAllocationCreatePage
