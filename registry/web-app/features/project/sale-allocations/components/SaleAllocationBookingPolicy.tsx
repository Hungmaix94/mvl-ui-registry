import { useState } from 'react'
import { Card, Flex } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { IconPencil, IconCheck, IconX } from '@/assets/icons'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import { FormProvider, useForm } from 'react-hook-form'
import {
  useSalesAllocation,
  useUpdateSalesAllocation,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import { useQueryClient } from '@tanstack/react-query'
import toastService from '@/services/toast-service'
import { useAbility } from '@/lib/ability'
export const SaleAllocationBookingPolicy = ({
  saleAllocationId,
  isReadOnly = false,
}: {
  saleAllocationId: number
  isReadOnly?: boolean
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const ability = useAbility()
  const queryClient = useQueryClient()

  const { data: sa, isLoading } = useSalesAllocation(String(saleAllocationId))
  const { mutateAsync: updateSaleAllocation, isPending: isUpdating } = useUpdateSalesAllocation()

  const form = useForm({
    defaultValues: {
      min_booking_amount: sa?.min_booking_amount ?? null,
      min_deposit_amount: sa?.min_deposit_amount ?? null,
    },
    values: {
      min_booking_amount: sa?.min_booking_amount ?? null,
      min_deposit_amount: sa?.min_deposit_amount ?? null,
    },
  })

  const handleSave = async (values: any) => {
    try {
      await updateSaleAllocation({ id: String(saleAllocationId), data: values })
      queryClient.invalidateQueries({ queryKey: ['sales-allocations'] })
      setIsEditing(false)
      toastService.success('Cập nhật quy định ký quỹ thành công')
    } catch {
      toastService.error('Có lỗi xảy ra khi cập nhật. Vui lòng thử lại.')
    }
  }

  if (isLoading) return <div>Đang tải...</div>

  return (
    <Card className="border-border-1 mb-6 rounded-[4px] border shadow-none">
      <Flex justify="between" align="center" className="border-border-1 border-b bg-[#F0F2F5] p-4">
        <h3 className="text-content-dark-1 text-base font-semibold">Quy định Ký quỹ / Booking</h3>
        {!isReadOnly && ability.can('update', 'project') && (
          <Flex gap="3">
            {isEditing ? (
              <>
                <Button
                  variant="secondary-border"
                  onClick={() => setIsEditing(false)}
                  disabled={isUpdating}
                  className="text-content-dark-3 hover:text-content-dark-1"
                  leftIcon={<IconX />}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={form.handleSubmit(handleSave)}
                  disabled={isUpdating}
                  leftIcon={<IconCheck />}
                >
                  Lưu
                </Button>
              </>
            ) : (
              <Button
                variant="secondary-border"
                onClick={() => setIsEditing(true)}
                leftIcon={<IconPencil />}
              >
                Chỉnh sửa
              </Button>
            )}
          </Flex>
        )}
      </Flex>

      <div className="p-6">
        {isEditing ? (
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(handleSave)}
              className="grid w-full grid-cols-1 gap-6 md:grid-cols-2"
            >
              {/* Placeholders for future fields */}
              <div className="flex flex-col gap-2">
                <span className="typo-body-small-medium text-content-dark-3">
                  Timeout tối đa thanh toán
                </span>
                <div className="typo-body-base-regular cursor-not-allowed rounded border border-gray-200 bg-gray-50 px-3 py-2 text-gray-400">
                  Chưa hỗ trợ config hệ thống
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="typo-body-small-medium text-content-dark-3">
                  Quy định phạt / Refund rủi ro
                </span>
                <div className="typo-body-base-regular cursor-not-allowed rounded border border-gray-200 bg-gray-50 px-3 py-2 text-gray-400">
                  Chưa hỗ trợ config hệ thống
                </div>
              </div>
            </form>
          </FormProvider>
        ) : (
          <div className="bg-surface-primary-default flex flex-col">
            <div className="border-border-1 grid grid-cols-1 gap-x-12 md:grid-cols-2 lg:grid-cols-2">
              <div className="divide-border-1 border-border-1 flex flex-col divide-y border-r pr-6">
                <DisplayFieldRow
                  label="Timeout tối đa thanh toán"
                  value={<span className="text-gray-400">(Trống)</span>}
                />
              </div>
              <div className="divide-border-1 flex flex-col divide-y pl-6">
                <DisplayFieldRow
                  label="Quy định phạt / Refund rủi ro"
                  value={<span className="text-gray-400">(Trống)</span>}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
