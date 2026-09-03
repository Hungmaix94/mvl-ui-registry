import { useWatch, Control } from 'react-hook-form'
import { useMemo } from 'react'
import { AssessmentFormValues, AssessmentItemFormValues } from './schema.ts'

export const useAssessmentScoring = (control: Control<AssessmentFormValues>) => {
  const items = useWatch({ name: 'items', control }) as AssessmentItemFormValues[]

  const scoring = useMemo(() => {
    if (!items || items.length === 0) return { totalEmployee: 0, totalManager: 0, grade: '-' }

    const totalEmployee = items.reduce((sum: number, item) => sum + (item.employee_score || 0), 0)
    const totalManager = items.reduce((sum: number, item) => sum + (item.manager_score || 0), 0)

    // Simple grade calculation (Mock - should match backend logic)
    let grade = '-'
    if (totalManager >= 90) grade = 'A'
    else if (totalManager >= 70) grade = 'B'
    else if (totalManager >= 50) grade = 'C'
    else if (totalManager > 0) grade = 'D'

    return {
      totalEmployee,
      totalManager,
      grade,
    }
  }, [items])

  return scoring
}
