import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { formatDateShort } from '../utils/dateUtils';
import { useUserStore } from '../stores/userStore';
import { getCached, fetchAndCache, startBackgroundSync } from '../lib/backgroundSync';

// --- Types ---

export interface CafeItem {
  id: string;
  category: string;
  name: string;
  price: number;
  desc: string;
  icon: string;
  image: string;
}

export type EventSource = 'internal' | 'eventbrite';

export interface EventData {
  id: string;
  source: EventSource;
  externalLink?: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  image: string;
  description: string;
  attendees: string[];
  capacity?: number;
  ticketsSold?: number;
}

export interface Announcement {
  id: string;
  title: string;
  desc: string;
  type: 'update' | 'announcement';
  date: string;
  createdAt?: string;
  priority?: 'normal' | 'high' | 'urgent';
  startDate?: string;
  endDate?: string;
  linkType?: 'events' | 'wellness' | 'golf' | 'external';
  linkTarget?: string;
}

export interface MemberProfile {
  id: string;
  name: string;
  tier: string;
  tags?: string[];
  isFounding?: boolean;
  status: 'Active' | 'Pending';
  email: string;
  phone: string;
  jobTitle?: string;
  joinDate?: string;
  avatar?: string;
  role?: 'member' | 'staff' | 'admin';
  mindbodyClientId?: string;
  lifetimeVisits?: number;
  lastBookingDate?: string;
}

export interface Booking {
  id: string;
  type: 'golf' | 'event' | 'wellness' | 'dining';
  title: string;
  date: string; // e.g., "Oct 24"
  time: string; // e.g., "10:00 AM"
  details: string; // e.g., "Bay 1 • 60 min"
  color?: 'primary' | 'accent';
}

interface DataContextType {
  user: MemberProfile | null;
  actualUser: MemberProfile | null;
  viewAsUser: MemberProfile | null;
  isViewingAs: boolean;
  cafeMenu: CafeItem[];
  events: EventData[];
  announcements: Announcement[];
  members: MemberProfile[];
  bookings: Booking[];
  isLoading: boolean;
  isDataReady: boolean;
  
  // Auth Actions
  login: (email: string) => Promise<void>;
  loginWithMember: (member: any) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  
  // View As Actions
  setViewAsUser: (member: MemberProfile) => Promise<void>;
  clearViewAsUser: () => void;

  // Data Actions
  addCafeItem: (item: CafeItem) => Promise<void>;
  updateCafeItem: (item: CafeItem) => Promise<void>;
  deleteCafeItem: (id: string) => Promise<void>;
  refreshCafeMenu: () => Promise<void>;
  
  addEvent: (event: EventData) => void;
  updateEvent: (event: EventData) => void;
  deleteEvent: (id: string) => void;
  syncEventbrite: () => Promise<void>;

  addAnnouncement: (ann: Announcement) => Promise<void>;
  updateAnnouncement: (ann: Announcement) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  updateMember: (member: MemberProfile) => void;

  addBooking: (booking: Booking) => void;
  deleteBooking: (id: string) => void;
}

// --- Initial Mock Data ---

