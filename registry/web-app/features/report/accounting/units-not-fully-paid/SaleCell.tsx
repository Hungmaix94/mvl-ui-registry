import EmployeeProfileLink from '@/components/commons/EmployeeProfileLink'
import type { UnitsNotFullyPaidSale } from '@/features/accounting/reports/services/report-service'
import { APP_PATH } from '@/routes'

import { formatParticipationPct } from './cell-formatters'

/** Link ra trang chi tiết đối tượng — cùng style với `EmployeeProfileLink` để ba loại sale
 *  trông như nhau, không phải mỗi loại một màu. */
const LINK_CLASS = 'text-action-primary-red-default break-words hover:underline'

type SalePermissions = {
  canViewCollaborator: boolean
  canViewExchange: boolean
}

/**
 * Tên một sale, dạng text link mở trang chi tiết ở TAB MỚI.
 *
 * Chọn đích theo id nào được set chứ không theo loại khai báo — xem `UnitsNotFullyPaidSale`.
 * Nhân viên MV dùng lại `EmployeeProfileLink` (component dùng chung, tự gate `employee.retrieve`);
 * CTV và sàn F2 build link inline vì chưa có component tương đương, gate bằng cờ tính sẵn ở
 * bảng cha (1 lần cho cả bảng, không hỏi `ability` lại ở từng ô).
 *
 * Không đủ quyền hoặc thiếu id ⇒ trả text thường. KHÔNG bao giờ render link dẫn tới trang mà
 * người dùng sẽ bị chặn — thà không có link còn hơn link chết.
 */
function SaleIdentityLink({
  sale,
  canViewCollaborator,
  canViewExchange,
}: { sale: UnitsNotFullyPaidSale } & SalePermissions) {
  if (sale.employee_id) {
    return (
      <EmployeeProfileLink employeeId={sale.employee_id} className="break-words">
        {sale.name}
      </EmployeeProfileLink>
    )
  }

  if (sale.collaborator_id && canViewCollaborator) {
    return (
      <a
        href={APP_PATH.COLLABORATOR_DETAIL.replace(':id', String(sale.collaborator_id))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={LINK_CLASS}
      >
        {sale.name}
      </a>
    )
  }

  if (sale.exchange_id && canViewExchange) {
    return (
      <a
        href={APP_PATH.EXCHANGE_MANAGEMENT_DETAIL.replace(':id', String(sale.exchange_id))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={LINK_CLASS}
      >
        {sale.name}
      </a>
    )
  }

  return <span className="break-words">{sale.name}</span>
}

/**
 * Ô "Sale" — mỗi người bán một khối, theo mẫu `SellerList` của màn "Chia HH theo tháng"
 * (`WorksheetParticipantCells.tsx`; trước 20/08/2026 mẫu đó tên là `SalesParticipantList` và
 * được khai tại chỗ trong `CommissionSplitTable`).
 *
 * Tên bên trái, tỷ lệ tham gia dồn về mép phải nên các tỷ lệ thẳng hàng dọc — liếc một cái là
 * đối chiếu được tổng 100%. Phòng ban nằm dòng dưới, cỡ nhỏ và có nhãn để không lẫn với tên.
 */
export default function SaleCell({
  sales,
  canViewCollaborator,
  canViewExchange,
}: { sales: UnitsNotFullyPaidSale[] } & SalePermissions) {
  if (!sales.length) {
    return <span className="text-content-dark-3 text-xs">—</span>
  }

  return (
    <div className="flex flex-col gap-2 py-1">
      {sales.map((sale, index) => {
        const pct = formatParticipationPct(sale)
        return (
          <div key={`${index}-${sale.name}`}>
            <div className="flex items-baseline justify-between gap-2">
              {/* Màu đặt ở đây chứ không ở từng nhánh của `SaleIdentityLink`: nhánh có link tự
                  ghi đè bằng màu link, còn HAI nhánh text thường (thiếu quyền / thiếu id) nhờ
                  vậy luôn cùng một màu, không lệch nhau. */}
              <span className="text-content-dark-1 text-sm font-medium">
                <SaleIdentityLink
                  sale={sale}
                  canViewCollaborator={canViewCollaborator}
                  canViewExchange={canViewExchange}
                />
              </span>
              {/* `tabular-nums` để "60%" và "33,33%" không xô lệch nhau; `shrink-0` để tên dài
                  không bóp nó méo. Không bọc nền: `bg-background-2` là #f9f9f9, trên nền trắng
                  chỉ tổ thêm padding. Đậm hơn dòng phòng ban vì tỷ lệ là số liệu, không phải
                  metadata. */}
              {pct && (
                <span className="text-content-dark-1 shrink-0 text-xs font-semibold tabular-nums">
                  {pct}
                </span>
              )}
            </div>
            {sale.department && (
              // 11px + `content-dark-2` theo đúng `SellerList`: `-3` (#8c8c8c) ở cỡ
              // này chỉ đạt ~3:1 tương phản, dưới ngưỡng đọc được.
              <div className="text-content-dark-2 mt-0.5 text-[11px] leading-snug">
                Phòng ban: {sale.department}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
