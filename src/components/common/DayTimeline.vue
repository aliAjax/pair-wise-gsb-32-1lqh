<template>
  <section class="band">
    <h3>第 {{ day.day_index }} 天 · {{ day.date }}</h3>
    <ol>
      <li v-for="item in day.items" :key="item.spot_id + item.start_time">
        <strong>{{ spotName(item.spot_id) }}</strong>
        <span class="muted">
          {{ item.start_time }}-{{ item.end_time }} · {{ transportText[item.transport] }}<template v-if="item.note"> · {{ item.note }}</template>
        </span>
        <span class="price">{{ formatCurrency(spotPrice(item.spot_id)) }}</span>
      </li>
    </ol>
    <p v-if="!day.items.length" class="muted">这一天还没有安排。</p>
    <footer v-if="day.items.length" class="day-total">
      当天合计 {{ formatCurrency(dayCost) }}
      <template v-if="dailyBudget != null">
        · 可支配 {{ formatCurrency(dailyBudget) }}
        <span v-if="dayCost > dailyBudget" class="over">超出 {{ formatCurrency(dayCost - dailyBudget) }}</span>
        <span v-else class="muted">剩余 {{ formatCurrency(dailyBudget - dayCost) }}</span>
      </template>
    </footer>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { DayPlan } from '../../models/dayPlan';
import type { Spot } from '../../models/spot';
import { transportText, formatCurrency } from '../../utils/formatters';
import { calcDayCost } from '../../utils/budgetCalculator';
const props = defineProps<{ day: DayPlan; spots: Spot[]; dailyBudget?: number }>();
const spotName = (id: string) => props.spots.find((spot) => spot.id === id)?.name || '未知景点';
const spotPrice = (id: string) => props.spots.find((spot) => spot.id === id)?.price || 0;
const dayCost = computed(() => calcDayCost(props.day, props.spots));
</script>
<style scoped>
.day-total { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #dbe7cf; }
.price { margin-left: 8px; }
.over { color: #c45656; font-weight: 600; margin-left: 6px; }
</style>
