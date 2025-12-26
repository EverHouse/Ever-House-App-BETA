
import React, { useState, useEffect, useContext, ErrorInfo, useMemo, useRef, lazy, Suspense, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SmoothScrollProvider } from './components/motion/SmoothScroll';
import DirectionalPageTransition, { TransitionContext } from './components/motion/DirectionalPageTransition';
import Logo from './components/Logo';
import MenuOverlay from './components/MenuOverlay';
import ViewAsBanner from './components/ViewAsBanner';
import { ToastProvider } from './components/Toast';
import OfflineBanner from './components/OfflineBanner';
import { NotificationContext } from './contexts/NotificationContext';
import { SafeAreaBottomOverlay } from './components/layout/SafeAreaBottomOverlay';
import { BottomNavProvider } from './contexts/BottomNavContext';
import { AnnouncementBadgeProvider, useAnnouncementBadge } from './contexts/AnnouncementBadgeContext';
import { BottomSentinel } from './components/layout/BottomSentinel';

const PageSkeleton: React.FC = () => (
  <div className="px-6 pt-4 animate-pulse">
    <div className="h-8 w-48 bg-white/10 rounded-lg mb-2" />
    <div className="h-4 w-32 bg-white/5 rounded mb-6" />
    <div className="space-y-4">
      <div className="h-24 bg-white/5 rounded-xl" />
      <div className="h-24 bg-white/5 rounded-xl" />
      <div className="h-24 bg-white/5 rounded-xl" />
    </div>
  </div>
);

const lazyWithPrefetch = (importFn: () => Promise<{ default: React.ComponentType<any> }>) => {
  const Component = lazy(importFn);
  (Component as any).prefetch = importFn;
  return Component;
};

const Dashboard = lazy(() => import('./pages/Member/Dashboard'));
const BookGolf = lazyWithPrefetch(() => import('./pages/Member/BookGolf'));
const MemberEvents = lazyWithPrefetch(() => import('./pages/Member/Events'));
const MemberWellness = lazyWithPrefetch(() => import('./pages/Member/Wellness'));
const Profile = lazyWithPrefetch(() => import('./pages/Member/Profile'));
const MemberAnnouncements = lazyWithPrefetch(() => import('./pages/Member/Announcements'));
const Landing = lazy(() => import('./pages/Public/Landing'));
const Membership = lazy(() => import('./pages/Public/Membership'));
const Contact = lazy(() => import('./pages/Public/Contact'));
const Gallery = lazy(() => import('./pages/Public/Gallery'));
const WhatsOn = lazy(() => import('./pages/Public/WhatsOn'));
const PrivateHire = lazy(() => import('./pages/Public/PrivateHire'));
const PublicCafe = lazy(() => import('./pages/Public/Cafe'));
const FAQ = lazy(() => import('./pages/Public/FAQ'));
const Login = lazy(() => import('./pages/Public/Login'));
const VerifyMagicLink = lazy(() => import('./pages/Public/VerifyMagicLink'));
const AuthCallback = lazy(() => import('./pages/Public/AuthCallback'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));

import { prefetchRoute, prefetchAdjacentRoutes, prefetchOnIdle } from './lib/prefetch';

const useDebugLayout = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debugMode = params.get('debugLayout') === '1';
    
    if (debugMode) {
      document.documentElement.classList.add('debug-layout');
      
      const checkOverflow = () => {
        const existing = document.querySelector('.debug-overflow-warning');
        if (document.documentElement.scrollWidth > window.innerWidth) {
          if (!existing) {
            const warning = document.createElement('div');
            warning.className = 'debug-overflow-warning';
            warning.textContent = `Overflow! ${document.documentElement.scrollWidth}px > ${window.innerWidth}px`;
            document.body.appendChild(warning);
          }
        } else if (existing) {
          existing.remove();
        }
      };
      
      checkOverflow();
      window.addEventListener('resize', checkOverflow);
      
      return () => {
        window.removeEventListener('resize', checkOverflow);
        document.documentElement.classList.remove('debug-layout');
        const warning = document.querySelector('.debug-overflow-warning');
        if (warning) warning.remove();
      };
    }
    
    return undefined;
  }, []);
};

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#0f120a] text-white p-6">
          <div className="glass-card rounded-2xl p-8 max-w-md text-center">
            <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-white/70 mb-6">We're sorry for the inconvenience.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-accent rounded-xl font-semibold hover:opacity-90 transition-opacity text-brand-green"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [pathname]);
  
  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useData();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Members Portal route guard - redirects staff/admin to Staff Portal (unless viewing as member or on profile page)
