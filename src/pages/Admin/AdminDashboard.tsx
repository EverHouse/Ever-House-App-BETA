import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, CafeItem, EventData, Announcement, MemberProfile, Booking } from '../../contexts/DataContext';
import MenuOverlay from '../../components/MenuOverlay';
import Logo from '../../components/Logo';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { actualUser } = useData();
  const [activeTab, setActiveTab] = useState<'cafe' | 'events' | 'announcements' | 'directory' | 'simulator' | 'staff' | 'wellness'>('directory');
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
               {activeTab === 'announcements' && 'Manage Updates'}
               {activeTab === 'directory' && 'Directory'}
               {activeTab === 'simulator' && 'Simulator Bookings'}
               {activeTab === 'staff' && 'Manage Staff Access'}
               {activeTab === 'wellness' && 'Manage Wellness Classes'}
           </h1>
        </div>
        
        {activeTab === 'cafe' && <CafeAdmin />}
        {activeTab === 'events' && <EventsAdmin />}
        {activeTab === 'announcements' && <AnnouncementsAdmin />}
        {activeTab === 'directory' && <MembersAdmin />}
        {activeTab === 'simulator' && <SimulatorAdmin />}
        {activeTab === 'staff' && actualUser?.role === 'admin' && <StaffAdmin />}
        {activeTab === 'wellness' && <WellnessAdmin />}
      </main>

      {/* Bottom Nav - Fixed with iOS Safe Area */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#293515] border-t border-[#293515] pt-3 px-6 z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] rounded-t-2xl safe-area-bottom" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <ul className="flex justify-between items-center text-white/50 w-full max-w-md mx-auto">
            <NavItem icon="groups" label="Directory" active={activeTab === 'directory'} onClick={() => setActiveTab('directory')} />
            <NavItem icon="sports_golf" label="Sims" active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} />
            <NavItem icon="event" label="Events" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
            <NavItem icon="spa" label="Wellness" active={activeTab === 'wellness'} onClick={() => setActiveTab('wellness')} />
            {actualUser?.role === 'admin' && <NavItem icon="badge" label="Staff" active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} />}
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
        const date = new Date(dateStr);
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

const formatTime12 = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes?.toString().padStart(2, '0') || '00'} ${period}`;
};

const formatDateShort = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

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
                            className="p-2 rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <h3 className="font-bold text-primary dark:text-white">
                            {formatDateShort(calendarDate)}
                        </h3>
                        <button
                            onClick={() => {
                                const d = new Date(calendarDate);
                                d.setDate(d.getDate() + 1);
                                setCalendarDate(d.toISOString().split('T')[0]);
                            }}
                            className="p-2 rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10"
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
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-primary dark:text-white">Wellness Classes</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Schedule and manage wellness classes for members
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Add Class
                    </button>
                </div>

                {success && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
                        {success}
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

            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
            )}
        </div>
    );
};

// --- STAFF ADMIN (Admin only) ---

interface StaffUser {
  id: number;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

const StaffAdmin: React.FC = () => {
    const { actualUser } = useData();
    const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
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
            const res = await fetch('/api/staff-users');
            if (res.ok) {
                const data = await res.json();
                setStaffUsers(data);
            }
        } catch (err) {
            console.error('Error fetching staff users:', err);
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
                method: 'DELETE'
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
                        className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Add Staff
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
                                className={`flex items-center justify-between p-4 rounded-xl border ${
                                    staff.is_active 
                                        ? 'bg-white dark:bg-surface-dark border-gray-100 dark:border-white/10' 
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/5 opacity-60'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        staff.is_active ? 'bg-brand-green/10 text-brand-green' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}>
                                        <span className="material-symbols-outlined">badge</span>
                                    </div>
                                    <div>
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

            {isAdding && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md">
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
            )}
        </div>
    );
};

export default AdminDashboard;