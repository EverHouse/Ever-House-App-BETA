export type MembershipTier = 'Social' | 'Core' | 'Premium' | 'Corporate';

export interface TierPermissions {
  canBookSimulators: boolean;
  advanceBookingDays: number;
  guestPassesPerYear: number;
  dailySimulatorMinutes: number;
}

export const TIER_PERMISSIONS: Record<MembershipTier, TierPermissions> = {
  Social: {
    canBookSimulators: false,
    advanceBookingDays: 7,
    guestPassesPerYear: 2,
    dailySimulatorMinutes: 0,
  },
  Core: {
    canBookSimulators: true,
    advanceBookingDays: 7,
    guestPassesPerYear: 4,
    dailySimulatorMinutes: 60,
  },
  Premium: {
    canBookSimulators: true,
    advanceBookingDays: 10,
    guestPassesPerYear: 8,
    dailySimulatorMinutes: 90,
  },
  Corporate: {
    canBookSimulators: true,
    advanceBookingDays: 10,
    guestPassesPerYear: 15,
    dailySimulatorMinutes: 90,
  },
};

export function getTierPermissions(tier: string): TierPermissions {
  const normalizedTier = tier as MembershipTier;
  return TIER_PERMISSIONS[normalizedTier] || TIER_PERMISSIONS.Social;
}

export function canAccessResource(tier: string, resourceType: string): boolean {
  const permissions = getTierPermissions(tier);
  
  if (resourceType === 'simulator') {
    return permissions.canBookSimulators;
  }
  
  return true;
}

export function getMaxBookingDate(tier: string): Date {
  const permissions = getTierPermissions(tier);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + permissions.advanceBookingDays);
  return maxDate;
}
