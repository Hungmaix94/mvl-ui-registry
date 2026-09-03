import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'

import type { paths } from '@/api/schema'
import { FormController, Select } from '@/components/ui'
import { useSalesAllocationOptions } from '@/features/project/sale-allocations/hooks/useSalesAllocationOptions'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'

export type SaleAllocationFilterFormData = NonNullable<
  paths['/api/realestate/sales-allocations/']['get']['parameters']['query']
>

export type SaleAllocationFilterRef = {
  submitForm: () => void
  getValues: () => SaleAllocationFilterFormData
  clearForm: () => void
}

type SaleAllocationFilterProps = {
  initialValues?: SaleAllocationFilterFormData
  isOpen?: boolean
}

const SaleAllocationFilter = forwardRef<SaleAllocationFilterRef, SaleAllocationFilterProps>(
  ({ initialValues, isOpen }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const { sourceTypeOptions, phaseOptions } = useSalesAllocationOptions()

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
    const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect({
      valueType: 'id',
    })
    const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
      valueType: 'id',
    })

    const methods = useForm<SaleAllocationFilterFormData>({
      defaultValues: initialValues || {},
    })

    // Reset form with initialValues when dialog opens
    useEffect(() => {
      if (isOpen) {
        methods.reset(initialValues || {})
        setFormKey((prev) => prev + 1)
      }
    }, [isOpen, initialValues, methods])

    // Expose API to parent via ref
    useImperativeHandle(ref, () => ({
      submitForm: () => methods.handleSubmit(() => {})(),
      getValues: () => methods.getValues(),
      clearForm: () => {
        methods.reset({})
        setFormKey((prev) => prev + 1)
      },
    }))

    return (
      <FormProvider {...methods}>
        <form key={formKey} onSubmit={methods.handleSubmit(() => {})} className="relative w-full">
          <Grid columns="2" gap="4" width="100%">
            {/* Search text field has been moved to SaleAllocationsPage.tsx List View */}

            <div className="col-span-2">
              <FormController
                name="project"
                control={methods.control}
                register={methods.register}
                Field={Select}
                fieldProps={{
                  label: 'Dự án',
                  loadOptions: loadProjectOptions,
                  loadInitialOptions: loadInitialProjectOptions,
                  placeholder: 'Chọn dự án',
                  isClearable: true,
                  isAsync: true,
                  defaultOptions: true,
                }}
              />
            </div>

            <FormController
              name="source_type"
              control={methods.control}
              register={methods.register}
              Field={Select}
              fieldProps={{
                label: 'Nguồn',
                options: [{ label: 'Tất cả', value: '' }, ...sourceTypeOptions],
                placeholder: 'Chọn nguồn gốc',
                isClearable: true,
              }}
            />

            <FormController
              name="source_exchange"
              control={methods.control}
              register={methods.register}
              Field={Select}
              fieldProps={{
                label: 'Nguồn hàng',
                loadOptions: loadExchangeOptions,
                loadInitialOptions: loadInitialExchangeOptions,
                placeholder: 'Chọn nguồn hàng',
                isClearable: true,
                isAsync: true,
                defaultOptions: true,
              }}
            />

            <FormController
              name="phase"
              control={methods.control}
              register={methods.register}
              Field={Select}
              fieldProps={{
                label: 'Giai đoạn',
                options: [{ label: 'Tất cả', value: '' }, ...phaseOptions],
                placeholder: 'Chọn giai đoạn bán',
                isClearable: true,
              }}
            />

            <FormController
              name="project_secretary"
              control={methods.control}
              register={methods.register}
              Field={Select}
              fieldProps={{
                label: 'Thư ký dự án',
                placeholder: 'Chọn thư ký dự án',
                loadOptions: loadEmployeeOptions,
                loadInitialOptions: loadInitialEmployeeOptions,
                enableSearch: true,
                isClearable: true,
              }}
            />

            <FormController
              name="project_director"
              control={methods.control}
              register={methods.register}
              Field={Select}
              fieldProps={{
                label: 'Giám đốc dự án',
                placeholder: 'Chọn giám đốc dự án',
                loadOptions: loadEmployeeOptions,
                loadInitialOptions: loadInitialEmployeeOptions,
                enableSearch: true,
                isClearable: true,
              }}
            />
          </Grid>

          <button
            type="submit"
            className="invisible absolute h-0 w-0 overflow-hidden opacity-0"
            tabIndex={-1}
          />
        </form>
      </FormProvider>
    )
  }
)

SaleAllocationFilter.displayName = 'SaleAllocationFilter'

export default SaleAllocationFilter
