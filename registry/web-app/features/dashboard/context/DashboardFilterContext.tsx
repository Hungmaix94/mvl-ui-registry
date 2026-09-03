import { createContext, useContext } from 'react'
import type { RecruitmentDashboardFilterFormValues } from '../components/recruitment/RecruitmentDashboardFilterForm.tsx'

type DashboardFilterContextType = {
  dashboardFilter: RecruitmentDashboardFilterFormValues | null
  dashboardFilterVersion: number
}

const DashboardFilterContext = createContext<DashboardFilterContextType | undefined>(undefined)

export function useDashboardFilterContext() {
  const context = useContext(DashboardFilterContext)
  if (context === undefined) {
    throw new Error('useDashboardFilterContext must be used within DashboardFilterProvider')
  }
  return context
}

export const DashboardFilterProvider = DashboardFilterContext.Provider
