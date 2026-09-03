// Generated automatically by sync-figma-colors.ts
// Do not edit manually - run 'yarn update:colors' to regenerate

export const globalColors = {
  neutral: {
    '0': '#ffffff',
    '10': '#fdfdfd',
    '20': '#f9f9f9',
    '30': '#f2f2f2',
    '40': '#e8e8e8',
    '50': '#e4e4e4',
    '60': '#d8d8d8',
    '70': '#bfbfbf',
    '80': '#8c8c8c',
    '90': '#4b4b4b',
    '100': '#000000',
  },
  red: {
    '10': '#f7ebeb',
    '20': '#efdbdb',
    '30': '#df9c9c',
    '40': '#cf6868',
    '50': '#bf4343',
    '60': '#af4b4b',
    '70': '#870b0b',
    '80': '#690000',
    '90': '#461e1e',
    '100': '#230f0f',
  },
  orange: {
    '10': '#fbf4ec',
    '20': '#f6e8d8',
    '30': '#ebc698',
    '40': '#e4bb8b',
    '50': '#f0a346',
    '60': '#d28a35',
    '70': '#995b0f',
    '80': '#7e5525',
    '90': '#543918',
    '100': '#2a1c0c',
  },
  'lime yellow': {
    '10': '#f8f4e1',
    '20': '#fff5c9',
    '30': '#e0dda5',
    '40': '#d0cd77',
    '50': '#ebc61f',
    '60': '#d3b326',
    '70': '#af9526',
    '80': '#6a6711',
    '90': '#47440c',
    '100': '#232206',
  },
  purple: {
    '10': '#f4edf7',
    '20': '#eadbef',
    '30': '#d5b7df',
    '40': '#bf93cf',
    '50': '#aa6fbf',
    '60': '#9858af',
    '70': '#722a8c',
    '80': '#592d69',
    '90': '#3c1e46',
    '100': '#1e0f23',
  },
  green: {
    '10': '#eef5f0',
    '20': '#daf4e0',
    '30': '#bcd8c2',
    '40': '#9bc5a4',
    '50': '#79b185',
    '60': '#2f9e47',
    '70': '#007e1b',
    '80': '#355f3e',
    '90': '#233f29',
    '100': '#122015',
  },
  irish: {
    '10': '#eeeff5',
    '20': '#dedfec',
    '30': '#bcbfd8',
    '40': '#9b9fc5',
    '50': '#797fb1',
    '60': '#585f9e',
    '70': '#464c7e',
    '80': '#35395f',
    '90': '#23263f',
    '100': '#121320',
  },
  brand: {
    '90': '#bbbbbb',
    '100': '#b32b2f',
  },
}

export const semanticColors = {
  content: {
    dark: ['#000000', '#4b4b4b', '#8c8c8c', '#bfbfbf'],
    light: ['#ffffff', '#d8d8d8', '#bfbfbf', '#8c8c8c'],
  },
  action: {
    'primary-red': ['#b32b2f', '#870b0b', '#cf6868', '#f9f9f9', '#f7ebeb'],
    'secondary-grey': ['#d8d8d8', '#bfbfbf', '#8c8c8c', '#f2f2f2'],
    outline: [
      '#e4e4e4',
      '#8c8c8c',
      '#000000',
      '#d8d8d8',
      '#b6c8fb',
      '#bcd8c2',
      '#df9c9c',
      '#ebc698',
    ],
  },
  border: {
    values: ['#d8d8d8', '#bfbfbf', '#8c8c8c'],
  },
  background: {
    values: [
      '#ffffff',
      '#f9f9f9',
      '#f2f2f2',
      '#eef5f0',
      '#edf2fe',
      '#f7ebeb',
      '#f8f4e1',
      '#fbf4ec',
      '#f4edf7',
    ],
  },
  data: {
    'light-grey': ['#fdfdfd', '#f2f2f2', '#f9f9f9', '#e8e8e8'],
    red: ['#af2323', '#870b0b', '#df9c9c', '#efcbcb'],
    green: ['#2f9e47', '#007e1b', '#79b185', '#daf4e0'],
    blue: ['#4c78f5', '#1f3f99', '#b6c8fb', '#dbe4fd'],
    yellow: ['#d3b326', '#af9526', '#fff0b0', '#fff5c9'],
    purple: ['#9858af', '#722a8c', '#d5b7df', '#eadbef'],
    orange: ['#d28a35', '#995b0f', '#ebc698', '#f6e8d8'],
    irish: ['#6950ce', '#19247e', '#c0bcd8', '#dedfec'],
  },
}

export const colors = {
  global: globalColors,
  semantic: semanticColors,
} as const

export type GlobalColorFamily = keyof typeof globalColors
export type SemanticColorSection = keyof typeof semanticColors
