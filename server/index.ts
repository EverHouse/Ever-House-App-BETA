import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSession, registerAuthRoutes } from './replit_integrations/auth';
import { setupSupabaseAuthRoutes } from './supabase/auth';
import { isProduction } from './core/db';
import { db } from './db';
import { systemSettings } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { syncGoogleCalendarEvents, syncWellnessCalendarEvents } from './core/calendar';

import resourcesRouter from './routes/resources';
import calendarRouter from './routes/calendar';
import eventsRouter from './routes/events';
import authRouter from './routes/auth';
import hubspotRouter from './routes/hubspot';
import membersRouter from './routes/members';
import usersRouter from './routes/users';
import wellnessRouter from './routes/wellness';
import guestPassesRouter from './routes/guestPasses';
import baysRouter from './routes/bays';
import notificationsRouter from './routes/notifications';
import pushRouter, { sendDailyReminders } from './routes/push';
import availabilityRouter from './routes/availability';
import cafeRouter from './routes/cafe';
import dataConflictsRouter from './routes/dataConflicts';
import galleryRouter from './routes/gallery';
import announcementsRouter from './routes/announcements';
import faqsRouter from './routes/faqs';
import inquiriesRouter from './routes/inquiries';
import imageUploadRouter from './routes/imageUpload';
import closuresRouter from './routes/closures';
import membershipTiersRouter from './routes/membershipTiers';
import trainingRouter from './routes/training';
import { registerObjectStorageRoutes } from './replit_integrations/object_storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);

type CorsCallback = (err: Error | null, allow?: boolean) => void;
type CorsOriginFunction = (origin: string | undefined, callback: CorsCallback) => void;

const getAllowedOrigins = (): string[] | boolean | CorsOriginFunction => {
  if (!isProduction) {
    return true;
  }
  const origins = process.env.ALLOWED_ORIGINS;
  if (origins && origins.trim()) {
    return origins.split(',').map(o => o.trim()).filter(Boolean);
  }
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) {
    return [`https://${replitDomain}`, `https://${replitDomain.replace('-00-', '-')}`];
  }
  // In production, frontend and API are same-origin (served from same Express server)
  // Return function to dynamically check origin - allow same-origin and Replit domains
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (same-origin, server-to-server, mobile apps)
    if (!origin) {
      callback(null, true);
      return;
    }
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      // Allow Replit deployment domains (strict hostname suffix matching)
      if (hostname.endsWith('.replit.app') || hostname.endsWith('.replit.dev') || hostname.endsWith('.repl.co')) {
        callback(null, true);
        return;
      }
      // Allow localhost for testing
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        callback(null, true);
        return;
      }
    } catch {
      // Invalid URL, deny
    }
    callback(new Error('Not allowed by CORS'));
  };
};

const corsOptions = {
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb' }));
app.use(getSession());

// DB-independent health check for Autoscale
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as time, COUNT(*) as resource_count FROM resources');
    const resourceTypes = await pool.query('SELECT type, COUNT(*) as count FROM resources GROUP BY type');
    res.json({
      status: 'ok',
      environment: isProduction ? 'production' : 'development',
      database: 'connected',
      timestamp: dbResult.rows[0].time,
      resourceCount: parseInt(dbResult.rows[0].resource_count),
      resourcesByType: resourceTypes.rows,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      environment: isProduction ? 'production' : 'development',
      database: 'disconnected',
      error: error.message,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    });
  }
});

if (isProduction) {
  app.use(express.static(path.join(__dirname, '../dist')));
} else {
  // In development, redirect root to Vite dev server (port 5000) for mobile preview
  app.get('/', (req, res) => {
    const devDomain = process.env.REPLIT_DEV_DOMAIN;
    if (devDomain) {
      // Redirect to Vite dev server via Replit proxy
      res.redirect(`https://${devDomain}`);
    } else {
      res.send('API Server running. Frontend is at port 5000.');
    }
  });
}

