import RecruitmentRequestForm from '@/features/recruitment/request/_shares/components/RecruitmentRequestForm.tsx'

type RecruitmentRequestCreateFormProps = {
  onSuccess?: () => void
  onCancel?: () => void
}

const RecruitmentRequestCreateForm = ({
  onSuccess,
  onCancel,
}: RecruitmentRequestCreateFormProps) => {
  return <RecruitmentRequestForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />
}

export default RecruitmentRequestCreateForm
