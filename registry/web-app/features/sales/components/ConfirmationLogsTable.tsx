import { Table } from '@radix-ui/themes'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant } from '@/api/schema'
import { formatDate } from '@/utils/date-utils'
import { ReferenceCode } from '@/components/commons'

const CONFIRMATION_TYPE_ROLES: Record<string, string> = {
  sale: 'Nhân viên sale',
  manager: 'Trưởng phòng kinh doanh',
  admin: 'Thư ký kinh doanh (Admin)',
  admin_lead: 'Trưởng nhóm Admin (Admin Lead)',
  accountant: 'Kế toán',
  treasurer: 'Thủ quỹ',
}

export interface ConfirmationLogEntry {
  id: number
  employee_detail?: {
    id?: number
    fullname?: string
    username?: string
    code?: string
    department?: { id?: number; name?: string }
    position?: { id?: number; name?: string }
    branch?: { id?: number; name?: string }
  }
  confirmation_type?: string
  performed_at?: string
  is_approved?: boolean
  note?: string
}

export interface ConfirmationLogsTableProps {
  logs: ConfirmationLogEntry[]
  /**
   * Nhãn vai trò theo domain — mỗi loại phiếu có bộ `confirmation_type` riêng.
   * Phiếu hỗ trợ phí có thêm `creator` / `sale_director` mà bảng mặc định không
   * biết, và nhãn chuẩn nằm ở app-constant chứ không phải hardcode ở đây.
   * Truyền vào thì GỘP đè lên bộ mặc định, nên key nào thiếu vẫn có nhãn cũ đỡ.
   */
  roleLabels?: Record<string, string>
}

export const ConfirmationLogsTable = ({ logs, roleLabels }: ConfirmationLogsTableProps) => {
  const roleMap = roleLabels
    ? { ...CONFIRMATION_TYPE_ROLES, ...roleLabels }
    : CONFIRMATION_TYPE_ROLES
  return (
    <div className="border-border-1 overflow-hidden border">
      <Table.Root className="w-full border-collapse">
        <Table.Header className="border-border-1 bg-background-2 border-b">
          <Table.Row>
            <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]">
              Người xác nhận
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]">
              Thời gian
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]">
              Trạng thái
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium px-3 py-3 text-left align-middle text-[#4B4B4B]">
              Ghi chú
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {logs && logs.length > 0 ? (
            logs.map((log) => {
              const employeeLink = log.employee_detail?.id
                ? `/employee/management/${log.employee_detail.id}`
                : '#'

              const positionName = log.employee_detail?.position?.name
              const departmentName = log.employee_detail?.department?.name
              const roleName = log.confirmation_type
                ? roleMap[log.confirmation_type] || log.confirmation_type
                : ''

              return (
                <Table.Row key={log.id}>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-left align-middle">
                    <div className="flex flex-col gap-1 py-1">
                      {log.employee_detail?.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-content-dark-1 font-semibold">
                            {log.employee_detail?.fullname || '-'}
                          </span>
                          <ReferenceCode
                            code={log.employee_detail?.code || log.employee_detail?.username}
                            linkTo={employeeLink}
                          />
                        </div>
                      ) : (
                        <span className="text-content-dark-1 font-semibold">
                          {log.employee_detail?.fullname ||
                            log.employee_detail?.username ||
                            roleName ||
                            '-'}
                        </span>
                      )}
                      {(positionName ||
                        departmentName ||
                        (log.employee_detail?.id && roleName)) && (
                        <span className="text-content-dark-3 text-sm">
                          {[log.employee_detail?.id ? roleName : null, positionName, departmentName]
                            .filter(Boolean)
                            .join(' - ')}
                        </span>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-left align-middle">
                    {log.performed_at ? formatDate(log.performed_at, 'dd/MM/yyyy HH:mm') : '-'}
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular border-r px-3 py-2 text-left align-middle">
                    <Chip
                      label={
                        log.is_approved === true
                          ? 'Đã xác nhận'
                          : log.is_approved === false
                            ? 'Từ chối'
                            : 'Chờ duyệt'
                      }
                      variant={
                        log.is_approved === true
                          ? ColoredValueVariant.GREEN
                          : log.is_approved === false
                            ? ColoredValueVariant.RED
                            : ColoredValueVariant.YELLOW
                      }
                      size="small"
                    />
                  </Table.Cell>
                  <Table.Cell className="border-border-1 typo-body-base-regular px-3 py-2 text-left align-middle">
                    {log.note || '-'}
                  </Table.Cell>
                </Table.Row>
              )
            })
          ) : (
            <Table.Row>
              <Table.Cell colSpan={4} className="text-content-dark-3 px-3 py-4 text-center">
                Không có dữ liệu
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </div>
  )
}
