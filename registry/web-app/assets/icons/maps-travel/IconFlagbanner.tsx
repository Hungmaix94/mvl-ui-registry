import { TIcon } from '@/types/common.ts'

function IconFlagbanner({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M21 3.75C21.2882 3.75 21.5508 3.91514 21.6758 4.1748C21.8007 4.43465 21.766 4.74362 21.5859 4.96875L17.4609 10.125L21.5859 15.2812C21.766 15.5064 21.8007 15.8153 21.6758 16.0752C21.5508 16.3349 21.2882 16.5 21 16.5H4.5V20.25C4.5 20.6642 4.16421 21 3.75 21C3.33579 21 3 20.6642 3 20.25V4.5C3 4.08579 3.33579 3.75 3.75 3.75H21ZM4.5 15H19.4395L15.9141 10.5938C15.6949 10.3198 15.6949 9.93016 15.9141 9.65625L19.4395 5.25H4.5V15Z" />
    </svg>
  )
}

export { IconFlagbanner }
