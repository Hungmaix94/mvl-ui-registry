import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import type { DateRange } from 'react-day-picker'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'

export type JobTransferReportFilterFormValues = {
  fromDate?: Date
  toDate?: Date
  old_branch?: number
  old_block?: number
  old_department?: number
  new_branch?: number
  new_block?: number
  new_department?: number
}

export type JobTransferReportFilterFormRef = {
  getValues: () => JobTransferReportFilterFormValues
  clearForm: () => void
}

type JobTransferReportFilterFormProps = {
  initialValues: JobTransferReportFilterFormValues
}

const toId = (value?: number) => (value && value !== 0 ? value : undefined)
const toStr = (value?: number) => (value ? String(value) : undefined)

const JobTransferReportFilterForm = forwardRef<
  JobTransferReportFilterFormRef,
  JobTransferReportFilterFormProps
>(({ initialValues }, ref) => {
  const [values, setValues] = useState<JobTransferReportFilterFormValues>(initialValues)
  const [cascadeKey, setCascadeKey] = useState(0)

  useEffect(() => {
    setValues(initialValues)
    setCascadeKey((prev) => prev + 1)
  }, [initialValues])

  useImperativeHandle(
    ref,
    () => ({
      getValues: () => values,
      clearForm: () => {
        setValues({})
        setCascadeKey((prev) => prev + 1)
      },
    }),
    [values]
  )

  const handleOldChange = useCallback((data: any) => {
    setValues((prev) => ({
      ...prev,
      old_branch: toId(data.branch_id),
      old_block: toId(data.block_id),
      old_department: toId(data.department_id),
    }))
  }, [])

  const handleNewChange = useCallback((data: any) => {
    setValues((prev) => ({
      ...prev,
      new_branch: toId(data.branch_id),
      new_block: toId(data.block_id),
      new_department: toId(data.department_id),
    }))
  }, [])

  return (
    <Flex direction="column" gap="5" className="p-1">
      <DateRangePicker
        label="Thời gian điều chuyển"
        showQuickSelect
        className="w-full"
        value={{ from: values.fromDate, to: values.toDate } as DateRange}
        onChange={(range: DateRange | null | undefined) => {
          setValues((prev) => ({ ...prev, fromDate: range?.from, toDate: range?.to }))
        }}
      />

      <Flex direction="column" gap="3">
        <Text className="typo-body-base-semibold text-content-dark-2">Đơn vị cũ</Text>
        <CascadeSelectGroupOrganization
          key={`old-${cascadeKey}`}
          initialValues={{
            branch: toStr(initialValues.old_branch),
            block: toStr(initialValues.old_block),
            department: toStr(initialValues.old_department),
          }}
          onFormChange={handleOldChange}
          showEmployee={false}
          showPosition={false}
          skipValidation
          className="gap-5"
        />
      </Flex>

      <Flex direction="column" gap="3">
        <Text className="typo-body-base-semibold text-content-dark-2">Đơn vị mới</Text>
        <CascadeSelectGroupOrganization
          key={`new-${cascadeKey}`}
          initialValues={{
            branch: toStr(initialValues.new_branch),
            block: toStr(initialValues.new_block),
            department: toStr(initialValues.new_department),
          }}
          onFormChange={handleNewChange}
          showEmployee={false}
          showPosition={false}
          skipValidation
          className="gap-5"
        />
      </Flex>
    </Flex>
  )
})

JobTransferReportFilterForm.displayName = 'JobTransferReportFilterForm'

export default JobTransferReportFilterForm
