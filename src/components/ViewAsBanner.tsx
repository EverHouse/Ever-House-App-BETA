import React from 'react';
import { useData } from '../contexts/DataContext';
import { getBaseTier } from '../utils/permissions';

const ViewAsBanner: React.FC = () => {
  const { isViewingAs, viewAsUser, clearViewAsUser, actualUser } = useData();
  
  if (!isViewingAs || !viewAsUser) return null;
  
  // Only admins can use view-as-member feature (not staff)
  if (actualUser?.role !== 'admin') return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] bg-accent text-brand-green px-4 py-2 flex items-center justify-between shadow-lg safe-area-pb">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="material-symbols-outlined text-lg flex-shrink-0">visibility</span>
        <span className="text-sm font-bold truncate">
          Viewing as: {viewAsUser.name}
        </span>
        <span className="text-xs opacity-70 truncate hidden sm:inline">
          ({getBaseTier(viewAsUser.tier || '')})
        </span>
      </div>
      <button 
        onClick={clearViewAsUser}
        className="flex items-center gap-1 px-3 py-1 bg-brand-green text-white rounded-lg text-sm font-bold hover:bg-brand-green/90 transition-colors flex-shrink-0 ml-2"
      >
        <span className="material-symbols-outlined text-sm">close</span>
        Exit
      </button>
    </div>
  );
};

export default ViewAsBanner;
