// ── Design tokens matching frontend/index.css variables ──────────────────────
export const theme = {
  coral:      '#C96442',
  coralLight: 'rgba(201,100,66,0.10)',
  coralBorder:'rgba(201,100,66,0.25)',
  surface0:   '#FAFAF8',
  surface1:   '#F5F4F0',
  surface2:   '#EEECE8',
  text1:      '#1C1917',
  text2:      '#57534E',
  text3:      '#A8A29E',
  border:     '#E7E5E0',
  green:      '#65A30D',
  greenLight: 'rgba(101,163,13,0.08)',
  greenBorder:'rgba(101,163,13,0.25)',
  amber:      '#D97706',
  amberLight: 'rgba(217,119,6,0.08)',
  red:        '#DC2626',
  redLight:   'rgba(220,38,38,0.08)',
  redBorder:  'rgba(220,38,38,0.25)',
  white:      '#FFFFFF',
  black:      '#000000',
} as const;

export const radius = {
  sm:  6,
  md:  8,
  lg:  12,
  xl:  16,
  full: 999,
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
} as const;

export const fontSize = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  h1:   28,
} as const;
