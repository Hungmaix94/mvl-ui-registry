import { TIcon } from '@/types/common.ts'

function IconTextt({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.5 4.49902C19.914 4.49929 20.25 4.83595 20.25 5.25V8.25C20.2497 8.66383 19.9138 8.99974 19.5 9C19.0859 9 18.7503 8.66399 18.75 8.25V6H12.75V18H15C15.414 18.0003 15.75 18.3359 15.75 18.75C15.7497 19.1638 15.4138 19.4997 15 19.5H9C8.58595 19.5 8.25026 19.164 8.25 18.75C8.25 18.3358 8.58579 18 9 18H11.25V6H5.25V8.25C5.24974 8.66383 4.91383 8.99974 4.5 9C4.08595 9 3.74929 8.66399 3.74902 8.25V5.25C3.74902 4.83579 4.08579 4.49902 4.5 4.49902H19.5Z" />
    </svg>
  )
}

export { IconTextt }
