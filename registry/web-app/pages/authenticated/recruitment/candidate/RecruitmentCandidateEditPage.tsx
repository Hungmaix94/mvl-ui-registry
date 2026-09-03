import { PageTitle, Button } from '@/components/ui'
import { RecruitmentCandidateForm } from '@/features/recruitment/candidate/_shares/components'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams } from 'react-router-dom'
import { useRecruitmentCandidate } from '@/services'
import { useEffect } from 'react'
import { useAbility } from '@/lib/ability.ts'
import { Flex, Text } from '@radix-ui/themes'

const RecruitmentCandidateEditPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const candidateId = id ? parseInt(id, 10) : 0
  const ability = useAbility()

  // Fetch candidate data
  const { data: candidate, isLoading } = useRecruitmentCandidate(candidateId)

  // Handle invalid candidate ID
  useEffect(() => {
    if (!candidateId || isNaN(candidateId)) {
      navigate(APP_PATH.RECRUITMENT_CANDIDATE)
    }
  }, [candidateId, navigate])

  // Handle candidate not found (only after load finished — do not redirect while loading)
  useEffect(() => {
    if (candidateId && !isLoading && !candidate) {
      navigate(APP_PATH.RECRUITMENT_CANDIDATE)
    }
  }, [candidateId, candidate, isLoading, navigate])

  // Permission check
  if (!ability.can('update', 'recruitment_candidate')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa ứng viên này.
        </Text>
        <Button onClick={() => navigate(APP_PATH.HOME)}>Quay lại trang chủ</Button>
      </Flex>
    )
  }

  if (!candidateId || isNaN(candidateId) || !candidate) {
    return null
  }

  return (
    <>
      {/* Page Header using PageTitle component */}
      <PageTitle idLabel={candidate?.name} enableBackButton />

      {/* Form Content */}
      <RecruitmentCandidateForm mode="edit" candidate={candidate} onCancel={() => navigate(-1)} />
    </>
  )
}

export default RecruitmentCandidateEditPage
