import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, CafeItem, EventData, Announcement, MemberProfile, Booking } from '../../contexts/DataContext';
import MenuOverlay from '../../components/MenuOverlay';
import Logo from '../../components/Logo';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useData();
  const [activeTab, setActiveTab] = useState<'cafe' | 'events' | 'announcements' | 'members' | 'simulator'>('members');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Protect route
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
        navigate('/login');
    }
  }, [user, navigate]);

  if (!user || (user.role !== 'admin' && user.role !== 'staff')) return null;

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
               {activeTab === 'members' && 'Member Directory'}
               {activeTab === 'simulator' && 'Simulator Bookings'}
           </h1>
        </div>
        
        {activeTab === 'cafe' && <CafeAdmin />}
        {activeTab === 'events' && <EventsAdmin />}
        {activeTab === 'announcements' && <AnnouncementsAdmin />}
        {activeTab === 'members' && <MembersAdmin />}
        {activeTab === 'simulator' && <SimulatorAdmin />}
      </main>

      {/* Bottom Nav - Fixed with iOS Safe Area */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#293515] border-t border-[#293515] pt-3 px-6 z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] rounded-t-2xl safe-area-bottom" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <ul className="flex justify-between items-center text-white/50 w-full max-w-md mx-auto">
            <NavItem icon="groups" label="Members" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
            <NavItem icon="sports_golf" label="Sims" active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} />
            <NavItem icon="event" label="Events" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
            <NavItem icon="campaign" label="Updates" active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} />
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
                    <div className="bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4 text-primary dark:text-white">{editId ? 'Edit Item' : 'Add Item'}</h3>
                        <div className="space-y-3 mb-6">
                            <input className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Item Name" value={newItem.name || ''} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                            <div className="flex gap-3">
                                <input className="flex-1 border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" type="number" placeholder="Price" value={newItem.price || ''} onChange={e => setNewItem({...newItem, price: Number(e.target.value)})} />
                                <select className="flex-1 border p-3 rounded-lg bg-white dark:bg-black/20 dark:border-white/10 dark:text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                    <option>Coffee & Drinks</option>
                                    <option>Breakfast</option>
                                    <option>Lunch</option>
                                    <option>Sides</option>
                                    <option>Kids</option>
                                    <option>Dessert</option>
                                    <option>Shareables</option>
                                </select>
                            </div>
                            <input className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Image URL (Optional)" value={newItem.image || ''} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                            <textarea className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Description" rows={3} value={newItem.desc || ''} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">Save</button>
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
                            <input className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Title" value={newItem.title || ''} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                            <select className="w-full border p-3 rounded-lg bg-white dark:bg-black/20 dark:border-white/10 dark:text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                <option value="Social">Event</option>
                                <option value="Wellness">Class</option>
                                <option value="MedSpa">MedSpa</option>
                                <option value="Dining">Dining</option>
                                <option value="Sport">Sport</option>
                            </select>
                            <div className="grid grid-cols-1 gap-3">
                                <input type="date" className="border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" value={newItem.event_date || ''} onChange={e => setNewItem({...newItem, event_date: e.target.value})} />
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="time" className="border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Start Time" value={newItem.start_time || ''} onChange={e => setNewItem({...newItem, start_time: e.target.value})} />
                                    <input type="time" className="border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="End Time" value={newItem.end_time || ''} onChange={e => setNewItem({...newItem, end_time: e.target.value})} />
                                </div>
                            </div>
                            <input className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Location" value={newItem.location || ''} onChange={e => setNewItem({...newItem, location: e.target.value})} />
                            <input className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Image URL (optional)" value={newItem.image_url || ''} onChange={e => setNewItem({...newItem, image_url: e.target.value})} />
                            <input type="number" className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Max Attendees (optional)" value={newItem.max_attendees || ''} onChange={e => setNewItem({...newItem, max_attendees: parseInt(e.target.value) || null})} />
                            <textarea className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Description" rows={3} value={newItem.description || ''} onChange={e => setNewItem({...newItem, description: e.target.value})} />
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
                    <div className="bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4 text-primary dark:text-white">{editId ? 'Edit Post' : 'New Post'}</h3>
                        <div className="space-y-4 mb-4">
                            <div className="flex gap-2">
                                <button onClick={() => setNewItem({...newItem, type: 'update'})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${newItem.type === 'update' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>Update</button>
                                <button onClick={() => setNewItem({...newItem, type: 'announcement'})} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${newItem.type === 'announcement' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}>Announcement</button>
                            </div>
                            <input className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white text-sm" placeholder="Title" value={newItem.title || ''} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                            <textarea className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white text-sm" placeholder="Description" rows={3} value={newItem.desc || ''} onChange={e => setNewItem({...newItem, desc: e.target.value})} />
                            
                            {/* Date Durations */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Start Date</label>
                                    <input type="date" className="w-full border p-2 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white text-sm" value={newItem.startDate || ''} onChange={e => setNewItem({...newItem, startDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">End Date</label>
                                    <input type="date" className="w-full border p-2 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white text-sm" value={newItem.endDate || ''} onChange={e => setNewItem({...newItem, endDate: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">Post</button>
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

// --- MEMBERS ADMIN ---

const MembersAdmin: React.FC = () => {
    const { members, updateMember } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members;
        const query = searchQuery.toLowerCase();
        return members.filter(m => 
            m.name.toLowerCase().includes(query) ||
            m.email.toLowerCase().includes(query) ||
            (m.tier && m.tier.toLowerCase().includes(query)) ||
            (m.phone && m.phone.toLowerCase().includes(query))
        );
    }, [members, searchQuery]);

    const openEdit = (member: MemberProfile) => {
        setSelectedMember(member);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (selectedMember) {
            updateMember(selectedMember);
            if (selectedMember.role) {
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

    return (
        <div>
            <div className="mb-6">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="Search by name, email, tier, or phone..."
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
                </p>
            </div>

            {isEditing && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4 text-primary dark:text-white">Edit Member</h3>
                        <div className="space-y-3 mb-6">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500">Name</label>
                                <input className="w-full border p-2 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" value={selectedMember.name} onChange={e => setSelectedMember({...selectedMember, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500">Email</label>
                                <input className="w-full border p-2 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" value={selectedMember.email} onChange={e => setSelectedMember({...selectedMember, email: e.target.value})} />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Tier</label>
                                    <select className="w-full border p-2 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" value={selectedMember.tier} onChange={e => setSelectedMember({...selectedMember, tier: e.target.value})}>
                                        <option>Social</option>
                                        <option>Core</option>
                                        <option>Premium</option>
                                        <option>Corporate</option>
                                        <option>Founding</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-500">Status</label>
                                    <select className="w-full border p-2 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" value={selectedMember.status} onChange={e => setSelectedMember({...selectedMember, status: e.target.value as any})}>
                                        <option>Active</option>
                                        <option>Pending</option>
                                        <option>Suspended</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500">Role</label>
                                <select 
                                    className="w-full border p-2 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" 
                                    value={selectedMember.role || 'member'} 
                                    onChange={e => setSelectedMember({...selectedMember, role: e.target.value as any})}
                                >
                                    <option value="member">Member</option>
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">Staff and Admin can access the staff portal</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3">
                {filteredMembers.map(m => (
                    <div key={m.id} onClick={() => openEdit(m)} className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm active:scale-[0.98] transition-transform">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-lg text-primary dark:text-white">{m.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${m.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{m.status}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tier</span>
                                <span className="bg-primary/5 dark:bg-white/10 text-primary dark:text-white px-2 py-0.5 rounded text-xs font-bold">{m.tier}</span>
                            </div>
                            {m.role && m.role !== 'member' && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>
                                    {m.role}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden">
                <table className="w-full text-left">
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
                        {filteredMembers.map(m => (
                            <tr key={m.id} className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="p-4 font-medium text-primary dark:text-white">{m.name}</td>
                                <td className="p-4"><span className="bg-primary/10 dark:bg-white/10 text-primary dark:text-white px-2 py-1 rounded text-xs font-bold">{m.tier}</span></td>
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
                                    <button onClick={() => openEdit(m)} className="text-primary dark:text-white hover:underline text-xs font-bold">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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

export default AdminDashboard;