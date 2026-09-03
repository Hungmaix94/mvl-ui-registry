import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import {
  brokerCertificateFilterSchema,
  BROKER_CERT_TYPE_OPTIONS,
  CERT_STATUS_FILTER_OPTIONS,
  DEFAULT_BROKER_CERTIFICATE_FILTER_VALUES,
  type BrokerCertificateFilterValues,
} from '@/features/accounting/broker-certificates/types/broker-certificate-types'

export type BrokerCertificateFilterFormRef = {
  clearForm: () => void
  getValues: () => BrokerCertificateFilterValues
}

const BrokerCertificateFilterForm = forwardRef<
  BrokerCertificateFilterFormRef,
  { initialValues?: Partial<BrokerCertificateFilterValues> }
>(({ initialValues }, ref) => {
  const [, setFormKey] = useState(0)
  const { loadCollaboratorOptions, loadInitialCollaboratorOptions } = useCollaboratorSelect()
  const { register, control, reset, getValues, handleSubmit } =
    useForm<BrokerCertificateFilterValues>({
      resolver: zodResolver(brokerCertificateFilterSchema),
      defaultValues: { ...DEFAULT_BROKER_CERTIFICATE_FILTER_VALUES, ...initialValues },
    })

  useEffect(() => {
    reset({ ...DEFAULT_BROKER_CERTIFICATE_FILTER_VALUES, ...initialValues })
    setFormKey((k) => k + 1)
  }, [initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset(DEFAULT_BROKER_CERTIFICATE_FILTER_VALUES)
        setFormKey((k) => k + 1)
      },
      getValues: () => getValues(),
    }),
    [reset, getValues]
  )

  return (
    <Form loading={false} handleSubmit={handleSubmit} onSubmit={() => {}}>
      <Flex direction="column" gap="5" className="w-full">
        <FormController
          register={register}
          name="status"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Tình trạng',
            placeholder: 'Tất cả',
            clearable: true,
            options: CERT_STATUS_FILTER_OPTIONS,
          }}
        />
        <FormController
          register={register}
          name="cert_type"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Loại chứng chỉ',
            placeholder: 'Tất cả',
            clearable: true,
            options: BROKER_CERT_TYPE_OPTIONS,
          }}
        />
        <Controller
          name="holder_collaborator"
          control={control}
          render={({ field }) => (
            <Select
              label="Cộng tác viên"
              loadOptions={loadCollaboratorOptions}
              loadInitialOptions={loadInitialCollaboratorOptions}
              enableSearch
              clearable
              placeholder="Tất cả"
              value={field.value ? String(field.value) : null}
              onChange={(next) => {
                const raw = Array.isArray(next) ? next[0] : next
                field.onChange(raw ? Number(raw) : null)
              }}
            />
          )}
        />
      </Flex>
    </Form>
  )
})

BrokerCertificateFilterForm.displayName = 'BrokerCertificateFilterForm'
export default BrokerCertificateFilterForm
