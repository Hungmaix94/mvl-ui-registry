import { Button } from '@/components/ui'
import { Select } from '@/components/ui'
import { FormProvider, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useBookingContractLoadOptions } from '../services/useBookingContractLoadOptions'
import { useDialog } from '@/hooks/useDialog'
import { useQueryClient } from '@tanstack/react-query'
import { getRealEstateService } from '@/services/realestate-service'
import { QUERY_KEYS } from '@/constants'

import { useMemo } from 'react'
import type { components } from '@/api/schema'

type Booking = components['schemas']['Booking']

const baseSchema = z.object({
  project_id: z.number({ required_error: 'Vui lòng chọn dự án' }),
  product_inventory_id: z.number({ required_error: 'Vui lòng chọn sản phẩm' }),
})

type FormData = z.infer<typeof baseSchema>

export type BookingTransferDialogProps = {
  contract: Booking
  onTransfer: (data: FormData) => Promise<void> | void
}

export const BookingTransferDialog = ({ contract, onTransfer }: BookingTransferDialogProps) => {
  const { displayClose } = useDialog()
  const queryClient = useQueryClient()

  const schema = useMemo(() => {
    return baseSchema.refine(
      (data) => {
        if (
          contract?.product_inventory_detail?.id &&
          data.product_inventory_id === contract.product_inventory_detail.id
        ) {
          return false
        }
        return true
      },
      {
        message: 'Sản phẩm chuyển sang phải khác sản phẩm hiện tại',
        path: ['product_inventory_id'],
      }
    )
  }, [contract])

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const {
    watch,
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = form
  const watchProjectId = watch('project_id')

  const { loadProjectOptions, loadProductInventoryOptions } = useBookingContractLoadOptions({
    projectId: watchProjectId,
  })

  return (
    <div className="flex flex-col gap-4 p-4">
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onTransfer)} className="space-y-4">
          <Controller
            control={control}
            name="project_id"
            render={({ field, fieldState }) => (
              <Select
                {...field}
                label="Dự án"
                placeholder="Chọn dự án"
                loadOptions={loadProjectOptions}
                enableSearch={true}
                required={true}
                onChange={(val: any) => {
                  field.onChange(val)
                  setValue('product_inventory_id', undefined as any)
                }}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="product_inventory_id"
            render={({ field, fieldState }) => (
              <Select
                {...field}
                label="Mã căn"
                placeholder="Chọn mã căn"
                loadOptions={loadProductInventoryOptions}
                enableSearch={true}
                required={true}
                error={fieldState.error?.message}
                onChangeOption={async (option: any) => {
                  if (option?.value) {
                    try {
                      const detail = await queryClient.fetchQuery({
                        queryKey: QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.DETAIL(
                          Number(option.value)
                        ),
                        queryFn: () =>
                          getRealEstateService().getProductInventory(Number(option.value)),
                        staleTime: 1000 * 60 * 5,
                      })
                      if (detail?.project?.id) {
                        setValue('project_id', detail.project.id, { shouldValidate: true })
                      }
                    } catch (error) {
                      console.error('Failed to fetch product inventory detail', error)
                    }
                  }
                }}
              />
            )}
          />

          <div className="border-border-1 mt-6 flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="secondary-border"
              onClick={() => displayClose()}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Xác nhận
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
