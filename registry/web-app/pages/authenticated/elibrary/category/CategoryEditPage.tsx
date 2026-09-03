import { useCallback, useMemo } from 'react'
import { PageTitle } from '@/components/ui'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import CategoryForm from '@/features/elibrary/category/_shares/components/CategoryForm.tsx'
import { APP_PATH } from '@/routes'
import { useElibraryCategory } from '@/services/elibrary-service'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function CategoryEditPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const categoryId = id ? parseInt(id, 10) : 0

  const { data: categoryResponse, isLoading, error } = useElibraryCategory(categoryId)
  const category = useMemo(() => categoryResponse, [categoryResponse])
  const ability = useAbility()

  const isNotFound = useMemo(() => {
    return !isLoading && !error && !category
  }, [isLoading, error, category])

  const hasPermission = ability.can('update', 'elibrary_category')

  const handleSuccess = useCallback(() => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(APP_PATH.ELIBRARY_CATEGORY)
    }
  }, [navigate, location.state])

  const handleCancel = useCallback(() => {
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
        title="Chỉnh sửa danh mục"
        enableBackButton
        handleBackButton={handleCancel}
        idLabel={category?.name}
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        hasPermission={hasPermission}
      >
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <CategoryForm initialData={category} onSuccess={handleSuccess} onCancel={handleCancel} />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}