app.use(resourcesRouter);
app.use(calendarRouter);
app.use(eventsRouter);
app.use(authRouter);
app.use(hubspotRouter);
app.use(membersRouter);
app.use(usersRouter);
app.use(wellnessRouter);
app.use(guestPassesRouter);
app.use(baysRouter);
app.use(notificationsRouter);
app.use(pushRouter);
app.use(availabilityRouter);
app.use(cafeRouter);
app.use(dataConflictsRouter);
app.use(galleryRouter);
app.use(announcementsRouter);
app.use(faqsRouter);
app.use(inquiriesRouter);
app.use(imageUploadRouter);
app.use(closuresRouter);
app.use(membershipTiersRouter);
app.use(trainingRouter);
registerObjectStorageRoutes(app);

// SPA catch-all using middleware (avoids Express 5 path-to-regexp issues)
if (isProduction) {
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/healthz')) {
      return res.sendFile(path.join(__dirname, '../dist/index.html'));
    }
    next();
  });
}

async function autoSeedResources() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM resources');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      console.log('Auto-seeding resources...');
      const resources = [
        { name: 'Simulator Bay 1', type: 'simulator', description: 'TrackMan Simulator Bay 1', capacity: 6 },
        { name: 'Simulator Bay 2', type: 'simulator', description: 'TrackMan Simulator Bay 2', capacity: 6 },
        { name: 'Simulator Bay 3', type: 'simulator', description: 'TrackMan Simulator Bay 3', capacity: 6 },
        { name: 'Simulator Bay 4', type: 'simulator', description: 'TrackMan Simulator Bay 4', capacity: 6 },
        { name: 'Conference Room', type: 'conference_room', description: 'Main conference room with AV setup', capacity: 12 },
      ];

      for (const resource of resources) {
        await pool.query(
          `INSERT INTO resources (name, type, description, capacity) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT DO NOTHING`,
          [resource.name, resource.type, resource.description, resource.capacity]
        );
      }
      console.log(`Auto-seeded ${resources.length} resources (4 simulators + 1 conference room)`);
    }
  } catch (error) {
    console.log('Resources table may not exist yet, skipping auto-seed');
  }
}

