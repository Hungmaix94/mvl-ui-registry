import { useCallback, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import Form from '@/components/ui/form/Form.tsx'
import { Button, Checkbox } from '@/components/ui'
import { EmployeeDocumentSubmissionItemRequestDocument_type } from '@/api/schema.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { handleApiError } from '@/utils/error-utils.ts'
import {
  useUpdateEmployeeDocuments,
  type Employee,
} from '@/features/employee/services/employee-service'
import { DOCUMENT_TYPE_ORDER } from '@/features/employee/management/view-details/tab-general/document-submission/document-submission.constant.ts'

type DocumentType = EmployeeDocumentSubmissionItemRequestDocument_type
type DocumentSubmissionFormValues = Record<DocumentType, boolean>

type DocumentSubmissionFormProps = {
  employee: Employee
}

function buildDefaultValues(employee: Employee): DocumentSubmissionFormValues {
  const submittedMap = new Map(
    (employee.document_submissions ?? []).map((doc) => [doc.document_type, doc.is_submitted])
  )
  return DOCUMENT_TYPE_ORDER.reduce((acc, docType) => {
    acc[docType] = submittedMap.get(docType) ?? false
    return acc
  }, {} as DocumentSubmissionFormValues)
}

const DocumentSubmissionForm = ({ employee }: DocumentSubmissionFormProps) => {
  const { displayClose } = useDialog()
  const { success: showSuccessToast } = useToast()
  const invalidateQueries = useInvalidateQueries()
  const updateDocumentsMutation = useUpdateEmployeeDocuments()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.EMPLOYEE_DOCUMENT_SUBMISSION_DOCUMENT_TYPE_CHOICES],
  })

  const documentTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.HRM.EMPLOYEE_DOCUMENT_SUBMISSION_DOCUMENT_TYPE_CHOICES
  ) as Record<string, string> | undefined

  const { control, handleSubmit, setError } = useForm<DocumentSubmissionFormValues>({
    defaultValues: useMemo(() => buildDefaultValues(employee), [employee]),
  })

  const isLoading = updateDocumentsMutation.isPending

  const onSubmit = useCallback(
    async (values: DocumentSubmissionFormValues) => {
      try {
        const documents = DOCUMENT_TYPE_ORDER.map((documentType) => ({
          document_type: documentType,
          is_submitted: !!values[documentType],
        }))

        await updateDocumentsMutation.mutateAsync({
          id: employee.id,
          data: { documents },
        })

        showSuccessToast('Cập nhật hồ sơ nhân sự thành công')
        await invalidateQueries.invalidateByPrefix('hrm')
        displayClose()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [
      employee.id,
      updateDocumentsMutation,
      showSuccessToast,
      invalidateQueries,
      displayClose,
      setError,
    ]
  )

  return (
    <Form loading={isLoading} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-3">
          {DOCUMENT_TYPE_ORDER.map((documentType) => (
            <Controller
              key={documentType}
              name={documentType}
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                  label={documentTypeLabels?.[documentType] ?? documentType}
                  disabled={isLoading}
                />
              )}
            />
          ))}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={displayClose}
            disabled={isLoading}
            className={'w-[150px]'}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isLoading} className={'w-[150px]'}>
            Lưu
          </Button>
        </div>
      </div>
    </Form>
  )
}

export default DocumentSubmissionForm
