<template>
  <main class="page" v-if="trip">
    <TripHeader :trip="trip" />
    <section class="band">
      <p>全程已排 ¥{{ spent }} · 预算剩余 ¥{{ trip.budget - spent }} · 每天可支配 ¥{{ dayLimit }}</p>
      <el-button type="primary" @click="copyText">复制行程文本</el-button>
    </section>
    <DayTimeline v-for="day in tripDays" :key="day.id" :day="day" :spots="spotStore.spots" :budget-limit="dayLimit" />
    <EmptyState v-if="!tripDays.length" title="还没有已确认的行程" :description="messages.shareEmpty" />
  </main>
  <main v-else class="page"><EmptyState title="还没有可分享的行程" :description="messages.shareEmpty" /></main>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { evaluateDay, dayBudgetLimit } from '../utils/scheduler';
import { calcTripCost } from '../utils/budgetCalculator';
import { transportText } from '../utils/formatters';
import { messages } from '../constants/messages';
import { toast } from '../utils/message';
import TripHeader from '../components/common/TripHeader.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import EmptyState from '../components/common/EmptyState.vue';
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();
const trip = computed(() => tripStore.trips[0]);
const tripDays = computed(() => dayPlanStore.dayPlans.filter((day) => day.trip_id === trip.value?.id).sort((a, b) => a.day_index - b.day_index));
const dayLimit = computed(() => (trip.value ? dayBudgetLimit(trip.value) : 0));
const spent = computed(() => calcTripCost(tripDays.value, spotStore.spots));
function buildText() {
  if (!trip.value) return '';
  const lines = [`TripWeaver 行程单：${trip.value.title}`, `${trip.value.destination} · ${trip.value.start_date} 至 ${trip.value.end_date}`];
  for (const day of tripDays.value) {
    lines.push(`第 ${day.day_index} 天（${day.date}）`);
    const evaluation = evaluateDay(day, spotStore.spots, dayLimit.value || Number.POSITIVE_INFINITY);
    for (const item of evaluation.items) {
      const name = spotStore.spots.find((spot) => spot.id === item.spot_id)?.name || '未知景点';
      lines.push(`  ${item.start_time}-${item.end_time} ${name} · ${transportText[item.transport]} · 门票¥${item.spot_cost} 交通¥${item.transport_cost}`);
    }
    lines.push(`  当天合计 ¥${evaluation.spent} / 可支配 ¥${dayLimit.value}`);
  }
  lines.push(`全程已排 ¥${spent.value}，预算剩余 ¥${trip.value.budget - spent.value}`);
  return lines.join('\n');
}
function copyText() {
  const text = buildText();
  if (!text) return;
  navigator.clipboard?.writeText(text);
  toast.ok(messages.shareCopied);
}
</script>
