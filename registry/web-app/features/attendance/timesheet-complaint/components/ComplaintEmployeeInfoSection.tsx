import { Flex, Grid, Text } from '@radix-ui/themes'
import RecordDetail from '@/features/employee/management/_shares/components/RecordDetail.tsx'
import type { Employee } from '@/features/employee/services/employee-service'

type TimesheetEntryEmployeeSectionProps = {
  employee?: Employee
}

const ComplaintEmployeeInfoSection = ({ employee }: TimesheetEntryEmployeeSectionProps) => {
  return (
    <section className="flex flex-col gap-1 pr-0">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin nhân viên</Text>
      <Grid columns={{ xs: '1', md: '2' }} gap={'4'}>
        <Flex direction={'column'}>
          <RecordDetail label="Mã nhân viên" content={employee?.code || '-'} />
          <RecordDetail label="Tên nhân viên" content={employee?.fullname || '-'} />
          <RecordDetail
            label="Chức vụ"
            content={employee?.position?.name || '-'}
            isShowSeparator={false}
          />
        </Flex>
        <Flex direction={'column'}>
          <RecordDetail label="Chi nhánh" content={employee?.branch?.name || '-'} />
          <RecordDetail label="Khối" content={employee?.block?.name || '-'} />
          <RecordDetail
            label="Phòng ban"
            content={employee?.department?.name || '-'}
            isShowSeparator={false}
          />
        </Flex>
      </Grid>
    </section>
  )
}

export default ComplaintEmployeeInfoSection
