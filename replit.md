# Even House Members App

## Overview
The Even House Members App is a private members club application designed for golf and wellness centers. It offers public-facing information, exclusive features for members, and robust administrative tools. The core purpose is to manage golf simulator bookings, wellness service appointments, and club events, aiming to enhance member engagement and streamline operational workflows through a modern digital platform. The project seeks to provide a seamless user experience for both members and staff.

## User Preferences
- I prefer simple language.
- I like functional programming.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.
- **Auto-versioning**: When making app changes, automatically update `src/data/changelog.ts` with a new version entry and sync `src/config/version.ts` (APP_VERSION and LAST_UPDATED) to match.
- **Loading animations**: When updating loading screen animations/mascot, update ALL instances across the app including: WalkingGolferLoader, WalkingGolferSpinner, Gallery MascotLoader, PullToRefresh, and any other loading components using the mascot.

## System Architecture
The application is built with a React 19 frontend utilizing Vite, styled with Tailwind CSS, and an Express.js backend powered by a PostgreSQL database.

### UI/UX Decisions
- **Typography**: Playfair Display for hero headlines, Inter for body and UI.
- **Color Palette**: Deep Green (#293515), Lavender (#CCB8E4), Bone (#F2F2EC), Background Dark (#0f120a).
- **Liquid Glass Design System**: Consistent iOS-inspired glassmorphism with backdrop blur, reflective edges, extra-large rounded corners, and fluid hover animations for both light and dark modes. WCAG AA contrast compliance is maintained.
- **Accessibility**: All interactive elements meet WCAG AA contrast requirements.
- **Branding**: EH monogram logo on public pages; page titles in portal headers.
- **Navigation**: Unified header across portals (Left: mascot/hamburger, Center: title, Right: bell/avatar). Member Bottom Nav for core features (Home, Book, Wellness, Events).
- **Responsive Design**: Optimized for iPhone, iPad, and Desktop viewports.
- **Theme System**: Light, Dark, and System themes, persisted via `localStorage`.

### Technical Implementations
- **Frontend**: React 19 with React Router DOM, Vite.
- **Backend**: Express.js REST API with modular architecture.
- **Database**: PostgreSQL.
- **Styling**: Tailwind CSS with PostCSS.
- **Error Handling**: Generic error messages with structured JSON logging and request IDs.
- **Member Tiers & Tags**: Database-driven system for managing access, booking limits, and guest passes based on membership tiers (Social, Core, Premium, Corporate, VIP) and custom JSONB tags. Tier configuration is cached with automatic invalidation. **Centralized Constants**: All tier normalization, status values, and tag extraction are defined in `shared/constants/tiers.ts` and `shared/constants/statuses.ts` - both frontend and backend import from these shared modules to ensure consistency. The default tier is 'Social'. HubSpot tier strings (e.g., "Founding Core Member") are normalized via `normalizeTierName()` with tag extraction via `extractTierTags()`.
- **Security Middleware**: All admin endpoints (`/api/admin/*`) require `isAdmin` middleware. Staff operations require `isStaffOrAdmin`. Booking approvals, declines, and cancellations are protected. HubSpot contact listing is staff-only.
- **Booking System**: Supports "Request & Hold" (staff approval required for some tiers), simulator and conference room booking requests with conflict detection, and staff-initiated manual bookings. Includes calendar management for staff to reschedule or cancel bookings.
- **Facility Closures**: Automated integration between facility closures and announcements. Closure events sync to Google Calendar with full lifecycle management. Booking approval validation prevents conflicts with closures.
- **Notifications**: In-app, real-time notification system.
- **Role Management**: Admin dashboard for assigning member, staff, and admin roles.
- **View As Member**: Admin-only feature for impersonating members to test user experience.
- **Portal Separation**: Staff/admin users are redirected to the Staff Portal, with specific profile information displayed.
- **Guest Pass System**: Tracks and atomically consumes guest passes.
- **Real-Time Booking**: Database-backed booking with shared availability, duration-aware slot generation, and collision detection.
- **Trackman Historical Import**: Admin tool for importing historical booking data from Trackman CSV exports. Features email mapping (placeholder to real email via member CSV), name matching fallback, idempotent imports, and automatic lifetime_visits tracking. Includes intelligent learning: when admins manually resolve unmatched bookings, the placeholder→real email mapping is saved to the member's `trackman_linked_emails` JSONB field in the database and automatically used in future imports. **Upcoming booking support**: Future bookings are automatically set to 'approved' status (showing in staff/member portals as active bookings), while past bookings get 'attended' status. Future bookings trigger booking confirmation notifications. Same-day classification uses full datetime comparison in Pacific timezone. Supported booking statuses: pending, approved, declined, cancelled, attended, no_show. Supported durations: 30-300 minutes.
- **PWA Features**: Service Worker caching, safe area support, overscroll prevention, offline support, scroll-aware bottom navigation that interacts with Safari's toolbar, and pull-to-refresh with desktop scroll wheel support.
- **Motion Architecture**: Pure CSS keyframe animations for transitions, staggered content animations, and reusable components for animated lists. Parallax scrolling on hero images using `useParallax` hook with scroll-reactive gradient overlays.
- **iOS-Style Interactions**: Haptic feedback utility (`src/utils/haptics.ts`, `src/hooks/useHaptics.ts`) with vibration patterns for light/medium/heavy/success/warning/error/selection, respecting prefers-reduced-motion. Integrated haptic feedback on: MemberBottomNav (navigation taps), StaffBottomNavSimple (navigation taps), MenuOverlay (close and nav actions), Toggle (toggle action), AnnouncementAlert (dismiss and click). Button bounce animations with spring physics (`--spring-bounce`, `--spring-smooth`). Tap target classes (`.tap-target`, `.btn-ios`) for interactive feedback. SegmentedControl component with sliding indicator and keyboard navigation. Edge swipe back navigation integrated in Layout component via `useEdgeSwipe` hook - enabled for member users on non-dashboard pages with visual indicator. SwipeableListItem component for swipe-to-reveal actions. iOS HIG spacing utilities (`.ios-section`, `.ios-grouped-list`, `.ios-card`).
- **Sound Design**: Premium booking confirmation tones using Web Audio API (`src/utils/sounds.ts`) with graceful fallback for unsupported browsers.
- **Glassmorphism Design Tokens**: CSS custom properties for consistent blur, opacity, borders, and shadows (`--glass-blur-*`, `--glass-bg-*`, `--glass-border-*`).
- **Modal Pattern**: Viewport-centered modals using: (1) backdrop div for visual overlay, (2) scroll wrapper with onClick dismiss handler and `overflow-y-auto`, (3) centering wrapper with `flex min-h-full items-center justify-center`, (4) modal content with `onClick={(e) => e.stopPropagation()}` to prevent dismiss on modal clicks. This ensures backdrop dismissal, content interactivity, and tall content scrolling all work together.
- **Pacific Timezone Handling**: All date/time operations use America/Los_Angeles timezone for consistency with club operations.
  - Backend: `server/utils/dateUtils.ts` provides createPacificDate() for storage, formatDateDisplayWithDay()/formatDatePacific() for display, and getTodayPacific()/getTomorrowPacific() for filtering. DST is handled correctly by computing the Pacific offset based on the target date.
  - Frontend: `src/utils/dateUtils.ts` uses Zeller's algorithm for timezone-agnostic day-of-week calculation and direct string parsing for month/day display (no Date object creation that could shift dates).
  - Date filtering uses YYYY-MM-DD string comparison with getTodayPacific() to avoid timezone drift for users in non-Pacific timezones.

### Feature Specifications
- **Public Pages**: Landing, Login, Contact, FAQ, Gallery, Membership details, Cafe Menu.
- **Member-Only Pages**: Dashboard, Book Golf, Updates (Announcements + Activity), Events, Profile, Wellness.
- **Staff Portal**: Simplified navigation (Home, Sims, Events, Wellness, News) with quick access cards.
- **Admin Functionality**: CRUD operations for members, events, cafe menu, announcements, booking requests, FAQs, gallery photos, and inquiry submissions. Includes image upload with WebP optimization.
- **API Endpoints**: Comprehensive REST API for all functionalities.

## External Dependencies

-   **Verification Code Authentication**: Email-based passwordless authentication via 6-digit OTP codes, with Resend for email delivery. Staff/admin also support password login.
-   **HubSpot CRM**: Integrated for contact and member management; uses Replit Connectors for access token refresh.
-   **HubSpot Forms**: Application forms submit to HubSpot Forms API and are also stored in PostgreSQL.
-   **Eventbrite**: Syncs members-only events from a specified Eventbrite organization.
-   **Google Calendar**: Four-calendar integration for two-way sync: Booked Golf, MBO_Conference_Room, Public/Member Events, and Wellness & Classes.
-   **Apple Messages for Business**: Direct messaging support.
-   **Amarie Aesthetics MedSpa**: Integration for wellness services with a direct booking link.