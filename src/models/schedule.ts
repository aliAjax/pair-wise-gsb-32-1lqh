import type { TransportMode } from '../constants/schedule';

/** 待排区条目：已收录但尚未确认排入当天的景点 */
export interface PendingSpot {
  id: string;
  trip_id: string;
  day_index: number;
  spot_id: string;
  transport: TransportMode;
  visit_minutes: number;
  created_at: string;
}

export type ScheduleIssueCode = 'MISSING_SPOT' | 'OVERLAP' | 'CLOSED' | 'DAY_END' | 'BUDGET';

/** 一条可解释的排程阻碍：卡在哪条规则、具体差多少 */
export interface ScheduleIssue {
  code: ScheduleIssueCode;
  message: string;
}

/** 已确认条目在当天顺序中的求值结果 */
export interface DayItemEval {
  spot_id: string;
  start_time: string;
  end_time: string;
  transport: TransportMode;
  travel_min: number;
  transport_cost: number;
  spot_cost: number;
  issues: ScheduleIssue[];
}

export interface DayEvaluation {
  items: DayItemEval[];
  spot_cost: number;
  transport_cost: number;
  spent: number;
}

/** 待排条目的排程方案：可行时段或阻碍条件 */
export interface ScheduleProposal {
  pending_id: string;
  day_index: number;
  start_time: string;
  end_time: string;
  transport: TransportMode;
  visit_minutes: number;
  travel_min: number;
  transport_cost: number;
  cost: number;
  spent_after: number;
  budget_limit: number;
  issues: ScheduleIssue[];
  feasible: boolean;
}
