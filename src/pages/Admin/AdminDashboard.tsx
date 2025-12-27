import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useData, CafeItem, EventData, Announcement, MemberProfile, Booking } from '../../contexts/DataContext';
import { NotificationContext } from '../../contexts/NotificationContext';
import { usePageReady } from '../../contexts/PageReadyContext';
import MenuOverlay from '../../components/MenuOverlay';
import TierBadge from '../../components/TierBadge';
import TagBadge from '../../components/TagBadge';
import { AVAILABLE_TAGS } from '../../utils/tierUtils';
import { SafeAreaBottomOverlay } from '../../components/layout/SafeAreaBottomOverlay';
import { BottomSentinel } from '../../components/layout/BottomSentinel';
import BackToTop from '../../components/BackToTop';
import Toggle from '../../components/Toggle';
import FaqsAdmin from './FaqsAdmin';
import InquiriesAdmin from './InquiriesAdmin';
import GalleryAdmin from './GalleryAdmin';
import { changelog } from '../../data/changelog';
import { useToast } from '../../components/Toast';
import { APP_VERSION, formatLastUpdated } from '../../config/version';
import Avatar from '../../components/Avatar';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { actualUser } = useData();
  const { openNotifications } = useContext(NotificationContext);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType | null;
    const validTabs: TabType[] = ['home', 'cafe', 'events', 'announcements', 'directory', 'simulator', 'team', 'faqs', 'inquiries', 'gallery', 'tiers', 'blocks', 'changelog', 'training', 'updates'];
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab('home');
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  useEffect(() => {
    const state = location.state as { showPasswordSetup?: boolean } | null;
    if (state?.showPasswordSetup) {
      navigate('/profile', { state: { showPasswordSetup: true } });
    }
  }, [location.state, navigate]);
  
  // Fetch pending requests count for badge
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const [requestsRes, bookingsRes] = await Promise.all([
          fetch('/api/booking-requests?include_all=true'),
          fetch('/api/pending-bookings')
        ]);
        let count = 0;
        if (requestsRes.ok) {
          const data = await requestsRes.json();
          count += data.filter((r: any) => r.status === 'pending' || r.status === 'pending_approval').length;
        }
        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          count += data.length;
        }
        setPendingRequestsCount(count);
      } catch (err) {
        console.error('Failed to fetch pending count:', err);
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch unread notifications count
  useEffect(() => {
    if (!actualUser?.email) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(actualUser.email)}&unread=true`);
        if (res.ok) {
          const data = await res.json();
          setUnreadNotifCount(data.length);
        }
      } catch (err) {
        console.error('Failed to fetch unread notifications:', err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [actualUser?.email]);
  
  // Protect route - use actualUser so admins can still access while viewing as member
  useEffect(() => {
    if (!actualUser || (actualUser.role !== 'admin' && actualUser.role !== 'staff')) {
        navigate('/login');
    }
  }, [actualUser, navigate]);

  if (!actualUser || (actualUser.role !== 'admin' && actualUser.role !== 'staff')) return null;

  const getTabTitle = () => {
    switch (activeTab) {
      case 'home': return 'Dashboard';
      case 'cafe': return 'Cafe Menu';
      case 'events': return 'Events';
      case 'announcements': return 'News';
      case 'directory': return 'Directory';
      case 'simulator': return 'Bookings';
      case 'team': return 'Team Access';
      case 'faqs': return 'FAQs';
      case 'inquiries': return 'Inquiries';
      case 'gallery': return 'Gallery';
      case 'tiers': return 'Tiers';
      case 'blocks': return 'Closures';
      case 'changelog': return 'Changelog';
      case 'training': return 'Training';
      case 'conflicts': return 'Conflicts';
      case 'updates': return 'Updates';
      default: return 'Dashboard';
    }
  };

  const headerContent = (
    <header className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-4 bg-[#293515] shadow-md transition-all duration-200 text-[#F2F2EC] z-[9998] pointer-events-auto">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center justify-center hover:opacity-70 transition-opacity py-1"
        aria-label="Go to home"
      >
        <img 
          src="/assets/logos/mascot-white.webp" 
          alt="Even House" 
          className="h-10 w-auto object-contain"
        />
      </button>
      
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
        <h1 className="text-lg font-bold text-[#F2F2EC] tracking-wide">
          {getTabTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <button 
          onClick={() => handleTabChange('updates')}
          className="flex items-center justify-center w-10 h-10 hover:opacity-70 transition-opacity relative"
          aria-label="Updates"
        >
          <span className="material-symbols-outlined text-[24px]">campaign</span>
          {unreadNotifCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex items-center justify-center hover:opacity-70 transition-opacity rounded-full"
          aria-label="View profile"
        >
          <Avatar name={actualUser?.name} email={actualUser?.email} size="md" />
        </button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-display dark:bg-transparent transition-colors duration-300 flex flex-col relative">
      
      {/* Header - rendered via portal to escape transform context */}
      {createPortal(headerContent, document.body)}

      {/* Main Content Area - add top padding for fixed header */}
      <main className="flex-1 px-4 md:px-8 max-w-4xl mx-auto pt-[max(112px,calc(env(safe-area-inset-top)+96px))] w-full relative z-0">
        {activeTab === 'home' && <StaffDashboardHome onTabChange={handleTabChange} isAdmin={actualUser?.role === 'admin'} />}
        {activeTab === 'cafe' && <CafeAdmin />}
        {activeTab === 'events' && <EventsWellnessAdmin />}
        {activeTab === 'announcements' && <AnnouncementsAdmin />}
        {activeTab === 'directory' && <MembersAdmin />}
        {activeTab === 'simulator' && <SimulatorAdmin />}
        {activeTab === 'team' && actualUser?.role === 'admin' && <TeamAdmin />}
        {activeTab === 'faqs' && <FaqsAdmin />}
        {activeTab === 'inquiries' && <InquiriesAdmin />}
        {activeTab === 'gallery' && <GalleryAdmin />}
        {activeTab === 'tiers' && actualUser?.role === 'admin' && <TiersAdmin />}
        {activeTab === 'blocks' && <BlocksAdmin />}
        {activeTab === 'changelog' && actualUser?.role === 'admin' && <ChangelogAdmin />}
        {activeTab === 'training' && <StaffTrainingGuide />}
        {activeTab === 'updates' && <StaffUpdatesAdmin />}
        <BottomSentinel />
      </main>

      {/* Bottom Nav - Floating Pill with Liquid Glass */}
      <StaffBottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        isAdmin={actualUser?.role === 'admin'}
        pendingRequestsCount={pendingRequestsCount}
      />

      <BackToTop threshold={400} />

      <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
};

// --- Sub-Components ---

type TabType = 'home' | 'cafe' | 'events' | 'announcements' | 'directory' | 'simulator' | 'team' | 'faqs' | 'inquiries' | 'gallery' | 'tiers' | 'blocks' | 'changelog' | 'training' | 'updates';

interface NavItemData {
  id: TabType;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItemData[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'simulator', icon: 'event_note', label: 'Bookings' },
  { id: 'blocks', icon: 'event_busy', label: 'Closures' },
  { id: 'events', icon: 'calendar_month', label: 'Calendar' },
  { id: 'inquiries', icon: 'mail', label: 'Inquiries' },
];

const StaffBottomNav: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isAdmin?: boolean;
  pendingRequestsCount?: number;
}> = ({ activeTab, onTabChange, isAdmin, pendingRequestsCount = 0 }) => {
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
            onClick={() => onTabChange(item.id)}
            style={{ touchAction: 'manipulation' }}
            aria-label={item.label}
            aria-current={activeTab === item.id ? 'page' : undefined}
            className={`
              flex-1 flex flex-col items-center gap-0.5 py-2 px-1 relative z-10 cursor-pointer
              transition-all duration-300 ease-out active:scale-90
              ${activeTab === item.id ? 'text-white' : 'text-white/50 hover:text-white/80'}
            `}
          >
            <div className="relative">
              <span className={`material-symbols-outlined text-xl transition-all duration-300 ${activeTab === item.id ? 'filled scale-110' : ''}`}>
                {item.icon}
              </span>
              {item.id === 'simulator' && pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                  {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                </span>
              )}
            </div>
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

const StaffDashboardHome: React.FC<{ onTabChange: (tab: TabType) => void; isAdmin?: boolean }> = ({ onTabChange, isAdmin }) => {
  const employeeResourcesLinks = [
    { id: 'directory' as TabType, icon: 'groups', label: 'Directory', description: 'Search and manage members' },
    { id: 'training' as TabType, icon: 'school', label: 'Training Guide', description: 'How to use the staff portal' },
  ];

  const operationsLinks = [
    { id: 'simulator' as TabType, icon: 'event_note', label: 'Bookings', description: 'Manage booking requests and approvals' },
    { id: 'events' as TabType, icon: 'calendar_month', label: 'Calendar', description: 'View and manage events and wellness' },
    { id: 'updates' as TabType, icon: 'campaign', label: 'Updates', description: 'Activity and announcements for members' },
    { id: 'blocks' as TabType, icon: 'event_busy', label: 'Closures', description: 'Manage closures and availability blocks' },
    { id: 'inquiries' as TabType, icon: 'mail', label: 'Inquiries', description: 'View form submissions' },
  ];

  const publicContentLinks = [
    { id: 'cafe' as TabType, icon: 'local_cafe', label: 'Cafe Menu', description: 'Update menu items and prices' },
    { id: 'gallery' as TabType, icon: 'photo_library', label: 'Gallery', description: 'Manage venue photos' },
    { id: 'faqs' as TabType, icon: 'help_outline', label: 'FAQs', description: 'Edit frequently asked questions' },
  ];

  const adminLinks = [
    { id: 'team' as TabType, icon: 'shield_person', label: 'Team Access', description: 'Manage staff and admins' },
    { id: 'tiers' as TabType, icon: 'loyalty', label: 'Manage Tiers', description: 'Configure membership tier settings' },
    { id: 'changelog' as TabType, icon: 'history', label: 'Version History', description: 'View app updates and changes' },
  ];

  const CardButton = ({ link }: { link: { id: TabType; icon: string; label: string; description: string } }) => (
    <button
      key={link.id}
      onClick={() => onTabChange(link.id)}
      className="flex flex-col items-start p-5 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-lg border border-primary/10 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 transition-all text-left group shadow-sm"
    >
      <span className="material-symbols-outlined text-3xl text-primary dark:text-white mb-3 group-hover:scale-110 transition-transform">{link.icon}</span>
      <span className="font-bold text-primary dark:text-white text-sm">{link.label}</span>
      <span className="text-xs text-primary/60 dark:text-white/60 mt-1">{link.description}</span>
    </button>
  );

  return (
    <div className="animate-pop-in pb-32">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary/50 dark:text-white/50 mb-4">Employee Resources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {employeeResourcesLinks.map((link) => (
            <CardButton key={link.id} link={link} />
          ))}
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary/50 dark:text-white/50 mb-4">Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {operationsLinks.map((link) => (
            <CardButton key={link.id} link={link} />
          ))}
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary/50 dark:text-white/50 mb-4">Public Content</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {publicContentLinks.map((link) => (
            <CardButton key={link.id} link={link} />
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="mt-6 sm:mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary/50 dark:text-white/50 mb-4">Admin Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {adminLinks.map((link) => (
              <CardButton key={link.id} link={link} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-primary/10 dark:border-white/10 text-center">
        <p className="text-xs text-primary/40 dark:text-white/40">
          v{APP_VERSION} · Updated {formatLastUpdated()}
        </p>
      </div>
    </div>
  );
};

// --- CAFE ADMIN ---

const CafeAdmin: React.FC = () => {
    const { setPageReady } = usePageReady();
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

    useEffect(() => {
        setPageReady(true);
    }, [setPageReady]);

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
        if (!newItem.name || newItem.price === undefined || newItem.price === null) return;
        
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
        <div className="animate-pop-in">
            <div className="flex justify-between items-center mb-4 animate-pop-in" style={{animationDelay: '0.05s'}}>
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
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1 mb-4 animate-pop-in" style={{animationDelay: '0.1s'}}>
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

            <div className="space-y-3 animate-pop-in" style={{animationDelay: '0.15s'}}>
                {filteredMenu.map((item, index) => (
                    <div key={item.id} onClick={() => openEdit(item)} className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all animate-pop-in" style={{animationDelay: `${0.2 + index * 0.03}s`}}>
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
    { id: 'Social', label: 'Social', icon: 'celebration' },
    { id: 'Golf', label: 'Golf', icon: 'golf_course' },
    { id: 'Tournaments', label: 'Tournaments', icon: 'emoji_events' },
    { id: 'Dining', label: 'Dining', icon: 'restaurant' },
    { id: 'Networking', label: 'Networking', icon: 'handshake' },
    { id: 'Workshops', label: 'Workshops', icon: 'school' },
    { id: 'Family', label: 'Family', icon: 'family_restroom' },
    { id: 'Entertainment', label: 'Entertainment', icon: 'music_note' },
    { id: 'Charity', label: 'Charity', icon: 'volunteer_activism' },
];

const EventsAdminContent: React.FC = () => {
    const { setPageReady } = usePageReady();
    const [events, setEvents] = useState<DBEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [newItem, setNewItem] = useState<Partial<DBEvent>>({ category: 'Social' });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isViewingRsvps, setIsViewingRsvps] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<DBEvent | null>(null);
    const [rsvps, setRsvps] = useState<Participant[]>([]);
    const [isLoadingRsvps, setIsLoadingRsvps] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            setPageReady(true);
        }
    }, [isLoading, setPageReady]);

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

    useEffect(() => {
        const handleOpenCreate = () => openCreate();
        window.addEventListener('openEventCreate', handleOpenCreate);
        return () => window.removeEventListener('openEventCreate', handleOpenCreate);
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
        <div className="animate-pop-in">
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mx-4 px-4 animate-pop-in" style={{animationDelay: '0.05s'}}>
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

            {isEditing && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsEditing(false); setError(null); }} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 modal-safe-height overflow-y-auto pointer-events-auto">
                            <h3 className="font-bold text-lg mb-4 text-primary dark:text-white">{editId ? 'Edit Event' : 'Create Event'}</h3>
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm mb-4">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-3 mb-6">
                                <input className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40" placeholder="Title" value={newItem.title || ''} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                                <select className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-primary dark:text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                    <option value="Social">Social</option>
                                    <option value="Golf">Golf</option>
                                    <option value="Tournaments">Tournaments</option>
                                    <option value="Dining">Dining</option>
                                    <option value="Networking">Networking</option>
                                    <option value="Workshops">Workshops</option>
                                    <option value="Family">Family</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Charity">Charity</option>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pop-in" style={{animationDelay: '0.1s'}}>
                    {filteredEvents.map((event, index) => (
                        <div key={event.id} onClick={() => openEdit(event)} className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-3 relative overflow-hidden cursor-pointer hover:border-primary/30 transition-all animate-pop-in" style={{animationDelay: `${0.15 + index * 0.03}s`}}>
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
                                            {event.category === 'Golf' ? 'golf_course' : event.category === 'Tournaments' ? 'emoji_events' : event.category === 'Dining' ? 'restaurant' : event.category === 'Networking' ? 'handshake' : event.category === 'Workshops' ? 'school' : event.category === 'Family' ? 'family_restroom' : event.category === 'Entertainment' ? 'music_note' : event.category === 'Charity' ? 'volunteer_activism' : 'celebration'}
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

// --- COMBINED EVENTS & WELLNESS ADMIN ---

const EventsWellnessAdmin: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'events' | 'wellness'>('events');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    
    const handleSyncCalendars = async () => {
        setIsSyncing(true);
        setSyncMessage(null);
        try {
            const res = await fetch('/api/calendars/sync-all', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setSyncMessage(data.message || 'Calendars synced successfully');
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

    const handleSyncEventbrite = async () => {
        setIsSyncing(true);
        setSyncMessage(null);
        try {
            const res = await fetch('/api/eventbrite/sync', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setSyncMessage(data.message || 'Eventbrite synced successfully');
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

    return (
        <div className="animate-pop-in">
            {syncMessage && (
                <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
                    syncMessage.startsWith('Error') 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' 
                        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                }`}>
                    {syncMessage}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 animate-pop-in" style={{animationDelay: '0.05s'}}>
                <button 
                    onClick={handleSyncCalendars} 
                    disabled={isSyncing}
                    className="bg-blue-600 text-white px-3 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 text-xs sm:text-sm"
                >
                    {isSyncing ? (
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    ) : (
                        <img src="/images/google-calendar-icon.png" alt="" className="w-5 h-5 object-contain" />
                    )}
                    <span className="hidden sm:inline">Calendar</span> Sync
                </button>
                <button 
                    onClick={handleSyncEventbrite} 
                    disabled={isSyncing}
                    className="bg-[#F05537] text-white px-3 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 text-xs sm:text-sm"
                >
                    {isSyncing ? (
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    ) : (
                        <img src="/images/eventbrite-icon.png" alt="" className="w-5 h-5 object-contain rounded" />
                    )}
                    <span className="hidden sm:inline">Eventbrite</span> Sync
                </button>
                <button 
                    onClick={() => { setActiveSubTab('events'); window.dispatchEvent(new CustomEvent('openEventCreate')); }}
                    className="bg-primary text-white px-3 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Event
                </button>
                <button 
                    onClick={() => { setActiveSubTab('wellness'); window.dispatchEvent(new CustomEvent('openWellnessCreate')); }}
                    className="bg-accent text-white px-3 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Wellness
                </button>
            </div>

            <div className="flex gap-2 mb-4 animate-pop-in" style={{animationDelay: '0.1s'}}>
                <button
                    onClick={() => setActiveSubTab('events')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        activeSubTab === 'events'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-white dark:bg-white/10 text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/10'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">event</span>
                    Events
                </button>
                <button
                    onClick={() => setActiveSubTab('wellness')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        activeSubTab === 'wellness'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-white dark:bg-white/10 text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/10'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">spa</span>
                    Wellness
                </button>
            </div>

            {activeSubTab === 'events' && <EventsAdminContent />}
            {activeSubTab === 'wellness' && <WellnessAdminContent />}
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
                <div className="relative bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 modal-safe-height overflow-y-auto pointer-events-auto">
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

// --- STAFF UPDATES ADMIN (Activity + Announcements) ---

interface StaffNotification {
    id: number;
    user_email: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

const StaffUpdatesAdmin: React.FC = () => {
    const { setPageReady } = usePageReady();
    const { actualUser } = useData();
    const [activeSubTab, setActiveSubTab] = useState<'activity' | 'announcements'>('activity');
    const [notifications, setNotifications] = useState<StaffNotification[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!notificationsLoading) {
            setPageReady(true);
        }
    }, [notificationsLoading, setPageReady]);

    useEffect(() => {
        if (actualUser?.email) {
            const fetchNotifications = async () => {
                try {
                    const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(actualUser.email)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setNotifications(data);
                        setUnreadCount(data.filter((n: StaffNotification) => !n.is_read).length);
                    }
                } catch (err) {
                    console.error('Failed to fetch notifications:', err);
                } finally {
                    setNotificationsLoading(false);
                }
            };
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [actualUser?.email]);

    const handleNotificationClick = async (notif: StaffNotification) => {
        if (!notif.is_read) {
            try {
                await fetch(`/api/notifications/${notif.id}/read`, { method: 'PUT' });
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) {
                console.error('Failed to mark notification as read:', err);
            }
        }
    };

    const markAllAsRead = async () => {
        if (!actualUser?.email) return;
        try {
            await fetch('/api/notifications/mark-all-read', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: actualUser.email }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const renderActivityTab = () => (
        <div className="animate-pop-in" style={{animationDelay: '0.1s'}}>
            {unreadCount > 0 && (
                <div className="flex justify-end mb-4">
                    <button 
                        onClick={markAllAsRead}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 dark:text-white/70 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10"
                    >
                        Mark all as read
                    </button>
                </div>
            )}
            
            {notificationsLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-4 rounded-2xl animate-pulse bg-white dark:bg-white/[0.03]">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/10" />
                                <div className="flex-1">
                                    <div className="h-4 w-1/2 rounded mb-2 bg-gray-200 dark:bg-white/10" />
                                    <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-white/5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-16 text-primary/50 dark:text-white/50">
                    <span className="material-symbols-outlined text-6xl mb-4 block opacity-30">notifications_off</span>
                    <p className="text-lg font-medium">No activity yet</p>
                    <p className="text-sm mt-1 opacity-70">System alerts and updates will appear here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notif, index) => (
                        <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`rounded-2xl transition-all cursor-pointer overflow-hidden animate-pop-in ${
                                notif.is_read 
                                    ? 'bg-white hover:bg-gray-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]' 
                                    : 'bg-accent/10 hover:bg-accent/15 border border-accent/30 dark:border-accent/20'
                            } shadow-layered dark:shadow-layered-dark`}
                            style={{animationDelay: `${0.15 + index * 0.03}s`}}
                        >
                            <div className="flex gap-3 p-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                    notif.type === 'booking_request' ? 'bg-blue-500/20' :
                                    notif.type === 'system_alert' ? 'bg-amber-500/20' :
                                    'bg-accent/20'
                                }`}>
                                    <span className={`material-symbols-outlined text-[20px] ${
                                        notif.type === 'booking_request' ? 'text-blue-500' :
                                        notif.type === 'system_alert' ? 'text-amber-500' :
                                        'text-primary dark:text-white'
                                    }`}>
                                        {notif.type === 'booking_request' ? 'event_note' :
                                         notif.type === 'system_alert' ? 'warning' :
                                         'notifications'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-bold text-sm ${notif.is_read ? 'text-primary/70 dark:text-white/70' : 'text-primary dark:text-white'}`}>
                                            {notif.title}
                                        </h4>
                                        <span className="text-[10px] ml-2 shrink-0 text-primary/50 dark:text-white/50">
                                            {notif.created_at ? new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now'}
                                        </span>
                                    </div>
                                    <p className={`text-xs mt-0.5 ${notif.is_read ? 'text-primary/50 dark:text-white/50' : 'text-primary/70 dark:text-white/70'}`}>
                                        {notif.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="animate-pop-in pb-32">
            <div className="flex gap-2 mb-6 animate-pop-in" style={{animationDelay: '0.05s'}}>
                <button
                    onClick={() => setActiveSubTab('activity')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wide transition-all relative ${
                        activeSubTab === 'activity'
                            ? 'bg-accent text-primary'
                            : 'bg-primary/5 text-primary/60 hover:bg-primary/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
                    }`}
                >
                    Activity
                    {unreadCount > 0 && activeSubTab !== 'activity' && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveSubTab('announcements')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wide transition-all ${
                        activeSubTab === 'announcements'
                            ? 'bg-accent text-primary'
                            : 'bg-primary/5 text-primary/60 hover:bg-primary/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
                    }`}
                >
                    Announcements
                </button>
            </div>

            {activeSubTab === 'activity' ? renderActivityTab() : <AnnouncementsAdmin />}
        </div>
    );
};

// --- ANNOUNCEMENTS ADMIN ---

const AnnouncementsAdmin: React.FC = () => {
    const { setPageReady } = usePageReady();
    const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<Partial<Announcement>>({ type: 'announcement' });

    useEffect(() => {
        setPageReady(true);
    }, [setPageReady]);

    const openCreate = () => {
        setNewItem({ type: 'announcement' });
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
            priority: newItem.priority || 'normal',
            startDate: newItem.startDate,
            endDate: newItem.endDate,
            linkType: newItem.linkType,
            linkTarget: newItem.linkTarget
        };

        if (editId) {
            updateAnnouncement(ann);
        } else {
            addAnnouncement(ann);
        }
        setIsEditing(false);
    };

    return (
        <div className="animate-pop-in">
            <div className="flex justify-end gap-2 mb-4 animate-pop-in" style={{animationDelay: '0.05s'}}>
                <button onClick={openCreate} className="bg-accent text-primary px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-md text-sm hover:bg-accent/90 transition-colors">
                    <span className="material-symbols-outlined text-lg">add</span> Announcement
                </button>
            </div>
            
            {isEditing && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 border border-gray-200 dark:border-white/10 pointer-events-auto">
                            <h3 className="font-bold text-lg mb-5 text-primary dark:text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                                {editId ? 'Edit Announcement' : 'New Announcement'}
                            </h3>
                            <div className="space-y-4 mb-6">
                                <input className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Title" value={newItem.title || ''} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                                <textarea className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" placeholder="Description" rows={3} value={newItem.desc || ''} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                                
                                {/* Priority Level */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5 block">Priority Level</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button type="button" onClick={() => setNewItem({...newItem, priority: 'normal'})} className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${(!newItem.priority || newItem.priority === 'normal') ? 'bg-gray-200 dark:bg-white/20 text-gray-700 dark:text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>Normal</button>
                                        <button type="button" onClick={() => setNewItem({...newItem, priority: 'high'})} className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${newItem.priority === 'high' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>High</button>
                                        <button type="button" onClick={() => setNewItem({...newItem, priority: 'urgent'})} className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${newItem.priority === 'urgent' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>Urgent</button>
                                    </div>
                                </div>
                                
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
                                
                                {/* Link Destination */}
                                <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-white/10">
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 block">Link Destination</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setNewItem({...newItem, linkType: undefined, linkTarget: undefined})} className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${!newItem.linkType ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>None</button>
                                        <button type="button" onClick={() => setNewItem({...newItem, linkType: 'events', linkTarget: undefined})} className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${newItem.linkType === 'events' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>Events</button>
                                        <button type="button" onClick={() => setNewItem({...newItem, linkType: 'wellness', linkTarget: undefined})} className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${newItem.linkType === 'wellness' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>Wellness</button>
                                        <button type="button" onClick={() => setNewItem({...newItem, linkType: 'golf', linkTarget: undefined})} className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${newItem.linkType === 'golf' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>Book Golf</button>
                                        <button type="button" onClick={() => setNewItem({...newItem, linkType: 'external', linkTarget: newItem.linkTarget || ''})} className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors col-span-2 ${newItem.linkType === 'external' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>External URL</button>
                                    </div>
                                    {newItem.linkType === 'external' && (
                                        <input 
                                            type="url" 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                                            placeholder="https://example.com" 
                                            value={newItem.linkTarget || ''} 
                                            onChange={e => setNewItem({...newItem, linkTarget: e.target.value})} 
                                        />
                                    )}
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

            {/* Announcements Section */}
            <div className="space-y-4 animate-pop-in" style={{animationDelay: '0.1s'}}>
                {announcements.length > 0 && (
                    <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-[18px]">campaign</span>
                        Announcements ({announcements.length})
                    </h3>
                )}
                {announcements.map((item, index) => (
                    <div key={item.id} onClick={() => openEdit(item)} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm flex justify-between items-start cursor-pointer hover:border-primary/30 transition-all animate-pop-in" style={{animationDelay: `${0.15 + index * 0.05}s`}}>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-2 h-2 rounded-full bg-accent"></span>
                                <span className="text-[10px] text-gray-300 dark:text-gray-600">{item.date}</span>
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
    const { setPageReady } = usePageReady();
    const { members, setViewAsUser, actualUser } = useData();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState<string>('All');
    
    const isAdmin = actualUser?.role === 'admin';

    useEffect(() => {
        setPageReady(true);
    }, [setPageReady]);

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
    
    const handleViewAs = async (member: MemberProfile) => {
        if (!isAdmin) return;
        await setViewAsUser(member);
        navigate('/dashboard');
    };

    return (
        <div className="animate-pop-in">
            {/* Search and filters */}
            <div className="mb-6 space-y-3 animate-pop-in" style={{animationDelay: '0.05s'}}>
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
            <div className="md:hidden space-y-3 animate-pop-in" style={{animationDelay: '0.1s'}}>
                {filteredList.map((m, index) => (
                    <div key={m.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm animate-pop-in" style={{animationDelay: `${0.15 + Math.min(index, 10) * 0.03}s`}}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
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
                            {isAdmin && (
                                <button 
                                    onClick={() => handleViewAs(m)} 
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/20 text-brand-green dark:bg-accent/30 dark:text-accent text-xs font-bold hover:bg-accent/30 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                                    View As
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            )}

            {/* Desktop View: Table */}
            {filteredList.length > 0 && (
            <div className="hidden md:block bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden overflow-x-auto animate-pop-in" style={{animationDelay: '0.1s'}}>
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
                        {filteredList.map((m, index) => (
                            <tr key={m.id} className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 animate-pop-in" style={{animationDelay: `${0.15 + Math.min(index, 10) * 0.03}s`}}>
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
                                    {isAdmin && (
                                        <button 
                                            onClick={() => handleViewAs(m)} 
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/20 text-brand-green dark:bg-accent/30 dark:text-accent text-xs font-bold hover:bg-accent/30 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                                            View As
                                        </button>
                                    )}
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

interface CalendarClosure {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    startTime: string | null;
    endTime: string | null;
    affectedAreas: string;
    reason: string | null;
}

const SimulatorAdmin: React.FC = () => {
    const { setPageReady } = usePageReady();
    const { user, actualUser } = useData();
    const [activeView, setActiveView] = useState<'requests' | 'calendar'>('requests');
    const [requests, setRequests] = useState<BookingRequest[]>([]);
    const [bays, setBays] = useState<Bay[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [approvedBookings, setApprovedBookings] = useState<BookingRequest[]>([]);
    const [closures, setClosures] = useState<CalendarClosure[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
    const [actionModal, setActionModal] = useState<'approve' | 'decline' | null>(null);
    const [selectedBayId, setSelectedBayId] = useState<number | null>(null);
    const [staffNotes, setStaffNotes] = useState('');
    const [suggestedTime, setSuggestedTime] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'conflict' | null>(null);
    const [conflictDetails, setConflictDetails] = useState<string | null>(null);
    const [showTrackmanConfirm, setShowTrackmanConfirm] = useState(false);
    const [showManualBooking, setShowManualBooking] = useState(false);
    const [rescheduleEmail, setRescheduleEmail] = useState<string | null>(null);
    const [selectedCalendarBooking, setSelectedCalendarBooking] = useState<BookingRequest | null>(null);
    const [isCancellingFromModal, setIsCancellingFromModal] = useState(false);
    
    const [calendarDate, setCalendarDate] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (!isLoading) {
            setPageReady(true);
        }
    }, [isLoading, setPageReady]);

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
        const fetchCalendarData = async () => {
            const today = new Date().toISOString().split('T')[0];
            const startDate = activeView === 'calendar' ? calendarDate : today;
            const endDate = new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            try {
                const [bookingsRes, closuresRes] = await Promise.all([
                    fetch(`/api/approved-bookings?start_date=${startDate}&end_date=${endDate}`),
                    fetch('/api/closures')
                ]);
                
                if (bookingsRes.ok) {
                    const data = await bookingsRes.json();
                    setApprovedBookings(data);
                }
                
                if (closuresRes.ok) {
                    const closuresData = await closuresRes.json();
                    const activeClosures = closuresData.filter((c: CalendarClosure) => 
                        c.startDate <= endDate && c.endDate >= startDate
                    );
                    setClosures(activeClosures);
                }
            } catch (err) {
                console.error('Failed to fetch calendar data:', err);
            }
        };
        fetchCalendarData();
    }, [activeView, calendarDate]);

    useEffect(() => {
        const checkAvailability = async () => {
            if (!selectedBayId || !selectedRequest || actionModal !== 'approve') {
                setAvailabilityStatus(null);
                setConflictDetails(null);
                return;
            }
            
            setAvailabilityStatus('checking');
            setConflictDetails(null);
            
            try {
                const [bookingsRes, closuresRes] = await Promise.all([
                    fetch(`/api/approved-bookings?start_date=${selectedRequest.request_date}&end_date=${selectedRequest.request_date}`),
                    fetch('/api/closures')
                ]);
                
                let hasConflict = false;
                let details = '';
                
                if (bookingsRes.ok) {
                    const bookings = await bookingsRes.json();
                    const reqStart = selectedRequest.start_time;
                    const reqEnd = selectedRequest.end_time;
                    
                    const conflict = bookings.find((b: any) => 
                        b.bay_id === selectedBayId && 
                        b.request_date === selectedRequest.request_date &&
                        b.start_time < reqEnd && b.end_time > reqStart
                    );
                    
                    if (conflict) {
                        hasConflict = true;
                        details = `Conflicts with existing booking: ${formatTime12(conflict.start_time)} - ${formatTime12(conflict.end_time)}`;
                    }
                }
                
                if (!hasConflict && closuresRes.ok) {
                    const allClosures = await closuresRes.json();
                    const reqDate = selectedRequest.request_date;
                    const reqStartMins = parseInt(selectedRequest.start_time.split(':')[0]) * 60 + parseInt(selectedRequest.start_time.split(':')[1]);
                    const reqEndMins = parseInt(selectedRequest.end_time.split(':')[0]) * 60 + parseInt(selectedRequest.end_time.split(':')[1]);
                    
                    const closure = allClosures.find((c: any) => {
                        if (c.startDate > reqDate || c.endDate < reqDate) return false;
                        
                        const areas = c.affectedAreas;
                        const affectsResource = areas === 'entire_facility' || 
                            areas === 'all_bays' || 
                            areas.includes(String(selectedBayId));
                        
                        if (!affectsResource) return false;
                        
                        if (c.startTime && c.endTime) {
                            const closureStartMins = parseInt(c.startTime.split(':')[0]) * 60 + parseInt(c.startTime.split(':')[1]);
                            const closureEndMins = parseInt(c.endTime.split(':')[0]) * 60 + parseInt(c.endTime.split(':')[1]);
                            return reqStartMins < closureEndMins && reqEndMins > closureStartMins;
                        }
                        return true;
                    });
                    
                    if (closure) {
                        hasConflict = true;
                        details = `Conflicts with closure: ${closure.title}`;
                    }
                }
                
                setAvailabilityStatus(hasConflict ? 'conflict' : 'available');
                setConflictDetails(hasConflict ? details : null);
            } catch (err) {
                setAvailabilityStatus(null);
            }
        };
        
        checkAvailability();
    }, [selectedBayId, selectedRequest, actionModal]);

    const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'pending_approval');
    
    // Recent Processed: show declined/cancelled member requests only
    // Exclude future approved/confirmed (they're in Upcoming Bookings) and manual bookings
    const today = new Date().toISOString().split('T')[0];
    const processedRequests = requests.filter(r => {
      // Only include non-pending requests
      if (r.status === 'pending' || r.status === 'pending_approval') return false;
      // Exclude manual bookings (source === 'booking' means it came from approved bookings, not member requests)
      if (r.source === 'booking') return false;
      // For approved/confirmed, only show past ones (future ones are in Upcoming Bookings)
      if (r.status === 'approved' || r.status === 'confirmed') {
        return r.request_date < today;
      }
      // Show declined and cancelled
      return true;
    });

    const upcomingBookings = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return approvedBookings
            .filter(b => (b.status === 'approved' || b.status === 'confirmed') && b.request_date >= today)
            .sort((a, b) => {
                if (a.request_date !== b.request_date) {
                    return a.request_date.localeCompare(b.request_date);
                }
                return a.start_time.localeCompare(b.start_time);
            })
            .slice(0, 10);
    }, [approvedBookings]);

    const initiateApproval = () => {
        if (!selectedRequest) return;
        
        if (selectedRequest.source !== 'booking' && !selectedBayId) {
            setError('Please select a bay');
            return;
        }
        
        setShowTrackmanConfirm(true);
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;
        
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
                throw new Error(errData.message || errData.error || 'Failed to approve');
            }
            
            const updated = await res.json();
            setRequests(prev => prev.map(r => 
                r.id === selectedRequest.id && r.source === selectedRequest.source 
                    ? { ...r, status: 'confirmed' as const } 
                    : r
            ));
            setShowTrackmanConfirm(false);
            setActionModal(null);
            setSelectedRequest(null);
            setSelectedBayId(null);
            setStaffNotes('');
        } catch (err: any) {
            setError(err.message);
            setShowTrackmanConfirm(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (!selectedRequest) return;
        
        setIsProcessing(true);
        setError(null);
        
        // Use 'cancelled' status for approved bookings being cancelled, 'declined' for pending requests
        const newStatus = selectedRequest.status === 'approved' ? 'cancelled' : 'declined';
        
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
                        status: newStatus,
                        staff_notes: staffNotes || null,
                        suggested_time: suggestedTime ? suggestedTime + ':00' : null,
                        reviewed_by: actualUser?.email || user?.email,
                        cancelled_by: newStatus === 'cancelled' ? (actualUser?.email || user?.email) : undefined
                    })
                });
            }
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to process request');
            }
            
            setRequests(prev => prev.map(r => 
                r.id === selectedRequest.id && r.source === selectedRequest.source 
                    ? { ...r, status: newStatus as 'declined' | 'cancelled' } 
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
            case 'declined': 
            case 'cancelled':
                return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
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

    const parseAffectedBayIds = (affectedAreas: string): number[] => {
        if (affectedAreas === 'entire_facility' || affectedAreas === 'all_bays') {
            return resources.filter(r => r.type === 'simulator').map(r => r.id);
        }
        
        if (affectedAreas.startsWith('bay_') && !affectedAreas.includes(',') && !affectedAreas.includes('[')) {
            const bayId = parseInt(affectedAreas.replace('bay_', ''));
            return isNaN(bayId) ? [] : [bayId];
        }
        
        if (affectedAreas.includes(',') && !affectedAreas.startsWith('[')) {
            const ids: number[] = [];
            for (const item of affectedAreas.split(',')) {
                const trimmed = item.trim();
                if (trimmed.startsWith('bay_')) {
                    const bayId = parseInt(trimmed.replace('bay_', ''));
                    if (!isNaN(bayId)) ids.push(bayId);
                } else {
                    const bayId = parseInt(trimmed);
                    if (!isNaN(bayId)) ids.push(bayId);
                }
            }
            return ids;
        }
        
        try {
            const parsed = JSON.parse(affectedAreas);
            if (Array.isArray(parsed)) {
                const ids: number[] = [];
                for (const item of parsed) {
                    if (typeof item === 'number') {
                        ids.push(item);
                    } else if (typeof item === 'string') {
                        if (item.startsWith('bay_')) {
                            const bayId = parseInt(item.replace('bay_', ''));
                            if (!isNaN(bayId)) ids.push(bayId);
                        } else {
                            const bayId = parseInt(item);
                            if (!isNaN(bayId)) ids.push(bayId);
                        }
                    }
                }
                return ids;
            }
        } catch {}
        
        return [];
    };

    const getClosureForSlot = (resourceId: number, date: string, slotStart: number, slotEnd: number): CalendarClosure | null => {
        for (const closure of closures) {
            if (closure.startDate > date || closure.endDate < date) continue;
            
            const affectedBayIds = parseAffectedBayIds(closure.affectedAreas);
            if (!affectedBayIds.includes(resourceId)) continue;
            
            if (!closure.startTime && !closure.endTime) {
                return closure;
            }
            
            const closureStartMinutes = closure.startTime 
                ? parseInt(closure.startTime.split(':')[0]) * 60 + parseInt(closure.startTime.split(':')[1] || '0') 
                : 0;
            const closureEndMinutes = closure.endTime 
                ? parseInt(closure.endTime.split(':')[0]) * 60 + parseInt(closure.endTime.split(':')[1] || '0') 
                : 24 * 60;
            
            if (slotStart < closureEndMinutes && slotEnd > closureStartMinutes) {
                return closure;
            }
        }
        return null;
    };

    return (
        <div className="flex justify-center animate-pop-in">
            <div className="w-full max-w-md md:max-w-xl lg:max-w-2xl bg-white dark:bg-surface-dark rounded-2xl shadow-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 mb-0 animate-pop-in px-4 py-3" style={{animationDelay: '0.05s'}}>
                <div className="flex">
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
                <button
                    onClick={() => setShowManualBooking(true)}
                    className="py-2 px-3 bg-primary text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Manual Booking
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-primary dark:text-white">progress_activity</span>
                </div>
            ) : activeView === 'requests' ? (
                <div className="space-y-6 p-5 animate-pop-in" style={{animationDelay: '0.1s'}}>
                    {/* Upcoming Bookings Section */}
                    {upcomingBookings.length > 0 && (
                        <div className="animate-pop-in" style={{animationDelay: '0.05s'}}>
                            <h3 className="font-bold text-primary dark:text-white mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">calendar_today</span>
                                Upcoming Bookings ({upcomingBookings.length})
                            </h3>
                            <div className="space-y-2">
                                {upcomingBookings.map((booking, index) => (
                                    <div key={`upcoming-${booking.id}`} className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg border border-blue-200 dark:border-blue-500/20 flex justify-between items-center animate-pop-in" style={{animationDelay: `${0.1 + index * 0.03}s`}}>
                                        <div>
                                            <p className="font-medium text-primary dark:text-white text-sm">{booking.user_name || booking.user_email}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatDateShort(booking.request_date)} • {formatTime12(booking.start_time)} - {formatTime12(booking.end_time)}
                                            </p>
                                            {booking.bay_name && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{booking.bay_name}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { setSelectedRequest(booking); setActionModal('decline'); }}
                                            className="py-1.5 px-3 bg-red-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-red-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xs">close</span>
                                            Cancel
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                                {pendingRequests.map((req, index) => (
                                    <div key={req.id} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 animate-pop-in" style={{animationDelay: `${0.15 + index * 0.05}s`}}>
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
                    
                    <div className="animate-pop-in" style={{animationDelay: '0.2s'}}>
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
                                    <div key={req.id} className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-primary dark:text-white text-sm">{req.user_name || req.user_email}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDateShort(req.request_date)} • {formatTime12(req.start_time)} - {formatTime12(req.end_time)}
                                                </p>
                                                {req.bay_name && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{req.bay_name}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(req.status)}`}>
                                                {formatStatusLabel(req.status)}
                                            </span>
                                        </div>
                                        {req.status === 'approved' && (
                                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
                                                <button
                                                    onClick={() => { setSelectedRequest(req); setActionModal('decline'); }}
                                                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                    Cancel Booking
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="animate-pop-in" style={{animationDelay: '0.1s'}}>
                    {/* Date Selector Row */}
                    <div className="bg-gray-50 dark:bg-white/5 py-3 mb-4 animate-pop-in" style={{animationDelay: '0.2s'}}>
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
                    
                    <div className="overflow-x-auto px-2 pb-4 scroll-fade-right animate-pop-in" style={{animationDelay: '0.25s'}}>
                        <div className="inline-block min-w-full">
                            <div className="grid gap-0.5" style={{ gridTemplateColumns: `50px repeat(${resources.length}, minmax(60px, 1fr))` }}>
                                <div className="h-10 sticky left-0 z-10 bg-white dark:bg-surface-dark"></div>
                                {resources.map(resource => (
                                    <div key={resource.id} className={`h-10 flex items-center justify-center font-bold text-[10px] text-primary dark:text-white bg-white dark:bg-surface-dark rounded-t-lg border border-gray-200 dark:border-white/10 px-0.5 ${resource.type === 'conference_room' ? 'bg-purple-50 dark:bg-purple-500/10' : ''}`}>
                                        {resource.type === 'conference_room' ? 'Conf' : resource.name.replace('Simulator Bay ', 'Bay ')}
                                    </div>
                                ))}
                                
                                {timeSlots.map(slot => (
                                    <React.Fragment key={slot}>
                                        <div className="h-8 flex items-center justify-end pr-1 text-[9px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-surface-dark">
                                            {formatTime12(slot)}
                                        </div>
                                        {resources.map(resource => {
                                            const [slotHour, slotMin] = slot.split(':').map(Number);
                                            const slotStart = slotHour * 60 + slotMin;
                                            const slotEnd = slotStart + 30;
                                            
                                            const closure = getClosureForSlot(resource.id, calendarDate, slotStart, slotEnd);
                                            
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
                                                    title={closure ? `CLOSED: ${closure.title}` : booking ? `${booking.user_name || 'Booked'} - Click for details` : undefined}
                                                    onClick={booking && !closure ? () => setSelectedCalendarBooking(booking) : undefined}
                                                    className={`h-8 rounded border ${
                                                        closure
                                                            ? 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/30'
                                                            : booking 
                                                                ? isConference
                                                                    ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-300 dark:border-purple-500/30 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-500/30'
                                                                    : 'bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/30 cursor-pointer hover:bg-green-200 dark:hover:bg-green-500/30' 
                                                                : isConference
                                                                    ? 'bg-purple-50/50 dark:bg-purple-500/5 border-purple-100 dark:border-purple-500/10 hover:bg-purple-100/50 dark:hover:bg-purple-500/10'
                                                                    : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5'
                                                    } transition-colors`}
                                                >
                                                    {closure ? (
                                                        <div className="px-1 h-full flex items-center">
                                                            <p className="text-[10px] font-medium truncate text-red-600 dark:text-red-400">
                                                                CLOSED
                                                            </p>
                                                        </div>
                                                    ) : booking && (
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
                    <div className="fixed inset-0 bg-black/50" onClick={() => { setActionModal(null); setSelectedRequest(null); setError(null); setShowTrackmanConfirm(false); }} />
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
                                    
                                    {selectedBayId && availabilityStatus && (
                                        <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 text-sm ${
                                            availabilityStatus === 'checking' 
                                                ? 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                                                : availabilityStatus === 'available'
                                                    ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                                                    : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                        }`}>
                                            <span className={`material-symbols-outlined text-base ${availabilityStatus === 'checking' ? 'animate-spin' : ''}`}>
                                                {availabilityStatus === 'checking' ? 'progress_activity' : availabilityStatus === 'available' ? 'check_circle' : 'warning'}
                                            </span>
                                            <span>
                                                {availabilityStatus === 'checking' && 'Checking availability...'}
                                                {availabilityStatus === 'available' && 'This time slot is available'}
                                                {availabilityStatus === 'conflict' && (conflictDetails || 'Conflict detected')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {actionModal === 'decline' && selectedRequest?.status !== 'approved' && (
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
                                    onClick={() => { setActionModal(null); setSelectedRequest(null); setError(null); setShowTrackmanConfirm(false); }}
                                    className="flex-1 py-3 px-4 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={actionModal === 'approve' ? initiateApproval : handleDecline}
                                    disabled={isProcessing || (actionModal === 'approve' && (!selectedBayId || availabilityStatus === 'conflict' || availabilityStatus === 'checking'))}
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
                                    {actionModal === 'approve' ? 'Approve' : (selectedRequest?.status === 'approved' ? 'Cancel Booking' : 'Decline')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showTrackmanConfirm && selectedRequest && createPortal(
                <div className="fixed inset-0 z-[10002] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setShowTrackmanConfirm(false)} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 max-w-sm w-full shadow-xl pointer-events-auto">
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">sports_golf</span>
                                </div>
                                <h3 className="text-lg font-bold text-primary dark:text-white mb-2">Trackman Confirmation</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Have you created this booking in Trackman?
                                </p>
                            </div>
                            
                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg mb-4 text-sm">
                                <p className="font-medium text-primary dark:text-white">{selectedRequest.user_name || selectedRequest.user_email}</p>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {formatDateShort(selectedRequest.request_date)} • {formatTime12(selectedRequest.start_time)} - {formatTime12(selectedRequest.end_time)}
                                </p>
                                {selectedBayId && (
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {resources.find(r => r.id === selectedBayId)?.name || `Bay ${selectedBayId}`}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowTrackmanConfirm(false)}
                                    className="flex-1 py-3 px-4 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                                    disabled={isProcessing}
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={isProcessing}
                                    className="flex-1 py-3 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? (
                                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-sm">check</span>
                                    )}
                                    Yes, Approve
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showManualBooking && createPortal(
                <ManualBookingModal 
                    resources={resources}
                    defaultMemberEmail={rescheduleEmail || undefined}
                    onClose={() => { setShowManualBooking(false); setRescheduleEmail(null); }}
                    onSuccess={() => {
                        setShowManualBooking(false);
                        setRescheduleEmail(null);
                        const fetchUpdatedData = async () => {
                            try {
                                const [requestsRes, pendingRes] = await Promise.all([
                                    fetch('/api/booking-requests?include_all=true'),
                                    fetch('/api/pending-bookings')
                                ]);
                                let allRequests: BookingRequest[] = [];
                                if (requestsRes.ok) {
                                    const data = await requestsRes.json();
                                    allRequests = data.map((r: any) => ({ ...r, source: 'booking_request' as const }));
                                }
                                if (pendingRes.ok) {
                                    const pendingBookings = await pendingRes.json();
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
                            } catch (err) {
                                console.error('Failed to refresh data:', err);
                            }
                        };
                        fetchUpdatedData();
                    }}
                />,
                document.body
            )}

            {selectedCalendarBooking && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedCalendarBooking(null)} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 max-w-md w-full shadow-xl pointer-events-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-primary dark:text-white">
                                    Booking Details
                                </h3>
                                <button
                                    onClick={() => setSelectedCalendarBooking(null)}
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">close</span>
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-primary dark:text-white text-lg">person</span>
                                        <div>
                                            <p className="font-bold text-primary dark:text-white">{selectedCalendarBooking.user_name || 'Unknown'}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCalendarBooking.user_email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
                                        <p className="font-medium text-primary dark:text-white text-sm">{formatDateShort(selectedCalendarBooking.request_date)}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Time</p>
                                        <p className="font-medium text-primary dark:text-white text-sm">
                                            {formatTime12(selectedCalendarBooking.start_time)} - {formatTime12(selectedCalendarBooking.end_time)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                                        <p className="font-medium text-primary dark:text-white text-sm">{selectedCalendarBooking.duration_minutes} min</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bay/Resource</p>
                                        <p className="font-medium text-primary dark:text-white text-sm">{selectedCalendarBooking.bay_name || selectedCalendarBooking.resource_name || '-'}</p>
                                    </div>
                                </div>

                                {((selectedCalendarBooking as any).booking_source || (selectedCalendarBooking as any).guest_count) && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {(selectedCalendarBooking as any).booking_source && (
                                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Booking Source</p>
                                                <p className="font-medium text-primary dark:text-white text-sm">{(selectedCalendarBooking as any).booking_source}</p>
                                            </div>
                                        )}
                                        {(selectedCalendarBooking as any).guest_count !== undefined && (selectedCalendarBooking as any).guest_count > 0 && (
                                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Guest Count</p>
                                                <p className="font-medium text-primary dark:text-white text-sm">{(selectedCalendarBooking as any).guest_count}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedCalendarBooking.notes && (
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
                                        <p className="font-medium text-primary dark:text-white text-sm">{selectedCalendarBooking.notes}</p>
                                    </div>
                                )}

                                {(selectedCalendarBooking as any).created_by_staff_id && (
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created by Staff</p>
                                        <p className="font-medium text-primary dark:text-white text-sm">{(selectedCalendarBooking as any).created_by_staff_id}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col gap-2 mt-6">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setRescheduleEmail(selectedCalendarBooking.user_email);
                                            setSelectedCalendarBooking(null);
                                            setShowManualBooking(true);
                                        }}
                                        className="flex-1 py-3 px-4 rounded-lg bg-accent text-primary font-medium flex items-center justify-center gap-2"
                                        disabled={isCancellingFromModal}
                                    >
                                        <span className="material-symbols-outlined text-sm">schedule</span>
                                        Reschedule
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!selectedCalendarBooking) return;
                                            
                                            setIsCancellingFromModal(true);
                                            try {
                                                const res = await fetch(`/api/booking-requests/${selectedCalendarBooking.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        status: 'cancelled',
                                                        staff_notes: 'Cancelled from calendar view',
                                                        cancelled_by: actualUser?.email || user?.email
                                                    })
                                                });
                                                
                                                if (!res.ok) {
                                                    const errData = await res.json();
                                                    throw new Error(errData.error || 'Failed to cancel booking');
                                                }
                                                
                                                try {
                                                    await fetch('/api/notifications', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            user_email: selectedCalendarBooking.user_email,
                                                            title: 'Booking Cancelled',
                                                            message: `Your booking for ${formatDateShort(selectedCalendarBooking.request_date)} at ${formatTime12(selectedCalendarBooking.start_time)} has been cancelled by staff.`,
                                                            type: 'booking_cancelled',
                                                            related_id: selectedCalendarBooking.id,
                                                            related_type: 'booking'
                                                        })
                                                    });
                                                } catch (notifErr) {
                                                    console.error('Failed to create cancellation notification:', notifErr);
                                                }
                                                
                                                setApprovedBookings(prev => prev.filter(b => b.id !== selectedCalendarBooking.id));
                                                setSelectedCalendarBooking(null);
                                            } catch (err: any) {
                                                console.error('Failed to cancel booking:', err);
                                                alert(err.message || 'Failed to cancel booking');
                                            } finally {
                                                setIsCancellingFromModal(false);
                                            }
                                        }}
                                        disabled={isCancellingFromModal}
                                        className="flex-1 py-3 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCancellingFromModal ? (
                                            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        )}
                                        Cancel
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedCalendarBooking(null)}
                                    className="w-full py-2 px-4 rounded-lg text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                    disabled={isCancellingFromModal}
                                >
                                    Close
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

const ManualBookingModal: React.FC<{
    resources: Resource[];
    onClose: () => void;
    onSuccess: () => void;
    defaultMemberEmail?: string;
}> = ({ resources, onClose, onSuccess, defaultMemberEmail }) => {
    const { showToast } = useToast();
    const [memberEmail, setMemberEmail] = useState(defaultMemberEmail || '');
    const [memberLookupStatus, setMemberLookupStatus] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle');
    const [memberName, setMemberName] = useState<string | null>(null);
    const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('10:00');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [resourceId, setResourceId] = useState<number | ''>('');
    const [guestCount, setGuestCount] = useState(0);
    const [bookingSource, setBookingSource] = useState<string>('Trackman');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!memberEmail || !memberEmail.includes('@')) {
            setMemberLookupStatus('idle');
            setMemberName(null);
            return;
        }

        if (lookupTimeoutRef.current) {
            clearTimeout(lookupTimeoutRef.current);
        }

        setMemberLookupStatus('checking');
        lookupTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/members?email=${encodeURIComponent(memberEmail)}`);
                if (res.ok) {
                    const data = await res.json();
                    const member = data.find((m: any) => m.email?.toLowerCase() === memberEmail.toLowerCase());
                    if (member) {
                        setMemberLookupStatus('found');
                        setMemberName(member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : null);
                    } else {
                        setMemberLookupStatus('not_found');
                        setMemberName(null);
                    }
                } else {
                    setMemberLookupStatus('not_found');
                    setMemberName(null);
                }
            } catch (err) {
                setMemberLookupStatus('not_found');
                setMemberName(null);
            }
        }, 500);

        return () => {
            if (lookupTimeoutRef.current) {
                clearTimeout(lookupTimeoutRef.current);
            }
        };
    }, [memberEmail]);

    const handleSubmit = async () => {
        if (!memberEmail || memberLookupStatus !== 'found') {
            setError('Please enter a valid member email');
            return;
        }
        if (!resourceId) {
            setError('Please select a resource');
            return;
        }
        if (!bookingDate || !startTime) {
            setError('Please select date and time');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/staff/bookings/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    member_email: memberEmail,
                    resource_id: resourceId,
                    booking_date: bookingDate,
                    start_time: startTime,
                    duration_minutes: durationMinutes,
                    guest_count: guestCount,
                    booking_source: bookingSource,
                    notes: notes || undefined
                })
            });

            if (res.ok) {
                showToast('Booking created successfully!', 'success');
                onSuccess();
            } else {
                const data = await res.json();
                setError(data.message || data.error || 'Failed to create booking');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        for (let hour = 8; hour <= 21; hour++) {
            for (let minute = 0; minute < 60; minute += 5) {
                if (hour === 21 && minute > 30) break;
                slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
            }
        }
        return slots;
    }, []);

    const bookingSources = ['Trackman', 'YGB', 'Mindbody', 'Texted Concierge', 'Called', 'Other'];

    return (
        <div className="fixed inset-0 z-[10001] overflow-y-auto">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 max-w-md w-full shadow-xl pointer-events-auto max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xl font-bold text-primary dark:text-white">Manual Booking</h3>
                        <button 
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">close</span>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Member Email *</label>
                            <input
                                type="email"
                                value={memberEmail}
                                onChange={(e) => setMemberEmail(e.target.value)}
                                placeholder="member@example.com"
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-primary dark:text-white"
                            />
                            {memberLookupStatus === 'checking' && (
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                                    Looking up member...
                                </p>
                            )}
                            {memberLookupStatus === 'found' && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">check_circle</span>
                                    {memberName || 'Member found'}
                                </p>
                            )}
                            {memberLookupStatus === 'not_found' && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">error</span>
                                    Member not found
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resource *</label>
                            <select
                                value={resourceId}
                                onChange={(e) => setResourceId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-primary dark:text-white"
                            >
                                <option value="">Select a bay or room...</option>
                                {resources.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.type === 'conference_room' ? 'Conference Room' : r.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                                <input
                                    type="date"
                                    value={bookingDate}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-primary dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time *</label>
                                <select
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-primary dark:text-white"
                                >
                                    {timeSlots.map(slot => (
                                        <option key={slot} value={slot}>{formatTime12(slot)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration *</label>
                                <select
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-primary dark:text-white"
                                >
                                    <option value={30}>30 minutes</option>
                                    <option value={60}>60 minutes</option>
                                    <option value={90}>90 minutes</option>
                                    <option value={120}>120 minutes</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guests</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={guestCount}
                                    onChange={(e) => setGuestCount(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-primary dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Booking Source *</label>
                            <select
                                value={bookingSource}
                                onChange={(e) => setBookingSource(e.target.value)}
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-primary dark:text-white"
                            >
                                {bookingSources.map(source => (
                                    <option key={source} value={source}>{source}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any additional notes..."
                                rows={2}
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-primary dark:text-white resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-medium"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || memberLookupStatus !== 'found' || !resourceId}
                            className="flex-1 py-3 px-4 rounded-lg bg-primary text-white font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">add</span>
                            )}
                            Create Booking
                        </button>
                    </div>
                </div>
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

const WELLNESS_CATEGORY_TABS = [
    { id: 'all', label: 'All', icon: 'calendar_month' },
    { id: 'Classes', label: 'Classes', icon: 'fitness_center' },
    { id: 'MedSpa', label: 'MedSpa', icon: 'spa' },
    { id: 'Recovery', label: 'Recovery', icon: 'ac_unit' },
    { id: 'Therapy', label: 'Therapy', icon: 'healing' },
    { id: 'Nutrition', label: 'Nutrition', icon: 'nutrition' },
    { id: 'Personal Training', label: 'Training', icon: 'sports' },
    { id: 'Mindfulness', label: 'Mindfulness', icon: 'self_improvement' },
    { id: 'Outdoors', label: 'Outdoors', icon: 'hiking' },
    { id: 'General', label: 'General', icon: 'category' },
];

const WellnessAdminContent: React.FC = () => {
    const [classes, setClasses] = useState<WellnessClass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<WellnessClass>>({
        category: 'Classes',
        status: 'available',
        duration: '60 min'
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isViewingEnrollments, setIsViewingEnrollments] = useState(false);
    const [selectedClass, setSelectedClass] = useState<WellnessClass | null>(null);
    const [enrollments, setEnrollments] = useState<Participant[]>([]);
    const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);

    const categories = ['Classes', 'MedSpa', 'Recovery', 'Therapy', 'Nutrition', 'Personal Training', 'Mindfulness', 'Outdoors', 'General'];

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        const handleOpenCreate = () => openCreate();
        window.addEventListener('openWellnessCreate', handleOpenCreate);
        return () => window.removeEventListener('openWellnessCreate', handleOpenCreate);
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
            category: activeCategory === 'all' ? 'Classes' : activeCategory,
            status: 'available',
            duration: '60 min',
            date: tomorrow.toISOString().split('T')[0]
        });
        setEditId(null);
        setIsEditing(true);
        setError(null);
    };

    const filteredClasses = activeCategory === 'all' 
        ? classes 
        : classes.filter(c => c.category === activeCategory);

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
                setFormData({ category: 'Classes', status: 'available', duration: '60 min' });
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
        <div className="space-y-6 animate-pop-in">
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mx-4 px-4 animate-pop-in" style={{animationDelay: '0.05s'}}>
                {WELLNESS_CATEGORY_TABS.map(tab => (
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

            <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/10 animate-pop-in" style={{animationDelay: '0.1s'}}>
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
                ) : filteredClasses.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No {activeCategory === 'all' ? 'wellness classes' : activeCategory.toLowerCase()} scheduled. Add your first!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredClasses.map((cls, index) => (
                            <div 
                                key={cls.id}
                                className={`flex items-center justify-between p-4 rounded-xl border animate-pop-in ${
                                    cls.is_active 
                                        ? 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/10' 
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/5 opacity-60'
                                }`}
                                style={{animationDelay: `${0.15 + index * 0.03}s`}}
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
                        <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md modal-safe-height overflow-y-auto pointer-events-auto">
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
        <div className="animate-pop-in">
            {/* Sub-tab navigation */}
            <div className="flex gap-2 mb-6 animate-pop-in" style={{animationDelay: '0.05s'}}>
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
        <div className="space-y-6 animate-pop-in">
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/10 animate-pop-in" style={{animationDelay: '0.05s'}}>
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
                    <div className="space-y-3 animate-pop-in" style={{animationDelay: '0.1s'}}>
                        {staffUsers.map((staff, index) => (
                            <div 
                                key={staff.id}
                                onClick={() => openEditModal(staff)}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors hover:border-primary/50 animate-pop-in ${
                                    staff.is_active 
                                        ? 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-surface-dark' 
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/5 opacity-60'
                                }`}
                                style={{animationDelay: `${0.15 + index * 0.03}s`}}
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
                                        onClick={(e) => { e.stopPropagation(); openEditModal(staff); }}
                                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        title="Edit"
                                    >
                                        <span className="material-symbols-outlined text-xl">edit</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveStaff(staff); }}
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
        <div className="space-y-6 animate-pop-in">
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/10 animate-pop-in" style={{animationDelay: '0.05s'}}>
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
                    <div className="space-y-3 animate-pop-in" style={{animationDelay: '0.1s'}}>
                        {adminUsers.map((admin, index) => (
                            <div 
                                key={admin.id}
                                onClick={() => openEditModal(admin)}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors hover:border-primary/50 animate-pop-in ${
                                    admin.is_active 
                                        ? 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-surface-dark' 
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/5 opacity-60'
                                }`}
                                style={{animationDelay: `${0.15 + index * 0.03}s`}}
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
                                        onClick={(e) => { e.stopPropagation(); openEditModal(admin); }}
                                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        title="Edit"
                                    >
                                        <span className="material-symbols-outlined text-xl">edit</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveAdmin(admin); }}
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
    show_in_comparison: boolean;
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

// --- BLOCKS ADMIN ---

interface AvailabilityBlock {
    id: number;
    bay_id: number;
    bay_name: string;
    block_date: string;
    start_time: string;
    end_time: string;
    block_type: string;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    closure_id: number | null;
}

interface BlocksClosure {
    id: number;
    title: string;
    reason: string | null;
    startDate: string;
    startTime: string | null;
    endDate: string;
    endTime: string | null;
    affectedAreas: string | null;
    isActive: boolean;
    createdAt: string;
    createdBy: string | null;
}

interface BlocksClosureForm {
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    affected_areas: string;
    reason: string;
    title: string;
    notify_members: boolean;
}

const BlocksAdmin: React.FC = () => {
    const { actualUser } = useData();
    const { showToast } = useToast();
    const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
    const [resources, setResources] = useState<{ id: number; name: string; type: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBlock, setSelectedBlock] = useState<AvailabilityBlock | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [filterResource, setFilterResource] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('');
    const [showPast, setShowPast] = useState(false);
    const [activeTab, setActiveTab] = useState<'closures' | 'blocks'>('closures');
    
    const [closures, setClosures] = useState<BlocksClosure[]>([]);
    const [closuresLoading, setClosuresLoading] = useState(true);
    const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
    const [editingClosureId, setEditingClosureId] = useState<number | null>(null);
    const [closureForm, setClosureForm] = useState<BlocksClosureForm>({
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        affected_areas: 'entire_facility',
        reason: '',
        title: '',
        notify_members: false
    });
    const [closureSaving, setClosureSaving] = useState(false);

    const fetchClosures = async () => {
        try {
            const res = await fetch('/api/closures');
            if (res.ok) {
                const data = await res.json();
                setClosures(data);
            }
        } catch (err) {
            console.error('Failed to fetch closures:', err);
        } finally {
            setClosuresLoading(false);
        }
    };

    const fetchBlocks = async () => {
        setIsLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const params = new URLSearchParams();
            if (!showPast) {
                params.append('start_date', today);
            }
            if (filterResource !== 'all') {
                params.append('bay_id', filterResource);
            }
            
            const [blocksRes, resourcesRes] = await Promise.all([
                fetch(`/api/availability-blocks?${params}`),
                fetch('/api/resources')
            ]);
            
            if (blocksRes.ok) setBlocks(await blocksRes.json());
            if (resourcesRes.ok) setResources(await resourcesRes.json());
        } catch (error) {
            console.error('Failed to fetch blocks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBlocks();
        fetchClosures();
    }, []);

    useEffect(() => {
        fetchBlocks();
    }, [filterResource, showPast]);

    const resetClosureForm = () => {
        setClosureForm({
            start_date: '',
            start_time: '',
            end_date: '',
            end_time: '',
            affected_areas: 'entire_facility',
            reason: '',
            title: '',
            notify_members: false
        });
        setEditingClosureId(null);
    };

    const handleSaveClosure = async () => {
        if (!closureForm.start_date || !closureForm.affected_areas) return;
        setClosureSaving(true);
        try {
            const url = editingClosureId 
                ? `/api/closures/${editingClosureId}` 
                : '/api/closures';
            const method = editingClosureId ? 'PUT' : 'POST';
            
            const payload = editingClosureId 
                ? { ...closureForm }
                : { ...closureForm, created_by: actualUser?.email };
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsClosureModalOpen(false);
                resetClosureForm();
                fetchClosures();
                fetchBlocks();
                showToast(
                    editingClosureId ? 'Closure updated successfully' : 'Closure created successfully',
                    'success'
                );
            } else {
                const error = await res.json().catch(() => ({}));
                showToast(error.error || 'Failed to save closure', 'error');
            }
        } catch (err) {
            console.error('Failed to save closure:', err);
            showToast('Failed to save closure', 'error');
        } finally {
            setClosureSaving(false);
        }
    };

    const handleEditClosure = (closure: BlocksClosure) => {
        setEditingClosureId(closure.id);
        setClosureForm({
            start_date: closure.startDate,
            start_time: closure.startTime || '',
            end_date: closure.endDate,
            end_time: closure.endTime || '',
            affected_areas: closure.affectedAreas || 'entire_facility',
            reason: closure.reason || '',
            title: closure.title || '',
            notify_members: false
        });
        setIsClosureModalOpen(true);
    };

    const handleDeleteClosure = async (closureId: number) => {
        if (!confirm('Are you sure you want to delete this closure? This will also remove the calendar event and announcement.')) return;
        try {
            const res = await fetch(`/api/closures/${closureId}`, { method: 'DELETE' });
            if (res.ok) {
                fetchClosures();
                fetchBlocks();
                showToast('Closure deleted successfully', 'success');
            } else {
                showToast('Failed to delete closure', 'error');
            }
        } catch (err) {
            console.error('Failed to delete closure:', err);
            showToast('Failed to delete closure', 'error');
        }
    };

    const openNewClosure = () => {
        resetClosureForm();
        setIsClosureModalOpen(true);
    };

    const handleDeleteBlock = async (id: number) => {
        if (!confirm('Are you sure you want to delete this availability block?')) return;
        
        try {
            const res = await fetch(`/api/availability-blocks/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setBlocks(blocks.filter(b => b.id !== id));
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleUpdateBlock = async () => {
        if (!selectedBlock) return;
        
        try {
            const res = await fetch(`/api/availability-blocks/${selectedBlock.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bay_id: selectedBlock.bay_id,
                    block_date: selectedBlock.block_date,
                    start_time: selectedBlock.start_time,
                    end_time: selectedBlock.end_time,
                    block_type: selectedBlock.block_type,
                    notes: selectedBlock.notes
                })
            });
            
            if (res.ok) {
                setIsEditing(false);
                setSelectedBlock(null);
                fetchBlocks();
            }
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric' 
        });
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const bays = resources.filter(r => r.type === 'simulator');

    const formatAffectedAreas = (areas: string | null) => {
        if (!areas) return 'Unknown';
        if (areas === 'entire_facility') return 'Entire Facility';
        if (areas === 'all_bays') return 'All Bays';
        if (areas === 'conference_room') return 'Conference Room';
        if (areas.startsWith('bay_')) {
            const bayId = parseInt(areas.replace('bay_', ''));
            const bay = bays.find(b => b.id === bayId);
            return bay ? bay.name : areas;
        }
        return areas;
    };

    const filteredBlocks = filterDate 
        ? blocks.filter(b => b.block_date === filterDate)
        : blocks;
    const conferenceRoom = resources.find(r => r.type === 'conference_room');

    if (isLoading && closuresLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-pop-in">
            <div className="flex gap-2 mb-4 animate-pop-in" style={{animationDelay: '0.05s'}}>
                <button
                    onClick={() => setActiveTab('closures')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        activeTab === 'closures' 
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/20'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg align-middle mr-1">block</span>
                    Closures ({closures.length})
                </button>
                <button
                    onClick={() => setActiveTab('blocks')}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        activeTab === 'blocks' 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/20'
                    }`}
                >
                    <span className="material-symbols-outlined text-lg align-middle mr-1">event_busy</span>
                    Blocks ({blocks.length})
                </button>
            </div>

            {activeTab === 'closures' && (
                <div className="space-y-4 animate-pop-in" style={{animationDelay: '0.1s'}}>
                    <button
                        onClick={openNewClosure}
                        className="w-full py-3 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Add Closure
                    </button>

                    {closuresLoading ? (
                        <div className="text-center py-8 text-gray-400 dark:text-white/50">Loading closures...</div>
                    ) : closures.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-white/50">
                            <span className="material-symbols-outlined text-4xl mb-2">event_available</span>
                            <p>No active closures</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {closures.map((closure, index) => (
                                <div 
                                    key={closure.id} 
                                    onClick={() => handleEditClosure(closure)}
                                    className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 cursor-pointer hover:border-red-400 dark:hover:border-red-500/50 transition-all animate-pop-in"
                                    style={{animationDelay: `${0.15 + index * 0.05}s`}}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                <span className="text-[10px] font-bold uppercase text-red-500 dark:text-red-400">Closure</span>
                                                <span className="text-[10px] text-red-400 dark:text-red-400/70">• {formatAffectedAreas(closure.affectedAreas)}</span>
                                            </div>
                                            <h4 className="font-bold text-primary dark:text-white mb-1">{closure.title}</h4>
                                            {closure.reason && (
                                                <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed mb-2">{closure.reason}</p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                <div className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-500/20 px-2 py-1 rounded text-xs text-red-600 dark:text-red-400">
                                                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                                    <span>
                                                        {closure.startDate}
                                                        {closure.endDate && closure.endDate !== closure.startDate ? ` - ${closure.endDate}` : ''}
                                                    </span>
                                                </div>
                                                {(closure.startTime || closure.endTime) && (
                                                    <div className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-500/20 px-2 py-1 rounded text-xs text-red-600 dark:text-red-400">
                                                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                        <span>{closure.startTime}{closure.endTime ? ` - ${closure.endTime}` : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClosure(closure.id); }} 
                                            className="text-red-400 dark:text-red-400/50 hover:text-red-600 dark:hover:text-red-400 p-1"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'blocks' && (
                <div className="space-y-4 animate-pop-in" style={{animationDelay: '0.1s'}}>
                    <div className="flex flex-wrap gap-3 items-center animate-pop-in" style={{animationDelay: '0.15s'}}>
                        <select
                            value={filterResource}
                            onChange={(e) => setFilterResource(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-primary dark:text-white text-sm"
                        >
                            <option value="all">All Resources</option>
                            {bays.map(bay => (
                                <option key={bay.id} value={bay.id}>{bay.name}</option>
                            ))}
                            {conferenceRoom && (
                                <option value={conferenceRoom.id}>{conferenceRoom.name}</option>
                            )}
                        </select>
                        
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-primary dark:text-white text-sm"
                        />
                        {filterDate && (
                            <button
                                onClick={() => setFilterDate('')}
                                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/70 text-sm hover:bg-gray-200 dark:hover:bg-white/20"
                            >
                                Clear
                            </button>
                        )}
                        
                        <label className="flex items-center gap-2 text-gray-600 dark:text-white/70 text-sm ml-auto">
                            <input
                                type="checkbox"
                                checked={showPast}
                                onChange={(e) => setShowPast(e.target.checked)}
                                className="rounded"
                            />
                            Show past
                        </label>
                    </div>

                    {filteredBlocks.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-white/50">
                            <span className="material-symbols-outlined text-4xl mb-2">event_available</span>
                            <p>No availability blocks found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredBlocks.map((block, index) => (
                                <div
                                    key={block.id}
                                    className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center gap-4 animate-pop-in"
                                    style={{animationDelay: `${0.2 + index * 0.05}s`}}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-primary dark:text-white">{block.bay_name}</span>
                                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                                                {block.block_type}
                                            </span>
                                            {block.closure_id && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs">
                                                    From Closure
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 dark:text-white/70 text-sm">
                                            {formatDate(block.block_date)} · {formatTime(block.start_time)} - {formatTime(block.end_time)}
                                        </p>
                                        {block.notes && (
                                            <p className="text-gray-400 dark:text-white/50 text-xs mt-1 truncate">{block.notes}</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedBlock(block);
                                                setIsEditing(true);
                                            }}
                                            className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/20 hover:text-primary dark:hover:text-white transition-all"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteBlock(block.id)}
                                            className="p-2 rounded-xl bg-red-100 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {isClosureModalOpen && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsClosureModalOpen(false); resetClosureForm(); }} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 border border-gray-200 dark:border-white/10 pointer-events-auto">
                            <h3 className="font-bold text-lg mb-5 text-primary dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">block</span>
                                {editingClosureId ? 'Edit Closure' : 'Add Closure'}
                            </h3>
                            <div className="space-y-3 mb-5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">Title</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Holiday Closure, Maintenance" 
                                        className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-sm text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                                        value={closureForm.title} 
                                        onChange={e => setClosureForm({...closureForm, title: e.target.value})} 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">Start Date *</label>
                                        <input 
                                            type="date" 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-sm text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                                            value={closureForm.start_date} 
                                            onChange={e => setClosureForm({...closureForm, start_date: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">Start Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-sm text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                                            value={closureForm.start_time} 
                                            onChange={e => setClosureForm({...closureForm, start_time: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">End Date</label>
                                        <input 
                                            type="date" 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-sm text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                                            value={closureForm.end_date} 
                                            onChange={e => setClosureForm({...closureForm, end_date: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">End Time</label>
                                        <input 
                                            type="time" 
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-sm text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all" 
                                            value={closureForm.end_time} 
                                            onChange={e => setClosureForm({...closureForm, end_time: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">Resource *</label>
                                    <select 
                                        className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-sm text-primary dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                                        value={closureForm.affected_areas}
                                        onChange={e => setClosureForm({...closureForm, affected_areas: e.target.value})}
                                    >
                                        <option value="entire_facility">Entire Facility</option>
                                        <option value="all_bays">All Bays</option>
                                        <option value="conference_room">Conference Room</option>
                                        {bays.map(bay => (
                                            <option key={bay.id} value={`bay_${bay.id}`}>{bay.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">Internal Note</label>
                                    <textarea 
                                        className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-sm text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none" 
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
                                    <Toggle
                                        checked={closureForm.notify_members}
                                        onChange={(val) => setClosureForm({...closureForm, notify_members: val})}
                                        label="Notify members about closure"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => { setIsClosureModalOpen(false); resetClosureForm(); }} className="px-5 py-2.5 text-gray-500 dark:text-white/60 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
                                <button 
                                    onClick={handleSaveClosure} 
                                    disabled={closureSaving || !closureForm.start_date}
                                    className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-bold shadow-md hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    {closureSaving ? 'Saving...' : editingClosureId ? 'Save Changes' : 'Add Closure'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isEditing && selectedBlock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#1a1f12] rounded-3xl border border-white/10 p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Edit Block</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-white/70 text-sm mb-1 block">Resource</label>
                                <select
                                    value={selectedBlock.bay_id}
                                    onChange={(e) => setSelectedBlock({...selectedBlock, bay_id: parseInt(e.target.value)})}
                                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
                                >
                                    {resources.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-white/70 text-sm mb-1 block">Date</label>
                                <input
                                    type="date"
                                    value={selectedBlock.block_date}
                                    onChange={(e) => setSelectedBlock({...selectedBlock, block_date: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-white/70 text-sm mb-1 block">Start Time</label>
                                    <input
                                        type="time"
                                        value={selectedBlock.start_time.substring(0, 5)}
                                        onChange={(e) => setSelectedBlock({...selectedBlock, start_time: e.target.value + ':00'})}
                                        className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-white/70 text-sm mb-1 block">End Time</label>
                                    <input
                                        type="time"
                                        value={selectedBlock.end_time.substring(0, 5)}
                                        onChange={(e) => setSelectedBlock({...selectedBlock, end_time: e.target.value + ':00'})}
                                        className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-white/70 text-sm mb-1 block">Block Type</label>
                                <select
                                    value={selectedBlock.block_type}
                                    onChange={(e) => setSelectedBlock({...selectedBlock, block_type: e.target.value})}
                                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white"
                                >
                                    <option value="blocked">Blocked</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="reserved">Reserved</option>
                                    <option value="closure">Closure</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-white/70 text-sm mb-1 block">Notes</label>
                                <textarea
                                    value={selectedBlock.notes || ''}
                                    onChange={(e) => setSelectedBlock({...selectedBlock, notes: e.target.value})}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white resize-none"
                                    placeholder="Optional notes..."
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setSelectedBlock(null);
                                }}
                                className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateBlock}
                                className="flex-1 py-3 rounded-xl bg-brand-green text-white font-medium hover:opacity-90 transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TiersAdmin: React.FC = () => {
    const [tiers, setTiers] = useState<MembershipTier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [newFeatureKey, setNewFeatureKey] = useState('');

    const getDefaultTier = (): MembershipTier => ({
        id: 0,
        name: '',
        slug: '',
        price_string: '',
        description: '',
        button_text: 'Apply Now',
        sort_order: tiers.length,
        is_active: true,
        is_popular: false,
        show_in_comparison: true,
        highlighted_features: [],
        all_features: {},
        daily_sim_minutes: 0,
        guest_passes_per_month: 0,
        booking_window_days: 7,
        daily_conf_room_minutes: 0,
        can_book_simulators: false,
        can_book_conference: false,
        can_book_wellness: true,
        has_group_lessons: false,
        has_extended_sessions: false,
        has_private_lesson: false,
        has_simulator_guest_passes: false,
        has_discounted_merch: false,
        unlimited_access: false,
    });

    const openCreate = () => {
        setSelectedTier(getDefaultTier());
        setIsCreating(true);
        setIsEditing(true);
        setError(null);
        setSuccessMessage(null);
    };

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
            const url = isCreating ? '/api/membership-tiers' : `/api/membership-tiers/${selectedTier.id}`;
            const method = isCreating ? 'POST' : 'PUT';
            
            const payload = isCreating ? {
                ...selectedTier,
                slug: selectedTier.name.toLowerCase().replace(/\s+/g, '-'),
            } : selectedTier;
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Failed to ${isCreating ? 'create' : 'save'} tier`);
            }
            
            await fetchTiers();
            setSuccessMessage(`Tier ${isCreating ? 'created' : 'updated'} successfully`);
            setTimeout(() => {
                setIsEditing(false);
                setIsCreating(false);
                setSuccessMessage(null);
            }, 1000);
        } catch (err: any) {
            setError(err.message || `Failed to ${isCreating ? 'create' : 'save'} tier`);
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
        <div className="animate-pop-in">
            <div className="flex justify-between items-center mb-6 animate-pop-in" style={{animationDelay: '0.05s'}}>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tiers.length} membership tier{tiers.length !== 1 ? 's' : ''}
                </p>
                <button 
                    onClick={openCreate}
                    className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md text-sm hover:bg-primary/90 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    New Tier
                </button>
            </div>

            {/* Edit Modal - Native sheet style for reliable mobile scrolling */}
            {isEditing && selectedTier && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsEditing(false); setIsCreating(false); }} />
                    <div className="relative flex flex-col max-w-2xl w-full bg-white dark:bg-[#1a1d15] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 modal-safe-height min-h-0 overflow-hidden">
                            {/* Header - Fixed */}
                            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d15] flex-shrink-0">
                                <h3 className="font-bold text-lg text-primary dark:text-white">{isCreating ? 'New Tier' : `Edit Tier: ${selectedTier.name}`}</h3>
                                <button onClick={() => { setIsEditing(false); setIsCreating(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
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
                                    <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/30 transition-colors mt-2">
                                        <span className="text-sm text-primary dark:text-white">Show in Compare Table</span>
                                        <Toggle
                                            checked={selectedTier.show_in_comparison}
                                            onChange={(val) => setSelectedTier({...selectedTier, show_in_comparison: val})}
                                            label="Show in Compare Table"
                                        />
                                    </label>
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
                                            <Toggle
                                                checked={!!selectedTier[key as keyof MembershipTier]}
                                                onChange={(val) => setSelectedTier({...selectedTier, [key]: val})}
                                                label={label}
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* All Features (JSON Editor) */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">All Features</h4>
                                <div className="space-y-2 mb-3">
                                    {Object.entries(selectedTier.all_features || {}).map(([key, enabled]) => (
                                        <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    role="checkbox"
                                                    aria-checked={enabled}
                                                    aria-label={`Toggle ${key}`}
                                                    onClick={() => handleToggleFeature(key)}
                                                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                                        enabled 
                                                            ? 'bg-primary text-white shadow-sm' 
                                                            : 'bg-white dark:bg-[#39393D] border-2 border-gray-300 dark:border-gray-600'
                                                    }`}
                                                >
                                                    {enabled && <span className="material-symbols-outlined text-base font-bold">check</span>}
                                                </button>
                                                <span className={`text-sm ${enabled ? 'text-primary dark:text-white font-medium' : 'text-gray-400 line-through'}`}>{key}</span>
                                            </div>
                                            <button
                                                type="button"
                                                aria-label={`Remove ${key}`}
                                                onClick={() => handleRemoveFeature(key)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
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
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">These appear as bullet points on the membership cards</p>
                                
                                {/* Current highlights - editable */}
                                <div className="space-y-2 mb-4">
                                    {(selectedTier.highlighted_features || []).map((highlight, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary">
                                            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">{idx + 1}</span>
                                            <input
                                                type="text"
                                                value={highlight}
                                                onChange={e => {
                                                    const newHighlights = [...(selectedTier.highlighted_features || [])];
                                                    newHighlights[idx] = e.target.value;
                                                    setSelectedTier({...selectedTier, highlighted_features: newHighlights});
                                                }}
                                                className="flex-1 bg-transparent border-none text-sm text-primary dark:text-white font-medium focus:outline-none focus:ring-0"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newHighlights = (selectedTier.highlighted_features || []).filter((_, i) => i !== idx);
                                                    setSelectedTier({...selectedTier, highlighted_features: newHighlights});
                                                }}
                                                className="text-primary/60 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add new highlight */}
                                {(selectedTier.highlighted_features?.length || 0) < 4 && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
                                            placeholder="Add highlight (e.g., '60 min Daily Golf')..."
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                                    const val = (e.target as HTMLInputElement).value.trim();
                                                    setSelectedTier({
                                                        ...selectedTier, 
                                                        highlighted_features: [...(selectedTier.highlighted_features || []), val]
                                                    });
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={e => {
                                                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                                if (input.value.trim()) {
                                                    setSelectedTier({
                                                        ...selectedTier, 
                                                        highlighted_features: [...(selectedTier.highlighted_features || []), input.value.trim()]
                                                    });
                                                    input.value = '';
                                                }
                                            }}
                                            className="px-3 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">add</span>
                                        </button>
                                    </div>
                                )}

                                {/* Quick-add from all_features */}
                                {(selectedTier.highlighted_features?.length || 0) < 4 && Object.keys(selectedTier.all_features || {}).length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-2">Quick add from features:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(selectedTier.all_features || {}).map(([key, featureData]) => {
                                                const label = typeof featureData === 'object' && featureData !== null && 'label' in featureData 
                                                    ? (featureData as any).label 
                                                    : key;
                                                const isAlreadyHighlighted = selectedTier.highlighted_features?.includes(label);
                                                if (isAlreadyHighlighted) return null;
                                                return (
                                                    <button 
                                                        key={key}
                                                        type="button"
                                                        onClick={() => handleHighlightToggle(label)}
                                                        className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary dark:hover:text-white transition-colors"
                                                    >
                                                        + {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
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
                <div className="space-y-3 animate-pop-in" style={{animationDelay: '0.1s'}}>
                    {tiers.map((tier, index) => (
                        <div 
                            key={tier.id} 
                            onClick={() => openEdit(tier)}
                            className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:border-primary/30 transition-all animate-pop-in"
                            style={{animationDelay: `${0.15 + index * 0.03}s`}}
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

// --- CHANGELOG ADMIN ---

const ChangelogAdmin: React.FC = () => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    };

    return (
        <div className="space-y-6 animate-pop-in pb-32">
            <div className="text-sm text-primary/60 dark:text-white/60 mb-6">
                A complete history of updates, improvements, and new features added to the Even House app.
            </div>

            {changelog.slice().reverse().map((entry, index) => (
                <div 
                    key={entry.version}
                    className={`relative pl-8 pb-6 ${index !== changelog.length - 1 ? 'border-l-2 border-primary/20 dark:border-white/20' : ''}`}
                >
                    <div className={`absolute left-0 top-0 w-4 h-4 rounded-full -translate-x-[9px] ${
                        entry.isMajor 
                            ? 'bg-primary dark:bg-accent ring-4 ring-primary/20 dark:ring-accent/20' 
                            : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    
                    <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-primary/10 dark:border-white/10">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-lg font-bold ${
                                        entry.isMajor 
                                            ? 'text-primary dark:text-accent' 
                                            : 'text-primary dark:text-white'
                                    }`}>
                                        v{entry.version}
                                    </span>
                                    {entry.isMajor && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 dark:bg-accent/20 text-primary dark:text-accent px-2 py-0.5 rounded">
                                            Major Release
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-base font-semibold text-primary dark:text-white">
                                    {entry.title}
                                </h3>
                            </div>
                            <span className="text-xs text-primary/50 dark:text-white/50 whitespace-nowrap">
                                {formatDate(entry.date)}
                            </span>
                        </div>
                        
                        <ul className="space-y-2">
                            {entry.changes.map((change, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-primary/80 dark:text-white/80">
                                    <span className="material-symbols-outlined text-sm text-primary/40 dark:text-white/40 mt-0.5">check_circle</span>
                                    {change}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- STAFF TRAINING GUIDE ---

interface TrainingSection {
    id: string;
    icon: string;
    title: string;
    description: string;
    steps: { title: string; content: string }[];
}

const TRAINING_SECTIONS: TrainingSection[] = [
    {
        id: 'getting-started',
        icon: 'login',
        title: 'Getting Started',
        description: 'How to access and navigate the Staff Portal',
        steps: [
            { title: 'Logging In', content: 'Use your registered email to sign in via the verification code system. Enter your email and receive a 6-digit code - no password needed. The code expires after 15 minutes for security.' },
            { title: 'Accessing the Staff Portal', content: 'After logging in, you\'ll be automatically redirected to the Staff Portal dashboard. If you end up on the member portal, tap the menu icon and select "Staff Portal".' },
            { title: 'Navigation', content: 'The bottom navigation bar has 4 main tabs: Home, Requests, Calendar (Events & Wellness), and News. The Home dashboard shows quick access cards to all other features.' },
        ]
    },
    {
        id: 'booking-requests',
        icon: 'event_note',
        title: 'Managing Booking Requests',
        description: 'Approve, decline, or manage simulator and conference room bookings',
        steps: [
            { title: 'Viewing Requests', content: 'Tap "Requests" in the bottom nav to see all pending booking requests. New requests show at the top. A red badge shows the count of pending requests.' },
            { title: 'Request Details', content: 'Each request shows the member name, date/time requested, duration, and resource (which simulator bay or conference room).' },
            { title: 'Approving a Request', content: 'Tap a request to expand it, then tap "Approve". The system will check for conflicts with other approved bookings and facility closures. If there\'s a conflict, you\'ll see an error message explaining why.' },
            { title: 'Declining a Request', content: 'Tap "Decline" if you cannot accommodate the request. The member will be notified that their request was declined.' },
            { title: 'Calendar View', content: 'Switch to the Calendar view using the tabs at the top to see all approved bookings in a visual timeline. Red blocks indicate facility closures.' },
        ]
    },
    {
        id: 'events',
        icon: 'event',
        title: 'Managing Events',
        description: 'Create and manage club events for members',
        steps: [
            { title: 'Viewing Events', content: 'Tap "Events" in the bottom nav to see all upcoming and past events. Events sync with the club\'s Google Calendar.' },
            { title: 'Creating an Event', content: 'Tap the "+" button to create a new event. Fill in the title, date, time, location, and description. Toggle "Members Only" if the event is exclusive to members.' },
            { title: 'Editing Events', content: 'Tap the edit icon on any event to modify its details. Changes sync automatically to Google Calendar.' },
            { title: 'Event RSVPs', content: 'View who has RSVPed to each event by expanding the event details. RSVP counts help with planning and capacity management.' },
            { title: 'Deleting Events', content: 'Tap the delete icon to remove an event. This also removes it from Google Calendar. Members who RSVPed will see it removed from their dashboard.' },
        ]
    },
    {
        id: 'wellness',
        icon: 'spa',
        title: 'Managing Wellness Classes',
        description: 'Schedule and manage wellness and fitness classes',
        steps: [
            { title: 'Viewing Classes', content: 'Tap "Wellness" in the bottom nav to see all scheduled wellness classes. Classes sync with the dedicated Wellness Google Calendar.' },
            { title: 'Adding a Class', content: 'Tap "+" to add a new class. Enter the class name, instructor, date, time, duration, and capacity.' },
            { title: 'Recurring Classes', content: 'For weekly classes, you can create them individually or ask an admin to set up recurring entries.' },
            { title: 'Class Bookings', content: 'Members can book spots in classes through the member portal. You can see the booking count on each class card.' },
        ]
    },
    {
        id: 'announcements',
        icon: 'campaign',
        title: 'Managing Announcements',
        description: 'Keep members informed with news and announcements',
        steps: [
            { title: 'Viewing Announcements', content: 'Tap "News" in the bottom nav to see all announcements. Current/active announcements show first, followed by past ones.' },
            { title: 'Creating an Announcement', content: 'Tap "+ Announcement" to create a new announcement. Add a title, content, and optionally set start/end dates for when it should be visible.' },
            { title: 'Priority Levels', content: 'Set the priority level: Normal for general news, High for important notices (these appear more prominently to members), Urgent for critical alerts.' },
            { title: 'Automatic Announcements', content: 'When you create a facility closure, an announcement is automatically created and linked. When the closure is deleted, its announcement is also removed.' },
        ]
    },
    {
        id: 'directory',
        icon: 'groups',
        title: 'Member Directory',
        description: 'Search and view member information',
        steps: [
            { title: 'Accessing the Directory', content: 'From the Home dashboard, tap "Directory" to open the member search.' },
            { title: 'Searching Members', content: 'Type a name, email, or phone number in the search bar. Results update as you type.' },
            { title: 'Member Profiles', content: 'Tap a member to see their profile including membership tier, join date, contact info, and booking history.' },
            { title: 'Membership Tiers', content: 'Members have different tiers (Social, Core, Premium, Corporate, VIP) which determine their booking privileges, guest passes, and access levels.' },
        ]
    },
    {
        id: 'cafe',
        icon: 'local_cafe',
        title: 'Cafe Menu Management',
        description: 'Update menu items and prices',
        steps: [
            { title: 'Viewing the Menu', content: 'From the Home dashboard, tap "Cafe Menu" to see all menu items organized by category.' },
            { title: 'Adding Items', content: 'Tap "+" to add a new menu item. Fill in the name, price, description, and category. You can also upload an image.' },
            { title: 'Editing Items', content: 'Tap the edit icon on any item to modify its details or mark it as unavailable.' },
            { title: 'Categories', content: 'Use the category filter tabs to quickly find items. Categories include Coffee & Drinks, Food, Snacks, etc.' },
            { title: 'Image Upload', content: 'When uploading images, they\'re automatically optimized for web viewing (converted to WebP format) to ensure fast loading.' },
        ]
    },
    {
        id: 'inquiries',
        icon: 'mail',
        title: 'Handling Inquiries',
        description: 'View and respond to form submissions',
        steps: [
            { title: 'Viewing Inquiries', content: 'From the Home dashboard, tap "Inquiries" to see all form submissions including contact forms, tour requests, membership applications, and private hire inquiries.' },
            { title: 'Filtering', content: 'Use the filter buttons to view by type (Contact, Tour Request, Membership, Private Hire) or status (New, Read, Replied, Archived).' },
            { title: 'Marking Status', content: 'Update the status as you handle each inquiry: mark as Read when reviewed, Replied when you\'ve responded, or Archived when complete.' },
            { title: 'Adding Notes', content: 'Add internal notes to inquiries for follow-up reminders or to share context with other staff members.' },
        ]
    },
    {
        id: 'gallery',
        icon: 'photo_library',
        title: 'Gallery Management',
        description: 'Upload and manage venue photos',
        steps: [
            { title: 'Viewing the Gallery', content: 'From the Home dashboard, tap "Gallery" to see all venue photos organized by category.' },
            { title: 'Uploading Photos', content: 'Tap "+" to upload a new photo. Select an image, choose a category, and add an optional caption. Images are automatically optimized.' },
            { title: 'Organizing', content: 'Drag photos to reorder them, or use the sort options to arrange by date or category.' },
            { title: 'Removing Photos', content: 'Tap the delete icon to remove a photo. This performs a "soft delete" so it can be recovered if needed.' },
        ]
    },
    {
        id: 'faqs',
        icon: 'help_outline',
        title: 'FAQ Management',
        description: 'Edit frequently asked questions shown on the public site',
        steps: [
            { title: 'Viewing FAQs', content: 'From the Home dashboard, tap "FAQs" to see all questions and answers displayed on the public FAQ page.' },
            { title: 'Adding FAQs', content: 'Tap "+" to add a new question. Enter the question and answer text. New FAQs appear immediately on the public site.' },
            { title: 'Editing FAQs', content: 'Tap the edit icon to modify any existing FAQ. Changes are reflected immediately on the public site.' },
            { title: 'Ordering', content: 'FAQs are displayed in the order they were created. Consider the most common questions when adding new ones.' },
        ]
    },
    {
        id: 'closures',
        icon: 'block',
        title: 'Facility Closures & Availability',
        description: 'Block booking times for maintenance or special events',
        steps: [
            { title: 'Accessing Blocks', content: 'From the Home dashboard, tap "Closures" to manage facility closures and availability blocks.' },
            { title: 'Creating a Closure', content: 'Tap "+" to create a closure. Set the date range, time range, affected areas (simulator bays, conference room, or whole facility), and reason.' },
            { title: 'Affected Areas', content: 'Choose which resources are affected: individual simulator bays (Bay 1, Bay 2, Bay 3), the conference room, or the entire facility.' },
            { title: 'Calendar Sync', content: 'Closures automatically sync to Google Calendar and appear as red "CLOSED" blocks in the staff calendar view.' },
            { title: 'Automatic Announcements', content: 'Creating a closure automatically generates an announcement for members with the closure details.' },
            { title: 'Booking Conflicts', content: 'The system prevents staff from approving bookings that conflict with closures. You\'ll see a clear error message if there\'s a conflict.' },
        ]
    },
];

const ADMIN_SECTIONS: TrainingSection[] = [
    {
        id: 'team-access',
        icon: 'shield_person',
        title: 'Managing Team Access (Admin Only)',
        description: 'Add staff members and manage admin privileges',
        steps: [
            { title: 'Accessing Team Management', content: 'From the Home dashboard, tap "Team Access" (only visible to admins).' },
            { title: 'Adding Staff', content: 'Search for a member by email, then promote them to Staff role. They\'ll gain access to the Staff Portal.' },
            { title: 'Promoting to Admin', content: 'Admins can promote staff to Admin role, which grants access to team management, tier configuration, and version history.' },
            { title: 'Removing Access', content: 'Demote a user back to Member role to revoke their staff portal access. They\'ll retain their membership but lose admin capabilities.' },
        ]
    },
    {
        id: 'tiers',
        icon: 'loyalty',
        title: 'Tier Configuration (Admin Only)',
        description: 'Configure membership tier settings and privileges',
        steps: [
            { title: 'Viewing Tiers', content: 'From the Home dashboard, tap "Manage Tiers" (only visible to admins) to see all membership tiers.' },
            { title: 'Tier Settings', content: 'Each tier has configurable limits: daily simulator minutes, guest passes per month, booking window (how far ahead they can book), and access permissions.' },
            { title: 'Editing Privileges', content: 'Modify tier privileges to adjust what each membership level can access. Changes take effect immediately for all members of that tier.' },
            { title: 'Display Settings', content: 'Update the tier name, price display, and highlighted features shown on the public membership comparison page.' },
        ]
    },
    {
        id: 'view-as-member',
        icon: 'visibility',
        title: 'View As Member (Admin Only)',
        description: 'See the app from a member\'s perspective',
        steps: [
            { title: 'Starting View As Mode', content: 'In the member directory, find a member and tap "View As" to see the app exactly as they see it.' },
            { title: 'While Viewing', content: 'You\'ll see the member portal as that member sees it, including their bookings, events, and dashboard. A banner reminds you that you\'re in View As mode.' },
            { title: 'Taking Actions', content: 'If you try to book or RSVP while in View As mode, you\'ll see a confirmation asking if you want to do this on behalf of the member.' },
            { title: 'Exiting View As Mode', content: 'Tap the banner or use the profile menu to exit View As mode and return to your admin account.' },
        ]
    },
];

interface TrainingSectionDB {
    id: number;
    icon: string;
    title: string;
    description: string;
    steps: { title: string; content: string; imageUrl?: string; pageIcon?: string }[];
    isAdminOnly: boolean;
    sortOrder: number;
}

interface TrainingModalProps {
    isOpen: boolean;
    onClose: () => void;
    section: TrainingSectionDB | null;
    onSave: (section: Partial<TrainingSectionDB>) => Promise<void>;
}

const COMMON_ICONS = [
    'login', 'event_note', 'event', 'spa', 'campaign', 'groups', 'local_cafe',
    'mail', 'photo_library', 'help_outline', 'block', 'shield_person', 'loyalty',
    'visibility', 'settings', 'dashboard', 'person', 'notifications', 'bookmark',
    'star', 'favorite', 'check_circle', 'info', 'warning', 'error', 'lightbulb',
    'edit', 'delete', 'add', 'remove', 'search', 'home', 'menu', 'close'
];

const TrainingSectionModal: React.FC<TrainingModalProps> = ({ isOpen, onClose, section, onSave }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('help_outline');
    const [isAdminOnly, setIsAdminOnly] = useState(false);
    const [steps, setSteps] = useState<{ title: string; content: string; imageUrl?: string; pageIcon?: string }[]>([{ title: '', content: '' }]);
    const [saving, setSaving] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);

    useEffect(() => {
        if (section) {
            setTitle(section.title);
            setDescription(section.description);
            setIcon(section.icon);
            setIsAdminOnly(section.isAdminOnly);
            setSteps(section.steps.length > 0 ? section.steps : [{ title: '', content: '' }]);
        } else {
            setTitle('');
            setDescription('');
            setIcon('help_outline');
            setIsAdminOnly(false);
            setSteps([{ title: '', content: '' }]);
        }
    }, [section, isOpen]);

    const handleAddStep = () => {
        setSteps([...steps, { title: '', content: '' }]);
    };

    const handleRemoveStep = (index: number) => {
        if (steps.length > 1) {
            setSteps(steps.filter((_, i) => i !== index));
        }
    };

    const handleStepChange = (index: number, field: 'title' | 'content' | 'pageIcon', value: string) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value || undefined };
        setSteps(newSteps);
    };

    const handleStepImageUpload = async (index: number, file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const response = await fetch('/api/admin/upload-image', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                const newSteps = [...steps];
                newSteps[index] = { ...newSteps[index], imageUrl: data.imageUrl };
                setSteps(newSteps);
            }
        } catch (error) {
            console.error('Image upload failed:', error);
        }
    };

    const handleSave = async () => {
        if (!title.trim() || !description.trim()) return;
        const validSteps = steps.filter(s => s.title.trim() && s.content.trim()).map(s => ({
            title: s.title.trim(),
            content: s.content.trim(),
            ...(s.imageUrl && { imageUrl: s.imageUrl }),
            ...(s.pageIcon && { pageIcon: s.pageIcon })
        }));
        if (validSteps.length === 0) return;

        setSaving(true);
        try {
            await onSave({
                ...(section?.id && { id: section.id }),
                title: title.trim(),
                description: description.trim(),
                icon,
                isAdminOnly,
                steps: validSteps,
                sortOrder: section?.sortOrder ?? 0
            });
            onClose();
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-20 pb-4 px-4 print:hidden overflow-y-auto">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl w-full max-w-2xl max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-6 border-b border-primary/10 dark:border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-primary dark:text-white">
                        {section ? 'Edit Training Section' : 'Add Training Section'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-primary/10 dark:hover:bg-white/10 rounded-full">
                        <span className="material-symbols-outlined text-primary dark:text-white">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-primary dark:text-white mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Managing Booking Requests"
                            className="w-full px-4 py-3 rounded-xl border border-primary/20 dark:border-white/20 bg-white dark:bg-white/5 text-primary dark:text-white placeholder:text-primary/40 dark:placeholder:text-white/40"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary dark:text-white mb-2">Short Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Approve, decline, or manage simulator bookings"
                            className="w-full px-4 py-3 rounded-xl border border-primary/20 dark:border-white/20 bg-white dark:bg-white/5 text-primary dark:text-white placeholder:text-primary/40 dark:placeholder:text-white/40"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary dark:text-white mb-2">Icon</label>
                        <div className="relative">
                            <button
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 dark:border-white/20 bg-white dark:bg-white/5 hover:bg-primary/5 dark:hover:bg-white/10 transition-colors"
                            >
                                <span className="material-symbols-outlined text-2xl text-primary dark:text-white">{icon}</span>
                                <span className="text-primary dark:text-white">{icon}</span>
                                <span className="material-symbols-outlined text-primary/40 dark:text-white/40 ml-auto">expand_more</span>
                            </button>
                            {showIconPicker && (
                                <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white dark:bg-[#2a2a2a] rounded-xl border border-primary/10 dark:border-white/10 shadow-lg z-10 grid grid-cols-8 gap-2">
                                    {COMMON_ICONS.map((iconName) => (
                                        <button
                                            key={iconName}
                                            onClick={() => { setIcon(iconName); setShowIconPicker(false); }}
                                            className={`p-2 rounded-lg hover:bg-primary/10 dark:hover:bg-white/10 ${icon === iconName ? 'bg-primary/20 dark:bg-white/20' : ''}`}
                                        >
                                            <span className="material-symbols-outlined text-primary dark:text-white">{iconName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="adminOnly"
                            checked={isAdminOnly}
                            onChange={(e) => setIsAdminOnly(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/20 dark:border-white/20"
                        />
                        <label htmlFor="adminOnly" className="text-sm text-primary dark:text-white">Admin Only (hidden from regular staff)</label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary dark:text-white mb-3">Steps</label>
                        <div className="space-y-4">
                            {steps.map((step, index) => (
                                <div key={index} className="p-4 bg-white/60 dark:bg-white/5 rounded-xl border border-primary/10 dark:border-white/10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-primary dark:text-white">
                                            {index + 1}
                                        </div>
                                        <span className="text-sm font-medium text-primary dark:text-white flex-1">Step {index + 1}</span>
                                        {steps.length > 1 && (
                                            <button onClick={() => handleRemoveStep(index)} className="p-1 hover:bg-red-500/10 rounded-full">
                                                <span className="material-symbols-outlined text-red-500 text-lg">delete</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={step.title}
                                            onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                                            placeholder="Step title"
                                            className="flex-1 px-3 py-2 rounded-lg border border-primary/10 dark:border-white/10 bg-white dark:bg-white/5 text-primary dark:text-white placeholder:text-primary/40 dark:placeholder:text-white/40 text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={step.pageIcon || ''}
                                            onChange={(e) => handleStepChange(index, 'pageIcon', e.target.value)}
                                            placeholder="Icon (optional)"
                                            className="w-28 px-3 py-2 rounded-lg border border-primary/10 dark:border-white/10 bg-white dark:bg-white/5 text-primary dark:text-white placeholder:text-primary/40 dark:placeholder:text-white/40 text-sm"
                                        />
                                    </div>
                                    <textarea
                                        value={step.content}
                                        onChange={(e) => handleStepChange(index, 'content', e.target.value)}
                                        placeholder="Step instructions..."
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-primary/10 dark:border-white/10 bg-white dark:bg-white/5 text-primary dark:text-white placeholder:text-primary/40 dark:placeholder:text-white/40 text-sm resize-none"
                                    />
                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/20 dark:border-white/20 hover:bg-primary/5 dark:hover:bg-white/5 cursor-pointer text-sm text-primary/60 dark:text-white/60">
                                            <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                                            {step.imageUrl ? 'Replace' : 'Add Image'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => e.target.files?.[0] && handleStepImageUpload(index, e.target.files[0])}
                                            />
                                        </label>
                                        {step.imageUrl && (
                                            <>
                                                <img src={step.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newSteps = [...steps];
                                                        newSteps[index] = { ...newSteps[index], imageUrl: undefined };
                                                        setSteps(newSteps);
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-500 hover:bg-red-500/10"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                    Remove
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleAddStep}
                            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-primary/30 dark:border-white/30 text-primary dark:text-white hover:bg-primary/5 dark:hover:bg-white/5 transition-colors text-sm"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Add Step
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t border-primary/10 dark:border-white/10 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-full text-primary dark:text-white hover:bg-primary/10 dark:hover:bg-white/10">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !title.trim() || !description.trim() || steps.every(s => !s.title.trim() || !s.content.trim())}
                        className="px-5 py-2.5 rounded-full bg-primary dark:bg-accent text-white dark:text-primary font-medium disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Section'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const StaffTrainingGuide: React.FC = () => {
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [sections, setSections] = useState<TrainingSectionDB[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<TrainingSectionDB | null>(null);
    const { actualUser } = useData();
    const isAdmin = actualUser?.role === 'admin';
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchSections();
    }, []);

    const fetchSections = async () => {
        try {
            const response = await fetch('/api/training-sections', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setSections(data);
            }
        } catch (error) {
            console.error('Failed to fetch training sections:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (sectionData: Partial<TrainingSectionDB>) => {
        const isEdit = !!sectionData.id;
        const url = isEdit ? `/api/admin/training-sections/${sectionData.id}` : '/api/admin/training-sections';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(sectionData)
        });

        if (!response.ok) throw new Error('Save failed');
        await fetchSections();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this training section?')) return;
        try {
            const response = await fetch(`/api/admin/training-sections/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                await fetchSections();
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const [isPrinting, setIsPrinting] = useState(false);
    
    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 100);
    };

    const openAddModal = () => {
        setEditingSection(null);
        setModalOpen(true);
    };

    const openEditModal = (section: TrainingSectionDB) => {
        setEditingSection(section);
        setModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-pop-in pb-32">
            <div className="mb-6">
                <p className="text-sm text-primary/60 dark:text-white/60 mb-4">
                    A complete guide to using the Even House Staff Portal. Tap any section to expand and view detailed instructions.
                </p>
                <div className="flex gap-2 print:hidden">
                    {isAdmin && (
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-primary rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Add Section
                        </button>
                    )}
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary dark:bg-white/10 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        Download PDF
                    </button>
                </div>
            </div>

            <div ref={printRef} className="space-y-4 print:space-y-6">
                <div className="hidden print:block text-center mb-8">
                    <h1 className="text-2xl font-bold text-primary">Even House Staff Training Guide</h1>
                    <p className="text-sm text-gray-500 mt-2">Comprehensive instructions for using the Staff Portal</p>
                </div>

                {sections.map((section) => (
                    <div 
                        key={section.id}
                        className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-primary/10 dark:border-white/10 overflow-hidden print:border print:border-gray-200 print:break-inside-avoid"
                    >
                        <div className="flex items-center">
                            <button
                                onClick={() => setExpandedSection(expandedSection === String(section.id) ? null : String(section.id))}
                                className="flex-1 flex items-center gap-4 p-5 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors print:hover:bg-transparent"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0 print:bg-gray-100">
                                    <span className="material-symbols-outlined text-2xl text-primary dark:text-white print:text-gray-700">{section.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-primary dark:text-white print:text-gray-900">{section.title}</h3>
                                    <p className="text-sm text-primary/60 dark:text-white/60 print:text-gray-500">{section.description}</p>
                                </div>
                                <span className={`material-symbols-outlined text-primary/40 dark:text-white/40 transition-transform duration-300 print:hidden ${expandedSection === String(section.id) ? 'rotate-180' : ''}`}>
                                    expand_more
                                </span>
                            </button>
                            {isAdmin && (
                                <div className="flex gap-1 pr-4 print:hidden">
                                    <button onClick={() => openEditModal(section)} className="p-2 hover:bg-primary/10 dark:hover:bg-white/10 rounded-full">
                                        <span className="material-symbols-outlined text-primary/60 dark:text-white/60">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(section.id)} className="p-2 hover:bg-red-500/10 rounded-full">
                                        <span className="material-symbols-outlined text-red-500/60">delete</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={`overflow-hidden transition-all duration-300 ${isPrinting || expandedSection === String(section.id) ? 'max-h-[5000px]' : 'max-h-0'}`}>
                            <div className="px-5 pb-5 space-y-4 print:pt-2">
                                {section.steps.map((step, index) => (
                                    <div key={index} className="flex gap-4">
                                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold text-primary dark:text-white print:bg-gray-100 print:text-gray-700">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-primary dark:text-white text-sm print:text-gray-900">{step.title}</h4>
                                                {step.pageIcon && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 dark:bg-accent/30 text-xs text-primary dark:text-accent print:bg-gray-200 print:text-gray-700">
                                                        <span className="material-symbols-outlined text-xs">{step.pageIcon}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-primary/70 dark:text-white/70 mt-1 print:text-gray-600">{step.content}</p>
                                            {step.imageUrl && (
                                                <img src={step.imageUrl} alt="" className="mt-2 rounded-lg max-w-full h-auto print:max-w-xs" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}

                <div className="hidden print:block mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                    <p>Even House Members App - Staff Training Guide</p>
                    <p>Generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

            <TrainingSectionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                section={editingSection}
                onSave={handleSave}
            />
        </div>
    );
};

export default AdminDashboard;
