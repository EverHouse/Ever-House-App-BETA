import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../../App';
import { useData, Booking } from '../../contexts/DataContext';
import GlassRow from '../../components/GlassRow';
import DateButton from '../../components/DateButton';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { openNotifications } = useContext(NotificationContext);
  const { announcements, user, bookings, deleteBooking, addBooking } = useData();
  const latestAnnouncement = announcements[0];
  
  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState<string>(''); 
  const [newTime, setNewTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Sort bookings to find "Next Up"
  const sortedBookings = [...bookings].sort((a, b) => {
      // Very basic mock sort - in a real app, parse dates properly
      return a.time.localeCompare(b.time);
  });

  const nextBooking = sortedBookings[0];
  const upcomingBookings = sortedBookings.slice(1);

  const resourceBookings = bookings.filter(b => b.type === 'golf' || b.type === 'dining');
  const rsvpBookings = bookings.filter(b => b.type === 'event' || b.type === 'wellness');

  // Initialize modal state when a booking is selected
  useEffect(() => {
    if (selectedBooking) {
        // Extract day/date from booking string or default
        const initialDate = selectedBooking.date.includes(',') ? selectedBooking.date.split(',')[0] + ' ' + selectedBooking.date.split(' ')[2] : 'Tue 24'; 
        setNewDate(initialDate); 
        setNewTime(null);
    }
  }, [selectedBooking]);

  // Generate slots when date changes
  useEffect(() => {
    if (selectedBooking) {
        const slots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:30 PM', '04:00 PM'];
        setAvailableSlots(slots);
    }
  }, [newDate, selectedBooking]);

  const handleEditClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const handleUpdateBooking = () => {
    if (selectedBooking && newTime) {
        deleteBooking(selectedBooking.id);
        addBooking({
            ...selectedBooking,
            id: Date.now().toString(),
            date: newDate.includes(',') ? newDate : `${newDate.split(' ')[0]}, Oct ${newDate.split(' ')[1]}`, 
            time: newTime
        });
        setSelectedBooking(null);
    }
  };

  const handleCancelBooking = () => {
    if (selectedBooking && window.confirm("Are you sure you want to cancel this booking?")) {
        deleteBooking(selectedBooking.id);
        setSelectedBooking(null);
    }
  };

  const handleCancelRSVP = (id: string) => {
    if (window.confirm("Are you sure you want to cancel your RSVP?")) {
        deleteBooking(id);
    }
  };

  const getIconForType = (type: string) => {
    switch(type) {
        case 'golf': return 'sports_golf';
        case 'dining': return 'restaurant';
        case 'wellness': return 'spa';
        case 'event': return 'celebration';
        default: return 'event';
    }
  };

  return (
    <div className="px-6 pt-4 pb-32 font-sans relative min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
         <div>
            <h1 className="text-3xl font-bold text-white tracking-tight animate-pop-in">Hello, {user?.name.split(' ')[0]}</h1>
            <p className="text-white/60 text-sm font-medium mt-1 animate-pop-in" style={{animationDelay: '0.1s'}}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
         </div>
         <button onClick={() => openNotifications('announcements')} className="relative p-2 rounded-full glass-button text-white hover:bg-white/10 active:scale-95 transition-all">
            <span className="material-symbols-outlined">notifications</span>
            {announcements.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#0f120a]"></span>}
         </button>
      </div>

      {/* Next Up Hero Widget */}
      <div className="mb-8 animate-pop-in" style={{animationDelay: '0.15s'}}>
        {nextBooking ? (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E7E7DC] to-[#d4d4cb] p-6 shadow-glow text-brand-green group">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="material-symbols-outlined text-[120px]">{getIconForType(nextBooking.type)}</span>
                </div>
                <div className="relative z-10">
                    <span className="inline-block px-3 py-1 bg-brand-green/10 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 border border-brand-green/10">Next Up</span>
                    <h2 className="text-2xl font-bold leading-tight mb-1">{nextBooking.title}</h2>
                    <p className="text-sm font-medium opacity-80 mb-6">{nextBooking.time} • {nextBooking.details}</p>
                    
                    <div className="flex gap-2">
                        <button className="flex-1 bg-brand-green text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                            Check In
                        </button>
                        <button 
                            onClick={() => handleEditClick(nextBooking)}
                            className="w-12 flex items-center justify-center bg-white/50 hover:bg-white rounded-xl transition-colors text-brand-green border border-brand-green/10"
                        >
                            <span className="material-symbols-outlined">edit</span>
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-6 flex items-center justify-between group">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">No upcoming bookings</h2>
                    <p className="text-sm text-white/50">Ready to plan your day?</p>
                </div>
                <button onClick={() => navigate('/book')} className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-brand-green shadow-glow active:scale-90 transition-transform">
                    <span className="material-symbols-outlined">add</span>
                </button>
            </div>
        )}
      </div>

      {/* Horizontal Quick Actions */}
      <div className="mb-8 -mx-6 px-6 overflow-x-auto scrollbar-hide flex gap-4 animate-slide-in-right" style={{animationDelay: '0.2s'}}>
         <QuickAction icon="sports_golf" label="Book Golf" onClick={() => navigate('/book')} delay="0s" />
         <QuickAction icon="local_cafe" label="Cafe" onClick={() => navigate('/cafe')} delay="0.05s" />
         <QuickAction icon="spa" label="Wellness" onClick={() => navigate('/member-wellness')} delay="0.1s" />
         <QuickAction icon="event" label="Events" onClick={() => navigate('/member-events')} delay="0.15s" />
      </div>

      {/* Remaining Schedule */}
      <div className="space-y-8 animate-pop-in" style={{animationDelay: '0.3s'}}>
         <div>
            <div className="flex justify-between items-center mb-4 px-1">
               <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">Later Today</h3>
            </div>
            <div className="space-y-3">
               {upcomingBookings.length > 0 ? upcomingBookings.map((b, idx) => (
                  <GlassRow 
                    key={b.id} 
                    title={b.title} 
                    subtitle={`${b.time} • ${b.details}`} 
                    icon={getIconForType(b.type)} 
                    color="text-[#E7E7DC]"
                    actions={[
                        { icon: 'edit', label: 'Edit', onClick: () => handleEditClick(b) }
                    ]}
                    delay={`${0.3 + (idx * 0.1)}s`}
                  />
               )) : (
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/5 text-center">
                      <p className="text-sm text-white/40">You're all clear for the rest of the day.</p>
                  </div>
               )}
            </div>
         </div>
      </div>

      {/* Edit Booking Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={() => setSelectedBooking(null)}></div>
            <div className="relative w-full max-w-md bg-[#1a210d] border-t border-white/10 rounded-t-3xl shadow-2xl animate-slide-up flex flex-col p-6 pb-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Manage Booking</h2>
                    <button onClick={() => setSelectedBooking(null)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Current Info */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-brand-green">
                        <span className="material-symbols-outlined text-2xl">{getIconForType(selectedBooking.type)}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white leading-tight">{selectedBooking.title}</h3>
                        <p className="text-white/60 text-sm mt-1">{selectedBooking.date} • {selectedBooking.time}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 pl-1">Reschedule</h3>
                    
                    {/* Date Picker Strip */}
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide mb-2">
                        {['Mon 23', 'Tue 24', 'Wed 25', 'Thu 26', 'Fri 27'].map((d) => {
                            const day = d.split(' ')[0];
                            const dateNum = d.split(' ')[1];
                            return (
                                <DateButton 
                                    key={d}
                                    day={day} 
                                    date={dateNum} 
                                    active={newDate.startsWith(day)} 
                                    onClick={() => { setNewDate(d); setNewTime(null); }} 
                                />
                            );
                        })}
                    </div>

                    {/* Time Slots Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map(time => (
                            <button
                                key={time}
                                onClick={() => setNewTime(time)}
                                className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                                    newTime === time 
                                    ? 'bg-white text-brand-green border-white shadow-glow' 
                                    : 'bg-white/5 text-white/70 border-transparent hover:bg-white/10'
                                }`}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={handleUpdateBooking}
                        disabled={!newTime || (newTime === selectedBooking.time && newDate.includes(selectedBooking.date.split(',')[0]))}
                        className="w-full py-4 rounded-xl bg-accent text-brand-green font-bold text-sm uppercase tracking-wide shadow-glow disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
                    >
                        Confirm Changes
                    </button>
                    <button 
                        onClick={handleCancelBooking}
                        className="w-full py-4 rounded-xl border border-red-500/30 text-red-400 font-bold text-sm uppercase tracking-wide hover:bg-red-500/10 transition-colors"
                    >
                        Cancel Booking
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const QuickAction: React.FC<{icon: string; label: string; onClick: () => void; delay: string}> = ({ icon, label, onClick, delay }) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-center gap-2 min-w-[80px] group"
        style={{animationDelay: delay}}
    >
        <div className="w-16 h-16 rounded-2xl glass-button border border-white/10 flex items-center justify-center text-white group-hover:bg-white/10 group-active:scale-95 transition-all shadow-lg">
            <span className="material-symbols-outlined text-[28px]">{icon}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</span>
    </button>
);

export default Dashboard;