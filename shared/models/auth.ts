import { sql } from "drizzle-orm";
import { index, uniqueIndex, jsonb, pgTable, timestamp, varchar, serial, boolean, text, date, time, integer, numeric } from "drizzle-orm/pg-core";

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
  role: varchar("role").default("member"),
  tier: varchar("tier"),
  tierId: integer("tier_id"),
  tags: jsonb("tags").default(sql`'[]'::jsonb`),
  phone: varchar("phone"),
  mindbodyClientId: varchar("mindbody_client_id"),
  membershipStartDate: date("membership_start_date"),
  lifetimeVisits: integer("lifetime_visits").default(0),
  linkedEmails: jsonb("linked_emails").default(sql`'[]'::jsonb`),
  trackmanLinkedEmails: jsonb("trackman_linked_emails").default(sql`'[]'::jsonb`),
  dataSource: varchar("data_source"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff users table - emails that get staff access
export const staffUsers = pgTable("staff_users", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  name: varchar("name"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  jobTitle: varchar("job_title"),
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
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  jobTitle: varchar("job_title"),
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
  googleCalendarId: varchar("google_calendar_id"),
  imageUrl: text("image_url"),
  externalUrl: text("external_url"),
  locallyEdited: boolean("locally_edited").default(false),
  googleEventEtag: varchar("google_event_etag"),
  googleEventUpdatedAt: timestamp("google_event_updated_at"),
  appLastModifiedAt: timestamp("app_last_modified_at"),
  lastSyncedAt: timestamp("last_synced_at"),
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
  closureId: integer("closure_id"),
}, (table) => [
  uniqueIndex("availability_blocks_closure_unique_idx").on(
    table.bayId, table.blockDate, table.startTime, table.endTime, table.closureId
  )
]);

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
  rescheduleBookingId: integer("reschedule_booking_id"),
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
  bookingSource: varchar("booking_source"),
  guestCount: integer("guest_count").default(0),
  createdByStaffId: varchar("created_by_staff_id"),
  calendarEventId: varchar("calendar_event_id"),
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
  externalUrl: text("external_url"),
  source: varchar("source").default("manual"),
  visibility: varchar("visibility").default("public"),
  googleCalendarId: varchar("google_calendar_id"),
  requiresRsvp: boolean("requires_rsvp").default(false),
  locallyEdited: boolean("locally_edited").default(false),
  googleEventEtag: varchar("google_event_etag"),
  googleEventUpdatedAt: timestamp("google_event_updated_at"),
  appLastModifiedAt: timestamp("app_last_modified_at"),
  lastSyncedAt: timestamp("last_synced_at"),
});

