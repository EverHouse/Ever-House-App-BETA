import { Router } from 'express';
import { db } from '../db';
import { trainingSections } from '../../shared/schema';
import { eq, asc, and } from 'drizzle-orm';
import { isStaffOrAdmin, isAdmin } from '../core/middleware';

const router = Router();

interface TrainingStep {
  title: string;
  content: string;
  imageUrl?: string;
  pageIcon?: string;
}

// Seed data for training sections - guideId is a stable identifier for upsert logic
export const TRAINING_SEED_DATA = [
  {
    guideId: 'getting-started',
    icon: 'home',
    title: 'Getting Started',
    description: 'Learn how to navigate the Staff Portal',
    sortOrder: 1,
    isAdminOnly: false,
    steps: [
      { title: 'Access the Staff Portal', content: 'Log in with your staff credentials. After logging in, you will be automatically directed to the Staff Portal dashboard.', pageIcon: 'admin_panel_settings' },
      { title: 'Dashboard Overview', content: 'The Home dashboard shows quick access cards organized into sections: Employee Resources, Operations, Public Content, and Admin Settings (admin only).', pageIcon: 'home' },
      { title: 'Bottom Navigation', content: 'Use the bottom navigation bar to quickly access: Home, Bookings, Tours, Calendar, and Inquiries.' },
      { title: 'Header Navigation', content: 'The campaign icon in the header takes you to the Updates page where you can view your activity notifications and manage member announcements.' },
      { title: 'Profile Access', content: 'Tap your avatar in the top right to access your profile, where you can manage push notifications and set up a password for faster login.', pageIcon: 'person' },
    ]
  },
  {
    guideId: 'booking-requests',
    icon: 'event_note',
    title: 'Managing Booking Requests',
    description: 'Approve, decline, or manage simulator and conference room bookings',
    sortOrder: 2,
    isAdminOnly: false,
    steps: [
      { title: 'Access Bookings', content: 'Go to the Bookings tab from the bottom nav or dashboard. You will see pending requests that need action.', pageIcon: 'event_note' },
      { title: 'Review Pending Requests', content: 'Each request card shows the member name, requested date, time, duration, and any notes they included.' },
      { title: 'Assign a Bay', content: 'Before approving a simulator booking, select which bay (1, 2, or 3) to assign. The system will check for conflicts automatically.' },
      { title: 'Check for Conflicts', content: 'Green checkmark means the slot is available. Red warning indicates a conflict with another booking or closure.' },
      { title: 'Approve or Decline', content: 'Click Approve to confirm the booking (this syncs to Google Calendar) or Decline to reject it. You can add staff notes with either action.' },
      { title: 'Calendar View', content: 'Switch to Calendar view to see all approved bookings for a selected date. Closures appear as red "CLOSED" blocks.', pageIcon: 'calendar_month' },
    ]
  },
  {
    guideId: 'tours',
    icon: 'directions_walk',
    title: 'Tours',
    description: 'View and manage scheduled facility tours',
    sortOrder: 3,
    isAdminOnly: false,
    steps: [
      { title: 'Access Tours', content: 'Go to the Tours tab from the bottom nav or dashboard to view scheduled tours.', pageIcon: 'directions_walk' },
      { title: 'Today\'s Tours', content: 'The top section shows tours scheduled for today with guest name, time, and status.' },
      { title: 'Upcoming Tours', content: 'Below today\'s tours, you can see all upcoming scheduled tours.' },
      { title: 'Tour Sources', content: 'Tours come from: the booking widget on the website, or directly synced from the Google Calendar.' },
      { title: 'Tour Notifications', content: 'Staff receive notifications when new tours are scheduled. Daily reminders are sent at 6pm for the next day\'s tours.' },
    ]
  },
  {
    guideId: 'facility-closures',
    icon: 'event_busy',
    title: 'Facility Closures',
    description: 'Schedule closures and availability blocks',
    sortOrder: 4,
    isAdminOnly: false,
    steps: [
      { title: 'Access Closures', content: 'Go to Closures from the dashboard to manage facility closures.', pageIcon: 'event_busy' },
      { title: 'Create a Closure', content: 'Click "Add Closure" and fill in the title, reason, affected areas, and date/time range.' },
      { title: 'Affected Areas', content: 'Choose what the closure affects: Entire Facility, All Simulator Bays, specific bays (1, 2, or 3), or the Conference Room.' },
      { title: 'Full Day vs Partial', content: 'For full-day closures, leave time fields empty. For partial closures (e.g., morning maintenance), specify start and end times.' },
      { title: 'Automatic Announcements', content: 'When you create a closure, an announcement is automatically created and shown to members. This announcement is deleted when the closure is deleted.' },
      { title: 'Calendar Sync', content: 'Closures sync to Google Calendar automatically. Whole facility closures appear in both the Golf and Conference Room calendars.' },
    ]
  },
  {
    guideId: 'events-wellness',
    icon: 'calendar_month',
    title: 'Events & Wellness Calendar',
    description: 'Manage events and wellness classes',
    sortOrder: 5,
    isAdminOnly: false,
    steps: [
      { title: 'Access the Calendar', content: 'Go to the Calendar tab to view and manage events and wellness classes.', pageIcon: 'calendar_month' },
      { title: 'Toggle Events/Wellness', content: 'Use the tabs at the top to switch between Events and Wellness views.' },
      { title: 'Sync with Eventbrite', content: 'Click the Eventbrite sync button to pull in member events from your Eventbrite organization.' },
      { title: 'Sync with Google Calendar', content: 'Click the Google Calendar sync button to sync events and wellness classes with the designated calendars.' },
      { title: 'Create Manual Events', content: 'Use the "Create" button to add a new event or wellness class manually. Fill in title, date, time, location, and description.' },
      { title: 'View RSVPs & Enrollments', content: 'Click on an event or class to see who has RSVP\'d or enrolled.' },
    ]
  },
  {
    guideId: 'updates-announcements',
    icon: 'campaign',
    title: 'Updates & Announcements',
    description: 'Create announcements and view activity',
    sortOrder: 6,
    isAdminOnly: false,
    steps: [
      { title: 'Access Updates', content: 'Click the campaign icon in the header or go to Updates from the dashboard.', pageIcon: 'campaign' },
      { title: 'Activity Tab', content: 'The Activity tab shows your staff notifications - new booking requests, system alerts, and other activity relevant to your role.' },
      { title: 'Mark as Read', content: 'Click "Mark all as read" to clear unread notifications, or tap individual notifications to mark them read.' },
      { title: 'Announcements Tab', content: 'Switch to the Announcements tab to create and manage announcements that members will see.' },
      { title: 'Create an Announcement', content: 'Click "Create" and fill in the title, content, and priority level. High priority announcements appear more prominently.' },
      { title: 'Edit or Delete', content: 'Use the edit and delete buttons on existing announcements to update or remove them.' },
    ]
  },
  {
    guideId: 'member-directory',
    icon: 'groups',
    title: 'Member Directory',
    description: 'Search and view member profiles',
    sortOrder: 7,
    isAdminOnly: false,
    steps: [
      { title: 'Access Directory', content: 'Go to the Directory from the dashboard to search and view member profiles.', pageIcon: 'groups' },
      { title: 'Search Members', content: 'Use the search bar to find members by name, email, phone, or tier. Type "founding" to find founding members.' },
      { title: 'Filter by Tier', content: 'Use the tier filter buttons (All, Social, Core, Premium, Corporate, VIP) to narrow down the list.' },
      { title: 'View Member Details', content: 'Click on a member card to see their full profile, tier, tags, and contact information.' },
      { title: 'View As Member (Admin Only)', content: 'Admins can click "View As" to see the app from a member\'s perspective. A banner will show when viewing as another member.' },
    ]
  },
  {
    guideId: 'inquiries',
    icon: 'mail',
    title: 'Inquiries',
    description: 'Manage form submissions',
    sortOrder: 8,
    isAdminOnly: false,
    steps: [
      { title: 'Access Inquiries', content: 'Go to the Inquiries tab from the bottom nav or dashboard to view form submissions.', pageIcon: 'mail' },
      { title: 'Filter by Type', content: 'Use the filter buttons to view specific form types: Contact, Tour Request, Membership Inquiry, Private Hire, or Guest Check-in.' },
      { title: 'Filter by Status', content: 'Filter by status: New (unread), Read, Replied, or Archived.' },
      { title: 'View Submission Details', content: 'Click on an inquiry to expand and see the full submission details.' },
      { title: 'Add Staff Notes', content: 'Add internal notes to track follow-up actions or important details about the inquiry.' },
      { title: 'Update Status', content: 'Mark inquiries as Read, Replied, or Archived to keep track of which ones need attention.' },
    ]
  },
  {
    guideId: 'cafe-menu',
    icon: 'local_cafe',
    title: 'Cafe Menu',
    description: 'Update menu items and prices',
    sortOrder: 9,
    isAdminOnly: false,
    steps: [
      { title: 'Access Cafe Menu', content: 'Go to Cafe Menu from the dashboard to manage food and drink items.', pageIcon: 'local_cafe' },
      { title: 'Add Menu Items', content: 'Click "Add Item" to create a new menu item. Fill in the name, description, price, and category.' },
      { title: 'Categories', content: 'Organize items into categories like Drinks, Bites, Cocktails, etc. for easy browsing.' },
      { title: 'Upload Images', content: 'Add images to menu items by clicking the image upload button. Images are automatically optimized.' },
      { title: 'Edit or Remove', content: 'Click the edit icon to update an item, or the delete icon to remove it from the menu.' },
    ]
  },
  {
    guideId: 'gallery',
    icon: 'photo_library',
    title: 'Gallery',
    description: 'Manage venue photos',
    sortOrder: 10,
    isAdminOnly: false,
    steps: [
      { title: 'Access Gallery', content: 'Go to Gallery from the dashboard to manage venue photos shown on the public website.', pageIcon: 'photo_library' },
      { title: 'Add Photos', content: 'Click "Add Photo" and upload an image. Images are automatically converted to WebP format and optimized.' },
      { title: 'Set Category', content: 'Assign photos to categories (e.g., Interior, Events, Golf Bays) for organization.' },
      { title: 'Reorder Photos', content: 'Use the sort order field to control the display order of photos within each category.' },
      { title: 'Activate/Deactivate', content: 'Toggle photos active or inactive to show or hide them from the public gallery without deleting.' },
    ]
  },
  {
    guideId: 'faqs',
    icon: 'help_outline',
    title: 'FAQs',
    description: 'Edit frequently asked questions',
    sortOrder: 11,
    isAdminOnly: false,
    steps: [
      { title: 'Access FAQs', content: 'Go to FAQs from the dashboard to manage the questions shown on the public FAQ page.', pageIcon: 'help_outline' },
      { title: 'Add New FAQ', content: 'Click "Add FAQ" to create a new question and answer.' },
      { title: 'Edit Existing', content: 'Click the edit button on any FAQ to update the question or answer text.' },
      { title: 'Reorder', content: 'Adjust the sort order to control which FAQs appear first.' },
      { title: 'Delete', content: 'Remove outdated FAQs by clicking the delete button.' },
    ]
  },
  {
    guideId: 'team-access',
    icon: 'shield_person',
    title: 'Team Access',
    description: 'Manage staff and admin accounts',
    sortOrder: 12,
    isAdminOnly: true,
    steps: [
      { title: 'Access Team Settings', content: 'Go to Team Access from the Admin Settings section of the dashboard. This is admin-only.', pageIcon: 'shield_person' },
      { title: 'Staff vs Admins', content: 'Use the tabs to switch between managing Staff accounts and Admin accounts.' },
      { title: 'Add Team Member', content: 'Click "Add" and enter their email, name, and job title. They will receive a login email.' },
      { title: 'Activate/Deactivate', content: 'Toggle accounts active or inactive to grant or revoke access without deleting the account.' },
      { title: 'Edit Details', content: 'Update team member information like name, phone, or job title as needed.' },
    ]
  },
  {
    guideId: 'membership-tiers',
    icon: 'loyalty',
    title: 'Membership Tiers',
    description: 'Configure tier settings and permissions',
    sortOrder: 13,
    isAdminOnly: true,
    steps: [
      { title: 'Access Tiers', content: 'Go to Manage Tiers from the Admin Settings section. This controls what each membership level can do.', pageIcon: 'loyalty' },
      { title: 'Edit Tier Settings', content: 'Click on a tier to edit its name, description, price, and marketing copy.' },
      { title: 'Booking Limits', content: 'Set daily simulator minutes, conference room minutes, and advance booking window for each tier.' },
      { title: 'Guest Passes', content: 'Configure how many guest passes members receive per month for each tier.' },
      { title: 'Access Permissions', content: 'Toggle which features each tier can access (simulator booking, conference room, events, etc.).' },
      { title: 'Highlighted Features', content: 'Edit the bullet points that appear on the membership comparison page for each tier.' },
    ]
  },
];

