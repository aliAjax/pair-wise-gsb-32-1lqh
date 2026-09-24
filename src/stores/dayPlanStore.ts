import { defineStore } from 'pinia';
import type { DayPlan, DayPlanItem } from '../models/dayPlan';
import { dayPlanApi } from '../api/dayPlanApi';

export const useDayPlanStore = defineStore('dayPlan', {
  state: () => ({ dayPlans: dayPlanApi.list() as DayPlan[] }),
  actions: {
    ensureDay(tripId: string, dayIndex = 1, date = new Date().toISOString().slice(0, 10)) {
      let day = this.dayPlans.find((item) => item.trip_id === tripId && item.day_index === dayIndex);
      if (!day) {
        day = { id: crypto.randomUUID(), trip_id: tripId, day_index: dayIndex, date, items: [] };
        this.dayPlans.push(day);
      }
      return day;
    },
    dayOf(tripId: string, dayIndex: number) {
      return this.dayPlans.find((item) => item.trip_id === tripId && item.day_index === dayIndex);
    },
    insertItem(tripId: string, dayIndex: number, item: DayPlanItem, date?: string) {
      const day = this.ensureDay(tripId, dayIndex, date);
      day.items.push(item);
      day.items.sort((a, b) => a.start_time.localeCompare(b.start_time));
      dayPlanApi.save(this.dayPlans);
    },
    removeItem(tripId: string, dayIndex: number, spotId: string) {
      const day = this.dayOf(tripId, dayIndex);
      if (!day) return;
      day.items = day.items.filter((item) => item.spot_id !== spotId);
      dayPlanApi.save(this.dayPlans);
    },
    reorder(tripId: string, dayIndex: number, from: number, to: number) {
      const day = this.ensureDay(tripId, dayIndex);
      const [moved] = day.items.splice(from, 1);
      if (moved) day.items.splice(to, 0, moved);
      dayPlanApi.save(this.dayPlans);
    },
  },
});
