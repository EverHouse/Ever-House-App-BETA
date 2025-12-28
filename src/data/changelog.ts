export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  isMajor?: boolean;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.0",
    date: "2025-12-16",
    title: "Launch Day",
    isMajor: true,
    changes: [
      "The app is live! Built from the ground up for Even House members",
      "Connected to HubSpot so your membership info stays in sync",
      "Your profile page and private events are ready to explore",
      "Fresh branding with custom logos throughout"
    ]
  },
  {
    version: "1.1",
    date: "2025-12-17",
    title: "New Look & Feel",
    changes: [
      "Logo now adjusts automatically for light and dark backgrounds",
      "Beautiful new fonts: elegant headlines and easy-to-read body text",
      "Consistent icons throughout the app",
      "Brand colors refined: Deep Green, Lavender, and Bone"
    ]
  },
  {
    version: "1.2",
    date: "2025-12-18",
    title: "Book Your Bay",
    changes: [
      "Bay booking is here — see real-time availability and reserve your spot",
      "Syncs with Google Calendar so staff always know what's booked",
      "Choose your session length and only see times that actually work",
      "Easier to use for everyone, including screen reader users"
    ]
  },
  {
    version: "1.3",
    date: "2025-12-18",
    title: "Better on Your Phone",
    changes: [
      "Subtle vibrations when you tap buttons (feels more responsive)",
      "Looks great on iPhone, iPad, and desktop",
      "Replaced text labels with cleaner logo icons"
    ]
  },
  {
    version: "1.4",
    date: "2025-12-19",
    title: "Membership Tiers",
    changes: [
      "Introduced membership levels: Social, Core, Premium, Corporate, and VIP",
      "Guest passes now work seamlessly — use one and it's deducted automatically",
      "Booking limits and perks adjust based on your membership tier"
    ]
  },
  {
    version: "1.5",
    date: "2025-12-19",
    title: "Easy Inquiries",
    changes: [
      "Request a tour, ask about membership, or inquire about private events",
      "Your form submissions are saved even if you lose connection",
      "Staff can now view and manage all inquiries in one place"
    ]
  },
  {
    version: "2.0",
    date: "2025-12-20",
    title: "Staff Portal & Install as App",
    isMajor: true,
    changes: [
      "New Staff Portal with easy navigation for managing the club",
      "Quick-access dashboard for staff to jump to common tasks",
      "Install the app on your phone's home screen — works like a native app",
      "Pages load faster, even on slow connections",
      "Works properly on iPhones with the notch"
    ]
  },
  {
    version: "2.1",
    date: "2025-12-21",
    title: "Easier & Safer Login",
    changes: [
      "Log in with a code sent to your email — no password to remember",
      "Your login stays active more reliably between visits",
      "Security improvements under the hood",
      "Tighter access controls for sensitive features"
    ]
  },
  {
    version: "2.2",
    date: "2025-12-22",
    title: "Calendar Sync",
    changes: [
      "Bookings now sync to four calendars: Golf Bays, Conference Room, Events, and Wellness",
      "Changes you make here show up in Google Calendar and vice versa"
    ]
  },
  {
    version: "2.3",
    date: "2025-12-23",
    title: "Facility Closures",
    changes: [
      "Staff can now mark facilities as closed for maintenance or holidays",
      "Members automatically see closure announcements",
      "Closures appear on all relevant calendars",
      "Staff calendar shows clear red 'CLOSED' blocks"
    ]
  },
  {
    version: "2.4",
    date: "2025-12-24",
    title: "Booking Requests",
    changes: [
      "Request a booking and staff will approve it — no more double-bookings",
      "Get notified when your request is approved or declined",
      "System prevents approving bookings over closures",
      "New 'My Requests' tab so you can track your pending bookings"
    ]
  },
  {
    version: "2.5",
    date: "2025-12-25",
    title: "Stay in the Loop",
    changes: [
      "In-app notifications keep you updated in real time",
      "Staff get alerted when new booking requests come in",
      "Push notifications available if you want them on your phone"
    ]
  },
  {
    version: "2.6",
    date: "2025-12-25",
    title: "Your Info, Always Current",
    changes: [
      "Your membership tier updates automatically when you log in",
      "We now track when your membership started",
      "Staff can import member data from Mindbody and Trackman"
    ]
  },
  {
    version: "2.7",
    date: "2025-12-25",
    title: "Smoother Experience",
    changes: [
      "The top of your screen now matches the Even House green",
      "Closure notices appear right away — no refresh needed",
      "Landing page header fades in beautifully as you scroll",
      "New virtual membership card you can show at check-in",
      "Logo looks crisp on light backgrounds too",
      "Fixed a rare issue where two people signing up at once could cause problems",
      "Improved 'Add to Home Screen' prompts",
      "Subtle glass effect on the membership button",
      "Images load faster (optimized for the web)",
      "Better checks before canceling a booking"
    ]
  },
  {
    version: "2.8",
    date: "2025-12-26",
    title: "Version History",
    changes: [
      "Staff can now see a full history of app updates",
      "Each update shows when it happened and what changed"
    ]
  },
  {
    version: "2.9",
    date: "2025-12-26",
    title: "Booking Improvements",
    changes: [
      "Booking pages load faster",
      "Your booking goes through even if there's a hiccup sending the confirmation",
      "Fixed an issue with closure-related notifications",
      "Staff get booking request alerts more reliably",
      "90-minute sessions now limited to Premium members and above",
      "All times display correctly for California (Pacific timezone)",
      "Same-day bookings only show times that are still available",
      "Past times no longer appear when booking",
      "Date picker now correctly shows which days you can book"
    ]
  },
  {
    version: "3.0",
    date: "2025-12-26",
    title: "Visual Polish",
    changes: [
      "Buttons throughout the app now have consistent sizing",
      "Staff dashboard buttons look cleaner and more professional",
      "Wellness and Events sections now match visually",
      "Sync and integration icons are larger and easier to tap"
    ]
  },
  {
    version: "3.1",
    date: "2025-12-26",
    title: "Behind the Scenes",
    changes: [
      "Booking system now knows your membership tier for smarter limits",
      "Fixed 'View as Member' mode for staff testing the member experience",
      "Notification system now supports all message types"
    ]
  },
  {
    version: "3.2",
    date: "2025-12-27",
    title: "Staff Portal Redesign",
    isMajor: true,
    changes: [
      "Reorganized Staff Portal navigation — Inquiries moved to bottom bar",
      "New Updates page showing your notifications and club announcements",
      "You can now share direct links to specific tabs",
      "Animations feel snappier throughout the app",
      "Training Guide redesigned with clearer layout",
      "Training Guide now supports images for each step",
      "Training Guide shows which pages each guide relates to",
      "Comprehensive how-to guides for all staff features",
      "Cleaner printing when you need a paper copy"
    ]
  },
  {
    version: "3.3",
    date: "2025-12-27",
    title: "Faster Loading",
    changes: [
      "Fixed a bug where the app could get stuck on the loading screen",
      "Loading animation fades out more smoothly",
      "Loading screen now always disappears within 2 seconds",
      "Better compatibility with all devices",
      "Pages signal when they're ready so you're not left waiting"
    ]
  },
  {
    version: "3.4",
    date: "2025-12-27",
    title: "Better Notifications",
    changes: [
      "You'll now get notified when staff books something on your behalf",
      "The notification dot now disappears properly after you've seen your messages",
      "Cleaned up duplicate entries in your booking history",
      "Your dashboard shows all upcoming bookings, including ones staff made for you",
      "When one staff member handles a request, it clears from everyone's queue"
    ]
  },
  {
    version: "3.5",
    date: "2025-12-27",
    title: "Training Guide Reliability",
    changes: [
      "Training guides update more reliably when we add new content",
      "New guides appear automatically without losing custom ones you've added",
      "Custom training guides you create are preserved during updates",
      "Fixed an issue where guide content could go missing"
    ]
  },
  {
    version: "3.6",
    date: "2025-12-28",
    title: "Simpler Navigation",
    changes: [
      "Cleaned up the side menu — fewer buttons, less clutter",
      "Access your portal from the header instead of the menu",
      "Contact page now has working links to Google Maps and Apple Maps"
    ]
  },
  {
    version: "3.7",
    date: "2025-12-28",
    title: "Report Issues Easily",
    changes: [
      "New way to report bugs or issues right from your Profile",
      "You can attach a screenshot to show us what went wrong",
      "Staff can track and resolve reported issues",
      "See the status of your reports: open, in progress, or resolved"
    ]
  },
  {
    version: "3.8",
    date: "2025-12-28",
    title: "Login Fixes",
    changes: [
      "Fixed an issue that could briefly make the app unresponsive",
      "Login works better when using the app in a browser frame",
      "Training guide shows a clear message if your session expires",
      "Your login stays active more reliably as you use the app",
      "Fixed a bug where you might get logged out unexpectedly"
    ]
  },
  {
    version: "3.9",
    date: "2025-12-28",
    title: "Stability Check",
    changes: [
      "Ran a full check of all app features — everything working smoothly",
      "Verified all data loads correctly",
      "Confirmed error messages appear when they should",
      "No issues found — the app is running great"
    ]
  },
  {
    version: "4.0",
    date: "2025-12-28",
    title: "Premium Feel",
    isMajor: true,
    changes: [
      "Hero images now have a subtle parallax depth effect as you scroll",
      "Scroll-reactive gradients shift gently to guide your eye",
      "Booking confirmations play a satisfying notification sound",
      "Glassmorphism styling refined for a cohesive, premium look",
      "Smoother animations throughout the app"
    ]
  },
  {
    version: "4.1",
    date: "2025-12-28",
    title: "Team Directory",
    changes: [
      "New Team section in Employee Resources for staff to view colleague contact info",
      "Staff can see phone numbers, emails, and job titles of team members",
      "Improved dark mode visibility for badge icons",
      "Admin-only features for adding, editing, and removing team members"
    ]
  },
  {
    version: "4.2",
    date: "2025-12-28",
    title: "Loading Animation",
    changes: [
      "Loading screen now slides up elegantly into the header bar",
      "Mascot and tagline gracefully fade up as the screen transitions",
      "Smoother, more polished app launch experience"
    ]
  },
  {
    version: "4.3",
    date: "2025-12-28",
    title: "Full-Bleed Hero",
    changes: [
      "Hero image now extends edge-to-edge behind the status bar on iPhone",
      "Fixed-position hero background for true full-bleed display",
      "Seamless edge-to-edge display for a more immersive experience"
    ]
  },
  {
    version: "4.4",
    date: "2025-12-28",
    title: "Parallax Preserved",
    changes: [
      "Refined hero background to maintain smooth parallax scrolling",
      "Background extends into safe area without breaking scroll effects",
      "Better structured layout for hero content and background layers"
    ]
  },
  {
    version: "4.5",
    date: "2025-12-28",
    title: "Menu Mascot",
    changes: [
      "Mascot icon added to top left of side menu for quick home navigation",
      "Tap the mascot to return to the landing page instantly",
      "Mascot automatically switches between light and dark versions based on theme",
      "Cleaner menu layout with Home link replaced by mascot button"
    ]
  },
  {
    version: "4.6",
    date: "2025-12-28",
    title: "Brand Green Status Bar",
    changes: [
      "Landing page now displays the signature Even House green behind the status bar",
      "Consistent branding on iOS PWA regardless of system light or dark mode",
      "Fixed Profile page animation flash during page transitions"
    ]
  },
  {
    version: "4.7",
    date: "2025-12-28",
    title: "Fluid Loading Exit",
    changes: [
      "Loading screen now fluidly minimizes into the status bar",
      "Content fades and shrinks smoothly during the transition",
      "Creates seamless visual connection between loading and status bar"
    ]
  },
  {
    version: "4.8",
    date: "2025-12-28",
    title: "Gallery Loader Update",
    changes: [
      "Gallery page now uses the same fluid minimize-to-status-bar animation",
      "Consistent loading experience across all pages"
    ]
  },
  {
    version: "4.9",
    date: "2025-12-28",
    title: "Modal Safe Area",
    changes: [
      "Book a Tour modal now opens within the safe viewing area on iOS",
      "Modal respects status bar and home indicator spacing"
    ]
  },
  {
    version: "5.0",
    date: "2025-12-28",
    title: "Pull to Refresh",
    isMajor: true,
    changes: [
      "Pull down on any member page to refresh your data",
      "Beautiful branded green animation with animated mascot",
      "Loading screen fluidly shrinks into status bar when complete",
      "Data refreshes without full page reload for smoother experience"
    ]
  },
  {
    version: "5.1",
    date: "2025-12-28",
    title: "Staff Portal Refresh",
    changes: [
      "Pull to refresh now available on Staff portal pages",
      "Bookings, Tours, and Updates pages all support the new refresh gesture",
      "Same beautiful branded animation experience for staff members"
    ]
  },
  {
    version: "5.2",
    date: "2025-12-28",
    title: "Booking System Fixes",
    changes: [
      "Fixed booking cancellation for members from Dashboard",
      "Fixed member lookup in Manual Booking modal for staff",
      "Fixed request cancellation from My Requests tab",
      "Improved error messages when bookings fail to process"
    ]
  },
  {
    version: "5.3",
    date: "2025-12-28",
    title: "UI Polish & Bug Fixes",
    changes: [
      "Fixed RSVP showing error message even when successful",
      "Fixed Add to Calendar showing false success on iOS Safari",
      "Improved event card text readability in light mode"
    ]
  }
];
