import { Text } from '@radix-ui/themes'
import RecordDetail from '@/features/employee/management/_shares/components/RecordDetail.tsx'
import type { Employee } from '@/features/employee/services/employee-service'

type TimesheetEntryEmployeeSectionProps = {
  employee?: Employee
}

const TimesheetEntryEmployeeSection = ({ employee }: TimesheetEntryEmployeeSectionProps) => {
  return (
    <section className="flex flex-col gap-1 pr-0">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin nhân viên</Text>
      <div className="bg-background-1 flex flex-col py-0">
        <RecordDetail label="Mã nhân viên" content={employee?.code || '-'} />
        <RecordDetail label="Tên nhân viên" content={employee?.fullname || '-'} />
        <RecordDetail label="Chức vụ" content={employee?.position?.name || '-'} />
        <RecordDetail label="Chi nhánh" content={employee?.branch?.name || '-'} />
        <RecordDetail label="Khối" content={employee?.block?.name || '-'} />
        <RecordDetail
          label="Phòng ban"
          content={employee?.department?.name || '-'}
          isShowSeparator={false}
        />
      </div>
    </section>
  )
}

export default TimesheetEntryEmployeeSection
