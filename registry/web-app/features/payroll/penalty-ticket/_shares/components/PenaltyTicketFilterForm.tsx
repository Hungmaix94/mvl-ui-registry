import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex, Grid } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import { Checkbox } from '@/components/ui'
import usePenaltyTicketOptions from '../hooks/usePenaltyTicketOptions'
import { PenaltyTicketStatus } from '@/constants/api-schema-aliases.ts'

export type PenaltyTicketFilterFormRef = {
  clearForm: () => void
  getValues: () => PenaltyTicketFilterForm
}

export type PenaltyTicketFilterForm = {
  month?: Date
  branch_id?: number
  block_id?: number
  department_id?: number
  statuses?: PenaltyTicketStatus[]
}

const schema = z.object({
  month: z.date().nullable().optional(),
  branch_id: z.coerce.number().optional(),
  block_id: z.coerce.number().optional(),
  department_id: z.coerce.number().optional(),
  statuses: z.array(z.nativeEnum(PenaltyTicketStatus)).optional(),
})

export default forwardRef<PenaltyTicketFilterFormRef, { initialValues?: Record<string, any> }>(
  ({ initialValues }, ref) => {
    const { statusOptions } = usePenaltyTicketOptions()
    const { control, handleSubmit, register, reset, getValues, setValue, watch } =
      useForm<PenaltyTicketFilterForm>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
          month: initialValues?.month,
          branch_id: initialValues?.branch_id,
          block_id: initialValues?.block_id,
          department_id: initialValues?.department_id,
          statuses: initialValues?.statuses || [],
        },
      })

    useImperativeHandle(ref, () => ({
      clearForm: () =>
        reset({
          month: undefined,
          branch_id: undefined,
          block_id: undefined,
          department_id: undefined,
          statuses: [],
        }),
      getValues: () => getValues(),
    }))

    const watchedStatuses = watch('statuses') || []

    const handleCascadeChange = (data: CascadeSelectFormData) => {
      setValue('branch_id', data.branch_id || undefined)
      setValue('block_id', data.block_id || undefined)
      setValue('department_id', data.department_id || undefined)
    }

    const toggleStatus = (value: PenaltyTicketStatus, checked: boolean) => {
      const current = watchedStatuses || []
      const next = checked
        ? Array.from(new Set([...current, value]))
        : current.filter((i) => i !== value)
      setValue('statuses', next)
    }

    const onSubmit = () => {}

    return (
      <Form onSubmit={onSubmit} handleSubmit={handleSubmit as any} loading={false}>
        <Flex direction={'column'} gap={'4'}>
          <div className="flex flex-col gap-2 space-y-2">
            <FormController
              register={register}
              name="month"
              control={control}
              Field={MonthPicker}
              fieldProps={{
                label: 'Kỳ tính lương',
                placeholder: 'Chọn kỳ tính lương',
                showYear: true,
                onChange: (date: Date | undefined) => setValue('month', date),
              }}
            />
          </div>

          <CascadeSelectGroupOrganization
            initialValues={
              initialValues
                ? {
                    branch: initialValues?.branch_id?.toString(),
                    block: initialValues?.block_id?.toString(),
                    department: initialValues?.department_id?.toString(),
                  }
                : undefined
            }
            onFormChange={handleCascadeChange}
            skipValidation
            showPosition={false}
            showEmployee={false}
            className="gap-4"
          />

          <Grid columns={'2'} gap="4">
            <div className="space-y-2">
              <label className="typo-body-base-semibold text-content-dark-2">Trạng thái</label>
              <div className="flex flex-wrap gap-5">
                {statusOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 py-1.5">
                    <Checkbox
                      checked={watchedStatuses?.includes(option.value)}
                      onCheckedChange={(checked: any) =>
                        toggleStatus(option.value, Boolean(checked))
                      }
                    />
                    <span className="text-content-dark-1 text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </Grid>
        </Flex>
      </Form>
    )
  }
)
