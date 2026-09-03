import { useCallback, useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import CategoryDetailWrapper from '@/features/elibrary/category/view-details/CategoryDetailWrapper.tsx'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useCategoryDelete } from '@/features/elibrary/category/_shares/hooks/useCategoryDelete'
import { useElibraryCategory } from '@/services/elibrary-service'
import { isNotFoundError } from '@/utils/error-utils'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

export const CategoryDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const categoryId = id ? parseInt(id, 10) : 0
  const { data: categoryResponse, isLoading, error } = useElibraryCategory(categoryId)
  const category = categoryResponse
  const categoryName = useMemo(() => category?.name || 'Chi tiết danh mục', [category?.name])
  const navigate = useNavigate()
  const location = useLocation()

  const handleSuccessDelete = useCallback(() => {
    // Preserve query params when navigating back after delete
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(APP_PATH.ELIBRARY_CATEGORY)
    }
  }, [navigate, location.state])

  const { openDeleteDialog } = useCategoryDelete(handleSuccessDelete)
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !category
  }, [isLoading, error, category])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasReadPermission = ability.can('retrieve', 'elibrary_category')

  const handleEdit = useCallback(() => {
    if (id) {
      const path = APP_PATH.ELIBRARY_CATEGORY_EDIT.replace(':id', id)
      navigate(path, {
        state: { from: window.location.pathname + window.location.search },
      })
    }
  }, [navigate, id])

  const handleDelete = useCallback(() => {
    if (category) {
      openDeleteDialog(category)
    }
  }, [openDeleteDialog, category])

  const handleBackButton = useCallback(() => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(withRememberedSearch(APP_PATH.ELIBRARY_CATEGORY))
    }
  }, [navigate, location.state])

  return (
    <>
      <PageTitle
        title={categoryName}
        handleEdit={ability.can('update', 'elibrary_category') ? handleEdit : undefined}
        enableBackButton={true}
        handleBackButton={handleBackButton}
        handleDelete={ability.can('destroy', 'elibrary_category') ? handleDelete : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={hasReadPermission}
      >
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <CategoryDetailWrapper category={category!} />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default CategoryDetailPage
