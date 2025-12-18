import React, { useState, useEffect } from 'react';
import { Footer } from '../../components/Footer';

interface GalleryImage {
  id: number;
  image_url: string;
  category: string;
  caption?: string;
  display_order: number;
}

const Gallery: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gallery?active_only=true')
      .then(res => res.json())
      .then(data => {
        setImages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredItems = filter === 'All' ? images : images.filter(item => item.category === filter);
  const categories = ['All', ...Array.from(new Set(images.map(img => img.category)))];

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2EC] overflow-x-hidden">
      <div className="px-5 pt-8 pb-6 animate-pop-in">
        <h1 className="text-3xl font-medium tracking-tight text-primary leading-tight">Gallery</h1>
        <p className="text-primary/70 text-base mt-2 font-light">Explore the exclusive spaces of Even House.</p>
      </div>

      <div className="pl-5 pr-5 py-2 w-full overflow-x-auto scrollbar-hide mb-6">
        <div className="flex gap-3 min-w-max pr-5">
          {categories.map(cat => (
            <FilterButton key={cat} label={cat} active={filter === cat} onClick={() => setFilter(cat)} />
          ))}
        </div>
      </div>

      <div className="px-5 flex-1">
        {loading ? (
          <div className="columns-2 gap-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="break-inside-avoid w-full aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded-2xl mb-4" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-4xl text-primary/30 mb-2">photo_library</span>
            <p className="text-primary/50">No images in this category.</p>
          </div>
        ) : (
          <div className="columns-2 gap-4 space-y-4 animate-in fade-in duration-500">
            {filteredItems.map((item) => (
              <GalleryItem key={item.id} img={item.image_url} caption={item.caption} />
            ))}
          </div>
        )}
        <div className="mt-12 flex justify-center pb-8">
          <p className="text-xs text-primary/40 font-medium">
            {filteredItems.length} {filteredItems.length === 1 ? 'photo' : 'photos'}
          </p>
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

const GalleryItem: React.FC<{img: string; caption?: string}> = ({ img, caption }) => {
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
        alt={caption || "Gallery"}
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
      {caption && loaded && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-sm font-medium">{caption}</p>
        </div>
      )}
    </div>
  );
};

export default Gallery;