import React, { useState } from 'react';
import { Footer } from '../../components/Footer';

const INITIAL_DATA = [
    { img: "/images/golf-sims.jpg", category: "Golf Bays" },
    { img: "/images/hero-lounge.jpg", category: "Lounge" },
    { img: "/images/venue-wide.jpg", category: "Golf Bays" },
    { img: "/images/wellness-yoga.jpg", category: "Wellness" },
    { img: "/images/events-crowd.jpg", category: "Events" },
    { img: "/images/terrace.jpg", category: "Lounge" },
    { img: "/images/private-dining.jpg", category: "Events" },
    { img: "/images/cowork.jpg", category: "Lounge" },
    { img: "/images/indoor-outdoor.png", category: "Lounge" },
    { img: "/images/cafe-bar.png", category: "Lounge" }
];

const Gallery: React.FC = () => {
  const [filter, setFilter] = useState('All');

  const filteredItems = filter === 'All' ? INITIAL_DATA : INITIAL_DATA.filter(item => item.category === filter);

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC] overflow-x-hidden">
      <div className="px-5 pt-8 pb-6 animate-pop-in">
        <h1 className="text-3xl font-medium tracking-tight text-primary leading-tight">Gallery</h1>
        <p className="text-primary/70 text-base mt-2 font-light">Explore the exclusive spaces of Even House.</p>
      </div>

      <div className="pl-5 pr-5 py-2 w-full overflow-x-auto scrollbar-hide mb-6">
        <div className="flex gap-3 min-w-max pr-5">
           <FilterButton label="All" active={filter === 'All'} onClick={() => setFilter('All')} />
           <FilterButton label="Golf Bays" active={filter === 'Golf Bays'} onClick={() => setFilter('Golf Bays')} />
           <FilterButton label="Lounge" active={filter === 'Lounge'} onClick={() => setFilter('Lounge')} />
           <FilterButton label="Wellness" active={filter === 'Wellness'} onClick={() => setFilter('Wellness')} />
           <FilterButton label="Events" active={filter === 'Events'} onClick={() => setFilter('Events')} />
        </div>
      </div>

      <div className="px-5 flex-1">
        <div className="columns-2 gap-4 space-y-4 animate-in fade-in duration-500">
           {filteredItems.map((item, index) => (
               <GalleryItem key={index} img={item.img} />
           ))}
        </div>
        <div className="mt-12 flex justify-center pb-8">
            <p className="text-xs text-primary/40 font-medium">End of Gallery</p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const FilterButton: React.FC<{label: string; active?: boolean; onClick?: () => void}> = ({ label, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`${
        active 
        ? 'bg-primary text-white shadow-md' 
        : 'bg-white/40 text-primary border border-white/50 hover:bg-white/60 backdrop-blur-md'
    } px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap`}
  >
    {label}
  </button>
);

const GalleryItem: React.FC<{img: string}> = ({ img }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  
  return (
    <div className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-sm cursor-pointer mb-4 border border-white/20">
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

export default Gallery;