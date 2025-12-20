import React, { useState, useEffect, useCallback } from 'react';
import { Footer } from '../../components/Footer';

const INITIAL_DATA = [
    { img: "/images/golf-sims-optimized.webp", category: "Golf Bays" },
    { img: "/images/hero-lounge-optimized.webp", category: "Lounge" },
    { img: "/images/venue-wide-optimized.webp", category: "Golf Bays" },
    { img: "/images/wellness-yoga-optimized.webp", category: "Wellness" },
    { img: "/images/events-crowd-optimized.webp", category: "Events" },
    { img: "/images/terrace-optimized.webp", category: "Lounge" },
    { img: "/images/private-dining-optimized.webp", category: "Events" },
    { img: "/images/cowork-optimized.webp", category: "Lounge" },
    { img: "/images/indoor-outdoor-optimized.webp", category: "Lounge" },
    { img: "/images/cafe-bar-optimized.webp", category: "Lounge" }
];

const Gallery: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [viewerState, setViewerState] = useState<{images: string[], index: number} | null>(null);

  const filteredItems = filter === 'All' ? INITIAL_DATA : INITIAL_DATA.filter(item => item.category === filter);

  const openViewer = useCallback((index: number) => {
    const images = filteredItems.map(item => item.img);
    setViewerState({ images, index });
  }, [filteredItems]);

  const handleClose = useCallback(() => {
    setViewerState(null);
  }, []);

  const handlePrev = useCallback(() => {
    setViewerState(prev => {
      if (prev && prev.index > 0) {
        return { ...prev, index: prev.index - 1 };
      }
      return prev;
    });
  }, []);

  const handleNext = useCallback(() => {
    setViewerState(prev => {
      if (prev && prev.index < prev.images.length - 1) {
        return { ...prev, index: prev.index + 1 };
      }
      return prev;
    });
  }, []);

  const isModalOpen = viewerState !== null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, handleClose, handlePrev, handleNext]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC] overflow-x-hidden">
      <div className="px-5 pt-8 pb-6 animate-pop-in">
        <h1 className="text-3xl font-medium tracking-tight text-primary leading-tight">Gallery</h1>
        <p className="text-primary/70 text-base mt-2 font-light">Explore the exclusive spaces of Even House.</p>
      </div>

      <div className="pl-5 pr-5 py-2 w-full overflow-x-auto scrollbar-hide mb-6">
        <div className="flex gap-3 min-w-max pr-5">
           <FilterButton label="All" active={filter === 'All'} onClick={() => setFilter('All')} disabled={isModalOpen} />
           <FilterButton label="Golf Bays" active={filter === 'Golf Bays'} onClick={() => setFilter('Golf Bays')} disabled={isModalOpen} />
           <FilterButton label="Lounge" active={filter === 'Lounge'} onClick={() => setFilter('Lounge')} disabled={isModalOpen} />
           <FilterButton label="Wellness" active={filter === 'Wellness'} onClick={() => setFilter('Wellness')} disabled={isModalOpen} />
           <FilterButton label="Events" active={filter === 'Events'} onClick={() => setFilter('Events')} disabled={isModalOpen} />
        </div>
      </div>

      <div className="px-5 flex-1">
        <div className="columns-2 gap-4 space-y-4 animate-in fade-in duration-500">
           {filteredItems.map((item, index) => (
               <GalleryItem key={item.img} img={item.img} onClick={() => openViewer(index)} />
           ))}
        </div>
        <div className="mt-12 flex justify-center pb-8">
            <p className="text-xs text-primary/40 font-medium">End of Gallery</p>
        </div>
      </div>

      <Footer />

      {viewerState && (
        <ImageViewer
          images={viewerState.images}
          currentIndex={viewerState.index}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
};

const FilterButton: React.FC<{label: string; active?: boolean; onClick?: () => void; disabled?: boolean}> = ({ label, active, onClick, disabled }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className={`${
        active 
        ? 'bg-primary text-white shadow-md' 
        : 'bg-white/40 text-primary border border-white/50 hover:bg-white/60 backdrop-blur-md'
    } px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {label}
  </button>
);

const GalleryItem: React.FC<{img: string; onClick: () => void}> = ({ img, onClick }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  
  return (
    <div 
      className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-sm cursor-pointer mb-4 border border-white/20 active:scale-[0.98] transition-transform"
      onClick={onClick}
    >
      {!loaded && !error && (
        <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded-2xl" />
      )}
      <img 
        src={img} 
        className={`w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
        alt="Gallery"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      {error && (
        <div className="w-full aspect-[4/3] bg-gray-200 flex items-center justify-center rounded-2xl">
          <span className="material-symbols-outlined text-gray-400 text-3xl">broken_image</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
    </div>
  );
};

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, currentIndex, onClose, onPrev, onNext }) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) onNext();
    if (isRightSwipe) onPrev();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <span className="material-symbols-outlined text-white text-2xl">close</span>
      </button>

      {currentIndex > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          <span className="material-symbols-outlined text-white text-3xl">chevron_left</span>
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          <span className="material-symbols-outlined text-white text-3xl">chevron_right</span>
        </button>
      )}

      <div 
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[currentIndex]}
          alt="Gallery full view"
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded-full">
        <span className="text-white/80 text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </span>
      </div>
    </div>
  );
};

export default Gallery;