async function autoSeedCafeMenu() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM cafe_items');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      console.log('Auto-seeding cafe menu...');
      const cafeItems = [
        // Breakfast - House Toasts
        { category: 'Breakfast', name: 'Egg Toast', price: 14, description: 'Schaner Farm scrambled eggs, whipped ricotta, chives, micro greens, toasted country batard', icon: 'egg_alt', sort_order: 1 },
        { category: 'Breakfast', name: 'Avocado Toast', price: 16, description: 'Hass smashed avocado, radish, lemon, micro greens, dill, toasted country batard', icon: 'eco', sort_order: 2 },
        { category: 'Breakfast', name: 'Banana & Honey Toast', price: 14, description: 'Banana, whipped ricotta, Hapa Honey Farm local honey, toasted country batard', icon: 'bakery_dining', sort_order: 3 },
        { category: 'Breakfast', name: 'Smoked Salmon Toast', price: 20, description: 'Alaskan king smoked salmon, whipped cream cheese, dill, capers, lemon, micro greens, toasted country batard', icon: 'set_meal', sort_order: 4 },
        { category: 'Breakfast', name: 'Breakfast Croissant', price: 16, description: 'Schaner Farm eggs, New School american cheese, freshly baked croissant, choice of cured ham or applewood smoked bacon', icon: 'bakery_dining', sort_order: 5 },
        { category: 'Breakfast', name: 'French Omelette', price: 14, description: 'Schaner Farm eggs, cultured butter, fresh herbs, served with side of seasonal salad greens', icon: 'egg', sort_order: 6 },
        { category: 'Breakfast', name: 'Hanger Steak & Eggs', price: 24, description: 'Autonomy Farms Hanger steak, Schaner Farm eggs, cooked your way', icon: 'restaurant', sort_order: 7 },
        { category: 'Breakfast', name: 'Bacon & Eggs', price: 14, description: 'Applewood smoked bacon, Schaner Farm eggs, cooked your way', icon: 'egg_alt', sort_order: 8 },
        { category: 'Breakfast', name: 'Yogurt Parfait', price: 14, description: 'Yogurt, seasonal fruits, farmstead granola, Hapa Honey farm local honey', icon: 'icecream', sort_order: 9 },
        // Sides
        { category: 'Sides', name: 'Bacon, Two Slices', price: 6, description: 'Applewood smoked bacon', icon: 'restaurant', sort_order: 1 },
        { category: 'Sides', name: 'Eggs, Scrambled', price: 8, description: 'Schaner Farm scrambled eggs', icon: 'egg', sort_order: 2 },
        { category: 'Sides', name: 'Seasonal Fruit Bowl', price: 10, description: 'Fresh seasonal fruits', icon: 'nutrition', sort_order: 3 },
        { category: 'Sides', name: 'Smoked Salmon', price: 9, description: 'Alaskan king smoked salmon', icon: 'set_meal', sort_order: 4 },
        { category: 'Sides', name: 'Toast, Two Slices', price: 3, description: 'Toasted country batard', icon: 'bakery_dining', sort_order: 5 },
        { category: 'Sides', name: 'Sqirl Seasonal Jam', price: 3, description: 'Artisan seasonal jam', icon: 'local_florist', sort_order: 6 },
        { category: 'Sides', name: 'Pistachio Spread', price: 4, description: 'House-made pistachio spread', icon: 'spa', sort_order: 7 },
        // Lunch
        { category: 'Lunch', name: 'Caesar Salad', price: 15, description: 'Romaine lettuce, homemade dressing, grated Reggiano. Add: roasted chicken $8, hanger steak 8oz $14', icon: 'local_florist', sort_order: 1 },
        { category: 'Lunch', name: 'Wedge Salad', price: 16, description: 'Iceberg lettuce, bacon, red onion, cherry tomatoes, Point Reyes bleu cheese, homemade dressing', icon: 'local_florist', sort_order: 2 },
        { category: 'Lunch', name: 'Chicken Salad Sandwich', price: 14, description: 'Autonomy Farms chicken, celery, toasted pan loaf, served with olive oil potato chips', icon: 'lunch_dining', sort_order: 3 },
        { category: 'Lunch', name: 'Tuna Salad Sandwich', price: 14, description: 'Wild, pole-caught albacore tuna, sprouts, club chimichurri, toasted pan loaf, served with olive oil potato chips', icon: 'set_meal', sort_order: 4 },
        { category: 'Lunch', name: 'Grilled Cheese', price: 12, description: 'New School american cheese, brioche pan loaf, served with olive oil potato chips. Add: short rib $6, roasted tomato soup cup $7', icon: 'lunch_dining', sort_order: 5 },
        { category: 'Lunch', name: 'Heirloom BLT', price: 18, description: 'Applewood smoked bacon, butter lettuce, heirloom tomatoes, olive oil mayo, toasted pan loaf, served with olive oil potato chips', icon: 'lunch_dining', sort_order: 6 },
        { category: 'Lunch', name: 'Bratwurst', price: 12, description: 'German bratwurst, sautéed onions & peppers, toasted brioche bun', icon: 'lunch_dining', sort_order: 7 },
        { category: 'Lunch', name: 'Bison Serrano Chili', price: 14, description: 'Pasture raised bison, serrano, anaheim, green bell peppers, mint, cilantro, cheddar cheese, sour cream, green onion, served with organic corn chips', icon: 'soup_kitchen', sort_order: 8 },
        // Kids
        { category: 'Kids', name: 'Kids Grilled Cheese', price: 6, description: 'Classic grilled cheese for little ones', icon: 'child_care', sort_order: 1 },
        { category: 'Kids', name: 'Kids Hot Dog', price: 8, description: 'All-beef hot dog', icon: 'child_care', sort_order: 2 },
        // Dessert
        { category: 'Dessert', name: 'Vanilla Bean Gelato Sandwich', price: 6, description: 'Vanilla bean gelato with chocolate chip cookies', icon: 'icecream', sort_order: 1 },
        { category: 'Dessert', name: 'Sea Salt Caramel Gelato Sandwich', price: 6, description: 'Sea salt caramel gelato with snickerdoodle cookies', icon: 'icecream', sort_order: 2 },
        { category: 'Dessert', name: 'Seasonal Pie, Slice', price: 6, description: 'Daily seasonal pie with house made crème', icon: 'cake', sort_order: 3 },
        // Shareables
        { category: 'Shareables', name: 'Club Charcuterie', price: 32, description: 'Selection of cured meats and artisan cheeses', icon: 'tapas', sort_order: 1 },
        { category: 'Shareables', name: 'Chips & Salsa', price: 10, description: 'House-made salsa with organic corn chips', icon: 'tapas', sort_order: 2 },
        { category: 'Shareables', name: 'Caviar Service', price: 0, description: 'Market price - ask your server', icon: 'dining', sort_order: 3 },
        { category: 'Shareables', name: 'Tinned Fish Tray', price: 47, description: 'Premium selection of tinned fish', icon: 'set_meal', sort_order: 4 },
      ];

      for (const item of cafeItems) {
        await pool.query(
          `INSERT INTO cafe_items (category, name, price, description, icon, is_active, sort_order) 
           VALUES ($1, $2, $3, $4, $5, true, $6) 
           ON CONFLICT DO NOTHING`,
          [item.category, item.name, item.price, item.description, item.icon, item.sort_order]
        );
      }
      console.log(`Auto-seeded ${cafeItems.length} cafe menu items`);
    }
  } catch (error) {
    console.log('Cafe menu table may not exist yet, skipping auto-seed');
  }
}

