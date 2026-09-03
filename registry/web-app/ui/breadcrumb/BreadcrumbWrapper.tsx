import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './Breadcrumb'
import { generateBreadcrumbItems } from '@/routes/AppRoute'
// File hằng chứ không phải barrel `@/routes` — barrel nhập ngược `AppRoute.tsx` vốn đang nhập
// chính file này, và vòng lặp đó làm `APP_PATH` là `undefined` lúc dựng FORBIDDEN_NAVIGATE_ROUTES.
import { APP_PATH } from '@/routes/AppRoute.constant'
import { withRememberedSearch } from '@/utils/list-url-memory'

export interface BreadcrumbItemData {
  label: React.ReactNode
  href?: string
  isCurrentPage?: boolean
}

export interface BreadcrumbWrapperProps {
  items?: BreadcrumbItemData[]
  pathname?: string
  className?: string
  separator?: React.ReactNode
}

const FORBIDDEN_NAVIGATE_ROUTES = [
  APP_PATH.REPORT_RECRUITMENT,
  APP_PATH.REPORT_STAFF,
  APP_PATH.REPORT_ATTENDANCE,
  APP_PATH.REPORT_ACCOUNTING,
  APP_PATH.PROPOSAL_MANAGEMENT,
  APP_PATH.CONTRACT_EVALUATION,
  APP_PATH.ACCOUNTING_CONFIG,
  APP_PATH.ACCOUNTING_COLLABORATOR,
  APP_PATH.ACCOUNTING_COMMISSION,
  APP_PATH.ACCOUNTING_COMMISSION_SALE,
  APP_PATH.ACCOUNTING_COMMISSION_MANAGEMENT,
  APP_PATH.SALES_CONTRACTS_TRANSACTIONS,
  APP_PATH.PROJECT_ADMIN,
  APP_PATH.ELIBRARY,
  APP_PATH.ACCOUNTING_TRANSACTION,
] as Array<string>

const BreadcrumbWrapper = React.forwardRef<HTMLElement, BreadcrumbWrapperProps>(
  ({ items, pathname, className, separator, ...props }, ref) => {
    const breadcrumbItems = useMemo(
      () =>
        (items || (pathname ? generateBreadcrumbItems(pathname) : [])).map((item, index) => {
          if (index === 1 && !!item.href && FORBIDDEN_NAVIGATE_ROUTES.includes(item.href)) {
            item.href = undefined
          }
          return item
        }),
      [items, pathname]
    )

    return (
      <Breadcrumb ref={ref} className={cn('font-inter', className)} {...props}>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {item.isCurrentPage ? (
                  <BreadcrumbPage
                    className={cn(
                      'text-content-dark-1',
                      'typo-body-base-semibold',
                      'cursor-default'
                    )}
                  >
                    {item.label}
                  </BreadcrumbPage>
                ) : item.href && index !== 0 ? (
                  <BreadcrumbLink
                    asChild
                    className={cn(
                      'text-content-dark-3 hover:text-content-dark-1',
                      'typo-body-base-semibold',
                      'transition-colors',
                      'cursor-pointer'
                    )}
                  >
                    {/*
                      Ghép lại bộ lọc đã nhớ của màn danh sách: href của breadcrumb luôn là
                      đường dẫn TRẦN, nên nếu không ghép thì bấm breadcrumb để về danh sách
                      cũng mất bộ lọc y như nút back từng mắc.
                    */}
                    <Link to={withRememberedSearch(item.href)}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="text-content-dark-3 typo-body-base-semibold cursor-default">
                    {item.label}
                  </span>
                )}
              </BreadcrumbItem>
              {/* Always show separator after each item, exclude the last one */}
              {index < breadcrumbItems.length - 1 && (
                <BreadcrumbSeparator>{separator || '/'}</BreadcrumbSeparator>
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    )
  }
)

BreadcrumbWrapper.displayName = 'BreadcrumbWrapper'

export default BreadcrumbWrapper
