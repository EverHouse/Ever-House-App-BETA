
import React, { useState, useEffect, useContext, ErrorInfo, useMemo, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SmoothScrollProvider, useSmoothScroll } from './components/motion/SmoothScroll';
import DirectionalPageTransition, { TransitionContext } from './components/motion/DirectionalPageTransition';
import Logo from './components/Logo';
import MenuOverlay from './components/MenuOverlay';
import ViewAsBanner from './components/ViewAsBanner';
import { ToastProvider } from './components/Toast';
import { NotificationContext } from './contexts/NotificationContext';

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
const Cafe = lazyWithPrefetch(() => import('./pages/Member/Cafe'));
const Sims = lazy(() => import('./pages/Member/Sims'));
const Landing = lazy(() => import('./pages/Public/Landing'));
const Membership = lazy(() => import('./pages/Public/Membership'));
const Contact = lazy(() => import('./pages/Public/Contact'));
const Gallery = lazy(() => import('./pages/Public/Gallery'));
const WhatsOn = lazy(() => import('./pages/Public/WhatsOn'));
const PrivateHire = lazy(() => import('./pages/Public/PrivateHire'));
const PrivateEvents = lazy(() => import('./pages/Public/PrivateEvents'));
const PublicWellness = lazy(() => import('./pages/Public/Wellness'));
const PublicCafe = lazy(() => import('./pages/Public/Cafe'));
const FAQ = lazy(() => import('./pages/Public/FAQ'));
const Login = lazy(() => import('./pages/Public/Login'));
const VerifyMagicLink = lazy(() => import('./pages/Public/VerifyMagicLink'));
const AuthCallback = lazy(() => import('./pages/Public/AuthCallback'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));