async function autoSeedTrainingSections() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM training_sections');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      console.log('Auto-seeding training sections...');
      const sections = [
        { icon: 'login', title: 'Getting Started', description: 'How to access and navigate the Staff Portal', is_admin_only: false, sort_order: 1, steps: JSON.stringify([
          { title: 'Logging In', content: 'Use your registered email to sign in via the magic link system. Check your email for the login link - no password needed. The link expires after 15 minutes for security.' },
          { title: 'Accessing the Staff Portal', content: 'After logging in, you\'ll be automatically redirected to the Staff Portal dashboard. If you end up on the member portal, tap the menu icon and select "Staff Portal".' },
          { title: 'Navigation', content: 'The bottom navigation bar has 5 main tabs: Home, Requests, Events, Wellness, and Updates. The Home dashboard shows quick access cards to all other features.' },
        ])},
        { icon: 'event_note', title: 'Managing Booking Requests', description: 'Approve, decline, or manage simulator and conference room bookings', is_admin_only: false, sort_order: 2, steps: JSON.stringify([
          { title: 'Viewing Requests', content: 'Tap "Requests" in the bottom nav to see all pending booking requests. New requests show at the top. A red badge shows the count of pending requests.' },
          { title: 'Request Details', content: 'Each request shows the member name, date/time requested, duration, and resource (which simulator bay or conference room).' },
          { title: 'Approving a Request', content: 'Tap a request to expand it, then tap "Approve". The system will check for conflicts with other approved bookings and facility closures. If there\'s a conflict, you\'ll see an error message explaining why.' },
          { title: 'Declining a Request', content: 'Tap "Decline" if you cannot accommodate the request. The member will be notified that their request was declined.' },
          { title: 'Calendar View', content: 'Switch to the Calendar view using the tabs at the top to see all approved bookings in a visual timeline. Red blocks indicate facility closures.' },
        ])},
        { icon: 'event', title: 'Managing Events', description: 'Create and manage club events for members', is_admin_only: false, sort_order: 3, steps: JSON.stringify([
          { title: 'Viewing Events', content: 'Tap "Events" in the bottom nav to see all upcoming and past events. Events sync with the club\'s Google Calendar.' },
          { title: 'Creating an Event', content: 'Tap the "+" button to create a new event. Fill in the title, date, time, location, and description. Toggle "Members Only" if the event is exclusive to members.' },
          { title: 'Editing Events', content: 'Tap the edit icon on any event to modify its details. Changes sync automatically to Google Calendar.' },
          { title: 'Event RSVPs', content: 'View who has RSVPed to each event by expanding the event details. RSVP counts help with planning and capacity management.' },
          { title: 'Deleting Events', content: 'Tap the delete icon to remove an event. This also removes it from Google Calendar. Members who RSVPed will see it removed from their dashboard.' },
        ])},
        { icon: 'spa', title: 'Managing Wellness Classes', description: 'Schedule and manage wellness and fitness classes', is_admin_only: false, sort_order: 4, steps: JSON.stringify([
          { title: 'Viewing Classes', content: 'Tap "Wellness" in the bottom nav to see all scheduled wellness classes. Classes sync with the dedicated Wellness Google Calendar.' },
          { title: 'Adding a Class', content: 'Tap "+" to add a new class. Enter the class name, instructor, date, time, duration, and capacity.' },
          { title: 'Recurring Classes', content: 'For weekly classes, you can create them individually or ask an admin to set up recurring entries.' },
          { title: 'Class Bookings', content: 'Members can book spots in classes through the member portal. You can see the booking count on each class card.' },
        ])},
        { icon: 'campaign', title: 'Posting Updates & Announcements', description: 'Keep members informed with news and announcements', is_admin_only: false, sort_order: 5, steps: JSON.stringify([
          { title: 'Viewing Announcements', content: 'Tap "Updates" in the bottom nav to see all announcements. Current/active announcements show first, followed by past ones.' },
          { title: 'Creating an Announcement', content: 'Tap "+" to create a new announcement. Add a title, content, and optionally set start/end dates for when it should be visible.' },
          { title: 'Priority Levels', content: 'Set the priority level: Normal for general news, High for important updates (these appear more prominently to members), Urgent for critical notices.' },
          { title: 'Automatic Announcements', content: 'When you create a facility closure, an announcement is automatically created and linked. When the closure is deleted, its announcement is also removed.' },
        ])},
        { icon: 'groups', title: 'Member Directory', description: 'Search and view member information', is_admin_only: false, sort_order: 6, steps: JSON.stringify([
          { title: 'Accessing the Directory', content: 'From the Home dashboard, tap "Directory" to open the member search.' },
          { title: 'Searching Members', content: 'Type a name, email, or phone number in the search bar. Results update as you type.' },
          { title: 'Member Profiles', content: 'Tap a member to see their profile including membership tier, join date, contact info, and booking history.' },
          { title: 'Membership Tiers', content: 'Members have different tiers (Social, Core, Premium, Corporate, VIP) which determine their booking privileges, guest passes, and access levels.' },
        ])},
        { icon: 'local_cafe', title: 'Cafe Menu Management', description: 'Update menu items and prices', is_admin_only: false, sort_order: 7, steps: JSON.stringify([
          { title: 'Viewing the Menu', content: 'From the Home dashboard, tap "Cafe Menu" to see all menu items organized by category.' },
          { title: 'Adding Items', content: 'Tap "+" to add a new menu item. Fill in the name, price, description, and category. You can also upload an image.' },
          { title: 'Editing Items', content: 'Tap the edit icon on any item to modify its details or mark it as unavailable.' },
          { title: 'Categories', content: 'Use the category filter tabs to quickly find items. Categories include Coffee & Drinks, Food, Snacks, etc.' },
          { title: 'Image Upload', content: 'When uploading images, they\'re automatically optimized for web viewing (converted to WebP format) to ensure fast loading.' },
        ])},
        { icon: 'mail', title: 'Handling Inquiries', description: 'View and respond to form submissions', is_admin_only: false, sort_order: 8, steps: JSON.stringify([
          { title: 'Viewing Inquiries', content: 'From the Home dashboard, tap "Inquiries" to see all form submissions including contact forms, tour requests, membership applications, and private hire inquiries.' },
          { title: 'Filtering', content: 'Use the filter buttons to view by type (Contact, Tour Request, Membership, Private Hire) or status (New, Read, Replied, Archived).' },
          { title: 'Marking Status', content: 'Update the status as you handle each inquiry: mark as Read when reviewed, Replied when you\'ve responded, or Archived when complete.' },
          { title: 'Adding Notes', content: 'Add internal notes to inquiries for follow-up reminders or to share context with other staff members.' },
        ])},
        { icon: 'photo_library', title: 'Gallery Management', description: 'Upload and manage venue photos', is_admin_only: false, sort_order: 9, steps: JSON.stringify([
          { title: 'Viewing the Gallery', content: 'From the Home dashboard, tap "Gallery" to see all venue photos organized by category.' },
          { title: 'Uploading Photos', content: 'Tap "+" to upload a new photo. Select an image, choose a category, and add an optional caption. Images are automatically optimized.' },
          { title: 'Organizing', content: 'Drag photos to reorder them, or use the sort options to arrange by date or category.' },
          { title: 'Removing Photos', content: 'Tap the delete icon to remove a photo. This performs a "soft delete" so it can be recovered if needed.' },
        ])},
        { icon: 'help_outline', title: 'FAQ Management', description: 'Edit frequently asked questions shown on the public site', is_admin_only: false, sort_order: 10, steps: JSON.stringify([
          { title: 'Viewing FAQs', content: 'From the Home dashboard, tap "FAQs" to see all questions and answers displayed on the public FAQ page.' },
          { title: 'Adding FAQs', content: 'Tap "+" to add a new question. Enter the question and answer text. New FAQs appear immediately on the public site.' },
          { title: 'Editing FAQs', content: 'Tap the edit icon to modify any existing FAQ. Changes are reflected immediately on the public site.' },
          { title: 'Ordering', content: 'FAQs are displayed in the order they were created. Consider the most common questions when adding new ones.' },
        ])},
        { icon: 'block', title: 'Facility Closures & Availability', description: 'Block booking times for maintenance or special events', is_admin_only: false, sort_order: 11, steps: JSON.stringify([
          { title: 'Accessing Blocks', content: 'From the Home dashboard, tap "Booking Blocks" to manage facility closures and availability blocks.' },
          { title: 'Creating a Closure', content: 'Tap "+" to create a closure. Set the date range, time range, affected areas (simulator bays, conference room, or whole facility), and reason.' },
          { title: 'Affected Areas', content: 'Choose which resources are affected: individual simulator bays (Bay 1, Bay 2, Bay 3), the conference room, or the entire facility.' },
          { title: 'Calendar Sync', content: 'Closures automatically sync to Google Calendar and appear as red "CLOSED" blocks in the staff calendar view.' },
          { title: 'Automatic Announcements', content: 'Creating a closure automatically generates an announcement for members with the closure details.' },
          { title: 'Booking Conflicts', content: 'The system prevents staff from approving bookings that conflict with closures. You\'ll see a clear error message if there\'s a conflict.' },
        ])},
        { icon: 'shield_person', title: 'Managing Team Access (Admin Only)', description: 'Add staff members and manage admin privileges', is_admin_only: true, sort_order: 12, steps: JSON.stringify([
          { title: 'Accessing Team Management', content: 'From the Home dashboard, tap "Team Access" (only visible to admins).' },
          { title: 'Adding Staff', content: 'Search for a member by email, then promote them to Staff role. They\'ll gain access to the Staff Portal.' },
          { title: 'Promoting to Admin', content: 'Admins can promote staff to Admin role, which grants access to team management, tier configuration, and version history.' },
          { title: 'Removing Access', content: 'Demote a user back to Member role to revoke their staff portal access. They\'ll retain their membership but lose admin capabilities.' },
        ])},
        { icon: 'loyalty', title: 'Tier Configuration (Admin Only)', description: 'Configure membership tier settings and privileges', is_admin_only: true, sort_order: 13, steps: JSON.stringify([
          { title: 'Viewing Tiers', content: 'From the Home dashboard, tap "Manage Tiers" (only visible to admins) to see all membership tiers.' },
          { title: 'Tier Settings', content: 'Each tier has configurable limits: daily simulator minutes, guest passes per month, booking window (how far ahead they can book), and access permissions.' },
          { title: 'Editing Privileges', content: 'Modify tier privileges to adjust what each membership level can access. Changes take effect immediately for all members of that tier.' },
          { title: 'Display Settings', content: 'Update the tier name, price display, and highlighted features shown on the public membership comparison page.' },
        ])},
        { icon: 'visibility', title: 'View As Member (Admin Only)', description: 'See the app from a member\'s perspective', is_admin_only: true, sort_order: 14, steps: JSON.stringify([
          { title: 'Starting View As Mode', content: 'In the member directory, find a member and tap "View As" to see the app exactly as they see it.' },
          { title: 'While Viewing', content: 'You\'ll see the member portal as that member sees it, including their bookings, events, and dashboard. A banner reminds you that you\'re in View As mode.' },
          { title: 'Taking Actions', content: 'If you try to book or RSVP while in View As mode, you\'ll see a confirmation asking if you want to do this on behalf of the member.' },
          { title: 'Exiting View As Mode', content: 'Tap the banner or use the profile menu to exit View As mode and return to your admin account.' },
        ])},
      ];

      for (const section of sections) {
        await pool.query(
          `INSERT INTO training_sections (icon, title, description, steps, is_admin_only, sort_order) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT DO NOTHING`,
          [section.icon, section.title, section.description, section.steps, section.is_admin_only, section.sort_order]
        );
      }
      console.log(`Auto-seeded ${sections.length} training sections`);
    }
  } catch (error) {
    console.log('Training sections table may not exist yet, skipping auto-seed');
  }
}

