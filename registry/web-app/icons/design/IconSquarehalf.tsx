import { TIcon } from '@/types/common.ts'

function IconSquarehalf({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.125 3.375C19.9534 3.375 20.625 4.04657 20.625 4.875V19.125C20.625 19.9534 19.9534 20.625 19.125 20.625H4.875C4.04657 20.625 3.375 19.9534 3.375 19.125V4.875C3.375 4.04657 4.04657 3.375 4.875 3.375H19.125ZM4.875 19.125H11.25V4.875H4.875V19.125ZM12.75 13.1904L18.6846 19.125H19.125V16.4365L12.75 10.0615V13.1904ZM12.75 19.125H16.5635L12.75 15.3115V19.125ZM12.75 7.94043L19.125 14.3154V11.1855L12.8145 4.875H12.75V7.94043ZM19.125 9.06445V4.875H14.9355L19.125 9.06445Z" />
    </svg>
  )
}

export { IconSquarehalf }