// Function to seed training sections with upsert logic (exported for use in startup)
// Updates existing guides by guideId, inserts new ones, preserves custom guides
// Also handles migration of old records without guideIds by matching title
export async function seedTrainingSections() {
  const existing = await db.select().from(trainingSections);
  
  // Build maps for matching: by guideId (preferred) and by title (fallback for migration)
  const existingByGuideId = new Map(
    existing.filter(s => s.guideId).map(s => [s.guideId, s])
  );
  const existingByTitle = new Map(
    existing.filter(s => !s.guideId).map(s => [s.title, s])
  );
  
  let updated = 0;
  let inserted = 0;
  let migrated = 0;
  
  for (const seedData of TRAINING_SEED_DATA) {
    // First try to find by guideId
    let existingSection = existingByGuideId.get(seedData.guideId);
    
    // Fallback: if no guideId match, try matching by title (for migration)
    if (!existingSection) {
      existingSection = existingByTitle.get(seedData.title);
    }
    
    if (existingSection) {
      // Check if we need to add guideId (migration case)
      const needsGuideId = !existingSection.guideId;
      
      // Check if content differs
      const needsContentUpdate = 
        existingSection.icon !== seedData.icon ||
        existingSection.title !== seedData.title ||
        existingSection.description !== seedData.description ||
        existingSection.sortOrder !== seedData.sortOrder ||
        existingSection.isAdminOnly !== seedData.isAdminOnly ||
        JSON.stringify(existingSection.steps) !== JSON.stringify(seedData.steps);
      
      if (needsGuideId || needsContentUpdate) {
        await db.update(trainingSections)
          .set({
            guideId: seedData.guideId,
            icon: seedData.icon,
            title: seedData.title,
            description: seedData.description,
            steps: seedData.steps,
            sortOrder: seedData.sortOrder,
            isAdminOnly: seedData.isAdminOnly,
            updatedAt: new Date(),
          })
          .where(eq(trainingSections.id, existingSection.id));
        if (needsGuideId) migrated++;
        else updated++;
      }
    } else {
      // Insert new section
      await db.insert(trainingSections).values(seedData);
      inserted++;
    }
  }
  
  console.log(`[Training] Seed complete: ${updated} updated, ${inserted} inserted, ${migrated} migrated`);
}

