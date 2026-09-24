<template>
  <main class="page" v-if="trip">
    <h1>行程编排 · {{ trip.title }}</h1>
    <div class="toolbar">
      <el-select :model-value="dayIndex" style="width: 130px" @change="(v: number) => router.push(`/planner/${tripId}/${v}`)">
        <el-option v-for="d in dayCount" :key="d" :label="`第 ${d} 天`" :value="d" />
      </el-select>
      <span class="muted">当天可支配 ¥{{ dayLimit }} · 已排 ¥{{ evaluation.spent }} · 剩余 ¥{{ Math.max(0, dayLimit - evaluation.spent) }}</span>
    </div>

    <section class="band">
      <h3>待排区（{{ pendingList.length }}）</h3>
      <p class="muted">景点收录后先留在这里，按开放时刻和交通方式算出可行时段；有冲突会说明卡在哪条条件，确认调整方案后才排入当天。</p>
      <EmptyState v-if="!pendingList.length" title="待排区是空的" :description="messages.emptyPending" />
      <PendingSpotCard v-for="entry in pendingList" :key="entry.id" :entry="entry" />
    </section>

    <section class="band">
      <h3>第 {{ dayIndex }} 天已确认（拖拽调整顺序）</h3>
      <div ref="listEl">
        <SpotMiniCard v-for="row in rows" :key="row.itemEval.spot_id + row.itemEval.start_time"
          :spot="row.spot" :time-range="`${row.itemEval.start_time}-${row.itemEval.end_time}`"
          :status-text="row.itemEval.issues[0]?.message" :conflict="row.itemEval.issues.length > 0" removable
          @remove="(spotId) => scheduleStore.requeue(tripId, dayIndex, spotId)" />
      </div>
      <p v-if="!evaluation.items.length" class="muted">还没有已确认的景点，从待排区确认方案后加入。</p>
    </section>

    <DayTimeline v-if="day" :day="day" :spots="spotStore.spots" :budget-limit="dayLimit" />
  </main>
  <main v-else class="page"><EmptyState title="旅行不存在" /></main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Sortable, { type SortableEvent } from 'sortablejs';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { evaluateDay, dayBudgetLimit, tripDayCount, dateForDayIndex } from '../utils/scheduler';
import { messages } from '../constants/messages';
import SpotMiniCard from '../components/common/SpotMiniCard.vue';
import PendingSpotCard from '../components/common/PendingSpotCard.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import EmptyState from '../components/common/EmptyState.vue';

const route = useRoute();
const router = useRouter();
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();
const scheduleStore = useScheduleStore();

const listEl = ref<HTMLElement>();
const tripId = String(route.params.tripId);
const dayIndex = Number(route.params.dayIndex || 1);

const trip = computed(() => tripStore.trips.find((item) => item.id === tripId));
const dayCount = computed(() => (trip.value ? tripDayCount(trip.value) : 1));
const dayLimit = computed(() => (trip.value ? dayBudgetLimit(trip.value) : 0));
const day = computed(() => dayPlanStore.ensureDay(tripId, dayIndex, trip.value ? dateForDayIndex(trip.value, dayIndex) : undefined));
const evaluation = computed(() => evaluateDay(day.value, spotStore.spots, dayLimit.value || Number.POSITIVE_INFINITY));
const pendingList = computed(() => scheduleStore.pendingForTrip(tripId));
const spotOf = (id: string) => spotStore.spots.find((spot) => spot.id === id);
const rows = computed(() =>
  evaluation.value.items
    .map((itemEval) => ({ itemEval, spot: spotOf(itemEval.spot_id) }))
    .filter((row): row is { itemEval: (typeof evaluation.value.items)[number]; spot: NonNullable<ReturnType<typeof spotOf>> } => Boolean(row.spot)),
);

onMounted(() => {
  if (listEl.value) {
    new Sortable(listEl.value, {
      animation: 150,
      onEnd: (evt: SortableEvent) => dayPlanStore.reorder(tripId, dayIndex, evt.oldIndex ?? 0, evt.newIndex ?? 0),
    });
  }
});
</script>
