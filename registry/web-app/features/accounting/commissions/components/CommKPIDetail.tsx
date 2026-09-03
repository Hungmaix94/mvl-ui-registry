import AppDialog from '@/components/dialog/AppDialog'
import { KpiCommissionStructure } from '@/features/accounting/kpi-commission-structures/services/kpi-commission-structure-service'
import { Flex, Text, Grid, Table } from '@radix-ui/themes'

type Props = {
  isOpen: boolean
  onClose: () => void
  data: KpiCommissionStructure | null
}

export const CommKPIDetail = ({ isOpen, onClose, data }: Props) => {
  if (!data) return null

  return (
    <AppDialog
      variant="custom"
      open={isOpen}
      onOpenChange={(open: boolean) => !open && onClose()}
      title="Chi tiết cấu trúc KPI HH"
      onCancel={onClose}
      onConfirm={() => {}}
      isHideCancelButton={false}
      content={
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="4">
            <Flex direction="column">
              <Text size="2" color="gray">
                Mã cấu trúc
              </Text>
              <Text size="3" weight="medium">
                {data.code}
              </Text>
            </Flex>
            <Flex direction="column">
              <Text size="2" color="gray">
                Tên cấu trúc
              </Text>
              <Text size="3" weight="medium">
                {data.name}
              </Text>
            </Flex>
            <Flex direction="column">
              <Text size="2" color="gray">
                Chức danh
              </Text>
              <Text size="3" weight="medium">
                {data.target_role}
              </Text>
            </Flex>
            <Flex direction="column">
              <Text size="2" color="gray">
                Trạng thái
              </Text>
              <Text size="3" weight="medium">
                {data.status}
              </Text>
            </Flex>
            <Flex direction="column">
              <Text size="2" color="gray">
                Hiệu lực từ
              </Text>
              <Text size="3" weight="medium">
                {data.effective_from}
              </Text>
            </Flex>
            <Flex direction="column">
              <Text size="2" color="gray">
                Hiệu lực đến
              </Text>
              <Text size="3" weight="medium">
                {data.effective_to || '-'}
              </Text>
            </Flex>
          </Grid>

          <Text size="3" weight="bold" mt="4">
            Mức hoa hồng theo KPI
          </Text>
          <div className="border-border-1 overflow-hidden rounded-md border">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Ngưỡng đạt KPI (Từ %)</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Ngưỡng đạt KPI (Đến %)</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Hoa hồng (%)</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Ghi chú</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.tiers && data.tiers.length > 0 ? (
                  data.tiers.map((tier) => (
                    <Table.Row key={tier.id}>
                      <Table.Cell>{tier.min_completion_pct}</Table.Cell>
                      <Table.Cell>{tier.max_completion_pct || '-'}</Table.Cell>
                      <Table.Cell>{tier.commission_pct}</Table.Cell>
                      <Table.Cell>{tier.note || '-'}</Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell colSpan={4} className="py-4 text-center text-gray-500">
                      Chưa có cấu hình mức hoa hồng
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </div>
        </Flex>
      }
    />
  )
}
