export type TransportMode = 'walk' | 'metro' | 'taxi' | 'train';

export interface DayPlanItem {
  spot_id: string;
  start_time: string;
  end_time: string;
  note: string;
  transport: TransportMode;
}

export interface DayPlan {
  id: string;
  trip_id: string;
  day_index: number;
  date: string;
  items: DayPlanItem[];
}
