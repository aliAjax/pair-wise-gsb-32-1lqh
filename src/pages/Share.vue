<template>
  <main class="page" v-if="trip">
    <TripHeader :trip="trip" />
    <DayTimeline v-for="day in tripDays" :key="day.id" :day="day" :spots="spotStore.spots" :daily-budget="allowance" />
    <section class="band">
      <strong>全程合计 {{ formatCurrency(total) }}</strong>
      <span class="muted"> · 预算 {{ formatCurrency(trip.budget, trip.currency) }} · 待排 {{ pendingCount }} 项（未计入）</span>
    </section>
    <el-button type="primary" @click="copyText">复制行程文本</el-button>
  </main>
  <main v-else class="page"><EmptyState title="还没有可分享的旅行" /></main>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { useScheduleStore } from '../stores/scheduleStore';
import TripHeader from '../components/common/TripHeader.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import EmptyState from '../components/common/EmptyState.vue';
import { calcTripCost } from '../utils/budgetCalculator';
import { formatCurrency, transportText } from '../utils/formatters';
import { toast } from '../utils/message';
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();
const scheduleStore = useScheduleStore();
const trip = computed(() => tripStore.trips[0]);
const tripDays = computed(() =>
  dayPlanStore.dayPlans.filter((day) => day.trip_id === trip.value?.id).sort((a, b) => a.day_index - b.day_index),
);
const allowance = computed(() => (trip.value ? scheduleStore.allowance(trip.value.id) : 0));
const total = computed(() => calcTripCost(tripDays.value, spotStore.spots));
const pendingCount = computed(() => (trip.value ? scheduleStore.pendingCountFor(trip.value.id) : 0));
const spotName = (id: string) => spotStore.spots.find((spot) => spot.id === id)?.name || '未知景点';
const spotPrice = (id: string) => spotStore.spots.find((spot) => spot.id === id)?.price || 0;
function copyText() {
  if (!trip.value) return;
  const lines = [`TripWeaver 行程单：${trip.value.title}`, `${trip.value.destination} · ${trip.value.start_date} 至 ${trip.value.end_date}`];
  for (const day of tripDays.value) {
    lines.push(`第 ${day.day_index} 天（${day.date}）`);
    for (const item of day.items) {
      lines.push(`  ${item.start_time}-${item.end_time} ${spotName(item.spot_id)} ${formatCurrency(spotPrice(item.spot_id))}（${transportText[item.transport]}）`);
    }
  }
  lines.push(`全程合计 ${formatCurrency(total.value)}`);
  navigator.clipboard?.writeText(lines.join('\n'));
  toast.ok('行程文本已复制');
}
</script>
