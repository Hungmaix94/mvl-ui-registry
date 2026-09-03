import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'
import { Checkbox, Select } from '@/components/ui'
import useAppConstant from '@/hooks/useAppConstant'
import { LAD_STATUS_APP_CONSTANT_KEY, LadBatchStatus } from '../constants/lad-constants'

export type LadBatchFilterFormValues = {
  status?: string
  /** created_by = 'me'. */
  mine?: boolean
}

export type LadBatchFilterFormRef = {
  clearForm: () => void
  getValues?: () => LadBatchFilterFormValues
  getRawValues?: () => LadBatchFilterFormValues
}

type LadBatchFilterFormProps = {
  initialValues?: LadBatchFilterFormValues
}

/**
 * Filter form rendered inside `<AppDialog variant="filter">` (project list-page filter pattern).
 * Exposes clearForm/getValues via ref. Only the BE-backed fields are present: Trạng thái (status)
 * + "Của tôi" (created_by=me). Loại lô / khoảng ngày are not BE-filterable (see deviations D15).
 */
const LadBatchFilterForm = forwardRef<LadBatchFilterFormRef, LadBatchFilterFormProps>(
  ({ initialValues }, ref) => {
    const { reset, getValues, watch, setValue } = useForm<LadBatchFilterFormValues>({
      defaultValues: {
        status: initialValues?.status ?? '',
        mine: initialValues?.mine ?? false,
      },
    })

    useEffect(() => {
      reset({ status: initialValues?.status ?? '', mine: initialValues?.mine ?? false })
    }, [initialValues, reset])

    useImperativeHandle(ref, () => ({
      clearForm: () => reset({ status: '', mine: false }),
      getValues: () => getValues(),
      getRawValues: () => getValues(),
    }))

    const { keysMap } = useAppConstant({ module: 'sales', keys: [LAD_STATUS_APP_CONSTANT_KEY] })
    const statusLabels = keysMap.get(LAD_STATUS_APP_CONSTANT_KEY) as
      | Record<string, string>
      | undefined

    const statusOptions = useMemo(
      () => [
        { value: '', label: 'Mọi trạng thái' },
        ...Object.values(LadBatchStatus).map((s) => ({ value: s, label: statusLabels?.[s] ?? s })),
      ],
      [statusLabels]
    )

    const status = watch('status')
    const mine = watch('mine')

    return (
      <Flex direction="column" gap="4">
        <Select
          label="Trạng thái"
          placeholder="Chọn trạng thái"
          options={statusOptions}
          value={status || null}
          onChange={(v) =>
            setValue('status', typeof v === 'string' ? v : v != null ? String(v) : '')
          }
        />
        <Checkbox
          checked={!!mine}
          onCheckedChange={(checked) => setValue('mine', checked === true)}
          label="Chỉ hiển thị lô của tôi"
        />
      </Flex>
    )
  }
)

LadBatchFilterForm.displayName = 'LadBatchFilterForm'

export default LadBatchFilterForm
