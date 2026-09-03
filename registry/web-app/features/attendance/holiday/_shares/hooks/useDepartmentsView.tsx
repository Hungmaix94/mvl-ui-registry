import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import DepartmentsViewDialog from '../components/DepartmentsViewDialog.tsx'

interface Department {
  id: number
  name: string
  code: string
  block?: {
    id: number
    name: string
    code: string
  }
  branch?: {
    id: number
    name: string
    code: string
  }
}

export const useDepartmentsView = () => {
  const { displayCustom } = useDialog()

  const openViewDialog = useCallback(
    (departments: Department[]) => {
      displayCustom({
        title: 'Đơn vị áp dụng',
        content: <DepartmentsViewDialog departments={departments} />,
        hideFooter: true,
      })
    },
    [displayCustom]
  )

  return { openViewDialog }
}
