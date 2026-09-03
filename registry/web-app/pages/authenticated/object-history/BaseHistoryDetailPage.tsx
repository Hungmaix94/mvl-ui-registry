import { useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import BaseHistoryDetailWrapper from '../../../features/object-history/components/BaseHistoryDetailWrapper.tsx'
import { HistoryDetailPaths, useHistoryDetail } from '@/services/histories-service'
import { useMemo, useState } from 'react'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { isNotFoundError } from '@/utils/error-utils'

const BaseHistoryDetailPage = ({ path }: { path: HistoryDetailPaths }) => {
  const { id, log_id } = useParams<{ id?: string; log_id: string }>()
  const { data, isLoading, error } = useHistoryDetail(path, String(id), log_id || '')

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

  // `hasPermission={true}` là CỐ Ý (ClickUp 86eync7g0). Đây là component DÙNG CHUNG cho màn lịch
  // sử của rất nhiều thực thể — chi nhánh, khối, phòng ban, chức vụ, sàn, HĐ đặt chỗ, HĐ cọc… —
  // và mỗi route gọi nó khai một mã quyền khác nhau (`hrm_branches_history_retrieve`,
  // `booking.histories`, …). Ghi cứng MỘT mã ở đây là chặn nhầm mọi màn còn lại; quyền đã được
  // `PermissionGuard` chặn ở từng route trước khi component này render.
  return (
    <>
      <PageTitle idLabel={objectName ?? ''} title="Chi tiết lịch sử thay đổi" enableBackButton />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={true}
      >
        {data && <BaseHistoryDetailWrapper historyDetail={data} objectName={setObjectName} />}
      </DetailPageWrapper>
    </>
  )
}

export default BaseHistoryDetailPage
