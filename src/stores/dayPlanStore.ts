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
    /** 按已确认方案把条目追加到当天末尾 */
    insertItem(tripId: string, dayIndex: number, item: DayPlanItem) {
      const day = this.ensureDay(tripId, dayIndex);
      day.items.push(item);
      dayPlanApi.save(this.dayPlans);
    },
    removeItem(tripId: string, dayIndex: number, spotId: string) {
      const day = this.dayPlans.find((item) => item.trip_id === tripId && item.day_index === dayIndex);
      if (!day) return undefined;
      const index = day.items.findIndex((item) => item.spot_id === spotId);
      const [removed] = index >= 0 ? day.items.splice(index, 1) : [];
      dayPlanApi.save(this.dayPlans);
      return removed;
    },
    reorder(tripId: string, dayIndex: number, from: number, to: number) {
      const day = this.ensureDay(tripId, dayIndex);
      const [moved] = day.items.splice(from, 1);
      if (moved) day.items.splice(to, 0, moved);
      dayPlanApi.save(this.dayPlans);
    },
  },
});
