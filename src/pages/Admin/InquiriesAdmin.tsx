import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePageReady } from '../../contexts/PageReadyContext';

interface Inquiry {
    id: number;
    formType: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    message: string | null;
    metadata: Record<string, unknown> | null;
    status: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string | null;
}

const STATUS_TABS = [
    { id: 'all', label: 'All', icon: 'inbox' },
    { id: 'new', label: 'New', icon: 'mark_email_unread' },
    { id: 'read', label: 'Read', icon: 'drafts' },
    { id: 'replied', label: 'Replied', icon: 'reply' },
    { id: 'archived', label: 'Archived', icon: 'archive' },
];

const FORM_TYPE_CHIPS = [
    { id: 'all', label: 'All Types' },
    { id: 'contact', label: 'Contact' },
    { id: 'tour-request', label: 'Tour Request' },
    { id: 'membership', label: 'Membership' },
    { id: 'private-hire', label: 'Private Hire' },
    { id: 'guest-checkin', label: 'Guest Check-in' },
];

const InquiriesAdmin: React.FC = () => {
    const { setPageReady } = usePageReady();
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeStatus, setActiveStatus] = useState('all');
    const [activeFormType, setActiveFormType] = useState('all');
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            setPageReady(true);
        }
    }, [isLoading, setPageReady]);

    const fetchInquiries = async () => {
        try {
            const params = new URLSearchParams();
            if (activeStatus !== 'all') params.append('status', activeStatus);
            if (activeFormType !== 'all') params.append('formType', activeFormType);
            
            const res = await fetch(`/api/admin/inquiries?${params.toString()}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setInquiries(data);
            }
        } catch (err) {
            console.error('Failed to fetch inquiries:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchInquiries();
    }, [activeStatus, activeFormType]);

    const openDetail = async (inquiry: Inquiry) => {
        setSelectedInquiry(inquiry);
        setNotes(inquiry.notes || '');
        setIsDetailOpen(true);
        
        if (inquiry.status === 'new') {
            try {
                await fetch(`/api/admin/inquiries/${inquiry.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ status: 'read' }),
                });
                setInquiries(prev => prev.map(i => i.id === inquiry.id ? { ...i, status: 'read' } : i));
                setSelectedInquiry(prev => prev ? { ...prev, status: 'read' } : null);
            } catch (err) {
                console.error('Failed to mark as read:', err);
            }
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedInquiry) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/inquiries/${selectedInquiry.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                setSelectedInquiry(prev => prev ? { ...prev, status } : null);
                await fetchInquiries();
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedInquiry) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/inquiries/${selectedInquiry.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ notes }),
            });
            if (res.ok) {
                setInquiries(prev => prev.map(i => i.id === selectedInquiry.id ? { ...i, notes } : i));
                setSelectedInquiry(prev => prev ? { ...prev, notes } : null);
            }
        } catch (err) {
            console.error('Failed to save notes:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchive = async () => {
        if (!selectedInquiry) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/inquiries/${selectedInquiry.id}?archive=true`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                setInquiries(prev => prev.map(i => i.id === selectedInquiry.id ? { ...i, status: 'archived' } : i));
                setIsDetailOpen(false);
                setSelectedInquiry(null);
            }
        } catch (err) {
            console.error('Failed to archive:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    };

    const getFormTypeLabel = (type: string) => {
        const found = FORM_TYPE_CHIPS.find(c => c.id === type);
        return found ? found.label : type;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
            case 'read': return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400';
            case 'replied': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
            case 'archived': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
            default: return 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <div className="animate-pop-in">
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide -mx-4 px-4 animate-pop-in" style={{animationDelay: '0.05s'}}>
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveStatus(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all flex-shrink-0 ${
                            activeStatus === tab.id 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-white/60 border border-gray-200 dark:border-white/10'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[14px] sm:text-[16px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide -mx-4 px-4 animate-pop-in" style={{animationDelay: '0.1s'}}>
                {FORM_TYPE_CHIPS.map(chip => (
                    <button
                        key={chip.id}
                        onClick={() => setActiveFormType(chip.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            activeFormType === chip.id 
                                ? 'bg-accent text-primary shadow-sm' 
                                : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                    >
                        {chip.label}
                    </button>
                ))}
            </div>

            {isDetailOpen && selectedInquiry && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 border border-gray-200 dark:border-white/10 pointer-events-auto modal-safe-height overflow-y-auto">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-primary dark:text-white">
                                        {selectedInquiry.firstName || ''} {selectedInquiry.lastName || ''}
                                    </h3>
                                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1 ${getStatusColor(selectedInquiry.status)}`}>
                                        {selectedInquiry.status}
                                    </span>
                                </div>
                                <button onClick={() => setIsDetailOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Email</label>
                                        <a href={`mailto:${selectedInquiry.email}`} className="text-sm text-primary dark:text-accent hover:underline">{selectedInquiry.email}</a>
                                    </div>
                                    {selectedInquiry.phone && (
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Phone</label>
                                            <a href={`tel:${selectedInquiry.phone}`} className="text-sm text-primary dark:text-accent hover:underline">{selectedInquiry.phone}</a>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Form Type</label>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{getFormTypeLabel(selectedInquiry.formType)}</span>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Submitted</label>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(selectedInquiry.createdAt)}</span>
                                    </div>
                                </div>

                                {selectedInquiry.message && (
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Message</label>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-black/20 p-3 rounded-lg whitespace-pre-wrap">{selectedInquiry.message}</p>
                                    </div>
                                )}

                                {selectedInquiry.metadata && Object.keys(selectedInquiry.metadata).length > 0 && (
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Additional Details</label>
                                        <div className="bg-gray-50 dark:bg-black/20 p-3 rounded-lg text-sm">
                                            {Object.entries(selectedInquiry.metadata).map(([key, value]) => (
                                                <div key={key} className="flex gap-2 py-1 border-b border-gray-100 dark:border-white/5 last:border-0">
                                                    <span className="text-gray-500 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>
                                                    <span className="text-gray-700 dark:text-gray-300">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Update Status</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {['read', 'replied', 'archived'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => handleUpdateStatus(status)}
                                                disabled={isSaving || selectedInquiry.status === status}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                                                    selectedInquiry.status === status 
                                                        ? 'bg-primary text-white' 
                                                        : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                                                }`}
                                            >
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-1">Staff Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Add internal notes about this inquiry..."
                                        rows={3}
                                        className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm"
                                    />
                                    <button
                                        onClick={handleSaveNotes}
                                        disabled={isSaving}
                                        className="mt-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Notes'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-between border-t border-gray-100 dark:border-white/10 pt-4">
                                <button
                                    onClick={handleArchive}
                                    disabled={isSaving || selectedInquiry.status === 'archived'}
                                    className="px-4 py-2 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm align-middle mr-1">archive</span>
                                    Archive
                                </button>
                                <button onClick={() => setIsDetailOpen(false)} className="px-5 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-sm">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-3xl text-gray-400">progress_activity</span>
                </div>
            ) : inquiries.length === 0 ? (
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-8 text-center shadow-sm border border-gray-100 dark:border-white/5">
                    <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3 block">mail</span>
                    <h3 className="text-lg font-bold text-primary dark:text-white mb-2">No Inquiries</h3>
                    <p className="text-gray-500 dark:text-gray-400">No form submissions match your current filters.</p>
                </div>
            ) : (
                <div className="space-y-3 animate-pop-in" style={{animationDelay: '0.15s'}}>
                    {inquiries.map((inquiry, index) => (
                        <div
                            key={inquiry.id}
                            onClick={() => openDetail(inquiry)}
                            className={`bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border cursor-pointer hover:border-primary/30 transition-all animate-pop-in ${
                                inquiry.status === 'new' 
                                    ? 'border-blue-200 dark:border-blue-800/30' 
                                    : inquiry.status === 'archived'
                                        ? 'border-gray-100 dark:border-white/5 opacity-60'
                                        : 'border-gray-100 dark:border-white/5'
                            }`}
                            style={{animationDelay: `${0.2 + index * 0.03}s`}}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    inquiry.status === 'new' 
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                        : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                                }`}>
                                    <span className="material-symbols-outlined text-lg">
                                        {inquiry.status === 'new' ? 'mark_email_unread' : inquiry.status === 'replied' ? 'reply' : 'mail'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white truncate flex-1">
                                            {inquiry.firstName || inquiry.lastName 
                                                ? `${inquiry.firstName || ''} ${inquiry.lastName || ''}`.trim() 
                                                : inquiry.email}
                                        </h4>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${getStatusColor(inquiry.status)}`}>
                                            {inquiry.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{inquiry.email}</span>
                                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60 px-1.5 py-0.5 rounded">
                                            {getFormTypeLabel(inquiry.formType)}
                                        </span>
                                    </div>
                                    {inquiry.message && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{inquiry.message}</p>
                                    )}
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">{formatDate(inquiry.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InquiriesAdmin;
