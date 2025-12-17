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

## Integrations
- **HubSpot CRM**: Connected via OAuth for managing contacts/members
  - Admin dashboard fetches real contacts from HubSpot
  - Access token automatically refreshed via Replit Connectors

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
- Mascot logo for member pages, Monogram logo for public pages
- Auto dark/white variant based on background

## Recent Changes (December 2024)
- **Real-Time Booking System**: Database-backed booking with shared availability
  - BookGolf page fetches resources and availability from API
  - Duration-aware slot generation (30/60/90/120 min)
  - Collision detection prevents double-bookings
- **Member Dashboard**: Fetches real bookings/RSVPs from database
- **Admin Member Directory**: Fetches contacts from HubSpot CRM API
- **Express Backend**: Full REST API for booking operations
- **PostgreSQL Database**: Tables for resources, bookings, events, RSVPs

## Responsive Guidelines
- Target viewports: iPhone SE (375×667), iPhone 14/15 (390×844), iPhone Pro Max (430×932), iPad (768×1024), Desktop (1440×900)
- Use `safe-area-bottom` class for fixed bottom elements (adds 1rem + iOS inset)
- Use `tap-target` class to ensure 44px minimum touch targets
- All images have `max-width: 100%` and `height: auto` globally
- Debug layout mode: Add `?debugLayout=1` to URL to visualize container boundaries
