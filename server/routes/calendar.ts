import { Router } from 'express';
import { isProduction } from '../core/db';
import { getGoogleCalendarClient } from '../core/integrations';
import { CALENDAR_CONFIG, getCalendarAvailability, discoverCalendarIds, getCalendarStatus } from '../core/calendar';
import { isStaffOrAdmin } from '../core/middleware';

const router = Router();

// Admin endpoint to check calendar status
router.get('/api/admin/calendars', isStaffOrAdmin, async (req, res) => {
  try {
    const status = await getCalendarStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_configured: status.configured.length,
        connected: status.configured.filter(c => c.status === 'connected').length,
        not_found: status.configured.filter(c => c.status === 'not_found').length,
        total_discovered: status.discovered.length
      },
      configured_calendars: status.configured,
      all_discovered_calendars: status.discovered,
      usage_mapping: {
        'Booked Golf': 'Bay bookings (Golf Simulators)',
        'MBO_Conference_Room': 'Conference Room bookings',
        'Events': 'Events sync',
        'Wellness & Classes': 'Wellness classes sync',
        'Tours Scheduled': 'Tours sync',
        'Internal Calendar': 'Closures (internal tracking)'
      }
    });
  } catch (error: any) {
    console.error('Calendar status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check calendar status',
      details: error.message 
    });
  }
});

router.get('/api/calendar-availability/golf', async (req, res) => {
  try {
    const { date, duration } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'date is required (YYYY-MM-DD format)' });
    }
    
    const durationMinutes = duration ? parseInt(duration as string) : undefined;
    const result = await getCalendarAvailability('golf', date as string, durationMinutes);
    
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }
    
    res.json({
      date,
      calendarName: CALENDAR_CONFIG.golf.name,
      businessHours: CALENDAR_CONFIG.golf.businessHours,
      slots: result.slots,
      availableSlots: result.slots.filter(s => s.available)
    });
  } catch (error: any) {
    if (!isProduction) console.error('Golf calendar availability error:', error);
    res.status(500).json({ error: 'Failed to fetch golf availability' });
  }
});

router.get('/api/calendar-availability/conference', async (req, res) => {
  try {
    const { date, duration } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'date is required (YYYY-MM-DD format)' });
    }
    
    const durationMinutes = duration ? parseInt(duration as string) : undefined;
    const result = await getCalendarAvailability('conference', date as string, durationMinutes);
    
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }
    
    res.json({
      date,
      calendarName: CALENDAR_CONFIG.conference.name,
      businessHours: CALENDAR_CONFIG.conference.businessHours,
      slots: result.slots,
      availableSlots: result.slots.filter(s => s.available)
    });
  } catch (error: any) {
    if (!isProduction) console.error('Conference calendar availability error:', error);
    res.status(500).json({ error: 'Failed to fetch conference room availability' });
  }
});

router.get('/api/calendars', async (req, res) => {
  try {
    const status = await getCalendarStatus();
    res.json({
      calendars: status.discovered,
      configured: {
        golf: CALENDAR_CONFIG.golf.name,
        conference: CALENDAR_CONFIG.conference.name,
        events: CALENDAR_CONFIG.events.name,
        wellness: CALENDAR_CONFIG.wellness.name
      }
    });
  } catch (error: any) {
    if (!isProduction) console.error('Calendar list error:', error);
    res.status(500).json({ error: 'Failed to list calendars' });
  }
});

router.get('/api/calendar/availability', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    
    const calendar = await getGoogleCalendarClient();
    
    const startTime = new Date(start_date as string);
    startTime.setHours(0, 0, 0, 0);
    
    const endTime = new Date(end_date as string);
    endTime.setHours(23, 59, 59, 999);
    
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: 'primary' }],
      },
    });
    
    const busySlots = response.data.calendars?.primary?.busy || [];
    
    res.json({
      busy: busySlots.map((slot: any) => ({
        start: slot.start,
        end: slot.end,
      })),
    });
  } catch (error: any) {
    if (!isProduction) console.error('Calendar availability error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar availability', details: error.message });
  }
});

export default router;