const INITIAL_CAFE: CafeItem[] = [
  // COFFEE
  { id: 'esp', category: "Coffee", name: "Espresso", price: 3, desc: "", icon: "coffee", image: "/images/cafe-bar-optimized.webp" },
  { id: 'drp', category: "Coffee", name: "Drip", price: 4, desc: "", icon: "coffee_maker", image: "/images/cafe-bar-optimized.webp" },
  { id: 'ame', category: "Coffee", name: "Americano", price: 4, desc: "", icon: "local_cafe", image: "/images/cafe-bar-optimized.webp" },
  { id: 'cap', category: "Coffee", name: "Cappuccino", price: 4, desc: "", icon: "coffee", image: "/images/cafe-bar-optimized.webp" },
  { id: 'flt', category: "Coffee", name: "Flat White", price: 4, desc: "", icon: "local_cafe", image: "/images/cafe-bar-optimized.webp" },
  { id: 'cor', category: "Coffee", name: "Cortado", price: 4, desc: "", icon: "local_cafe", image: "/images/cafe-bar-optimized.webp" },
  { id: 'flb', category: "Coffee", name: "Flash Brew", price: 5, desc: "Iced | Hot", icon: "ac_unit", image: "/images/cafe-bar-optimized.webp" },
  { id: 'lat', category: "Coffee", name: "Latte", price: 5, desc: "Rotating specialty roasts", icon: "local_cafe", image: "/images/cafe-bar-optimized.webp" },
  { id: 'pov', category: "Coffee", name: "Pour Over", price: 0, desc: "Lightly sweetened cold foam | Iced coffee or matcha", icon: "water_drop", image: "/images/cafe-bar-optimized.webp" },
  { id: 'tea', category: "Coffee", name: "Leaves and Flowers Tea", price: 5, desc: "Ichibana | Tropic Garden | Mountain Beauty", icon: "emoji_food_beverage", image: "/images/cafe-bar-optimized.webp" },
  { id: 'mat', category: "Coffee", name: "Nekohama Matcha", price: 8, desc: "Organic A1 pinnacle ceremonial grade", icon: "tea_bag", image: "/images/cafe-bar-optimized.webp" },
  { id: 'pit', category: "Coffee", name: "Pit Stop", price: 7, desc: "Seasonal cherry pie latte w/ graham cracker dust", icon: "pie_chart", image: "/images/cafe-bar-optimized.webp" },
  { id: 'sea', category: "Coffee", name: "Seasonal Tonic", price: 7, desc: "Pear-ginger | Served with espresso or matcha", icon: "spa", image: "/images/cafe-bar-optimized.webp" },
  { id: 'pec', category: "Coffee", name: "Pecan Prix", price: 8, desc: "Pecan pie matcha latte w/ maple creamtop", icon: "icecream", image: "/images/cafe-bar-optimized.webp" },
  { id: 'nik', category: "Coffee", name: "Niko No. 3", price: 5, desc: "Espresso over grass-fed cinnamon honey butter", icon: "cookie", image: "/images/cafe-bar-optimized.webp" },

  // BREAKFAST
  { id: 'egg_t', category: "Breakfast", name: "Egg Toast", price: 14, desc: "Schaner Farm scrambled eggs, whipped ricotta, chives, micro greens", icon: "bakery_dining", image: "/images/cafe-bar-optimized.webp" },
  { id: 'avo', category: "Breakfast", name: "Avocado Toast", price: 16, desc: "Hass smashed avocado, radish, lemon, micro greens, dill", icon: "nutrition", image: "/images/cafe-bar-optimized.webp" },
  { id: 'ban', category: "Breakfast", name: "Banana & Honey Toast", price: 14, desc: "Banana, whipped ricotta, Hapa Honey Farm local honey", icon: "breakfast_dining", image: "/images/cafe-bar-optimized.webp" },
  { id: 'smk_t', category: "Breakfast", name: "Smoked Salmon Toast", price: 20, desc: "Alaskan king smoked salmon, whipped cream cheese, dill, capers", icon: "set_meal", image: "/images/cafe-bar-optimized.webp" },
  { id: 'cro', category: "Breakfast", name: "Breakfast Croissant", price: 16, desc: "Schaner Farm eggs, New School american cheese", icon: "bakery_dining", image: "/images/cafe-bar-optimized.webp" },
  { id: 'oml', category: "Breakfast", name: "French Omelette", price: 14, desc: "Schaner Farm eggs, cultured butter, fresh herbs", icon: "egg_alt", image: "/images/cafe-bar-optimized.webp" },
  { id: 'stk', category: "Breakfast", name: "Hanger Steak & Eggs", price: 24, desc: "Autonomy Farms Hanger steak, Schaner Farm eggs", icon: "restaurant", image: "/images/cafe-bar-optimized.webp" },
  { id: 'bac', category: "Breakfast", name: "Bacon & Eggs", price: 14, desc: "Applewood smoked bacon, Schaner Farm eggs", icon: "bento", image: "/images/cafe-bar-optimized.webp" },
  { id: 'yog', category: "Breakfast", name: "Yogurt Parfait", price: 14, desc: "Yogurt, seasonal fruits, farmstead granola, Hapa Honey", icon: "icecream", image: "/images/cafe-bar-optimized.webp" },

  // LUNCH
  { id: 'cae', category: "Lunch", name: "Caesar Salad", price: 15, desc: "Romaine lettuce, homemade dressing, grated Reggiano", icon: "dinner_dining", image: "/images/cafe-bar-optimized.webp" },
  { id: 'wed', category: "Lunch", name: "Wedge Salad", price: 16, desc: "Iceberg lettuce, bacon, red onion, cherry tomatoes, bleu cheese", icon: "kebab_dining", image: "/images/cafe-bar-optimized.webp" },
  { id: 'chk', category: "Lunch", name: "Chicken Salad Sandwich", price: 14, desc: "Autonomy Farms chicken, celery, toasted pan loaf", icon: "lunch_dining", image: "/images/cafe-bar-optimized.webp" },
  { id: 'tun', category: "Lunch", name: "Tuna Salad Sandwich", price: 14, desc: "Wild pole-caught albacore tuna, sprouts, chimichurri", icon: "set_meal", image: "/images/cafe-bar-optimized.webp" },
  { id: 'grl', category: "Lunch", name: "Grilled Cheese", price: 12, desc: "New School american cheese, brioche pan loaf", icon: "fastfood", image: "/images/cafe-bar-optimized.webp" },
  { id: 'blt', category: "Lunch", name: "Heirloom BLT", price: 18, desc: "Applewood smoked bacon, butter lettuce, heirloom tomatoes", icon: "lunch_dining", image: "/images/cafe-bar-optimized.webp" },
  { id: 'bra', category: "Lunch", name: "Bratwurst", price: 12, desc: "German bratwurst, sautéed onions & peppers, toasted brioche", icon: "kebab_dining", image: "/images/cafe-bar-optimized.webp" },
  { id: 'bis', category: "Lunch", name: "Bison Serrano Chili", price: 14, desc: "Pasture raised bison, serrano, anaheim, cheddar cheese", icon: "soup_kitchen", image: "/images/cafe-bar-optimized.webp" },

  // SIDES
  { id: 's_bac', category: "Sides", name: "Bacon (2 slices)", price: 6, desc: "", icon: "bento", image: "/images/cafe-bar-optimized.webp" },
  { id: 's_egg', category: "Sides", name: "Eggs, Scrambled", price: 8, desc: "", icon: "egg_alt", image: "/images/cafe-bar-optimized.webp" },
  { id: 's_fru', category: "Sides", name: "Seasonal Fruit Bowl", price: 10, desc: "", icon: "nutrition", image: "/images/cafe-bar-optimized.webp" },
  { id: 's_smk', category: "Sides", name: "Smoked Salmon", price: 9, desc: "", icon: "set_meal", image: "/images/cafe-bar-optimized.webp" },
  { id: 's_tst', category: "Sides", name: "Toast (2 slices)", price: 3, desc: "", icon: "breakfast_dining", image: "/images/cafe-bar-optimized.webp" },
  { id: 's_jam', category: "Sides", name: "Sqirl Seasonal Jam", price: 3, desc: "", icon: "kitchen", image: "" },
  { id: 's_pis', category: "Sides", name: "Pistakio Spread", price: 4, desc: "", icon: "cookie", image: "" },

  // KIDS
  { id: 'k_grl', category: "Kids", name: "Grilled Cheese", price: 6, desc: "", icon: "fastfood", image: "" },
  { id: 'k_dog', category: "Kids", name: "Hot Dog", price: 8, desc: "", icon: "kebab_dining", image: "" },

  // DESSERT
  { id: 'gel', category: "Dessert", name: "Gelato Sandwiches", price: 6, desc: "Vanilla bean w/ choc chip OR Sea salt caramel w/ snickerdoodle", icon: "icecream", image: "/images/cafe-bar-optimized.webp" },
  { id: 'pie', category: "Dessert", name: "Seasonal Pie, Slice", price: 6, desc: "With house made creme", icon: "pie_chart", image: "/images/cafe-bar-optimized.webp" },

  // SHAREABLES
  { id: 'clu', category: "Shareables", name: "Club Charcuterie", price: 32, desc: "", icon: "tapas", image: "/images/cafe-bar-optimized.webp" },
  { id: 'chi', category: "Shareables", name: "Chips & Salsa", price: 10, desc: "", icon: "tapas", image: "/images/cafe-bar-optimized.webp" },
  { id: 'cav', category: "Shareables", name: "Caviar Service", price: 0, desc: "", icon: "blur_circular", image: "/images/cafe-bar-optimized.webp" },
  { id: 'tin', category: "Shareables", name: "Tinned Fish Tray", price: 47, desc: "", icon: "sardine", image: "/images/cafe-bar-optimized.webp" },
];

