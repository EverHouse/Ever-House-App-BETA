export const MEMBER_BOOKING_PRODUCT_ID = 'PLACEHOLDER_PRODUCT_ID';

const AUTHORIZED_TIER_KEYWORDS = ['Core', 'VIP', 'Premium', 'Corporate'];
const AUTHORIZED_TAG_KEYWORDS = ['Founding'];

export function isAuthorizedForMemberBooking(tier: string | null | undefined, tags: string[] = []): boolean {
  if (!tier && tags.length === 0) return false;
  
  const tierLower = (tier || '').toLowerCase();
  const tierAuthorized = AUTHORIZED_TIER_KEYWORDS.some(keyword => 
    tierLower.includes(keyword.toLowerCase())
  );
  
  if (tierAuthorized) return true;
  
  const tagsLower = tags.map(t => t.toLowerCase());
  const tagAuthorized = AUTHORIZED_TAG_KEYWORDS.some(keyword =>
    tagsLower.some(tag => tag.includes(keyword.toLowerCase()))
  );
  
  return tagAuthorized;
}

export interface BookingResult {
  success: boolean;
  bookingType: 'member' | 'payment_required';
  trackmanProductId?: string;
}

export function getBookingType(tier: string | null | undefined, tags: string[] = []): BookingResult {
  if (isAuthorizedForMemberBooking(tier, tags)) {
    return {
      success: true,
      bookingType: 'member',
      trackmanProductId: MEMBER_BOOKING_PRODUCT_ID
    };
  }
  
  return {
    success: true,
    bookingType: 'payment_required'
  };
}
