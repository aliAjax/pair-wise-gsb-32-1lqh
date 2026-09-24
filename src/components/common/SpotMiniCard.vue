<template>
  <div class="mini">
    <span>{{ spot.name }}</span>
    <span v-if="item" class="muted">{{ item.start_time }}-{{ item.end_time }} · {{ transportText[item.transport] }}</span>
    <span>{{ formatCurrency(spot.price) }}</span>
  </div>
</template>
<script setup lang="ts">
import type { Spot } from '../../models/spot';
import type { DayPlanItem } from '../../models/dayPlan';
import { formatCurrency, transportText } from '../../utils/formatters';
defineProps<{ spot: Spot; item?: DayPlanItem }>();
</script>
<style scoped>
.mini { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px dashed #a8b8a1; border-radius: 8px; margin-bottom: 8px; background: #fff; }
</style>
