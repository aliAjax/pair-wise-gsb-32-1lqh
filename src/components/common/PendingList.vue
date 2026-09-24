<template>
  <section v-if="items.length" class="band pending">
    <h3>待排区（{{ items.length }}）</h3>
    <article v-for="entry in items" :key="entry.id" class="pending-item">
      <div class="pending-head">
        <strong>{{ spotName(entry.spot_id) }}</strong>
        <span class="muted">
          目标第 {{ entry.day_index }} 天<template v-if="entry.desired_start"> · 期望 {{ entry.desired_start }}</template>
          · {{ transportText[entry.transport] }}<template v-if="entry.duration_min"> · 停留 {{ entry.duration_min }} 分钟</template>
        </span>
      </div>
      <ul class="reasons">
        <li v-for="(violation, index) in entry.violations" :key="index">
          <el-tag size="small" :type="tagType(violation.code)">{{ violationText[violation.code] }}</el-tag>
          <span>{{ violation.message }}</span>
        </li>
      </ul>
      <p v-if="entry.suggestion" class="suggestion">
        调整方案：{{ entry.suggestion.start_time }}-{{ entry.suggestion.end_time }} · {{ transportText[entry.suggestion.transport] }}
      </p>
      <p v-else class="muted">{{ messages.pendingNoSuggestion }}</p>
      <div class="toolbar">
        <el-button v-if="entry.suggestion" size="small" type="primary" @click="$emit('confirm', entry.id)">采用方案并放入当天</el-button>
        <el-button size="small" @click="$emit('dismiss', entry.id)">移出待排区</el-button>
      </div>
    </article>
  </section>
</template>
<script setup lang="ts">
import type { PendingItem } from '../../models/pendingItem';
import type { Spot } from '../../models/spot';
import { violationText, type ViolationCode } from '../../constants/schedule';
import { transportText } from '../../utils/formatters';
import { messages } from '../../constants/messages';
const props = defineProps<{ items: PendingItem[]; spots: Spot[] }>();
defineEmits<{ confirm: [id: string]; dismiss: [id: string] }>();
const spotName = (id: string) => props.spots.find((spot) => spot.id === id)?.name || '未知景点';
const tagType = (code: ViolationCode) => (code === 'BUDGET' || code === 'TRAVEL' ? 'warning' : 'danger');
</script>
<style scoped>
.pending { border-color: #e6c98a; }
.pending-item { border-top: 1px dashed #e6c98a; padding: 12px 0; }
.pending-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.reasons { margin: 8px 0; padding-left: 18px; }
.reasons li { margin-bottom: 6px; }
.reasons .el-tag { margin-right: 8px; }
.suggestion { color: #2d7a46; font-weight: 600; }
</style>
