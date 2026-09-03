import { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Flex, Grid } from '@radix-ui/themes'

import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useBookingContractLoadOptions } from '@/features/project/booking-contract/services/useBookingContractLoadOptions'
import useAppConstant from '@/hooks/useAppConstant'

export type ProductInventoryFilterFormData = {
  search?: string
  status?: string
  project_id?: number
  sales_allocation_id?: number
}

interface ProductInventoryFilterProps {
  initialValues?: ProductInventoryFilterFormData
  isOpen?: boolean
}

export interface ProductInventoryFilterRef {
  getValues: () => ProductInventoryFilterFormData
  clearForm: () => void
}

const ProductInventoryFilter = forwardRef<ProductInventoryFilterRef, ProductInventoryFilterProps>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<ProductInventoryFilterFormData>({
      defaultValues: initialValues || {},
    })
    const { control, getValues, reset, register } = form

    useEffect(() => {
      if (isOpen) {
        reset(initialValues || {})
      }
    }, [isOpen, initialValues, reset])

    const { keysMapOptions } = useAppConstant({
      module: 'realestate',
      keys: [APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES],
    })
    const statusOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES) || []

    const watchedProjectId = form.watch('project_id')

    const {
      loadProjectOptions,
      loadInitialProjectOptions,
      loadSalesAllocationOptions,
      loadInitialSalesAllocationOptions,
    } = useBookingContractLoadOptions({
      projectId: watchedProjectId,
    })

    const clearForm = useCallback(() => {
      reset({
        search: '',
        status: undefined,
        project_id: undefined,
        sales_allocation_id: undefined,
      })
    }, [reset])

    useImperativeHandle(ref, () => ({
      getValues,
      clearForm,
    }))

    return (
      <FormProvider {...form}>
        <Flex direction="column" gap="4" className="w-full">
          <Grid columns="2" gap="4">
            <FormController<ProductInventoryFilterFormData, any>
              register={register}
              control={control}
              name="status"
              Field={Select}
              fieldProps={{
                label: 'Trạng thái',
                placeholder: 'Tất cả',
                options: statusOptions,
                clearable: true,
              }}
            />

            <FormController<ProductInventoryFilterFormData, any>
              register={register}
              control={control}
              name="project_id"
              Field={Select}
              fieldProps={{
                label: 'Dự án',
                placeholder: 'Chọn dự án',
                loadOptions: loadProjectOptions,
                loadInitialOptions: loadInitialProjectOptions,
                enableSearch: true,
                clearable: true,
              }}
            />

            <FormController<ProductInventoryFilterFormData, any>
              register={register}
              control={control}
              name="sales_allocation_id"
              Field={Select}
              fieldProps={{
                label: 'Thông tin bán hàng',
                placeholder: 'Chọn thông tin bán hàng',
                loadOptions: loadSalesAllocationOptions,
                loadInitialOptions: loadInitialSalesAllocationOptions,
                enableSearch: true,
                clearable: true,
              }}
            />
          </Grid>
        </Flex>
      </FormProvider>
    )
  }
)

ProductInventoryFilter.displayName = 'ProductInventoryFilter'

export default ProductInventoryFilter
