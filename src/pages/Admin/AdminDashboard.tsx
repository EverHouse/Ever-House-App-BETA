import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, CafeItem, EventData, Announcement, MemberProfile, Booking } from '../../contexts/DataContext';
import MenuOverlay from '../../components/MenuOverlay';
import Logo from '../../components/Logo';
import { formatDate as formatDateUtil, formatDateShort as formatDateShortUtil, formatTime12 as formatTime12Util } from '../../utils/dateUtils';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { actualUser } = useData();
  const [activeTab, setActiveTab] = useState<'cafe' | 'events' | 'closures' | 'directory' | 'simulator' | 'gallery' | 'guests' | 'push'>('directory');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Protect route - use actualUser so admins can still access while viewing as member
  useEffect(() => {
    if (!actualUser || (actualUser.role !== 'admin' && actualUser.role !== 'staff')) {
        navigate('/login');
    }
  }, [actualUser, navigate]);

  if (!actualUser || (actualUser.role !== 'admin' && actualUser.role !== 'staff')) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-display dark:bg-[#1a1d15] transition-colors duration-300 flex flex-col">
      
      {/* Header */}
      <header className="sticky top-0 flex-shrink-0 flex items-center justify-between px-6 py-4 bg-[#293515] shadow-md transition-all duration-200 text-[#F2F2EC] z-40">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="flex items-center justify-center w-10 h-10 hover:opacity-70 transition-opacity"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        
        <div className="cursor-pointer flex items-center justify-center" onClick={() => navigate('/')}>
          <img 
            src="/assets/logos/EH-guy logo white.png" 
            alt="Even House" 
            className="h-14 w-auto"
          />
        </div>

        {/* Top Right - Exit to Member Dashboard */}
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center w-10 h-10 hover:opacity-70 transition-opacity"
        >
          <span className="material-symbols-outlined text-[24px]">account_circle</span>
        </button>
      </header>

      {/* Main Content Area - No top padding needed */}
      <main className="flex-1 overflow-y-auto pb-28 px-4 md:px-8 max-w-4xl mx-auto pt-6 w-full">
        <div className="mb-6">
           <span className="text-xs font-bold uppercase tracking-wider text-primary/50 dark:text-white/50 block mb-1">Staff Portal</span>
           <h1 className="text-2xl font-bold text-primary dark:text-white">
               {activeTab === 'cafe' && 'Manage Cafe Menu'}
               {activeTab === 'events' && 'Manage Events'}
               {activeTab === 'closures' && 'Facility Closures'}
               {activeTab === 'guests' && 'Guest Passes'}
               {activeTab === 'push' && 'Push Notifications'}
               {activeTab === 'directory' && 'Directory'}
               {activeTab === 'simulator' && 'Simulator Bookings'}
               {activeTab === 'gallery' && 'Manage Gallery'}
           </h1>
        </div>
        
        {activeTab === 'cafe' && <CafeAdmin />}
        {activeTab === 'events' && <EventsAdmin />}
        {activeTab === 'closures' && <FacilityClosuresAdmin />}
        {activeTab === 'guests' && <GuestPassAdmin />}
        {activeTab === 'push' && <PushNotificationAdmin />}
        {activeTab === 'directory' && <MembersAdmin />}
        {activeTab === 'simulator' && <SimulatorAdmin />}
        {activeTab === 'gallery' && <GalleryAdmin />}
      </main>

      {/* Bottom Nav - Fixed with iOS Safe Area */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#293515] border-t border-[#293515] pt-3 px-4 z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] rounded-t-2xl safe-area-bottom" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <ul className="flex justify-between items-center text-white/50 w-full max-w-xl mx-auto overflow-x-auto scrollbar-hide gap-1">
            <NavItem icon="groups" label="Directory" active={activeTab === 'directory'} onClick={() => setActiveTab('directory')} />
            <NavItem icon="sports_golf" label="Sims" active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} />
            <NavItem icon="event" label="Events" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
            <NavItem icon="badge" label="Guests" active={activeTab === 'guests'} onClick={() => setActiveTab('guests')} />
            <NavItem icon="notifications" label="Push" active={activeTab === 'push'} onClick={() => setActiveTab('push')} />
            <NavItem icon="event_busy" label="Closures" active={activeTab === 'closures'} onClick={() => setActiveTab('closures')} />
            <NavItem icon="photo_library" label="Gallery" active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} />
            <NavItem icon="local_cafe" label="Cafe" active={activeTab === 'cafe'} onClick={() => setActiveTab('cafe')} />
        </ul>
      </nav>

      <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
};

// --- Sub-Components ---

