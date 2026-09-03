import { TIcon } from '@/types/common.ts'

function IconChartbarhorizontal({
  size = 24,
  color = 'currentColor',
  title = '',
  ...props
}: TIcon) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M3.75 3C4.16421 3 4.5 3.33579 4.5 3.75V4.5H15.75C16.1642 4.5 16.5 4.83579 16.5 5.25V9H20.25C20.6642 9 21 9.33579 21 9.75V14.25C21 14.6642 20.6642 15 20.25 15H13.5V18.75C13.5 19.1642 13.1642 19.5 12.75 19.5H4.5V20.25C4.5 20.6642 4.16421 21 3.75 21C3.33579 21 3 20.6642 3 20.25V3.75C3 3.33579 3.33579 3 3.75 3ZM4.5 15V18H12V15H4.5ZM4.5 13.5H19.5V10.5H4.5V13.5ZM4.5 9H15V6H4.5V9Z" />
    </svg>
  )
}

export { IconChartbarhorizontal }
