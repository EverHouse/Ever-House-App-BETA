# Even House Members App

## Overview
A private members club application built with React, Vite, and TypeScript. The app includes public pages, member-only features, and admin functionality for managing a golf club/wellness center.

## Architecture
- **Frontend**: React 19 with React Router DOM, built with Vite
- **Styling**: Tailwind CSS (via CDN)
- **Backend Services**: HubSpot CRM integration for contact/member management

## Project Structure
```
src/
├── components/     # Reusable UI components
├── contexts/       # React context providers (DataContext)
├── pages/
│   ├── Admin/      # Admin dashboard
│   ├── Member/     # Member-only pages (Dashboard, BookGolf, Cafe, Events, Profile, Wellness)
│   └── Public/     # Public pages (Landing, Login, Contact, FAQ, Gallery, etc.)
├── services/       # Backend service integrations
│   └── hubspot.ts  # HubSpot CRM client
├── App.tsx         # Main app with routing
└── types.ts        # TypeScript type definitions
```

## Development
- Dev server runs on port 5000
- Run with: `npm run dev`
- Build with: `npm run build`

## Integrations
- **HubSpot CRM**: Connected for managing contacts, companies, and deals
  - Use `src/services/hubspot.ts` for API calls
  - Functions available: getContacts, createContact, updateContact, deleteContact, getDeals, getCompanies

## Recent Changes (December 2024)
- Fixed Vite config: Changed port to 5000 and enabled allowedHosts for Replit
- Added missing Profile.tsx to src/pages/Member/
- Added missing PrivateEvents.tsx to src/pages/Public/
- Added HubSpot CRM integration service
