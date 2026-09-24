<template>
  <main class="page" v-if="trip">
    <h1>行程编排 · {{ trip.title }}</h1>
    <div class="toolbar">
      <el-select :model-value="dayIndex" style="width: 140px" @change="goDay">
        <el-option v-for="n in dayCount" :key="n" :label="'第 ' + n + ' 天'" :value="n" />
      </el-select>
      <span class="muted">
        当天可支配 {{ formatCurrency(allowance) }} · 已排 {{ formatCurrency(dayCost) }} ·
        <span :class="{ over: remaining < 0 }">剩余 {{ formatCurrency(remaining) }}</span>
      </span>
    </div>
    <section class="band">
      <p class="muted">拖拽排序由 SortableJS 接管；改序后会重新校验，撞车的项自动移入待排区并说明卡点。</p>
      <div ref="listEl">
        <SpotMiniCard v-for="entry in daySpots" :key="entry.spot.id" :spot="entry.spot" :item="entry.item" />
      </div>
      <p v-if="!daySpots.length" class="muted">这一天还没有安排，去景点探索页收录景点。</p>
    </section>
    <PendingList :items="pendingItems" :spots="spotStore.spots" @confirm="scheduleStore.confirm" @dismiss="scheduleStore.dismiss" />
    <DayTimeline v-if="day" :day="day" :spots="spotStore.spots" :daily-budget="allowance" />
  </main>
  <main v-else class="page"><EmptyState title="旅行不存在" /></main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Sortable, { type SortableEvent } from 'sortablejs';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { useScheduleStore } from '../stores/scheduleStore';
import SpotMiniCard from '../components/common/SpotMiniCard.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import PendingList from '../components/common/PendingList.vue';
import EmptyState from '../components/common/EmptyState.vue';
import { calcDayCost, tripDayCount } from '../utils/budgetCalculator';
import { formatCurrency } from '../utils/formatters';
import type { DayPlanItem } from '../models/dayPlan';
import type { Spot } from '../models/spot';

const route = useRoute();
const router = useRouter();
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();
const scheduleStore = useScheduleStore();

const listEl = ref<HTMLElement>();
const tripId = String(route.params.tripId);
const dayIndex = computed(() => Number(route.params.dayIndex || 1));
const trip = computed(() => tripStore.trips.find((item) => item.id === tripId));
const dayCount = computed(() => (trip.value ? tripDayCount(trip.value) : 1));
const day = computed(() => dayPlanStore.dayOf(tripId, dayIndex.value));
const allowance = computed(() => scheduleStore.allowance(tripId));
const dayCost = computed(() => (day.value ? calcDayCost(day.value, spotStore.spots) : 0));
const remaining = computed(() => allowance.value - dayCost.value);
const pendingItems = computed(() => scheduleStore.pendingFor(tripId, dayIndex.value));
const daySpots = computed(() =>
  (day.value?.items || [])
    .map((item) => ({ item, spot: spotStore.spots.find((spot) => spot.id === item.spot_id) }))
    .filter((entry) => entry.spot) as { item: DayPlanItem; spot: Spot }[],
);

function goDay(value: string | number) {
  router.push('/planner/' + tripId + '/' + value);
}

watch(dayIndex, () => dayPlanStore.ensureDay(tripId, dayIndex.value, scheduleStore.dayDate(tripId, dayIndex.value)), { immediate: true });

onMounted(() => {
  if (listEl.value) {
    new Sortable(listEl.value, {
      animation: 150,
      onEnd: (evt: SortableEvent) => {
        dayPlanStore.reorder(tripId, dayIndex.value, evt.oldIndex || 0, evt.newIndex || 0);
        scheduleStore.revalidateDay(tripId, dayIndex.value);
      },
    });
  }
});
</script>
<style scoped>
.over { color: #c45656; font-weight: 600; }
</style>
