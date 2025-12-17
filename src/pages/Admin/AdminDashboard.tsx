import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, CafeItem, EventData, Announcement, MemberProfile, Booking } from '../../contexts/DataContext';
import MenuOverlay from '../../components/MenuOverlay';
import Logo from '../../components/Logo';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useData();
  const [activeTab, setActiveTab] = useState<'cafe' | 'events' | 'announcements' | 'members' | 'simulator'>('cafe');
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
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-[#293515] shadow-md transition-all duration-200 text-[#F2F2EC] z-40">
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
            <NavItem icon="local_cafe" label="Cafe" active={activeTab === 'cafe'} onClick={() => setActiveTab('cafe')} />
            <NavItem icon="event" label="Events" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
            <NavItem icon="sports_golf" label="Sims" active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} />
            <NavItem icon="campaign" label="Updates" active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} />
            <NavItem icon="groups" label="Members" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
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
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-[70%]">
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
                <button onClick={openCreate} className="bg-primary text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 shadow-md text-xs whitespace-nowrap">
                    <span className="material-symbols-outlined text-sm">add</span> Add
                </button>
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
                            <div className="flex justify-between items-start gap-2">
                                <h4 className="font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                                <span className="font-bold text-primary dark:text-white whitespace-nowrap">${item.price}</span>
                            </div>
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60 px-1.5 py-0.5 rounded mt-1 mb-1">{item.category}</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.desc}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteCafeItem(item.id); }} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- EVENTS ADMIN ---

const EventsAdmin: React.FC = () => {
    const { events, addEvent, updateEvent, deleteEvent, syncEventbrite } = useData();
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [newItem, setNewItem] = useState<Partial<EventData>>({ category: 'Social' });

    const openEdit = (event: EventData) => {
        setNewItem(event);
        setEditId(event.id);
        setIsEditing(true);
    };

    const openCreate = () => {
        setNewItem({ category: 'Social' });
        setEditId(null);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!newItem.title) return;
        
        const event: EventData = {
            id: editId || Math.random().toString(36).substr(2, 9),
            source: newItem.source || 'internal',
            title: newItem.title,
            category: newItem.category || 'Social',
            date: newItem.date || 'TBD',
            time: newItem.time || 'TBD',
            location: newItem.location || 'The Lounge',
            image: newItem.image || 'https://via.placeholder.com/400',
            description: newItem.description || '',
            attendees: newItem.attendees || []
        };

        if (editId) {
            updateEvent(event);
        } else {
            addEvent(event);
        }
        setIsEditing(false);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        await syncEventbrite();
        setIsSyncing(false);
    };

    return (
        <div>
             <div className="flex justify-end gap-2 mb-4">
                <button onClick={handleSync} disabled={isSyncing} className="bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm hover:bg-gray-50 disabled:opacity-50 text-xs uppercase tracking-wide">
                    <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>sync</span> {isSyncing ? 'Syncing...' : 'Sync Eventbrite'}
                </button>
                <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md">
                    <span className="material-symbols-outlined">add</span> Create
                </button>
            </div>

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-dark p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-lg mb-4 text-primary dark:text-white">{editId ? 'Edit Event' : 'Create Event'}</h3>
                        <div className="space-y-3 mb-6">
                            <input className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Event Title" value={newItem.title || ''} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                            <select className="w-full border p-3 rounded-lg bg-white dark:bg-black/20 dark:border-white/10 dark:text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                <option>Social</option>
                                <option>Dining</option>
                                <option>Wellness</option>
                                <option>Sport</option>
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <input className="border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Date" value={newItem.date || ''} onChange={e => setNewItem({...newItem, date: e.target.value})} />
                                <input className="border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Time" value={newItem.time || ''} onChange={e => setNewItem({...newItem, time: e.target.value})} />
                            </div>
                            <input className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Location" value={newItem.location || ''} onChange={e => setNewItem({...newItem, location: e.target.value})} />
                            <input className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Image URL" value={newItem.image || ''} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                            <textarea className="w-full border p-3 rounded-lg dark:bg-black/20 dark:border-white/10 dark:text-white" placeholder="Description" rows={3} value={newItem.description || ''} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 font-bold">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">Save</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map(event => (
                    <div key={event.id} onClick={() => openEdit(event)} className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col gap-3 relative overflow-hidden cursor-pointer hover:border-primary/30 transition-all">
                        {event.source === 'eventbrite' && (
                             <div className="absolute top-0 right-0 bg-[#F05537] text-white text-[8px] font-bold uppercase px-2 py-1 rounded-bl-lg z-10">Eventbrite</div>
                        )}
                        <div className="flex gap-4">
                            <img src={event.image} alt="" className="w-20 h-20 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-lg text-primary dark:text-white leading-tight mb-1 truncate">{event.title}</h4>
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-primary px-1.5 py-0.5 rounded mb-2">{event.category}</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{event.date} • {event.time}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-white/5 mt-auto">
                            <span className="text-xs text-gray-400 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">pin_drop</span> {event.location}</span>
                            <button onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }} className="text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-50 px-2 py-1 rounded">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
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

    const handleSave = () => {
        if (selectedMember) {
            updateMember(selectedMember);
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
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tier</span>
                            <span className="bg-primary/5 dark:bg-white/10 text-primary dark:text-white px-2 py-0.5 rounded text-xs font-bold">{m.tier}</span>
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

const SimulatorAdmin: React.FC = () => {
    const { bookings } = useData();
    const simBookings = bookings.filter(b => b.type === 'golf');

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {simBookings.length > 0 ? simBookings.map(b => (
                    <div key={b.id} className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-white/5 flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                <span className="text-xs font-bold uppercase">{b.date}</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-primary dark:text-white">{b.title}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{b.time} • {b.details}</p>
                            </div>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-xs font-bold rounded text-gray-500 dark:text-gray-300">Confirmed</span>
                    </div>
                )) : (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                        <p className="text-gray-400">No simulator bookings yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;