router.get('/api/training-sections', isStaffOrAdmin, async (req, res) => {
  try {
    const userRole = (req as any).user?.role;
    const isAdminUser = userRole === 'admin';
    
    let result;
    if (isAdminUser) {
      result = await db.select().from(trainingSections)
        .orderBy(asc(trainingSections.sortOrder), asc(trainingSections.id));
    } else {
      result = await db.select().from(trainingSections)
        .where(eq(trainingSections.isAdminOnly, false))
        .orderBy(asc(trainingSections.sortOrder), asc(trainingSections.id));
    }
    
    // Auto-seed if empty (handles production where auto-seed doesn't run)
    if (result.length === 0) {
      console.log('[Training] No sections found, auto-seeding...');
      try {
        await seedTrainingSections();
        // Re-fetch after seeding
        if (isAdminUser) {
          result = await db.select().from(trainingSections)
            .orderBy(asc(trainingSections.sortOrder), asc(trainingSections.id));
        } else {
          result = await db.select().from(trainingSections)
            .where(eq(trainingSections.isAdminOnly, false))
            .orderBy(asc(trainingSections.sortOrder), asc(trainingSections.id));
        }
        console.log(`[Training] Auto-seeded ${result.length} sections`);
      } catch (seedError) {
        console.error('[Training] Auto-seed failed:', seedError);
      }
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('Training sections fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch training sections' });
  }
});

