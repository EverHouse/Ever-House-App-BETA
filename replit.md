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
- **Member Tiers & Tags**: Database-driven system for managing access, booking limits, and guest passes based on membership tiers (Social, Core, Premium, Corporate, VIP) and custom JSONB tags. Tier configuration is cached with automatic invalidation.
- **Booking System**: Supports "Request & Hold" (staff approval required for some tiers), simulator and conference room booking requests with conflict detection, and staff-initiated manual bookings. Includes calendar management for staff to reschedule or cancel bookings.
- **Facility Closures**: Automated integration between facility closures and announcements. Closure events sync to Google Calendar with full lifecycle management. Booking approval validation prevents conflicts with closures.
- **Notifications**: In-app, real-time notification system.
- **Role Management**: Admin dashboard for assigning member, staff, and admin roles.
- **View As Member**: Admin-only feature for impersonating members to test user experience.
- **Portal Separation**: Staff/admin users are redirected to the Staff Portal, with specific profile information displayed.
- **Guest Pass System**: Tracks and atomically consumes guest passes.
- **Real-Time Booking**: Database-backed booking with shared availability, duration-aware slot generation, and collision detection.
- **PWA Features**: Service Worker caching, safe area support, overscroll prevention, offline support, and a scroll-aware bottom navigation that interacts with Safari's toolbar.
- **Motion Architecture**: Pure CSS keyframe animations for transitions, staggered content animations, and reusable components for animated lists.

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