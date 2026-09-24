import type { PendingItem } from '../models/pendingItem';
import { STORAGE_KEYS } from '../constants/storageVersion';
import { loadLocal, saveLocal } from '../utils/storage';

export const pendingApi = {
  list: () => loadLocal<PendingItem[]>(STORAGE_KEYS.pendingItems, []),
  save: (items: PendingItem[]) => saveLocal(STORAGE_KEYS.pendingItems, items),
};
