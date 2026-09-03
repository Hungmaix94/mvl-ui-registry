import { type RecruitmentRequest } from '@/features/recruitment/services/recruitment-request-service'
import RecruitmentRequestForm from '@/features/recruitment/request/_shares/components/RecruitmentRequestForm.tsx'

type RecruitmentRequestEditFormProps = {
  initialValues: RecruitmentRequest
  onSuccess?: () => void
  onCancel?: () => void
}

const RecruitmentRequestEditForm = ({
  initialValues,
  onSuccess,
  onCancel,
}: RecruitmentRequestEditFormProps) => {
  return (
    <RecruitmentRequestForm
      mode="edit"
      initialValues={initialValues}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  )
}

export default RecruitmentRequestEditForm
