import type { DayPlan } from '../models/dayPlan';
import type { Spot } from '../models/spot';
import type { Trip } from '../models/trip';
import { messages } from '../constants/messages';
import { evaluateDay, dayBudgetLimit } from './scheduler';

/** 当天已确认安排的花费（门票 + 站内交通），规则统一来自 utils/scheduler */
export function calcDayCost(day: DayPlan, spots: Spot[], budgetLimit = Number.POSITIVE_INFINITY) {
  return evaluateDay(day, spots, budgetLimit).spent;
}

export function calcTripCost(dayPlans: DayPlan[], spots: Spot[]) {
  return dayPlans.reduce((sum, day) => sum + calcDayCost(day, spots), 0);
}

export function budgetStatus(trip: Trip, dayPlans: DayPlan[], spots: Spot[]) {
  const spent = calcTripCost(dayPlans, spots);
  return {
    spent,
    remaining: trip.budget - spent,
    dayLimit: dayBudgetLimit(trip),
    warning: spent > trip.budget ? messages.budgetExceeded : '',
  };
}
