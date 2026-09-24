import type { PendingSpot } from '../models/schedule';
import { STORAGE_KEYS } from '../constants/storageVersion';
import { loadLocal, saveLocal } from '../utils/storage';

export const scheduleApi = {
  listPending: () => loadLocal<PendingSpot[]>(STORAGE_KEYS.pendingSpots, []),
  savePending: (items: PendingSpot[]) => saveLocal(STORAGE_KEYS.pendingSpots, items),
};
