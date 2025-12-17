import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // Seed Simulator Bays
    console.log('Creating simulator bays...');
    const bays = [
      { name: 'Bay 1', description: 'TrackMan simulator bay with premium setup', is_active: true },
      { name: 'Bay 2', description: 'TrackMan simulator bay with premium setup', is_active: true },
      { name: 'Bay 3', description: 'TrackMan simulator bay with premium setup', is_active: true },
    ];

    for (const bay of bays) {
      await pool.query(
        `INSERT INTO bays (name, description, is_active) 
         VALUES ($1, $2, $3) 
         ON CONFLICT DO NOTHING`,
        [bay.name, bay.description, bay.is_active]
      );
    }
    console.log('✓ Bays created\n');

    // Seed Resources
    console.log('Creating resources...');
    const resources = [
      { name: 'Conference Room A', type: 'conference_room', description: 'Main conference room with AV setup', capacity: 12 },
      { name: 'Conference Room B', type: 'conference_room', description: 'Small meeting room', capacity: 6 },
      { name: 'Wellness Studio', type: 'wellness_room', description: 'Multi-purpose wellness and yoga studio', capacity: 15 },
      { name: 'Meditation Room', type: 'wellness_room', description: 'Quiet space for meditation and relaxation', capacity: 8 },
    ];

    for (const resource of resources) {
      await pool.query(
        `INSERT INTO resources (name, type, description, capacity) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT DO NOTHING`,
        [resource.name, resource.type, resource.description, resource.capacity]
      );
    }
    console.log('✓ Resources created\n');

    // Seed Cafe Menu Items
    console.log('Creating cafe menu...');
    const cafeItems = [
      // Coffee
      { category: 'Coffee', name: 'Espresso', price: 4, description: 'Double shot of espresso', icon: 'coffee', sort_order: 1 },
      { category: 'Coffee', name: 'Americano', price: 5, description: 'Espresso with hot water', icon: 'coffee', sort_order: 2 },
      { category: 'Coffee', name: 'Latte', price: 6, description: 'Espresso with steamed milk', icon: 'coffee', sort_order: 3 },
      { category: 'Coffee', name: 'Cappuccino', price: 6, description: 'Espresso with foamed milk', icon: 'coffee', sort_order: 4 },
      { category: 'Coffee', name: 'Cold Brew', price: 6, description: '24-hour steeped cold brew', icon: 'coffee', sort_order: 5 },
      // Tea
      { category: 'Tea', name: 'Matcha Latte', price: 7, description: 'Ceremonial grade matcha with oat milk', icon: 'emoji_food_beverage', sort_order: 1 },
      { category: 'Tea', name: 'English Breakfast', price: 4, description: 'Classic black tea', icon: 'emoji_food_beverage', sort_order: 2 },
      { category: 'Tea', name: 'Green Tea', price: 4, description: 'Japanese green tea', icon: 'emoji_food_beverage', sort_order: 3 },
      // Food
      { category: 'Food', name: 'Avocado Toast', price: 14, description: 'Sourdough, avocado, everything seasoning, micro greens', icon: 'bakery_dining', sort_order: 1 },
      { category: 'Food', name: 'Acai Bowl', price: 16, description: 'Acai blend with granola, fresh berries, coconut', icon: 'lunch_dining', sort_order: 2 },
      { category: 'Food', name: 'Turkey Club', price: 18, description: 'Roasted turkey, bacon, lettuce, tomato, aioli', icon: 'lunch_dining', sort_order: 3 },
      { category: 'Food', name: 'House Salad', price: 14, description: 'Mixed greens, seasonal vegetables, house vinaigrette', icon: 'local_florist', sort_order: 4 },
      // Beverages
      { category: 'Beverages', name: 'Fresh Juice', price: 10, description: 'Daily selection of fresh-pressed juices', icon: 'local_bar', sort_order: 1 },
      { category: 'Beverages', name: 'Smoothie', price: 12, description: 'Protein smoothie with choice of base', icon: 'local_bar', sort_order: 2 },
      { category: 'Beverages', name: 'Sparkling Water', price: 5, description: 'San Pellegrino', icon: 'water_drop', sort_order: 3 },
      // Alcohol
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
    console.log('✓ Cafe menu created\n');

    // Seed Sample Events (upcoming dates)
    console.log('Creating sample events...');
    const today = new Date();
    const events = [
      {
        title: 'New Member Welcome',
        description: 'Join us to meet fellow members and learn about all Even House has to offer. Light refreshments provided.',
        event_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '18:00:00',
        end_time: '20:00:00',
        location: 'Main Lounge',
        category: 'Social',
        max_attendees: 30,
      },
      {
        title: 'Morning Yoga Flow',
        description: 'Start your day with an energizing yoga session led by our resident instructor. All levels welcome.',
        event_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '07:00:00',
        end_time: '08:00:00',
        location: 'Wellness Studio',
        category: 'Wellness',
        max_attendees: 15,
      },
      {
        title: 'Golf Clinic: Short Game',
        description: 'Improve your chipping and putting with tips from our TrackMan pros. Bring your wedge and putter.',
        event_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '16:00:00',
        end_time: '18:00:00',
        location: 'Simulator Bay 1',
        category: 'Golf',
        max_attendees: 8,
      },
      {
        title: 'Wine Tasting Night',
        description: 'Explore wines from Napa Valley with our sommelier. Paired with artisan cheese and charcuterie.',
        event_date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '19:00:00',
        end_time: '21:00:00',
        location: 'Private Dining Room',
        category: 'Social',
        max_attendees: 20,
      },
    ];

    for (const event of events) {
      await pool.query(
        `INSERT INTO events (title, description, event_date, start_time, end_time, location, category, max_attendees) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT DO NOTHING`,
        [event.title, event.description, event.event_date, event.start_time, event.end_time, event.location, event.category, event.max_attendees]
      );
    }
    console.log('✓ Sample events created\n');

    console.log('✅ Database seeded successfully!');
    console.log('\nSeeded:');
    console.log(`  • ${bays.length} simulator bays`);
    console.log(`  • ${resources.length} bookable resources`);
    console.log(`  • ${cafeItems.length} cafe menu items`);
    console.log(`  • ${events.length} sample events`);

  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
