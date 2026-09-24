import type { TransportMode } from '../models/dayPlan';

export const DAY_START_MIN = 9 * 60;
export const DAY_END_MIN = 22 * 60;
export const DEFAULT_STAY_MIN = 120;

export const TRANSPORT_SPEED_KMH: Record<TransportMode, number> = {
  walk: 4.5,
  metro: 30,
  taxi: 22,
  train: 55,
};

export const TRANSPORT_BUFFER_MIN: Record<TransportMode, number> = {
  walk: 0,
  metro: 12,
  taxi: 6,
  train: 25,
};

export const TRANSPORT_OPTIONS: { label: string; value: TransportMode }[] = [
  { label: '步行', value: 'walk' },
  { label: '地铁', value: 'metro' },
  { label: '出租', value: 'taxi' },
  { label: '火车', value: 'train' },
];

export const STAY_MIN_OPTIONS = [60, 90, 120, 150, 180];

export type ViolationCode = 'CLOSED' | 'TRAVEL' | 'OVERLAP' | 'BUDGET';

export const violationText: Record<ViolationCode, string> = {
  CLOSED: '开放时间',
  TRAVEL: '交通衔接',
  OVERLAP: '时段撞车',
  BUDGET: '当天预算',
};
