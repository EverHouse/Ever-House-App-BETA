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
      { name: 'Conference Room', type: 'conference_room', description: 'Main conference room with AV setup', capacity: 12 },
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

    // Seed Cafe Menu Items - Real Even House Menu
    console.log('Creating cafe menu...');
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
