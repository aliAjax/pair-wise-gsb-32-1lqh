import { defineStore } from 'pinia';
import type { PendingItem } from '../models/pendingItem';
import { pendingApi } from '../api/pendingApi';
import { evaluatePlacement, validateDayPlan, toMin, type PlacementRequest, type PlacementResult } from '../utils/scheduler';
import { dailyAllowance } from '../utils/budgetCalculator';
import { useDayPlanStore } from './dayPlanStore';
import { useSpotStore } from './spotStore';
import { useTripStore } from './tripStore';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';

export const useScheduleStore = defineStore('schedule', {
  state: () => ({ pending: pendingApi.list() as PendingItem[] }),
  getters: {
    pendingFor: (state) => (tripId: string, dayIndex: number) =>
      state.pending.filter((item) => item.trip_id === tripId && item.day_index === dayIndex),
    pendingCountFor: (state) => (tripId: string) => state.pending.filter((item) => item.trip_id === tripId).length,
  },
  actions: {
    allowance(tripId: string): number {
      const trip = useTripStore().trips.find((item) => item.id === tripId);
      return trip ? dailyAllowance(trip) : 0;
    },
    dayDate(tripId: string, dayIndex: number): string {
      const trip = useTripStore().trips.find((item) => item.id === tripId);
      const base = trip ? new Date(trip.start_date).getTime() : Date.now();
      return new Date(base + (dayIndex - 1) * 86400000).toISOString().slice(0, 10);
    },
    // 只读评估：不创建当天、不写状态，供页面实时预览可行时段
    evaluate(tripId: string, dayIndex: number, req: PlacementRequest): PlacementResult {
      const dayPlanStore = useDayPlanStore();
      const day = dayPlanStore.dayOf(tripId, dayIndex) || {
        id: 'preview',
        trip_id: tripId,
        day_index: dayIndex,
        date: this.dayDate(tripId, dayIndex),
        items: [],
      };
      return evaluatePlacement(day, useSpotStore().spots, this.allowance(tripId), req);
    },
    // 收录景点：可行就直接排入当天；撞车/闭馆/超预算就留在待排区并记录卡点
    stage(tripId: string, dayIndex: number, req: PlacementRequest): PlacementResult {
      const result = this.evaluate(tripId, dayIndex, req);
      if (result.feasible && result.item) {
        useDayPlanStore().insertItem(tripId, dayIndex, result.item, this.dayDate(tripId, dayIndex));
        toast.ok(messages.spotAdded);
        return result;
      }
      this.pending.push({
        id: crypto.randomUUID(),
        trip_id: tripId,
        day_index: dayIndex,
        spot_id: req.spotId,
        desired_start: req.desiredStart || '',
        duration_min: req.durationMin || 0,
        transport: req.transport || 'metro',
        violations: result.violations,
        suggestion: result.suggestion,
        created_at: new Date().toISOString(),
      });
      pendingApi.save(this.pending);
      toast.warn(messages.pendingStaged);
      return result;
    },
    // 确认调整方案：按当天最新状态重新评估建议时段，通过才放进当天
    confirm(pendingId: string): boolean {
      const index = this.pending.findIndex((item) => item.id === pendingId);
      const pending = this.pending[index];
      if (!pending || !pending.suggestion) return false;
      const result = this.evaluate(pending.trip_id, pending.day_index, {
        spotId: pending.spot_id,
        desiredStart: pending.suggestion.start_time,
        durationMin: pending.duration_min || undefined,
        transport: pending.suggestion.transport,
      });
      if (!result.feasible || !result.item) {
        pending.violations = result.violations;
        pending.suggestion = result.suggestion;
        pendingApi.save(this.pending);
        toast.warn(messages.pendingStillBlocked);
        return false;
      }
      useDayPlanStore().insertItem(pending.trip_id, pending.day_index, result.item, this.dayDate(pending.trip_id, pending.day_index));
      this.pending.splice(index, 1);
      pendingApi.save(this.pending);
      toast.ok(messages.pendingConfirmed);
      return true;
    },
    dismiss(pendingId: string) {
      this.pending = this.pending.filter((item) => item.id !== pendingId);
      pendingApi.save(this.pending);
      toast.ok(messages.pendingRemoved);
    },
    // 拖拽改序后重检：撞车的项移回待排区并说明卡在哪个条件
    revalidateDay(tripId: string, dayIndex: number): number {
      const dayPlanStore = useDayPlanStore();
      const spots = useSpotStore().spots;
      let moved = 0;
      for (let guard = 0; guard < 10; guard += 1) {
        const day = dayPlanStore.dayOf(tripId, dayIndex);
        if (!day) break;
        const issues = validateDayPlan(day, spots, this.allowance(tripId));
        if (!issues.length) break;
        for (const issue of issues) {
          const item = day.items.find((entry) => entry.spot_id === issue.spotId);
          if (!item) continue;
          const durationMin = Math.max(30, toMin(item.end_time) - toMin(item.start_time));
          dayPlanStore.removeItem(tripId, dayIndex, issue.spotId);
          const retry = this.evaluate(tripId, dayIndex, { spotId: issue.spotId, durationMin, transport: item.transport });
          this.pending.push({
            id: crypto.randomUUID(),
            trip_id: tripId,
            day_index: dayIndex,
            spot_id: issue.spotId,
            desired_start: item.start_time,
            duration_min: durationMin,
            transport: item.transport,
            violations: issue.violations,
            suggestion: retry.suggestion,
            created_at: new Date().toISOString(),
          });
          moved += 1;
        }
      }
      if (moved) {
        pendingApi.save(this.pending);
        toast.warn(messages.movedToPending(moved));
      }
      return moved;
    },
  },
});
