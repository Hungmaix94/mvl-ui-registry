import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import { type DecisionFormData, decisionFormSchema } from '../schemas/decision-schema.ts'
import {
  type Decision,
  type DecisionRequest,
  useCreateDecision,
  useUpdateDecision,
} from '@/features/decision-and-proposal/services/decision-service'
import Form from '@/components/ui/form/Form.tsx'
import { FormController } from '@/components/ui/form'
import { Button, FileUpload, RadioGroup, RichText, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { Flex, Grid, Separator } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'
import EmployeeSelectWithDialog from './EmployeeSelectWithDialog.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { parse } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { DecisionSigning_status } from '@/api/schema.ts'
import { formatDate, formatDateToApi } from '@/utils/date-utils.ts'

type DecisionFormProps = {
  initialData?: Decision
  mode?: 'create' | 'edit'
  onSuccess?: () => void
  onCancel?: () => void
}

const DecisionForm = ({ initialData, mode = 'create', onSuccess, onCancel }: DecisionFormProps) => {
  const createDecisionMutation = useCreateDecision()
  const updateDecisionMutation = useUpdateDecision()

  const isEditMode = mode === 'edit' && !!initialData

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.DECISION_SIGNING_STATUS],
  })

  const signingStatusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.DECISION_SIGNING_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.DECISION_SIGNING_STATUS) || []
      : []
  }, [keysMapOptions])

  // Parse initial data to form values
  const defaultValues = useMemo<Partial<DecisionFormData>>(() => {
    if (isEditMode && initialData) {
      return {
        decision_number: initialData.decision_number || '',
        name: initialData.name || '',
        signing_date: formatDate(initialData.signing_date),
        signer_id: initialData.signer?.id || undefined,
        effective_date: formatDate(initialData.effective_date),
        reason: initialData.reason || null,
        content: initialData.content || null,
        note: initialData.note || null,
        signing_status: initialData.signing_status || DecisionSigning_status.draft,
        attachment_tokens: [], // Existing files are shown via existingFiles prop in FileUpload
      }
    }

    return {
      decision_number: '',
      name: '',
      signing_date: '',
      signer_id: undefined,
      effective_date: '',
      reason: null,
      content: null,
      note: null,
      signing_status: DecisionSigning_status.draft,
      attachment_tokens: [],
    }
  }, [isEditMode, initialData])

  // Create custom resolver that allows empty attachment_tokens when editing with existing files
  const customResolver = useMemo(() => {
    const hasExistingFiles =
      isEditMode && initialData?.attachments && initialData.attachments.length > 0

    if (hasExistingFiles) {
      // Create a modified schema that makes attachment_tokens optional
      const modifiedSchema = decisionFormSchema.omit({ attachment_tokens: true }).extend({
        attachment_tokens: z.array(z.string()).optional(),
      })
      return zodResolver(modifiedSchema as any)
    }
    return zodResolver(decisionFormSchema)
  }, [isEditMode, initialData])

  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting, isSubmitted, errors },
    watch,
    setError,
  } = useForm<DecisionFormData>({
    resolver: customResolver,
    defaultValues,
    shouldFocusError: false, // Disable default focus to use custom scroll
  })

  // Auto-scroll to first error field when form is submitted and has errors
  useScrollToError(errors, { autoScroll: isSubmitted })

  const onSubmit = useCallback(
    async (data: DecisionFormData) => {
      try {
        // Validate that we have files (either new tokens or existing files in edit mode)
        const hasNewFiles = data.attachment_tokens && data.attachment_tokens.length > 0
        const hasExistingFiles =
          isEditMode && initialData?.attachments && initialData.attachments.length > 0

        if (!hasNewFiles && !hasExistingFiles) {
          throw new Error('File đính kèm là bắt buộc')
        }

        // Prepare request data
        // For new files, send tokens in files.attachments (server will handle confirmation)
        // For existing files in edit mode, don't send files field (server will keep existing)
        const requestData: DecisionRequest = {
          decision_number: data.decision_number,
          name: data.name,
          signer_id: data.signer_id,
          signing_date: formatDateToApi(data.signing_date),
          effective_date: formatDateToApi(data.effective_date),
          reason: data.reason || null,
          content: data.content || null,
          note: data.note || null,
          signing_status: data.signing_status,
          // Only include files field if there are new file tokens
          // Server will handle file confirmation automatically
          ...(hasNewFiles && {
            files: {
              attachments: data.attachment_tokens,
            },
          }),
        }

        // Create or update decision
        if (isEditMode && initialData?.id) {
          await updateDecisionMutation.mutateAsync({
            id: initialData.id,
            data: requestData,
          })
          toastService.success('Cập nhật quyết định thành công!')
        } else {
          await createDecisionMutation.mutateAsync(requestData)
          toastService.success('Tạo quyết định thành công!')
        }

        onSuccess?.()
      } catch (error: any) {
        handleApiError(error, setError)
      }
    },
    [createDecisionMutation, updateDecisionMutation, isEditMode, initialData, onSuccess]
  )

  // Parse date string to Date object for DatePicker
  const parseDateValue = useCallback((dateString: string | undefined | null): Date | null => {
    if (!dateString) return null
    try {
      const parsed = parse(dateString, DATE_FORMAT, new Date())
      return isNaN(parsed.getTime()) ? null : parsed
    } catch {
      return null
    }
  }, [])

  const signingDateValue = watch('signing_date')
  const effectiveDateValue = watch('effective_date')

  return (
    <Form
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
      loading={isSubmitting}
      className={'w-full py-6'}
    >
      <Flex direction="column" gap="5" className="w-full p-0">
        <Grid columns={{ xs: '1', md: '2' }} gap={'4'}>
          {/* Decision Number */}
          <FormController
            register={register}
            name="decision_number"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Số quyết định',
              required: true,
              placeholder: 'Nhập số quyết định',
              maxLength: 50,
              showCharacterCount: true,
            }}
          />

          {/* Decision Name */}
          <FormController
            register={register}
            name="name"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Tên quyết định',
              required: true,
              placeholder: 'Nhập tên quyết định',
              maxLength: 500,
              showCharacterCount: true,
            }}
          />
        </Grid>

        {/* Signer */}
        <Controller
          name="signer_id"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <EmployeeSelectWithDialog
              value={field.value}
              onChange={field.onChange}
              error={error?.message}
              required
              label="Người ký"
            />
          )}
        />

        <Grid columns={{ xs: '1', md: '2' }} gap={'4'}>
          {/* Signing Date */}
          <FormController
            register={register}
            name="signing_date"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày ký',
              required: true,
              placeholder: 'Chọn ngày ký',
              allowManualInput: true,
              value: parseDateValue(signingDateValue),
              clearable: false,
              avoidCollisions: false,
            }}
          />

          {/* Effective Date */}
          <FormController
            register={register}
            name="effective_date"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày hiệu lực',
              required: true,
              placeholder: 'Chọn ngày hiệu lực',
              allowManualInput: true,
              value: parseDateValue(effectiveDateValue),
              clearable: false,
              avoidCollisions: false,
            }}
          />
        </Grid>

        {/* Signing Status - Radio */}
        <Controller
          name="signing_status"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <RadioGroup
              id="signing_status"
              label="Trạng thái ký"
              required
              options={signingStatusOptions}
              value={field.value || ''}
              onChange={field.onChange}
              error={error?.message || ''}
              disabled={false}
            />
          )}
        />

        {/* Reason - RichText */}
        <FormController
          register={register}
          name="reason"
          control={control}
          Field={RichText}
          fieldProps={{
            label: 'Lý do',
            required: false,
            placeholder: 'Nhập lý do',
            maxCharacters: 500,
          }}
        />

        {/* Content - RichText */}
        <FormController
          register={register}
          name="content"
          control={control}
          Field={RichText}
          fieldProps={{
            label: 'Nội dung',
            required: false,
            placeholder: 'Nhập nội dung',
            maxCharacters: 2000,
          }}
        />

        {/* Note - RichText */}
        <FormController
          register={register}
          name="note"
          control={control}
          Field={RichText}
          fieldProps={{
            label: 'Ghi chú',
            required: false,
            placeholder: 'Nhập ghi chú',
            maxCharacters: 1000,
          }}
        />

        <Separator orientation={'horizontal'} className={'!w-full'} />

        {/* File Upload */}
        <FormController
          register={register}
          name="attachment_tokens"
          control={control}
          Field={FileUpload}
          fieldProps={{
            label: 'File đính kèm',
            required: true,
            multiple: true,
            purpose: 'decision_attachment',
            existingFiles:
              isEditMode && initialData?.attachments ? initialData.attachments : undefined,
          }}
        />

        {/* Action Buttons */}
        <Flex gap="4" align="center" justify="end" width="100%" mt="8">
          <Button
            type="button"
            variant="secondary"
            size="large"
            onClick={onCancel}
            disabled={
              isSubmitting || createDecisionMutation.isPending || updateDecisionMutation.isPending
            }
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="large"
            disabled={
              isSubmitting || createDecisionMutation.isPending || updateDecisionMutation.isPending
            }
            loading={
              isSubmitting || createDecisionMutation.isPending || updateDecisionMutation.isPending
            }
            className="w-[150px]"
          >
            {isEditMode ? 'Cập nhật' : 'Thêm'}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default DecisionForm
