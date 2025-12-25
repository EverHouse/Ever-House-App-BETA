import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Toggle from '../../components/Toggle';

interface FAQ {
    id: number;
    question: string;
    answer: string;
    category: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const FaqsAdmin: React.FC = () => {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [newItem, setNewItem] = useState<Partial<FAQ>>({ category: 'General', sortOrder: 0, isActive: true });
    const [isSaving, setIsSaving] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const fetchFaqs = async () => {
        try {
            const res = await fetch('/api/admin/faqs', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setFaqs(data);
            }
        } catch (err) {
            console.error('Failed to fetch FAQs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFaqs();
    }, []);

    const openEdit = (faq: FAQ) => {
        setNewItem(faq);
        setEditId(faq.id);
        setIsEditing(true);
    };

    const openCreate = () => {
        const maxSortOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.sortOrder)) : 0;
        setNewItem({ category: 'General', sortOrder: maxSortOrder + 1, isActive: true });
        setEditId(null);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!newItem.question?.trim() || !newItem.answer?.trim()) {
            setMessage({ type: 'error', text: 'Question and answer are required' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        try {
            const payload = {
                question: newItem.question.trim(),
                answer: newItem.answer.trim(),
                category: newItem.category || null,
                sortOrder: newItem.sortOrder ?? 0,
                isActive: newItem.isActive ?? true,
            };

            const res = editId
                ? await fetch(`/api/admin/faqs/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                })
                : await fetch('/api/admin/faqs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });

            if (res.ok) {
                setMessage({ type: 'success', text: editId ? 'FAQ updated' : 'FAQ created' });
                await fetchFaqs();
                setIsEditing(false);
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to save' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/admin/faqs/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'FAQ deleted' });
                setFaqs(prev => prev.filter(f => f.id !== id));
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to delete' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setDeleteConfirm(null);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleSeedFaqs = async () => {
        if (isSeeding) return;
        setIsSeeding(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/faqs/seed', {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: `Seeded ${data.count} FAQs` });
                await fetchFaqs();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to seed FAQs' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setIsSeeding(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleReorder = async (id: number, direction: 'up' | 'down') => {
        const currentIndex = faqs.findIndex(f => f.id === id);
        if (currentIndex === -1) return;
        
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= faqs.length) return;

        const currentFaq = faqs[currentIndex];
        const targetFaq = faqs[targetIndex];

        try {
            await Promise.all([
                fetch(`/api/admin/faqs/${currentFaq.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ sortOrder: targetFaq.sortOrder }),
                }),
                fetch(`/api/admin/faqs/${targetFaq.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ sortOrder: currentFaq.sortOrder }),
                }),
            ]);
            await fetchFaqs();
        } catch (err) {
            console.error('Failed to reorder:', err);
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
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-primary dark:text-white">FAQs ({faqs.length})</h2>
                <div className="flex gap-2">
                    {faqs.length === 0 && (
                        <button
                            onClick={handleSeedFaqs}
                            disabled={isSeeding}
                            className="bg-accent text-primary px-3 py-2 rounded-lg font-bold flex items-center gap-1 shadow-md text-xs whitespace-nowrap disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-sm">{isSeeding ? 'sync' : 'database'}</span>
                            {isSeeding ? 'Seeding...' : 'Seed FAQs'}
                        </button>
                    )}
                    <button
                        onClick={openCreate}
                        className="bg-primary text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 shadow-md text-xs whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-sm">add</span> Add FAQ
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    message.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                    {message.text}
                </div>
            )}

            {isEditing && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 border border-gray-200 dark:border-white/10 pointer-events-auto">
                            <h3 className="font-bold text-lg mb-5 text-primary dark:text-white">
                                {editId ? 'Edit FAQ' : 'Add FAQ'}
                            </h3>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question</label>
                                    <input
                                        className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        placeholder="Enter the question"
                                        value={newItem.question || ''}
                                        onChange={e => setNewItem({ ...newItem, question: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer</label>
                                    <textarea
                                        className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                                        placeholder="Enter the answer"
                                        rows={4}
                                        value={newItem.answer || ''}
                                        onChange={e => setNewItem({ ...newItem, answer: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                        <select
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={newItem.category || 'General'}
                                            onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                        >
                                            <option>General</option>
                                            <option>Membership</option>
                                            <option>Booking</option>
                                            <option>Amenities</option>
                                            <option>Events</option>
                                            <option>Policies</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort Order</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-black/30 p-3.5 rounded-xl text-primary dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                            value={newItem.sortOrder ?? 0}
                                            onChange={e => setNewItem({ ...newItem, sortOrder: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Active (visible on public FAQ page)</span>
                                    <Toggle
                                        checked={newItem.isActive ?? true}
                                        onChange={(val) => setNewItem({ ...newItem, isActive: val })}
                                        label="Toggle FAQ active status"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end">
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
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {deleteConfirm !== null && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-y-auto">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                    <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                        <div className="relative bg-white dark:bg-[#1a1d15] p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 border border-gray-200 dark:border-white/10 pointer-events-auto">
                            <h3 className="font-bold text-lg mb-3 text-primary dark:text-white">Delete FAQ?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                This action cannot be undone. Are you sure you want to delete this FAQ?
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-5 py-2.5 text-gray-500 dark:text-white/60 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow-md hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {faqs.length === 0 ? (
                <div className="bg-white dark:bg-surface-dark rounded-2xl p-8 text-center shadow-sm border border-gray-100 dark:border-white/5">
                    <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3 block">help_outline</span>
                    <h3 className="text-lg font-bold text-primary dark:text-white mb-2">No FAQs Yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by seeding default FAQs or adding your own.</p>
                    <button
                        onClick={handleSeedFaqs}
                        disabled={isSeeding}
                        className="bg-accent text-primary px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                        {isSeeding ? 'Seeding...' : 'Seed Default FAQs'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {faqs.map((faq, index) => (
                        <div
                            key={faq.id}
                            className={`bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border ${
                                faq.isActive 
                                    ? 'border-gray-100 dark:border-white/5' 
                                    : 'border-amber-200 dark:border-amber-800/30 opacity-60'
                            } transition-all`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => handleReorder(faq.id, 'up')}
                                        disabled={index === 0}
                                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
                                    </button>
                                    <button
                                        onClick={() => handleReorder(faq.id, 'down')}
                                        disabled={index === faqs.length - 1}
                                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(faq)}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1 flex-1">{faq.question}</h4>
                                        {!faq.isActive && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                                Hidden
                                            </span>
                                        )}
                                    </div>
                                    {faq.category && (
                                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60 px-1.5 py-0.5 rounded mb-1">
                                            {faq.category}
                                        </span>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{faq.answer}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openEdit(faq)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(faq.id)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
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

export default FaqsAdmin;
