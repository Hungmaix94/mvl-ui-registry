import { TIcon } from '@/types/common.ts'

function IconTextitalic({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M18 4.49902C18.414 4.49929 18.75 4.83595 18.75 5.25C18.7497 5.66383 18.4138 5.99974 18 6H14.791L10.791 18H13.5C13.914 18.0003 14.25 18.3359 14.25 18.75C14.2497 19.1638 13.9138 19.4997 13.5 19.5H6C5.58595 19.5 5.24929 19.164 5.24902 18.75C5.24902 18.3358 5.58579 18 6 18H9.20898L13.209 6H10.5C10.0859 6 9.75026 5.66399 9.75 5.25C9.75 4.83579 10.0858 4.49902 10.5 4.49902H18Z" />
    </svg>
  )
}

export { IconTextitalic }
