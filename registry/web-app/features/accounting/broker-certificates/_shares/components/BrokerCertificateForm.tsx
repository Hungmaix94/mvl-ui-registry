import { useCallback, useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { Button, FullScreenLoading, Select, Switch, TextArea, TextField } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { parseDateFromApi } from '@/utils/date-utils.ts'
import { APP_PATH } from '@/routes'
import {
  useBrokerCertificate,
  useCreateBrokerCertificate,
  usePartialUpdateBrokerCertificate,
} from '@/features/accounting/broker-certificates/services/broker-certificate-service'
import {
  brokerCertificateFormSchema,
  BROKER_CERT_TYPE_OPTIONS,
  buildPayload,
  DEFAULT_BROKER_CERTIFICATE_FORM_VALUES,
  type BrokerCertificateFormValues,
} from '@/features/accounting/broker-certificates/types/broker-certificate-types'
import { withRememberedSearch } from '@/utils/list-url-memory'

type Props = { certificateId?: number; onSuccess?: () => void; onCancel?: () => void }

export default function BrokerCertificateForm({ certificateId, onSuccess, onCancel }: Props) {
  const navigate = useNavigate()
  const isEditMode = !!certificateId
  const isInitialized = useRef(false)

  const { data: certificate, isLoading } = useBrokerCertificate(certificateId ?? 0, {
    enabled: isEditMode,
  })
  const createMutation = useCreateBrokerCertificate()
  const updateMutation = usePartialUpdateBrokerCertificate()
  const invalidateQueries = useInvalidateQueries()
  const { loadCollaboratorOptions, loadInitialCollaboratorOptions } = useCollaboratorSelect()

  // Certificate scan is attached via the presign/confirm token flow (files: { attachment: token }),
  // mirroring the HRM employee-certificate form. Empty string = no new file picked.
  const [fileToken, setFileToken] = useState<string>('')
  const handleFileChange = useCallback((token: string) => setFileToken(token), [])

  const form = useForm<BrokerCertificateFormValues>({
    resolver: zodResolver(brokerCertificateFormSchema) as never,
    mode: 'onTouched',
    defaultValues: DEFAULT_BROKER_CERTIFICATE_FORM_VALUES,
  })
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError,
    formState: { isSubmitting },
  } = form

  const isPending = watch('is_pending')

  useEffect(() => {
    if (isEditMode && certificate && !isInitialized.current) {
      reset({
        ...DEFAULT_BROKER_CERTIFICATE_FORM_VALUES,
        holder_collaborator: certificate.holder_collaborator ?? null,
        is_pending: certificate.status === 'PENDING_ISSUANCE',
        cert_type: certificate.cert_type ?? undefined,
        certificate_number: certificate.certificate_number || '',
        issuer: certificate.issuer || '',
        issued_date: parseDateFromApi(certificate.issued_date) ?? null,
        effective_date: parseDateFromApi(certificate.effective_date) ?? null,
        expiry_date: parseDateFromApi(certificate.expiry_date) ?? null,
        expected_issue_date: parseDateFromApi(certificate.expected_issue_date) ?? null,
        notes: certificate.notes || '',
      })
      isInitialized.current = true
    }
  }, [isEditMode, certificate, reset])

  const onSubmit = useCallback(
    async (values: BrokerCertificateFormValues) => {
      try {
        const payload = buildPayload(values, fileToken)
        if (isEditMode && certificateId) {
          await updateMutation.mutateAsync({ id: certificateId, data: payload })
          toastService.success('Cập nhật chứng chỉ thành công')
        } else {
          await createMutation.mutateAsync(payload)
          toastService.success('Tạo chứng chỉ thành công')
        }
        await invalidateQueries.invalidateByPrefix('accounting/broker-certificates')
        if (onSuccess) onSuccess()
        else navigate(APP_PATH.BROKER_CERTIFICATE_MANAGEMENT)
      } catch (error: unknown) {
        handleApiError(error, setError as never)
      }
    },
    [
      isEditMode,
      certificateId,
      fileToken,
      updateMutation,
      createMutation,
      invalidateQueries,
      onSuccess,
      navigate,
      setError,
    ]
  )
  const handleCancel = useCallback(() => {
    if (onCancel) onCancel()
    else navigate(withRememberedSearch(APP_PATH.BROKER_CERTIFICATE_MANAGEMENT))
  }, [onCancel, navigate])

  if (isEditMode && isLoading)
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  if (isEditMode && !certificate)
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="typo-body-base-regular text-content-dark-3">Không tìm thấy chứng chỉ</p>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Quay lại
        </Button>
      </div>
    )

  return (
    <Form handleSubmit={handleSubmit as never} onSubmit={onSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="7" className="w-full">
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Cộng tác viên</h2>
          <Controller
            name="holder_collaborator"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <Select
                label="Cộng tác viên"
                required
                loadOptions={loadCollaboratorOptions}
                loadInitialOptions={loadInitialCollaboratorOptions}
                enableSearch
                clearable
                placeholder="Chọn cộng tác viên"
                value={field.value ? String(field.value) : null}
                onChange={(next) => {
                  const raw = Array.isArray(next) ? next[0] : next
                  field.onChange(raw ? Number(raw) : null)
                }}
                disabled={isEditMode}
                error={error?.message}
              />
            )}
          />
          <Controller
            name="is_pending"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <Switch checked={!!field.value} onChange={field.onChange} disabled={isEditMode} />
                <span className="typo-body-base-medium text-content-dark-1">
                  Phiếu chờ cấp (đã thi đỗ, chưa có chứng chỉ)
                </span>
              </div>
            )}
          />
        </div>

        <SeparatorHorizontal />

        {!isPending ? (
          <div className="flex flex-col gap-5">
            <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin chứng chỉ</h2>
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="cert_type"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Loại chứng chỉ',
                  required: true,
                  placeholder: 'Chọn loại',
                  options: BROKER_CERT_TYPE_OPTIONS,
                }}
              />
              <FormController
                register={register}
                name="certificate_number"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Mã số chứng chỉ',
                  placeholder: 'VD: BĐS-2026-009001',
                  maxLength: 64,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="issued_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày cấp',
                  placeholder: 'Chọn ngày cấp',
                  allowManualInput: true,
                }}
              />
              <FormController
                register={register}
                name="effective_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Bắt đầu hiệu lực',
                  placeholder: 'Chọn ngày (nếu có)',
                  allowManualInput: true,
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="expiry_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày hết hạn',
                  placeholder: 'Bỏ trống để tự tính +5 năm',
                  allowManualInput: true,
                  caption: 'Chứng chỉ hành nghề: bỏ trống thì tự tính ngày cấp + 5 năm',
                }}
              />
              <FormController
                register={register}
                name="issuer"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Đơn vị cấp',
                  placeholder: 'VD: Sở Xây dựng TP.HCM',
                  maxLength: 255,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin chờ cấp</h2>
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="expected_issue_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày dự kiến cấp',
                  placeholder: 'Chọn ngày (nếu có)',
                  allowManualInput: true,
                }}
              />
            </div>
          </div>
        )}

        {!isPending && (
          <>
            <SeparatorHorizontal />
            <div className="flex flex-col gap-5">
              <h2 className="typo-body-xl-semibold text-content-dark-1">Tài liệu đính kèm</h2>
              <FileUpload
                onChange={handleFileChange}
                className="w-full"
                purpose="broker_certificate"
                accept={['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
                existingFile={
                  isEditMode && certificate ? (certificate.attachment as never) : undefined
                }
                required={false}
                hiddenDescription
              />
            </div>
          </>
        )}

        <FormController
          register={register}
          name="notes"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Ghi chú',
            placeholder: 'Mô tả thêm...',
            rows: 4,
            maxCharacters: 2000,
            className: 'w-full',
          }}
        />

        <div className="border-border-1 flex justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            {isEditMode ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </Flex>
    </Form>
  )
}
