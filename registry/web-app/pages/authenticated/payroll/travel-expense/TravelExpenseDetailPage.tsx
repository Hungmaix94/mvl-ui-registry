import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useTravelExpenseDetail } from '@/hooks/useTravelExpenseDetail.ts'
import { useTravelExpenseDelete } from '@/features/payroll/travel-expense/_shares/hooks/useTravelExpenseDelete.tsx'
import TravelExpenseDetail from '@/features/payroll/travel-expense/view-details/TravelExpenseDetail.tsx'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'

const TravelExpenseDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { expense, isLoading, isNotFound, isError, expenseId } = useTravelExpenseDetail()

  const { openDeleteDialog } = useTravelExpenseDelete(() => {
    navigate(APP_PATH.TRAVEL_EXPENSE)
  })

  const handleEdit = useCallback(() => {
    const path = APP_PATH.TRAVEL_EXPENSE_EDIT.replace(':id', expenseId.toString())
    navigate(path)
  }, [navigate, expenseId])

  const handleDelete = useCallback(() => {
    if (expense) {
      openDeleteDialog(expense)
    }
  }, [openDeleteDialog, expense])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.TRAVEL_EXPENSE_HISTORY.replace(':id', expenseId.toString())
    navigate(path)
  }, [navigate, expenseId])

  // Dynamic title: "Công tác phí {code}"
  const pageTitle = expense ? `Công tác phí ${expense?.code}` : undefined

  return (
    <>
      <PageTitle
        idLabel={expense?.name}
        enableBackButton
        title={pageTitle}
        handleEdit={ability.can('update', 'payroll.travel_expense') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'payroll.travel_expense') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'payroll.travel_expense') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'payroll.travel_expense')}
      >
        {expense && <TravelExpenseDetail expense={expense} />}
      </DetailPageWrapper>
    </>
  )
}

export default TravelExpenseDetailPage
