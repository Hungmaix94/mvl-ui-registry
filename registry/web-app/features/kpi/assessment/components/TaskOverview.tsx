import { Flex, Text } from '@radix-ui/themes'

interface TaskSectionProps {
  title: string
  content?: string | null
}

const TaskSection = ({ title, content }: TaskSectionProps) => {
  return (
    <Flex
      direction="row"
      align="start"
      gap="5"
      className="border-border-1 w-full border-b py-4 last:border-b-0"
    >
      <Text className="text-content-dark-2 typo-body-base-medium w-[168px] min-w-[168px] shrink-0">
        {title}
      </Text>
      <div className="flex-1">
        <Text className="text-content-dark-1 typo-body-lg-regular block whitespace-pre-wrap">
          {content || '-'}
        </Text>
      </div>
    </Flex>
  )
}

interface TaskOverviewProps {
  planTasks?: string | null
  extraTasks?: string | null
  proposal?: string | null
}

export const TaskOverview = ({ planTasks, extraTasks, proposal }: TaskOverviewProps) => {
  return (
    <Flex direction="column" gap="9" className="w-full">
      {/* Các công việc thực hiện trong tháng */}
      <Flex direction="column" gap="1">
        <Text className="text-content-dark-1 typo-body-xl-semibold">
          Các công việc thực hiện trong tháng
        </Text>
        <Flex direction="column" className="w-full">
          <TaskSection title="Công việc được giao trong kế hoạch" content={planTasks} />
          <TaskSection
            title="Công việc do lãnh đạo phát sinh thêm ngoài kế hoạch"
            content={extraTasks}
          />
        </Flex>
      </Flex>

      {/* Kiến nghị/Đề xuất */}
      <Flex direction="column" gap="1">
        <Text className="text-content-dark-1 typo-body-xl-semibold">Kiến nghị/Đề xuất</Text>
        <TaskSection title="Nội dung" content={proposal} />
      </Flex>
    </Flex>
  )
}
