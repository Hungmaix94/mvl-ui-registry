import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import CategoryForm from '@/features/elibrary/category/_shares/components/CategoryForm.tsx'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function CategoryCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()

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
        breadcrumb={[
          { label: 'Thư viện số' },
          { label: 'Danh mục', href: APP_PATH.ELIBRARY_CATEGORY },
          { label: 'Tạo mới' },
        ]}
        title="Tạo mới danh mục"
        enableBackButton
        handleBackButton={handleCancel}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <CategoryForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </Flex>
    </>
  )
}
