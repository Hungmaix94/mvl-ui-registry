import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Employee } from '@/services'
import { Box, Flex, Grid } from '@radix-ui/themes'
import EmployeeAvatar from '@/features/employee/management/view-details/tab-general/EmployeeAvatar.tsx'
import RecordDetail from '@/features/employee/management/_shares/components/RecordDetail.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useMemo } from 'react'
import { parseDateTimeFromApi } from '@/utils/date-utils.ts'
import { EmployeeStatus } from '@/constants/api-schema-aliases'

const BasicInfo = ({
  employee,
  formatDate,
}: {
  employee: Employee
  formatDate: (dateString: string | null | undefined) => string
}) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE,
      APP_CONSTANT_KEY.EMPLOYEE.RESIGNATION_REASON,
      APP_CONSTANT_KEY.EMPLOYEE.STATUS,
    ],
  })
  const employeeTypeLabels = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE) || {},
    [keysMap]
  )
  const employeeResignationReasonLabels = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.RESIGNATION_REASON) || {},
    [keysMap]
  )
  const employeeStatusLabels = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.STATUS) || {},
    [keysMap]
  )

  return (
    <>
      <div className="flex flex-col gap-5">
        <h2 className="text-content-dark-primary text-lg font-semibold">Thông tin nhân sự</h2>

        <Grid columns={'2'} gap={'9'} width={'100%'}>
          <div className="flex flex-col items-start">
            <RecordDetail label="Mã nhân viên" content={employee.code || '-'} />

            <RecordDetail
              label="Loại mã nhân viên"
              content={
                <Chip
                  variant={employee.colored_code_type?.variant || ColoredValueVariant.GREY}
                  label={employee.colored_code_type?.value || '-'}
                />
              }
            />

            <RecordDetail label="Họ và tên" content={employee.fullname || '-'} />

            <RecordDetail label="Tài khoản đăng nhập" content={employee.username || '-'} />

            <RecordDetail label="Email" content={employee.email || '-'} />

            <RecordDetail label="Chi nhánh" content={employee.branch?.name || '-'} />

            <RecordDetail label="Khối" content={employee.block?.name || '-'} />

            <RecordDetail label="Phòng ban" content={employee.department?.name || '-'} />

            <RecordDetail label="Chức vụ" content={employee.position?.name || '-'} />

            <RecordDetail label="Ghi chú" content={employee.note || '-'} isShowSeparator={false} />
          </div>

          <div className="flex grow flex-col items-start">
            <Grid columns={'3'} width={'100%'} gap={'4'}>
              <Box gridColumnStart={'1'} gridColumnEnd={'3'}>
                <RecordDetail label="Mã chấm công" content={employee.attendance_code || '-'} />

                <RecordDetail
                  label="Loại nhân viên"
                  content={
                    employeeTypeLabels[employee.employee_type || ''] || employee.employee_type
                  }
                />

                <RecordDetail
                  label="Trạng thái"
                  content={
                    <Chip
                      label={
                        employeeStatusLabels[employee.colored_status?.value] ||
                        employee.colored_status?.value
                      }
                      variant={employee.colored_status?.variant}
                    />
                  }
                />

                <RecordDetail label="Ngày bắt đầu" content={formatDate(employee.start_date)} />
              </Box>

              <Flex
                gridColumn={'3'}
                align={'center'}
                justify={'center'}
                direction={'column'}
                gap={'2'}
              >
                <EmployeeAvatar employee={employee} />
              </Flex>
            </Grid>

            <RecordDetail
              label="Ngày nghỉ việc"
              content={formatDate(employee.resignation_start_date)}
            />

            <RecordDetail
              label="Lý do nghỉ việc"
              content={employeeResignationReasonLabels[employee.resignation_reason || ''] || '-'}
            />

            {employee.colored_status?.value === EmployeeStatus.Resigned && (
              <RecordDetail
                label="Thời gian gửi thư CDHĐLĐ"
                content={parseDateTimeFromApi(employee.termination_notice_sent_at)}
              />
            )}

            {employee.colored_status?.value === EmployeeStatus.Resigned && (
              <RecordDetail
                label="Bàn giao nghỉ việc"
                content={
                  <Chip
                    label={employee.handover_completed ? 'Đã hoàn tất' : 'Chưa hoàn tất'}
                    variant={
                      employee.handover_completed
                        ? ColoredValueVariant.GREEN
                        : ColoredValueVariant.RED
                    }
                    size="small"
                  />
                }
              />
            )}

            <RecordDetail
              label="Ứng viên liên kết"
              content={
                employee.recruitment_candidate?.code && employee.recruitment_candidate?.name
                  ? `${employee.recruitment_candidate.code} - ${employee.recruitment_candidate.name}`
                  : '-'
              }
            />

            <RecordDetail
              label="Người liên hệ"
              content={employee.recruitment_candidate?.contact_person?.trim() ?? '-'}
            />

            <RecordDetail
              label="Người giới thiệu"
              content={employee.recruitment_candidate?.referrer?.trim() ?? '-'}
            />

            <RecordDetail
              label="Ngày cập nhật cuối cùng"
              content={formatDate(employee.updated_at)}
            />

            <RecordDetail
              label="Ngày tạo"
              content={formatDate(employee.created_at)}
              isShowSeparator={false}
            />
          </div>
        </Grid>
      </div>
    </>
  )
}

export default BasicInfo
