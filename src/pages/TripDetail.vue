<template>
  <main class="page" v-if="trip">
    <TripHeader :trip="trip" />
    <div class="toolbar">
      <el-button type="primary" @click="router.push('/spots')">添加景点</el-button>
      <el-button @click="router.push('/planner/' + trip.id + '/1')">编排第 1 天</el-button>
      <el-button @click="router.push('/share')">分享预览</el-button>
    </div>
    <section class="grid">
      <BudgetChart :spent="stats.value.budget.spent" :remaining="stats.value.budget.remaining" />
      <div class="band">
        <strong>统计</strong>
        <p>天数 {{ stats.value.days }} · 景点 {{ stats.value.spotCount }} · 待排 {{ scheduleStore.pendingCountFor(trip.id) }}</p>
        <p class="muted">{{ stats.value.budget.warning }}</p>
      </div>
    </section>
    <template v-for="day in tripDays" :key="day.id">
      <DayTimeline :day="day" :spots="spotStore.spots" :daily-budget="allowance" />
      <PendingList
        :items="scheduleStore.pendingFor(trip.id, day.day_index)"
        :spots="spotStore.spots"
        @confirm="scheduleStore.confirm"
        @dismiss="scheduleStore.dismiss"
      />
      <div class="toolbar">
        <el-button text type="primary" @click="router.push('/planner/' + trip.id + '/' + day.day_index)">
          去编排第 {{ day.day_index }} 天
        </el-button>
      </div>
    </template>
  </main>
  <main v-else class="page"><EmptyState title="旅行不存在" /></main>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useDayPlanStore } from '../stores/dayPlanStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { useTripStats } from '../hooks/useTripStats';
import TripHeader from '../components/common/TripHeader.vue';
import DayTimeline from '../components/common/DayTimeline.vue';
import BudgetChart from '../components/common/BudgetChart.vue';
import PendingList from '../components/common/PendingList.vue';
import EmptyState from '../components/common/EmptyState.vue';
const route = useRoute();
const router = useRouter();
const tripStore = useTripStore();
const spotStore = useSpotStore();
const dayPlanStore = useDayPlanStore();
const scheduleStore = useScheduleStore();
const trip = computed(() => tripStore.trips.find((item) => item.id === route.params.id));
const tripDays = computed(() =>
  dayPlanStore.dayPlans.filter((day) => day.trip_id === route.params.id).sort((a, b) => a.day_index - b.day_index),
);
const allowance = computed(() => (trip.value ? scheduleStore.allowance(trip.value.id) : 0));
const stats = computed(() => trip.value ? useTripStats(trip.value, dayPlanStore.dayPlans, spotStore.spots) : { value: { days: 0, spotCount: 0, budget: { spent: 0, remaining: 0, warning: '' } } });
</script>
