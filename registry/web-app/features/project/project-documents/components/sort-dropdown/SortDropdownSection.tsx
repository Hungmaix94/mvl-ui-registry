import type { ReactNode } from 'react'
import { Flex } from '@radix-ui/themes'

type SectionProps = {
  label: string
  children: ReactNode
}

export default function SortDropdownSection({ label, children }: SectionProps) {
  return (
    <Flex direction="column" gap="0">
      <p className="typo-body-base-semibold text-content-dark-2 mb-0">{label}</p>
      <div className="flex flex-col gap-0">{children}</div>
    </Flex>
  )
}
