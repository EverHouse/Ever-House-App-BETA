import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useData, CafeItem, EventData, Announcement, MemberProfile, Booking } from '../../contexts/DataContext';
import MenuOverlay from '../../components/MenuOverlay';
import Logo from '../../components/Logo';
import TierBadge from '../../components/TierBadge';
import TagBadge from '../../components/TagBadge';
import { AVAILABLE_TAGS } from '../../utils/tierUtils';
import { SafeAreaBottomOverlay } from '../../components/layout/SafeAreaBottomOverlay';
import { BottomSentinel } from '../../components/layout/BottomSentinel';
import BackToTop from '../../components/BackToTop';
import FaqsAdmin from './FaqsAdmin';
import InquiriesAdmin from './InquiriesAdmin';
import GalleryAdmin from './GalleryAdmin';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { actualUser } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Protect route - use actualUser so admins can still access while viewing as member
  useEffect(() => {
    if (!actualUser || (actualUser.role !== 'admin' && actualUser.role !== 'staff')) {
        navigate('/login');
    }
  }, [actualUser, navigate]);

  if (!actualUser || (actualUser.role !== 'admin' && actualUser.role !== 'staff')) return null;

  const headerContent = (
    <header className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-[#293515] shadow-md transition-all duration-200 text-[#F2F2EC] z-[9998] pointer-events-auto">
      <button 
        onClick={() => setIsMenuOpen(true)}
        className="flex items-center justify-center w-10 h-10 hover:opacity-70 transition-opacity"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>
      
      <div className="cursor-pointer flex items-center justify-center" onClick={() => navigate('/')}>
        <Logo type="mascot" variant="white" className="h-14 w-auto" />
      </div>

      <button 
        onClick={() => navigate('/profile')}
        className="flex items-center justify-center w-10 h-10 hover:opacity-70 transition-opacity"
      >
        <span className="material-symbols-outlined text-[24px]">account_circle</span>
      </button>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-display dark:bg-transparent transition-colors duration-300 flex flex-col relative">
      
      {/* Header - rendered via portal to escape transform context */}
      {createPortal(headerContent, document.body)}

      {/* Main Content Area - add top padding for fixed header */}
      <main className="flex-1 px-4 md:px-8 max-w-4xl mx-auto pt-24 w-full relative z-0">
        <div className="mb-6 animate-pop-in">
           <span className="text-xs font-bold uppercase tracking-wider text-primary/50 dark:text-white/50 block mb-1">Staff Portal</span>
           <h1 className="text-2xl font-bold text-primary dark:text-white">
               {activeTab === 'home' && 'Dashboard'}
               {activeTab === 'cafe' && 'Manage Cafe Menu'}
               {activeTab === 'events' && 'Manage Events'}
               {activeTab === 'announcements' && 'Manage Updates'}
               {activeTab === 'directory' && 'Directory'}
               {activeTab === 'simulator' && 'Booking Requests'}
               {activeTab === 'team' && 'Manage Team Access'}
               {activeTab === 'wellness' && 'Manage Wellness Classes'}
               {activeTab === 'conflicts' && 'Data Conflicts'}
               {activeTab === 'faqs' && 'Manage FAQs'}
               {activeTab === 'inquiries' && 'Inquiries'}
               {activeTab === 'gallery' && 'Manage Gallery'}
               {activeTab === 'tiers' && 'Manage Tiers'}
           </h1>
        </div>
        
        {activeTab === 'home' && <StaffDashboardHome setActiveTab={setActiveTab} isAdmin={actualUser?.role === 'admin'} />}
        {activeTab === 'cafe' && <CafeAdmin />}
        {activeTab === 'events' && <EventsAdmin />}
        {activeTab === 'announcements' && <AnnouncementsAdmin />}
        {activeTab === 'directory' && <MembersAdmin />}
        {activeTab === 'simulator' && <SimulatorAdmin />}
        {activeTab === 'team' && actualUser?.role === 'admin' && <TeamAdmin />}
        {activeTab === 'wellness' && <WellnessAdmin />}
        {activeTab === 'conflicts' && actualUser?.role === 'admin' && <DataConflictsAdmin />}
        {activeTab === 'faqs' && <FaqsAdmin />}
        {activeTab === 'inquiries' && <InquiriesAdmin />}
        {activeTab === 'gallery' && <GalleryAdmin />}
        {activeTab === 'tiers' && actualUser?.role === 'admin' && <TiersAdmin />}
        <BottomSentinel />
      </main>

      {/* Bottom Nav - Floating Pill with Liquid Glass */}
      <StaffBottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={actualUser?.role === 'admin'} 
      />

      <BackToTop threshold={400} />

      <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
};

// --- Sub-Components ---

type TabType = 'home' | 'cafe' | 'events' | 'announcements' | 'directory' | 'simulator' | 'team' | 'wellness' | 'conflicts' | 'faqs' | 'inquiries' | 'gallery' | 'tiers';

interface NavItemData {
  id: TabType;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItemData[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'simulator', icon: 'event_note', label: 'Requests' },
  { id: 'events', icon: 'event', label: 'Events' },
  { id: 'wellness', icon: 'spa', label: 'Wellness' },
  { id: 'announcements', icon: 'campaign', label: 'News' },
];

const StaffBottomNav: React.FC<{
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isAdmin?: boolean;
}> = ({ activeTab, setActiveTab, isAdmin }) => {
  const navRef = useRef<HTMLDivElement>(null);
  
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);
  const activeIndex = visibleItems.findIndex(item => item.id === activeTab);
  const itemCount = visibleItems.length;
  
  const blobWidth = 100 / itemCount;
  
  const navContent = (
    <nav 
      ref={navRef}
      className="relative mb-8 mx-auto w-[calc(100%-3rem)] max-w-md bg-black/60 backdrop-blur-xl border border-[#293515]/80 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)] rounded-full pointer-events-auto"
    >
      <div className="relative flex items-center w-full">
        {activeIndex >= 0 && (
        <div 
          className="absolute top-0 bottom-0 left-0 rounded-full pointer-events-none bg-gradient-to-b from-white/20 to-white/10 shadow-[0_0_20px_rgba(41,53,21,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ 
            width: `${blobWidth}%`, 
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        )}
        
        {visibleItems.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{ touchAction: 'manipulation' }}
            className={`
              flex-1 flex flex-col items-center gap-0.5 py-2 px-1 relative z-10 cursor-pointer
              transition-all duration-300 ease-out active:scale-90
              ${activeTab === item.id ? 'text-white' : 'text-white/50 hover:text-white/80'}
            `}
          >
            <span className={`material-symbols-outlined text-xl transition-all duration-300 ${activeTab === item.id ? 'filled scale-110' : ''}`}>
              {item.icon}
            </span>
            <span className={`text-[9px] tracking-wide transition-all duration-300 ${activeTab === item.id ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
  
  return <SafeAreaBottomOverlay>{navContent}</SafeAreaBottomOverlay>;
};

// --- STAFF DASHBOARD HOME ---

const StaffDashboardHome: React.FC<{ setActiveTab: (tab: TabType) => void; isAdmin?: boolean }> = ({ setActiveTab, isAdmin }) => {
  const quickLinks = [
    { id: 'directory' as TabType, icon: 'groups', label: 'Directory', description: 'Search and manage members' },
    { id: 'cafe' as TabType, icon: 'local_cafe', label: 'Cafe Menu', description: 'Update menu items and prices' },
    { id: 'team' as TabType, icon: 'shield_person', label: 'Team Access', description: 'Manage staff and admins', adminOnly: true },
    { id: 'gallery' as TabType, icon: 'photo_library', label: 'Gallery', description: 'Manage venue photos' },
    { id: 'faqs' as TabType, icon: 'help_outline', label: 'FAQs', description: 'Edit frequently asked questions' },
    { id: 'inquiries' as TabType, icon: 'mail', label: 'Inquiries', description: 'View form submissions' },
    { id: 'conflicts' as TabType, icon: 'warning', label: 'Data Conflicts', description: 'Review membership discrepancies', adminOnly: true },
    { id: 'tiers' as TabType, icon: 'loyalty', label: 'Manage Tiers', description: 'Configure membership tier settings', adminOnly: true },
  ];

  const visibleLinks = quickLinks.filter(link => !link.adminOnly || isAdmin);

  return (
    <div className="grid grid-cols-2 gap-4 animate-pop-in">
      {visibleLinks.map((link) => (
        <button
          key={link.id}
          onClick={() => setActiveTab(link.id)}
          className="flex flex-col items-start p-5 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-lg border border-primary/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all text-left group shadow-sm"
        >
          <span className="material-symbols-outlined text-3xl text-primary dark:text-white mb-3 group-hover:scale-110 transition-transform">{link.icon}</span>
          <span className="font-bold text-primary dark:text-white text-sm">{link.label}</span>
          <span className="text-xs text-primary/60 dark:text-white/60 mt-1">{link.description}</span>
        </button>
      ))}
    </div>
  );
};

// --- CAFE ADMIN ---

const CafeAdmin: React.FC = () => {
    const { cafeMenu, addCafeItem, updateCafeItem, deleteCafeItem, refreshCafeMenu } = useData();
    const categories = useMemo(() => ['All', ...Array.from(new Set(cafeMenu.map(item => item.category)))], [cafeMenu]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<Partial<CafeItem>>({ category: 'Coffee & Drinks' });
    const [isSeeding, setIsSeeding] = useState(false);
    const [seedMessage, setSeedMessage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ originalSize: number; optimizedSize: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredMenu = activeCategory === 'All' ? cafeMenu : cafeMenu.filter(item => item.category === activeCategory);

    const openEdit = (item: CafeItem) => {
        setNewItem(item);
        setEditId(item.id);
        setIsEditing(true);
    };

    const openCreate = () => {
        setNewItem({ category: 'Coffee & Drinks' });
        setEditId(null);
        setIsEditing(true);
        setUploadResult(null);
    };

    const handleImageUpload = async (file: File) => {
        setIsUploading(true);
        setUploadResult(null);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch('/api/admin/upload-image', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            setNewItem(prev => ({ ...prev, image: data.url }));
            setUploadResult({ originalSize: data.originalSize, optimizedSize: data.optimizedSize });
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSeedMenu = async () => {
        if (isSeeding) return;
        setIsSeeding(true);
        setSeedMessage(null);
        try {
            const res = await fetch('/api/admin/seed-cafe', { method: 'POST', credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                setSeedMessage(`${data.message}`);
                if (refreshCafeMenu) refreshCafeMenu();
            } else {
                setSeedMessage(data.error || 'Failed to seed menu');
            }
        } catch (err) {
            setSeedMessage('Network error');
        } finally {
            setIsSeeding(false);
        }
    };

    const handleSave = () => {
        if (!newItem.name || !newItem.price) return;
        
        const item: CafeItem = {
            id: editId || Math.random().toString(36).substr(2, 9),
            name: newItem.name,
            price: Number(newItem.price),
            desc: newItem.desc || '',
            category: newItem.category || 'Coffee & Drinks',
            icon: newItem.icon || 'coffee',
            image: newItem.image || ''
        };

        if (editId) {
            updateCafeItem(item);
        } else {
            addCafeItem(item);
        }
        setIsEditing(false);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary dark:text-white">Menu Items</h2>
                <div className="flex gap-2">
                    {cafeMenu.length === 0 && (
                        <button 
                            onClick={handleSeedMenu} 
                            disabled={isSeeding}
                            className="bg-accent text-primary px-3 py-2 rounded-lg font-bold flex items-center gap-1 shadow-md text-xs whitespace-nowrap disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-sm">{isSeeding ? 'sync' : 'database'}</span> 
                            {isSeeding ? 'Seeding...' : 'Seed Menu'}
                        </button>
                    )}
                    <button onClick={openCreate} className="bg-primary text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 shadow-md text-xs whitespace-nowrap">
                        <span className="material-symbols-outlined text-sm">add</span> Add
                    </button>
                </div>
            </div>
            {seedMessage && (
                <div className="mb-4 p-3 bg-accent/20 text-primary dark:text-white rounded-lg text-sm">
                    {seedMessage}
                </div>
            )}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1 mb-4">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeCategory === cat ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {isEditing && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 border border-gray-200 dark:border-white/10 pointer-events-auto">
                            <h3 className="font-bold text-lg mb-5 text-primary dark:text-white">{editId ? 'Edit Item' : 'Add Item'}</h3>
                            <div className="space-y-4 mb-6">
                                <input className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Item Name" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                                <div className="grid grid-cols-2 gap-3">
                                    <input className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" type="number" placeholder="Price" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} />
                                    <select className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                        <option>Coffee & Drinks</option>
                                        <option>Breakfast</option>
                                        <option>Lunch</option>
                                        <option>Sides</option>
                                        <option>Kids</option>
                                        <option>Dessert</option>
                                        <option>Shareables</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-white/70">Image (Optional)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) handleImageUpload(file);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-lg">{isUploading ? 'sync' : 'upload'}</span>
                                            {isUploading ? 'Uploading...' : 'Upload'}
                                        </button>
                                        <input
                                            className="flex-1 border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                                            placeholder="Or paste image URL"
                                            value={newItem.image || ''}
                                            onChange={e => setNewItem({...newItem, image: e.target.value})}
                                        />
                                    </div>
                                    {uploadResult && (
                                        <p className="text-xs text-green-600 dark:text-green-400">
                                            Optimized: {(uploadResult.originalSize / 1024).toFixed(0)}KB → {(uploadResult.optimizedSize / 1024).toFixed(0)}KB
                                        </p>
                                    )}
                                    {newItem.image && (
                                        <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5">
                                            <img src={newItem.image} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => { setNewItem({...newItem, image: ''}); setUploadResult(null); }}
                                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                                            >
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <textarea className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" placeholder="Description" rows={3} value={newItem.desc || ''} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-gray-500 dark:text-white/60 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
                                <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary/90 transition-colors">Save</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className="space-y-3">
                {filteredMenu.map(item => (
                    <div key={item.id} onClick={() => openEdit(item)} className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all">
                        <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-white/5 flex-shrink-0 overflow-hidden">
                             {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-gray-400">restaurant</span></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900 dark:text-white truncate flex-1">{item.name}</h4>
                                <span className="font-bold text-primary dark:text-white whitespace-nowrap">${item.price}</span>
                                <button onClick={(e) => { e.stopPropagation(); deleteCafeItem(item.id); }} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60 px-1.5 py-0.5 rounded mt-1 mb-1">{item.category}</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- SHARED TYPES ---

interface Participant {
    id: number;
    userEmail: string;
    status: string;
    createdAt: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
}

// --- EVENTS ADMIN ---

interface DBEvent {
    id: number;
    title: string;
    description: string;
    event_date: string;
    start_time: string;
    end_time: string;
    location: string;
    category: string;
    image_url: string | null;
    max_attendees: number | null;
    eventbrite_id: string | null;
    eventbrite_url: string | null;
}

const CATEGORY_TABS = [
    { id: 'all', label: 'All', icon: 'calendar_month' },
    { id: 'Social', label: 'Events', icon: 'celebration' },
    { id: 'Wellness', label: 'Classes', icon: 'fitness_center' },
    { id: 'MedSpa', label: 'MedSpa', icon: 'spa' },
    { id: 'Tournaments', label: 'Tournaments', icon: 'emoji_events' },
];

const EventsAdmin: React.FC = () => {
    const [events, setEvents] = useState<DBEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [newItem, setNewItem] = useState<Partial<DBEvent>>({ category: 'Social' });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [isViewingRsvps, setIsViewingRsvps] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<DBEvent | null>(null);
    const [rsvps, setRsvps] = useState<Participant[]>([]);
    const [isLoadingRsvps, setIsLoadingRsvps] = useState(false);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events');
            const data = await res.json();
            setEvents(data);
        } catch (err) {
            console.error('Failed to fetch events:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const filteredEvents = activeCategory === 'all' 
        ? events 
        : events.filter(e => e.category === activeCategory);

    const openEdit = (event: DBEvent) => {
        setNewItem(event);
        setEditId(event.id);
        setIsEditing(true);
    };

    const openCreate = () => {
        setNewItem({ category: activeCategory === 'all' ? 'Social' : activeCategory });
        setEditId(null);
        setIsEditing(true);
    };

    const handleSave = async () => {
        setError(null);
        
        if (!newItem.title?.trim()) {
            setError('Title is required');
            return;
        }
        if (!newItem.event_date) {
            setError('Date is required');
            return;
        }
        if (!newItem.start_time) {
            setError('Start time is required');
            return;
        }
        
        const payload = {
            title: newItem.title.trim(),
            description: newItem.description || '',
            event_date: newItem.event_date,
            start_time: newItem.start_time,
            end_time: newItem.end_time || newItem.start_time,
            location: newItem.location || 'The Lounge',
            category: newItem.category || 'Social',
            image_url: newItem.image_url || null,
            max_attendees: newItem.max_attendees || null,
        };

        setIsSaving(true);
        try {
            const res = editId 
                ? await fetch(`/api/events/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                : await fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            
            if (!res.ok) {
                throw new Error('Failed to save');
            }
            
            await fetchEvents();
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to save event:', err);
            setError('Failed to save event. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`/api/events/${id}`, { method: 'DELETE' });
            fetchEvents();
        } catch (err) {
            console.error('Failed to delete event:', err);
        }
    };

    const handleSyncEventbrite = async () => {
        setIsSyncing(true);
        setSyncMessage(null);
        try {
            const res = await fetch('/api/eventbrite/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setSyncMessage(data.message);
                await fetchEvents();
            } else {
                setSyncMessage(`Error: ${data.error || data.message || 'Sync failed'}`);
            }
        } catch (err) {
            console.error('Failed to sync Eventbrite:', err);
            setSyncMessage('Failed to sync with Eventbrite');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncMessage(null), 5000);
        }
    };

    const handleSyncCalendars = async () => {
        setIsSyncing(true);
        setSyncMessage(null);
        try {
            const res = await fetch('/api/calendars/sync-all', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setSyncMessage(data.message);
                await fetchEvents();
            } else {
                setSyncMessage(`Error: ${data.error || data.message || 'Sync failed'}`);
            }
        } catch (err) {
            console.error('Failed to sync calendars:', err);
            setSyncMessage('Failed to sync with Google Calendar');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncMessage(null), 5000);
        }
    };

    const handleViewRsvps = async (event: DBEvent) => {
        setSelectedEvent(event);
        setIsViewingRsvps(true);
        setIsLoadingRsvps(true);
        try {
            const res = await fetch(`/api/events/${event.id}/rsvps`);
            if (res.ok) {
                const data = await res.json();
                setRsvps(data);
            }
        } catch (err) {
            console.error('Failed to fetch RSVPs:', err);
        } finally {
            setIsLoadingRsvps(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'TBD';
        const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const date = new Date(datePart + 'T12:00:00');
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, mins] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${h12}:${mins.toString().padStart(2, '0')} ${period}`;
    };

    return (
        <div>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mx-4 px-4">
                {CATEGORY_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveCategory(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all flex-shrink-0 ${
                            activeCategory === tab.id 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/10'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[14px] sm:text-[16px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {syncMessage && (
                <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
                    syncMessage.startsWith('Error') 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' 
                        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                }`}>
                    {syncMessage}
                </div>
            )}

            <div className="flex justify-end gap-2 mb-4 flex-wrap">
                <button 
                    onClick={handleSyncCalendars} 
                    disabled={isSyncing}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
                        {isSyncing ? 'progress_activity' : 'calendar_month'}
                    </span> 
                    {isSyncing ? 'Syncing...' : 'Sync Calendars'}
                </button>
                <button 
                    onClick={handleSyncEventbrite} 
                    disabled={isSyncing}
                    className="bg-[#F05537] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
                        {isSyncing ? 'progress_activity' : 'sync'}
                    </span> 
                    {isSyncing ? 'Syncing...' : 'Sync Eventbrite'}
                </button>
                <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md">
                    <span className="material-symbols-outlined">add</span> Create
                </button>
            </div>

            {isEditing && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsEditing(false); setError(null); }} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto pointer-events-auto">
                            <h3 className="font-bold text-lg mb-4 text-primary dark:text-white">{editId ? 'Edit Event' : 'Create Event'}</h3>
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm mb-4">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-3 mb-6">
                                <input className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" placeholder="Title" value={newItem.title || ''} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                                <select className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                    <option value="Social">Event</option>
                                    <option value="Wellness">Class</option>
                                    <option value="MedSpa">MedSpa</option>
                                    <option value="Dining">Dining</option>
                                    <option value="Sport">Sport</option>
                                </select>
                                <div className="grid grid-cols-1 gap-3">
                                    <input type="date" className="border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white" value={newItem.event_date || ''} onChange={e => setNewItem({...newItem, event_date: e.target.value})} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="time" className="border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white" placeholder="Start Time" value={newItem.start_time || ''} onChange={e => setNewItem({...newItem, start_time: e.target.value})} />
                                        <input type="time" className="border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white" placeholder="End Time" value={newItem.end_time || ''} onChange={e => setNewItem({...newItem, end_time: e.target.value})} />
                                    </div>
                                </div>
                                <input className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" placeholder="Location" value={newItem.location || ''} onChange={e => setNewItem({...newItem, location: e.target.value})} />
                                <input className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" placeholder="Image URL (optional)" value={newItem.image_url || ''} onChange={e => setNewItem({...newItem, image_url: e.target.value})} />
                                <input type="number" className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" placeholder="Max Attendees (optional)" value={newItem.max_attendees || ''} onChange={e => setNewItem({...newItem, max_attendees: parseInt(e.target.value) || null})} />
                                <textarea className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" placeholder="Description" rows={3} value={newItem.description || ''} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => { setIsEditing(false); setError(null); }} className="px-4 py-2 text-gray-500 font-bold" disabled={isSaving}>Cancel</button>
                                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md disabled:opacity-50 flex items-center gap-2">
                                    {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-2xl text-gray-400">progress_activity</span>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <span className="material-symbols-outlined text-4xl mb-2 block">event_busy</span>
                    <p>No {activeCategory === 'all' ? 'events' : activeCategory.toLowerCase()} found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredEvents.map(event => (
                        <div key={event.id} onClick={() => openEdit(event)} className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-3 relative overflow-hidden cursor-pointer hover:border-primary/30 transition-all">
                            {event.eventbrite_id && (
                                <div className="absolute top-0 right-0 bg-[#F05537] text-white text-[8px] font-bold uppercase px-2 py-1 rounded-bl-lg z-10">
                                    Eventbrite
                                </div>
                            )}
                            <div className="flex gap-4">
                                <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {event.image_url ? (
                                        <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-3xl text-gray-300 dark:text-white/20">
                                            {event.category === 'Wellness' ? 'fitness_center' : event.category === 'MedSpa' ? 'spa' : event.category === 'Dining' ? 'restaurant' : 'celebration'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-lg text-primary dark:text-white leading-tight mb-1 truncate">{event.title}</h4>
                                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-primary px-1.5 py-0.5 rounded mb-2">{event.category}</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(event.event_date)} • {formatTime(event.start_time)}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-white/5 mt-auto">
                                <span className="text-xs text-gray-400 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">pin_drop</span> {event.location}</span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleViewRsvps(event); }} 
                                        className="text-blue-600 text-xs font-bold uppercase tracking-wider hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">group</span> RSVPs
                                    </button>
                                    {event.eventbrite_url && (
                                        <a 
                                            href={event.eventbrite_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[#F05537] text-xs font-bold uppercase tracking-wider hover:bg-orange-50 px-2 py-1 rounded flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">open_in_new</span> View
                                        </a>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }} className="text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-50 px-2 py-1 rounded">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ParticipantDetailsModal
                isOpen={isViewingRsvps}
                onClose={() => { setIsViewingRsvps(false); setSelectedEvent(null); setRsvps([]); }}
                title={selectedEvent?.title || 'Event RSVPs'}
                subtitle={selectedEvent ? `${formatDate(selectedEvent.event_date)} at ${formatTime(selectedEvent.start_time)}` : undefined}
                participants={rsvps}
                isLoading={isLoadingRsvps}
                type="rsvp"
            />
        </div>
    );
};

// --- PARTICIPANT DETAILS MODAL ---

interface ParticipantDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    participants: Participant[];
    isLoading: boolean;
    type: 'rsvp' | 'enrollment';
}

const ParticipantDetailsModal: React.FC<ParticipantDetailsModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    participants,
    isLoading,
    type
}) => {
    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return createPortal(
        <div className="fixed inset-0 z-[10001] overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                <div className="relative bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto pointer-events-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-primary dark:text-white">{title}</h3>
                            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-500">close</span>
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <span className="material-symbols-outlined animate-spin text-2xl text-gray-400">progress_activity</span>
                        </div>
                    ) : participants.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2 block">
                                {type === 'rsvp' ? 'event_busy' : 'person_off'}
                            </span>
                            <p>No {type === 'rsvp' ? 'RSVPs' : 'enrollments'} yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                {participants.length} {type === 'rsvp' ? 'RSVP' : 'Enrolled'}{participants.length !== 1 ? 's' : ''}
                            </div>
                            {participants.map((p) => (
                                <div 
                                    key={p.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/10"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-brand-green font-bold">
                                            {(p.firstName?.[0] || p.userEmail[0]).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-primary dark:text-white text-sm">
                                                {p.firstName && p.lastName 
                                                    ? `${p.firstName} ${p.lastName}` 
                                                    : p.userEmail}
                                            </p>
                                            {p.firstName && p.lastName && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{p.userEmail}</p>
                                            )}
                                            {p.phone && (
                                                <p className="text-xs text-gray-400">{p.phone}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">
                                            {p.status}
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(p.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- ANNOUNCEMENTS ADMIN ---

interface ClosureForm {
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    affected_areas: string;
    reason: string;
    notify_members: boolean;
}

const AnnouncementsAdmin: React.FC = () => {
    const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement, actualUser } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<Partial<Announcement>>({ type: 'update' });
    
    const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
    const [closureForm, setClosureForm] = useState<ClosureForm>({
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        affected_areas: 'entire_facility',
        reason: '',
        notify_members: false
    });
    const [closureSaving, setClosureSaving] = useState(false);
    const [bays, setBays] = useState<{id: number; name: string}[]>([]);
    
    useEffect(() => {
        fetch('/api/bays')
            .then(r => r.json())
            .then(data => setBays(data))
            .catch(() => {});
    }, []);
    
    const handleSaveClosure = async () => {
        if (!closureForm.start_date || !closureForm.affected_areas) return;
        setClosureSaving(true);
        try {
            const res = await fetch('/api/closures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...closureForm,
                    created_by: actualUser?.email
                })
            });
            if (res.ok) {
                setIsClosureModalOpen(false);
                setClosureForm({
                    start_date: '',
                    start_time: '',
                    end_date: '',
                    end_time: '',
                    affected_areas: 'entire_facility',
                    reason: '',
                    notify_members: false
                });
            }
        } catch (err) {
            console.error('Failed to save closure:', err);
        } finally {
            setClosureSaving(false);
        }
    };

    const openCreate = () => {
        setNewItem({ type: 'update' });
        setEditId(null);
        setIsEditing(true);
    };

    const openEdit = (item: Announcement) => {
        setNewItem(item);
        setEditId(item.id);
        setIsEditing(true);
    };

    const handleSave = () => {
        if(!newItem.title) return;
        const ann: Announcement = {
            id: editId || Date.now().toString(),
            title: newItem.title,
            desc: newItem.desc || '',
            type: newItem.type || 'update',
            date: newItem.date || 'Just now',
            startDate: newItem.startDate,
            endDate: newItem.endDate
        };

        if (editId) {
            updateAnnouncement(ann);
        } else {
            addAnnouncement(ann);
        }
        setIsEditing(false);
    };

    return (
        <div>
            <div className="flex justify-end gap-3 mb-4">
                <button 
                    onClick={() => setIsClosureModalOpen(true)} 
                    className="border-2 border-red-500 text-red-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                    <span className="material-symbols-outlined">block</span> Add Closure
                </button>
                <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md">
                    <span className="material-symbols-outlined">add</span> Post Update
                </button>
            </div>
            
            {isEditing && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 border border-gray-200 dark:border-white/10 pointer-events-auto">
                            <h3 className="font-bold text-lg mb-5 text-primary dark:text-white">{editId ? 'Edit Post' : 'New Post'}</h3>
                            <div className="space-y-4 mb-6">
                                <div className="flex gap-2">
                                    <button onClick={() => setNewItem({...newItem, type: 'update'})} className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${newItem.type === 'update' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>Update</button>
                                    <button onClick={() => setNewItem({...newItem, type: 'announcement'})} className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${newItem.type === 'announcement' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>Announcement</button>
                                </div>
                                <input className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Title" value={newItem.title || ''} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                                <textarea className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" placeholder="Description" rows={3} value={newItem.desc || ''} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                                
                                {/* Date Durations */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5 block">Start Date</label>
                                        <input type="date" className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={newItem.startDate || ''} onChange={e => setNewItem({...newItem, startDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5 block">End Date</label>
                                        <input type="date" className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" value={newItem.endDate || ''} onChange={e => setNewItem({...newItem, endDate: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-gray-500 dark:text-white/60 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
                                <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary/90 transition-colors">Post</button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {isClosureModalOpen && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsClosureModalOpen(false)} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 border border-gray-200 dark:border-white/10 pointer-events-auto">
                            <h3 className="font-bold text-lg mb-5 text-primary dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">block</span>
                                Add Closure
                            </h3>
                            <div className="space-y-4 mb-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5 block">Start Date *</label>
                                        <input 
                                            type="date" 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                                            value={closureForm.start_date} 
                                            onChange={e => setClosureForm({...closureForm, start_date: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5 block">Start Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                                            value={closureForm.start_time} 
                                            onChange={e => setClosureForm({...closureForm, start_time: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5 block">End Date</label>
                                        <input 
                                            type="date" 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                                            value={closureForm.end_date} 
                                            onChange={e => setClosureForm({...closureForm, end_date: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5 block">End Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                                            value={closureForm.end_time} 
                                            onChange={e => setClosureForm({...closureForm, end_time: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5 block">Resource *</label>
                                    <select 
                                        className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                        value={closureForm.affected_areas}
                                        onChange={e => setClosureForm({...closureForm, affected_areas: e.target.value})}
                                    >
                                        <option value="entire_facility">Entire Facility</option>
                                        <option value="all_bays">All Bays</option>
                                        {bays.map(bay => (
                                            <option key={bay.id} value={bay.name}>{bay.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5 block">Internal Note</label>
                                    <textarea 
                                        className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none" 
                                        placeholder="e.g., Broken Sensor, Maintenance, etc." 
                                        rows={2} 
                                        value={closureForm.reason} 
                                        onChange={e => setClosureForm({...closureForm, reason: e.target.value})} 
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                                    <div>
                                        <p className="font-medium text-primary dark:text-white text-sm">Notify Members?</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Send push notification with internal note</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setClosureForm({...closureForm, notify_members: !closureForm.notify_members})}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${closureForm.notify_members ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${closureForm.notify_members ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setIsClosureModalOpen(false)} className="px-5 py-2.5 text-gray-500 dark:text-white/60 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
                                <button 
                                    onClick={handleSaveClosure} 
                                    disabled={closureSaving || !closureForm.start_date}
                                    className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-bold shadow-md hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    {closureSaving ? 'Saving...' : 'Add Closure'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className="space-y-4">
                {announcements.map(item => (
                    <div key={item.id} onClick={() => openEdit(item)} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm flex justify-between items-start cursor-pointer hover:border-primary/30 transition-all">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={`w-2 h-2 rounded-full ${item.type === 'update' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                                <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">{item.type}</span>
                                <span className="text-[10px] text-gray-300 dark:text-gray-600">• {item.date}</span>
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">{item.desc}</p>
                            {(item.startDate || item.endDate) && (
                                <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                    <span>{item.startDate} {item.endDate ? `- ${item.endDate}` : ''}</span>
                                </div>
                            )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteAnnouncement(item.id); }} className="text-gray-300 hover:text-red-500 p-1 -mr-2">
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- DIRECTORY ADMIN (Members + Staff Tabs) ---

const TIER_OPTIONS = ['All', 'Social', 'Core', 'Premium', 'Corporate', 'VIP'] as const;

const MembersAdmin: React.FC = () => {
    const { members, updateMember, setViewAsUser, actualUser } = useData();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState<string>('All');
    
    const isAdmin = actualUser?.role === 'admin';

    // Filter to regular members only
    const regularMembers = useMemo(() => 
        members.filter(m => !m.role || m.role === 'member'), 
        [members]
    );

    // Filter based on search and tier
    const filteredList = useMemo(() => {
        let filtered = regularMembers;
        
        // Apply tier filter
        if (tierFilter !== 'All') {
            filtered = filtered.filter(m => {
                const tier = m.tier || '';
                return tier === tierFilter || tier.includes(tierFilter);
            });
        }
        
        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(m => 
                m.name.toLowerCase().includes(query) ||
                m.email.toLowerCase().includes(query) ||
                (m.tier && m.tier.toLowerCase().includes(query)) ||
                (m.phone && m.phone.toLowerCase().includes(query)) ||
                (query === 'founding' && m.isFounding === true)
            );
        }
        
        return filtered;
    }, [regularMembers, tierFilter, searchQuery]);

    const openEdit = (member: MemberProfile) => {
        setSelectedMember(member);
        setIsEditing(true);
    };
    
    const handleViewAs = async (member: MemberProfile) => {
        if (!isAdmin) return;
        await setViewAsUser(member);
        navigate('/dashboard');
    };

    const handleSave = async () => {
        if (selectedMember) {
            updateMember(selectedMember);
            try {
                const updateData: { role?: string; tags?: string[] } = {};
                
                if (isAdmin && selectedMember.role) {
                    updateData.role = selectedMember.role;
                }
                
                if (selectedMember.tags) {
                    updateData.tags = selectedMember.tags;
                }
                
                if (Object.keys(updateData).length > 0) {
                    await fetch(`/api/members/${selectedMember.id}/role`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    });
                }
            } catch (e) {
                console.error('Failed to update member:', e);
            }
        }
        setIsEditing(false);
    };

    return (
        <div>
            {/* Search and filters */}
            <div className="mb-6 space-y-3">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    )}
                </div>
                
                {/* Tier filter */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Filter by Tier:</span>
                    {TIER_OPTIONS.map(tier => (
                        <button
                            key={tier}
                            onClick={() => setTierFilter(tier)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                tierFilter === tier
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                            }`}
                        >
                            {tier}
                        </button>
                    ))}
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {filteredList.length} member{filteredList.length !== 1 ? 's' : ''} found
                </p>
            </div>

            {/* Edit Modal */}
            {isEditing && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4 text-primary dark:text-white">
                            Edit {selectedMember.role === 'staff' || selectedMember.role === 'admin' ? 'Staff' : 'Member'}
                        </h3>
                        <div className="space-y-3 mb-6">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Name</label>
                                <input className="w-full border border-gray-300 p-2 rounded-lg bg-white text-primary dark:bg-black/20 dark:border-white/10 dark:text-white" value={selectedMember.name} onChange={e => setSelectedMember({...selectedMember, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Email</label>
                                <input className="w-full border border-gray-300 p-2 rounded-lg bg-white text-primary dark:bg-black/20 dark:border-white/10 dark:text-white" value={selectedMember.email} onChange={e => setSelectedMember({...selectedMember, email: e.target.value})} />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Tier</label>
                                    <select className="w-full border border-gray-300 p-2 rounded-lg bg-white text-primary dark:bg-black/20 dark:border-white/10 dark:text-white" value={selectedMember.tier} onChange={e => setSelectedMember({...selectedMember, tier: e.target.value})}>
                                        <option>Social</option>
                                        <option>Core</option>
                                        <option>Premium</option>
                                        <option>Corporate</option>
                                        <option>VIP</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Status</label>
                                    <select className="w-full border border-gray-300 p-2 rounded-lg bg-white text-primary dark:bg-black/20 dark:border-white/10 dark:text-white" value={selectedMember.status} onChange={e => setSelectedMember({...selectedMember, status: e.target.value as any})}>
                                        <option>Active</option>
                                        <option>Pending</option>
                                        <option>Suspended</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Tags</label>
                                <div className="mt-1 space-y-2">
                                    {AVAILABLE_TAGS.map(tag => (
                                        <label key={tag} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/30 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedMember.tags?.includes(tag) || false} 
                                                onChange={e => {
                                                    const currentTags = selectedMember.tags || [];
                                                    if (e.target.checked) {
                                                        setSelectedMember({...selectedMember, tags: [...currentTags, tag]});
                                                    } else {
                                                        setSelectedMember({...selectedMember, tags: currentTags.filter(t => t !== tag)});
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-primary dark:text-white">{tag}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Select all applicable tags for this member</p>
                            </div>
                            {/* Role selector - only for admins */}
                            {isAdmin && (
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Role</label>
                                    <select 
                                        className="w-full border border-gray-300 p-2 rounded-lg bg-white text-primary dark:bg-black/20 dark:border-white/10 dark:text-white" 
                                        value={selectedMember.role || 'member'} 
                                        onChange={e => setSelectedMember({...selectedMember, role: e.target.value as any})}
                                    >
                                        <option value="member">Member</option>
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-1">Staff and Admin can access the staff portal</p>
                                </div>
                            )}
                            {/* Show role as read-only for staff users */}
                            {!isAdmin && (
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Role</label>
                                    <div className="w-full border border-gray-300 p-2 rounded-lg bg-gray-50 text-primary dark:bg-black/20 dark:border-white/10 dark:text-white">
                                        {selectedMember.role || 'member'}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Only admins can modify roles</p>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">Save</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Empty State */}
            {filteredList.length === 0 && (
                <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <span className="material-symbols-outlined text-5xl mb-4 text-gray-300 dark:text-white/20">person_off</span>
                    <h3 className="text-lg font-bold mb-2 text-gray-600 dark:text-white/70">
                        {searchQuery ? 'No results found' : 'No members yet'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-white/50 max-w-xs mx-auto">
                        {searchQuery 
                            ? 'Try a different search term or clear the filter.'
                            : 'Members will appear here once they sign up.'}
                    </p>
                </div>
            )}

            {/* Mobile View: Cards */}
            {filteredList.length > 0 && (
            <div className="md:hidden space-y-3">
                {filteredList.map(m => (
                    <div key={m.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div onClick={() => openEdit(m)} className="flex-1 cursor-pointer">
                                <h4 className="font-bold text-lg text-primary dark:text-white">{m.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <TierBadge tier={m.tier} size="sm" />
                                {m.tags?.map(tag => (
                                    <TagBadge key={tag} tag={tag} size="sm" />
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* View As - admin only */}
                                {isAdmin && (
                                    <button 
                                        onClick={() => handleViewAs(m)} 
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/20 text-brand-green dark:bg-accent/30 dark:text-accent text-xs font-bold hover:bg-accent/30 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                                        View As
                                    </button>
                                )}
                                <button onClick={() => openEdit(m)} className="text-primary dark:text-white text-xs font-bold">
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            )}

            {/* Desktop View: Table */}
            {filteredList.length > 0 && (
            <div className="hidden md:block bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Name</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Tier</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Email</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.map(m => (
                            <tr key={m.id} className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="p-4 font-medium text-primary dark:text-white">{m.name}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <TierBadge tier={m.tier} size="sm" />
                                        {m.tags?.map(tag => (
                                            <TagBadge key={tag} tag={tag} size="sm" />
                                        ))}
                                    </div>
                                </td>
                                <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{m.email}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        {/* View As - admin only */}
                                        {isAdmin && (
                                            <button 
                                                onClick={() => handleViewAs(m)} 
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/20 text-brand-green dark:bg-accent/30 dark:text-accent text-xs font-bold hover:bg-accent/30 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                View As
                                            </button>
                                        )}
                                        <button onClick={() => openEdit(m)} className="text-primary dark:text-white hover:underline text-xs font-bold">Edit</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}
        </div>
    );
};

// --- SIMULATOR ADMIN ---

interface BookingRequest {
    id: number;
    user_email: string;
    user_name: string;
    bay_id: number | null;
    bay_name: string | null;
    bay_preference: string | null;
    request_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    notes: string | null;
    status: 'pending' | 'pending_approval' | 'approved' | 'declined' | 'cancelled' | 'confirmed';
    staff_notes: string | null;
    suggested_time: string | null;
    created_at: string;
    source?: 'booking_request' | 'booking';
    resource_name?: string;
    first_name?: string;
    last_name?: string;
}

interface Bay {
    id: number;
    name: string;
    description: string;
}

const formatTime12 = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes?.toString().padStart(2, '0') || '00'} ${period}`;
};

const formatDateShort = (dateStr: string): string => {
    if (!dateStr) return 'No Date';
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const date = new Date(datePart + 'T12:00:00');
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatStatusLabel = (status: string): string => {
    switch (status) {
        case 'pending': return 'pending';
        case 'pending_approval': return 'pending';
        case 'approved': return 'approved';
        case 'confirmed': return 'confirmed';
        case 'declined': return 'declined';
        case 'cancelled': return 'cancelled';
        default: return status;
    }
};

interface Resource {
    id: number;
    name: string;
    type: string;
    description: string | null;
}

const SimulatorAdmin: React.FC = () => {
    const { user } = useData();
    const [activeView, setActiveView] = useState<'requests' | 'calendar'>('requests');
    const [requests, setRequests] = useState<BookingRequest[]>([]);
    const [bays, setBays] = useState<Bay[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [approvedBookings, setApprovedBookings] = useState<BookingRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
    const [actionModal, setActionModal] = useState<'approve' | 'decline' | null>(null);
    const [selectedBayId, setSelectedBayId] = useState<number | null>(null);
    const [staffNotes, setStaffNotes] = useState('');
    const [suggestedTime, setSuggestedTime] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [calendarDate, setCalendarDate] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const results = await Promise.allSettled([
                    fetch('/api/booking-requests?include_all=true'),
                    fetch('/api/pending-bookings'),
                    fetch('/api/bays'),
                    fetch('/api/resources')
                ]);
                
                let allRequests: BookingRequest[] = [];
                
                if (results[0].status === 'fulfilled' && results[0].value.ok) {
                    const data = await results[0].value.json();
                    allRequests = data.map((r: any) => ({ ...r, source: 'booking_request' as const }));
                }
                
                if (results[1].status === 'fulfilled' && results[1].value.ok) {
                    const pendingBookings = await results[1].value.json();
                    const mappedBookings = pendingBookings.map((b: any) => ({
                        id: b.id,
                        user_email: b.user_email,
                        user_name: b.first_name && b.last_name ? `${b.first_name} ${b.last_name}` : b.user_email,
                        bay_id: null,
                        bay_name: null,
                        bay_preference: b.resource_name || null,
                        request_date: b.booking_date,
                        start_time: b.start_time,
                        end_time: b.end_time,
                        duration_minutes: 60,
                        notes: b.notes,
                        status: b.status,
                        staff_notes: null,
                        suggested_time: null,
                        created_at: b.created_at,
                        source: 'booking' as const,
                        resource_name: b.resource_name
                    }));
                    allRequests = [...allRequests, ...mappedBookings];
                }
                
                setRequests(allRequests);
                
                if (results[2].status === 'fulfilled' && results[2].value.ok) {
                    const data = await results[2].value.json();
                    setBays(data);
                }
                
                if (results[3].status === 'fulfilled' && results[3].value.ok) {
                    const data = await results[3].value.json();
                    setResources(data);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchApprovedBookings = async () => {
            const startDate = calendarDate;
            const endDate = new Date(new Date(calendarDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            try {
                const res = await fetch(`/api/approved-bookings?start_date=${startDate}&end_date=${endDate}`);
                if (res.ok) {
                    const data = await res.json();
                    setApprovedBookings(data);
                }
            } catch (err) {
                console.error('Failed to fetch approved bookings:', err);
            }
        };
        if (activeView === 'calendar') {
            fetchApprovedBookings();
        }
    }, [activeView, calendarDate]);

    const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'pending_approval');
    const processedRequests = requests.filter(r => r.status !== 'pending' && r.status !== 'pending_approval');

    const handleApprove = async () => {
        if (!selectedRequest) return;
        
        if (selectedRequest.source !== 'booking' && !selectedBayId) {
            setError('Please select a bay');
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        
        try {
            let res;
            if (selectedRequest.source === 'booking') {
                res = await fetch(`/api/bookings/${selectedRequest.id}/approve`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                res = await fetch(`/api/booking-requests/${selectedRequest.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'approved',
                        bay_id: selectedBayId,
                        staff_notes: staffNotes || null,
                        reviewed_by: user?.email
                    })
                });
            }
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to approve');
            }
            
            const updated = await res.json();
            setRequests(prev => prev.map(r => 
                r.id === selectedRequest.id && r.source === selectedRequest.source 
                    ? { ...r, status: 'confirmed' as const } 
                    : r
            ));
            setActionModal(null);
            setSelectedRequest(null);
            setSelectedBayId(null);
            setStaffNotes('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (!selectedRequest) return;
        
        setIsProcessing(true);
        setError(null);
        
        try {
            let res;
            if (selectedRequest.source === 'booking') {
                res = await fetch(`/api/bookings/${selectedRequest.id}/decline`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                res = await fetch(`/api/booking-requests/${selectedRequest.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'declined',
                        staff_notes: staffNotes || null,
                        suggested_time: suggestedTime ? suggestedTime + ':00' : null,
                        reviewed_by: user?.email
                    })
                });
            }
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to decline');
            }
            
            setRequests(prev => prev.map(r => 
                r.id === selectedRequest.id && r.source === selectedRequest.source 
                    ? { ...r, status: 'declined' as const } 
                    : r
            ));
            setActionModal(null);
            setSelectedRequest(null);
            setStaffNotes('');
            setSuggestedTime('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': 
            case 'pending_approval': 
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
            case 'approved': 
            case 'confirmed':
                return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300';
            case 'declined': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400';
        }
    };

    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        for (let hour = 8; hour <= 21; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
            if (hour < 21) slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        return slots;
    }, []);

    return (
        <div className="flex justify-center">
            <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            {/* Tab Bar */}
            <div className="flex justify-center border-b border-gray-200 dark:border-white/10 mb-0">
                <button
                    onClick={() => setActiveView('requests')}
                    className={`py-3 px-6 font-medium text-sm transition-all relative ${
                        activeView === 'requests'
                            ? 'text-primary dark:text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    Queue {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                    {activeView === 'requests' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-white" />
                    )}
                </button>
                <button
                    onClick={() => setActiveView('calendar')}
                    className={`py-3 px-6 font-medium text-sm transition-all relative ${
                        activeView === 'calendar'
                            ? 'text-primary dark:text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    Calendar
                    {activeView === 'calendar' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-white" />
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-primary dark:text-white">progress_activity</span>
                </div>
            ) : activeView === 'requests' ? (
                <div className="space-y-6 p-5">
                    <div>
                        <h3 className="font-bold text-primary dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-yellow-500">pending</span>
                            Pending Requests ({pendingRequests.length})
                        </h3>
                        {pendingRequests.length === 0 ? (
                            <div className="py-8 text-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                                <p className="text-gray-400">No pending requests</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingRequests.map(req => (
                                    <div key={req.id} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="font-bold text-primary dark:text-white">{req.user_name || req.user_email}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDateShort(req.request_date)} • {formatTime12(req.start_time)} - {formatTime12(req.end_time)}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{req.duration_minutes} min</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(req.status)}`}>
                                                {formatStatusLabel(req.status)}
                                            </span>
                                        </div>
                                        
                                        {req.bay_preference && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                                <span className="font-medium">Bay preference:</span> {req.bay_preference}
                                            </p>
                                        )}
                                        {req.notes && (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 italic mb-3">"{req.notes}"</p>
                                        )}
                                        
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setSelectedRequest(req); setActionModal('approve'); setSelectedBayId(req.bay_id); }}
                                                className="flex-1 py-2 px-3 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-green-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">check</span>
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => { setSelectedRequest(req); setActionModal('decline'); }}
                                                className="flex-1 py-2 px-3 bg-red-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-red-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">close</span>
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-primary dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">history</span>
                            Recent Processed ({processedRequests.length})
                        </h3>
                        {processedRequests.length === 0 ? (
                            <div className="py-8 text-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                                <p className="text-gray-400">No processed requests yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {processedRequests.slice(0, 10).map(req => (
                                    <div key={req.id} className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-200 dark:border-white/10 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-primary dark:text-white text-sm">{req.user_name || req.user_email}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatDateShort(req.request_date)} • {formatTime12(req.start_time)}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(req.status)}`}>
                                            {formatStatusLabel(req.status)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                    {/* Date Selector Row */}
                    <div className="bg-gray-50 dark:bg-white/5 py-3 mb-4">
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => {
                                    const d = new Date(calendarDate);
                                    d.setDate(d.getDate() - 1);
                                    setCalendarDate(d.toISOString().split('T')[0]);
                                }}
                                className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <span className="material-symbols-outlined text-xl">chevron_left</span>
                            </button>
                            <button
                                onClick={() => setCalendarDate(new Date().toISOString().split('T')[0])}
                                className="font-semibold text-primary dark:text-white min-w-[120px] text-center text-sm py-1 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                {formatDateShort(calendarDate)}
                            </button>
                            <button
                                onClick={() => {
                                    const d = new Date(calendarDate);
                                    d.setDate(d.getDate() + 1);
                                    setCalendarDate(d.toISOString().split('T')[0]);
                                }}
                                className="p-1.5 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <span className="material-symbols-outlined text-xl">chevron_right</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex justify-center px-2 pb-4">
                        <div className="inline-block" style={{ marginLeft: '-20px' }}>
                            <div className="grid gap-0.5" style={{ gridTemplateColumns: `50px repeat(${resources.length}, 52px)` }}>
                                <div className="h-10"></div>
                                {resources.map(resource => (
                                    <div key={resource.id} className={`h-10 flex items-center justify-center font-bold text-[10px] text-primary dark:text-white bg-white dark:bg-surface-dark rounded-t-lg border border-gray-200 dark:border-white/10 px-0.5 ${resource.type === 'conference_room' ? 'bg-purple-50 dark:bg-purple-500/10' : ''}`}>
                                        {resource.type === 'conference_room' ? 'Conf' : resource.name.replace('Simulator Bay ', 'Bay ')}
                                    </div>
                                ))}
                                
                                {timeSlots.map(slot => (
                                    <React.Fragment key={slot}>
                                        <div className="h-8 flex items-center justify-end pr-1 text-[9px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                                            {formatTime12(slot)}
                                        </div>
                                        {resources.map(resource => {
                                            const [slotHour, slotMin] = slot.split(':').map(Number);
                                            const slotStart = slotHour * 60 + slotMin;
                                            const slotEnd = slotStart + 30;
                                            
                                            const booking = approvedBookings.find(b => {
                                                if (b.bay_id !== resource.id || b.request_date !== calendarDate) return false;
                                                const [bh, bm] = b.start_time.split(':').map(Number);
                                                const [eh, em] = b.end_time.split(':').map(Number);
                                                const bookStart = bh * 60 + bm;
                                                const bookEnd = eh * 60 + em;
                                                return slotStart < bookEnd && slotEnd > bookStart;
                                            });
                                            
                                            const isConference = resource.type === 'conference_room';
                                            
                                            return (
                                                <div
                                                    key={`${resource.id}-${slot}`}
                                                    className={`h-8 rounded border ${
                                                        booking 
                                                            ? isConference
                                                                ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-300 dark:border-purple-500/30'
                                                                : 'bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/30' 
                                                            : isConference
                                                                ? 'bg-purple-50/50 dark:bg-purple-500/5 border-purple-100 dark:border-purple-500/10 hover:bg-purple-100/50 dark:hover:bg-purple-500/10'
                                                                : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    {booking && (
                                                        <div className="px-1 h-full flex items-center">
                                                            <p className={`text-[10px] font-medium truncate ${isConference ? 'text-purple-700 dark:text-purple-300' : 'text-green-700 dark:text-green-300'}`}>
                                                                {booking.user_name || 'Booked'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {actionModal && selectedRequest && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50" onClick={() => { setActionModal(null); setSelectedRequest(null); setError(null); }} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 max-w-md w-full shadow-xl pointer-events-auto">
                            <h3 className="text-xl font-bold text-primary dark:text-white mb-4">
                                {actionModal === 'approve' ? 'Approve Request' : 'Decline Request'}
                            </h3>
                            
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                <p className="font-medium text-primary dark:text-white">{selectedRequest.user_name || selectedRequest.user_email}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatDateShort(selectedRequest.request_date)} • {formatTime12(selectedRequest.start_time)} - {formatTime12(selectedRequest.end_time)}
                                </p>
                            </div>
                            
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}
                            
                            {actionModal === 'approve' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign Resource *</label>
                                    <select
                                        value={selectedBayId || ''}
                                        onChange={(e) => setSelectedBayId(Number(e.target.value))}
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    >
                                        <option value="">Select a resource...</option>
                                        {resources.map(resource => (
                                            <option key={resource.id} value={resource.id}>
                                                {resource.type === 'conference_room' ? 'Conference Room' : resource.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {actionModal === 'decline' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Suggest Alternative Time (Optional)</label>
                                    <input
                                        type="time"
                                        value={suggestedTime}
                                        onChange={(e) => setSuggestedTime(e.target.value)}
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>
                            )}
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Staff Notes (Optional)</label>
                                <textarea
                                    value={staffNotes}
                                    onChange={(e) => setStaffNotes(e.target.value)}
                                    placeholder="Add a note for the member..."
                                    rows={2}
                                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white resize-none"
                                />
                            </div>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setActionModal(null); setSelectedRequest(null); setError(null); }}
                                    className="flex-1 py-3 px-4 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={actionModal === 'approve' ? handleApprove : handleDecline}
                                    disabled={isProcessing || (actionModal === 'approve' && !selectedBayId)}
                                    className={`flex-1 py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 ${
                                        actionModal === 'approve' 
                                            ? 'bg-green-500 hover:bg-green-600' 
                                            : 'bg-red-500 hover:bg-red-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isProcessing ? (
                                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-sm">
                                            {actionModal === 'approve' ? 'check' : 'close'}
                                        </span>
                                    )}
                                    {actionModal === 'approve' ? 'Approve' : 'Decline'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            </div>
        </div>
    );
};

// --- WELLNESS ADMIN ---

interface WellnessClass {
  id: number;
  title: string;
  time: string;
  instructor: string;
  duration: string;
  category: string;
  spots: string;
  status: string;
  description: string | null;
  date: string;
  is_active: boolean;
}

const WellnessAdmin: React.FC = () => {
    const [classes, setClasses] = useState<WellnessClass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<WellnessClass>>({
        category: 'Yoga',
        status: 'available',
        duration: '60 min'
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isViewingEnrollments, setIsViewingEnrollments] = useState(false);
    const [selectedClass, setSelectedClass] = useState<WellnessClass | null>(null);
    const [enrollments, setEnrollments] = useState<Participant[]>([]);
    const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);

    const categories = ['Yoga', 'Pilates', 'Meditation', 'HIIT', 'Stretch'];

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/wellness-classes');
            if (res.ok) {
                const data = await res.json();
                setClasses(data);
            }
        } catch (err) {
            console.error('Error fetching wellness classes:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const openEdit = (cls: WellnessClass) => {
        setFormData({
            ...cls,
            date: cls.date.split('T')[0]
        });
        setEditId(cls.id);
        setIsEditing(true);
        setError(null);
    };

    const openCreate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFormData({
            category: 'Yoga',
            status: 'available',
            duration: '60 min',
            date: tomorrow.toISOString().split('T')[0]
        });
        setEditId(null);
        setIsEditing(true);
        setError(null);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.time || !formData.instructor || !formData.date || !formData.spots) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setError(null);
            const url = editId ? `/api/wellness-classes/${editId}` : '/api/wellness-classes';
            const method = editId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                await fetchClasses();
                setIsEditing(false);
                setFormData({ category: 'Yoga', status: 'available', duration: '60 min' });
                setSuccess(editId ? 'Class updated successfully' : 'Class created successfully');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to save class');
            }
        } catch (err) {
            setError('Failed to save class');
        }
    };

    const handleDelete = async (cls: WellnessClass) => {
        if (!window.confirm(`Delete "${cls.title}"?`)) return;

        try {
            const res = await fetch(`/api/wellness-classes/${cls.id}`, { method: 'DELETE' });
            if (res.ok) {
                setClasses(prev => prev.filter(c => c.id !== cls.id));
                setSuccess('Class deleted');
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err) {
            console.error('Error deleting class:', err);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'No Date';
        const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const date = new Date(datePart + 'T12:00:00');
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const handleSyncCalendars = async () => {
        setIsSyncing(true);
        setSuccess(null);
        setError(null);
        try {
            const res = await fetch('/api/calendars/sync-all', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setSuccess(data.message);
                await fetchClasses();
            } else {
                setError(`Sync failed: ${data.error || data.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Failed to sync calendars:', err);
            setError('Failed to sync with Google Calendar');
        } finally {
            setIsSyncing(false);
            setTimeout(() => { setSuccess(null); setError(null); }, 5000);
        }
    };

    const handleViewEnrollments = async (cls: WellnessClass) => {
        setSelectedClass(cls);
        setIsViewingEnrollments(true);
        setIsLoadingEnrollments(true);
        try {
            const res = await fetch(`/api/wellness-classes/${cls.id}/enrollments`);
            if (res.ok) {
                const data = await res.json();
                setEnrollments(data);
            }
        } catch (err) {
            console.error('Failed to fetch enrollments:', err);
        } finally {
            setIsLoadingEnrollments(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/10">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-primary dark:text-white">Wellness Classes</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Schedule and manage wellness classes for members
                    </p>
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={handleSyncCalendars}
                            disabled={isSyncing}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined text-lg ${isSyncing ? 'animate-spin' : ''}`}>
                                {isSyncing ? 'progress_activity' : 'calendar_month'}
                            </span>
                            {isSyncing ? 'Syncing...' : 'Sync'}
                        </button>
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 min-h-[44px] rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Class
                        </button>
                    </div>
                </div>

                {success && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
                        {success}
                    </div>
                )}

                {error && !isEditing && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="py-8 text-center text-gray-500">Loading...</div>
                ) : classes.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No wellness classes scheduled. Add your first class!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {classes.map(cls => (
                            <div 
                                key={cls.id}
                                className={`flex items-center justify-between p-4 rounded-xl border ${
                                    cls.is_active 
                                        ? 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/10' 
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/5 opacity-60'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-brand-green">
                                        <span className="material-symbols-outlined">spa</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-primary dark:text-white">{cls.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(cls.date)} at {cls.time} • {cls.instructor}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 dark:bg-white/10 text-primary dark:text-white">{cls.category}</span>
                                            <span className="text-xs text-gray-400">{cls.duration} • {cls.spots}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleViewEnrollments(cls)}
                                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        title="View Enrollments"
                                    >
                                        <span className="material-symbols-outlined text-xl">group</span>
                                    </button>
                                    <button
                                        onClick={() => openEdit(cls)}
                                        className="p-2 rounded-lg text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                        title="Edit"
                                    >
                                        <span className="material-symbols-outlined text-xl">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cls)}
                                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Delete"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ParticipantDetailsModal
                isOpen={isViewingEnrollments}
                onClose={() => { setIsViewingEnrollments(false); setSelectedClass(null); setEnrollments([]); }}
                title={selectedClass?.title || 'Class Enrollments'}
                subtitle={selectedClass ? `${formatDate(selectedClass.date)} at ${selectedClass.time}` : undefined}
                participants={enrollments}
                isLoading={isLoadingEnrollments}
                type="enrollment"
            />

            {isEditing && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50" onClick={() => { setIsEditing(false); setError(null); }} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto">
                            <h3 className="text-xl font-bold text-primary dark:text-white mb-4">
                                {editId ? 'Edit Class' : 'Add Class'}
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title || ''}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Morning Yoga Flow"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                                        <input
                                            type="date"
                                            value={formData.date || ''}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time *</label>
                                        <input
                                            type="text"
                                            value={formData.time || ''}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            placeholder="9:00 AM"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructor *</label>
                                    <input
                                        type="text"
                                        value={formData.instructor || ''}
                                        onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                                        placeholder="Jane Smith"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                        <select
                                            value={formData.category || 'Yoga'}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                                        <input
                                            type="text"
                                            value={formData.duration || ''}
                                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                            placeholder="60 min"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spots *</label>
                                    <input
                                        type="text"
                                        value={formData.spots || ''}
                                        onChange={(e) => setFormData({ ...formData, spots: e.target.value })}
                                        placeholder="12 spots"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="A restorative session designed to improve flexibility..."
                                        rows={3}
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white resize-none"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-600 text-sm">{error}</p>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => { setIsEditing(false); setError(null); }}
                                    className="flex-1 py-3 px-4 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-3 px-4 rounded-lg bg-brand-green text-white font-medium hover:opacity-90"
                                >
                                    {editId ? 'Save Changes' : 'Add Class'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// --- TEAM ADMIN (Admin only) - Wrapper for Staff and Admins ---

const TeamAdmin: React.FC = () => {
    const [subTab, setSubTab] = useState<'staff' | 'admins'>('staff');

    return (
        <div>
            {/* Sub-tab navigation */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setSubTab('staff')}
                    className={`px-4 py-2 min-h-[44px] rounded-lg font-bold text-sm flex items-center gap-1.5 transition-colors ${
                        subTab === 'staff' 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                    Staff
                </button>
                <button
                    onClick={() => setSubTab('admins')}
                    className={`px-4 py-2 min-h-[44px] rounded-lg font-bold text-sm flex items-center gap-1.5 transition-colors ${
                        subTab === 'admins' 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">shield_person</span>
                    Admins
                </button>
            </div>

            {/* Content */}
            {subTab === 'staff' && <StaffAdmin />}
            {subTab === 'admins' && <AdminsAdmin />}
        </div>
    );
};

// --- STAFF ADMIN (Admin only) ---

interface StaffUser {
  id: number;
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

const StaffAdmin: React.FC = () => {
    const { actualUser } = useData();
    const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchStaffUsers();
    }, []);

    const fetchStaffUsers = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch('/api/staff-users', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setStaffUsers(data);
            } else {
                const errorData = await res.json().catch(() => ({}));
                setError(errorData.message || `Failed to load staff (${res.status})`);
            }
        } catch (err) {
            console.error('Error fetching staff users:', err);
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddStaff = async () => {
        if (!newEmail.trim()) {
            setError('Email is required');
            return;
        }

        try {
            setError(null);
            const res = await fetch('/api/staff-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: newEmail.trim(),
                    name: newName.trim() || null,
                    created_by: actualUser?.email
                })
            });

            if (res.ok) {
                const newStaff = await res.json();
                setStaffUsers(prev => [newStaff, ...prev]);
                setNewEmail('');
                setNewName('');
                setIsAdding(false);
                setSuccess('Staff member added successfully');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to add staff member');
            }
        } catch (err) {
            setError('Failed to add staff member');
        }
    };

    const handleToggleActive = async (staff: StaffUser) => {
        try {
            const res = await fetch(`/api/staff-users/${staff.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: !staff.is_active })
            });

            if (res.ok) {
                setStaffUsers(prev => prev.map(s => 
                    s.id === staff.id ? { ...s, is_active: !s.is_active } : s
                ));
            }
        } catch (err) {
            console.error('Error toggling staff status:', err);
        }
    };

    const handleRemoveStaff = async (staff: StaffUser) => {
        if (!window.confirm(`Remove ${staff.email} from staff?`)) return;

        try {
            const res = await fetch(`/api/staff-users/${staff.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                setStaffUsers(prev => prev.filter(s => s.id !== staff.id));
                setSuccess('Staff member removed');
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err) {
            console.error('Error removing staff:', err);
        }
    };

    const openEditModal = (staff: StaffUser) => {
        setSelectedStaff({...staff});
        setIsEditing(true);
        setError(null);
    };

    const handleEditSave = async () => {
        if (!selectedStaff) return;

        try {
            setError(null);
            const res = await fetch(`/api/staff-users/${selectedStaff.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: selectedStaff.name,
                    email: selectedStaff.email,
                    first_name: selectedStaff.first_name,
                    last_name: selectedStaff.last_name,
                    phone: selectedStaff.phone,
                    job_title: selectedStaff.job_title
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setStaffUsers(prev => prev.map(s => s.id === updated.id ? updated : s));
                setIsEditing(false);
                setSelectedStaff(null);
                setSuccess('Staff member updated');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to update staff member');
            }
        } catch (err) {
            setError('Failed to update staff member');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-primary dark:text-white">Staff Access List</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Add email addresses to grant staff portal access
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 min-h-[44px] rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Staff
                    </button>
                </div>

                {success && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
                        {success}
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="py-8 text-center text-gray-500">Loading...</div>
                ) : staffUsers.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No staff members added yet. Add an email to grant staff access.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {staffUsers.map(staff => (
                            <div 
                                key={staff.id}
                                onClick={() => openEditModal(staff)}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors hover:border-primary/50 ${
                                    staff.is_active 
                                        ? 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-surface-dark' 
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/5 opacity-60'
                                }`}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        staff.is_active ? 'bg-brand-green/10 text-brand-green' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}>
                                        <span className="material-symbols-outlined">badge</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-primary dark:text-white">{staff.name || staff.email}</p>
                                        {staff.name && <p className="text-sm text-gray-500 dark:text-gray-400">{staff.email}</p>}
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            {staff.is_active ? 'Active' : 'Inactive'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleActive(staff)}
                                        className={`p-2 rounded-lg transition-colors ${
                                            staff.is_active 
                                                ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' 
                                                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                        }`}
                                        title={staff.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {staff.is_active ? 'toggle_on' : 'toggle_off'}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleRemoveStaff(staff)}
                                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Remove"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isAdding && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50" onClick={() => { setIsAdding(false); setError(null); setNewEmail(''); setNewName(''); }} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md pointer-events-auto">
                            <h3 className="text-xl font-bold text-primary dark:text-white mb-4">Add Staff Member</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="staff@example.com"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Name (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Jane Doe"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-600 text-sm">{error}</p>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => { setIsAdding(false); setError(null); setNewEmail(''); setNewName(''); }}
                                    className="flex-1 py-3 px-4 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddStaff}
                                    className="flex-1 py-3 px-4 rounded-lg bg-brand-green text-white font-medium hover:opacity-90"
                                >
                                    Add Staff
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isEditing && selectedStaff && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50" onClick={() => { setIsEditing(false); setSelectedStaff(null); setError(null); }} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md pointer-events-auto">
                            <h3 className="text-xl font-bold text-primary dark:text-white mb-4">Edit Staff Member</h3>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedStaff.first_name || ''}
                                            onChange={(e) => setSelectedStaff({...selectedStaff, first_name: e.target.value || null})}
                                            placeholder="Jane"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedStaff.last_name || ''}
                                            onChange={(e) => setSelectedStaff({...selectedStaff, last_name: e.target.value || null})}
                                            placeholder="Doe"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={selectedStaff.email}
                                        onChange={(e) => setSelectedStaff({...selectedStaff, email: e.target.value})}
                                        placeholder="staff@example.com"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={selectedStaff.phone || ''}
                                        onChange={(e) => setSelectedStaff({...selectedStaff, phone: e.target.value || null})}
                                        placeholder="+1 (555) 123-4567"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Job Title
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedStaff.job_title || ''}
                                        onChange={(e) => setSelectedStaff({...selectedStaff, job_title: e.target.value || null})}
                                        placeholder="Manager"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-600 text-sm">{error}</p>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => { setIsEditing(false); setSelectedStaff(null); setError(null); }}
                                    className="flex-1 py-3 px-4 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditSave}
                                    className="flex-1 py-3 px-4 rounded-lg bg-brand-green text-white font-medium hover:opacity-90"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// --- ADMINS ADMIN (Admin only) ---

interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

const AdminsAdmin: React.FC = () => {
    const { actualUser } = useData();
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchAdminUsers();
    }, []);

    const fetchAdminUsers = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/admin-users', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setAdminUsers(data);
            }
        } catch (err) {
            console.error('Error fetching admin users:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!newEmail.trim()) {
            setError('Email is required');
            return;
        }

        try {
            setError(null);
            const res = await fetch('/api/admin-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: newEmail.trim(),
                    name: newName.trim() || null,
                    created_by: actualUser?.email
                })
            });

            if (res.ok) {
                const newAdmin = await res.json();
                setAdminUsers(prev => [newAdmin, ...prev]);
                setNewEmail('');
                setNewName('');
                setIsAdding(false);
                setSuccess('Admin added successfully');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to add admin');
            }
        } catch (err) {
            setError('Failed to add admin');
        }
    };

    const handleToggleActive = async (admin: AdminUser) => {
        const activeCount = adminUsers.filter(a => a.is_active).length;
        if (admin.is_active && activeCount <= 1) {
            setError('Cannot deactivate the last active admin');
            setTimeout(() => setError(null), 3000);
            return;
        }

        try {
            const res = await fetch(`/api/admin-users/${admin.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: !admin.is_active })
            });

            if (res.ok) {
                setAdminUsers(prev => prev.map(a => 
                    a.id === admin.id ? { ...a, is_active: !a.is_active } : a
                ));
            }
        } catch (err) {
            console.error('Error toggling admin status:', err);
        }
    };

    const handleRemoveAdmin = async (admin: AdminUser) => {
        const activeCount = adminUsers.filter(a => a.is_active).length;
        if (admin.is_active && activeCount <= 1) {
            setError('Cannot remove the last active admin');
            setTimeout(() => setError(null), 3000);
            return;
        }

        if (!window.confirm(`Remove ${admin.email} from admins?`)) return;

        try {
            const res = await fetch(`/api/admin-users/${admin.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                setAdminUsers(prev => prev.filter(a => a.id !== admin.id));
                setSuccess('Admin removed');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to remove admin');
                setTimeout(() => setError(null), 3000);
            }
        } catch (err) {
            console.error('Error removing admin:', err);
        }
    };

    const openEditModal = (admin: AdminUser) => {
        setSelectedAdmin({...admin});
        setIsEditing(true);
        setError(null);
    };

    const handleEditSave = async () => {
        if (!selectedAdmin) return;

        try {
            setError(null);
            const res = await fetch(`/api/admin-users/${selectedAdmin.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: selectedAdmin.name,
                    email: selectedAdmin.email,
                    first_name: selectedAdmin.first_name,
                    last_name: selectedAdmin.last_name,
                    phone: selectedAdmin.phone,
                    job_title: selectedAdmin.job_title
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setAdminUsers(prev => prev.map(a => a.id === updated.id ? updated : a));
                setIsEditing(false);
                setSelectedAdmin(null);
                setSuccess('Admin updated');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to update admin');
            }
        } catch (err) {
            setError('Failed to update admin');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-primary dark:text-white">Admin Access List</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Add email addresses to grant admin portal access
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Admin
                    </button>
                </div>

                {success && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
                        {success}
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="py-8 text-center text-gray-500">Loading...</div>
                ) : adminUsers.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No admins configured. Add an email to grant admin access.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {adminUsers.map(admin => (
                            <div 
                                key={admin.id}
                                onClick={() => openEditModal(admin)}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors hover:border-primary/50 ${
                                    admin.is_active 
                                        ? 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-surface-dark' 
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/5 opacity-60'
                                }`}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        admin.is_active ? 'bg-amber-500/10 text-amber-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}>
                                        <span className="material-symbols-outlined">shield_person</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-primary dark:text-white">{admin.name || admin.email}</p>
                                        {admin.name && <p className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</p>}
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                            {admin.is_active ? 'Active' : 'Inactive'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleActive(admin)}
                                        className={`p-2 rounded-lg transition-colors ${
                                            admin.is_active 
                                                ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' 
                                                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                        }`}
                                        title={admin.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {admin.is_active ? 'toggle_on' : 'toggle_off'}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleRemoveAdmin(admin)}
                                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Remove"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isAdding && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50" onClick={() => { setIsAdding(false); setError(null); setNewEmail(''); setNewName(''); }} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md pointer-events-auto">
                            <h3 className="text-xl font-bold text-primary dark:text-white mb-4">Add Admin</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="admin@example.com"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Name (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-600 text-sm">{error}</p>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => { setIsAdding(false); setError(null); setNewEmail(''); setNewName(''); }}
                                    className="flex-1 py-3 px-4 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddAdmin}
                                    className="flex-1 py-3 px-4 rounded-lg bg-brand-green text-white font-medium hover:opacity-90"
                                >
                                    Add Admin
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isEditing && selectedAdmin && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50" onClick={() => { setIsEditing(false); setSelectedAdmin(null); setError(null); }} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md pointer-events-auto">
                            <h3 className="text-xl font-bold text-primary dark:text-white mb-4">Edit Admin</h3>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedAdmin.first_name || ''}
                                            onChange={(e) => setSelectedAdmin({...selectedAdmin, first_name: e.target.value || null})}
                                            placeholder="Jane"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            value={selectedAdmin.last_name || ''}
                                            onChange={(e) => setSelectedAdmin({...selectedAdmin, last_name: e.target.value || null})}
                                            placeholder="Doe"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={selectedAdmin.email}
                                        onChange={(e) => setSelectedAdmin({...selectedAdmin, email: e.target.value})}
                                        placeholder="admin@example.com"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={selectedAdmin.phone || ''}
                                        onChange={(e) => setSelectedAdmin({...selectedAdmin, phone: e.target.value || null})}
                                        placeholder="+1 (555) 123-4567"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Job Title
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedAdmin.job_title || ''}
                                        onChange={(e) => setSelectedAdmin({...selectedAdmin, job_title: e.target.value || null})}
                                        placeholder="Director"
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-600 text-sm">{error}</p>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => { setIsEditing(false); setSelectedAdmin(null); setError(null); }}
                                    className="flex-1 py-3 px-4 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditSave}
                                    className="flex-1 py-3 px-4 rounded-lg bg-brand-green text-white font-medium hover:opacity-90"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// --- DATA CONFLICTS ADMIN ---

interface TierConflict {
    id: number;
    userId: string;
    email: string;
    mindbodyId: string;
    firstName: string;
    lastName: string;
    currentTier: string;
    incomingTier: string;
    source: string;
    status: string;
    createdAt: string;
}

const DataConflictsAdmin: React.FC = () => {
    const [conflicts, setConflicts] = useState<TierConflict[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchConflicts = async () => {
        try {
            const res = await fetch('/api/admin/data-conflicts');
            if (res.ok) {
                const data = await res.json();
                setConflicts(data);
            }
        } catch (err) {
            console.error('Failed to fetch conflicts:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConflicts();
    }, []);

    const handleAccept = async (id: number) => {
        setActionLoading(id);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/data-conflicts/${id}/accept`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: `Tier updated to ${data.newTier}` });
                setConflicts(prev => prev.filter(c => c.id !== id));
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setActionLoading(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleIgnore = async (id: number) => {
        setActionLoading(id);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/data-conflicts/${id}/ignore`, { method: 'POST' });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Conflict dismissed' });
                setConflicts(prev => prev.filter(c => c.id !== id));
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to dismiss' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setActionLoading(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
    };

    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'mindbody_csv': return 'Mindbody CSV';
            case 'hubspot': return 'HubSpot';
            default: return source;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary/50">progress_activity</span>
            </div>
        );
    }

    return (
        <div>
            {message && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    message.type === 'success' 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                    {message.text}
                </div>
            )}

            {conflicts.length === 0 ? (
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-8 text-center shadow-sm border border-gray-100 dark:border-white/5">
                    <span className="material-symbols-outlined text-5xl text-green-500 mb-3 block">check_circle</span>
                    <h3 className="text-lg font-bold text-primary dark:text-white mb-2">All Clear!</h3>
                    <p className="text-gray-500 dark:text-gray-400">No membership tier conflicts detected.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} require{conflicts.length === 1 ? 's' : ''} review
                    </p>
                    
                    {conflicts.map(conflict => (
                        <div 
                            key={conflict.id} 
                            className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-amber-200 dark:border-amber-800/30"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-primary dark:text-white truncate">
                                            {conflict.firstName} {conflict.lastName}
                                        </h4>
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                                            {getSourceLabel(conflict.source)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conflict.email}</p>
                                    
                                    <div className="flex items-center gap-2 mt-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-gray-400 dark:text-gray-500">App:</span>
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                {conflict.currentTier || 'Guest'}
                                            </span>
                                        </div>
                                        <span className="material-symbols-outlined text-lg text-amber-500">arrow_forward</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-gray-400 dark:text-gray-500">New:</span>
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                                {conflict.incomingTier}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                                        Detected {formatDate(conflict.createdAt)}
                                    </p>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handleAccept(conflict.id)}
                                        disabled={actionLoading === conflict.id}
                                        className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {actionLoading === conflict.id ? (
                                            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-sm">check</span>
                                        )}
                                        Accept New
                                    </button>
                                    <button
                                        onClick={() => handleIgnore(conflict.id)}
                                        disabled={actionLoading === conflict.id}
                                        className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                        Ignore
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- TIERS ADMIN ---

interface MembershipTier {
    id: number;
    name: string;
    slug: string;
    price_string: string;
    description: string | null;
    button_text: string;
    sort_order: number;
    is_active: boolean;
    is_popular: boolean;
    highlighted_features: string[];
    all_features: Record<string, boolean>;
    daily_sim_minutes: number;
    guest_passes_per_month: number;
    booking_window_days: number;
    daily_conf_room_minutes: number;
    can_book_simulators: boolean;
    can_book_conference: boolean;
    can_book_wellness: boolean;
    has_group_lessons: boolean;
    has_extended_sessions: boolean;
    has_private_lesson: boolean;
    has_simulator_guest_passes: boolean;
    has_discounted_merch: boolean;
    unlimited_access: boolean;
}

const BOOLEAN_FIELDS = [
    { key: 'can_book_simulators', label: 'Can Book Simulators' },
    { key: 'can_book_conference', label: 'Can Book Conference Room' },
    { key: 'can_book_wellness', label: 'Can Book Wellness' },
    { key: 'has_group_lessons', label: 'Has Group Lessons' },
    { key: 'has_extended_sessions', label: 'Has Extended Sessions' },
    { key: 'has_private_lesson', label: 'Has Private Lesson' },
    { key: 'has_simulator_guest_passes', label: 'Has Simulator Guest Passes' },
    { key: 'has_discounted_merch', label: 'Has Discounted Merch' },
    { key: 'unlimited_access', label: 'Unlimited Access' },
] as const;

const TiersAdmin: React.FC = () => {
    const [tiers, setTiers] = useState<MembershipTier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [newFeatureKey, setNewFeatureKey] = useState('');

    const fetchTiers = async () => {
        try {
            const res = await fetch('/api/membership-tiers');
            const data = await res.json();
            setTiers(data.map((t: any) => ({
                ...t,
                highlighted_features: Array.isArray(t.highlighted_features) ? t.highlighted_features : 
                    (typeof t.highlighted_features === 'string' ? JSON.parse(t.highlighted_features || '[]') : []),
                all_features: typeof t.all_features === 'object' && t.all_features !== null ? t.all_features :
                    (typeof t.all_features === 'string' ? JSON.parse(t.all_features || '{}') : {})
            })));
        } catch (err) {
            console.error('Failed to fetch tiers:', err);
            setError('Failed to load tiers');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTiers();
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isEditing) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = `-${window.scrollY}px`;
        } else {
            const scrollY = document.body.style.top;
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
        };
    }, [isEditing]);

    const openEdit = (tier: MembershipTier) => {
        setSelectedTier({
            ...tier,
            highlighted_features: Array.isArray(tier.highlighted_features) ? [...tier.highlighted_features] : [],
            all_features: typeof tier.all_features === 'object' && tier.all_features !== null ? { ...tier.all_features } : {}
        });
        setIsEditing(true);
        setError(null);
        setSuccessMessage(null);
    };

    const handleSave = async () => {
        if (!selectedTier) return;
        setIsSaving(true);
        setError(null);
        
        try {
            const res = await fetch(`/api/membership-tiers/${selectedTier.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(selectedTier)
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save tier');
            }
            
            await fetchTiers();
            setSuccessMessage('Tier updated successfully');
            setTimeout(() => {
                setIsEditing(false);
                setSuccessMessage(null);
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Failed to save tier');
        } finally {
            setIsSaving(false);
        }
    };

    const handleHighlightToggle = (feature: string) => {
        if (!selectedTier) return;
        const current = selectedTier.highlighted_features || [];
        
        if (current.includes(feature)) {
            setSelectedTier({
                ...selectedTier,
                highlighted_features: current.filter(f => f !== feature)
            });
        } else if (current.length < 4) {
            setSelectedTier({
                ...selectedTier,
                highlighted_features: [...current, feature]
            });
        }
    };

    const handleAddFeature = () => {
        if (!selectedTier || !newFeatureKey.trim()) return;
        const key = newFeatureKey.trim();
        setSelectedTier({
            ...selectedTier,
            all_features: { ...selectedTier.all_features, [key]: true }
        });
        setNewFeatureKey('');
    };

    const handleRemoveFeature = (key: string) => {
        if (!selectedTier) return;
        const newFeatures = { ...selectedTier.all_features };
        delete newFeatures[key];
        setSelectedTier({
            ...selectedTier,
            all_features: newFeatures,
            highlighted_features: selectedTier.highlighted_features.filter(f => f !== key)
        });
    };

    const handleToggleFeature = (key: string) => {
        if (!selectedTier) return;
        setSelectedTier({
            ...selectedTier,
            all_features: {
                ...selectedTier.all_features,
                [key]: !selectedTier.all_features[key]
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary/50">progress_activity</span>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tiers.length} membership tier{tiers.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Edit Modal - Native sheet style for reliable mobile scrolling */}
            {isEditing && selectedTier && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
                    <div className="relative flex flex-col max-w-2xl w-full bg-white dark:bg-[#1a1d15] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 max-h-[calc(100vh-2rem)] min-h-0 overflow-hidden">
                            {/* Header - Fixed */}
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d15] flex-shrink-0">
                                <h3 className="font-bold text-lg text-primary dark:text-white">Edit Tier: {selectedTier.name}</h3>
                                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4" style={{ touchAction: 'pan-y' }}>
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                                    {successMessage}
                                </div>
                            )}

                            {/* Display Fields */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Display Fields</h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Name</label>
                                            <input 
                                                className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                                                value={selectedTier.name} 
                                                onChange={e => setSelectedTier({...selectedTier, name: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Price String</label>
                                            <input 
                                                className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                                                value={selectedTier.price_string} 
                                                onChange={e => setSelectedTier({...selectedTier, price_string: e.target.value})} 
                                                placeholder="e.g., $199/mo"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Description</label>
                                        <textarea 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" 
                                            rows={2}
                                            value={selectedTier.description || ''} 
                                            onChange={e => setSelectedTier({...selectedTier, description: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Button Text</label>
                                        <input 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                                            value={selectedTier.button_text} 
                                            onChange={e => setSelectedTier({...selectedTier, button_text: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Logic Fields */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Limits & Quotas</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Daily Sim Minutes</label>
                                        <input 
                                            type="number"
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                                            value={selectedTier.daily_sim_minutes} 
                                            onChange={e => setSelectedTier({...selectedTier, daily_sim_minutes: parseInt(e.target.value) || 0})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Guest Passes / Month</label>
                                        <input 
                                            type="number"
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                                            value={selectedTier.guest_passes_per_month} 
                                            onChange={e => setSelectedTier({...selectedTier, guest_passes_per_month: parseInt(e.target.value) || 0})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Booking Window (Days)</label>
                                        <input 
                                            type="number"
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                                            value={selectedTier.booking_window_days} 
                                            onChange={e => setSelectedTier({...selectedTier, booking_window_days: parseInt(e.target.value) || 0})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Daily Conf Room Minutes</label>
                                        <input 
                                            type="number"
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                                            value={selectedTier.daily_conf_room_minutes} 
                                            onChange={e => setSelectedTier({...selectedTier, daily_conf_room_minutes: parseInt(e.target.value) || 0})} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Boolean Toggles - iOS Style */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Permissions</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {BOOLEAN_FIELDS.map(({ key, label }) => (
                                        <label key={key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/30 transition-colors">
                                            <span className="text-sm text-primary dark:text-white pr-2">{label}</span>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={!!selectedTier[key as keyof MembershipTier]}
                                                onClick={() => setSelectedTier({...selectedTier, [key]: !selectedTier[key as keyof MembershipTier]})}
                                                className={`relative w-[51px] h-[31px] min-w-[51px] min-h-[31px] flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34C759] ${selectedTier[key as keyof MembershipTier] ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            >
                                                <span className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md transition-all duration-200 ${selectedTier[key as keyof MembershipTier] ? 'right-[2px]' : 'left-[2px]'}`} />
                                            </button>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* All Features (JSON Editor) */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">All Features</h4>
                                <div className="space-y-2 mb-3">
                                    {Object.entries(selectedTier.all_features || {}).map(([key, enabled]) => (
                                        <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleFeature(key)}
                                                    className={`w-4 h-4 rounded border flex items-center justify-center ${enabled ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-600'}`}
                                                >
                                                    {enabled && <span className="material-symbols-outlined text-xs">check</span>}
                                                </button>
                                                <span className={`text-sm ${enabled ? 'text-primary dark:text-white' : 'text-gray-400 line-through'}`}>{key}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFeature(key)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2 rounded-xl text-primary dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                                        placeholder="Add new feature..."
                                        value={newFeatureKey}
                                        onChange={e => setNewFeatureKey(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddFeature()}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddFeature}
                                        className="px-3 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                    </button>
                                </div>
                            </div>

                            {/* Highlights Selector */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                    Highlighted Features 
                                    <span className="text-gray-400 font-normal ml-1">({selectedTier.highlighted_features?.length || 0}/4)</span>
                                </h4>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Select up to 4 features to highlight on the membership page</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(selectedTier.all_features || {}).filter(([_, enabled]) => enabled).map(([key]) => {
                                        const isHighlighted = selectedTier.highlighted_features?.includes(key);
                                        const canAdd = (selectedTier.highlighted_features?.length || 0) < 4;
                                        return (
                                            <label 
                                                key={key} 
                                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                                    isHighlighted 
                                                        ? 'bg-primary/10 dark:bg-primary/20 border-primary text-primary dark:text-white' 
                                                        : canAdd 
                                                            ? 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-black/30' 
                                                            : 'bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 opacity-50 cursor-not-allowed'
                                                }`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isHighlighted} 
                                                    onChange={() => handleHighlightToggle(key)}
                                                    disabled={!isHighlighted && !canAdd}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm truncate">{key}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {Object.keys(selectedTier.all_features || {}).length === 0 && (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">Add features above to select highlights</p>
                                )}
                            </div>
                            </div>

                            {/* Footer - Fixed at bottom */}
                            <div className="flex gap-3 justify-end p-6 pt-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d15] flex-shrink-0">
                                <button 
                                    onClick={() => setIsEditing(false)} 
                                    className="px-5 py-2.5 text-gray-500 dark:text-white/60 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    disabled={isSaving}
                                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Tiers List */}
            {tiers.length === 0 ? (
                <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <span className="material-symbols-outlined text-5xl mb-4 text-gray-300 dark:text-white/20">loyalty</span>
                    <h3 className="text-lg font-bold mb-2 text-gray-600 dark:text-white/70">No tiers found</h3>
                    <p className="text-sm text-gray-500 dark:text-white/50 max-w-xs mx-auto">
                        Membership tiers will appear here once configured.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tiers.map(tier => (
                        <div 
                            key={tier.id} 
                            onClick={() => openEdit(tier)}
                            className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:border-primary/30 transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-lg text-primary dark:text-white">{tier.name}</h4>
                                        {tier.is_popular && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-accent text-primary px-2 py-0.5 rounded">Popular</span>
                                        )}
                                        {!tier.is_active && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">Inactive</span>
                                        )}
                                    </div>
                                    <p className="text-xl font-bold text-primary dark:text-white">{tier.price_string}</p>
                                </div>
                                <button className="text-gray-400 hover:text-primary dark:hover:text-white transition-colors">
                                    <span className="material-symbols-outlined">edit</span>
                                </button>
                            </div>
                            
                            {tier.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{tier.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                                    <span className="material-symbols-outlined text-sm">sports_golf</span>
                                    {tier.daily_sim_minutes > 0 ? `${tier.daily_sim_minutes}min sim` : 'No sim'}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                                    <span className="material-symbols-outlined text-sm">person_add</span>
                                    {tier.guest_passes_per_month > 0 ? `${tier.guest_passes_per_month} passes` : 'No passes'}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                    {tier.booking_window_days}d window
                                </span>
                                {tier.unlimited_access && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-white font-bold">
                                        <span className="material-symbols-outlined text-sm">all_inclusive</span>
                                        Unlimited
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
