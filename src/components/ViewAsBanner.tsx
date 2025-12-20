import React from 'react';
import { useData } from '../contexts/DataContext';

const ViewAsBanner: React.FC = () => {
  const { isViewingAs, viewAsUser, clearViewAsUser, actualUser } = useData();
  
  if (!isViewingAs || !viewAsUser) return null;
  
  const isAdmin = actualUser?.role === 'admin' || actualUser?.role === 'staff';
  if (!isAdmin) return null;
  
  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-4 right-4 z-[100] bg-accent text-brand-green px-4 py-2 rounded-xl flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-lg">visibility</span>
        <span className="text-sm font-bold">
          Viewing as: {viewAsUser.name}
        </span>
        <span className="text-xs opacity-70">
          ({viewAsUser.tier} • {viewAsUser.email})
        </span>
      </div>
      <button 
        onClick={clearViewAsUser}
        className="flex items-center gap-1 px-3 py-1 bg-brand-green text-white rounded-lg text-sm font-bold hover:bg-brand-green/90 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">close</span>
        Exit
      </button>
    </div>
  );
};

export default ViewAsBanner;