const NavItem: React.FC<{icon: string; label: string; active?: boolean; onClick: () => void}> = ({ icon, label, active, onClick }) => (
    <li onClick={onClick} className={`flex-1 flex flex-col items-center gap-1 cursor-pointer transition-colors ${active ? 'text-white' : 'hover:text-white'}`}>
      <span className={`material-symbols-outlined ${active ? 'filled' : ''}`}>{icon}</span>
      <span className={`text-[10px] ${active ? 'font-bold' : 'font-medium'} tracking-wide`}>{label}</span>
    </li>
);

// --- CAFE ADMIN ---

const CafeAdmin: React.FC = () => {
    const { cafeMenu, addCafeItem, updateCafeItem, deleteCafeItem } = useData();
    const categories = useMemo(() => ['All', ...Array.from(new Set(cafeMenu.map(item => item.category)))], [cafeMenu]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<Partial<CafeItem>>({ category: 'Coffee & Drinks' });

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
                <button onClick={openCreate} className="bg-primary text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 shadow-md text-xs whitespace-nowrap">
                    <span className="material-symbols-outlined text-sm">add</span> Add
                </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1 mb-4">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-primary text-white' : 'bg-white dark:bg-white/10 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 border border-gray-200 dark:border-white/10">
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
                            <input className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" placeholder="Image URL (Optional)" value={newItem.image || ''} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                            <textarea className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none" placeholder="Description" rows={3} value={newItem.desc || ''} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 text-gray-500 dark:text-white/60 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary/90 transition-colors">Save</button>
                        </div>
                    </div>
                </div>
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
    { id: 'Dining', label: 'Dining', icon: 'restaurant' },
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
                setSyncMessage(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error('Failed to sync Eventbrite:', err);
            setSyncMessage('Failed to sync with Eventbrite');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncMessage(null), 5000);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'TBD';
        return formatDateUtil(dateStr);
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        return formatTime12Util(timeStr);
    };

    return (
        <div>
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mx-4 px-4">
                {CATEGORY_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveCategory(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                            activeCategory === tab.id 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/10'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
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

            <div className="flex justify-end gap-2 mb-4">
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

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
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
        </div>
    );
};

// --- ANNOUNCEMENTS ADMIN ---

const AnnouncementsAdmin: React.FC = () => {
    const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<Partial<Announcement>>({ type: 'update' });

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
            <div className="flex justify-end mb-4">
                <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md">
                    <span className="material-symbols-outlined">add</span> Post Update
                </button>
            </div>
            
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 border border-gray-200 dark:border-white/10">
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

const TIER_OPTIONS = ['All', 'Social', 'Core', 'Premium', 'Corporate', 'VIP', 'Founding'] as const;

const MembersAdmin: React.FC = () => {
    const { members, updateMember, setViewAsUser, actualUser } = useData();
    const navigate = useNavigate();
    const [subTab, setSubTab] = useState<'members' | 'staff'>('members');
    const [isEditing, setIsEditing] = useState(false);
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState<string>('All');
    
    const isAdmin = actualUser?.role === 'admin';

    // Split members into regular members vs staff/admin
    const regularMembers = useMemo(() => 
        members.filter(m => !m.role || m.role === 'member'), 
        [members]
    );
    
    const staffMembers = useMemo(() => 
        members.filter(m => m.role === 'staff' || m.role === 'admin'), 
        [members]
    );

    // Filter based on search and tier (tier filter only for members tab)
    const filteredList = useMemo(() => {
        const baseList = subTab === 'members' ? regularMembers : staffMembers;
        let filtered = baseList;
        
        // Apply tier filter only on members tab
        if (subTab === 'members' && tierFilter !== 'All') {
            filtered = filtered.filter(m => {
                const tier = m.tier || '';
                // Handle "Founding" filter using isFounding property
                if (tierFilter === 'Founding') {
                    return m.isFounding === true;
                }
                // For other tiers, check exact match or tier includes the filter
                return tier === tierFilter || tier.includes(tierFilter);
            });
        }
        
        // Apply search (also search for "founding" in isFounding members)
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
    }, [subTab, regularMembers, staffMembers, tierFilter, searchQuery]);

    const openEdit = (member: MemberProfile) => {
        setSelectedMember(member);
        setIsEditing(true);
    };
    
    const openAddStaff = () => {
        // Create a new staff entry - admin will select from existing members
        setIsAddingStaff(true);
    };
    
    const handleViewAs = (member: MemberProfile) => {
        if (!isAdmin) return; // Only admins can View As
        setViewAsUser(member);
        navigate('/dashboard');
    };

    const handleSave = async () => {
        if (selectedMember) {
            updateMember(selectedMember);
            // Only update role if admin
            if (isAdmin && selectedMember.role) {
                try {
                    await fetch(`/api/members/${selectedMember.id}/role`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role: selectedMember.role })
                    });
                } catch (e) {
                    console.error('Failed to update role:', e);
                }
            }
        }
        setIsEditing(false);
    };
    
    const handlePromoteToStaff = async (member: MemberProfile) => {
        if (!isAdmin) return;
        try {
            await fetch(`/api/members/${member.id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'staff' })
            });
            updateMember({ ...member, role: 'staff' });
        } catch (e) {
            console.error('Failed to promote to staff:', e);
        }
        setIsAddingStaff(false);
    };

    return (
        <div>
            {/* Sub-tab navigation */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => { setSubTab('members'); setTierFilter('All'); }}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                        subTab === 'members' 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                    }`}
                >
                    Members ({regularMembers.length})
                </button>
                <button
                    onClick={() => setSubTab('staff')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                        subTab === 'staff' 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                    }`}
                >
                    Staff ({staffMembers.length})
                </button>
            </div>

            {/* Search and filters */}
            <div className="mb-6 space-y-3">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder={subTab === 'members' ? "Search members..." : "Search staff..."}
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
                
                {/* Tier filter - only show on members tab */}
                {subTab === 'members' && (
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
                )}
                
                {/* Add Staff button - only show on staff tab for admins */}
                {subTab === 'staff' && isAdmin && (
                    <button
                        onClick={openAddStaff}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        Add Staff Member
                    </button>
                )}
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {filteredList.length} {subTab === 'members' ? 'member' : 'staff'}{filteredList.length !== 1 ? 's' : ''} found
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
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/10 border border-accent/20">
                                <input 
                                    type="checkbox" 
                                    id="isFounding" 
                                    checked={selectedMember.isFounding || false} 
                                    onChange={e => setSelectedMember({...selectedMember, isFounding: e.target.checked})}
                                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="isFounding" className="flex-1">
                                    <span className="text-sm font-bold text-primary dark:text-white">Founding Member</span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Charter member who joined during launch</p>
                                </label>
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
            
            {/* Add Staff Modal - select from existing members */}
            {isAddingStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4 text-primary dark:text-white">Add Staff Member</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select a member to promote to staff:</p>
                        <div className="overflow-y-auto max-h-[50vh] space-y-2">
                            {regularMembers.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => handlePromoteToStaff(m)}
                                    className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <div className="font-bold text-primary dark:text-white">{m.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{m.email}</div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tier: {m.tier}</div>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
                            <button onClick={() => setIsAddingStaff(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {filteredList.length === 0 && (
                <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                    <span className="material-symbols-outlined text-5xl mb-4 text-gray-300 dark:text-white/20">
                        {subTab === 'members' ? 'person_off' : 'badge'}
                    </span>
                    <h3 className="text-lg font-bold mb-2 text-gray-600 dark:text-white/70">
                        {searchQuery ? 'No results found' : subTab === 'members' ? 'No members yet' : 'No staff members'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-white/50 max-w-xs mx-auto">
                        {searchQuery 
                            ? `Try a different search term or clear the filter.`
                            : subTab === 'members' 
                                ? 'Members will appear here once they sign up.'
                                : isAdmin 
                                    ? 'Add staff members to help manage the club.'
                                    : 'No staff members have been added yet.'}
                    </p>
                    {subTab === 'staff' && isAdmin && !searchQuery && (
                        <button
                            onClick={openAddStaff}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">person_add</span>
                            Add Staff Member
                        </button>
                    )}
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
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${m.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{m.status}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-primary/5 dark:bg-white/10 text-primary dark:text-white px-2 py-0.5 rounded text-xs font-bold">{m.tier}</span>
                                {m.isFounding && (
                                    <span className="bg-accent/20 text-brand-green dark:bg-accent/30 dark:text-accent px-2 py-0.5 rounded text-[10px] font-bold uppercase">Founding</span>
                                )}
                                {m.role && m.role !== 'member' && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>
                                        {m.role}
                                    </span>
                                )}
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
                <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Name</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Tier</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Role</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Status</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Email</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredList.map(m => (
                            <tr key={m.id} className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="p-4 font-medium text-primary dark:text-white">{m.name}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-1">
                                        <span className="bg-primary/10 dark:bg-white/10 text-primary dark:text-white px-2 py-1 rounded text-xs font-bold">{m.tier}</span>
                                        {m.isFounding && (
                                            <span className="bg-accent/20 text-brand-green dark:bg-accent/30 dark:text-accent px-2 py-1 rounded text-[10px] font-bold uppercase">Founding</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        m.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : 
                                        m.role === 'staff' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 
                                        'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
                                    }`}>
                                        {m.role || 'member'}
                                    </span>
                                </td>
                                <td className="p-4 text-sm font-bold text-gray-700 dark:text-gray-300">{m.status}</td>
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
    status: 'pending' | 'approved' | 'declined' | 'cancelled';
    staff_notes: string | null;
    suggested_time: string | null;
    created_at: string;
}

interface Bay {
    id: number;
    name: string;
    description: string;
}

const formatTime12 = formatTime12Util;
const formatDateShort = formatDateShortUtil;

const SimulatorAdmin: React.FC = () => {
    const { user } = useData();
    const [activeView, setActiveView] = useState<'requests' | 'calendar'>('requests');
    const [requests, setRequests] = useState<BookingRequest[]>([]);
    const [bays, setBays] = useState<Bay[]>([]);
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
                const [reqRes, bayRes] = await Promise.all([
                    fetch('/api/booking-requests?include_all=true'),
                    fetch('/api/bays')
                ]);
                
                if (reqRes.ok) {
                    const data = await reqRes.json();
                    setRequests(data);
                }
                if (bayRes.ok) {
                    const data = await bayRes.json();
                    setBays(data);
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

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const processedRequests = requests.filter(r => r.status !== 'pending');

    const handleApprove = async () => {
        if (!selectedRequest || !selectedBayId) {
            setError('Please select a bay');
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        
        try {
            const res = await fetch(`/api/booking-requests/${selectedRequest.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'approved',
                    bay_id: selectedBayId,
                    staff_notes: staffNotes || null,
                    reviewed_by: user?.email
                })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to approve');
            }
            
            const updated = await res.json();
            setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
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
            const res = await fetch(`/api/booking-requests/${selectedRequest.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'declined',
                    staff_notes: staffNotes || null,
                    suggested_time: suggestedTime ? suggestedTime + ':00' : null,
                    reviewed_by: user?.email
                })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to decline');
            }
            
            const updated = await res.json();
            setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
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
            case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300';
            case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300';
            case 'declined': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400';
        }
    };

    const hours = Array.from({ length: 14 }, (_, i) => 8 + i);

    return (
        <div>
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveView('requests')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                        activeView === 'requests'
                            ? 'bg-primary text-white dark:bg-white dark:text-primary'
                            : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                    }`}
                >
                    Requests Queue {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                </button>
                <button
                    onClick={() => setActiveView('calendar')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                        activeView === 'calendar'
                            ? 'bg-primary text-white dark:bg-white dark:text-primary'
                            : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10'
                    }`}
                >
                    Calendar View
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-primary dark:text-white">progress_activity</span>
                </div>
            ) : activeView === 'requests' ? (
                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-primary dark:text-white mb-3 flex items-center gap-2">
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
                                    <div key={req.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-white/5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="font-bold text-primary dark:text-white">{req.user_name || req.user_email}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDateShort(req.request_date)} • {formatTime12(req.start_time)} - {formatTime12(req.end_time)}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{req.duration_minutes} min</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(req.status)}`}>
                                                {req.status}
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
                        <h3 className="font-bold text-primary dark:text-white mb-3 flex items-center gap-2">
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
                                    <div key={req.id} className="bg-white dark:bg-surface-dark p-3 rounded-lg shadow-sm border border-gray-200 dark:border-white/5 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-primary dark:text-white text-sm">{req.user_name || req.user_email}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatDateShort(req.request_date)} • {formatTime12(req.start_time)}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => {
                                const d = new Date(calendarDate);
                                d.setDate(d.getDate() - 1);
                                setCalendarDate(d.toISOString().split('T')[0]);
                            }}
                            className="p-3 rounded-xl bg-primary text-white dark:bg-white dark:text-primary hover:opacity-90 transition-opacity shadow-sm"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <h3 className="font-bold text-primary dark:text-white text-lg">
                            {formatDateShort(calendarDate)}
                        </h3>
                        <button
                            onClick={() => {
                                const d = new Date(calendarDate);
                                d.setDate(d.getDate() + 1);
                                setCalendarDate(d.toISOString().split('T')[0]);
                            }}
                            className="p-3 rounded-xl bg-primary text-white dark:bg-white dark:text-primary hover:opacity-90 transition-opacity shadow-sm"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px]">
                            <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${bays.length}, 1fr)` }}>
                                <div className="h-10"></div>
                                {bays.map(bay => (
                                    <div key={bay.id} className="h-10 flex items-center justify-center font-bold text-sm text-primary dark:text-white bg-white dark:bg-surface-dark rounded-t-lg border border-gray-200 dark:border-white/10">
                                        {bay.name}
                                    </div>
                                ))}
                                
                                {hours.map(hour => (
                                    <React.Fragment key={hour}>
                                        <div className="h-12 flex items-center justify-end pr-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                            {formatTime12(`${hour.toString().padStart(2, '0')}:00`)}
                                        </div>
                                        {bays.map(bay => {
                                            const booking = approvedBookings.find(b => {
                                                if (b.bay_id !== bay.id || b.request_date !== calendarDate) return false;
                                                const [bh] = b.start_time.split(':').map(Number);
                                                return bh === hour;
                                            });
                                            
                                            return (
                                                <div
                                                    key={`${bay.id}-${hour}`}
                                                    className={`h-12 border border-gray-100 dark:border-white/5 ${
                                                        booking 
                                                            ? 'bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/30' 
                                                            : 'bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    {booking && (
                                                        <div className="p-1 h-full flex flex-col justify-center">
                                                            <p className="text-xs font-medium text-green-700 dark:text-green-300 truncate">
                                                                {booking.user_name || 'Booked'}
                                                            </p>
                                                            <p className="text-[10px] text-green-600 dark:text-green-400">
                                                                {booking.duration_minutes}min
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

            {actionModal && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 max-w-md w-full shadow-xl">
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign Bay *</label>
                                <select
                                    value={selectedBayId || ''}
                                    onChange={(e) => setSelectedBayId(Number(e.target.value))}
                                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-dark text-primary dark:text-white"
                                >
                                    <option value="">Select a bay...</option>
                                    {bays.map(bay => (
                                        <option key={bay.id} value={bay.id}>{bay.name}</option>
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
            )}
        </div>
    );
};

// --- PUSH NOTIFICATION ADMIN ---

interface PushSubscription {
  user_email: string;
  device_count: number;
  last_subscribed: string;
}

const PushNotificationAdmin: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ title: string; body: string; url: string }>({
    title: '',
    body: '',
    url: '/#/dashboard'
  });
  const [sendTo, setSendTo] = useState<'all' | 'selected'>('all');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/push/subscriptions');
      if (res.ok) {
        setSubscriptions(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSubscriptions(); }, []);

  const toggleEmail = (email: string) => {
    setSelectedEmails(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email) 
        : [...prev, email]
    );
  };

  const handleSend = async () => {
    if (!message.title || !message.body) {
      setSendResult({ success: false, message: 'Title and message are required' });
      return;
    }
    
    setIsSending(true);
    setSendResult(null);
    
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: message.title,
          body: message.body,
          url: message.url,
          recipients: sendTo === 'all' ? 'all' : selectedEmails
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSendResult({ success: true, message: `Notification sent to ${data.sent_to} member(s)` });
        setMessage({ title: '', body: '', url: '/#/dashboard' });
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send' });
      }
    } catch (err) {
      setSendResult({ success: false, message: 'Network error' });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-black/5 dark:border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary dark:text-white">notifications_active</span>
          <h3 className="font-bold text-primary dark:text-white">Send Push Notification</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-1">Title</label>
            <input
              type="text"
              value={message.title}
              onChange={(e) => setMessage(m => ({ ...m, title: e.target.value }))}
              placeholder="e.g., New Event Added!"
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-primary dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-1">Message</label>
            <textarea
              value={message.body}
              onChange={(e) => setMessage(m => ({ ...m, body: e.target.value }))}
              placeholder="e.g., Join us for a special members-only event this Saturday..."
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-primary dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-1">Link (optional)</label>
            <input
              type="text"
              value={message.url}
              onChange={(e) => setMessage(m => ({ ...m, url: e.target.value }))}
              placeholder="e.g., /#/events"
              className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-primary dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-2">Recipients</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={sendTo === 'all'}
                  onChange={() => setSendTo('all')}
                  className="accent-primary"
                />
                <span className="text-sm text-primary dark:text-white">All Subscribed ({subscriptions.length})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={sendTo === 'selected'}
                  onChange={() => setSendTo('selected')}
                  className="accent-primary"
                />
                <span className="text-sm text-primary dark:text-white">Select Members</span>
              </label>
            </div>
          </div>
          
          {sendResult && (
            <div className={`p-3 rounded-lg text-sm ${sendResult.success ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
              {sendResult.message}
            </div>
          )}
          
          <button
            onClick={handleSend}
            disabled={isSending || (sendTo === 'selected' && selectedEmails.length === 0)}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">send</span>
                Send Notification
              </>
            )}
          </button>
        </div>
      </div>
      
      {sendTo === 'selected' && (
        <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-black/5 dark:border-white/10">
          <h3 className="font-bold text-primary dark:text-white mb-3">
            Select Recipients ({selectedEmails.length} selected)
          </h3>
          {subscriptions.length === 0 ? (
            <p className="text-black/50 dark:text-white/50 text-sm">No members have enabled push notifications yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {subscriptions.map(sub => (
                <label key={sub.user_email} className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmails.includes(sub.user_email)}
                    onChange={() => toggleEmail(sub.user_email)}
                    className="accent-primary w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-primary dark:text-white">{sub.user_email}</div>
                    <div className="text-xs text-black/50 dark:text-white/50">{sub.device_count} device(s)</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-black/5 dark:border-white/10">
        <h3 className="font-bold text-primary dark:text-white mb-3">Subscribed Members ({subscriptions.length})</h3>
        {subscriptions.length === 0 ? (
          <p className="text-black/50 dark:text-white/50 text-sm">No members have enabled push notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {subscriptions.map(sub => (
              <div key={sub.user_email} className="flex items-center justify-between py-2 border-b border-black/5 dark:border-white/5 last:border-0">
                <div>
                  <div className="text-sm font-medium text-primary dark:text-white">{sub.user_email}</div>
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {sub.device_count} device(s) · Last subscribed {new Date(sub.last_subscribed).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- GUEST PASS ADMIN ---

interface GuestPassRecord {
  id: number;
  member_email: string;
  first_name: string;
  last_name: string;
  passes_used: number;
  passes_total: number;
  passes_remaining: number;
  last_reset_date?: string;
}

const GuestPassAdmin: React.FC = () => {
  const [passes, setPasses] = useState<GuestPassRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);

  const fetchPasses = async () => {
    try {
      const res = await fetch('/api/guest-passes');
      if (res.ok) {
        setPasses(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch guest passes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPasses(); }, []);

  const handleReset = async (email: string) => {
    setResettingEmail(email);
    try {
      const res = await fetch(`/api/guest-passes/${encodeURIComponent(email)}/reset`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchPasses();
      }
    } catch (err) {
      console.error('Failed to reset passes:', err);
    } finally {
      setResettingEmail(null);
    }
  };

  const handleUpdateTotal = async (email: string, newTotal: number) => {
    try {
      await fetch(`/api/guest-passes/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passes_total: newTotal })
      });
      fetchPasses();
    } catch (err) {
      console.error('Failed to update passes:', err);
    }
  };

  const filteredPasses = passes.filter(p =>
    p.member_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalMembers: passes.length,
    totalUsed: passes.reduce((sum, p) => sum + p.passes_used, 0),
    membersAtLimit: passes.filter(p => p.passes_remaining === 0).length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-black/5 dark:border-white/10">
          <div className="text-2xl font-bold text-primary dark:text-white">{stats.totalMembers}</div>
          <div className="text-xs text-black/50 dark:text-white/50">Members with Passes</div>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-black/5 dark:border-white/10">
          <div className="text-2xl font-bold text-primary dark:text-white">{stats.totalUsed}</div>
          <div className="text-xs text-black/50 dark:text-white/50">Passes Used</div>
        </div>
        <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-black/5 dark:border-white/10">
          <div className="text-2xl font-bold text-amber-500">{stats.membersAtLimit}</div>
          <div className="text-xs text-black/50 dark:text-white/50">At Limit</div>
        </div>
      </div>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30">search</span>
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-primary dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
        />
      </div>

      {filteredPasses.length === 0 ? (
        <div className="text-center py-12 text-black/50 dark:text-white/50">
          <span className="material-symbols-outlined text-4xl mb-2 block">badge</span>
          <p>No guest pass records found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPasses.map(pass => (
            <div key={pass.id} className="bg-white dark:bg-white/5 rounded-xl p-4 border border-black/5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-primary dark:text-white">
                    {pass.first_name && pass.last_name 
                      ? `${pass.first_name} ${pass.last_name}`
                      : pass.member_email}
                  </div>
                  {pass.first_name && <div className="text-xs text-black/50 dark:text-white/50">{pass.member_email}</div>}
                  {pass.last_reset_date && (
                    <div className="text-xs text-black/40 dark:text-white/40 mt-1">
                      Last reset: {new Date(pass.last_reset_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${pass.passes_remaining === 0 ? 'text-red-500' : 'text-primary dark:text-white'}`}>
                      {pass.passes_remaining}/{pass.passes_total}
                    </div>
                    <div className="text-xs text-black/50 dark:text-white/50">remaining</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      value={pass.passes_total}
                      onChange={(e) => handleUpdateTotal(pass.member_email, parseInt(e.target.value))}
                      className="bg-transparent border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-primary dark:text-white"
                    >
                      {[2, 4, 6, 8, 10, 12, 15, 20].map(n => (
                        <option key={n} value={n}>{n} total</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleReset(pass.member_email)}
                      disabled={resettingEmail === pass.member_email || pass.passes_used === 0}
                      className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Reset passes"
                    >
                      {resettingEmail === pass.member_email ? (
                        <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <span className="material-symbols-outlined text-lg">refresh</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- FACILITY CLOSURES ADMIN ---

interface FacilityClosure {
  id: number;
  title: string;
  facility_type: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  is_full_day: boolean;
  reason?: string;
}

const FacilityClosuresAdmin: React.FC = () => {
  const [closures, setClosures] = useState<FacilityClosure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [newClosure, setNewClosure] = useState<Partial<FacilityClosure>>({ 
    facility_type: 'golf', 
    is_full_day: true 
  });

  const facilityTypes = [
    { value: 'golf', label: 'Golf Simulators' },
    { value: 'conference', label: 'Conference Room' },
    { value: 'wellness', label: 'Wellness Studio' },
    { value: 'cafe', label: 'Cafe & Bar' },
    { value: 'all', label: 'Entire Club' }
  ];

  const fetchClosures = async () => {
    try {
      const res = await fetch('/api/facility-closures');
      if (res.ok) {
        setClosures(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch closures:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchClosures(); }, []);

  const handleSave = async () => {
    if (!newClosure.title || !newClosure.start_date || !newClosure.end_date) return;

    try {
      if (editId) {
        const res = await fetch(`/api/facility-closures/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClosure)
        });
        if (res.ok) {
          const updated = await res.json();
          setClosures(closures.map(c => c.id === editId ? updated : c));
        }
      } else {
        const res = await fetch('/api/facility-closures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newClosure)
        });
        if (res.ok) {
          const created = await res.json();
          setClosures([...closures, created]);
        }
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save closure:', err);
    }
  };

  const handleEdit = (closure: FacilityClosure) => {
    setEditId(closure.id);
    setNewClosure({
      ...closure,
      start_date: closure.start_date.split('T')[0],
      end_date: closure.end_date.split('T')[0]
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this closure?')) return;
    try {
      await fetch(`/api/facility-closures/${id}`, { method: 'DELETE' });
      setClosures(closures.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete closure:', err);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setNewClosure({ facility_type: 'golf', is_full_day: true });
  };

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    if (s.toDateString() === e.toDateString()) {
      return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary/30 dark:text-white/30">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => setIsEditing(true)}
        className="w-full py-3 px-4 bg-primary dark:bg-accent text-white dark:text-primary rounded-xl font-medium flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-lg">event_busy</span>
        Add Closure
      </button>

      <div className="space-y-3">
        {closures.map(closure => (
          <div key={closure.id} className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-100 dark:border-white/10">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-primary dark:text-white">{closure.title}</h4>
                <p className="text-sm text-primary/60 dark:text-white/60 mt-1">
                  {facilityTypes.find(f => f.value === closure.facility_type)?.label || closure.facility_type}
                </p>
                <p className="text-sm text-primary/80 dark:text-white/80 mt-1">
                  {formatDateRange(closure.start_date, closure.end_date)}
                  {!closure.is_full_day && closure.start_time && closure.end_time && (
                    <span className="ml-2 text-primary/50 dark:text-white/50">
                      ({closure.start_time} - {closure.end_time})
                    </span>
                  )}
                </p>
                {closure.reason && (
                  <p className="text-xs text-primary/50 dark:text-white/50 mt-1">{closure.reason}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(closure)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg">
                  <span className="material-symbols-outlined text-sm text-primary/60 dark:text-white/60">edit</span>
                </button>
                <button onClick={() => handleDelete(closure.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                  <span className="material-symbols-outlined text-sm text-red-500">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {closures.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-primary/20 dark:text-white/20 mb-2">event_available</span>
          <p className="text-primary/50 dark:text-white/50">No scheduled closures.</p>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-primary dark:text-white mb-4">{editId ? 'Edit Closure' : 'Add Closure'}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">Title *</label>
                <input
                  type="text"
                  value={newClosure.title || ''}
                  onChange={(e) => setNewClosure({ ...newClosure, title: e.target.value })}
                  placeholder="Holiday Closure, Maintenance, etc."
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">Facility *</label>
                <select
                  value={newClosure.facility_type}
                  onChange={(e) => setNewClosure({ ...newClosure, facility_type: e.target.value })}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                >
                  {facilityTypes.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={newClosure.start_date || ''}
                    onChange={(e) => setNewClosure({ ...newClosure, start_date: e.target.value })}
                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={newClosure.end_date || ''}
                    onChange={(e) => setNewClosure({ ...newClosure, end_date: e.target.value })}
                    className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_full_day"
                  checked={newClosure.is_full_day !== false}
                  onChange={(e) => setNewClosure({ ...newClosure, is_full_day: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="is_full_day" className="text-sm text-primary/70 dark:text-white/70">Full day closure</label>
              </div>

              {!newClosure.is_full_day && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newClosure.start_time || ''}
                      onChange={(e) => setNewClosure({ ...newClosure, start_time: e.target.value })}
                      className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">End Time</label>
                    <input
                      type="time"
                      value={newClosure.end_time || ''}
                      onChange={(e) => setNewClosure({ ...newClosure, end_time: e.target.value })}
                      className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">Reason (Optional)</label>
                <textarea
                  value={newClosure.reason || ''}
                  onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })}
                  placeholder="Explain why this closure is scheduled..."
                  rows={2}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={resetForm} className="flex-1 py-3 rounded-lg border border-gray-200 dark:border-white/10 text-primary/70 dark:text-white/70 font-medium">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newClosure.title || !newClosure.start_date || !newClosure.end_date}
                className="flex-1 py-3 rounded-lg bg-primary dark:bg-accent text-white dark:text-primary font-medium disabled:opacity-50"
              >
                {editId ? 'Save Changes' : 'Add Closure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- GALLERY ADMIN ---

interface GalleryImage {
  id: number;
  image_url: string;
  category: string;
  caption?: string;
  display_order: number;
  is_active: boolean;
}

const GalleryAdmin: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [newImage, setNewImage] = useState<Partial<GalleryImage>>({ category: 'Lounge', is_active: true, display_order: 0 });
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['Golf Bays', 'Lounge', 'Wellness', 'Events'];
  const allCategories = ['All', ...categories];

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/gallery');
      if (res.ok) {
        setImages(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch gallery:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchImages(); }, []);

  const filteredImages = activeCategory === 'All' ? images : images.filter(img => img.category === activeCategory);

  const handleSave = async () => {
    if (!newImage.image_url || !newImage.category) return;

    try {
      if (editId) {
        const res = await fetch(`/api/gallery/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newImage)
        });
        if (res.ok) {
          const updated = await res.json();
          setImages(images.map(img => img.id === editId ? updated : img));
        }
      } else {
        const res = await fetch('/api/gallery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newImage)
        });
        if (res.ok) {
          const created = await res.json();
          setImages([...images, created]);
        }
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save gallery image:', err);
    }
  };

  const handleEdit = (img: GalleryImage) => {
    setEditId(img.id);
    setNewImage(img);
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this image from the gallery?')) return;
    try {
      await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      setImages(images.filter(img => img.id !== id));
    } catch (err) {
      console.error('Failed to delete gallery image:', err);
    }
  };

  const toggleActive = async (img: GalleryImage) => {
    try {
      const res = await fetch(`/api/gallery/${img.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...img, is_active: !img.is_active })
      });
      if (res.ok) {
        const updated = await res.json();
        setImages(images.map(i => i.id === img.id ? updated : i));
      }
    } catch (err) {
      console.error('Failed to toggle image status:', err);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setNewImage({ category: 'Lounge', is_active: true, display_order: 0 });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="material-symbols-outlined animate-spin text-3xl text-primary/30 dark:text-white/30">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {allCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-white dark:bg-accent dark:text-primary'
                : 'bg-white dark:bg-surface-dark text-primary/70 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <button
        onClick={() => setIsEditing(true)}
        className="w-full py-3 px-4 bg-primary dark:bg-accent text-white dark:text-primary rounded-xl font-medium flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
        Add Image
      </button>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredImages.map(img => (
          <div key={img.id} className={`relative rounded-xl overflow-hidden border ${img.is_active ? 'border-gray-200 dark:border-white/10' : 'border-red-300 dark:border-red-500/30 opacity-50'}`}>
            <img src={img.image_url} alt={img.caption || 'Gallery'} className="w-full aspect-square object-cover" />
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 bg-black/50 text-white text-xs rounded-full">{img.category}</span>
            </div>
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={() => toggleActive(img)}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${img.is_active ? 'bg-green-500' : 'bg-gray-400'} text-white`}
              >
                <span className="material-symbols-outlined text-sm">{img.is_active ? 'visibility' : 'visibility_off'}</span>
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent flex justify-end gap-2">
              <button onClick={() => handleEdit(img)} className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
              <button onClick={() => handleDelete(img.id)} className="w-8 h-8 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredImages.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-primary/20 dark:text-white/20 mb-2">photo_library</span>
          <p className="text-primary/50 dark:text-white/50">No images in this category.</p>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-primary dark:text-white mb-4">{editId ? 'Edit Image' : 'Add Image'}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">Image URL *</label>
                <input
                  type="text"
                  value={newImage.image_url || ''}
                  onChange={(e) => setNewImage({ ...newImage, image_url: e.target.value })}
                  placeholder="/images/photo.jpg or https://..."
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">Category *</label>
                <select
                  value={newImage.category}
                  onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">Caption (Optional)</label>
                <input
                  type="text"
                  value={newImage.caption || ''}
                  onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                  placeholder="Describe the image..."
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary/70 dark:text-white/70 mb-1">Display Order</label>
                <input
                  type="number"
                  value={newImage.display_order || 0}
                  onChange={(e) => setNewImage({ ...newImage, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a210d] text-primary dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newImage.is_active !== false}
                  onChange={(e) => setNewImage({ ...newImage, is_active: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-primary/70 dark:text-white/70">Visible on public gallery</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={resetForm} className="flex-1 py-3 rounded-lg border border-gray-200 dark:border-white/10 text-primary/70 dark:text-white/70 font-medium">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newImage.image_url || !newImage.category}
                className="flex-1 py-3 rounded-lg bg-primary dark:bg-accent text-white dark:text-primary font-medium disabled:opacity-50"
              >
                {editId ? 'Save Changes' : 'Add Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;