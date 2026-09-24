<template>
  <div class="mini" :class="{ conflict }">
    <div>
      <strong>{{ spot.name }}</strong>
      <span v-if="timeRange" class="muted"> {{ timeRange }}</span>
      <p v-if="statusText" class="status">{{ statusText }}</p>
    </div>
    <div class="side">
      <span>{{ formatCurrency(spot.price) }}</span>
      <el-button v-if="removable" link type="danger" size="small" @click.stop="$emit('remove', spot.id)">移回待排</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { Spot } from '../../models/spot';
import { formatCurrency } from '../../utils/formatters';
defineProps<{ spot: Spot; timeRange?: string; statusText?: string; conflict?: boolean; removable?: boolean }>();
defineEmits<{ remove: [id: string] }>();
</script>
<style scoped>
.mini { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px dashed #a8b8a1; border-radius: 8px; margin-bottom: 8px; background: #fff; cursor: grab; }
.mini.conflict { border-color: #e3a0a0; background: #fff7f5; }
.side { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.status { color: #c4564a; font-size: 12px; margin: 4px 0 0; }
</style>
