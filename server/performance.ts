// Performance utilities for medical inventory system
import memoize from 'memoizee';
import { storage } from './storage';

// Cache frequently accessed data for 5 minutes
export const getCachedAmbulancePosts = memoize(
  () => storage.getAmbulancePosts(),
  { maxAge: 5 * 60 * 1000 } // 5 minutes
);

export const getCachedCabinets = memoize(
  () => storage.getCabinets(),
  { maxAge: 10 * 60 * 1000 } // 10 minutes (cabinets rarely change)
);

export const getCachedPostContacts = memoize(
  () => storage.getPostContacts(),
  { maxAge: 10 * 60 * 1000 } // 10 minutes
);

// Cache cabinet orders by post for 15 minutes
export const getCachedCabinetOrderByPost = memoize(
  (postId: string) => storage.getCabinetsOrderedByPost(postId),
  { maxAge: 15 * 60 * 1000, primitive: true }
);

// Clear all caches when data is modified
export function clearPerformanceCache() {
  getCachedAmbulancePosts.clear();
  getCachedCabinets.clear();
  getCachedPostContacts.clear();
  getCachedCabinetOrderByPost.clear();
}