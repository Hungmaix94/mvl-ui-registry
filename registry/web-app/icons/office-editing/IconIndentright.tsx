import { TIcon } from '@/types/common.ts'

function IconIndentright({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M21 21H3V19H21V21ZM7 12.5L3 16V9L7 12.5ZM21 16H11V14H21V16ZM21 11H11V9H21V11ZM21 6H3V4H21V6Z" />
    </svg>
  )
}

export { IconIndentright }
