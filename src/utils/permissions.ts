export type BaseTier = 'Social' | 'Core' | 'Premium' | 'Corporate' | 'VIP';

export interface TierPermissions {
  canBookSimulators: boolean;
  canBookWellness: boolean;
  advanceBookingDays: number;
  guestPassesPerYear: number;
  dailySimulatorMinutes: number;
  dailyConfRoomMinutes: number;
  hasGroupLessons: boolean;
  hasExtendedSessions: boolean;
  hasPrivateLesson: boolean;
  hasSimulatorGuestPasses: boolean;
  hasDiscountedMerch: boolean;
  unlimitedAccess?: boolean;
}

export const TIER_PERMISSIONS: Record<BaseTier, TierPermissions> = {
  Social: {
    canBookSimulators: false,
    canBookWellness: true,
    advanceBookingDays: 7,
    guestPassesPerYear: 2,
    dailySimulatorMinutes: 0,
    dailyConfRoomMinutes: 0,
    hasGroupLessons: false,
    hasExtendedSessions: false,
    hasPrivateLesson: false,
    hasSimulatorGuestPasses: false,
    hasDiscountedMerch: false,
  },
  Core: {
    canBookSimulators: true,
    canBookWellness: true,
    advanceBookingDays: 7,
    guestPassesPerYear: 4,
    dailySimulatorMinutes: 60,
    dailyConfRoomMinutes: 60,
    hasGroupLessons: false,
    hasExtendedSessions: false,
    hasPrivateLesson: false,
    hasSimulatorGuestPasses: false,
    hasDiscountedMerch: false,
  },
  Premium: {
    canBookSimulators: true,
    canBookWellness: true,
    advanceBookingDays: 10,
    guestPassesPerYear: 8,
    dailySimulatorMinutes: 90,
    dailyConfRoomMinutes: 90,
    hasGroupLessons: true,
    hasExtendedSessions: true,
    hasPrivateLesson: true,
    hasSimulatorGuestPasses: true,
    hasDiscountedMerch: true,
  },
  Corporate: {
    canBookSimulators: true,
    canBookWellness: true,
    advanceBookingDays: 10,
    guestPassesPerYear: 15,
    dailySimulatorMinutes: 90,
    dailyConfRoomMinutes: 90,
    hasGroupLessons: false,
    hasExtendedSessions: false,
    hasPrivateLesson: false,
    hasSimulatorGuestPasses: false,
    hasDiscountedMerch: false,
  },
  VIP: {
    canBookSimulators: true,
    canBookWellness: true,
    advanceBookingDays: 14,
    guestPassesPerYear: 999,
    dailySimulatorMinutes: 999,
    dailyConfRoomMinutes: 999,
    hasGroupLessons: true,
    hasExtendedSessions: true,
    hasPrivateLesson: true,
    hasSimulatorGuestPasses: true,
    hasDiscountedMerch: true,
    unlimitedAccess: true,
  },
};

export function getBaseTier(tierName: string): BaseTier {
  if (!tierName) return 'Social';
  
  const normalizedTier = tierName.trim();
  const words = normalizedTier.split(/\s+/);
  
  if (words.length === 0) return 'Social';
  
  const lastWord = words[words.length - 1];
  const firstWord = words[0].toLowerCase();
  
  if (firstWord === 'vip' || lastWord.toLowerCase() === 'vip') {
    return 'VIP';
  }
  
  const baseTiers: BaseTier[] = ['Social', 'Core', 'Premium', 'Corporate'];
  for (const tier of baseTiers) {
    if (lastWord.toLowerCase() === tier.toLowerCase()) {
      return tier;
    }
  }
  
  for (const tier of baseTiers) {
    if (normalizedTier.toLowerCase().includes(tier.toLowerCase())) {
      return tier;
    }
  }
  
  return 'Social';
}

export function isFoundingMember(tierName: string, isFounding?: boolean): boolean {
  if (isFounding !== undefined) {
    return isFounding;
  }
  if (!tierName) return false;
  return tierName.toLowerCase().startsWith('founding') || tierName.toLowerCase().includes('founding');
}

export function isVIPMember(tierName: string): boolean {
  if (!tierName) return false;
  const words = tierName.toLowerCase().split(/\s+/);
  return words.includes('vip');
}

export function getTierPermissions(tier: string): TierPermissions {
  const baseTier = getBaseTier(tier);
  return TIER_PERMISSIONS[baseTier] || TIER_PERMISSIONS.Social;
}

export function canAccessResource(tier: string, resourceType: string): boolean {
  const permissions = getTierPermissions(tier);
  
  if (permissions.unlimitedAccess) {
    return true;
  }
  
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

export function getDisplayTierName(tierName: string): string {
  const baseTier = getBaseTier(tierName);
  return baseTier;
}

export type MembershipTier = BaseTier;
