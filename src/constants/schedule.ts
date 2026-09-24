import { SpotCategory } from './spot';

export const TRANSPORT_MODES = ['walk', 'metro', 'taxi', 'train'] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export interface TransportRule {
  label: string;
  speedKmh: number;
  baseMinutes: number;
  baseCost: number;
  perKmCost: number;
}

export const TRANSPORT_RULES: Record<TransportMode, TransportRule> = {
  walk: { label: '步行', speedKmh: 4.5, baseMinutes: 0, baseCost: 0, perKmCost: 0 },
  metro: { label: '地铁', speedKmh: 32, baseMinutes: 8, baseCost: 3, perKmCost: 0.8 },
  taxi: { label: '出租', speedKmh: 26, baseMinutes: 4, baseCost: 13, perKmCost: 2.4 },
  train: { label: '火车', speedKmh: 60, baseMinutes: 25, baseCost: 15, perKmCost: 0.5 },
};

export const TRANSPORT_OPTIONS = TRANSPORT_MODES.map((value) => ({ value, label: TRANSPORT_RULES[value].label }));

export const DAY_WINDOW = { start: '08:00', end: '22:00' };

export const DEFAULT_VISIT_MINUTES: Record<SpotCategory, number> = {
  [SpotCategory.NATURE]: 120,
  [SpotCategory.CULTURE]: 90,
  [SpotCategory.FOOD]: 75,
  [SpotCategory.ENTERTAINMENT]: 150,
};

export const VISIT_DURATION_OPTIONS = [45, 60, 75, 90, 120, 150, 180];

export const DEFAULT_TRANSPORT: TransportMode = 'metro';
