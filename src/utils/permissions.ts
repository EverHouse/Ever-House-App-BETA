export type BaseTier = 'Social' | 'Core' | 'Premium' | 'Corporate' | 'VIP';

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

export function getDisplayTierName(tierName: string): string {
  const baseTier = getBaseTier(tierName);
  return baseTier;
}

export type MembershipTier = BaseTier;
