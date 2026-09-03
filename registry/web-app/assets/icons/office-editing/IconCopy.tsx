import { TIcon } from '@/types/common.ts'

function IconCopy({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M20.25 2.99902C20.6641 2.99902 20.9999 3.33492 21 3.74902V15.749C21 16.1632 20.6642 16.499 20.25 16.499H16.5V20.25C16.4997 20.664 16.1641 21 15.75 21H3.75C3.33595 21 3.00026 20.664 3 20.25V8.25C3 7.83579 3.33579 7.5 3.75 7.5H7.5V3.74902C7.50013 3.33492 7.83587 2.99902 8.25 2.99902H20.25ZM4.5 19.5H15V9H4.5V19.5ZM9 7.5H15.75C16.1642 7.5 16.5 7.83579 16.5 8.25V14.999H19.5V4.49902H9V7.5Z" />
    </svg>
  )
}

export { IconCopy }