async function startServer() {
  console.log(`[Startup] Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`[Startup] DATABASE_URL: ${process.env.DATABASE_URL ? 'configured' : 'MISSING'}`);
  console.log(`[Startup] PORT env: ${process.env.PORT || 'not set'}`);
  
  try {
    setupSupabaseAuthRoutes(app);
    registerAuthRoutes(app);
  } catch (err) {
    console.error('[Startup] FATAL: Auth routes setup failed:', err);
    process.exit(1);
  }

  // For Autoscale: use PORT env directly in production (no fallback)
  // In development: fallback to 3001
  const PORT = isProduction 
    ? Number(process.env.PORT) 
    : (Number(process.env.PORT) || 3001);
  
  if (isProduction && !process.env.PORT) {
    console.error('[Startup] FATAL: PORT environment variable required in production');
    process.exit(1);
  }
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Startup] API Server running on port ${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error(`[Startup] Server failed to start:`, err);
    process.exit(1);
  });

  // Only run auto-seeding and background sync in development
  // In production (Autoscale), use `npm run seed` and manual sync endpoints instead
  if (!isProduction) {
    setTimeout(async () => {
      try {
        await autoSeedResources();
      } catch (err) {
        console.error('[Startup] Auto-seed resources failed:', err);
      }
      
      try {
        await autoSeedCafeMenu();
      } catch (err) {
        console.error('[Startup] Auto-seed cafe menu failed:', err);
      }

      try {
        await autoSeedTrainingSections();
      } catch (err) {
        console.error('[Startup] Auto-seed training sections failed:', err);
      }

      try {
        const gcalResult = await syncGoogleCalendarEvents();
        if (gcalResult.error) {
          console.log(`[Startup] Google Calendar sync skipped: ${gcalResult.error}`);
        } else {
          console.log(`[Startup] Google Calendar sync: ${gcalResult.synced} events (${gcalResult.created} created, ${gcalResult.updated} updated)`);
        }
      } catch (err) {
        console.log('[Startup] Google Calendar sync failed:', err);
      }

      const SYNC_INTERVAL_MS = 5 * 60 * 1000;
      setInterval(async () => {
        try {
          const eventsResult = await syncGoogleCalendarEvents().catch(() => ({ synced: 0, created: 0, updated: 0, error: 'Events sync failed' }));
          const wellnessResult = await syncWellnessCalendarEvents().catch(() => ({ synced: 0, created: 0, updated: 0, error: 'Wellness sync failed' }));
          const eventsMsg = eventsResult.error ? eventsResult.error : `${eventsResult.synced} synced`;
          const wellnessMsg = wellnessResult.error ? wellnessResult.error : `${wellnessResult.synced} synced`;
          console.log(`[Auto-sync] Events: ${eventsMsg}, Wellness: ${wellnessMsg}`);
        } catch (err) {
          console.error('[Auto-sync] Calendar sync failed:', err);
        }
      }, SYNC_INTERVAL_MS);
      console.log('[Startup] Background calendar sync enabled (every 5 minutes)');
    }, 100);
  } else {
    console.log('[Startup] Production mode: auto-seeding and background sync disabled');
    console.log('[Startup] Use POST /api/events/sync/google and POST /api/wellness-classes/sync for manual sync');
  }
  
  // Daily reminder scheduler - runs at 6pm local time
  const REMINDER_HOUR = 18; // 6pm
  const REMINDER_SETTING_KEY = 'last_daily_reminder_date';
  
  // Atomic check-and-set: only returns true if this instance claimed today's reminder slot
  const tryClaimReminderSlot = async (todayStr: string): Promise<boolean> => {
    try {
      // Atomic upsert that only succeeds if value is different from today
      // Uses Drizzle's onConflictDoUpdate with a WHERE clause to ensure atomicity
      const result = await db
        .insert(systemSettings)
        .values({
          key: REMINDER_SETTING_KEY,
          value: todayStr,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: todayStr,
            updatedAt: new Date(),
          },
          where: sql`${systemSettings.value} IS DISTINCT FROM ${todayStr}`,
        })
        .returning({ key: systemSettings.key });
      
      return result.length > 0;
    } catch (err) {
      console.error('[Daily Reminders] Database error:', err);
      return false;
    }
  };
  
  const checkAndSendReminders = async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0];
      
      // Only run at 6pm and only once per day (atomic claim)
      if (currentHour === REMINDER_HOUR) {
        const claimed = await tryClaimReminderSlot(todayStr);
        
        if (claimed) {
          console.log('[Daily Reminders] Starting scheduled reminder job...');
          
          try {
            const result = await sendDailyReminders();
            console.log(`[Daily Reminders] Completed: ${result.message}`);
          } catch (err) {
            console.error('[Daily Reminders] Send failed:', err);
          }
        }
      }
    } catch (err) {
      console.error('[Daily Reminders] Scheduler error:', err);
    }
  };
  
  // Check every 30 minutes
  setInterval(checkAndSendReminders, 30 * 60 * 1000);
  console.log('[Startup] Daily reminder scheduler enabled (runs at 6pm)');
}

startServer().catch((err) => {
  console.error('[Startup] Fatal error:', err);
  process.exit(1);
});
