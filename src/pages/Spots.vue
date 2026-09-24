<template>
  <main class="page">
    <h1>景点探索</h1>
    <div class="toolbar">
      <el-input v-model="spotStore.keyword" placeholder="搜索景点、标签" style="max-width: 260px" />
      <CategoryFilter v-model="spotStore.category" />
    </div>
    <EmptyState v-if="!spotStore.filteredSpots.length" title="没有景点" :description="messages.emptySpots" />
    <section class="grid">
      <SpotCard v-for="spot in spotStore.filteredSpots" :key="spot.id" :spot="spot" @favorite="spotStore.toggleFavorite" @add="openDialog" />
    </section>

    <el-dialog v-model="dialogVisible" title="加入行程" width="520px">
      <el-form v-if="currentSpot" label-width="90px">
        <el-form-item label="景点">
          <strong>{{ currentSpot.name }}</strong>
          <span class="muted">（开放 {{ currentSpot.open_time }} · {{ formatCurrency(currentSpot.price) }}）</span>
        </el-form-item>
        <el-form-item label="旅行计划">
          <el-select v-model="form.tripId" style="width: 100%">
            <el-option v-for="trip in tripStore.trips" :key="trip.id" :label="trip.title" :value="trip.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="第几天">
          <el-select v-model="form.dayIndex" style="width: 100%">
            <el-option v-for="n in dayCount" :key="n" :label="'第 ' + n + ' 天'" :value="n" />
          </el-select>
        </el-form-item>
        <el-form-item label="期望开始">
          <el-time-select v-model="form.desiredStart" start="08:00" step="00:30" end="21:00" style="width: 100%" />
        </el-form-item>
        <el-form-item label="停留时长">
          <el-select v-model="form.durationMin" style="width: 100%">
            <el-option v-for="min in STAY_MIN_OPTIONS" :key="min" :label="min + ' 分钟'" :value="min" />
          </el-select>
        </el-form-item>
        <el-form-item label="交通方式">
          <el-select v-model="form.transport" style="width: 100%">
            <el-option v-for="item in TRANSPORT_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <div v-if="preview" class="preview">
        <p v-if="preview.feasible && preview.item" class="ok">
          可行时段：{{ preview.item.start_time }}-{{ preview.item.end_time }}（含交通缓冲）
        </p>
        <template v-else>
          <p v-for="(violation, index) in preview.violations" :key="index" class="blocked">
            <el-tag size="small" :type="violation.code === 'BUDGET' ? 'warning' : 'danger'">{{ violationText[violation.code] }}</el-tag>
            {{ violation.message }}
          </p>
          <p v-if="preview.suggestion" class="ok">
            可调整为 {{ preview.suggestion.start_time }}-{{ preview.suggestion.end_time }} · {{ transportText[preview.suggestion.transport] }}，放入待排区后确认即可排入
          </p>
        </template>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!preview" @click="submit">
          {{ preview?.feasible ? '确认加入' : '放入待排区' }}
        </el-button>
      </template>
    </el-dialog>
  </main>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useTripStore } from '../stores/tripStore';
import { useSpotStore } from '../stores/spotStore';
import { useScheduleStore } from '../stores/scheduleStore';
import CategoryFilter from '../components/common/CategoryFilter.vue';
import SpotCard from '../components/common/SpotCard.vue';
import EmptyState from '../components/common/EmptyState.vue';
import { messages } from '../constants/messages';
import { TRANSPORT_OPTIONS, STAY_MIN_OPTIONS, violationText } from '../constants/schedule';
import { tripDayCount } from '../utils/budgetCalculator';
import { formatCurrency, transportText } from '../utils/formatters';
import type { TransportMode } from '../models/dayPlan';

const tripStore = useTripStore();
const spotStore = useSpotStore();
const scheduleStore = useScheduleStore();

const dialogVisible = ref(false);
const currentSpotId = ref('');
const form = reactive({ tripId: '', dayIndex: 1, desiredStart: '10:00', durationMin: 120, transport: 'metro' as TransportMode });

const currentSpot = computed(() => spotStore.spots.find((spot) => spot.id === currentSpotId.value));
const dayCount = computed(() => {
  const trip = tripStore.trips.find((item) => item.id === form.tripId);
  return trip ? tripDayCount(trip) : 1;
});
const preview = computed(() => {
  if (!form.tripId || !currentSpotId.value) return null;
  return scheduleStore.evaluate(form.tripId, form.dayIndex, {
    spotId: currentSpotId.value,
    desiredStart: form.desiredStart,
    durationMin: form.durationMin,
    transport: form.transport,
  });
});

function openDialog(spotId: string) {
  if (!tripStore.trips.length) tripStore.createTrip();
  currentSpotId.value = spotId;
  form.tripId = form.tripId || tripStore.trips[0]?.id || '';
  if (form.dayIndex > dayCount.value) form.dayIndex = 1;
  dialogVisible.value = true;
}

function submit() {
  if (!form.tripId) return;
  scheduleStore.stage(form.tripId, form.dayIndex, {
    spotId: currentSpotId.value,
    desiredStart: form.desiredStart,
    durationMin: form.durationMin,
    transport: form.transport,
  });
  dialogVisible.value = false;
}
</script>
<style scoped>
.preview { border-top: 1px dashed #dbe7cf; padding-top: 12px; }
.ok { color: #2d7a46; font-weight: 600; }
.blocked { color: #a15c07; }
</style>
