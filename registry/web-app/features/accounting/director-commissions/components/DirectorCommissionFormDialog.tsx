import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex } from '@radix-ui/themes'

import { Button, Select, TextField } from '@/components/ui'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { useAbility } from '@/lib/ability'
import { useAccountingPeriodSelect } from '@/hooks/useAccountingPeriodSelect'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { handleApiError } from '@/utils/error-utils'
import { directorCommissionCreateSchema } from '@/features/accounting/director-commissions/types/director-commission-types'
import { DIRECTOR_COMMISSION_DEP } from '@/features/accounting/director-commissions/constants/director-commission-constants'

/**
 * Create-only form: pick a project + accounting period, optionally override the payout rate.
 * The BE snapshots the director rate from the project's staff-commission config on create.
 */
const directorCommissionFormSchema = directorCommissionCreateSchema.extend({
  pct_payout: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((val) => {
      if (val === '' || val == null) return null
      const n = Number(String(val).replace(/,/g, ''))
      return Number.isNaN(n) ? null : String(n)
    }),
})

export type DirectorCommissionFormValues = z.infer<typeof directorCommissionFormSchema>

type DirectorCommissionFormDialogProps = {
  defaultValues?: Partial<{ project: number; accounting_period: number; pct_payout: string }>
  onSubmit: (values: DirectorCommissionFormValues) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export default function DirectorCommissionFormDialog({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: DirectorCommissionFormDialogProps) {
  const ability = useAbility()
  const canSelectPeriod = ability.can(
    DIRECTOR_COMMISSION_DEP.ACCOUNTING_PERIOD.action,
    DIRECTOR_COMMISSION_DEP.ACCOUNTING_PERIOD.subject
  )
  const canSelectProject = ability.can(
    DIRECTOR_COMMISSION_DEP.PROJECT.action,
    DIRECTOR_COMMISSION_DEP.PROJECT.subject
  )

  const { loadAccountingPeriodOptions, loadInitialAccountingPeriodOptions } =
    useAccountingPeriodSelect()
  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

  const { register, control, handleSubmit, setError } = useForm<DirectorCommissionFormValues>({
    resolver: zodResolver(directorCommissionFormSchema) as never,
    mode: 'onTouched',
    defaultValues: { ...defaultValues },
  })

  const handleFormSubmit = useCallback(
    async (values: DirectorCommissionFormValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

  return (
    <Form handleSubmit={handleSubmit as never} onSubmit={handleFormSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="5" className="w-full px-1 py-2">
        <p className="typo-body-sm-regular text-content-dark-3">
          Chọn dự án và kỳ kế toán. Hệ thống sẽ chốt mức hoa hồng Giám đốc dự án theo định mức cấu
          hình của dự án. Có thể để trống mức % để dùng đúng định mức.
        </p>

        <FormController
          register={register}
          name="project"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Dự án',
            placeholder: 'Chọn dự án',
            required: true,
            loadOptions: loadProjectOptions,
            loadInitialOptions: loadInitialProjectOptions,
            enableSearch: true,
            searchPlaceholder: 'Tìm kiếm dự án...',
            isClearable: true,
            disabled: !canSelectProject,
          }}
        />

        <FormController
          register={register}
          name="accounting_period"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Kỳ kế toán',
            placeholder: 'Chọn kỳ kế toán',
            required: true,
            loadOptions: loadAccountingPeriodOptions,
            loadInitialOptions: loadInitialAccountingPeriodOptions,
            isClearable: true,
            disabled: !canSelectPeriod,
          }}
        />

        <FormController
          register={register}
          name="pct_payout"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Mức % chi (tuỳ chọn)',
            placeholder: 'Để trống để dùng định mức',
            type: 'text',
            inputMode: 'decimal',
          }}
        />

        <Flex justify="end" gap="3" className="pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Lưu (Nháp)
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}
