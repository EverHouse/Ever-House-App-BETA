import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSession, registerAuthRoutes } from './replit_integrations/auth';
import { setupSupabaseAuthRoutes } from './supabase/auth';
import { pool, isProduction } from './core/db';
import { syncGoogleCalendarEvents } from './core/calendar';

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
import pushRouter from './routes/push';
import availabilityRouter from './routes/availability';
import cafeRouter from './routes/cafe';
import dataConflictsRouter from './routes/dataConflicts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);

const corsOptions = {
  origin: isProduction 
    ? process.env.ALLOWED_ORIGINS?.split(',') || true
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));
app.use(getSession());

if (isProduction) {
  app.use(express.static(path.join(__dirname, '../dist')));
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

async function autoSeedCafeMenu() {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM cafe_items');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      console.log('Auto-seeding cafe menu...');
      const cafeItems = [
        { category: 'Coffee', name: 'Espresso', price: 4, description: 'Double shot of espresso', icon: 'coffee', sort_order: 1 },
        { category: 'Coffee', name: 'Americano', price: 5, description: 'Espresso with hot water', icon: 'coffee', sort_order: 2 },
        { category: 'Coffee', name: 'Latte', price: 6, description: 'Espresso with steamed milk', icon: 'coffee', sort_order: 3 },
        { category: 'Coffee', name: 'Cappuccino', price: 6, description: 'Espresso with foamed milk', icon: 'coffee', sort_order: 4 },
        { category: 'Coffee', name: 'Cold Brew', price: 6, description: '24-hour steeped cold brew', icon: 'coffee', sort_order: 5 },
        { category: 'Tea', name: 'Matcha Latte', price: 7, description: 'Ceremonial grade matcha with oat milk', icon: 'emoji_food_beverage', sort_order: 1 },
        { category: 'Tea', name: 'English Breakfast', price: 4, description: 'Classic black tea', icon: 'emoji_food_beverage', sort_order: 2 },
        { category: 'Tea', name: 'Green Tea', price: 4, description: 'Japanese green tea', icon: 'emoji_food_beverage', sort_order: 3 },
        { category: 'Food', name: 'Avocado Toast', price: 14, description: 'Sourdough, avocado, everything seasoning, micro greens', icon: 'bakery_dining', sort_order: 1 },
        { category: 'Food', name: 'Acai Bowl', price: 16, description: 'Acai blend with granola, fresh berries, coconut', icon: 'lunch_dining', sort_order: 2 },
        { category: 'Food', name: 'Turkey Club', price: 18, description: 'Roasted turkey, bacon, lettuce, tomato, aioli', icon: 'lunch_dining', sort_order: 3 },
        { category: 'Food', name: 'House Salad', price: 14, description: 'Mixed greens, seasonal vegetables, house vinaigrette', icon: 'local_florist', sort_order: 4 },
        { category: 'Beverages', name: 'Fresh Juice', price: 10, description: 'Daily selection of fresh-pressed juices', icon: 'local_bar', sort_order: 1 },
        { category: 'Beverages', name: 'Smoothie', price: 12, description: 'Protein smoothie with choice of base', icon: 'local_bar', sort_order: 2 },
        { category: 'Beverages', name: 'Sparkling Water', price: 5, description: 'San Pellegrino', icon: 'water_drop', sort_order: 3 },
        { category: 'Alcohol', name: 'House Wine', price: 14, description: 'Red or white, by the glass', icon: 'wine_bar', sort_order: 1 },
        { category: 'Alcohol', name: 'Local Beer', price: 8, description: 'Selection of local craft beers', icon: 'sports_bar', sort_order: 2 },
        { category: 'Alcohol', name: 'Signature Cocktail', price: 16, description: 'Ask about our seasonal creation', icon: 'nightlife', sort_order: 3 },
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

async function startServer() {
  setupSupabaseAuthRoutes(app);
  registerAuthRoutes(app);

  await autoSeedCafeMenu();

  try {
    const gcalResult = await syncGoogleCalendarEvents();
    if (gcalResult.error) {
      console.log(`Google Calendar sync skipped: ${gcalResult.error}`);
    } else {
      console.log(`Google Calendar sync: ${gcalResult.synced} events (${gcalResult.created} created, ${gcalResult.updated} updated)`);
    }
  } catch (err) {
    console.log('Google Calendar sync failed:', err);
  }

  const PORT = Number(process.env.PORT) || (isProduction ? 80 : 3001);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
