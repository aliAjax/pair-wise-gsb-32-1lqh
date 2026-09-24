import type { DayPlanItem, TransportMode } from './dayPlan';
import type { ViolationCode } from '../constants/schedule';

export interface ScheduleViolation {
  code: ViolationCode;
  message: string;
}

export interface PendingItem {
  id: string;
  trip_id: string;
  day_index: number;
  spot_id: string;
  desired_start: string;
  duration_min: number;
  transport: TransportMode;
  violations: ScheduleViolation[];
  suggestion: DayPlanItem | null;
  created_at: string;
}