const MemberPortalRoute: React.FC<{ children: React.ReactNode; allowStaffAccess?: boolean }> = ({ children, allowStaffAccess }) => {
  const { user, actualUser, isViewingAs } = useData();
  if (!user) return <Navigate to="/login" replace />;
  
  // If staff/admin is NOT viewing as a member, redirect to Staff Portal
  // Exception: allow staff access to profile page for sign out
  const isStaffOrAdmin = actualUser?.role === 'admin' || actualUser?.role === 'staff';
  if (isStaffOrAdmin && !isViewingAs && !allowStaffAccess) {
    return <Navigate to="/admin" replace />;
  }
  
  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { actualUser } = useData();
  if (!actualUser) return <Navigate to="/login" replace />;
  if (actualUser.role !== 'admin' && actualUser.role !== 'staff') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

interface UserNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: number;
}

const ROUTE_INDICES: Record<string, number> = {
  '/dashboard': 0,
  '/book': 1,
  '/member-wellness': 2,
  '/member-events': 3,
  '/announcements': 4,
  '/profile': 5,
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  
  useEffect(() => {
    prefetchOnIdle();
  }, []);
  
  const transitionState = useMemo(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;
    
    const prevIndex = ROUTE_INDICES[prevPath] ?? -1;
    const currentIndex = ROUTE_INDICES[currentPath] ?? -1;
    
    if (prevIndex >= 0 && currentIndex >= 0 && prevPath !== currentPath) {
      const direction = currentIndex > prevIndex ? 1 : -1;
      const distance = Math.abs(currentIndex - prevIndex);
      return { direction, distance: Math.max(0.1, distance) };
    }
    return { direction: 1, distance: 1 };
  }, [location.pathname]);
  
  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <TransitionContext.Provider value={transitionState}>
      <Suspense fallback={<PageSkeleton />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<DirectionalPageTransition><Landing /></DirectionalPageTransition>} />
            <Route path="/membership/*" element={<DirectionalPageTransition><Membership /></DirectionalPageTransition>} />
            <Route path="/contact" element={<DirectionalPageTransition><Contact /></DirectionalPageTransition>} />
            <Route path="/gallery" element={<DirectionalPageTransition><Gallery /></DirectionalPageTransition>} />
            <Route path="/whats-on" element={<DirectionalPageTransition><WhatsOn /></DirectionalPageTransition>} />
            <Route path="/private-hire" element={<DirectionalPageTransition><PrivateHire /></DirectionalPageTransition>} />
            <Route path="/menu" element={<DirectionalPageTransition><PublicCafe /></DirectionalPageTransition>} />
            <Route path="/faq" element={<DirectionalPageTransition><FAQ /></DirectionalPageTransition>} />
            <Route path="/login" element={<DirectionalPageTransition><Login /></DirectionalPageTransition>} />
            <Route path="/verify" element={<DirectionalPageTransition><VerifyMagicLink /></DirectionalPageTransition>} />
            <Route path="/auth/callback" element={<DirectionalPageTransition><AuthCallback /></DirectionalPageTransition>} />
            <Route path="/reset-password" element={<DirectionalPageTransition><Login /></DirectionalPageTransition>} />

            <Route path="/admin" element={
              <AdminProtectedRoute>
                <DirectionalPageTransition><AdminDashboard /></DirectionalPageTransition>
              </AdminProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><Dashboard /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/book" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><BookGolf /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/member-events" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><MemberEvents /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/member-wellness" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><MemberWellness /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/profile" element={
              <MemberPortalRoute allowStaffAccess>
                <DirectionalPageTransition><Profile /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            <Route path="/announcements" element={
              <MemberPortalRoute>
                <DirectionalPageTransition><MemberAnnouncements /></DirectionalPageTransition>
              </MemberPortalRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </Suspense>
    </TransitionContext.Provider>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { announcements, user, actualUser, isViewingAs } = useData();
  const { effectiveTheme } = useTheme();
  
  // Check if actual user is staff/admin (for header logic)
  const isStaffOrAdmin = actualUser?.role === 'admin' || actualUser?.role === 'staff';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'updates' | 'announcements'>('updates');
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);

  useEffect(() => {
    if (user?.email) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch(`/api/notifications?user_email=${encodeURIComponent(user.email)}`);
          if (res.ok) {
            const data = await res.json();
            setUserNotifications(data);
            setUnreadCount(data.filter((n: UserNotification) => !n.is_read).length);
          }
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
        }
      };
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.email]);

  const markAsRead = async (notifId: number) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
      setUserNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.email) return;
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: user.email }),
      });
      setUserNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };
  
  useDebugLayout();

  useEffect(() => {
    if (location.pathname !== '/') {
      setHasScrolledPastHero(false);
      return;
    }
    
    const handleScroll = () => {
      const heroThreshold = window.innerHeight * 0.6;
      setHasScrolledPastHero(window.scrollY > heroThreshold);
    };
    
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    const metaThemeColor = document.getElementById('theme-color-meta');
    if (!metaThemeColor) return;
    
    const isLanding = location.pathname === '/';
    const isMember = ['/dashboard', '/book', '/member-events', '/member-wellness', '/profile', '/announcements'].some(path => location.pathname.startsWith(path));
    const isAdmin = location.pathname.startsWith('/admin');
    
    let themeColor: string;
    
    if (isLanding && !hasScrolledPastHero) {
      themeColor = '#1a1610';
    } else if (isAdmin || isMember) {
      themeColor = '#0f120a';
    } else {
      themeColor = '#293515';
    }
    
    metaThemeColor.setAttribute('content', themeColor);
  }, [location.pathname, hasScrolledPastHero]);
  
  const isMemberRoute = ['/dashboard', '/book', '/member-events', '/member-wellness', '/profile', '/announcements'].some(path => location.pathname.startsWith(path));
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLandingPage = location.pathname === '/';
  const isDarkTheme = isAdminRoute || (isMemberRoute && effectiveTheme === 'dark');
  const showHeader = !isAdminRoute;

  const handleTopLeftClick = () => {
    setIsMenuOpen(true);
  };

  const isProfilePage = location.pathname === '/profile';
  
  const handleTopRightClick = () => {
    if (user) {
        // For staff/admin (not viewing as member), go to Staff Portal
        if (isStaffOrAdmin && !isViewingAs) {
            navigate('/admin');
        } else if (isProfilePage) {
            navigate('/dashboard');
        } else if (isMemberRoute) {
            navigate('/profile');
        } else {
            // On public pages, staff/admin go to Staff Portal, members go to dashboard
            if (isStaffOrAdmin) {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        }
    } else {
        navigate('/login');
    }
  };

  const getTopRightIcon = () => {
      if (!user) return 'login';
      // For staff/admin not viewing as member, show admin icon
      if (isStaffOrAdmin && !isViewingAs) return 'admin_panel_settings';
      if (isProfilePage) return 'dashboard';
      if (isMemberRoute) return 'account_circle';
      return 'account_circle';
  };

  const getCenterIcon = () => {
      if (!isMemberRoute) return null;
      const path = location.pathname;
      if (path === '/dashboard') return 'home';
      if (path === '/profile') return 'account_circle';
      if (path.startsWith('/book')) return 'sports_golf';
      if (path.startsWith('/member-wellness')) return 'spa';
      if (path.startsWith('/announcements')) return 'campaign';
      if (path.startsWith('/member-events')) return 'celebration';
      return 'home';
  };

  const openNotifications = (tab?: 'updates' | 'announcements') => {
    if (tab) setNotifTab(tab);
    setIsNotificationsOpen(true);
  };
  
  const headerClasses = isMemberRoute 
    ? (isDarkTheme 
        ? "bg-[#0f120a] text-[#F2F2EC] shadow-md border-b border-white/5"
        : "bg-[#293515] text-[#F2F2EC] shadow-lg shadow-black/20 border-b border-[#1e2810]")
    : isLandingPage
      ? (hasScrolledPastHero 
          ? "bg-[#293515] text-white shadow-lg shadow-black/20 border-b border-white/10"
          : "bg-transparent text-white")
      : "bg-[#293515] text-[#F2F2EC] shadow-lg shadow-black/20";
  const headerBtnClasses = "text-white hover:opacity-70 active:scale-95 transition-all";

  const headerContent = showHeader ? (
    <header className={`fixed top-0 left-0 right-0 flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-4 z-[9998] pointer-events-auto transition-all duration-300 ${headerClasses}`} role="banner">
      <button 
        onClick={handleTopLeftClick}
        className={`w-10 h-10 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg`}
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>
      
      {isMemberRoute ? (
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          <span 
            key={getCenterIcon()}
            className={`material-symbols-outlined text-[32px] animate-icon-morph ${isDarkTheme ? 'text-[#F2F2EC]' : 'text-[#F2F2EC]'}`}
          >
            {getCenterIcon()}
          </span>
        </div>
      ) : (
        <button 
          className="absolute left-1/2 -translate-x-1/2 cursor-pointer flex items-center justify-center focus:ring-2 focus:ring-accent focus:outline-none rounded-lg" 
          onClick={() => navigate('/')}
          aria-label="Go to home"
        >
          <Logo 
            isMemberRoute={isMemberRoute} 
            isDarkBackground={true} 
            className="h-14 w-auto"
          />
        </button>
      )}

      <div className="flex items-center gap-1 ml-auto">
        {isMemberRoute && user && (
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className={`w-10 h-10 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg relative`}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
        <button 
          onClick={handleTopRightClick}
          className={`w-10 h-10 flex items-center justify-center ${headerBtnClasses} focus:ring-2 focus:ring-accent focus:outline-none rounded-lg`}
          aria-label={user ? (isMemberRoute ? 'View profile' : 'Go to dashboard') : 'Login'}
        >
          <span 
            key={getTopRightIcon()}
            className="material-symbols-outlined text-[24px] animate-icon-morph"
          >
             {getTopRightIcon()}
          </span>
        </button>
      </div>
    </header>
  ) : null;

  return (
    <div className={`${isDarkTheme ? 'dark liquid-bg text-white' : 'bg-[#F2F2EC] text-primary'} min-h-screen w-full relative transition-colors duration-500 font-sans`}>
      
      {isDarkTheme ? (
        <>
            <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#E7E7DC]/5 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        </>
      ) : (
        <>
            <div className="fixed top-[-20%] right-[-20%] w-[600px] h-[600px] bg-white rounded-full blur-[80px] pointer-events-none opacity-60"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#E7E7DC] rounded-full blur-[60px] pointer-events-none opacity-40"></div>
        </>
      )}
      
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay"></div>

      <NotificationContext.Provider value={{ openNotifications }}>
        <ViewAsBanner />
        
        {/* Header rendered via portal to escape transform context */}
        {headerContent && createPortal(headerContent, document.body)}
        
        <div className={`relative w-full min-h-screen flex flex-col ${isDarkTheme ? 'text-white' : 'text-primary'}`}>

            <main 
                id="main-content"
                className={`flex-1 relative ${showHeader && !isLandingPage ? 'pt-[max(72px,calc(env(safe-area-inset-top)+56px))]' : ''}`}
            >
                {children}
                {isMemberRoute && !isAdminRoute && !isProfilePage && <BottomSentinel />}
            </main>

            {isMemberRoute && !isAdminRoute && !isProfilePage && user && (
              <MemberBottomNav currentPath={location.pathname} isDarkTheme={isDarkTheme} />
            )}

            <MenuOverlay isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
            
            {isNotificationsOpen && (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setIsNotificationsOpen(false)}></div>
                 <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 animate-in slide-in-from-top-5 duration-300 border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-xl text-white">Notifications</h3>
                       <div className="flex items-center gap-2">
                         {unreadCount > 0 && (
                           <button 
                             onClick={markAllAsRead}
                             className="text-xs text-white/70 hover:text-white transition-colors"
                           >
                             Mark all read
                           </button>
                         )}
                         <button onClick={() => setIsNotificationsOpen(false)} className="w-8 h-8 rounded-lg glass-button flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">close</span>
                         </button>
                       </div>
                    </div>
                    
                    <div className="h-[350px] overflow-y-auto space-y-3 scrollbar-hide">
                      {userNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/50">
                          <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        userNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => !notif.is_read && markAsRead(notif.id)}
                            className={`flex gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                              notif.is_read 
                                ? 'bg-white/5 hover:bg-white/10' 
                                : 'bg-accent/20 hover:bg-accent/30 border border-accent/30'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              notif.type === 'booking_approved' ? 'bg-green-500/20' :
                              notif.type === 'booking_declined' ? 'bg-red-500/20' :
                              'bg-accent/20'
                            }`}>
                              <span className={`material-symbols-outlined text-[20px] ${
                                notif.type === 'booking_approved' ? 'text-green-400' :
                                notif.type === 'booking_declined' ? 'text-red-400' :
                                'text-white'
                              }`}>
                                {notif.type === 'booking_approved' ? 'check_circle' :
                                 notif.type === 'booking_declined' ? 'cancel' :
                                 'notifications'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h4 className={`font-bold text-sm ${notif.is_read ? 'text-white/70' : 'text-white'}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] text-white/50 ml-2 shrink-0">
                                  {new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 ${notif.is_read ? 'text-white/50' : 'text-white/70'}`}>
                                {notif.message}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                 </div>
              </div>
            )}
        </div>
      </NotificationContext.Provider>
    </div>
  );
};

const NotifItem: React.FC<{icon: string; title: string; desc: string; time: string}> = ({ icon, title, desc, time }) => (
  <div className="flex gap-3 p-3 rounded-xl glass-button border-0 bg-white/5 hover:bg-white/10 transition-colors">
     <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
     </div>
     <div>
        <div className="flex justify-between items-center w-full">
           <h4 className="font-bold text-sm text-white">{title}</h4>
           <span className="text-[10px] text-white/50 ml-2">{time}</span>
        </div>
        <p className="text-xs text-white/70 mt-0.5">{desc}</p>
     </div>
  </div>
);

interface MemberNavItem {
  path: string;
  icon: string;
  label: string;
}

const MEMBER_NAV_ITEMS: MemberNavItem[] = [
  { path: '/dashboard', icon: 'dashboard', label: 'Home' },
  { path: '/book', icon: 'sports_golf', label: 'Golf' },
  { path: '/member-wellness', icon: 'spa', label: 'Wellness' },
  { path: '/member-events', icon: 'calendar_month', label: 'Events' },
  { path: '/announcements', icon: 'campaign', label: 'News' },
];

const MemberBottomNav: React.FC<{ currentPath: string; isDarkTheme: boolean }> = ({ currentPath, isDarkTheme }) => {
  const navigate = useNavigate();
  const navigatingRef = useRef(false);
  const lastTapRef = useRef(0);
  const { hasUnseenAnnouncements, markAllAsSeen } = useAnnouncementBadge();
  
  useEffect(() => {
    prefetchAdjacentRoutes(currentPath);
    navigatingRef.current = false;
  }, [currentPath]);
  
  useEffect(() => {
    if (currentPath === '/announcements') {
      markAllAsSeen();
    }
  }, [currentPath, markAllAsSeen]);
  
  const handleNavigation = useCallback((path: string, label: string) => {
    if (navigatingRef.current) return;
    if (path === currentPath) return;
    
    navigatingRef.current = true;
    if (import.meta.env.DEV) {
      console.log(`[MemberNav] navigating to "${label}"`);
    }
    navigate(path);
  }, [navigate, currentPath]);
  
  const activeIndex = MEMBER_NAV_ITEMS.findIndex(item => item.path === currentPath);
  const itemCount = MEMBER_NAV_ITEMS.length;
  
  const blobWidth = 100 / itemCount;
  
  const navContent = (
      <nav 
        className="relative mb-8 mx-auto w-[calc(100%-3rem)] max-w-md rounded-full p-1.5 bg-black/60 backdrop-blur-xl border border-[#293515]/80 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)] pointer-events-auto"
        role="navigation"
        aria-label="Member navigation"
      >
        <div className="relative flex items-center w-full">
          {activeIndex >= 0 && (
            <div 
              className="absolute top-0 bottom-0 left-0 rounded-full pointer-events-none bg-gradient-to-b from-white/20 to-white/10 shadow-[0_0_20px_rgba(41,53,21,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{ 
                width: `${blobWidth}%`, 
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            />
          )}
          
          {MEMBER_NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path;
            const isGolfIcon = item.icon === 'sports_golf';
            const shouldFill = isActive && !isGolfIcon;
            const showBadge = item.path === '/announcements' && hasUnseenAnnouncements && !isActive;
            
            return (
              <button
                type="button"
                key={item.path}
                onClick={() => handleNavigation(item.path, item.label)}
                onPointerUp={(e) => {
                  if (e.pointerType === 'touch') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (Date.now() - lastTapRef.current < 350) return;
                    lastTapRef.current = Date.now();
                    handleNavigation(item.path, item.label);
                  }
                }}
                onMouseEnter={() => prefetchRoute(item.path)}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className={`
                  flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 relative z-10 cursor-pointer
                  select-none transition-all duration-300 ease-out active:scale-95
                  ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80'}
                `}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <span className={`material-symbols-outlined text-xl transition-all duration-300 pointer-events-none ${shouldFill ? 'filled' : ''} ${isActive ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black/30 animate-pulse" />
                  )}
                </div>
                <span className={`text-[9px] tracking-wide transition-all duration-300 pointer-events-none ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
  );
  
  return <SafeAreaBottomOverlay>{navContent}</SafeAreaBottomOverlay>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DataProvider>
          <ToastProvider>
          <BottomNavProvider>
          <AnnouncementBadgeProvider>
          <OfflineBanner />
          <HashRouter>
            <SmoothScrollProvider>
              <ScrollToTop />
              <Layout>
                <AnimatedRoutes />
              </Layout>
            </SmoothScrollProvider>
          </HashRouter>
          </AnnouncementBadgeProvider>
          </BottomNavProvider>
          </ToastProvider>
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
