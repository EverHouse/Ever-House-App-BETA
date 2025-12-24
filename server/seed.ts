import pg from 'pg';
import fs from 'fs';
import path from 'path';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

function parseJoinedOnDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date();
}

function mapMembershipTier(csvTier: string): string {
  const tierLower = csvTier.toLowerCase();
  if (tierLower.includes('vip')) return 'VIP';
  if (tierLower.includes('premium')) return 'Premium';
  if (tierLower.includes('corporate')) return 'Corporate';
  if (tierLower.includes('core')) return 'Core';
  if (tierLower.includes('social')) return 'Social';
  return 'Core';
}

function parseLinkedEmails(trackmanEmails: string): string[] {
  if (!trackmanEmails) return [];
  return trackmanEmails.split(',').map(e => e.trim()).filter(e => e.length > 0);
}

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // Seed Simulator Bays (4 bays)
    console.log('Creating simulator bays...');
    const bays = [
      { name: 'Bay 1', description: 'TrackMan simulator with premium setup', is_active: true },
      { name: 'Bay 2', description: 'TrackMan simulator with lounge seating', is_active: true },
      { name: 'Bay 3', description: 'TrackMan simulator with full bar access', is_active: true },
      { name: 'Bay 4', description: 'TrackMan simulator - private room', is_active: true },
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

    // Seed Resources (4 simulator bays + 1 conference room)
    console.log('Creating resources...');
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
    console.log('✓ Resources created\n');

    // Seed Admin Users
    console.log('Creating admin users...');
    const admins = [
      { email: 'adam@evenhouse.club', first_name: 'Adam', last_name: 'Even House', role: 'admin' },
      { email: 'nick@evenhouse.club', first_name: 'Nick', last_name: 'Luu', role: 'admin' },
    ];

    for (const admin of admins) {
      await pool.query(
        `INSERT INTO users (email, first_name, last_name, role) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (email) DO UPDATE SET role = $4`,
        [admin.email, admin.first_name, admin.last_name, admin.role]
      );
    }
    console.log('✓ Admin users created\n');

    // Seed Members from CSV
    console.log('Importing members from CSV...');
    const csvPath = path.join(process.cwd(), 'even_house_cleaned_member_data.csv');
    
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const members = parseCSV(csvContent);
      let imported = 0;
      let skipped = 0;

      for (const member of members) {
        const email = member.real_email?.trim();
        if (!email) {
          skipped++;
          continue;
        }

        const createdAt = parseJoinedOnDate(member.joined_on);
        const tier = mapMembershipTier(member.membership_tier);
        const lifetimeVisits = parseInt(member.total_bookings, 10) || 0;
        const linkedEmails = parseLinkedEmails(member.trackman_emails_linked);

        try {
          await pool.query(
            `INSERT INTO users (
              email, first_name, last_name, phone, tier, role,
              mindbody_client_id, lifetime_visits, linked_emails,
              membership_tier, joined_on, total_bookings, mindbody_id,
              created_at, data_source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (email) DO UPDATE SET
              first_name = COALESCE(EXCLUDED.first_name, users.first_name),
              last_name = COALESCE(EXCLUDED.last_name, users.last_name),
              phone = COALESCE(EXCLUDED.phone, users.phone),
              tier = COALESCE(EXCLUDED.tier, users.tier),
              mindbody_client_id = COALESCE(EXCLUDED.mindbody_client_id, users.mindbody_client_id),
              lifetime_visits = COALESCE(EXCLUDED.lifetime_visits, users.lifetime_visits),
              linked_emails = COALESCE(EXCLUDED.linked_emails, users.linked_emails),
              membership_tier = COALESCE(EXCLUDED.membership_tier, users.membership_tier),
              joined_on = COALESCE(EXCLUDED.joined_on, users.joined_on),
              total_bookings = COALESCE(EXCLUDED.total_bookings, users.total_bookings),
              mindbody_id = COALESCE(EXCLUDED.mindbody_id, users.mindbody_id),
              data_source = 'csv_import'`,
            [
              email,
              member.first_name?.trim() || null,
              member.last_name?.trim() || null,
              member.phone?.trim() || null,
              tier,
              'member',
              member.mindbody_id?.trim() || null,
              lifetimeVisits,
              JSON.stringify(linkedEmails),
              member.membership_tier?.trim() || null,
              createdAt,
              lifetimeVisits,
              parseInt(member.mindbody_id, 10) || null,
              createdAt,
              'csv_import'
            ]
          );
          imported++;
        } catch (err) {
          console.error(`  Failed to import ${email}:`, err);
          skipped++;
        }
      }
      console.log(`✓ Members imported: ${imported} imported, ${skipped} skipped\n`);
    } else {
      console.log('⚠ Member CSV file not found, skipping member import\n');
    }

    // Seed Cafe Menu Items - Real Even House Menu
    console.log('Creating cafe menu...');
    const cafeItems = [
      { category: 'Breakfast', name: 'Egg Toast', price: 14, description: 'Schaner Farm scrambled eggs, whipped ricotta, chives, micro greens, toasted country batard', icon: 'egg_alt', sort_order: 1 },
      { category: 'Breakfast', name: 'Avocado Toast', price: 16, description: 'Hass smashed avocado, radish, lemon, micro greens, dill, toasted country batard', icon: 'eco', sort_order: 2 },
      { category: 'Breakfast', name: 'Banana & Honey Toast', price: 14, description: 'Banana, whipped ricotta, Hapa Honey Farm local honey, toasted country batard', icon: 'bakery_dining', sort_order: 3 },
      { category: 'Breakfast', name: 'Smoked Salmon Toast', price: 20, description: 'Alaskan king smoked salmon, whipped cream cheese, dill, capers, lemon, micro greens, toasted country batard', icon: 'set_meal', sort_order: 4 },
      { category: 'Breakfast', name: 'Breakfast Croissant', price: 16, description: 'Schaner Farm eggs, New School american cheese, freshly baked croissant, choice of cured ham or applewood smoked bacon', icon: 'bakery_dining', sort_order: 5 },
      { category: 'Breakfast', name: 'French Omelette', price: 14, description: 'Schaner Farm eggs, cultured butter, fresh herbs, served with side of seasonal salad greens', icon: 'egg', sort_order: 6 },
      { category: 'Breakfast', name: 'Hanger Steak & Eggs', price: 24, description: 'Autonomy Farms Hanger steak, Schaner Farm eggs, cooked your way', icon: 'restaurant', sort_order: 7 },
      { category: 'Breakfast', name: 'Bacon & Eggs', price: 14, description: 'Applewood smoked bacon, Schaner Farm eggs, cooked your way', icon: 'egg_alt', sort_order: 8 },
      { category: 'Breakfast', name: 'Yogurt Parfait', price: 14, description: 'Yogurt, seasonal fruits, farmstead granola, Hapa Honey farm local honey', icon: 'icecream', sort_order: 9 },
      { category: 'Sides', name: 'Bacon, Two Slices', price: 6, description: 'Applewood smoked bacon', icon: 'restaurant', sort_order: 1 },
      { category: 'Sides', name: 'Eggs, Scrambled', price: 8, description: 'Schaner Farm scrambled eggs', icon: 'egg', sort_order: 2 },
      { category: 'Sides', name: 'Seasonal Fruit Bowl', price: 10, description: 'Fresh seasonal fruits', icon: 'nutrition', sort_order: 3 },
      { category: 'Sides', name: 'Smoked Salmon', price: 9, description: 'Alaskan king smoked salmon', icon: 'set_meal', sort_order: 4 },
      { category: 'Sides', name: 'Toast, Two Slices', price: 3, description: 'Toasted country batard', icon: 'bakery_dining', sort_order: 5 },
      { category: 'Sides', name: 'Sqirl Seasonal Jam', price: 3, description: 'Artisan seasonal jam', icon: 'local_florist', sort_order: 6 },
      { category: 'Sides', name: 'Pistachio Spread', price: 4, description: 'House-made pistachio spread', icon: 'spa', sort_order: 7 },
      { category: 'Lunch', name: 'Caesar Salad', price: 15, description: 'Romaine lettuce, homemade dressing, grated Reggiano. Add: roasted chicken $8, hanger steak 8oz $14', icon: 'local_florist', sort_order: 1 },
      { category: 'Lunch', name: 'Wedge Salad', price: 16, description: 'Iceberg lettuce, bacon, red onion, cherry tomatoes, Point Reyes bleu cheese, homemade dressing', icon: 'local_florist', sort_order: 2 },
      { category: 'Lunch', name: 'Chicken Salad Sandwich', price: 14, description: 'Autonomy Farms chicken, celery, toasted pan loaf, served with olive oil potato chips', icon: 'lunch_dining', sort_order: 3 },
      { category: 'Lunch', name: 'Tuna Salad Sandwich', price: 14, description: 'Wild, pole-caught albacore tuna, sprouts, club chimichurri, toasted pan loaf, served with olive oil potato chips', icon: 'set_meal', sort_order: 4 },
      { category: 'Lunch', name: 'Grilled Cheese', price: 12, description: 'New School american cheese, brioche pan loaf, served with olive oil potato chips. Add: short rib $6, roasted tomato soup cup $7', icon: 'lunch_dining', sort_order: 5 },
      { category: 'Lunch', name: 'Heirloom BLT', price: 18, description: 'Applewood smoked bacon, butter lettuce, heirloom tomatoes, olive oil mayo, toasted pan loaf, served with olive oil potato chips', icon: 'lunch_dining', sort_order: 6 },
      { category: 'Lunch', name: 'Bratwurst', price: 12, description: 'German bratwurst, sautéed onions & peppers, toasted brioche bun', icon: 'lunch_dining', sort_order: 7 },
      { category: 'Lunch', name: 'Bison Serrano Chili', price: 14, description: 'Pasture raised bison, serrano, anaheim, green bell peppers, mint, cilantro, cheddar cheese, sour cream, green onion, served with organic corn chips', icon: 'soup_kitchen', sort_order: 8 },
      { category: 'Kids', name: 'Kids Grilled Cheese', price: 6, description: 'Classic grilled cheese for little ones', icon: 'child_care', sort_order: 1 },
      { category: 'Kids', name: 'Kids Hot Dog', price: 8, description: 'All-beef hot dog', icon: 'child_care', sort_order: 2 },
      { category: 'Dessert', name: 'Vanilla Bean Gelato Sandwich', price: 6, description: 'Vanilla bean gelato with chocolate chip cookies', icon: 'icecream', sort_order: 1 },
      { category: 'Dessert', name: 'Sea Salt Caramel Gelato Sandwich', price: 6, description: 'Sea salt caramel gelato with snickerdoodle cookies', icon: 'icecream', sort_order: 2 },
      { category: 'Dessert', name: 'Seasonal Pie, Slice', price: 6, description: 'Daily seasonal pie with house made crème', icon: 'cake', sort_order: 3 },
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

    // Get member count
    const memberCount = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'member'`);
    const totalMembers = parseInt(memberCount.rows[0].count, 10);

    console.log('✅ Database seeded successfully!');
    console.log('\nSeeded:');
    console.log(`  • ${bays.length} simulator bays`);
    console.log(`  • ${resources.length} bookable resources (4 simulators + 1 conference room)`);
    console.log(`  • ${admins.length} admin users`);
    console.log(`  • ${totalMembers} members from CSV`);
    console.log(`  • ${cafeItems.length} cafe menu items`);
    console.log('\nNote: Events and wellness classes sync from Google Calendar.');

  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
