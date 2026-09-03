import { useCallback } from 'react'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { QUERY_KEYS } from '@/constants'
import { extractErrorMessage } from '@/utils/error-utils'
import toastService from '@/services/toast-service.tsx'
import {
  type RecruitmentCandidate,
  useUpdateRecruitmentCandidateAvatar,
} from '@/features/recruitment/services/recruitment-candidate-service'
import RecruitmentCandidateAvatarUpload from '@/features/recruitment/candidate/_shares/components/RecruitmentCandidateAvatarUpload.tsx'

type Props = {
  candidate: RecruitmentCandidate
}

const RecruitmentCandidateAvatarSection = ({ candidate }: Props) => {
  const updateAvatarMutation = useUpdateRecruitmentCandidateAvatar()
  const { invalidateByKey } = useInvalidateQueries()

  const handleTokenReady = useCallback(
    async (token: string) => {
      try {
        await updateAvatarMutation.mutateAsync({
          id: candidate.id,
          data: { files: { avatar: token } },
        })
        await invalidateByKey(QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.DETAIL(candidate.id))
        toastService.success('Cập nhật ảnh đại diện thành công!')
      } catch (error) {
        toastService.error(extractErrorMessage(error, 'Có lỗi xảy ra khi cập nhật ảnh đại diện.'))
      }
    },
    [candidate.id, invalidateByKey, updateAvatarMutation]
  )

  const avatarUrl = candidate?.avatar?.view_url || undefined

  return (
    <RecruitmentCandidateAvatarUpload
      avatarUrl={avatarUrl}
      onTokenReady={handleTokenReady}
      disabled={updateAvatarMutation.isPending}
    />
  )
}

export default RecruitmentCandidateAvatarSection
