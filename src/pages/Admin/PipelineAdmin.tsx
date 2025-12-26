import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface Deal {
  id: string;
  dealname: string;
  dealstage: string;
  amount?: string;
  tour_datetime?: string;
  visit_type?: string;
  front_desk_notes?: string;
  application_status?: string;
  preferred_tier?: string;
  target_start_date?: string;
  last_activity_date?: string;
  contact: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    phone?: string;
  };
}

const PIPELINE_STAGES = {
  '2414796536': { name: 'Day Pass / Tour Requested', group: 'leads' },
  '2413968103': { name: 'Tour Booked (Scheduled)', group: 'leads' },
  '2414796537': { name: 'Visited - Day Pass used', group: 'applicants' },
  '2414797498': { name: 'Application Submitted', group: 'applicants' },
  'closedwon': { name: 'Active Member', group: 'members' },
  'closedlost': { name: 'Closed Lost', group: 'closed' },
} as const;

const STAGE_GROUPS = {
  leads: { label: 'Leads & Tours', color: 'blue', icon: 'group' },
  applicants: { label: 'Applicants', color: 'amber', icon: 'description' },
  members: { label: 'Members', color: 'green', icon: 'verified' },
  closed: { label: 'Closed Out', color: 'gray', icon: 'block' },
} as const;

type StageGroup = keyof typeof STAGE_GROUPS;
type FilterType = 'all' | 'today' | 'needs_action' | 'overdue';

const MOCK_DEALS: Deal[] = [
  {
    id: '1',
    dealname: 'Sarah Johnson - Membership',
    dealstage: '2414796536',
    tour_datetime: new Date().toISOString(),
    visit_type: 'Tour',
    front_desk_notes: 'Interested in golf simulator access',
    contact: {
      id: 'c1',
      firstname: 'Sarah',
      lastname: 'Johnson',
      email: 'sarah.johnson@example.com',
      phone: '(555) 123-4567',
    },
  },
  {
    id: '2',
    dealname: 'Michael Chen - Membership',
    dealstage: '2413968103',
    tour_datetime: new Date().toISOString(),
    visit_type: 'Tour',
    contact: {
      id: 'c2',
      firstname: 'Michael',
      lastname: 'Chen',
      email: 'michael.chen@example.com',
      phone: '(555) 234-5678',
    },
  },
  {
    id: '3',
    dealname: 'Emily Davis - Membership',
    dealstage: '2414796537',
    last_activity_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    front_desk_notes: 'Enjoyed the visit, considering Premium tier',
    contact: {
      id: 'c3',
      firstname: 'Emily',
      lastname: 'Davis',
      email: 'emily.davis@example.com',
    },
  },
  {
    id: '4',
    dealname: 'Robert Wilson - Membership',
    dealstage: '2414797498',
    application_status: 'Under Review',
    preferred_tier: 'Premium',
    target_start_date: '2025-01-15',
    contact: {
      id: 'c4',
      firstname: 'Robert',
      lastname: 'Wilson',
      email: 'robert.wilson@example.com',
      phone: '(555) 345-6789',
    },
  },
  {
    id: '5',
    dealname: 'Amanda Brown - Membership',
    dealstage: 'closedwon',
    preferred_tier: 'Core',
    contact: {
      id: 'c5',
      firstname: 'Amanda',
      lastname: 'Brown',
      email: 'amanda.brown@example.com',
    },
  },
  {
    id: '6',
    dealname: 'James Taylor - Membership',
    dealstage: 'closedlost',
    front_desk_notes: 'Decided to go with another club',
    contact: {
      id: 'c6',
      firstname: 'James',
      lastname: 'Taylor',
      email: 'james.taylor@example.com',
    },
  },
  {
    id: '7',
    dealname: 'Lisa Martinez - Membership',
    dealstage: '2414796536',
    last_activity_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    contact: {
      id: 'c7',
      firstname: 'Lisa',
      lastname: 'Martinez',
      email: 'lisa.martinez@example.com',
      phone: '(555) 456-7890',
    },
  },
];

