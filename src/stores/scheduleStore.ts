import { defineStore } from 'pinia';
import type { PendingSpot } from '../models/schedule';
import { scheduleApi } from '../api/scheduleApi';
import { useDayPlanStore } from './dayPlanStore';
import { useSpotStore } from './spotStore';
import { useTripStore } from './tripStore';
import { DEFAULT_TRANSPORT, DEFAULT_VISIT_MINUTES } from '../constants/schedule';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';
import { dateForDayIndex, dayBudgetLimit, proposePlacement, timeToMinutes } from '../utils/scheduler';

export const useScheduleStore = defineStore('schedule', {
  state: () => ({ pending: scheduleApi.listPending() as PendingSpot[] }),
  getters: {
    pendingForTrip: (state) => (tripId: string) => state.pending.filter((item) => item.trip_id === tripId),
    pendingForDay: (state) => (tripId: string, dayIndex: number) =>
      state.pending.filter((item) => item.trip_id === tripId && item.day_index === dayIndex),
  },
  actions: {
    persist() {
      scheduleApi.savePending(this.pending);
    },
    /** 景点收录：先进入待排区，确认可行时段后才排入当天 */
    enqueue(tripId: string, dayIndex: number, spotId: string): PendingSpot | null {
      const dayPlanStore = useDayPlanStore();
      const spotStore = useSpotStore();
      const alreadyPlanned = dayPlanStore.dayPlans.some(
        (day) => day.trip_id === tripId && day.items.some((item) => item.spot_id === spotId),
      );
      const alreadyPending = this.pending.some((item) => item.trip_id === tripId && item.spot_id === spotId);
      if (alreadyPlanned || alreadyPending) {
        toast.warn(messages.spotDuplicate);
        return null;
      }
      const spot = spotStore.spots.find((item) => item.id === spotId);
      const entry: PendingSpot = {
        id: crypto.randomUUID(),
        trip_id: tripId,
        day_index: dayIndex,
        spot_id: spotId,
        transport: DEFAULT_TRANSPORT,
        visit_minutes: spot ? DEFAULT_VISIT_MINUTES[spot.category] : 120,
        created_at: new Date().toISOString(),
      };
      this.pending.push(entry);
      this.persist();
      return entry;
    },
    updateDraft(id: string, patch: Partial<Pick<PendingSpot, 'transport' | 'visit_minutes' | 'day_index'>>) {
      const entry = this.pending.find((item) => item.id === id);
      if (entry) {
        Object.assign(entry, patch);
        this.persist();
      }
    },
    remove(id: string) {
      this.pending = this.pending.filter((item) => item.id !== id);
      this.persist();
    },
    /** 用最新规则重新求值待排条目的排程方案 */
    evaluate(entry: PendingSpot) {
      const tripStore = useTripStore();
      const dayPlanStore = useDayPlanStore();
      const spotStore = useSpotStore();
      const trip = tripStore.trips.find((item) => item.id === entry.trip_id);
      if (!trip) return null;
      const day = dayPlanStore.dayPlans.find((item) => item.trip_id === entry.trip_id && item.day_index === entry.day_index)
        ?? { id: '', trip_id: entry.trip_id, day_index: entry.day_index, date: dateForDayIndex(trip, entry.day_index), items: [] };
      return proposePlacement(day, spotStore.spots, entry, spotStore.spots.find((spot) => spot.id === entry.spot_id), dayBudgetLimit(trip));
    },
    /** 确认调整方案：方案可行才写进当天并移出待排区 */
    confirm(id: string): boolean {
      const dayPlanStore = useDayPlanStore();
      const entry = this.pending.find((item) => item.id === id);
      if (!entry) return false;
      const proposal = this.evaluate(entry);
      if (!proposal) return false;
      if (!proposal.feasible) {
        toast.warn(messages.proposalBlocked);
        return false;
      }
      const tripStore = useTripStore();
      const trip = tripStore.trips.find((item) => item.id === entry.trip_id);
      if (!trip) return false;
      dayPlanStore.insertItem(entry.trip_id, entry.day_index, {
        spot_id: entry.spot_id,
        start_time: proposal.start_time,
        end_time: proposal.end_time,
        transport: proposal.transport,
        note: `已确认 ${proposal.start_time}-${proposal.end_time}`,
      });
      this.remove(id);
      toast.ok(messages.spotScheduled);
      return true;
    },
    /** 从当天移回待排区继续调整 */
    requeue(tripId: string, dayIndex: number, spotId: string) {
      const dayPlanStore = useDayPlanStore();
      const removed = dayPlanStore.removeItem(tripId, dayIndex, spotId);
      if (!removed) return;
      const exists = this.pending.some((item) => item.trip_id === tripId && item.spot_id === spotId);
      if (!exists) {
        this.pending.push({
          id: crypto.randomUUID(),
          trip_id: tripId,
          day_index: dayIndex,
          spot_id: spotId,
          transport: removed.transport,
          visit_minutes: Math.max(1, timeToMinutes(removed.end_time) - timeToMinutes(removed.start_time)),
          created_at: new Date().toISOString(),
        });
        this.persist();
      }
      toast.ok(messages.spotRequeued);
    },
  },
});