const INITIAL_EVENTS: EventData[] = [
  {
    id: '1',
    source: 'internal',
    title: 'House Collectives: Chez Doc',
    category: 'Social',
    date: 'Fri, 20 Jan',
    time: '11:00 PM',
    location: 'Barcelona Club',
    image: '/images/events-crowd-optimized.webp',
    description: 'Join us for a special edition of House Collectives.',
    attendees: [],
    capacity: 50,
    ticketsSold: 42
  },
  {
    id: '2',
    source: 'internal',
    title: 'Brunch & Cocktails',
    category: 'Dining',
    date: 'Sat, 21 Jan',
    time: '1:00 PM',
    location: 'Soho House Barcelona',
    image: '/images/cafe-bar-optimized.webp',
    description: 'A curated brunch menu paired with signature botanical cocktails.',
    attendees: [],
    capacity: 30,
    ticketsSold: 12
  },
  {
    id: 'eb-101',
    source: 'eventbrite',
    externalLink: 'https://www.eventbrite.com',
    title: 'Tustin Art Walk (Public)',
    category: 'Social',
    date: 'Sun, 22 Jan',
    time: '10:00 AM',
    location: 'Old Town Tustin',
    image: '/images/venue-wide-optimized.webp',
    description: 'Join the community for a guided walk through local galleries. Tickets handled via Eventbrite.',
    attendees: [],
    capacity: 100,
    ticketsSold: 85
  }
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

const INITIAL_MEMBERS: MemberProfile[] = [
  { 
    id: '8821', 
    name: "Alexander James", 
    tier: "Core", 
    isFounding: true,
    status: "Active", 
    email: "alex@example.com", 
    phone: "+1 (949) 555-0101",
    joinDate: "Jan 2021", 
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCfn5ddkAImjBeYIVGDC9eu6eVBy4VdxiMZcgL75jHdPGbriX1aGdJ5m2yagDgcPzq3dACO0xbgNxwfcG_j7f5rROEXbwGGTeqNRmAWD2vHkgY3JlItOfHUfgl3AcPUTZEqjxIFGt-zeP1Sf2r4YV9pchyafGGtpEaTBzfRHKZqzSudHdTUCdv2cK3fDpxYwcLaBeOvl6JhLuXfwLhz3sbhnDq188os16jhbKV6lfdMELIZ-W0XYNC9sWvU-NllhtC7X7JzcBQYv39_" 
  },
  { 
    id: '8822', 
    name: "Sarah Connor", 
    tier: "Core", 
    isFounding: false,
    status: "Active", 
    email: "sarah@example.com", 
    phone: "+1 (949) 555-0102",
    joinDate: "Mar 2022", 
    avatar: "https://i.pravatar.cc/300?img=5" 
  },
  { 
    id: '8823', 
    name: "James Bond", 
    tier: "Premium", 
    isFounding: false,
    status: "Active", 
    email: "jb@example.com", 
    phone: "+1 (949) 555-0007",
    joinDate: "Dec 2023", 
    avatar: "https://i.pravatar.cc/300?img=8" 
  },
  { 
    id: '8824', 
    name: "Ellen Ripley", 
    tier: "Social", 
    isFounding: false,
    status: "Pending", 
    email: "ellen@example.com", 
    phone: "+1 (949) 555-0104",
    joinDate: "Pending", 
    avatar: "https://i.pravatar.cc/300?img=9" 
  },
  // Staff Accounts
  { 
    id: 'stf-1', 
    name: "Adam Admin", 
    tier: "Management", 
    status: "Active", 
    email: "adam@evenhouse.club", 
    phone: "+1 (949) 555-9999",
    role: 'admin', 
    joinDate: "Jan 2020",
    avatar: "https://i.pravatar.cc/300?img=11"
  },
  { 
    id: 'stf-2', 
    name: "Nick Staff", 
    tier: "Concierge", 
    status: "Active", 
    email: "nick@evenhouse.club", 
    phone: "+1 (949) 555-8888",
    role: 'admin', // Promoted to admin
    joinDate: "Mar 2021",
    avatar: "https://i.pravatar.cc/300?img=12"
  },
];

const INITIAL_BOOKINGS: Booking[] = [
    { id: 'b1', type: 'dining', title: 'Lunch at The Patio', date: 'Tue, Oct 24', time: '12:30 PM', details: '4 Guests', color: 'accent' },
    { id: 'b2', type: 'golf', title: 'Golf Simulator Bay 2', date: 'Wed, Oct 25', time: '09:00 AM', details: '60 min', color: 'primary' }
];

// --- Context Setup ---

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper function to format time string from HH:MM:SS to 12-hour format
const formatTimeString = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const DataProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const storeUser = useUserStore((s) => s.user);
  const setStoreUser = useUserStore((s) => s.setUser);
  const clearStoreUser = useUserStore((s) => s.clearUser);
  const isHydrated = useUserStore((s) => s.isHydrated);
  
  const [actualUser, setActualUser] = useState<MemberProfile | null>(null);
  const [viewAsUser, setViewAsUserState] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cafeMenuLoaded, setCafeMenuLoaded] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [announcementsLoaded, setAnnouncementsLoaded] = useState(false);
  const [cafeMenu, setCafeMenu] = useState<CafeItem[]>([]);
  const [events, setEvents] = useState<EventData[]>(INITIAL_EVENTS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [members, setMembers] = useState<MemberProfile[]>(INITIAL_MEMBERS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  
  const isDataReady = !isLoading && cafeMenuLoaded && eventsLoaded && announcementsLoaded;
  
  const isViewingAs = viewAsUser !== null;
  const user = viewAsUser || actualUser;

  useEffect(() => {
    if (storeUser && !actualUser) {
      setActualUser(storeUser as MemberProfile);
      setIsLoading(false);
    }
  }, [storeUser, actualUser]);

  useEffect(() => {
    const initializeUser = async () => {
      if (storeUser) {
        setActualUser(storeUser as MemberProfile);
        setIsLoading(false);
        return;
      }
      
      const savedMember = localStorage.getItem('eh_member');
      if (savedMember) {
        try {
          const member = JSON.parse(savedMember);
          setActualUser(member);
          setStoreUser(member);
          
          if (!member.tier && member.email) {
            try {
              const res = await fetch('/api/auth/verify-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: member.email })
              });
              
              if (res.ok) {
                const { member: freshMember } = await res.json();
                const updatedProfile: MemberProfile = {
                  id: freshMember.id,
                  name: [freshMember.firstName, freshMember.lastName].filter(Boolean).join(' ') || freshMember.email || 'Member',
                  tier: freshMember.tier || 'Core',
                  tags: freshMember.tags || [],
                  status: 'Active' as const,
                  email: freshMember.email,
                  phone: freshMember.phone || '',
                  jobTitle: freshMember.jobTitle || '',
                  role: freshMember.role || 'member',
                  mindbodyClientId: freshMember.mindbodyClientId || '',
                  lifetimeVisits: freshMember.lifetimeVisits || 0,
                  lastBookingDate: freshMember.lastBookingDate || undefined
                };
                localStorage.setItem('eh_member', JSON.stringify(updatedProfile));
                setActualUser(updatedProfile);
                setStoreUser(updatedProfile);
              }
            } catch (refreshErr) {
              console.error('Failed to refresh user data:', refreshErr);
            }
          }
        } catch (err) {
          localStorage.removeItem('eh_member');
        }
      }
      setIsLoading(false);
    };
    
    initializeUser();
  }, [storeUser, setStoreUser]);
  
  // View As Functions - only for admins (not staff)
  // Uses flushSync to ensure state updates are synchronous before navigation
  const setViewAsUser = async (member: MemberProfile) => {
    if (actualUser?.role === 'admin') {
      try {
        const res = await fetch(`/api/members/${encodeURIComponent(member.email)}/details`, { credentials: 'include' });
        if (res.ok) {
          const details = await res.json();
          const fullMember: MemberProfile = {
            ...member,
            tier: details.tier || member.tier,
            tags: details.tags || member.tags,
            lifetimeVisits: details.lifetimeVisits || 0,
            lastBookingDate: details.lastBookingDate || undefined,
            mindbodyClientId: details.mindbodyClientId || ''
          };
          flushSync(() => {
            setViewAsUserState(fullMember);
          });
        } else {
          flushSync(() => {
            setViewAsUserState(member);
          });
        }
      } catch (err) {
        console.error('Failed to fetch member details:', err);
        flushSync(() => {
          setViewAsUserState(member);
        });
      }
    }
  };
  
  const clearViewAsUser = () => {
    flushSync(() => {
      setViewAsUserState(null);
    });
  };

  // Fetch members from HubSpot for admin/staff users
  useEffect(() => {
    const fetchMembers = async () => {
      if (!actualUser || (actualUser.role !== 'admin' && actualUser.role !== 'staff')) return;
      
      try {
        const res = await fetch('/api/hubspot/contacts');
        if (res.ok) {
          const contacts = await res.json();
          const formatted: MemberProfile[] = contacts.map((contact: any) => ({
            id: contact.id,
            name: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Unknown',
            tier: contact.tier || 'Core',
            status: contact.status || 'Active',
            email: contact.email || '',
            phone: contact.phone || '',
            role: 'member'
          }));
          setMembers(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch HubSpot contacts:', err);
      }
    };
    fetchMembers();
  }, [actualUser]);

  // Start background sync
  useEffect(() => {
    startBackgroundSync();
  }, []);

  // Fetch cafe menu with background sync
  useEffect(() => {
    const formatCafeData = (data: any[]) => data.map((item: any) => ({
      id: item.id.toString(),
      category: item.category,
      name: item.name,
      price: parseFloat(item.price) || 0,
      desc: item.description || '',
      icon: item.icon || '',
      image: item.image_url || ''
    }));

    const isValidCafeData = (data: any): data is any[] => {
      return Array.isArray(data) && data.length > 0 && data[0]?.name;
    };

    const cached = getCached<any[]>('cafe_menu');
    if (isValidCafeData(cached)) {
      setCafeMenu(formatCafeData(cached));
    }

    fetchAndCache<any[]>('cafe_menu', '/api/cafe-menu', (data) => {
      if (isValidCafeData(data)) {
        setCafeMenu(formatCafeData(data));
        setCafeMenuLoaded(true);
      }
    });

    const directFetch = async () => {
      try {
        const res = await fetch('/api/cafe-menu');
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const data = await res.json();
            if (isValidCafeData(data)) {
              setCafeMenu(formatCafeData(data));
              setCafeMenuLoaded(true);
            }
          }
        }
      } catch {}
      setCafeMenuLoaded(true);
    };

    const timer = setTimeout(() => {
      if (cafeMenu.length === 0) directFetch();
      else setCafeMenuLoaded(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Fetch announcements from API
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAnnouncements(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
      } finally {
        setAnnouncementsLoaded(true);
      }
    };
    fetchAnnouncements();
  }, []);

  const refreshCafeMenu = useCallback(async () => {
    const formatCafeData = (data: any[]) => data.map((item: any) => ({
      id: item.id.toString(),
      category: item.category,
      name: item.name,
      price: parseFloat(item.price) || 0,
      desc: item.description || '',
      icon: item.icon || '',
      image: item.image_url || ''
    }));
    try {
      const res = await fetch('/api/cafe-menu');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCafeMenu(formatCafeData(data));
        }
      }
    } catch {}
  }, []);

  // Fetch events with background sync
  useEffect(() => {
    const normalizeCategory = (cat: string | null | undefined): string => {
      if (!cat) return 'Social';
      const lower = cat.toLowerCase();
      const categoryMap: Record<string, string> = {
        'wellness': 'Wellness',
        'social': 'Social',
        'dining': 'Dining',
        'sport': 'Sport',
        'sports': 'Sport',
      };
      return categoryMap[lower] || cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    };

    const formatEventData = (data: any[]) => data.map((event: any) => ({
      id: event.id.toString(),
      source: event.source === 'eventbrite' ? 'eventbrite' : 'internal',
      externalLink: event.eventbrite_url || undefined,
      title: event.title,
      category: normalizeCategory(event.category),
      date: formatDateShort(event.event_date),
      time: event.start_time ? formatTimeString(event.start_time) : 'TBD',
      location: event.location || 'Even House',
      image: event.image_url || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1000&auto=format&fit=crop',
      description: event.description || '',
      attendees: [],
      capacity: event.max_attendees || undefined,
      ticketsSold: undefined
    })) as EventData[];

    const cached = getCached<any[]>('events');
    if (cached?.length) {
      setEvents(formatEventData(cached));
    }

    fetchAndCache<any[]>('events', '/api/events', (data) => {
      if (data?.length) setEvents(formatEventData(data));
      setEventsLoaded(true);
    });
    
    setTimeout(() => setEventsLoaded(true), 2000);
  }, []);

  // Auth Logic - verify member email
  const login = async (email: string) => {
    const res = await fetch('/api/auth/verify-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to verify membership');
    }
    
    const { member } = await res.json();
    
    const memberProfile: MemberProfile = {
      id: member.id,
      name: [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Member',
      tier: member.tier || 'Core',
      tags: member.tags || [],
      status: 'Active',
      email: member.email,
      phone: member.phone || '',
      jobTitle: member.jobTitle || '',
      role: member.role || 'member',
      mindbodyClientId: member.mindbodyClientId || '',
      lifetimeVisits: member.lifetimeVisits || 0,
      lastBookingDate: member.lastBookingDate || undefined
    };
    
    localStorage.setItem('eh_member', JSON.stringify(memberProfile));
    setActualUser(memberProfile);
  };

  const loginWithMember = (member: any) => {
    const memberProfile: MemberProfile = {
      id: member.id,
      name: [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Member',
      tier: member.tier || 'Core',
      tags: member.tags || [],
      status: 'Active',
      email: member.email,
      phone: member.phone || '',
      jobTitle: member.jobTitle || '',
      role: member.role || 'member',
      mindbodyClientId: member.mindbodyClientId || '',
      lifetimeVisits: member.lifetimeVisits || 0,
      lastBookingDate: member.lastBookingDate || undefined
    };
    
    localStorage.setItem('eh_member', JSON.stringify(memberProfile));
    setActualUser(memberProfile);
  };

  const logout = () => {
    localStorage.removeItem('eh_member');
    setActualUser(null);
    setViewAsUserState(null);
  };

  const refreshUser = async () => {
    if (!actualUser?.email) return;
    
    try {
      const res = await fetch('/api/auth/verify-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: actualUser.email })
      });
      
      if (res.ok) {
        const { member } = await res.json();
        const memberProfile: MemberProfile = {
          id: member.id,
          name: [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'Member',
          tier: member.tier || 'Core',
          tags: member.tags || [],
          status: 'Active',
          email: member.email,
          phone: member.phone || '',
          jobTitle: member.jobTitle || '',
          role: member.role || 'member',
          mindbodyClientId: member.mindbodyClientId || '',
          lifetimeVisits: member.lifetimeVisits || 0,
          lastBookingDate: member.lastBookingDate || undefined
        };
        
        localStorage.setItem('eh_member', JSON.stringify(memberProfile));
        setActualUser(memberProfile);
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  };

  // Cafe Actions (now using API)
  const addCafeItem = async (item: CafeItem) => {
    try {
      const res = await fetch('/api/cafe-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: item.category,
          name: item.name,
          price: item.price,
          description: item.desc,
          icon: item.icon,
          image_url: item.image
        })
      });
      if (res.ok) {
        const newItem = await res.json();
        setCafeMenu(prev => [...prev, {
          id: newItem.id.toString(),
          category: newItem.category,
          name: newItem.name,
          price: parseFloat(newItem.price) || 0,
          desc: newItem.description || '',
          icon: newItem.icon || '',
          image: newItem.image_url || ''
        }]);
      }
    } catch (err) {
      console.error('Failed to add cafe item:', err);
    }
  };
  
  const updateCafeItem = async (item: CafeItem) => {
    try {
      const res = await fetch(`/api/cafe-menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: item.category,
          name: item.name,
          price: item.price,
          description: item.desc,
          icon: item.icon,
          image_url: item.image
        })
      });
      if (res.ok) {
        setCafeMenu(prev => prev.map(i => i.id === item.id ? item : i));
      }
    } catch (err) {
      console.error('Failed to update cafe item:', err);
    }
  };
  
  const deleteCafeItem = async (id: string) => {
    try {
      const res = await fetch(`/api/cafe-menu/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCafeMenu(prev => prev.filter(i => i.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete cafe item:', err);
    }
  };

  // Event Actions
  const addEvent = (item: EventData) => setEvents(prev => [...prev, item]);
  const updateEvent = (item: EventData) => setEvents(prev => prev.map(i => i.id === item.id ? item : i));
  const deleteEvent = (id: string) => setEvents(prev => prev.filter(i => i.id !== id));
  
  const syncEventbrite = async () => {
    try {
      const res = await fetch('/api/eventbrite/sync', { method: 'POST' });
      if (res.ok) {
        const eventsRes = await fetch('/api/events');
        if (eventsRes.ok) {
          const data = await eventsRes.json();
          if (data?.length) {
            const formatEventData = (events: any[]) => events.map((event: any) => ({
              id: event.id.toString(),
              source: event.source === 'eventbrite' ? 'eventbrite' : 'internal',
              externalLink: event.eventbrite_url || undefined,
              title: event.title,
              category: event.category || 'Social',
              date: formatDateShort(event.event_date),
              time: event.start_time || 'TBD',
              location: event.location || 'Even House',
              image: event.image_url || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1000&auto=format&fit=crop',
              description: event.description || '',
              attendees: [],
              capacity: event.max_attendees || undefined,
              ticketsSold: undefined
            })) as EventData[];
            setEvents(formatEventData(data));
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync Eventbrite:', err);
    }
  };

  // Announcement Actions - API backed
  const addAnnouncement = async (item: Announcement) => {
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: item.title,
          description: item.desc,
          type: item.type,
          priority: item.priority || 'normal',
          startDate: item.startDate || null,
          endDate: item.endDate || null,
          linkType: item.linkType || null,
          linkTarget: item.linkTarget || null
        })
      });
      if (res.ok) {
        const newItem = await res.json();
        setAnnouncements(prev => [newItem, ...prev]);
      }
    } catch (err) {
      console.error('Failed to add announcement:', err);
    }
  };
  
  const updateAnnouncement = async (item: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: item.title,
          description: item.desc,
          type: item.type,
          priority: item.priority || 'normal',
          startDate: item.startDate || null,
          endDate: item.endDate || null,
          linkType: item.linkType || null,
          linkTarget: item.linkTarget || null
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setAnnouncements(prev => prev.map(i => i.id === updated.id ? updated : i));
      }
    } catch (err) {
      console.error('Failed to update announcement:', err);
    }
  };
  
  const deleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setAnnouncements(prev => prev.filter(i => i.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  // Member Actions
  const updateMember = (item: MemberProfile) => setMembers(prev => prev.map(m => m.id === item.id ? item : m));

  // Booking Actions
  const addBooking = (booking: Booking) => setBookings(prev => [booking, ...prev]);
  const deleteBooking = (id: string) => setBookings(prev => prev.filter(b => b.id !== id));

  return (
    <DataContext.Provider value={{
      user, actualUser, viewAsUser, isViewingAs,
      login, loginWithMember, logout, refreshUser, setViewAsUser, clearViewAsUser,
      cafeMenu, events, announcements, members, bookings, isLoading, isDataReady,
      addCafeItem, updateCafeItem, deleteCafeItem, refreshCafeMenu,
      addEvent, updateEvent, deleteEvent, syncEventbrite,
      addAnnouncement, updateAnnouncement, deleteAnnouncement,
      updateMember, addBooking, deleteBooking
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};