export const FEATURE_ICONS = {
  plus: '＋',
  wallet: '▣',
  chart: '▥',
  repeat: '↻',
  receipt: '▤',
  bell: '◔',
  shield: '⛨',
} as const;
export type FeatureIcon = keyof typeof FEATURE_ICONS;
