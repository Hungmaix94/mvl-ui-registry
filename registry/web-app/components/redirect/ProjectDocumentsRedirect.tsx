import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { PAGE_SIZE } from '@/constants/table'
import { PROJECT_DETAIL_TAB } from '@/constants/project'

const DEFAULT_DOCUMENTS_PARAMS = {
  tab: PROJECT_DETAIL_TAB.DOCUMENTS,
  page: '1',
  page_size: String(PAGE_SIZE),
}

export default function ProjectDocumentsRedirect() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const path = id
    ? APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', id)
    : APP_PATH.PROJECT_MANAGEMENT

  const merged = new URLSearchParams(DEFAULT_DOCUMENTS_PARAMS)
  searchParams.forEach((value, key) => {
    merged.set(key, value)
  })
  const search = merged.toString()

  const to = search ? `${path}?${search}` : path
  return <Navigate to={to} replace />
}
