# Even House Members App

## Overview
A private members club application built with React, Vite, and TypeScript. The app includes public pages, member-only features, and admin functionality for managing a golf club/wellness center.

## Architecture
- **Frontend**: React 19 with React Router DOM, built with Vite (port 5000)
- **Backend**: Express.js API server (port 3001) with PostgreSQL database
- **Styling**: Tailwind CSS (via CDN)
- **Integrations**: HubSpot CRM for contact/member management

## Project Structure
```
├── server/
│   └── index.ts        # Express API server with all endpoints
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React context providers (DataContext)
│   ├── pages/
│   │   ├── Admin/      # Admin dashboard
│   │   ├── Member/     # Member-only pages (Dashboard, BookGolf, Cafe, Events, Profile, Wellness)
│   │   └── Public/     # Public pages (Landing, Login, Contact, FAQ, Gallery, etc.)
│   ├── services/       # Backend service integrations
│   │   └── hubspot.ts  # HubSpot CRM client
│   ├── App.tsx         # Main app with routing
│   └── types.ts        # TypeScript type definitions
```

## Development
- Frontend dev server: `npm run dev` (port 5000)
- Backend API server: `npm run server` (port 3001)
- Build: `npm run build`

## Database Schema (PostgreSQL)
- **resources**: id, name, type (simulator/conference_room/wellness_room/instructor), description, capacity
- **bookings**: id, resource_id, user_email, booking_date, start_time, end_time, notes, status
- **events**: id, title, description, event_date, start_time, end_time, location, category, max_attendees
- **event_rsvps**: id, event_id, user_email, status
- **guest_passes**: id, member_email, passes_used, passes_total, last_reset_date

## API Endpoints
- `GET /api/resources` - List all bookable resources
- `GET /api/availability?resource_id=X&date=YYYY-MM-DD&duration=60` - Check slot availability
- `GET /api/bookings?user_email=X` - Get user's bookings
- `POST /api/bookings` - Create a booking
- `DELETE /api/bookings/:id` - Cancel a booking
- `GET /api/events` - List upcoming events
- `GET /api/rsvps?user_email=X` - Get user's RSVPs
- `POST /api/rsvps` - RSVP to an event
- `DELETE /api/rsvps/:event_id/:user_email` - Cancel RSVP
- `GET /api/hubspot/contacts` - Fetch contacts from HubSpot CRM
- `POST /api/hubspot/forms/:formType` - Submit to HubSpot forms (tour-request, membership, private-hire, guest-checkin)
- `GET /api/guest-passes/:email?tier=X` - Get member's guest pass usage
- `POST /api/guest-passes/:email/use` - Use a guest pass
- `PUT /api/guest-passes/:email` - Update guest pass total

## Integrations
- **HubSpot CRM**: Connected via OAuth for managing contacts/members
  - Admin dashboard fetches real contacts from HubSpot
  - Access token automatically refreshed via Replit Connectors
- **HubSpot Forms**: Native app forms submit to existing HubSpot forms
  - Forms: Tour Request, Membership Application, Private Hire Inquiry, Guest Check-In
  - Uses HubSpot Forms API with hutk cookie tracking for analytics
  - Environment variables: HUBSPOT_PORTAL_ID, HUBSPOT_FORM_TOUR_REQUEST, HUBSPOT_FORM_MEMBERSHIP, HUBSPOT_FORM_PRIVATE_HIRE, HUBSPOT_FORM_GUEST_CHECKIN

## Design System
- **Typography**: Inter (sans-serif) exclusively across all pages
- **Icons**: Material Symbols Outlined with weight 300, `.filled` class for active states
- **Colors**: 
  - Primary (Deep Green): #293515
  - Accent (Lavender): #CCB8E4
  - Background Light (Bone): #F2F2EC
  - Background Dark: #0f120a
- **Glass Effects**: 3-5% opacity, 40px+ blur, 12px squircle corners
- **Selection States**: Lavender background with Deep Green text (bg-accent text-brand-green)

