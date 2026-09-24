# TripWeaver 旅游行程规划助手

## 快速启动

```bash
pnpm install
pnpm dev
```

访问地址：http://localhost:18417

TripWeaver 是一款纯前端旅行规划应用，支持创建旅行、探索景点、编排每日行程、预算统计和分享预览。

## 主要功能

- 我的旅行：创建、筛选、删除旅行计划。
- 行程详情：查看每日行程、预算图表、当天金额和待排区卡点。
- 景点探索：按 SpotCategory 搜索和筛选，收藏；收录景点时按开放时刻和交通方式实时预览可行时段。
- 可解释排程：撞车、闭馆或超出当天可支配金额的景点留在待排区，标明卡在哪个条件，确认调整方案后才放进当天。
- 行程编排：SortableJS 拖拽排序，改序后自动重检，撞车的项移回待排区。
- 分享预览：与详情、编排页展示同一份顺序与金额，生成可复制的行程文本。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端 | Vue 3 + TypeScript |
| 构建 | Vite |
| UI | Element Plus + ECharts |
| 状态 | Pinia |
| 路由 | Vue Router 4 |
| 持久化 | localStorage + Dexie.js |
| 交互 | sortablejs |

## 目录结构

```
src/
├── api/
├── stores/
├── models/
├── types/
├── components/common/
├── hooks/
├── pages/
├── router/
├── utils/
├── config/
└── constants/
```

## 数据持久化

本地数据通过 `utils/storage.ts` 统一写入 localStorage，并保留 Dexie 数据库对象用于后续 IndexedDB 扩展。版本键来自 `constants/storageVersion.ts`。已确认的每日行程存于 `dayPlans` 键，待排项及其卡点、调整方案存于 `pendingItems` 键（`api/pendingApi.ts`），重开浏览器后两者都会恢复。

排程规则（开放时刻解析、交通耗时、可行时段求解、卡点解释）集中在 `utils/scheduler.ts` 与 `constants/schedule.ts`，为纯函数；编排动作（收录、确认、改序重检）在 `stores/scheduleStore.ts`，页面只消费 store，三者分离。

## 环境变量

`VITE_AMAP_KEY`：高德地图 key。未配置时使用 demo-key，地图主题配置同时出现在 `config/map.ts`、`SpotCard`、`DayTimeline`、`Planner` 相关逻辑中。

## 枚举出现位置清单

SpotCategory：
- `src/constants/spot.ts`
- `src/models/spot.ts`
- `src/stores/spotStore.ts`
- `src/components/common/CategoryFilter.vue`
- `src/components/common/SpotCard.vue`
- `src/pages/Spots.vue`
- `src/pages/TripDetail.vue`
- `src/utils/formatters.ts`
- `src/router/guards.ts`

TripStatus：
- `src/constants/trip.ts`
- `src/models/trip.ts`
- `src/stores/tripStore.ts`
- `src/components/common/TripCard.vue`
- `src/pages/Trips.vue`
- `src/utils/formatters.ts`
- `src/router/guards.ts`

## License

MIT

