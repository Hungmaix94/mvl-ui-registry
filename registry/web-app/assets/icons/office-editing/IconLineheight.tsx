import { TIcon } from '@/types/common.ts'

function IconLineheight({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M6 17H9L5 21L1 17H4V13H6V17ZM21 20H11V18H21V20ZM21 13H9V11H21V13ZM9 7H6V11H4V7H1L5 3L9 7ZM21 6H11V4H21V6Z" />
    </svg>
  )
}

export { IconLineheight }
