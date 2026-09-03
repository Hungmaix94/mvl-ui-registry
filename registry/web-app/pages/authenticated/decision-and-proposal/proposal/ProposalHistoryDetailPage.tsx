import { useParams, useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import BaseHistoryDetailWrapper from '@/features/object-history/components/BaseHistoryDetailWrapper.tsx'
import { useHistoryDetail } from '@/services/histories-service.ts'
import { useMemo, useState } from 'react'
import {
  getProposalHistoryDetailPath,
  getProposalPermissionSubject,
  urlParamToProposalType,
} from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils.ts'
import { APP_PATH } from '@/routes'
import type { BreadcrumbItemData } from '@/components/ui/breadcrumb'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { isNotFoundError } from '@/utils/error-utils'
import { useAbility } from '@/lib/ability'

const ProposalHistoryDetailPage = () => {
  const ability = useAbility()
  const { id, log_id } = useParams<{ id?: string; log_id: string }>()
  const [searchParams] = useSearchParams()
  const proposalId = id ? Number(id) : NaN
  // Get proposal_type from query params
  const proposalTypeParam = searchParams.get('proposal_type') || ''
  const proposalType = urlParamToProposalType(proposalTypeParam)

  // Get history detail path based on proposal type
  const historyDetailPath = proposalType ? getProposalHistoryDetailPath(proposalType) : null

  // Check for invalid params
  const isInvalidParams = Number.isNaN(proposalId) || !proposalType || !historyDetailPath || !log_id

  // Quyền của màn phải là quyền của ĐÚNG endpoint mà `useHistoryDetail` bên dưới gọi. Màn này dùng
  // chung cho 13 loại đề xuất và backend khai 13 mã riêng (`proposal_paid_leave.history_detail`,
  // `proposal_device_change.history_detail`, …), nên tra theo `proposalType` lấy từ query param.
  // Không biết loại ⇒ không có endpoint để gọi ⇒ coi như không có quyền.
  const permissionSubject = getProposalPermissionSubject(proposalType)

  const { data, isLoading, error } = useHistoryDetail(
    historyDetailPath || ('' as any),
    String(proposalId),
    log_id || ''
  )

  const [objectName, setObjectName] = useState<string | null | undefined>()

  // Determine if history was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !data
  }, [isLoading, error, data])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  // Create custom breadcrumb
  const breadcrumb = useMemo<BreadcrumbItemData[]>(() => {
    const items: BreadcrumbItemData[] = [
      {
        label: 'Quản lý quyết định/đề xuất',
        // No href for first item
      },
      {
        label: 'Đề xuất',
        // No href for second item
      },
      {
        label: 'Danh sách cần duyệt',
        href: APP_PATH.PROPOSAL_MANAGE,
      },
    ]

    // Add proposal name if available
    if (objectName) {
      const detailPath = APP_PATH.PROPOSAL_MANAGE_DETAIL.replace(':id', String(proposalId))
      items.push({
        label: objectName,
        href: `${detailPath}?proposal_type=${proposalType}`,
      })
    }

    // Add "Lịch sử" link
    const historyPath = APP_PATH.PROPOSAL_MANAGE_HISTORY.replace(':id', String(proposalId))
    items.push({
      label: 'Lịch sử',
      href: `${historyPath}?proposal_type=${proposalType}`,
    })

    // Add "Lịch sử chi tiết" as current page
    items.push({
      label: 'Lịch sử chi tiết',
      isCurrentPage: true,
    })

    return items
  }, [objectName, proposalId, proposalType])

  return (
    <>
      <PageTitle breadcrumb={breadcrumb} title="Chi tiết lịch sử thay đổi" enableBackButton />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound || isInvalidParams}
        isError={isError}
        hasPermission={!!permissionSubject && ability.can('history_detail', permissionSubject)}
      >
        {data && <BaseHistoryDetailWrapper historyDetail={data} objectName={setObjectName} />}
      </DetailPageWrapper>
    </>
  )
}

export default ProposalHistoryDetailPage
