import { TIcon } from '@/types/common.ts'

function IconHarddrive({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M21 6C21.8284 6 22.5 6.67157 22.5 7.5V16.5C22.5 17.3284 21.8284 18 21 18H3C2.17157 18 1.5 17.3284 1.5 16.5V7.5C1.5 6.67157 2.17157 6 3 6H21ZM3 16.5H21V7.5H3V16.5ZM17.625 11.0625C18.1428 11.0625 18.5625 11.4822 18.5625 12C18.5625 12.5178 18.1428 12.9375 17.625 12.9375C17.1072 12.9375 16.6875 12.5178 16.6875 12C16.6875 11.4822 17.1072 11.0625 17.625 11.0625Z" />
    </svg>
  )
}

export { IconHarddrive }
