import dayjs from 'dayjs';
import { SpotCategory } from '../constants/spot';
import { TripStatus } from '../constants/trip';
import { TRANSPORT_RULES, type TransportMode } from '../constants/schedule';

export const spotCategoryText: Record<SpotCategory, string> = {
  [SpotCategory.NATURE]: '自然风光',
  [SpotCategory.CULTURE]: '人文历史',
  [SpotCategory.FOOD]: '美食购物',
  [SpotCategory.ENTERTAINMENT]: '娱乐休闲',
};
export const tripStatusText: Record<TripStatus, string> = {
  [TripStatus.PLANNING]: '规划中',
  [TripStatus.ONGOING]: '进行中',
  [TripStatus.FINISHED]: '已结束',
};
export const transportText: Record<TransportMode, string> = {
  walk: TRANSPORT_RULES.walk.label,
  metro: TRANSPORT_RULES.metro.label,
  taxi: TRANSPORT_RULES.taxi.label,
  train: TRANSPORT_RULES.train.label,
};
export const formatDate = (value: string) => dayjs(value).format('YYYY-MM-DD');
export const formatCurrency = (value: number, currency = 'CNY') => new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(value);

