import { Employee } from '@/services'
import RecordDetail from '@/features/employee/management/_shares/components/RecordDetail.tsx'
import { Grid } from '@radix-ui/themes'

const EmergencyContact = ({ employee }: { employee: Employee }) => {
  return (
    <>
      <div className="flex flex-col gap-5">
        <h2 className="text-content-dark-primary text-lg font-semibold">
          Thông tin liên hệ khẩn cấp
        </h2>

        <Grid columns={'2'} gap={'9'} width={'100%'}>
          <RecordDetail
            label="Họ và tên"
            content={employee.emergency_contact_name || '-'}
            isShowSeparator={false}
          />

          <RecordDetail
            label="Số điện thoại"
            content={employee.emergency_contact_phone || '-'}
            isShowSeparator={false}
          />
        </Grid>
      </div>
    </>
  )
}

export default EmergencyContact
