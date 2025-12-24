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
- **Mindbody Data Import**: Imports member data from Mindbody/Trackman CSV, mapping to internal tiers and extracting tags.
- **Booking System**: Supports "Request & Hold" for specific member tiers, with staff approval via admin dashboard. Includes simulator booking requests with conflict detection.
- **Notifications**: In-app, real-time notification system.
- **Role Management**: Admin dashboard for assigning member/staff/admin roles.
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
- **Public Pages**: Landing, Login, Contact, FAQ, Gallery, Membership details, Cafe Menu (view-only).
- **Member-Only Pages**: Dashboard, Book Golf, Announcements/News, Events, Profile, Wellness.
- **Admin Functionality**: Management of members, events, cafe menu, announcements/news, and booking requests.
- **API Endpoints**: Comprehensive REST API for all core functionalities.

## External Dependencies

-   **Magic Link Authentication**: Email-based passwordless authentication. Sessions stored in PostgreSQL. Emails sent via Resend. Rate-limited.
-   **HubSpot CRM**: Integrated for contact and member management; access tokens refreshed via Replit Connectors.
-   **HubSpot Forms**: Application forms submit directly to HubSpot Forms API, utilizing `hutk` cookie.
-   **Eventbrite**: Syncs members-only events from a specified Eventbrite organization to the application database.
-   **Google Calendar**: Four-calendar integration with full two-way sync for:
    -   **Booked Golf**: Primary for golf simulator bookings.
    -   **MBO_Conference_Room**: For conference room bookings.
    -   **Public/Member Events**: For general events.
    -   **Wellness & Classes**: For wellness class scheduling.
-   **Apple Messages for Business**: Direct messaging support via a button on the Contact page.
-   **Amarie Aesthetics MedSpa**: Integration for wellness services with a direct booking link.