import { prefetchRoute, prefetchAdjacentRoutes } from './lib/prefetch';

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
  const { scrollTo, lenis } = useSmoothScroll();
  
  useEffect(() => {
    requestAnimationFrame(() => {
      if (lenis) {
        scrollTo(0, { duration: 0 });
      } else {
        const main = document.querySelector('#main-content');
        if (main) {
          main.scrollTo({ top: 0, behavior: 'auto' });
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      }
    });
  }, [pathname, lenis, scrollTo]);
  
  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useData();
  if (!user) return <Navigate to="/login" replace />;
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
  '/sims': 1.5,
  '/member-wellness': 2,
  '/member-events': 3,
  '/cafe': 4,
  '/profile': 5,
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  
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
            <Route path="/private-events" element={<DirectionalPageTransition><PrivateEvents /></DirectionalPageTransition>} />
            <Route path="/wellness" element={<DirectionalPageTransition><PublicWellness /></DirectionalPageTransition>} />
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
              <ProtectedRoute>
                <DirectionalPageTransition><Dashboard /></DirectionalPageTransition>
              </ProtectedRoute>
            } />
            <Route path="/book" element={
              <ProtectedRoute>
                <DirectionalPageTransition><BookGolf /></DirectionalPageTransition>
              </ProtectedRoute>
            } />
            <Route path="/member-events" element={
              <ProtectedRoute>
                <DirectionalPageTransition><MemberEvents /></DirectionalPageTransition>
              </ProtectedRoute>
            } />
            <Route path="/member-wellness" element={
              <ProtectedRoute>
                <DirectionalPageTransition><MemberWellness /></DirectionalPageTransition>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <DirectionalPageTransition><Profile /></DirectionalPageTransition>
              </ProtectedRoute>
            } />
            <Route path="/cafe" element={
              <ProtectedRoute>
                <DirectionalPageTransition><Cafe /></DirectionalPageTransition>
              </ProtectedRoute>
            } />
            <Route path="/sims" element={
              <ProtectedRoute>
                <DirectionalPageTransition><Sims /></DirectionalPageTransition>
              </ProtectedRoute>
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
  const { announcements, user } = useData();
  const { effectiveTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'updates' | 'announcements'>('updates');
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
  
  const isMemberRoute = ['/dashboard', '/book', '/member-events', '/member-wellness', '/profile', '/cafe', '/sims'].some(path => location.pathname.startsWith(path));
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isDarkTheme = isAdminRoute || (isMemberRoute && effectiveTheme === 'dark');
  const showHeader = !isAdminRoute;

  const handleTopLeftClick = () => {
    setIsMenuOpen(true);
  };

  const isProfilePage = location.pathname === '/profile';
  
  const handleTopRightClick = () => {
    if (user) {
        if (isProfilePage) {
            navigate('/dashboard');
        } else if (isMemberRoute) {
            navigate('/profile');
        } else {
            navigate('/dashboard');
        }
    } else {
        navigate('/login');
    }
  };

  const getTopRightIcon = () => {
      if (!user) return 'login';
      if (isProfilePage) return 'dashboard';
      if (isMemberRoute) return 'account_circle';
      return 'account_circle';
  };

  const getCenterIcon = () => {
      if (!isMemberRoute) return null;
      const path = location.pathname;
      if (path === '/dashboard') return 'home';
      if (path === '/profile') return 'account_circle';
      if (path.startsWith('/book') || path.startsWith('/sims')) return 'sports_golf';
      if (path.startsWith('/member-wellness')) return 'spa';
      if (path.startsWith('/cafe')) return 'local_cafe';
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
    : "bg-[#293515] text-[#F2F2EC] shadow-lg shadow-black/20";
  const headerBtnClasses = "text-white hover:opacity-70 active:scale-95 transition-all";

  const headerContent = showHeader ? (
    <header className={`fixed top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-[9998] pointer-events-auto ${headerClasses}`} role="banner">
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
                className={`flex-1 relative ${showHeader ? 'pt-[72px]' : ''} ${isMemberRoute && !isAdminRoute ? 'pb-32' : ''} ${isMemberRoute ? (isDarkTheme ? 'bg-[#0f120a]' : 'bg-[#F2F2EC]') : ''}`}
            >
                {children}
            </main>

            {isMemberRoute && !isAdminRoute && user && (
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
  { path: '/cafe', icon: 'local_cafe', label: 'Cafe' },
];

const MemberBottomNav: React.FC<{ currentPath: string; isDarkTheme: boolean }> = ({ currentPath, isDarkTheme }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    prefetchAdjacentRoutes(currentPath);
  }, [currentPath]);
  
  const activeIndex = MEMBER_NAV_ITEMS.findIndex(item => item.path === currentPath);
  const itemCount = MEMBER_NAV_ITEMS.length;
  
  const blobWidth = 100 / itemCount;
  const blobLeft = activeIndex >= 0 ? activeIndex * blobWidth : 0;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-[9999] px-4 pb-4 safe-area-bottom">
      <nav 
        className={`w-full max-w-md rounded-full p-1.5 ${
          isDarkTheme 
            ? 'bg-black/60 backdrop-blur-xl border border-[#293515]/80' 
            : 'bg-[#293515]/90 backdrop-blur-xl border border-[#293515]'
        } shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]`}
        role="navigation"
        aria-label="Member navigation"
      >
        <div className="relative flex items-center w-full">
          {activeIndex >= 0 && (
            <div 
              className={`absolute top-0 bottom-0 rounded-full pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                isDarkTheme
                  ? 'bg-gradient-to-b from-white/20 to-white/10 shadow-[0_0_20px_rgba(41,53,21,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'bg-gradient-to-b from-white/40 to-white/20 shadow-[0_0_16px_rgba(255,255,255,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              }`}
              style={{ 
                width: `${blobWidth}%`, 
                left: `${blobLeft}%`,
              }}
            />
          )}
          
          {MEMBER_NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path;
            const isGolfIcon = item.icon === 'sports_golf';
            const shouldFill = isActive && !isGolfIcon;
            
            const handleNavClick = () => {
              if (import.meta.env.DEV) {
                console.log(`[MemberNav] click fired for "${item.label}"`);
              }
              navigate(item.path);
            };

            const handlePrefetch = () => prefetchRoute(item.path);
            
            return (
              <button
                type="button"
                key={item.path}
                onClick={handleNavClick}
                onMouseEnter={handlePrefetch}
                onTouchStart={handlePrefetch}
                onTouchEnd={import.meta.env.DEV ? () => console.log(`[MemberNav] touchend for "${item.label}"`) : undefined}
                style={{ touchAction: 'manipulation' }}
                className={`
                  flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 relative z-10 cursor-pointer
                  transition-all duration-300 ease-out active:scale-90
                  ${isActive 
                    ? (isDarkTheme ? 'text-white' : 'text-white') 
                    : (isDarkTheme ? 'text-white/50 hover:text-white/80' : 'text-white/60 hover:text-white/80')
                  }
                `}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`material-symbols-outlined text-xl transition-all duration-300 ${shouldFill ? 'filled' : ''} ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-[9px] tracking-wide transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DataProvider>
          <ToastProvider>
          <HashRouter>
            <SmoothScrollProvider>
              <ScrollToTop />
              <Layout>
                <AnimatedRoutes />
              </Layout>
            </SmoothScrollProvider>
          </HashRouter>
          </ToastProvider>
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
