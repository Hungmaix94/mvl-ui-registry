import { Flex } from '@radix-ui/themes'

import type { ApiBlocker } from '@/utils/error-utils'

type Props = {
  /** Why the action was refused, e.g. "Chưa huỷ được hợp đồng cọc vì". */
  heading: string
  items: ApiBlocker[]
}

/**
 * Danh sách lý do một thao tác bị chặn, kèm việc phải làm trước.
 *
 * Dùng chung cho mọi luồng trả về `blockers[]` — hoàn tác đối chiếu CĐT về nháp và
 * hủy/hoàn cọc khi hóa đơn đầu ra đang vướng (bug 86expaf56). Luôn hiện `remediation`:
 * một lý do mà người dùng không biết phải làm gì tiếp là ngõ cụt.
 */
const BlockerList = ({ heading, items }: Props) => (
  <Flex direction="column" gap="3">
    <span className="typo-body-base-semibold text-content-dark-1">{heading}</span>
    {items.map((blocker, index) => (
      <div
        key={`${blocker.code}-${index}`}
        className="border-data-red-default bg-data-red-disabled rounded-md border-l-4 px-4 py-3"
      >
        <p className="typo-body-base-semibold text-content-dark-1">{blocker.title}</p>
        <p className="typo-body-sm-regular text-content-dark-2 mt-1">{blocker.detail}</p>
        {blocker.remediation ? (
          <p className="typo-body-sm-semibold text-content-dark-1 mt-2">
            Cần làm: {blocker.remediation}
          </p>
        ) : null}
      </div>
    ))}
  </Flex>
)

export default BlockerList
