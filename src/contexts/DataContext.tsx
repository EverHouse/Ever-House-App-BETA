import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
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
  startDate?: string;
  endDate?: string;
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

  addAnnouncement: (ann: Announcement) => void;
  updateAnnouncement: (ann: Announcement) => void;
  deleteAnnouncement: (id: string) => void;

  updateMember: (member: MemberProfile) => void;

  addBooking: (booking: Booking) => void;
  deleteBooking: (id: string) => void;
}

// --- Initial Mock Data ---

const INITIAL_CAFE: CafeItem[] = [
  // COFFEE
  { id: 'esp', category: "Coffee", name: "Espresso", price: 3, desc: "", icon: "coffee", image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=1000&auto=format&fit=crop" },
  { id: 'drp', category: "Coffee", name: "Drip", price: 4, desc: "", icon: "coffee_maker", image: "https://images.unsplash.com/photo-1550950158-d0d960d9f91b?q=80&w=1000&auto=format&fit=crop" },
  { id: 'ame', category: "Coffee", name: "Americano", price: 4, desc: "", icon: "local_cafe", image: "https://images.unsplash.com/photo-1551030173-122f528a6311?q=80&w=1000&auto=format&fit=crop" },
  { id: 'cap', category: "Coffee", name: "Cappuccino", price: 4, desc: "", icon: "coffee", image: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1000&auto=format&fit=crop" },
  { id: 'flt', category: "Coffee", name: "Flat White", price: 4, desc: "", icon: "local_cafe", image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?q=80&w=1000&auto=format&fit=crop" },
  { id: 'cor', category: "Coffee", name: "Cortado", price: 4, desc: "", icon: "local_cafe", image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1000&auto=format&fit=crop" },
  { id: 'flb', category: "Coffee", name: "Flash Brew", price: 5, desc: "Iced | Hot", icon: "ac_unit", image: "https://images.unsplash.com/photo-1517701604599-bb29b5dd7359?q=80&w=1000&auto=format&fit=crop" },
  { id: 'lat', category: "Coffee", name: "Latte", price: 5, desc: "Rotating specialty roasts", icon: "local_cafe", image: "https://images.unsplash.com/photo-1555523774-8d9600989674?auto=format&fit=crop&q=80&w=1000" },
  { id: 'pov', category: "Coffee", name: "Pour Over", price: 0, desc: "Lightly sweetened cold foam | Iced coffee or matcha", icon: "water_drop", image: "https://images.unsplash.com/photo-1498804103079-a6351b050096?q=80&w=1000&auto=format&fit=crop" },
  { id: 'tea', category: "Coffee", name: "Leaves and Flowers Tea", price: 5, desc: "Ichibana | Tropic Garden | Mountain Beauty", icon: "emoji_food_beverage", image: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?q=80&w=1000&auto=format&fit=crop" },
  { id: 'mat', category: "Coffee", name: "Nekohama Matcha", price: 8, desc: "Organic A1 pinnacle ceremonial grade", icon: "tea_bag", image: "https://images.unsplash.com/photo-1582793988951-9aed5509eb97?q=80&w=1000&auto=format&fit=crop" },
  { id: 'pit', category: "Coffee", name: "Pit Stop", price: 7, desc: "Seasonal cherry pie latte w/ graham cracker dust", icon: "pie_chart", image: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?q=80&w=1000&auto=format&fit=crop" },
  { id: 'sea', category: "Coffee", name: "Seasonal Tonic", price: 7, desc: "Pear-ginger | Served with espresso or matcha", icon: "spa", image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=1000&auto=format&fit=crop" },
  { id: 'pec', category: "Coffee", name: "Pecan Prix", price: 8, desc: "Pecan pie matcha latte w/ maple creamtop", icon: "icecream", image: "https://images.unsplash.com/photo-1601000938259-9e92002320b2?q=80&w=1000&auto=format&fit=crop" },
  { id: 'nik', category: "Coffee", name: "Niko No. 3", price: 5, desc: "Espresso over grass-fed cinnamon honey butter", icon: "cookie", image: "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?q=80&w=1000&auto=format&fit=crop" },

  // BREAKFAST
  { id: 'egg_t', category: "Breakfast", name: "Egg Toast", price: 14, desc: "Schaner Farm scrambled eggs, whipped ricotta, chives, micro greens", icon: "bakery_dining", image: "https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&q=80&w=1000" },
  { id: 'avo', category: "Breakfast", name: "Avocado Toast", price: 16, desc: "Hass smashed avocado, radish, lemon, micro greens, dill", icon: "nutrition", image: "https://images.unsplash.com/photo-1603046891744-1f7636440269?q=80&w=1000&auto=format&fit=crop" },
  { id: 'ban', category: "Breakfast", name: "Banana & Honey Toast", price: 14, desc: "Banana, whipped ricotta, Hapa Honey Farm local honey", icon: "breakfast_dining", image: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=1000&auto=format&fit=crop" },
  { id: 'smk_t', category: "Breakfast", name: "Smoked Salmon Toast", price: 20, desc: "Alaskan king smoked salmon, whipped cream cheese, dill, capers", icon: "set_meal", image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=1000&auto=format&fit=crop" },
  { id: 'cro', category: "Breakfast", name: "Breakfast Croissant", price: 16, desc: "Schaner Farm eggs, New School american cheese", icon: "bakery_dining", image: "https://images.unsplash.com/photo-1555507036-ab1f40388085?auto=format&fit=crop&q=80&w=1000" },
  { id: 'oml', category: "Breakfast", name: "French Omelette", price: 14, desc: "Schaner Farm eggs, cultured butter, fresh herbs", icon: "egg_alt", image: "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?q=80&w=1000&auto=format&fit=crop" },
  { id: 'stk', category: "Breakfast", name: "Hanger Steak & Eggs", price: 24, desc: "Autonomy Farms Hanger steak, Schaner Farm eggs", icon: "restaurant", image: "https://images.unsplash.com/photo-1629853347047-97d81e18d63a?q=80&w=1000&auto=format&fit=crop" },
  { id: 'bac', category: "Breakfast", name: "Bacon & Eggs", price: 14, desc: "Applewood smoked bacon, Schaner Farm eggs", icon: "bento", image: "https://images.unsplash.com/photo-1616262455823-1d0dfa02476d?q=80&w=1000&auto=format&fit=crop" },
  { id: 'yog', category: "Breakfast", name: "Yogurt Parfait", price: 14, desc: "Yogurt, seasonal fruits, farmstead granola, Hapa Honey", icon: "icecream", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=1000" },

  // LUNCH
  { id: 'cae', category: "Lunch", name: "Caesar Salad", price: 15, desc: "Romaine lettuce, homemade dressing, grated Reggiano", icon: "dinner_dining", image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=1000&auto=format&fit=crop" },
  { id: 'wed', category: "Lunch", name: "Wedge Salad", price: 16, desc: "Iceberg lettuce, bacon, red onion, cherry tomatoes, bleu cheese", icon: "kebab_dining", image: "https://images.unsplash.com/photo-1551248429-40975aa4de74?q=80&w=1000&auto=format&fit=crop" },
  { id: 'chk', category: "Lunch", name: "Chicken Salad Sandwich", price: 14, desc: "Autonomy Farms chicken, celery, toasted pan loaf", icon: "lunch_dining", image: "https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?q=80&w=1000&auto=format&fit=crop" },
  { id: 'tun', category: "Lunch", name: "Tuna Salad Sandwich", price: 14, desc: "Wild pole-caught albacore tuna, sprouts, chimichurri", icon: "set_meal", image: "https://images.unsplash.com/photo-1535905557558-afc4877a26fc?q=80&w=1000&auto=format&fit=crop" },
  { id: 'grl', category: "Lunch", name: "Grilled Cheese", price: 12, desc: "New School american cheese, brioche pan loaf", icon: "fastfood", image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=1000&auto=format&fit=crop" },
  { id: 'blt', category: "Lunch", name: "Heirloom BLT", price: 18, desc: "Applewood smoked bacon, butter lettuce, heirloom tomatoes", icon: "lunch_dining", image: "https://images.unsplash.com/photo-1553909489-cd47e3b4430f?q=80&w=1000&auto=format&fit=crop" },
  { id: 'bra', category: "Lunch", name: "Bratwurst", price: 12, desc: "German bratwurst, sautéed onions & peppers, toasted brioche", icon: "kebab_dining", image: "https://images.unsplash.com/photo-1585325701165-351af916e581?q=80&w=1000&auto=format&fit=crop" },
  { id: 'bis', category: "Lunch", name: "Bison Serrano Chili", price: 14, desc: "Pasture raised bison, serrano, anaheim, cheddar cheese", icon: "soup_kitchen", image: "https://images.unsplash.com/photo-1547592166-23acbe3a624b?q=80&w=1000&auto=format&fit=crop" },

  // SIDES
  { id: 's_bac', category: "Sides", name: "Bacon (2 slices)", price: 6, desc: "", icon: "bento", image: "https://images.unsplash.com/photo-1606851682848-3c306df6779d?q=80&w=1000&auto=format&fit=crop" },
  { id: 's_egg', category: "Sides", name: "Eggs, Scrambled", price: 8, desc: "", icon: "egg_alt", image: "https://images.unsplash.com/photo-1517456104764-a7457864757c?q=80&w=1000&auto=format&fit=crop" },
  { id: 's_fru', category: "Sides", name: "Seasonal Fruit Bowl", price: 10, desc: "", icon: "nutrition", image: "https://images.unsplash.com/photo-1563205764-6e06b99732f7?q=80&w=1000&auto=format&fit=crop" },
  { id: 's_smk', category: "Sides", name: "Smoked Salmon", price: 9, desc: "", icon: "set_meal", image: "https://images.unsplash.com/photo-1522512115668-c09775d6f424?q=80&w=1000&auto=format&fit=crop" },
  { id: 's_tst', category: "Sides", name: "Toast (2 slices)", price: 3, desc: "", icon: "breakfast_dining", image: "https://images.unsplash.com/photo-1528659424610-184568f2c253?q=80&w=1000&auto=format&fit=crop" },
  { id: 's_jam', category: "Sides", name: "Sqirl Seasonal Jam", price: 3, desc: "", icon: "kitchen", image: "" },
  { id: 's_pis', category: "Sides", name: "Pistakio Spread", price: 4, desc: "", icon: "cookie", image: "" },

  // KIDS
  { id: 'k_grl', category: "Kids", name: "Grilled Cheese", price: 6, desc: "", icon: "fastfood", image: "" },
  { id: 'k_dog', category: "Kids", name: "Hot Dog", price: 8, desc: "", icon: "kebab_dining", image: "" },

  // DESSERT
  { id: 'gel', category: "Dessert", name: "Gelato Sandwiches", price: 6, desc: "Vanilla bean w/ choc chip OR Sea salt caramel w/ snickerdoodle", icon: "icecream", image: "https://images.unsplash.com/photo-1560008581-09826d1de69e?q=80&w=1000&auto=format&fit=crop" },
  { id: 'pie', category: "Dessert", name: "Seasonal Pie, Slice", price: 6, desc: "With house made creme", icon: "pie_chart", image: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?q=80&w=1000&auto=format&fit=crop" },

  // SHAREABLES
  { id: 'clu', category: "Shareables", name: "Club Charcuterie", price: 32, desc: "", icon: "tapas", image: "https://images.unsplash.com/photo-1626808642875-0aa545482dfb?q=80&w=1000&auto=format&fit=crop" },
  { id: 'chi', category: "Shareables", name: "Chips & Salsa", price: 10, desc: "", icon: "tapas", image: "https://images.unsplash.com/photo-1582234372732-28d560336215?q=80&w=1000&auto=format&fit=crop" },
  { id: 'cav', category: "Shareables", name: "Caviar Service", price: 0, desc: "", icon: "blur_circular", image: "https://images.unsplash.com/photo-1520038410233-7141dd782f08?q=80&w=1000&auto=format&fit=crop" },
  { id: 'tin', category: "Shareables", name: "Tinned Fish Tray", price: 47, desc: "", icon: "sardine", image: "https://images.unsplash.com/photo-1549487532-afef55208f72?q=80&w=1000&auto=format&fit=crop" },
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

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  { id: '1', title: "Course Maintenance", desc: "Holes 1-9 closed for aeration next Tuesday.", type: 'announcement', date: '1d ago' },
  { id: '2', title: "Summer Party", desc: "Tickets are now available.", type: 'update', date: '2d ago' },
];

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
  const [cafeMenu, setCafeMenu] = useState<CafeItem[]>([]);
  const [events, setEvents] = useState<EventData[]>(INITIAL_EVENTS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [members, setMembers] = useState<MemberProfile[]>(INITIAL_MEMBERS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  
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
                const updatedProfile = {
                  id: freshMember.id,
                  name: [freshMember.firstName, freshMember.lastName].filter(Boolean).join(' ') || freshMember.email || 'Member',
                  tier: freshMember.tier || 'Core',
                  tags: freshMember.tags || [],
                  status: 'Active',
                  email: freshMember.email,
                  phone: freshMember.phone || '',
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
  
  // View As Functions - only for admins
  const setViewAsUser = async (member: MemberProfile) => {
    if (actualUser?.role === 'admin' || actualUser?.role === 'staff') {
      try {
        const res = await fetch(`/api/members/${encodeURIComponent(member.email)}/details`);
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
          setViewAsUserState(fullMember);
        } else {
          setViewAsUserState(member);
        }
      } catch (err) {
        console.error('Failed to fetch member details:', err);
        setViewAsUserState(member);
      }
    }
  };
  
  const clearViewAsUser = () => {
    setViewAsUserState(null);
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
            }
          }
        }
      } catch {}
    };

    const timer = setTimeout(() => {
      if (cafeMenu.length === 0) directFetch();
    }, 1500);

    return () => clearTimeout(timer);
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
    });
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

  // Announcement Actions
  const addAnnouncement = (item: Announcement) => setAnnouncements(prev => [item, ...prev]);
  const updateAnnouncement = (item: Announcement) => setAnnouncements(prev => prev.map(i => i.id === item.id ? item : i));
  const deleteAnnouncement = (id: string) => setAnnouncements(prev => prev.filter(i => i.id !== id));

  // Member Actions
  const updateMember = (item: MemberProfile) => setMembers(prev => prev.map(m => m.id === item.id ? item : m));

  // Booking Actions
  const addBooking = (booking: Booking) => setBookings(prev => [booking, ...prev]);
  const deleteBooking = (id: string) => setBookings(prev => prev.filter(b => b.id !== id));

  return (
    <DataContext.Provider value={{
      user, actualUser, viewAsUser, isViewingAs,
      login, loginWithMember, logout, refreshUser, setViewAsUser, clearViewAsUser,
      cafeMenu, events, announcements, members, bookings, isLoading,
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