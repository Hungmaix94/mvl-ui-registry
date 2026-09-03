import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useRecruitmentExpenseDetail } from '@/hooks/useRecruitmentExpenseDetail.ts'
import { useRecruitmentExpenseDelete } from '@/features/recruitment/cost/_shares/hooks/useRecruitmentExpenseDelete.tsx'
import RecruitmentExpenseDetail from '@/features/recruitment/cost/view-details/RecruitmentExpenseDetail.tsx'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'

const RecruitmentExpenseDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { expense, isLoading, isNotFound, isError, expenseId } = useRecruitmentExpenseDetail()

  const { openDeleteDialog } = useRecruitmentExpenseDelete(() => {
    navigate(APP_PATH.RECRUITMENT_EXPENSE)
  })

  const handleEdit = useCallback(() => {
    const path = APP_PATH.RECRUITMENT_EXPENSE_EDIT.replace(':id', expenseId.toString())
    navigate(path)
  }, [navigate, expenseId])

  const handleDelete = useCallback(() => {
    if (expense) {
      openDeleteDialog(expense)
    }
  }, [openDeleteDialog, expense])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.RECRUITMENT_EXPENSE_HISTORY.replace(':id', expenseId.toString())
    navigate(path)
  }, [navigate, expenseId])

  // Dynamic title: "Chi phí tuyển dụng {code}"
  const pageTitle = expense ? `Chi phí tuyển dụng ${expense?.recruitment_source?.name}` : undefined

  return (
    <>
      <PageTitle
        idLabel={expense?.recruitment_source?.name}
        enableBackButton
        title={pageTitle}
        handleEdit={ability.can('update', 'recruitment_expense') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'recruitment_expense') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'recruitment_expense') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'recruitment_expense')}
      >
        {expense && <RecruitmentExpenseDetail expense={expense} />}
      </DetailPageWrapper>
    </>
  )
}

export default RecruitmentExpenseDetailPage
