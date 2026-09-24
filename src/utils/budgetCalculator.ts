import type { DayPlan } from '../models/dayPlan';
import type { Spot } from '../models/spot';
import type { Trip } from '../models/trip';
import { messages } from '../constants/messages';

export function calcTripCost(dayPlans: DayPlan[], spots: Spot[]) {
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
  return dayPlans.reduce((sum, day) => {
    return sum + day.items.reduce((inner, item) => inner + (spotMap.get(item.spot_id)?.price || 0), 0);
  }, 0);
}

export function calcDayCost(day: DayPlan, spots: Spot[]) {
  const spotMap = new Map(spots.map((spot) => [spot.id, spot]));
  return day.items.reduce((sum, item) => sum + (spotMap.get(item.spot_id)?.price || 0), 0);
}

export function tripDayCount(trip: Trip) {
  const start = new Date(trip.start_date).getTime();
  const end = new Date(trip.end_date).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

export function dailyAllowance(trip: Trip) {
  return Math.round(trip.budget / tripDayCount(trip));
}

export function budgetStatus(trip: Trip, dayPlans: DayPlan[], spots: Spot[]) {
  const spent = calcTripCost(dayPlans, spots);
  return { spent, remaining: trip.budget - spent, warning: spent > trip.budget ? messages.budgetExceeded : '' };
}
