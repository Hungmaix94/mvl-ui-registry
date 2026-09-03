import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import AttendanceDeviceForm from '@/features/attendance/device/_shares/components/AttendanceDeviceForm.tsx'

const AttendanceDeviceCreatePage = () => {
  return (
    <>
      <PageTitle enableBackButton title="Tạo thiết bị chấm công mới" />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <AttendanceDeviceForm mode="create" deviceLoading={false} />
      </Flex>
    </>
  )
}

export default AttendanceDeviceCreatePage
