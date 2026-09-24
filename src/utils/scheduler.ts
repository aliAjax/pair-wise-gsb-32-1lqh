import type { DayPlan, DayPlanItem, TransportMode } from '../models/dayPlan';
import type { Spot } from '../models/spot';
import type { ScheduleViolation } from '../models/pendingItem';
import {
  DAY_START_MIN,
  DAY_END_MIN,
  DEFAULT_STAY_MIN,
  TRANSPORT_SPEED_KMH,
  TRANSPORT_BUFFER_MIN,
} from '../constants/schedule';
import { transportText, formatCurrency } from './formatters';
import { calcDayCost } from './budgetCalculator';

export interface PlacementRequest {
  spotId: string;
  desiredStart?: string;
  durationMin?: number;
  transport?: TransportMode;
}

export interface PlacementResult {
  feasible: boolean;
  item: DayPlanItem | null;
  violations: ScheduleViolation[];
  suggestion: DayPlanItem | null;
}

export interface ItemIssue {
  spotId: string;
  violations: ScheduleViolation[];
}

const TRANSPORT_FALLBACK_ORDER: TransportMode[] = ['taxi', 'metro', 'walk', 'train'];

export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const toHHMM = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export function parseOpenTime(openTime: string): { open: number; close: number } {
  const match = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(openTime || '');
  if (!match) return { open: 0, close: 24 * 60 };
  return { open: Number(match[1]) * 60 + Number(match[2]), close: Number(match[3]) * 60 + Number(match[4]) };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function travelMinutes(from: Spot, to: Spot, transport: TransportMode): number {
  if (from.id === to.id) return 0;
  const km = haversineKm(from, to);
  const ride = (km / TRANSPORT_SPEED_KMH[transport]) * 60;
  return Math.max(5, Math.ceil(ride + TRANSPORT_BUFFER_MIN[transport]));
}

const sortedItems = (day: DayPlan) => [...day.items].sort((a, b) => toMin(a.start_time) - toMin(b.start_time));

const buildItem = (spotId: string, start: number, duration: number, transport: TransportMode): DayPlanItem => ({
  spot_id: spotId,
  start_time: toHHMM(start),
  end_time: toHHMM(start + duration),
  note: '',
  transport,
});

// 当天最早可开始时刻：接在最后一项之后（含交通缓冲），且不早于开放时刻
function earliestStart(day: DayPlan, spots: Spot[], spot: Spot, transport: TransportMode) {
  const items = sortedItems(day);
  const last = items[items.length - 1];
  const { open } = parseOpenTime(spot.open_time);
  let earliest = Math.max(DAY_START_MIN, open);
  if (last) {
    const prevSpot = spots.find((entry) => entry.id === last.spot_id);
    const transfer = prevSpot ? travelMinutes(prevSpot, spot, transport) : 0;
    earliest = Math.max(earliest, toMin(last.end_time) + transfer);
  }
  return earliest;
}

// 追加式求解：只在期望时刻本身可行时才按期望时刻排，否则返回当天最早可行时段
function solveAppend(
  day: DayPlan,
  spots: Spot[],
  spot: Spot,
  duration: number,
  transport: TransportMode,
  desiredStart?: string,
  honorDesiredOnly = false,
): DayPlanItem | null {
  const { close } = parseOpenTime(spot.open_time);
  const earliest = earliestStart(day, spots, spot, transport);
  const dayLimit = Math.min(close, DAY_END_MIN);
  if (desiredStart) {
    const wanted = toMin(desiredStart);
    if (wanted >= earliest && wanted + duration <= dayLimit) {
      return buildItem(spot.id, wanted, duration, transport);
    }
    if (honorDesiredOnly) return null;
  }
  if (earliest + duration <= dayLimit) return buildItem(spot.id, earliest, duration, transport);
  return null;
}

// 解释期望时刻为什么排不进去：闭馆、路上来不及，还是与已排项撞车
function explainTimeFailure(
  day: DayPlan,
  spots: Spot[],
  spot: Spot,
  duration: number,
  transport: TransportMode,
  desiredStart?: string,
): ScheduleViolation[] {
  const { open, close } = parseOpenTime(spot.open_time);
  const items = sortedItems(day);
  const last = items[items.length - 1];
  const prevSpot = last ? spots.find((entry) => entry.id === last.spot_id) : undefined;
  const transfer = last && prevSpot ? travelMinutes(prevSpot, spot, transport) : 0;
  const earliest = earliestStart(day, spots, spot, transport);
  const out: ScheduleViolation[] = [];

  if (desiredStart) {
    const wanted = toMin(desiredStart);
    if (wanted < open || wanted + duration > close) {
      out.push({ code: 'CLOSED', message: `期望 ${desiredStart} 开始、停留 ${duration} 分钟，超出开放时间 ${spot.open_time}` });
    } else if (last && wanted < toMin(last.end_time)) {
      out.push({ code: 'OVERLAP', message: `期望 ${desiredStart} 与已排的「${prevSpot?.name || '上一项'}」（${last.start_time}-${last.end_time}）撞车` });
    } else if (last && wanted < toMin(last.end_time) + transfer) {
      out.push({
        code: 'TRAVEL',
        message: `从「${prevSpot?.name || '上一项'}」乘${transportText[transport]}约需 ${transfer} 分钟，${desiredStart} 赶不上（最早 ${toHHMM(toMin(last.end_time) + transfer)}）`,
      });
    }
  }
  if (earliest + duration > Math.min(close, DAY_END_MIN)) {
    if (close - open < duration) {
      out.push({ code: 'CLOSED', message: `开放窗口 ${spot.open_time} 不足 ${duration} 分钟停留` });
    } else {
      out.push({
        code: 'CLOSED',
        message: `当天最早 ${toHHMM(earliest)} 才能到${prevSpot ? `（接在「${prevSpot.name}」后，含 ${transfer} 分钟路程）` : ''}，停留到 ${toHHMM(earliest + duration)} 超过闭馆 ${toHHMM(close)}`,
      });
    }
  }
  if (!out.length) out.push({ code: 'TRAVEL', message: '当天时段排不下，请调整交通方式或期望时间' });
  return out;
}

// 收录评估：可行时段 + 卡点说明 + 调整方案，只算规则不写状态
export function evaluatePlacement(day: DayPlan, spots: Spot[], dailyBudget: number, req: PlacementRequest): PlacementResult {
  const spot = spots.find((entry) => entry.id === req.spotId);
  if (!spot) {
    return { feasible: false, item: null, violations: [{ code: 'CLOSED', message: '景点不存在或已下架' }], suggestion: null };
  }
  const duration = req.durationMin || DEFAULT_STAY_MIN;
  const transport = req.transport || 'metro';
  const violations: ScheduleViolation[] = [];

  // 指定期望时刻时，只有期望时刻本身可行才算直接可行，否则进入待排区等确认
  const slot = req.desiredStart
    ? solveAppend(day, spots, spot, duration, transport, req.desiredStart, true)
    : solveAppend(day, spots, spot, duration, transport);
  if (!slot) violations.push(...explainTimeFailure(day, spots, spot, duration, transport, req.desiredStart));

  const remaining = dailyBudget - calcDayCost(day, spots);
  if (spot.price > remaining) {
    violations.push({
      code: 'BUDGET',
      message: `门票 ${formatCurrency(spot.price)} 超出当天剩余可支配 ${formatCurrency(remaining)}（当天额度 ${formatCurrency(dailyBudget)}）`,
    });
  }

  // 调整方案：时间可行但预算卡住的保留原时段；否则依次尝试指定/更快的交通方式取当天最早可行时段
  let suggestion = slot;
  if (!suggestion) {
    const modes = [transport, ...TRANSPORT_FALLBACK_ORDER.filter((mode) => mode !== transport)];
    for (const mode of modes) {
      suggestion = solveAppend(day, spots, spot, duration, mode);
      if (suggestion) break;
    }
  }

  const feasible = !!slot && violations.length === 0;
  return { feasible, item: feasible ? slot : null, violations, suggestion };
}

// 整一天顺序重检：拖拽改序后逐项核对开放时刻、交通衔接和当天可支配金额
export function validateDayPlan(day: DayPlan, spots: Spot[], dailyBudget: number): ItemIssue[] {
  const issues: ItemIssue[] = [];
  let prevEnd = DAY_START_MIN;
  let prevSpot: Spot | undefined;
  let committed = 0;
  for (const item of sortedItems(day)) {
    const spot = spots.find((entry) => entry.id === item.spot_id);
    if (!spot) continue;
    const start = toMin(item.start_time);
    const end = toMin(item.end_time);
    const list: ScheduleViolation[] = [];
    const { open, close } = parseOpenTime(spot.open_time);
    if (start < open || end > close) {
      list.push({ code: 'CLOSED', message: `时段 ${item.start_time}-${item.end_time} 超出开放时间 ${spot.open_time}` });
    }
    if (prevSpot) {
      const need = travelMinutes(prevSpot, spot, item.transport);
      const gap = start - prevEnd;
      if (gap < 0) list.push({ code: 'OVERLAP', message: `与上一项「${prevSpot.name}」时段重叠 ${-gap} 分钟` });
      else if (gap < need) list.push({ code: 'TRAVEL', message: `路上需 ${need} 分钟（${transportText[item.transport]}），只留了 ${gap} 分钟` });
    }
    committed += spot.price;
    if (committed > dailyBudget) {
      list.push({ code: 'BUDGET', message: `排到本项后当天已排 ${formatCurrency(committed)}，超出当天可支配 ${formatCurrency(dailyBudget)}` });
    }
    if (list.length) issues.push({ spotId: spot.id, violations: list });
    prevEnd = Math.max(prevEnd, end);
    prevSpot = spot;
  }
  return issues;
}