// Event RSVPs table - event registrations
export const eventRsvps = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id, { onDelete: 'cascade' }),
  userEmail: varchar("user_email").notNull(),
  status: varchar("status").default("confirmed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wellness enrollments table - class registrations
export const wellnessEnrollments = pgTable("wellness_enrollments", {
  id: serial("id").primaryKey(),
  classId: integer("class_id"),
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
  closureId: integer("closure_id"),
  linkType: varchar("link_type"),
  linkTarget: varchar("link_target"),
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

// FAQs table - frequently asked questions
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form submissions table - contact/tour/event inquiries
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formType: varchar("form_type").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  message: text("message"),
  metadata: jsonb("metadata"),
  status: varchar("status").default("new"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  startTime: time("start_time"),
  endDate: date("end_date").notNull(),
  endTime: time("end_time"),
  affectedAreas: varchar("affected_areas"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
  googleCalendarId: varchar("google_calendar_id"),
  conferenceCalendarId: varchar("conference_calendar_id"),
  internalCalendarId: varchar("internal_calendar_id"),
});

// Membership tiers table - centralized tier configuration for marketing and logic
export const membershipTiers = pgTable("membership_tiers", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  slug: varchar("slug").notNull().unique(),
  
  // Display fields
  priceString: varchar("price_string").notNull(),
  description: text("description"),
  buttonText: varchar("button_text").default("Apply Now"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  isPopular: boolean("is_popular").default(false),
  showInComparison: boolean("show_in_comparison").default(true),
  
  // Marketing fields (JSON)
  highlightedFeatures: jsonb("highlighted_features").default(sql`'[]'::jsonb`),
  allFeatures: jsonb("all_features").default(sql`'{}'::jsonb`),
  
  // Logic/Enforcement fields
  dailySimMinutes: integer("daily_sim_minutes").default(0),
  guestPassesPerMonth: integer("guest_passes_per_month").default(0),
  bookingWindowDays: integer("booking_window_days").default(7),
  dailyConfRoomMinutes: integer("daily_conf_room_minutes").default(0),
  
  // Boolean permissions
  canBookSimulators: boolean("can_book_simulators").default(false),
  canBookConference: boolean("can_book_conference").default(false),
  canBookWellness: boolean("can_book_wellness").default(true),
  hasGroupLessons: boolean("has_group_lessons").default(false),
  hasExtendedSessions: boolean("has_extended_sessions").default(false),
  hasPrivateLesson: boolean("has_private_lesson").default(false),
  hasSimulatorGuestPasses: boolean("has_simulator_guest_passes").default(false),
  hasDiscountedMerch: boolean("has_discounted_merch").default(false),
  unlimitedAccess: boolean("unlimited_access").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
export type WellnessEnrollment = typeof wellnessEnrollments.$inferSelect;
export type InsertWellnessEnrollment = typeof wellnessEnrollments.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;
export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = typeof faqs.$inferInsert;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = typeof formSubmissions.$inferInsert;
export type MembershipTier = typeof membershipTiers.$inferSelect;
export type InsertMembershipTier = typeof membershipTiers.$inferInsert;

// System settings table - for storing app configuration like last reminder date
export const systemSettings = pgTable("system_settings", {
  key: varchar("key").primaryKey(),
  value: varchar("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;

// Training sections table - for staff training guide content
export const trainingSections = pgTable("training_sections", {
  id: serial("id").primaryKey(),
  guideId: varchar("guide_id").unique(),
  icon: varchar("icon").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  steps: jsonb("steps").notNull().default(sql`'[]'::jsonb`),
  isAdminOnly: boolean("is_admin_only").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TrainingSection = typeof trainingSections.$inferSelect;
export type InsertTrainingSection = typeof trainingSections.$inferInsert;

// Tours table - scheduled tours synced from Google Calendar
export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  googleCalendarId: varchar("google_calendar_id").unique(),
  title: varchar("title").notNull(),
  guestName: varchar("guest_name"),
  guestEmail: varchar("guest_email"),
  guestPhone: varchar("guest_phone"),
  tourDate: date("tour_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  notes: text("notes"),
  status: varchar("status").default("scheduled"),
  checkedInAt: timestamp("checked_in_at"),
  checkedInBy: varchar("checked_in_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Tour = typeof tours.$inferSelect;
export type InsertTour = typeof tours.$inferInsert;

// Bug reports table - user-submitted bug reports
export const bugReports = pgTable("bug_reports", {
  id: serial("id").primaryKey(),
  userEmail: varchar("user_email").notNull(),
  userName: varchar("user_name"),
  userRole: varchar("user_role"),
  description: text("description").notNull(),
  screenshotUrl: text("screenshot_url"),
  pageUrl: varchar("page_url"),
  userAgent: text("user_agent"),
  status: varchar("status").default("open"),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  staffNotes: text("staff_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BugReport = typeof bugReports.$inferSelect;
export type InsertBugReport = typeof bugReports.$inferInsert;

// Trackman unmatched bookings - historical bookings that couldn't be matched to members
export const trackmanUnmatchedBookings = pgTable("trackman_unmatched_bookings", {
  id: serial("id").primaryKey(),
  trackmanBookingId: varchar("trackman_booking_id").notNull(),
  userName: varchar("user_name"),
  originalEmail: varchar("original_email"),
  bookingDate: date("booking_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  durationMinutes: integer("duration_minutes"),
  status: varchar("status"),
  bayNumber: varchar("bay_number"),
  playerCount: integer("player_count"),
  notes: text("notes"),
  matchAttemptReason: text("match_attempt_reason"),
  resolvedEmail: varchar("resolved_email"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type TrackmanUnmatchedBooking = typeof trackmanUnmatchedBookings.$inferSelect;
export type InsertTrackmanUnmatchedBooking = typeof trackmanUnmatchedBookings.$inferInsert;

// Trackman import runs - track import history
export const trackmanImportRuns = pgTable("trackman_import_runs", {
  id: serial("id").primaryKey(),
  filename: varchar("filename").notNull(),
  totalRows: integer("total_rows").notNull(),
  matchedRows: integer("matched_rows").notNull(),
  unmatchedRows: integer("unmatched_rows").notNull(),
  skippedRows: integer("skipped_rows").notNull(),
  importedBy: varchar("imported_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type TrackmanImportRun = typeof trackmanImportRuns.$inferSelect;
