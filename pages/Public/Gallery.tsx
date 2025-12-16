import React, { useState } from 'react';
import { Footer } from './Landing';

const INITIAL_DATA = [
    { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAzWRhzIrjwSfnj7Fn_YowoOoLnp97WiABk-tWFX-vHm9vYVgWfDHLMPoT4ZQbVU2EGAhTv-KaHV5aEOs4VcL4_wZ7ECvGSzK6fGflXG8YuTS_lK-L3gw9hcdx3rm2lxFR6Ffa1ZzLGc5KIVuV1qvgFJwnZq7ogeg1NN27FL1jDNSYSSMZv3ByuwH9pIVSQvbb-bsggfttrAXW-8nbxmxv3gjb_pN7PGcHxmy19tYOu9aVExJxUVAJ3Nen9mWcol8py-fbGO8-cN4dv", category: "Golf Bays" },
    { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHkFphah_JJxqbQaFDfRxCBg_6bNMjWolrhJdxHK6VNk0GoluIqsI0S6H0O6WCVOr55LtP75FXl6a7wwArWhD1MY_ZLwuDLINDZuRClUQFKmGFC6UjpTpo8bT7nQcI9hiGw_a7qkBiSwv6T3LJycKt3xJxHqn6aqfGnRnZt82xx24nElAT13HxE3YgHcGMq6M00WO1zWXJGxOqFyA8JE6fL_sslkN_QyE7s0wBHkCJe5clsAp8hhnnQX6vyLZkj0nwfMMkW-DjUuvE", category: "Lounge" },
    { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4cJv0jX_Q6g4XOR02SdveS0i0W9GBNM-0Brg1NVJqCe42zUKk7Y5m4JyWvRerLHa-wZPY2_ImoWC6NBatsFkSvQcGQqBKTHfsUyrWkJFwLQUgqycCI9Ky2odlg5EfiwrZNW0RPla61IlnFigW8JXN3Byd2z7S1T548aK5hq5VUtTpxAzcA5BqOgbEldke-6O5lq4kfkXQ7Bzvo7Tz7YMxpiA6qRtwqHejpinT_S5VKLWoybx5Dm2bm3JMgcE91Tjrri740okHaDJ7", category: "Golf Bays" },
    { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDcO6CHcRG7eZJIHoNQK3q7IDLsrPvpz5MHv8bX8jsBdNpsrxUiVfvcNGutkJAL4hMb54BloTAH3eeQmu1TbSozitCeIgwKamQ2EwxE0-gxx5YtGEyK8JPgdrf5tqRGPw5CuItiduF2BHgbMw-lIExEMD6cFGpbrnGajYHH_Qh1ZzYBPqat4BAeK0EzQ6GNIevs51s15awVavnoti78WHg7qQnjjV40ePXBucxKQ2s2YyT638bkMaDOhlvcDDTcfLNPRKVOjCgmSBMD", category: "Wellness" },
    { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrOquG_r7TmoaNda1akCtAZSL5euiwkQMkDzJHxsHljXdgNZ_sBlG5vQHxiUJu7Z5Ggf6vk0VtUBmXa2q1F7nKVB2YVodDjaCaveowpkDEzzuDMsRyHwqsb-nJjiEpd7faaiSrnEEQxI86oPFK5h-LZpmn7uURvYYshSQHG7ovgIFayEAaUGvQOPnPoyqgadHO4bezO7IEbYqLcuAD_1CI6gRpfkYadehp_O4sQlGJRPFaFW3WTZqNvnlS5l7Wmbx6J9IB28YlSXm-", category: "Events" },
    { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBE289XWOuAlWqQJmbWfhZ80zBuRs6z3V9UbBnx7TY3sTy-6x1RSYaoZAAQS3jMQ7Mle2gEPKY6DkkjVN4lI9j48hmNzapBU78tyW5U-rulCRLpg_bgGl083T-DZxgVH3s9m3SC-OUncvM7DKszJBNwtSZl6glcG8UPwu_FWA4VEym1eKeKsmEO2ajJ9dWyIM5BUhjUydmrWhaQWK__s7LicL2pw6qyUuWWXG0UIHL1RJ3nmI45qFpHue6-Ad1DgIaNva4s5vKMZP1h", category: "Lounge" }
];

const Gallery: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [data, setData] = useState(INITIAL_DATA);
  const [page, setPage] = useState(1);

  const filteredItems = filter === 'All' ? data : data.filter(item => item.category === filter);

  const handleLoadMore = () => {
    // Simulate loading more items by duplicating initial data
    const moreItems = INITIAL_DATA.map(item => ({ ...item, img: `${item.img}?v=${page}` }));
    setData(prev => [...prev, ...moreItems]);
    setPage(prev => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-[32px] font-bold tracking-tight text-primary dark:text-white leading-tight">Gallery</h1>
        <p className="text-primary/70 dark:text-gray-400 text-base mt-2 font-medium">Explore the exclusive spaces of Even House.</p>
      </div>

      <div className="pl-5 pr-5 py-2 w-full overflow-x-auto scrollbar-hide mb-4">
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
        <div className="mt-8 flex justify-center pb-8">
            {data.length < 24 ? (
                <button 
                    onClick={handleLoadMore}
                    className="text-primary dark:text-white text-sm font-bold border-b-2 border-primary/20 dark:border-white/20 pb-1 hover:border-primary dark:hover:border-white transition-colors"
                >
                    Load More Photos
                </button>
            ) : (
                <p className="text-xs text-primary/40 dark:text-white/40 font-medium">End of Gallery</p>
            )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

const FilterButton: React.FC<{label: string; active?: boolean; onClick?: () => void}> = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`${active ? 'bg-primary text-white shadow-md transform scale-105' : 'bg-white/60 text-primary border border-primary/5 hover:bg-white'} px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap`}>
    {label}
  </button>
);

const GalleryItem: React.FC<{img: string}> = ({ img }) => (
  <div className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-sm cursor-pointer mb-4">
    <img src={img} className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" alt="Gallery" />
  </div>
);

export default Gallery;