router.post('/api/admin/training-sections', isAdmin, async (req, res) => {
  try {
    const { icon, title, description, steps, isAdminOnly, sortOrder } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    const [newSection] = await db.insert(trainingSections).values({
      icon: icon || 'help_outline',
      title,
      description,
      steps: steps || [],
      isAdminOnly: isAdminOnly ?? false,
      sortOrder: sortOrder ?? 0,
    }).returning();
    
    res.status(201).json(newSection);
  } catch (error: any) {
    console.error('Training section creation error:', error);
    res.status(500).json({ error: 'Failed to create training section' });
  }
});

router.put('/api/admin/training-sections/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { icon, title, description, steps, isAdminOnly, sortOrder } = req.body;
    
    const [updated] = await db.update(trainingSections)
      .set({
        ...(icon !== undefined && { icon }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(steps !== undefined && { steps }),
        ...(isAdminOnly !== undefined && { isAdminOnly }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      })
      .where(eq(trainingSections.id, parseInt(id)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Training section not found' });
    }
    
    res.json(updated);
  } catch (error: any) {
    console.error('Training section update error:', error);
    res.status(500).json({ error: 'Failed to update training section' });
  }
});

router.delete('/api/admin/training-sections/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deleted] = await db.delete(trainingSections)
      .where(eq(trainingSections.id, parseInt(id)))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: 'Training section not found' });
    }
    
    res.json({ success: true, deleted });
  } catch (error: any) {
    console.error('Training section deletion error:', error);
    res.status(500).json({ error: 'Failed to delete training section' });
  }
});

// Seed training content (uses shared TRAINING_SEED_DATA constant)
router.post('/api/admin/training-sections/seed', isAdmin, async (req, res) => {
  try {
    await seedTrainingSections();
    
    const insertedSections = await db.select().from(trainingSections)
      .orderBy(asc(trainingSections.sortOrder), asc(trainingSections.id));
    
    res.status(201).json({ 
      success: true, 
      message: `Seeded ${insertedSections.length} training sections`,
      sections: insertedSections 
    });
  } catch (error: any) {
    console.error('Training seed error:', error);
    res.status(500).json({ error: 'Failed to seed training sections' });
  }
});

export default router;
