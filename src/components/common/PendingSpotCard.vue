<template>
  <article class="pending-card" :class="{ blocked: !proposal?.feasible }">
    <div class="head">
      <strong>{{ spot?.name || '未知景点' }}</strong>
      <el-tag size="small" :type="proposal?.feasible ? 'success' : 'danger'">
        {{ proposal?.feasible ? '可排入' : '待调整' }}
      </el-tag>
      <el-button link type="danger" size="small" @click="scheduleStore.remove(entry.id)">移除</el-button>
    </div>
    <p class="muted">{{ spot?.open_time }} · {{ spot ? formatCurrency(spot.price, trip?.currency) : '' }}</p>

    <div class="controls">
      <el-select :model-value="entry.day_index" size="small" style="width: 110px"
        @change="(v: number) => scheduleStore.updateDraft(entry.id, { day_index: Number(v) })">
        <el-option v-for="d in dayCount" :key="d" :label="`第 ${d} 天`" :value="d" />
      </el-select>
      <el-select :model-value="entry.transport" size="small" style="width: 100px"
        @change="(v: TransportMode) => scheduleStore.updateDraft(entry.id, { transport: v })">
        <el-option v-for="item in TRANSPORT_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select :model-value="entry.visit_minutes" size="small" style="width: 130px"
        @change="(v: number) => scheduleStore.updateDraft(entry.id, { visit_minutes: Number(v) })">
        <el-option v-for="m in VISIT_DURATION_OPTIONS" :key="m" :label="`游览 ${m} 分钟`" :value="m" />
      </el-select>
    </div>

    <el-alert v-if="proposal?.feasible" type="success" :closable="false" show-icon>
      <template #title>
        可行时段 {{ proposal.start_time }}–{{ proposal.end_time }} · 路上约 {{ proposal.travel_min }} 分钟
        （{{ transportText[proposal.transport] }} ¥{{ proposal.transport_cost }}）· 本程合计 ¥{{ proposal.cost }}
        · 排完当天 ¥{{ proposal.spent_after }} / ¥{{ proposal.budget_limit }}
      </template>
    </el-alert>
    <el-alert v-else-if="proposal" type="error" :closable="false" show-icon>
      <template #title>
        <div v-for="(item, index) in proposal.issues" :key="index" class="issue">· {{ item.message }}</div>
      </template>
    </el-alert>

    <div class="toolbar">
      <el-button type="primary" size="small" :disabled="!proposal?.feasible"
        @click="scheduleStore.confirm(entry.id)">确认排入第 {{ entry.day_index }} 天</el-button>
    </div>
  </article>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { PendingSpot } from '../../models/schedule';
import type { TransportMode } from '../../constants/schedule';
import { TRANSPORT_OPTIONS, VISIT_DURATION_OPTIONS } from '../../constants/schedule';
import { useScheduleStore } from '../../stores/scheduleStore';
import { useSpotStore } from '../../stores/spotStore';
import { useTripStore } from '../../stores/tripStore';
import { tripDayCount } from '../../utils/scheduler';
import { formatCurrency, transportText } from '../../utils/formatters';

const props = defineProps<{ entry: PendingSpot }>();
const scheduleStore = useScheduleStore();
const spotStore = useSpotStore();
const tripStore = useTripStore();

const spot = computed(() => spotStore.spots.find((item) => item.id === props.entry.spot_id));
const trip = computed(() => tripStore.trips.find((item) => item.id === props.entry.trip_id));
const dayCount = computed(() => (trip.value ? tripDayCount(trip.value) : 1));
const proposal = computed(() => scheduleStore.evaluate(props.entry));
</script>
<style scoped>
.pending-card { background: #fff; border: 1px solid #b7d8a8; border-radius: 8px; padding: 14px; }
.pending-card.blocked { border-color: #e3a0a0; background: #fff7f5; }
.head { display: flex; align-items: center; gap: 10px; }
.head .el-button { margin-left: auto; }
.controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.issue { line-height: 1.6; }
</style>
