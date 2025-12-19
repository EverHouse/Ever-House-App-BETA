import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, serial, boolean, text, date, time, integer, numeric } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("member"),
  tier: varchar("tier"),
  tags: jsonb("tags").default(sql`'[]'::jsonb`),
  phone: varchar("phone"),
  mindbodyClientId: varchar("mindbody_client_id"),
  lifetimeVisits: integer("lifetime_visits").default(0),
  linkedEmails: jsonb("linked_emails").default(sql`'[]'::jsonb`),
  dataSource: varchar("data_source"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff users table - emails that get staff access
export const staffUsers = pgTable("staff_users", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  name: varchar("name"),
  passwordHash: varchar("password_hash"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
});

// Admin users table - emails that get admin access
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  name: varchar("name"),
  passwordHash: varchar("password_hash"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
});

// Wellness classes table - for scheduling wellness/fitness classes
export const wellnessClasses = pgTable("wellness_classes", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  time: varchar("time").notNull(),
  instructor: varchar("instructor").notNull(),
  duration: varchar("duration").notNull(),
  category: varchar("category").notNull(),
  spots: varchar("spots").notNull(),
  status: varchar("status"),
  description: text("description"),
  date: date("date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Magic links table - for passwordless authentication
export const magicLinks = pgTable("magic_links", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  token: varchar("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bays table - golf simulator bays
export const bays = pgTable("bays", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Availability blocks table - blocked time slots
export const availabilityBlocks = pgTable("availability_blocks", {
  id: serial("id").primaryKey(),
  bayId: integer("bay_id"),
  blockDate: date("block_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  blockType: varchar("block_type").notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Booking requests table - pending booking requests
export const bookingRequests = pgTable("booking_requests", {
  id: serial("id").primaryKey(),
  userEmail: varchar("user_email").notNull(),
  userName: varchar("user_name"),
  bayId: integer("bay_id"),
  bayPreference: varchar("bay_preference"),
  requestDate: date("request_date").notNull(),
  startTime: time("start_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  endTime: time("end_time").notNull(),
  notes: text("notes"),
  status: varchar("status").default("pending"),
  staffNotes: text("staff_notes"),
  suggestedTime: time("suggested_time"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  calendarEventId: varchar("calendar_event_id"),
});

// Resources table - bookable resources
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  description: text("description"),
  capacity: integer("capacity").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings table - confirmed bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id"),
  userEmail: varchar("user_email").notNull(),
  bookingDate: date("booking_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: varchar("status").default("confirmed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cafe items table - menu items
export const cafeItems = pgTable("cafe_items", {
  id: serial("id").primaryKey(),
  category: varchar("category").notNull(),
  name: varchar("name").notNull(),
  price: numeric("price").notNull().default("0"),
  description: text("description"),
  icon: varchar("icon"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Events table - club events
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  eventDate: date("event_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  location: varchar("location"),
  category: varchar("category"),
  imageUrl: text("image_url"),
  maxAttendees: integer("max_attendees"),
  createdAt: timestamp("created_at").defaultNow(),
  eventbriteId: varchar("eventbrite_id"),
  eventbriteUrl: text("eventbrite_url"),
  source: varchar("source").default("manual"),
  visibility: varchar("visibility").default("public"),
  googleCalendarId: varchar("google_calendar_id"),
  requiresRsvp: boolean("requires_rsvp").default(false),
});

// Event RSVPs table - event registrations
export const eventRsvps = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id"),
  userEmail: varchar("user_email").notNull(),
  status: varchar("status").default("confirmed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Guest passes table - member guest pass tracking
export const guestPasses = pgTable("guest_passes", {
  id: serial("id").primaryKey(),
  memberEmail: varchar("member_email").notNull(),
  passesUsed: integer("passes_used").notNull().default(0),
  passesTotal: integer("passes_total").notNull().default(4),
  lastResetDate: date("last_reset_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table - in-app notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userEmail: varchar("user_email").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").default("info"),
  relatedId: integer("related_id"),
  relatedType: varchar("related_type"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Push subscriptions table - web push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userEmail: varchar("user_email").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Announcements table - club announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  priority: varchar("priority").default("normal"),
  isActive: boolean("is_active").default(true),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
});

// Gallery images table - venue photos
export const galleryImages = pgTable("gallery_images", {
  id: serial("id").primaryKey(),
  title: varchar("title"),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  category: varchar("category"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Member referrals table - referral tracking
export const memberReferrals = pgTable("member_referrals", {
  id: serial("id").primaryKey(),
  referrerEmail: varchar("referrer_email").notNull(),
  referredEmail: varchar("referred_email").notNull(),
  status: varchar("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Booking partners table - external booking integrations
export const bookingPartners = pgTable("booking_partners", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  apiKey: varchar("api_key"),
  webhookUrl: text("webhook_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Facility closures table - scheduled closures
export const facilityClosures = pgTable("facility_closures", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  reason: text("reason"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  affectedAreas: varchar("affected_areas"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
});

// Membership tier conflicts table - tracks tier discrepancies between app and external sources
export const membershipTierConflicts = pgTable("membership_tier_conflicts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  email: varchar("email").notNull(),
  mindbodyId: varchar("mindbody_id"),
  currentTier: varchar("current_tier"),
  incomingTier: varchar("incoming_tier").notNull(),
  source: varchar("source").notNull(),
  status: varchar("status").default("open"),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type StaffUser = typeof staffUsers.$inferSelect;
export type InsertStaffUser = typeof staffUsers.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type WellnessClass = typeof wellnessClasses.$inferSelect;
export type InsertWellnessClass = typeof wellnessClasses.$inferInsert;
