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
- 行程详情：查看每日行程、预算图表和共享时间线。
- 景点探索：按 SpotCategory 搜索和筛选，收藏并收录景点。
- 可解释排程：收录的景点先进入待排区，按开放时刻和交通方式算出可行时段；与前后安排撞车或超出当天可支配金额时留在待排区并说明卡在哪条条件，确认调整方案（改交通方式 / 游览时长 / 目标天）后才排入当天。
- 行程编排：SortableJS 拖拽排序，已确认条目实时重算路上时间与费用，冲突条目即时标出原因；可一键移回待排区。
- 分享预览：与详情、编排页同源的同一份顺序与金额，生成可复制的行程文本。

## 排程规则与分层

排程规则、持久化与页面三者分离：

- 规则层（纯函数，不碰存储）：`constants/schedule.ts`（交通速度/费用、默认游览时长、当天可排时段 08:00-22:00）+ `utils/scheduler.ts`（开放窗口解析、路上时间、费用、`evaluateDay` 逐条求值、`proposePlacement` 待排方案）。当天可支配金额 = 旅行预算 ÷ 旅行天数，见 `utils/budgetCalculator.ts`。
- 持久化层：`api/scheduleApi.ts` 把待排区写入 localStorage（键 `tripweaver-v1:pendingSpots`），已确认结果仍在 `tripweaver-v1:dayPlans`，重开浏览器两者都在。
- 页面层：`/planner` 待排区确认方案、`/trip/:id` 与 `/share` 通过共享的 `<DayTimeline>` 展示同一份求值结果（顺序、门票、交通费、当天合计）。
- 阻碍条件码：`OVERLAP`（与上一站撞车/赶不上闭馆）、`CLOSED`（开放窗口容不下）、`DAY_END`（超出当天可排时段）、`BUDGET`（超出当天可支配金额）、`MISSING_SPOT`（景点数据缺失）。

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
├── api/              # tripApi / spotApi / dayPlanApi / scheduleApi（待排区持久化）
├── stores/           # tripStore / spotStore / dayPlanStore / scheduleStore / themeStore
├── models/           # trip / spot / dayPlan / schedule（PendingSpot、排程方案类型）
├── types/
├── components/common/# TripCard、SpotCard、DayTimeline、PendingSpotCard、SpotMiniCard 等
├── hooks/
├── pages/            # Trips / TripDetail / Spots / Planner / Share
├── router/
├── utils/            # scheduler（排程规则）、budgetCalculator、storage、formatters 等
├── config/
└── constants/        # spot / trip / schedule（交通与时长规则）/ themes / messages / storageVersion
```

## 数据持久化

本地数据通过 `utils/storage.ts` 统一写入 localStorage，并保留 Dexie 数据库对象用于后续 IndexedDB 扩展。版本键来自 `constants/storageVersion.ts`：旅行、景点、已确认行程（dayPlans）与待排区（pendingSpots）分别存储，重开浏览器后待排项和确认结果都会恢复。

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

