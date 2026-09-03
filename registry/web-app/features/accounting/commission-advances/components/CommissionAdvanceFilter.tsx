import { forwardRef, useImperativeHandle, useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { useDealSelect } from '@/hooks/useDealSelect'
import type { CommissionAdvanceFilterFormData } from '@/features/accounting/commission-advances/services/commission-advance-service'

export type { CommissionAdvanceFilterFormData }

export type CommissionAdvanceFilterRef = {
  getValues: () => CommissionAdvanceFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: CommissionAdvanceFilterFormData
  isOpen?: boolean
}

const EMPTY_FILTER: CommissionAdvanceFilterFormData = {
  requester_employee: null,
  recipient_employee: [],
  status: null,
  deal: null,
}

export const CommissionAdvanceFilter = forwardRef<CommissionAdvanceFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    // Bump on open + on clear so each async <Controller> remounts and re-reads the reset
    // defaults — otherwise "Clear → Apply" silently re-sends the mount-time (stale) value.
    const [formKey, setFormKey] = useState(0)
    const form = useForm<CommissionAdvanceFilterFormData>({ defaultValues: initialValues ?? {} })
    const { control, register } = form

    const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
      valueType: 'id',
    })
    const { loadDealOptions, loadInitialDealOptions } = useDealSelect()

    useEffect(() => {
      if (isOpen && initialValues) {
        form.reset(initialValues)
        setFormKey((k) => k + 1)
      }
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () => {
        form.reset(EMPTY_FILTER)
        setFormKey((k) => k + 1)
      },
    }))

    return (
      <FormProvider {...form}>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <FormController
            key={`requester_employee-${formKey}`}
            register={register}
            control={control}
            name="requester_employee"
            Field={Select}
            fieldProps={{
              label: 'Nhân viên yêu cầu',
              placeholder: 'Chọn nhân viên yêu cầu',
              loadOptions: loadEmployeeOptions,
              loadInitialOptions: loadInitialEmployeeOptions,
              enableSearch: true,
              isClearable: true,
            }}
          />

          <FormController
            key={`recipient_employee-${formKey}`}
            register={register}
            control={control}
            name="recipient_employee"
            Field={Select}
            fieldProps={{
              label: 'Nhân viên thụ hưởng',
              placeholder: 'Chọn nhân viên thụ hưởng',
              multiple: true,
              loadOptions: loadEmployeeOptions,
              loadInitialOptions: loadInitialEmployeeOptions,
              enableSearch: true,
              isClearable: true,
            }}
          />

          <FormController
            key={`deal-${formKey}`}
            register={register}
            control={control}
            name="deal"
            Field={Select}
            fieldProps={{
              label: 'Giao dịch (Deal)',
              placeholder: 'Chọn giao dịch',
              loadOptions: loadDealOptions,
              loadInitialOptions: loadInitialDealOptions,
              enableSearch: true,
              isClearable: true,
            }}
          />

          <FormController
            key={`status-${formKey}`}
            register={register}
            control={control}
            name="status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Chọn trạng thái',
              isClearable: true,
              options: [
                { value: 'DRAFT', label: 'Chờ duyệt' },
                { value: 'PENDING_CONFIRMATION', label: 'Chờ người nhận xác nhận' },
                { value: 'PENDING_MANAGER', label: 'Chờ trưởng phòng duyệt' },
                { value: 'PENDING_ADMIN', label: 'Chờ TKKD duyệt' },
                { value: 'PENDING_ADMIN_LEAD', label: 'Chờ TP TKKD duyệt' },
                { value: 'PENDING_ACCOUNTANT', label: 'Chờ kế toán duyệt' },
                { value: 'APPROVED', label: 'Đã duyệt' },
                { value: 'PARTIAL', label: 'Đã chi một phần' },
                { value: 'PAID', label: 'Đã chi' },
                { value: 'RECOVERED', label: 'Đã thu hồi' },
                { value: 'REJECTED', label: 'Bị trả về' },
                { value: 'CANCELLED', label: 'Đã hủy' },
              ],
            }}
          />
        </div>
      </FormProvider>
    )
  }
)

CommissionAdvanceFilter.displayName = 'CommissionAdvanceFilter'

export default CommissionAdvanceFilter
