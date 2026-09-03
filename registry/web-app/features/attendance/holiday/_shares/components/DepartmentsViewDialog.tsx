import { Flex, Text } from '@radix-ui/themes'

interface Department {
  id: number
  name: string
  code: string
  block?: {
    id: number
    name: string
    code: string
  }
  branch?: {
    id: number
    name: string
    code: string
  }
}

interface DepartmentsViewDialogProps {
  departments: Department[]
}

const DepartmentsViewDialog = ({ departments }: DepartmentsViewDialogProps) => {
  // Group departments by branch -> block
  const groupedData = departments.reduce(
    (acc, dept) => {
      const branchKey = dept.branch?.id || 'no-branch'
      const branchName = dept.branch?.name || 'Khác'

      if (!acc[branchKey]) {
        acc[branchKey] = {
          branchName,
          blocks: {},
        }
      }

      const blockKey = dept.block?.id || 'no-block'
      const blockName = dept.block?.name || 'Khác'

      if (!acc[branchKey].blocks[blockKey]) {
        acc[branchKey].blocks[blockKey] = {
          blockName,
          departments: [],
        }
      }

      acc[branchKey].blocks[blockKey].departments.push(dept)

      return acc
    },
    {} as Record<
      string,
      {
        branchName: string
        blocks: Record<string, { blockName: string; departments: Department[] }>
      }
    >
  )

  return (
    <Flex direction="column" gap="4" className="max-h-[500px] w-full overflow-y-auto">
      {Object.entries(groupedData).map(([branchKey, branchData]) => (
        <Flex key={branchKey} direction="column" gap="3">
          <Text className="typo-body-lg-semibold text-content-dark-1">{branchData.branchName}</Text>

          {Object.entries(branchData.blocks).map(([blockKey, blockData]) => (
            <Flex key={blockKey} direction="column" gap="2" className="pl-4">
              <Text className="typo-body-base-semibold text-content-dark-2">
                {blockData.blockName}
              </Text>

              <Flex direction="column" gap="1" className="pl-4">
                {blockData.departments.map((dept) => (
                  <Flex key={dept.id} align="center" gap="2" className="py-1">
                    <div className="bg-primary-purple-500 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                    <Text className="typo-body-base-regular text-content-dark-3">
                      {dept.name} - {dept.code}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Flex>
          ))}
        </Flex>
      ))}
    </Flex>
  )
}

export default DepartmentsViewDialog
