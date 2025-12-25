import { getTierLimits } from './tierService';

export const MEMBER_BOOKING_PRODUCT_ID = 'PLACEHOLDER_PRODUCT_ID';

const AUTHORIZED_TAG_KEYWORDS = ['Founding'];

export async function isAuthorizedForMemberBooking(tier: string | null | undefined, tags: string[] = []): Promise<boolean> {
  if (!tier && tags.length === 0) return false;
  
  // Check database-driven tier permissions
  if (tier) {
    const limits = await getTierLimits(tier);
    if (limits.can_book_simulators) return true;
  }
  
  // Fallback: check special tags (e.g., Founding members)
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

export async function getBookingType(tier: string | null | undefined, tags: string[] = []): Promise<BookingResult> {
  const isAuthorized = await isAuthorizedForMemberBooking(tier, tags);
  if (isAuthorized) {
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
