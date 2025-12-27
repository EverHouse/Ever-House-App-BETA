export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  isMajor?: boolean;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.0",
    date: "2025-12-16",
    title: "Foundation",
    isMajor: true,
    changes: [
      "React 19 + Vite frontend with Tailwind CSS",
      "Express.js backend with PostgreSQL database",
      "HubSpot CRM integration for member management",
      "Member profile and private events pages",
      "Custom logo and branding system"
    ]
  },
  {
    version: "1.1",
    date: "2025-12-17",
    title: "Design System & Branding",
    changes: [
      "Dynamic logo component (auto-adjusts for light/dark backgrounds)",
      "Consistent fonts: Playfair Display (headlines), Inter (body)",
      "Material Symbols icon system",
      "Brand color palette (Deep Green, Lavender, Bone)"
    ]
  },
  {
    version: "1.2",
    date: "2025-12-18",
    title: "Real-Time Booking System",
    changes: [
      "Database-backed booking with conflict detection",
      "Real-time availability from Google Calendar",
      "Duration-aware slot generation",
      "Accessibility improvements"
    ]
  },
  {
    version: "1.3",
    date: "2025-12-18",
    title: "Mobile Experience",
    changes: [
      "Haptic feedback for touch interactions",
      "Responsive layouts for iPhone, iPad, Desktop",
      "Image logos replacing text throughout"
    ]
  },
  {
    version: "1.4",
    date: "2025-12-19",
    title: "Tiered Membership System",
    changes: [
      "Membership tiers (Social, Core, Premium, Corporate, VIP)",
      "Guest pass system with atomic consumption",
      "Tier-based booking limits and restrictions"
    ]
  },
  {
    version: "1.5",
    date: "2025-12-19",
    title: "Forms & Inquiries",
    changes: [
      "Tour request, membership inquiry, private hire forms",
      "HubSpot Forms integration with local storage backup",
      "Inquiry admin panel with filtering and notes"
    ]
  },
  {
    version: "2.0",
    date: "2025-12-20",
    title: "Staff Portal & PWA",
    isMajor: true,
    changes: [
      "Staff Portal with 5-tab navigation",
      "Admin dashboard with quick access cards",
      "PWA support (installable, offline-capable)",
      "Service worker caching strategy",
      "Safe area support for iPhone notches"
    ]
  },
  {
    version: "2.1",
    date: "2025-12-21",
    title: "Security & Stability",
    changes: [
      "Verification code authentication (email-based, passwordless)",
      "Sessions stored in PostgreSQL",
      "Vite security update",
      "Network access restrictions"
    ]
  },
  {
    version: "2.2",
    date: "2025-12-22",
    title: "Google Calendar Sync",
    changes: [
      "Four-calendar integration (Golf, Conference, Events, Wellness)",
      "Two-way sync for bookings"
    ]
  },
  {
    version: "2.3",
    date: "2025-12-23",
    title: "Facility Closures",
    changes: [
      "Closure management in admin panel",
      "Auto-generated announcements for closures",
      "Calendar sync for closures (both Golf and Conference calendars)",
      "Staff calendar shows red 'CLOSED' blocks"
    ]
  },
  {
    version: "2.4",
    date: "2025-12-24",
    title: "Booking Request Workflow",
    changes: [
      "Request & Hold system with staff approval",
      "Cancellation with notifications and calendar cleanup",
      "Conflict detection (prevents approving over closures)",
      "'My Requests' tab for members"
    ]
  },
  {
    version: "2.5",
    date: "2025-12-25",
    title: "Notifications",
    changes: [
      "In-app real-time notification system",
      "Staff notifications for new booking requests",
      "Push notification support"
    ]
  },
  {
    version: "2.6",
    date: "2025-12-25",
    title: "Member Data Sync",
    changes: [
      "Membership tier synced on login",
      "Membership start date tracking",
      "Mindbody/Trackman CSV import"
    ]
  },
  {
    version: "2.7",
    date: "2025-12-25",
    title: "Polish & UX",
    changes: [
      "Status bar matches brand green",
      "Closure announcements visible immediately",
      "Landing page header transparency effects",
      "Virtual membership cards with benefits modal",
      "Black logo variant for light backgrounds",
      "Race condition fix for concurrent user creation",
      "Add-to-homescreen modal improvements",
      "Liquid glass effect on membership button",
      "Image optimization (WebP conversion)",
      "Booking validation for cancellations"
    ]
  },
  {
    version: "2.8",
    date: "2025-12-26",
    title: "Admin Changelog",
    changes: [
      "Admin-only changelog page showing version history",
      "Versioned updates with timestamps"
    ]
  },
  {
    version: "2.9",
    date: "2025-12-26",
    title: "Booking System Refinements",
    changes: [
      "Updated to use correct API endpoints for booking page prefetch",
      "Booking requests now succeed even if notifications fail (non-blocking)",
      "Fixed notification creation errors for closure events",
      "Improved booking request notification delivery to staff",
      "Limit 90-minute duration option to Premium+ tiers",
      "Updated club timezone to Pacific (America/Los_Angeles) for accurate time filtering",
      "Adjusted time slot availability to account for Pacific timezone",
      "Filter out unavailable time slots for same-day bookings",
      "Removed past booking times from availability choices",
      "Adjusted booking date picker to exclude current day from advance booking limits"
    ]
  },
  {
    version: "3.0",
    date: "2025-12-26",
    title: "UI/UX Polish & Visual Consistency",
    changes: [
      "Standardized class creation button height to match sync button (min-h-[60px])",
      "Improved button styling for consistent visual appearance across all sections",
      "Aligned wellness administration buttons with event button styling",
      "Made wellness class action buttons consistent with event buttons",
      "Increased external service icons on admin dashboard (sync, integration buttons)",
      "Made event sync icons larger to fill button space",
      "Made integration/connector icons larger for better visual prominence"
    ]
  },
  {
    version: "3.1",
    date: "2025-12-26",
    title: "Frontend Infrastructure",
    changes: [
      "Passed member tier information from frontend to booking API",
      "Fixed 'View as Member' mode by bypassing database tier lookups",
      "Updated database constraints to support all notification types"
    ]
  },
  {
    version: "3.2",
    date: "2025-12-27",
    title: "Staff Portal Navigation & Training Guide",
    isMajor: true,
    changes: [
      "Restructured staff portal navigation: Inquiries in bottom nav, campaign icon in header",
      "New Updates page with Activity tab (staff notifications) and Announcements tab",
      "URL parameter syncing for all staff portal tabs (deep linking support)",
      "Staff header icon shows campaign icon linking to Updates page",
      "Optimized animation system (animate-pop-in from 0.4s to 0.25s)",
      "Staggered animations with 0.05s increments across all portal pages",
      "Training Guide improvements: buttons repositioned below description",
      "Training Guide: add/remove image support for step instructions",
      "Training Guide: page icon badges showing relevant portal pages",
      "Training Guide: comprehensive content for all portal features",
      "Enhanced print CSS for cleaner PDF exports"
    ]
  },
  {
    version: "3.3",
    date: "2025-12-27",
    title: "Loading Screen Reliability",
    changes: [
      "Fixed loading screen race condition that could cause indefinite loading",
      "Improved WalkingGolferLoader fade-out animation timing",
      "Added safety timeout (2s) to ensure loader always dismisses",
      "Enhanced React StrictMode compatibility for loading animations",
      "Public pages now properly signal ready state after data loads"
    ]
  },
  {
    version: "3.4",
    date: "2025-12-27",
    title: "Booking Notifications & Queue Improvements",
    changes: [
      "Members now receive notifications when staff manually books them a bay/conference room",
      "Fixed notification badge not clearing after marking notifications as read",
      "Recent Processed section now hides manual bookings and future approved bookings (no duplicates with Upcoming Bookings)",
      "Member Dashboard shows all upcoming bookings including staff-created manual bookings",
      "Staff notifications auto-dismiss for all staff when any staff member approves, declines, or cancels a booking request"
    ]
  }
];
