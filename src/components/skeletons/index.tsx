import React from 'react';

interface SkeletonCardProps {
  className?: string;
  isDark?: boolean;
}

const pulseBase = "animate-pulse";
const bgLight = "bg-gray-200";
const bgDark = "bg-white/10";

export const EventCardSkeleton: React.FC<SkeletonCardProps> = ({ isDark = false }) => {
  const bg = isDark ? bgDark : bgLight;
  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-white/5' : 'bg-white'} shadow-sm`}>
      <div className={`${pulseBase} ${bg} h-32 w-full`} />
      <div className="p-4 space-y-3">
        <div className={`${pulseBase} ${bg} h-5 w-3/4 rounded`} />
        <div className={`${pulseBase} ${bg} h-4 w-1/2 rounded`} />
        <div className="flex gap-2 pt-2">
          <div className={`${pulseBase} ${bg} h-6 w-16 rounded-full`} />
          <div className={`${pulseBase} ${bg} h-6 w-20 rounded-full`} />
        </div>
      </div>
    </div>
  );
};

export const BookingCardSkeleton: React.FC<SkeletonCardProps> = ({ isDark = false }) => {
  const bg = isDark ? bgDark : bgLight;
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-sm`}>
      <div className={`${pulseBase} ${bg} w-12 h-12 rounded-xl flex-shrink-0`} />
      <div className="flex-1 space-y-2">
        <div className={`${pulseBase} ${bg} h-5 w-2/3 rounded`} />
        <div className={`${pulseBase} ${bg} h-4 w-1/2 rounded`} />
      </div>
      <div className={`${pulseBase} ${bg} w-8 h-8 rounded-full`} />
    </div>
  );
};

export const MenuItemSkeleton: React.FC<SkeletonCardProps> = ({ isDark = false }) => {
  const bg = isDark ? bgDark : bgLight;
  return (
    <div className={`flex gap-4 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-sm`}>
      <div className={`${pulseBase} ${bg} w-14 h-14 rounded-lg flex-shrink-0`} />
      <div className="flex-1 space-y-2 py-1">
        <div className={`${pulseBase} ${bg} h-5 w-3/4 rounded`} />
        <div className={`${pulseBase} ${bg} h-4 w-1/2 rounded`} />
      </div>
      <div className={`${pulseBase} ${bg} h-5 w-12 rounded self-center`} />
    </div>
  );
};

export const DashboardCardSkeleton: React.FC<SkeletonCardProps> = ({ isDark = false }) => {
  const bg = isDark ? bgDark : bgLight;
  return (
    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-sm space-y-3`}>
      <div className="flex items-center gap-3">
        <div className={`${pulseBase} ${bg} w-10 h-10 rounded-xl`} />
        <div className="flex-1">
          <div className={`${pulseBase} ${bg} h-5 w-2/3 rounded mb-2`} />
          <div className={`${pulseBase} ${bg} h-4 w-1/3 rounded`} />
        </div>
      </div>
    </div>
  );
};

export const StatCardSkeleton: React.FC<SkeletonCardProps> = ({ isDark = false }) => {
  const bg = isDark ? bgDark : bgLight;
  return (
    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-white'} shadow-sm text-center`}>
      <div className={`${pulseBase} ${bg} h-8 w-12 rounded mx-auto mb-2`} />
      <div className={`${pulseBase} ${bg} h-4 w-16 rounded mx-auto`} />
    </div>
  );
};

export const ProfileSkeleton: React.FC<SkeletonCardProps> = ({ isDark = false }) => {
  const bg = isDark ? bgDark : bgLight;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className={`${pulseBase} ${bg} w-20 h-20 rounded-full`} />
        <div className="flex-1 space-y-2">
          <div className={`${pulseBase} ${bg} h-6 w-2/3 rounded`} />
          <div className={`${pulseBase} ${bg} h-4 w-1/2 rounded`} />
        </div>
      </div>
      <div className={`${pulseBase} ${bg} h-10 w-full rounded-xl`} />
      <div className={`${pulseBase} ${bg} h-10 w-full rounded-xl`} />
    </div>
  );
};

export const TimeSlotSkeleton: React.FC<SkeletonCardProps> = ({ isDark = false }) => {
  const bg = isDark ? bgDark : bgLight;
  return (
    <div className={`${pulseBase} ${bg} h-12 w-full rounded-xl`} />
  );
};

export const SkeletonList: React.FC<{ 
  count?: number; 
  Component: React.FC<SkeletonCardProps>;
  isDark?: boolean;
  className?: string;
}> = ({ count = 3, Component, isDark = false, className = "space-y-3" }) => (
  <div className={className}>
    {Array.from({ length: count }).map((_, i) => (
      <Component key={i} isDark={isDark} />
    ))}
  </div>
);
