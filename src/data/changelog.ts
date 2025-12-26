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
      "Magic link authentication (email-based, passwordless)",
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
  }
];
