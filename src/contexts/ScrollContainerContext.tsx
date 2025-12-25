import React, { createContext, useContext, useRef, RefObject } from 'react';

interface ScrollContainerContextType {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

const ScrollContainerContext = createContext<ScrollContainerContextType | null>(null);

export const ScrollContainerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  return (
    <ScrollContainerContext.Provider value={{ scrollContainerRef }}>
      {children}
    </ScrollContainerContext.Provider>
  );
};

export const useScrollContainer = () => {
  const context = useContext(ScrollContainerContext);
  if (!context) {
    return { scrollContainerRef: { current: null } };
  }
  return context;
};
