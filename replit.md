# Even House Members App

## Overview
The Even House Members App is a private members club application for golf and wellness centers. It provides public access, member-exclusive features, and administrative tools to manage golf simulator bookings, wellness services, and events. The project aims to enhance member engagement and streamline club operations through a seamless digital experience.

## User Preferences
- I prefer simple language.
- I like functional programming.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.

## System Architecture
The application uses a React 19 frontend with Vite, styled with Tailwind CSS, and an Express.js backend with a PostgreSQL database.

### UI/UX Decisions
- **Typography**: Inter (sans-serif).
- **Icons**: Material Symbols Outlined (weight 300, `.filled` for active states).
- **Color Palette**: Deep Green (#293515), Lavender (#CCB8E4), Bone (#F2F2EC), Background Dark (#0f120a).
- **Liquid Glass Design System**: iOS-inspired glassmorphism applied globally with backdrop blur, reflective edges, inner depth, extra-large rounded corners, and fluid interactions. Utilizes specific CSS classes (e.g., `.glass-card`) and CSS variables.
- **Branding**: EH monogram logo on public pages; dynamic, page-specific icons in the member portal header.
- **Dynamic Header Navigation**: Member portal header includes a profile/dashboard toggle and page-specific center icons.
- **Responsive Design**: Optimized for iPhone, iPad, and Desktop viewports.
- **Theme System**: Light, Dark, and System themes, persisted via `localStorage`.

### Technical Implementations
- **Frontend**: React 19 with React Router DOM, Vite.
- **Backend**: Express.js REST API with modular route architecture.
- **Database**: PostgreSQL.
- **Styling**: Tailwind CSS with PostCSS.
- **Server Architecture**: Modular routes under `server/`, shared modules in `server/core/`, and domain-specific routers in `server/routes/`.
- **Error Handling**: Generic error messages to prevent info leaks.
- **Member Tiers & Tags**: Manages access, booking limits, and guest passes based on membership levels (Social, Core, Premium, Corporate, VIP) and custom JSONB tags.
- **Database-Driven Tier System**: All tier configuration stored in `membership_tiers` table with display fields (name, price_string), marketing fields (highlighted_features), and logic/enforcement fields (daily_sim_minutes, guest_passes_per_month, booking_window_days, can_book_simulators, etc.). Backend `server/core/tierService.ts` provides cached tier lookups (5-minute TTL) with automatic invalidation on updates. Daily booking limits are enforced when members create booking requests. Frontend uses `src/services/tierService.ts` and `src/hooks/useTierPermissions.ts` to dynamically fetch tier permissions from API with 5-minute client-side caching. The membership comparison table (`/membership/compare`) reads directly from privilege columns via `FEATURE_DISPLAY` mapping, ensuring admin tier edits reflect immediately on the public site.
- **Mindbody Data Import**: Imports member data from Mindbody/Trackman CSV, mapping to internal tiers and extracting tags.
- **Booking System**: Supports "Request & Hold" for specific member tiers, with staff approval via admin dashboard. Includes simulator and conference room booking requests with conflict detection. Both resource types have tier-based access gating (future-proofed for day-pass tier). BookGolf page includes "My Requests" tab showing pending/past bookings with status tracking and cancel functionality.
- **Closure-to-Announcement Integration**: Facility closures automatically create linked high-priority announcements with formatted details (reason, affected areas, date/time range). Uses `closureId` foreign key in announcements table for lifecycle management. When a closure is deleted, the linked announcement is automatically removed.
- **Booking Approval Validation**: Staff cannot approve bookings that conflict with facility closures or existing approved bookings. System returns descriptive error messages explaining the conflict. Uses integer-based time comparison for accurate overlap detection.
- **Staff Calendar Closure Display**: Calendar view in the Sims admin panel shows closures as red "CLOSED" blocks with tooltip showing closure title. Closures are fetched alongside approved bookings and displayed consistently with the same affected area parsing logic used for approval validation.
- **Notifications**: In-app, real-time notification system.
- **Role Management**: Admin dashboard for assigning member/staff/admin roles.
- **View As Member**: Admin-only feature allowing admins to impersonate members to view the app from their perspective. Staff users cannot use this feature. Confirmation popups warn admins before taking actions (booking, RSVP) on behalf of members. Uses `flushSync` for synchronous state updates.
- **Portal Separation**: Staff and admin users are automatically redirected from Members Portal to Staff Portal. Only admins in "view as member" mode can access member routes. Profile page shows different content (role/position) for staff/admin vs membership benefits for regular members.
- **Guest Pass System**: Tracks and atomically consumes guest passes.
- **Real-Time Booking**: Database-backed booking with shared availability, duration-aware slot generation, and collision detection.

### Motion Architecture
- **Framer Motion**: For page transitions and animations.
- **Lenis Smooth Scroll**: Premium smooth scrolling with weighted easing.
- **Physics-Based Directional Page Transitions**: iOS-style slide animations for native app feel, with direction detection and spring physics.
- **Persistent UI**: Bottom nav bar and header remain static during transitions.

### PWA (Progressive Web App)
- **Safe Area Support**: Header uses `pt-[max(16px,env(safe-area-inset-top))]` to clear iPhone notches; main content uses `pt-[max(72px,calc(env(safe-area-inset-top)+56px))]` to stay below header.
- **Service Worker Caching**: Network First for HTML/navigation (ensures fresh deployments); Cache First for static assets (JS/CSS/images); Network First with cache fallback for API data.
- **Overscroll Prevention**: `overscroll-behavior-y: none` prevents rubber-banding for native app feel.
- **Offline Support**: Core pages and API responses cached for offline access.
- **Safari Toolbar Transparency**: Scroll-aware bottom nav that hides when user reaches bottom of content. Uses:
  - `SafeAreaBottomOverlay` component: pointer-events-none wrapper that positions nav correctly with safe-area-inset-bottom.
  - `BottomSentinel` component: IntersectionObserver-based sentinel that detects when user scrolls to bottom.
  - `BottomNavContext`: Shared state for isAtBottom across member/staff portals.
  - When at bottom: nav slides down (translateY animation) to reveal content behind Safari's toolbar.
  - When scrolling: nav floats 2rem above bottom with glass effect.

### Feature Specifications
- **Public Pages**: Landing, Login, Contact, FAQ (database-driven), Gallery, Membership details, Cafe Menu (view-only).
- **Member-Only Pages**: Dashboard, Book Golf, Announcements/News, Events, Profile, Wellness.
- **Staff Portal**: Simplified 5-tab navigation (Home, Sims, Events, Wellness, News). Dashboard home with quick access cards for: Directory, Cafe Menu, Team Access, Gallery, FAQs, Inquiries, Data Conflicts.
- **Admin Functionality**: Management of members, events, cafe menu, announcements/news, booking requests, FAQs, gallery photos, and inquiry submissions.
- **FAQ Admin**: Full CRUD for managing FAQs with seeding capability. FAQs stored in PostgreSQL and served via API.
- **Inquiries Admin**: View and manage form submissions (contact, tour-request, membership, private-hire, guest-checkin). Filter by status (new/read/replied/archived) and form type. Add staff notes.
- **Gallery Admin**: Manage venue photos with soft-delete support. Images stored in PostgreSQL with category, sort order, and active status. Includes image upload with automatic WebP optimization using sharp (resizes to max 1920px, 80% quality).
- **API Endpoints**: Comprehensive REST API for all core functionalities.

## External Dependencies

-   **Magic Link Authentication**: Email-based passwordless authentication. Sessions stored in PostgreSQL. Emails sent via Resend. Rate-limited.
-   **HubSpot CRM**: Integrated for contact and member management; access tokens refreshed via Replit Connectors.
-   **HubSpot Forms**: Application forms submit directly to HubSpot Forms API, utilizing `hutk` cookie. Submissions also stored locally in PostgreSQL for faster queries and offline access.
-   **Eventbrite**: Syncs members-only events from a specified Eventbrite organization to the application database.
-   **Google Calendar**: Four-calendar integration with full two-way sync for:
    -   **Booked Golf**: Primary for golf simulator bookings.
    -   **MBO_Conference_Room**: For conference room bookings.
    -   **Public/Member Events**: For general events.
    -   **Wellness & Classes**: For wellness class scheduling.
-   **Apple Messages for Business**: Direct messaging support via a button on the Contact page.
-   **Amarie Aesthetics MedSpa**: Integration for wellness services with a direct booking link.