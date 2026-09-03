import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { Flex, Text } from '@radix-ui/themes'
import RecruitmentRequestDetail from '@/features/recruitment/request/view-details/RecruitmentRequestDetail.tsx'
import { useRecruitmentRequestDetail } from '@/hooks/useRecruitmentRequestDetail.ts'
import { useRecruitmentRequestDelete } from '@/features/recruitment/request/delete/RecruitmentRequestDelete.tsx'

import { useAbility } from '@/lib/ability.ts'
import { useRecruitmentRequestExport } from '@/features/recruitment/request/_shares/hooks/useRecruitmentRequestExport.tsx'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { RecruitmentRequestStatus } from '@/constants/api-schema-aliases'

const RecruitmentRequestDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { request, isLoading, error, isNotFound, isError, requestId } =
    useRecruitmentRequestDetail()

  const { openDeleteDialog } = useRecruitmentRequestDelete(() => {
    navigate(APP_PATH.RECRUITMENT_REQUEST)
  })

  const { openExportDialog, isExporting } = useRecruitmentRequestExport({
    requestId,
    defaultFilename: request ? `${request.code || 'recruitment-request'}.pdf` : undefined,
  })

  const handleExport = useCallback(async () => {
    if (!requestId || isExporting) {
      return
    }

    await openExportDialog()
  }, [isExporting, openExportDialog, requestId])

  const handleEdit = useCallback(() => {
    const path = APP_PATH.RECRUITMENT_REQUEST_EDIT.replace(':id', requestId.toString())
    navigate(path)
  }, [navigate, requestId])

  const handleDelete = useCallback(() => {
    if (request) {
      openDeleteDialog(request)
    }
  }, [openDeleteDialog, request])

  if (error) {
    console.log('API error, using mock data:', error)
  }

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.RECRUITMENT_REQUEST_HISTORY.replace(':id', requestId.toString())
    navigate(path)
  }, [navigate, requestId])

  // Dynamic title: "Yêu cầu tuyển dụng {code}"
  const pageTitle = request ? `Yêu cầu tuyển dụng ${request.code}` : undefined

  return (
    <>
      <PageTitle
        idLabel={request?.name}
        enableBackButton
        title={pageTitle}
        handleExportBtnIcon={
          ability.can('export_detail_document', 'recruitment_request') ? handleExport : undefined
        }
        handleEdit={ability.can('update', 'recruitment_request') ? handleEdit : undefined}
        handleDelete={
          ability.can('destroy', 'recruitment_request') &&
          (request?.colored_status?.value || '').toUpperCase() === RecruitmentRequestStatus.DRAFT
            ? handleDelete
            : undefined
        }
        handleShowHistory={
          ability.can('histories', 'recruitment_request') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'recruitment_request')}
      >
        {isNotFound ? (
          <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
            <Text className="typo-body-xl-semibold text-content-dark-3">
              Không tìm thấy thông tin yêu cầu tuyển dụng với ID: {requestId}
            </Text>
          </Flex>
        ) : request ? (
          <RecruitmentRequestDetail request={request} />
        ) : null}
      </DetailPageWrapper>
    </>
  )
}

export default RecruitmentRequestDetailPage
