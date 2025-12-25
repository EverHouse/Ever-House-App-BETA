import { pool } from './db';

export interface TierLimits {
  sim_hours_limit: number;
  guest_passes_per_month: number;
  booking_window_days: number;
  daily_conf_room_minutes: number;
  can_book_simulators: boolean;
  can_book_conference: boolean;
  can_book_wellness: boolean;
  has_group_lessons: boolean;
  has_extended_sessions: boolean;
  has_private_lesson: boolean;
  has_simulator_guest_passes: boolean;
  has_discounted_merch: boolean;
  unlimited_access: boolean;
}

const DEFAULT_TIER_LIMITS: TierLimits = {
  sim_hours_limit: 0,
  guest_passes_per_month: 0,
  booking_window_days: 7,
  daily_conf_room_minutes: 0,
  can_book_simulators: false,
  can_book_conference: false,
  can_book_wellness: true,
  has_group_lessons: false,
  has_extended_sessions: false,
  has_private_lesson: false,
  has_simulator_guest_passes: false,
  has_discounted_merch: false,
  unlimited_access: false,
};

const tierCache = new Map<string, { data: TierLimits; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getTierLimits(tierName: string): Promise<TierLimits> {
  if (!tierName) {
    return DEFAULT_TIER_LIMITS;
  }
  
  const cacheKey = tierName.toLowerCase();
  const cached = tierCache.get(cacheKey);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  
  try {
    const result = await pool.query(
      `SELECT sim_hours_limit, guest_passes_per_month, booking_window_days, 
              daily_conf_room_minutes, can_book_simulators, can_book_conference,
              can_book_wellness, has_group_lessons, has_extended_sessions,
              has_private_lesson, has_simulator_guest_passes, has_discounted_merch,
              unlimited_access
       FROM membership_tiers 
       WHERE LOWER(name) = LOWER($1) OR LOWER(slug) = LOWER($1)
       LIMIT 1`,
      [tierName]
    );
    
    if (result.rows.length === 0) {
      console.warn(`[getTierLimits] No tier found for "${tierName}", using defaults`);
      return DEFAULT_TIER_LIMITS;
    }
    
    const data = result.rows[0] as TierLimits;
    tierCache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL_MS });
    
    return data;
  } catch (error) {
    console.error('[getTierLimits] Error fetching tier limits:', error);
    return DEFAULT_TIER_LIMITS;
  }
}

export function clearTierCache(): void {
  tierCache.clear();
}

export function invalidateTierCache(tierName: string): void {
  tierCache.delete(tierName.toLowerCase());
}

export { DEFAULT_TIER_LIMITS };
