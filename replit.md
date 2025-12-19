# Even House Members App

## Overview
The Even House Members App is a private members club application designed to manage a golf club and wellness center. It provides public-facing pages, member-exclusive features, and administrative tools. The project aims to offer a seamless digital experience for members, staff, and potential clients, enhancing engagement with the club's offerings, from golf simulator bookings to wellness services and events. It integrates with various external services to streamline operations and member management.

## User Preferences
- I prefer simple language.
- I like functional programming.
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.

## System Architecture
The application is built with a React 19 frontend using Vite, styled with Tailwind CSS, and powered by an Express.js backend with a PostgreSQL database.

### UI/UX Decisions
- **Typography**: Exclusive use of Inter (sans-serif).
- **Icons**: Material Symbols Outlined (weight 300) with `.filled` class for active states.
- **Color Palette**: Primary (Deep Green: #293515), Accent (Lavender: #CCB8E4), Background Light (Bone: #F2F2EC), Background Dark (#0f120a).
- **Glass Effects**: Applied with 3-5% opacity, 40px+ blur, and 12px squircle corners.
- **Selection States**: Lavender background with Deep Green text (`bg-accent text-brand-green`).
- **Branding**: EH monogram logo on public pages. Member portal uses dynamic page-specific icons in header center (home, account_circle, sports_golf, spa, local_cafe, celebration).
- **Dynamic Header Navigation**: Member portal header features profile/dashboard toggle (top-right icon switches between account_circle and dashboard based on current page) and page-specific center icons in a Deep Green circle.
- **Responsive Design**: Targets various iPhone, iPad, and Desktop viewports, utilizing `safe-area-bottom` and `tap-target` classes.
- **Theme System**: Supports Light, Dark, and System themes, persisted via `localStorage`.

### Technical Implementations
- **Frontend**: React 19 with React Router DOM, Vite (port 5000).
- **Backend**: Express.js (port 3001) providing a REST API with modular route architecture.
- **Database**: PostgreSQL for all application data.
- **Styling**: Tailwind CSS with PostCSS.

### Server Architecture
The backend is organized into modular route files under `server/`:
- **`server/core/`**: Shared modules
  - `db.ts` - PostgreSQL pool and `isProduction` flag
  - `middleware.ts` - Auth middleware (isAdmin, isStaffOrAdmin)
  - `integrations.ts` - HubSpot and Google Calendar client factories
  - `calendar.ts` - Calendar configuration, availability helpers, sync functions
- **`server/routes/`**: Domain-specific routers
  - `resources.ts`, `calendar.ts`, `events.ts`, `auth.ts`, `hubspot.ts`, `members.ts`, `users.ts`, `wellness.ts`, `guestPasses.ts`, `bays.ts`, `notifications.ts`, `push.ts`, `availability.ts`, `cafe.ts`
- **Error Handling Pattern**: All routes use try-catch with conditional logging (`if (!isProduction) console.error(...)`) and generic error messages to avoid leaking system info.
- **Member Tiers**: Implemented with utilities (`src/utils/permissions.ts`, `src/utils/tierUtils.ts`) to manage access, booking limits, and guest pass allowances based on membership levels (Social, Core, Premium, Corporate, VIP).
- **Tier Badge System**: Premium visual badges for each tier with distinct colors - VIP (Platinum #E5E4E2), Premium (Gold #D4AF37), Corporate (Charcoal #374151), Core (Brand Green #293515), Social (Lavender #CCB8E4). Uses `TierBadge` and `TagBadge` components.
- **Member Tags**: JSONB array stored in users table. Available tags include "Founding Member", "Investor", "VIP Guest", "Referral", "Junior Lessons", "Group Lessons", "Pre-Sale". Displayed alongside tier badges in Directory and Profile views.
- **Mindbody Data Import**: Member data imported from Mindbody/Trackman CSV as source of truth for tier assignments. Import script at `scripts/import-mindbody-members.ts` maps Mindbody tier names (e.g., "Core Membership Founding Members") to simplified tiers (Core, Premium, VIP, Corporate, Social) and extracts tags. User schema extended with `lifetime_visits` (booking count), `linked_emails` (Trackman placeholder emails), and `data_source` (import origin tracking).
- **Member Dashboard Stats**: Dashboard displays lifetime visits count in a stats card, color-coded tier badge next to member name (gold for VIP/Premium, green for Core, grey for others), and last visit date footer. View As Member feature fetches full member details including stats.
- **Request & Hold Booking System**: Booking acts as a request portal. Authorized members (Core, VIP, Premium, Corporate tiers or Founding Member tag) can submit booking requests that save with `pending_approval` status. Staff see these in the admin dashboard and manually enter into Trackman. Frontend shows "Request Booking" button and "Request sent! Concierge will confirm shortly." message. Database includes `hubspot_contact_id` and `hubspot_deal_id` columns (nullable) for future HubSpot integration.
- **Simulator Booking Request System**: Members request slots via a 14-day calendar, staff approve/decline with conflict detection.
- **In-App Notifications**: Real-time notification system with a bell icon, unread badges, and read/mark all as read functionality.
- **Role Management**: Admin dashboard allows assignment of member/staff/admin roles via `PUT /api/members/:id/role`.
- **Admin/Staff Management**: Database-driven admin and staff management with full CRUD operations. Admins stored in `admin_users` table, staff in `staff_users` table. Auth middleware uses shared connection pool for efficient database lookups. Last-admin protection prevents accidentally removing all admins.
- **Guest Pass System**: Database-backed tracking of guest pass usage per member, with atomic consumption.
- **Real-Time Booking**: Database-backed booking with shared availability, duration-aware slot generation, and collision detection.
- **Haptic Feedback**: Integrated for mobile interactions.
- **Photography**: All placeholder images replaced with real venue photography.

### Feature Specifications
- **Public Pages**: Landing, Login, Contact, FAQ, Gallery, Membership details.
- **Member-Only Pages**: Dashboard, Book Golf, Cafe, Events, Profile, Wellness.
- **Admin Functionality**: Admin dashboard for managing members, events, cafe menu, and booking requests.
- **API Endpoints**: Comprehensive REST API for managing resources, bookings, events, RSVPs, cafe menu, HubSpot contacts, guest passes, simulator bay requests, notifications, and push notifications.

## External Dependencies

- **Magic Link Authentication**: Email-based passwordless authentication via magic links. Sessions stored in PostgreSQL with 1-week TTL. Emails sent via Resend from `noreply@everhouse.app`. Rate limited to 3 requests per email/IP every 15 minutes.
- **Authentication Security**: 
  - OTP and Magic Link endpoints are rate-limited (3 requests per 15 minutes per email+IP).
  - Dev login endpoint requires `DEV_LOGIN_ENABLED=true` environment variable in addition to non-production check.
- **HubSpot CRM**: Integrated for contact and member management. Access tokens refreshed via Replit Connectors.
- **HubSpot Forms**: Native application forms (Tour Request, Membership Application, Private Hire Inquiry, Guest Check-In, Contact) submit directly to HubSpot Forms API, utilizing `hutk` cookie for tracking.
- **Eventbrite**: Syncs members-only events from Eventbrite organization to the application database. Synced events are marked with `source='eventbrite'`, `visibility='members_only'`, and `requires_rsvp=true`. Ticketing links redirect to Eventbrite.
  - Sync endpoint: `POST /api/eventbrite/sync`
  - Requires `EVENTBRITE_PRIVATE_TOKEN` environment variable.
- **Google Calendar**: Four-calendar integration system with **two-way sync** for all calendars:
  - **Booked Golf**: Primary calendar for golf simulator bookings (4 bays available). **Two-way**: Approved booking requests create events here; availability is checked via freeBusy API.
  - **MBO_Conference_Room**: Calendar for conference room bookings (1 room available) with similar availability checking.
  - **Public/Member Events**: Calendar for public events. **Two-way sync**: Events created by staff in admin dashboard automatically push to Google Calendar. Events from Google Calendar sync to the database on startup (marked with `source='google_calendar'`). Events deleted from app are removed from Google Calendar.
  - **Wellness & Classes**: Calendar for wellness classes (yoga, pilates, meditation, etc.). **Two-way sync**: Classes created by staff in admin push to Google Calendar with title format "Category - Class Name with Instructor". Classes deleted from app are removed from Google Calendar. Sync endpoint `POST /api/wellness-classes/sync` pulls calendar events into `wellness_classes` table.
  - Business hours configured per resource type (golf: 9AM-9PM, conference: 8AM-6PM, wellness: 6AM-9PM).
  - API endpoints: `/api/calendar-availability/golf`, `/api/calendar-availability/conference`, `/api/calendars`, `POST /api/events/sync/google`, `POST /api/events/sync`, `POST /api/wellness-classes/sync`.
- **Apple Messages for Business**: Direct messaging support via a button on the Contact page, linking to Apple Business Chat.
- **Amarie Aesthetics MedSpa**: Integration for wellness services, including IV Hydration Drip Menu, Wellness Shots, NAD+ Treatments, Injectables, and Medical Weightloss programs, with a direct booking link.

## Backlog

### Pending: Trackman Integration
- **Trackman Calendar Sync**: Google Apps Script to auto-sync Trackman booking emails to Google Calendar. Script ready in `docs/trackman-calendar-sync.md`. Setup steps:
  1. Deploy the script to Google Apps Script
  2. Configure the Trackman sender email in CONFIG
  3. Enable Trackman Notify integration (add trigger flags, set to Active)
  4. Run `setupTrigger` to enable automatic syncing
- **HubSpot Deals Integration**: Waiting for Trackman to approve HubSpot integration. Once approved, implement:
  1. Endpoint to fetch HubSpot Deals (Trackman bookings) for members
  2. Display Trackman bookings on member dashboard
  3. Factor Trackman usage into tier limit calculations
  4. Unified calendar view with both in-app and Trackman bookings