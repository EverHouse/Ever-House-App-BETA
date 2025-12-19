
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData, CafeItem } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import Skeleton from '../../components/Skeleton';
import SwipeablePage from '../../components/SwipeablePage';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const Cafe: React.FC = () => {
  const { cafeMenu, isLoading } = useData();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const categories = useMemo(() => Array.from(new Set(cafeMenu.map(item => item.category))), [cafeMenu]);

  const [activeCategory, setActiveCategory] = useState(categories[0] || 'Coffee');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CafeItem | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Update activeCategory if categories change (and current selection is invalid)
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCategory)) {
        setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Scroll active category into view
  useEffect(() => {
    if (categoryScrollRef.current) {
        const buttons = categoryScrollRef.current.querySelectorAll('button');
        let activeBtn: HTMLElement | null = null;
        buttons.forEach(btn => {
            if (btn.textContent === activeCategory) activeBtn = btn as HTMLElement;
        });

        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
  }, [activeCategory]);

  const itemsByCategory = useMemo(() => {
    return categories.map(cat => ({
        category: cat,
        items: cafeMenu.filter(i => i.category === cat)
    }));
  }, [cafeMenu, categories]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
    setLastAddedItem(item.name);
    setTimeout(() => {
        setLastAddedItem(null);
    }, 2000);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing && existing.qty > 1) {
        return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const totalItems = useMemo(() => cart.reduce((acc, curr) => acc + curr.qty, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0), [cart]);

  const handleCheckout = () => {
    setIsOrderPlaced(true);
    setTimeout(() => {
      setCart([]);
      setIsOrderPlaced(false);
      setIsCartOpen(false);
    }, 3000);
  };

  // Swipe Logic
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null);
      setTouchStart({
          x: e.targetTouches[0].clientX,
          y: e.targetTouches[0].clientY
      });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      setTouchEnd({
          x: e.targetTouches[0].clientX,
          y: e.targetTouches[0].clientY
      });
  };

  const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      // Ignore if swipe started at left edge (handled by SwipeablePage navigation)
      if (touchStart.x < 50) return;

      const xDiff = touchStart.x - touchEnd.x;
      const yDiff = touchStart.y - touchEnd.y;
      const minSwipeDistance = 50;

      // Ensure horizontal swipe is dominant
      if (Math.abs(xDiff) > minSwipeDistance && Math.abs(yDiff) < Math.abs(xDiff)) {
          const currentIndex = categories.indexOf(activeCategory);
          
          if (xDiff > 0) {
              // Swipe Left -> Next Category
              if (currentIndex < categories.length - 1) {
                  setActiveCategory(categories[currentIndex + 1]);
              }
          } else {
              // Swipe Right -> Prev Category
              if (currentIndex > 0) {
                  setActiveCategory(categories[currentIndex - 1]);
              }
          }
      }
  };

  return (
    <SwipeablePage className="relative min-h-screen pb-24">
      <div className="pt-2 px-6">
        <h1 className={`text-3xl font-bold mb-4 drop-shadow-md ${isDark ? 'text-white' : 'text-primary'}`}>Café</h1>
        {isLoading ? (
           <div className="flex gap-2 overflow-x-hidden pb-4 -mx-6 px-6">
              {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} width={80} height={36} className="flex-shrink-0" />
              ))}
           </div>
        ) : (
            <div ref={categoryScrollRef} className="flex gap-2 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x">
            {itemsByCategory.map(cat => (
                <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-bold transition-all border active:scale-95 ${activeCategory === cat.category ? 'bg-accent text-brand-green shadow-glow border-accent' : (isDark ? 'glass-button text-white border-white/10 hover:bg-white/10' : 'bg-white text-primary border-black/10 hover:bg-black/5')}`}
                >
                {cat.category}
                </button>
            ))}
            </div>
        )}
      </div>

      <div 
        className="px-6 space-y-8 min-h-[60vh]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading ? (
            <div className="space-y-4">
                 {Array.from({ length: 5 }).map((_, i) => (
                     <div key={i} className="flex gap-4 p-3 rounded-xl border border-white/5 bg-white/5">
                         <Skeleton width={64} height={64} className="flex-shrink-0" />
                         <div className="flex-1 space-y-2 py-1">
                             <div className="flex justify-between">
                                 <Skeleton variant="text" width="60%" height={20} />
                                 <Skeleton variant="text" width={40} height={20} />
                             </div>
                             <Skeleton variant="text" width="90%" height={14} />
                         </div>
                     </div>
                 ))}
            </div>
        ) : (
            itemsByCategory.map(cat => (
            <div 
                key={cat.category} 
                className={activeCategory === cat.category ? 'block animate-slide-in-right' : 'hidden'}
            >
                <div className="space-y-4">
                {cat.items.map((item, index) => {
                    const isExpanded = expandedItemId === item.id;
                    return (
                    <div 
                    key={item.id} 
                    className={`rounded-xl transition-all animate-pop-in overflow-hidden ${isDark ? 'bg-white/[0.03] shadow-layered-dark' : 'bg-white shadow-layered'}`}
                    style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
                    >
                    <div 
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className={`flex justify-between items-center group p-3 cursor-pointer transition-all ${isExpanded ? '' : 'active:scale-[0.98]'}`}
                    >
                        <div className="flex gap-4 flex-1 items-center">
                            <div className={`w-14 h-14 flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden relative ${isDark ? 'bg-white/5 text-white/40' : 'bg-black/5 text-primary/40'}`}>
                                {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover absolute inset-0 opacity-80" />
                                ) : (
                                <span className="material-symbols-outlined text-2xl">{item.icon || 'restaurant'}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center gap-2">
                                <h3 className={`font-bold text-base leading-tight ${isDark ? 'text-white' : 'text-primary'}`}>{item.name}</h3>
                                <span className={`font-bold text-sm whitespace-nowrap ${isDark ? 'text-accent' : 'text-brand-green'}`}>
                                    {item.price === 0 ? 'MP' : `$${item.price}`}
                                </span>
                                </div>
                            </div>
                        </div>
                        <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ml-2 ${isDark ? 'text-white/40' : 'text-primary/40'} ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </div>
                    <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                        <div className="px-3 pb-3 pt-0">
                            <p className={`text-sm leading-relaxed mb-3 ${isDark ? 'text-white/60' : 'text-primary/60'}`}>
                                {item.desc || "A delicious choice from our menu, prepared fresh to order."}
                            </p>
                            <button 
                                onClick={(e) => {
                                e.stopPropagation();
                                addToCart(item);
                                }}
                                className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-colors active:scale-[0.98] ${isDark ? 'bg-white/10 text-white hover:bg-white hover:text-brand-green' : 'bg-brand-green text-white hover:bg-brand-green/90'}`}
                                aria-label={`Add ${item.name} to cart`}
                            >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Add to Order
                            </button>
                        </div>
                    </div>
                    </div>
                    );
                })}
                </div>
            </div>
            ))
        )}
      </div>

      {lastAddedItem && (
         <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-pop-in border border-white/10">
            <span className="material-symbols-outlined text-sm text-accent">check_circle</span>
            Added {lastAddedItem}
         </div>
      )}

      {totalItems > 0 && (
        <div className="fixed bottom-24 left-0 right-0 px-6 z-20 pointer-events-none flex justify-center w-full max-w-md mx-auto">
          <button 
            onClick={() => setIsCartOpen(true)}
            className={`pointer-events-auto w-full bg-white text-brand-green py-4 px-6 rounded-xl font-bold shadow-glow flex items-center justify-between transform active:scale-95 transition-all ${lastAddedItem ? 'scale-105' : 'scale-100'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-green/10 rounded-full flex items-center justify-center text-sm font-bold">
                {totalItems}
              </div>
              <span>View Order</span>
            </div>
            <span className="text-lg font-bold">${totalPrice}</span>
          </button>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setSelectedItem(null)}></div>
          
          <div className="relative w-full max-w-sm glass-card bg-[#293515] rounded-3xl overflow-hidden shadow-2xl animate-pop-in border border-white/10">
             <div className="h-64 relative bg-black/20">
                {selectedItem.image ? (
                   <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover opacity-90" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <span className="material-symbols-outlined text-6xl text-white/20">{selectedItem.icon || 'restaurant'}</span>
                    </div>
                )}
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 left-4 w-10 h-10 rounded-lg bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors active:scale-90"
                  aria-label="Close details"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
             </div>
             <div className="p-6">
                <div className="flex justify-between items-start mb-2 gap-4">
                   <h2 className="text-2xl font-bold text-white leading-tight">{selectedItem.name}</h2>
                   <span className="text-xl font-bold text-accent whitespace-nowrap">
                     {selectedItem.price === 0 ? 'MP' : `$${selectedItem.price}`}
                   </span>
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-8">
                   {selectedItem.desc || "A delicious choice from our menu, prepared fresh to order."}
                </p>
                <button 
                  onClick={() => {
                     addToCart(selectedItem);
                     setSelectedItem(null);
                  }}
                  className="w-full bg-white text-brand-green py-4 rounded-xl font-bold text-lg shadow-glow hover:bg-white/90 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Add to Order</span>
                  {selectedItem.price > 0 && <span className="bg-brand-green/10 px-2 py-0.5 rounded text-sm">${selectedItem.price}</span>}
                </button>
             </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center w-full max-w-md mx-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full glass-card bg-[#1a210d] rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col border-t border-white/10">
            
            {isOrderPlaced ? (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-6 animate-pop-in shadow-glow">
                  <span className="material-symbols-outlined text-4xl">check</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 animate-pop-in" style={{animationDelay: '0.1s'}}>Order Placed!</h2>
                <p className="text-white/60 animate-pop-in" style={{animationDelay: '0.2s'}}>Your order will be ready at the counter shortly.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Your Order</h2>
                  <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-lg glass-button hover:bg-white/10 text-white active:scale-90" aria-label="Close cart">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
                  {cart.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 animate-pop-in" style={{animationDelay: `${idx * 0.05}s`}}>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-white/5 rounded-lg px-2 py-1">
                          <button onClick={() => removeFromCart(item.id)} className="text-white/60 hover:text-white active:scale-90" aria-label="Decrease quantity">
                            <span className="material-symbols-outlined text-sm">remove</span>
                          </button>
                          <span className="text-sm font-bold w-4 text-center text-white">{item.qty}</span>
                          <button onClick={() => addToCart(item)} className="text-white/60 hover:text-white active:scale-90" aria-label="Increase quantity">
                            <span className="material-symbols-outlined text-sm">add</span>
                          </button>
                        </div>
                        <span className="font-bold text-white">{item.name}</span>
                      </div>
                      <span className="font-medium text-accent">
                         {item.price === 0 ? 'MP' : `$${item.price * item.qty}`}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-4 space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold text-white">
                    <span>Total</span>
                    <span>${totalPrice}</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="w-full bg-white text-brand-green py-4 rounded-xl font-bold text-lg shadow-glow hover:bg-white/90 active:scale-[0.98] transition-all"
                  >
                    Place Order
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </SwipeablePage>
  );
};

export default Cafe;