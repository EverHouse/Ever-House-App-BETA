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
- Fixed Vite config: Changed port to 5000 and enabled allowedHosts for Replit
- Added missing Profile.tsx to src/pages/Member/
- Added missing PrivateEvents.tsx to src/pages/Public/
- Added HubSpot CRM integration service
- Created dynamic branding system with Logo component
- Final polish QA: Standardized fonts, icons, selection states, and glass effects
- **Responsive Layout Audit**: Added global CSS fixes (box-sizing, responsive media, overflow prevention)
- **iOS Safe Areas**: Added safe-area-inset support for bottom navigation and modals
- **Debug Layout Mode**: Add `?debugLayout=1` to URL to visualize container boundaries and detect overflow

## Responsive Guidelines
- Target viewports: iPhone SE (375×667), iPhone 14/15 (390×844), iPhone Pro Max (430×932), iPad (768×1024), Desktop (1440×900)
- Use `safe-area-bottom` class for fixed bottom elements (adds 1rem + iOS inset)
- Use `tap-target` class to ensure 44px minimum touch targets
- All images have `max-width: 100%` and `height: auto` globally