## Branding
- **Logo Component**: `src/components/Logo.tsx` with dynamic variant selection
- **Config**: `src/config/branding.ts` for centralized logo paths
- **Member Portal**: Walking golfer (EH-guy logo) in black/white
- **Public Pages**: EH monogram logo
- Auto dark/white variant based on background

## Membership Tiers
- **Social** ($180/mo): Events, wellness, conference rooms only. No golf simulator access. 2 guest passes/year.
- **Core** ($250/mo): Full access including simulators (60 min/day). 7-day advance booking. 4 guest passes/year.
- **Premium** ($450/mo): Priority access, 90 min/day simulators. 10-day advance booking. 8 guest passes/year.
- **Corporate** ($350/mo per seat): All Premium benefits. 10-day advance booking. 15 guest passes/year. Dedicated account manager.

## Tier Permissions Utility
- `src/utils/permissions.ts` - Centralized tier permission checks
- `getTierPermissions(tier)` - Returns permissions object
- `canAccessResource(tier, resourceType)` - Boolean check for resource access
- `getMaxBookingDate(tier)` - Returns max bookable date based on advance days

## Recent Changes (December 2024)
- **Theme System**: Light/Dark/System theme toggle in Profile settings
  - ThemeContext manages theme state and persists to localStorage
  - System mode follows OS preference automatically
- **Role Management**: Admin dashboard can assign member/staff/admin roles
  - Role dropdown in member edit modal
  - API endpoint PUT /api/members/:id/role
  - Role badges shown in member cards and table
- **UI/UX Improvements**:
  - Swipe-back gesture zone covers left half of screen (improved from edge-only)
  - Notification icon properly sized with consistent dimensions
  - Quick access buttons reordered: Golf, Wellness, Events, Cafe (matches nav)
  - Check-in button connected with haptic feedback and confirmation
  - "Compare All" link moved below Corporate card on landing/membership pages
  - Cafe admin add button inline with page title above filters
  - Footer gap fixed on public pages
  - Global horizontal overflow prevention
  - Consistent page enter animations across public and member pages
- **Member Portal Header**: Black background (#0f120a) matching bottom nav
- **HubSpot Forms Integration**: Native forms submit to HubSpot
  - Tour Request, Membership Application, Private Hire Inquiry forms connected
  - Guest Check-In form with atomic pass consumption
  - Reusable HubSpotFormModal component with hutk tracking cookie
- **Membership Tier Gating**: Booking permissions based on tier
  - Social members see upgrade prompt when trying to book simulators
  - Advance booking days limited by tier (7 or 10 days)
  - Guest pass tracking per member with tier-based allowances
- **Guest Pass System**: Database-backed guest pass tracking
  - Profile page shows remaining passes with "Check In a Guest" button
  - Atomic pass consumption prevents race conditions
  - API endpoints to track/use passes
- **Branding Update**: Member portal uses walking golfer logo
- **Membership Page Redesign**: Core is now the featured "Popular" tier with dark green standout card
- **Real-Time Booking System**: Database-backed booking with shared availability
  - BookGolf page fetches resources and availability from API
  - Duration-aware slot generation (30/60/90/120 min)
  - Collision detection prevents double-bookings
- **Member Dashboard**: Fetches real bookings/RSVPs from database
- **Admin Member Directory**: Fetches contacts from HubSpot CRM API
- **Express Backend**: Full REST API for booking operations
- **PostgreSQL Database**: Tables for resources, bookings, events, RSVPs, guest_passes
- **Haptic Feedback**: Mobile interactions provide tactile feedback

## Responsive Guidelines
- Target viewports: iPhone SE (375×667), iPhone 14/15 (390×844), iPhone Pro Max (430×932), iPad (768×1024), Desktop (1440×900)
- Use `safe-area-bottom` class for fixed bottom elements (adds 1rem + iOS inset)
- Use `tap-target` class to ensure 44px minimum touch targets
- All images have `max-width: 100%` and `height: auto` globally
- Debug layout mode: Add `?debugLayout=1` to URL to visualize container boundaries
