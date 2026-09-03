import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { format, parse, isValid } from 'date-fns'
import { Flex } from '@radix-ui/themes'
import { Button, Grid, RadioGroup, Select, TextArea, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { FileUpload } from '@/components/ui/file-upload/FileUpload.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import {
  type EmployeeCertificateRequest,
  useCreateEmployeeCertificate,
  useUpdateEmployeeCertificate,
  useEmployeeCertificate,
} from '@/features/employee/services/employee-certificate-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { APP_PATH } from '@/routes'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import {
  type CreateEmployeeCertificateFormData,
  createEmployeeCertificateSchema,
} from '@/features/employee/certificate/_shares/schemas/createEmployeeCertificateSchema.ts'
import { FullScreenLoading } from '@/components/ui'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { EmployeeCertificateType } from '@/constants/api-schema-aliases'

interface EmployeeCertificateFormProps {
  certificateId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export default function EmployeeCertificateForm({
  certificateId,
  onSuccess,
  onCancel,
}: EmployeeCertificateFormProps) {
  const navigate = useNavigate()
  const isEditMode = !!certificateId
  const createCertificateMutation = useCreateEmployeeCertificate()
  const updateCertificateMutation = useUpdateEmployeeCertificate()
  const invalidateQueries = useInvalidateQueries()
  const isInitialized = useRef(false)

  // Fetch certificate data for edit mode
  const { data: certificate, isLoading: isLoadingCertificate } = useEmployeeCertificate(
    certificateId || 0
  )

  const form = useForm<CreateEmployeeCertificateFormData>({
    resolver: zodResolver(createEmployeeCertificateSchema) as any,
    mode: 'onTouched',
    defaultValues: {
      employee: undefined,
      issuance_status: 'issued',
      certificate_type: undefined,
      certificate_code: '',
      certificate_name: '',
      actual_sequence_number: undefined,
      issuing_organization: '',
      training_specialization: '',
      graduation_diploma: '',
      issue_date: undefined,
      expected_issue_date: null,
      effective_date: null,
      expiry_date: null,
      notes: '',
      files: undefined,
    },
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { isSubmitting },
  } = form

  // Watch certificate_type to conditionally make expiry_date required
  const certificateType = watch('certificate_type')
  const isRealEstatePracticeLicense =
    certificateType === EmployeeCertificateType.real_estate_practice_license

  // "Chờ cấp": nhân viên đã thi đỗ nhưng chứng chỉ chưa được cấp — chưa có số/ngày cấp.
  const isPendingIssuance = watch('issuance_status') === 'pending'

  // Get certificate type options from constants
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE_CERTIFICATE.CERTIFICATE_TYPE],
  })

  const certificateTypeOptions = useMemo(() => {
    const options = keysMapOptions.has(APP_CONSTANT_KEY.EMPLOYEE_CERTIFICATE.CERTIFICATE_TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE_CERTIFICATE.CERTIFICATE_TYPE) || []
      : []

    // Sort "other" to the end if it exists in the enum
    const OTHER_VALUE = EmployeeCertificateType.other
    const otherIndex = options.findIndex((opt) => opt.value === OTHER_VALUE)

    if (otherIndex > -1) {
      const otherOption = options[otherIndex]
      const otherOptions = options.filter((opt) => opt.value !== OTHER_VALUE)
      return [...otherOptions, otherOption]
    }

    return options
  }, [keysMapOptions])

  // Pre-fill form with certificate data (edit mode only)
  useEffect(() => {
    if (isEditMode && certificate && !isInitialized.current) {
      // Parse dates from API format (yyyy-MM-dd) to DD/MM/YYYY for DatePicker
      const parsedIssueDate = certificate.issue_date
        ? format(parse(certificate.issue_date, DATE_SERVER_FORMAT, new Date()), DATE_FORMAT)
        : null

      const parsedEffectiveDate = certificate.effective_date
        ? format(parse(certificate.effective_date, DATE_SERVER_FORMAT, new Date()), DATE_FORMAT)
        : null

      const parsedExpiryDate = certificate.expiry_date
        ? format(parse(certificate.expiry_date, DATE_SERVER_FORMAT, new Date()), DATE_FORMAT)
        : null

      const parsedExpectedIssueDate = certificate.expected_issue_date
        ? format(
            parse(certificate.expected_issue_date, DATE_SERVER_FORMAT, new Date()),
            DATE_FORMAT
          )
        : null

      reset({
        employee: certificate.employee.id,
        issuance_status: certificate.is_pending_issuance ? 'pending' : 'issued',
        certificate_type: certificate.certificate_type,
        certificate_code: certificate.certificate_code || '',
        certificate_name: certificate.certificate_name || '',
        actual_sequence_number: certificate.actual_sequence_number ?? undefined,
        issuing_organization: certificate.issuing_organization || '',
        training_specialization: certificate.training_specialization || '',
        graduation_diploma: certificate.graduation_diploma || '',
        issue_date: parsedIssueDate as any,
        expected_issue_date: parsedExpectedIssueDate as any,
        effective_date: parsedEffectiveDate as any,
        expiry_date: parsedExpiryDate as any,
        notes: certificate.notes || '',
        ...(certificate.attachment && {
          attachment: certificate.attachment.file_path,
        }),
      })
      isInitialized.current = true
    }
  }, [isEditMode, certificate, reset])

  // Handle file upload
  const [fileToken, setFileToken] = useState<string>('')

  const handleFileChange = useCallback((token: string) => {
    setFileToken(token)
  }, [])

  // Refine date from form to API format
  const refineDate = useCallback((date: Date | string | null | undefined): string | null => {
    if (!date) return null

    if (typeof date === 'string') {
      const parsed = parse(date, DATE_FORMAT, new Date())
      return isValid(parsed) ? format(parsed, DATE_SERVER_FORMAT) : null
    }

    if (date instanceof Date && isValid(date)) {
      return format(date, DATE_SERVER_FORMAT)
    }

    return null
  }, [])

  // Form submission
  const onSubmit = useCallback(
    async (data: CreateEmployeeCertificateFormData) => {
      try {
        const isPending = data.issuance_status === 'pending'

        // Ngoài phiếu "chờ cấp", ngày cấp là bắt buộc.
        const refinedIssueDate = refineDate(data.issue_date)
        if (!isPending && !refinedIssueDate) {
          toastService.error('Vui lòng nhập ngày cấp')
          return
        }

        // Prepare payload
        const employeeId = data.employee
        if (!employeeId) {
          toastService.error('Vui lòng chọn nhân viên')
          return
        }

        // Phiếu "chờ cấp" chưa có số/ngày cấp/hạn — chỉ giữ ngày dự kiến cấp.
        const payload: EmployeeCertificateRequest = {
          employee_id: employeeId,
          certificate_type: data.certificate_type,
          is_pending_issuance: isPending,
          certificate_code: isPending ? undefined : data.certificate_code || undefined,
          certificate_name: data.certificate_name || undefined,
          // `?? null` chứ KHÔNG phải `|| undefined` như các field chuỗi cạnh đây, vì hai lý do:
          // (1) `0` là số thứ tự hợp lệ nhưng falsy ⇒ `||` sẽ nuốt mất;
          // (2) `undefined` bị loại khỏi JSON ⇒ PUT thiếu key ⇒ BE giữ nguyên giá trị cũ,
          //     nên ô xoá trắng sẽ không bao giờ xoá được.
          actual_sequence_number: data.actual_sequence_number ?? null,
          issuing_organization: data.issuing_organization || '',
          training_specialization: data.training_specialization || undefined,
          graduation_diploma: data.graduation_diploma || undefined,
          issue_date: isPending ? null : refinedIssueDate,
          expected_issue_date: isPending ? refineDate(data.expected_issue_date) : null,
          effective_date: isPending ? null : refineDate(data.effective_date),
          expiry_date: isPending ? null : refineDate(data.expiry_date),
          notes: data.notes || undefined,
        }

        // Add files if file token exists
        if (fileToken) {
          payload.files = {
            attachment: fileToken,
          }
        }

        // Execute mutation based on mode
        if (isEditMode) {
          await updateCertificateMutation.mutateAsync({
            id: certificateId!,
            data: payload,
          })
        } else {
          await createCertificateMutation.mutateAsync(payload)
        }

        toastService.success(
          isEditMode
            ? 'Cập nhật bằng cấp, chứng chỉ thành công!'
            : 'Tạo bằng cấp, chứng chỉ mới thành công!'
        )
        await invalidateQueries.invalidateByPrefix('hrm/employee-certificates')

        // Navigate to list page or call onSuccess
        if (onSuccess) {
          onSuccess()
        } else {
          navigate(APP_PATH.EMPLOYEE_CERTIFICATE)
        }
      } catch (error: any) {
        handleApiError(error, form.setError)
      }
    },
    [
      isEditMode,
      certificateId,
      createCertificateMutation,
      updateCertificateMutation,
      invalidateQueries,
      navigate,
      onSuccess,
      fileToken,
      refineDate,
    ]
  )

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      navigate(-1)
    }
  }, [onCancel, navigate])

  // Show loading state while fetching certificate data (edit mode only)
  if (isEditMode && isLoadingCertificate) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  // Show error if certificate not found (edit mode only)
  if (isEditMode && !certificate) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="typo-body-base-regular text-content-dark-3">
          Không tìm thấy bằng cấp, chứng chỉ
        </p>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Quay lại
        </Button>
      </div>
    )
  }

  return (
    <Form handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="7" className="w-full">
        {/* Section 1: Thông tin nhân viên */}
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin nhân viên</h2>
          <Controller
            name="employee"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EmployeeSelectWithDialog
                value={field.value}
                onChange={field.onChange}
                error={error?.message}
                required
                label="Nhân Viên"
              />
            )}
          />
        </div>

        {/* Separator */}
        <SeparatorHorizontal />

        {/* Section 2: Thông tin bằng cấp, chứng chỉ */}
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">
            Thông tin bằng cấp, chứng chỉ
          </h2>

          {/* Issuance status: "Đã cấp" vs "Chờ cấp" (phiếu chờ cấp) */}
          <FormController
            register={register}
            name="issuance_status"
            control={control as unknown as Control<CreateEmployeeCertificateFormData>}
            Field={RadioGroup}
            fieldProps={{
              id: 'issuance_status',
              label: 'Tình trạng bằng cấp, chứng chỉ',
              required: true,
              disabled: false,
              orientation: 'horizontal',
              options: [
                { value: 'issued', label: 'Đã cấp' },
                { value: 'pending', label: 'Chờ cấp' },
              ],
            }}
          />

          {/* Certificate Type */}
          <Grid cols={2} gap={5}>
            <FormController
              register={register}
              name="certificate_type"
              control={control as unknown as Control<CreateEmployeeCertificateFormData>}
              Field={Select}
              fieldProps={{
                label: 'Loại bằng cấp, chứng chỉ',
                required: true,
                placeholder: 'Chọn chứng chỉ',
                options: certificateTypeOptions,
                searchable: true,
                className: 'w-full',
              }}
            />

            {/* Phiếu "chờ cấp" chưa có số bằng cấp */}
            {!isPendingIssuance && (
              <FormController
                register={register}
                name="certificate_code"
                control={control as unknown as Control<CreateEmployeeCertificateFormData>}
                Field={TextField}
                fieldProps={{
                  label: 'Số bằng cấp',
                  placeholder: 'Nhập số bằng cấp',
                  options: certificateTypeOptions,
                  maxLength: 30,
                  showCharacterCount: true,
                  className: 'w-full',
                }}
              />
            )}
          </Grid>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <FormController
              register={register}
              name="certificate_name"
              control={control as unknown as Control<CreateEmployeeCertificateFormData>}
              Field={TextField}
              fieldProps={{
                label: 'Tiêu đề',
                placeholder: 'Nhập tiêu đề',
                maxLength: 100,
                showCharacterCount: true,
                className: 'w-full',
              }}
            />
          </div>

          {/* Organization */}
          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="issuing_organization"
              control={control as unknown as Control<CreateEmployeeCertificateFormData>}
              Field={TextField}
              fieldProps={{
                label: 'Tổ chức cấp',
                placeholder: 'Nhập tổ chức cấp',
                maxLength: 100,
                showCharacterCount: true,
                className: 'w-full',
              }}
            />
            {/* Phiếu "chờ cấp": thay "Ngày cấp" bằng "Ngày dự kiến cấp" */}
            {isPendingIssuance ? (
              <FormController
                register={register}
                name="expected_issue_date"
                control={control as unknown as Control<CreateEmployeeCertificateFormData>}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày dự kiến cấp',
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                  clearable: true,
                  className: 'w-full',
                  toYear: 2100,
                }}
              />
            ) : (
              <FormController
                register={register}
                name="issue_date"
                control={control as unknown as Control<CreateEmployeeCertificateFormData>}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày cấp',
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                  clearable: true,
                  className: 'w-full',
                  required: true,
                }}
              />
            )}
          </div>

          {/* Issue Date + Expiry Date — phiếu "chờ cấp" chưa có hiệu lực/hết hạn */}
          {!isPendingIssuance && (
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="effective_date"
                control={control as unknown as Control<CreateEmployeeCertificateFormData>}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày hiệu lực',
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                  clearable: true,
                  className: 'w-full',
                  toYear: 2100,
                }}
              />
              <FormController
                register={register}
                name="expiry_date"
                control={control as unknown as Control<CreateEmployeeCertificateFormData>}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày hết hiệu lực',
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                  clearable: true,
                  className: 'w-full',
                  toYear: 2100,
                  required: isRealEstatePracticeLicense,
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="training_specialization"
              control={control as unknown as Control<CreateEmployeeCertificateFormData>}
              Field={TextField}
              fieldProps={{
                label: 'Chuyên ngành đào tạo',
                placeholder: 'Nhập chuyên ngành đào tạo',
                maxLength: 100,
                showCharacterCount: true,
                className: 'w-full',
              }}
            />
            <FormController
              register={register}
              name="graduation_diploma"
              control={control as unknown as Control<CreateEmployeeCertificateFormData>}
              Field={TextField}
              fieldProps={{
                label: 'Văn bằng tốt nghiệp',
                placeholder: 'Nhập văn bằng tốt nghiệp',
                maxLength: 100,
                showCharacterCount: true,
                className: 'w-full',
              }}
            />
            {/* CR STT53 — số ghi trên sổ cấp phát bản cứng; không bắt buộc, không unique. */}
            <FormController
              register={register}
              name="actual_sequence_number"
              control={control as unknown as Control<CreateEmployeeCertificateFormData>}
              Field={TextField}
              fieldProps={{
                label: 'Số thứ tự thực tế',
                placeholder: 'Nhập số thứ tự thực tế',
                type: 'number',
                className: 'w-full',
              }}
            />
          </div>

          {/* Note */}
          <div className="flex flex-col gap-2">
            <FormController
              register={register}
              name="notes"
              control={control as unknown as Control<CreateEmployeeCertificateFormData>}
              Field={TextArea}
              fieldProps={{
                label: 'Ghi chú',
                placeholder: 'Nhập ghi chú',
                maxCharacters: 500,
                rows: 4,
                className: 'w-full',
              }}
            />
          </div>
        </div>

        {/* Separator */}
        <SeparatorHorizontal />

        {/* Section 3: Tài liệu đính kèm */}
        <div className="flex flex-col gap-5">
          <FileUpload
            onChange={handleFileChange}
            className="w-full"
            existingFile={isEditMode && certificate ? (certificate.attachment as any) : undefined}
            required={false}
            hiddenDescription={true}
          />
        </div>

        {/* Action Buttons */}
        <div className="border-border-1 flex justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
            className={'w-[150px]'}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className={'w-[150px]'}
          >
            Lưu
          </Button>
        </div>
      </Flex>
    </Form>
  )
}
