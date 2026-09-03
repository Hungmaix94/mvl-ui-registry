import { TIcon } from '@/types/common.ts'

function IconDiamond({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M10.9395 1.87451C11.5252 1.28931 12.4749 1.2892 13.0605 1.87451L22.125 10.9399C22.7104 11.5257 22.7104 12.4753 22.125 13.061L13.0605 22.1255C12.4749 22.7111 11.5252 22.7109 10.9395 22.1255L1.875 13.061C1.28925 12.4753 1.28933 11.5257 1.875 10.9399L10.9395 1.87451ZM2.93555 12.0005L12 21.0649L21.0645 12.0005L12 2.93604L2.93555 12.0005Z" />
    </svg>
  )
}

export { IconDiamond }
