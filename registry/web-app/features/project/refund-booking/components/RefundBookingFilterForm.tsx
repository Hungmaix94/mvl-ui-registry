import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { Grid, Flex } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { PAGE_SIZE } from '@/constants/table'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { BookingRefundStatus as BookingRefundStatusFilter } from '@/constants/api-schema-aliases'

/**
 * Tên field PHẢI trùng tên query param của filterset BE
 * (`/api/sales/booking-refunds/` nhận `project`, KHÔNG phải `project_id`) —
 * page ghi thẳng các key này ra URL rồi truyền xuống API.
 */
export type RefundBookingFilterFormData = {
  project?: number
  status?: BookingRefundStatusFilter
}

export type RefundBookingFilterFormRef = {
  clearForm: () => void
  getValues: () => RefundBookingFilterFormData
}

interface RefundBookingFilterProps {
  initialValues?: FieldValues
  isOpen?: boolean
}

/** URL search param luôn là string — Select so khớp option theo number nên phải ép kiểu. */
function toProjectId(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : undefined
}

const RefundBookingFilterForm = forwardRef<RefundBookingFilterFormRef, RefundBookingFilterProps>(
  ({ initialValues, isOpen }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const prevIsOpenRef = useRef(false)

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [APP_CONSTANT_KEY.SALES.BOOKING_REFUND.STATUS_CHOICES],
    })

    const statusOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.SALES.BOOKING_REFUND.STATUS_CHOICES) ?? []

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

    const { register, control, handleSubmit, reset, getValues } =
      useForm<RefundBookingFilterFormData>({
        defaultValues: {
          project: toProjectId(initialValues?.project),
          status: initialValues?.status,
        },
      })

    useEffect(() => {
      const justOpened = isOpen && !prevIsOpenRef.current
      prevIsOpenRef.current = !!isOpen
      if (justOpened && initialValues) {
        reset({
          project: toProjectId(initialValues.project),
          status: initialValues.status,
        })
        setFormKey((k) => k + 1)
      }
    }, [isOpen, initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          setFormKey((k) => k + 1)
          reset({
            project: undefined,
            status: undefined,
          })
        },
        getValues: () => {
          const values = getValues()
          return {
            project: toProjectId(values.project),
            status: values.status || undefined,
          }
        },
      }),
      [reset, getValues]
    )

    const onSubmit = () => {}

    return (
      <Form key={formKey} handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={false}>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="4" width="100%">
            <FormController
              register={register}
              name="project"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Dự án',
                placeholder: 'Chọn dự án',
                loadOptions: loadProjectOptions,
                loadInitialOptions: loadInitialProjectOptions,
                pageSize: PAGE_SIZE,
                enableSearch: true,
                searchPlaceholder: 'Tìm dự án',
              }}
            />
            <FormController
              register={register}
              name="status"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Trạng thái',
                placeholder: 'Chọn trạng thái',
                options: statusOptions,
              }}
            />
          </Grid>
        </Flex>
      </Form>
    )
  }
)

RefundBookingFilterForm.displayName = 'RefundBookingFilterForm'

export default RefundBookingFilterForm