const getGroupColor = (group: StageGroup, variant: 'bg' | 'text' | 'border' = 'bg') => {
  const colors = {
    leads: { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
    applicants: { bg: 'bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
    members: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/30' },
    closed: { bg: 'bg-gray-500/20', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/30' },
  };
  return colors[group][variant];
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const isToday = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const isOverdue = (deal: Deal): boolean => {
  if (!deal.last_activity_date) return false;
  if (deal.dealstage === 'closedwon' || deal.dealstage === 'closedlost') return false;
  const lastActivity = new Date(deal.last_activity_date);
  const daysSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 7;
};

const needsAction = (deal: Deal): boolean => {
  const actionStages = ['2413968103', '2414796537', '2414797498'];
  return actionStages.includes(deal.dealstage);
};

const PipelineAdmin: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState<StageGroup | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDeals = useMemo(() => {
    let deals = [...MOCK_DEALS];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      deals = deals.filter(d => 
        d.dealname.toLowerCase().includes(query) ||
        d.contact.firstname.toLowerCase().includes(query) ||
        d.contact.lastname.toLowerCase().includes(query) ||
        d.contact.email.toLowerCase().includes(query)
      );
    }

    if (activeGroup !== 'all') {
      deals = deals.filter(d => {
        const stage = PIPELINE_STAGES[d.dealstage as keyof typeof PIPELINE_STAGES];
        return stage?.group === activeGroup;
      });
    }

    switch (activeFilter) {
      case 'today':
        deals = deals.filter(d => isToday(d.tour_datetime));
        break;
      case 'needs_action':
        deals = deals.filter(needsAction);
        break;
      case 'overdue':
        deals = deals.filter(isOverdue);
        break;
    }

    return deals;
  }, [activeGroup, activeFilter, searchQuery]);

  const groupCounts = useMemo(() => {
    const counts = { leads: 0, applicants: 0, members: 0, closed: 0 };
    MOCK_DEALS.forEach(deal => {
      const stage = PIPELINE_STAGES[deal.dealstage as keyof typeof PIPELINE_STAGES];
      if (stage) counts[stage.group]++;
    });
    return counts;
  }, []);

  const filterCounts = useMemo(() => {
    return {
      all: MOCK_DEALS.length,
      today: MOCK_DEALS.filter(d => isToday(d.tour_datetime)).length,
      needs_action: MOCK_DEALS.filter(needsAction).length,
      overdue: MOCK_DEALS.filter(isOverdue).length,
    };
  }, []);

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <span className="material-symbols-outlined text-amber-500">info</span>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>Preview Mode:</strong> Showing sample data. HubSpot sync coming soon.
        </p>
      </div>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#293515]/50 text-primary dark:text-white placeholder:text-gray-400"
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(Object.entries(STAGE_GROUPS) as [StageGroup, typeof STAGE_GROUPS[StageGroup]][]).map(([key, group]) => (
          <button
            key={key}
            onClick={() => setActiveGroup(activeGroup === key ? 'all' : key)}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-xl border transition-all
              ${activeGroup === key 
                ? `${getGroupColor(key, 'bg')} ${getGroupColor(key, 'border')} ${getGroupColor(key, 'text')}`
                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'
              }
            `}
          >
            <span className="material-symbols-outlined text-xl">{group.icon}</span>
            <span className="text-xs font-medium">{group.label}</span>
            <span className="text-lg font-bold">{groupCounts[key]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {([
          { key: 'all', label: 'All Deals', icon: 'list' },
          { key: 'today', label: "Today's Visits", icon: 'today' },
          { key: 'needs_action', label: 'Needs Action', icon: 'pending_actions' },
          { key: 'overdue', label: 'Overdue', icon: 'schedule' },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm
              ${activeFilter === key
                ? 'bg-[#293515] text-white'
                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10'
              }
            `}
          >
            <span className="material-symbols-outlined text-lg">{icon}</span>
            {label}
            <span className={`
              px-1.5 py-0.5 rounded-full text-xs font-bold
              ${activeFilter === key ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10'}
            `}>
              {filterCounts[key]}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
            <p>No deals match your filters</p>
          </div>
        ) : (
          filteredDeals.map(deal => {
            const stage = PIPELINE_STAGES[deal.dealstage as keyof typeof PIPELINE_STAGES];
            const group = stage?.group || 'leads';
            
            return (
              <button
                key={deal.id}
                onClick={() => setSelectedDeal(deal)}
                className="w-full text-left bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-primary dark:text-white truncate">
                        {deal.contact.firstname} {deal.contact.lastname}
                      </h3>
                      {isOverdue(deal) && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-full font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{deal.contact.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`
                        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                        ${getGroupColor(group, 'bg')} ${getGroupColor(group, 'text')}
                      `}>
                        <span className="material-symbols-outlined text-sm">{STAGE_GROUPS[group].icon}</span>
                        {stage?.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {deal.tour_datetime && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {formatDateTime(deal.tour_datetime)}
                      </div>
                    )}
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {selectedDeal && (
        <DealDetailSheet 
          deal={selectedDeal} 
          onClose={() => setSelectedDeal(null)} 
        />
      )}
    </div>
  );
};

interface DealDetailSheetProps {
  deal: Deal;
  onClose: () => void;
}

const DealDetailSheet: React.FC<DealDetailSheetProps> = ({ deal, onClose }) => {
  const stage = PIPELINE_STAGES[deal.dealstage as keyof typeof PIPELINE_STAGES];
  const group = stage?.group || 'leads';
  const [notes, setNotes] = useState(deal.front_desk_notes || '');
  const [tourDate, setTourDate] = useState(deal.tour_datetime ? new Date(deal.tour_datetime).toISOString().slice(0, 16) : '');
  const [applicationStatus, setApplicationStatus] = useState(deal.application_status || '');

  const sheetContent = (
    <div 
      className="fixed inset-0 z-[10000] flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-t-3xl max-h-[85vh] overflow-hidden animate-slide-up">
        <div className="sticky top-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary dark:text-white">Deal Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(85vh - 64px)' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#293515] flex items-center justify-center text-white text-xl font-bold">
              {deal.contact.firstname[0]}{deal.contact.lastname[0]}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-primary dark:text-white">
                {deal.contact.firstname} {deal.contact.lastname}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{deal.contact.email}</p>
              {deal.contact.phone && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{deal.contact.phone}</p>
              )}
            </div>
          </div>

          <div className={`p-3 rounded-xl ${getGroupColor(group, 'bg')} ${getGroupColor(group, 'border')} border`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined ${getGroupColor(group, 'text')}`}>
                  {STAGE_GROUPS[group].icon}
                </span>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current Stage</p>
                  <p className={`font-semibold ${getGroupColor(group, 'text')}`}>{stage?.name}</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-white dark:bg-white/10 rounded-lg text-sm font-medium text-primary dark:text-white border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 transition-colors">
                Change Stage
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-primary dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">edit_note</span>
              Editable Properties
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tour Date & Time
              </label>
              <input
                type="datetime-local"
                value={tourDate}
                onChange={(e) => setTourDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#293515]/50 text-primary dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Visit Type
              </label>
              <select className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#293515]/50 text-primary dark:text-white">
                <option value="tour">Tour</option>
                <option value="day_pass">Day Pass</option>
                <option value="meeting">Meeting</option>
                <option value="event">Event</option>
              </select>
            </div>

            {(deal.dealstage === '2414797498' || deal.application_status) && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Application Status
                </label>
                <select 
                  value={applicationStatus}
                  onChange={(e) => setApplicationStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#293515]/50 text-primary dark:text-white"
                >
                  <option value="">Select status...</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Front Desk Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add notes about this lead..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#293515]/50 text-primary dark:text-white placeholder:text-gray-400 resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-primary dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">contact_page</span>
              Contact Info
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">First Name</label>
                <input
                  type="text"
                  defaultValue={deal.contact.firstname}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#293515]/50 text-primary dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Last Name</label>
                <input
                  type="text"
                  defaultValue={deal.contact.lastname}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#293515]/50 text-primary dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
              <input
                type="email"
                defaultValue={deal.contact.email}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#293515]/50 text-primary dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
              <input
                type="tel"
                defaultValue={deal.contact.phone || ''}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#293515]/50 text-primary dark:text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-primary dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">history</span>
              Activity History
            </h4>
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              Activity history will appear here when connected to HubSpot.
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-white/10 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              alert('Save functionality will be connected to HubSpot API');
              onClose();
            }}
            className="flex-1 py-3 px-4 bg-[#293515] text-white rounded-xl font-semibold hover:bg-[#293515]/90 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
};

export default PipelineAdmin;
