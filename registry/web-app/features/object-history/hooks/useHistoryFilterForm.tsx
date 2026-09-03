import { Select } from '@/components/ui'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex } from '@radix-ui/themes'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

export type HistoriesFilterFormRef = {
  clearForm: () => void
  getValues?: () => HistoriesFilterForm
}

type HistoriesFilterFormProps = {
  initialValues?: Record<string, any>
}

type TDateRange = {
  from?: Date
  to?: Date
}

type HistoriesFilterForm = {
  employeeCodes: string[]
  dateRange?: TDateRange | null
  action?: string
}

const Schema = z.object({
  employeeCodes: z.array(z.string()).optional(),
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
  action: z.string().optional(),
})

const HistoriesFilterForm = forwardRef<HistoriesFilterFormRef, HistoriesFilterFormProps>(
  ({ initialValues }, ref) => {
    const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
    const [resetCount, setResetCount] = useState(0)
    const { keysMapOptions } = useAppConstant({
      module: 'audit_logging',
      keys: [APP_CONSTANT_KEY.AUDIT_LOG.OBJECT_TYPE, APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION],
    })

    const { actionOptions } = useMemo(
      () => ({
        actionOptions:
          keysMapOptions
            .get(APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION)
            ?.filter((opt) => ['ADD', 'CHANGE', 'DELETE'].includes(opt.value)) || [],
      }),
      [keysMapOptions]
    )

    const { control, handleSubmit, register, reset, getValues } = useForm<HistoriesFilterForm>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        employeeCodes: initialValues?.employeeCodes || [],
        dateRange: initialValues?.dateRange || null,
        action: initialValues?.action || undefined,
      },
    })

    useEffect(() => {
      if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
        reset({
          dateRange: initialValues?.dateRange || null,
          action: initialValues?.action || undefined,
        })
        setShouldResetToInitial(true)
      }
    }, [initialValues, reset, shouldResetToInitial])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          setShouldResetToInitial(false)
          reset(
            {
              employeeCodes: [],
              dateRange: null,
              action: undefined,
            },
            { keepDefaultValues: false }
          )
          setResetCount((c) => c + 1)
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    const onSubmit = () => {
      // handled by parent
    }

    return (
      <Form loading onSubmit={onSubmit} handleSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <div className="flex flex-col gap-2 space-y-2">
            <label className="typo-body-base-semibold text-content-dark-2 mb-0">
              Khoảng thời gian
            </label>
            <FormController
              register={register}
              name="dateRange"
              control={control}
              Field={DateRangePicker}
              fieldProps={{
                className: 'w-full',
              }}
            />
          </div>

          <div className="space-y-2">
            <FormController
              key={`action-${resetCount}`}
              register={register}
              name="action"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Loại hành động',
                placeholder: 'Chọn loại hành động',
                options: actionOptions,
              }}
            />
          </div>
        </Flex>
      </Form>
    )
  }
)

HistoriesFilterForm.displayName = 'HistoriesFilterForm'

export default HistoriesFilterForm
