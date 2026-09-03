import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Select } from '@/components/ui'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { Flex } from '@radix-ui/themes'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'

export type CommEmployeeFilterFormData = {
  status?: string | null
  role?: string | null
  beneficiary_employee?: string | null
}

export type CommEmployeeFilterRef = {
  getValues: () => CommEmployeeFilterFormData
  clearForm: () => void
}

export const CommEmployeeFilter = forwardRef<
  CommEmployeeFilterRef,
  { initialValues?: CommEmployeeFilterFormData; isOpen: boolean }
>(({ initialValues, isOpen }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const form = useForm<CommEmployeeFilterFormData>({ defaultValues: initialValues ?? {} })
  const { control, register, reset, getValues, handleSubmit } = form

  const statusOptions = [
    { label: 'Bản nháp', value: 'DRAFT' },
    { label: 'Đã xác nhận', value: 'CONFIRMED' },
    { label: 'Đã thanh toán', value: 'PAID' },
  ]

  const roleOptions = [
    { label: 'Bán hàng', value: 'SALE' },
    { label: 'F2', value: 'F2' },
    { label: 'Quản lý', value: 'MGMT' },
    { label: 'Chức vụ', value: 'PROMO' },
    { label: 'Nhân viên văn phòng', value: 'BACKOFFICE' },
    { label: 'Phòng giao dịch liên kết', value: 'SLK' },
  ]

  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'id',
  })

  useEffect(() => {
    if (isOpen && initialValues) {
      reset(initialValues)
      setFormKey((k) => k + 1)
    }
  }, [isOpen, initialValues, reset])

  useImperativeHandle(ref, () => ({
    getValues: () => getValues(),
    clearForm: () => {
      reset({ status: null, role: null, beneficiary_employee: null })
      setFormKey((k) => k + 1)
    },
  }))

  return (
    <Form loading={false} onSubmit={() => {}} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="4">
        <FormController
          key={`status-${formKey}`}
          register={register}
          control={control}
          name="status"
          Field={Select}
          fieldProps={{
            label: 'Trạng thái',
            options: statusOptions,
            placeholder: 'Chọn trạng thái',
            isClearable: true,
          }}
        />
        <FormController
          key={`role-${formKey}`}
          register={register}
          control={control}
          name="role"
          Field={Select}
          fieldProps={{
            label: 'Vai trò',
            options: roleOptions,
            placeholder: 'Chọn vai trò',
            isClearable: true,
          }}
        />
        <FormController
          key={`beneficiary_employee-${formKey}`}
          register={register}
          control={control}
          name="beneficiary_employee"
          Field={Select}
          fieldProps={{
            label: 'Nhân viên thụ hưởng',
            placeholder: 'Chọn nhân viên',
            loadOptions: loadEmployeeOptions,
            loadInitialOptions: loadInitialEmployeeOptions,
            enableSearch: true,
            isClearable: true,
          }}
        />
      </Flex>
    </Form>
  )
})
CommEmployeeFilter.displayName = 'CommEmployeeFilter'
