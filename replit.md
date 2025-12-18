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
- **Branding**: Dynamic logo selection (`EH-guy` for member portal, `EH monogram` for public) based on context and automatic dark/white variants.
- **Responsive Design**: Targets various iPhone, iPad, and Desktop viewports, utilizing `safe-area-bottom` and `tap-target` classes.
- **Theme System**: Supports Light, Dark, and System themes, persisted via `localStorage` with full dark mode support across all pages.

### Technical Implementations
- **Frontend**: React 19 with React Router DOM, Vite (port 5000).
- **Backend**: Express.js (port 3001) providing a REST API.
- **Database**: PostgreSQL for all application data.
- **Styling**: Tailwind CSS with PostCSS.
- **Member Tiers**: Implemented with a utility (`src/utils/permissions.ts`) to manage access, booking limits, and guest pass allowances based on membership levels (Social, Core, Premium, Corporate, VIP, Founding).
- **Simulator Booking Request System**: Members request slots via a 14-day calendar, staff approve/decline with conflict detection.
- **In-App Notifications**: Real-time notification system with a bell icon, unread badges, and read/mark all as read functionality.
- **Role Management**: Admin dashboard allows assignment of member/staff/admin roles via `PUT /api/members/:id/role`.
- **Guest Pass System**: Database-backed tracking of guest pass usage per member, with atomic consumption.
- **Real-Time Booking**: Database-backed booking with shared availability, duration-aware slot generation, and collision detection.
- **Haptic Feedback**: Integrated for mobile interactions.
- **Photography**: All placeholder images replaced with real venue photography.
- **Date Utilities**: Centralized date handling in `src/utils/dateUtils.ts` with `parseLocalDate()` for timezone-safe ISO date parsing (prevents off-by-one day errors) and `formatDate()` for consistent display formatting.
- **Announcements System**: Club-wide announcements with priority levels (low/normal/high/urgent), visibility toggle, and date-based scheduling for member dashboard.
- **Playing Partners**: Members can add playing partners (names) to golf simulator bookings for session coordination.
- **Event Photo Galleries**: Events can link to external photo galleries displayed in event details modal.
- **Referral Tracking**: Unique referral codes per member, referral statistics (total/converted/pending), and history tracking.
- **Birthday Recognition**: Automatic birthday detection on dashboard with special greeting and personalized message.

### Feature Specifications
- **Public Pages**: Landing, Login, Contact, FAQ, Gallery, Membership details.
- **Member-Only Pages**: Dashboard (with announcements, next-up booking, playing partners), Book Golf, Cafe, Events (with gallery links), Profile (with referral section), Wellness.
- **Admin Functionality**: Admin dashboard for managing members, events, cafe menu, booking requests, gallery images, and announcements.
- **Staff Portal Tabs**: 9-tab scrollable navigation: Directory, Sims, Events, Guests, Push, News, Closures, Gallery, Cafe.
  - **Directory**: View and manage member roles (member/staff/admin).
  - **Sims**: Approve/decline simulator booking requests with conflict detection.
  - **Events**: Create/edit/delete internal events, sync from Google Calendar and Eventbrite.
  - **Guests**: View all guest pass records, reset passes, adjust pass totals per member.
  - **Push**: Send push notifications to all subscribed members or select specific recipients.
  - **News (Announcements)**: Create/edit/delete club announcements with priority levels, scheduling, and visibility toggle.
  - **Closures**: Schedule facility closure scheduling for golf, conference, wellness, cafe, or entire club.
  - **Gallery**: Add/edit/delete gallery images with categories, captions, display order, and visibility.
  - **Cafe**: Manage cafe menu items by category with prices and availability.
- **API Endpoints**: Comprehensive REST API for managing resources, bookings, events, RSVPs, cafe menu, HubSpot contacts, guest passes, simulator bay requests, notifications, push notifications, gallery images, announcements, facility closures, booking partners, and referrals.

## Recent Features (Latest Session)
- **Announcements on Dashboard**: Members see active club announcements with priority-based styling (urgent/high/normal/low) on their dashboard.
- **Playing Partners Management**: Members can add/remove playing partners to golf bookings via modal interface in dashboard.
- **Event Photo Galleries**: Event detail modals display "View Photos" link when gallery_url is set for an event.
- **Referral System**: Members have unique referral codes, can share with friends, track referral status and conversion metrics.
- **Birthday Greetings**: Dashboard detects member birthdays and displays special greeting with cake emoji 🎂.

## External Dependencies

- **Replit Auth**: User authentication supporting Google, Apple, GitHub, and email/password login. Sessions stored in PostgreSQL.
- **HubSpot CRM**: Integrated for contact and member management. Access tokens refreshed via Replit Connectors.
- **HubSpot Forms**: Native application forms (Tour Request, Membership Application, Private Hire Inquiry, Guest Check-In, Contact) submit directly to HubSpot Forms API, utilizing `hutk` cookie for tracking.
- **Eventbrite**: Syncs members-only events from Eventbrite organization to the application database. Synced events are marked with `source='eventbrite'`, `visibility='members_only'`, and `requires_rsvp=true`. Ticketing links redirect to Eventbrite.
  - Sync endpoint: `POST /api/eventbrite/sync`
  - Requires `EVENTBRITE_PRIVATE_TOKEN` environment variable.
- **Google Calendar**: Three-calendar integration system with named calendars:
  - **Booked Golf**: Primary calendar for golf simulator bookings. Approved booking requests create events here; availability is checked via freeBusy API.
  - **MBO_Members_Club**: Calendar for conference room bookings with similar availability checking.
  - **Even House Public/Member Events**: Calendar for public events synced to the database. Events marked with `source='google_calendar'`, `visibility='public'`, and `requires_rsvp=false`.
  - Business hours configured per resource type (golf: 9AM-9PM, conference: 8AM-6PM).
  - API endpoints: `/api/calendar-availability/golf`, `/api/calendar-availability/conference`, `/api/calendars`, `POST /api/events/sync/google`, `POST /api/events/sync`.
- **Apple Messages for Business**: Direct messaging support via a button on the Contact page, linking to Apple Business Chat.
- **Amarie Aesthetics MedSpa**: Integration for wellness services, including IV Hydration Drip Menu, Wellness Shots, NAD+ Treatments, Injectables, and Medical Weightloss programs, with a direct booking link.
