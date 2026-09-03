import { useCallback, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import type { ForwardedRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { Form } from '@/components/ui/form'
import FormController from '@/components/ui/form/FormController.tsx'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import FilterFooter from '@/components/commons/FilterFooter'
import { cleanObject } from '@/utils/common.ts'
import { endOfMonth, startOfMonth } from 'date-fns'
import { formatDateToApi, formatDateToMonth } from '@/utils/date-utils.ts'
import { useForm } from 'react-hook-form'
import type { RecruitmentDashboardFilterFormValues } from '../components/recruitment/RecruitmentDashboardFilterForm.tsx'

type MonthFilterFormValues = {
  month?: Date
}

type MonthFilterFormRef = {
  getValues: () => MonthFilterFormValues
  clearForm: () => void
}

type MonthFilterFormProps = {
  initialValues?: {
    month?: Date
  }
}

function MonthFilterForm(props: MonthFilterFormProps, ref: ForwardedRef<MonthFilterFormRef>) {
  const { initialValues } = props
  const [isLoading] = useState(false)

  const form = useForm<MonthFilterFormValues>({
    defaultValues: {
      month: initialValues?.month,
    },
  })

  // Expose imperative API for parent hook
  useImperativeHandle(
    ref,
    () => ({
      getValues: () => form.getValues(),
      clearForm: () => {
        form.reset({
          month: undefined,
        })
      },
    }),
    [form]
  )

  // We don't rely on form submit here because footer buttons handle apply/clear.
  const onSubmit = () => {}

  return (
    <Form handleSubmit={form.handleSubmit} onSubmit={onSubmit} loading={isLoading}>
      <FormController
        control={form.control}
        name="month"
        register={form.register}
        Field={MonthPicker}
        fieldProps={{
          label: 'Chọn tháng',
          placeholder: 'Chọn tháng',
        }}
      />
    </Form>
  )
}

const ForwardedMonthFilterForm = forwardRef<MonthFilterFormRef, MonthFilterFormProps>(
  MonthFilterForm
)

export const useRecruitmentCostByBranchesFilter = () => {
  const refForm = useRef<MonthFilterFormRef>(null)
  const today = new Date()
  const defaultMonth = startOfMonth(today)

  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(defaultMonth)

  const filterParams: RecruitmentDashboardFilterFormValues | null = useMemo(() => {
    if (selectedMonth) {
      const from = startOfMonth(selectedMonth)
      const to = endOfMonth(selectedMonth)
      return {
        dateRange: {
          from,
          to,
        },
      }
    }

    return null
  }, [selectedMonth])

  const subTitle = useMemo(() => {
    if (selectedMonth) {
      return `Tháng ${formatDateToMonth(selectedMonth)}`
    }
    return ''
  }, [selectedMonth])

  const filterCount = useMemo(() => {
    if (selectedMonth) {
      return 1
    }

    if (filterParams?.dateRange?.from || filterParams?.dateRange?.to) {
      return 1
    }

    return 0
  }, [selectedMonth, filterParams?.dateRange?.from, filterParams?.dateRange?.to])

  const apiParams = useMemo(() => {
    if (!selectedMonth) {
      return {}
    }

    const from = startOfMonth(selectedMonth)
    const to = endOfMonth(selectedMonth)

    return {
      from_date: formatDateToApi(from),
      to_date: formatDateToApi(to),
    }
  }, [selectedMonth])

  const { displayFormContent, displayClose } = useDialog()

  const onClickClearFilter = useCallback(() => {
    refForm.current?.clearForm()
    setSelectedMonth(undefined)
    displayClose()
  }, [displayClose])

  const onClickApply = useCallback(() => {
    const formData = refForm.current?.getValues?.()
    if (!formData) {
      displayClose()
      return
    }

    const filteredParams = cleanObject(formData)

    if (!filteredParams.month) {
      setSelectedMonth(undefined)
      displayClose()
      return
    }

    setSelectedMonth(filteredParams.month)
    displayClose()
  }, [displayClose])

  const openFilterModal = useCallback(() => {
    displayFormContent({
      title: 'Bộ lọc',
      content: (
        <>
          <ForwardedMonthFilterForm
            ref={refForm}
            initialValues={{
              month: selectedMonth,
            }}
          />
        </>
      ),
      footer: (
        <FilterFooter onClear={onClickClearFilter} onApply={onClickApply} onCancel={displayClose} />
      ),
    })
  }, [displayFormContent, selectedMonth, onClickApply, onClickClearFilter, displayClose])

  return {
    openFilterModal,
    filterParams,
    subTitle,
    filterCount,
    apiParams,
    selectedMonth,
  }
}
