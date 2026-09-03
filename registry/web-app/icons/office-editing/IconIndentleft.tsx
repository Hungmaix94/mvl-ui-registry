import { TIcon } from '@/types/common.ts'

function IconIndentleft({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M21 21H3V19H21V21ZM7 16L3 12.5L7 9V16ZM21 16H11V14H21V16ZM21 11H11V9H21V11ZM21 6H3V4H21V6Z" />
    </svg>
  )
}

export { IconIndentleft }
