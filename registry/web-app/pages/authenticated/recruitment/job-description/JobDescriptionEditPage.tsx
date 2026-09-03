import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useJobDescriptionDetail } from '@/hooks/useJobDescriptionDetail.ts'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { useJobDescriptionDelete } from '@/features/recruitment/job-description'
import JobDescriptionEditForm from '@/features/recruitment/job-description/update/JobDescriptionEditForm.tsx'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { QUERY_KEYS } from '@/constants/query-keys.ts'

const JobDescriptionEditPage = () => {
  const navigate = useNavigate()
  const invalidateQueries = useInvalidateQueries()

  const { jobDescription, isLoading, error, isNotFound, jobDescriptionId } =
    useJobDescriptionDetail()

  const { openDeleteDialog } = useJobDescriptionDelete(() => {
    navigate(APP_PATH.RECRUITMENT_JOB_DESCRIPTION)
  })

  const handleDelete = useCallback(() => {
    if (jobDescription) {
      openDeleteDialog(jobDescription)
    }
  }, [openDeleteDialog, jobDescription])

  if (error) {
    console.log('API error, using mock data:', error)
  }

  return (
    <>
      <PageTitle idLabel={jobDescription?.title} enableBackButton handleDelete={handleDelete} />
      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : isNotFound ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin mô tả công việc với ID: {jobDescriptionId}
          </Text>
        </Flex>
      ) : jobDescription ? (
        <JobDescriptionEditForm
          initialData={jobDescription}
          onSuccess={async () => {
            // Invalidate job description queries to refresh data
            await invalidateQueries.invalidateByKey(QUERY_KEYS.HRM.JOB_DESCRIPTIONS.ALL())
            navigate(APP_PATH.RECRUITMENT_JOB_DESCRIPTION)
          }}
          onCancel={() => navigate(-1)}
        />
      ) : null}
    </>
  )
}

export default JobDescriptionEditPage
