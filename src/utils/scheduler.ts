import dayjs from 'dayjs';
import type { DayPlan } from '../models/dayPlan';
import type { Spot } from '../models/spot';
import type { Trip } from '../models/trip';
import type { DayEvaluation, DayItemEval, PendingSpot, ScheduleIssue, ScheduleProposal } from '../models/schedule';
import { DAY_WINDOW, TRANSPORT_RULES, type TransportMode } from '../constants/schedule';

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.round(minutes));
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface OpenWindow {
  openMin: number;
  closeMin: number;
}

/** 解析 open_time：'全天' 或无法解析时返回 null（视为不限时），'09:00-17:00' 返回窗口 */
export function parseOpenWindow(openTime: string): OpenWindow | null {
  const match = openTime.match(/(\d{1,2}:\d{2})\s*[-~—]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  return { openMin: timeToMinutes(match[1]), closeMin: timeToMinutes(match[2]) };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** 两站之间的路上时间（分钟）；没有上一站时为 0 */
export function travelMinutesBetween(from: Spot | null, to: Spot, mode: TransportMode): number {
  if (!from) return 0;
  const rule = TRANSPORT_RULES[mode];
  const km = haversineKm(from, to);
  return Math.max(5, Math.round((km / rule.speedKmh) * 60) + rule.baseMinutes);
}

/** 两站之间的交通费用；没有上一站时为 0 */
export function transportCostBetween(from: Spot | null, to: Spot, mode: TransportMode): number {
  if (!from) return 0;
  const rule = TRANSPORT_RULES[mode];
  return Math.round(rule.baseCost + haversineKm(from, to) * rule.perKmCost);
}

export function tripDayCount(trip: Trip): number {
  return Math.max(1, dayjs(trip.end_date).diff(dayjs(trip.start_date), 'day') + 1);
}

export function dateForDayIndex(trip: Trip, dayIndex: number): string {
  return dayjs(trip.start_date).add(Math.max(0, dayIndex - 1), 'day').format('YYYY-MM-DD');
}

/** 当天可支配金额：总预算按旅行天数均分 */
export function dayBudgetLimit(trip: Trip): number {
  return Math.round(trip.budget / tripDayCount(trip));
}

function issue(code: ScheduleIssue['code'], message: string): ScheduleIssue {
  return { code, message };
}

/**
 * 按当天已确认顺序逐条求值：路上时间、开放窗口、当日时段、累计花费。
 * 纯规则计算，不读写存储，供详情/编排/分享三个页面共用同一份结果。
 */
export function evaluateDay(day: DayPlan, spots: Spot[], budgetLimit: number): DayEvaluation {
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
  const dayEndMin = timeToMinutes(DAY_WINDOW.end);
  const items: DayItemEval[] = [];
  let cursor = timeToMinutes(DAY_WINDOW.start);
  let prevSpot: Spot | null = null;
  let spent = 0;
  let spotCost = 0;
  let transportCostTotal = 0;

  for (const item of day.items) {
    const spot = spotMap.get(item.spot_id);
    if (!spot) {
      items.push({
        spot_id: item.spot_id,
        start_time: item.start_time,
        end_time: item.end_time,
        transport: item.transport,
        travel_min: 0,
        transport_cost: 0,
        spot_cost: 0,
        issues: [issue('MISSING_SPOT', '景点数据缺失，无法校验时段')],
      });
      continue;
    }
    const travelMin = travelMinutesBetween(prevSpot, spot, item.transport);
    const moveCost = transportCostBetween(prevSpot, spot, item.transport);
    const earliest = cursor + travelMin;
    const startMin = timeToMinutes(item.start_time);
    const endMin = timeToMinutes(item.end_time);
    const issues: ScheduleIssue[] = [];

    if (startMin < earliest) {
      issues.push(prevSpot
        ? issue('OVERLAP', `与上一站撞车：路上约 ${travelMin} 分钟，最早 ${minutesToTime(earliest)} 才能到`)
        : issue('DAY_END', `开始时间早于当天可排时段 ${DAY_WINDOW.start}`));
    }
    const window = parseOpenWindow(spot.open_time);
    if (window && (startMin < window.openMin || endMin > window.closeMin)) {
      issues.push(issue('CLOSED', `开放 ${spot.open_time}，当前安排 ${item.start_time}-${item.end_time} 不在开放时段内`));
    }
    if (endMin > dayEndMin) {
      issues.push(issue('DAY_END', `结束时间超过当天可排时段 ${DAY_WINDOW.end}`));
    }
    spent += spot.price + moveCost;
    spotCost += spot.price;
    transportCostTotal += moveCost;
    if (spent > budgetLimit) {
      issues.push(issue('BUDGET', `排到这里当天累计 ¥${spent}，超出当天可支配 ¥${budgetLimit}`));
    }

    items.push({
      spot_id: item.spot_id,
      start_time: item.start_time,
      end_time: item.end_time,
      transport: item.transport,
      travel_min: travelMin,
      transport_cost: moveCost,
      spot_cost: spot.price,
      issues,
    });
    cursor = Math.max(cursor, endMin);
    prevSpot = spot;
  }

  return { items, spot_cost: spotCost, transport_cost: transportCostTotal, spent };
}

/**
 * 为待排条目计算排程方案：排在当天已确认条目之后，
 * 按开放时刻与交通方式给出可行时段；不可行时说明卡在哪条条件。
 */
export function proposePlacement(
  day: DayPlan,
  spots: Spot[],
  pending: PendingSpot,
  spot: Spot | undefined,
  budgetLimit: number,
): ScheduleProposal {
  const base: ScheduleProposal = {
    pending_id: pending.id,
    day_index: pending.day_index,
    start_time: '',
    end_time: '',
    transport: pending.transport,
    visit_minutes: pending.visit_minutes,
    travel_min: 0,
    transport_cost: 0,
    cost: spot ? spot.price : 0,
    spent_after: 0,
    budget_limit: budgetLimit,
    issues: [],
    feasible: false,
  };
  if (!spot) {
    base.issues.push(issue('MISSING_SPOT', '景点数据缺失，无法排程'));
    return base;
  }

  const evaluation = evaluateDay(day, spots, budgetLimit);
  const lastEval = evaluation.items[evaluation.items.length - 1];
  const lastSpot = lastEval ? spots.find((item) => item.id === lastEval.spot_id) ?? null : null;
  const cursor = lastEval ? timeToMinutes(lastEval.end_time) : timeToMinutes(DAY_WINDOW.start);

  const travelMin = travelMinutesBetween(lastSpot, spot, pending.transport);
  const moveCost = transportCostBetween(lastSpot, spot, pending.transport);
  const earliest = cursor + travelMin;
  const window = parseOpenWindow(spot.open_time);
  const startMin = Math.max(earliest, window ? window.openMin : 0);
  const endMin = startMin + pending.visit_minutes;
  const dayEndMin = timeToMinutes(DAY_WINDOW.end);

  const issues: ScheduleIssue[] = [];
  if (window && endMin > window.closeMin) {
    if (earliest > window.openMin) {
      issues.push(issue('OVERLAP', `跟在前一站后面最早 ${minutesToTime(earliest)} 到，游览约 ${pending.visit_minutes} 分钟会超过 ${minutesToTime(window.closeMin)} 闭馆`));
    } else {
      issues.push(issue('CLOSED', `开放 ${spot.open_time}，窗口内不够游览 ${pending.visit_minutes} 分钟`));
    }
  }
  if (endMin > dayEndMin) {
    issues.push(issue('DAY_END', `排完要到 ${minutesToTime(endMin)}，超过当天可排时段 ${DAY_WINDOW.end}`));
  }
  const cost = spot.price + moveCost;
  const spentAfter = evaluation.spent + cost;
  if (spentAfter > budgetLimit) {
    issues.push(issue('BUDGET', `当天已排 ¥${evaluation.spent}，这一站需 ¥${cost}，超出当天可支配 ¥${budgetLimit}`));
  }

  return {
    ...base,
    start_time: minutesToTime(startMin),
    end_time: minutesToTime(endMin),
    travel_min: travelMin,
    transport_cost: moveCost,
    cost,
    spent_after: spentAfter,
    issues,
    feasible: issues.length === 0,
  };
}
