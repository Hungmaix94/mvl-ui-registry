import { IconArrowclockwise, IconCloudslash } from '../../icons'
import { Flex, Text } from '@radix-ui/themes'
import { Button } from '../button'

interface TableErrorProps {
  message?: string
}

const TableError = ({ message = 'Không thể tải dữ liệu' }: TableErrorProps) => {
  return (
    <Flex direction="column" align="center" justify="center" className="h-full p-8">
      <div className="bg-red-10 border-red-30 rounded-full border p-8 text-red-500">
        <IconCloudslash size={72} />
      </div>
      <>
        <Text className="typo-body-xl-semibold text-content-dark-2 pt-6 text-center">
          {message}
        </Text>
        <Text className="typo-body-md text-content-dark-3 py-3 text-center">
          Có lỗi xảy ra trong quá trình kết nối tới máy chủ. Vui lòng kiểm tra lại
          <br />
          đường truyền internet của bạn hoặc thử lại sau vài phút.
        </Text>
      </>
      <Button
        leftIcon={<IconArrowclockwise />}
        onClick={() => window.location.reload()}
        className="flex items-center"
      >
        Thử lại
      </Button>
    </Flex>
  )
}

export default TableError
