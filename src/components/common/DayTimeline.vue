<template>
  <section class="band">
    <h3>第 {{ day.day_index }} 天 · {{ day.date }}</h3>
    <ol class="timeline">
      <li v-for="itemEval in evaluation.items" :key="itemEval.spot_id + itemEval.start_time" :class="{ conflict: itemEval.issues.length }">
        <div class="row">
          <strong>{{ spotName(itemEval.spot_id) }}</strong>
          <span class="muted">{{ itemEval.start_time }}-{{ itemEval.end_time }}</span>
        </div>
        <div class="row muted">
          <span>{{ transportText[itemEval.transport] }} · 路上 {{ itemEval.travel_min }} 分钟 · 交通 ¥{{ itemEval.transport_cost }} · 门票 ¥{{ itemEval.spot_cost }}</span>
        </div>
        <p v-for="(issue, index) in itemEval.issues" :key="index" class="issue">⚠ {{ issue.message }}</p>
      </li>
    </ol>
    <p v-if="!evaluation.items.length" class="muted">这一天还没有安排。</p>
    <p class="total">
      门票 ¥{{ evaluation.spot_cost }} · 交通 ¥{{ evaluation.transport_cost }} ·
      当天合计 <strong>¥{{ evaluation.spent }}</strong>
      <template v-if="budgetLimit != null"> / 可支配 ¥{{ budgetLimit }} · 剩余 ¥{{ Math.max(0, budgetLimit - evaluation.spent) }}</template>
    </p>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { DayPlan } from '../../models/dayPlan';
import type { Spot } from '../../models/spot';
import { transportText } from '../../utils/formatters';
import { evaluateDay } from '../../utils/scheduler';

const props = defineProps<{ day: DayPlan; spots: Spot[]; budgetLimit?: number }>();
const evaluation = computed(() => evaluateDay(props.day, props.spots, props.budgetLimit ?? Number.POSITIVE_INFINITY));
const spotName = (id: string) => props.spots.find((spot) => spot.id === id)?.name || '未知景点';
</script>
<style scoped>
.timeline { list-style: none; margin: 0; padding: 0; }
.timeline li { border-left: 3px solid #9dc88a; padding: 4px 0 12px 12px; margin-bottom: 4px; }
.timeline li.conflict { border-left-color: #e3a0a0; }
.row { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.issue { color: #c4564a; margin: 2px 0 0; font-size: 13px; }
.total { border-top: 1px dashed #a8b8a1; padding-top: 8px; margin-bottom: 0; }
</style>
